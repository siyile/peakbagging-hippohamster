import {
  pgTable,
  serial,
  varchar,
  text,
  jsonb,
  timestamp,
  integer,
  numeric,
  boolean,
  primaryKey,
  real,
  index,
} from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  content: jsonb("content").notNull(),
  description: text("description"),
  coverImage: varchar("cover_image", { length: 500 }),
  coverImageThumb: varchar("cover_image_thumb", { length: 500 }),
  tripDate: timestamp("trip_date"),
  gpxUrl: varchar("gpx_url", { length: 500 }),
  caltopoUrl: varchar("caltopo_url", { length: 500 }),
  peakbaggerUrl: varchar("peakbagger_url", { length: 500 }),
  nwsUrl: varchar("nws_url", { length: 500 }),
  elevationFt: integer("elevation_ft"),
  elevationGainFt: integer("elevation_gain_ft"),
  distanceMiles: numeric("distance_miles", { precision: 5, scale: 2 }),
  timeCategory: varchar("time_category", { length: 20 }),
  rockRating: integer("rock_rating"),
  glacierRating: varchar("glacier_rating", { length: 4 }),
  offTrailRatio: integer("off_trail_ratio"),
  isSkiTouring: boolean("is_ski_touring").default(false).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
});

export const postTags = pgTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })]
);

export const postSimilarities = pgTable(
  "post_similarities",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    neighborId: integer("neighbor_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    rank: integer("rank").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.neighborId] }),
    index("post_similarities_post_rank_idx").on(t.postId, t.rank),
  ]
);

export type Post = typeof posts.$inferSelect;
