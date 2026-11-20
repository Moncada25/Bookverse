import {
  canEditProfile,
  base,
  fileUrl,
  type Library,
  type Entry,
} from "./store";
import { action, el, fields, notice, page, query, table, url } from "./ui";

export const adminPages = [
  "home",
  "admin",
  "adminlist",
  "adminsearch",
  "client",
  "clientlist",
  "clientsearch",
  "category",
  "categorylist",
  "book",
  "bookconfig",
];
const normalized = (s: string) =>
  s.toLocaleLowerCase("es").normalize("NFD").replace(/\p{M}/gu, "");
export function render(
  state: Library,
  user: Entry,
  remove: (kind: "users" | "categories", id: string) => void,
) {
  const admin = user.role === "Administrador";
  const full = admin && user.nivel === "1";
  const id = query.get("id");
  const set = (selector: string, value: string) => {
    document.querySelector(selector)!.textContent = value;
  };
  set("#display-name", user.nombre + " " + user.apellido);
  set("#role", user.role);
  document.querySelector<HTMLImageElement>("#avatar")!.src =
    base +
    "assets/avatars/" +
    (user.genero === "Femenino" ? "Female" : "Male") +
    "1Avatar.png";
  document
    .querySelectorAll<HTMLElement>("[data-admin]")
    .forEach((node) => (node.hidden = !admin));
  const search = query.get("q") ?? "";
  const input = document.querySelector<HTMLInputElement>(
    "[name^=busqueda_inicial]",
  );
  if (input) {
    input.value = search;
    if (!search)
      document
        .querySelector<HTMLElement>("#results")!
        .closest<HTMLElement>(".panel")!.hidden = true;
    else {
      const reset = el(
        "a",
        "Eliminar búsqueda",
        "btn btn-danger btn-raised btn-sm",
      );
      reset.href = url(page);
      input.form?.querySelector("button")?.after(reset);
    }
  }
  const matches = (...texts: string[]) =>
    texts.some((s) => normalized(s).includes(normalized(search)));
  if (page === "home") {
    const counts = [
      state.users.filter((u) => u.role === "Administrador").length,
      state.users.filter((u) => u.role === "Cliente").length,
      state.books.length,
    ];
    document
      .querySelectorAll(".tile-number p")
      .forEach((node, i) => (node.textContent = String(counts[i])));
    for (const visit of state.visits.slice(-10).reverse()) {
      const block = el("div", "", "cd-timeline-block");
      const picture = el("div", "", "cd-timeline-img");
      const avatar = el("img");
      avatar.src = base + "assets/avatars/" + visit.avatar;
      avatar.alt = "";
      picture.append(avatar);
      const content = el("div", "", "cd-timeline-content");
      const heading = el("h4", "", "text-center text-titles");
      heading.append(el("strong", visit.name));
      const time = el("p", "", "text-center");
      const clock = (stamp: string) =>
        new Date(stamp).toLocaleTimeString("es", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      time.append(
        el("i", "", "zmdi zmdi-timer zmdi-hc-fw"),
        " Inicio: ",
        el("em", clock(visit.start)),
        el("br"),
        el("i", "", "zmdi zmdi-time zmdi-hc-fw"),
        " Final: ",
        el("em", visit.end ? clock(visit.end) : "—"),
      );
      const date = el("h4", "", "text-center text-titles");
      date.append(
        el("i", "", "zmdi zmdi-calendar-note zmdi-hc-fw"),
        " " + new Date(visit.start).toLocaleDateString("es"),
      );
      content.append(heading, time, date, el("strong", visit.role, "cd-date"));
      block.append(picture, content);
      document.querySelector("#cd-timeline")!.append(block);
    }
  }
  if (page === "catalog" || page === "search") {
    const category =
      query.get("category") ??
      ({ ciencia: "1", programacion: "2" } as Record<string, string>)[
        location.pathname.split("/").filter(Boolean).at(-1) ?? ""
      ];
    if (page === "catalog") {
      for (const cat of state.categories) {
        const li = el("li"),
          link = el("a", cat.nombre);
        link.href = url("catalog/all", { category: cat.id });
        li.append(link);
        document.querySelector(".dropdown-menu")!.append(li);
      }
      set(
        "h2 strong",
        "“" +
          (category
            ? (state.categories.find((c) => c.id === category)?.nombre ??
              "Desconocida")
            : "Todas") +
          "”",
      );
      const toggle = document.querySelector<HTMLButtonElement>(
        "[data-toggle=dropdown]",
      )!;
      toggle.onclick = () => toggle.parentElement!.classList.toggle("open");
    }
    const books = state.books.filter(
      (b) =>
        (!category || b.fields.categoria === category) &&
        matches(b.fields.titulo, b.fields.autor),
    );
    table(
      [
        "#",
        "TÍTULO",
        "AUTOR",
        "INFORMACIÓN",
        "LEER",
        ...(full ? ["AJUSTES"] : []),
      ],
      books.map((b, i) => {
        const pdf = fileUrl(b.pdf);
        return [
          String(i + 1),
          b.fields.titulo,
          b.fields.autor,
          action("Más información", "info", url("bookinfo", { id: b.id })),
          pdf
            ? action("Abrir PDF", "file", pdf, () => {
                const frame = el("iframe");
                frame.title = b.fields.titulo;
                frame.src = pdf;
                notice(b.fields.titulo, frame);
              })
            : "—",
          ...(full
            ? [action("Ajustes", "wrench", url("bookconfig", { id: b.id }))]
            : []),
        ];
      }),
    );
  }
  if (["book", "bookconfig"].includes(page)) {
    const select = document.querySelector<HTMLSelectElement>(
      "select[name^=categoria]",
    )!;
    state.categories.forEach((c) => select.add(new Option(c.nombre, c.id)));
    if (page === "book")
      fields({ codigo: "LB-" + crypto.randomUUID().slice(0, 7) }, "-reg");
  }
  if (["bookconfig", "bookinfo"].includes(page)) {
    const book = state.books.find((b) => b.id === id);
    if (!book) throw new Error("Libro no encontrado.");
    if (page === "bookconfig") {
      fields({ ...book.fields, codigo: book.id }, "-up");
      fields({ optionsPDF: book.fields.optionsPDF });
      document.querySelectorAll("tbody tr").forEach((row, i) => {
        const file = i ? book.pdf : book.imagen;
        row.querySelector("td")!.textContent =
          file instanceof File
            ? file.name
            : typeof file === "string"
              ? file.split("/").pop()!
              : "—";
        row.querySelector("button")!.disabled = !file;
      });
    } else {
      set(".panel-title", book.fields.titulo);
      document
        .querySelectorAll<HTMLInputElement>("[data-field]")
        .forEach((f) => (f.value = book.fields[f.dataset.field!] ?? ""));
      const cover = document.querySelector<HTMLImageElement>("[data-cover]")!;
      cover.src = fileUrl(book.imagen) || base + "assets/img/books.jpg";
      const download =
        document.querySelector<HTMLAnchorElement>("[data-download]")!;
      download.hidden =
        !book.pdf || (!admin && book.fields.optionsPDF !== "Yes");
      if (!download.hidden) {
        download.href = fileUrl(book.pdf);
        download.download = book.fields.titulo + ".pdf";
      }
    }
  }
  if (
    ["adminlist", "adminsearch", "clientlist", "clientsearch"].includes(page)
  ) {
    const users = state.users.filter(
      (u) =>
        u.role === (page.startsWith("admin") ? "Administrador" : "Cliente") &&
        matches(u.nombre, u.apellido, u.usuario),
    );
    table(
      [
        "#",
        "NOMBRES",
        "APELLIDOS",
        "TELÉFONO",
        ...(user.nivel !== "3" ? ["A. CUENTA", "A. DATOS"] : []),
        ...(full ? ["ELIMINAR"] : []),
      ],
      users.map((u, i) => [
        String(i + 1),
        u.nombre,
        u.apellido,
        u.telefono ?? "",
        ...(user.nivel === "3"
          ? []
          : ["myaccount", "mydata"].map((route, j) =>
              canEditProfile(user, u)
                ? action(
                    j ? "Mis datos" : "Mi cuenta",
                    j ? "edit" : "settings",
                    url(route, { id: u.id }),
                  )
                : "—",
            )),
        ...(full
          ? [
              u.id !== user.id && u.id !== "admin"
                ? action("Eliminar", "delete", "#", () => remove("users", u.id))
                : "—",
            ]
          : []),
      ]),
    );
  }
  if (page === "categorylist")
    table(
      ["#", "CÓDIGO", "NOMBRE", ...(full ? ["ELIMINAR"] : [])],
      state.categories.map((c, i) => [
        String(i + 1),
        c.id,
        c.nombre,
        ...(full
          ? [
              action("Eliminar", "delete", "#", () =>
                remove("categories", c.id),
              ),
            ]
          : []),
      ]),
    );
  if (page === "mydata" || page === "myaccount") {
    const profile = state.users.find((u) => u.id === (id ?? user.id));
    if (!profile || !canEditProfile(user, profile))
      throw new Error("Perfil no disponible.");
    fields(
      {
        ...profile,
        optionsGenero: profile.genero,
        optionsPrivilegio: profile.nivel,
        optionsEstado: profile.estado,
      },
      "-up",
    );
    for (const radio of document.querySelectorAll<HTMLInputElement>(
      "[name=optionsEstado-up],[name=optionsPrivilegio-up]",
    )) {
      radio.disabled =
        !full ||
        profile.id === user.id ||
        profile.id === "admin" ||
        (radio.name === "optionsPrivilegio-up" &&
          profile.role !== "Administrador");
      if (radio.disabled)
        radio.closest<HTMLElement>(".form-group,fieldset")!.hidden = true;
    }
  }
  if (page === "admin")
    document
      .querySelectorAll<HTMLInputElement>("[name=optionsPrivilegio]")
      .forEach((r) => (r.disabled = Number(r.value) < Number(user.nivel)));
  if (page === "tasklist" || page === "backlog") {
    const tasks = state.tasks.filter(
      (t) => page === "backlog" || t.owner === user.id,
    );
    table(
      [
        ...(page === "backlog" ? ["ASIGNACIÓN"] : []),
        "TAREA",
        "DESCRIPCIÓN",
        "PUNTOS",
        "ESTADO",
        "CREADA",
        ...(page === "tasklist" ? ["EDITAR"] : []),
      ],
      tasks.map((t) => [
        ...(page === "backlog"
          ? [state.users.find((u) => u.id === t.owner)?.usuario ?? "—"]
          : []),
        t.tarea,
        t.descripcion,
        t.puntos,
        t.estado,
        t.created ? new Date(t.created).toLocaleDateString("es") : "—",
        ...(page === "tasklist"
          ? [
              action(
                "Editar tarea",
                "refresh",
                url("editbacklog", { id: t.id }),
              ),
            ]
          : []),
      ]),
    );
  }
  if (page === "editbacklog") {
    const task = state.tasks.find(
      (t) => t.id === id && (t.owner === user.id || full),
    );
    if (!task) throw new Error("Tarea no disponible.");
    fields(task);
    if (task.estado === "Cerrada")
      document
        .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
          "[name=tarea],[name=puntos],[name=descripcion]",
        )
        .forEach((field) => (field.readOnly = true));
  }
}
