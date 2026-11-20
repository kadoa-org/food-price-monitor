import React, { useEffect, useRef } from 'react';
import { AXIS_INK, BASELINE, Chart, DAY, LABEL_INK, PAPER, RULE, dayLabel, monthTicks, tickLabel, withGaps } from './chartSetup.mjs';
import { thanksgiving } from './thanksgiving.mjs';

// The Thanksgiving insight's chart: the wholesale price of a frozen hen and the advertised price of a frozen whole
// turkey, week by week, with each Thanksgiving marked. Ad weeks that too few stores ran are left out, so the ad line
// shows only the holiday seasons. A wholesale week without trades is bridged when the weeks either side are close;
// a longer stretch without trades breaks the line, like an ad season ending.
export const TURKEY_LINES = [
  { key: 'wholesale', label: 'Wholesale, frozen turkey hen', colour: '#12436d', gapDays: 35 },
  { key: 'ad', label: 'Grocery ads, frozen turkey', colour: '#f46a25', gapDays: 10 },
];

const holidays = (from, to) => {
  const out = [];
  for (let y = new Date(from).getUTCFullYear(); y <= new Date(to).getUTCFullYear(); y++) {
    const t = Date.parse(thanksgiving(y));
    if (t >= from && t <= to + 14 * DAY) out.push(t);
  }
  return out;
};
// A dashed rule at each Thanksgiving, labelled at the top: "Thanksgiving 2025", or on a phone only the year, with the
// key above the chart naming the rule.
const holiday = {
  id: 'holiday',
  beforeDatasetsDraw(chart, _args, opts) {
    const { top, bottom } = chart.chartArea, { ctx } = chart;
    const days = opts.days ?? [];
    ctx.save();
    for (const t of days) {
      const x = chart.scales.x.getPixelForValue(t);
      ctx.strokeStyle = BASELINE; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
      // A label that would run past the chart's right edge ends at the rule instead.
      const text = `${chart.width < 480 ? '' : 'Thanksgiving '}${new Date(t).getUTCFullYear()}`;
      ctx.setLineDash([]); ctx.fillStyle = LABEL_INK; ctx.font = '600 12px sans-serif'; ctx.textBaseline = 'bottom';
      const half = ctx.measureText(text).width / 2;
      ctx.textAlign = x + half > chart.width ? 'right' : 'center';
      ctx.fillText(text, ctx.textAlign === 'right' ? x + 4 : x, top - 4);
    }
    ctx.restore();
  },
};

const price = (v) => (v === 0 ? '$0' : `$${v.toFixed(2)}`);
const short = (v) => (v < 1 ? `${Math.round(v * 100)}¢` : `$${v.toFixed(2)}`);
// Each line's latest price beside its last point, in the line's colour, at every width; the key names the lines.
const lastValues = {
  id: 'lastValues',
  afterDatasetsDraw(chart) {
    const { ctx } = chart; ctx.save();
    ctx.font = '700 13px sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    chart.data.datasets.forEach((d, i) => {
      const j = d.data.findLastIndex((p) => p.y !== null);
      const pt = chart.getDatasetMeta(i).data[j];
      if (!pt) return;
      ctx.fillStyle = d.colour; ctx.fillText(short(d.data[j].y), pt.x + 6, pt.y);
    });
    ctx.restore();
  },
};

export default function TurkeyChart({ weeks, label }) {
  const canvas = useRef(null);
  useEffect(() => {
    if (!canvas.current) return undefined;
    // The axis runs on to a Thanksgiving that is at most two weeks past the last data week, so it is marked.
    const from = Date.parse(weeks[0].date), last = Date.parse(weeks.at(-1).date);
    const days = holidays(from, last), to = Math.max(last, days.at(-1) ?? last);
    const chart = new Chart(canvas.current, {
      type: 'line',
      data: { datasets: TURKEY_LINES.map((line) => ({
        label: line.label, colour: line.colour,
        data: withGaps(weeks.filter((w) => w[line.key] !== null).map((w) => ({ x: Date.parse(w.date), y: w[line.key] })), line.gapDays),
        parsing: false, borderColor: line.colour, borderWidth: 2.5, pointRadius: 2.5, pointHoverRadius: 5, pointHitRadius: 10,
        pointBackgroundColor: line.colour, pointBorderWidth: 0, clip: false,
      })) },
      plugins: [lastValues, holiday],
      options: {
        layout: { padding: { top: 22, right: 44, bottom: 2 } },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: {
            type: 'linear', min: from, max: to,
            border: { color: BASELINE },
            grid: { display: false, drawTicks: false },
            afterBuildTicks: (axis) => { axis.ticks = monthTicks(from, to).map((value) => ({ value })); },
            ticks: { maxRotation: 0, padding: 8, color: AXIS_INK, callback: (v) => tickLabel(v, to - from) },
          },
          y: {
            min: 0, max: 2,
            border: { display: false },
            grid: { color: (c) => (c.tick?.value === 0 ? BASELINE : RULE), drawTicks: false },
            afterBuildTicks: (axis) => { axis.ticks = [0, 0.5, 1, 1.5, 2].map((value) => ({ value })); },
            ticks: { padding: 8, color: AXIS_INK, callback: price },
          },
        },
        plugins: {
          holiday: { days },
          legend: { display: false },
          tooltip: {
            backgroundColor: PAPER, titleColor: LABEL_INK, bodyColor: LABEL_INK,
            borderColor: RULE, borderWidth: 1, cornerRadius: 0, boxPadding: 4,
            padding: 10, titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 },
            filter: (item) => item.parsed.y !== null,
            callbacks: {
              title: (items) => `Week ending ${dayLabel(items[0].parsed.x)}`,
              label: (item) => `${item.dataset.label}: ${price(item.parsed.y)} a pound`,
              labelColor: (item) => ({ borderColor: item.dataset.colour, backgroundColor: item.dataset.colour }),
            },
          },
        },
      },
    });
    return () => chart.destroy();
  });
  return <div className="chart chart--candy"><div className="chart__canvas"><canvas ref={canvas} role="img" aria-label={label} /></div></div>;
}

export function TurkeyLegend() {
  return <div className="chart-legend" aria-hidden="true">{TURKEY_LINES.map((l) => <span className="chart-legend__item" key={l.key}>
    <span className="chart-legend__swatch" style={{ background: l.colour }} />{l.label}
  </span>)}<span className="chart-legend__item"><span className="chart-legend__swatch" style={{ background: 'none', borderTop: '2px dashed #b1b4b6', height: 0 }} />Thanksgiving</span></div>;
}
