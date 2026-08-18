-- Search support for src/lib/search.ts. These indexes were declared in the
-- pre-baseline 0005_add_search_indexes.sql, but only the CREATE EXTENSION
-- ever landed on the live database -- the CREATE INDEX statements were sent
-- to the Neon HTTP driver as one multi-statement query and never applied.
-- They are re-issued here so the baseline and the live schema agree.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_title_trgm_idx" ON "posts" USING GIN ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_description_trgm_idx" ON "posts" USING GIN ("description" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_content_tsv_idx" ON "posts" USING GIN (jsonb_to_tsvector('english', "content", '["string"]'));
