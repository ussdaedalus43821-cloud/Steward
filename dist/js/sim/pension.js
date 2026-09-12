import { clamp } from "../utils/format.js";
export function createPensionSystem(initialLiability, fundedRatio) {
    const assets = initialLiability * fundedRatio;
    const normalCost = initialLiability * 0.018;
    const unfunded = Math.max(0, initialLiability - assets);
    return {
        actuarialLiability: initialLiability,
        assets,
        fundedRatio,
        annualRequiredContribution: normalCost + unfunded / 20,
        actualContributionLastYear: 0,
        plannedContribution: normalCost + unfunded / 20,
        assumedReturnRate: 0.07,
    };
}
export function annualPensionTick(pension, economyMultiplier, rng) {
    const investmentReturn = pension.assumedReturnRate + (economyMultiplier - 1) * 0.7 + rng.range(-0.035, 0.035);
    pension.assets = Math.max(0, pension.assets * (1 + investmentReturn) + pension.plannedContribution);
    const shortfall = Math.max(0, pension.annualRequiredContribution - pension.plannedContribution);
    pension.actuarialLiability *= 1.03;
    pension.actuarialLiability += shortfall * 0.5;
    pension.fundedRatio = clamp(pension.assets / pension.actuarialLiability, 0, 3);
    const unfunded = Math.max(0, pension.actuarialLiability - pension.assets);
    const normalCost = pension.actuarialLiability * 0.018;
    pension.actualContributionLastYear = pension.plannedContribution;
    pension.annualRequiredContribution = normalCost + unfunded / 20;
}
//# sourceMappingURL=pension.js.map