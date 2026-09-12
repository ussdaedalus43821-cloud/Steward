import type { PlayerJurisdiction, SimJurisdiction } from "../../types.js";
import { store } from "../../state/store.js";
import { formatMoney, formatPercent, formatPopulation } from "../../utils/format.js";
import { renderIllustrationSVG } from "../illustration.js";
import { badge, ratingBadge } from "../shared.js";
import { STAGE_LABELS, TIER_LABELS } from "../../sim/constants.js";
import { isEligibleForReclassification } from "../../sim/growth.js";
import { fundBalanceRatio } from "../../sim/fiscal.js";

let drillPath: string[] = [];

function resolvePathNodes(roots: SimJurisdiction[], path: string[]): SimJurisdiction[] {
  const resolved: SimJurisdiction[] = [];
  let level = roots;
  for (const id of path) {
    const node = level.find((n) => n.id === id);
    if (!node) break;
    resolved.push(node);
    level = node.subJurisdictions ?? [];
  }
  return resolved;
}

function renderNodeCard(node: SimJurisdiction): string {
  const svg = renderIllustrationSVG({
    stage: node.stage,
    population: node.population,
    infrastructureCondition: node.vitals.infrastructureCondition,
    maintenanceBacklog: node.vitals.maintenanceBacklog,
    economicHealth: node.vitals.economicHealth,
    activeCapitalProject: node.activeCapitalProject,
    size: "small",
  });
  const subLabel = node.stage ? STAGE_LABELS[node.stage] : TIER_LABELS[node.tier];
  return `<div class="node-card" data-node-id="${node.id}">
    ${svg}
    <div class="node-name">${escapeName(node.name)}</div>
    <div class="node-sub">${subLabel} · ${formatPopulation(node.population)}</div>
    <div class="node-sub">${ratingBadge(node.finance.creditRating)}</div>
  </div>`;
}

