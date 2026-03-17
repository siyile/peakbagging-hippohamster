-- 1. Create tags table
CREATE TABLE IF NOT EXISTS "tags" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  CONSTRAINT "tags_name_unique" UNIQUE("name")
);

-- 2. Create post_tags join table
CREATE TABLE IF NOT EXISTS "post_tags" (
  "post_id" integer NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "tag_id" integer NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id", "tag_id")
);

-- 3. Migrate existing tags: insert distinct tag names
INSERT INTO "tags" ("name")
SELECT DISTINCT unnest("tags") AS name
FROM "posts"
WHERE "tags" IS NOT NULL AND array_length("tags", 1) > 0
ON CONFLICT DO NOTHING;

-- 4. Populate post_tags from existing array data
INSERT INTO "post_tags" ("post_id", "tag_id")
SELECT p."id", t."id"
FROM "posts" p,
     unnest(p."tags") AS tag_name
JOIN "tags" t ON t."name" = tag_name
WHERE p."tags" IS NOT NULL AND array_length(p."tags", 1) > 0
ON CONFLICT DO NOTHING;

-- 5. Drop the old tags column
ALTER TABLE "posts" DROP COLUMN IF EXISTS "tags";
