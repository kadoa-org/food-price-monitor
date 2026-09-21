export const BASE = '/food-prices';
// kadoa.com strips trailing slashes, so every internal link is written without one.
export const HOME = BASE;
// Data files live under the site in development and under a published run folder (proxied to the CDN) in production.
export const dataPath = (common) => common?.dataPath ?? `${BASE}/data`;
// Series files sit at fixed paths shared across runs, named by content version; page files belong to one run.
export const sharedPath = (common) => common?.sharedPath ?? dataPath(common);
export const seriesUrl = (common, s) => `${sharedPath(common)}/series/${s.id}.${s.v}.json`;
export const DAY = 86400000;
export const curated = [
  { slug: 'onions', name: 'Onions', singular: 'Onion', emoji: '🧅', news: /\bonions?\b/i, matches: ['Onions, Dry'], description: 'Dry onions by variety, size, origin and package.' },
  { slug: 'potatoes', name: 'Potatoes', singular: 'Potato', emoji: '🥔', news: /\bpotato(es)?\b/i, matches: ['Potatoes'], description: 'Russet, red, yellow and white potatoes by growing region, size and package.' },
  { slug: 'tomatoes', name: 'Tomatoes', singular: 'Tomato', emoji: '🍅', news: /\btomato(es)?\b|\bromas?\b/i, matches: ['Tomatoes', 'Tomatoes, Plum Type', 'Tomatoes, Cherry', 'Tomatoes, Grape Type'], prefer: ['Tomatoes'], preferSeries: (s) => s.market === 'New York Terminal Market' && s.commodity === 'Tomatoes', description: 'Round, plum, cherry and grape tomatoes, kept as separate products.' },
  { slug: 'lettuce', name: 'Lettuce', singular: 'Lettuce', emoji: '🥬', featured: false, news: /\blettuce\b|\biceberg\b|\bromaine\b|\bgreen leaf\b|\bred leaf\b|\bbutter lettuce\b/i, matches: ['Lettuce', 'Lettuce, Romaine', 'Lettuce, Mesculin Mix', 'Lettuce, Green Leaf', 'Lettuce, Boston', 'Lettuce, Iceberg', 'Lettuce, Frisee', 'Lettuce, Red Leaf'], prefer: ['Lettuce, Iceberg', 'Lettuce, Romaine', 'Lettuce'], description: 'Iceberg, romaine and leaf lettuce by origin and package.' },
  { slug: 'avocados', name: 'Avocados', singular: 'Avocado', emoji: '🥑', news: /\bavocados?\b|\bhass\b/i, matches: ['Avocados'], description: 'Hass and greenskin avocados by origin, size and package.' },
  { slug: 'strawberries', name: 'Strawberries', singular: 'Strawberry', emoji: '🍓', news: /\bstrawberr(y|ies)\b/i, matches: ['Strawberries'], description: 'Strawberries by origin and package.' },
  { slug: 'eggs', name: 'Eggs', singular: 'Egg', emoji: '🥚', news: /\beggs?\b/i, matches: ['Shell Eggs', 'Egg'], preferSeries: (s) => s.market === 'New York' && /^Large\b/.test(s.product), description: 'Shell eggs by size, colour and housing: New York volume prices to retail buyers and the national weighted index, in dollars per dozen.' },
  { slug: 'beef', name: 'Beef', singular: 'Beef', emoji: '🥩', featured: false, news: /\bbeef\b|\bcattle\b/i, matches: ['Beef'], preferSeries: (s) => /^national$/i.test(s.market) && /^Ground Beef 80-89%, Ground, 1-2 Lbs$/.test(s.product), description: 'Beef cuts advertised in US supermarket weekly ads, by region, weighted by store count.' },
  { slug: 'pork', name: 'Pork', singular: 'Pork', emoji: '🥓', featured: false, news: /\bpork\b|\bhogs?\b/i, matches: ['Pork'], preferSeries: (s) => /^national$/i.test(s.market) && /^Sliced Bacon, Processed, 1-2 Lbs$/.test(s.product), description: 'Pork cuts advertised in US supermarket weekly ads, by region, weighted by store count.' },
  { slug: 'chicken', name: 'Chicken', singular: 'Chicken', emoji: '🍗', featured: false, news: /\bchicken\b|\bbroilers?\b/i, matches: ['Chicken'], preferSeries: (s) => /^national$/i.test(s.market) && /^Breast, Boneless\/Skinless/.test(s.product), description: 'Chicken cuts advertised in US supermarket weekly ads, by region, weighted by store count.' },
  { slug: 'turkey', name: 'Turkey', singular: 'Turkey', emoji: '🦃', featured: false, news: /\bturkeys?\b/i, matches: ['Turkey'], description: 'Turkey cuts advertised in US supermarket weekly ads, by region, weighted by store count.' },
];
export const families = curated;
// Decorative lines USDA quotes alongside food. Never published.
export const NONFOOD = new Set(['Corn Stalks', 'Ornamental Corn', 'Ornamental Gourds', 'Straw Bales', 'N/A']);
export const slugify = (name) => name.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const escapeRe = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Every commodity USDA quotes becomes a family; curated ones merge sub-commodities and carry an emoji.
export function autoFamily(commodity) {
  const words = commodity.replace(/\(.*?\)/g, ' ').split(/[\s,/]+/).filter((w) => w && !/^(type|types|dry)$/i.test(w));
  const pattern = words.map((w) => `(?=.*\\b${escapeRe(w.toLowerCase().replace(/s$/, ''))}s?\\b)`).join('');
  return { slug: slugify(commodity), name: commodity, singular: commodity, matches: [commodity], description: `${commodity} by market, product and package.`, news: new RegExp(`^${pattern}`, 'i'), auto: true };
}
export const familyFor = (commodity) => curated.find((f) => f.matches.includes(commodity)) ?? (NONFOOD.has(commodity) ? null : autoFamily(commodity));
// USDA report metadata for the about page. IDs match sources.json in the dataset pipeline.
export const reports = {
  'usda-2393': { name: 'Idaho Falls shipping point onions and potatoes', stage: 'Shipping Point', cadence: 'Daily' },
  'usda-2316': { name: 'New York wholesale onions and potatoes', stage: 'Terminal', cadence: 'Daily' },
  'usda-2292': { name: 'Chicago wholesale onions and potatoes', stage: 'Terminal', cadence: 'Daily' },
  'usda-2308': { name: 'Los Angeles wholesale onions and potatoes', stage: 'Terminal', cadence: 'Daily' },
  'usda-2315': { name: 'New York wholesale vegetables', stage: 'Terminal', cadence: 'Daily' },
  'usda-2391': { name: 'Fresno shipping point vegetables', stage: 'Shipping Point', cadence: 'Daily, in season' },
  'usda-2390': { name: 'Fresno shipping point fruit', stage: 'Shipping Point', cadence: 'Daily, in season' },
  'usda-3324': { name: 'US retail produce promotions', stage: 'Retail - Specialty Crops', cadence: 'Weekly' },
  'usda-2314': { name: 'New York wholesale fruit', stage: 'Terminal', cadence: 'Daily' },
  'usda-2290': { name: 'Chicago wholesale fruit', stage: 'Terminal', cadence: 'Daily' },
  'usda-2291': { name: 'Chicago wholesale vegetables', stage: 'Terminal', cadence: 'Daily' },
  'usda-2306': { name: 'Los Angeles wholesale fruit', stage: 'Terminal', cadence: 'Daily' },
  'usda-2307': { name: 'Los Angeles wholesale vegetables', stage: 'Terminal', cadence: 'Daily' },
  'usda-2277': { name: 'Atlanta wholesale fruit', stage: 'Terminal', cadence: 'Daily' },
  'usda-2278': { name: 'Atlanta wholesale vegetables', stage: 'Terminal', cadence: 'Daily' },
  'usda-2279': { name: 'Atlanta wholesale onions and potatoes', stage: 'Terminal', cadence: 'Daily' },
  'usda-2285': { name: 'Boston wholesale fruit', stage: 'Terminal', cadence: 'Daily' },
  'usda-2286': { name: 'Boston wholesale vegetables', stage: 'Terminal', cadence: 'Daily' },
  'usda-2287': { name: 'Boston wholesale onions and potatoes', stage: 'Terminal', cadence: 'Daily' },
  'usda-2318': { name: 'Philadelphia wholesale fruit', stage: 'Terminal', cadence: 'Daily' },
  'usda-2319': { name: 'Philadelphia wholesale vegetables', stage: 'Terminal', cadence: 'Daily' },
  'usda-2320': { name: 'Philadelphia wholesale onions and potatoes', stage: 'Terminal', cadence: 'Daily' },
  'usda-2734': { name: 'New York shell eggs', stage: 'Terminal', cadence: 'Daily' },
  'usda-2843': { name: 'National shell egg index', stage: 'Terminal', cadence: 'Daily' },
  'usda-2757': { name: 'US grocery store egg features', stage: 'Retail - Livestock/Poultry/Egg', cadence: 'Weekly' },
  'usda-3228': { name: 'US grocery store beef features', stage: 'Retail - Livestock/Poultry/Egg', cadence: 'Weekly' },
  'usda-2868': { name: 'US grocery store pork features', stage: 'Retail - Livestock/Poultry/Egg', cadence: 'Weekly' },
  'usda-2756': { name: 'US grocery store chicken features', stage: 'Retail - Livestock/Poultry/Egg', cadence: 'Weekly' },
  'usda-2867': { name: 'US grocery store turkey features', stage: 'Retail - Livestock/Poultry/Egg', cadence: 'Weekly' },
};
export const RETAIL = 'Retail - Specialty Crops';
export const RETAIL_STAGES = new Set(['Retail - Specialty Crops', 'Retail - Livestock/Poultry/Egg']);
export const isRetail = (stage) => RETAIL_STAGES.has(stage);
export const stageName = (s) => ({ 'Shipping Point': 'Shipping point', Terminal: 'Wholesale', 'Point of Sale - Eggs': 'Wholesale', 'Retail - Specialty Crops': 'Retail promotion', 'Retail - Livestock/Poultry/Egg': 'Retail promotion' }[s] ?? s);
// USDA writes 'N/A' and 'None' for attributes that do not apply; neither is a fact worth showing.
// Short market caption for dense layouts: "New York wholesale", "Idaho Falls shipping point".
export const shortMarket = (market, stage) => `${market.replace(/ FOB SC$/, '').replace(/ \(FR\)/, '').replace(/ Terminal Market$/, '')} ${stage.toLowerCase()}`;
export const clean = (v) => (v && v !== 'N/A' && v !== 'None' ? String(v) : '');
// USDA writes varieties and districts in capitals. Title case them for reading; leave mixed-case values alone.
const SMALL = new Set(['and', 'of', 'the', 'or', 'in', 'through', 'to', 'type']);
export const titleCase = (v) => { const text = clean(v); if (text !== text.toUpperCase() || !/[A-Z]/.test(text)) return text; return text.toLowerCase().replace(/[a-z][a-z']*/g, (w, i) => (i && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1))); };
export const number = (n) => new Intl.NumberFormat('en-US').format(n);
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n) => (n === null || n === undefined ? 'Not quoted' : usd.format(n));
// Compact form for dense tables: cents are dropped when every figure in the quote is a whole dollar, never otherwise,
// so "$60 to $62" and "$40.50 to $42.50" but not "$40.5 to $42.5".
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
export function quoteShort(row) {
  const values = row.advertised_average !== null && row.advertised_average !== undefined ? [row.advertised_average] : [row.low, row.high].filter((v) => v !== null && v !== undefined);
  if (!values.length) return 'Not quoted';
  const fmt = values.every(Number.isInteger) ? (n) => usdWhole.format(n) : money;
  if (values.length === 1 && row.low !== null && row.high === null && row.advertised_average == null) return `${fmt(row.low)} low`;
  if (values.length === 1 && row.high !== null && row.low === null && row.advertised_average == null) return `${fmt(row.high)} high`;
  return values[0] === values.at(-1) ? fmt(values[0]) : `${fmt(values[0])} to ${fmt(values[1])}`;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dateLabel = (s) => { const [y, m, d] = s.split('-'); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`; };
export const monthLabel = (s) => { const [y, m] = s.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };
export const addDays = (iso, days) => new Date(Date.parse(iso) + days * DAY).toISOString().slice(0, 10);
export const unitLabel = (pkg) => (/^(per|each)\b/i.test(pkg) ? pkg : /^(lb|dozen|carton of|bag of)/.test(pkg) ? `per ${pkg}` : `per ${pkg.replace(/s$/, '')}`);
// A quote is the reported range or the retail advertised average. "to" instead of a dash follows GOV.UK style.
export function quote(row) {
  if (row.advertised_average !== null && row.advertised_average !== undefined) return money(row.advertised_average);
  if (row.low !== null && row.high !== null) return row.low === row.high ? money(row.low) : `${money(row.low)} to ${money(row.high)}`;
  if (row.low !== null) return `${money(row.low)} low only`;
  if (row.high !== null) return `${money(row.high)} high only`;
  return 'Not quoted';
}
export const priced = (row) => row && !row.ambiguous && (row.advertised_average !== null || row.low !== null || row.high !== null);
// Sub-commodities such as "Lettuce, Iceberg" keep their distinguishing word in the product label.
export function productLabel(d, commodity, plain = commodity) {
  const organic = ['Y', 'Yes'].includes(d.organic) ? 'Organic' : '';
  const kind = commodity !== plain && commodity.includes(', ') ? commodity.split(', ').slice(1).join(' ') : '';
  return [kind, titleCase(d.var ?? d.variety), clean(d.type), clean(d.section) && d.section !== d.type ? clean(d.section) : '', clean(d.properties), clean(d.item_size), clean(d.class), clean(d.color), clean(d.egg_type), clean(d.package_size), clean(d.environment) === 'Conventional' ? '' : clean(d.environment), clean(d.grade), organic, clean(d.qualifier), clean(d.repack) && 'Repacked', clean(d.appearance), clean(d.condition) === 'Fresh' ? '' : clean(d.condition)]
    .filter(Boolean).join(', ') || commodity;
}
export const originLabel = (d) => titleCase(clean(d.district)) || titleCase(clean(d.origin)) || '';
export function groupSeries(rows, plain) {
  const map = new Map();
  for (const row of rows) { let group = map.get(row.series_id); if (!group) { group = { id: row.series_id, rows: [] }; map.set(group.id, group); } group.rows.push(row); }
  return [...map.values()].map((group) => {
    const byDate = Map.groupBy(group.rows, (r) => r.date);
    // Two records for one product and date cannot be resolved; they are shown as a conflict, never averaged.
    const observations = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, items]) => items.length === 1 ? items[0] : { ...items[0], low: null, high: null, mostly_low: null, mostly_high: null, advertised_average: null, comment: null, ambiguous: true });
    const latest = observations.at(-1); const d = latest.dimensions;
    return { id: group.id, source_id: latest.source_id, dimensions: d, market: titleCase(latest.market), stage: stageName(latest.market_stage), retail: isRetail(latest.market_stage), origin: originLabel(d), package: latest.package, product: productLabel(d, latest.commodity, plain ?? latest.commodity), commodity: latest.commodity, firstDate: observations[0].date, lastDate: latest.date, count: observations.length, latest, observations };
  }).sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.count - a.count || a.id.localeCompare(b.id));
}
export const marketKey = (s) => `${s.stage}: ${s.market}${s.origin ? ', ' + s.origin : ''}`;
// Nearest priced observation to a target date, within a tolerance. Weekly retail needs a wider window than daily reports.
export function nearest(observations, target, tolerance) {
  let best = null;
  for (const row of observations) {
    if (!priced(row)) continue;
    const gap = Math.abs(Date.parse(row.date) - Date.parse(target));
    if (gap <= tolerance * DAY && (!best || gap < Math.abs(Date.parse(best.date) - Date.parse(target)))) best = row;
  }
  return best;
}
// The midpoint of a quoted range is used only for percentage changes, and every page says so.
export const midpoint = (r) => (r.advertised_average !== null && r.advertised_average !== undefined ? r.advertised_average : r.low !== null && r.high !== null ? (r.low + r.high) / 2 : r.low ?? r.high);
export function pctChange(now, then) {
  if (!priced(now) || !priced(then)) return null;
  const a = midpoint(then), b = midpoint(now);
  return a ? ((b - a) / a) * 100 : null;
}
export const pctLabel = (p) => (p === null || p === undefined ? '' : p === 0 ? '0%' : `${p > 0 ? '+' : '-'}${Math.abs(p).toFixed(Math.abs(p) < 10 ? 1 : 0)}%`);
// Longest stretch without a quote in the trailing year, so a sparkline gap can be named.
export function longestGap(rows, minDays = 14) {
  let best = null; let previous = null;
  for (const r of rows) { if (previous && (Date.parse(r.date) - Date.parse(previous)) / DAY > minDays && (!best || Date.parse(r.date) - Date.parse(previous) > Date.parse(best.to) - Date.parse(best.from))) best = { from: previous, to: r.date }; previous = r.date; }
  return best;
}
export function summarize(series) {
  const rows = series.observations; const latest = [...rows].reverse().find(priced) ?? rows.at(-1);
  const tol = series.retail ? 4 : 4;
  const weekAgo = nearest(rows, addDays(latest.date, -7), 3);
  const monthAgo = nearest(rows, addDays(latest.date, -28), tol);
  const yearAgo = nearest(rows, addDays(latest.date, -364), series.retail ? 4 : 7);
  const yearRows = rows.filter((r) => priced(r) && r.date > addDays(latest.date, -365));
  const field = series.retail ? 'advertised_average' : null;
  const lowOf = (r) => (field ? r[field] : r.low ?? r.high); const highOf = (r) => (field ? r[field] : r.high ?? r.low);
  const yearLow = yearRows.reduce((b, r) => (lowOf(r) !== null && (!b || lowOf(r) < lowOf(b)) ? r : b), null);
  const yearHigh = yearRows.reduce((b, r) => (highOf(r) !== null && (!b || highOf(r) > highOf(b)) ? r : b), null);
  return { latest, weekAgo, monthAgo, yearAgo, weekChange: pctChange(latest, weekAgo), monthChange: pctChange(latest, monthAgo), yearChange: pctChange(latest, yearAgo), gap: longestGap(yearRows), yearLow, yearHigh, yearReports: yearRows.length, sparkline: yearRows.map((r) => ({ date: r.date, low: r.low, high: r.high, advertised_average: r.advertised_average })), earlier: priorYears(rows, addDays(latest.date, -364), latest.date).rows, earlierYears: priorYears(rows, addDays(latest.date, -364), latest.date).years };
}
// The benchmark for a commodity is the product USDA quoted most consistently over the past two years and still quotes.
// A family can name the everyday commodity to prefer (iceberg over mesclun) so the headline row stays recognisable.
export function pickBenchmark(groups, lastDate, prefer = [], preferSeries = () => false) {
  const rank = { 'Shipping point': 0, Wholesale: 1, 'Retail promotion': 2 };
  const recent = groups.filter((s) => !s.retail && priced(s.latest) && s.lastDate >= addDays(lastDate, -7));
  const pool = recent.length ? recent : groups.filter((s) => priced(s.latest));
  const preference = (s) => { const i = prefer.indexOf(s.commodity); return i < 0 ? prefer.length : i; };
  // A headline row should be able to say what the product cost 4 weeks and a year earlier.
  const comparable = (s) => (nearest(s.observations, addDays(lastDate, -28), 4) ? 1 : 0) + (nearest(s.observations, addDays(lastDate, -364), 7) ? 1 : 0);
  const score = (s) => s.observations.filter((r) => priced(r) && r.date > addDays(lastDate, -730)).length;
  // National figures beat regional ones for a headline; Alaska should never be the benchmark for chicken.
  const national = (s) => (/^national$/i.test(s.market) ? 1 : 0);
  return pool.sort((a, b) => Number(preferSeries(b)) - Number(preferSeries(a)) || preference(a) - preference(b) || rank[a.stage] - rank[b.stage] || national(b) - national(a) || comparable(b) - comparable(a) || score(b) - score(a) || a.id.localeCompare(b.id))[0] ?? groups[0];
}
// Lines break at gaps longer than a normal reporting interval. Weekends and single holidays are joined, seasonal stops and missing quotes are not.
export function chartSegments(rows, field, maxGapDays = 7) {
  const segments = []; let segment = []; let previous = null;
  for (const row of rows) {
    const value = row[field]; const valid = typeof value === 'number' && Number.isFinite(value) && !row.ambiguous;
    if (!valid || (previous && Date.parse(row.date) - Date.parse(previous) > maxGapDays * DAY)) { if (segment.length) segments.push(segment); segment = []; }
    if (valid) segment.push({ date: row.date, value }); previous = row.date;
  }
  if (segment.length) segments.push(segment); return segments;
}
// The seasonal reference band: for the same weeks in every previous year we hold (weekday-aligned, 52-week shifts),
// the lowest low and the highest high. An envelope, not an average, so no price is invented.
export function priorYears(rows, startDate, endDate, maxYears = 6) {
  const byDate = new Map(); let years = 0;
  for (let k = 1; k <= maxYears; k++) {
    const shift = 364 * k;
    const slice = rows.filter((r) => priced(r) && r.date >= addDays(startDate, -shift) && r.date <= addDays(endDate, -shift));
    if (!slice.length) continue; years = k;
    for (const r of slice) {
      const lo = r.low ?? r.advertised_average ?? r.high, hi = r.high ?? r.advertised_average ?? r.low;
      if (lo === null || hi === null) continue;
      const date = addDays(r.date, shift); const e = byDate.get(date) ?? { date, low: Infinity, high: -Infinity, advertised_average: null };
      e.low = Math.min(e.low, lo); e.high = Math.max(e.high, hi); byDate.set(date, e);
    }
  }
  return { years, rows: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}
// Kept for callers that want exactly last year.
export function yearEarlier(rows, startDate, endDate) {
  return rows.filter((r) => r.date >= addDays(startDate, -364) && r.date <= addDays(endDate, -364)).map((r) => ({ ...r, date: addDays(r.date, 364) }));
}
export function pageKey(path) {
  const cleanPath = path.replace(/\/$/, '');
  if (cleanPath === BASE) return 'home';
  if (cleanPath === `${BASE}/about`) return 'about';
  if (cleanPath === `${BASE}/retail`) return 'retail';
  if (cleanPath === `${BASE}/commodities`) return 'commodities';
  const m = new RegExp(`^${BASE}/commodity/([a-z0-9-]+)$`).exec(cleanPath);
  return m ? `commodity/${m[1]}` : null;
}
// Which published commodities a Markon article covers, judged from its own commodity list and signals.
export function newsFamilies(article, list = families) {
  const names = [...(article.commodities ?? []), ...(article.signals ?? []).map((s) => s.commodity)];
  return list.filter((f) => names.some((n) => f.news.test(n))).map((f) => f.slug);
}
export const directionWord = (d) => ({ rising: 'Prices rising', falling: 'Prices falling', stable: 'Prices stable', mixed: 'Prices mixed' }[d] ?? '');
// Plain-language reason for a gap in a chart window.
export function gapNote(rows, startDate, endDate, unit) {
  const inWindow = rows.filter((r) => (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate));
  const gap = longestGap(inWindow.filter(priced));
  if (!gap) return null;
  const days = Math.round((Date.parse(gap.to) - Date.parse(gap.from)) / DAY);
  return `No quotes from ${dateLabel(gap.from)} to ${dateLabel(gap.to)}, ${days} days. USDA quotes a product only while its growing region is shipping.`;
}

// USDA report comments become news when they change. Rows are one district/market and commodity, ordered by date.
const mode = (values) => { const counts = new Map(); for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1); return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] ?? null; };
const toneText = (t) => (t ? String(t).toLowerCase().replace(/^market\s+/, '').replace(/\.$/, '').trim() : '');
const sentence = (label, v) => (v ? `${label} ${String(v).toLowerCase().replace(/\.$/, '')}.` : '');
const steady = (t) => /^(about |generally |mostly )?steady$/.test(t);
export function usdaNews(rows, family, cutoff, sourceUrl) {
  // A terminal market report carries one tone comment for the whole market, so its rows group by market; the origin
  // in `district` is where the produce came from, not a reporting place. Shipping point reports are written per
  // growing district, so there the district is the place.
  const placeOf = (r) => (r.market_stage === 'Terminal' ? '' : (r.dimensions.district ?? ''));
  const groups = Map.groupBy(rows.filter((r) => !isRetail(r.market_stage)), (r) => `${r.source_id}|${r.market}|${placeOf(r)}|${r.commodity}`);
  const items = [];
  for (const [key, list] of groups) {
    const byDate = Map.groupBy(list, (r) => r.date);
    let previousTone = null; let prevDate = null;
    for (const date of [...byDate.keys()].sort()) {
      const day = byDate.get(date); const e = (f) => mode(day.map((r) => r.evidence?.[f]).filter(Boolean));
      const tone = toneText(e('market_tone_comments')), supply = e('supply_tone_comments'), demand = e('demand_tone_comments'), comment = e('commodity_comments');
      const remark = mode(day.map((r) => r.comment).filter(Boolean)) ?? '';
      const last = /\b(last|final) report\b/i.test(`${comment ?? ''} ${remark}`);
      const resumed = prevDate && Date.parse(date) - Date.parse(prevDate) > 14 * DAY;
      // News is a change of market tone away from or back to steady, a seasonal start or a final report. Daily
      // repeats of "steady" and rewordings of supply and demand notes are not.
      const toneChanged = tone && previousTone !== null && tone !== previousTone && !(steady(tone) && steady(previousTone));
      const first = day[0]; const place = titleCase(placeOf(first)) || first.market;
      if (date >= cutoff && (resumed || last || toneChanged)) {
        const headline = last ? 'final report of the season' : resumed ? `quotes resume${tone ? `, ${tone}` : ''}` : tone;
        items.push({ id: `usda-${key}-${date}`.replace(/[^a-z0-9-]+/gi, '-'), date, source: 'USDA', families: [family.slug], title: `${family.name}, ${place}: ${headline}`, url: sourceUrl(first.source_id), text: [sentence('Supply', supply), sentence('Demand', demand), comment && !last ? String(comment).trim().replace(/([^.])$/, '$1.') : ''].filter(Boolean).join(' '), notes: [] });
      }
      previousTone = tone || previousTone; prevDate = date;
    }
  }
  return items;
}
// "UPDATE: STRAWBERRIES" becomes "Strawberries update"; "FROM THE FIELDS: WEST COAST HEAT UPDATE" keeps its series name.
export function markonTitle(raw) {
  const t = raw.trim();
  const m = /^(UPDATE SUMMARY|FROM THE FIELDS|UPDATE)\s*:\s*(.+)$/i.exec(t);
  if (!m) return titleCase(t) || t;
  const rest = titleCase(m[2]) || m[2];
  const kind = m[1].toUpperCase();
  return kind === 'UPDATE' ? `${rest} update` : kind === 'UPDATE SUMMARY' ? `Weekly summary, ${rest.replace(/^Week of /i, 'week of ')}` : `From the fields: ${rest}`;
}
export function markonNews(article) {
  return { id: `markon-${article.id}`, date: article.publicationDate, source: 'Markon', families: newsFamilies(article), title: markonTitle(article.title), url: article.url, text: article.summary, notes: article.signals.map((sig) => ({ commodity: sig.commodity, text: `${sig.region ? `${sig.region}: ` : ''}${[directionWord(sig.priceDirection), sig.supplyCondition, sig.qualityCondition].filter(Boolean).join('. ')}`, quote: sig.evidenceQuote })) };
}
// The one or two sentences the page opens with, conclusion first.
export function findingSentence(featured) {
  const moved = featured.filter((f) => f.benchmark.yearChange !== null && f.benchmark.yearChange !== undefined);
  if (!moved.length) return null;
  const up = moved.filter((f) => f.benchmark.yearChange > 0).length; const n = moved.length;
  const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six'];
  const count = up === n ? `All ${words[n]}` : up === 0 ? 'None of the six' : `${words[up][0].toUpperCase()}${words[up].slice(1)} of the ${words[n]}`;
  const first = `${count} cost${up === 1 ? 's' : ''} more than a year ago.`;
  const top = moved.reduce((a, b) => (Math.abs(b.benchmark.yearChange) > Math.abs(a.benchmark.yearChange) ? b : a));
  const pct = Math.abs(top.benchmark.yearChange);
  const second = pct < 10 ? 'No commodity moved more than 10%.' : `${top.summary.name} ${top.benchmark.yearChange > 0 ? 'rose' : 'fell'} most, by ${pctLabel(pct).replace('+', '')}.`;
  return `${first} ${second}`;
}

// Biggest weekly moves among wholesale and shipping point benchmarks. A benchmark qualifies when it was quoted this
// week and a week earlier and has been quoted steadily over the past month, so a thin product that gets one quote a
// season cannot top the list. Retail ad averages are excluded: their week-to-week swings reflect the ad mix, not the price.
export function movers(entries, lastDate, limit = 5, minRecent = 8) {
  const eligible = entries.filter((e) => !e.retail && e.weekChange !== null && e.weekChange !== undefined && e.latest.date >= addDays(lastDate, -3) && e.recent >= minRecent);
  const sorted = [...eligible].sort((a, b) => b.weekChange - a.weekChange);
  return { rising: sorted.filter((e) => e.weekChange > 0).slice(0, limit), falling: sorted.filter((e) => e.weekChange < 0).reverse().slice(0, limit) };
}
