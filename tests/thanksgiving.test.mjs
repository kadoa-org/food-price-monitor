import { describe, expect, test } from 'bun:test';
import { MIN_STORES, buildThanksgiving, tally, thanksgiving, thanksgivingBanner, thanksgivingTitle } from '../src/thanksgiving.mjs';

const ad = (source_id, date, dimensions, price, stores) => ({ source_id, market: 'NATIONAL', date, advertised_average: price, dimensions, evidence: { store_count: stores } });
const turkey = (date, condition, size, price, stores) => ad('usda-2867', date, { section: 'Whole', condition, environment: 'Conventional', type: `Whole Turkey ${size} 16 Lbs` }, price, stores);
const ham = (date, price, stores, environment = 'Conventional') => ad('usda-2868', date, { type: 'Ham Spiral Sliced, Bone-In', environment }, price, stores);
const crop = (date, commodity, variety, size, price, stores) => ({ ...ad('usda-3324', date, { organic: 'No', variety, size }, price, stores), commodity, market: 'National' });
// A wholesale trade of the frozen hen the insight compares with the ads, or of another bird that must not count.
const hen = (date, price, dims = {}) => ({ source_id: 'usda-3647', market: 'National', date, advertised_average: price, dimensions: { class: 'Hen', condition: 'Frozen', item: 'Whole Young', description: 'Basted', environment: 'Conventional', freight: 'FOB', trade_status: 'Domestic', offer: 'No', ...dims } });
// Nine foods, one more than the minimum the page needs, in a week of each season the same number of days before Thanksgiving.
const week = (date, k) => [hen(date, 1.7 * k),
  turkey(date, 'Frozen', '<', 0.96, 20000), turkey(date, 'Frozen', '>', 0.98, 18000), turkey(date, 'Fresh', '<', 1.7 * k, 3000),
  ham(date, 3 / k, 10000), ham(date, 6, 900, 'Antibiotic Free'),
  crop(date, 'Potatoes', 'RUSSET', '5 lb bag', 2.9 / k, 3000), crop(date, 'Sweet Potatoes', 'N/A', 'per lb', 0.9 / k, 4000),
  crop(date, 'Cranberries', 'N/A', '12 oz bag', 2.2, 6000), crop(date, 'Celery', 'N/A', 'each', 1.6 * k, 1800),
  crop(date, 'Apples', 'HONEYCRISP', 'per lb', 1.6 * k, 6000), crop(date, 'Squash', 'Butternut', 'per lb', 1.1, 5000),
];

describe('thanksgiving', () => {
  test('is the fourth Thursday of November', () => {
    expect([2024, 2025, 2026, 2027].map(thanksgiving)).toEqual(['2024-11-28', '2025-11-27', '2026-11-26', '2027-11-25']);
  });

  test('compares each food with the same week before Thanksgiving last year', () => {
    const t = buildThanksgiving([...week('2025-11-14', 1), ...week('2026-11-13', 1.1)]);
    expect([t.latest, t.previous, t.day]).toEqual(['2026-11-13', '2025-11-14', -13]);
    const food = (key) => t.foods.find((f) => f.key === key);
    // Store-weighted across the two turkey sizes; a store in both sizes' counts is counted once.
    expect(food('turkeyFrozen')).toMatchObject({ price: 0.97, previous: 0.97, change: 0, stores: 20000 });
    // Only conventional ham: the antibiotic-free ad is a different product.
    expect(food('ham')).toMatchObject({ price: 2.73, previous: 3 });
    expect(food('celery').change).toBe(10);
    expect(tally(t)).toEqual({ cheaper: 3, pricier: 3, total: 9 });
    expect(t.years.map((y) => [y.year, y.wholesale, y.ad])).toEqual([[2025, 1.7, 0.97], [2026, 1.87, 0.97]]);
    expect(thanksgivingTitle(t)).toBe('Wholesale turkey costs $1.87 a pound. Grocery ads price it at 97 cents');
    expect(thanksgivingBanner(t)).toBe('Turkey: $1.87 a pound wholesale, 97 cents in grocery ads');
  });

  test('averages the wholesale price over the weeks with trades in the four weeks to the ad week, frozen basted hens only', () => {
    const rows = [...week('2025-11-14', 1), ...week('2026-11-13', 1),
      hen('2026-10-23', 1.6), hen('2026-10-09', 0.5), hen('2026-11-13', 3, { class: 'Tom' }), hen('2026-11-13', 3, { offer: 'Yes' })];
    // 13 Nov (1.7) and 23 Oct (1.6) are within four weeks; 9 Oct is not; the tom and the offer are other products.
    expect(buildThanksgiving(rows).years.at(-1).wholesale).toBe(1.65);
  });

  test('fails loudly when no wholesale price is in reach of the compared week', () => {
    const rows = [...week('2025-11-14', 1), ...week('2026-11-13', 1)].filter((r) => !(r.source_id === 'usda-3647' && r.date === '2026-11-13'));
    expect(() => buildThanksgiving(rows)).toThrow(/no wholesale turkey price/);
  });

  test('leaves out a food too few stores advertised, and the week a report has not published yet', () => {
    const thin = crop('2026-11-13', 'Pumpkins', 'PIE TYPE', 'per lb', 1, MIN_STORES - 1);
    const partial = [turkey('2026-11-20', 'Frozen', '<', 0.95, 25000)];
    const t = buildThanksgiving([...week('2025-11-14', 1), crop('2025-11-14', 'Pumpkins', 'PIE TYPE', 'per lb', 1, 2000), ...week('2026-11-13', 1.1), thin, ...partial]);
    expect(t.latest).toBe('2026-11-13');
    expect(t.dropped).toContain('Pie pumpkins');
  });
});
