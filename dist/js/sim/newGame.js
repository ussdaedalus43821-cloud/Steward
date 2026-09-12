import { nextId } from "../utils/id.js";
import { getTierConfig } from "./constants.js";
import { ensureDepartmentBudgets, updateDepartmentServiceQuality } from "./departments.js";
import { createPensionSystem } from "./pension.js";
import { generateSubJurisdictions } from "./subJurisdictions.js";
import { computeTaxCompetitivenessIndex } from "./growth.js";
function initialVitals() {
    return {
        infrastructureCondition: 62,
        maintenanceBacklog: 38,
        avgServiceQuality: 50,
        economicHealth: 78,
        assessedValuePerCapita: 55000,
        taxCompetitivenessIndex: 100,
    };
}
function initialTaxRates(tier) {
    if (tier === "municipality") {
        return { propertyMillRate: 7, salesTaxRate: 0, incomeTaxRate: 0, businessLicenseFeeLevel: 0, utilityFeeRate: 50 };
    }
    if (tier === "county") {
        return { propertyMillRate: 5, salesTaxRate: 0, incomeTaxRate: 0, businessLicenseFeeLevel: 0, utilityFeeRate: 0 };
    }
    if (tier === "state") {
        return { propertyMillRate: 0, salesTaxRate: 6, incomeTaxRate: 4, businessLicenseFeeLevel: 0, utilityFeeRate: 0 };
    }
    return { propertyMillRate: 0, salesTaxRate: 0, incomeTaxRate: 15, businessLicenseFeeLevel: 0, utilityFeeRate: 0 };
}
function initialGeneralFund(startingBalance) {
    return {
        fundBalance: startingBalance,
        ytdRevenue: 0,
        ytdExpenditures: 0,
        lastYearRevenue: 0,
        lastYearExpenditures: 0,
        revenueHistory: [],
        expenditureHistory: [],
        fundBalanceHistory: [],
        revenueBreakdownLastYear: {},
    };
}
function initialOversight() {
    return { level: "normal", consecutiveDeficitYears: 0, monthsAtCurrentLevel: 0, missedDebtServiceLastYear: false };
}
const TIER_START_POPULATION = {
    municipality: () => 300,
    county: () => 0, // derived from generated sub-jurisdictions
    state: () => 0,
    country: () => 0,
};
const TIER_JURISDICTION_NAMES = {
    municipality: ["Millbrook", "Ashford", "Clearwater", "Pinehaven", "Dunmore", "Elk Creek"],
    county: ["Ashford County", "Clearwater County", "Marion County", "Sable County"],
    state: ["Columbia", "Sierra", "Ashland", "Monroe"],
    country: ["Federated Republic"],
};
export function createPlayerJurisdiction(tier, currentMonth, rng) {
    const tierConfig = getTierConfig(tier);
    const name = rng.pick(TIER_JURISDICTION_NAMES[tier]);
    let population = TIER_START_POPULATION[tier]();
    let subJurisdictions;
    if (tierConfig.hasSubJurisdictions && tierConfig.subJurisdictionTier) {
        const count = tier === "county" ? Math.round(rng.range(5, 8)) : tier === "state" ? Math.round(rng.range(5, 9)) : Math.round(rng.range(6, 10));
        subJurisdictions = generateSubJurisdictions(tierConfig.subJurisdictionTier, count, rng);
        population = subJurisdictions.reduce((s, c) => s + c.population, 0);
    }
    const j = {
        id: nextId("juris"),
        name,
        tier,
        stage: tier === "municipality" ? "hamlet" : undefined,
        population,
        foundedMonth: currentMonth,
        vitals: initialVitals(),
        taxRates: initialTaxRates(tier),
        departments: [],
        generalFund: initialGeneralFund(0),
        capitalFundBalance: 0,
        capitalAssetsNetValue: 0,
        netPositionTracked: 0,
        grantPoolRemaining: tier === "municipality" ? 200000 : tier === "county" ? 1500000 : tier === "state" ? 12000000 : 0,
        capitalProjects: [],
        bonds: [],
        enterpriseFunds: [],
        pension: tierConfig.hasPension
            ? createPensionSystem(population * (tier === "state" ? 9000 : 14000), tier === "state" ? 0.68 : 0.78)
            : undefined,
        creditRating: "BBB",
        oversight: initialOversight(),
        subJurisdictions,
        econDevPrograms: [],
        scorecardHistory: [],
    };
    ensureDepartmentBudgets(j, tierConfig);
    updateDepartmentServiceQuality(j);
    j.vitals.taxCompetitivenessIndex = computeTaxCompetitivenessIndex(j);
    const annualExpenditureGuess = j.departments.reduce((s, d) => s + d.allocated, 0);
    const startingBalance = annualExpenditureGuess * 0.18;
    j.generalFund.fundBalance = startingBalance;
    j.netPositionTracked = startingBalance;
    return j;
}
export function createNewCareer(rng) {
    const jurisdiction = createPlayerJurisdiction("municipality", 0, rng);
    return {
        reputation: 10,
        tenureHistory: [],
        currentTier: "municipality",
        jurisdiction,
        clockMonth: 0,
        clockSpeed: 1,
        eventLog: [],
        economyCyclePosition: 0,
        economyMultiplier: 1,
    };
}
//# sourceMappingURL=newGame.js.map