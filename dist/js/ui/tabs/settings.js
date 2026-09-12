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
        <p class="field-hint">Steward autosaves to this browser's local storage after every change and every simulated month. Browser storage isn't shared between devices (or reliably kept forever by Safari on iOS for a large save) — export a backup file periodically and import it on another device to carry a career across your Mac and iPhone.</p>
        <button class="btn secondary" id="force-save-btn">Save Now</button>
        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
          <button class="btn secondary" id="export-btn">Export Save (.json)</button>
          <button class="btn secondary" id="import-btn">Import Save (.json)</button>
          <input type="file" id="import-file-input" accept="application/json,.json" style="display:none;" />
        </div>
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
    container.querySelector("#export-btn")?.addEventListener("click", () => {
        const save = store.exportSave();
        const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const jurisName = save.career.jurisdiction.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const dateStr = new Date().toISOString().slice(0, 10);
        const a = document.createElement("a");
        a.href = url;
        a.download = `steward-save-${jurisName}-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });
    const fileInput = container.querySelector("#import-file-input");
    container.querySelector("#import-btn")?.addEventListener("click", () => {
        fileInput?.click();
    });
    fileInput?.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file)
            return;
        if (!confirm("Importing will replace your current career on this device. Continue?")) {
            fileInput.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result));
                const result = store.importSave(parsed);
                if (!result.ok) {
                    alert(result.reason ?? "Could not import that file.");
                }
            }
            catch (e) {
                alert("Could not read that file as JSON.");
            }
            finally {
                fileInput.value = "";
            }
        };
        reader.readAsText(file);
    });
    container.querySelector("#reset-btn")?.addEventListener("click", () => {
        if (confirm("This will permanently erase your current career. Are you sure?")) {
            store.resetCareer();
        }
    });
}
//# sourceMappingURL=settings.js.map