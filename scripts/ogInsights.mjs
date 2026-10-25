// Link previews for every food price insight, from the built page data, with the shared layout in og-insight.mjs. Each
// image goes next to the page data as og-<slug>.png, so it is published with the run it describes. Every insight in
// insights.json needs a builder here, because prerender points each insight page at its og-<slug>.png.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderOgImages } from './og-insight.mjs';

const root = resolve(import.meta.dirname, '..');
const data = join(root, 'public/data');
const load = (name) => JSON.parse(readFileSync(join(data, `${name}.json`), 'utf8'));
// The candy chart's colours (CANDY_COLOURS in CandyChart.jsx).
const ORANGE = '#f46a25', BLUE = '#12436d', GREY = '#505a5f';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const month = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v)}%`;

const builders = {
  'halloween-candy': (page) => {
    const h = page.halloween, f = h.figures;
    return {
      title: page.title, source: 'NRF Halloween survey; BLS consumer price index',
      key: `Change from September ${h.since} to ${h.to}: candy prices, planned candy spending per person celebrating, and all prices.`,
      figures: [{ value: pct(f.since.candy), label: 'Candy prices', colour: BLUE }, { value: pct(f.since.spend), label: 'Candy budget', colour: ORANGE }, { value: pct(f.since.all), label: 'All prices', colour: GREY }],
    };
  },
  'candy-prices': (page) => {
    const c = page.candy, l = c.longRun;
    const years = Number(l.split.slice(0, 4)) - Number(l.from.slice(0, 4));
    const before = Math.round(l.candyBefore) === Math.round(l.allBefore)
      ? `both rose ${Math.round(l.candyBefore)}%`
      : `candy rose ${Math.round(l.candyBefore)}% and all prices ${Math.round(l.allBefore)}%`;
    return {
      title: page.title, source: 'BLS consumer price index',
      key: `Price change from ${month(l.split)} to ${month(c.month)}. In the ${years} years before, ${before}.`,
      figures: [{ value: pct(l.candyAfter), label: 'Candy and gum', colour: ORANGE }, { value: pct(l.allAfter), label: 'All consumer prices', colour: GREY }],
    };
  },
};

const images = load('insights').insights.map(({ slug }) => {
  const build = builders[slug];
  if (!build) throw new Error(`No link preview for insight ${slug}; add a builder to scripts/ogInsights.mjs`);
  return { out: join(data, `og-${slug}.png`), ...build(load(`insights/${slug}`)) };
});
renderOgImages({ name: 'US Food Price Monitor', icon: '🥕', url: 'kadoa.com/food-prices' }, images);
