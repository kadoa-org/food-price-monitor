import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const redirect = (req, res, next) => {
  if (req.url === '/food-prices' || req.url.startsWith('/food-prices#')) { res.writeHead(302, { Location: '/food-prices/' + req.url.slice('/food-prices'.length) }); res.end(); } else next();
};

// DATA_SOURCE=cdn serves the site against the published data instead of a local public/data, so the frontend runs
// without the dataset pipeline. The pointer names the current run; page files come from that run's folder and series
// files from the shared folder, exactly as the production build wires them.
const CDN = process.env.BUNNY_CDN_BASE || 'https://kadoa-datasets.b-cdn.net';
let pointerPromise;
const pointer = () => (pointerPromise ??= fetch(`${CDN}/food-prices/latest.json?v=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } }).then((r) => { if (!r.ok) throw new Error(`Cannot read data pointer: HTTP ${r.status}`); return r.json(); }));
const cdnData = async (req, res, next) => {
  const prefix = '/food-prices/data/';
  if (!req.url.startsWith(prefix)) return next();
  try {
    const p = await pointer();
    const rel = req.url.slice(prefix.length).split('?')[0];
    const upstream = rel.startsWith('series/') ? `${CDN}${p.shared ?? p.base}/${rel}` : `${CDN}${p.base}/${rel}`;
    const r = await fetch(upstream);
    res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (error) { res.writeHead(502, { 'Content-Type': 'text/plain' }); res.end(String(error.message)); }
};

export default defineConfig({
  base: '/food-prices/',
  plugins: [react(), {
    name: 'food-prices-dev',
    configureServer(server) {
      if (process.env.DATA_SOURCE === 'cdn') { pointer().then((p) => server.config.logger.info(`Serving data from published run ${p.runId} (${p.lastDate}) via ${CDN}`)); server.middlewares.use(cdnData); }
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server) { server.middlewares.use(redirect); },
  }],
  build: { outDir: 'dist/food-prices' },
});
