import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createServer } from 'vite';
const root = resolve(import.meta.dirname, '..'); const dist = join(root, 'dist/food-prices');
const SITE = 'https://www.kadoa.com';
const template = await readFile(join(dist, 'index.html'), 'utf8');
// Data comes from the local pipeline output when present, otherwise from the published run on the CDN (Vercel builds).
const CDN = process.env.BUNNY_CDN_BASE || 'https://kadoa-datasets.b-cdn.net';
const local = join(root, 'public/data');
let dataPath = '/food-prices/data'; let sharedPath = dataPath; let load;
if (process.env.DATA_SOURCE !== 'cdn' && existsSync(join(local, 'routes.json'))) {
  load = async (name) => JSON.parse(await readFile(join(local, `${name}.json`), 'utf8'));
} else {
  // The pointer is read from Bunny storage with a read-only password when available (never cached), otherwise from
  // the CDN edge. Data files come from the CDN either way; run folders are immutable so caching cannot mix runs.
  const storageKey = process.env.BUNNY_STORAGE_READONLY_KEY;
  const pointerUrl = storageKey
    ? `https://${process.env.BUNNY_STORAGE_HOST || 'ny.storage.bunnycdn.com'}/${process.env.BUNNY_STORAGE_ZONE || 'kadoa-datasets'}/food-prices/latest.json`
    : `${CDN}/food-prices/latest.json?v=${Date.now()}`;
  const res = await fetch(pointerUrl, { headers: storageKey ? { AccessKey: storageKey } : { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`Cannot read data pointer (${storageKey ? 'storage' : 'CDN'}): HTTP ${res.status}`);
  const pointer = await res.json(); dataPath = `${CDN}${pointer.base}`; sharedPath = `${CDN}${pointer.shared ?? pointer.base}`;
  console.log(`Building from published run ${pointer.runId} (${pointer.lastDate}) via ${storageKey ? 'storage' : 'CDN'} pointer`);
  load = async (name) => { const r = await fetch(`${CDN}${pointer.base}/${name}.json`); if (!r.ok) throw new Error(`Cannot read ${name}: HTTP ${r.status}`); return r.json(); };
}
const routes = await load('routes');
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const fmt = (n) => Number(n).toLocaleString('en-US');
const absolute = (path) => (path.startsWith('http') ? path : SITE + path);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (iso) => { const [y, m, d] = iso.split('-'); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`; };
const unit = (pkg) => (/^(per|each)\b/i.test(pkg) ? pkg : `per ${pkg.replace(/s$/, '')}`);
const quoteText = (r) => r.advertised_average != null ? `$${r.advertised_average.toFixed(2)}` : r.low != null && r.high != null ? (r.low === r.high ? `$${r.low.toFixed(2)}` : `$${r.low.toFixed(2)} to $${r.high.toFixed(2)}`) : '';
// Search phrasing follows what people type: "<commodity> prices today", "chart", "USDA", "wholesale", "grocery prices".
function seo(page, path) {
  const c = page.common; const updated = c.generatedAt.slice(0, 10);
  const canonical = `${SITE}${path}`;
  const crumbs = [{ name: 'US Food Price Monitor', url: `${SITE}/food-prices` }];
  let title, description, ld;
  if (page.kind === 'home') {
    title = 'Food Prices Today: US Produce Price Charts from USDA Data';
    description = `Food prices today for onions, potatoes, tomatoes, lettuce, avocados and strawberries: USDA wholesale and shipping point quotes with price charts, change against a year earlier, grocery ad prices by region and daily updates. Latest report ${day(c.lastDate)}.`;
    ld = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'US Food Price Monitor', url: canonical, description, publisher: { '@type': 'Organization', name: 'Kadoa', url: SITE }, dateModified: updated }];
  } else if (page.kind === 'commodity') {
    const s = page.summary; const b = page.series.find((x) => x.id === page.initialSeriesId); const short = page.title.replace(/ prices$/, '');
    title = s.retailOnly ? `${short} Prices Today: Price Chart and USDA Grocery Ad History` : `${short} Prices Today: Price Chart and USDA Wholesale History`;
    description = s.retailOnly
      ? `${short} prices today: ${b ? `${quoteText(b.latest)} ${unit(b.package)}, ${b.market.toLowerCase()} average` : 'latest USDA figure'}. Weekly prices advertised in US supermarket ads from ${day(s.firstDate)} to ${day(s.lastDate)}, ${fmt(s.seriesCount)} products by region from USDA's grocery ad survey, with a price chart, year-on-year change and free CSV download.`
      : `${short} prices today: ${b ? `${quoteText(b.latest)} ${unit(b.package)} at ${b.market}` : 'latest USDA quote'}. Daily USDA wholesale and shipping point prices from ${day(s.firstDate)} to ${day(s.lastDate)}, ${fmt(s.seriesCount)} products in ${s.markets} markets, with a price chart, year-on-year change and free CSV download.`;
    crumbs.push({ name: 'Commodities', url: `${SITE}/food-prices/commodities` }, { name: s.name, url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'Dataset', name: s.retailOnly ? `${s.name} prices, USDA grocery ad survey` : `${s.name} prices, USDA wholesale and shipping point quotes`, description, url: canonical, keywords: [`${s.name.toLowerCase()} prices`, `${s.name.toLowerCase()} prices today`, `${s.name.toLowerCase()} price chart`, s.retailOnly ? 'grocery ad prices' : 'wholesale produce prices', 'USDA market news'], temporalCoverage: `${s.firstDate}/${s.lastDate}`, spatialCoverage: 'United States', license: 'https://www.usa.gov/government-works', isBasedOn: 'https://mymarketnews.ams.usda.gov/', creator: { '@type': 'Organization', name: 'Kadoa', url: SITE }, dateModified: updated, distribution: [{ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${dataPath.startsWith('http') ? dataPath : SITE + dataPath}/downloads/${s.slug}.csv` }] }];
  } else if (page.kind === 'commodities') {
    title = `Produce Prices Today: ${fmt(page.items.length)} Fruits and Vegetables Tracked from USDA Reports`;
    description = `Produce prices today for ${fmt(page.items.length)} fruits and vegetables at US wholesale markets and shipping points, from USDA reports: latest quote, change against a year earlier and a price history chart for each.`;
    crumbs.push({ name: 'Commodities', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: 'Commodities', url: canonical, numberOfItems: page.items.length, itemListElement: page.items.slice(0, 50).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: `${SITE}/food-prices/commodity/${it.slug}` })) }];
  } else if (page.kind === 'retail') {
    title = 'Grocery Prices This Week: Supermarket Ad Prices for Produce, Meat and Eggs by US Region';
    description = `Grocery prices this week${page.week ? ` (week ending ${day(page.week)})` : ''}: what US supermarkets advertised for fresh produce, beef, pork, chicken, turkey and eggs by region, from USDA's weekly survey of grocery ads, with last week's and last year's price.`;
    crumbs.push({ name: 'Retail prices', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: canonical, description, dateModified: updated }];
  } else if (page.kind === 'candy') {
    const cd = page.candy; const f = cd?.figures; const year = (cd?.month ?? c.generatedAt).slice(0, 4);
    const pc = (v) => `${Math.round(v)}%`;
    title = `Candy Prices ${year}: Halloween Candy Price Index from BLS Data`;
    description = f
      ? `US candy prices are up ${pc(f.candySince)} since August 2019, against ${pc(f.allSince)} for all consumer prices and ${pc(f.wagesSince)} for hourly pay. ${f.candyYear !== null ? `Candy rose ${f.candyYear.toFixed(1)}% in the year to ${cd.month}. ` : ''}Monthly BLS candy and chewing gum price index with charts and a free CSV download.`
      : 'The US price index for candy and chewing gum from BLS, against all consumer prices and hourly pay, with charts and a free CSV download.';
    crumbs.push({ name: 'Candy prices', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'Dataset', name: 'US candy and chewing gum price index (BLS CPI)', description, url: canonical, keywords: ['candy prices', 'halloween candy prices', 'candy price index', 'chocolate prices', 'candy inflation'], spatialCoverage: 'United States', license: 'https://www.usa.gov/government-works', isBasedOn: 'https://www.bls.gov/cpi/', creator: { '@type': 'Organization', name: 'Kadoa', url: SITE }, dateModified: updated }];
  } else if (page.kind === 'insights') {
    title = 'Food Price Insights: Charts and Analysis';
    description = `Analysis built on the US Food Price Monitor's USDA and BLS data: ${page.insights.map((i) => i.title.toLowerCase()).join('; ')}.`;
    crumbs.push({ name: 'Insights', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'ItemList', name: title, url: canonical, numberOfItems: page.insights.length, itemListElement: page.insights.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.title, url: `${SITE}/food-prices/insights/${i.slug}` })) }];
  } else if (page.kind === 'insight' && page.slug === 'halloween-candy') {
    const h = page.halloween; const f = h?.figures; const pc = (v) => `${Math.round(v)}%`;
    title = f ? `Halloween Candy Prices ${h.to}: Candy Budgets Up ${pc(f.spend)} Since ${h.from}, Candy Prices Up ${pc(f.candy)}` : 'Halloween Candy Spending Against Candy Prices';
    description = f
      ? `Americans celebrating Halloween planned to spend $${f.spendTo.toFixed(2)} each on candy in ${h.to}, up ${pc(f.spend)} from $${f.spendFrom.toFixed(2)} in ${h.from}. Candy prices rose ${pc(f.candy)} over the same years and all prices ${pc(f.all)}, so the bigger budget buys about the same candy. NRF and BLS data, with this week's Target prices.`
      : 'Planned Halloween candy spending per person from NRF against the BLS candy price index since 2010.';
    crumbs.push({ name: 'Insights', url: `${SITE}/food-prices/insights` }, { name: 'Halloween candy', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'Article', headline: page.title, description, url: canonical, dateModified: updated, keywords: ['halloween candy prices', 'halloween candy spending', 'candy prices 2026', 'candy inflation'], author: { '@type': 'Organization', name: 'Kadoa', url: SITE }, publisher: { '@type': 'Organization', name: 'Kadoa', url: SITE } }];
  } else if (page.kind === 'insight') {
    const l = page.candy?.longRun;
    title = page.title;
    description = l
      ? `From December 1997 to December 2022, US candy prices rose ${Math.round(l.candyBefore)}% and all consumer prices ${Math.round(l.allBefore)}%. Since then candy is up ${Math.round(l.candyAfter)}%, against ${Math.round(l.allAfter)}% for all prices. Charts from BLS data.`
      : 'US candy prices against all consumer prices since 1997, from BLS data.';
    crumbs.push({ name: 'Insights', url: `${SITE}/food-prices/insights` }, { name: 'Candy prices', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'Article', headline: title, description, url: canonical, dateModified: updated, author: { '@type': 'Organization', name: 'Kadoa', url: SITE }, publisher: { '@type': 'Organization', name: 'Kadoa', url: SITE } }];
  } else {
    title = 'About the Data: How the US Food Price Monitor Collects USDA Prices';
    description = 'Where the food price data comes from, what shipping point, wholesale and retail prices mean, how gaps and corrections are handled, and how to download the CSVs. USDA data is public domain.';
    crumbs.push({ name: 'About the data', url: canonical });
    ld = [{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: canonical, description, dateModified: updated }];
  }
  if (crumbs.length > 1) ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((cr, i) => ({ '@type': 'ListItem', position: i + 1, name: cr.name, item: cr.url })) });
  return { title, description, canonical, ld };
}
try {
  const { render } = await server.ssrLoadModule('/src/render.jsx');
  const lastmod = {};
  for (const route of routes) {
    const page = await load(route.key); page.common = { ...page.common, dataPath, sharedPath };
    if (page.kind === 'about') page.commodityCount ??= routes.filter((r) => r.key.startsWith('commodity/')).length;
    const body = render(page);
    const { title, description, canonical, ld } = seo(page, route.path);
    const fullTitle = `${title} | US Food Price Monitor`;
    // Every insight has its own link preview from scripts/ogInsights.mjs, published beside its page data; other pages
    // share the site card.
    const image = page.kind === 'insight' ? `${absolute(dataPath)}/og-${page.slug}.png` : dataPath === '/food-prices/data' ? `${SITE}/food-prices/og-image.png` : `${absolute(dataPath)}/og-image.png`;
    const head = `<meta property="og:type" content="website"/><meta property="og:site_name" content="US Food Price Monitor"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(description)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${image}"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${esc(title)}"/><meta name="twitter:description" content="${esc(description)}"/><meta name="twitter:image" content="${image}"/><meta name="robots" content="index,follow,max-image-preview:large"/>${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replaceAll('<', '\\u003c')}</script>`).join('')}`;
    const html = template.replace(/<title>.*?<\/title>/, `<title>${esc(fullTitle)}</title>`).replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${esc(description)}"/>`).replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${canonical}"/>`).replace('</head>', `${head}</head>`).replace('<div id="root"></div>', `<div id="root">${body}</div><script id="page-data" type="application/json">${JSON.stringify(page).replaceAll('<', '\\u003c')}</script>`);
    const dir = join(dist, route.path.replace(/^\/food-prices\/?/, '')); await mkdir(dir, { recursive: true }); await writeFile(join(dir, 'index.html'), html); if (route.key !== 'home') await writeFile(dir + '.html', html);
    lastmod[route.path] = page.kind === 'commodity' ? page.summary.lastDate : page.common.generatedAt.slice(0, 10);
  }
  const priority = (r) => (r.key === 'home' ? '1.0' : r.key === 'commodities' ? '0.9' : r.key.startsWith('commodity/') ? '0.8' : '0.6');
  await writeFile(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((r) => `  <url><loc>${SITE}${r.path}</loc><lastmod>${lastmod[r.path]}</lastmod><changefreq>daily</changefreq><priority>${priority(r)}</priority></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(join(dist, 'robots.txt'), `# Served under /food-prices/. The site-wide robots.txt at ${SITE}/robots.txt should list:\n# Sitemap: ${SITE}/food-prices/sitemap.xml\nUser-agent: *\nAllow: /\nSitemap: ${SITE}/food-prices/sitemap.xml\n`);
  console.log(`Prerendered ${routes.length} pages with titles, descriptions, structured data and sitemap`);
} finally { await server.close(); }
