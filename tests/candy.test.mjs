import { expect, test } from 'bun:test';
import { buildCandy, candyCsv, candyHeadline, parseBls } from '../src/candy.mjs';
import { yearTicks } from '../src/chartSetup.mjs';

test('year labels thin out to every second or fifth year as the axis narrows', () => {
  const from = Date.UTC(1997, 11, 1), to = Date.UTC(2026, 7, 1);
  const years = (f, w) => yearTicks(f, to, w).map((t) => new Date(t).getUTCFullYear());
  expect(years(from, 900)).toEqual([1998, 2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026]);
  expect(years(from, 300)).toEqual([2000, 2005, 2010, 2015, 2020, 2025]);
  // The chart since 2019 starts in August, so its first label is the next January.
  expect(years(Date.UTC(2019, 7, 1), 300)).toEqual([2020, 2022, 2024, 2026]);
});

const series = (start, values) => {
  const out = new Map(); let [y, m] = start.split('-').map(Number);
  for (const v of values) { if (v !== null) out.set(`${y}-${String(m).padStart(2, '0')}`, v); m += 1; if (m > 12) { m = 1; y += 1; } }
  return out;
};

test('reads monthly values from a BLS flat file and skips annual averages and unpublished months', () => {
  const text = ['series_id\tyear\tperiod\tvalue\tfootnote_codes', 'CUUR0000SEFR02  \t2025\tM09\t  219.1\t', 'CUUR0000SEFR02  \t2025\tM10\t   -\tX', 'CUUR0000SEFR02  \t2025\tM13\t  215.0\t', 'CUUR0000SA0  \t2025\tM09\t 324.8\t', 'CUUR0000SAF11\t2025\tM09\t 1\t'].join('\n');
  const parsed = parseBls(text, ['CUUR0000SEFR02', 'CUUR0000SA0']);
  expect([...parsed.get('CUUR0000SEFR02')]).toEqual([['2025-09', 219.1]]);
  expect(parsed.get('CUUR0000SA0').get('2025-09')).toBe(324.8);
  expect(parsed.has('CUUR0000SAF11')).toBe(false);
});

// 1997-12 to 2026-08 is 345 months. Candy and all items both double by 2022-12 (301 months in), then candy rises 20%
// and all items 10%. Pay rises 1% a month from 2019-08.
const n = 345, split = 300;
const candy = series('1997-12', Array.from({ length: n }, (_, i) => (i <= split ? 100 + (100 * i) / split : 200 * (1 + (0.2 * (i - split)) / (n - 1 - split)))));
const all = series('1997-12', Array.from({ length: n }, (_, i) => (i <= split ? 100 + (100 * i) / split : 200 * (1 + (0.1 * (i - split)) / (n - 1 - split)))));
const wages = series('2006-03', Array.from({ length: 247 }, (_, i) => 20 * 1.01 ** Math.max(0, i - 161)));

test('measures candy against all prices and pay from the common base month', () => {
  const c = buildCandy({ candy, all, wages });
  expect(c.month).toBe('2026-08');
  expect(c.longRun.candyBefore).toBe(100);
  expect(c.longRun.allBefore).toBe(100);
  expect(c.longRun.candyAfter).toBe(20);
  expect(c.longRun.allAfter).toBe(10);
  expect(c.monthly[0]).toEqual(['2019-08', 0, 0, 0]);
  // Pay is a month ahead of prices in the fixture as at BLS; the comparison stops at the latest price month.
  expect(c.figures.wagesMonth).toBe('2026-08');
  expect(c.figures.workSince).toBeCloseTo(((candy.get('2026-08') / candy.get('2019-08')) / (wages.get('2026-08') / wages.get('2019-08')) - 1) * 100, 1);
  expect(c.years[0].year).toBe(2026);
  expect(c.years.at(-1).year).toBe(1999);
  expect(candyHeadline(c.longRun)).toBe('Candy prices are rising twice as fast as inflation');
});

test('leaves out a year whose month BLS did not publish instead of comparing across the gap', () => {
  const gap = new Map(candy); gap.delete('2025-08');
  const c = buildCandy({ candy: gap, all, wages });
  expect(c.years.map((y) => y.year)).not.toContain(2025);
  expect(c.years.map((y) => y.year)).not.toContain(2026);
  expect(c.monthly.find(([m]) => m === '2025-08')[1]).toBeNull();
});

test('fails loudly when a base month is missing rather than measuring from the wrong month', () => {
  const short = new Map([...candy].filter(([m]) => m >= '2020-01'));
  expect(() => buildCandy({ candy: short, all, wages })).toThrow('candy has no value for 2019-08');
});

test('writes the index values and pay as published, blank where a month is missing', () => {
  expect(candyCsv([{ month: '2025-10', candy: null, all: null, wages: 36.4 }])).toBe('month,candy_cpi,all_items_cpi,average_hourly_earnings_usd\n2025-10,,,36.4\n');
});
