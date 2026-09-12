import { clamp } from "../utils/format.js";
import { CAREER_TIER_ORDER } from "./constants.js";
import { averageServiceQuality } from "./departments.js";
import { fundBalanceRatio } from "./fiscal.js";
export function computeYearScore(j, populationGrowthPct) {
    const fbr = fundBalanceRatio(j);
    const fiscalScore = clamp(50 + fbr * 200, 0, 100);
    const growthScore = clamp(50 + populationGrowthPct * 900, 0, 100);
    const serviceScore = averageServiceQuality(j);
    const oversightPenalty = j.oversight.level === "warning" ? 10 : j.oversight.level === "oversight" ? 30 : j.oversight.level === "emergency" ? 60 : 0;
    return clamp(fiscalScore * 0.4 + growthScore * 0.3 + serviceScore * 0.3 - oversightPenalty, 0, 100);
}
export function recordYearSummary(j, year, populationGrowthPct) {
    const summary = {
        year,
        fundBalanceRatio: fundBalanceRatio(j),
        creditRating: j.creditRating,
        populationGrowthPct,
        avgServiceQuality: averageServiceQuality(j),
        infrastructureCondition: j.vitals.infrastructureCondition,
        score: computeYearScore(j, populationGrowthPct),
    };
    j.scorecardHistory.push(summary);
    if (j.scorecardHistory.length > 12)
        j.scorecardHistory.shift();
    return summary;
}
const SUSTAINED_YEARS_REQUIRED = 3;
const SCORE_THRESHOLD = 68;
export function nextCareerTier(tier) {
    const idx = CAREER_TIER_ORDER.indexOf(tier);
    if (idx < 0 || idx >= CAREER_TIER_ORDER.length - 1)
        return null;
    return CAREER_TIER_ORDER[idx + 1];
}
export function isEligibleForPromotion(j) {
    if (j.tier === "municipality" && j.stage !== "home_rule_city")
        return false;
    if (j.oversight.level !== "normal")
        return false;
    const recent = j.scorecardHistory.slice(-SUSTAINED_YEARS_REQUIRED);
    if (recent.length < SUSTAINED_YEARS_REQUIRED)
        return false;
    return recent.every((y) => y.score >= SCORE_THRESHOLD);
}
export function buildTenureRecord(j, reason) {
    const last = j.scorecardHistory[j.scorecardHistory.length - 1];
    return {
        tier: j.tier,
        name: j.name,
        endedReason: reason,
        finalScore: last ? last.score : 0,
        finalCreditRating: j.creditRating,
        months: 0,
    };
}
export function reputationGainForPromotion(j) {
    const last = j.scorecardHistory[j.scorecardHistory.length - 1];
    const score = last ? last.score : 50;
    return clamp(6 + (score - 50) / 5, 3, 18);
}
export function reputationLossForEmergencyManager() {
    return 22;
}
export function isEmergencyManagerTriggered(career) {
    return career.jurisdiction.oversight.level === "emergency" && career.jurisdiction.oversight.monthsAtCurrentLevel >= 6;
}
//# sourceMappingURL=career.js.map