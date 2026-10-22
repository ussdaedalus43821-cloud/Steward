import type { NationalCrisis, NationalCrisisType, PlayerJurisdiction } from "../types.js";
import type { Rng } from "../utils/random.js";

// Mechanical flavor for repeat Golden Star country-tier postings (see career.ts /
// isEligibleForGoldenStarPosting). One is rolled at random each time such a posting is accepted
// and attached to the new jurisdiction as activeCrisis, read by the sim modules below.
export const NATIONAL_CRISIS_DEFS: Record<NationalCrisisType, { label: string; description: string }> = {
  war_footing: {
    label: "War Footing",
    description: "Sustained military mobilization is straining the budget and dragging on the economy.",
  },
  currency_crisis: {
    label: "Currency Crisis",
    description: "Runaway inflation is driving up costs and borrowing rates faster than revenue can keep pace.",
  },
  climate_disaster: {
    label: "Climate Disaster",
    description: "Escalating extreme weather is battering infrastructure harder and more often than normal.",
  },
  demographic_crisis: {
    label: "Demographic Crisis",
    description: "An aging population is driving pension costs up faster than the workforce funding them.",
  },
  trade_war: {
    label: "Trade War",
    description: "Sanctions and retaliatory tariffs are suppressing economic growth and tax revenue.",
  },
};

export function rollNationalCrisis(rng: Rng): NationalCrisis {
  const types = Object.keys(NATIONAL_CRISIS_DEFS) as NationalCrisisType[];
  const type = types[Math.floor(rng.range(0, types.length))];
  return { type, ...NATIONAL_CRISIS_DEFS[type] };
}

/** Applied to total department expenditure -- war footing and currency crises both make
 * everything the government buys cost more, independent of what it actually funds. */
export function expenditureCrisisMultiplier(j: PlayerJurisdiction): number {
  switch (j.activeCrisis?.type) {
    case "war_footing":
      return 1.15;
    case "currency_crisis":
      return 1.12;
    default:
      return 1;
  }
}

/** Applied to a newly-issued bond's interest rate -- a currency crisis makes lenders demand a
 * much bigger premium regardless of credit rating. */
export function bondRateCrisisMultiplier(j: PlayerJurisdiction): number {
  return j.activeCrisis?.type === "currency_crisis" ? 1.6 : 1;
}

/** Additive shift to updateVitals' economicHealth target -- war footing and trade wars both
 * suppress the broader economy, which (via economicFactor in fiscal.ts) ripples into every
 * tax revenue source at once. */
export function economicHealthCrisisAdjustment(j: PlayerJurisdiction): number {
  switch (j.activeCrisis?.type) {
    case "war_footing":
      return -12;
    case "trade_war":
      return -20;
    default:
      return 0;
  }
}

export const CLIMATE_DISASTER_STORM_CHANCE_MULTIPLIER = 2.2;
export const CLIMATE_DISASTER_DAMAGE_MULTIPLIER = 1.4;

export function isClimateDisasterActive(j: PlayerJurisdiction): boolean {
  return j.activeCrisis?.type === "climate_disaster";
}

/** Applied to the pension system's annual actuarial liability growth rate -- a demographic
 * crisis means the liability itself grows faster (more retirees, fewer new workers), not just
 * that funding it is harder. */
export function pensionLiabilityGrowthMultiplier(j: PlayerJurisdiction): number {
  return j.activeCrisis?.type === "demographic_crisis" ? 1.5 : 1;
}
