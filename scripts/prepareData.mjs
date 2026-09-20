import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { BASE, RETAIL, addDays, curated, familyFor, marketKey, newsFamilies, groupSeries, markonNews, nearest, pickBenchmark, reports, summarize, usdaNews } from '../src/model.mjs';
import { existsSync } from 'node:fs';

const root = resolve(import.meta.dirname, '..');
const dataset = process.env.FOOD_PRICES_DATASET_DIR || resolve(root, '../kadoa-backend/services/custom/datasets/food-prices');
const pointer = JSON.parse(await readFile(join(dataset, 'exports/latest.json'), 'utf8'));
if (!/^[a-zA-Z0-9_.-]+$/.test(pointer.path)) throw new Error('Invalid export pointer');
const dir = join(dataset, 'exports', pointer.path);
const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
// Streams the gzip NDJSON export. Every food commodity becomes a page; the six curated ones are featured.
const rows = [];
const familyByCommodity = new Map();
let total = 0;
for await (const line of createInterface({ input: createReadStream(join(dir, manifest.files.ndjson)).pipe(createGunzip()), crlfDelay: Infinity })) {
  if (!line) continue;
  total++;
  const row = JSON.parse(line);
  if (!familyByCommodity.has(row.commodity)) familyByCommodity.set(row.commodity, familyFor(row.commodity));
  if (familyByCommodity.get(row.commodity)) rows.push(row);
}
const wanted = new Map([...familyByCommodity.entries()].filter(([, f]) => f).map(([c, f]) => [c, f.slug]));
// Retail-only commodities have no price history to chart, so they get no page.
const wholesaleCommodities = new Set(rows.filter((r) => r.market_stage !== RETAIL).map((r) => r.commodity));
const families = [...curated, ...[...familyByCommodity.values()].filter((f) => f?.auto && wholesaleCommodities.has(f.matches[0])).sort((a, b) => a.name.localeCompare(b.name))];
if (total !== manifest.rows) throw new Error(`Export row count mismatch: ${total} lines, manifest says ${manifest.rows}`);

// Market news merges two sources: USDA's own report comments (public domain, derived from the price records) and
// Markon crop updates from the Kadoa workflow (optional; attributed, short quotes only, never in downloads).
const newsPath = join(dataset, 'exports/news.json');
const newsFile = existsSync(newsPath) ? JSON.parse(await readFile(newsPath, 'utf8')) : null;
const markonItems = (newsFile?.articles ?? []).map((a) => ({ ...markonNews(a), families: newsFamilies(a, families) })).filter((a) => a.families.length);
const feed = [...markonItems];
const sourceUrl = (sourceId) => `https://mymarketnews.ams.usda.gov/viewReport/${sourceId.replace('usda-', '')}`;
const data = join(root, 'public/data');
await rm(data, { recursive: true, force: true });
for (const sub of ['commodity', 'series', 'downloads']) await mkdir(join(data, sub), { recursive: true });
const cell = (v) => { const text = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? ''); return `"${(/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`; };
// Flat CSV: the product attributes people filter on become columns instead of a JSON blob.
const csvFields = ['date', 'period_start', 'period_end', 'commodity', 'market_stage', 'market', 'district', 'origin', 'variety', 'properties', 'size', 'grade', 'organic', 'qualifier', 'package', 'currency', 'low', 'high', 'mostly_low', 'mostly_high', 'advertised_average', 'comment', 'series_id', 'report_id'];
const flat = (r) => ({ ...r, district: r.dimensions.district, origin: r.dimensions.origin, variety: r.dimensions.var ?? r.dimensions.variety, properties: r.dimensions.properties, size: r.dimensions.item_size ?? r.dimensions.size, grade: r.dimensions.grade, organic: r.dimensions.organic, qualifier: r.dimensions.qualifier, report_id: r.source_id.replace('usda-', '') });
const na = (v) => (v === 'N/A' ? '' : v);
const toCsv = (list) => [csvFields.join(','), ...list.map((r) => { const f = flat(r); return csvFields.map((k) => cell(na(f[k]))).join(','); })].join('\n') + '\n';
// Page payloads carry a slim series list; product attributes travel with the series file, fetched on demand.
const meta = (s) => ({ id: s.id, source_id: s.source_id, market: s.market, stage: s.stage, origin: s.origin, package: s.package, product: s.product, lastDate: s.lastDate, latest: { date: s.latest.date, low: s.latest.low, high: s.latest.high, advertised_average: s.latest.advertised_average } });
// Series files carry only what changes per report; product attributes live once on the series.
const compact = ({ id, date, period_start, period_end, low, high, mostly_low, mostly_high, advertised_average, comment, ambiguous, evidence }) => ({ id, date, period_start, period_end, low, high, mostly_low, mostly_high, advertised_average, comment, ...(ambiguous ? { ambiguous } : {}), evidence });
const compactAll = (list) => list.map(compact);
const lastDate = rows.map((r) => r.date).sort().at(-1);
const firstDate = rows.map((r) => r.date).sort()[0];
const newsCutoff = addDays(lastDate, -90);
const common = { generatedAt: manifest.generatedAt, sourceRun: manifest.runId, lastDate, firstDate, totalRows: rows.length, datasetRows: manifest.rows, news: { markon: newsFile ? { fetchedAt: newsFile.fetchedAt, articles: markonItems.length, latest: markonItems[0]?.date ?? null } : null, since: newsCutoff } };

