import { store } from "../../state/store.js";
import { formatMoney, formatMoneyFull, formatPercent } from "../../utils/format.js";
import { dualInputRow, progressBar, wireDualInputs } from "../shared.js";

export function renderDepartments(container: HTMLElement): void {
  const j = store.career.jurisdiction;

  const hasGeneralAdmin = j.departments.some((d) => d.key === "generalAdmin");
  const adminEfficiencyPct = (j.adminEfficiencyBonus ?? 0) * 100;
  const reliefCard = `<div class="card">
    <h3>Operating Relief</h3>
    <table>
      <tr><td>Operating Grant Pool</td><td class="num">${formatMoney(j.operatingGrantPoolRemaining ?? 0)}</td></tr>
      ${
        hasGeneralAdmin
          ? `<tr><td>Admin Efficiency Bonus</td><td class="num">-${adminEfficiencyPct.toFixed(0)}% on General Admin cost</td></tr>`
          : ""
      }
    </table>
    <div class="field-hint">
      Separate from the capital grant pool, this offsets department payroll automatically each year (state/federal operating aid) — no action needed. ${
        hasGeneralAdmin
          ? "Completing an Administrative Building capital project permanently trims General Admin's per-capita cost a bit further, up to a cap."
          : ""
      } Per-capita department cost also eases somewhat as your population grows, reflecting real economies of scale in local government overhead.
    </div>
  </div>`;

  const deptCards = j.departments
    .map((d) => {
      const perCapita = j.population > 0 ? d.allocated / j.population : 0;
      const sliderMax = Math.max(d.allocated * 3, 100000);
      return `<div class="card">
        <h3>${d.label}</h3>
        <div class="field-row">
          <label class="field">Annual Allocation</label>
          ${dualInputRow("dept", d.key, d.allocated, 0, sliderMax, 1000)}
          <div class="field-hint">${formatMoneyFull(perCapita)} per capita · ${d.staffing} staff</div>
        </div>
        <label class="field">Service Quality</label>
        ${progressBar(d.serviceQuality, qualityColor(d.serviceQuality))}
        <div class="field-hint">${d.serviceQuality.toFixed(0)}/100 — additional spending has diminishing returns</div>
      </div>`;
    })
    .join("");

  const pensionCard = j.pension
    ? `<div class="card">
        <h3>Pension System</h3>
        <table>
          <tr><td>Funded Ratio</td><td class="num">${formatPercent(j.pension.fundedRatio * 100)}</td></tr>
          <tr><td>Actuarial Liability</td><td class="num">${formatMoney(j.pension.actuarialLiability)}</td></tr>
          <tr><td>Assets</td><td class="num">${formatMoney(j.pension.assets)}</td></tr>
          <tr><td>Annual Required Contribution (ARC)</td><td class="num">${formatMoney(j.pension.annualRequiredContribution)}</td></tr>
        </table>
        <div class="field-row">
          <label class="field">Planned Annual Contribution</label>
          ${dualInputRow("pension", "contribution", j.pension.plannedContribution, 0, Math.max(j.pension.annualRequiredContribution * 1.6, 10000), 10000)}
          <div class="field-hint">${
            j.pension.plannedContribution < j.pension.annualRequiredContribution
              ? "Funding below ARC will grow the unfunded liability over time."
              : "Fully funding the ARC keeps the unfunded liability stable or shrinking."
          }</div>
        </div>
      </div>`
    : "";

  const enterpriseCards = j.enterpriseFunds
    .map(
      (ef) => `<div class="card">
        <h3>${ef.label} (Enterprise Fund)</h3>
        <table>
          <tr><td>Fund Balance</td><td class="num">${formatMoney(ef.fundBalance)}</td></tr>
          <tr><td>YTD Revenue</td><td class="num">${formatMoney(ef.ytdRevenue)}</td></tr>
          <tr><td>YTD Expenditures</td><td class="num">${formatMoney(ef.ytdExpenditures)}</td></tr>
          <tr><td>PILOT Paid to General Fund</td><td class="num">${formatMoney(ef.pilotPaidToGeneralFundYtd)}</td></tr>
          ${ef.subsidyFromGeneralFundYtd > 0 ? `<tr><td>Subsidized from General Fund</td><td class="num">${formatMoney(ef.subsidyFromGeneralFundYtd)}</td></tr>` : ""}
        </table>
        <div class="field-row">
          <label class="field">Fee Rate</label>
          ${dualInputRow("enterprise", ef.key, ef.feeRate, 0, 100, 1)}
          <div class="field-hint">Meant to run on its own fee revenue. When profitable, 25% of each month's net income transfers to the General Fund as a payment in lieu of taxes (PILOT) -- real revenue there, not just a number sitting in this fund. Chronic subsidy from the General Fund is a real red flag.</div>
        </div>
        ${ef.subsidyFromGeneralFundYtd > 0 ? `<p class="field-hint" style="color:var(--warn);">This enterprise fund has drawn ${formatMoney(ef.subsidyFromGeneralFundYtd)} from the General Fund this year instead of running independently.</p>` : ""}
      </div>`
    )
    .join("");

  container.innerHTML = `<div class="grid grid-cols-2">${reliefCard}${deptCards}${pensionCard}${enterpriseCards}</div>`;

  wireDualInputs(container, "dept", (key, value) => {
    store.setDepartmentAllocation(key, value);
  });
  wireDualInputs(container, "enterprise", (key, value) => {
    store.setEnterpriseFeeRate(key, value);
  });
  wireDualInputs(container, "pension", (_key, value) => {
    store.setPensionContribution(value);
  });
}

function qualityColor(quality: number): string {
  if (quality >= 70) return "var(--good)";
  if (quality >= 45) return "var(--accent)";
  if (quality >= 25) return "var(--warn)";
  return "var(--bad)";
}
