import { withGaps } from '../src/chartSetup.mjs';
import { expect, test } from 'bun:test';
import { autoFamily, shortMarket, dateLabel, familyFor, findingSentence, gapNote, groupSeries, markonTitle, newsFamilies, slugify, titleCase, usdaNews, longestGap, nearest, pageKey, pctChange, pctLabel, pickBenchmark, quote, summarize, unitLabel, yearEarlier } from '../src/model.mjs';
const row = { id: 'a', series_id: 'red-25lb', date: '2026-09-18', commodity: 'Onions, Dry', market: 'Market', market_stage: 'Shipping Point', package: '25 lb sacks', low: 9, high: 11, mostly_low: null, mostly_high: null, advertised_average: null, comment: null, dimensions: { organic: 'N', var: 'RED' } };
test('formats dates and quotes in GOV.UK style without locale data', () => {
  expect(dateLabel('2026-09-18')).toBe('18 Sep 2026');
  expect(quote(row)).toBe('$9.00 to $11.00');
  expect(quote({ ...row, low: 0, high: 0 })).toBe('$0.00');
  expect(quote({ ...row, low: null, high: null })).toBe('Not quoted');
  expect(quote({ ...row, advertised_average: 2.5 })).toBe('$2.50');
  expect(quote({ ...row, high: null })).toBe('$9.00 low only');
  expect(unitLabel('50 lb cartons')).toBe('per 50 lb carton');
  expect(unitLabel('per lb')).toBe('per lb');
});
test('keeps distinct products separate and flags conflicting records for one date', () => {
  const groups = groupSeries([row, { ...row, id: 'b', series_id: 'yellow-50lb', package: '50 lb sacks' }, { ...row, id: 'c', low: 10 }]);
  expect(groups).toHaveLength(2);
  const red = groups.find((g) => g.id === 'red-25lb');
  expect(red.observations[0].low).toBeNull();
  expect(red.observations[0].ambiguous).toBe(true);
  expect(red.product).toBe('Red');
  expect(red.dimensions).toEqual({ organic: 'N', var: 'RED' });
  expect(groupSeries([{ ...row, commodity: 'Lettuce, Iceberg', dimensions: { item_size: '24s' } }], 'Lettuce')[0].product).toBe('Iceberg, 24s');
  expect(groups.find((g) => g.id === 'yellow-50lb').observations[0].low).toBe(9);
});
test('a gap longer than a reporting interval breaks the line instead of bridging it', () => {
  const day = 86400000, d = (s) => Date.parse(s);
  const points = [{ x: d('2026-01-02'), y: 2 }, { x: d('2026-01-05'), y: 3 }, { x: d('2026-01-20'), y: 5 }];
  // A null between the two sides of the gap is what stops Chart.js drawing a line across it.
  expect(withGaps(points, 7).map((p) => p.y)).toEqual([2, 3, null, 5]);
  expect(withGaps(points, 21).map((p) => p.y)).toEqual([2, 3, 5]);
  expect(withGaps(points, 7)[2].x).toBe(d('2026-01-05') + day);
});
test('percentage change uses the range midpoint and says nothing when a side is unquoted', () => {
  expect(pctChange({ ...row, low: 11, high: 13 }, row)).toBeCloseTo(20);
  expect(pctChange({ ...row, advertised_average: 3 }, { ...row, advertised_average: 2 })).toBe(50);
  expect(pctChange(row, { ...row, low: null, high: null })).toBeNull();
  expect(pctChange({ ...row, high: null }, { ...row, high: null, low: 10 })).toBeCloseTo(-10);
  expect(pctLabel(20)).toBe('+20%');
  expect(pctLabel(-4.44)).toBe('-4.4%');
  expect(pctLabel(0)).toBe('0%');
  expect(pctLabel(null)).toBe('');
  expect(longestGap([{ date: '2026-01-01' }, { date: '2026-01-03' }, { date: '2026-03-01' }, { date: '2026-03-20' }])).toEqual({ from: '2026-01-03', to: '2026-03-01' });
});
test('summaries use the nearest report within tolerance and the trailing year', () => {
  const observations = [{ ...row, id: '1', date: '2025-09-19', low: 5, high: 6 }, { ...row, id: '2', date: '2026-08-20', low: 7, high: 8 }, { ...row, id: '3', date: '2026-09-18', low: 9, high: 11 }];
  const series = { ...groupSeries(observations)[0], observations };
  const summary = summarize(series);
  expect(summary.monthAgo.date).toBe('2026-08-20');
  expect(summary.yearAgo.date).toBe('2025-09-19');
  expect(summary.yearChange).toBeCloseTo(81.8, 0);
  expect(summary.gap).toEqual({ from: '2025-09-19', to: '2026-08-20' });
  expect(summary.yearLow.low).toBe(5);
  expect(summary.yearHigh.high).toBe(11);
  expect(nearest(observations, '2026-06-01', 4)).toBeNull();
});
test('year-earlier overlay shifts by 52 weeks so weekdays align', () => {
  const shifted = yearEarlier([{ date: '2025-09-19', low: 1, high: 2 }, { date: '2024-09-20', low: 1, high: 2 }], '2026-09-01', '2026-09-30');
  expect(shifted.map((r) => r.date)).toEqual(['2026-09-18']);
});
test('benchmark prefers a shipping-point product still quoted, with the most reports', () => {
  const make = (id, stage, dates) => ({ id, stage, retail: false, lastDate: dates.at(-1), latest: { low: 1, high: 2, advertised_average: null }, observations: dates.map((date) => ({ date, low: 1, high: 2, advertised_average: null })) });
  const groups = [make('w', 'Wholesale', ['2026-09-01', '2026-09-02', '2026-09-18']), make('s', 'Shipping point', ['2026-09-18']), make('old', 'Shipping point', ['2025-01-01', '2025-01-02'])];
  expect(pickBenchmark(groups, '2026-09-18').id).toBe('s');
  expect(pickBenchmark(groups, '2026-09-18', [], (g) => g.id === 'w').id).toBe('w');
  const alaska = { ...make('ak', 'Retail promotion', ['2026-09-11', '2026-09-18']), market: 'Alaska', retail: true }; const national = { ...make('us', 'Retail promotion', ['2026-09-18']), market: 'National', retail: true };
  expect(pickBenchmark([alaska, national], '2026-09-18').id).toBe('us');
  const seasonal = make('gap', 'Shipping point', ['2026-08-21', '2026-09-18']);
  expect(pickBenchmark([make('busy', 'Shipping point', ['2026-01-05', '2026-01-06', '2026-01-07', '2026-09-18']), seasonal], '2026-09-18').id).toBe('gap');
  expect(pickBenchmark(groups.map((g) => ({ ...g, commodity: g.id === 'w' ? 'Lettuce, Iceberg' : 'Lettuce, Mesculin Mix' })), '2026-09-18', ['Lettuce, Iceberg']).id).toBe('w');
});
test('route matching handles trailing slashes and rejects unknown pages', () => {
  expect(pageKey('/food-prices/commodity/onions/')).toBe('commodity/onions');
  expect(pageKey('/food-prices/retail')).toBe('retail');
  expect(pageKey('/food-prices/about/')).toBe('about');
  expect(pageKey('/food-prices/commodity/peppers-bell-type')).toBe('commodity/peppers-bell-type');
  expect(pageKey('/food-prices/commodities/')).toBe('commodities');
  expect(pageKey('/food-prices/commodity/Bad Slug')).toBeNull();
});
test('news articles map to commodities from their own commodity words and gaps get a plain explanation', () => {
  expect(newsFamilies({ commodities: ['Iceberg', 'Green onions'], signals: [{ commodity: 'Romaine Hearts' }] })).toEqual(['onions', 'lettuce']);
  expect(newsFamilies({ commodities: ['Limes'], signals: [] })).toEqual([]);
  expect(gapNote([{ date: '2026-05-15', low: 1, high: 2, advertised_average: null }, { date: '2026-07-27', low: 1, high: 2, advertised_average: null }], '2026-01-01', '2026-09-18')).toContain('15 May 2026 to 27 Jul 2026, 73 days');
  expect(gapNote([{ date: '2026-05-15', low: 1, high: 2, advertised_average: null }, { date: '2026-05-18', low: 1, high: 2, advertised_average: null }], null, null)).toBeNull();
});
test('USDA news items appear only when the market tone changes, quotes resume or a final report is filed', () => {
  const base = { source_id: 'usda-2393', market: 'Idaho Falls FOB SC', market_stage: 'Shipping Point', commodity: 'Onions, Dry', dimensions: { district: 'TWIN FALLS-BURLEY DISTRICT IDAHO' }, comment: null };
  const day = (date, tone, extra = {}) => ({ ...base, date, evidence: { market_tone_comments: tone, demand_tone_comments: 'MODERATE' }, ...extra });
  const rows = [day('2026-09-01', 'STEADY'), day('2026-09-02', 'ABOUT STEADY'), day('2026-09-03', 'SLIGHTLY HIGHER'), day('2026-09-04', 'SLIGHTLY HIGHER'), day('2026-09-05', 'STEADY'), day('2026-09-25', 'STEADY'), day('2026-09-26', 'STEADY', { comment: 'LAST REPORT.' })];
  const items = usdaNews(rows, { slug: 'onions', name: 'Onions' }, '2026-09-01', () => 'https://example.org');
  expect(items.map((i) => [i.date, i.title])).toEqual([
    ['2026-09-03', 'Onions, Twin Falls-Burley District Idaho: slightly higher'],
    ['2026-09-05', 'Onions, Twin Falls-Burley District Idaho: steady'],
    ['2026-09-25', 'Onions, Twin Falls-Burley District Idaho: quotes resume, steady'],
    ['2026-09-26', 'Onions, Twin Falls-Burley District Idaho: final report of the season'],
  ]);
  expect(items[0].text).toBe('Demand moderate.');
  expect(titleCase('SALINAS-WATSONVILLE CALIFORNIA')).toBe('Salinas-Watsonville California');
  expect(markonTitle('UPDATE: STRAWBERRIES')).toBe('Strawberries update');
  expect(markonTitle('UPDATE SUMMARY: WEEK OF SEPTEMBER 14, 2026')).toBe('Weekly summary, week of September 14, 2026');
  expect(markonTitle('FROM THE FIELDS: WEST COAST HEAT UPDATE')).toBe('From the fields: West Coast Heat Update');
});
test('the finding sentence states how many rose and the biggest mover', () => {
  const f = (name, yearChange) => ({ summary: { name }, benchmark: { yearChange } });
  expect(findingSentence([f('Onions', 100), f('Avocados', 4.1), f('Lettuce', null)])).toBe('All two cost more than a year ago. Onions rose most, by 100%.');
  expect(findingSentence([f('Onions', -12.4), f('Avocados', 4.1), f('Tomatoes', 2)])).toBe('Two of the three cost more than a year ago. Onions fell most, by 12%.');
  expect(findingSentence([f('Onions', 3), f('Avocados', -4.1)])).toBe('One of the two costs more than a year ago. No commodity moved more than 10%.');
  expect(findingSentence([f('Onions', null)])).toBeNull();
});
test('every food commodity becomes a family; curated names merge sub-commodities; decorations are dropped', () => {
  expect(familyFor('Lettuce, Romaine').slug).toBe('lettuce');
  expect(familyFor('Ornamental Gourds')).toBeNull();
  expect(familyFor('Shell Eggs').slug).toBe('eggs');
  expect(familyFor('Egg').slug).toBe('eggs');
  expect(familyFor('Beef').slug).toBe('beef');
  expect(groupSeries([{ ...row, commodity: 'Beef', market_stage: 'Retail - Livestock/Poultry/Egg', dimensions: { type: 'Chuck Roast', section: 'Roasts', condition: 'Fresh', environment: 'Conventional' } }], 'Beef')[0]).toMatchObject({ product: 'Chuck Roast, Roasts', retail: true, stage: 'Retail promotion' });
  expect(groupSeries([{ ...row, commodity: 'Shell Eggs', dimensions: { class: 'Large', color: 'White', egg_type: 'Cartoned', environment: 'Caged' } }], 'Shell Eggs')[0].product).toBe('Large, White, Cartoned, Caged');
  const peppers = familyFor('Peppers, Bell Type');
  expect([peppers.slug, peppers.auto]).toEqual(['peppers-bell-type', true]);
  expect(peppers.news.test('Green Bell Peppers')).toBe(true);
  expect(peppers.news.test('Jalapeno Peppers')).toBe(false);
  expect(slugify('Celeriac (Celery Root)')).toBe('celeriac');
  expect(autoFamily('Greens, Kale').news.test('Kale')).toBe(false);
  expect(autoFamily('Greens, Kale').news.test('Kale greens')).toBe(true);
});


