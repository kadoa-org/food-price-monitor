import { expect, test } from 'bun:test';
import { buildDiffusion, buildIndex, indexSummary, weeklyPrices, weekOf } from '../src/index-calc.mjs';

const series = (id, rows) => ({ id, observations: rows.map(([date, price]) => ({ date, low: price, high: price, advertised_average: null })) });

test('a week is keyed by its Monday so daily and weekly reports share a grid', () => {
  expect(weekOf('2026-09-23')).toBe('2026-09-21');
  expect(weekOf('2026-09-21')).toBe('2026-09-21');
  expect(weekOf('2026-09-27')).toBe('2026-09-21');
});

test('several quotes in one week average, so a daily series does not outvote a weekly one', () => {
  const weeks = weeklyPrices([series('a', [['2026-09-21', 2], ['2026-09-23', 4]])]);
  expect(weeks.get('2026-09-21').get('a')).toBe(3);
});

test('the index is a geometric mean of price relatives, as BLS uses for basic indexes', () => {
  // Two series, one doubling and one halving, leave the geometric mean exactly where it started.
  const { points } = buildIndex([
    series('a', [['2026-09-07', 10], ['2026-09-14', 20]]),
    series('b', [['2026-09-07', 10], ['2026-09-14', 5]]),
  ], { minMatched: 2 });
  expect(points[0].value).toBe(100);
  expect(points[1].value).toBeCloseTo(100, 5);
  // Both quadrupling moves the index by the same factor, not by the average of the dollar amounts.
  const doubled = buildIndex([
    series('a', [['2026-09-07', 10], ['2026-09-14', 40]]),
    series('b', [['2026-09-07', 1], ['2026-09-14', 4]]),
  ], { minMatched: 2 });
  expect(doubled.points[1].value).toBeCloseTo(400, 3);
});

test('a commodity leaving or joining the basket never moves the index by itself', () => {
  // b is quoted only in the second week, at a wildly different price. Only a is matched, so the index follows a.
  const { points } = buildIndex([
    series('a', [['2026-09-07', 10], ['2026-09-14', 11]]),
    series('b', [['2026-09-14', 1000]]),
  ], { minMatched: 1 });
  expect(points[1].value).toBeCloseTo(110, 3);
  expect(points[1].matched).toBe(1);
});

test('a seasonal gap resumes against the last price rather than restarting the level', () => {
  const { points } = buildIndex([
    series('a', [['2026-09-07', 10], ['2026-09-14', 10], ['2026-09-21', 10]]),
    // b disappears for a week and comes back 50% dearer than when it left.
    series('b', [['2026-09-07', 10], ['2026-09-21', 15]]),
  ], { minMatched: 1 });
  expect(points[1].matched).toBe(1);
  // Third step matches both: a flat, b up 50%, so the geometric mean is sqrt(1 * 1.5).
  expect(points[2].matched).toBe(2);
  expect(points[2].value).toBeCloseTo(100 * Math.sqrt(1.5), 3);
});

test('a week with too few matched series carries the level and is marked thin', () => {
  const { points } = buildIndex([
    series('a', [['2026-09-07', 10], ['2026-09-14', 100]]),
  ], { minMatched: 5 });
  expect(points[1].thin).toBe(true);
  expect(points[1].value).toBe(100);
});

test('changes compare four-week averages so one noisy week cannot set the headline', () => {
  // A flat year at 100 with a single spike in the very last week. Week against week would call it +20%; the
  // four-week average moves by a quarter of that, which is the honest reading of one spike.
  const points = Array.from({ length: 60 }, (_, i) => ({ week: `w${i}`, value: 100, matched: 30, thin: false }));
  points[59] = { ...points[59], value: 120 };
  const s = indexSummary(points);
  expect(s.value).toBe(120);
  expect(s.yearChange).toBeCloseTo(5, 6);
  expect(s.monthChange).toBeCloseTo(5, 6);
});

