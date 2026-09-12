import { store } from "../../state/store.js";
import { formatMoney, formatPercent } from "../../utils/format.js";
import { computeAnnualBudget } from "../../sim/fiscal.js";
import { getTierConfig, stageAtLeast } from "../../sim/constants.js";
import { badge } from "../shared.js";

export function renderBudget(container: HTMLElement): void {
  const j = store.career.jurisdiction;
  const tierConfig = getTierConfig(j.tier);
  const budget = computeAnnualBudget(j, tierConfig, store.career.economyMultiplier);

  const rows = tierConfig.revenueSources
    .filter((src) => !src.unlockedAtStage || !j.stage || stageAtLeast(j.stage, src.unlockedAtStage))
    .map((src) => {
      const amount = budget.revenue.byKey[src.key] ?? 0;
      return `<tr><td>${src.label}</td><td class="num">${formatMoney(amount)}</td></tr>`;
    })
    .join("");

  const isUnlocked = (key: string) => {
    const src = tierConfig.revenueSources.find((s) => s.key === key);
    if (!src) return false;
    return !src.unlockedAtStage || !j.stage || stageAtLeast(j.stage, src.unlockedAtStage);
  };
  const hasSalesTax = isUnlocked("salesTax") || isUnlocked("stateSalesTax");
  const hasBusinessFee = isUnlocked("businessLicenseFees");

  const lockedRows = tierConfig.revenueSources
    .filter((src) => src.unlockedAtStage && j.stage && !stageAtLeast(j.stage, src.unlockedAtStage))
    .map((src) => `<tr><td class="locked-note">${src.label} (locked)</td><td class="num locked-note">—</td></tr>`)
    .join("");

  container.innerHTML = `
    <div class="two-col">
      <div class="card">
        <h3>Tax Rates & Fees</h3>
        ${
          j.tier === "municipality" || j.tier === "county"
            ? renderRateControl("Property Mill Rate", "propertyMillRate", j.taxRates.propertyMillRate, 0, 40, 0.5, "mills / $1,000 assessed value")
            : ""
        }
        ${hasSalesTax ? renderRateControl("Sales Tax Rate", "salesTaxRate", j.taxRates.salesTaxRate, 0, 10, 0.1, "%") : ""}
        ${
          j.tier === "state" || j.tier === "country"
            ? renderRateControl("Income Tax Rate", "incomeTaxRate", j.taxRates.incomeTaxRate, 0, 25, 0.25, "% (optional — some states levy none)")
            : ""
        }
        ${hasBusinessFee ? renderRateControl("Business License Fee Level", "businessLicenseFeeLevel", j.taxRates.businessLicenseFeeLevel, 0, 100, 1, "intensity") : ""}
        <p class="field-hint">Tax competitiveness index: ${j.vitals.taxCompetitivenessIndex.toFixed(0)} (100 = comparable jurisdictions). Higher rates raise revenue but can slow growth.</p>
      </div>
      <div class="card">
        <h3>Annual Budget Summary</h3>
        <table>
          <tr><td>Total Revenue</td><td class="num">${formatMoney(budget.revenue.total)}</td></tr>
          <tr><td>Department Expenditures</td><td class="num">${formatMoney(budget.departmentExpenditure)}</td></tr>
          <tr><td>Debt Service</td><td class="num">${formatMoney(budget.debtService)}</td></tr>
          <tr><td>Transfer to Capital Fund</td><td class="num">${formatMoney(budget.transferToCapitalFund)}</td></tr>
          ${j.pension ? `<tr><td>Pension Contribution</td><td class="num">${formatMoney(budget.pensionContribution)}</td></tr>` : ""}
          ${budget.econDevCost > 0 ? `<tr><td>Economic Development Incentives</td><td class="num">${formatMoney(budget.econDevCost)}</td></tr>` : ""}
          <tfoot>
            <tr><td>Net Change</td><td class="num">${formatMoney(budget.netChange)} ${
    budget.netChange >= 0 ? badge("Surplus", "good") : badge("Deficit", "bad")
  }</td></tr>
          </tfoot>
        </table>
      </div>
    </div>
    <div class="card" style="margin-top:16px;">
      <h3>Revenue by Source</h3>
      <table>
        <thead><tr><th>Source</th><th class="num">Annual Amount</th></tr></thead>
        <tbody>${rows}${lockedRows}</tbody>
      </table>
    </div>
  `;

  container.querySelectorAll<HTMLInputElement>("input[data-rate]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.rate as any;
      store.setTaxRate(key, Number(input.value));
      const valueEl = container.querySelector(`span[data-rate-value="${key}"]`);
      if (valueEl) valueEl.textContent = Number(input.value).toFixed(2);
    });
  });
}

function renderRateControl(
  label: string,
  key: string,
  value: number,
  min: number,
  max: number,
  step: number,
  hint: string
): string {
  return `<div class="field-row">
    <label class="field">${label} <span class="field-value" data-rate-value="${key}">${value.toFixed(2)}</span></label>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-rate="${key}" />
    <div class="field-hint">${hint}</div>
  </div>`;
}
