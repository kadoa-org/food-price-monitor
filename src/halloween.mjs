// The Halloween candy insight: NRF's planned candy spending per person celebrating against BLS candy prices and all
// prices, each September (the month before Halloween, and the month NRF runs its survey), since 2010. The BLS series
// are the candy block's (CANDY_SERIES), not seasonally adjusted, which is fine here because every year is the same
// month. Products are a one-day snapshot of a large US retailer's online prices.
import { CANDY_SERIES } from './candy.mjs';

export const HALLOWEEN_FROM = 2010;
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
  return {
    from: first, to: last.year, series: { candy: CANDY_SERIES.candy, all: CANDY_SERIES.all },
    figures: { spendFrom: base.spend, spendTo: last.spend, spend: last.spendChange, candy: last.candyChange, all: last.allChange },
    rows, products: shop.products, retailer: shop.retailer, date: shop.date,
  };
}

export const halloweenHeadline = (f) => `Halloween candy budgets rose ${Math.round(f.spend)}% since ${HALLOWEEN_FROM}. Candy prices rose ${Math.round(f.candy)}%.`;

// The site banner's text, from NRF spending alone: "Halloween candy budgets up 71% since 2010".
export function halloweenBanner(spend) {
  const last = Math.max(...Object.keys(spend).map(Number));
  if (!spend[HALLOWEEN_FROM] || !spend[last]) throw new Error(`NRF spending has no value for ${HALLOWEEN_FROM}`);
  return `Halloween candy budgets up ${Math.round(pct(spend[last], spend[HALLOWEEN_FROM]))}% since ${HALLOWEEN_FROM}`;
}

export const halloweenCsv = (rows) => ['year,nrf_planned_candy_spend_usd,candy_cpi_september,all_items_cpi_september,spend_change_since_2010_pct,candy_price_change_since_2010_pct,all_prices_change_since_2010_pct',
  ...rows.map((r) => [r.year, r.spend, r.candyCpi, r.allCpi, r.spendChange, r.candyChange, r.allChange].join(','))].join('\n') + '\n';
