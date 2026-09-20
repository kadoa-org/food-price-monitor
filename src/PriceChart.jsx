import React, { useEffect, useRef, useState } from 'react';
import { DAY, chartSegments, dateLabel, money, monthLabel } from './model.mjs';

// One quoted range per chart: low and high as solid lines with the range shaded between them. A grey band shows the
// same product a year earlier when requested. Lines break where USDA published no quote for longer than a reporting interval.
const FIELDS = { range: ['low', 'high'], retail: ['advertised_average'] };
function niceStep(span, count) {
  const raw = span / count; const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((n) => n * power).find((n) => n >= raw);
}
function xTicks(from, to) {
  const span = to - from; const ticks = [];
  const start = new Date(from); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  const yearly = span > 3 * 365 * DAY; const stepMonths = yearly ? 12 : span > 400 * DAY ? 6 : span > 130 * DAY ? 3 : span > 45 * DAY ? 1 : 0;
  if (!stepMonths) { for (let t = from; t <= to; t += 7 * DAY) ticks.push({ t, label: dateLabel(new Date(t).toISOString().slice(0, 10)).replace(/ \d{4}$/, '') }); return ticks; }
  if (yearly) start.setUTCMonth(0);
  for (const d = new Date(start); d.getTime() <= to; d.setUTCMonth(d.getUTCMonth() + stepMonths)) if (d.getTime() >= from) ticks.push({ t: d.getTime(), label: yearly ? String(d.getUTCFullYear()) : monthLabel(d.toISOString().slice(0, 10)) });
  return ticks;
}
export default function PriceChart({ rows, retail = false, compact = false, startDate, endDate, compare = [], maxGapDays = 7, unit = '' }) {
  const container = useRef(null);
  const [width, setWidth] = useState(compact ? 120 : 900);
  const [hover, setHover] = useState(null);
  useEffect(() => { const observer = new ResizeObserver(([entry]) => setWidth(Math.max(compact ? 80 : 280, Math.round(entry.contentRect.width)))); observer.observe(container.current); return () => observer.disconnect(); }, [compact]);
  const fields = retail ? FIELDS.retail : FIELDS.range;
  const valid = (r) => !r.ambiguous;
  const values = [...rows, ...compare].filter(valid).flatMap((r) => fields.map((f) => r[f])).filter((v) => typeof v === 'number' && Number.isFinite(v));
  const w = width, h = compact ? 32 : 320, p = compact ? { l: 0, r: 0, t: 2, b: 2 } : { l: 52, r: 44, t: 16, b: 30 };
  if (!values.length) return compact ? <div ref={container} className="spark spark--empty" aria-hidden="true" /> : <div ref={container} className="chart-empty">No quotes in this period. Choose a longer period or another product.</div>;
  const from = Date.parse(startDate ?? rows[0].date), to = Date.parse(endDate ?? rows.at(-1).date), span = Math.max(to - from, DAY);
  const min = Math.min(...values), max = Math.max(...values);
  const step = niceStep(Math.max(max - min, max * 0.15, 0.5), compact ? 2 : 5);
  // ONS guidance: crop the axis but keep about a quarter of the height below the lowest point.
  const lo = Math.max(0, Math.floor((min - (max - min || step) * 0.3) / step) * step), hi = Math.ceil((max + step * 0.2) / step) * step;
  const x = (date) => p.l + ((Date.parse(date) - from) / span) * (w - p.l - p.r);
  const y = (v) => h - p.b - ((v - lo) / (hi - lo)) * (h - p.t - p.b);
  const ticks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step);
  const path = (segment) => segment.map((r, i) => `${i ? 'L' : 'M'}${x(r.date).toFixed(1)},${y(r.value).toFixed(1)}`).join('');
  const band = (list, cls) => { const byDate = new Map(list.map((r) => [r.date, r])); return chartSegments(list.filter((r) => typeof r.low === 'number' && typeof r.high === 'number'), 'low', maxGapDays).filter((s) => s.length > 1).map((s, i) => <path key={i} className={cls} d={`${path(s)}${s.toReversed().map((r) => `L${x(r.date).toFixed(1)},${y(byDate.get(r.date).high).toFixed(1)}`).join('')}Z`} />); };
  const lines = (list, cls) => fields.map((field) => chartSegments(list, field, maxGapDays).map((s, i) => s.length > 1 ? <path key={`${field}-${i}`} className={cls} d={path(s)} /> : <circle key={`${field}-${i}`} className={`${cls} chart-dot`} cx={x(s[0].date)} cy={y(s[0].value)} r={compact ? 1.5 : 3} />));
  const pointRows = rows.filter((r) => valid(r) && fields.some((f) => typeof r[f] === 'number'));
  const sparse = !compact && pointRows.length <= 40;
  const compareByDate = new Map(compare.map((r) => [r.date, r]));
  const last = pointRows.at(-1);
  const labelPositions = last ? fields.map((f) => ({ f, v: last[f] })).filter((d) => typeof d.v === 'number') : [];
  const collide = labelPositions.length === 2 && Math.abs(y(labelPositions[0].v) - y(labelPositions[1].v)) < 14;
  function pointer(event) { const box = event.currentTarget.getBoundingClientRect(); const targetX = ((event.clientX - box.left) / box.width) * w; setHover(pointRows.reduce((best, r) => (Math.abs(x(r.date) - targetX) < Math.abs(x(best.date) - targetX) ? r : best), pointRows[0])); }
  if (compact) return <div ref={container} className="spark" aria-hidden="true"><svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">{!retail && band(rows.filter(valid), 'chart-band')}{lines(rows.filter(valid), 'chart-line')}</svg></div>;
  // Stretches with no quote for longer than a reporting interval are hatched, as on the landing panels.
  const priced = rows.filter((r) => valid(r) && fields.some((f) => typeof r[f] === 'number'));
  const gaps = []; let prevDate = startDate ?? priced[0]?.date;
  for (const r of priced) { if (prevDate && Date.parse(r.date) - Date.parse(prevDate) > maxGapDays * DAY) gaps.push([prevDate, r.date]); prevDate = r.date; }
  if (endDate && prevDate && Date.parse(endDate) - Date.parse(prevDate) > maxGapDays * DAY) gaps.push([prevDate, endDate]);
  const hoverCompare = hover && compareByDate.get(hover.date);
  const tooltipLeft = hover ? Math.min(Math.max(x(hover.date) / w * 100, 12), 88) : 0;
  return <div className="price-chart" ref={container}>
    <svg viewBox={`0 0 ${w} ${h}`} role="img" tabIndex={0} aria-label={retail ? `Advertised average price, ${dateLabel(rows[0].date)} to ${dateLabel(rows.at(-1).date)}` : `Quoted low and high prices, ${dateLabel(rows[0].date)} to ${dateLabel(rows.at(-1).date)}`} onFocus={() => setHover(last)} onBlur={() => setHover(null)} onPointerMove={pointer} onPointerLeave={() => setHover(null)} onKeyDown={(event) => { if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return; event.preventDefault(); const index = hover ? pointRows.findIndex((r) => r.date === hover.date) : pointRows.length - 1; setHover(pointRows[Math.max(0, Math.min(pointRows.length - 1, index + (event.key === 'ArrowLeft' ? -1 : 1)))]); }}>
      <desc>{`Latest ${dateLabel(last.date)}: ${fields.map((f) => money(last[f])).join(' to ')} ${unit}. Values are also listed in the table below.`}</desc>
      <defs><pattern id="nodata-detail" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="band-hatch" /></pattern></defs>
      {gaps.map(([a, b]) => <rect key={a} x={x(a)} y={p.t} width={Math.max(1, x(b) - x(a))} height={h - p.t - p.b} fill="url(#nodata-detail)" />)}
      {ticks.map((v) => <g key={v}><line x1={p.l} x2={w - p.r} y1={y(v)} y2={y(v)} className="chart-grid" /><text x={p.l - 8} y={y(v) + 4} textAnchor="end" className="chart-axis">{v >= 100 ? `$${Math.round(v)}` : `$${v.toFixed(v % 1 ? 2 : 0)}`}</text></g>)}
      {xTicks(from, to).map((tick) => <g key={tick.t}><line x1={x(new Date(tick.t).toISOString())} x2={x(new Date(tick.t).toISOString())} y1={h - p.b} y2={h - p.b + 5} className="chart-tick" /><text x={x(new Date(tick.t).toISOString())} y={h - 8} textAnchor="middle" className="chart-axis">{tick.label}</text></g>)}
      <line x1={p.l} x2={w - p.r} y1={h - p.b} y2={h - p.b} className="chart-baseline" />
      {compare.length > 0 && !retail && band(compare.filter(valid), 'chart-band chart-band--compare')}
      {compare.length > 0 && lines(compare.filter(valid), 'chart-line chart-line--compare')}
      {!retail && band(rows.filter(valid), 'chart-band')}
      {lines(rows.filter(valid), 'chart-line')}
      {sparse && pointRows.map((r) => fields.map((f) => typeof r[f] === 'number' && <circle key={`${r.id}-${f}`} className="chart-marker" cx={x(r.date)} cy={y(r[f])} r="3" />))}
      {last && (collide ? <text x={x(last.date) + 6} y={y(labelPositions[0].v) + 4} className="chart-label">Quote</text> : labelPositions.map(({ f, v }) => <text key={f} x={x(last.date) + 6} y={y(v) + 4} className="chart-label">{retail ? 'Average' : f === 'high' ? 'High' : 'Low'}</text>))}
      {hover && <g><line className="chart-cursor" x1={x(hover.date)} x2={x(hover.date)} y1={p.t} y2={h - p.b} />{fields.map((f) => typeof hover[f] === 'number' && <circle key={f} cx={x(hover.date)} cy={y(hover[f])} r="4" className="chart-hover-dot" />)}</g>}
    </svg>
    <div className="chart-tooltip" role="status" style={hover ? { left: `${tooltipLeft}%` } : undefined} hidden={!hover}>
      {hover && <><strong>{dateLabel(hover.date)}</strong>{retail ? <span>{money(hover.advertised_average)}</span> : <><span>High {money(hover.high)}</span><span>Low {money(hover.low)}</span>{(hover.mostly_low !== null || hover.mostly_high !== null) && <span>Mostly {[hover.mostly_low, hover.mostly_high].filter((v) => v !== null).map(money).join(' to ')}</span>}</>}{hover.comment && <span className="chart-tooltip-comment">{hover.comment}</span>}{hoverCompare && <span className="chart-tooltip-compare">A year earlier: {retail ? money(hoverCompare.advertised_average) : `${money(hoverCompare.low)} to ${money(hoverCompare.high)}`}</span>}</>}
    </div>
  </div>;
}
