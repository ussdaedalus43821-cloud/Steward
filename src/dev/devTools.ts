// Console-driven testing helpers. Steward is a financial simulation where balance is everything,
// and the interesting failure modes only show up after years of compounding -- playing that out
// by hand at 15x speed still takes a long time. This gives the browser console a `window.steward`
// namespace to jump straight to a late-game state instead: inject cash, fast-forward the real
// simulation (not just the clock), force credit ratings/oversight/scorecards, or drop to raw
// mutation for anything not covered below. Always installed -- there's no server here, no save
// but your own to protect, and "cheat" is just "a faster way to set up a test" in a single-player
// sim.
import type { CareerState, CreditRating, OversightLevel, YearSummary } from "../types.js";
import { store } from "../state/store.js";
import { tickMonth } from "../sim/engine.js";
import { generateGoldenStarPosting, nextCareerTier } from "../sim/career.js";
import { CREDIT_RATING_ORDER } from "../sim/constants.js";

function refresh(): void {
  store.refresh();
}

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

/** Adds (or subtracts, with a negative amount) cash from the General Fund, keeping the
 * Financials balance check honest by moving netPositionTracked the same amount. */
function giveMoney(amount: number): void {
  const j = store.career.jurisdiction;
  j.generalFund.fundBalance += amount;
  j.netPositionTracked += amount;
  refresh();
  console.log(`[steward] ${amount >= 0 ? "+" : ""}${fmtMoney(amount)} to fund balance -- now ${fmtMoney(j.generalFund.fundBalance)}.`);
}

/** Runs the real monthly simulation N times in a row (population growth, revenue, events,
 * annual closes, oversight, the works) with only one re-render at the end, instead of N. Stops
 * early at a game over or a pending promotion offer, same as real play would pause there. */
function skipMonths(n: number): void {
  const career = store.career;
  let ran = 0;
  for (; ran < n; ran++) {
    if (career.gameOverInfo) {
      console.warn(`[steward] stopped at month ${career.clockMonth} (${ran}/${n} run): game over -- ${career.gameOverInfo.reason}`);
      break;
    }
    if (career.pendingPromotionOffer) {
      console.warn(
        `[steward] stopped at month ${career.clockMonth} (${ran}/${n} run): a promotion offer is pending. ` +
          `Resolve it first -- steward.mutate(c => c.pendingPromotionOffer = undefined) to dismiss it, or accept/decline in the UI.`
      );
      break;
    }
    tickMonth(career, store.rng);
  }
  refresh();
  console.log(`[steward] simulated ${ran} month(s). Now at month ${career.clockMonth}.`);
}

function skipYears(n: number): void {
  skipMonths(Math.round(n * 12));
}

function setCreditRating(rating: CreditRating): void {
  if (!CREDIT_RATING_ORDER.includes(rating)) {
    console.error(`[steward] "${rating}" isn't a credit rating. Use one of: ${CREDIT_RATING_ORDER.join(", ")}`);
    return;
  }
  store.career.jurisdiction.creditRating = rating;
  refresh();
  console.log(`[steward] credit rating forced to ${rating}. This is overwritten at the next annual close -- see computeCreditRating if you need it to stick.`);
}

function setOversight(level: OversightLevel): void {
  const j = store.career.jurisdiction;
  j.oversight.level = level;
  j.oversight.monthsAtCurrentLevel = 0;
  refresh();
  console.log(`[steward] oversight forced to "${level}".`);
}

function setReputation(n: number): void {
  store.career.reputation = Math.max(0, Math.min(100, n));
  refresh();
  console.log(`[steward] reputation set to ${store.career.reputation}.`);
}

function fakeYear(score: number): YearSummary {
  const j = store.career.jurisdiction;
  return {
    year: Math.floor(store.career.clockMonth / 12),
    fundBalanceRatio: 1,
    creditRating: j.creditRating,
    populationGrowthPct: 0.02,
    avgServiceQuality: 80,
    infrastructureCondition: 80,
    score,
  };
}

/** Backfills 3 qualifying scorecard years (so Settings/the scorecard reads honestly) AND sets
 * pendingPromotionOffer directly -- waiting for the next real annual close to notice the
 * backfilled history is unreliable, since that same close pushes a new (real, possibly much
 * lower) score onto the array first and can push your seeded years right back out of the
 * 3-year window. This makes the offer appear right now, no skipMonths needed. */
