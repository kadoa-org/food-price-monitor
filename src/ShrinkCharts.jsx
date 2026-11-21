import React from 'react';

// The shrinkflation report's charts, plain HTML so labels keep their size on a phone and the prerender writes them in.
// - ShareOfRise: for each packaged category, the share of its price rise that came from smaller packs (BLS), with
//   all food at home on top for scale.
// - ItemsAndSales: GAO's seven categories, the share of products downsized and their share of sales, two bars each.
// - SizeChanges: downsized and upsized items in the BLS sample each year, the latest year marked as partial.
const pc = (v, d = 1) => `${v.toFixed(d)}%`;

export function ShareOfRise({ food, rows, label }) {
  const max = Math.max(...rows.map((r) => r.share), food.share) * 1.1;
  const row = (r, strong) => (
    <li className={`shrink-share__row${strong ? ' shrink-share__row--total' : ''}`} key={r.name}>
      <span className="shrink-share__name">{r.name}</span>
      <span className="shrink-share__track">
        <span className="shrink-share__bar" style={{ width: `calc((100% - 4em) * ${r.share / max})` }} />
        <span className="shrink-share__value">{pc(r.share, 0)}</span>
      </span>
    </li>
  );
  return <ol className="shrink-share" aria-label={label}>{row({ ...food, name: 'All food at home' }, true)}{rows.map((r) => row(r, false))}</ol>;
}

export function ItemsAndSales({ rows, label }) {
  const max = 40;
  const w = (v) => `calc((100% - 7em) * ${Math.min(v, max) / max})`;
  return (
    <div className="shrink-pair" role="img" aria-label={label}>
      <div className="chart-legend" aria-hidden="true">
        <span className="chart-legend__item"><span className="chart-legend__swatch" style={{ background: '#8c9196' }} />Share of products downsized</span>
        <span className="chart-legend__item"><span className="chart-legend__swatch" style={{ background: '#f46a25' }} />Their share of sales</span>
      </div>
      <ol className="shrink-pair__rows">
        {rows.map((r) => (
          <li className="shrink-pair__row" key={r.name}>
            <span className="shrink-pair__name">{r.name}</span>
            <span className="shrink-pair__bars">
              <span className="shrink-pair__line"><span className="shrink-pair__bar shrink-pair__bar--items" style={{ width: w(r.items) }} /><span className="shrink-pair__value">{pc(r.items)}</span></span>
              <span className="shrink-pair__line"><span className="shrink-pair__bar shrink-pair__bar--sales" style={{ width: w(r.sales) }} /><span className="shrink-pair__value shrink-pair__value--sales">{r.sales >= 10 ? pc(r.sales, 0) : pc(r.sales)}</span></span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SizeChanges({ rows, label }) {
  const max = Math.max(...rows.map((r) => r.down));
  return (
    <div className="shrink-cols" role="img" aria-label={label}>
      <div className="chart-legend" aria-hidden="true">
        <span className="chart-legend__item"><span className="chart-legend__swatch" style={{ background: '#f46a25' }} />Downsized</span>
        <span className="chart-legend__item"><span className="chart-legend__swatch" style={{ background: '#12436d' }} />Upsized</span>
      </div>
      <div className="shrink-cols__plot">
        {rows.map((r) => (
          <div className="shrink-cols__year" key={r.year}>
            <div className="shrink-cols__pair">
              <span className="shrink-cols__col shrink-cols__col--down" style={{ height: `${(r.down / max) * 100}%` }}><span>{r.down}</span></span>
              <span className="shrink-cols__col shrink-cols__col--up" style={{ height: `${(r.up / max) * 100}%` }} />
            </div>
            <span className="shrink-cols__label">{r.partial ? `${String(r.year).slice(2)}*` : `’${String(r.year).slice(2)}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
