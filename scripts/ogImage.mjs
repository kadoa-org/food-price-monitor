// Renders public/og-image.png (1200x630) from the latest data with Playwright's bundled Chromium.
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
const root = resolve(import.meta.dirname, '..');
const home = JSON.parse(await readFile(join(root, 'public/data/home.json'), 'utf8'));
const money = (n) => `$${n.toFixed(2)}`;
const q = (r) => (r.low != null && r.high != null ? (r.low === r.high ? money(r.low) : `${money(r.low)} to ${money(r.high)}`) : '');
const rows = home.featured.map((f) => `<tr><td>${f.summary.name}</td><td class="n">${q(f.benchmark.latest)}</td><td class="u">per ${f.benchmark.package.replace(/s$/, '')}</td><td class="c ${f.benchmark.yearChange > 0 ? 'up' : 'down'}">${f.benchmark.yearChange == null ? '' : `${f.benchmark.yearChange > 0 ? '+' : '-'}${Math.abs(f.benchmark.yearChange).toFixed(Math.abs(f.benchmark.yearChange) < 10 ? 1 : 0)}%`}</td></tr>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>
body{margin:0;width:1200px;height:630px;font-family:Inter,Arial,sans-serif;color:#0b0c0c;background:#fff;display:flex;flex-direction:column}
.bar{background:#1d70b8;color:#fff;padding:22px 56px;font-size:28px;font-weight:700;display:flex;justify-content:space-between;align-items:center}.bar span{font-weight:400;font-size:22px;opacity:.9}
.main{padding:40px 56px 0;flex:1}h1{font-size:54px;margin:0 0 8px;letter-spacing:-1px}p{font-size:26px;color:#505a5f;margin:0 0 28px}
table{width:100%;border-collapse:collapse;font-size:26px}td{padding:11px 0;border-bottom:1px solid #e5e6e7}td:first-child{font-weight:600;width:260px}.n{font-variant-numeric:tabular-nums;font-weight:600;width:300px}.u{color:#505a5f;font-size:20px}.c{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}.up{color:#ca3535}.down{color:#0f7a52}
.foot{padding:0 56px 26px;font-size:20px;color:#505a5f}</style></head><body>
<div class="bar">🥕 US Food Price Monitor<span>kadoa.com/food-prices</span></div>
<div class="main"><h1>US food prices today</h1><p>USDA wholesale produce prices, updated every report day. Change against a year earlier.</p><table>${rows}</table></div>
<div class="foot">Latest report ${home.common.lastDate.split('-').reverse().join('.')}. Source: USDA. Built by Kadoa.</div></body></html>`;
// Uses the installed Google Chrome so no browser download is needed.
const browser = await chromium.launch({ channel: 'chrome' }); const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
await page.screenshot({ path: join(root, 'public/og-image.png'), type: 'png' }); await browser.close();
console.log('Wrote public/og-image.png');
