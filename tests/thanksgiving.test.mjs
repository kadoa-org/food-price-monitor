import { describe, expect, test } from 'bun:test';
import { MIN_STORES, buildThanksgiving, compareFarmBureau, tally, thanksgiving, thanksgivingBanner, thanksgivingTitle } from '../src/thanksgiving.mjs';

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

  test('sets the Farm Bureau survey against ads, wholesale and BLS, over 12 months to the latest BLS month with a year-earlier price', () => {
    const t = buildThanksgiving([...week('2025-11-14', 1), ...week('2026-11-13', 1.1)]);
    const fb = { year: 2026, collected: 'first week of November 2026', url: 'https://example.org', total: { price: 58.63, change: 6 },
      items: [{ key: 'turkey', name: 'Turkey, 16 lb frozen', change: 10.1, price: 23.68, previous: 21.5 }, { key: 'milk', name: 'Whole milk, gallon', change: 8.6, price: 4.05, previous: 3.73 },
        { key: 'rolls', name: 'Dinner rolls, dozen', change: 7, price: 3.81, previous: 3.56 }, { key: 'cranberries', name: 'Fresh cranberries, 12 oz', change: 8.8, price: 2.48, previous: 2.28 }] };
    // October 2025 is missing, as in the shutdown, so October 2026 has no year-earlier price and September is compared.
    const months = (sep25, sep26, oct26) => new Map([['2025-09', sep25], ['2026-09', sep26], ['2026-10', oct26]]);
    const bls = new Map([['APU0000709112', months(4, 4.1, 4.2)], ['APU0000702111', months(2, 1.9, 2)], ['CUUR0000SAF11', months(300, 306, 307)]]);
    const c = compareFarmBureau(t, fb, bls);
    expect(c.blsMonth).toBe('2026-09');
    expect(c.rows.map((r) => [r.key, r.source, r.change])).toEqual([
      ['turkey', 'ads', 0], ['turkey', 'wholesale', 10], ['milk', 'bls', 2.5], ['rolls', 'bls', -5], ['cranberries', 'ads', 0], ['total', 'bls', 2],
    ]);
    expect(c.rows.at(-1)).toMatchObject({ item: 'The whole dinner', survey: 6 });
    expect(c.items.map((i) => [i.key, i.diff])).toEqual([['turkey', 2.18], ['milk', 0.32], ['rolls', 0.25], ['cranberries', 0.2]]);
    expect(c.total.previous).toBe(31.07);
    expect(() => compareFarmBureau(t, fb, new Map([['APU0000709112', months(4, 4.1, 4.2)]]))).toThrow('BLS series is missing');
  });
});
