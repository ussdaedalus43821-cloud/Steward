import { store } from "../../state/store.js";
import { formatMoney } from "../../utils/format.js";
import { lineChart, legendHtml } from "../charts.js";
import { openModal, closeModal } from "../shared.js";
export function renderEconDev(container) {
    const j = store.career.jurisdiction;
    const history = j.scorecardHistory;
    const growthChart = lineChart([{ label: "Population Growth %", color: "#1f5fb8", values: history.map((h) => h.populationGrowthPct * 100) }], 560, 180);
    const programsHtml = j.econDevPrograms.length
        ? j.econDevPrograms
            .map((p) => `<tr>
        <td>${p.label} ${p.active ? "" : '<span class="badge neutral">ended</span>'}</td>
        <td class="num">${formatMoney(p.annualCost)}</td>
        <td class="num">+${p.growthBoostPct.toFixed(1)}%</td>
        <td class="num">${p.active ? `${p.monthsRemaining}mo left` : "—"}</td>
        <td>${p.active ? `<button class="btn small secondary" data-cancel-program="${p.id}">End</button>` : ""}</td>
      </tr>`)
            .join("")
        : `<tr><td colspan="5" class="locked-note">No active incentive programs.</td></tr>`;
    container.innerHTML = `
    <div class="two-col">
      <div class="card">
        <h3>Growth Trend</h3>
        <div class="chart-wrap">${growthChart}</div>
        ${legendHtml([{ label: "Population Growth %", color: "#1f5fb8", values: [] }])}
        <p class="field-hint">Growth responds to service quality, infrastructure condition, tax competitiveness, and incentive programs below.</p>
      </div>
      <div class="card">
        <h3>Current Growth Drivers</h3>
        <table>
          <tr><td>Population</td><td class="num">${j.population.toLocaleString()}</td></tr>
          <tr><td>Tax Competitiveness Index</td><td class="num">${j.vitals.taxCompetitivenessIndex.toFixed(0)} (100=avg)</td></tr>
          <tr><td>Infrastructure Condition</td><td class="num">${j.vitals.infrastructureCondition.toFixed(0)}/100</td></tr>
          <tr><td>Economic Health</td><td class="num">${j.vitals.economicHealth.toFixed(0)}/100</td></tr>
        </table>
        <p class="field-hint">Zoning authority is exercised through the Planning &amp; Zoning department budget (see Departments tab) once unlocked.</p>
      </div>
    </div>
    <div class="card" style="margin-top:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h3 style="margin:0;">Tax Abatements & Incentive Programs</h3>
        <button class="btn" id="new-incentive-btn">+ New Incentive</button>
      </div>
      <table>
        <thead><tr><th>Program</th><th class="num">Annual Cost</th><th class="num">Growth Boost</th><th class="num">Duration</th><th></th></tr></thead>
        <tbody>${programsHtml}</tbody>
      </table>
      <p class="field-hint">Incentives trade near-term revenue for a bet on long-run tax base growth.</p>
    </div>
  `;
    container.querySelector("#new-incentive-btn")?.addEventListener("click", openIncentiveModal);
    container.querySelectorAll("button[data-cancel-program]").forEach((btn) => {
        btn.addEventListener("click", () => store.cancelEconDevProgram(btn.dataset.cancelProgram));
    });
}
function openIncentiveModal() {
    openModal(`<h2>New Incentive Program</h2>
    <div class="field-row">
      <label class="field">Program Name</label>
      <input type="text" id="inc-name" placeholder="e.g. Downtown Business Tax Abatement" />
    </div>
    <div class="field-row">
      <label class="field">Annual Cost (forgone revenue)</label>
      <input type="number" id="inc-cost" value="150000" min="0" step="10000" />
    </div>
    <div class="field-row">
      <label class="field">Expected Growth Boost (%/yr)</label>
      <input type="number" id="inc-boost" value="1.5" min="0" max="6" step="0.1" />
    </div>
    <div class="field-row">
      <label class="field">Duration (months)</label>
      <input type="number" id="inc-duration" value="60" min="6" max="240" />
    </div>
    <div class="modal-actions">
      <button class="btn secondary" id="inc-cancel">Cancel</button>
      <button class="btn" id="inc-submit">Launch Program</button>
    </div>`, (root) => {
        root.querySelector("#inc-cancel")?.addEventListener("click", closeModal);
        root.querySelector("#inc-submit")?.addEventListener("click", () => {
            const name = root.querySelector("#inc-name").value.trim() || "Incentive Program";
            const cost = Number(root.querySelector("#inc-cost").value) || 0;
            const boost = Number(root.querySelector("#inc-boost").value) || 0;
            const duration = Number(root.querySelector("#inc-duration").value) || 12;
            store.addEconDevProgram(name, cost, boost, duration);
            closeModal();
        });
    });
}
//# sourceMappingURL=econDev.js.map