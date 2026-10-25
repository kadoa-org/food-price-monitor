import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Button } from './kit';

// Chart card components: a #f3f2f1 container with no border, a 24px bold title, a 16px italic grey description, a
// 16px grey "Up to and including" line, tabs for Chart, Tabular data and Download, and tags for change, red #f4cdc6
// on #2a0b06 and green #cce2d8 on #005a30.

// A change as a tag with an arrow. Up is red and down is green because on this site a rise is a higher
// food price: the colour says whether the move is bad news. The arrow
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

// A single row of key figures for a detail page: a label, one value and a short note per cell, with the metric and
// date folded into one note, because a page about one product needs the answer at a glance, not a second table above
// the chart. Opens with a "Headlines" heading; `context` is the short summary printed under the panel.
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

// A section heading: a bold title naming the measure and its period, a short italic line on
// what the numbers are, and the date the data runs to.
export function SectionHeading({ children, description, date }) {
  return <div className="section-heading">
    <h2>{children}</h2>
    {description && <p className="section-heading__desc">{description}</p>}
    {date && <p className="section-heading__date">{date}</p>}
  </div>;
}

// Tabs with standard tab keyboard behaviour: arrow keys move between tabs and focus follows selection.
export function Tabs({ tabs, initial = 0 }) {
  const [active, setActive] = useState(initial);
  const refs = useRef([]);
  const panels = useRef([]);
  const id = useId();
  // Every panel takes the height of the first one (the chart), measured on the page and again on resize, so switching
  // tabs never pulls the content below upward. A longer panel grows instead of scrolling: the page has no scroll
  // areas inside it, and long lists use ShowMore to stay short.
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
    {tabs.map((t, i) => <div key={t.label} ref={(el) => { panels.current[i] = el; }} style={lockHeight && i !== initial ? { minHeight: lockHeight } : undefined} className="govuk-tabs__panel" role="tabpanel" id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} hidden={i !== active}>{t.content}</div>)}
  </div>;
}

// A chart card as the shared dataset kit draws one (kit/figures.jsx on the other dataset sites): a heading of title,
// italic description and the date the data runs to, then the tabs, then the source. The card spaces the three
// evenly, so a heading without a description or date still sits clear of the tabs.
// hideTitle keeps the title for screen readers only, where the page heading above already names the chart.
export function ChartCard({ title, description, date, tabs, footer, id, hideTitle = false }) {
  return <section className="chart-panel-card" aria-labelledby={id}>
    <div className={`chart-panel-card__head${hideTitle ? ' chart-panel-card__head--hidden' : ''}`}>
      <h2 className={hideTitle ? 'govuk-visually-hidden' : 'chart-panel-card__title'} id={id}>{title}</h2>
      {description && <p className="chart-panel-card__desc">{description}</p>}
      {date && <p className="chart-panel-card__date">{date}</p>}
    </div>
    <Tabs tabs={tabs.filter(Boolean)} />
    {footer && <div className="chart-panel-card__footer">{footer}</div>}
  </section>;
}

// "Filter data by" and a select, used in place of segmented buttons for the time window.
export function FilterSelect({ label = 'Filter data by', value, options, onChange }) {
  const id = useId();
  return <div className="govuk-form-group filter-select">
    <label className="govuk-label" htmlFor={id}>{label}</label>
    <select className="govuk-select" id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>;
}

// A long list shows its first rows and a button for the rest, the pattern the price tables already use, so no list
// ever scrolls inside the page. `children(count)` renders the first `count` items.
export function ShowMore({ total, initial, step, noun, children }) {
  const [count, setCount] = useState(initial);
  const shown = Math.min(count, total);
  return <>
    {children(shown)}
    {total > initial && <div className="table-more">
      {shown < total
        ? <Button onClick={() => setCount(step ? shown + step : total)}>{step ? 'Show more' : `Show all ${total} ${noun}`}</Button>
        : <Button onClick={() => setCount(initial)}>Show fewer</Button>}
      <span className="dk-hint">Showing {shown} of {total}</span>
    </div>}
  </>;
}
