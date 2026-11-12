// Grocery prices since October 2019 against overall inflation (CPI-U, all items), for the insight of that name. The
// fair measure is the whole basket: the food at home index, and each of the 53 food categories BLS prices for it,
// weighted by what households spend on each. Average prices in dollars come second, for the foods BLS prices on their
// own, with each food counted once: BLS prices nine beef cuts, which are shown as ground beef and steaks.
export const FOOD_INFLATION_SLUG = 'food-prices-against-inflation-since-2019';
export const FOOD_INFLATION_FROM = '2019-10';
export const FOOD_INFLATION_TO = '2026-10';
export const ALL_ITEMS = 'CUUR0000SA0';
export const FOOD_AT_HOME = 'CUUR0000SAF11';
export const FOOD_INFLATION_FILES = { prices: 'ap/ap.data.3.Food', food: 'cu/cu.data.11.USFoodBeverage', all: 'cu/cu.data.1.AllItems' };
// Every item stratum under food at home, with its relative importance (percent of the CPI-U) from the BLS table for
// December 2025, the weights in force for 2026. Together they are all of food at home (8.33%).
export const WEIGHTS_SOURCE = 'BLS, relative importance of CPI-U components, December 2025';
export const GROCERY_STRATA = [
  ['SEFA01', 'Flour and baking mixes', 0.038], ['SEFA02', 'Breakfast cereal', 0.136], ['SEFA03', 'Rice, pasta and cornmeal', 0.141],
  ['SEFB01', 'Bread', 0.175], ['SEFB02', 'Biscuits, rolls and muffins', 0.120], ['SEFB03', 'Cakes, cupcakes and cookies', 0.210], ['SEFB04', 'Other bakery products', 0.217],
  ['SEFC01', 'Ground beef', 0.236], ['SEFC02', 'Beef roasts', 0.087], ['SEFC03', 'Beef steaks', 0.240], ['SEFC04', 'Other beef and veal', 0.076],
  ['SEFD01', 'Bacon and breakfast sausage', 0.131], ['SEFD02', 'Ham', 0.066], ['SEFD03', 'Pork chops', 0.046], ['SEFD04', 'Other pork', 0.097],
  ['SEFE', 'Other meats', 0.207], ['SEFF01', 'Chicken', 0.291], ['SEFF02', 'Turkey and other poultry', 0.072],
  ['SEFG01', 'Fresh fish and seafood', 0.165], ['SEFG02', 'Processed fish and seafood', 0.149], ['SEFH', 'Eggs', 0.133],
  ['SEFJ01', 'Milk', 0.190], ['SEFJ02', 'Cheese', 0.261], ['SEFJ03', 'Ice cream', 0.115], ['SEFJ04', 'Other dairy', 0.192],
  ['SEFK01', 'Apples', 0.073], ['SEFK02', 'Bananas', 0.060], ['SEFK03', 'Citrus fruits', 0.077], ['SEFK04', 'Other fresh fruits', 0.322],
  ['SEFL01', 'Potatoes', 0.063], ['SEFL02', 'Lettuce', 0.044], ['SEFL03', 'Tomatoes', 0.063], ['SEFL04', 'Other fresh vegetables', 0.305],
  ['SEFM01', 'Canned fruits and vegetables', 0.096], ['SEFM02', 'Frozen fruits and vegetables', 0.084], ['SEFM03', 'Dried and other processed produce', 0.082],
  ['SEFN01', 'Soft drinks', 0.324], ['SEFN02', 'Frozen juices and drinks', 0.004], ['SEFN03', 'Juices and other drinks', 0.346],
  ['SEFP01', 'Coffee', 0.221], ['SEFP02', 'Tea and other drink mixes', 0.099],
  ['SEFR01', 'Sugar', 0.032], ['SEFR02', 'Candy and chewing gum', 0.241], ['SEFR03', 'Other sweets', 0.055],
  ['SEFS01', 'Butter and margarine', 0.066], ['SEFS02', 'Salad dressing', 0.055], ['SEFS03', 'Peanut butter and other fats', 0.110],
  ['SEFT01', 'Soups', 0.085], ['SEFT02', 'Frozen prepared foods', 0.305], ['SEFT03', 'Snacks', 0.372], ['SEFT04', 'Spices, condiments and sauces', 0.317],
  ['SEFT05', 'Baby food and formula', 0.053], ['SEFT06', 'Other foods', 0.582],
].map(([code, name, weight]) => ({ id: `CUUR0000${code}`, name, weight }));
// Foods with a BLS average price in both months. Beef is ground beef and steaks (BLS's own totals across cuts), so the
// nine cuts it also prices do not crowd the list; other category totals that overlap single foods are left out.
export const FOOD_INFLATION_FOODS = [
  { id: 'APU0000717311', name: 'Coffee', unit: 'lb' }, { id: 'APU0000708111', name: 'Eggs', unit: 'dozen' },
  { id: 'APU0000FC3101', name: 'Beef steaks', unit: 'lb' }, { id: 'APU0000FC1101', name: 'Ground beef', unit: 'lb' },
  { id: 'APU0000712211', name: 'Iceberg lettuce', unit: 'lb' }, { id: 'APU0000FN1102', name: 'Soft drinks, cans', unit: '12 oz can' },
  { id: 'APU0000715211', name: 'Sugar', unit: 'lb' }, { id: 'APU0000FL2101', name: 'Romaine lettuce', unit: 'lb' },
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
const nextMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; };

