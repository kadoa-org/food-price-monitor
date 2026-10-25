// The Halloween candy insight: NRF's planned candy spending per person celebrating against BLS candy prices and all
// prices, each September (the month before Halloween, and the month NRF runs its survey), since 2010. The BLS series
// are the candy block's (CANDY_SERIES), not seasonally adjusted, which is fine here because every year is the same
// month. Products are a one-day snapshot of a large US retailer's online prices.
import { CANDY_SERIES } from './candy.mjs';

export const HALLOWEEN_FROM = 2010;
// The headline compares from September 2020, the last year before the price surge. Budgets outran prices in the
// 2010s and prices caught up after, so the two starts tell different stories and the page shows both.
export const HALLOWEEN_SINCE = 2020;
const MONTH = '09';

const pct = (to, from) => Number(((to / from - 1) * 100).toFixed(2));

// spend: { 'YYYY': dollars } from NRF; candy and all: Maps of 'YYYY-MM' to index value; shop: the Kadoa snapshot.
export function buildHalloween({ spend, candy, all, shop }) {
  const years = Object.keys(spend).map(Number).filter((y) => y >= HALLOWEEN_FROM).sort((a, b) => a - b);
  if (years[0] !== HALLOWEEN_FROM) throw new Error(`NRF spending has no value for ${HALLOWEEN_FROM}`);
  for (const y of years) for (const [name, s] of [['candy', candy], ['all items', all]]) {
    if (!s.has(`${y}-${MONTH}`)) throw new Error(`${name} CPI has no value for ${y}-${MONTH}`);
  }
  const first = years[0];
  const base = { spend: spend[first], candy: candy.get(`${first}-${MONTH}`), all: all.get(`${first}-${MONTH}`) };
  const rows = years.map((year) => {
    const s = spend[year], c = candy.get(`${year}-${MONTH}`), a = all.get(`${year}-${MONTH}`);
    return { year, spend: s, candyCpi: c, allCpi: a, spendChange: pct(s, base.spend), candyChange: pct(c, base.candy), allChange: pct(a, base.all) };
  });
  const last = rows.at(-1);
  const mid = rows.find((r) => r.year === HALLOWEEN_SINCE);
  if (!mid) throw new Error(`NRF spending has no value for ${HALLOWEEN_SINCE}`);
  for (const r of rows) if (r.year >= HALLOWEEN_SINCE) Object.assign(r, { spendSince: pct(r.spend, mid.spend), candySince: pct(r.candyCpi, mid.candyCpi), allSince: pct(r.allCpi, mid.allCpi) });
  return {
    from: first, since: HALLOWEEN_SINCE, to: last.year, series: { candy: CANDY_SERIES.candy, all: CANDY_SERIES.all },
    figures: {
      spendFrom: base.spend, spendTo: last.spend, spend: last.spendChange, candy: last.candyChange, all: last.allChange,
      since: { spendFrom: mid.spend, spend: last.spendSince, candy: last.candySince, all: last.allSince },
      decade: { spend: mid.spendChange, candy: mid.candyChange },
    },
    rows, products: shop.products, retailer: shop.retailer, date: shop.date,
  };
}

// Price first while prices lead; if budgets catch up, the order flips so the sentence stays true.
export function halloweenHeadline(f) {
  const c = Math.round(f.since.candy), b = Math.round(f.since.spend);
  // A no-break space keeps "since 2020" on one line when the heading wraps.
  return c > b ? `Candy prices are up ${c}% since\u00a0${HALLOWEEN_SINCE}, Halloween candy budgets ${b}%` : `Halloween candy budgets are up ${b}% since\u00a0${HALLOWEEN_SINCE}, candy prices ${c}%`;
}

// The site banner's text, about 50 characters with the number first. Without BLS it falls back to NRF alone.
export function halloweenBanner(f) {
  return `Candy prices up ${Math.round(f.since.candy)}% since ${HALLOWEEN_SINCE}, budgets ${Math.round(f.since.spend)}%`;
}
export function halloweenBudgetBanner(spend) {
  const last = Math.max(...Object.keys(spend).map(Number));
  if (!spend[HALLOWEEN_SINCE] || !spend[last]) throw new Error(`NRF spending has no value for ${HALLOWEEN_SINCE}`);
  return `Halloween candy budgets up ${Math.round(pct(spend[last], spend[HALLOWEEN_SINCE]))}% since ${HALLOWEEN_SINCE}`;
}

export const halloweenCsv = (rows) => ['year,nrf_planned_candy_spend_usd,candy_cpi_september,all_items_cpi_september,spend_change_since_2010_pct,candy_price_change_since_2010_pct,all_prices_change_since_2010_pct,spend_change_since_2020_pct,candy_price_change_since_2020_pct,all_prices_change_since_2020_pct',
  ...rows.map((r) => [r.year, r.spend, r.candyCpi, r.allCpi, r.spendChange, r.candyChange, r.allChange, r.spendSince ?? '', r.candySince ?? '', r.allSince ?? ''].join(','))].join('\n') + '\n';
