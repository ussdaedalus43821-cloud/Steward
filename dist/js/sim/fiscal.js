import { clamp } from "../utils/format.js";
import { stageAtLeast } from "./constants.js";
import { expenditureCrisisMultiplier } from "./crisis.js";
export const BASE_ASSESSED_VALUE_PER_CAPITA = 55000;
export const BASE_TAXABLE_SALES_PER_CAPITA = 14000;
export const BASE_INCOME_PER_CAPITA = 32000;
export const BASE_UTILITY_SPEND_PER_CAPITA = 420;
export const DEPRECIATION_RATE = 0.033; // ~30yr useful life, straight-line
// Real municipal utilities commonly make a "payment in lieu of taxes" (PILOT) or franchise-fee
// transfer to the General Fund out of their own profitable months -- compensation for using the
// public right-of-way and the general government services (accounting, HR, legal) that support
// them. Without this, a profitable utility just accumulates cash that can never help the
// General Fund, which isn't how real enterprise funds work.
export const ENTERPRISE_PILOT_RATE = 0.25;
function economicFactor(j) {
    return clamp(j.vitals.economicHealth / 100, 0.35, 1.6);
}
export function ensureEnterpriseFunds(j) {
    // Backfill fields added to EnterpriseFund after a fund was already saved -- without this,
    // a save from before pilotPaidToGeneralFundYtd existed loads it as undefined/null, and the
    // += in tickEnterpriseFundsMonthly turns it into NaN forever.
    for (const ef of j.enterpriseFunds) {
        if (ef.pilotPaidToGeneralFundYtd == null)
            ef.pilotPaidToGeneralFundYtd = 0;
    }
    if (j.tier !== "municipality")
        return;
    if (!j.stage || !stageAtLeast(j.stage, "town"))
        return;
    if (j.enterpriseFunds.some((e) => e.key === "waterSewer"))
        return;
    const seedBalance = j.population * 40;
    j.enterpriseFunds.push({
        key: "waterSewer",
        label: "Water & Sewer Utility",
        feeRate: 50,
        fundBalance: seedBalance,
        ytdRevenue: 0,
        ytdExpenditures: 0,
        subsidyFromGeneralFundYtd: 0,
        pilotPaidToGeneralFundYtd: 0,
    });
    // The seed balance is a real asset appearing for the first time -- recognize it on the
    // equity side too, or the balance check reads "out of balance" the moment this fund exists.
    j.netPositionTracked += seedBalance;
}
export function tickEnterpriseFundsMonthly(j) {
    for (const ef of j.enterpriseFunds) {
        const annualRevenue = j.population * BASE_UTILITY_SPEND_PER_CAPITA * (ef.feeRate / 50) * economicFactor(j);
        const annualExpenditure = j.population * BASE_UTILITY_SPEND_PER_CAPITA * 0.94;
        const monthlyNet = (annualRevenue - annualExpenditure) / 12;
        ef.ytdRevenue += annualRevenue / 12;
        ef.ytdExpenditures += annualExpenditure / 12;
        if (monthlyNet > 0) {
            // PILOT transfer out of this month's profit, before it ever reaches the utility's own
            // balance -- a real General Fund revenue, not an internal bookkeeping shuffle, so it goes
            // through ytdRevenue like any other receipt. Total net position is unaffected either way:
            // it is still just the same monthlyNet moving between two asset buckets.
            const pilot = monthlyNet * ENTERPRISE_PILOT_RATE;
            ef.fundBalance += monthlyNet - pilot;
            // Guard against a save made before this field existed, where it loads as undefined/null --
            // ensureEnterpriseFunds() backfills it too, but that only runs annually/on reclassification,
            // not every month like this tick does.
            ef.pilotPaidToGeneralFundYtd = (ef.pilotPaidToGeneralFundYtd ?? 0) + pilot;
            j.generalFund.fundBalance += pilot;
            j.generalFund.ytdRevenue += pilot;
        }
        else {
            ef.fundBalance += monthlyNet;
        }
        j.netPositionTracked += monthlyNet;
        if (ef.fundBalance < 0) {
            const subsidy = -ef.fundBalance;
            ef.fundBalance = 0;
            ef.subsidyFromGeneralFundYtd += subsidy;
            j.generalFund.fundBalance -= subsidy;
            j.generalFund.ytdExpenditures += subsidy;
        }
    }
}
function transferPerCapita(j) {
    if (j.tier === "municipality") {
        const byStage = {
            hamlet: 950,
            village: 520,
            town: 300,
            small_city: 180,
            city: 120,
            home_rule_city: 80,
        };
        return byStage[j.stage ?? "hamlet"] ?? 200;
    }
    if (j.tier === "county")
        return 260;
    if (j.tier === "state")
        return 1800;
    return 0;
}
export function computeAnnualRevenue(j, tierConfig, economyMultiplier) {
    const byKey = {};
    const econ = economicFactor(j);
    const pop = j.population;
    for (const src of tierConfig.revenueSources) {
        if (src.unlockedAtStage && j.stage && !stageAtLeast(j.stage, src.unlockedAtStage)) {
            continue;
        }
        const cyc = src.cyclical ? economyMultiplier : 1;
        let amount = 0;
        switch (src.key) {
            case "propertyTax":
            case "countyPropertyTax": {
                const assessed = pop * BASE_ASSESSED_VALUE_PER_CAPITA * econ;
                amount = assessed * (j.taxRates.propertyMillRate / 1000);
                break;
            }
            case "salesTax":
            case "stateSalesTax": {
                amount = pop * BASE_TAXABLE_SALES_PER_CAPITA * econ * cyc * (j.taxRates.salesTaxRate / 100);
                break;
            }
            case "stateIncomeTax":
            case "federalIncomeTax": {
                amount = pop * BASE_INCOME_PER_CAPITA * econ * cyc * (j.taxRates.incomeTaxRate / 100);
                break;
            }
            case "federalPayrollTax": {
                amount = pop * BASE_INCOME_PER_CAPITA * econ * cyc * 0.062;
                break;
            }
            case "businessLicenseFees": {
                amount = pop * 9 * econ * cyc * (j.taxRates.businessLicenseFeeLevel / 100);
                break;
            }
            case "courtFees":
            case "tariffsAndOther": {
                amount = pop * 14 * econ * cyc;
                break;
            }
            case "stateTransfer":
            case "federalTransfer": {
                amount = pop * transferPerCapita(j);
                break;
            }
            default:
                amount = 0;
        }
        byKey[src.key] = amount;
    }
    const total = Object.values(byKey).reduce((a, b) => a + b, 0);
    return { byKey, total };
}
export function computeAnnualDepartmentExpenditure(j) {
    const base = j.departments.reduce((sum, d) => sum + d.allocated, 0);
    return base * expenditureCrisisMultiplier(j);
}
export function computeAnnualDebtService(j) {
    return j.bonds.reduce((sum, b) => (b.balance > 0 ? sum + b.annualPayment : sum), 0);
}
export function computeAnnualTransferToCapitalFund(j) {
    return j.capitalProjects
        .filter((p) => p.status === "in_progress" && p.fundingSource === "pay_as_you_go")
        .reduce((sum, p) => sum + p.actualCost / p.durationMonths * 12, 0);
}
export function computeAnnualEconDevCost(j) {
    return j.econDevPrograms.filter((p) => p.active).reduce((sum, p) => sum + p.annualCost, 0);
}
export function computeAnnualBudget(j, tierConfig, economyMultiplier) {
    const revenue = computeAnnualRevenue(j, tierConfig, economyMultiplier);
    const departmentExpenditure = computeAnnualDepartmentExpenditure(j);
    const debtService = computeAnnualDebtService(j);
    const transferToCapitalFund = computeAnnualTransferToCapitalFund(j);
    const pensionContribution = j.pension ? j.pension.plannedContribution : 0;
    const econDevCost = computeAnnualEconDevCost(j);
    const totalExpenditure = departmentExpenditure + debtService + transferToCapitalFund + pensionContribution + econDevCost;
    return {
        revenue,
        departmentExpenditure,
        debtService,
        transferToCapitalFund,
        pensionContribution,
        econDevCost,
        totalExpenditure,
        netChange: revenue.total - totalExpenditure,
    };
}
/** Applies one month's worth of the annual budget to the General Fund. Enforces
 * revenue - expenditures = change in fund balance as a hard invariant. */
