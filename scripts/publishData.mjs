// Uploads public/data and the social card to BunnyCDN, then moves the latest pointer.
// Nothing published is ever rewritten, because the edge caches every path for a month and ignores query strings; only
// the tiny pointer changes in place. Series files are named by series id and content version, every other file is
// stored by content hash (scripts/runIndex.mjs), both in the shared folder and uploaded only when new. A run folder
// holds just the run's index, which maps each file to its path, so a build reads one consistent run and a publish
// that changes one insight uploads that insight's files, not the 120 MB of pages and downloads around it.
// Optional: calls a Vercel deploy hook so the site re-prerenders from the new data.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { join, relative, resolve } from 'node:path';
import { contentPath, orphanedFiles, runsToPrune, storedFiles } from './runIndex.mjs';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
// The dataset pipeline lives outside this repository; point FOOD_PRICES_DATASET_DIR at its folder (a local .env works).
const dataset = process.env.FOOD_PRICES_DATASET_DIR;
if (!dataset) throw new Error('FOOD_PRICES_DATASET_DIR is not set; it must point at the food-prices dataset pipeline folder');
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

const storageUrl = (path) => `https://${HOST}/${ZONE}/${path}`;
const headers = { AccessKey: KEY };
// What the storage holds, read while the snapshot is copied and hashed: the reads take as long as the local work.
async function readStorage() {
  // The manifest of the last publish says which series files the storage already holds, by name and version. It is read
  // from storage, never from the edge, so it cannot be stale. Absent manifest means upload everything.
  const [previous, listed, runListing] = await Promise.all([`${SHARED}/manifest.json`, `${SHARED}/series/`, `${PREFIX}/data/`].map((path) => fetch(storageUrl(path), { headers })));
  if (!previous.ok && previous.status !== 404) throw new Error(`Cannot read shared manifest: HTTP ${previous.status}`);
  const known = previous.ok ? (await previous.json()).files ?? {} : {};
  // A series file name carries its content hash, so a name already on storage is the file, whether or not the last
  // publish got as far as writing its manifest. The listing is the ground truth; the manifest is a shortcut.
  if (!listed.ok && listed.status !== 404) throw new Error(`Cannot list shared series: HTTP ${listed.status}`);
  const present = new Set(listed.ok ? (await listed.json()).filter((e) => !e.IsDirectory).map((e) => `series/${e.ObjectName}`) : []);
  // The other shared files on storage are the ones the published runs' indexes list. A run from before indexes has
  // none and lists nothing.
  if (!runListing.ok && runListing.status !== 404) throw new Error(`Cannot list runs: HTTP ${runListing.status}`);
  const runs = runListing.ok ? (await runListing.json()).filter((e) => e.IsDirectory).map((e) => ({ id: e.ObjectName, created: e.DateCreated })) : [];
  const indexes = new Map(await Promise.all(runs.map(async (r) => {
    const res = await fetch(storageUrl(`${PREFIX}/data/${r.id}/index.json`), { headers });
    if (!res.ok && res.status !== 404) throw new Error(`Cannot read the index of run ${r.id}: HTTP ${res.status}`);
    return [r.id, res.ok ? await res.json() : { files: {} }];
  })));
  return { known, present, runs, indexes };
}
const storage = readStorage();
// Upload from a snapshot so a data rebuild during the upload cannot change files underneath it. Series files are left
// out: one is never rewritten, since its name carries its content, and copying and deleting 70,000 of them took half a
// minute. A rebuild that removes one mid-upload fails the publish loudly.
const snapshot = mkdtempSync(join(tmpdir(), 'food-prices-publish-'));
const dataDir = join(snapshot, 'data'); const seriesDir = join(root, 'public/data/series');
mkdirSync(dataDir);
const entries = (await readdir(join(root, 'public/data'))).filter((name) => name !== 'series').map((name) => join(root, 'public/data', name));
await execFileAsync('cp', [process.platform === 'darwin' ? '-Rc' : '-R', ...entries, dataDir]).catch(() => { throw new Error('Could not snapshot public/data'); });
if (existsSync(join(root, 'public/og-image.png'))) await execFileAsync('cp', [join(root, 'public/og-image.png'), join(snapshot, 'og-image.png')]);
process.on('exit', () => rmSync(snapshot, { recursive: true, force: true }));
const home = JSON.parse(await readFile(join(dataDir, 'home.json'), 'utf8'));
const types = { '.json': 'application/json', '.csv': 'text/csv', '.gz': 'application/gzip', '.png': 'image/png', '.svg': 'image/svg+xml' };
const sha256 = (body) => createHash('sha256').update(body).digest('hex');
const isShared = (rel) => rel.startsWith('series/');

