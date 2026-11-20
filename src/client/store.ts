import { openDB } from "idb";

export type Data = Record<string, string>;
export interface Entry extends Data {
  id: string;
}
export interface Book {
  id: string;
  fields: Data;
  pdf?: Blob | string;
  imagen?: Blob | string;
}
export interface Library {
  revision: number;
  users: Entry[];
  books: Book[];
  categories: Entry[];
  tasks: Entry[];
  visits: Entry[];
}
export const base = import.meta.env.BASE_URL;
const database = openDB("bookverse-library-v1", 1, {
  upgrade(db) {
    db.createObjectStore("library");
  },
});

export async function passwordHash(password: string, salt: string) {
  const utf8 = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    utf8.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: utf8.encode(salt),
      iterations: 210000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function credentials(password: string) {
  const salt = crypto.randomUUID();
  return { salt, hash: await passwordHash(password, salt) };
}
async function seed(): Promise<Library> {
  const users = await Promise.all(
    ["admin", "lector"].map(async (name, i) => ({
      id: name,
      usuario: name,
      nombre: i ? "Luna" : "Alex",
      apellido: i ? "Lectora" : "Rivera",
      role: i ? "Cliente" : "Administrador",
      nivel: i ? "0" : "1",
      estado: "Activo",
      genero: i ? "Femenino" : "Masculino",
      ...(await credentials("Bookverse2019")),
    })),
  );
  const categories = [
    { id: "1", nombre: "Ciencia" },
    { id: "2", nombre: "Programación" },
  ];
  const books = ["El cielo a simple vista", "Cómo funciona un algoritmo"].map(
    (titulo, i) => ({
      id: "LB-0" + (i + 1),
      fields: {
        titulo,
        autor: "Bookverse",
        categoria: categories[i].id,
        year: "2026",
        edicion: "Primera",
        editorial: "Bookverse",
        pais: "Colombia",
        optionsPDF: "Yes",
        resumen: i
          ? "Una introducción a las instrucciones y las decisiones."
          : "Un cuaderno para empezar a observar el cielo.",
      },
      pdf: base + "samples/" + (i + 1) + ".pdf",
      imagen: base + "assets/img/books.jpg",
    }),
  );
  return { revision: 0, categories, books, users, tasks: [], visits: [] };
}
export async function library(): Promise<Library> {
  const db = await database;
  const saved = await db.get("library", "data");
  if (saved) return saved;
  const initial = await seed();
  const tx = db.transaction("library", "readwrite");
  const current = await tx.store.get("data");
  if (!current) await tx.store.put(initial, "data");
  await tx.done;
  return current ?? initial;
}
export async function save(state: Library) {
  const tx = (await database).transaction("library", "readwrite");
  const current: Library = await tx.store.get("data");
  if (current.revision !== state.revision)
    throw new Error(
      "La biblioteca cambió en otra pestaña. Recarga para continuar.",
    );
  await tx.store.put({ ...state, revision: state.revision + 1 }, "data");
  await tx.done;
  state.revision++;
}
export function fileUrl(file?: Blob | string) {
  return typeof file === "string"
    ? file
    : file
      ? URL.createObjectURL(file)
      : "";
}

export function canEditProfile(actor: Entry, target: Entry) {
  if (actor.id === target.id) return true;
  if (
    target.id === "admin" ||
    actor.role !== "Administrador" ||
    actor.nivel === "3"
  )
    return false;
  return (
    target.role === "Cliente" || Number(actor.nivel) <= Number(target.nivel)
  );
}
