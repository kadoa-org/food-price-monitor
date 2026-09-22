// Chart.js with only the pieces these charts use, registered once. Importing the whole library would pull in
// bar, pie, radar and their controllers for two line charts.
import { Chart, Filler, LineController, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler);

export const DAY = 86400000;

// The palette lives in chart.css so the chart, the chrome and the tables share one set of values. Canvas
// cannot read a custom property, so it is resolved once here, with the stylesheet's values as fallbacks for
// prerendering, where there is no document to ask.
const FALLBACK = { series: '#1d70b8', axis: '#505a5f', ink: '#0b0c0c', rule: '#e5e6e7', void: '#faf9f7', paper: '#fff' };
function token(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
export const INK = token('--dk-link', FALLBACK.series);
export const AXIS_INK = token('--dk-muted', FALLBACK.axis);
export const LABEL_INK = token('--dk-ink', FALLBACK.ink);
export const RULE = token('--dk-rule-soft', FALLBACK.rule);
export const BASELINE = token('--dk-faint', '#b1b4b6');
export const VOID = FALLBACK.void;
export const PAPER = FALLBACK.paper;
export const FONT = token('--dk-font', '"Helvetica Neue", Arial, sans-serif');

Chart.defaults.font.family = FONT;
Chart.defaults.font.size = 12;
Chart.defaults.color = AXIS_INK;
// No animation: a price chart that slides into place on every range change is harder to read, and it ignores
// a reader who asked their system for reduced motion.
Chart.defaults.animation = false;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.responsive = true;

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const money = (v) => (v >= 100 ? `$${Math.round(v)}` : `$${v.toFixed(v % 1 ? 2 : 0)}`);
export const dayLabel = (t) => { const d = new Date(t); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

// A month-start tick list for a linear time axis. Chart.js's time scale needs a date adapter; the data is
// already milliseconds and the labels are only ever months or years, so the ticks are built here instead.
export function monthTicks(from, to, max = 6) {
  const span = to - from;
  const stepMonths = span > 3 * 365 * DAY ? 12 : span > 400 * DAY ? 6 : span > 130 * DAY ? 3 : span > 45 * DAY ? 1 : 0;
  const ticks = [];
  if (!stepMonths) {
    for (let t = from; t <= to; t += Math.ceil(span / max / DAY) * DAY) ticks.push(t);
    return ticks;
  }
  const d = new Date(from); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0);
  if (stepMonths === 12) d.setUTCMonth(0);
  for (; d.getTime() <= to; d.setUTCMonth(d.getUTCMonth() + stepMonths)) if (d.getTime() >= from) ticks.push(d.getTime());
  return ticks;
}
export const tickLabel = (t, span) => {
  const d = new Date(t);
  if (span > 3 * 365 * DAY) return String(d.getUTCFullYear());
  if (span > 45 * DAY) return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

// Stretches with no quote are holes, not flat prices: a null between two reports breaks the line there.
// Chart.js joins across nulls only when spanGaps is on, which these charts never set.
export function withGaps(points, maxGapDays) {
  const out = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && prev.y !== null && p.x - prev.x > maxGapDays * DAY) out.push({ x: prev.x + DAY, y: null });
    out.push(p);
  }
  return out;
}

export { Chart };
