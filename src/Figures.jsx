import React, { useId, useLayoutEffect, useRef, useState } from 'react';

// Components reverse engineered from the UKHSA data dashboard (ukhsa-dashboard.data.gov.uk), which is built on the
// GOV.UK Design System and is the best-regarded public statistics dashboard in that family. Measurements were read
// from the live page: a #f3f2f1 container with no border, a 24px bold title, a 16px italic grey description, a
// 16px grey "Up to and including" line, GOV.UK tabs for Chart, Tabular data and Download, and GOV.UK tags for
// change, red #f4cdc6 on #2a0b06 and green #cce2d8 on #005a30.

// A change as a GOV.UK tag with an arrow. Up is red and down is green because on this site a rise is a higher
// food price, which is the reading UKHSA uses for cases: the colour says whether the move is bad news. The arrow
// and the sign carry the direction on their own, so the tag never depends on colour.
export function ChangeTag({ value, children, unit = '%', size }) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→';
  const figure = `${Math.abs(value).toFixed(Math.abs(value) < 10 ? 1 : 0)}${unit}`;
  return <strong className={`change-tag change-tag--${dir}${size === 'small' ? ' change-tag--small' : ''}`}>
    <span aria-hidden="true" className="change-tag__arrow">{arrow}</span>
    <span className="govuk-visually-hidden">{dir === 'up' ? 'Up ' : dir === 'down' ? 'Down ' : 'Unchanged '}</span>
    {children ? <><span className="change-tag__main">{children}</span> ({figure})</> : <span className="change-tag__main">{figure}</span>}
  </strong>;
}

// A single row of key figures for a detail page: a label, one value and a short note per cell. It is the UKHSA
// headline panel with the per-figure metric and date lines folded into one note, because a page about one product
// needs the answer at a glance, not a second table above the chart.
// Opens with a "Headlines" heading, as every UKHSA topic page does; `context` is the short summary printed under
// the panel.
export function KeyFigures({ heading = 'Headlines', description, date, context, items }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return <section className="key-figures">
    <SectionHeading description={description} date={date}>{heading}</SectionHeading>
    <dl className={`key-figures__row${shown.length % 2 ? ' key-figures__row--odd' : ''}`} style={{ '--key-columns': shown.length }}>
      {shown.map((f) => <div className="key-figures__item" key={f.label} title={f.title}>
        <dt className="key-figures__label">{f.label}</dt>
        <dd className="key-figures__value">{f.value}</dd>
        {f.note && <dd className="key-figures__note">{f.note}</dd>}
      </div>)}
    </dl>
    {context && <p className="key-figures__context">{context}</p>}
  </section>;
}

// A section heading as UKHSA writes one: a bold title naming the measure and its period, a short italic line on
// what the numbers are, and the date the data runs to.
export function SectionHeading({ children, description, date }) {
  return <div className="section-heading">
    <h2>{children}</h2>
    {description && <p className="section-heading__desc">{description}</p>}
    {date && <p className="section-heading__date">{date}</p>}
  </div>;
}

// GOV.UK tabs, with the keyboard behaviour the design system specifies: arrow keys move between tabs and focus
// follows selection.
export function Tabs({ tabs, initial = 0 }) {
  const [active, setActive] = useState(initial);
  const refs = useRef([]);
  const panels = useRef([]);
  const id = useId();
  // Every panel takes the height of the first one (the chart), measured on the page and again on resize, so switching
  // tabs never moves the content below; a longer table scrolls inside that height, as on the UKHSA dashboard.
  const [lockHeight, setLockHeight] = useState(null);
  useLayoutEffect(() => {
    const measure = () => {
      const first = panels.current[initial];
      if (!first || first.hidden) return;
      setLockHeight(first.getBoundingClientRect().height);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [initial, active === initial]);
  const move = (to) => { const next = (to + tabs.length) % tabs.length; setActive(next); refs.current[next]?.focus(); };
  return <div className="govuk-tabs">
    <ul className="govuk-tabs__list" role="tablist">
      {tabs.map((t, i) => <li key={t.label} className={`govuk-tabs__list-item${i === active ? ' govuk-tabs__list-item--selected' : ''}`} role="presentation">
        <button
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="tab"
          id={`${id}-tab-${i}`}
          aria-controls={`${id}-panel-${i}`}
          aria-selected={i === active}
          tabIndex={i === active ? 0 : -1}
          className="govuk-tabs__tab"
          onClick={() => setActive(i)}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); move(i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); move(i - 1); } }}
        >{t.short ? <><span className="govuk-tabs__long">{t.label}</span><span className="govuk-tabs__short" aria-hidden="true">{t.short}</span></> : t.label}</button>
      </li>)}
    </ul>
    {tabs.map((t, i) => <div key={t.label} ref={(el) => { panels.current[i] = el; }} style={lockHeight && i !== initial ? { minHeight: lockHeight, ...(t.scroll ? { maxHeight: lockHeight } : {}) } : undefined} className={`govuk-tabs__panel${t.scroll ? ' govuk-tabs__panel--scroll' : ''}`} role="tabpanel" id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} hidden={i !== active}>{t.content}</div>)}
  </div>;
}

// A chart card: title, italic description, the date the data runs to, then the tabs.
export function ChartCard({ title, description, date, tabs, footer, id }) {
  return <section className="chart-panel-card" aria-labelledby={id}>
    <h2 className="chart-panel-card__title" id={id}>{title}</h2>
    {description && <p className="chart-panel-card__desc">{description}</p>}
    {date && <p className="chart-panel-card__date">{date}</p>}
    <Tabs tabs={tabs} />
    {footer}
  </section>;
}

// "Filter data by" and a GOV.UK select, which UKHSA uses in place of segmented buttons for the time window.
export function FilterSelect({ label = 'Filter data by', value, options, onChange }) {
  const id = useId();
  return <div className="govuk-form-group filter-select">
    <label className="govuk-label" htmlFor={id}>{label}</label>
    <select className="govuk-select" id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>;
}