const featured = [];
const index = [];
const retailRows = [];
const summaries = [];
const byFamily = Map.groupBy(rows, (r) => wanted.get(r.commodity));
for (const family of families) {
  const familyRows = byFamily.get(family.slug) ?? [];
  if (!familyRows.length) throw new Error(`No source data for ${family.name}`);
  const groups = groupSeries(familyRows, family.matches[0]);
  feed.push(...usdaNews(familyRows, family, newsCutoff, sourceUrl));
  for (const group of groups) await writeFile(join(data, 'series', `${group.id}.json`), JSON.stringify({ dimensions: group.dimensions, observations: compactAll(group.observations) }));
  const wholesale = groups.filter((s) => !s.retail);
  if (!wholesale.length) throw new Error(`No wholesale or shipping-point series for ${family.name}`);
  const benchmark = pickBenchmark(wholesale, lastDate, family.prefer ?? []);
  const dates = familyRows.map((r) => r.date).sort();
  const summary = { slug: family.slug, name: family.name, singular: family.singular, description: family.description, curated: !family.auto, emoji: family.emoji ?? null, rows: familyRows.length, seriesCount: wholesale.length, markets: new Set(wholesale.map((s) => `${s.stage}/${s.market}`)).size, stages: [...new Set(wholesale.map((s) => s.stage))].sort(), firstDate: dates[0], lastDate: dates.at(-1), retailSeries: groups.length - wholesale.length };
  summaries.push(summary);
  const bench = summarize(benchmark);
  const entry = { summary, benchmark: { ...meta(benchmark), retail: benchmark.retail, ...bench, latest: compact(bench.latest), monthAgo: bench.monthAgo && compact(bench.monthAgo), yearAgo: bench.yearAgo && compact(bench.yearAgo), yearLow: bench.yearLow && compact(bench.yearLow), yearHigh: bench.yearHigh && compact(bench.yearHigh) } };
  if (!family.auto) featured.push(entry);
  index.push({ slug: family.slug, name: family.name, curated: !family.auto, stages: summary.stages, markets: summary.markets, seriesCount: summary.seriesCount, firstDate: summary.firstDate, lastDate: summary.lastDate, product: benchmark.product, market: benchmark.market, stage: benchmark.stage, package: benchmark.package, latest: compact(bench.latest), yearAgo: bench.yearAgo && compact(bench.yearAgo), yearChange: bench.yearChange, matches: family.matches });
  await writeFile(join(data, 'commodity', `${family.slug}.json`), JSON.stringify({ kind: 'commodity', key: `commodity/${family.slug}`, title: family.auto ? `${family.name} prices` : `${family.singular} prices`, summary, markets: [...new Set(wholesale.map(marketKey))].sort(), series: wholesale.filter((x) => marketKey(x) === marketKey(benchmark)).map(meta), seriesTotal: wholesale.length, initialSeriesId: benchmark.id, initialDimensions: benchmark.dimensions, initialObservations: compactAll(benchmark.observations), common }));
  // The full product list loads after first paint; potatoes alone has close to 4,000 products.
  await writeFile(join(data, 'commodity', `${family.slug}.series.json`), JSON.stringify(wholesale.map(meta)));
  await writeFile(join(data, 'downloads', `${family.slug}.csv`), toCsv(familyRows));
  // Retail promotions: one row per advertised item and region, with the same-week comparisons USDA readers expect.
  for (const s of groups.filter((g) => g.retail)) {
    const latest = s.latest;
    const weekAgo = nearest(s.observations, addDays(latest.date, -7), 3);
    const yearAgo = nearest(s.observations, addDays(latest.date, -364), 4);
    const price = latest.advertised_average; const yearPrice = yearAgo?.advertised_average ?? null;
    retailRows.push({ id: s.id, slug: family.slug, family: family.name, commodity: s.commodity, product: s.product, package: s.package, region: s.market, date: latest.date, price, stores: latest.evidence?.store_count ?? null, weekAgo: weekAgo?.advertised_average ?? null, yearAgo: yearPrice, yearChange: price && yearPrice ? ((price - yearPrice) / yearPrice) * 100 : null, count: s.count });
  }
}
const sortFeed = (list) => [...list].sort((a, b) => b.date.localeCompare(a.date) || (a.source === 'Markon' ? -1 : 1) || a.title.localeCompare(b.title));
const familyFeed = (slug) => sortFeed(feed.filter((i) => i.families.includes(slug) && i.date >= newsCutoff)).slice(0, 30).map((i) => ({ ...i, notes: i.notes.filter((n) => !n.commodity || families.find((f) => f.slug === slug).news.test(n.commodity)) }));
for (const family of families) {
  const path = join(data, 'commodity', `${family.slug}.json`);
  const page = JSON.parse(await readFile(path, 'utf8'));
  await writeFile(path, JSON.stringify({ ...page, news: familyFeed(family.slug), common: { ...page.common, news: common.news } }));
}
const retailWeek = retailRows.map((r) => r.date).sort().at(-1) ?? null;
const currentRetail = retailRows.filter((r) => r.date === retailWeek).sort((a, b) => a.family.localeCompare(b.family) || (b.stores ?? 0) - (a.stores ?? 0) || a.product.localeCompare(b.product));
const regions = [...new Set(currentRetail.map((r) => r.region))].sort((a, b) => (a === 'National' ? -1 : b === 'National' ? 1 : a.localeCompare(b)));
await writeFile(join(data, 'home.json'), JSON.stringify({ kind: 'home', key: 'home', title: 'US food price monitor', common, featured, retail: { week: retailWeek, rows: currentRetail.filter((r) => r.region === 'National') }, news: sortFeed([...sortFeed(feed.filter((i) => i.source === 'Markon')).slice(0, 3), ...sortFeed(feed.filter((i) => i.source === 'USDA')).slice(0, 3)]).map(({ notes, ...i }) => i) }));
await writeFile(join(data, 'retail.json'), JSON.stringify({ kind: 'retail', key: 'retail', title: 'Retail prices', common, week: retailWeek, regions, rows: currentRetail }));
const sources = manifest.sources.map((s) => ({ ...s, ...(reports[s.source_id] ?? { name: s.source_id, stage: 'Unknown', cadence: 'Unknown' }), reportId: s.source_id.replace('usda-', ''), commodities: s.commodities.length }));
await writeFile(join(data, 'about.json'), JSON.stringify({ kind: 'about', key: 'about', title: 'About the data', common, sources, commodityCount: families.length, commodities: summaries.filter((c) => c.curated) }));
await writeFile(join(data, 'commodities.json'), JSON.stringify({ kind: 'commodities', key: 'commodities', title: 'Commodities', common, items: index }));
await writeFile(join(data, 'routes.json'), JSON.stringify([{ path: BASE, key: 'home' }, { path: `${BASE}/commodities`, key: 'commodities' }, ...families.map((f) => ({ path: `${BASE}/commodity/${f.slug}`, key: `commodity/${f.slug}` })), { path: `${BASE}/retail`, key: 'retail' }, { path: `${BASE}/about`, key: 'about' }]));
console.log(JSON.stringify({ commodities: families.length, news: feed.length, markon: markonItems.length, rows: rows.length, datasetRows: manifest.rows, commodities: summaries.length, retailRows: currentRetail.length, sourceRun: manifest.runId, lastDate }));
