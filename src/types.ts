export type CareerTier = "municipality" | "county" | "state" | "country";

export type GrowthStage =
  | "hamlet"
  | "village"
  | "town"
  | "small_city"
  | "city"
  | "home_rule_city";

export type ClockSpeed = 0 | 1 | 4 | 15;

export type CreditRating = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC" | "D";

export type OversightLevel = "normal" | "warning" | "oversight" | "emergency";

export type FundingSource = "pay_as_you_go" | "go_bond" | "revenue_bond" | "grant";

export type ProjectStatus = "proposed" | "funded" | "in_progress" | "complete" | "cancelled";

export type BondType = "go" | "revenue";

export interface RevenueSourceConfig {
  key: string;
  label: string;
  type: "property" | "sales" | "income" | "fee" | "transfer" | "enterprise";
  cyclical: boolean;
  unlockedAtStage?: GrowthStage;
}

export interface DepartmentConfig {
  key: string;
  label: string;
  unlockedAtStage?: GrowthStage;
}

export interface TierConfig {
  tier: CareerTier;
  jurisdictionNoun: string;
  jobTitle: string;
  revenueSources: RevenueSourceConfig[];
  departments: DepartmentConfig[];
  hasSubJurisdictions: boolean;
  subJurisdictionTier?: CareerTier;
  hasPension: boolean;
  goBondUnlockedAtStage?: GrowthStage;
  revenueBondUnlockedAtStage?: GrowthStage;
  hasEnterpriseFund: boolean;
}

export interface DepartmentBudget {
  key: string;
  label: string;
  allocated: number;
  staffing: number;
  serviceQuality: number; // 0-100, diminishing-returns function of spend/capita
  // Present only while a newly-unlocked department (from a growth-stage promotion) is phasing
  // in its budget over time rather than appearing fully-costed in the same month it unlocks.
  rampMonthsRemaining?: number;
  rampTargetAllocated?: number;
  rampMonthlyIncrement?: number;
}

export interface Bond {
  id: string;
  type: BondType;
  label: string;
  principal: number;
  balance: number;
  annualRate: number;
  termYears: number;
  issuedMonth: number;
  annualPayment: number;
  projectId?: string;
}

export interface CapitalProject {
  id: string;
  name: string;
  category: string;
  estimatedCost: number;
  actualCost: number;
  fundingSource: FundingSource;
  bondId?: string;
  status: ProjectStatus;
  proposedMonth: number;
  fundedMonth?: number;
  startMonth?: number;
  completeMonth?: number;
  durationMonths: number;
  progressMonths: number;
  overrunFactor: number; // 1.0 = on budget
  cancelledMonth?: number;
}

export interface EnterpriseFund {
  key: string;
  label: string;
  feeRate: number;
  fundBalance: number;
  ytdRevenue: number;
  ytdExpenditures: number;
  subsidyFromGeneralFundYtd: number;
  pilotPaidToGeneralFundYtd: number;
}

export interface PensionSystem {
  actuarialLiability: number;
  assets: number;
  fundedRatio: number;
  annualRequiredContribution: number;
  actualContributionLastYear: number;
  plannedContribution: number;
  assumedReturnRate: number;
}

export interface GeneralFund {
  fundBalance: number;
  ytdRevenue: number;
  ytdExpenditures: number;
  lastYearRevenue: number;
  lastYearExpenditures: number;
  revenueHistory: number[];
  // Revenue history with intergovernmental transfers excluded -- used for the credit rating's
  // growth trend so a structural transfer-rate step-down on promotion (e.g. hamlet -> village)
  // isn't scored the same as an organic decline in the jurisdiction's own tax base.
  ownSourceRevenueHistory: number[];
  expenditureHistory: number[];
  fundBalanceHistory: number[];
  revenueBreakdownLastYear: Record<string, number>;
}

export interface TaxRates {
  propertyMillRate: number; // mills per $1000 assessed value
  salesTaxRate: number; // percent
  incomeTaxRate: number; // percent, 0 allowed
  businessLicenseFeeLevel: number; // 0-100 arbitrary intensity
  utilityFeeRate: number; // enterprise fund fee level, 0-100
}

export interface JurisdictionVitals {
  infrastructureCondition: number; // 0-100
  maintenanceBacklog: number; // 0-100, higher is worse
  avgServiceQuality: number; // 0-100
  economicHealth: number; // 0-100
  assessedValuePerCapita: number;
  taxCompetitivenessIndex: number; // 100 = average vs comparable jurisdictions
}

export interface OversightState {
  level: OversightLevel;
  consecutiveDeficitYears: number;
  monthsAtCurrentLevel: number;
  missedDebtServiceLastYear: boolean;
}

