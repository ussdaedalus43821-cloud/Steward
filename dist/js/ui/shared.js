import { escapeHtml } from "../utils/format.js";
export function statTile(label, value, sub, valueClass = "") {
    return `<div class="card stat-tile">
    <div class="label">${escapeHtml(label)}</div>
    <div class="value ${valueClass}">${value}</div>
    ${sub ? `<div class="sub">${sub}</div>` : ""}
  </div>`;
}
export function badge(text, cls = "neutral") {
    return `<span class="badge ${cls}">${escapeHtml(text)}</span>`;
}
export function ratingBadgeClass(rating) {
    return `rating-${rating}`;
}
export function ratingBadge(rating) {
    return `<span class="badge ${ratingBadgeClass(rating)}">${rating}</span>`;
}
export function progressBar(pct, color) {
    const clamped = Math.max(0, Math.min(100, pct));
    return `<div class="progress"><div style="width:${clamped}%;${color ? `background:${color};` : ""}"></div></div>`;
}
export function card(title, inner, subtitle) {
    return `<div class="card"><h3>${escapeHtml(title)}</h3>${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ""}${inner}</div>`;
}
let modalRoot = null;
export function closeModal() {
    if (modalRoot) {
        modalRoot.remove();
        modalRoot = null;
    }
}
export function openModal(innerHtml, onMount) {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `<div class="modal">${innerHtml}</div>`;
    backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop)
            closeModal();
    });
    document.body.appendChild(backdrop);
    modalRoot = backdrop;
    if (onMount)
        onMount(backdrop);
}
export function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const c of children) {
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
}
//# sourceMappingURL=shared.js.map