// prices and indexes: Maps of series id to Map('YYYY-MM' -> value), as parseBls returns them; indexes holds the food
// strata, food at home and all items.
export function buildFoodInflation({ prices, indexes, from = FOOD_INFLATION_FROM, to = FOOD_INFLATION_TO }) {
  const both = (map, id) => { const s = map.get(id); if (!s?.has(from) || !s.has(to)) throw new Error(`${id} has no value for ${from} or ${to}`); return s; };
  const all = both(indexes, ALL_ITEMS), food = both(indexes, FOOD_AT_HOME);
  const inflation = pct(all.get(to), all.get(from)), foodAtHome = pct(food.get(to), food.get(from));
  const total = GROCERY_STRATA.reduce((t, s) => t + s.weight, 0);
  const strata = GROCERY_STRATA.map(({ id, name, weight }) => { const s = both(indexes, id); return { id, name, share: (weight / total) * 100, change: pct(s.get(to), s.get(from)) }; })
    .sort((a, b) => b.change - a.change);
  const faster = strata.filter((s) => s.change > inflation);
  const foods = FOOD_INFLATION_FOODS.map(({ id, name, unit }) => { const s = both(prices, id); return { id, name, unit, from: s.get(from), to: s.get(to), change: pct(s.get(to), s.get(from)) }; })
    .sort((a, b) => b.change - a.change);
  // Month by month, so the page shows the path and not only the two ends (eggs, for one, peaked in between).
  const path = [];
  for (let m = from; m <= to; m = nextMonth(m)) path.push([m, food.has(m) ? pct(food.get(m), food.get(from)) : null, all.has(m) ? pct(all.get(m), all.get(from)) : null]);
  return {
    from, to, inflation, foodAtHome, path, strata, foods,
    fasterCount: faster.length, fasterShare: faster.reduce((t, s) => t + s.share, 0),
    foodsFaster: foods.filter((f) => f.change > inflation).length,
  };
}

// A neutral title that makes no claim; the lede and charts carry the numbers.
export const foodInflationHeadline = (f) => `US grocery prices since ${f.from.slice(0, 4)}, compared with inflation`;

export const foodInflationCsv = (f) => [`item,series,kind,share_of_grocery_spending_pct,unit,price_${f.from},price_${f.to},change_pct,inflation_pct`,
  `"Food at home",${FOOD_AT_HOME},index,100,,,,${f.foodAtHome.toFixed(2)},${f.inflation.toFixed(2)}`,
  ...f.strata.map((s) => [`"${s.name}"`, s.id, 'index', s.share.toFixed(2), '', '', '', s.change.toFixed(2), f.inflation.toFixed(2)].join(',')),
  ...f.foods.map((x) => [`"${x.name}"`, x.id, 'average price', '', `"${x.unit}"`, x.from, x.to, x.change.toFixed(2), f.inflation.toFixed(2)].join(','))].join('\n') + '\n';
