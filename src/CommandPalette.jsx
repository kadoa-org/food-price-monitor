import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BASE, HOME, money, quote } from './model.mjs';

const PAGES = [
  { type: 'page', id: HOME, label: 'Overview', hint: 'Six benchmark prices' },
  { type: 'page', id: `${BASE}/commodities`, label: 'Commodities', hint: 'Every commodity USDA quotes' },
  { type: 'page', id: `${BASE}/retail`, label: 'Retail prices', hint: 'Supermarket ad prices by region' },
  { type: 'page', id: `${BASE}/about`, label: 'About the data', hint: 'Sources and how to read it' },
];
// Cmd+K palette from the congress site, restyled with the kit and driven by the commodities index. Pages are full
// navigations, so picking an item sets the location instead of routing in place.
export default function CommandPalette({ open, onClose, dataPath = `${BASE}/data` }) {
  const [q, setQ] = useState(''); const [idx, setIdx] = useState(0); const [commodities, setCommodities] = useState(null);
  const inputRef = useRef(null); const listRef = useRef(null);
  useEffect(() => { if (!open) return; setQ(''); setIdx(0); const t = setTimeout(() => inputRef.current?.focus(), 10); return () => clearTimeout(t); }, [open]);
  useEffect(() => { if (!open || commodities) return; fetch(`${dataPath}/commodities.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))).then((page) => setCommodities(page.items)).catch(() => setCommodities([])); }, [open, commodities]);
  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    const out = PAGES.filter((p) => !query || p.label.toLowerCase().includes(query));
    const list = (commodities ?? []).filter((c) => !query || c.name.toLowerCase().includes(query) || c.matches.some((m) => m.toLowerCase().includes(query)));
    const ranked = query ? list : [...list].sort((a, b) => Number(b.curated) - Number(a.curated) || a.name.localeCompare(b.name));
    for (const c of ranked.slice(0, query ? 40 : 8)) out.push({ type: 'commodity', id: `${BASE}/commodity/${c.slug}`, label: c.name, hint: `${c.stage}, ${c.market}`, right: quote(c.latest) });
    return out;
  }, [q, commodities]);
  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); const pick = items[idx]; if (pick) { onClose(); window.location.href = pick.id; } }
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [open, items, idx, onClose]);
  useEffect(() => { listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' }); }, [idx]);
  if (!open) return null;
  let lastType = null;
  return <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search">
    <div className="cmdk-backdrop" onClick={onClose} />
    <div className="cmdk-box">
      <div className="cmdk-head"><label htmlFor="cmdk-input" className="sr-only">Search commodities or jump to a page</label><input id="cmdk-input" ref={inputRef} className="dk-input cmdk-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search commodities or jump to a page" /><kbd>Esc</kbd></div>
      <div className="cmdk-list" ref={listRef}>
        {items.length === 0 ? <div className="cmdk-empty">{commodities ? 'No matches' : 'Loading…'}</div> : items.map((it, i) => {
          const header = it.type !== lastType; lastType = it.type;
          return <React.Fragment key={`${it.type}-${it.id}`}>
            {header && <div className="cmdk-group">{it.type === 'page' ? 'Jump to' : 'Commodities'}</div>}
            <a href={it.id} data-idx={i} className={`cmdk-item${idx === i ? ' cmdk-item--active' : ''}`} onMouseEnter={() => setIdx(i)} onClick={onClose}><span className="cmdk-label">{it.label}</span><span className="cmdk-hint">{it.hint}</span>{it.right && <span className="cmdk-right">{it.right}</span>}</a>
          </React.Fragment>;
        })}
      </div>
      <div className="cmdk-foot"><kbd>↑</kbd><kbd>↓</kbd> navigate <kbd>↵</kbd> open</div>
    </div>
  </div>;
}
