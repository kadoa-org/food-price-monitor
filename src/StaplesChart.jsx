import React, { useEffect, useRef } from 'react';
import { AXIS_INK, BASELINE, Chart, INK, LABEL_INK, MONTHS, PAPER, RULE, withGaps } from './chartSetup.mjs';

// Grocery staples as small multiples of percent change since a common month, the form readers of the first draft
// asked for: every line starts at zero, so ten foods at prices from $1 to $13 read on one footing. They share one
// scale, so a steeper line is a bigger rise. A food whose peak would flatten the other nine gets a scale of its own,
// and the note under the chart says so.
const GRID = 'rgba(11, 12, 12, 0.06)';
const signedPct = (v) => `${v > 0 ? '+' : ''}${Math.round(v)}%`;
const monthTime = (ym) => Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1);

// Round bounds and gridlines for a set of percent changes, zero always among them.
export function pctScale(values) {
  const min = Math.min(0, ...values), max = Math.max(0, ...values);
  const span = max - min || 1;
  const step = [10, 20, 25, 50, 100, 200, 250, 500].find((n) => span / n <= 3) ?? 1000;
  const bounds = { min: min - span * 0.06, max: max + span * 0.04 };
  const ticks = [];
  for (let v = Math.ceil(bounds.min / step) * step; v <= bounds.max; v += step) ticks.push(v);
  return { ...bounds, ticks };
}

// Items whose peak is more than twice the next highest get their own scale; everything else shares one.
export function stapleScales(items) {
  const peaks = items.map((r) => Math.max(...r.points.map((p) => p[1])));
  const sorted = [...peaks].sort((a, b) => b - a);
  const own = new Set(items.filter((_, i) => peaks[i] === sorted[0] && sorted[0] > 2 * sorted[1] && sorted[1] > 0).map((r) => r.name));
  const shared = pctScale(items.filter((r) => !own.has(r.name)).flatMap((r) => r.points.map((p) => p[1])));
  return new Map(items.map((r) => [r.name, own.has(r.name) ? { ...pctScale(r.points.map((p) => p[1])), own: true } : shared]));
}

export function StapleChart({ item, scale, from, to }) {
  const canvas = useRef(null);
  useEffect(() => {
    if (!canvas.current) return undefined;
    const points = item.points.map(([ym, y, price]) => ({ x: monthTime(ym), y, price }));
    // BLS skips a month now and then (October 2025 for every item, in the federal shutdown). A single missing month is
    // joined straight across, as the note under the chart says; a longer stretch still breaks the line.
    const data = withGaps(points, 75);
    // Every other year fits a desktop panel; a phone's two-column grid fits every third.
    const first = new Date(from).getUTCFullYear() + 1, every = canvas.current.parentElement.clientWidth < 220 ? 3 : 2;
    const chart = new Chart(canvas.current, {
      type: 'line',
      // Shaded between the line and 0%, so the area is the change itself, as in the shared image.
      data: { datasets: [{ data, parsing: false, fill: { target: { value: 0 } }, backgroundColor: 'rgba(18, 67, 109, 0.08)', borderColor: INK, borderWidth: 1.75, pointRadius: 0, pointHoverRadius: 3, pointHitRadius: 10, pointBackgroundColor: INK }] },
      options: {
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        layout: { padding: { top: 4, right: 6 } },
        scales: {
          x: {
            type: 'linear', min: from, max: to,
            border: { display: false },
            grid: { color: GRID, drawTicks: false },
            afterBuildTicks: (axis) => {
              const ticks = [];
              for (let y = new Date(from).getUTCFullYear() + 1; Date.UTC(y, 0, 1) <= to; y++) ticks.push({ value: Date.UTC(y, 0, 1) });
              axis.ticks = ticks;
            },
            ticks: { autoSkip: false, maxRotation: 0, padding: 4, color: AXIS_INK, font: { size: 11 }, callback: (v) => { const y = new Date(v).getUTCFullYear(); return (y - first) % every ? '' : String(y); } },
          },
          y: {
            min: scale.min, max: scale.max,
            border: { display: false },
            grid: { color: (c) => (c.tick?.value === 0 ? BASELINE : GRID), drawTicks: false, lineWidth: (c) => (c.tick?.value === 0 ? 1.25 : 1) },
            afterBuildTicks: (axis) => { axis.ticks = scale.ticks.map((value) => ({ value })); },
            ticks: { padding: 4, color: AXIS_INK, font: { size: 11 }, callback: (v) => (v === 0 ? '0%' : signedPct(v)) },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: PAPER, titleColor: LABEL_INK, bodyColor: LABEL_INK, borderColor: RULE, borderWidth: 1,
            cornerRadius: 0, displayColors: false, padding: 8, titleFont: { size: 12, weight: '600' }, bodyFont: { size: 12 },
            callbacks: {
              title: (items) => { const d = new Date(items[0].parsed.x); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; },
              label: (i) => `${signedPct(i.parsed.y)} ($${i.raw.price.toFixed(2)})`,
            },
          },
        },
      },
    });
    return () => chart.destroy();
  });
  const peak = item.points.reduce((a, p) => (p[1] > a[1] ? p : a));
  const label = `${item.name}: ${signedPct(item.change)} since ${item.baseDate.slice(0, 7)}, peaking at ${signedPct(peak[1])} in ${peak[0]}.`;
  return <div className="chart chart--panel staple-chart" style={{ '--chart-panel-height': '140px' }}>
    <div className="chart__canvas"><canvas ref={canvas} role="img" aria-label={label} /></div>
  </div>;
}

