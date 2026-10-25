import { expect, test } from 'bun:test';
import { buildHalloween, halloweenBanner, halloweenBudgetBanner, halloweenCsv, halloweenHeadline } from '../src/halloween.mjs';

const spend = { 2009: 19, 2010: 20, 2020: 30, 2026: 36 };
const candy = new Map([['2010-09', 100], ['2010-10', 999], ['2020-09', 120], ['2026-09', 180]]);
const all = new Map([['2010-09', 200], ['2020-09', 240], ['2026-09', 300]]);
const shop = { retailer: 'a large US retailer', date: '2026-10-25', products: [{ label: 'Bag', price: 6, size: '10 oz', img: 'x.jpg' }] };

test('compares each September with 2010 and, from 2020, with 2020', () => {
  const h = buildHalloween({ spend, candy, all, shop });
  expect(h.rows.map((r) => r.year)).toEqual([2010, 2020, 2026]);
  expect(h.rows[2]).toEqual({ year: 2026, spend: 36, candyCpi: 180, allCpi: 300, spendChange: 80, candyChange: 80, allChange: 50, spendSince: 20, candySince: 50, allSince: 25 });
  expect(h.rows[0].spendSince).toBeUndefined();
  expect(h.figures.since).toEqual({ spendFrom: 30, spend: 20, candy: 50, all: 25 });
  expect(h.figures.decade).toEqual({ spend: 50, candy: 20 });
  expect(halloweenHeadline(h.figures)).toBe('Candy prices are up 50% since\u00a02020, Halloween candy budgets 20%');
  expect(halloweenBanner(h.figures)).toBe('Candy prices up 50% since 2020, budgets 20%');
  expect(halloweenBudgetBanner(spend)).toBe('Halloween candy budgets up 20% since 2020');
  expect(halloweenCsv(h.rows).split('\n')[1]).toBe('2010,20,100,200,0,0,0,,,');
});

test('the headline leads with whichever rose more since 2020', () => {
  expect(halloweenHeadline({ since: { spend: 40, candy: 30 } })).toBe('Halloween candy budgets are up 40% since\u00a02020, candy prices 30%');
});

test('a September BLS did not publish fails loudly instead of skipping the year', () => {
  const gap = new Map(candy); gap.delete('2020-09');
  expect(() => buildHalloween({ spend, candy: gap, all, shop })).toThrow('candy CPI has no value for 2020-09');
});
