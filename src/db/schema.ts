import {
  pgTable,
  serial,
  varchar,
  text,
  jsonb,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  content: jsonb("content").notNull(),
  description: text("description"),
  coverImage: varchar("cover_image", { length: 500 }),
  tripDate: timestamp("trip_date"),
  gpxUrl: varchar("gpx_url", { length: 500 }),
  peakbaggerUrl: varchar("peakbagger_url", { length: 500 }),
  nwsUrl: varchar("nws_url", { length: 500 }),
  tags: text("tags").array().default([]),
  viewCount: integer("view_count").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
