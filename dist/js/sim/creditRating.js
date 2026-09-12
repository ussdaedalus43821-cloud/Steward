import { clamp } from "../utils/format.js";
import { totalDebtOutstanding } from "./bonds.js";
export function computeRevenueGrowthTrend(j) {
    const h = j.generalFund.revenueHistory;
    if (h.length < 2)
        return 0;
    const prev = h[h.length - 2];
    const curr = h[h.length - 1];
    if (prev <= 0)
        return 0;
    return (curr - prev) / prev;
}
export function computeCreditRating(j, fundBalanceRatio) {
    const fundBalanceScore = clamp(((fundBalanceRatio + 0.05) / 0.35) * 100, 0, 100);
    const annualRevenue = j.generalFund.lastYearRevenue || j.generalFund.ytdRevenue * 12 || 1;
    const debtToRevenue = totalDebtOutstanding(j) / annualRevenue;
    const debtScore = clamp(100 - debtToRevenue * 80, 0, 100);
    const growthTrend = computeRevenueGrowthTrend(j);
    const growthScore = clamp(50 + growthTrend * 500, 0, 100);
    let pensionScore = null;
    if (j.pension) {
        pensionScore = clamp(j.pension.fundedRatio * 100, 0, 100);
    }
    let overall;
    if (pensionScore !== null) {
        overall =
            fundBalanceScore * 0.35 + debtScore * 0.25 + growthScore * 0.15 + pensionScore * 0.25;
    }
    else {
        overall = fundBalanceScore * 0.45 + debtScore * 0.3 + growthScore * 0.25;
    }
    const rating = ratingForScore(overall);
    return { fundBalanceScore, debtScore, growthScore, pensionScore, overall, rating };
}
export function ratingForScore(score) {
    if (score >= 90)
        return "AAA";
    if (score >= 80)
        return "AA";
    if (score >= 70)
        return "A";
    if (score >= 58)
        return "BBB";
    if (score >= 45)
        return "BB";
    if (score >= 32)
        return "B";
    if (score >= 18)
        return "CCC";
    return "D";
}
//# sourceMappingURL=creditRating.js.map