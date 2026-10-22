import { clamp } from "../utils/format.js";
import { ECONOMIES_OF_SCALE_FLOOR, ECONOMIES_OF_SCALE_RATE, ECONOMIES_OF_SCALE_REFERENCE_POP, stageAtLeast, } from "./constants.js";
export const DEPARTMENT_BASELINE_PER_CAPITA = {
    generalAdmin: 1200,
    publicWorks: 160,
    publicSafety: 190,
    planningZoning: 35,
    socialServices: 95,
    economicDevelopment: 55,
    countyRoads: 130,
    courtsAndJails: 110,
    publicHealth: 90,
    regionalSocialServices: 85,
    k12Education: 1900,
    stateHighways: 320,
    medicaidHealth: 1400,
    unemploymentInsurance: 180,
    entitlementPrograms: 3200,
    nationalInfrastructure: 700,
    transfersToStates: 900,
    generalGovernment: 300,
};
export function unlockedDepartments(tierConfig, stage) {
    return tierConfig.departments.filter((d) => !d.unlockedAtStage || !stage || stageAtLeast(stage, d.unlockedAtStage));
}
// A department newly unlocked by a growth-stage promotion (e.g. Public Works and Public
// Safety at Town) phases its budget in over this many months rather than appearing fully
// costed the instant the referendum passes -- a real town doesn't go from zero to a full
// public-works payroll in the same month it incorporates.
const DEPARTMENT_RAMP_MONTHS = 24;
export function ensureDepartmentBudgets(j, tierConfig, rampIn = false) {
    const unlocked = unlockedDepartments(tierConfig, j.stage);
    const existingKeys = new Set(j.departments.map((d) => d.key));
    for (const cfg of unlocked) {
        if (!existingKeys.has(cfg.key)) {
            const target = effectiveBaseline(j, cfg.key) * j.population * 0.9;
            const dept = {
                key: cfg.key,
                label: cfg.label,
                allocated: rampIn ? target / DEPARTMENT_RAMP_MONTHS : target,
                staffing: Math.round((rampIn ? target / DEPARTMENT_RAMP_MONTHS : target) / 65000),
                serviceQuality: 50,
            };
            if (rampIn) {
                dept.rampTargetAllocated = target;
                dept.rampMonthlyIncrement = target / DEPARTMENT_RAMP_MONTHS;
                dept.rampMonthsRemaining = DEPARTMENT_RAMP_MONTHS - 1;
            }
            j.departments.push(dept);
        }
    }
}
/** Advances any department still phasing in its budget by one month. Call once per tick,
 * before the monthly fiscal flow reads department allocations. */
export function tickDepartmentRamps(j) {
    for (const d of j.departments) {
        if (!d.rampMonthsRemaining || d.rampMonthsRemaining <= 0)
            continue;
        d.allocated += d.rampMonthlyIncrement ?? 0;
        d.rampMonthsRemaining -= 1;
        if (d.rampMonthsRemaining <= 0) {
            d.allocated = d.rampTargetAllocated ?? d.allocated;
            delete d.rampMonthsRemaining;
            delete d.rampTargetAllocated;
            delete d.rampMonthlyIncrement;
        }
    }
}
function diminishingReturns(spendPerCapita, baseline) {
    if (baseline <= 0)
        return 50;
    return 100 * (spendPerCapita / (spendPerCapita + baseline));
}
/** Fixed administrative costs spread across more residents as a jurisdiction grows, so the
 * per-capita cost needed for a given service level eases off instead of staying flat. */
export function economiesOfScaleFactor(population) {
    const ratio = Math.max(population, ECONOMIES_OF_SCALE_REFERENCE_POP) / ECONOMIES_OF_SCALE_REFERENCE_POP;
    const factor = 1 - ECONOMIES_OF_SCALE_RATE * Math.log10(ratio);
    return clamp(factor, ECONOMIES_OF_SCALE_FLOOR, 1);
}
function effectiveBaseline(j, key) {
    const baseline = DEPARTMENT_BASELINE_PER_CAPITA[key] ?? 100;
    const scaled = baseline * economiesOfScaleFactor(j.population);
    return key === "generalAdmin" ? scaled * (1 - (j.adminEfficiencyBonus ?? 0)) : scaled;
}
export function updateDepartmentServiceQuality(j) {
    for (const dept of j.departments) {
        const baseline = effectiveBaseline(j, dept.key);
        const perCapita = j.population > 0 ? dept.allocated / j.population : 0;
        dept.serviceQuality = clamp(diminishingReturns(perCapita, baseline), 0, 100);
        dept.staffing = Math.max(1, Math.round(dept.allocated / 65000));
    }
}
export function averageServiceQuality(j) {
    if (j.departments.length === 0)
        return 50;
    return j.departments.reduce((s, d) => s + d.serviceQuality, 0) / j.departments.length;
}
export function setDepartmentAllocation(j, key, amount) {
    const dept = j.departments.find((d) => d.key === key);
    if (!dept)
        return;
    dept.allocated = Math.max(0, amount);
    // A manual edit is an explicit player decision -- it overrides whatever phase-in schedule
    // was still running, rather than being overwritten by it again next month.
    delete dept.rampMonthsRemaining;
    delete dept.rampTargetAllocated;
    delete dept.rampMonthlyIncrement;
}
//# sourceMappingURL=departments.js.map