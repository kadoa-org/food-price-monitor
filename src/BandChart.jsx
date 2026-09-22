import React, { useEffect, useRef } from 'react';
import { BASELINE, Chart, DAY, INK, money, withGaps } from './chartSetup.mjs';
import { dateLabel, midpoint, monthLabel, priced, weekly } from './model.mjs';

// The panel version of the same line: one step per week, no axis, no previous year. Two numbers state this
// panel's own scale, which is what lets six differently priced commodities be compared by shape.
export default function BandChart({ rows, startDate, endDate, name, height = 120 }) {
  const canvas = useRef(null), chart = useRef(null);
  const list = weekly(rows.filter(priced)).filter(priced);
  const points = list.map((r) => ({ x: Date.parse(r.date), y: midpoint(r) })).filter((p) => typeof p.y === 'number');
  const values = points.map((p) => p.y);
  const min = values.length ? Math.min(...values) : 0, max = values.length ? Math.max(...values) : 0;

  useEffect(() => {
    if (!points.length || !canvas.current) return undefined;
    const from = Date.parse(startDate), to = Date.parse(endDate);
    const pad = (max - min || 1) * 0.12;
    const data = withGaps(points, 16);

    chart.current = new Chart(canvas.current, {
      type: 'line',
      data: {
        datasets: [{
          data,
          parsing: false,
          borderColor: INK,
          borderWidth: 1.5,
          stepped: 'before',
          pointRadius: (c) => (c.dataIndex === c.dataset.data.length - 1 ? 2.5 : 0),
          pointBackgroundColor: INK,
          spanGaps: true,
          segment: {
            borderDash: (ctx) => (ctx.p0.skip || ctx.p1.skip ? [2, 3] : undefined),
            borderColor: (ctx) => (ctx.p0.skip || ctx.p1.skip ? BASELINE : undefined),
            borderWidth: (ctx) => (ctx.p0.skip || ctx.p1.skip ? 1 : undefined),
          },
        }],
      },
      options: {
        events: [],
        layout: { padding: { top: 4, bottom: 4 } },
        scales: {
          x: { type: 'linear', min: from, max: to, display: false },
          y: { min: min - pad, max: max + pad, display: false },
        },
        plugins: {
          legend: { display: false }, tooltip: { enabled: false },
        },
      },
    });
    return () => { chart.current?.destroy(); chart.current = null; };
  });

  if (!points.length) return <div className="chart chart--panel chart--empty">No quotes in the past year</div>;
  const label = `Price for ${name} from ${dateLabel(list[0].date)} to ${dateLabel(list.at(-1).date)}, ${money(min)} to ${money(max)} over the period.`;
  return <div className="chart chart--panel" style={{ '--chart-panel-height': `${height}px` }}>
    <div className="chart__canvas"><canvas ref={canvas} role="img" aria-label={label} /></div>
    <span className="chart__scale chart__scale--high">{money(max).replace(/\.00$/, '')}</span>
    <span className="chart__scale chart__scale--low">{money(min).replace(/\.00$/, '')}</span>
    <div className="chart__period" aria-hidden="true"><span>{monthLabel(startDate)}</span><span>{monthLabel(endDate)}</span></div>
  </div>;
}
