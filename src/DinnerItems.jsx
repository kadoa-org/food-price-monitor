import React from 'react';
import { DEFS, ICONS } from './foodIcons.mjs';

// The Farm Bureau's dinner for 10, item by item: a drawn icon, the price last year and this year, and the change in
// dollars as a bar. Every row, the total included, shares one dollar scale, so turkey's bar reads as its share of the
// dinner's rise. Plain HTML, so the labels keep their size on a phone; the icons are fixed, trusted SVG from foodIcons.
const usd = (v) => `$${v.toFixed(2)}`;
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}$${Math.abs(v).toFixed(2)}`;

function Icon({ name }) {
  return <svg className="dinner__icon" viewBox="0 0 64 64" aria-hidden="true" dangerouslySetInnerHTML={{ __html: DEFS + ICONS[name] }} />;
}

export default function DinnerItems({ items, total, year, label }) {
  const rise = total.price - total.previous;
  const fall = Math.min(0, ...items.map((i) => i.diff));
  const span = rise - fall;
  const at = (v) => `${((v - fall) / span) * 100}%`;
  const rows = [...items, { key: 'total', name: 'Dinner for 10', previous: total.previous, price: total.price, diff: rise, total: true }];
  return <figure className="dinner" aria-label={label}>
    <div className="dinner__row dinner__row--head" aria-hidden="true">
      <span />
      <span>Item</span>
      <span className="dinner__num dinner__prev">{year - 1}</span>
      <span className="dinner__num">{year}</span>
      <span>Change</span>
    </div>
    <ol className="dinner__list">
      {rows.map((r) => <li className={`dinner__row${r.total ? ' dinner__row--total' : ''}`} key={r.key}>
        <Icon name={r.key} />
        <span className="dinner__name">{r.name}</span>
        <span className="dinner__num dinner__prev">{usd(r.previous)}</span>
        <span className="dinner__num">{usd(r.price)}</span>
        <span className="dinner__change">
          <span className="dinner__track">
            <span className={`ranking__bar ranking__bar--${r.diff > 0 ? 'up' : 'down'}`} style={{ left: at(Math.min(0, r.diff)), width: `${(Math.abs(r.diff) / span) * 100}%` }} />
            <span className="ranking__zero" style={{ left: at(0) }} aria-hidden="true" />
          </span>
          <span className="dinner__value">{signed(r.diff)}</span>
        </span>
      </li>)}
    </ol>
  </figure>;
}
