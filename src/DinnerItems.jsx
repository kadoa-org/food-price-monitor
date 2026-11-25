import React from 'react';
import { DEFS, ICONS } from './foodIcons.mjs';

// The Farm Bureau's dinner for 10, item by item: a drawn icon, the name with last year's and this year's price and the
// dollar change under it, and a bar for the percent change, the fair comparison between items and the sort order. One
// measure for the bars, as on the shareable image: a second dollar bar read as the same chart twice. Plain HTML, so the
// labels keep their size on a phone; the icons are fixed, trusted SVG from foodIcons.
const usd = (v) => `$${v.toFixed(2)}`;
const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
export const pctOf = (r) => (r.price / r.previous - 1) * 100;

function Icon({ name }) {
  return <svg className="dinner__icon" viewBox="0 0 64 64" aria-hidden="true" dangerouslySetInnerHTML={{ __html: DEFS + ICONS[name] }} />;
}

export default function DinnerItems({ items, total, year, label }) {
  const rows = [...items].map((i) => ({ ...i, pct: pctOf(i) })).sort((a, b) => b.pct - a.pct);
  rows.push({ key: 'total', name: 'Dinner for 10', previous: total.previous, price: total.price, diff: total.price - total.previous, pct: pctOf(total), total: true });
  const min = Math.min(0, ...rows.map((r) => r.pct)), max = Math.max(...rows.map((r) => r.pct)), span = max - min;
  const at = (v) => `${((v - min) / span) * 100}%`;
  return <figure className="dinner" aria-label={label}>
    <div className="dinner__row dinner__row--head" aria-hidden="true">
      <span />
      <span>Item: {year - 1} → {year} price, change</span>
      <span>Price change since last year</span>
    </div>
    <ol className="dinner__list">
      {rows.map((r) => <li className={`dinner__row${r.total ? ' dinner__row--total' : ''}`} key={r.key}>
        <Icon name={r.key} />
        <span className="dinner__item">
          <span className="dinner__name">{r.name}</span>
          <span className="dinner__prices">{usd(r.previous)} → {usd(r.price)}, {sign(r.diff)}{usd(Math.abs(r.diff))}</span>
        </span>
        <span className="dinner__change">
          <span className="dinner__track">
            <span className={`ranking__bar ranking__bar--${r.pct > 0 ? 'up' : 'down'}`} style={{ left: at(Math.min(0, r.pct)), width: `${(Math.abs(r.pct) / span) * 100}%` }} />
            <span className="ranking__zero" style={{ left: at(0) }} aria-hidden="true" />
          </span>
          <span className="dinner__value">{sign(r.pct)}{Math.abs(r.pct).toFixed(1)}%</span>
        </span>
      </li>)}
    </ol>
  </figure>;
}
