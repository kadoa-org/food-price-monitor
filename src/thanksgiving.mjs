// The Thanksgiving insight: the foods on a Thanksgiving table in this week's US grocery ads against the same week last
// year, from USDA's weekly surveys of grocery store ads (turkey 2867, pork 2868, specialty crops 3324), national rows.
// Each year is lined up on its own Thanksgiving, so "the same week" is the same number of days before the holiday.
// A price is the store-count-weighted average of the matching ads; the store count is the largest single ad's, since a
// store can run several matching ads (both turkey sizes, say) and summing would count it more than once.

export const THANKSGIVING_SLUG = 'thanksgiving-prices';
export const THANKSGIVING_SOURCES = ['usda-2867', 'usda-2868', 'usda-3324', 'usda-3647'];
// The ad reports a week needs before it can be compared; the wholesale report is read up to that week.
const AD_SOURCES = THANKSGIVING_SOURCES.slice(0, 3);
// A food is compared only when at least this many stores advertised it in both weeks: a handful of ads swings an average.
export const MIN_STORES = 500;
// A week's frozen turkey ad price is shown only when at least this many stores ran it: out of season a handful of
// ads, some for premium birds, swings the average.
export const MIN_TURKEY_STORES = 2000;
// The wholesale price set against an ad week is the average of the weekly prices in the four weeks to it: the national
// turkey report has weeks with few trades and weeks with none.
export const WHOLESALE_WEEKS = 4;
const DAY = 86400000;
// The national wholesale price of a frozen whole hen, 8 to 16 lb, US Grade A, basted, conventional, at the plant (FOB),
// sold in the US: the bird a 16 lb holiday turkey ad is for. Toms (16 to 24 lb) trade within a few cents of it.
export const wholesaleHen = (r) => r.source_id === 'usda-3647' && r.dimensions?.class === 'Hen' && r.dimensions.condition === 'Frozen' && r.dimensions.item === 'Whole Young' && r.dimensions.description === 'Basted' && r.dimensions.environment === 'Conventional' && r.dimensions.freight === 'FOB' && r.dimensions.trade_status === 'Domestic' && r.dimensions.offer === 'No' && r.advertised_average > 0;

const national = (r) => /^national$/i.test(r.market);
const conventionalTurkey = (condition) => (r) => r.source_id === 'usda-2867' && r.dimensions?.section === 'Whole' && r.dimensions.condition === condition && r.dimensions.environment === 'Conventional';
const crop = (commodity, variety, size) => (r) => r.source_id === 'usda-3324' && r.commodity === commodity && r.dimensions?.organic === 'No' && r.dimensions.variety === variety && r.dimensions.size === size;
// One product per food, chosen as the most advertised like-for-like product in both years and pinned, so the page
// compares the same thing every week. `unit` is the price's unit as shoppers see it.
export const THANKSGIVING_FOODS = [
  { key: 'turkeyFrozen', name: 'Frozen whole turkey', unit: 'lb', match: conventionalTurkey('Frozen') },
  { key: 'turkeyFresh', name: 'Fresh whole turkey', unit: 'lb', match: conventionalTurkey('Fresh') },
  { key: 'ham', name: 'Spiral-sliced ham', unit: 'lb', match: (r) => r.source_id === 'usda-2868' && r.dimensions?.type === 'Ham Spiral Sliced, Bone-In' && r.dimensions.environment === 'Conventional' },
  { key: 'russet', name: 'Russet potatoes', unit: '5 lb bag', match: crop('Potatoes', 'RUSSET', '5 lb bag') },
  { key: 'sweetPotatoes', name: 'Sweet potatoes', unit: 'lb', match: crop('Sweet Potatoes', 'N/A', 'per lb') },
  { key: 'cranberries', name: 'Cranberries', unit: '12 oz bag', match: crop('Cranberries', 'N/A', '12 oz bag') },
  { key: 'greenBeans', name: 'Green beans', unit: '12 oz bag', match: crop('Beans', 'ROUND GREEN TYPE', '12 oz bag') },
  { key: 'brussels', name: 'Brussels sprouts', unit: 'lb', match: crop('Brussels Sprouts', 'N/A', 'per lb') },
  { key: 'celery', name: 'Celery', unit: 'bunch', match: crop('Celery', 'N/A', 'each') },
  { key: 'carrots', name: 'Baby carrots', unit: '1 lb bag', match: crop('Carrots', 'BABY PEELED', '1 lb bag') },
  { key: 'onions', name: 'Yellow onions', unit: '3 lb bag', match: crop('Onions, Dry', 'YELLOW', '3 lb bag') },
  { key: 'squash', name: 'Butternut squash', unit: 'lb', match: crop('Squash', 'Butternut', 'per lb') },
  { key: 'pumpkins', name: 'Pie pumpkins', unit: 'lb', match: crop('Pumpkins', 'PIE TYPE', 'per lb') },
  { key: 'apples', name: 'Honeycrisp apples', unit: 'lb', match: crop('Apples', 'HONEYCRISP', 'per lb') },
];

