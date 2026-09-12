import { clamp } from "../utils/format.js";
import { stageAtLeast } from "./constants.js";
export const BASE_ASSESSED_VALUE_PER_CAPITA = 55000;
export const BASE_TAXABLE_SALES_PER_CAPITA = 14000;
export const BASE_INCOME_PER_CAPITA = 32000;
export const BASE_UTILITY_SPEND_PER_CAPITA = 420;
export const DEPRECIATION_RATE = 0.033; // ~30yr useful life, straight-line
function economicFactor(j) {
    return clamp(j.vitals.economicHealth / 100, 0.35, 1.6);
}
export function ensureEnterpriseFunds(j) {
    if (j.tier !== "municipality")
        return;
    if (!j.stage || !stageAtLeast(j.stage, "town"))
        return;
    if (j.enterpriseFunds.some((e) => e.key === "waterSewer"))
        return;
    j.enterpriseFunds.push({
        key: "waterSewer",
        label: "Water & Sewer Utility",
        feeRate: 50,
        fundBalance: j.population * 40,
        ytdRevenue: 0,
        ytdExpenditures: 0,
        subsidyFromGeneralFundYtd: 0,
    });
}
export function tickEnterpriseFundsMonthly(j) {
    for (const ef of j.enterpriseFunds) {
        const annualRevenue = j.population * BASE_UTILITY_SPEND_PER_CAPITA * (ef.feeRate / 50) * economicFactor(j);
        const annualExpenditure = j.population * BASE_UTILITY_SPEND_PER_CAPITA * 0.94;
        const monthlyNet = (annualRevenue - annualExpenditure) / 12;
        ef.ytdRevenue += annualRevenue / 12;
        ef.ytdExpenditures += annualExpenditure / 12;
        ef.fundBalance += monthlyNet;
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
    return j.departments.reduce((sum, d) => sum + d.allocated, 0);
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
    const pensionExpenseMonthly = j.pension ? j.pension.annualRequiredContribution / 12 : 0;
    const fullAccrualExpenseMonthly = budget.departmentExpenditure / 12 + interestExpenseMonthly + depreciationMonthly + pensionExpenseMonthly;
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
    gf.ytdRevenue = 0;
    gf.ytdExpenditures = 0;
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
    const denom = j.generalFund.lastYearExpenditures || j.generalFund.ytdExpenditures * 12 || estimatedAnnualExpenditure(j);
    return j.generalFund.fundBalance / denom;
}
//# sourceMappingURL=fiscal.js.map