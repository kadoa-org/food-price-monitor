import { expect, test } from 'bun:test';
import { buildHalloween, halloweenBanner, halloweenCsv, halloweenHeadline } from '../src/halloween.mjs';

const spend = { 2009: 19, 2010: 20, 2011: 25, 2012: 30 };
const candy = new Map([['2010-09', 100], ['2010-10', 999], ['2011-09', 120], ['2012-09', 150]]);
const all = new Map([['2010-09', 200], ['2011-09', 210], ['2012-09', 260]]);
const shop = { retailer: 'a large US retailer', date: '2026-10-25', products: [{ label: 'Bag', price: 6, size: '10 oz', img: 'x.jpg' }] };

test('compares each September with September 2010 and prices bags at 2010 candy prices', () => {
  const h = buildHalloween({ spend, candy, all, shop });
  expect(h.rows.map((r) => r.year)).toEqual([2010, 2011, 2012]);
  expect(h.rows[2]).toEqual({ year: 2012, spend: 30, candyCpi: 150, allCpi: 260, spendChange: 50, candyChange: 50, allChange: 30 });
  expect(h.figures).toEqual({ spendFrom: 20, spendTo: 30, spend: 50, candy: 50, all: 30 });
  // $6 today after a 50% rise in candy prices is $4 at 2010 prices.
  expect(halloweenHeadline(h.figures)).toBe('Halloween candy budgets rose 50% since 2010. Candy prices rose 50%.');
  expect(halloweenBanner(spend)).toBe('Halloween candy budgets up 50% since 2010');
  expect(halloweenCsv(h.rows).split('\n')[1]).toBe('2010,20,100,200,0,0,0');
});

test('a September BLS did not publish fails loudly instead of skipping the year', () => {
  const gap = new Map(candy); gap.delete('2011-09');
  expect(() => buildHalloween({ spend, candy: gap, all, shop })).toThrow('candy CPI has no value for 2011-09');
});