// The fourth Thursday of November.
export function thanksgiving(year) {
  const first = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  return `${year}-11-${String(1 + ((4 - first + 7) % 7) + 21).padStart(2, '0')}`;
}
const daysFrom = (date, anchor) => Math.round((Date.parse(date) - Date.parse(anchor)) / DAY);
const round = (v, d = 2) => Number(v.toFixed(d));

// One week's store-weighted price for the ads a food matches, and the largest single ad's store count.
function weekOf(rows, match) {
  const ads = rows.filter((r) => match(r) && r.advertised_average > 0);
  const weight = ads.reduce((t, r) => t + (r.evidence?.store_count ?? 0), 0);
  if (!ads.length || !weight) return null;
  return { price: round(ads.reduce((t, r) => t + r.advertised_average * (r.evidence?.store_count ?? 0), 0) / weight), stores: Math.max(...ads.map((r) => r.evidence?.store_count ?? 0)) };
}

// rows: every observation of the three ad reports. Returns the foods compared and the frozen turkey season lines.
export function buildThanksgiving(rows) {
  const byDate = Map.groupBy(rows.filter(national), (r) => r.date);
  const dates = [...byDate.keys()].sort();
  // This season's latest week that all three reports have published (USDA releases them one by one through the week),
  // and last season's week the same number of days before its Thanksgiving.
  const complete = dates.filter((d) => AD_SOURCES.every((s) => byDate.get(d).some((r) => r.source_id === s)));
  if (!complete.length) throw new Error('Thanksgiving: no week with all three ad reports');
  const latest = complete.at(-1);
  const year = Number(latest.slice(0, 4)), day = daysFrom(latest, thanksgiving(year));
  const previous = dates.find((d) => d.startsWith(String(year - 1)) && Math.abs(daysFrom(d, thanksgiving(year - 1)) - day) <= 3);
  if (!previous) throw new Error(`Thanksgiving: no week in ${year - 1} ${-day} days before Thanksgiving`);
  const foods = [], dropped = [];
  for (const food of THANKSGIVING_FOODS) {
    const now = weekOf(byDate.get(latest), food.match), before = weekOf(byDate.get(previous), food.match);
    if (!now || !before || now.stores < MIN_STORES || before.stores < MIN_STORES) { dropped.push(food.name); continue; }
    foods.push({ key: food.key, name: food.name, unit: food.unit, price: now.price, previous: before.price, stores: now.stores, previousStores: before.stores, change: round((now.price / before.price - 1) * 100, 1) });
  }
  if (foods.length < 8) throw new Error(`Thanksgiving: only ${foods.length} foods advertised by enough stores in both years`);
  foods.sort((a, b) => b.change - a.change);
  const frozen = THANKSGIVING_FOODS[0].match;
  // Every week's wholesale hen price and frozen turkey ad price, up to the compared week.
  const wholesale = new Map([...byDate].filter(([d]) => d <= latest).map(([d, rs]) => {
    const hens = rs.filter(wholesaleHen);
    return [d, hens.length ? round(hens.reduce((t, r) => t + r.advertised_average, 0) / hens.length) : null];
  }).filter(([, v]) => v !== null).sort(([a], [b]) => a.localeCompare(b)));
  const weeks = dates.filter((d) => d <= latest).map((d) => {
    const ad = weekOf(byDate.get(d), frozen);
    return { date: d, wholesale: wholesale.get(d) ?? null, ad: ad && ad.stores >= MIN_TURKEY_STORES ? ad.price : null, stores: ad?.stores ?? 0 };
  }).filter((w) => w.wholesale !== null || w.ad !== null);
  // Each year at the same number of days before its Thanksgiving: the ad price that week and the wholesale price
  // averaged over the weeks with trades in the four weeks to it.
  const years = [...new Set(dates.map((d) => Number(d.slice(0, 4))))].sort().flatMap((y) => {
    const at = dates.find((d) => d.startsWith(String(y)) && d <= latest && Math.abs(daysFrom(d, thanksgiving(y)) - day) <= 3);
    const ad = at && weekOf(byDate.get(at), frozen);
    const window = at ? [...wholesale].filter(([d]) => d <= at && daysFrom(at, d) < WHOLESALE_WEEKS * 7).map(([, v]) => v) : [];
    if (!ad || ad.stores < MIN_TURKEY_STORES || !window.length) return [];
    return [{ year: y, date: at, ad: ad.price, stores: ad.stores, wholesale: round(window.reduce((t, v) => t + v, 0) / window.length) }];
  });
  if (years.at(-1)?.year !== year) throw new Error(`Thanksgiving: no wholesale turkey price in the ${WHOLESALE_WEEKS} weeks to ${latest}`);
  return { latest, previous, year, previousYear: year - 1, day, foods, dropped, weeks, years };
}

