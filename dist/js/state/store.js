import { Rng } from "../utils/random.js";
import { CLOCK_SPEED_MS_PER_MONTH } from "../sim/constants.js";
import { createNewCareer } from "../sim/newGame.js";
import { acceptPromotion, declinePromotion, petitionForReclassification, startNextJobAfterEmergencyManager, tickMonth, } from "../sim/engine.js";
import { cancelProject, fundProject, proposeProject, startProject, } from "../sim/capitalProjects.js";
import { setDepartmentAllocation, updateDepartmentServiceQuality } from "../sim/departments.js";
import { createEconDevProgram } from "../sim/growth.js";
import { expandNodeChildren, findNodeById } from "../sim/subJurisdictions.js";
const SAVE_KEY = "steward_save_v1";
const SAVE_VERSION = 1;
class GameStore {
    constructor() {
        this.listeners = [];
        this.timer = null;
        this.lastActiveSpeed = 1;
        this.rng = new Rng(Date.now() ^ 0x9e3779b9);
        this.career = this.loadOrCreate();
        this.scheduleTick();
    }
    loadOrCreate() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                const save = JSON.parse(raw);
                if (save && save.version === SAVE_VERSION && save.career) {
                    return save.career;
                }
            }
        }
        catch (e) {
            console.warn("Failed to load save:", e);
        }
        return createNewCareer(this.rng);
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    notify() {
        this.persist();
        for (const l of this.listeners)
            l();
    }
    persist() {
        try {
            const save = {
                version: SAVE_VERSION,
                savedAtMonth: this.career.clockMonth,
                career: this.career,
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(save));
        }
        catch (e) {
            console.warn("Autosave failed:", e);
        }
    }
    scheduleTick() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        const speed = this.career.clockSpeed;
        if (speed === 0 || this.career.gameOverInfo)
            return;
        const ms = CLOCK_SPEED_MS_PER_MONTH[speed] ?? 2600;
        this.timer = setTimeout(() => {
            this.doTick();
            this.scheduleTick();
        }, ms);
    }
    doTick() {
        if (this.career.gameOverInfo)
            return;
        tickMonth(this.career, this.rng);
        this.notify();
    }
    // ---- Time controls ----
    setClockSpeed(speed) {
        if (speed !== 0)
            this.lastActiveSpeed = speed;
        this.career.clockSpeed = speed;
        this.scheduleTick();
        this.notify();
    }
    togglePause() {
        if (this.career.clockSpeed === 0) {
            this.setClockSpeed(this.lastActiveSpeed);
        }
        else {
            this.lastActiveSpeed = this.career.clockSpeed;
            this.setClockSpeed(0);
        }
    }
    // ---- Tax & budget ----
    setTaxRate(key, value) {
        this.career.jurisdiction.taxRates[key] = value;
        this.notify();
    }
    setDepartmentAllocation(key, amount) {
        setDepartmentAllocation(this.career.jurisdiction, key, amount);
        updateDepartmentServiceQuality(this.career.jurisdiction);
        this.notify();
    }
    setPensionContribution(amount) {
        if (this.career.jurisdiction.pension) {
            this.career.jurisdiction.pension.plannedContribution = Math.max(0, amount);
            this.notify();
        }
    }
    setEnterpriseFeeRate(key, rate) {
        const ef = this.career.jurisdiction.enterpriseFunds.find((e) => e.key === key);
        if (ef) {
            ef.feeRate = rate;
            this.notify();
        }
    }
    // ---- Capital projects ----
    proposeProject(name, category, cost, durationMonths) {
        proposeProject(this.career.jurisdiction, name, category, cost, durationMonths, this.career.clockMonth);
        this.notify();
    }
    fundProject(id, source) {
        const result = fundProject(this.career.jurisdiction, id, source, this.career.clockMonth);
        this.notify();
        return result;
    }
    startProject(id) {
        startProject(this.career.jurisdiction, id, this.career.clockMonth);
        this.notify();
    }
    cancelProject(id) {
        cancelProject(this.career.jurisdiction, id, this.career.clockMonth);
        this.notify();
    }
    // ---- Economic development ----
    addEconDevProgram(label, annualCost, growthBoostPct, durationMonths) {
        this.career.jurisdiction.econDevPrograms.push(createEconDevProgram(label, annualCost, growthBoostPct, durationMonths));
        this.notify();
    }
    cancelEconDevProgram(id) {
        const program = this.career.jurisdiction.econDevPrograms.find((p) => p.id === id);
        if (program) {
            program.active = false;
            program.monthsRemaining = 0;
            this.notify();
        }
    }
    // ---- Growth stage / career ----
    petitionForReclassification() {
        const result = petitionForReclassification(this.career);
        this.notify();
        return result;
    }
    acceptPromotion() {
        acceptPromotion(this.career, this.rng);
        this.notify();
    }
    declinePromotion() {
        declinePromotion(this.career);
        this.notify();
    }
    continueAfterEmergencyManager() {
        startNextJobAfterEmergencyManager(this.career, this.rng);
        this.scheduleTick();
        this.notify();
    }
    // ---- Sub-jurisdiction drill-down ----
    expandNodeById(id) {
        const roots = this.career.jurisdiction.subJurisdictions;
        if (!roots)
            return;
        const node = findNodeById(roots, id);
        if (node) {
            expandNodeChildren(node, this.rng);
            this.notify();
        }
    }
    // ---- Save management ----
    resetCareer() {
        try {
            localStorage.removeItem(SAVE_KEY);
        }
        catch (e) {
            console.warn("Could not clear save:", e);
        }
        this.career = createNewCareer(this.rng);
        this.scheduleTick();
        this.notify();
    }
    forceSave() {
        this.persist();
    }
    exportSave() {
        return {
            version: SAVE_VERSION,
            savedAtMonth: this.career.clockMonth,
            career: this.career,
        };
    }
    importSave(raw) {
        if (!raw || typeof raw !== "object") {
            return { ok: false, reason: "That file doesn't look like a Steward save." };
        }
        const candidate = raw;
        const career = candidate.career ?? raw;
        if (!career ||
            typeof career !== "object" ||
            !career.jurisdiction ||
            typeof career.clockMonth !== "number") {
            return { ok: false, reason: "That file doesn't look like a Steward save." };
        }
        this.career = career;
        this.scheduleTick();
        this.notify();
        return { ok: true };
    }
}
export const store = new GameStore();
//# sourceMappingURL=store.js.map