import React, { useEffect, useState } from 'react';
import { Button, DataTable, GitHubButton, LiveBadge, NavBar, SearchInput, Section, SiteFooter, SiteHeader, Tag } from './kit';
import CommandPalette from './CommandPalette';
import { BASE, HOME, addDays, dataPath, seriesUrl, dateLabel, families, gapNote, marketKey, money, monthLabel, number, pctLabel, quote, reports, shortMarket, summarize, unitLabel } from './model.mjs';
import PriceChart from './PriceChart';
import { ChangeTag, ChartCard, FilterSelect, KeyFigures, SectionHeading } from './Figures';
import BandChart from './BandChart';
import EvidenceDialog from './EvidenceDialog';

const url = (slug) => `${BASE}/commodity/${slug}`;
// The file is gzipped: a full history runs to tens of megabytes as plain CSV, and compressing it is what keeps a
// daily publish to minutes rather than a gigabyte of upload. The label says so rather than surprising anyone.
function Download({ slug, common, children = 'Download CSV (gzip)' }) { return <a className="dk-btn" href={`${dataPath(common)}/downloads/${slug}.csv.gz`} download>{children}</a>; }
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
  return <article className="panel">
    <div className="panel-head">
      <div><a href={url(f.summary.slug)}>{f.summary.name}</a><span className="panel-market">{shortMarket(b.market, b.stage)}</span></div>
      {b.yearAgo && <div className="panel-delta" title={`A year earlier: ${quote(b.yearAgo)}, ${dateLabel(b.yearAgo.date)}`}><ChangeTag value={b.yearChange} /><span className="panel-market">past year</span></div>}
    </div>
    <div className="panel-price"><span className="panel-value">{quote(b.latest)}</span><span className="panel-sub">{unitLabel(b.package)}</span></div>
    <BandChart rows={b.sparkline} startDate={start} endDate={common.lastDate} name={f.summary.name.toLowerCase()} />
  </article>;
}
function Change({ value }) {
  if (value === null || value === undefined) return <span className="dk-hint">No comparison</span>;
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : '';
  return <span className={`change change--${dir}`}>{dir && <span className={`tri ${dir === 'down' ? 'tri--down' : ''}`} aria-hidden="true" />}{pctLabel(value)}</span>;
}
// One full-width table, sorted by change, so the biggest rise is the first row and the biggest fall the last. Every
// row holds the same six facts on one or two lines, so rows share a height and the eye can run down each column.
function MoversTable({ movers }) {
  const rows = [...movers.rising, ...movers.falling].sort((a, b) => b.weekChange - a.weekChange);
  const columns = [
    { key: 'name', header: 'Commodity', render: (r) => <a className="cell-link" href={url(r.slug)}>{r.name}</a> },
    { key: 'weekAgo', header: 'Last week', align: 'right', hideBelow: 'sm', render: (r) => <span className="cell-nowrap">{quote(r.weekAgo)}</span> },
    { key: 'latest', header: 'This week', align: 'right', render: (r) => <span className="cell-nowrap">{quote(r.latest)}</span> },
    { key: 'weekChange', header: 'Change', align: 'right', render: (r) => <Change value={r.weekChange} /> },
  ];
  return <DataTable rows={rows} columns={columns} rowKey={(r) => r.slug} empty="No benchmark moved this week." />;
}
// The home page headlines, chosen from reader interviews: which way wholesale prices are heading and the two foods
// moving most, all over the same four weeks so one line of context covers the row. Foods lead and percentages
// follow, because a reader remembers "sweet corn doubled" and not "100 per cent". The price index is deliberately
// absent: it did not track the official figures closely enough to headline.
function HomeHeadlines({ breadth }) {
  if (!breadth?.total) return null;
  const { rose, fell, riser, faller, asOf } = breadth;
  const moved = rose + fell;
  const share = moved ? rose / moved : null;
  // Within five points of even is called mixed: a 52 to 48 split is not a direction.
  const direction = share === null ? null : share >= 0.55 ? 'Mostly rising' : share <= 0.45 ? 'Mostly falling' : 'Mixed';
  const mover = (m, label) => m && { label, value: <a href={`${BASE}/commodity/${m.slug}`}>{m.name}</a>, note: <ChangeTag value={m.change} size="small" /> };
  return <KeyFigures
    label="Headlines"
    heading="Wholesale prices, past 4 weeks"
    description="Each food's benchmark price against 4 weeks earlier, from USDA market reports."
    date={`Up to and including ${dateLabel(asOf)}`}
    items={[
      direction && { label: 'Overall', value: direction, note: `${rose} foods up, ${fell} down` },
      mover(riser, 'Largest rise'),
      mover(faller, 'Largest fall'),
    ]}
  />;
}
// Grocery staples on their own, because they run on a different clock: BLS publishes store prices monthly, and a
// shopper's question is the year-on-year one. Every staple is shown, so the count is never the only answer.
const stapleUnit = (unit) => (/doz/.test(unit) ? 'dozen' : /gal/.test(unit) ? 'gallon' : 'lb');
function Staples({ staples }) {
  if (!staples?.items?.length) return null;
  return <section className="staples">
    <SectionHeading description="Average US store prices against the same month a year earlier, from BLS." date={`Up to and including ${monthLabel(staples.month)}`}>Grocery staples, past year</SectionHeading>
    <ul className="staples__grid">
      {staples.items.map((r) => <li className="staples__item" key={r.slug}>
        <a href={`${BASE}/commodity/${r.slug}`}>{r.name}</a>
        <span className="staples__price">{money(r.price)} <span className="staples__unit">a {stapleUnit(r.unit)}</span></span>
        <ChangeTag value={r.change} size="small" />
      </li>)}
    </ul>
  </section>;
}
function Overview({ page }) {
  const { common, featured, retail } = page;
  const panels = [...featured].sort((a, b) => (b.benchmark.yearChange ?? -Infinity) - (a.benchmark.yearChange ?? -Infinity));
  const featuredSlugs = new Set(featured.map((f) => f.summary.slug));
  const seen = new Set(); const retailRows = retail.rows.filter((r) => featuredSlugs.has(r.slug) && (seen.has(r.family) ? false : (seen.add(r.family), true)));
  const retailColumns = [
    { key: 'item', header: 'Item', render: (r) => <><a className="cell-link" href={url(r.slug)}>{r.family}</a><span className="cell-note">{r.product === r.commodity ? '' : r.product}</span></> },
    { key: 'price', header: 'Ad price', align: 'right', render: (r) => money(r.price) },
    { key: 'yearAgo', header: 'A year earlier', align: 'right', hideBelow: 'sm', render: (r) => money(r.yearAgo) },
    { key: 'yearChange', header: 'Change, 1 year', align: 'right', render: (r) => <Change value={r.yearAgo === null ? null : r.yearChange} /> },
    { key: 'stores', header: 'Stores', align: 'right', hideBelow: 'sm', render: (r) => (r.stores === null ? '' : number(r.stores)) },
  ];
  return <>
    <div className="title-block"><h1>US food price monitor</h1><p className="lede">Daily US food prices, wholesale and retail, from USDA and BLS.</p></div>
    <HomeHeadlines breadth={page.breadth} />
    <Staples staples={page.breadth?.staples} />
    <Section title="Benchmark prices" right={<a href={`${BASE}/commodities`}>All commodities</a>}>
      <div className="board">{panels.map((f) => <Panel key={f.summary.slug} f={f} common={common} />)}</div>
    </Section>
    {page.movers && (page.movers.rising.length > 0 || page.movers.falling.length > 0) && <Section title="Biggest moves this week" hint="Wholesale benchmarks, compared with a week earlier.">
      <MoversTable movers={page.movers} />
    </Section>}
    <Section title="Retail prices" hint="What US supermarkets advertised this week, averaged across stores." right={<a href={`${BASE}/retail`}>All items and regions</a>}>
      <DataTable rows={retailRows} columns={retailColumns} rowKey={(r) => r.id} empty="No retail report this week." />
    </Section>
    <Section title="Market news"><NewsList items={page.news.slice(0, 6)} compact /></Section>
  </>;
}
function NewsList({ items, showFamilies = false, showNotes = false, compact = false }) {
  return <ul className={`news-list${compact ? ' news-list--compact' : ''}`}>{items.map((a) => <li key={a.id}>
    <div className="news-head"><span className="news-source">{a.source}</span><a href={a.url} target="_blank" rel="noreferrer">{a.title}</a><span className="dk-hint news-date">{dateLabel(a.date).replace(/ \d{4}$/, '')}</span></div>
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
// A monthly series has one point in 30 days, so it offers the windows that hold enough of them to read.
const MONTHLY_RANGES = [['365', '1 year'], ['1825', '5 years'], ['all', 'All']];
// GOV.UK treats a select as a last resort. One option is not a choice, so it is shown as a fact instead of a control.
function Choice({ label, value, options, onChange, className = '' }) {
  if (options.length === 1) return <div className={`filter-fact ${className}`.trim()}><span className="filter-fact-label">{label}</span><span className="filter-fact-value">{options[0].label}</span></div>;
  return <label className={className || undefined}>{label}<select value={value} title={options.find((o) => o.value === value)?.label} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select></label>;
}
function Commodity({ page }) {
  const initial = page.series.find((s) => s.id === page.initialSeriesId);
  const [market, setMarket] = useState(marketKey(initial)); const [pack, setPack] = useState(initial.package); const [seriesId, setSeriesId] = useState(initial.id);
  const [range, setRange] = useState('365'); const [evidence, setEvidence] = useState(null); const [visible, setVisible] = useState(25); const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [history, setHistory] = useState({ id: initial.id, rows: page.initialObservations, dimensions: page.initialDimensions, reportTitle: page.initialReportTitle, error: false });
  // The page ships only the products of the initial market; the full list arrives after first paint.
  const [allSeries, setAllSeries] = useState(page.series);
  useEffect(() => { if (page.seriesTotal <= page.series.length) return; const controller = new AbortController(); fetch(`${dataPath(page.common)}/commodity/${page.summary.slug}.series.json`, { signal: controller.signal }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))).then(setAllSeries).catch(() => {}); return () => controller.abort(); }, [page]);
  const markets = page.markets ?? [...new Set(allSeries.map(marketKey))].sort();
  const marketSeries = allSeries.filter((s) => marketKey(s) === market); const packs = [...new Set(marketSeries.map((s) => s.package))].sort(); const options = marketSeries.filter((s) => s.package === pack); const selected = options.find((s) => s.id === seriesId) ?? options[0];
  useEffect(() => { if (history.id === selected.id) return; const controller = new AbortController(); fetch(seriesUrl(page.common, selected), { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }).then((file) => setHistory({ id: selected.id, rows: file.observations, dimensions: file.dimensions, reportTitle: file.report_title, error: false })).catch((error) => { if (error.name !== 'AbortError') setHistory({ id: selected.id, rows: [], dimensions: {}, reportTitle: null, error: true }); }); return () => controller.abort(); }, [selected.id, history.id]);
  const pending = history.id !== selected.id;
  // The national egg index reports one value per day rather than a low and a high; retail ads do too.
  const monthly = selected.source_id.startsWith('bls-');
  const retail = selected.stage === 'Retail promotion' || (!pending && history.rows.length > 0 && history.rows.every((r) => r.low === null && r.high === null));
  const series = { ...selected, observations: history.rows };
  const summary = pending || !history.rows.length ? null : summarize(series);
  const endDate = summary ? summary.latest.date : selected.lastDate;
  const startDate = range === 'all' ? null : addDays(endDate, -Number(range));
  const filtered = pending ? [] : history.rows.filter((r) => !startDate || r.date >= startDate);
  const sorted = [...filtered].sort((a, b) => { const av = a[sort.key], bv = b[sort.key]; if (av == null) return bv == null ? 0 : 1; if (bv == null) return -1; return (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))) * (sort.dir === 'asc' ? 1 : -1); });
  function changeMarket(value) { const next = allSeries.find((s) => marketKey(s) === value); if (!next) return; setMarket(value); setPack(next.package); setSeriesId(next.id); setVisible(25); }
  function changePack(value) { setPack(value); setSeriesId(marketSeries.find((s) => s.package === value).id); setVisible(25); }
  const columns = [
    { key: 'date', header: 'Report date', sortable: true, render: (r) => dateLabel(r.date) },
    ...(retail ? [{ key: 'advertised_average', header: selected.stage === 'Retail promotion' ? 'Advertised average' : 'Average', sortable: true, align: 'right', render: (r) => (r.ambiguous ? 'Conflicting records' : money(r.advertised_average)) }] : [{ key: 'low', header: 'Low', sortable: true, align: 'right', render: (r) => (r.ambiguous ? 'Conflicting records' : money(r.low)) },
    { key: 'high', header: 'High', sortable: true, align: 'right', render: (r) => (r.ambiguous ? '' : money(r.high)) }]),
    { key: 'mostly_low', header: 'Most sales', align: 'right', hideBelow: 'sm', render: (r) => (r.mostly_low === null && r.mostly_high === null ? '' : [r.mostly_low, r.mostly_high].filter((v) => v !== null).map(money).join(' to ')) },
    { key: 'comment', header: 'USDA note', hideBelow: 'md', render: (r) => r.comment ?? '' },
    { key: 'source', header: 'Source', render: (r) => <button className="text-button" onClick={() => setEvidence(r)} aria-label={`View USDA record for ${dateLabel(r.date)}`}>View</button> },
  ];
  const unit = unitLabel(selected.package);
  return <>
    <div className="hero detail-hero"><div><h1>{page.title}</h1><p className="lede">{page.summary.description}</p><p className="dk-hint">{number(page.summary.seriesCount)} {page.summary.seriesCount === 1 ? 'product' : 'products'} in {page.summary.markets} {page.summary.markets === 1 ? 'market' : 'markets'}, {dateLabel(page.summary.firstDate)} to {dateLabel(page.summary.lastDate)}.</p></div><Download slug={page.summary.slug} common={page.common} /></div>
    <div className="filters">
      <Choice label="Market" value={market} options={markets.map((m) => ({ value: m, label: m, disabled: allSeries.length < page.seriesTotal && !allSeries.some((s) => marketKey(s) === m) }))} onChange={changeMarket} />
      <Choice label="Package" value={pack} options={packs.map((p) => ({ value: p, label: p }))} onChange={changePack} />
      <Choice className="product-select" label="Product" value={selected.id} options={options.map((s) => ({ value: s.id, label: `${s.product}${s.origin ? `, ${s.origin}` : ''}${s.lastDate !== page.common.lastDate ? ` (last quoted ${dateLabel(s.lastDate)})` : ''}` }))} onChange={(v) => { setSeriesId(v); setVisible(25); }} />
    </div>
    {/* One row of figures above the chart card: where the price is, how it moved, and its range over the year. */}
    {summary && <KeyFigures items={[
      { label: 'Latest', value: quote(summary.latest), note: `${dateLabel(summary.latest.date)}, ${unit}` },
      { label: '4-week change', value: summary.monthAgo ? <ChangeTag value={summary.monthChange} /> : '–', note: summary.monthAgo ? `From ${quote(summary.monthAgo)}` : 'No quote to compare' },
      { label: 'Year change', value: summary.yearAgo ? <ChangeTag value={summary.yearChange} /> : '–', note: summary.yearAgo ? `From ${quote(summary.yearAgo)}` : 'No quote to compare' },
      summary.yearLow && summary.yearHigh && { label: '12-month range', value: `${money(summary.yearLow.low ?? summary.yearLow.high ?? summary.yearLow.advertised_average)} to ${money(summary.yearHigh.high ?? summary.yearHigh.low ?? summary.yearHigh.advertised_average)}`, note: 'Lowest and highest quote' },
    ]} />}
    <ChartCard
      id="chart-title"
      title="Price history"
      description={`${shortMarket(selected.market, selected.stage)}, ${unit}.${selected.lastDate !== page.common.lastDate ? ' Not in the newest report.' : ''}`}
      date={`Up to and including ${dateLabel(selected.lastDate)}`}
      tabs={[
        { label: 'Chart', content: <>
          <FilterSelect value={range} options={monthly ? MONTHLY_RANGES : RANGES} onChange={(v) => { setRange(v); setVisible(25); }} />
          <div className="chart-legend" aria-hidden="true"><span className="chart-legend__item"><span className="chart-legend__swatch" />Middle of the quoted range</span><span className="chart-legend__item"><span className="chart-legend__swatch chart-legend__swatch--gap" />No quotes</span></div>
          {pending ? <div className="chart-loading" role="status">Loading price history…<div className="skeleton-chart" aria-hidden="true" /></div> : history.error ? <div role="alert" className="chart-empty">Price history could not be loaded. <button className="text-button" onClick={() => setHistory({ id: '', rows: [], dimensions: {}, error: false })}>Retry</button></div> : <PriceChart rows={filtered} startDate={startDate ?? filtered[0]?.date} endDate={endDate} unit={unit} yTitle={`Price, ${unit}`} />}
          {!pending && gapNote(history.rows, startDate, endDate, monthly) && <p className="chart-gap-note">{gapNote(history.rows, startDate, endDate, monthly)}</p>}
        </> },
        { label: 'Tabular data', content: <>
          <p className="dk-hint table-intro">{pending ? 'Loading' : `${number(filtered.length)} reports in this period, ${unit}.`}</p>
          <DataTable rows={sorted.slice(0, visible)} columns={columns} rowKey={(r) => r.date} sort={sort} onSort={(key) => { setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' })); setVisible(25); }} empty={pending ? 'Loading…' : history.error ? 'History could not be loaded.' : 'No reports in this period.'} />
          {sorted.length > visible && <div className="table-more"><Button onClick={() => setVisible((n) => n + 50)}>Show more</Button><span className="dk-hint">Showing {visible} of {number(sorted.length)}</span></div>}
        </> },
        { label: 'Download', content: <>
          <p className="download-intro">Every report for {page.summary.name.toLowerCase()} in this dataset, all markets and products, as a gzipped CSV.</p>
          <Download slug={page.summary.slug} common={page.common} />
        </> },
      ]}
      footer={<p className="chart-note">Source: {selected.source_id.startsWith('usda-')
        ? <a href={`https://mymarketnews.ams.usda.gov/viewReport/${selected.source_id.replace('usda-', '')}`} target="_blank" rel="noreferrer">USDA Market News, {reports[selected.source_id]?.name ?? selected.source_id}</a>
        : <a href="https://www.bls.gov/cpi/factsheets/average-prices.htm" target="_blank" rel="noreferrer">US Bureau of Labor Statistics, average prices</a>}.</p>}
    />
    <NewsSection items={page.news} common={page.common} slug={page.summary.slug} />
    {evidence && <EvidenceDialog row={evidence} series={{ ...selected, commodity: selected.commodity ?? page.summary.name, dimensions: history.dimensions ?? {}, reportTitle: history.reportTitle }} onClose={() => setEvidence(null)} />}
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
    <div className="hero"><div><h1>Commodities</h1><p className="lede">{number(page.items.length)} commodities, each with its own page of markets, products and history.</p></div></div>
    <div className="dk-toolbar"><SearchInput value={query} onChange={setQuery} placeholder="Search commodities" width={280} /><label className="toolbar-select">Price type <select value={stage} onChange={(e) => setStage(e.target.value)}><option value="all">All</option><option value="Shipping point">Shipping point</option><option value="Wholesale">Wholesale</option></select></label><span className="dk-hint">{number(sorted.length)} of {number(page.items.length)}</span></div>
    <DataTable rows={sorted} columns={columns} rowKey={(c) => c.slug} sort={sort} onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))} empty="No commodity matches that search." />
    <p className="dk-hint" style={{ marginTop: 10 }}>The quote shown is the product USDA has quoted most consistently for that commodity over the past two years. Change compares range midpoints with the nearest report 52 weeks earlier.</p>
  </>;
}
function Retail({ page }) {
  const [region, setRegion] = useState(page.regions[0] ?? 'National'); const [sort, setSort] = useState({ key: 'yearChange', dir: 'desc' });
  const rows = page.rows.filter((r) => r.region === region);
  // Items without a year-earlier price have no change and sort last whichever way the column is sorted.
  const sortValue = (r, key) => (key === 'yearChange' ? (r.yearAgo === null ? null : r.yearChange) : key === 'product' ? (r.product === r.commodity ? r.commodity : r.product) : r[key]);
  const sorted = [...rows].sort((a, b) => { const av = sortValue(a, sort.key), bv = sortValue(b, sort.key); if (av == null) return bv == null ? 0 : 1; if (bv == null) return -1; return (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))) * (sort.dir === 'asc' ? 1 : -1); });
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
    <div className="hero"><div><h1>Retail prices</h1><p className="lede">Sale prices in US supermarket weekly ads, averaged across stores, from USDA's survey of the major grocery chains.</p>{page.week && <p className="dk-hint">Week ending {dateLabel(page.week)}.</p>}</div></div>
    <div className="filters filters--single"><label>Region<select value={region} onChange={(e) => setRegion(e.target.value)}>{page.regions.map((r) => <option key={r}>{r}</option>)}</select></label></div>
    <Section title={`${region}`} hint={`${number(rows.length)} items advertised this week.`}>
      <DataTable rows={sorted} columns={columns} rowKey={(r) => r.id} sort={sort} onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))} empty="Nothing advertised in this region this week." />
    </Section>
  </>;
}
function About({ page }) {
  return <article className="prose">
    <h1>About the data</h1>
    <p className="lede">Every business day the US Department of Agriculture (USDA) publishes food price data for about {number(page.commodityCount)} commodities:</p>
    <ul>
      <li>what growers were paid at shipping point</li>
      <li>what buyers paid at the big city wholesale markets</li>
      <li>what supermarkets advertised in their weekly ads</li>
    </ul>
    <p>The data comes out as dozens of separate text reports and PDFs, one per market, with no history and no way to see how a price has moved over time. We think public data should be simple to find and read, so <a href="https://www.kadoa.com">Kadoa</a> built an open-source tracker for it.</p>
    <p>The project is open source and contributions are welcome: <a href="https://github.com/kadoa-org/food-price-monitor">github.com/kadoa-org/food-price-monitor</a>.</p>
    <h2>How to read it</h2>
    <ul>
      <li>A price is USDA's low and high quote for one product in one market, in dollars per package, exactly as reported.</li>
      <li>A change compares the middle of that range with the report closest to 4 or 52 weeks earlier. Red means up, green means down.</li>
      <li>A chart stops where USDA stopped quoting, usually because the growing region is out of season. We leave those gaps open.</li>
      <li>Retail prices are sale prices from supermarket weekly ads, not shelf prices. They have their own page.</li>
    </ul>
    <p className="dk-hint">Updated every business day, last on {dateLabel(page.common.generatedAt.slice(0, 10))}. USDA data is public domain.</p>
  </article>;
}
export default function App({ page }) {
  return <Shell page={page}>{page.kind === 'home' ? <Overview page={page} /> : page.kind === 'commodity' ? <Commodity page={page} /> : page.kind === 'retail' ? <Retail page={page} /> : page.kind === 'commodities' ? <Commodities page={page} /> : <About page={page} />}</Shell>;
}
