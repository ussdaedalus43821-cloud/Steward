import type { CareerPosting, CareerState, CareerTier, PlayerJurisdiction, TenureRecord, YearSummary } from "../types.js";
import { clamp } from "../utils/format.js";
import { nextId } from "../utils/id.js";
import type { Rng } from "../utils/random.js";
import { CAREER_TIER_ORDER } from "./constants.js";
import { averageServiceQuality } from "./departments.js";
import { fundBalanceRatio } from "./fiscal.js";

export function computeYearScore(j: PlayerJurisdiction, populationGrowthPct: number): number {
  const fbr = fundBalanceRatio(j);
  const fiscalScore = clamp(50 + fbr * 200, 0, 100);
  const growthScore = clamp(50 + populationGrowthPct * 900, 0, 100);
  const serviceScore = averageServiceQuality(j);
  const oversightPenalty =
    j.oversight.level === "warning" ? 10 : j.oversight.level === "oversight" ? 30 : j.oversight.level === "emergency" ? 60 : 0;
  return clamp(fiscalScore * 0.4 + growthScore * 0.3 + serviceScore * 0.3 - oversightPenalty, 0, 100);
}

export function recordYearSummary(
  j: PlayerJurisdiction,
  year: number,
  populationGrowthPct: number
): YearSummary {
  const summary: YearSummary = {
    year,
    fundBalanceRatio: fundBalanceRatio(j),
    creditRating: j.creditRating,
    populationGrowthPct,
    avgServiceQuality: averageServiceQuality(j),
    infrastructureCondition: j.vitals.infrastructureCondition,
    score: computeYearScore(j, populationGrowthPct),
  };
  j.scorecardHistory.push(summary);
  if (j.scorecardHistory.length > 12) j.scorecardHistory.shift();
  return summary;
}

const SUSTAINED_YEARS_REQUIRED = 3;
const SCORE_THRESHOLD = 68;

export function nextCareerTier(tier: CareerTier): CareerTier | null {
  const idx = CAREER_TIER_ORDER.indexOf(tier);
  if (idx < 0 || idx >= CAREER_TIER_ORDER.length - 1) return null;
  return CAREER_TIER_ORDER[idx + 1];
}

export function isEligibleForPromotion(j: PlayerJurisdiction): boolean {
  // Country is the top of the career ladder (see CAREER_TIER_ORDER) -- there is nowhere left to
  // be promoted to, so this must never fire again once there, or acceptPromotion would just
  // reassign the player to a brand-new country-tier jurisdiction forever.
  if (j.tier === "country") return false;
  if (j.tier === "municipality" && j.stage !== "home_rule_city") return false;
  if (j.oversight.level !== "normal") return false;
  const recent = j.scorecardHistory.slice(-SUSTAINED_YEARS_REQUIRED);
  if (recent.length < SUSTAINED_YEARS_REQUIRED) return false;
  return recent.every((y) => y.score >= SCORE_THRESHOLD);
}

export function buildTenureRecord(j: PlayerJurisdiction, reason: TenureRecord["endedReason"]): TenureRecord {
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

export function reputationGainForPromotion(j: PlayerJurisdiction): number {
  const last = j.scorecardHistory[j.scorecardHistory.length - 1];
  const score = last ? last.score : 50;
  return clamp(6 + (score - 50) / 5, 3, 18);
}

export function reputationLossForEmergencyManager(): number {
  return 22;
}

export function isEmergencyManagerTriggered(career: CareerState): boolean {
  return career.jurisdiction.oversight.level === "emergency" && career.jurisdiction.oversight.monthsAtCurrentLevel >= 6;
}

// Country has no higher tier to be promoted into, so sustained strong performance there instead
// surfaces a standing list of other country-tier postings to apply to (bigger population, worse
// starting pension funding -- more prestige for more risk), rather than looping the single
// automatic promotion offer used for every tier below it.
const COUNTRY_POSTING_TEMPLATES: Array<{
  riskLabel: CareerPosting["riskLabel"];
  scaleMultiplier: number;
  pensionFundedRatio: number;
  description: string;
}> = [
  {
    riskLabel: "Stable",
    scaleMultiplier: 1.3,
    pensionFundedRatio: 0.72,
    description: "A modestly larger republic with a comparable fiscal structure to what you're running now.",
  },
  {
    riskLabel: "Elevated Risk",
    scaleMultiplier: 2.2,
    pensionFundedRatio: 0.58,
    description: "A significantly larger population and a more strained, underfunded pension system.",
  },
  {
    riskLabel: "High Risk",
    scaleMultiplier: 3.5,
    pensionFundedRatio: 0.42,
    description: "A sprawling, high-stakes nation already deep underwater on its pension promises.",
  },
];

const COUNTRY_POSTING_NAMES = [
  "United Commonwealth",
  "Continental Union",
  "Sovereign Alliance",
  "Pacifica Federation",
  "Grand Coalition",
  "Northern Compact",
  "Meridian Republic",
  "Unified Territories",
];

export function isEligibleForCareerPostings(j: PlayerJurisdiction): boolean {
  if (j.tier !== "country") return false;
  if (j.oversight.level !== "normal") return false;
  const recent = j.scorecardHistory.slice(-SUSTAINED_YEARS_REQUIRED);
  if (recent.length < SUSTAINED_YEARS_REQUIRED) return false;
  return recent.every((y) => y.score >= SCORE_THRESHOLD);
}

export function generateCareerPostings(rng: Rng): CareerPosting[] {
  const pool = [...COUNTRY_POSTING_NAMES];
  return COUNTRY_POSTING_TEMPLATES.map((t) => {
    const idx = pool.length ? Math.floor(rng.range(0, pool.length)) : 0;
    const name = pool.length ? pool.splice(idx, 1)[0] : "Unnamed Republic";
    return {
      id: nextId("posting"),
      name,
      riskLabel: t.riskLabel,
      scaleMultiplier: t.scaleMultiplier,
      pensionFundedRatio: t.pensionFundedRatio,
      description: t.description,
    };
  });
}
