// The pure part of publishing a run: where each file goes and which shared files a pruned run leaves behind.
// Every file but the series is stored once under the shared folder at a path made of its content hash and its own
// name, so the path changes exactly when the content does and a download keeps its file name. A run is its index:
// each file's name mapped to that path. Unchanged files are never uploaded again, and nothing published is rewritten,
// which the CDN needs because it caches every path for a month and cannot be purged from here.
export const contentPath = (shared, rel, hash) => `${shared}/files/${hash.slice(0, 12)}/${rel}`;

// The files the storage already holds: everything the index of a kept run lists. An index is written only after its
// run's uploads succeeded, so a listed path is on storage.
export const storedFiles = (indexes) => new Set(indexes.flatMap((i) => Object.values(i.files)));

// The shared files to delete with pruned runs: listed by a pruned run's index and by no kept run's, so a build from
// any kept run keeps every file it names.
export function orphanedFiles(pruned, kept) {
  const keep = storedFiles(kept);
  return [...storedFiles(pruned)].filter((path) => !keep.has(path));
}

// Runs to prune: all but the newest `keep` by creation time, never the run just published.
export function runsToPrune(runs, keep, current) {
  const others = runs.filter((r) => r.id !== current).sort((a, b) => a.created.localeCompare(b.created));
  return others.slice(0, Math.max(0, others.length - (keep - 1)));
}
