/** Small inline monochrome SVG icons (currentColor stroke), used sparingly in the topbar and
 * the key Overview stat tiles. Kept as plain strings -- no icon font or external request. */

function svg(paths: string, viewBox = "0 0 24 24"): string {
  return `<svg viewBox="${viewBox}" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export const ICONS: Record<string, string> = {
  population: svg(
    `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`
  ),
  money: svg(`<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`),
  rating: svg(`<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>`),
  shield: svg(`<path d="M12 2 4 5v6c0 5.3 3.4 9.9 8 11 4.6-1.1 8-5.7 8-11V5l-8-3Z"/>`),
  reputation: svg(`<circle cx="12" cy="8" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/>`),
  clock: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>`),
  infrastructure: svg(
    `<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/>`
  ),
  service: svg(`<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>`),
  economy: svg(`<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`),
  star: svg(`<path d="M12 2 15 9l7.5 1-5.5 5 1.5 7.5-6.5-4-6.5 4 1.5-7.5-5.5-5L9 9z"/>`),
};

export function icon(name: keyof typeof ICONS, extraClass = ""): string {
  return `<span class="icon${extraClass ? " " + extraClass : ""}">${ICONS[name] ?? ""}</span>`;
}
