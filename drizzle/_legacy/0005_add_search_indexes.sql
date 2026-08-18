CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS posts_title_trgm_idx
  ON posts USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS posts_description_trgm_idx
  ON posts USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS posts_content_tsv_idx
  ON posts USING GIN (jsonb_to_tsvector('english', content, '["string"]'));
