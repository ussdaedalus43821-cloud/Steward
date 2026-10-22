import { store } from "../../state/store.js";
import { formatMoney, formatMoneyFull, formatPercent, formatPopulation } from "../../utils/format.js";
import {
  computeAnnualBudget,
  computeAnnualDebtService,
  computeBalanceCheck,
  fundBalanceRatio,
} from "../../sim/fiscal.js";
import { computeCreditRating, computeRevenueGrowthTrend } from "../../sim/creditRating.js";
import { lineChart, legendHtml } from "../charts.js";
import { badge, ratingBadge } from "../shared.js";
import { totalDebtOutstanding } from "../../sim/bonds.js";
import { getTierConfig, FUND_BALANCE_BENCHMARK_RATIO } from "../../sim/constants.js";

function statusFor(good: boolean, warn: boolean): "good" | "warn" | "bad" {
  if (good) return "good";
  if (warn) return "warn";
  return "bad";
}

function ratioRow(label: string, value: string, status: "good" | "warn" | "bad", note: string): string {
  return `<tr>
    <td>${label}</td>
    <td class="num">${value}</td>
    <td class="num">${badge(status === "good" ? "Healthy" : status === "warn" ? "Watch" : "At Risk", status)}</td>
    <td class="field-hint">${note}</td>
  </tr>`;
}

