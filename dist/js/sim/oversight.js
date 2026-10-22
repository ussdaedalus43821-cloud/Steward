import { CREDIT_RATING_ORDER, FUND_BALANCE_BENCHMARK_RATIO, FUND_BALANCE_CRISIS_RATIO, FUND_BALANCE_WARNING_RATIO, } from "./constants.js";
import { fundBalanceRatio } from "./fiscal.js";
const LEVEL_ORDER = ["normal", "warning", "oversight", "emergency"];
function levelIndex(level) {
    return LEVEL_ORDER.indexOf(level);
}
/** True when `rating` is as bad as or worse than `threshold` (e.g. CCC or D is "as bad as CCC"). */
function ratingWorseOrEqual(rating, threshold) {
    return CREDIT_RATING_ORDER.indexOf(rating) >= CREDIT_RATING_ORDER.indexOf(threshold);
}
/** True when `rating` is as good as or better than `threshold`. */
function ratingBetterOrEqual(rating, threshold) {
    return CREDIT_RATING_ORDER.indexOf(rating) <= CREDIT_RATING_ORDER.indexOf(threshold);
}
export function updateOversight(j, missedPayment) {
    const fbr = fundBalanceRatio(j);
    const deficit = j.generalFund.lastYearRevenue < j.generalFund.lastYearExpenditures;
    j.oversight.consecutiveDeficitYears = deficit ? j.oversight.consecutiveDeficitYears + 1 : 0;
    j.oversight.missedDebtServiceLastYear = missedPayment;
    const previousLevel = j.oversight.level;
    const crisis = fbr < FUND_BALANCE_CRISIS_RATIO || missedPayment || j.creditRating === "D";
    const severe = fbr < FUND_BALANCE_WARNING_RATIO ||
        j.oversight.consecutiveDeficitYears >= 3 ||
        ratingWorseOrEqual(j.creditRating, "CCC");
    const mild = fbr < FUND_BALANCE_BENCHMARK_RATIO * 0.5 ||
        j.oversight.consecutiveDeficitYears >= 1 ||
        ratingWorseOrEqual(j.creditRating, "B");
    const healthy = fbr >= FUND_BALANCE_BENCHMARK_RATIO * 0.75 && !deficit && ratingBetterOrEqual(j.creditRating, "BB");
    let newLevel = previousLevel;
    if (crisis) {
        newLevel = "emergency";
    }
    else if (severe) {
        newLevel = levelIndex(previousLevel) < levelIndex("oversight") ? "warning" : "oversight";
    }
    else if (mild) {
        newLevel = previousLevel === "normal" ? "warning" : previousLevel;
    }
    else if (healthy) {
        const idx = levelIndex(previousLevel);
        newLevel = idx > 0 ? LEVEL_ORDER[idx - 1] : "normal";
    }
    j.oversight.level = newLevel;
    j.oversight.monthsAtCurrentLevel = newLevel === previousLevel ? j.oversight.monthsAtCurrentLevel + 12 : 0;
    return {
        previousLevel,
        newLevel,
        changed: newLevel !== previousLevel,
        emergencyTriggered: newLevel === "emergency" && previousLevel !== "emergency",
    };
}
export function departmentBudgetCapUnderOversight(level) {
    if (level === "oversight")
        return 0.03; // max 3% year-over-year increase allowed while under a review board
    if (level === "emergency")
        return 0;
    return null;
}
//# sourceMappingURL=oversight.js.map