export function applyMonthlyFiscalFlow(j, tierConfig, economyMultiplier) {
    const budget = computeAnnualBudget(j, tierConfig, economyMultiplier);
    const monthlyRevenue = budget.revenue.total / 12;
    const monthlyExpenditure = budget.totalExpenditure / 12;
    const before = j.generalFund.fundBalance;
    j.generalFund.ytdRevenue += monthlyRevenue;
    j.generalFund.ytdExpenditures += monthlyExpenditure;
    j.generalFund.fundBalance += monthlyRevenue - monthlyExpenditure;
    j.capitalFundBalance += budget.transferToCapitalFund / 12;
    const after = j.generalFund.fundBalance;
    const delta = after - before;
    const expected = monthlyRevenue - monthlyExpenditure;
    if (Math.abs(delta - expected) > 0.01) {
        throw new Error(`Fund balance invariant violated: expected delta ${expected}, got ${delta}`);
    }
    // Full-accrual government-wide reconciliation, kept in lockstep with the cash ledger above
    // (rather than only at fiscal year-end) so the Financials balance check holds continuously.
    // Bond principal is also amortized here monthly, in step with the debt service cash outflow
    // above, so the liability balance never lags the cash that already paid it down.
    let interestExpenseMonthly = 0;
    for (const bond of j.bonds) {
        if (bond.balance <= 0)
            continue;
        const monthlyInterest = (bond.balance * bond.annualRate) / 12;
        interestExpenseMonthly += monthlyInterest;
        const monthlyPrincipal = bond.annualPayment / 12 - monthlyInterest;
        bond.balance = Math.max(0, bond.balance - monthlyPrincipal);
    }
    const depreciationMonthly = (j.capitalAssetsNetValue * DEPRECIATION_RATE) / 12;
    j.capitalAssetsNetValue = Math.max(0, j.capitalAssetsNetValue - depreciationMonthly);
    // Use the actual cash contribution here, not the ARC -- the ARC is only a target, and the
    // liability-side consequence of under/over-funding it is reconciled exactly once a year
    // against the real before/after change in the unfunded liability (see runAnnualClose),
    // rather than estimated monthly against a figure that may not match what really happens.
    const pensionExpenseMonthly = j.pension ? j.pension.plannedContribution / 12 : 0;
    const fullAccrualExpenseMonthly = budget.departmentExpenditure / 12 +
        interestExpenseMonthly +
        depreciationMonthly +
        pensionExpenseMonthly +
        budget.econDevCost / 12;
    j.netPositionTracked += monthlyRevenue - fullAccrualExpenseMonthly;
}
export function closeFiscalYear(j, tierConfig) {
    const gf = j.generalFund;
    gf.lastYearRevenue = gf.ytdRevenue;
    gf.lastYearExpenditures = gf.ytdExpenditures;
    gf.revenueHistory.push(gf.ytdRevenue);
    gf.expenditureHistory.push(gf.ytdExpenditures);
    gf.fundBalanceHistory.push(gf.fundBalance);
    const breakdown = computeAnnualRevenue(j, tierConfig, 1);
    gf.revenueBreakdownLastYear = breakdown.byKey;
    const transferKeys = new Set(tierConfig.revenueSources.filter((s) => s.type === "transfer").map((s) => s.key));
    const ownSourceRevenue = Object.entries(breakdown.byKey).reduce((sum, [key, amount]) => (transferKeys.has(key) ? sum : sum + amount), 0);
    if (!gf.ownSourceRevenueHistory)
        gf.ownSourceRevenueHistory = [];
    gf.ownSourceRevenueHistory.push(ownSourceRevenue);
    gf.ytdRevenue = 0;
    gf.ytdExpenditures = 0;
    // Enterprise fund YTD counters accumulated monthly all year (see tickEnterpriseFundsMonthly)
    // but were never reset here, so they were really lifetime-to-date, not year-to-date.
    for (const ef of j.enterpriseFunds) {
        ef.ytdRevenue = 0;
        ef.ytdExpenditures = 0;
        ef.subsidyFromGeneralFundYtd = 0;
        ef.pilotPaidToGeneralFundYtd = 0;
    }
}
export function computeBalanceCheck(j) {
    const cash = j.generalFund.fundBalance +
        j.capitalFundBalance +
        j.enterpriseFunds.reduce((s, e) => s + e.fundBalance, 0);
    const assets = cash + j.capitalAssetsNetValue;
    const bondsOutstanding = j.bonds.reduce((s, b) => s + Math.max(0, b.balance), 0);
    const pensionUnfunded = j.pension
        ? Math.max(0, j.pension.actuarialLiability - j.pension.assets)
        : 0;
    const liabilities = bondsOutstanding + pensionUnfunded;
    const discrepancy = assets - liabilities - j.netPositionTracked;
    return {
        assets,
        liabilities,
        netPositionTracked: j.netPositionTracked,
        discrepancy,
        balanced: Math.abs(discrepancy) < 1,
    };
}
export function estimatedAnnualExpenditure(j) {
    return (computeAnnualDepartmentExpenditure(j) +
        computeAnnualDebtService(j) +
        (j.pension ? j.pension.plannedContribution : 0) +
        1);
}
export function fundBalanceRatio(j) {
    // ytdExpenditures is a cumulative year-to-date total, not a monthly rate -- multiplying it
    // by 12 anywhere past month 1 of a fiscal year wildly overstates annual expenditures, which
    // would distort this ratio's display for most of any brand-new jurisdiction's first year.
    const denom = j.generalFund.lastYearExpenditures || estimatedAnnualExpenditure(j);
    return j.generalFund.fundBalance / denom;
}
//# sourceMappingURL=fiscal.js.map