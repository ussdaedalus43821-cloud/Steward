import { store } from "../state/store.js";
import { formatMonth } from "../utils/format.js";
import { TIER_LABELS } from "../sim/constants.js";
import { openModal, closeModal } from "./shared.js";
let promotionModalShown = false;
export function checkPromotionOffer() {
    const offer = store.career.pendingPromotionOffer;
    if (!offer) {
        promotionModalShown = false;
        return;
    }
    if (promotionModalShown)
        return;
    promotionModalShown = true;
    openModal(`<h2>Recruitment Offer</h2>
    <p>${offer.message}</p>
    <p class="field-hint">Accepting will move you to lead a ${TIER_LABELS[offer.toTier]}-level jurisdiction. Your reputation carries forward, but the budget, population, and staff reset to that jurisdiction's actual scale. ${store.career.jurisdiction.name} will be frozen with its final stats on record.</p>
    <div class="modal-actions">
      <button class="btn secondary" id="decline-promotion">Stay Here</button>
      <button class="btn" id="accept-promotion">Accept Promotion</button>
    </div>`, (root) => {
        root.querySelector("#decline-promotion")?.addEventListener("click", () => {
            store.declinePromotion();
            promotionModalShown = false;
            closeModal();
        });
        root.querySelector("#accept-promotion")?.addEventListener("click", () => {
            store.acceptPromotion();
            promotionModalShown = false;
            closeModal();
        });
    });
}
export function renderGameOverOverlay(root) {
    const info = store.career.gameOverInfo;
    if (!info)
        return false;
    root.innerHTML = `
    <div class="hero-screen">
      <div class="hero-card">
        <h1>Tenure Ended</h1>
        <p><strong>${info.jurisdictionName}</strong> (${TIER_LABELS[info.tier]})</p>
        <p>${info.reason}</p>
        ${info.finalStats
        ? `<table>
                <tr><td>Final Score</td><td class="num">${info.finalStats.score.toFixed(0)}</td></tr>
                <tr><td>Final Credit Rating</td><td class="num">${info.finalStats.creditRating}</td></tr>
                <tr><td>Infrastructure Condition</td><td class="num">${info.finalStats.infrastructureCondition.toFixed(0)}</td></tr>
              </table>`
        : ""}
        <p class="field-hint">Reputation: ${store.career.reputation.toFixed(0)} / 100 · Elapsed: ${formatMonth(store.career.clockMonth)}</p>
        <div class="modal-actions">
          <button class="btn" id="next-job-btn">Find Your Next Job</button>
        </div>
      </div>
    </div>
  `;
    root.querySelector("#next-job-btn")?.addEventListener("click", () => {
        store.continueAfterEmergencyManager();
    });
    return true;
}
//# sourceMappingURL=onboarding.js.map