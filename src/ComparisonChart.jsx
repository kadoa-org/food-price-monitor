import React, { useEffect, useRef } from 'react';
import { AXIS_INK, BASELINE, Chart, DAY, INK, LABEL_INK, PAPER, RULE, money, monthTicks, tickLabel, withGaps } from './chartSetup.mjs';
import { monthLabel } from './model.mjs';

// Two prices for the same food on one scale: what wholesalers were paid and what shoppers paid, a monthly average
// each. Wholesale takes the site's series blue; store prices the Analysis Function orange, its colour-blind-safe
// partner. A single month one source did not publish is bridged with a dotted line through the average of the
// months either side, marked as an estimate in the tooltip; a longer stretch stays a hole.
export const COMPARISON_COLOURS = { wholesale: INK, store: '#f46a25' };

const time = (month) => Date.parse(`${month}-15`);
const shift = (month, k) => { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + k); return d.toISOString().slice(0, 7); };
function withEstimates(list) {
  const out = [];
  list.forEach(([m, v], i) => {
    const prev = list[i - 1];
    if (prev && shift(prev[0], 2) === m) out.push({ x: time(shift(m, -1)), y: Number(((prev[1] + v) / 2).toFixed(3)), month: shift(m, -1), estimated: true });
    out.push({ x: time(m), y: v, month: m });
  });
  return out;
}

export default function ComparisonChart({ store, wholesale, unit }) {
  const canvas = useRef(null), chart = useRef(null);
  useEffect(() => {
    if (!canvas.current || !store.length || !wholesale.length) return undefined;
    const from = Math.min(time(store[0][0]), time(wholesale[0][0])), to = Math.max(time(store.at(-1)[0]), time(wholesale.at(-1)[0]));
    const span = to - from;
    // The canvas has no size yet on first paint; its container does.
    const narrow = (canvas.current.parentElement?.clientWidth || window.innerWidth) < 600;
    const points = (list) => withGaps(withEstimates(list), 45);
    const top = Math.max(...store.map(([, v]) => v), ...wholesale.map(([, v]) => v));
    const step = top > 6 ? 2 : 1;
    const max = Math.ceil((top * 1.05) / step) * step;
    const line = (key, data, order) => ({ key, order, data, parsing: false, borderColor: COMPARISON_COLOURS[key], borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, pointHitRadius: 18, pointBackgroundColor: COMPARISON_COLOURS[key], clip: false, segment: { borderDash: (ctx) => (ctx.p0.raw?.estimated || ctx.p1.raw?.estimated ? [3, 4] : undefined) } });
    chart.current = new Chart(canvas.current, {
      type: 'line',
      data: { datasets: [line('store', points(store), 1), line('wholesale', points(wholesale), 2)] },
      options: {
        layout: { padding: { top: 12, right: 20, bottom: 2 } },
        interaction: { mode: 'index', axis: 'x', intersect: false },
        scales: {
          x: {
            type: 'linear', min: from, max: to,
            border: { color: BASELINE },
            grid: { color: RULE, drawTicks: false },
            ticks: { autoSkip: false, maxRotation: 0, padding: 8, color: AXIS_INK, callback: (v) => tickLabel(v, span) },
            // On a phone every other year, or the labels run into each other.
            afterBuildTicks: (axis) => { axis.ticks = monthTicks(from, to, narrow ? 3 : 8).filter((_, i) => !narrow || i % 2 === 0).map((value) => ({ value })); },
          },
          y: {
            min: 0, max,
            border: { display: false },
            grid: { color: RULE, drawTicks: false },
            afterBuildTicks: (axis) => { axis.ticks = Array.from({ length: max / step + 1 }, (_, i) => ({ value: i * step })); },
            title: { display: true, text: `Price, ${unit}`, color: AXIS_INK, font: { size: 14 } },
            ticks: { padding: 8, color: AXIS_INK, callback: (v) => money(v) },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: PAPER, titleColor: LABEL_INK, bodyColor: LABEL_INK,
            borderColor: RULE, borderWidth: 1, cornerRadius: 0, boxPadding: 4,
            padding: 10, titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 },
            itemSort: (a, b) => a.dataset.order - b.dataset.order,
            filter: (item) => item.raw?.y !== null,
            callbacks: {
              title: (items) => monthLabel(items[0].raw.month ?? new Date(items[0].parsed.x).toISOString().slice(0, 7)),
              label: (item) => `${item.dataset.key === 'store' ? 'Store' : 'Wholesale'}: ${money(item.parsed.y)}${item.raw?.estimated ? ' (estimated, not published)' : ''}`,
              labelColor: (item) => ({ borderColor: COMPARISON_COLOURS[item.dataset.key], backgroundColor: COMPARISON_COLOURS[item.dataset.key] }),
            },
          },
        },
      },
    });
    return () => { chart.current?.destroy(); chart.current = null; };
  });
  if (!store.length || !wholesale.length) return <div className="chart chart--empty">No prices to compare.</div>;
  const latest = (list) => list.at(-1);
  const label = `Store and wholesale prices, ${unit}, ${monthLabel(store[0][0])} to ${monthLabel(latest(store)[0])}. Latest store price ${money(latest(store)[1])} in ${monthLabel(latest(store)[0])}; latest wholesale price ${money(latest(wholesale)[1])} in ${monthLabel(latest(wholesale)[0])}.`;
  return <div className="chart"><div className="chart__canvas"><canvas ref={canvas} role="img" aria-label={label} /></div></div>;
}
