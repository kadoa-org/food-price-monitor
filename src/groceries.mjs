// October 2026 food prices, as the CPI release tells them: the change over the month in the food indexes BLS reports,
// seasonally adjusted. Then the ten staples the home page charts (the foods with the largest weight in the CPI that
// BLS also prices on its own), from the BLS average price file itself, and two CPI indexes for the longer view: food
// at home (all groceries) and food away from home (eating out), not seasonally adjusted. BLS collected no prices in
// October 2025, in the federal shutdown, so October 2026 has no 12-month change: the longer view compares with the
// latest earlier month every series has, September 2025, and says so.
export const GROCERY_MONTH = '2026-10';
export const GROCERY_FROM = '2019-08';
// In CPI weight order, heaviest first, as on the home page. Unit is what one price buys.
export const GROCERY_FOODS = [
  { id: 'APU0000FN1101', name: 'Soft drinks', unit: '2 liters' },
  { id: 'APU0000706111', name: 'Chicken', unit: 'lb' },
  { id: 'APU0000710212', name: 'Cheese', unit: 'lb' },
  { id: 'APU0000FC3101', name: 'Beef steaks', unit: 'lb' },
  { id: 'APU0000703112', name: 'Ground beef', unit: 'lb' },
  { id: 'APU0000717311', name: 'Coffee', unit: 'lb' },
  { id: 'APU0000709112', name: 'Milk', unit: 'gallon' },
  { id: 'APU0000702111', name: 'Bread', unit: 'lb' },
  { id: 'APU0000701312', name: 'Rice', unit: 'lb' },
  { id: 'APU0000708111', name: 'Eggs', unit: 'dozen' },
];
export const GROCERY_INDEXES = [
  { id: 'CUUR0000SAF11', key: 'groceries', name: 'All groceries' },
  { id: 'CUUR0000SEFV', key: 'eatingOut', name: 'Eating out' },
];
// The month's change, in the order the release reads: the three totals, the six grocery groups, then the items it
// names. Seasonally adjusted, as BLS reports monthly changes; BLS does not adjust limited service meals, so that one
// is the unadjusted index, as in the release.
export const GROCERY_CATEGORIES = [
  { id: 'CUSR0000SAF1', name: 'All food', total: true },
  { id: 'CUSR0000SAF11', name: 'Groceries', total: true },
  { id: 'CUSR0000SEFV', name: 'Eating out', total: true },
  { id: 'CUSR0000SAF111', name: 'Cereals and bakery' },
  { id: 'CUSR0000SAF112', name: 'Meat, poultry, fish and eggs' },
  { id: 'CUSR0000SEFJ', name: 'Dairy' },
  { id: 'CUSR0000SAF113', name: 'Fruits and vegetables' },
  { id: 'CUSR0000SAF114', name: 'Drinks, nonalcoholic' },
  { id: 'CUSR0000SAF115', name: 'Other groceries' },
  { id: 'CUSR0000SEFC', name: 'Beef' },
  { id: 'CUSR0000SEFH', name: 'Eggs' },
  { id: 'CUSR0000SEFL', name: 'Fresh vegetables' },
  { id: 'CUSR0000SEFL02', name: 'Lettuce' },
  { id: 'CUSR0000SEFP01', name: 'Coffee' },
  { id: 'CUSR0000SEFT03', name: 'Snacks' },
  { id: 'CUSR0000SEFV01', name: 'Sit-down restaurants' },
  { id: 'CUUR0000SEFV02', name: 'Fast food and takeout' },
];
// The BLS flat file each set of series is in, fetched once per run.
export const GROCERY_FILES = { prices: 'ap/ap.data.3.Food', indexes: 'cu/cu.data.11.USFoodBeverage' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longMonth = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const pct = (to, from, digits = 2) => Number(((to / from - 1) * 100).toFixed(digits)) || 0;
const prevMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
const shiftYear = (ym, k) => `${Number(ym.slice(0, 4)) + k}${ym.slice(4)}`;

// prices and indexes: Maps of series id to Map('YYYY-MM' -> value), as parseBls returns them; indexes holds both the
// two unadjusted indexes and the month's categories.
export function buildGroceries({ prices, indexes, month = GROCERY_MONTH }) {
  const prev = prevMonth(month);
  const need = (map, id, m) => { if (!map.get(id)?.has(m)) throw new Error(`${id} has no value for ${m}`); };
  // The month's own change needs the month before too, for every food and category.
  for (const { id } of GROCERY_FOODS) { need(prices, id, month); need(prices, id, prev); }
  for (const { id } of GROCERY_INDEXES) need(indexes, id, month);
  for (const { id } of GROCERY_CATEGORIES) { need(indexes, id, month); need(indexes, id, prev); }
  const all = [...GROCERY_FOODS.map((f) => prices.get(f.id)), ...GROCERY_INDEXES.map((i) => indexes.get(i.id))];
  // A year earlier, or the latest month before it that every series has; a gap of more than three months is no
  // longer a comparison with a year ago, so the build fails rather than say so.
  let compare = shiftYear(month, -1);
  for (let k = 0; k < 3 && !all.every((s) => s.has(compare)); k++) compare = prevMonth(compare);
  if (!all.every((s) => s.has(compare))) throw new Error(`No month near ${shiftYear(month, -1)} has every series`);
  const foods = GROCERY_FOODS.map(({ id, name, unit }) => {
    const s = prices.get(id);
    // A food BLS first priced later (coffee, October 2019) is measured from its first month.
    const months = [...s.keys()].filter((m) => m >= GROCERY_FROM && m <= month).sort();
    const baseMonth = months[0], base = s.get(baseMonth);
    return {
      id, name, unit, price: s.get(month), baseMonth, basePrice: base, since: pct(s.get(month), base),
      comparePrice: s.get(compare), change: pct(s.get(month), s.get(compare)), monthChange: pct(s.get(month), s.get(prev)),
      points: months.map((m) => [m, pct(s.get(m), base), s.get(m)]),
    };
  });
  const groups = GROCERY_INDEXES.map(({ id, key, name }) => ({ id, key, name, change: pct(indexes.get(id).get(month), indexes.get(id).get(compare)) }));
  // The month's categories on one scale, biggest rise first, rounded once to one decimal as BLS publishes them (so
  // cereals at -0.03% reads unchanged and snacks at 1.049% reads 1.0%, as in the release).
  const categories = GROCERY_CATEGORIES.map(({ id, name, total = false }) => ({ id, name, total, change: pct(indexes.get(id).get(month), indexes.get(id).get(prev), 1) })).sort((a, b) => b.change - a.change);
  return { month, prev, compare, from: GROCERY_FROM, foods, indexes: Object.fromEntries(groups.map((g) => [g.key, g])), categories };
}
export const category = (g, name) => g.categories.find((c) => c.name === name);

// The page's claim, checked against the data: food rose over the month, and beef and fresh vegetables rose faster
// than groceries as a whole. If a revision breaks any, the page falls back to a plain title rather than state
// something the data does not show.
export function groceryHeadline(g) {
  const [food, groceries] = [category(g, 'All food').change, category(g, 'Groceries').change];
  const holds = food > 0 && category(g, 'Beef').change > groceries && category(g, 'Fresh vegetables').change > groceries;
  return holds ? `Food prices rose ${food.toFixed(1)}% in ${MONTHS[Number(g.month.slice(5, 7)) - 1]} as beef and vegetables got pricier` : `US food prices in ${longMonth(g.month)}`;
}

// One row per category (the month's change) and per food (prices, and the change over the month, since the longer
// comparison month and since the base month).
export const groceriesCsv = (g) => [`item,series,unit,change_${g.prev}_to_${g.month}_pct,price_${g.month},price_${g.compare},change_since_${g.compare}_pct,base_month,base_price,change_since_base_pct`,
  ...g.categories.map((c) => [c.name, c.id, 'index', c.change, '', '', '', '', '', ''].join(',')),
  ...g.foods.map((f) => [f.name, f.id, f.unit, f.monthChange, f.price, f.comparePrice, f.change, f.baseMonth, f.basePrice, f.since].join(',')),
  ...Object.values(g.indexes).map((i) => [i.name, i.id, 'index', '', '', '', i.change, '', '', ''].join(','))].join('\n') + '\n';
