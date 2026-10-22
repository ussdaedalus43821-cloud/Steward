import type { GrowthStage } from "../types.js";
import { clamp } from "../utils/format.js";

export interface IllustrationInput {
  stage?: GrowthStage;
  population: number;
  infrastructureCondition: number; // 0-100
  maintenanceBacklog: number; // 0-100
  economicHealth: number; // 0-100 (100 = baseline)
  activeCapitalProject: boolean;
  size?: "large" | "small";
}

const DENSITY_BY_STAGE: Record<GrowthStage, number> = {
  hamlet: 2,
  village: 4,
  town: 6,
  small_city: 9,
  city: 12,
  home_rule_city: 16,
};

function densityFor(input: IllustrationInput): number {
  if (input.stage) return DENSITY_BY_STAGE[input.stage];
  const n = Math.round(4 + Math.log10(Math.max(10, input.population)));
  return clamp(n, 3, 14);
}

function conditionColor(condition: number): string {
  const t = clamp(condition, 0, 100) / 100;
  const bad = { r: 133, g: 108, b: 82 };
  const good = { r: 82, g: 116, b: 156 };
  const r = Math.round(bad.r + (good.r - bad.r) * t);
  const g = Math.round(bad.g + (good.g - bad.g) * t);
  const b = Math.round(bad.b + (good.b - bad.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}

export function renderIllustrationSVG(input: IllustrationInput): string {
  const size = input.size ?? "large";
  const width = 300;
  const height = size === "large" ? 168 : 120;
  const groundY = height - 34;
  const rand = seededRand(Math.round(input.population) + (input.stage ? input.stage.length : 0));

  const buildingCount = densityFor(input);
  const fillColor = conditionColor(input.infrastructureCondition);
  const skyOpacity = clamp(input.economicHealth / 100, 0.35, 1.3);

  const parts: string[] = [];
  parts.push(
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${
      skyOpacity > 0.85 ? "#dceaf7" : "#e4e8ee"
    }" />`
  );
  parts.push(`<rect x="0" y="${groundY}" width="${width}" height="${height - groundY}" fill="#7d8a7a" />`);
  parts.push(`<rect x="0" y="${groundY + 8}" width="${width}" height="10" fill="#4b4f55" />`);

  const potholeCount = Math.round(clamp(input.maintenanceBacklog / 14, 0, 8));
  for (let i = 0; i < potholeCount; i++) {
    const px = 10 + rand() * (width - 20);
    const py = groundY + 9 + rand() * 7;
    parts.push(`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="3.4" ry="1.6" fill="#26282c" opacity="0.85" />`);
  }

  const usableWidth = width - 20;
  const slot = usableWidth / buildingCount;
  for (let i = 0; i < buildingCount; i++) {
    const bx = 10 + i * slot + slot * 0.15;
    const bw = slot * 0.62;
    const heightScale = 0.4 + rand() * 0.55 + (i % 3 === 0 ? 0.25 : 0);
    const bh = (groundY - 14) * clamp(heightScale, 0.35, 1.05);
    const by = groundY - bh;
    const sharpness = clamp(input.infrastructureCondition / 100, 0, 1);
    const rx = 3 - sharpness * 2;
    parts.push(
      `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(
        1
      )}" rx="${rx.toFixed(1)}" fill="${fillColor}" stroke="#2c3542" stroke-width="0.6" opacity="0.95" />`
    );
    const windowRows = Math.max(1, Math.floor(bh / 14));
    const windowCols = Math.max(1, Math.floor(bw / 9));
    const litProbability = clamp(input.economicHealth / 130, 0.15, 0.85);
    for (let r = 0; r < windowRows; r++) {
      for (let c = 0; c < windowCols; c++) {
        if (rand() > litProbability * 0.8 + 0.15) continue;
        const wx = bx + 2 + c * (bw / windowCols);
        const wy = by + 3 + r * (bh / windowRows);
        const lit = rand() < litProbability;
        parts.push(
          `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="3" height="4" fill="${
            lit ? "#ffe38a" : "#3a4250"
          }" opacity="0.9" />`
        );
      }
    }
  }

  const lightCount = Math.max(2, Math.round(buildingCount / 2));
  for (let i = 0; i < lightCount; i++) {
    const lx = 14 + (i * (width - 28)) / Math.max(1, lightCount - 1);
    const ly = groundY + 6;
    const glow = clamp(input.economicHealth / 100, 0.3, 1.2);
    parts.push(
      `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="${(1.4 * glow).toFixed(
        1
      )}" fill="#ffd35c" opacity="${clamp(glow, 0.25, 1).toFixed(2)}" />`
    );
  }

  if (input.activeCapitalProject) {
    const cx = width - 34;
    const cy = groundY - 46;
    parts.push(
      `<g stroke="#3a3f47" stroke-width="2" fill="none">
        <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${groundY}" />
        <line x1="${cx}" y1="${cy}" x2="${cx + 26}" y2="${cy + 6}" />
        <line x1="${cx + 20}" y1="${cy + 5}" x2="${cx + 20}" y2="${cy + 20}" />
      </g>
      <circle cx="${cx}" cy="${cy}" r="2.4" fill="#e0a83a" />`
    );
  }

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Jurisdiction illustration">${parts.join(
    ""
  )}</svg>`;
}
