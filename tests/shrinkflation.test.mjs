import { describe, expect, test } from 'bun:test';
import { buildShrinkflation, shrinkflationTitle } from '../src/shrinkflation.mjs';

const cat = (code, group, published, withoutSize) => ({ code, title: code, group, published, withoutSize, added: Number((published - withoutSize).toFixed(2)) });
const bls = {
  from: '2019-12', to: '2026-08',
  categories: [
    cat('SAF11', 'food', 33, 32), cat('SEHN02', 'other', 35, 29), cat('SEFT03', 'food', 28, 23.8),
    cat('SEFC01', 'food', 80, 73), // beef sold by weight: left out
    cat('SEFA02', 'food', 26, 25.8), // moved less than half a point: not ranked
    cat('SEGB01', 'other', 20, 15), // other household goods outside paper and cleaning: left out
  ],
  counts: [{ month: '2021-01', down: 10, up: 5 }, { month: '2021-12', down: 20, up: 5 }, { month: '2026-09', down: 30, up: 10 }],
};

describe('shrinkflation', () => {
  test('ranks packaged categories by the share of their price rise from size changes', () => {
    const s = buildShrinkflation(bls);
    expect(s.ranked.map((r) => [r.code, r.share])).toEqual([['SEHN02', 17.1], ['SEFT03', 15]]);
    expect(s.food).toEqual({ published: 33, withoutSize: 32, added: 1, share: 3 });
    expect(shrinkflationTitle(s)).toBe('Smaller packs drove 17% of the rise in paper goods prices, 3% for food');
  });

  test('totals each year and marks the latest as partial', () => {
    const s = buildShrinkflation(bls);
    expect(s.counts).toEqual([{ year: 2021, down: 30, up: 10, through: '2021-12', partial: false }, { year: 2026, down: 30, up: 10, through: '2026-09', partial: true }]);
    expect(s.downPerUp).toBe(3);
  });

  test('fails loudly without the food at home series', () => {
    expect(() => buildShrinkflation({ ...bls, categories: bls.categories.filter((c) => c.code !== 'SAF11') })).toThrow(/food at home/);
  });
});
