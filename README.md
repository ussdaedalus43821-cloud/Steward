# Steward

**Steward** is a browser-based career simulation about running the *finances* of a government — not campaigning for one. You never give a speech, never run an ad, never debate an opponent. You balance budgets, fund departments, issue bonds, and keep the books honest, starting as a hamlet's first administrator and, if you're good enough, working your way up to running an entire country.

Play it live, or read on for the full manual below.

---

## A Letter to the New Administrator

Welcome aboard.

You're inheriting a small jurisdiction with a small budget, and nobody is going to tell you how to run it. That's the job. Every number on every screen is something you can change, and every number has a consequence — sometimes next month, sometimes three years from now when a bond comes due or a pension bill arrives that you quietly underfunded back when it was convenient to.

This manual won't tell you how to win. There isn't a fixed way to win. It will tell you how the machine actually works, so that when something goes wrong — and it will — you understand *why*, instead of just watching a number turn red.

Good luck. Try not to get an emergency manager installed on your first week.

— *The Office of the City Manager*

---

## 1. The Premise

You are a **career public administrator** — a city manager, a county administrator, a budget director, eventually a head of government — hired to run the *operations* of a jurisdiction. You don't legislate, you don't campaign, and you don't set policy in the abstract. You set tax rates, allocate department budgets, fund capital projects, and manage debt and pensions, and you're judged entirely on whether the place is better run when you leave than when you arrived.

### The Core Loop

Every jurisdiction, at every scale, runs on the same fundamental question: **does what you bring in cover what you spend?** You'll answer that question every single month, automatically, whether you're paying attention or not.

### The Career Ladder

There are four tiers, and you climb them in order — there's no skipping ahead:

| Tier | What you run | Starts as |
|---|---|---|
| **Municipality** | A single city, from a tiny unincorporated hamlet up to a home-rule city | Hamlet Administrator |
| **County** | Several municipalities, simulated underneath you | County Administrator |
| **State** | Several counties | State Budget Director |
| **Country** | Several states — the top of the ladder | National Budget Director |

Within the **municipality** tier specifically, your jurisdiction also grows through six **growth stages** as its population rises — each one unlocks new departments, new revenue tools, and a new job title:

| Stage | Population | Job Title |
|---|---|---|
| Unincorporated Hamlet | 0 – 500 | Hamlet Administrator |
| Village | 500 – 2,500 | Village Administrator |
| Town | 2,500 – 10,000 | Town Manager |
| Small City | 10,000 – 50,000 | City Manager |
| City | 50,000 – 150,000 | City Manager |
| Home-Rule City | 150,000+ | City Manager (Home Rule) |

Growth to the next stage isn't automatic — once your population genuinely qualifies, you **petition to reclassify**, which triggers a referendum three months later. It isn't guaranteed to pass: the vote responds to your average service quality and your fund balance health. Run things well and it's a formality; run things into the ground and your own residents will vote you down.

**Promotion between tiers** works differently and isn't something you apply for — it's offered to you. Hold a strong scorecard (financial health, growth, and service quality, all blended into a single annual score) for three straight years, with no active fiscal oversight hanging over you, and a recruitment offer for the next tier up will show up on its own. Accept it, and your current jurisdiction is frozen in your tenure record while you start fresh at the bigger scale — new budget, new population, same reputation carried forward.

---

## 2. Core Mechanics: The Budget

Everything in Steward runs through one number: the **General Fund**.

- **Revenue** flows in every month from whatever tax tools your tier has available — property tax, sales tax, income tax, business license fees, intergovernmental transfers from the tier above you, and more as you grow.
- **Expenditures** flow out every month — department budgets, debt service on any bonds you've issued, pension contributions, and economic development incentives.
- The difference between the two, accumulated over time, is your **fund balance** — the actual cash reserve sitting in your General Fund.

### Why the Fund Balance Is the Whole Game

Nearly every consequential system in Steward reads from one derived number: your **fund balance ratio** — fund balance divided by last year's expenditures. It's the standard public-finance measure of how many months of operations you could survive on reserves alone, and it drives:

- **Your credit rating**, which sets the interest rate on every bond you issue from here on.
- **Fiscal oversight**, a four-stage escalation (`normal → warning → oversight → emergency`) that gets harder to operate under at every level, and that — left unaddressed for six straight months at the worst stage — ends your tenure entirely, with a real reputation penalty attached.
- **Your annual scorecard**, which is the thing a promotion offer is actually waiting on.

The professional benchmark the sim holds you to is the same one real municipal finance officers use: **roughly two months of operating expenditures in reserve** is considered healthy. Run meaningfully below that and oversight starts tightening. Run comfortably above it and your credit rating climbs.

**Spend less than you take in, keep a real cushion, and most of the rest of the game takes care of itself. Spend more than you take in for multiple years running, and no amount of clever department tuning will save you.**

---

## 3. The Vitals

Four numbers describe the underlying condition of your jurisdiction, separate from its cash balance. They move slowly, they compound, and they feed back into your revenue and growth in ways that aren't always obvious from the budget screen alone.

- **Infrastructure Condition (0–100)** — the physical state of roads, buildings, and utilities. It decays a little every month on its own; the only thing that offsets that decay is a well-funded Public Works-equivalent department (or, at the higher tiers, National Infrastructure / State Highways). Let it fall far enough and it drags down your annual scorecard directly.
- **Maintenance Backlog (0–100)** — the inverse of infrastructure condition, shown as its own figure because it's the one residents (and auditors) actually complain about. The worse your infrastructure gets, the bigger this grows.
- **Economic Health (0–100, though it can run higher or lower)** — a composite measure of how strong your local economy is right now. It moves toward a target set by your service quality, infrastructure condition, and the broader economic cycle, and it directly scales **almost every tax revenue source you have** — property, sales, income, business fees, all of it. A struggling economy doesn't just feel bad, it shows up as a real revenue shortfall every single month.
- **Tax Competitiveness Index (100 = average)** — how your effective tax burden compares to a typical jurisdiction at your tier. Push rates high above 100 and you'll cool population growth as people and businesses look elsewhere; keep them well below 100 and you'll accelerate growth, at the obvious cost of collecting less revenue per resident. There is no "correct" number here — it's a real trade-off you choose.

