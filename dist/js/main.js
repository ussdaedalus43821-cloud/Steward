import { store } from "./state/store.js";
import { renderHeader } from "./ui/layout.js";
import { renderOverview } from "./ui/tabs/overview.js";
import { renderBudget } from "./ui/tabs/budget.js";
import { renderCapitalProjects } from "./ui/tabs/capitalProjects.js";
import { renderDepartments } from "./ui/tabs/departments.js";
import { renderEconDev } from "./ui/tabs/econDev.js";
import { renderFinancials } from "./ui/tabs/financials.js";
import { renderSettings } from "./ui/tabs/settings.js";
import { checkPromotionOffer, renderGameOverOverlay } from "./ui/onboarding.js";
let activeTab = "overview";
const appRoot = document.getElementById("app");
if (!appRoot) {
    throw new Error("#app root element not found");
}
let headerRoot = null;
let mainRoot = null;
function ensureLayout() {
    if (!headerRoot || !mainRoot || !appRoot.contains(headerRoot)) {
        appRoot.innerHTML = `<div id="header-root"></div><main class="content" id="main-root"></main>`;
        headerRoot = document.getElementById("header-root");
        mainRoot = document.getElementById("main-root");
    }
    return { header: headerRoot, main: mainRoot };
}
function render() {
    if (renderGameOverOverlay(appRoot)) {
        headerRoot = null;
        mainRoot = null;
        return;
    }
    const { header, main } = ensureLayout();
    renderHeader(header, activeTab, (tab) => {
        activeTab = tab;
        render();
    });
    switch (activeTab) {
        case "overview":
            renderOverview(main);
            break;
        case "budget":
            renderBudget(main);
            break;
        case "capital":
            renderCapitalProjects(main);
            break;
        case "departments":
            renderDepartments(main);
            break;
        case "econdev":
            renderEconDev(main);
            break;
        case "financials":
            renderFinancials(main);
            break;
        case "settings":
            renderSettings(main);
            break;
    }
    checkPromotionOffer();
}
store.subscribe(render);
render();
//# sourceMappingURL=main.js.map