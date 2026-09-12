import { nextId } from "../utils/id.js";
import { amortizeBondsAnnual } from "./bonds.js";
import { tickProjectsMonthly } from "./capitalProjects.js";
import { buildTenureRecord, isEligibleForPromotion, isEmergencyManagerTriggered, recordYearSummary, reputationGainForPromotion, reputationLossForEmergencyManager, } from "./career.js";
import { getTierConfig, MONTHS_PER_YEAR } from "./constants.js";
import { ensureDepartmentBudgets, updateDepartmentServiceQuality } from "./departments.js";
import { computeCreditRating } from "./creditRating.js";
import { advanceEconomyCycle, tickRandomEvents } from "./events.js";
import { applyAnnualPopulationGrowth, isEligibleForReclassification, resolveReferendum, updateVitals, } from "./growth.js";
import { applyMonthlyFiscalFlow, closeFiscalYear, ensureEnterpriseFunds, fundBalanceRatio, tickEnterpriseFundsMonthly, } from "./fiscal.js";
import { createPlayerJurisdiction } from "./newGame.js";
import { updateOversight } from "./oversight.js";
import { annualPensionTick } from "./pension.js";
import { ensureSubJurisdictions, simulateSubJurisdictionTick, syncParentPopulationFromChildren, } from "./subJurisdictions.js";
export function tickMonth(career, rng) {
    career.clockMonth += 1;
    const j = career.jurisdiction;
    const tierConfig = getTierConfig(j.tier);
    const economyState = { cyclePosition: career.economyCyclePosition, multiplier: career.economyMultiplier };
    advanceEconomyCycle(economyState);
    career.economyCyclePosition = economyState.cyclePosition;
    career.economyMultiplier = economyState.multiplier;
    applyMonthlyFiscalFlow(j, tierConfig, career.economyMultiplier);
    tickEnterpriseFundsMonthly(j);
    const events = [];
    const projectResult = tickProjectsMonthly(j, career.clockMonth, rng);
    for (const completed of projectResult.completed) {
        j.vitals.infrastructureCondition = Math.min(100, j.vitals.infrastructureCondition + 7);
        events.push({
            id: nextId("evt"),
            month: career.clockMonth,
            title: "Capital Project Complete",
            description: `${completed.name} is complete and now in service.`,
            kind: "project",
            severity: "good",
        });
    }
    for (const overrun of projectResult.overrunEvents) {
        events.push({
            id: nextId("evt"),
            month: career.clockMonth,
            title: "Cost Overrun",
            description: `${overrun.project.name} costs increased by ${(overrun.pctIncrease * 100).toFixed(0)}%.`,
            kind: "project",
            severity: "warning",
        });
    }
    events.push(...tickRandomEvents(j, career.clockMonth, career.economyMultiplier, rng));
    if (j.reclassificationPending && career.clockMonth >= j.reclassificationPending.referendumMonth) {
        const result = resolveReferendum(j, rng);
        if (result.passed) {
            ensureDepartmentBudgets(j, tierConfig);
            ensureEnterpriseFunds(j);
            events.push({
                id: nextId("evt"),
                month: career.clockMonth,
                title: "Referendum Passed",
                description: `Residents voted to reclassify ${j.name} as a ${result.stage?.replace(/_/g, " ")}.`,
                kind: "reclassification",
                severity: "good",
            });
        }
        else {
            events.push({
                id: nextId("evt"),
                month: career.clockMonth,
                title: "Referendum Failed",
                description: `The reclassification referendum for ${j.name} did not pass. It can be attempted again later.`,
                kind: "reclassification",
                severity: "warning",
            });
        }
    }
    for (const program of j.econDevPrograms) {
        if (program.active)
            program.monthsRemaining -= 1;
        if (program.monthsRemaining <= 0)
            program.active = false;
    }
    if (career.clockMonth % MONTHS_PER_YEAR === 0) {
        events.push(...runAnnualClose(career, rng));
    }
    career.eventLog.push(...events);
    if (career.eventLog.length > 200)
        career.eventLog.splice(0, career.eventLog.length - 200);
    return events;
}
function runAnnualClose(career, rng) {
    const j = career.jurisdiction;
    const tierConfig = getTierConfig(j.tier);
    const events = [];
    const year = Math.floor(career.clockMonth / MONTHS_PER_YEAR);
    closeFiscalYear(j, tierConfig);
    const { missedPayment } = amortizeBondsAnnual(j);
    const growthRate = applyAnnualPopulationGrowth(j, career.economyMultiplier);
    updateVitals(j, career.economyMultiplier);
    updateDepartmentServiceQuality(j);
    if (j.pension)
        annualPensionTick(j.pension, career.economyMultiplier, rng);
    if (tierConfig.hasSubJurisdictions && tierConfig.subJurisdictionTier) {
        ensureSubJurisdictions(j, tierConfig.subJurisdictionTier, 6, rng);
        for (const child of j.subJurisdictions ?? [])
            simulateSubJurisdictionTick(child, career.economyMultiplier, rng);
        syncParentPopulationFromChildren(j);
    }
    const ratingBreakdown = computeCreditRating(j, fundBalanceRatio(j));
    j.creditRating = ratingBreakdown.rating;
    const oversightResult = updateOversight(j, missedPayment);
    if (oversightResult.changed) {
        events.push({
            id: nextId("evt"),
            month: career.clockMonth,
            title: `Fiscal Oversight: ${oversightResult.newLevel.toUpperCase()}`,
            description: oversightMessage(oversightResult.newLevel),
            kind: "oversight",
            severity: oversightResult.newLevel === "normal"
                ? "good"
                : oversightResult.newLevel === "emergency"
                    ? "danger"
                    : "warning",
        });
    }
    recordYearSummary(j, year, growthRate);
    ensureDepartmentBudgets(j, tierConfig);
    ensureEnterpriseFunds(j);
    j.grantPoolRemaining = j.generalFund.lastYearRevenue * 0.04;
    if (isEmergencyManagerTriggered(career)) {
        const record = buildTenureRecord(j, "emergency_manager");
        record.months = career.clockMonth - j.foundedMonth;
        career.tenureHistory.push(record);
        career.reputation = Math.max(0, career.reputation - reputationLossForEmergencyManager());
        career.gameOverInfo = {
            jurisdictionName: j.name,
            tier: j.tier,
            reason: "An emergency manager has been installed and your tenure has ended.",
            finalStats: j.scorecardHistory[j.scorecardHistory.length - 1] ?? null,
        };
        events.push({
            id: nextId("evt"),
            month: career.clockMonth,
            title: "Tenure Ended",
            description: `${j.name} has been placed under an emergency manager. Your tenure here has ended.`,
            kind: "oversight",
            severity: "danger",
        });
        return events;
    }
    if (isEligibleForPromotion(j) && !career.pendingPromotionOffer) {
        career.pendingPromotionOffer = {
            toTier: nextTierFor(j.tier),
            message: `Sustained strong performance at ${j.name} has caught attention. A bigger job is available.`,
        };
        events.push({
            id: nextId("evt"),
            month: career.clockMonth,
            title: "Recruitment Offer",
            description: career.pendingPromotionOffer.message,
            kind: "promotion",
            severity: "good",
        });
    }
    return events;
}
function nextTierFor(tier) {
    if (tier === "municipality")
        return "county";
    if (tier === "county")
        return "state";
    return "country";
}
function oversightMessage(level) {
    switch (level) {
        case "warning":
            return "Fiscal indicators have slipped. This is a formal warning — sustained decline risks state oversight.";
        case "oversight":
            return "A state oversight board has been established and can veto budget decisions until finances stabilize.";
        case "emergency":
            return "Finances have deteriorated into crisis. An emergency manager may be installed if this is not reversed.";
        default:
            return "Fiscal indicators have returned to normal. Independent budget authority is restored.";
    }
}
export function acceptPromotion(career, rng) {
    if (!career.pendingPromotionOffer)
        return;
    const j = career.jurisdiction;
    const record = buildTenureRecord(j, "promoted");
    record.months = career.clockMonth - j.foundedMonth;
    career.tenureHistory.push(record);
    career.reputation = Math.min(100, career.reputation + reputationGainForPromotion(j));
    const nextTier = career.pendingPromotionOffer.toTier;
    career.currentTier = nextTier;
    career.jurisdiction = createPlayerJurisdiction(nextTier, career.clockMonth, rng);
    career.pendingPromotionOffer = undefined;
    career.eventLog.push({
        id: nextId("evt"),
        month: career.clockMonth,
        title: "Promoted",
        description: `You have been appointed to lead ${career.jurisdiction.name} (${nextTier}).`,
        kind: "promotion",
        severity: "good",
    });
}
export function declinePromotion(career) {
    career.pendingPromotionOffer = undefined;
}
export function startNextJobAfterEmergencyManager(career, rng) {
    career.currentTier = "municipality";
    career.jurisdiction = createPlayerJurisdiction("municipality", career.clockMonth, rng);
    career.gameOverInfo = undefined;
}
export function petitionForReclassification(career) {
    const j = career.jurisdiction;
    if (j.reclassificationPending)
        return { ok: false, reason: "A referendum is already pending." };
    const next = isEligibleForReclassification(j);
    if (!next)
        return { ok: false, reason: "Population has not yet reached the next threshold." };
    j.reclassificationPending = { targetStage: next, referendumMonth: career.clockMonth + 3 };
    return { ok: true };
}
//# sourceMappingURL=engine.js.map