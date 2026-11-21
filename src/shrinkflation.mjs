// The shrinkflation report: how much smaller packs added to US grocery prices, from two public sources.
// - BLS publishes the consumer price index both as normal and without product size changes (research CPI R-CPI-SC),
//   and the monthly count of downsized and upsized items in its sample. The dataset pipeline's
//   shrinkflation/data.py writes both, against the published CPI, to exports/shrinkflation.json.
// - GAO's July 2025 report (GAO-25-107451) measured, with NielsenIQ checkout data for 2021 to 2023, the share of
//   products downsized in seven categories and those products' share of sales. Its figures are fixed, given here.

export const SHRINK_SLUG = 'shrinkflation-2026';
export const GAO_URL = 'https://www.gao.gov/products/gao-25-107451';
export const BLS_URL = 'https://www.bls.gov/cpi/research-series/r-cpi-sc.htm';
// GAO-25-107451, Tables 2 and 3 at its baseline: a size cut of up to 20% that replaced the old size at a higher price
// per unit. Shares in percent.
export const GAO = [
  { name: 'Paper towels', items: 2.57, sales: 38.6 },
  { name: 'Toilet paper', items: 2.4, sales: 10.7 },
  { name: 'Cereal', items: 1.07, sales: 8.56 },
  { name: 'Coffee', items: 0.11, sales: 6.44 },
  { name: 'Laundry detergent', items: 0.81, sales: 3.44 },
  { name: 'Toothpaste', items: 0.4, sales: 2.3 },
  { name: 'Pain relievers', items: 0.23, sales: 0.53 },
];
// BLS strata for goods sold by weight (meat, poultry, fish, eggs, fruit and vegetables): a different weight there is
// not a smaller package, so they are left out of the ranking.
const BY_WEIGHT = ['SEFC', 'SEFD', 'SEFE', 'SEFF', 'SEFG', 'SEFH', 'SEFK', 'SEFL'];
const PAPER_AND_CLEANING = ['SEHN01', 'SEHN02'];
export const NAMES = {
  SEHN02: 'Toilet paper, paper towels and tissues', SEFT03: 'Chips, pretzels and other snacks', SEFR02: 'Candy and chewing gum',
  SEFA01: 'Flour and baking mixes', SEFB03: 'Cakes, cupcakes and cookies', SEFT01: 'Soups', SEFJ03: 'Ice cream',
  SEFJ01: 'Milk', SEFS01: 'Butter and margarine', SEFB02: 'Bread rolls, biscuits and muffins', SEFP02: 'Tea and other drink mixes',
  SEFP01: 'Coffee', SEHN01: 'Household cleaning products', SEFA02: 'Breakfast cereal', SAF11: 'All food at home',
};
// A category is ranked only if size changes moved it by at least this many points; below that the share is noise.
const MIN_ADDED = 0.5;

// bls: the pipeline's data.json ({ from, to, source, categories, counts }).
export function buildShrinkflation(bls) {
  const food = bls.categories.find((c) => c.code === 'SAF11');
  if (!food) throw new Error('Shrinkflation: no food at home series in the BLS data');
  const ranked = bls.categories
    .filter((c) => c.code !== 'SAF11' && c.published > 0 && ((c.group === 'food' && !BY_WEIGHT.some((p) => c.code.startsWith(p))) || PAPER_AND_CLEANING.includes(c.code)))
    .filter((c) => c.added >= MIN_ADDED)
    .map((c) => ({ code: c.code, name: NAMES[c.code] ?? c.title, published: c.published, withoutSize: c.withoutSize, added: c.added, share: Number(((c.added / c.published) * 100).toFixed(1)) }))
    .sort((a, b) => b.share - a.share);
  // Downsized and upsized items per year; the latest year is partial and says through which month.
  const years = new Map();
  for (const c of bls.counts) {
    const y = c.month.slice(0, 4);
    const row = years.get(y) ?? { year: Number(y), down: 0, up: 0, through: c.month };
    row.down += c.down; row.up += c.up; row.through = c.month;
    years.set(y, row);
  }
  const counts = [...years.values()].map((r) => ({ ...r, partial: !r.through.endsWith('-12') }));
  const since21 = counts.filter((r) => r.year >= 2021);
  return {
    from: bls.from, to: bls.to,
    food: { published: food.published, withoutSize: food.withoutSize, added: food.added, share: Number(((food.added / food.published) * 100).toFixed(1)) },
    ranked, counts,
    downPerUp: Number((since21.reduce((t, r) => t + r.down, 0) / since21.reduce((t, r) => t + r.up, 0)).toFixed(1)),
    gao: GAO,
  };
}

export function shrinkflationTitle(s) {
  const top = s.ranked[0];
  // Under 70 characters, so it fits two lines of the text column.
  const short = { SEHN02: 'paper goods', SEFT03: 'snacks' }[top.code] ?? top.name.toLowerCase();
  return `Smaller packs drove ${Math.round(top.share)}% of the rise in ${short} prices, ${Math.round(s.food.share)}% for food`;
}

export function shrinkflationCsv(s) {
  const q = (v) => (/[",]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : v);
  const lines = [`category,bls_item_code,price_change_pct_${s.from}_to_${s.to},price_change_without_size_changes_pct,points_added_by_size_changes,share_of_rise_pct`];
  lines.push(['All food at home', 'SAF11', s.food.published, s.food.withoutSize, s.food.added, s.food.share].map(q).join(','));
  for (const c of s.ranked) lines.push([c.name, c.code, c.published, c.withoutSize, c.added, c.share].map(q).join(','));
  lines.push('', 'year,downsized_items,upsized_items,through_month');
  for (const r of s.counts) lines.push([r.year, r.down, r.up, r.through].join(','));
  lines.push('', 'gao_category_2021_2023,share_of_products_downsized_pct,share_of_sales_downsized_pct');
  for (const g of s.gao) lines.push([g.name, g.items, g.sales].map(q).join(','));
  return lines.join('\n') + '\n';
}