async function* walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const p = join(dir, entry.name); if (entry.isDirectory()) yield* walk(p); else if (!entry.name.startsWith('.')) yield p; } }
// The pointer and the manifest are written as strings, everything else as a buffer, so the size a timeout is
// scaled from has to handle both. Reading byteLength off a string yields undefined, and a NaN timeout throws.
const sizeOf = (body) => (typeof body === 'string' ? Buffer.byteLength(body) : (body?.byteLength ?? 0));
// A PUT is retried on an HTTP failure and on a dropped connection alike; both are transient at this volume of requests.
async function put(path, body, contentType, hash) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    let reason;
    try {
      // A flat timeout punishes the big files: a 6 MB download file needs far longer than a 2 KB series file
      // on a slow link, and cutting it off turns a slow upload into a failed run.
      const res = await fetch(storageUrl(path), { method: 'PUT', headers: { ...headers, 'Content-Type': contentType, Checksum: hash.toUpperCase() }, body, signal: AbortSignal.timeout(30_000 + sizeOf(body) / 50) });
      if (res.ok) return;
      reason = `HTTP ${res.status}`;
    } catch (error) { reason = error.code ?? error.name; }
    if (attempt === 4) throw new Error(`PUT ${path} failed: ${reason}`);
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
}
async function del(path) { try { const res = await fetch(storageUrl(path), { method: 'DELETE', headers, signal: AbortSignal.timeout(30_000) }); return res.ok || res.status === 404; } catch { return false; } }


// Only the path and hash are kept; bodies are re-read at upload time so a large dataset does not sit in memory. A
// series file's name already carries its content version, so the 70,000 of them are not read here: the hash its
// upload needs is taken then, for the few that are new.
const local = []; let bytes = 0;
for await (const path of walk(seriesDir)) { const { size } = await stat(path); bytes += size; local.push({ rel: `series/${relative(seriesDir, path)}`, local: path, size }); }
for await (const path of walk(dataDir)) {
  const rel = relative(dataDir, path);
  const body = await readFile(path); bytes += body.length;
  local.push({ rel, local: path, hash: sha256(body), size: body.length });
}
if (existsSync(join(snapshot, 'og-image.png'))) { const path = join(snapshot, 'og-image.png'); const body = await readFile(path); local.push({ rel: 'og-image.png', local: path, hash: sha256(body), size: body.length }); }
const { known, present, runs, indexes } = await storage;
const onStorage = storedFiles([...indexes.values()]);

const uploads = []; const manifest = {}; const files = {}; let sharedTotal = 0; let skipped = 0; let unchanged = 0;
for (const { rel, ...file } of local) {
  const entry = { ...file, type: types[rel.slice(rel.lastIndexOf('.'))] ?? 'application/octet-stream' };
  if (isShared(rel)) {
    sharedTotal++; manifest[rel] = rel.split('.').at(-2);
    if (rel in known || present.has(rel)) { skipped++; continue; }
    uploads.push({ ...entry, remote: `${SHARED}/${rel}` });
  } else {
    const remote = contentPath(SHARED, rel, entry.hash); files[rel] = `/${remote}`;
    if (onStorage.has(`/${remote}`)) unchanged++; else uploads.push({ ...entry, remote });
  }
}
// A run's index must never change once published, since the CDN caches it. The id carries the source run and a hash
// of the index, so a retry with the same files resumes into the same folder and any changed file (new fields, a fix,
// a reworded headline) gets a fresh one.
const indexBody = JSON.stringify({ files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) });
const runId = `${home.common.generatedAt.slice(0, 19).replaceAll(':', '-')}-${home.common.sourceRun.slice(-8)}-${sha256(indexBody).slice(0, 8)}`.replace(/[^A-Za-z0-9._-]/g, '-');
const base = `${PREFIX}/data/${runId}`;
const orphans = [...new Set([...Object.keys(known), ...present])].filter((rel) => !(rel in manifest));
const toUpload = uploads.reduce((n, u) => n + u.size, 0);
console.log(JSON.stringify({ runId, files: uploads.length, filesUnchanged: unchanged, sharedFiles: sharedTotal, sharedUnchanged: skipped, orphans: orphans.length, megabytes: Math.round(toUpload / 1e6), totalMegabytes: Math.round(bytes / 1e6), concurrency: CONCURRENCY, target: `${CDN}/${base}/`, shared: `${CDN}/${SHARED}/`, dryRun }));
if (dryRun) process.exit(0);