// The Farm Bureau's Thanksgiving survey (data/thanksgiving, typed in from its release) against our own measures of the
// same foods: the grocery ad price of the matching product (from the food table above), the wholesale turkey price, and
// BLS average prices and the food-at-home index. BLS is compared over 12 months to the latest month that has a price a
// year earlier (BLS priced nothing in October 2025). Bread stands in for rolls, the closest item BLS prices.
export const FARM_BUREAU_BLS_FILES = { prices: 'ap/ap.data.3.Food', indexes: 'cu/cu.data.11.USFoodBeverage' };
const FARM_BUREAU_BLS = [
  { fb: 'milk', id: 'APU0000709112', measure: 'Whole milk, gallon', source: 'bls' },
  { fb: 'rolls', id: 'APU0000702111', measure: 'White bread, lb (closest BLS item)', source: 'bls' },
  { fb: 'total', id: 'CUUR0000SAF11', measure: 'All groceries (food at home index)', source: 'bls' },
];
const FARM_BUREAU_ADS = [
  { fb: 'turkey', food: 'turkeyFrozen' },
  { fb: 'cranberries', food: 'cranberries' },
  { fb: 'sweetPotatoes', food: 'sweetPotatoes' },
  { fb: 'veggieTray', food: 'carrots' },
  { fb: 'veggieTray', food: 'celery' },
];
const monthBefore = (ym, n) => { const d = new Date(`${ym}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 7); };

// t: buildThanksgiving's result; fb: the typed-in survey; bls: Map of series id to Map('YYYY-MM' -> value) (parseBls).
export function compareFarmBureau(t, fb, bls) {
  const series = FARM_BUREAU_BLS.map((s) => bls.get(s.id));
  if (series.some((s) => !s?.size)) throw new Error('Farm Bureau comparison: a BLS series is missing');
  const month = [...series[0].keys()].sort().reverse().find((m) => series.every((s) => s.has(m) && s.has(monthBefore(m, 12))));
  if (!month) throw new Error('Farm Bureau comparison: no BLS month with a price a year earlier');
  const item = (key) => fb.items.find((i) => i.key === key) ?? (key === 'total' ? { name: 'The whole dinner', change: fb.total.change } : null);
  const rows = [];
  const add = (key, measure, source, change) => { const i = item(key); if (i) rows.push({ key, item: i.name, survey: i.change, measure, source, change: round(change, 1) }); };
  for (const a of FARM_BUREAU_ADS) {
    const f = t.foods.find((x) => x.key === a.food);
    if (f) add(a.fb, `${f.name} in grocery ads, ${f.unit === 'lb' ? 'per lb' : f.unit}`, 'ads', f.change);
  }
  const [then, now] = t.years.slice(-2);
  if (then?.year === t.year - 1) add('turkey', 'Frozen turkey hen, wholesale per lb', 'wholesale', (now.wholesale / then.wholesale - 1) * 100);
  FARM_BUREAU_BLS.forEach((s, i) => add(s.fb, s.measure, s.source, (series[i].get(month) / series[i].get(monthBefore(month, 12)) - 1) * 100));
  const order = [...fb.items.map((i) => i.key), 'total'];
  rows.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  // Turkey's share of the dinner's rise in dollars, from the survey's own prices and changes.
  const rise = (price, change) => price - price / (1 + change / 100);
  const bird = fb.items.find((i) => i.key === 'turkey');
  const turkeyShare = bird ? round(rise(bird.price, bird.change) / rise(fb.total.price, fb.total.change), 2) : null;
  return { year: fb.year, collected: fb.collected, url: fb.url, total: fb.total, blsMonth: month, turkeyShare, rows };
}

// Cheaper and pricier count a change of more than 2% either way; within that a food counts as unchanged.
export const FLAT = 2;
export const tally = (t) => ({ cheaper: t.foods.filter((f) => f.change < -FLAT).length, pricier: t.foods.filter((f) => f.change > FLAT).length, total: t.foods.length });
const perLb = (v) => (v < 1 ? `${Math.round(v * 100)} cents` : `$${v.toFixed(2)}`);
export const turkeyNow = (t) => t.years.at(-1);
export function thanksgivingTitle(t) {
  const n = turkeyNow(t);
  return `Wholesale turkey costs ${perLb(n.wholesale)} a pound. Grocery ads price it at ${perLb(n.ad)}`;
}
// The page asks the reader's question; the turkey finding titles the shareable chart image (thanksgivingTitle).
export const thanksgivingPageTitle = (t) => `How much does Thanksgiving dinner cost in ${t.year}?`;
// The banner: the two prices first.
export const thanksgivingBanner = (t) => `Turkey: ${perLb(turkeyNow(t).wholesale)} a pound wholesale, ${perLb(turkeyNow(t).ad)} in grocery ads`;

export function thanksgivingCsv(t) {
  const q = (v) => (/[",]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : v);
  const lines = [`food,unit,price_usd_week_ending_${t.latest},price_usd_week_ending_${t.previous},change_pct,stores_advertising_${t.year},stores_advertising_${t.previousYear}`];
  for (const f of t.foods) lines.push([f.name, f.unit, f.price, f.previous, f.change, f.stores, f.previousStores].map(q).join(','));
  lines.push('', 'week_ending,wholesale_frozen_hen_usd_per_lb,frozen_whole_turkey_ad_usd_per_lb,stores_advertising_frozen_turkey');
  for (const w of t.weeks) lines.push([w.date, w.wholesale ?? '', w.ad ?? '', w.stores].join(','));
  if (t.farmBureau) {
    lines.push('', `farm_bureau_item,farm_bureau_change_pct_${t.farmBureau.year},our_measure,our_source,our_change_pct`);
    for (const r of t.farmBureau.rows) lines.push([r.item, r.survey, r.measure, r.source, r.change].map(q).join(','));
  }
  return lines.join('\n') + '\n';
}
