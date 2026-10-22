import { openModal, closeModal } from "./shared.js";

const WELCOME_SEEN_KEY = "steward_seen_welcome_v1";

function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch {
    // Storage blocked (private browsing, etc.) -- fail open rather than ever blocking the game.
    return true;
  }
}

function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch {
    // Nothing to do if storage is unavailable -- the game still works, it'll just offer the
    // welcome screen again next launch.
  }
}

// A condensed version of README.md's player manual -- full detail lives there and in the
// Settings tab itself; this is meant to be read once before the first career and skimmed
// again on demand, not to replace the manual.
const MANUAL_HTML = `
  <h2>Welcome, Administrator</h2>
  <p>You're a <strong>career public administrator</strong> -- not a politician. No speeches, no campaigns. You balance budgets, fund departments, issue bonds, and keep the books honest. You're judged on whether the place is better run when you leave than when you arrived.</p>

  <h3>The Ladder</h3>
  <p><strong>Municipality &rarr; County &rarr; State &rarr; Country.</strong> A municipality also grows through six stages on its own (Hamlet up to Home-Rule City) as its population rises, each unlocking new departments and tools. Promotion between tiers isn't applied for -- hold a strong scorecard for three straight years with no fiscal oversight hanging over you, and an offer comes to you.</p>

  <h3>The One Rule That Matters Most</h3>
  <p>Your <strong>fund balance ratio</strong> (reserve &divide; last year's expenditures) drives almost everything: your credit rating, whether fiscal oversight starts tightening, and your annual scorecard. The real-world benchmark is about <strong>two months of expenditures in reserve</strong>. Spend less than you take in and keep a real cushion -- most of the rest of the game follows from that.</p>

  <h3>The Vitals</h3>
  <ul>
    <li><strong>Infrastructure Condition</strong> -- decays on its own; only well-funded Public Works (or its equivalent) offsets it.</li>
    <li><strong>Maintenance Backlog</strong> -- the inverse; the number residents actually complain about.</li>
    <li><strong>Economic Health</strong> -- scales nearly every tax revenue source you have. A weak economy is a real monthly shortfall, not just a bad vibe.</li>
    <li><strong>Tax Competitiveness Index</strong> -- 100 = average. Too high cools growth, too low under-collects. A real trade-off, not a number to max out.</li>
  </ul>

  <h3>Departments</h3>
  <p>Every department produces a <strong>Service Quality</strong> score (0-100) with strict diminishing returns -- the first dollar per capita buys a lot, every dollar after buys less. Spending is per capita, so budgets have to scale with population, and larger jurisdictions get some built-in relief as they grow.</p>

  <h3>Advanced Systems (unlock as you grow)</h3>
  <p><strong>Enterprise Funds</strong> (Water &amp; Sewer, self-funding, priced by your own fee slider) &middot; <strong>Bonds</strong> (debt priced by your credit rating) &middot; <strong>Pensions</strong> (fund the ARC or watch the unfunded liability grow quietly) &middot; <strong>Economic Development incentives</strong> (you set the cost, the market determines the return).</p>

  <h3>Quick Tour</h3>
  <p><strong>Overview</strong> is home base &middot; <strong>Budget</strong> sets tax rates &middot; <strong>Capital Projects</strong> is your project kanban board &middot; <strong>Departments</strong> is where allocations happen &middot; <strong>Economic Development</strong> tracks growth &middot; <strong>Financials</strong> is the deep end -- full balance check and credit rating breakdown &middot; <strong>Settings</strong> holds your career record, save management, and checkpoints.</p>

  <p class="field-hint">The full manual is always in this repository's README, and you can reopen this screen any time from Settings.</p>
`;

export function showWelcomeIfNeeded(): void {
  if (hasSeenWelcome()) return;
  openModal(
    `${MANUAL_HTML}
    <div class="modal-actions">
      <button class="btn" id="start-career-btn">Start My Career &rarr;</button>
    </div>`,
    (root) => {
      root.querySelector("#start-career-btn")?.addEventListener("click", () => {
        markWelcomeSeen();
        closeModal();
      });
    }
  );
}

/** Re-opens the same manual on demand (e.g. a "How to Play" button in Settings), without
 * touching the first-launch flag. */
export function showManual(): void {
  openModal(
    `${MANUAL_HTML}
    <div class="modal-actions">
      <button class="btn" id="close-manual-btn">Close</button>
    </div>`,
    (root) => {
      root.querySelector("#close-manual-btn")?.addEventListener("click", () => closeModal());
    }
  );
}
