import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function login(page: Page, role: "admin" | "lector") {
  await page.goto("./");
  await page.locator("[data-demo=" + role + "]").click();
  await expect(page).toHaveURL(
    new RegExp(role === "admin" ? "/home/$" : "/catalog/all/$"),
  );
}
test("reader opens books, searches and cannot enter administration", async ({
  page,
}) => {
  await login(page, "lector");
  await expect(page.getByText("El cielo a simple vista")).toBeVisible();
  await page.getByRole("link", { name: "Abrir PDF" }).first().click();
  await expect(page.locator("dialog iframe")).toBeVisible();
  expect(
    (await page.request.get("samples/1.pdf")).headers()["content-type"],
  ).toContain("pdf");
  await page.getByRole("button", { name: "Cerrar" }).click();
  await page.getByRole("link", { name: "Más información" }).first().click();
  await page.reload();
  await expect(page.locator("[data-field=titulo]")).toHaveValue(
    "El cielo a simple vista",
  );
  await page.goto("search/");
  await page.locator("[name=busqueda_inicial_libro]").fill("algoritmo");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto("adminlist/");
  await expect(page).toHaveURL(/catalog\/all\/$/);
});
test("administrator creates a category and book, filters and edits it", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("category/");
  await page.locator("[name=codigo-cat]").fill("42");
  await page.locator("[name=nombre-cat]").fill("Historia");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("cell", { name: "Historia" })).toBeVisible();
  await page.goto("book/");
  await page.locator("[name=titulo-reg]").fill("Una biblioteca");
  await page.locator("[name=autor-reg]").fill("Luna");
  await page.locator("[name=categoria-reg]").selectOption("42");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(
    page.getByRole("cell", { name: "Una biblioteca" }),
  ).toBeVisible();
  await page.locator("[data-toggle=dropdown]").click();
  await page.getByRole("link", { name: "Historia" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("link", { name: "Ajustes" }).click();
  await page.locator("[name=titulo-up]").fill("Mi biblioteca");
  await page.getByRole("button", { name: "Actualizar" }).click();
  await expect(page.getByRole("cell", { name: "Mi biblioteca" })).toBeVisible();
});
test("local signup, task update and logout", async ({ page }) => {
  await page.goto("signup/");
  for (const [key, value] of Object.entries({
    nombre: "Luna",
    apellido: "Vega",
    usuario: "vega",
    password1: "Local2019",
    password2: "Local2019",
  }))
    await page.locator("[name=" + key + "-reg]").fill(value);
  await page.getByRole("button", { name: "Registrarse" }).click();
  await expect(page).toHaveURL(/login\/$/);
  await page.locator("[name=usuario]").fill("vega");
  await page.locator("[name=clave]").fill("Local2019");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/catalog\/all\/$/);
  await page.goto("task/");
  await page.locator("[name=tarea]").fill("Leer");
  await page.locator("[name=puntos]").fill("2");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("link", { name: "Editar tarea" }).click();
  await page.locator("[name=estado]").selectOption("Activa");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("cell", { name: "Activa" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".btn-exit-system").click();
  await expect(page).toHaveURL(/login\/$/);
  await page.goto("tasklist/");
  await expect(page).toHaveURL(/login\/$/);
});

test("PDF upload persists and the reader's download setting is respected", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("book/");
  await page.locator("[name=titulo-reg]").fill("Un cuaderno");
  await page.locator("[name=autor-reg]").fill("Luna");
  await page.locator("[name=pdf-reg]").setInputFiles("public/samples/1.pdf");
  await page.locator("[name=optionsPDF][value=No]").check();
  await page.getByRole("button", { name: "Guardar" }).click();
  const book = page.getByRole("row").filter({ hasText: "Un cuaderno" });
  const href = await book
    .getByRole("link", { name: "Más información" })
    .getAttribute("href");
  await page.goto(href!);
  await page.reload();
  const download = page.locator("[data-download]");
  await expect(download).toBeVisible();
  const bytes = await download.evaluate(async (element) => {
    const file = await fetch((element as HTMLAnchorElement).href);
    return (await file.text()).slice(0, 4);
  });
  expect(bytes).toBe("%PDF");
  page.once("dialog", (d) => d.accept());
  await page.locator(".btn-exit-system").click();
  await expect(page).toHaveURL(/login\/$/);
  await login(page, "lector");
  await page.goto(href!);
  await expect(page.locator("[data-field=titulo]")).toHaveValue("Un cuaderno");
  await expect(download).toBeHidden();
});

test("mobile navigation, profile and historical category link", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "lector");
  await page.getByRole("link", { name: "Alternar menú" }).click();
  await page.getByRole("link", { name: "Mis datos" }).click();
  await page.locator("[name=nombre-up]").fill("Lucía");
  await page.getByRole("button", { name: "Actualizar" }).click();
  await expect(page.locator("#display-name")).toHaveText("Lucía Lectora");
  await page.goto("catalog/programacion/");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("cell", { name: "Cómo funciona un algoritmo" }),
  ).toBeVisible();
});
