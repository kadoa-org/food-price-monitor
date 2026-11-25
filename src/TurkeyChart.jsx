import React from 'react';

// The Thanksgiving insight's chart: one row per Thanksgiving, the advertised price of a frozen whole turkey and the
// wholesale price of a frozen turkey hen the same number of weeks before it, as two dots on one dollar scale from $0. Plain HTML, so
// the labels keep their size on a phone. The ad price is always the lower one here; its label sits left of its dot and
// the wholesale label right of its own, so the two never collide even when the prices match. Wholesale is a ring and
// the ad price a smaller dot drawn on top, so equal prices still show both.
export const TURKEY_COLOURS = { ad: '#f46a25', wholesale: '#12436d' };
const MAX = 2;
const at = (v) => `${(Math.min(v, MAX) / MAX) * 100}%`;
const short = (v) => (v < 1 ? `${Math.round(v * 100)}¢` : `$${v.toFixed(2)}`);

export default function TurkeyChart({ years, label, when }) {
  return <figure className="turkey-gap" aria-label={label}>
    <div className="chart-legend" aria-hidden="true">
      <span className="chart-legend__item"><span className="turkey-gap__key" style={{ background: TURKEY_COLOURS.ad }} />In grocery ads, frozen turkey</span>
      <span className="chart-legend__item"><span className="turkey-gap__key turkey-gap__key--ring" />Wholesale, frozen turkey hen</span>
    </div>
    <ol className="turkey-gap__rows">
      {[...years].reverse().map((y) => {
        const lo = Math.min(y.ad, y.wholesale), hi = Math.max(y.ad, y.wholesale);
        return <li className="turkey-gap__row" key={y.year}>
          <span className="turkey-gap__year">{y.year}</span>
          <span className="turkey-gap__track">
            <span className="turkey-gap__bar" style={{ left: at(lo), width: `calc(${at(hi)} - ${at(lo)})` }} />
            <span className="turkey-gap__dot turkey-gap__dot--wholesale" style={{ left: at(y.wholesale) }} />
            <span className="turkey-gap__dot turkey-gap__dot--ad" style={{ left: at(y.ad), background: TURKEY_COLOURS.ad }} />
            <span className="turkey-gap__value turkey-gap__value--ad" style={{ right: `calc(100% - ${at(y.ad)} + 14px)`, color: '#b4501b' }}>{short(y.ad)}</span>
            <span className="turkey-gap__value" style={{ left: `calc(${at(y.wholesale)} + 14px)`, color: TURKEY_COLOURS.wholesale }}>{short(y.wholesale)}</span>
          </span>
        </li>;
      })}
    </ol>
    <div className="turkey-gap__axis" aria-hidden="true">
      <span />
      <span className="turkey-gap__ticks">{[0, 0.5, 1, 1.5, 2].map((v) => <span key={v} style={{ left: at(v) }}>{v ? `$${v.toFixed(2)}` : '$0'}</span>)}</span>
    </div>
    <figcaption className="turkey-gap__caption">Price per pound, {when} each Thanksgiving</figcaption>
  </figure>;
}
