import type { CreditRating } from "../types.js";
import { escapeHtml } from "../utils/format.js";

export function statTile(label: string, value: string, sub?: string, valueClass = ""): string {
  return `<div class="card stat-tile">
    <div class="label">${escapeHtml(label)}</div>
    <div class="value ${valueClass}">${value}</div>
    ${sub ? `<div class="sub">${sub}</div>` : ""}
  </div>`;
}

export function badge(text: string, cls: "good" | "warn" | "bad" | "neutral" = "neutral"): string {
  return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}

export function ratingBadgeClass(rating: CreditRating): string {
  return `rating-${rating}`;
}

export function ratingBadge(rating: CreditRating): string {
  return `<span class="badge ${ratingBadgeClass(rating)}">${rating}</span>`;
}

export function progressBar(pct: number, color?: string): string {
  const clamped = Math.max(0, Math.min(100, pct));
  return `<div class="progress"><div style="width:${clamped}%;${color ? `background:${color};` : ""}"></div></div>`;
}

/** A range slider paired with a number input showing/editing the same value — sliders alone
 * are hard to land on an exact number, especially on a touchscreen, so every control that
 * uses this always offers direct numeric entry as well. */
export function dualInputRow(attr: string, key: string, value: number, min: number, max: number, step: number): string {
  return `<div class="dual-input">
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-${attr}="${key}" />
    <input type="number" min="${min}" max="${max}" step="${step}" value="${value}" data-${attr}="${key}" class="number-twin" />
  </div>`;
}

export function wireDualInputs(
  container: HTMLElement,
  attr: string,
  onChange: (key: string, value: number) => void
): void {
  const groups = new Map<string, HTMLInputElement[]>();
  container.querySelectorAll<HTMLInputElement>(`input[data-${attr}]`).forEach((input) => {
    const key = input.dataset[attr] ?? "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(input);
  });
  groups.forEach((inputs, key) => {
    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        const value = Number(input.value);
        for (const other of inputs) {
          if (other !== input) other.value = String(value);
        }
        onChange(key, value);
      });
    });
  });
}

export function card(title: string, inner: string, subtitle?: string): string {
  return `<div class="card"><h3>${escapeHtml(title)}</h3>${
    subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ""
  }${inner}</div>`;
}

let modalRoot: HTMLElement | null = null;

export function closeModal(): void {
  if (modalRoot) {
    modalRoot.remove();
    modalRoot = null;
  }
}

export function openModal(innerHtml: string, onMount?: (root: HTMLElement) => void): void {
  closeModal();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `<div class="modal">${innerHtml}</div>`;
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.body.appendChild(backdrop);
  modalRoot = backdrop;
  if (onMount) onMount(backdrop);
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {},
  children: (Node | string)[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const c of children) {
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}