test('short market captions match the benchmark panels', () => {
  expect(shortMarket('New York Terminal Market', 'Wholesale')).toBe('New York wholesale');
  expect(shortMarket('Idaho Falls FOB SC', 'Shipping point')).toBe('Idaho Falls shipping point');
  expect(shortMarket('Fresno (FR) FOB SC', 'Shipping point')).toBe('Fresno shipping point');
});

test('terminal market news groups by market, not by produce origin', () => {
  const base = { source_id: 'usda-2278', market: 'Atlanta Terminal Market', market_stage: 'Terminal', commodity: 'Onions', package: '50 lb sacks', low: 10, high: 12, mostly_low: null, mostly_high: null, advertised_average: null, comment: null };
  const day = (date, tone, origins) => origins.map((o, i) => ({ ...base, id: `${date}-${o}`, series_id: `s-${o}`, date, dimensions: { district: o }, evidence: { market_tone_comments: tone } }));
  const rows = [...day('2026-09-16', 'STEADY.', ['GEORGIA', 'QUEBEC']), ...day('2026-09-17', 'SLIGHTLY LOWER.', ['GEORGIA', 'QUEBEC'])];
  const items = usdaNews(rows, { slug: 'onions', name: 'Onions' }, '2026-09-01', () => 'u');
  expect(items.length).toBe(1);
  expect(items[0].title).toBe('Onions, Atlanta Terminal Market: slightly lower');
});
