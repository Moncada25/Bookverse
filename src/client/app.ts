import {
  canEditProfile,
  credentials,
  library,
  passwordHash,
  save,
  type Entry,
  type Library,
} from "./store";
import { adminPages, render } from "./render";
import { initControls, notice, page, query, url } from "./ui";

const sessionKey = "bookverse.session.v1";
const home = (user: Entry) =>
  user.role === "Administrador" ? "home" : "catalog/all";
function go(route: string) {
  location.assign(url(route));
}
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});

async function start() {
  if (page === "404") return;
  for (const form of document.forms) form.onsubmit = (e) => e.preventDefault();
  const state = await library();
  const session = sessionStorage.getItem(sessionKey);
  const visit = state.visits.find((v) => v.id === session && !v.end);
  const user = state.users.find(
    (u) => u.id === visit?.user && u.estado === "Activo",
  );
  const guest = page === "signup" || page === "login";
  if (!user && !guest) return location.replace(url("login"));
  if (user && guest) return location.replace(url(home(user)));
  if (
    user &&
    ((adminPages.includes(page) && user.role !== "Administrador") ||
      (page === "bookconfig" && user.nivel !== "1"))
  )
    return location.replace(url(home(user)));
  const full = user?.role === "Administrador" && user.nivel === "1";
  async function persist(route?: string) {
    try {
      await save(state);
    } catch (error) {
      Object.assign(state, await library());
      throw error;
    }
    if (route) go(route);
    else location.reload();
  }
  if (user) {
    render(state, user, async (kind, id) => {
      try {
        if (!full || !confirm("¿Eliminar este registro?")) return;
        if (kind === "categories")
          requireValue(
            !state.books.some((b) => b.fields.categoria === id),
            "La categoría contiene libros.",
          );
        else {
          requireValue(id !== user.id && id !== "admin", "Cuenta protegida.");
          state.tasks = state.tasks.filter((t) => t.owner !== id);
        }
        state[kind] = state[kind].filter((record) => record.id !== id);
        await persist();
      } catch (error) {
        notice(String(error));
      }
    });
  }
  initControls();
  document.querySelectorAll<HTMLButtonElement>("[data-demo]").forEach(
    (b) =>
      (b.onclick = () => {
        const form = b.form!;
        (form.elements.namedItem("usuario") as HTMLInputElement).value =
          b.dataset.demo!;
        (form.elements.namedItem("clave") as HTMLInputElement).value =
          "Bookverse2019";
        form.requestSubmit();
      }),
  );
  document.body.dataset.ready = "true";
  document
    .querySelectorAll<HTMLButtonElement>("[data-demo]")
    .forEach((button) => (button.disabled = false));
  const logout = document.querySelector<HTMLAnchorElement>(".btn-exit-system");
  if (logout)
    logout.onclick = async (e) => {
      e.preventDefault();
      if (!confirm("¿Cerrar sesión?")) return;
      try {
        if (visit) {
          visit.end = new Date().toISOString();
          await save(state);
        }
        sessionStorage.removeItem(sessionKey);
        go("login");
      } catch (error) {
        notice(String(error));
      }
    };
  document.querySelectorAll("form").forEach((form) => {
    let busy = false;
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (busy) return;
      busy = true;
      try {
        await submit(form);
      } catch (error) {
        notice(error instanceof Error ? error.message : "No se pudo guardar.");
      } finally {
        busy = false;
      }
    };
  });
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const val = (key: string) => String(data.get(key) ?? "").trim();
    const raw = (key: string) => String(data.get(key) ?? "");
    const record = (keys: string[], suffix = "") =>
      Object.fromEntries(keys.map((k) => [k, val(k + suffix)]));
    const id = query.get("id");
    if (page === "login") {
      const account = state.users.find(
        (u) =>
          u.usuario.toLowerCase() === val("usuario").toLowerCase() &&
          u.estado === "Activo",
      );
      requireValue(
        account &&
          (await passwordHash(raw("clave"), account.salt)) === account.hash,
        "Usuario o contraseña incorrectos.",
      );
      const entry = {
        id: crypto.randomUUID(),
        user: account.id,
        name: account.nombre + " " + account.apellido,
        role: account.role,
        avatar:
          (account.genero === "Femenino" ? "Female" : "Male") + "1Avatar.png",
        start: new Date().toISOString(),
        end: "",
      };
      state.visits.push(entry);
      await save(state);
      sessionStorage.setItem(sessionKey, entry.id);
      return go(home(account));
    }
    if (["signup", "client", "admin"].includes(page)) {
      const username = val("usuario-reg");
      requireValue(
        !state.users.some(
          (u) => u.usuario.toLowerCase() === username.toLowerCase(),
        ),
        "El usuario ya existe.",
      );
      requireValue(
        raw("password1-reg") && raw("password1-reg") === raw("password2-reg"),
        "Las contraseñas deben coincidir.",
      );
      const nivel = page === "admin" ? val("optionsPrivilegio") : "0";
      if (page === "admin")
        requireValue(
          ["1", "2", "3"].includes(nivel) &&
            Number(nivel) >= Number(user?.nivel),
          "Nivel de privilegios inválido.",
        );
      state.users.push({
        id: crypto.randomUUID(),
        ...record(
          ["nombre", "apellido", "telefono", "direccion", "usuario", "email"],
          "-reg",
        ),
        role: page === "admin" ? "Administrador" : "Cliente",
        estado: "Activo",
        nivel,
        genero: val("optionsGenero"),
        ocupacion: val("categoria-up"),
        ...(await credentials(raw("password1-reg"))),
      });
      return persist(page === "signup" ? "login" : page + "list");
    }
    requireValue(user, "Inicia sesión para continuar.");
    if (page === "feedback") {
      const bookverse = data.has("comentario-bookverse");
      const target = new URL(
        "https://github.com/Moncada25/" +
          (bookverse ? "Bookverse" : "PackApps") +
          "/issues/new",
      );
      target.searchParams.set(
        "body",
        val(bookverse ? "comentario-bookverse" : "comentario-packapps"),
      );
      location.assign(target.href);
      return;
    }
    if (page.endsWith("search")) {
      location.assign(
        url(page, { q: String(data.values().next().value ?? "") }),
      );
      return;
    }
    if (page === "category") {
      const entry = { id: val("codigo-cat"), nombre: val("nombre-cat") };
      requireValue(
        !state.categories.some(
          (c) =>
            c.id === entry.id ||
            c.nombre.toLowerCase() === entry.nombre.toLowerCase(),
        ),
        "La categoría ya existe.",
      );
      state.categories.push(entry);
      return persist("categorylist");
    }
    if (page === "book" || page === "bookconfig") {
      const edit = page === "bookconfig";
      const book = edit
        ? state.books.find((b) => b.id === id)
        : ({ id: val("codigo-reg"), fields: {} } as Library["books"][number]);
      requireValue(book, "Libro no encontrado.");
      if (edit && !form.matches("[data-form=update]")) {
        if (!confirm("¿Eliminar del sistema?")) return;
        const row = form.closest("tr");
        if (row) delete book[row.rowIndex === 1 ? "imagen" : "pdf"];
        else state.books = state.books.filter((b) => b !== book);
        return persist("catalog/all");
      }
      const values = record(
        [
          "titulo",
          "autor",
          "pais",
          "year",
          "editorial",
          "edicion",
          "categoria",
          "resumen",
        ],
        edit ? "-up" : "-reg",
      );
      requireValue(
        state.categories.some((c) => c.id === values.categoria),
        "Selecciona una categoría.",
      );
      const files: Partial<Pick<typeof book, "imagen" | "pdf">> = {};
      for (const key of ["imagen", "pdf"] as const) {
        const file = data.get(key + "-reg");
        if (!(file instanceof File) || !file.size) continue;
        requireValue(
          file.size <= 5 * 1024 * 1024,
          "El archivo supera los 5 MB.",
        );
        requireValue(
          (key === "pdf"
            ? ["application/pdf"]
            : ["image/jpeg", "image/png"]
          ).includes(file.type),
          "Formato de archivo no válido.",
        );
        files[key] = file;
      }
      Object.assign(book, files, {
        fields: { ...values, optionsPDF: val("optionsPDF") },
      });
      if (!edit) state.books.push(book);
      return persist("catalog/all");
    }
    if (page === "mydata" || page === "myaccount") {
      const profile = state.users.find((u) => u.id === (id ?? user.id));
      requireValue(
        profile && canEditProfile(user, profile),
        "Perfil no disponible.",
      );
      if (page === "mydata")
        Object.assign(
          profile,
          record(["nombre", "apellido", "telefono", "direccion"], "-up"),
        );
      else {
        requireValue(
          val("user-log") === user.usuario &&
            (await passwordHash(raw("password-log"), user.salt)) === user.hash,
          "Verifica tus credenciales.",
        );
        requireValue(
          !state.users.some(
            (u) =>
              u.id !== profile.id &&
              u.usuario.toLowerCase() === val("usuario-up").toLowerCase(),
          ),
          "El usuario ya existe.",
        );
        requireValue(
          raw("newPassword1-up") === raw("newPassword2-up"),
          "Las contraseñas deben coincidir.",
        );
        if (raw("newPassword1-up"))
          Object.assign(profile, await credentials(raw("newPassword1-up")));
        Object.assign(profile, record(["usuario", "email"], "-up"), {
          genero: val("optionsGenero-up"),
        });
        if (full && profile.id !== user.id && profile.id !== "admin") {
          profile.estado = val("optionsEstado-up") || profile.estado;
          if (profile.role === "Administrador")
            profile.nivel = val("optionsPrivilegio-up") || profile.nivel;
        }
      }
      return persist(home(user));
    }
    if (page === "task" || page === "editbacklog") {
      if (page === "task")
        state.tasks.push({
          id: crypto.randomUUID(),
          owner: user.id,
          created: new Date().toISOString(),
          ...record(["tarea", "puntos", "estado", "descripcion"]),
        });
      else {
        const task = state.tasks.find(
          (t) => t.id === id && (t.owner === user.id || full),
        );
        requireValue(task, "Tarea no disponible.");
        if (val("estado") === "Remover") {
          if (!confirm("¿Eliminar la tarea?")) return;
          state.tasks = state.tasks.filter((t) => t !== task);
        } else
          Object.assign(
            task,
            record(["tarea", "puntos", "estado", "descripcion"]),
          );
      }
      return persist("tasklist");
    }
  }
}
start().catch((error) => {
  document
    .querySelectorAll("form")
    .forEach((form) => (form.onsubmit = (e) => e.preventDefault()));
  notice(
    error instanceof Error
      ? error.message
      : "El almacenamiento local no está disponible.",
  );
});
