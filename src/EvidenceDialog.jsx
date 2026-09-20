import React, { useEffect, useRef } from 'react';
import { dateLabel, money, quote } from './model.mjs';
export default function EvidenceDialog({ row, series, onClose }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); }, []);
  const e = row.evidence ?? {};
  const facts = [['Report date', dateLabel(row.date)], row.period_start !== row.period_end && ['Reporting period', `${dateLabel(row.period_start)} to ${dateLabel(row.period_end)}`], ['Published', e.published_date], ['Market', series.market], ['Package', series.package], row.mostly_low !== null && ['Mostly low', money(row.mostly_low)], row.mostly_high !== null && ['Mostly high', money(row.mostly_high)], row.comment && ['Reporter remark', row.comment], e.store_count != null && ['Stores in report', e.store_count], e.special_notes && ['Report notice', e.special_notes]].filter(Boolean);
  const commentary = [['Market', e.market_tone_comments], ['Supply', e.supply_tone_comments], ['Demand', e.demand_tone_comments], ['Commodity', e.commodity_comments]].filter(([, v]) => v);
  return <dialog ref={ref} className="evidence-dialog" aria-labelledby="evidence-title" onClose={onClose} onClick={(ev) => { if (ev.target === ref.current) ref.current.close(); }}>
    <div className="dialog-heading"><h2 id="evidence-title">USDA record</h2><button type="button" className="dk-btn" onClick={() => ref.current.close()} autoFocus>Close</button></div>
    <p className="dk-hint">{e.report_title}</p>
    <h3>{series.commodity}: {quote(row)}</h3>
    <p className="product-caption">{series.product}{series.origin ? `, ${series.origin}` : ''}</p>
    <dl className="dk-summary">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl>
    {commentary.length > 0 && <div className="source-quotes">{commentary.map(([label, text]) => <p key={label}><strong>{label}:</strong> {text}</p>)}</div>}
    <details><summary>All product attributes</summary><dl className="dk-summary">{Object.entries(series.dimensions).filter(([, v]) => v != null && v !== 'N/A').map(([k, v]) => <div key={k}><dt>{k.replaceAll('_', ' ')}</dt><dd>{String(v)}</dd></div>)}</dl></details>
    <p><a href={series.source_url ?? `https://mymarketnews.ams.usda.gov/viewReport/${series.source_id.replace('usda-', '')}`} target="_blank" rel="noreferrer">Open the USDA report</a> <span className="dk-hint">(shows the current edition, which may be newer)</span></p>
  </dialog>;
}
