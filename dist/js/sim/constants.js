export const GROWTH_STAGE_ORDER = [
    "hamlet",
    "village",
    "town",
    "small_city",
    "city",
    "home_rule_city",
];
export const CAREER_TIER_ORDER = ["municipality", "county", "state", "country"];
export const POPULATION_THRESHOLDS = {
    hamlet: { min: 0, max: 500 },
    village: { min: 500, max: 2500 },
    town: { min: 2500, max: 10000 },
    small_city: { min: 10000, max: 50000 },
    city: { min: 50000, max: 150000 },
    home_rule_city: { min: 150000, max: Infinity },
};
export const STAGE_LABELS = {
    hamlet: "Unincorporated Hamlet",
    village: "Village",
    town: "Town",
    small_city: "Small City",
    city: "City",
    home_rule_city: "Home-Rule City",
};
export const STAGE_JOB_TITLE = {
    hamlet: "Hamlet Administrator",
    village: "Village Administrator",
    town: "Town Manager",
    small_city: "City Manager",
    city: "City Manager",
    home_rule_city: "City Manager (Home Rule)",
};
export const TIER_LABELS = {
    municipality: "Municipality",
    county: "County",
    state: "State",
    country: "Country",
};
export function stageForPopulation(pop) {
    for (const stage of GROWTH_STAGE_ORDER) {
        const t = POPULATION_THRESHOLDS[stage];
        if (pop >= t.min && pop < t.max)
            return stage;
    }
    return "home_rule_city";
}
export function stageIndex(stage) {
    return GROWTH_STAGE_ORDER.indexOf(stage);
}
export function stageAtLeast(stage, threshold) {
    return stageIndex(stage) >= stageIndex(threshold);
}
export const CREDIT_RATING_ORDER = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "D"];
export const CREDIT_RATING_SPREAD = {
    AAA: 0.005,
    AA: 0.009,
    A: 0.015,
    BBB: 0.024,
    BB: 0.038,
    B: 0.055,
    CCC: 0.085,
    D: 0.15,
};
export const BASE_INTEREST_RATE = 0.032;
export const FUND_BALANCE_BENCHMARK_RATIO = 0.16; // ~2 months operating expenditures, GFOA guidance
export const FUND_BALANCE_WARNING_RATIO = 0.05;
export const FUND_BALANCE_CRISIS_RATIO = -0.02;
export const MONTHS_PER_YEAR = 12;
export const CLOCK_SPEED_MS_PER_MONTH = {
    0: 0,
    1: 2600,
    4: 900,
    15: 300,
};
export const TIER_CONFIGS = {
    municipality: {
        tier: "municipality",
        jurisdictionNoun: "Municipality",
        jobTitle: "Manager",
        hasSubJurisdictions: false,
        hasPension: false,
        hasEnterpriseFund: true,
        goBondUnlockedAtStage: "small_city",
        revenueBondUnlockedAtStage: "home_rule_city",
        revenueSources: [
            { key: "propertyTax", label: "Property Tax", type: "property", cyclical: false },
            { key: "salesTax", label: "Sales Tax", type: "sales", cyclical: true, unlockedAtStage: "small_city" },
            { key: "businessLicenseFees", label: "Business License Fees", type: "fee", cyclical: true, unlockedAtStage: "city" },
            { key: "stateTransfer", label: "State/County Pass-Through Transfers", type: "transfer", cyclical: false },
        ],
        departments: [
            { key: "generalAdmin", label: "General Administration" },
            { key: "publicWorks", label: "Public Works", unlockedAtStage: "town" },
            { key: "publicSafety", label: "Public Safety", unlockedAtStage: "town" },
            { key: "planningZoning", label: "Planning & Zoning", unlockedAtStage: "city" },
            { key: "socialServices", label: "Social Services", unlockedAtStage: "city" },
            { key: "economicDevelopment", label: "Economic Development", unlockedAtStage: "small_city" },
        ],
    },
    county: {
        tier: "county",
        jurisdictionNoun: "County",
        jobTitle: "County Administrator",
        hasSubJurisdictions: true,
        subJurisdictionTier: "municipality",
        hasPension: false,
        hasEnterpriseFund: false,
        revenueSources: [
            { key: "countyPropertyTax", label: "County Property Tax (layered)", type: "property", cyclical: false },
            { key: "courtFees", label: "Court & Recording Fees", type: "fee", cyclical: true },
            { key: "stateTransfer", label: "State Transfers", type: "transfer", cyclical: false },
        ],
        departments: [
            { key: "countyRoads", label: "County Roads" },
            { key: "courtsAndJails", label: "Courts & Jails" },
            { key: "publicHealth", label: "Public Health" },
            { key: "regionalSocialServices", label: "Regional Social Services" },
        ],
    },
    state: {
        tier: "state",
        jurisdictionNoun: "State",
        jobTitle: "State Budget Director",
        hasSubJurisdictions: true,
        subJurisdictionTier: "county",
        hasPension: true,
        hasEnterpriseFund: false,
        revenueSources: [
            { key: "stateSalesTax", label: "State Sales Tax", type: "sales", cyclical: true },
            { key: "stateIncomeTax", label: "State Income Tax (optional)", type: "income", cyclical: true },
            { key: "federalTransfer", label: "Federal Transfers", type: "transfer", cyclical: false },
        ],
        departments: [
            { key: "k12Education", label: "K-12 Education Funding" },
            { key: "stateHighways", label: "State Highways" },
            { key: "medicaidHealth", label: "Medicaid-Style Health Program" },
            { key: "unemploymentInsurance", label: "Unemployment Insurance" },
        ],
    },
    country: {
        tier: "country",
        jurisdictionNoun: "Country",
        jobTitle: "National Budget Director",
        hasSubJurisdictions: true,
        subJurisdictionTier: "state",
        hasPension: true,
        hasEnterpriseFund: false,
        revenueSources: [
            { key: "federalIncomeTax", label: "Federal Income Tax", type: "income", cyclical: true },
            { key: "federalPayrollTax", label: "Federal Payroll Tax", type: "income", cyclical: true },
            { key: "tariffsAndOther", label: "Tariffs & Other Receipts", type: "fee", cyclical: true },
        ],
        departments: [
            { key: "entitlementPrograms", label: "Entitlement Programs" },
            { key: "nationalInfrastructure", label: "National Infrastructure" },
            { key: "transfersToStates", label: "Transfers to States" },
            { key: "generalGovernment", label: "General Government" },
        ],
    },
};
export function getTierConfig(tier) {
    return TIER_CONFIGS[tier];
}
//# sourceMappingURL=constants.js.map