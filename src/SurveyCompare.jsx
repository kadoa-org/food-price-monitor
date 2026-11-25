import React from 'react';

// The Farm Bureau's change for each food it shares with our data, against ours, as two dots on one percent scale per
// row: the gap between the dots is the disagreement. One row per food, our closest measure only (grocery ads for turkey,
// cranberries and sweet potatoes; BLS average prices for milk and bread, BLS food at home for the whole dinner). Foods
// with no single match (the veggie tray: ads price carrots and celery separately) are left to the table.
export const SURVEY_COLOURS = { survey: '#12436d', ours: '#d4351c' };
const PICK = [
  ['turkey', 'ads', 'Turkey', 'grocery ads'],
  ['cranberries', 'ads', 'Cranberries', 'grocery ads'],
  ['milk', 'bls', 'Whole milk', 'BLS average price'],
  ['rolls', 'bls', 'Dinner rolls', 'BLS white bread'],
  ['sweetPotatoes', 'ads', 'Sweet potatoes', 'grocery ads'],
  ['total', 'bls', 'Whole dinner', 'BLS, all groceries'],
];
const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;

export function surveyRows(fb) {
  return PICK.flatMap(([key, source, label, ours]) => {
    const r = fb.rows.find((x) => x.key === key && x.source === source);
    return r ? [{ key, label, ours, survey: r.survey, change: r.change, total: key === 'total' }] : [];
  });
}

export default function SurveyCompare({ fb, label }) {
  const rows = surveyRows(fb);
  const values = rows.flatMap((r) => [r.survey, r.change, 0]);
  const min = Math.floor(Math.min(...values) / 5) * 5, max = Math.ceil(Math.max(...values) / 5) * 5;
  const at = (v) => `${((v - min) / (max - min)) * 100}%`;
  const ticks = []; for (let v = min; v <= max; v += 5) ticks.push(v);
  return <figure className="survey" aria-label={label}>
    <div className="chart-legend" aria-hidden="true">
      <span className="chart-legend__item"><span className="survey__key" style={{ background: SURVEY_COLOURS.survey }} />Farm Bureau survey</span>
      <span className="chart-legend__item"><span className="survey__key" style={{ background: SURVEY_COLOURS.ours }} />Grocery ads or BLS prices</span>
    </div>
    <ol className="survey__list">
      {rows.map((r) => {
        const lo = Math.min(r.survey, r.change), hi = Math.max(r.survey, r.change);
        return <li className={`survey__row${r.total ? ' survey__row--total' : ''}`} key={r.key}>
          <span className="survey__name"><strong>{r.label}</strong><span>vs {r.ours}</span></span>
          <span className="survey__track">
            <span className="survey__zero" style={{ left: at(0) }} />
            <span className="survey__gap" style={{ left: at(lo), width: `calc(${at(hi)} - ${at(lo)})` }} />
            <span className="survey__dot" style={{ left: at(r.survey), background: SURVEY_COLOURS.survey }} />
            <span className="survey__dot" style={{ left: at(r.change), background: SURVEY_COLOURS.ours }} />
            <span className="survey__val" style={{ left: at(r.survey), color: SURVEY_COLOURS.survey }}>{pct(r.survey)}</span>
            <span className="survey__val survey__val--below" style={{ left: at(r.change), color: '#b02a15' }}>{pct(r.change)}</span>
          </span>
        </li>;
      })}
    </ol>
    <div className="survey__axis" aria-hidden="true"><span /><span className="survey__ticks">{ticks.map((v) => <span key={v} style={{ left: at(v) }}>{v > 0 ? `+${v}%` : `${v}%`}</span>)}</span></div>
  </figure>;
}
