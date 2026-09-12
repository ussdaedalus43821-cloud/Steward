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

export function renderHeader(container: HTMLElement, activeTab: TabKey, onTabClick: (tab: TabKey) => void): void {
  const career = store.career;
  const j = career.jurisdiction;
  const fbrBad = j.oversight.level === "oversight" || j.oversight.level === "emergency";
  const fbrGood = j.oversight.level === "normal";

  container.innerHTML = `
    <div class="topbar">
      <div class="brand">STEWARD</div>
      <div>
        <div class="juris-name">${j.name}</div>
        <div class="juris-meta">${jobTitle()} · ${TIER_LABELS[j.tier]}${
    j.stage ? " · " + STAGE_LABELS[j.stage] : ""
  }</div>
      </div>
      <div class="spacer"></div>
      <div class="stat"><span class="label">Population</span><span class="value">${formatPopulation(j.population)}</span></div>
      <div class="stat"><span class="label">Fund Balance</span><span class="value ${statClass(false, j.generalFund.fundBalance < 0)}">${formatMoney(
    j.generalFund.fundBalance
  )}</span></div>
      <div class="stat"><span class="label">Credit Rating</span><span class="value">${j.creditRating}</span></div>
      <div class="stat"><span class="label">Oversight</span><span class="value ${statClass(fbrGood, fbrBad)}">${j.oversight.level.toUpperCase()}</span></div>
      <div class="stat"><span class="label">Reputation</span><span class="value">${career.reputation.toFixed(0)}</span></div>
      <div class="stat"><span class="label">Clock</span><span class="value">${formatMonth(career.clockMonth)}</span></div>
      <div class="clock-controls">
        ${SPEEDS.map(
          (s) => `<button data-speed="${s.speed}" class="${career.clockSpeed === s.speed ? "active" : ""}">${s.label}</button>`
        ).join("")}
      </div>
    </div>
    ${career.jurisdiction.oversight.level !== "normal" ? oversightBanner(career.jurisdiction.oversight.level) : ""}
    <div class="tabnav">
      ${TABS.map((t) => `<button data-tab="${t.key}" class="${activeTab === t.key ? "active" : ""}">${t.label}</button>`).join("")}
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
}

function oversightBanner(level: string): string {
  if (level === "warning") {
    return `<div class="oversight-banner warning">⚠ Formal warning: fiscal indicators have slipped. Sustained decline risks state oversight.</div>`;
  }
  if (level === "oversight") {
    return `<div class="oversight-banner oversight">⚠ Under state oversight: a review board can veto major budget decisions until finances stabilize.</div>`;
  }
  return `<div class="oversight-banner emergency">⛔ Fiscal emergency: an emergency manager may be installed if this is not reversed.</div>`;
}