---

## 4. Departments & Staffing

Every department you fund produces a **Service Quality** score (0–100), and that score follows a strict **diminishing-returns** curve: the first dollar of per-capita spending buys a lot of quality, and every dollar after that buys progressively less. There's no such thing as a department you can simply pour infinite money into for infinite results — at some point you're better off funding something else entirely.

A few things to know about how this actually plays out:

- **Spending is per capita.** The same dollar amount funds a hamlet's department beautifully and barely registers for a sprawling state — budgets have to scale with population, not stay fixed.
- **Larger jurisdictions get a break.** Per-capita department costs ease somewhat as your population grows, reflecting real economies of scale in local government overhead — and for General Administration specifically, completing Administrative Building capital projects permanently trims its baseline cost further.
- **Staffing is implied by funding**, not a separate lever — more budget supports more staff, and both roll up into the same service quality number.
- **Departments unlock progressively.** A brand-new hamlet only has General Administration. Public Works and Public Safety arrive once you reach Town. Economic Development opens at Small City. Planning & Zoning and Social Services open at City. Every tier above municipality has its own fixed department set suited to that scale — a county runs County Roads, Courts & Jails, Public Health, and Regional Social Services; a state runs K-12 Education, State Highways, a Medicaid-style health program, and Unemployment Insurance; a country runs Entitlement Programs, National Infrastructure, Transfers to States, and General Government.
- **Automatic relief exists, and it's free.** A separate operating grant pool (state/federal operating aid, modeled realistically) quietly offsets a slice of department costs every year without you lifting a finger — it's not a lever you control, just a cushion that's there.

---

## 5. Advanced Systems

A handful of systems only show up once you're established enough to need them. Briefly, what each one actually does:

- **Enterprise Funds (Water & Sewer).** Once a municipality reaches Town stage, you're running a self-funding utility, separate from your General Fund, priced by a fee-rate slider you control. Run it at a surplus and it keeps its own reserve *and* sends a share of that profit back to your General Fund as a real, modeled payment-in-lieu-of-taxes — the same arrangement real municipal utilities use. Run it into a deficit and your General Fund automatically covers the shortfall, which shows up as real spending on your own books.
- **Bonds.** Need to fund a big capital project without draining cash on hand? Issue debt. The interest rate you're offered is set entirely by your current credit rating — the better your fiscal health, the cheaper your borrowing. General obligation bonds are available broadly; revenue bonds are a more advanced tool that only opens up once a municipality reaches Home-Rule City.
- **Pensions.** States and countries carry a pension system for their workforce: an actuarial liability, a pool of invested assets, and an **Annual Required Contribution (ARC)** you can choose to fund fully, partially, or not at all. Pay less than the ARC and the unfunded liability grows — quietly, for years, until it's a real problem on your balance sheet and a drag on your credit rating.
- **Economic Development Incentive Programs.** You can propose an incentive program — you set its name, its annual cost, and how long it runs. The growth boost it actually delivers isn't something you dial in yourself; it's computed from what you're spending per capita, on the same diminishing-returns logic as department funding, capped at a modest maximum. A small program for cheap is efficient; a wildly expensive one buys you noticeably less growth per dollar.

---

## 6. UI/UX Guide — Where to Find Things

- **The Top Bar** is always visible and is your at-a-glance dashboard: population, fund balance, credit rating, oversight status, reputation, and the in-game clock, plus the speed controls (Pause / 1x / 4x / 15x — spacebar also toggles pause).
- **Overview** is your home screen: your jurisdiction's current snapshot, and — once you're running a tier with sub-jurisdictions underneath you — a drill-down view of every county, state, or municipality in your portfolio, complete with its own credit rating and a Federal Grant tool for bailing out anyone in real fiscal distress.
- **Budget** is where your tax rates live — property, sales, income, business license fees, and utility fees, depending on what your tier taxes.
- **Capital Projects** is a kanban board for proposing, funding (pay-as-you-go, bonds, or grants), and tracking infrastructure projects from proposal to completion.
- **Departments** is where you set each department's annual allocation and watch its service quality respond, alongside your enterprise funds and pension system if you have them.
- **Economic Development** shows your growth trend over time and lets you manage incentive programs.
- **Financials** is the deep end: a full government-wide balance check, a ratio analysis benchmarked against real public-finance standards, a full statement of revenues and expenditures, and a line-by-line breakdown of exactly how your credit rating is calculated.
- **Settings** holds your career record (reputation, tenure history across every past jurisdiction), save management (autosave is automatic, but export a backup file periodically — browser storage isn't shared across devices and isn't reliably permanent on iOS Safari for a large save), checkpoints (snapshot your current state so you can undo a mistake without restarting), and — once you've maxed out the career ladder — any Career Opportunities available to you.

---

## For Developers

Steward is dependency-free TypeScript + DOM — no framework, no bundler, no build tooling beyond `tsc`.

```bash
npm run build   # compile src/ to dist/js/ via tsc
npm run serve   # serve the static site locally
npm start       # build, then serve
```

Open `index.html` (served, not `file://`) and you're running the game. Browser console testing helpers are available via `window.steward` — run `steward.help()` once the game has loaded for the full list.
