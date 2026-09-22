import React from 'react';
import { DAY, chartSegments, dateLabel, money, monthLabel, priced } from './model.mjs';

// One year of quoted low to high prices as a band, last year's band in grey behind it, no-quote stretches washed light grey. Two y labels
// and two x labels are the whole axis: they state this panel's own scale, which is what makes six independently
// scaled panels honest to compare by shape but not by height.
export default function BandChart({ rows, earlier = [], startDate, endDate, name, height = 96, maxGapDays = 7 }) {
  const list = rows.filter(priced); const prior = earlier.filter((r) => typeof r.low === 'number' && typeof r.high === 'number');
  const values = [...list, ...prior].flatMap((r) => [r.low, r.high, r.advertised_average]).filter((v) => typeof v === 'number');
  if (!values.length) return <div className="band band--empty">No quotes in the past year</div>;
  const w = 300, h = height, p = { l: 34, r: 2, t: 3, b: 3 };
  const from = Date.parse(startDate), to = Date.parse(endDate), span = Math.max(to - from, DAY);
  const min = Math.min(...values), max = Math.max(...values);
  const x = (d) => p.l + ((Date.parse(d) - from) / span) * (w - p.l - p.r);
  const y = (v) => (max === min ? h / 2 : h - p.b - ((v - min) / (max - min)) * (h - p.t - p.b));
  const path = (seg) => seg.map((r, i) => `${i ? 'L' : 'M'}${x(r.date).toFixed(1)},${y(r.value).toFixed(1)}`).join('');
  const band = (data, cls) => { const byDate = new Map(data.map((r) => [r.date, r])); return chartSegments(data.filter((r) => typeof r.low === 'number' && typeof r.high === 'number'), 'low', maxGapDays).filter((s) => s.length > 1).map((s, i) => <path key={i} className={cls} d={`${path(s)}${s.toReversed().map((r) => `L${x(r.date).toFixed(1)},${y(byDate.get(r.date).high).toFixed(1)}`).join('')}Z`} />); };
  const edges = (data) => ['low', 'high'].map((f) => chartSegments(data, f, maxGapDays).map((s, i) => s.length > 1 ? <path key={`${f}${i}`} className="band-edge" d={path(s)} /> : <circle key={`${f}${i}`} className="band-point" cx={x(s[0].date)} cy={y(s[0].value)} r="1.5" />));
  // Single-value series (the egg index, retail averages) draw as one line instead of a band.
  const single = list.every((r) => typeof r.low !== 'number' && typeof r.high !== 'number');
  const singleLine = () => chartSegments(list.filter((r) => typeof r.advertised_average === 'number'), 'advertised_average', maxGapDays).map((s, i) => s.length > 1 ? <path key={`avg${i}`} className="band-edge" d={path(s)} /> : <circle key={`avg${i}`} className="band-point" cx={x(s[0].date)} cy={y(s[0].value)} r="1.5" />);
  const gaps = []; let prev = startDate;
  for (const r of list) { if (Date.parse(r.date) - Date.parse(prev) > maxGapDays * DAY) gaps.push([prev, r.date]); prev = r.date; }
  if (Date.parse(endDate) - Date.parse(prev) > maxGapDays * DAY) gaps.push([prev, endDate]);
  const label = `Quoted low and high prices for ${name}, ${dateLabel(list[0].date)} to ${dateLabel(list.at(-1).date)}, ${money(Math.min(...list.flatMap((r) => [r.low, r.high]).filter((v) => typeof v === 'number')))} to ${money(Math.max(...list.flatMap((r) => [r.low, r.high]).filter((v) => typeof v === 'number')))} over the period.`;
  return <div className="band">
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label}>
      {gaps.map(([a, b]) => <rect key={a} className="chart-gap" x={x(a)} y={p.t} width={Math.max(1, x(b) - x(a))} height={h - p.t - p.b} />)}
      {band(prior, 'band-fill band-fill--earlier')}
      {single ? singleLine() : <>{band(list, 'band-fill')}{edges(list)}</>}
    </svg>
    <span className="band-y band-y--top">{money(max).replace(/\.00$/, '')}</span><span className="band-y band-y--bottom">{money(min).replace(/\.00$/, '')}</span>
    <div className="band-x" aria-hidden="true"><span>{monthLabel(startDate)}</span><span>{monthLabel(endDate)}</span></div>
  </div>;
}
