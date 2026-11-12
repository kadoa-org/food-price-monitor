import { expect, test } from 'bun:test';
import { ALL_ITEMS, FOOD_AT_HOME, FOOD_INFLATION_FOODS, GROCERY_STRATA, buildFoodInflation, foodInflationCsv, foodInflationHeadline } from '../src/foodInflation.mjs';

// All prices up 31% and food at home 33% from October 2019 to October 2026, with no October 2025, as in the real files.
const series = (to) => new Map([['2019-10', 100], ['2025-09', (100 + to) / 1.01], ['2026-10', 100 + to]]);
const indexes = new Map([[ALL_ITEMS, series(31)], [FOOD_AT_HOME, series(33)], ...GROCERY_STRATA.map((s) => [s.id, series(20)])]);
// Beef steaks and ground beef rise 60%; everything else 20%.
indexes.set('CUUR0000SEFC01', series(60));
indexes.set('CUUR0000SEFC03', series(60));
const prices = new Map(FOOD_INFLATION_FOODS.map((f) => [f.id, new Map([['2019-10', 2], ['2026-10', 2.4]])]));
prices.set('APU0000FS1101', new Map([['2019-10', 3.979], ['2026-10', 3.977]]));

test('the categories above inflation are counted by their share of grocery spending, not their number', () => {
  const f = buildFoodInflation({ prices, indexes });
  expect(f.strata).toHaveLength(53);
  expect(f.fasterCount).toBe(2);
  // Ground beef and steaks weigh 0.236 and 0.240 of the 8.327 that food at home's 53 categories add up to.
  expect(f.fasterShare).toBeCloseTo(((0.236 + 0.24) / 8.327) * 100, 2);
  expect(f.strata.reduce((t, s) => t + s.share, 0)).toBeCloseTo(100, 6);
});

test('the path runs every month, with October 2025 left empty, and the title is a neutral label', () => {
  const f = buildFoodInflation({ prices, indexes });
  expect(f.path[0]).toEqual(['2019-10', 0, 0]);
  expect(f.path.find((r) => r[0] === '2025-10')).toEqual(['2025-10', null, null]);
  expect(f.path.at(-1)[0]).toBe('2026-10');
  expect(foodInflationHeadline(f)).toBe('US grocery prices since 2019, compared with inflation');
});

test('butter, flat to a fifth of a cent, sorts last and the CSV has one row per category and food', () => {
  const f = buildFoodInflation({ prices, indexes });
  expect(f.foods.at(-1).name).toBe('Butter');
  expect(f.foods.at(-1).change).toBeCloseTo(-0.05, 2);
  expect(foodInflationCsv(f).trim().split('\n')).toHaveLength(1 + 1 + 53 + FOOD_INFLATION_FOODS.length);
});

test('a missing month fails the build rather than drop a category', () => {
  const broken = new Map(indexes);
  broken.set('CUUR0000SEFK01', new Map([['2019-10', 100]]));
  expect(() => buildFoodInflation({ prices, indexes: broken })).toThrow('CUUR0000SEFK01');
});
