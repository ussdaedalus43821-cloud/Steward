import { store } from "../../state/store.js";
import { formatMoney } from "../../utils/format.js";
import { projectsByStatus } from "../../sim/capitalProjects.js";
import { canIssueGoBond, canIssueRevenueBond } from "../../sim/bonds.js";
import { getTierConfig } from "../../sim/constants.js";
import { openModal, closeModal } from "../shared.js";
const COLUMN_DEFS = [
    { key: "proposed", label: "Proposed" },
    { key: "funded", label: "Funded" },
    { key: "in_progress", label: "In Progress" },
    { key: "complete", label: "Complete" },
    { key: "cancelled", label: "Cancelled / Deferred" },
];
function fundingLabel(source) {
    switch (source) {
        case "pay_as_you_go":
            return "Pay-as-you-go";
        case "go_bond":
            return "GO Bond";
        case "revenue_bond":
            return "Revenue Bond";
        case "grant":
            return "Grant";
    }
}
function renderCard(p) {
    const progressPct = p.status === "in_progress" ? Math.round((p.progressMonths / p.durationMonths) * 100) : 0;
    const overrunNote = p.overrunFactor > 1.02 ? `<div class="field-hint">Cost overrun: +${((p.overrunFactor - 1) * 100).toFixed(0)}%</div>` : "";
    let actions = "";
    if (p.status === "proposed") {
        actions = `<button class="btn small" data-action="fund" data-id="${p.id}">Fund</button>
      <button class="btn small secondary" data-action="cancel" data-id="${p.id}">Cancel</button>`;
    }
    else if (p.status === "funded") {
        actions = `<button class="btn small" data-action="start" data-id="${p.id}">Start Construction</button>
      <button class="btn small secondary" data-action="cancel" data-id="${p.id}">Cancel</button>`;
    }
    else if (p.status === "in_progress") {
        actions = `<div class="progress"><div style="width:${progressPct}%"></div></div><div class="field-hint">${progressPct}% complete</div>`;
    }
    return `<div class="kanban-card">
    <div class="title">${p.name}</div>
    <div class="meta">${p.category} · ${formatMoney(p.actualCost)}</div>
    <div class="meta">${fundingLabel(p.fundingSource)} · ${p.durationMonths}mo</div>
    ${overrunNote}
    <div class="actions">${actions}</div>
  </div>`;
}
export function renderCapitalProjects(container) {
    const j = store.career.jurisdiction;
    const groups = projectsByStatus(j);
    container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <div class="section-title" style="margin:0;">Capital Improvement Plan</div>
      <button class="btn" id="new-project-btn">+ New Project</button>
    </div>
    <div class="kanban">
      ${COLUMN_DEFS.map((col) => `<div class="kanban-col">
          <h4>${col.label} <span>${groups[col.key].length}</span></h4>
          ${groups[col.key].length ? groups[col.key].map(renderCard).join("") : `<div class="kanban-empty">No projects</div>`}
        </div>`).join("")}
    </div>
  `;
    container.querySelector("#new-project-btn")?.addEventListener("click", openNewProjectModal);
    container.querySelectorAll("button[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === "cancel") {
                store.cancelProject(id);
            }
            else if (action === "start") {
                store.startProject(id);
            }
            else if (action === "fund") {
                openFundModal(id);
            }
        });
    });
}
function openNewProjectModal() {
    openModal(`<h2>Propose Capital Project</h2>
    <div class="field-row">
      <label class="field">Project Name</label>
      <input type="text" id="proj-name" placeholder="e.g. Main Street Repaving" />
    </div>
    <div class="field-row">
      <label class="field">Category</label>
      <select id="proj-category">
        <option>Roads & Infrastructure</option>
        <option>Public Safety Facility</option>
        <option>Water & Sewer</option>
        <option>Parks & Recreation</option>
        <option>Administrative Building</option>
      </select>
    </div>
    <div class="field-row">
      <label class="field">Estimated Cost</label>
      <input type="number" id="proj-cost" value="500000" min="10000" step="10000" />
    </div>
    <div class="field-row">
      <label class="field">Duration (months)</label>
      <input type="number" id="proj-duration" value="12" min="1" max="120" />
    </div>
    <div class="modal-actions">
      <button class="btn secondary" id="proj-cancel">Cancel</button>
      <button class="btn" id="proj-submit">Propose</button>
    </div>`, (root) => {
        root.querySelector("#proj-cancel")?.addEventListener("click", closeModal);
        root.querySelector("#proj-submit")?.addEventListener("click", () => {
            const name = root.querySelector("#proj-name").value.trim() || "Unnamed Project";
            const category = root.querySelector("#proj-category").value;
            const cost = Number(root.querySelector("#proj-cost").value) || 100000;
            const duration = Number(root.querySelector("#proj-duration").value) || 12;
            store.proposeProject(name, category, cost, duration);
            closeModal();
        });
    });
}
function openFundModal(projectId) {
    const j = store.career.jurisdiction;
    const tierConfig = getTierConfig(j.tier);
    const project = j.capitalProjects.find((p) => p.id === projectId);
    if (!project)
        return;
    const goAvailable = canIssueGoBond(j, tierConfig.goBondUnlockedAtStage);
    const revAvailable = canIssueRevenueBond(j);
    openModal(`<h2>Fund: ${project.name}</h2>
    <p class="field-hint">Estimated cost: ${formatMoney(project.estimatedCost)}</p>
    <div class="field-row">
      <label class="field">Funding Source</label>
      <select id="fund-source">
        <option value="pay_as_you_go">Pay-as-you-go (from operating budget)</option>
        <option value="go_bond" ${goAvailable ? "" : "disabled"}>General Obligation Bond ${goAvailable ? "" : "(locked)"}</option>
        <option value="revenue_bond" ${revAvailable ? "" : "disabled"}>Revenue Bond ${revAvailable ? "" : "(requires home rule)"}</option>
        <option value="grant">Grant from tier above (limited pool: ${formatMoney(j.grantPoolRemaining)})</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn secondary" id="fund-cancel">Cancel</button>
      <button class="btn" id="fund-submit">Confirm Funding</button>
    </div>`, (root) => {
        root.querySelector("#fund-cancel")?.addEventListener("click", closeModal);
        root.querySelector("#fund-submit")?.addEventListener("click", () => {
            const source = root.querySelector("#fund-source").value;
            const result = store.fundProject(projectId, source);
            if (!result.ok) {
                alert(result.reason ?? "Could not fund project.");
                return;
            }
            closeModal();
        });
    });
}
//# sourceMappingURL=capitalProjects.js.map