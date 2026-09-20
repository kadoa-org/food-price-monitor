// Uploads public/data and the social card to BunnyCDN, then moves the latest pointer.
// Page files go under a versioned run folder, so an edge can never serve a mix of old and new pages; only the tiny
// pointer changes in place. Series files are named by series id and content version, so they live in one shared
// folder across runs and are uploaded only when new: an unchanged series keeps its path, a changed one gets a new
// path, and the edge (which ignores query strings) never serves a stale version.
// Optional: calls a Vercel deploy hook so the site re-prerenders from the new data.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
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
const SHARED = `${PREFIX}/shared`;
const KEEP_RUNS = 7;
// Uploads are latency bound (one PUT per file), so the wall time is files divided by concurrency.
const CONCURRENCY = Number(process.env.PUBLISH_CONCURRENCY || 64);
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
const sha256 = (body) => createHash('sha256').update(body).digest('hex');
const isShared = (rel) => rel.startsWith('series/');

async function* walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const p = join(dir, entry.name); if (entry.isDirectory()) yield* walk(p); else if (!entry.name.startsWith('.')) yield p; } }
async function put(path, body, contentType, hash) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(storageUrl(path), { method: 'PUT', headers: { ...headers, 'Content-Type': contentType, Checksum: hash.toUpperCase() }, body });
    if (res.ok) return;
    if (attempt === 4) throw new Error(`PUT ${path} failed: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
}
async function del(path) { const res = await fetch(storageUrl(path), { method: 'DELETE', headers }); return res.ok || res.status === 404; }

// The manifest of the last publish says which shared files the storage already holds, by content hash. It is read
// from storage, never from the edge, so it cannot be stale. Absent manifest means upload everything.
const previous = await fetch(storageUrl(`${SHARED}/manifest.json`), { headers });
if (!previous.ok && previous.status !== 404) throw new Error(`Cannot read shared manifest: HTTP ${previous.status}`);
const known = previous.ok ? (await previous.json()).files ?? {} : {};

const uploads = []; const manifest = {}; let sharedTotal = 0; let skipped = 0; let bytes = 0;
for await (const local of walk(dataDir)) {
  const rel = relative(dataDir, local);
  const body = await readFile(local); const hash = sha256(body);
  bytes += body.length;
  // Only the path and hash are kept; bodies are re-read at upload time so a large dataset does not sit in memory.
  const entry = { local, hash, size: body.length, type: types[rel.slice(rel.lastIndexOf('.'))] ?? 'application/octet-stream' };
  if (isShared(rel)) {
    sharedTotal++; manifest[rel] = hash;
    if (known[rel] === hash) { skipped++; continue; }
    uploads.push({ ...entry, remote: `${SHARED}/${rel}` });
  } else uploads.push({ ...entry, remote: `${base}/${rel}` });
}
if (existsSync(join(snapshot, 'og-image.png'))) { const local = join(snapshot, 'og-image.png'); const body = await readFile(local); uploads.push({ local, remote: `${base}/og-image.png`, hash: sha256(body), size: body.length, type: 'image/png' }); }
const orphans = Object.keys(known).filter((rel) => !(rel in manifest));
const toUpload = uploads.reduce((n, u) => n + u.size, 0);
console.log(JSON.stringify({ runId, files: uploads.length, sharedFiles: sharedTotal, sharedUnchanged: skipped, orphans: orphans.length, megabytes: Math.round(toUpload / 1e6), totalMegabytes: Math.round(bytes / 1e6), concurrency: CONCURRENCY, target: `${CDN}/${base}/`, shared: `${CDN}/${SHARED}/`, dryRun }));
if (dryRun) process.exit(0);

let index = 0; let done = 0; const started = Date.now();
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (index < uploads.length) {
    const u = uploads[index++];
    await put(u.remote, await readFile(u.local), u.type, u.hash);
    if (++done % 1000 === 0) console.log(`  ${done}/${uploads.length} uploaded`);
  }
}));
// Pointer first, then the manifest: a failed manifest write only costs a re-upload next time, never a missing file.
const pointer = { runId, base: `/${base}`, shared: `/${SHARED}`, generatedAt: home.common.generatedAt, lastDate: home.common.lastDate, publishedAt: new Date().toISOString() };
const pointerBody = JSON.stringify(pointer);
await put(`${PREFIX}/latest.json`, pointerBody, 'application/json', sha256(pointerBody));
const manifestBody = JSON.stringify({ runId, publishedAt: pointer.publishedAt, files: manifest });
await put(`${SHARED}/manifest.json`, manifestBody, 'application/json', sha256(manifestBody));
console.log(`Uploaded ${done} files (${skipped} shared files unchanged) in ${Math.round((Date.now() - started) / 1000)}s; pointer ${CDN}/${PREFIX}/latest.json -> ${runId}`);

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

// Shared files no longer built locally (a changed series got a new version, or a renormalisation changed identities) go
// after the pointer moved, so a page built from the previous run keeps working until it is rebuilt.
let removed = 0;
for (const rel of orphans) if (await del(`${SHARED}/${rel}`)) removed++;
if (orphans.length) console.log(`Removed ${removed}/${orphans.length} orphaned shared files`);

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
