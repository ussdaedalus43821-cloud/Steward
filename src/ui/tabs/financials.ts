import { store } from "../../state/store.js";
import { formatMoney, formatMoneyFull, formatPercent } from "../../utils/format.js";
import { computeBalanceCheck } from "../../sim/fiscal.js";
import { lineChart, legendHtml } from "../charts.js";
import { ratingBadge } from "../shared.js";
import { totalDebtOutstanding } from "../../sim/bonds.js";

export function renderFinancials(container: HTMLElement): void {
  const j = store.career.jurisdiction;
  const gf = j.generalFund;
  const check = computeBalanceCheck(j);

  const chart = lineChart(
    [
      { label: "Revenue", color: "#1f5fb8", values: gf.revenueHistory },
      { label: "Expenditures", color: "#c22b2b", values: gf.expenditureHistory },
      { label: "Fund Balance", color: "#1f8a4c", values: gf.fundBalanceHistory },
    ],
    700,
    220
  );

  const bondsRows = j.bonds.length
    ? j.bonds
        .map(
          (b) => `<tr>
        <td>${b.label}</td>
        <td>${b.type === "go" ? "General Obligation" : "Revenue"}</td>
        <td class="num">${formatMoney(b.balance)}</td>
        <td class="num">${formatPercent(b.annualRate * 100, 2)}</td>
        <td class="num">${formatMoney(b.annualPayment)}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="locked-note">No outstanding debt.</td></tr>`;

  container.innerHTML = `
    <div class="card">
      <h3>Government-Wide Balance Check</h3>
      <div class="balance-check ${check.balanced ? "ok" : "fail"}">
        ${check.balanced ? "✓ Balanced" : "✗ Out of balance"} — Assets ${formatMoney(check.assets)} =
        Liabilities ${formatMoney(check.liabilities)} + Net Position ${formatMoney(check.netPositionTracked)}
        ${!check.balanced ? `(discrepancy ${formatMoney(check.discrepancy)})` : ""}
      </div>
      <p class="field-hint">Assets and Net Position are tracked independently from the underlying transactions; if they ever diverge, that indicates a bookkeeping bug rather than a real fiscal event.</p>
    </div>

    <div class="two-col" style="margin-top:16px;">
      <div class="card">
        <h3>General Fund — This Year</h3>
        <table>
          <tr><td>Revenue (YTD)</td><td class="num">${formatMoney(gf.ytdRevenue)}</td></tr>
          <tr><td>Expenditures (YTD)</td><td class="num">${formatMoney(gf.ytdExpenditures)}</td></tr>
          <tr><td>Fund Balance</td><td class="num">${formatMoneyFull(gf.fundBalance)}</td></tr>
          <tr><td>Capital Fund Balance</td><td class="num">${formatMoney(j.capitalFundBalance)}</td></tr>
          <tr><td>Capital Assets, Net</td><td class="num">${formatMoney(j.capitalAssetsNetValue)}</td></tr>
          <tr><td>Total Debt Outstanding</td><td class="num">${formatMoney(totalDebtOutstanding(j))}</td></tr>
          <tr><td>Credit Rating</td><td class="num">${ratingBadge(j.creditRating)}</td></tr>
        </table>
      </div>
      <div class="card">
        <h3>GFOA Fund Balance Benchmark</h3>
        <p class="field-hint">Best practice: unrestricted fund balance ≈ 2 months of operating expenditures (~15–17%).</p>
        <table>
          <tr><td>Your Fund Balance Ratio</td><td class="num">${formatPercent(
            (gf.fundBalance / (gf.lastYearExpenditures || gf.ytdExpenditures * 12 || 1)) * 100
          )}</td></tr>
          <tr><td>Oversight Status</td><td class="num">${j.oversight.level.toUpperCase()}</td></tr>
          <tr><td>Consecutive Deficit Years</td><td class="num">${j.oversight.consecutiveDeficitYears}</td></tr>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <h3>Historical Trend</h3>
      <div class="chart-wrap">${chart}</div>
      ${legendHtml([
        { label: "Revenue", color: "#1f5fb8", values: [] },
        { label: "Expenditures", color: "#c22b2b", values: [] },
        { label: "Fund Balance", color: "#1f8a4c", values: [] },
      ])}
    </div>

    <div class="card" style="margin-top:16px;">
      <h3>Debt Schedule</h3>
      <table>
        <thead><tr><th>Bond</th><th>Type</th><th class="num">Balance</th><th class="num">Rate</th><th class="num">Annual Payment</th></tr></thead>
        <tbody>${bondsRows}</tbody>
      </table>
    </div>

    ${j.tier === "country" ? sovereignNote() : ""}
  `;
}

function sovereignNote(): string {
  return `<div class="card" style="margin-top:16px;">
    <h3>A Note on National Finance</h3>
    <p class="field-hint">
      For consistency across all five career tiers, this game applies the same fund-balance / credit-rating
      framework at the national level as at the local level. In reality, a national government that issues its
      own currency does not face insolvency the way a city or state can — its real constraints are inflation and
      currency/confidence crises, not literally running out of cash. Modeling that properly would mean a different
      set of mechanics (an inflation gauge, bond-market confidence, currency stability) rather than a fund balance
      and credit rating. That's a deliberate simplification for this version, flagged here rather than silently
      assumed.
    </p>
  </div>`;
}