function forcePromotionReady(score = 90): void {
  const j = store.career.jurisdiction;
  const toTier = nextCareerTier(j.tier);
  if (!toTier) {
    console.warn("[steward] country has no higher tier to be promoted into -- use steward.forceGoldenStarReady() instead.");
    return;
  }
  j.oversight.level = "normal";
  j.oversight.consecutiveDeficitYears = 0;
  j.oversight.monthsAtCurrentLevel = 0;
  j.scorecardHistory = [fakeYear(score), fakeYear(score), fakeYear(score)];
  store.career.pendingPromotionOffer = {
    toTier,
    message: `Sustained strong performance at ${j.name} has caught attention. A bigger job is available.`,
  };
  refresh();
  console.log(`[steward] promotion offer to ${toTier} is ready now. Accept it in the UI, or run steward.store.acceptPromotion().`);
}

/** Same idea for the much harder Golden Star bar (10 years at 95+): backfills the scorecard
 * for honesty, then generates and attaches a real Golden Star posting directly so it's testable
 * immediately instead of depending on an annual close to notice. Only works at country tier. */
function forceGoldenStarReady(score = 97): void {
  const j = store.career.jurisdiction;
  if (j.tier !== "country") {
    console.warn(`[steward] Golden Star postings only exist at country tier -- current tier is "${j.tier}".`);
    return;
  }
  j.oversight.level = "normal";
  j.oversight.monthsAtCurrentLevel = 0;
  j.scorecardHistory = Array.from({ length: 10 }, () => fakeYear(score));
  const posting = generateGoldenStarPosting(store.rng);
  store.career.careerPostings = [...(store.career.careerPostings ?? []), posting];
  refresh();
  console.log(
    `[steward] Golden Star posting "${posting.name}" is ready now in Settings -> Career Opportunities, or run steward.store.applyCareerPosting("${posting.id}").`
  );
}

/** Direct population override. Only sticks for a municipality -- a county/state/country's
 * population is recomputed from its sub-jurisdictions at every annual close. */
function setPopulation(n: number): void {
  const j = store.career.jurisdiction;
  j.population = Math.max(1, Math.round(n));
  if (j.subJurisdictions?.length) {
    console.warn(
      "[steward] this jurisdiction has sub-jurisdictions -- population is resummed from them every annual close, so this will be overwritten. Edit steward.state.jurisdiction.subJurisdictions directly (or use steward.mutate) if you need it to stick."
    );
  }
  refresh();
  console.log(`[steward] population set to ${j.population.toLocaleString()}.`);
}

/** The general escape hatch: mutate the live CareerState however you want, then persist +
 * re-render once. Covers anything the named helpers above don't. */
function mutate(fn: (career: CareerState) => void): void {
  fn(store.career);
  refresh();
}

function dumpState(): CareerState {
  console.log(JSON.parse(JSON.stringify(store.career)));
  return store.career;
}

const HELP = `Steward dev console -- window.steward

  giveMoney(amount)            Add (or, negative, remove) cash from the General Fund.
  skipMonths(n)                Run the real simulation forward n months (one re-render at the end).
  skipYears(n)                 Same, in years.
  setCreditRating(rating)      Force AAA/AA/A/BBB/BB/B/CCC/D. Overwritten at the next annual close.
  setOversight(level)          Force "normal"/"warning"/"oversight"/"emergency".
  setReputation(n)             Set reputation, 0-100.
  setPopulation(n)             Override population directly (municipality tier only sticks).
  forcePromotionReady(score?)  Backfill 3 qualifying scorecard years (default score 90).
  forceGoldenStarReady(score?) Backfill 10 qualifying scorecard years (default 97, country tier only).
  mutate(career => { ... })    Raw access to the live CareerState; persists + re-renders after.
  dumpState()                  console.log + return a deep copy of the current CareerState.
  state                        Getter -- the live CareerState (mutating it directly needs a
                                follow-up steward.mutate(() => {}) or steward.refresh() to persist/render).
  refresh()                    Persist + re-render after a direct state mutation.
  store                        The actual GameStore singleton -- every normal setter the UI uses
                                (acceptPromotion(), applyCareerPosting(id), setClockSpeed(n),
                                setTaxRate(...), setEnterpriseFeeRate(...), etc.) is a method on it.
  help()                       Print this.
`;

export function installDevTools(): void {
  const api = {
    giveMoney,
    skipMonths,
    skipYears,
    setCreditRating,
    setOversight,
    setReputation,
    setPopulation,
    forcePromotionReady,
    forceGoldenStarReady,
    mutate,
    dumpState,
    refresh,
    help(): void {
      console.log(HELP);
    },
    get state(): CareerState {
      return store.career;
    },
    store,
  };
  (window as unknown as { steward: typeof api }).steward = api;
  console.log("%cSteward dev console loaded -- run steward.help() for commands.", "color:#2458c9;font-weight:700;");
}
