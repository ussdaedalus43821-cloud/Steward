export interface ChartSeries {
  label: string;
  color: string;
  values: number[];
}

export function lineChart(series: ChartSeries[], width = 560, height = 200): string {
  const padding = { top: 10, right: 10, bottom: 20, left: 46 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.values);
  const maxV = allValues.length ? Math.max(...allValues, 0) : 1;
  const minV = allValues.length ? Math.min(...allValues, 0) : 0;
  const range = maxV - minV || 1;
  const n = Math.max(...series.map((s) => s.values.length), 2);

  const x = (i: number) => padding.left + (i / (n - 1)) * innerW;
  const y = (v: number) => padding.top + innerH - ((v - minV) / range) * innerH;

  const parts: string[] = [];
  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="none" />`);

  const zeroY = y(0);
  parts.push(
    `<line x1="${padding.left}" y1="${zeroY.toFixed(1)}" x2="${width - padding.right}" y2="${zeroY.toFixed(
      1
    )}" stroke="#c8d0dc" stroke-width="1" stroke-dasharray="3,3" />`
  );

  for (const s of series) {
    if (s.values.length === 0) continue;
    const points = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    parts.push(`<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="2.2" />`);
    for (let i = 0; i < s.values.length; i++) {
      parts.push(`<circle cx="${x(i).toFixed(1)}" cy="${y(s.values[i]).toFixed(1)}" r="2.4" fill="${s.color}" />`);
    }
  }

  parts.push(
    `<text x="${padding.left - 6}" y="${padding.top + 4}" font-size="9" fill="#8a97aa" text-anchor="end">${formatAxis(
      maxV
    )}</text>`
  );
  parts.push(
    `<text x="${padding.left - 6}" y="${(padding.top + innerH).toFixed(0)}" font-size="9" fill="#8a97aa" text-anchor="end">${formatAxis(
      minV
    )}</text>`
  );

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
}

function formatAxis(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

export function legendHtml(series: ChartSeries[]): string {
  return `<div class="legend">${series
    .map((s) => `<span><span class="dot" style="background:${s.color}"></span>${s.label}</span>`)
    .join("")}</div>`;
}
