// Every food with a BLS US average price in October 2019 and October 2026, against overall inflation (CPI-U, all
// items) over the same months, for the insight of that name. BLS also publishes category totals (all steaks, all ham,
// all pork chops, ...) that overlap the single foods, so those are left out and each food counts once.
export const FOOD_INFLATION_SLUG = 'food-prices-against-inflation-since-2019';
export const FOOD_INFLATION_FROM = '2019-10';
export const FOOD_INFLATION_TO = '2026-10';
export const ALL_ITEMS = 'CUUR0000SA0';
export const FOOD_INFLATION_FOODS = [
  { id: 'APU0000717311', name: 'Coffee', unit: 'lb' }, { id: 'APU0000708111', name: 'Eggs', unit: 'dozen' },
  { id: 'APU0000703213', name: 'Chuck roast', unit: 'lb' }, { id: 'APU0000703112', name: 'Ground beef', unit: 'lb' },
  { id: 'APU0000703511', name: 'Round steak', unit: 'lb' }, { id: 'APU0000712211', name: 'Iceberg lettuce', unit: 'lb' },
  { id: 'APU0000FN1102', name: 'Soft drinks, cans', unit: '12 oz can' }, { id: 'APU0000715211', name: 'Sugar', unit: 'lb' },
  { id: 'APU0000703613', name: 'Sirloin steak', unit: 'lb' }, { id: 'APU0000703311', name: 'Round roast', unit: 'lb' },
  { id: 'APU0000703111', name: 'Ground chuck', unit: 'lb' }, { id: 'APU0000FL2101', name: 'Romaine lettuce', unit: 'lb' },
  { id: 'APU0000703432', name: 'Stew beef', unit: 'lb' }, { id: 'APU0000703113', name: 'Lean ground beef', unit: 'lb' },
  { id: 'APU0000718311', name: 'Potato chips', unit: '16 oz bag' }, { id: 'APU0000FJ4101', name: 'Yogurt', unit: '8 oz' },
  { id: 'APU0000702421', name: 'Cookies', unit: 'lb' }, { id: 'APU0000FN1101', name: 'Soft drinks, 2 liter', unit: 'bottle' },
  { id: 'APU0000701312', name: 'Rice', unit: 'lb' }, { id: 'APU0000702111', name: 'Bread', unit: 'lb' },
  { id: 'APU0000FF1101', name: 'Chicken breast', unit: 'lb' }, { id: 'APU0000720111', name: 'Beer', unit: '16 oz' },
  { id: 'APU0000706111', name: 'Whole chicken', unit: 'lb' }, { id: 'APU0000709112', name: 'Whole milk', unit: 'gallon' },
  { id: 'APU0000FJ1101', name: 'Low-fat milk', unit: 'gallon' }, { id: 'APU0000712112', name: 'Potatoes', unit: 'lb' },
  { id: 'APU0000714233', name: 'Dried beans', unit: 'lb' }, { id: 'APU0000701111', name: 'Flour', unit: 'lb' },
  { id: 'APU0000710211', name: 'American cheese', unit: 'lb' }, { id: 'APU0000706212', name: 'Chicken legs', unit: 'lb' },
  { id: 'APU0000710411', name: 'Ice cream', unit: 'half gallon' }, { id: 'APU0000704212', name: 'Pork chops', unit: 'lb' },
  { id: 'APU0000704111', name: 'Bacon', unit: 'lb' }, { id: 'APU0000704312', name: 'Ham', unit: 'lb' },
  { id: 'APU0000701322', name: 'Pasta', unit: 'lb' }, { id: 'APU0000712311', name: 'Tomatoes', unit: 'lb' },
  { id: 'APU0000711415', name: 'Strawberries', unit: 'pint' }, { id: 'APU0000710212', name: 'Cheddar cheese', unit: 'lb' },
  { id: 'APU0000720311', name: 'Wine', unit: 'liter' }, { id: 'APU0000711211', name: 'Bananas', unit: 'lb' },
  { id: 'APU0000711412', name: 'Lemons', unit: 'lb' }, { id: 'APU0000FS1101', name: 'Butter', unit: 'lb' },
];
const pct = (to, from) => (to / from - 1) * 100;

// prices and allItems: Maps of series id to Map('YYYY-MM' -> value), as parseBls returns them.
export function buildFoodInflation({ prices, allItems, from = FOOD_INFLATION_FROM, to = FOOD_INFLATION_TO }) {
  const cpi = allItems.get(ALL_ITEMS);
  if (!cpi?.has(from) || !cpi.has(to)) throw new Error(`${ALL_ITEMS} has no value for ${from} or ${to}`);
  const inflation = pct(cpi.get(to), cpi.get(from));
  const foods = FOOD_INFLATION_FOODS.map(({ id, name, unit }) => {
    const s = prices.get(id);
    if (!s?.has(from) || !s.has(to)) throw new Error(`${id} has no value for ${from} or ${to}`);
    return { id, name, unit, from: s.get(from), to: s.get(to), change: pct(s.get(to), s.get(from)) };
  }).sort((a, b) => b.change - a.change);
  return { from, to, inflation, foods, faster: foods.filter((f) => f.change > inflation).length };
}

// The page's title, checked against the data: no food got cheaper in dollars (butter, the flattest, moved -0.05%, so a
// change that rounds to 0% counts as unchanged) and the count below inflation. Otherwise a plain title.
export function foodInflationHeadline(f) {
  const slower = f.foods.length - f.faster;
  const holds = f.foods.every((x) => Math.round(x.change) >= 0);
  return holds ? `Every US food got more expensive since ${f.from.slice(0, 4)}. Only ${slower} of ${f.foods.length} rose less than inflation.` : `US food prices since ${f.from.slice(0, 4)}, against inflation`;
}

export const foodInflationCsv = (f) => [`food,series,unit,price_${f.from},price_${f.to},change_pct,inflation_pct,faster_than_inflation`,
  ...f.foods.map((x) => [`"${x.name}"`, x.id, `"${x.unit}"`, x.from, x.to, x.change.toFixed(2), f.inflation.toFixed(2), x.change > f.inflation].join(','))].join('\n') + '\n';
