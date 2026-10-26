import { expect, test } from 'bun:test';
import { COST_SERIES, FRED_SERIES, buildCandyCosts, candyCostsCsv, parseFred } from '../src/candyCosts.mjs';

const month = (pairs) => new Map(pairs);
const bls = new Map([
  [COST_SERIES.cocoa, month([['2019-12', 100], ['2025-03', 320], ['2025-09', 270], ['2026-09', 227]])],
  [COST_SERIES.materials, month([['2019-12', 200], ['2025-04', 420], ['2025-09', 360], ['2026-09', 300]])],
  [COST_SERIES.makers, month([['2019-12', 300], ['2025-09', 330], ['2026-09', 360]])],
  // Candy has one month more than the rest, which no line may reach.
  [COST_SERIES.candy, month([['2019-12', 150], ['2025-09', 210], ['2026-09', 228], ['2026-10', 230]])],
]);
const fredCsv = 'observation_date,PCOCOUSDM,PSUGAISAUSDM,PSUGAUSAUSDM\n2000-01-01,900,6.1,18.5\n2019-12-01,2500,13.5,26.0\n2022-06-01,3500,18.0,35.0\n2025-01-01,10700,18.9,36.1\n2026-09-01,5900,17.9,38.3\n2026-10-01,6000,.,\n';

test('changes since December 2019 end in the latest month every series has', () => {
  const c = buildCandyCosts({ bls, fred: parseFred(fredCsv, Object.values(FRED_SERIES)) });
  expect(c.month).toBe('2026-09');
  expect(c.rows.at(-1)).toEqual({ month: '2026-09', cocoa: 127, materials: 50, makers: 20, candy: 52 });
  expect(c.rows.find((r) => r.month === '2025-03')).toEqual({ month: '2025-03', cocoa: 220, materials: null, makers: null, candy: null });
  expect(c.figures.cocoa).toEqual({ since: 127, year: -15.93, peak: { month: '2025-03', since: 220 }, fromPeak: -29.06 });
  expect(c.figures.makers.fromPeak).toBe(0);
  expect(c.figures.candy.year).toBe(8.57);
});

test('cocoa and sugar levels: record, fall from it, and the US premium over world sugar', () => {
  const c = buildCandyCosts({ bls, fred: parseFred(fredCsv, Object.values(FRED_SERIES)) });
  expect(c.cocoa).toMatchObject({ month: '2026-10', latest: 6000, peak: { month: '2025-01', value: 10700 }, before2023: 3500, base: 2500 });
  expect(c.cocoa.fromPeak).toBe(-43.93);
  // October has cocoa but no sugar, so sugar ends in September.
  expect(c.sugar).toMatchObject({ month: '2026-09', us: 38.3, world: 17.9, ratio: 2.14 });
  expect(candyCostsCsv(c.rows).split('\n').at(-2)).toBe('2026-09,127,50,20,52');
});

test('a series without the December 2019 base fails loudly', () => {
  const gap = new Map(bls); gap.set(COST_SERIES.makers, month([['2025-09', 330], ['2026-09', 360]]));
  expect(() => buildCandyCosts({ bls: gap, fred: parseFred(fredCsv, Object.values(FRED_SERIES)) })).toThrow('WPU0255 has no value for 2019-12');
  expect(() => parseFred('observation_date,PCOCOUSDM\n2020-01-01,1\n', Object.values(FRED_SERIES))).toThrow('FRED file has no column PSUGAUSAUSDM');
});