test('a year change is withheld until there is a full year and a window to compare against', () => {
  const points = Array.from({ length: 10 }, (_, i) => ({ week: `w${i}`, value: 100 + i, matched: 30, thin: false }));
  expect(indexSummary(points).yearChange).toBeNull();
});

test('the series starts where the basket is broad, not where the data happens to begin', () => {
  // One commodity is quoted from the start and doubles; the rest only appear later. An index published from the
  // earliest date would be that single commodity, so the published series begins when the basket fills out.
  const early = series('solo', [['2026-01-05', 10], ['2026-01-12', 20], ['2026-01-19', 20], ['2026-01-26', 20]]);
  const late = Array.from({ length: 5 }, (_, i) => series(`x${i}`, [['2026-01-19', 10], ['2026-01-26', 11]]));
  const { base, points } = buildIndex([early, ...late], { minMatched: 1, startWhenMatched: 5 });
  expect(base).toBe('2026-01-26');
  expect(points[0].value).toBe(100);
  expect(points).toHaveLength(1);
});

test('the trend is the share of foods priced above four weeks earlier, unchanged prices left out', () => {
  const weeks = ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31'];
  const rising = series('up', weeks.map((w, i) => [w, 10 + i]));
  const falling = series('down', weeks.map((w, i) => [w, 10 - i]));
  const flat = series('flat', weeks.map((w) => [w, 10]));
  const [point] = buildDiffusion([rising, falling, flat], { lag: 4, minCompared: 1 });
  expect(point.week).toBe('2026-08-31');
  expect([point.rose, point.fell]).toEqual([1, 1]);
  // Unchanged prices neither push the share up nor down.
  expect(point.share).toBe(0.5);
});

test('a week comparing too few foods is omitted rather than shown as a swing', () => {
  const weeks = ['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31'];
  const one = series('one', weeks.map((w, i) => [w, 10 + i]));
  expect(buildDiffusion([one], { lag: 4, minCompared: 5 })).toEqual([]);
});

test('weighted, a heavily bought category moves the index more than a lightly bought one', () => {
  // Potatoes double; one minor vegetable halves. Unweighted, those cancel exactly. With potatoes weighted four
  // times as heavily, the index rises, which is the difference weighting exists to make.
  const potatoes = { ...series('p', [['2026-09-07', 10], ['2026-09-14', 20]]), family: 'Potatoes' };
  const aloe = { ...series('a', [['2026-09-07', 10], ['2026-09-14', 5]]), family: 'Aloe Leaves' };
  const stratumOf = (s) => (s.family === 'Potatoes' ? 'potatoes' : 'otherVegetables');
  const unweighted = buildIndex([potatoes, aloe], { minMatched: 2, startWhenMatched: 1 });
  expect(unweighted.points[1].value).toBeCloseTo(100, 5);
  const weighted = buildIndex([potatoes, aloe], { minMatched: 2, startWhenMatched: 1, weights: { potatoes: 4, otherVegetables: 1 }, stratumOf });
  // exp((4 ln 2 + 1 ln 0.5) / 5) = 2^(3/5)
  expect(weighted.points[1].value).toBeCloseTo(100 * 2 ** 0.6, 3);
});

test('within a category the average is unweighted, so ten minor vegetables count once together, not ten times', () => {
  const stratumOf = (s) => (s.id === 'p' ? 'potatoes' : 'otherVegetables');
  const potatoes = series('p', [['2026-09-07', 10], ['2026-09-14', 20]]);
  const minors = Array.from({ length: 10 }, (_, i) => series(`m${i}`, [['2026-09-07', 10], ['2026-09-14', 5]]));
  const { points } = buildIndex([potatoes, ...minors], { minMatched: 1, startWhenMatched: 1, weights: { potatoes: 1, otherVegetables: 1 }, stratumOf });
  // Equal weights across the two categories: potatoes x2 and the minor group x0.5 cancel, however many minors.
  expect(points[1].value).toBeCloseTo(100, 5);
});
