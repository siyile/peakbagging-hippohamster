# Legacy migrations (pre-baseline)

These are the migrations that built the database up to 2026-08-17. They are kept
for reference only — **drizzle-kit does not read this folder**, and nothing here
should be re-run.

They were retired because the history had drifted from the live database:

- `meta/` was gitignored, so `_journal.json` and the snapshots only ever existed
  on one machine. The journal recorded just `0000` and `0001`; everything from
  `0002` on was hand-applied with `scripts/run-migration.mjs` and never tracked.
- With only `0000_snapshot.json` on disk, `drizzle-kit generate` diffed against a
  schema that still had `excerpt` and a `tags` text[] column — both dropped in
  `0003` — and prompted to rename unrelated columns.
- `drizzle.__drizzle_migrations` held a single row (`0000`), so `drizzle-kit
  migrate` would have re-run `0001`, which has no `IF NOT EXISTS` guards.
- `cover_image_srcset` and `cover_image_full` were applied by direct ALTER and
  had no migration file at all.
- Only the `CREATE EXTENSION` half of `0005_add_search_indexes.sql` ever landed;
  the three `CREATE INDEX` statements were sent to the Neon HTTP driver as one
  multi-statement query and were silently lost.

The replacement `0000_baseline.sql` was generated from `src/db/schema.ts` and
verified column-for-column against the live database, then stamped as already
applied. `0001_add_search_indexes.sql` re-issues the indexes that never landed.
