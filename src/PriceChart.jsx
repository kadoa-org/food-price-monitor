import React, { useEffect, useRef } from 'react';
import { AXIS_INK, BASELINE, Chart, DAY, INK, LABEL_INK, PAPER, RULE, dayLabel, money, monthTicks, tickLabel, withGaps } from './chartSetup.mjs';
import { dateLabel, gapThreshold, midpoint, priced, quote } from './model.mjs';

// One line: the middle of the day's quoted range, which is the figure every change on the site is measured from.
// A stretch with no quote is simply absent: the line stops and starts again. The note under the chart gives the
// dates, so the plot needs no shading, bracket or label of its own.
// The low and the high are still in the data and appear on hover, but they are not drawn, because a band asks the
// reader to compare two edges at once when the question is simply whether the price went up.
// Prices hold between reports, so the line steps. Stretches with no quote are holes, never bridged.

// Round gridlines inside bounds that fit the data. Snapping the bounds themselves to round numbers is what
// leaves an empty strip above and below the line.
function scale(values, count) {
  const min = Math.min(...values), max = Math.max(...values);
  const raw = Math.max(max - min, max * 0.15) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((n) => n * power).find((n) => n >= raw);
  const pad = (max - min || step) * 0.1;
  return { min: Math.max(0, min - pad), max: max + pad * 0.6, step };
}

export default function PriceChart({ rows, startDate, endDate, unit = '' }) {
  const canvas = useRef(null), chart = useRef(null);
  const list = rows.filter((r) => !r.ambiguous && priced(r));
  const points = list.map((r) => ({ x: Date.parse(r.date), y: midpoint(r), row: r })).filter((p) => typeof p.y === 'number');

  useEffect(() => {
    if (!points.length || !canvas.current) return undefined;
    const from = Date.parse(startDate ?? list[0].date), to = Date.parse(endDate ?? list.at(-1).date);
    const last = points.at(-1).x;
    const span = Math.max(to - from, DAY);
    const narrow = canvas.current.clientWidth < 600;
    const y = scale(points.map((p) => p.y), narrow ? 5 : 6);

    // A stretch with no quote is crossed by a thin grey dotted segment, styled so it cannot be mistaken for the
    // series: no marks along it, a lighter colour and a hairline weight. It only shows where the line resumes.
    const data = withGaps(points, gapThreshold(list));

    chart.current = new Chart(canvas.current, {
      type: 'line',
      data: {
        datasets: [{
          data,
          parsing: false,
          borderColor: INK,
          borderWidth: 2,
          stepped: 'after',
          pointRadius: (c) => (c.raw?.x === last ? 3.5 : 0),
          pointBackgroundColor: INK,
          pointBorderColor: PAPER,
          pointBorderWidth: 1.5,
          pointHoverRadius: 4,
          pointHitRadius: 24,
          // Chart.js clips datasets to the plot area, which slices the marker on the latest quote in half. The
          // layout padding above gives it somewhere to sit.
          clip: false,
          spanGaps: true,
          segment: {
            borderDash: (ctx) => (ctx.p0.skip || ctx.p1.skip ? [2, 4] : undefined),
            borderColor: (ctx) => (ctx.p0.skip || ctx.p1.skip ? BASELINE : undefined),
            borderWidth: (ctx) => (ctx.p0.skip || ctx.p1.skip ? 1 : undefined),
          },
        }],
      },
      options: {
        layout: { padding: { top: 12, right: 20, bottom: 2 } },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: {
            type: 'linear', min: from, max: to,
            border: { color: BASELINE },
            grid: { display: false },
            ticks: {
              autoSkip: false, maxRotation: 0, padding: 6,
              color: AXIS_INK,
              callback: (v) => tickLabel(v, span),
            },
            afterBuildTicks: (axis) => { axis.ticks = monthTicks(from, to, narrow ? 3 : 6).map((value) => ({ value })); },
          },
          y: {
            min: y.min, max: y.max,
            border: { display: false },
            grid: { color: RULE, drawTicks: false },
            // Chart.js starts its ticks at the axis floor, which here is a fitted value like 4.75. The gridlines
            // have to be the round numbers inside the bounds instead.
            afterBuildTicks: (axis) => {
              const ticks = [];
              for (let v = Math.ceil(y.min / y.step) * y.step; v <= y.max + 1e-9; v += y.step) ticks.push({ value: Number(v.toFixed(4)) });
              axis.ticks = ticks;
            },
            ticks: { padding: 8, color: AXIS_INK, callback: (v) => money(v) },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: PAPER, titleColor: LABEL_INK, bodyColor: LABEL_INK,
            borderColor: RULE, borderWidth: 1, cornerRadius: 0, displayColors: false,
            padding: 10, titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 },
            callbacks: {
              title: (items) => dayLabel(items[0].parsed.x),
              // The line is the middle of the range; the range itself and the reporter's note belong in the readout.
              label: (item) => {
                const row = item.raw?.row;
                if (!row) return money(item.parsed.y);
                const lines = [quote(row)];
                if (row.comment) lines.push(row.comment);
                return lines;
              },
            },
          },
        },
      },
    });
    return () => { chart.current?.destroy(); chart.current = null; };
  });

  if (!points.length) return <div className="chart chart--empty">No quotes in this period. Choose a longer period or another product.</div>;
  const shown = points.map((p) => p.y);
  const label = [
    `Price from ${dateLabel(list[0].date)} to ${dateLabel(list.at(-1).date)}, ${unit}.`,
    `Latest ${quote(list.at(-1))}; the middle of the quoted range ran from ${money(Math.min(...shown))} to ${money(Math.max(...shown))} over this period.`,
  ].join(' ');
  return <div className="chart"><div className="chart__canvas"><canvas ref={canvas} role="img" aria-label={label} /></div></div>;
}
