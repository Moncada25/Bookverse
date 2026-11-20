import { base } from "./store";
export const page = document.body.dataset.page!;
export const query = new URLSearchParams(location.search);
export function url(route: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams(params).toString();
  return base + route + "/" + (search ? "?" + search : "");
}
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  cls = "",
) {
  const node = document.createElement(tag);
  node.className = cls;
  node.textContent = text;
  return node;
}
export function notice(message: string, content?: HTMLElement) {
  const dialog = document.querySelector<HTMLDialogElement>("#notice")!;
  dialog.querySelector("p")!.textContent = message;
  dialog.querySelector("iframe")?.remove();
  if (content) dialog.querySelector("button")!.before(content);
  dialog.querySelector("button")!.onclick = () => dialog.close();
  if (!dialog.open) dialog.showModal();
}
export function action(
  label: string,
  icon: string,
  href: string,
  click?: () => void,
) {
  const link = el("a");
  link.href = href;
  link.title = label;
  link.setAttribute("aria-label", label);
  link.append(el("i", "", "zmdi zmdi-" + icon + " zmdi-hc-2x"));
  if (click)
    link.onclick = (event) => {
      event.preventDefault();
      click();
    };
  return link;
}
export function table(titles: string[], rows: (string | HTMLElement)[][]) {
  const host = document.querySelector("#results");
  if (!host) return;
  const table = el("table", "", "table table-hover text-center");
  const head = table.createTHead().insertRow();
  for (const title of titles) head.append(el("th", title, "text-center"));
  const body = table.createTBody();
  const pages = Math.ceil(rows.length / 10);
  const current =
    Math.min(pages, Math.max(1, parseInt(query.get("p") ?? "") || 1)) || 1;
  for (const row of rows.slice((current - 1) * 10, current * 10)) {
    const tr = body.insertRow();
    for (const value of row) tr.insertCell().append(value);
  }
  if (!rows.length) {
    const cell = body.insertRow().insertCell();
    cell.colSpan = titles.length;
    cell.textContent = "No hay registros en el sistema.";
  }
  const wrap = el("div", "", "table-responsive");
  wrap.append(table);
  host.replaceChildren(wrap);
  if (!pages) return;
  const nav = el("nav", "", "text-center");
  const list = el("ul", "", "pagination pagination-sm");
  for (let step = 0; step <= pages + 1; step++) {
    const edge = step === 0 || step === pages + 1;
    const p =
      step === 0 ? current - 1 : step === pages + 1 ? current + 1 : step;
    const item = el("li");
    const link = el("a");
    if (edge)
      link.append(
        el("i", "", "zmdi zmdi-arrow-" + (step === 0 ? "left" : "right")),
      );
    else link.textContent = String(p);
    link.setAttribute("aria-label", "Página " + p);
    if (p < 1 || p > pages) item.className = "disabled";
    else {
      const target = new URL(location.href);
      target.searchParams.set("p", String(p));
      link.href = target.href;
      if (p === current) item.className = "active";
    }
    item.append(link);
    list.append(item);
  }
  nav.append(list);
  host.append(nav);
}
export function fields(values: Record<string, string>, suffix = "") {
  for (const field of document.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("[name]")) {
    const name = field.name;
    if (suffix && !name.endsWith(suffix)) continue;
    const key = suffix ? name.slice(0, -suffix.length) : name;
    if (values[key] === undefined) continue;
    if (field instanceof HTMLInputElement && field.type === "radio")
      field.checked = field.value === values[key];
    else field.value = values[key];
  }
}
export function initControls() {
  for (const group of document.querySelectorAll(".form-group")) {
    const input = group.querySelector<HTMLInputElement>(
      "input:not([type=hidden]), textarea, select",
    );
    if (!input) continue;
    const label = group.querySelector("label.control-label,span.control-label");
    if (label && input.name) {
      input.id ||= input.name;
      label.id ||= input.id + "-label";
      input.setAttribute("aria-labelledby", label.id);
      if (label instanceof HTMLLabelElement) label.htmlFor = input.id;
    }
    const update = () => group.classList.toggle("is-empty", !input.value);
    update();
    input.addEventListener("input", update);
    input.addEventListener("focus", () => group.classList.add("is-focused"));
    input.addEventListener("blur", () => group.classList.remove("is-focused"));
    if (input.type === "file") {
      const display = group.querySelector<HTMLInputElement>("[readonly]");
      input.onchange = () => {
        if (display) display.value = input.files?.[0]?.name ?? "";
      };
      const button = group.querySelector("button");
      if (button) button.onclick = () => input.click();
    }
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    ".btn-sideBar-SubMenu",
  )) {
    link.onclick = (e) => {
      e.preventDefault();
      link.nextElementSibling?.classList.toggle("show-sideBar-SubMenu");
      link
        .querySelector(".zmdi-caret-down")
        ?.classList.toggle("zmdi-hc-rotate-180");
    };
  }
  for (const link of document.querySelectorAll<HTMLElement>(
    ".btn-menu-dashboard",
  )) {
    link.onclick = (e) => {
      e.preventDefault();
      const sidebar = document.querySelector(".dashboard-sideBar")!;
      const hide = getComputedStyle(sidebar).pointerEvents !== "none";
      sidebar.classList.toggle("hide-sidebar", hide);
      sidebar.classList.toggle("show-sidebar", !hide);
      document.querySelector("main")?.classList.toggle("no-paddin-left", hide);
    };
  }
}