export { monthTime };

// Every food BLS has priced each month since the common month, ranked by its change, as bars on one scale. Readers of
// the small multiples said the shapes looked alike and the end figure was what mattered, and a ranking has room for
// four times the foods. A dashed line marks overall inflation over the same months, labelled on the chart, so a bar
// that ends right of it is a food that rose faster than prices in general. The ten charted foods are in bold.
export function StapleRanking({ ranking, cpi, href }) {
  const values = [...ranking.map((r) => r.change), cpi?.change ?? 0, 0];
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const at = (v) => `${((v - min) / span) * 100}%`;
  const faster = cpi ? ranking.filter((r) => r.change > cpi.change).length : null;
  return (
    <div className="ranking">
      <p className="ranking__intro">
        All {ranking.length} foods BLS has priced every month since {'August 2019'}, highest rise first. The 10 in the chart are in bold.
        {cpi && ` ${faster} of ${ranking.length} rose faster than overall inflation.`}
      </p>
      {cpi && (
        <div className="ranking__row ranking__row--label" aria-hidden="true">
          <span />
          <span className="ranking__track">
            <span className="ranking__cpi-label" style={{ left: at(cpi.change) }}>Overall inflation {signedPct(cpi.change)}</span>
          </span>
          <span />
        </div>
      )}
      <ol className="ranking__list">
        {ranking.map((r) => (
          <li className={`ranking__row${r.staple ? ' ranking__row--staple' : ''}`} key={r.name}>
            <a className="ranking__name" href={href(r)}>{r.name}</a>
            <span className="ranking__track">
              <span className="ranking__bar" style={{ left: at(Math.min(0, r.change)), width: `${(Math.abs(r.change) / span) * 100}%` }} />
              {cpi && <span className="ranking__cpi" style={{ left: at(cpi.change) }} aria-hidden="true" />}
            </span>
            <span className="ranking__value">
              {signedPct(r.change)}
              {cpi && <span className="govuk-visually-hidden">{r.change > cpi.change ? ', faster than overall inflation' : ', slower than overall inflation'}</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="ranking__key">
        {cpi
          ? `Overall inflation is the rise in all consumer prices (CPI-U, all items) from ${'August 2019'} to the latest month.`
          : 'Overall inflation could not be loaded, so its line is not shown.'}
      </p>
    </div>
  );
}
