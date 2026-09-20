// Renders public/apple-touch-icon.png (180x180) from the same carrot glyph as favicon.svg, using installed Chrome.
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
const root = resolve(import.meta.dirname, '..');
const html = `<!doctype html><html><body style="margin:0;width:180px;height:180px;background:#1d70b8;display:grid;place-items:center;font-size:120px;line-height:1">🥕</body></html>`;
const browser = await chromium.launch({ channel: 'chrome' }); const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
await page.setContent(html); await page.screenshot({ path: join(root, 'public/apple-touch-icon.png'), type: 'png' }); await browser.close();
console.log('Wrote public/apple-touch-icon.png');
