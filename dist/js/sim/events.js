import { nextId } from "../utils/id.js";
import { clamp } from "../utils/format.js";
import { estimatedAnnualExpenditure } from "./fiscal.js";
const CYCLE_LENGTH_MONTHS = 84;
const CYCLE_AMPLITUDE = 0.14;
export function advanceEconomyCycle(state) {
    state.cyclePosition = (state.cyclePosition + 1 / CYCLE_LENGTH_MONTHS) % 1;
    state.multiplier = 1 + CYCLE_AMPLITUDE * Math.sin(2 * Math.PI * state.cyclePosition);
}
function makeEvent(month, title, description, kind, severity) {
    return { id: nextId("evt"), month, title, description, kind, severity };
}
export function tickRandomEvents(j, currentMonth, economyMultiplier, rng) {
    const events = [];
    // Damage costs scale off this jurisdiction's OWN budget (a % of annual revenue), not a
    // flat dollar figure calibrated for a mid-size city — a hamlet and a state should each
    // take a proportional hit, not the same absolute repair bill.
    const budgetScale = Math.max(j.generalFund.lastYearRevenue, j.generalFund.ytdRevenue * 12, estimatedAnnualExpenditure(j));
    if (rng.chance(0.012)) {
        const severity = rng.chance(0.35) ? "major" : "moderate";
        const damage = severity === "major" ? rng.range(9, 18) : rng.range(3, 8);
        const cost = (severity === "major" ? rng.range(0.08, 0.18) : rng.range(0.02, 0.06)) * budgetScale;
        j.vitals.infrastructureCondition = clamp(j.vitals.infrastructureCondition - damage, 0, 100);
        j.generalFund.fundBalance -= cost;
        j.generalFund.ytdExpenditures += cost;
        j.netPositionTracked -= cost;
        events.push(makeEvent(currentMonth, severity === "major" ? "Major Storm Damage" : "Storm Damage", `A ${severity === "major" ? "severe storm" : "storm"} damaged infrastructure and cost emergency repairs.`, "storm", severity === "major" ? "danger" : "warning"));
    }
    if (rng.chance(0.01)) {
        const opening = rng.chance(0.55);
        const magnitude = rng.range(6, 18);
        j.vitals.economicHealth = clamp(j.vitals.economicHealth + (opening ? magnitude : -magnitude), 10, 160);
        events.push(makeEvent(currentMonth, opening ? "Major Employer Opens" : "Major Employer Closes", opening
            ? "A large employer has opened operations, boosting the local tax base."
            : "A large employer has closed or relocated, shrinking the local tax base.", "employer", opening ? "good" : "warning"));
    }
    if (economyMultiplier < 0.92 && rng.chance(0.02)) {
        events.push(makeEvent(currentMonth, "Regional Recession", "Cyclical revenue (sales/income tax) is running well below trend.", "economy", "warning"));
    }
    else if (economyMultiplier > 1.08 && rng.chance(0.02)) {
        events.push(makeEvent(currentMonth, "Economic Boom", "Cyclical revenue is running well above trend.", "economy", "good"));
    }
    return events;
}
//# sourceMappingURL=events.js.map