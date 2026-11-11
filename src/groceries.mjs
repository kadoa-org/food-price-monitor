// October 2026 grocery prices: the ten staples the home page charts (the foods with the largest weight in the CPI that
// BLS also prices on its own), from the BLS average price file itself, plus two CPI indexes for context: food at home
// (all groceries) and food away from home (eating out). Every series is US city average, not seasonally adjusted.
// BLS collected no prices in October 2025, in the federal shutdown, so October 2026 has no 12-month change: the page
// compares with the latest earlier month every series has, September 2025, and says so.
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
// The BLS flat file each set of series is in, fetched once per run.
export const GROCERY_FILES = { prices: 'ap/ap.data.3.Food', indexes: 'cu/cu.data.11.USFoodBeverage' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const longMonth = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const pct = (to, from) => Number(((to / from - 1) * 100).toFixed(2));
const prevMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };
const shiftYear = (ym, k) => `${Number(ym.slice(0, 4)) + k}${ym.slice(4)}`;

// prices and indexes: Maps of series id to Map('YYYY-MM' -> value), as parseBls returns them.
export function buildGroceries({ prices, indexes, month = GROCERY_MONTH }) {
  const all = [...GROCERY_FOODS.map((f) => prices.get(f.id)), ...GROCERY_INDEXES.map((i) => indexes.get(i.id))];
  const ids = [...GROCERY_FOODS, ...GROCERY_INDEXES].map((s) => s.id);
  all.forEach((s, i) => { if (!s?.has(month)) throw new Error(`${ids[i]} has no value for ${month}`); });
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
      comparePrice: s.get(compare), change: pct(s.get(month), s.get(compare)),
      points: months.map((m) => [m, pct(s.get(m), base), s.get(m)]),
    };
  });
  const groups = GROCERY_INDEXES.map(({ id, key, name }) => ({ id, key, name, change: pct(indexes.get(id).get(month), indexes.get(id).get(compare)) }));
  // Foods and the two indexes on one scale, biggest rise first.
  const ranking = [...foods.map(({ name, change }) => ({ name, change, index: false })), ...groups.map(({ name, change }) => ({ name, change, index: true }))].sort((a, b) => b.change - a.change);
  return { month, compare, from: GROCERY_FROM, foods, indexes: Object.fromEntries(groups.map((g) => [g.key, g])), ranking };
}

// The page's claim, checked against the data: eating out rose faster than groceries, beef led the ten foods and eggs
// fell by about a third. If a revision breaks any, the page falls back to a plain title rather than state something
// the data does not show.
export function groceryHeadline(g) {
  const top = [...g.foods].sort((a, b) => b.change - a.change)[0];
  const eggs = g.foods.find((f) => f.name === 'Eggs').change;
  const holds = g.indexes.eatingOut.change > g.indexes.groceries.change && /beef/i.test(top.name) && eggs <= -30 && eggs > -37;
  return holds ? 'Beef and eating out got pricier. Eggs got a third cheaper.' : `US grocery prices in ${longMonth(g.month)}`;
}

export const groceriesCsv = (g) => [`food,unit,price_${g.month},price_${g.compare},change_since_${g.compare}_pct,base_month,base_price,change_since_base_pct`,
  ...g.foods.map((f) => [f.name, f.unit, f.price, f.comparePrice, f.change, f.baseMonth, f.basePrice, f.since].join(',')),
  ...Object.values(g.indexes).map((i) => [`${i.name} (CPI ${i.id})`, 'index', '', '', i.change, '', '', ''].join(','))].join('\n') + '\n';
