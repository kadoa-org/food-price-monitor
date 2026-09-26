import React, { useEffect, useRef } from 'react';
import { AXIS_INK, BASELINE, Chart, DAY, INK, LABEL_INK, MONTHS, PAPER, RULE, dayLabel, money, withGaps } from './chartSetup.mjs';
import { dateLabel, gapThreshold, midpoint, priced, weekly } from './model.mjs';

// The panel version of the same line: one step per week, no axis, no previous year. Two numbers state this
// panel's own scale, which is what lets six differently priced commodities be compared by shape.
// `format` lets the same glance chart show an index level rather than a price; everything else is identical.
// With `base`, the panel plots the percent change from that price instead of the price, and its scale always takes
// in zero, drawn darker, so a reader sees how far a food has moved and in which direction without reading a price
// axis that starts wherever the data happens to.
const GRID = 'rgba(11, 12, 12, 0.06)';

// Every month start inside the window, for the panel's gridlines.
function monthStarts(from, to) {
  const d = new Date(from); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0);
  if (d.getTime() < from) d.setUTCMonth(d.getUTCMonth() + 1);
  const out = [];
  for (; d.getTime() <= to; d.setUTCMonth(d.getUTCMonth() + 1)) out.push(d.getTime());
  return out;
}

const signedPct = (v) => `${v > 0 ? '+' : ''}${Math.abs(v) < 10 && v !== 0 ? v.toFixed(1) : Math.round(v)}%`;

export default function BandChart({ rows, startDate, endDate, name, height = 120, base = null, format: formatPrice = (v) => money(v).replace(/\.00$/, ''), noun = 'Price' }) {
  const canvas = useRef(null), chart = useRef(null);
  const list = weekly(rows.filter(priced)).filter(priced);
  const relative = typeof base === 'number' && base > 0;
  const format = relative ? signedPct : formatPrice;
  const points = list.map((r) => ({ x: Date.parse(r.date), y: midpoint(r), price: midpoint(r) })).filter((p) => typeof p.y === 'number')
    .map((p) => (relative ? { ...p, y: Number(((p.price / base - 1) * 100).toFixed(2)) } : p));
  const values = points.map((p) => p.y);
  const min = values.length ? Math.min(...values, ...(relative ? [0] : [])) : 0, max = values.length ? Math.max(...values, ...(relative ? [0] : [])) : 0;

  useEffect(() => {
    if (!points.length || !canvas.current) return undefined;
    const from = Date.parse(startDate), to = Date.parse(endDate);
    const pad = (max - min || 1) * 0.12;
    const data = withGaps(points, Math.max(16, gapThreshold(list)));

    chart.current = new Chart(canvas.current, {
      type: 'line',
      data: {
        datasets: [{
          data,
          parsing: false,
          borderColor: INK,
          borderWidth: 1.5,
          // A step carries the value of the week that opened it, as on the detail chart; 'before' drew every
          // change one week early.
          stepped: 'after',
          pointRadius: (c) => (c.dataIndex === c.dataset.data.length - 1 ? 2.5 : 0),
          pointHoverRadius: 3.5,
          pointHitRadius: 12,
          pointBackgroundColor: INK,
          clip: false,
          spanGaps: true,
          segment: {
            borderDash: (ctx) => (ctx.p0.skip || ctx.p1.skip ? [2, 3] : undefined),
            borderColor: (ctx) => (ctx.p0.skip || ctx.p1.skip ? BASELINE : undefined),
            borderWidth: (ctx) => (ctx.p0.skip || ctx.p1.skip ? 1 : undefined),
          },
        }],
      },
      options: {
        // A panel reads at a glance, but a reader who wants the price in a given week should not have to open the
        // commodity page to get it.
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        layout: { padding: { top: 4, bottom: 4, right: 4 } },
        scales: {
          // A gridline at every month start, as on the detail chart, so a reader can see at a glance when a price
          // moved (a summer spike, a winter low). Only quarter starts are labelled, which is what fits a panel;
          // January carries the year so the two years in the window can be told apart.
          x: {
            type: 'linear', min: from, max: to,
            // The UKHSA dashboard's small charts: a very faint grid in both directions (about 5 per cent opacity,
            // every line the same weight), month ticks under a baseline, and a few labelled months.
            border: { display: true, color: BASELINE },
            grid: { color: GRID, lineWidth: 1, drawTicks: true, tickLength: 4, tickColor: BASELINE },
            afterBuildTicks: (axis) => { axis.ticks = monthStarts(from, to).map((value) => ({ value })); },
            ticks: {
              autoSkip: false, maxRotation: 0, padding: 2, color: AXIS_INK, font: { size: 11 },
              callback: (value) => { const d = new Date(value); const m = d.getUTCMonth(); return m % 3 ? '' : m === 0 ? String(d.getUTCFullYear()) : MONTHS[m]; },
            },
          },
          // Horizontal grid only; the panel's own high and low labels carry the scale.
          y: {
            min: min - pad, max: max + pad, border: { display: false },
            // In percent the zero line is the reference the whole panel is read against, so it is the one line drawn in the axis grey.
            grid: { color: (c) => (relative && c.tick?.value === 0 ? BASELINE : GRID), drawTicks: false },
            ...(relative ? { afterBuildTicks: (axis) => { axis.ticks = [{ value: 0 }]; } } : {}),
            ticks: { display: false, maxTicksLimit: 4 },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: PAPER, titleColor: LABEL_INK, bodyColor: LABEL_INK, borderColor: RULE, borderWidth: 1,
            cornerRadius: 0, displayColors: false, padding: 8, titleFont: { size: 12, weight: '600' }, bodyFont: { size: 12 },
            // Points are weekly averages, so the title names the week rather than implying a single day's quote.
            callbacks: { title: (items) => `Week of ${dayLabel(items[0].parsed.x)}`, label: (item) => (relative ? `${signedPct(item.parsed.y)} (${formatPrice(item.raw.price)})` : format(item.parsed.y)) },
          },
        },
      },
    });
    return () => { chart.current?.destroy(); chart.current = null; };
  });

  if (!points.length) return <div className="chart chart--panel chart--empty">No quotes in the past year</div>;
  const label = relative ? `Change in the price of ${name} from ${dateLabel(list[0].date)} to ${dateLabel(list.at(-1).date)}, between ${format(min)} and ${format(max)} over the period.` : `${noun} for ${name} from ${dateLabel(list[0].date)} to ${dateLabel(list.at(-1).date)}, ${format(min)} to ${format(max)} over the period.`;
  return <div className="chart chart--panel" style={{ '--chart-panel-height': `${height}px` }}>
    <div className="chart__canvas"><canvas ref={canvas} role="img" aria-label={label} /></div>
    <span className="chart__scale chart__scale--high">{format(max)}</span>
    <span className="chart__scale chart__scale--low">{format(min)}</span>
  </div>;
}
