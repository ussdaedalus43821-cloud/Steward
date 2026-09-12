import { clamp } from "../utils/format.js";
import { GROWTH_STAGE_ORDER, POPULATION_THRESHOLDS, stageIndex } from "./constants.js";
import { averageServiceQuality } from "./departments.js";
import { fundBalanceRatio } from "./fiscal.js";
const BASELINE_EFFECTIVE_RATE = {
    municipality: 11,
    county: 13,
    state: 6,
    country: 18,
};
export function computeTaxCompetitivenessIndex(j) {
    const baseline = BASELINE_EFFECTIVE_RATE[j.tier] ?? 10;
    const effective = j.taxRates.propertyMillRate * 0.6 +
        j.taxRates.salesTaxRate * 1.4 +
        j.taxRates.incomeTaxRate * 1.6;
    if (baseline <= 0)
        return 100;
    return clamp((effective / baseline) * 100, 20, 250);
}
export function computeAnnualPopulationGrowthRate(j, economyMultiplier) {
    const avgQuality = averageServiceQuality(j);
    const infra = j.vitals.infrastructureCondition;
    const taxIndex = j.vitals.taxCompetitivenessIndex;
    const base = 0.008;
    const serviceFactor = ((avgQuality - 50) / 100) * 0.035;
    const infraFactor = ((infra - 55) / 100) * 0.02;
    const taxFactor = ((100 - taxIndex) / 100) * 0.03;
    const econDevBoost = j.econDevPrograms
        .filter((p) => p.active)
        .reduce((s, p) => s + p.growthBoostPct / 100, 0);
    const economyFactor = (economyMultiplier - 1) * 0.4;
    return clamp(base + serviceFactor + infraFactor + taxFactor + econDevBoost + economyFactor, -0.06, 0.09);
}
export function updateVitals(j, economyMultiplier) {
    const avgQuality = averageServiceQuality(j);
    const v = j.vitals;
    const decay = 0.7;
    const publicWorks = j.departments.find((d) => d.key === "publicWorks" || d.key === "countyRoads" || d.key === "stateHighways" || d.key === "nationalInfrastructure");
    const maintenanceEffect = publicWorks ? ((publicWorks.serviceQuality - 50) / 50) * 1.4 : 0;
    v.infrastructureCondition = clamp(v.infrastructureCondition - decay + maintenanceEffect, 0, 100);
    v.maintenanceBacklog = clamp(100 - v.infrastructureCondition, 0, 100);
    const target = clamp(55 + (avgQuality - 50) * 0.3 + (v.infrastructureCondition - 55) * 0.25 + (economyMultiplier - 1) * 45, 10, 130);
    v.economicHealth = v.economicHealth + (target - v.economicHealth) * 0.25;
    v.taxCompetitivenessIndex = computeTaxCompetitivenessIndex(j);
    v.assessedValuePerCapita = 55000 * clamp(v.economicHealth / 100, 0.35, 1.6);
}
export function applyAnnualPopulationGrowth(j, economyMultiplier) {
    const rate = computeAnnualPopulationGrowthRate(j, economyMultiplier);
    j.population = Math.max(30, Math.round(j.population * (1 + rate)));
    return rate;
}
export function nextGrowthStage(current) {
    const idx = stageIndex(current);
    if (idx < 0 || idx >= GROWTH_STAGE_ORDER.length - 1)
        return null;
    return GROWTH_STAGE_ORDER[idx + 1];
}
export function isEligibleForReclassification(j) {
    if (j.tier !== "municipality" || !j.stage)
        return null;
    const next = nextGrowthStage(j.stage);
    if (!next)
        return null;
    const threshold = POPULATION_THRESHOLDS[next];
    return j.population >= threshold.min ? next : null;
}
export function referendumPassProbability(j) {
    const quality = averageServiceQuality(j);
    const fbr = fundBalanceRatio(j);
    return clamp(0.55 + (quality - 50) / 200 + fbr * 0.6, 0.15, 0.95);
}
export function resolveReferendum(j, rng) {
    if (!j.reclassificationPending)
        return { passed: false };
    const prob = referendumPassProbability(j);
    const passed = rng.chance(prob);
    const stage = j.reclassificationPending.targetStage;
    if (passed) {
        j.stage = stage;
    }
    j.reclassificationPending = undefined;
    return { passed, stage };
}
export function createEconDevProgram(label, annualCost, growthBoostPct, durationMonths) {
    return {
        id: `econdev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        label,
        active: true,
        annualCost,
        growthBoostPct,
        monthsRemaining: durationMonths,
    };
}
//# sourceMappingURL=growth.js.map