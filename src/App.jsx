import React, { useEffect, useState } from 'react';
import { Button, DataTable, GitHubButton, LiveBadge, NavBar, SearchInput, Section, SiteFooter, SiteHeader, Tag } from './kit';
import CommandPalette from './CommandPalette';
import { BASE, HOME, addDays, dataPath, dateLabel, families, gapNote, marketKey, money, monthLabel, number, pctLabel, quote, summarize, unitLabel, yearEarlier } from './model.mjs';
import PriceChart from './PriceChart';
import BandChart from './BandChart';
import EvidenceDialog from './EvidenceDialog';

const url = (slug) => `${BASE}/commodity/${slug}`;
function Download({ slug, common, children = 'Download CSV' }) { return <a className="dk-btn" href={`${dataPath(common)}/downloads/${slug}.csv`} download>{children}</a>; }
export function Shell({ page, children }) {
  const kind = page?.kind;
  const [search, setSearch] = useState(false);
  useEffect(() => { const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch((o) => !o); } }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);
  return <><a className="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader brand="🥕 US Food Price Monitor" brandHref={HOME} right={<span className="header-right"><LiveBadge>Updated daily</LiveBadge><GitHubButton repo="kadoa-org/food-price-monitor" /><Button inverse onClick={() => setSearch(true)} aria-label="Search (Cmd+K)">Search <kbd className="header-kbd">⌘K</kbd></Button></span>} />
    <CommandPalette open={search} onClose={() => setSearch(false)} dataPath={dataPath(page?.common)} />
    <NavBar items={[{ href: HOME, label: 'Overview', active: kind === 'home' }, { href: `${BASE}/commodities`, label: 'Commodities', active: kind === 'commodity' || kind === 'commodities' }, { href: `${BASE}/retail`, label: 'Retail prices', active: kind === 'retail' }, { href: `${BASE}/about`, label: 'About the data', active: kind === 'about' }]} />
    <main id="main-content" className="dk-container main">{children}</main><SiteFooter current="food-prices" /></>;
}
export function Loading({ error = false }) {
  return <Shell><div role={error ? 'alert' : 'status'}>{error ? 'This page could not be loaded. Check the address or return to the overview.' : 'Loading food prices…'}</div>{error ? <p><a href={HOME}>Return to the overview</a></p> : <div className="skeleton" aria-hidden="true"><div className="skeleton-title" /><div className="skeleton-line" /><div className="skeleton-chart" /></div>}</Shell>;
}
function Panel({ f, common }) {
  const b = f.benchmark; const start = addDays(common.lastDate, -365);
  const marketShort = b.market.replace(/ FOB SC$/, '').replace(/ \(FR\)/, '').replace(/ Terminal Market$/, '');
  const dir = b.yearChange > 0 ? 'up' : b.yearChange < 0 ? 'down' : '';
  return <article className="panel">
    <div className="panel-head">
      <div><a href={url(f.summary.slug)}>{f.summary.name}</a><span className="panel-market">{marketShort} {b.stage.toLowerCase()}</span></div>
      {b.yearAgo && <div className={`panel-delta panel-delta--${dir}`} title={`A year earlier: ${quote(b.yearAgo)}, ${dateLabel(b.yearAgo.date)}`}><span><span className={`tri ${dir === 'down' ? 'tri--down' : ''}`} aria-hidden="true" />{pctLabel(b.yearChange)}</span><span className="panel-market">past year</span></div>}
    </div>
    <div className="panel-price"><span className="panel-value">{quote(b.latest)}</span><span className="panel-sub">{unitLabel(b.package)}</span></div>
    <BandChart rows={b.sparkline} earlier={b.earlier} startDate={start} endDate={common.lastDate} name={f.summary.name.toLowerCase()} />
  </article>;
}
function Change({ value }) {
  if (value === null || value === undefined) return <span className="dk-hint">No comparison</span>;
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : '';
  return <span className={`change change--${dir}`}>{dir && <span className={`tri ${dir === 'down' ? 'tri--down' : ''}`} aria-hidden="true" />}{pctLabel(value)}</span>;
}
function Overview({ page }) {
  const { common, featured, retail } = page;
  const panels = [...featured].sort((a, b) => (b.benchmark.yearChange ?? -Infinity) - (a.benchmark.yearChange ?? -Infinity));
  const featuredSlugs = new Set(featured.map((f) => f.summary.slug));
  const seen = new Set(); const retailRows = retail.rows.filter((r) => featuredSlugs.has(r.slug) && (seen.has(r.family) ? false : (seen.add(r.family), true)));
  const retailColumns = [
    { key: 'item', header: 'Item', render: (r) => <><a className="cell-link" href={url(r.slug)}>{r.family}</a><span className="cell-note">{r.product === r.commodity ? '' : r.product}</span></> },
    { key: 'package', header: 'Package', hideBelow: 'sm', render: (r) => r.package },
    { key: 'price', header: 'Ad price', align: 'right', render: (r) => money(r.price) },
    { key: 'yearAgo', header: 'A year earlier', align: 'right', hideBelow: 'sm', render: (r) => money(r.yearAgo) },
    { key: 'yearChange', header: 'Change, 1 year', align: 'right', render: (r) => <Change value={r.yearAgo === null ? null : r.yearChange} /> },
    { key: 'stores', header: 'Stores', align: 'right', hideBelow: 'sm', render: (r) => (r.stores === null ? '' : number(r.stores)) },
  ];
  return <>
    <div className="title-block"><h1>US food price monitor</h1><p className="lede">Wholesale and shipping point prices for six produce commodities, from USDA.</p><p className="dk-hint">Latest report {dateLabel(common.lastDate)}. Updated after every USDA report, on business days.</p></div>
    <Section title="Benchmark prices" right={<span className="dk-hint">Year to {dateLabel(common.lastDate)}, sorted by change. <a href={`${BASE}/commodities`}>All commodities</a></span>}>
      <div className="board">{panels.map((f) => <Panel key={f.summary.slug} f={f} common={common} />)}</div>
    </Section>
    <Section title="Retail prices" hint="Advertised sale prices in US supermarket weekly ads this week, averaged across stores. The last step of the chain the charts start." right={<a href={`${BASE}/retail`}>All items and regions</a>}>
      <DataTable rows={retailRows} columns={retailColumns} rowKey={(r) => r.id} empty="No retail report this week." />
    </Section>
    <Section title="Market news"><NewsList items={page.news.slice(0, 6)} compact /></Section>
  </>;
}
function NewsList({ items, showFamilies = false, showNotes = false, compact = false }) {
  return <ul className={`news-list${compact ? ' news-list--compact' : ''}`}>{items.map((a) => <li key={a.id}>
    <div className="news-head"><Tag tone={a.source === 'USDA' ? 'blue' : 'grey'}>{a.source}</Tag><a href={a.url} target="_blank" rel="noreferrer">{a.title}</a><span className="dk-hint news-date">{dateLabel(a.date).replace(/ \d{4}$/, '')}</span></div>
    {a.text && !compact && <p className="news-summary">{a.text}</p>}
    {showFamilies && a.source === 'Markon' && a.families.length > 0 && <p className="news-tags">{a.families.map((slug) => <a key={slug} href={url(slug)} className="dk-tag dk-tag--grey">{families.find((f) => f.slug === slug).name}</a>)}</p>}
    {showNotes && a.notes?.length > 0 && <ul className="news-signals">{a.notes.map((n, i) => <li key={i}>{n.text}{n.quote ? <> <q>{n.quote}</q></> : ''}</li>)}</ul>}
  </li>)}</ul>;
}
function NewsSection({ items, common, slug }) {
  if (!items?.length) return null;
  return <Section title="Market news" hint={slug ? 'USDA market tone changes and Markon crop updates.' : undefined}>
    <NewsList items={items.slice(0, slug ? 10 : items.length)} showFamilies={!slug} showNotes={!!slug} />
  </Section>;
}
const RANGES = [['30', '30 days'], ['365', '1 year'], ['all', 'All']];
function Commodity({ page }) {
  const initial = page.series.find((s) => s.id === page.initialSeriesId);
  const [market, setMarket] = useState(marketKey(initial)); const [pack, setPack] = useState(initial.package); const [seriesId, setSeriesId] = useState(initial.id);
  const [range, setRange] = useState('365'); const [compare, setCompare] = useState(true); const [evidence, setEvidence] = useState(null); const [visible, setVisible] = useState(25); const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [history, setHistory] = useState({ id: initial.id, rows: page.initialObservations, dimensions: page.initialDimensions, error: false });
  // The page ships only the products of the initial market; the full list arrives after first paint.
  const [allSeries, setAllSeries] = useState(page.series);
  useEffect(() => { if (page.seriesTotal <= page.series.length) return; const controller = new AbortController(); fetch(`${dataPath(page.common)}/commodity/${page.summary.slug}.series.json`, { signal: controller.signal }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))).then(setAllSeries).catch(() => {}); return () => controller.abort(); }, [page]);
  const markets = page.markets ?? [...new Set(allSeries.map(marketKey))].sort();
  const marketSeries = allSeries.filter((s) => marketKey(s) === market); const packs = [...new Set(marketSeries.map((s) => s.package))].sort(); const options = marketSeries.filter((s) => s.package === pack); const selected = options.find((s) => s.id === seriesId) ?? options[0];
  useEffect(() => { if (history.id === selected.id) return; const controller = new AbortController(); fetch(`${dataPath(page.common)}/series/${selected.id}.json`, { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then((file) => setHistory({ id: selected.id, rows: file.observations, dimensions: file.dimensions, error: false })).catch((error) => { if (error.name !== 'AbortError') setHistory({ id: selected.id, rows: [], dimensions: {}, error: true }); }); return () => controller.abort(); }, [selected.id, history.id]);
  const pending = history.id !== selected.id;
  const series = { ...selected, observations: history.rows };
  const summary = pending || !history.rows.length ? null : summarize(series);
  const endDate = summary ? summary.latest.date : selected.lastDate;
  const startDate = range === 'all' ? null : addDays(endDate, -Number(range));
  const filtered = pending ? [] : history.rows.filter((r) => !startDate || r.date >= startDate);
  const earlier = compare && startDate && !pending ? yearEarlier(history.rows, startDate, endDate) : [];
  const sorted = [...filtered].sort((a, b) => { const av = a[sort.key], bv = b[sort.key]; if (av == null) return bv == null ? 0 : 1; if (bv == null) return -1; return (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))) * (sort.dir === 'asc' ? 1 : -1); });
  function changeMarket(value) { const next = allSeries.find((s) => marketKey(s) === value); if (!next) return; setMarket(value); setPack(next.package); setSeriesId(next.id); setVisible(25); }
  function changePack(value) { setPack(value); setSeriesId(marketSeries.find((s) => s.package === value).id); setVisible(25); }
  const columns = [
    { key: 'date', header: 'Report date', sortable: true, render: (r) => dateLabel(r.date) },
    { key: 'low', header: 'Low', sortable: true, align: 'right', render: (r) => (r.ambiguous ? 'Conflicting records' : money(r.low)) },
    { key: 'high', header: 'High', sortable: true, align: 'right', render: (r) => (r.ambiguous ? '' : money(r.high)) },
    { key: 'mostly_low', header: 'Most sales', align: 'right', hideBelow: 'sm', render: (r) => (r.mostly_low === null && r.mostly_high === null ? '' : [r.mostly_low, r.mostly_high].filter((v) => v !== null).map(money).join(' to ')) },
    { key: 'comment', header: 'USDA note', hideBelow: 'md', render: (r) => r.comment ?? '' },
    { key: 'source', header: 'Source', render: (r) => <button className="text-button" onClick={() => setEvidence(r)} aria-label={`View USDA record for ${dateLabel(r.date)}`}>View</button> },
  ];
  const unit = unitLabel(selected.package);
  return <>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><a href={HOME}>US food price monitor</a><span aria-hidden="true">/</span><span>{page.summary.name}</span></nav>
    <div className="hero detail-hero"><div><h1>{page.title}</h1><p className="lede">{page.summary.description}</p><p className="dk-hint">{number(page.summary.seriesCount)} products in {page.summary.markets} markets, {dateLabel(page.summary.firstDate)} to {dateLabel(page.summary.lastDate)}.</p></div><Download slug={page.summary.slug} common={page.common} /></div>
    <div className="filters">
      <label>Market<select value={market} onChange={(e) => changeMarket(e.target.value)}>{markets.map((m) => <option key={m} disabled={allSeries.length < page.seriesTotal && !allSeries.some((s) => marketKey(s) === m)}>{m}</option>)}</select></label>
      <label>Package<select value={pack} onChange={(e) => changePack(e.target.value)}>{packs.map((p) => <option key={p}>{p}</option>)}</select></label>
      <label className="product-select">Product<select value={selected.id} onChange={(e) => { setSeriesId(e.target.value); setVisible(25); }}>{options.map((s) => <option key={s.id} value={s.id}>{s.product}{s.origin ? `, ${s.origin}` : ''} (latest {dateLabel(s.lastDate)})</option>)}</select></label>
    </div>
    <section className="chart-panel" aria-labelledby="chart-title">
      <div className="quote-heading">
        <div><h2 id="chart-title" className="quote-value">{quote(selected.latest)} <span>{unit}</span></h2><p className="product-caption">{selected.product}{selected.origin ? `, ${selected.origin}` : ''}. {selected.stage}, {selected.market}, {dateLabel(selected.lastDate)}{selected.lastDate !== page.common.lastDate ? ' (not in the newest report)' : ''}.</p></div>
        <div className="chart-controls"><div className="range-control" role="group" aria-label="Period">{RANGES.map(([value, label]) => <button key={value} type="button" aria-pressed={range === value} onClick={() => { setRange(value); setVisible(25); }}>{label}</button>)}</div><label className="compare-toggle"><input type="checkbox" checked={compare} disabled={range === 'all'} onChange={(e) => setCompare(e.target.checked)} /> Show a year earlier</label></div>
      </div>
      {pending ? <div className="chart-loading" role="status">Loading price history…<div className="skeleton-chart" aria-hidden="true" /></div> : history.error ? <div role="alert" className="chart-empty">Price history could not be loaded. <button className="text-button" onClick={() => setHistory({ id: '', rows: [], dimensions: {}, error: false })}>Retry</button></div> : <PriceChart rows={filtered} compare={earlier} startDate={startDate ?? filtered[0]?.date} endDate={endDate} unit={unit} />}
      {!pending && gapNote(history.rows, startDate, endDate) && <p className="dk-inset">{gapNote(history.rows, startDate, endDate)}</p>}
      <p className="chart-note">Shaded band: USDA low to high quote, US dollars {unit}. Weekends and holidays are joined; longer gaps are left open. {compare && range !== 'all' ? 'Grey: the same product a year earlier.' : ''}</p>
    </section>
    {summary && <Section title="Compared with earlier reports" hint="Percentages compare the midpoint of the quoted range.">
      <dl className="dk-summary dk-summary--wide">
        <div><dt>Latest, {dateLabel(summary.latest.date)}</dt><dd>{quote(summary.latest)}</dd></div>
        <div><dt>4 weeks earlier{summary.monthAgo ? `, ${dateLabel(summary.monthAgo.date)}` : ''}</dt><dd>{summary.monthAgo ? <>{quote(summary.monthAgo)} <Tag>{pctLabel(summary.monthChange)}</Tag></> : 'No quote within 4 days of that date'}</dd></div>
        <div><dt>A year earlier{summary.yearAgo ? `, ${dateLabel(summary.yearAgo.date)}` : ''}</dt><dd>{summary.yearAgo ? <>{quote(summary.yearAgo)} <Tag>{pctLabel(summary.yearChange)}</Tag></> : 'No quote a year earlier in this dataset'}</dd></div>
        <div><dt>Lowest quote, past year</dt><dd>{summary.yearLow ? `${money(summary.yearLow.low ?? summary.yearLow.high)} on ${dateLabel(summary.yearLow.date)}` : 'None'}</dd></div>
        <div><dt>Highest quote, past year</dt><dd>{summary.yearHigh ? `${money(summary.yearHigh.high ?? summary.yearHigh.low)} on ${dateLabel(summary.yearHigh.date)}` : 'None'}</dd></div>
      </dl>
    </Section>}
    <NewsSection items={page.news} common={page.common} slug={page.summary.slug} />
    <Section title="Daily prices" hint={pending ? 'Loading' : `Every USDA report for this product in this period: ${number(filtered.length)} reports, ${unit}`}>
      <DataTable rows={sorted.slice(0, visible)} columns={columns} rowKey={(r) => r.id} sort={sort} onSort={(key) => { setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' })); setVisible(25); }} empty={pending ? 'Loading…' : history.error ? 'History could not be loaded.' : 'No reports in this period.'} />
      {sorted.length > visible && <div className="table-more"><Button onClick={() => setVisible((n) => n + 50)}>Show more</Button><span className="dk-hint">Showing {visible} of {number(sorted.length)}</span></div>}
    </Section>
    {evidence && <EvidenceDialog row={evidence} series={{ ...selected, commodity: selected.commodity ?? page.summary.name, dimensions: history.dimensions ?? {} }} onClose={() => setEvidence(null)} />}
  </>;
}
function Commodities({ page }) {
  const [query, setQuery] = useState(''); const [stage, setStage] = useState('all'); const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const q = query.trim().toLowerCase();
  const rows = page.items.filter((c) => (stage === 'all' || c.stages.includes(stage)) && (!q || c.name.toLowerCase().includes(q) || c.matches.some((m) => m.toLowerCase().includes(q)) || c.product.toLowerCase().includes(q)));
  const value = (c, key) => key === 'name' ? c.name : key === 'yearChange' ? (c.yearChange ?? -Infinity) : key === 'lastDate' ? c.lastDate : key === 'latest' ? (c.latest.low ?? c.latest.high ?? -Infinity) : c[key];
  const sorted = [...rows].sort((a, b) => { const av = value(a, sort.key), bv = value(b, sort.key); return (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))) * (sort.dir === 'asc' ? 1 : -1); });
  const columns = [
    { key: 'name', header: 'Commodity', sortable: true, render: (c) => <><a className="cell-link" href={url(c.slug)}>{c.name}</a><span className="cell-note dk-hide-sm">{c.product}. {c.market}</span></> },
    { key: 'stage', header: 'Price type', hideBelow: 'sm', render: (c) => c.stages.join(', ') },
    { key: 'seriesCount', header: 'Products', align: 'right', sortable: true, hideBelow: 'md', render: (c) => number(c.seriesCount) },
    { key: 'latest', header: 'Latest quote', align: 'right', sortable: true, render: (c) => <><span className="cell-quote">{quote(c.latest)}</span><span className="cell-note">{unitLabel(c.package)}</span></> },
    { key: 'yearChange', header: 'Change, 1 year', align: 'right', sortable: true, render: (c) => <Change value={c.yearAgo ? c.yearChange : null} /> },
    { key: 'lastDate', header: 'Latest report', sortable: true, hideBelow: 'sm', render: (c) => dateLabel(c.lastDate) },
  ];
  return <>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><a href={HOME}>US food price monitor</a><span aria-hidden="true">/</span><span>Commodities</span></nav>
    <div className="hero"><div><h1>Commodities</h1><p className="lede">Every fresh produce commodity USDA quotes at US wholesale markets and shipping points, {number(page.items.length)} in all. Each has its own page with all markets, products and history.</p></div></div>
    <div className="dk-toolbar"><SearchInput value={query} onChange={setQuery} placeholder="Search commodities" width={280} /><label className="toolbar-select">Price type <select value={stage} onChange={(e) => setStage(e.target.value)}><option value="all">All</option><option value="Shipping point">Shipping point</option><option value="Wholesale">Wholesale</option></select></label><span className="dk-hint">{number(sorted.length)} of {number(page.items.length)}</span></div>
    <DataTable rows={sorted} columns={columns} rowKey={(c) => c.slug} sort={sort} onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))} empty="No commodity matches that search." />
    <p className="dk-hint" style={{ marginTop: 10 }}>The quote shown is the product USDA has quoted most consistently for that commodity over the past two years. Change compares range midpoints with the nearest report 52 weeks earlier.</p>
  </>;
}
function Retail({ page }) {
  const [region, setRegion] = useState(page.regions[0] ?? 'National');
  const rows = page.rows.filter((r) => r.region === region);
  const columns = [
    { key: 'family', header: 'Commodity', render: (r) => <a className="cell-link" href={url(r.slug)}>{r.family}</a> },
    { key: 'product', header: 'Item', render: (r) => (r.product === r.commodity ? r.commodity : r.product) },
    { key: 'package', header: 'Package', hideBelow: 'sm', render: (r) => r.package },
    { key: 'price', header: 'Ad price', align: 'right', render: (r) => money(r.price) },
    { key: 'weekAgo', header: 'Week earlier', align: 'right', hideBelow: 'sm', render: (r) => money(r.weekAgo) },
    { key: 'yearAgo', header: 'A year earlier', align: 'right', hideBelow: 'sm', render: (r) => money(r.yearAgo) },
    { key: 'yearChange', header: 'Change, 1 year', align: 'right', render: (r) => <Change value={r.yearAgo === null ? null : r.yearChange} /> },
    { key: 'stores', header: 'Stores', align: 'right', hideBelow: 'sm', render: (r) => (r.stores === null ? '' : number(r.stores)) },
  ];
  return <>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><a href={HOME}>US food price monitor</a><span aria-hidden="true">/</span><span>Retail prices</span></nav>
    <div className="hero"><div><h1>Retail prices</h1><p className="lede">What shoppers were offered: each week USDA reads the weekly ads of the major grocery chains and records what fresh produce was on sale, at what price, in how many stores{page.week ? `. This is the week ending ${dateLabel(page.week)}` : ''}.</p><p className="dk-hint">The commodity charts show what wholesale buyers paid; this is the retail end of the same chain. Prices are averages weighted by store count, sale prices rather than shelf prices, and an item that disappears was not advertised that week.</p></div></div>
    <div className="filters filters--single"><label>Region<select value={region} onChange={(e) => setRegion(e.target.value)}>{page.regions.map((r) => <option key={r}>{r}</option>)}</select></label></div>
    <Section title={`${region}`} hint={`${number(rows.length)} items advertised this week.`}>
      <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} empty="Nothing advertised in this region this week." />
    </Section>
  </>;
}
function About({ page }) {
  return <article className="prose">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><a href={HOME}>US food price monitor</a><span aria-hidden="true">/</span><span>About the data</span></nav>
    <h1>About the data</h1>
    <p className="lede">An open dataset of US produce prices for {number(page.commodityCount)} fruits and vegetables: what growers were paid, what wholesale buyers paid and what supermarkets advertised. The source is the US Department of Agriculture (USDA), whose Market News service publishes these prices every business day. Collected after every report with <a href="https://www.kadoa.com">Kadoa</a>; the code is open source on <a href="https://github.com/kadoa-org/food-price-monitor">GitHub</a>.</p>
    <h2>How to read it</h2>
    <ul>
      <li>A price is USDA's low and high for one product in one market, in US dollars per package. Nothing is averaged or converted.</li>
      <li>Percentages compare the midpoint of that range with the nearest report 4 or 52 weeks earlier. Red is up, green is down.</li>
      <li>Gaps are real: a product is quoted only while its growing region is shipping. Charts leave them open instead of filling them in.</li>
      <li>Retail prices are sale prices from supermarket weekly ads, not shelf prices, and are kept on their own page.</li>
    </ul>
    <h2>Market news</h2>
    <p>USDA items are changes in the market tone USDA reporters record with each report. Markon items are crop updates from <a href="https://www.markon.com/news-press/">Markon</a>, a produce supplier, shown as short summaries with a link.</p>
    <p className="dk-hint">Updated every business day; last update {dateLabel(page.common.generatedAt.slice(0, 10))}. USDA data is public domain. For information only.</p>
  </article>;
}
export default function App({ page }) {
  return <Shell page={page}>{page.kind === 'home' ? <Overview page={page} /> : page.kind === 'commodity' ? <Commodity page={page} /> : page.kind === 'retail' ? <Retail page={page} /> : page.kind === 'commodities' ? <Commodities page={page} /> : <About page={page} />}</Shell>;
}