let index = 0; let done = 0; const started = Date.now();
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (index < uploads.length) {
    const u = uploads[index++];
    const body = await readFile(u.local);
    await put(u.remote, body, u.type, u.hash ?? sha256(body));
    if (++done % 1000 === 0) console.log(`  ${done}/${uploads.length} uploaded`);
  }
}));
// The index once every file it lists is up, then the pointer, then the manifest: a failed manifest write only costs a
// re-upload next time, never a missing file.
await put(`${base}/index.json`, indexBody, 'application/json', sha256(indexBody));
const pointer = { runId, base: `/${base}`, index: `/${base}/index.json`, shared: `/${SHARED}`, generatedAt: home.common.generatedAt, lastDate: home.common.lastDate, publishedAt: new Date().toISOString() };
const pointerBody = JSON.stringify(pointer);
await put(`${PREFIX}/latest.json`, pointerBody, 'application/json', sha256(pointerBody));
// The manifest runs to megabytes, so it is rewritten only when the series changed.
const seriesChanged = Object.keys(manifest).length !== Object.keys(known).length || Object.keys(manifest).some((rel) => !(rel in known));
if (seriesChanged) {
  const manifestBody = JSON.stringify({ runId, publishedAt: pointer.publishedAt, files: manifest });
  await put(`${SHARED}/manifest.json`, manifestBody, 'application/json', sha256(manifestBody));
}
console.log(`Uploaded ${done} files (${unchanged + skipped} unchanged) in ${Math.round((Date.now() - started) / 1000)}s; pointer ${CDN}/${PREFIX}/latest.json -> ${runId}`);

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
// Deleting one file per round trip left the run idle for half an hour on a day with ten thousand orphans,
// long after the site was already serving the new data. Deletes use the same worker pool as uploads.
let removed = 0;
let orphanIndex = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (orphanIndex < orphans.length) {
    const rel = orphans[orphanIndex++];
    if (await del(`${SHARED}/${rel}`)) removed++;
  }
}));
if (orphans.length) console.log(`Removed ${removed}/${orphans.length} orphaned shared files`);

// Keep the last runs so a build in flight never loses its files; delete the rest, and the shared files only they list.
indexes.set(runId, { files });
const pruned = runsToPrune(runs, KEEP_RUNS, runId);
const prunedIds = new Set(pruned.map((r) => r.id));
const leftover = orphanedFiles(pruned.map((r) => indexes.get(r.id)), [...indexes].filter(([id]) => !prunedIds.has(id)).map(([, i]) => i));
for (const old of pruned) {
  const res = await fetch(storageUrl(`${PREFIX}/data/${old.id}/`), { method: 'DELETE', headers });
  console.log(`${res.ok ? 'Pruned' : 'Could not prune'} run ${old.id}`);
}
let freed = 0; let leftoverIndex = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (leftoverIndex < leftover.length) if (await del(leftover[leftoverIndex++].slice(1))) freed++;
}));
if (leftover.length) console.log(`Removed ${freed}/${leftover.length} files only pruned runs used`);
if (process.env.VERCEL_DEPLOY_HOOK_URL) {
  const res = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, { method: 'POST' });
  console.log(`Vercel deploy hook: HTTP ${res.status}`);
} else console.log('No VERCEL_DEPLOY_HOOK_URL set; trigger a redeploy to publish the new data');
