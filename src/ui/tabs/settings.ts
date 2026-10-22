import { store } from "../../state/store.js";
import { formatMonth, formatPercent } from "../../utils/format.js";
import { TIER_LABELS } from "../../sim/constants.js";
import { icon } from "../icons.js";
import { GAME_BUILD, GAME_BUILD_COMMIT, GAME_VERSION } from "../../version.js";

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export function renderSettings(container: HTMLElement): void {
  const career = store.career;
  const activeCrisis = career.jurisdiction.activeCrisis;
  const crisisRow = activeCrisis
    ? `<tr><td>Active National Crisis</td><td class="num" style="color:var(--warn);">${escapeText(activeCrisis.label)}</td></tr>`
    : "";

  const tenureRows = career.tenureHistory.length
    ? career.tenureHistory
        .map(
          (t) => `<tr>
        <td>${t.name}</td>
        <td>${TIER_LABELS[t.tier]}</td>
        <td>${t.endedReason === "promoted" ? "Promoted" : "Emergency Manager Installed"}</td>
        <td class="num">${t.finalScore.toFixed(0)}</td>
        <td class="num">${t.finalCreditRating}</td>
        <td class="num">${t.months}mo</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="6" class="locked-note">No completed tenures yet.</td></tr>`;

  const checkpoints = store.listCheckpoints();
  const checkpointRows = checkpoints.length
    ? checkpoints
        .map(
          (c) => `<tr>
        <td>${escapeText(c.label)}</td>
        <td>${escapeText(c.jurisdictionName)} · ${TIER_LABELS[c.tier]}</td>
        <td class="num">${formatMonth(c.clockMonth)}</td>
        <td class="num">${new Date(c.createdAt).toLocaleString()}</td>
        <td style="white-space:nowrap;">
          <button class="btn small secondary" data-restore-checkpoint="${c.id}">Restore</button>
          <button class="btn small danger" data-delete-checkpoint="${c.id}">Delete</button>
        </td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="locked-note">No checkpoints saved yet.</td></tr>`;

  const postings = career.careerPostings ?? [];
  const postingsCard = postings.length
    ? `<div class="card" style="margin-top:16px;">
        <h3>Career Opportunities</h3>
        <p class="field-hint">Country is the top of the career ladder -- there's no further promotion. These are other nations looking for leadership instead. Accepting freezes ${escapeText(career.jurisdiction.name)} in your tenure history and hands you a fresh country, at the scale and risk shown below. No rush -- they'll keep until you're ready.</p>
        <div class="grid grid-cols-2">
          ${postings
            .map((p) => {
              const isGoldenStar = p.riskLabel === "Golden Star";
              return `<div class="card${isGoldenStar ? " golden-star-card" : ""}">
                <h3>${isGoldenStar ? `<span class="golden-star-icon">${icon("star")}</span>` : ""}${escapeText(p.name)}</h3>
                <table>
                  <tr><td>Risk</td><td class="num">${p.riskLabel}</td></tr>
                  <tr><td>Scale</td><td class="num">~${p.scaleMultiplier.toFixed(1)}x current population</td></tr>
                  <tr><td>Starting Pension Funded Ratio</td><td class="num">${formatPercent(p.pensionFundedRatio * 100)}</td></tr>
                </table>
                <p class="field-hint">${escapeText(p.description)}</p>
                <button class="btn" data-accept-posting="${p.id}">Accept Posting</button>
              </div>`;
            })
            .join("")}
        </div>
      </div>`
    : "";

  container.innerHTML = `
    <div class="two-col">
      <div class="card">
        <h3>Career</h3>
        <table>
          <tr><td>Reputation</td><td class="num">${career.reputation.toFixed(0)} / 100</td></tr>
          <tr><td>Current Tier</td><td class="num">${TIER_LABELS[career.currentTier]}</td></tr>
          <tr><td>Time Elapsed</td><td class="num">${formatMonth(career.clockMonth)}</td></tr>
          ${crisisRow}
        </table>
        ${activeCrisis ? `<p class="field-hint" style="color:var(--warn);">${escapeText(activeCrisis.description)}</p>` : ""}
      </div>
      <div class="card">
        <h3>Save Data</h3>
        <div style="margin-bottom:10px;">
          <div style="font-size:1.15rem;font-weight:800;font-family:'Inter Tight',sans-serif;">${GAME_VERSION}</div>
          <div style="font-size:0.72rem;color:var(--ink-faint);margin-top:2px;">${GAME_BUILD} · commit ${GAME_BUILD_COMMIT}</div>
        </div>
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
    ${postingsCard}
    <div class="card" style="margin-top:16px;">
      <h3>Checkpoints</h3>
      <p class="field-hint">Save a snapshot of exactly where you are now, so you can undo a mistake or try something different later without restarting the whole career. Checkpoints live only in this browser, separately from the regular autosave — up to 20 are kept.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <input type="text" id="checkpoint-label" placeholder="Label (optional)" style="flex:1;min-width:160px;" />
        <button class="btn secondary" id="checkpoint-create-btn">Save Checkpoint Here</button>
      </div>
      <table style="margin-top:12px;">
        <thead><tr><th>Label</th><th>Jurisdiction</th><th class="num">In-Game Date</th><th class="num">Saved</th><th></th></tr></thead>
        <tbody>${checkpointRows}</tbody>
      </table>
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

  const fileInput = container.querySelector<HTMLInputElement>("#import-file-input");
  container.querySelector("#import-btn")?.addEventListener("click", () => {
    fileInput?.click();
  });
  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
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
      } catch (e) {
        alert("Could not read that file as JSON.");
      } finally {
        fileInput.value = "";
      }
    };
    reader.readAsText(file);
  });

  container.querySelectorAll<HTMLButtonElement>("button[data-accept-posting]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Accept this posting? Your current country will be frozen in your tenure history.")) return;
      store.applyCareerPosting(btn.dataset.acceptPosting!);
    });
  });

  container.querySelector("#reset-btn")?.addEventListener("click", () => {
    if (confirm("This will permanently erase your current career. Are you sure?")) {
      store.resetCareer();
    }
  });

  container.querySelector("#checkpoint-create-btn")?.addEventListener("click", () => {
    const input = container.querySelector<HTMLInputElement>("#checkpoint-label");
    store.createCheckpoint(input?.value ?? "");
    if (input) input.value = "";
    renderSettings(container);
  });

  container.querySelectorAll<HTMLButtonElement>("button[data-restore-checkpoint]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Restoring will replace your current career with this checkpoint. Continue?")) return;
      const result = store.restoreCheckpoint(btn.dataset.restoreCheckpoint!);
      if (!result.ok) alert(result.reason ?? "Could not restore that checkpoint.");
    });
  });

  container.querySelectorAll<HTMLButtonElement>("button[data-delete-checkpoint]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this checkpoint? This cannot be undone.")) return;
      store.deleteCheckpoint(btn.dataset.deleteCheckpoint!);
      renderSettings(container);
    });
  });
}
