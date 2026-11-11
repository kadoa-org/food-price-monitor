import { expect, test } from 'bun:test';
import { contentPath, orphanedFiles, runsToPrune, storedFiles } from '../scripts/runIndex.mjs';

const index = (files) => ({ files });
test('a file is stored under its content hash and keeps its name', () => {
  expect(contentPath('food-prices/shared', 'downloads/eggs.csv.gz', 'abcdef0123456789ff')).toBe('food-prices/shared/files/abcdef012345/downloads/eggs.csv.gz');
});
test('a pruned run leaves behind only the files no kept run lists', () => {
  const old = index({ 'home.json': '/s/files/aaa/home.json', 'cpi.json': '/s/files/ccc/cpi.json' });
  const kept = [index({ 'home.json': '/s/files/bbb/home.json', 'cpi.json': '/s/files/ccc/cpi.json' })];
  expect(orphanedFiles([old], kept)).toEqual(['/s/files/aaa/home.json']);
  // A run from before indexes has none, so pruning it frees nothing beyond its own folder.
  expect(orphanedFiles([index({})], kept)).toEqual([]);
  expect([...storedFiles(kept)]).toEqual(['/s/files/bbb/home.json', '/s/files/ccc/cpi.json']);
});
test('pruning keeps the newest runs by creation time and never the one just published', () => {
  const runs = [{ id: 'z-old', created: '2026-11-01T00:00:00' }, { id: 'a-new', created: '2026-11-03T00:00:00' }, { id: 'm-mid', created: '2026-11-02T00:00:00' }, { id: 'b-current', created: '2026-10-30T00:00:00' }];
  expect(runsToPrune(runs, 2, 'b-current').map((r) => r.id)).toEqual(['z-old', 'm-mid']);
  expect(runsToPrune(runs.slice(0, 1), 7, 'b-current')).toEqual([]);
});
