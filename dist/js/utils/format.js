export function formatMoney(amount) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    if (abs >= 1000000000)
        return `${sign}$${(abs / 1000000000).toFixed(2)}B`;
    if (abs >= 1000000)
        return `${sign}$${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000)
        return `${sign}$${(abs / 1000).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(0)}`;
}
export function formatMoneyFull(amount) {
    return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
export function formatPopulation(pop) {
    return Math.round(pop).toLocaleString("en-US");
}
export function formatPercent(value, digits = 1) {
    return `${value.toFixed(digits)}%`;
}
export function formatMonth(absoluteMonth) {
    const year = Math.floor(absoluteMonth / 12) + 1;
    const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const monthIdx = absoluteMonth % 12;
    return `${monthNames[monthIdx]} Yr${year}`;
}
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
export function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
//# sourceMappingURL=format.js.map