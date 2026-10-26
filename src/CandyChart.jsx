import React, { useEffect, useRef } from 'react';
import { AXIS_INK, BASELINE, Chart, DAY, INK, LABEL_INK, PAPER, RULE, endLabelRoom, endLabels, monthTicks, tickLabel, withGaps, yearTicks } from './chartSetup.mjs';
import { monthLabel } from './model.mjs';
import { pctScale } from './StaplesChart';

// Candy takes the orange, the site's second series colour; pay the series blue; all prices the
// dashed grey every inflation line on the site uses.
export const CANDY_COLOURS = { candy: '#f46a25', wages: INK, all: '#505a5f' };
const signedPct = (v) => `${v > 0 ? '+' : ''}${Math.round(v)}%`;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (ym) => MONTH_NAMES[Number(ym.slice(5, 7)) - 1];
const onePlace = (v) => `${v > 0 ? '+' : v < 0 ? '\u2212' : ''}${Math.abs(v).toFixed(1)}%`;
const time = (ym) => Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1);

// Percent change since a common month, one line per series. `lines` is [{ key, label, points: [[month, pct|null]] }],
// with an optional `colour` and `dashed` for lines outside the candy palette. `value` formats ticks and the tooltip and
// `steps` the gridline steps, so the same chart can show prices in dollars or cents instead of percent changes.
// BLS skipped October 2025 in the federal shutdown; a single missing month is joined straight across, as the note
// under the chart says, and a longer stretch breaks the line.
export function CandyLines({ lines, label, value = signedPct, steps = [1, 2, 5, 10, 20, 50, 100] }) {
  const canvas = useRef(null);
  useEffect(() => {
    if (!canvas.current) return undefined;
    const months = lines.flatMap((l) => l.points.filter((p) => p[1] !== null).map((p) => p[0])).sort();
    const from = time(months[0]), to = time(months.at(-1)), short = to - from < 3 * 365 * DAY;
    // Whole-percent steps down to 1%, so the past year's single-digit changes get gridlines too.
    const scale = pctScale(lines.flatMap((l) => l.points.map((p) => p[1]).filter((v) => v !== null)), steps);
    const datasets = lines.map((l, order) => ({
      key: l.key, label: l.label, order,
      data: withGaps(l.points.filter((p) => p[1] !== null).map(([m, y]) => ({ x: time(m), y, month: m })), 75),
      colour: l.colour ?? CANDY_COLOURS[l.key],
      parsing: false, borderColor: l.colour ?? CANDY_COLOURS[l.key], borderWidth: l.key === 'candy' ? 2.5 : 2, borderDash: (l.dashed ?? l.key === 'all') ? [6, 4] : undefined,
      pointRadius: 0, pointHoverRadius: 4, pointHitRadius: 12, pointBackgroundColor: l.colour ?? CANDY_COLOURS[l.key], clip: false,
    }));
    const chart = new Chart(canvas.current, {
      type: 'line',
      data: { datasets },
      plugins: [endLabels],
      options: {
        layout: { padding: (ctx) => ({ top: 12, right: endLabelRoom(ctx), bottom: 2 }) },
        interaction: { mode: 'index', axis: 'x', intersect: false },
        scales: {
          x: {
            type: 'linear', min: from, max: to,
            border: { color: BASELINE },
            grid: { color: RULE, drawTicks: false },
            ticks: { autoSkip: false, maxRotation: 0, padding: 8, color: AXIS_INK, callback: (v) => (short ? tickLabel(v, to - from) : String(new Date(v).getUTCFullYear())) },
            // Year labels at a step that leaves each one about 48 px, measured on the axis at every layout, so a phone, a
            // narrow window or a resize gets 2000, 2005, 2010 rather than 29 labels on top of each other.
            // A year or two reads in months (Jan 2026 stacked), anything longer in years.
            afterBuildTicks: (axis) => { axis.ticks = (short ? monthTicks(from, to) : yearTicks(from, to, axis.width || canvas.current?.clientWidth || 600)).map((value) => ({ value })); },
          },
          y: {
            min: scale.min, max: scale.max,
            border: { display: false },
            grid: { color: (c) => (c.tick?.value === 0 ? BASELINE : RULE), lineWidth: (c) => (c.tick?.value === 0 ? 1.25 : 1), drawTicks: false },
            afterBuildTicks: (axis) => { axis.ticks = scale.ticks.map((value) => ({ value })); },
            ticks: { padding: 8, color: AXIS_INK, callback: (v) => (v === 0 && value === signedPct ? '0%' : value(v)) },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: PAPER, titleColor: LABEL_INK, bodyColor: LABEL_INK,
            borderColor: RULE, borderWidth: 1, cornerRadius: 0, boxPadding: 4,
            padding: 10, titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 },
            filter: (item) => item.raw?.y !== null,
            callbacks: {
              title: (items) => monthLabel(items[0].raw.month),
              label: (item) => `${item.dataset.label}: ${value(item.parsed.y)}`,
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

// The legend above a chart: a swatch per line, dashed for all prices.
export function CandyLegend({ keys, labels }) {
  return <div className="chart-legend" aria-hidden="true">{keys.map((k) => <span className="chart-legend__item" key={k}>
    <span className={`chart-legend__swatch${k === 'all' ? ' chart-legend__swatch--inflation' : ''}`} style={k === 'all' ? undefined : { background: CANDY_COLOURS[k] }} />{labels[k]}
  </span>)}</div>;
}

// Each year's candy price change as a bar, with all prices over the same twelve months as a dashed mark on the row,
// so a bar that ends past its mark is a year candy rose faster than prices in general. One scale for every row.
export function CandyYears({ years, month, limit }) {
  const values = years.flatMap((y) => [y.candy, y.all]).concat(0);
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const at = (v) => `${((v - min) / span) * 100}%`;
  const faster = years.filter((y) => y.candy > y.all).length;
  const name = monthName(month);
  return <div className="ranking candy-years">
    <p className="ranking__intro">{name} against the {name} before, newest first. Candy rose faster than all prices in {faster} of {years.length} years.</p>
    <ol className="ranking__list">
      {(limit ? years.slice(0, limit) : years).map((y) => <li className="ranking__row" key={y.year}>
        <span className="ranking__name">{y.year}</span>
        <span className="ranking__track">
          <span className="ranking__bar candy-years__bar" style={{ left: at(Math.min(0, y.candy)), width: `${(Math.abs(y.candy) / span) * 100}%` }} />
          <span className="ranking__cpi" style={{ left: at(y.all) }} aria-hidden="true" />
        </span>
        <span className="ranking__value">{onePlace(y.candy)}<span className="govuk-visually-hidden">, all prices {onePlace(y.all)}</span></span>
      </li>)}
    </ol>
    <p className="ranking__key">Bars are candy and chewing gum. The dashed mark on each row is all consumer prices over the same twelve months.</p>
  </div>;
}

// The Halloween insight's chart: one point a year (September), change since the first year, one line per series.
// `lines` is [{ key, label, colour, dashed?, points: [[year, pct]] }]. Yearly data, so each year gets a dot.
const yearSteps = (from, to, width) => [1, 2, 4, 5, 10].find((s) => width / Math.ceil((to - from + 1) / s) >= 48) ?? 10;
export function YearLines({ lines, label }) {
  const canvas = useRef(null);
  useEffect(() => {
    if (!canvas.current) return undefined;
    const years = lines.flatMap((l) => l.points.map((p) => p[0]));
    const from = Math.min(...years), to = Math.max(...years);
    const scale = pctScale(lines.flatMap((l) => l.points.map((p) => p[1])), [10, 20, 25, 50]);
    const chart = new Chart(canvas.current, {
      type: 'line',
      data: { datasets: lines.map((l, order) => ({
        key: l.key, label: l.label, order, colour: l.colour,
        data: l.points.map(([x, y]) => ({ x, y })), parsing: false,
        borderColor: l.colour, borderWidth: l.dashed ? 2 : 2.5, borderDash: l.dashed ? [6, 4] : undefined,
        pointRadius: l.dashed ? 0 : 2.5, pointHoverRadius: 4, pointHitRadius: 12, pointBackgroundColor: l.colour, pointBorderWidth: 0, clip: false,
      })) },
      plugins: [endLabels],
      options: {
        layout: { padding: (ctx) => ({ top: 12, right: endLabelRoom(ctx), bottom: 2 }) },
        interaction: { mode: 'index', axis: 'x', intersect: false },
        scales: {
          x: {
            type: 'linear', min: from, max: to,
            border: { color: BASELINE },
            grid: { color: RULE, drawTicks: false },
            ticks: { autoSkip: false, maxRotation: 0, padding: 8, color: AXIS_INK, callback: (v) => String(v) },
            // A label every year, or every second, fourth or fifth: whatever leaves each about 48 px at this width.
            afterBuildTicks: (axis) => {
              const step = yearSteps(from, to, axis.width || canvas.current?.clientWidth || 600);
              const ticks = []; for (let y = to; y >= from; y -= step) ticks.unshift({ value: y });
              axis.ticks = ticks;
            },
          },
          y: {
            min: scale.min, max: scale.max,
            border: { display: false },
            grid: { color: (c) => (c.tick?.value === 0 ? BASELINE : RULE), lineWidth: (c) => (c.tick?.value === 0 ? 1.25 : 1), drawTicks: false },
            afterBuildTicks: (axis) => { axis.ticks = scale.ticks.map((value) => ({ value })); },
            ticks: { padding: 8, color: AXIS_INK, callback: (v) => (v === 0 ? '0%' : signedPct(v)) },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: PAPER, titleColor: LABEL_INK, bodyColor: LABEL_INK,
            borderColor: RULE, borderWidth: 1, cornerRadius: 0, boxPadding: 4,
            padding: 10, titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 },
            callbacks: {
              title: (items) => `September ${items[0].raw.x}`,
              label: (item) => `${item.dataset.label}: ${signedPct(item.parsed.y)}`,
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

// The key above YearLines: a swatch per line, dashed for a dashed line.
export function YearLegend({ lines }) {
  return <div className="chart-legend" aria-hidden="true">{lines.map((l) => <span className="chart-legend__item" key={l.key}>
    <span className={`chart-legend__swatch${l.dashed ? ' chart-legend__swatch--inflation' : ''}`} style={l.dashed ? undefined : { background: l.colour }} />{l.label}
  </span>)}</div>;
}