export interface YearSummary {
  year: number;
  fundBalanceRatio: number;
  creditRating: CreditRating;
  populationGrowthPct: number;
  avgServiceQuality: number;
  infrastructureCondition: number;
  score: number;
}

export interface SimFinance {
  revenue: number;
  expenditures: number;
  fundBalance: number;
  fundBalanceRatio: number;
  creditRating: CreditRating;
  debtToRevenue: number;
}

export interface SimJurisdiction {
  id: string;
  name: string;
  tier: CareerTier;
  stage?: GrowthStage;
  population: number;
  vitals: JurisdictionVitals;
  finance: SimFinance;
  activeCapitalProject: boolean;
  subJurisdictions?: SimJurisdiction[];
}

export interface EconDevProgram {
  id: string;
  label: string;
  active: boolean;
  annualCost: number;
  growthBoostPct: number;
  monthsRemaining: number;
}

export interface PlayerJurisdiction {
  id: string;
  name: string;
  tier: CareerTier;
  stage?: GrowthStage;
  population: number;
  foundedMonth: number;
  vitals: JurisdictionVitals;
  taxRates: TaxRates;
  departments: DepartmentBudget[];
  generalFund: GeneralFund;
  capitalFundBalance: number;
  capitalAssetsNetValue: number;
  netPositionTracked: number;
  grantPoolRemaining: number;
  // Separate from grantPoolRemaining -- this pool offsets department operating costs
  // (state/federal operating aid), rather than capital projects.
  operatingGrantPoolRemaining: number;
  // 0 to ADMIN_EFFICIENCY_CAP. Earned permanently from completed Administrative Building
  // capital projects; trims General Admin's effective per-capita baseline cost.
  adminEfficiencyBonus: number;
  capitalProjects: CapitalProject[];
  bonds: Bond[];
  enterpriseFunds: EnterpriseFund[];
  pension?: PensionSystem;
  creditRating: CreditRating;
  oversight: OversightState;
  subJurisdictions?: SimJurisdiction[];
  econDevPrograms: EconDevProgram[];
  scorecardHistory: YearSummary[];
  reclassificationPending?: { targetStage: GrowthStage; referendumMonth: number };
}

export type GameEventKind =
  | "storm"
  | "employer"
  | "economy"
  | "oversight"
  | "promotion"
  | "project"
  | "reclassification"
  | "info";

export interface GameEvent {
  id: string;
  month: number;
  title: string;
  description: string;
  kind: GameEventKind;
  severity: "info" | "warning" | "danger" | "good";
}

export interface TenureRecord {
  tier: CareerTier;
  name: string;
  endedReason: "promoted" | "emergency_manager";
  finalScore: number;
  finalCreditRating: CreditRating;
  months: number;
}

export interface PromotionOffer {
  toTier: CareerTier;
  message: string;
}

/** A standing, non-blocking offer to take over a different country-tier jurisdiction -- the
 * endgame equivalent of a promotion once there's no higher CareerTier left to be promoted into. */
export interface CareerPosting {
  id: string;
  name: string;
  riskLabel: "Stable" | "Elevated Risk" | "High Risk" | "Golden Star";
  scaleMultiplier: number;
  pensionFundedRatio: number;
  description: string;
}

export interface GameOverInfo {
  jurisdictionName: string;
  tier: CareerTier;
  reason: string;
  finalStats: YearSummary | null;
}

export interface CareerState {
  reputation: number; // 0-100, carries forward across promotions
  tenureHistory: TenureRecord[];
  currentTier: CareerTier;
  jurisdiction: PlayerJurisdiction;
  clockMonth: number;
  clockSpeed: ClockSpeed;
  eventLog: GameEvent[];
  pendingPromotionOffer?: PromotionOffer;
  careerPostings?: CareerPosting[];
  gameOverInfo?: GameOverInfo;
  economyCyclePosition: number; // 0..1 phase through boom/bust cycle
  economyMultiplier: number; // applied to cyclical revenue
}

export interface SaveFile {
  version: number;
  savedAtMonth: number;
  career: CareerState;
}

/** A player-made snapshot of the full career at some point in time, so a mistake (or a
 * deliberate experiment) can be undone without restarting the whole career from scratch. */
export interface Checkpoint {
  id: string;
  label: string;
  createdAt: number; // Date.now() when the checkpoint was taken
  clockMonth: number;
  jurisdictionName: string;
  tier: CareerTier;
  career: CareerState;
}

export interface CheckpointSummary {
  id: string;
  label: string;
  createdAt: number;
  clockMonth: number;
  jurisdictionName: string;
  tier: CareerTier;
}
