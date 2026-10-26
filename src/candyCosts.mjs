// Why candy costs more: the chain from cocoa to the candy aisle, as the BLS Monthly Labor Review article "Why is candy
// so expensive these days?" (Natalie Ho, September 2026) charted it from December 2019 to November 2024, carried on to
// the latest month. Four BLS series, not seasonally adjusted, each as the change since December 2019, the article's
// base: import prices of cocoa and cocoa preparations, producer prices of confectionery materials (cocoa products,
// sweeteners) and of confectionery end products (what candy makers charge), and consumer prices of candy and chewing
// gum. Two IMF prices from FRED add the levels: cocoa in dollars a metric ton, and US against world raw sugar in cents
// a pound, monthly averages.
export const COST_SERIES = { cocoa: 'EIUIP18', materials: 'WPU0254', makers: 'WPU0255', candy: 'CUUR0000SEFR02' };
// The BLS flat file each series is in, fetched once per run.
export const COST_FILES = { EIUIP18: 'ei/ei.data.05.HarmonizedImport', WPU0254: 'wp/wp.data.3.ProcessedFoods', WPU0255: 'wp/wp.data.3.ProcessedFoods', CUUR0000SEFR02: 'cu/cu.data.11.USFoodBeverage' };
export const COST_FROM = '2019-12';
export const FRED_SERIES = { cocoa: 'PCOCOUSDM', sugarUs: 'PSUGAUSAUSDM', sugarWorld: 'PSUGAISAUSDM' };
export const FRED_FROM = '2000-01';

const pct = (to, from) => Number(((to / from - 1) * 100).toFixed(2));
const shiftYear = (ym, k) => `${Number(ym.slice(0, 4)) + k}${ym.slice(4)}`;

// FRED's graph CSV: a date column then one column per series id; a missing value is empty or ".". Returns a Map per id
// of 'YYYY-MM' to value.
export function parseFred(text, ids) {
  const [head, ...lines] = text.trim().split('\n');
  const cols = head.split(',').map((c) => c.trim());
  const out = new Map(ids.map((id) => [id, new Map()]));
  for (const id of ids) if (!cols.includes(id)) throw new Error(`FRED file has no column ${id}`);
  for (const line of lines) {
    const cells = line.split(',');
    const month = cells[0].slice(0, 7);
    for (const id of ids) {
      const raw = cells[cols.indexOf(id)]?.trim();
      const v = Number(raw);
      if (raw && raw !== '.' && Number.isFinite(v)) out.get(id).set(month, v);
    }
  }
  return out;
}

// The highest month at or after `from`, and how far the latest value sits below it.
function peakOf(series, from, month) {
  let peak = null;
  for (const [m, v] of series) if (m >= from && m <= month && (!peak || v > peak.value)) peak = { month: m, value: v };
  return peak;
}

// bls: Map of series id to Map('YYYY-MM' -> index); fred: Map of series id to Map('YYYY-MM' -> price).
export function buildCandyCosts({ bls, fred }) {
  const keys = Object.keys(COST_SERIES);
  const series = Object.fromEntries(keys.map((k) => [k, bls.get(COST_SERIES[k])]));
  for (const k of keys) if (!series[k]?.has(COST_FROM)) throw new Error(`${COST_SERIES[k]} has no value for ${COST_FROM}`);
  // Every line ends in the latest month all four have, so the chart compares like with like.
  const month = [...series.candy.keys()].filter((m) => keys.every((k) => series[k].has(m))).sort().at(-1);
  const months = [...new Set(keys.flatMap((k) => [...series[k].keys()]))].filter((m) => m >= COST_FROM && m <= month).sort();
  const rows = months.map((m) => ({ month: m, ...Object.fromEntries(keys.map((k) => [k, series[k].has(m) ? pct(series[k].get(m), series[k].get(COST_FROM)) : null])) }));
  const yearAgo = shiftYear(month, -1);
  const figures = Object.fromEntries(keys.map((k) => {
    const s = series[k], peak = peakOf(s, COST_FROM, month);
    return [k, { since: pct(s.get(month), s.get(COST_FROM)), year: s.has(yearAgo) ? pct(s.get(month), s.get(yearAgo)) : null, peak: { month: peak.month, since: pct(peak.value, s.get(COST_FROM)) }, fromPeak: pct(s.get(month), peak.value) }];
  }));

  const cocoaSeries = fred.get(FRED_SERIES.cocoa), us = fred.get(FRED_SERIES.sugarUs), world = fred.get(FRED_SERIES.sugarWorld);
  const cocoaMonth = [...cocoaSeries.keys()].sort().at(-1);
  const cocoaPeak = peakOf(cocoaSeries, FRED_FROM, cocoaMonth);
  // Before the 2023 crop failures cocoa traded in a band; its top is the yardstick for "record".
  const before = peakOf(cocoaSeries, FRED_FROM, '2022-12');
  const cocoa = {
    month: cocoaMonth, latest: Math.round(cocoaSeries.get(cocoaMonth)), peak: { month: cocoaPeak.month, value: Math.round(cocoaPeak.value) },
    fromPeak: pct(cocoaSeries.get(cocoaMonth), cocoaPeak.value), before2023: Math.round(before.value), base: Math.round(cocoaSeries.get(COST_FROM)),
    rows: [...cocoaSeries].filter(([m]) => m >= FRED_FROM).sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => [m, Math.round(v)]),
  };
  const sugarMonths = [...us.keys()].filter((m) => m >= FRED_FROM && world.has(m)).sort();
  const sugarMonth = sugarMonths.at(-1);
  const sugar = {
    month: sugarMonth, us: Number(us.get(sugarMonth).toFixed(1)), world: Number(world.get(sugarMonth).toFixed(1)), ratio: Number((us.get(sugarMonth) / world.get(sugarMonth)).toFixed(2)),
    rows: sugarMonths.map((m) => [m, Number(us.get(m).toFixed(2)), Number(world.get(m).toFixed(2))]),
  };
  return { from: COST_FROM, month, series: COST_SERIES, rows, figures, cocoa, sugar };
}

export const candyCostsCsv = (rows) => ['month,cocoa_import_prices_change_since_2019_12_pct,confectionery_materials_ppi_change_pct,confectionery_end_products_ppi_change_pct,candy_cpi_change_pct',
  ...rows.map((r) => [r.month, r.cocoa ?? '', r.materials ?? '', r.makers ?? '', r.candy ?? ''].join(','))].join('\n') + '\n';
