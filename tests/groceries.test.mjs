import { expect, test } from 'bun:test';
import { GROCERY_FOODS, GROCERY_INDEXES, buildGroceries, groceriesCsv, groceryHeadline } from '../src/groceries.mjs';

// Every food at 2.00 in August 2019 and 2.20 in September 2025, so the October 2026 price alone sets each change. No
// series has October 2025, as in the real files.
const series = (oct, extra = []) => new Map([['2019-08', 2], ['2025-09', 2.2], ['2026-09', oct], ['2026-10', oct], ...extra]);
const prices = new Map(GROCERY_FOODS.map((f) => [f.id, series(2.2)]));
prices.set('APU0000703112', series(2.2 * 1.068));
prices.set('APU0000708111', series(2.2 * 0.665));
// Coffee starts in October 2019.
prices.set('APU0000717311', new Map([['2019-10', 4], ['2025-09', 4.4], ['2026-10', 4.4]]));
const indexes = new Map([['CUUR0000SAF11', new Map([['2025-09', 100], ['2026-10', 102.2]])], ['CUUR0000SEFV', new Map([['2025-09', 100], ['2026-10', 104]])]]);

test('October 2026 compares with September 2025, the latest month every series has before the shutdown gap', () => {
  const g = buildGroceries({ prices, indexes });
  expect(g.compare).toBe('2025-09');
  const beef = g.foods.find((f) => f.name === 'Ground beef');
  expect(beef).toMatchObject({ change: 6.8, baseMonth: '2019-08', basePrice: 2, since: 17.48 });
  expect(g.foods.find((f) => f.name === 'Coffee')).toMatchObject({ baseMonth: '2019-10', since: 10, change: 0 });
  expect(g.indexes).toEqual({ groceries: { id: 'CUUR0000SAF11', key: 'groceries', name: 'All groceries', change: 2.2 }, eatingOut: { id: 'CUUR0000SEFV', key: 'eatingOut', name: 'Eating out', change: 4 } });
  expect(g.ranking.slice(0, 3).map((r) => r.name)).toEqual(['Ground beef', 'Eating out', 'All groceries']);
  expect(g.ranking.at(-1)).toEqual({ name: 'Eggs', change: -33.5, index: false });
});

test('the headline holds only while eating out outpaces groceries and beef leads', () => {
  expect(groceryHeadline(buildGroceries({ prices, indexes }))).toBe('Beef and eating out got pricier. Eggs got a third cheaper.');
  const flat = new Map(indexes); flat.set('CUUR0000SEFV', new Map([['2025-09', 100], ['2026-10', 101]]));
  expect(groceryHeadline(buildGroceries({ prices, indexes: flat }))).toBe('US grocery prices in October 2026');
});

test('a missing month fails loudly, and the CSV carries both comparisons', () => {
  const gap = new Map(prices); gap.set('APU0000702111', new Map([['2019-08', 2], ['2025-09', 2.2]]));
  expect(() => buildGroceries({ prices: gap, indexes })).toThrow('APU0000702111 has no value for 2026-10');
  const far = new Map(indexes); far.set(GROCERY_INDEXES[0].id, new Map([['2025-05', 100], ['2026-10', 102]]));
  expect(() => buildGroceries({ prices, indexes: far })).toThrow('No month near 2025-10 has every series');
  const csv = groceriesCsv(buildGroceries({ prices, indexes })).split('\n');
  expect(csv[0]).toBe('food,unit,price_2026-10,price_2025-09,change_since_2025-09_pct,base_month,base_price,change_since_base_pct');
  expect(csv).toContain('Eating out (CPI CUUR0000SEFV),index,,,4,,,');
});
