import type { DepartmentBudget, PlayerJurisdiction, TierConfig } from "../types.js";
import { clamp } from "../utils/format.js";
import { stageAtLeast } from "./constants.js";

export const DEPARTMENT_BASELINE_PER_CAPITA: Record<string, number> = {
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

export function unlockedDepartments(tierConfig: TierConfig, stage?: string) {
  return tierConfig.departments.filter(
    (d) => !d.unlockedAtStage || !stage || stageAtLeast(stage as any, d.unlockedAtStage)
  );
}

export function ensureDepartmentBudgets(j: PlayerJurisdiction, tierConfig: TierConfig): void {
  const unlocked = unlockedDepartments(tierConfig, j.stage);
  const existingKeys = new Set(j.departments.map((d) => d.key));
  for (const cfg of unlocked) {
    if (!existingKeys.has(cfg.key)) {
      const baseline = DEPARTMENT_BASELINE_PER_CAPITA[cfg.key] ?? 100;
      j.departments.push({
        key: cfg.key,
        label: cfg.label,
        allocated: baseline * j.population * 0.9,
        staffing: Math.round((baseline * j.population * 0.9) / 65000),
        serviceQuality: 50,
      });
    }
  }
}

function diminishingReturns(spendPerCapita: number, baseline: number): number {
  if (baseline <= 0) return 50;
  return 100 * (spendPerCapita / (spendPerCapita + baseline));
}

export function updateDepartmentServiceQuality(j: PlayerJurisdiction): void {
  for (const dept of j.departments) {
    const baseline = DEPARTMENT_BASELINE_PER_CAPITA[dept.key] ?? 100;
    const perCapita = j.population > 0 ? dept.allocated / j.population : 0;
    dept.serviceQuality = clamp(diminishingReturns(perCapita, baseline), 0, 100);
    dept.staffing = Math.max(1, Math.round(dept.allocated / 65000));
  }
}

export function averageServiceQuality(j: PlayerJurisdiction): number {
  if (j.departments.length === 0) return 50;
  return j.departments.reduce((s, d) => s + d.serviceQuality, 0) / j.departments.length;
}

export function setDepartmentAllocation(j: PlayerJurisdiction, key: string, amount: number): void {
  const dept = j.departments.find((d) => d.key === key);
  if (dept) dept.allocated = Math.max(0, amount);
}
