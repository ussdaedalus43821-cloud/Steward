import type { CapitalProject, FundingSource, PlayerJurisdiction } from "../types.js";
import { nextId } from "../utils/id.js";
import type { Rng } from "../utils/random.js";
import { canIssueGoBond, canIssueRevenueBond, issueBond } from "./bonds.js";
import { getTierConfig } from "./constants.js";

export function proposeProject(
  j: PlayerJurisdiction,
  name: string,
  category: string,
  estimatedCost: number,
  durationMonths: number,
  currentMonth: number
): CapitalProject {
  const project: CapitalProject = {
    id: nextId("proj"),
    name,
    category,
    estimatedCost,
    actualCost: estimatedCost,
    fundingSource: "pay_as_you_go",
    status: "proposed",
    proposedMonth: currentMonth,
    durationMonths,
    progressMonths: 0,
    overrunFactor: 1,
  };
  j.capitalProjects.push(project);
  return project;
}

export interface FundResult {
  ok: boolean;
  reason?: string;
}

export function fundProject(
  j: PlayerJurisdiction,
  projectId: string,
  fundingSource: FundingSource,
  currentMonth: number,
  bondTermYears = 20
): FundResult {
  const project = j.capitalProjects.find((p) => p.id === projectId);
  if (!project || project.status !== "proposed") return { ok: false, reason: "Project not in Proposed status." };

  const tierConfig = getTierConfig(j.tier);
  if (fundingSource === "go_bond" && !canIssueGoBond(j, tierConfig.goBondUnlockedAtStage)) {
    return { ok: false, reason: "General obligation bonds are not yet available at this stage." };
  }
  if (fundingSource === "revenue_bond" && !canIssueRevenueBond(j)) {
    return { ok: false, reason: "Revenue bonds require home-rule status." };
  }
  if (fundingSource === "grant") {
    if (project.estimatedCost > j.grantPoolRemaining) {
      return { ok: false, reason: "Insufficient grant funding available from the tier above this year." };
    }
    j.grantPoolRemaining -= project.estimatedCost;
    j.capitalFundBalance += project.estimatedCost;
    j.netPositionTracked += project.estimatedCost; // capital grant is real revenue, unlike bond proceeds
  }
  if (fundingSource === "go_bond" || fundingSource === "revenue_bond") {
    const bond = issueBond(
      j,
      fundingSource === "go_bond" ? "go" : "revenue",
      project.estimatedCost,
      bondTermYears,
      currentMonth,
      `${fundingSource === "go_bond" ? "GO" : "Revenue"} Bond — ${project.name}`,
      project.id
    );
    project.bondId = bond.id;
  }

  project.fundingSource = fundingSource;
  project.status = "funded";
  project.fundedMonth = currentMonth;
  return { ok: true };
}

export function startProject(j: PlayerJurisdiction, projectId: string, currentMonth: number): FundResult {
  const project = j.capitalProjects.find((p) => p.id === projectId);
  if (!project || project.status !== "funded") return { ok: false, reason: "Project must be Funded first." };
  project.status = "in_progress";
  project.startMonth = currentMonth;
  return { ok: true };
}

export function cancelProject(j: PlayerJurisdiction, projectId: string, currentMonth: number): FundResult {
  const project = j.capitalProjects.find((p) => p.id === projectId);
  if (!project) return { ok: false, reason: "Project not found." };
  if (project.status === "complete" || project.status === "cancelled") {
    return { ok: false, reason: "Project already finished." };
  }
  project.status = "cancelled";
  project.cancelledMonth = currentMonth;
  return { ok: true };
}

export interface ProjectTickResult {
  completed: CapitalProject[];
  overrunEvents: { project: CapitalProject; pctIncrease: number }[];
}

export function tickProjectsMonthly(
  j: PlayerJurisdiction,
  currentMonth: number,
  rng: Rng
): ProjectTickResult {
  const completed: CapitalProject[] = [];
  const overrunEvents: ProjectTickResult["overrunEvents"] = [];

  for (const project of j.capitalProjects) {
    if (project.status !== "in_progress") continue;
    project.progressMonths += 1;

    if (rng.chance(0.025)) {
      const pctIncrease = rng.range(0.03, 0.16);
      project.actualCost *= 1 + pctIncrease;
      project.overrunFactor *= 1 + pctIncrease;
      overrunEvents.push({ project, pctIncrease });
    }

    const monthlySpend = project.actualCost / project.durationMonths;
    j.capitalFundBalance -= monthlySpend;
    j.capitalAssetsNetValue += monthlySpend;

    if (project.progressMonths >= project.durationMonths) {
      project.status = "complete";
      project.completeMonth = currentMonth;
      completed.push(project);
    }
  }

  return { completed, overrunEvents };
}

export function projectsByStatus(j: PlayerJurisdiction) {
  const groups: Record<string, CapitalProject[]> = {
    proposed: [],
    funded: [],
    in_progress: [],
    complete: [],
    cancelled: [],
  };
  for (const p of j.capitalProjects) groups[p.status].push(p);
  return groups;
}
