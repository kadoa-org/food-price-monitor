// The candy price index: BLS's consumer price index for candy and chewing gum (CUUR0000SEFR02), against all consumer
// prices (CUUR0000SA0) and average hourly pay of private employees (CEU0500000003). All three are not seasonally
// adjusted, so a month is only ever compared with the same month a whole number of years earlier, or with a fixed
// base month. The index covers all candy and gum bought for home use, not only Halloween candy.
export const CANDY_SERIES = { candy: 'CUUR0000SEFR02', all: 'CUUR0000SA0', wages: 'CEU0500000003' };
// The headline figures cover the same five years the candy charts open on, so the page states one period throughout.
export const HEADLINE_YEARS = 5;
// The candy index starts in December 1997. Over the 25 years to December 2022 it rose almost exactly as much as all
// prices; the long view on the insight page splits there.
export const LONG_FROM = '1997-12';
export const LONG_SPLIT = '2022-12';

// BLS flat files: tab-separated series id, year, period (M01 to M12, M13 is the annual average) and value. A month
// BLS did not publish (October 2025, in the federal shutdown) carries "-" and is left out, not read as zero.
export function parseBls(text, ids) {
  const wanted = new Set(ids);
  const out = new Map(ids.map((id) => [id, new Map()]));
  for (const line of text.split('\n')) {
    const [id, year, period, value] = line.split('\t').map((f) => f.trim());
    if (!wanted.has(id) || !/^M(0[1-9]|1[0-2])$/.test(period ?? '')) continue;
    const v = Number(value);
    if (value && Number.isFinite(v)) out.get(id).set(`${year}-${period.slice(1)}`, v);
  }
  return out;
}

const pct = (to, from) => Number(((to / from - 1) * 100).toFixed(2));
const shiftYear = (ym, k) => `${Number(ym.slice(0, 4)) + k}${ym.slice(4)}`;

// Everything the candy page and the insight need, from three monthly series (Maps of 'YYYY-MM' to value).
export function buildCandy({ candy, all, wages }) {
  const month = [...candy.keys()].filter((m) => all.has(m)).sort().at(-1);
  if (!month) throw new Error('Candy and all-items CPI share no month');
  for (const [name, s, m] of [['candy', candy, LONG_FROM], ['all items', all, LONG_FROM], ['candy', candy, LONG_SPLIT], ['all items', all, LONG_SPLIT]]) {
    if (!s.has(m)) throw new Error(`${name} has no value for ${m}`);
  }
  // Pay is published a month before prices, so the latest common month decides where every line ends.
  const months = (from) => [...new Set([...candy.keys(), ...all.keys()])].filter((m) => m >= from && m <= month).sort();
  // Index values and pay as BLS publishes them, for the charts, the table and the download.
  const rows = months(LONG_FROM).map((m) => ({ month: m, candy: candy.get(m) ?? null, all: all.get(m) ?? null, wages: wages.get(m) ?? null }));
  const yearAgo = shiftYear(month, -1);
  const since = horizonStart(rows, month, String(HEADLINE_YEARS));
  if (!wages.has(since) || !wages.has(month)) throw new Error(`Pay has no value for ${wages.has(since) ? month : since}`);
  const figures = {
    candyYear: candy.has(yearAgo) ? pct(candy.get(month), candy.get(yearAgo)) : null,
    allYear: all.has(yearAgo) ? pct(all.get(month), all.get(yearAgo)) : null,
    since,
    candySince: pct(candy.get(month), candy.get(since)),
    allSince: pct(all.get(month), all.get(since)),
    wagesSince: pct(wages.get(month), wages.get(since)),
    // How much more of an hour's pay the same candy takes than at the start of the window.
    workSince: Number((((candy.get(month) / candy.get(since)) / (wages.get(month) / wages.get(since)) - 1) * 100).toFixed(2)),
  };
  // Each year's change over the same calendar month, newest first. A year with either month unpublished is left out.
  const years = [];
  for (let m = month; shiftYear(m, -1) >= LONG_FROM; m = shiftYear(m, -1)) {
    const p = shiftYear(m, -1);
    if (candy.has(m) && candy.has(p) && all.has(m) && all.has(p)) years.push({ year: Number(m.slice(0, 4)), candy: pct(candy.get(m), candy.get(p)), all: pct(all.get(m), all.get(p)) });
  }
  const longRun = {
    from: LONG_FROM, split: LONG_SPLIT,
    candyBefore: pct(candy.get(LONG_SPLIT), candy.get(LONG_FROM)), allBefore: pct(all.get(LONG_SPLIT), all.get(LONG_FROM)),
    candyAfter: pct(candy.get(month), candy.get(LONG_SPLIT)), allAfter: pct(all.get(month), all.get(LONG_SPLIT)),
  };
  return { month, series: CANDY_SERIES, figures, years, longRun, rows };
}

// The time ranges the candy charts offer, each measured from its own first month: rolling windows back from the latest
// month, and the start of the candy index. Pay starts in 2006, so it is in every range but the full one.
export const HORIZONS = [['1', 'Past year'], ['5', '5 years'], ['10', '10 years'], ['20', '20 years'], ['all', 'All, since 1997']];
export function horizonStart(rows, month, horizon) {
  const priced = (r) => r.candy !== null && r.all !== null;
  if (horizon === 'all') return rows.find(priced)?.month ?? LONG_FROM;
  const target = shiftYear(month, -Number(horizon));
  // A window that starts on a month BLS did not publish starts on the next one it did.
  const start = rows.find((r) => r.month >= target && priced(r));
  if (!start) throw new Error(`No candy and all-items month from ${target}`);
  return start.month;
}
// Percent change of each series since `from`, monthly: [month, candy, all, wages]. A month BLS did not publish is
// null; pay is null throughout when it has no value in the first month, so no line starts from a different month.
export function rebase(rows, from) {
  const base = rows.find((r) => r.month === from);
  if (!base?.candy || !base.all) throw new Error(`No candy and all-items value for ${from}`);
  const change = (v, b) => (v === null || !b ? null : pct(v, b));
  return rows.filter((r) => r.month >= from).map((r) => [r.month, change(r.candy, base.candy), change(r.all, base.all), change(r.wages, base.wages)]);
}

// The insight's headline, written for Halloween. "Twice as fast" only when the ratio rounds to two; otherwise the ratio
// is spelled out.
export function candyHeadline(longRun) {
  const ratio = longRun.candyAfter / longRun.allAfter;
  const pace = Math.abs(ratio - 2) < 0.25 ? 'twice as fast as' : ratio > 1 ? `${ratio.toFixed(1)} times as fast as` : 'more slowly than';
  return `Trick or treat: candy prices are rising ${pace} inflation`;
}

export const candyCsv = (rows) => ['month,candy_cpi,all_items_cpi,average_hourly_earnings_usd', ...rows.map((r) => [r.month, r.candy ?? '', r.all ?? '', r.wages ?? ''].join(','))].join('\n') + '\n';
