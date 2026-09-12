import { store } from "../../state/store.js";
import { formatMonth } from "../../utils/format.js";
import { TIER_LABELS } from "../../sim/constants.js";
export function renderSettings(container) {
    const career = store.career;
    const tenureRows = career.tenureHistory.length
        ? career.tenureHistory
            .map((t) => `<tr>
        <td>${t.name}</td>
        <td>${TIER_LABELS[t.tier]}</td>
        <td>${t.endedReason === "promoted" ? "Promoted" : "Emergency Manager Installed"}</td>
        <td class="num">${t.finalScore.toFixed(0)}</td>
        <td class="num">${t.finalCreditRating}</td>
        <td class="num">${t.months}mo</td>
      </tr>`)
            .join("")
        : `<tr><td colspan="6" class="locked-note">No completed tenures yet.</td></tr>`;
    container.innerHTML = `
    <div class="two-col">
      <div class="card">
        <h3>Career</h3>
        <table>
          <tr><td>Reputation</td><td class="num">${career.reputation.toFixed(0)} / 100</td></tr>
          <tr><td>Current Tier</td><td class="num">${TIER_LABELS[career.currentTier]}</td></tr>
          <tr><td>Time Elapsed</td><td class="num">${formatMonth(career.clockMonth)}</td></tr>
        </table>
      </div>
      <div class="card">
        <h3>Save Data</h3>
        <p class="field-hint">Steward autosaves to your browser's local storage after every change and every simulated month.</p>
        <button class="btn secondary" id="force-save-btn">Save Now</button>
        <hr style="margin:16px 0;border:none;border-top:1px solid var(--border);" />
        <button class="btn danger" id="reset-btn">Start New Career (reset everything)</button>
      </div>
    </div>
    <div class="card" style="margin-top:16px;">
      <h3>Tenure History</h3>
      <table>
        <thead><tr><th>Jurisdiction</th><th>Tier</th><th>Outcome</th><th class="num">Final Score</th><th class="num">Final Rating</th><th class="num">Duration</th></tr></thead>
        <tbody>${tenureRows}</tbody>
      </table>
    </div>
  `;
    container.querySelector("#force-save-btn")?.addEventListener("click", () => {
        store.forceSave();
        alert("Saved.");
    });
    container.querySelector("#reset-btn")?.addEventListener("click", () => {
        if (confirm("This will permanently erase your current career. Are you sure?")) {
            store.resetCareer();
        }
    });
}
//# sourceMappingURL=settings.js.map