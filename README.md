# Steward

A browser-based simulation game about running government finances as a career
public administrator — not a politician. You're hired, not elected: a town/city
manager, then a county administrator, a state budget director, and eventually a
national budget director. You advance by building a track record of sound
fiscal management, not by winning campaigns.

Single-page, no backend, autosaves to `localStorage`.

## Running it

The compiled app is checked in under `dist/js/`, so you can serve the repo root
with any static file server and open it:

```
npx serve .          # or: npx http-server .
# then open the printed URL, e.g. http://localhost:3000
```

Opening `index.html` directly via `file://` will not work — browsers block ES
module imports from the filesystem. Any static server is enough; nothing here
needs a real backend.

### Rebuilding from source

The app is plain TypeScript compiled straight to ES modules — no bundler, no
framework, no `node_modules`. If you change anything in `src/`:

```
npm run build   # tsc -p tsconfig.json -> dist/js/
```

That's the whole build. `npm run watch` recompiles on save.

**Why no framework?** This was built in a sandboxed environment with no
outbound access to the npm registry, so React/Vite/Tailwind/etc. could not be
installed *or verified*. Rather than hand you an unbuildable `package.json`
full of dependencies nobody in this session could actually install and test,
the whole thing is dependency-free TypeScript + DOM, compiled with a global
`tsc` and verified end-to-end with Playwright. If you'd rather have this on
React (to match the house style of your other simulation game), that's a
reasonable follow-up rewrite of the `src/ui/` layer — the simulation engine in
`src/sim/` has no UI dependencies and would carry over untouched.

## Two decisions worth flagging (not silently made)

**1. Town and City are one continuous first job, not two separate ones.**
The spec's own numbered list — hamlet → village → town → small city → city →
home-rule city — has contiguous population ranges, and the pitch's own summary
sentence only names *"a county, then a state, then a national role"* as the
recruitment jumps. So this build treats "Municipality" as a single tenure that
grows through all six named stages (with real, staged authority unlocks —
property tax, sales tax, departments splitting out, bond market access, home
rule), and reserves the "new jurisdiction, reset budget, reputation carries
forward" promotion mechanic for the three real tier changes: home-rule city →
County → State → Country. If the intent was actually for Town→City to *also*
be a full reset-and-recruit jump, that's a straightforward change to
`src/sim/career.ts` and `src/sim/newGame.ts`.

**2. The national tier reuses the same fund-balance/credit-rating framework.**
A currency-issuing national government doesn't face insolvency the way a city
does — its real risks are inflation and confidence crises, not running out of
cash. Modeling that properly would mean different mechanics entirely (an
inflation gauge, bond-market confidence, currency stability) rather than a
fund balance and credit rating. For this version, the same framework is kept
across all five tiers for consistency and to stay within scope, and that
tradeoff is surfaced in-app (Financials tab, Country tier) rather than assumed
silently. Worth deciding deliberately if you want the sovereign tier to feel
mechanically distinct.

Also flagged per the original spec's own instruction, not built: analogous
named growth sub-stages for County/State/Country. The spec asked for this only
at Town/City; it's a plausible future addition but out of scope here.

## What's actually implemented

**Fiscal engine** (`src/sim/`) — real fund-accounting structure, not a single
cash number:
- General Fund with modified-accrual cash flow (`fiscal.ts`); revenue −
  expenditures = Δfund balance is enforced as a hard runtime invariant every
  month (throws if violated).
- A second, independent full-accrual ledger (capital assets net of
  depreciation, bonds payable, net pension liability, tracked net position)
  reconciled every month against the cash ledger. The Financials tab's
  "Government-Wide Balance Check" (Assets = Liabilities + Net Position) is a
  real check computed two different ways from the same underlying
  transactions — like the A = L + E check in the author's other simulation
  game — not a tautology.
- Capital Fund / CIP (`capitalProjects.ts`): Proposed → Funded → In Progress →
  Complete/Cancelled state machine with real lead times, monthly cash draw,
  and random cost-overrun risk. This is the exact data model the Capital
  Projects kanban board renders.
- Enterprise Funds (water/sewer, unlocked at the Town stage): meant to run on
  their own fee revenue; if one runs a deficit it's visibly propped up by the
  General Fund and that subsidy is tracked and shown as a red flag, rather
  than silently netted away.
- Municipal debt: GO bonds (small-city stage+) and revenue bonds (home-rule
  only), both amortized with real level-payment schedules, interest rate set
  by current credit rating.
- Credit rating (AAA → D) computed from fund balance ratio, debt/revenue,
  revenue growth trend, and (state tier+) pension funded ratio — and that
  rating actually sets the interest rate on new borrowing.
- Pension system (state tier and up): actuarial liability, funded ratio, ARC
  vs. actual contribution, with underfunding compounding the unfunded
  liability and dragging the credit rating over time.
- Real failure escalation: Normal → Warning → State Oversight → Emergency
  Manager, driven by the GFOA ~15–17% fund-balance benchmark, sustained
  deficits, and missed debt service — with hysteresis (recovery takes
  sustained good years, not one good year). Emergency management ends your
  tenure at that jurisdiction (frozen with final stats) and you move on to a
  new appointment, carrying a reputation hit.

**Growth & career** — population/tax-base growth responds to service quality,
infrastructure condition, tax competitiveness vs. comparable jurisdictions,
and economic-development incentives (tax abatements: near-term revenue traded
for long-run growth). Crossing a population threshold makes a Town/City stage
*eligible*, not automatic — the player must petition, triggering a simulated
referendum. Sustained strong performance (3 years, all metrics healthy)
triggers a recruitment offer to the next tier; accepting freezes the old
jurisdiction with final stats and starts fresh at the new scale, carrying only
reputation forward.

**County/State/Country** oversee generated sub-jurisdictions rather than
running services directly. Direct children are simulated every year with a
lightweight model (not the full engine); deeper descendants are generated
lazily on first drill-down and cached, which keeps a Country-tier drill-down
(states → counties → municipalities) cheap even though the full tree could be
huge.

**UI** — tabbed dashboard (Overview, Budget, Capital Projects, Departments,
Economic Development, Financials, Settings):
- **Overview**: one component that's a low-fidelity reactive illustration
  (potholes scale with maintenance backlog, a crane appears during an active
  capital project, building color/sharpness tracks infrastructure condition,
  window lighting tracks economic health, and scene density scales with the
  hamlet→village→town→city progression) *and*, at County tier and up, the
  same component becomes a hierarchical drill-down — a cluster of illustrated
  sub-jurisdiction nodes, each rendered with the same logic, clickable down to
  a detail view, recursively. Grouped ("+N more") past ~11 visible nodes so
  it stays cheap to render at Country scale.
- **Capital Projects**: kanban board is the primary layout, wired directly to
  the CIP state machine (moving columns = real state transitions, not
  cosmetic).
- Budget / Departments / Economic Development / Financials / Settings are
  conventional tabs per the spec.

## Known simplifications

- Numeric tuning (tax bases, department costs, growth sensitivity) is a
  reasonable first pass, not calibrated against real municipal budget data.
  Expect to want to retune constants in `src/sim/constants.ts`,
  `src/sim/departments.ts`, and `src/sim/fiscal.ts`.
- Sub-jurisdictions are a simplified random-walk simulation, not full copies
  of the player's own engine — deliberate, per the spec's scaling/performance
  requirement.
- No automated test suite is included; correctness was verified by direct
  Playwright-driven runtime testing (tab-by-tab smoke tests, a full capital
  project lifecycle, and repeated balance-check reads across construction,
  monthly ticks, and a fiscal year close) during development, plus the
  in-game invariant assertions described above.
