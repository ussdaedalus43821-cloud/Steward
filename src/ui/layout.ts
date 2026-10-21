import type { ClockSpeed } from "../types.js";
import { store } from "../state/store.js";
import { formatMoney, formatMonth, formatPopulation } from "../utils/format.js";
import { STAGE_JOB_TITLE, STAGE_LABELS, TIER_LABELS } from "../sim/constants.js";

export const TABS = [
  { key: "overview", label: "Overview" },
  { key: "budget", label: "Budget" },
  { key: "capital", label: "Capital Projects" },
  { key: "departments", label: "Departments" },
  { key: "econdev", label: "Economic Development" },
  { key: "financials", label: "Financials" },
  { key: "settings", label: "Settings" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

const SPEEDS: { speed: ClockSpeed; label: string }[] = [
  { speed: 0, label: "Pause" },
  { speed: 1, label: "1x" },
  { speed: 4, label: "4x" },
  { speed: 15, label: "15x" },
];

function jobTitle(): string {
  const j = store.career.jurisdiction;
  if (j.tier === "municipality" && j.stage) return STAGE_JOB_TITLE[j.stage];
  if (j.tier === "county") return "County Administrator";
  if (j.tier === "state") return "State Budget Director";
  return "National Budget Director";
}

function statClass(good: boolean, bad: boolean): string {
  if (bad) return "bad";
  if (good) return "good";
  return "";
}

// The header re-renders on every single sim tick (every 300ms at 15x speed). Rebuilding the
// whole subtree with innerHTML every time destroys and recreates the speed/tab buttons each
// call, which races against touch input: if a tap's DOM target gets removed between touchstart
// and the synthesized click (entirely plausible at a 300ms tick cadence), the click is silently
// dropped -- this is what made Pause feel unreliable at high speed. Build the shell once and
// patch only the parts that actually change on every subsequent call, so the buttons are stable
// DOM nodes for the whole session and never race with an in-flight tap.
function buildHeaderShell(container: HTMLElement, onTabClick: (tab: TabKey) => void): void {
  container.innerHTML = `
    <div class="topbar">
      <div class="brand">STEWARD</div>
      <div>
        <div class="juris-name" data-field="name"></div>
        <div class="juris-meta" data-field="jobmeta"></div>
      </div>
      <div class="spacer"></div>
      <div class="stat"><span class="label">Population</span><span class="value" data-field="population"></span></div>
      <div class="stat"><span class="label">Fund Balance</span><span class="value" data-field="fundbalance"></span></div>
      <div class="stat"><span class="label">Credit Rating</span><span class="value" data-field="creditrating"></span></div>
      <div class="stat"><span class="label">Oversight</span><span class="value" data-field="oversight"></span></div>
      <div class="stat"><span class="label">Reputation</span><span class="value" data-field="reputation"></span></div>
      <div class="stat"><span class="label">Clock</span><span class="value" data-field="clock"></span></div>
      <div class="clock-controls">
        ${SPEEDS.map((s) => `<button data-speed="${s.speed}">${s.label}</button>`).join("")}
      </div>
    </div>
    <div class="tabnav">
      ${TABS.map((t) => `<button data-tab="${t.key}">${t.label}</button>`).join("")}
    </div>
  `;

  container.querySelectorAll<HTMLButtonElement>("button[data-speed]").forEach((btn) => {
    btn.addEventListener("click", () => {
      store.setClockSpeed(Number(btn.dataset.speed) as ClockSpeed);
    });
  });
  container.querySelectorAll<HTMLButtonElement>("button[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => onTabClick(btn.dataset.tab as TabKey));
  });
  container.dataset.headerBuilt = "1";
}

function setText(container: HTMLElement, selector: string, text: string): void {
  const el = container.querySelector<HTMLElement>(selector);
  if (el) el.textContent = text;
}

export function renderHeader(container: HTMLElement, activeTab: TabKey, onTabClick: (tab: TabKey) => void): void {
  const career = store.career;
  const j = career.jurisdiction;
  const fbrBad = j.oversight.level === "oversight" || j.oversight.level === "emergency";
  const fbrGood = j.oversight.level === "normal";

  if (container.dataset.headerBuilt !== "1") {
    buildHeaderShell(container, onTabClick);
  }

  setText(container, "[data-field=name]", j.name);
  setText(
    container,
    "[data-field=jobmeta]",
    `${jobTitle()} · ${TIER_LABELS[j.tier]}${j.stage ? " · " + STAGE_LABELS[j.stage] : ""}`
  );
  setText(container, "[data-field=population]", formatPopulation(j.population));
  const fbEl = container.querySelector<HTMLElement>("[data-field=fundbalance]");
  if (fbEl) {
    fbEl.textContent = formatMoney(j.generalFund.fundBalance);
    fbEl.className = `value ${statClass(false, j.generalFund.fundBalance < 0)}`;
  }
  setText(container, "[data-field=creditrating]", j.creditRating);
  const ovEl = container.querySelector<HTMLElement>("[data-field=oversight]");
  if (ovEl) {
    ovEl.textContent = j.oversight.level.toUpperCase();
    ovEl.className = `value ${statClass(fbrGood, fbrBad)}`;
  }
  setText(container, "[data-field=reputation]", career.reputation.toFixed(0));
  setText(container, "[data-field=clock]", formatMonth(career.clockMonth));

  container.querySelectorAll<HTMLButtonElement>("button[data-speed]").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.speed) === career.clockSpeed);
  });
  container.querySelectorAll<HTMLButtonElement>("button[data-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === activeTab);
  });

  let banner = container.querySelector<HTMLElement>(".oversight-banner");
  if (j.oversight.level === "normal") {
    if (banner) banner.remove();
  } else if (!banner || banner.dataset.level !== j.oversight.level) {
    const topbar = container.querySelector(".topbar")!;
    topbar.insertAdjacentHTML("afterend", oversightBanner(j.oversight.level));
    banner?.remove();
  }
}

function oversightBanner(level: string): string {
  if (level === "warning") {
    return `<div class="oversight-banner warning" data-level="warning">⚠ Formal warning: fiscal indicators have slipped. Sustained decline risks state oversight.</div>`;
  }
  if (level === "oversight") {
    return `<div class="oversight-banner oversight" data-level="oversight">⚠ Under state oversight: a review board can veto major budget decisions until finances stabilize.</div>`;
  }
  return `<div class="oversight-banner emergency" data-level="emergency">⛔ Fiscal emergency: an emergency manager may be installed if this is not reversed.</div>`;
}
