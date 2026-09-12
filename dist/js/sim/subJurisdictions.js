import { clamp } from "../utils/format.js";
import { nextId } from "../utils/id.js";
import { ratingForScore } from "./creditRating.js";
import { GROWTH_STAGE_ORDER, POPULATION_THRESHOLDS } from "./constants.js";
const NAME_PARTS_A = [
    "Maple", "Cedar", "River", "Union", "Franklin", "Liberty", "Ridge", "Harbor", "Prairie",
    "Fairview", "Lincoln", "Oakdale", "Summit", "Elm", "Meadow", "Stonebridge", "Highland",
];
const NAME_PARTS_B = {
    municipality: ["ville", " Hollow", " Falls", "town", " Crossing", " Heights", " Junction", " Springs"],
    county: [" County"],
    state: [" State"],
    country: [""],
};
function stageForPop(pop) {
    for (const stage of GROWTH_STAGE_ORDER) {
        const t = POPULATION_THRESHOLDS[stage];
        if (pop >= t.min && pop < t.max)
            return stage;
    }
    return "home_rule_city";
}
function generateName(tier, rng) {
    const a = rng.pick(NAME_PARTS_A);
    const b = rng.pick(NAME_PARTS_B[tier]);
    return `${a}${b}`;
}
function initialFinanceFor(population, tier, rng) {
    const perCapitaRevenue = tier === "municipality" ? rng.range(1300, 2600) : tier === "county" ? rng.range(500, 1100) : rng.range(4000, 9000);
    const revenue = population * perCapitaRevenue;
    const expenditures = revenue * rng.range(0.92, 1.04);
    const fundBalance = revenue * rng.range(0.05, 0.22);
    const debtToRevenue = rng.range(0.15, 0.9);
    const score = clamp(50 + (fundBalance / revenue - 0.16) * 200 - (debtToRevenue - 0.4) * 40, 5, 98);
    return {
        revenue,
        expenditures,
        fundBalance,
        fundBalanceRatio: fundBalance / expenditures,
        creditRating: ratingForScore(score),
        debtToRevenue,
    };
}
export function generateSubJurisdictions(childTier, count, rng) {
    const nodes = [];
    for (let i = 0; i < count; i++) {
        const population = childTier === "municipality"
            ? Math.round(rng.range(800, 120000) * rng.range(0.3, 1))
            : childTier === "county"
                ? Math.round(rng.range(15000, 400000))
                : Math.round(rng.range(500000, 12000000));
        const vitals = {
            infrastructureCondition: rng.range(35, 85),
            maintenanceBacklog: rng.range(15, 55),
            avgServiceQuality: rng.range(35, 80),
            economicHealth: rng.range(50, 110),
            assessedValuePerCapita: 55000,
            taxCompetitivenessIndex: rng.range(80, 130),
        };
        nodes.push({
            id: nextId("sub"),
            name: generateName(childTier, rng),
            tier: childTier,
            stage: childTier === "municipality" ? stageForPop(population) : undefined,
            population,
            vitals,
            finance: initialFinanceFor(population, childTier, rng),
            activeCapitalProject: rng.chance(0.25),
        });
    }
    return nodes;
}
export function simulateSubJurisdictionTick(node, economyMultiplier, rng) {
    if (node.subJurisdictions && node.subJurisdictions.length > 0) {
        for (const child of node.subJurisdictions)
            simulateSubJurisdictionTick(child, economyMultiplier, rng);
        node.population = node.subJurisdictions.reduce((s, c) => s + c.population, 0);
    }
    else {
        const growthRate = clamp(0.008 +
            ((node.vitals.avgServiceQuality - 50) / 100) * 0.02 +
            ((node.vitals.infrastructureCondition - 55) / 100) * 0.012 +
            rng.range(-0.01, 0.01), -0.05, 0.07);
        node.population = Math.max(20, Math.round(node.population * (1 + growthRate)));
        node.stage = node.tier === "municipality" ? stageForPop(node.population) : node.stage;
    }
    node.vitals.infrastructureCondition = clamp(node.vitals.infrastructureCondition + rng.range(-2.5, 1.8), 5, 100);
    node.vitals.maintenanceBacklog = clamp(100 - node.vitals.infrastructureCondition, 0, 100);
    node.vitals.avgServiceQuality = clamp(node.vitals.avgServiceQuality + rng.range(-2, 2), 5, 100);
    node.vitals.economicHealth = clamp(node.vitals.economicHealth + (economyMultiplier - 1) * 25 + rng.range(-2, 2), 10, 150);
    node.activeCapitalProject = rng.chance(0.2);
    const perCapitaRevenue = node.finance.revenue / Math.max(1, node.population);
    const revenue = node.population * perCapitaRevenue * economyMultiplier * rng.range(0.98, 1.03);
    const expenditures = revenue * rng.range(0.9, 1.06);
    node.finance.fundBalance += revenue - expenditures;
    node.finance.revenue = revenue;
    node.finance.expenditures = expenditures;
    node.finance.fundBalanceRatio = node.finance.fundBalance / Math.max(1, expenditures);
    node.finance.debtToRevenue = clamp(node.finance.debtToRevenue + rng.range(-0.04, 0.04), 0, 2.2);
    const score = clamp(50 + (node.finance.fundBalanceRatio - 0.16) * 200 - (node.finance.debtToRevenue - 0.4) * 40, 2, 99);
    node.finance.creditRating = ratingForScore(score);
}
export function ensureSubJurisdictions(j, childTier, count, rng) {
    if (!j.subJurisdictions) {
        j.subJurisdictions = generateSubJurisdictions(childTier, count, rng);
    }
}
export function expandNodeChildren(node, rng) {
    if (node.subJurisdictions)
        return;
    if (node.tier === "country" || node.tier === "state" || node.tier === "county") {
        const childTier = node.tier === "country" ? "state" : node.tier === "state" ? "county" : "municipality";
        const count = childTier === "municipality" ? Math.round(rng.range(4, 8)) : Math.round(rng.range(5, 9));
        node.subJurisdictions = generateSubJurisdictions(childTier, count, rng);
    }
}
export function findNodeById(nodes, id) {
    for (const node of nodes) {
        if (node.id === id)
            return node;
        if (node.subJurisdictions) {
            const found = findNodeById(node.subJurisdictions, id);
            if (found)
                return found;
        }
    }
    return null;
}
export function syncParentPopulationFromChildren(j) {
    if (j.subJurisdictions && j.subJurisdictions.length > 0) {
        j.population = j.subJurisdictions.reduce((s, c) => s + c.population, 0);
    }
}
//# sourceMappingURL=subJurisdictions.js.map