function escapeName(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function renderGroupCard(count: number): string {
  return `<div class="node-card node-group-card" data-more="1">
    <div style="font-size:1.6rem;">+${count}</div>
    <div class="node-sub">more, grouped</div>
  </div>`;
}

const MAX_VISIBLE_NODES = 11;

function renderNodeGrid(nodes: SimJurisdiction[]): string {
  if (nodes.length === 0) {
    return `<div class="empty-state">No sub-jurisdictions generated yet.</div>`;
  }
  const sorted = [...nodes].sort((a, b) => b.population - a.population);
  const visible = sorted.slice(0, MAX_VISIBLE_NODES);
  const rest = sorted.length - visible.length;
  return `<div class="node-grid">${visible.map(renderNodeCard).join("")}${
    rest > 0 ? renderGroupCard(rest) : ""
  }</div>`;
}

function renderBreadcrumbs(j: PlayerJurisdiction, path: SimJurisdiction[]): string {
  const crumbs = [`<span class="crumb" data-crumb="-1">${escapeName(j.name)}</span>`];
  path.forEach((n, i) => {
    crumbs.push(`<span class="sep">›</span><span class="crumb" data-crumb="${i}">${escapeName(n.name)}</span>`);
  });
  return `<div class="breadcrumbs">${crumbs.join("")}</div>`;
}

function renderNodeDetail(node: SimJurisdiction): string {
  return `<div class="two-col">
    <div class="card">
      <h3>${escapeName(node.name)}</h3>
      <div class="subtitle">${node.stage ? STAGE_LABELS[node.stage] : TIER_LABELS[node.tier]} · Population ${formatPopulation(
    node.population
  )}</div>
      <div class="illustration-wrap">${renderIllustrationSVG({
        stage: node.stage,
        population: node.population,
        infrastructureCondition: node.vitals.infrastructureCondition,
        maintenanceBacklog: node.vitals.maintenanceBacklog,
        economicHealth: node.vitals.economicHealth,
        activeCapitalProject: node.activeCapitalProject,
        size: "large",
      })}</div>
    </div>
    <div class="card">
      <h3>Budget Summary (simulated)</h3>
      <table>
        <tr><td>Revenue</td><td class="num">${formatMoney(node.finance.revenue)}</td></tr>
        <tr><td>Expenditures</td><td class="num">${formatMoney(node.finance.expenditures)}</td></tr>
        <tr><td>Fund Balance</td><td class="num">${formatMoney(node.finance.fundBalance)}</td></tr>
        <tr><td>Fund Balance Ratio</td><td class="num">${formatPercent(node.finance.fundBalanceRatio * 100)}</td></tr>
        <tr><td>Debt / Revenue</td><td class="num">${formatPercent(node.finance.debtToRevenue * 100)}</td></tr>
        <tr><td>Credit Rating</td><td class="num">${ratingBadge(node.finance.creditRating)}</td></tr>
        <tr><td>Infrastructure Condition</td><td class="num">${node.vitals.infrastructureCondition.toFixed(0)}/100</td></tr>
        <tr><td>Service Quality</td><td class="num">${node.vitals.avgServiceQuality.toFixed(0)}/100</td></tr>
      </table>
      <p class="field-hint">This is a lightweight simulated peer jurisdiction, not directly managed by you.</p>
    </div>
  </div>`;
}

export function renderOverview(container: HTMLElement): void {
  const j = store.career.jurisdiction;

  if (!j.subJurisdictions) {
    container.innerHTML = renderSingleJurisdictionOverview(j);
    wireSingleJurisdictionEvents(container);
    return;
  }

  const pathNodes = resolvePathNodes(j.subJurisdictions, drillPath);
  const currentLevelNodes = pathNodes.length > 0 ? pathNodes[pathNodes.length - 1].subJurisdictions ?? [] : j.subJurisdictions;

  if (pathNodes.length > 0) {
    const focused = pathNodes[pathNodes.length - 1];
    if (!focused.subJurisdictions) {
      store.expandNodeById(focused.id);
      return; // re-render will be triggered by store notify
    }
  }

  container.innerHTML = `
    ${renderBreadcrumbs(j, pathNodes)}
    ${pathNodes.length > 0 ? renderNodeDetail(pathNodes[pathNodes.length - 1]) : renderTopSummary(j)}
    <div class="section-title" style="margin-top:18px;">
      ${pathNodes.length > 0 ? "Sub-jurisdictions" : `${TIER_LABELS[j.tier]} Overview — Sub-jurisdictions`}
    </div>
    ${renderNodeGrid(currentLevelNodes)}
  `;

  container.querySelectorAll<HTMLElement>(".node-card[data-node-id]").forEach((elm) => {
    elm.addEventListener("click", () => {
      drillPath.push(elm.dataset.nodeId!);
      renderOverview(container);
    });
  });
  container.querySelectorAll<HTMLElement>(".crumb").forEach((elm) => {
    elm.addEventListener("click", () => {
      const idx = Number(elm.dataset.crumb);
      drillPath = idx < 0 ? [] : drillPath.slice(0, idx + 1);
      renderOverview(container);
    });
  });
}

function renderTopSummary(j: PlayerJurisdiction): string {
  const fbr = fundBalanceRatio(j);
  return `<div class="grid grid-cols-4">
    ${statTileLocal("Population", formatPopulation(j.population))}
    ${statTileLocal("Fund Balance", formatMoney(j.generalFund.fundBalance), formatPercent(fbr * 100) + " of expenditures")}
    ${statTileLocal("Credit Rating", ratingBadge(j.creditRating))}
    ${statTileLocal("Oversight Status", oversightBadge(j.oversight.level))}
  </div>`;
}

function statTileLocal(label: string, value: string, sub?: string): string {
  return `<div class="card stat-tile"><div class="label">${label}</div><div class="value">${value}</div>${
    sub ? `<div class="sub">${sub}</div>` : ""
  }</div>`;
}

function oversightBadge(level: string): string {
  if (level === "normal") return badge("Normal", "good");
  if (level === "warning") return badge("Warning", "warn");
  if (level === "oversight") return badge("State Oversight", "bad");
  return badge("Emergency Mgmt", "bad");
}

function renderSingleJurisdictionOverview(j: PlayerJurisdiction): string {
  const svg = renderIllustrationSVG({
    stage: j.stage,
    population: j.population,
    infrastructureCondition: j.vitals.infrastructureCondition,
    maintenanceBacklog: j.vitals.maintenanceBacklog,
    economicHealth: j.vitals.economicHealth,
    activeCapitalProject: j.capitalProjects.some((p) => p.status === "in_progress"),
    size: "large",
  });
  const fbr = fundBalanceRatio(j);
  const eligibleStage = isEligibleForReclassification(j);

  return `
    <div class="two-col">
      <div class="card">
        <h3>${escapeName(j.name)}</h3>
        <div class="subtitle">${j.stage ? STAGE_LABELS[j.stage] : ""} · Population ${formatPopulation(j.population)}</div>
        <div class="illustration-wrap">${svg}</div>
        <div class="illustration-caption">Roads, buildings, and streetlights reflect your jurisdiction's real condition.</div>
        ${
          eligibleStage && !j.reclassificationPending
            ? `<div style="margin-top:12px;text-align:center;">
                <button class="btn" id="petition-btn">Petition to Reclassify as ${STAGE_LABELS[eligibleStage]}</button>
              </div>`
            : ""
        }
        ${
          j.reclassificationPending
            ? `<p class="field-hint" style="text-align:center;">Reclassification referendum pending — result expected soon.</p>`
            : ""
        }
      </div>
      <div class="grid" style="align-content:start;">
        ${statTileLocal("Fund Balance", formatMoney(j.generalFund.fundBalance), formatPercent(fbr * 100) + " of expenditures")}
        ${statTileLocal("Credit Rating", ratingBadge(j.creditRating))}
        ${statTileLocal("Oversight Status", oversightBadge(j.oversight.level))}
        ${statTileLocal("Infrastructure", `${j.vitals.infrastructureCondition.toFixed(0)}/100`, `Maintenance backlog ${j.vitals.maintenanceBacklog.toFixed(0)}`)}
        ${statTileLocal("Avg Service Quality", `${avgQuality(j).toFixed(0)}/100`)}
        ${statTileLocal("Economic Health", `${j.vitals.economicHealth.toFixed(0)}/100`, `Tax competitiveness ${j.vitals.taxCompetitivenessIndex.toFixed(0)} (100=avg)`)}
      </div>
    </div>
  `;
}

function avgQuality(j: PlayerJurisdiction): number {
  if (j.departments.length === 0) return 50;
  return j.departments.reduce((s, d) => s + d.serviceQuality, 0) / j.departments.length;
}

function wireSingleJurisdictionEvents(container: HTMLElement): void {
  const btn = container.querySelector<HTMLButtonElement>("#petition-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      const result = store.petitionForReclassification();
      if (!result.ok) alert(result.reason ?? "Not eligible yet.");
    });
  }
}

export function resetDrillDown(): void {
  drillPath = [];
}
