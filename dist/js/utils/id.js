let counter = 0;
export function nextId(prefix) {
    counter += 1;
    return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
//# sourceMappingURL=id.js.map