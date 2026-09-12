export function mulberry32(seed) {
    let a = seed;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export class Rng {
    constructor(seed) {
        this.next = mulberry32(seed);
    }
    float() {
        return this.next();
    }
    range(min, max) {
        return min + this.next() * (max - min);
    }
    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }
    chance(probability) {
        return this.next() < probability;
    }
    pick(items) {
        return items[this.int(0, items.length - 1)];
    }
}
//# sourceMappingURL=random.js.map