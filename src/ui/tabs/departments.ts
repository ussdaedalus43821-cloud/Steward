import { store } from "../../state/store.js";
import { formatMoney, formatMoneyFull, formatPercent } from "../../utils/format.js";
import { progressBar } from "../shared.js";

export function renderDepartments(container: HTMLElement): void {
  const j = store.career.jurisdiction;

  const deptCards = j.departments
    .map((d) => {
      const perCapita = j.population > 0 ? d.allocated / j.population : 0;
      return `<div class="card">
        <h3>${d.label}</h3>
        <div class="field-row">
          <label class="field">Annual Allocation <span class="field-value">${formatMoney(d.allocated)}</span></label>
          <input type="range" min="0" max="${Math.max(d.allocated * 3, 100000)}" step="1000" value="${d.allocated}" data-dept="${d.key}" />
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
          <label class="field">Planned Annual Contribution <span class="field-value">${formatMoney(j.pension.plannedContribution)}</span></label>
          <input type="range" min="0" max="${Math.max(j.pension.annualRequiredContribution * 1.6, 10000)}" step="10000" value="${j.pension.plannedContribution}" id="pension-input" />
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
          ${ef.subsidyFromGeneralFundYtd > 0 ? `<tr><td>Subsidized from General Fund</td><td class="num">${formatMoney(ef.subsidyFromGeneralFundYtd)}</td></tr>` : ""}
        </table>
        <div class="field-row">
          <label class="field">Fee Rate <span class="field-value">${ef.feeRate.toFixed(0)}</span></label>
          <input type="range" min="0" max="100" step="1" value="${ef.feeRate}" data-enterprise="${ef.key}" />
          <div class="field-hint">Meant to run on its own fee revenue. Chronic subsidy from the General Fund is a real red flag.</div>
        </div>
        ${ef.subsidyFromGeneralFundYtd > 0 ? `<p class="field-hint" style="color:var(--warn);">This enterprise fund has drawn ${formatMoney(ef.subsidyFromGeneralFundYtd)} from the General Fund this year instead of running independently.</p>` : ""}
      </div>`
    )
    .join("");

  container.innerHTML = `<div class="grid grid-cols-2">${deptCards}${pensionCard}${enterpriseCards}</div>`;

  container.querySelectorAll<HTMLInputElement>("input[data-dept]").forEach((input) => {
    input.addEventListener("input", () => {
      store.setDepartmentAllocation(input.dataset.dept!, Number(input.value));
    });
  });
  container.querySelectorAll<HTMLInputElement>("input[data-enterprise]").forEach((input) => {
    input.addEventListener("input", () => {
      store.setEnterpriseFeeRate(input.dataset.enterprise!, Number(input.value));
    });
  });
  container.querySelector<HTMLInputElement>("#pension-input")?.addEventListener("input", (e) => {
    store.setPensionContribution(Number((e.target as HTMLInputElement).value));
  });
}

function qualityColor(quality: number): string {
  if (quality >= 70) return "var(--good)";
  if (quality >= 45) return "var(--accent)";
  if (quality >= 25) return "var(--warn)";
  return "var(--bad)";
}
