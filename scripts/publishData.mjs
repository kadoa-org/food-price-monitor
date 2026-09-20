// Uploads public/data and the social card to BunnyCDN under a versioned run folder, then moves the latest pointer.
// Versioned folders mean a CDN edge can never serve a mix of old and new files; only the tiny pointer changes in place.
// Optional: calls a Vercel deploy hook so the site re-prerenders from the new data.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dataset = process.env.FOOD_PRICES_DATASET_DIR || resolve(root, '../kadoa-backend/services/custom/datasets/food-prices');
for (const file of [join(dataset, '.env'), join(dataset, '..', '.env')]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) { const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim(); }
}
const KEY = process.env.BUNNY_STORAGE_KEY || process.env.BUNNY_API_KEY;
const HOST = process.env.BUNNY_STORAGE_HOST || 'ny.storage.bunnycdn.com';
const ZONE = process.env.BUNNY_STORAGE_ZONE || 'kadoa';
const CDN = process.env.BUNNY_CDN_BASE || 'https://kadoa-datasets.b-cdn.net';
const PREFIX = 'food-prices';
const KEEP_RUNS = 7;
const dryRun = process.argv.includes('--dry-run');
if (!KEY) throw new Error('BUNNY_STORAGE_KEY or BUNNY_API_KEY is required');

// Upload from a snapshot so a data rebuild during the upload cannot delete files underneath it.
const snapshot = mkdtempSync(join(tmpdir(), 'food-prices-publish-'));
const copy = spawnSync('cp', [process.platform === 'darwin' ? '-Rc' : '-R', join(root, 'public/data'), join(snapshot, 'data')], { stdio: 'inherit' });
if (copy.status !== 0) throw new Error('Could not snapshot public/data');
if (existsSync(join(root, 'public/og-image.png'))) spawnSync('cp', [join(root, 'public/og-image.png'), join(snapshot, 'og-image.png')]);
process.on('exit', () => rmSync(snapshot, { recursive: true, force: true }));
const dataDir = join(snapshot, 'data');
const home = JSON.parse(await readFile(join(dataDir, 'home.json'), 'utf8'));
const runId = `${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}-${home.common.sourceRun.slice(-8)}`.replace(/[^A-Za-z0-9._-]/g, '-');
const base = `${PREFIX}/data/${runId}`;
const types = { '.json': 'application/json', '.csv': 'text/csv', '.png': 'image/png', '.svg': 'image/svg+xml' };
const storageUrl = (path) => `https://${HOST}/${ZONE}/${path}`;
const headers = { AccessKey: KEY };

async function* walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const p = join(dir, entry.name); if (entry.isDirectory()) yield* walk(p); else if (!entry.name.startsWith('.')) yield p; } }
async function put(path, body, contentType) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(storageUrl(path), { method: 'PUT', headers: { ...headers, 'Content-Type': contentType, Checksum: createHash('sha256').update(body).digest('hex').toUpperCase() }, body });
    if (res.ok) return;
    if (attempt === 4) throw new Error(`PUT ${path} failed: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
}
const files = [];
for await (const p of walk(dataDir)) files.push({ local: p, remote: `${base}/${relative(dataDir, p)}` });
if (existsSync(join(snapshot, 'og-image.png'))) files.push({ local: join(snapshot, 'og-image.png'), remote: `${base}/og-image.png` });
let bytes = 0; for (const f of files) bytes += (await stat(f.local)).size;
console.log(JSON.stringify({ runId, files: files.length, megabytes: Math.round(bytes / 1e6), target: `${CDN}/${base}/`, dryRun }));
if (dryRun) process.exit(0);

// Bounded concurrency: Bunny storage takes parallel PUTs happily; 12 keeps a laptop upload under a few minutes.
let index = 0; let done = 0; const started = Date.now();
await Promise.all(Array.from({ length: 12 }, async () => {
  while (index < files.length) {
    const f = files[index++];
    await put(f.remote, await readFile(f.local), types[f.local.slice(f.local.lastIndexOf('.'))] ?? 'application/octet-stream');
    if (++done % 1000 === 0) console.log(`  ${done}/${files.length} uploaded`);
  }
}));
const pointer = { runId, base: `/${base}`, generatedAt: home.common.generatedAt, lastDate: home.common.lastDate, publishedAt: new Date().toISOString() };
await put(`${PREFIX}/latest.json`, JSON.stringify(pointer), 'application/json');
console.log(`Uploaded ${done} files in ${Math.round((Date.now() - started) / 1000)}s; pointer ${CDN}/${PREFIX}/latest.json -> ${runId}`);

// Builds read the pointer from storage (never cached), so the storage copy is what must be right. The CDN copy is
// purged too when an account API key is available, for anything that still reads it from the edge.
const check = await fetch(storageUrl(`${PREFIX}/latest.json`), { headers });
const stored = check.ok ? (await check.json()).runId : null;
if (stored !== runId) throw new Error(`Storage pointer reads ${stored}, expected ${runId}`);
console.log('Storage pointer verified');
if (process.env.BUNNY_ACCOUNT_API_KEY) {
  const purge = await fetch(`https://api.bunny.net/purge?url=${encodeURIComponent(`${CDN}/${PREFIX}/latest.json`)}&async=false`, { method: 'POST', headers: { AccessKey: process.env.BUNNY_ACCOUNT_API_KEY } });
  console.log(`Purged CDN pointer copy: HTTP ${purge.status}`);
}

// Keep a week of runs so a build in flight never loses its folder; delete the rest.
const listing = await fetch(storageUrl(`${PREFIX}/data/`), { headers });
if (listing.ok) {
  const runs = (await listing.json()).filter((e) => e.IsDirectory).map((e) => e.ObjectName).sort();
  for (const old of runs.slice(0, Math.max(0, runs.length - KEEP_RUNS))) {
    const res = await fetch(storageUrl(`${PREFIX}/data/${old}/`), { method: 'DELETE', headers });
    console.log(`${res.ok ? 'Pruned' : 'Could not prune'} run ${old}`);
  }
}
if (process.env.VERCEL_DEPLOY_HOOK_URL) {
  const res = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: 'POST' });
  console.log(`Vercel deploy hook: HTTP ${res.status}`);
} else console.log('No VERCEL_DEPLOY_HOOK_URL set; trigger a redeploy to publish the new data');
