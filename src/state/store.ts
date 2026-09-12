import type { CareerState, ClockSpeed, FundingSource, SaveFile, TaxRates } from "../types.js";
import { Rng } from "../utils/random.js";
import { CLOCK_SPEED_MS_PER_MONTH } from "../sim/constants.js";
import { createNewCareer } from "../sim/newGame.js";
import {
  acceptPromotion,
  declinePromotion,
  petitionForReclassification,
  startNextJobAfterEmergencyManager,
  tickMonth,
} from "../sim/engine.js";
import {
  cancelProject,
  fundProject,
  proposeProject,
  startProject,
} from "../sim/capitalProjects.js";
import { setDepartmentAllocation, updateDepartmentServiceQuality } from "../sim/departments.js";
import { createEconDevProgram } from "../sim/growth.js";
import { expandNodeChildren, findNodeById } from "../sim/subJurisdictions.js";

const SAVE_KEY = "steward_save_v1";
const SAVE_VERSION = 1;

type Listener = () => void;

class GameStore {
  career: CareerState;
  rng: Rng;
  private listeners: Listener[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.rng = new Rng(Date.now() ^ 0x9e3779b9);
    this.career = this.loadOrCreate();
    this.scheduleTick();
  }

  private loadOrCreate(): CareerState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const save = JSON.parse(raw) as SaveFile;
        if (save && save.version === SAVE_VERSION && save.career) {
          return save.career;
        }
      }
    } catch (e) {
      console.warn("Failed to load save:", e);
    }
    return createNewCareer(this.rng);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.persist();
    for (const l of this.listeners) l();
  }

  private persist(): void {
    try {
      const save: SaveFile = {
        version: SAVE_VERSION,
        savedAtMonth: this.career.clockMonth,
        career: this.career,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (e) {
      console.warn("Autosave failed:", e);
    }
  }

  private scheduleTick(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const speed = this.career.clockSpeed;
    if (speed === 0 || this.career.gameOverInfo) return;
    const ms = CLOCK_SPEED_MS_PER_MONTH[speed] ?? 2600;
    this.timer = setTimeout(() => {
      this.doTick();
      this.scheduleTick();
    }, ms);
  }

  private doTick(): void {
    if (this.career.gameOverInfo) return;
    tickMonth(this.career, this.rng);
    this.notify();
  }

  // ---- Time controls ----
  setClockSpeed(speed: ClockSpeed): void {
    this.career.clockSpeed = speed;
    this.scheduleTick();
    this.notify();
  }

  // ---- Tax & budget ----
  setTaxRate<K extends keyof TaxRates>(key: K, value: number): void {
    this.career.jurisdiction.taxRates[key] = value as TaxRates[K];
    this.notify();
  }

  setDepartmentAllocation(key: string, amount: number): void {
    setDepartmentAllocation(this.career.jurisdiction, key, amount);
    updateDepartmentServiceQuality(this.career.jurisdiction);
    this.notify();
  }

  setPensionContribution(amount: number): void {
    if (this.career.jurisdiction.pension) {
      this.career.jurisdiction.pension.plannedContribution = Math.max(0, amount);
      this.notify();
    }
  }

  setEnterpriseFeeRate(key: string, rate: number): void {
    const ef = this.career.jurisdiction.enterpriseFunds.find((e) => e.key === key);
    if (ef) {
      ef.feeRate = rate;
      this.notify();
    }
  }

  // ---- Capital projects ----
  proposeProject(name: string, category: string, cost: number, durationMonths: number): void {
    proposeProject(this.career.jurisdiction, name, category, cost, durationMonths, this.career.clockMonth);
    this.notify();
  }

  fundProject(id: string, source: FundingSource): { ok: boolean; reason?: string } {
    const result = fundProject(this.career.jurisdiction, id, source, this.career.clockMonth);
    this.notify();
    return result;
  }

  startProject(id: string): void {
    startProject(this.career.jurisdiction, id, this.career.clockMonth);
    this.notify();
  }

  cancelProject(id: string): void {
    cancelProject(this.career.jurisdiction, id, this.career.clockMonth);
    this.notify();
  }

  // ---- Economic development ----
  addEconDevProgram(label: string, annualCost: number, growthBoostPct: number, durationMonths: number): void {
    this.career.jurisdiction.econDevPrograms.push(
      createEconDevProgram(label, annualCost, growthBoostPct, durationMonths)
    );
    this.notify();
  }

  cancelEconDevProgram(id: string): void {
    const program = this.career.jurisdiction.econDevPrograms.find((p) => p.id === id);
    if (program) {
      program.active = false;
      program.monthsRemaining = 0;
      this.notify();
    }
  }

  // ---- Growth stage / career ----
  petitionForReclassification(): { ok: boolean; reason?: string } {
    const result = petitionForReclassification(this.career);
    this.notify();
    return result;
  }

  acceptPromotion(): void {
    acceptPromotion(this.career, this.rng);
    this.notify();
  }

  declinePromotion(): void {
    declinePromotion(this.career);
    this.notify();
  }

  continueAfterEmergencyManager(): void {
    startNextJobAfterEmergencyManager(this.career, this.rng);
    this.scheduleTick();
    this.notify();
  }

  // ---- Sub-jurisdiction drill-down ----
  expandNodeById(id: string): void {
    const roots = this.career.jurisdiction.subJurisdictions;
    if (!roots) return;
    const node = findNodeById(roots, id);
    if (node) {
      expandNodeChildren(node, this.rng);
      this.notify();
    }
  }

  // ---- Save management ----
  resetCareer(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      console.warn("Could not clear save:", e);
    }
    this.career = createNewCareer(this.rng);
    this.scheduleTick();
    this.notify();
  }

  forceSave(): void {
    this.persist();
  }

  exportSave(): SaveFile {
    return {
      version: SAVE_VERSION,
      savedAtMonth: this.career.clockMonth,
      career: this.career,
    };
  }

  importSave(raw: unknown): { ok: boolean; reason?: string } {
    if (!raw || typeof raw !== "object") {
      return { ok: false, reason: "That file doesn't look like a Steward save." };
    }
    const candidate = raw as Partial<SaveFile>;
    const career = candidate.career ?? (raw as CareerState);
    if (
      !career ||
      typeof career !== "object" ||
      !(career as CareerState).jurisdiction ||
      typeof (career as CareerState).clockMonth !== "number"
    ) {
      return { ok: false, reason: "That file doesn't look like a Steward save." };
    }
    this.career = career as CareerState;
    this.scheduleTick();
    this.notify();
    return { ok: true };
  }
}

export const store = new GameStore();