export function renderFinancials(container: HTMLElement): void {
  const j = store.career.jurisdiction;
  const gf = j.generalFund;
  const tierConfig = getTierConfig(j.tier);
  const check = computeBalanceCheck(j);
  const budget = computeAnnualBudget(j, tierConfig, store.career.economyMultiplier);
  const fbr = fundBalanceRatio(j);
  const debtService = computeAnnualDebtService(j);
  const annualRevenue = gf.lastYearRevenue || budget.revenue.total || 1;
  const debtToRevenue = totalDebtOutstanding(j) / annualRevenue;
  const debtServiceToRevenue = debtService / annualRevenue;
  const revenueGrowth = computeRevenueGrowthTrend(j);
  const expHistory = gf.expenditureHistory;
  const expenditureGrowth =
    expHistory.length >= 2 && expHistory[expHistory.length - 2] > 0
      ? (expHistory[expHistory.length - 1] - expHistory[expHistory.length - 2]) / expHistory[expHistory.length - 2]
      : 0;
  const ratingBreakdown = computeCreditRating(j, fbr);

  const chart = lineChart(
    [
      { label: "Revenue", color: "#1f5fb8", values: gf.revenueHistory.slice(-10) },
      { label: "Expenditures", color: "#c22b2b", values: gf.expenditureHistory.slice(-10) },
      { label: "Fund Balance", color: "#1f8a4c", values: gf.fundBalanceHistory.slice(-10) },
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

  const revenueLines = tierConfig.revenueSources
    .filter((src) => budget.revenue.byKey[src.key] !== undefined)
    .map((src) => `<tr><td>${src.label}</td><td class="num">${formatMoney(budget.revenue.byKey[src.key])}</td></tr>`)
    .join("");

  const deptLines = j.departments
    .map((d) => `<tr><td>${d.label}</td><td class="num">${formatMoney(d.allocated)}</td></tr>`)
    .join("");

  const years = j.scorecardHistory.slice(-8);
  const histTable = years.length
    ? `<table>
        <thead><tr><th>Year</th>${years
          .map((y) => `<th class="num">Yr ${y.year}</th>`)
          .join("")}</tr></thead>
        <tbody>
          <tr><td>Revenue</td>${years.map((_, i) => `<td class="num">${formatMoney(gf.revenueHistory[gf.revenueHistory.length - years.length + i] ?? 0)}</td>`).join("")}</tr>
          <tr><td>Expenditures</td>${years.map((_, i) => `<td class="num">${formatMoney(gf.expenditureHistory[gf.expenditureHistory.length - years.length + i] ?? 0)}</td>`).join("")}</tr>
          <tr><td>Fund Balance</td>${years.map((_, i) => `<td class="num">${formatMoney(gf.fundBalanceHistory[gf.fundBalanceHistory.length - years.length + i] ?? 0)}</td>`).join("")}</tr>
          <tr><td>Fund Balance Ratio</td>${years.map((y) => `<td class="num">${formatPercent(y.fundBalanceRatio * 100)}</td>`).join("")}</tr>
          <tr><td>Credit Rating</td>${years.map((y) => `<td class="num">${y.creditRating}</td>`).join("")}</tr>
          <tr><td>Population Growth</td>${years.map((y) => `<td class="num">${formatPercent(y.populationGrowthPct * 100)}</td>`).join("")}</tr>
          <tr><td>Avg Service Quality</td>${years.map((y) => `<td class="num">${y.avgServiceQuality.toFixed(0)}</td>`).join("")}</tr>
          <tr><td>Infrastructure</td>${years.map((y) => `<td class="num">${y.infrastructureCondition.toFixed(0)}</td>`).join("")}</tr>
          <tr><td>Overall Score</td>${years.map((y) => `<td class="num">${y.score.toFixed(0)}</td>`).join("")}</tr>
        </tbody>
      </table>`
    : `<div class="empty-state">Historical data accumulates after your first full fiscal year.</div>`;

  const enterpriseRows = j.enterpriseFunds.length
    ? j.enterpriseFunds
        .map(
          (ef) => `<tr>
        <td>${ef.label}</td>
        <td class="num">${formatMoney(ef.ytdRevenue)}</td>
        <td class="num">${formatMoney(ef.ytdExpenditures)}</td>
        <td class="num">${formatMoney(ef.fundBalance)}</td>
        <td class="num">${ef.subsidyFromGeneralFundYtd > 0 ? formatMoney(ef.subsidyFromGeneralFundYtd) : "—"}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="locked-note">No enterprise funds yet.</td></tr>`;

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

    <div class="card" style="margin-top:16px;">
      <h3>Financial Ratio Analysis</h3>
      <table>
        <thead><tr><th>Ratio</th><th class="num">Value</th><th class="num">Status</th><th>Benchmark</th></tr></thead>
        <tbody>
          ${ratioRow(
            "Unrestricted Fund Balance Ratio",
            formatPercent(fbr * 100),
            statusFor(fbr >= FUND_BALANCE_BENCHMARK_RATIO * 0.9, fbr >= 0),
            "GFOA best practice: ≈15–17% (2 months of operating expenditures)"
          )}
          ${ratioRow(
            "Debt Outstanding / Revenue",
            formatPercent(debtToRevenue * 100),
            statusFor(debtToRevenue < 0.6, debtToRevenue < 1.0),
            "Under ~60% is generally comfortable; over 100% draws rating scrutiny"
          )}
          ${ratioRow(
            "Debt Service / Revenue",
            formatPercent(debtServiceToRevenue * 100),
            statusFor(debtServiceToRevenue < 0.08, debtServiceToRevenue < 0.15),
            "Common muni guideline: keep annual debt service under ~10% of revenue"
          )}
          ${ratioRow(
            "Revenue Growth (YoY)",
            formatPercent(revenueGrowth * 100),
            statusFor(revenueGrowth >= expenditureGrowth, revenueGrowth >= expenditureGrowth - 0.02),
            `Expenditures grew ${formatPercent(expenditureGrowth * 100)} over the same period`
          )}
          ${ratioRow(
            "Revenue per Capita",
            formatMoneyFull(annualRevenue / Math.max(1, j.population)),
            "good",
            `Expenditures per capita: ${formatMoneyFull(budget.totalExpenditure / Math.max(1, j.population))}`
          )}
          ${
            j.pension
              ? ratioRow(
                  "Pension Funded Ratio",
                  formatPercent(j.pension.fundedRatio * 100),
                  statusFor(j.pension.fundedRatio >= 0.8, j.pension.fundedRatio >= 0.6),
                  "Actuarially sound is generally considered ≥80% funded"
                )
              : ""
          }
        </tbody>
      </table>
    </div>

    <div class="two-col" style="margin-top:16px;">
      <div class="card">
        <h3>Statement of Revenues &amp; Expenditures</h3>
        <div class="subtitle">Current year, annualized at today's rates and budget</div>
        <table>
          <thead><tr><th colspan="2">Revenues</th></tr></thead>
          <tbody>${revenueLines}<tr><td><strong>Total Revenues</strong></td><td class="num"><strong>${formatMoney(budget.revenue.total)}</strong></td></tr></tbody>
          <thead><tr><th colspan="2">Expenditures</th></tr></thead>
          <tbody>
            ${deptLines}
            <tr><td>Debt Service</td><td class="num">${formatMoney(budget.debtService)}</td></tr>
            <tr><td>Transfer to Capital Fund</td><td class="num">${formatMoney(budget.transferToCapitalFund)}</td></tr>
            ${j.pension ? `<tr><td>Pension Contribution</td><td class="num">${formatMoney(budget.pensionContribution)}</td></tr>` : ""}
            ${budget.econDevCost > 0 ? `<tr><td>Economic Development Incentives</td><td class="num">${formatMoney(budget.econDevCost)}</td></tr>` : ""}
            <tr><td><strong>Total Expenditures</strong></td><td class="num"><strong>${formatMoney(budget.totalExpenditure)}</strong></td></tr>
          </tbody>
          <tfoot>
            <tr><td>Projected Annual Net Change</td><td class="num">${formatMoney(budget.netChange)}</td></tr>
            <tr><td>Fund Balance, Start of This Fiscal Year</td><td class="num">${formatMoney(gf.fundBalance - (gf.ytdRevenue - gf.ytdExpenditures))}</td></tr>
            <tr><td>Fund Balance, Today</td><td class="num">${formatMoneyFull(gf.fundBalance)}</td></tr>
          </tfoot>
        </table>
      </div>
      <div class="card">
        <h3>How Your Credit Rating Is Calculated</h3>
        <table>
          <tr><td>Fund Balance Score (35%)</td><td class="num">${ratingBreakdown.fundBalanceScore.toFixed(0)}</td></tr>
          <tr><td>Debt Score (25%)</td><td class="num">${ratingBreakdown.debtScore.toFixed(0)}</td></tr>
          <tr><td>Revenue Growth Score (${j.pension ? "15" : "25"}%)</td><td class="num">${ratingBreakdown.growthScore.toFixed(0)}</td></tr>
          ${
            ratingBreakdown.pensionScore !== null
              ? `<tr><td>Pension Funded Score (25%)</td><td class="num">${ratingBreakdown.pensionScore.toFixed(0)}</td></tr>`
              : ""
          }
          <tr><td><strong>Overall Score</strong></td><td class="num"><strong>${ratingBreakdown.overall.toFixed(0)} / 100</strong></td></tr>
          <tr><td><strong>Resulting Rating</strong></td><td class="num">${ratingBadge(ratingBreakdown.rating)}</td></tr>
        </table>
        <p class="field-hint">Each score is 0–100; the weighted blend maps to a letter rating that sets your interest rate on new debt. Improve the lowest-weighted score with the biggest gap to move your rating fastest.</p>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <h3>Multi-Year Trend</h3>
      ${
        gf.revenueHistory.length > 0
          ? `<div class="chart-wrap">${chart}</div>
             ${legendHtml([
               { label: "Revenue", color: "#1f5fb8", values: [] },
               { label: "Expenditures", color: "#c22b2b", values: [] },
               { label: "Fund Balance", color: "#1f8a4c", values: [] },
             ])}`
          : ""
      }
      <div style="margin-top:14px;overflow-x:auto;">${histTable}</div>
    </div>

    <div class="two-col" style="margin-top:16px;">
      <div class="card">
        <h3>Statement of Net Position</h3>
        <table>
          <thead><tr><th colspan="2">Assets</th></tr></thead>
          <tbody>
            <tr><td>Cash &amp; Fund Balances</td><td class="num">${formatMoney(check.assets - j.capitalAssetsNetValue)}</td></tr>
            <tr><td>Capital Assets, Net of Depreciation</td><td class="num">${formatMoney(j.capitalAssetsNetValue)}</td></tr>
            <tr><td><strong>Total Assets</strong></td><td class="num"><strong>${formatMoney(check.assets)}</strong></td></tr>
          </tbody>
          <thead><tr><th colspan="2">Liabilities</th></tr></thead>
          <tbody>
            <tr><td>Bonds Payable</td><td class="num">${formatMoney(totalDebtOutstanding(j))}</td></tr>
            ${j.pension ? `<tr><td>Net Pension Liability</td><td class="num">${formatMoney(Math.max(0, j.pension.actuarialLiability - j.pension.assets))}</td></tr>` : ""}
            <tr><td><strong>Total Liabilities</strong></td><td class="num"><strong>${formatMoney(check.liabilities)}</strong></td></tr>
          </tbody>
          <tfoot>
            <tr><td>Net Position</td><td class="num">${formatMoney(check.netPositionTracked)}</td></tr>
          </tfoot>
        </table>
      </div>
      <div class="card">
        <h3>Debt Schedule</h3>
        <table>
          <thead><tr><th>Bond</th><th>Type</th><th class="num">Balance</th><th class="num">Rate</th><th class="num">Annual Payment</th></tr></thead>
          <tbody>${bondsRows}</tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <h3>Enterprise Funds</h3>
      <table>
        <thead><tr><th>Fund</th><th class="num">YTD Revenue</th><th class="num">YTD Expenditures</th><th class="num">Fund Balance</th><th class="num">GF Subsidy YTD</th></tr></thead>
        <tbody>${enterpriseRows}</tbody>
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
