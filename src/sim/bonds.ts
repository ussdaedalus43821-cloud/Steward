import type { Bond, BondType, CreditRating, PlayerJurisdiction } from "../types.js";
import { nextId } from "../utils/id.js";
import { BASE_INTEREST_RATE, CREDIT_RATING_SPREAD, stageAtLeast } from "./constants.js";

export function interestRateFor(type: BondType, rating: CreditRating): number {
  const spread = CREDIT_RATING_SPREAD[rating];
  const revenueBondPremium = type === "revenue" ? 0.006 : 0;
  return BASE_INTEREST_RATE + spread + revenueBondPremium;
}

export function amortizedAnnualPayment(principal: number, annualRate: number, termYears: number): number {
  if (annualRate <= 0) return principal / termYears;
  const r = annualRate;
  const n = termYears;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function canIssueGoBond(j: PlayerJurisdiction, goBondUnlockedAtStage?: string): boolean {
  if (j.tier !== "municipality") return true;
  if (!goBondUnlockedAtStage || !j.stage) return true;
  return stageAtLeast(j.stage, goBondUnlockedAtStage as any);
}

export function canIssueRevenueBond(j: PlayerJurisdiction): boolean {
  return j.tier === "municipality" && j.stage === "home_rule_city";
}

export function issueBond(
  j: PlayerJurisdiction,
  type: BondType,
  principal: number,
  termYears: number,
  currentMonth: number,
  label: string,
  projectId?: string
): Bond {
  const annualRate = interestRateFor(type, j.creditRating);
  const annualPayment = amortizedAnnualPayment(principal, annualRate, termYears);
  const bond: Bond = {
    id: nextId("bond"),
    type,
    label,
    principal,
    balance: principal,
    annualRate,
    termYears,
    issuedMonth: currentMonth,
    annualPayment,
    projectId,
  };
  j.bonds.push(bond);
  j.capitalFundBalance += principal;
  return bond;
}

/** Bond principal is amortized monthly (see fiscal.ts applyMonthlyFiscalFlow) so the
 * balance sheet stays reconciled continuously rather than only at year-end. This just
 * checks for a missed payment and clears fully-retired bonds once a year. */
export function amortizeBondsAnnual(j: PlayerJurisdiction): { missedPayment: boolean } {
  const missedPayment = j.bonds.some(
    (bond) => bond.balance > 0 && j.generalFund.fundBalance < -Math.abs(bond.annualPayment) * 2
  );
  j.bonds = j.bonds.filter((b) => b.balance > 0.5);
  return { missedPayment };
}

export function totalDebtOutstanding(j: PlayerJurisdiction): number {
  return j.bonds.reduce((s, b) => s + b.balance, 0);
}
