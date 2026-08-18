CREATE TABLE "post_similarities" (
	"post_id" integer NOT NULL,
	"neighbor_id" integer NOT NULL,
	"score" real NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "post_similarities_post_id_neighbor_id_pk" PRIMARY KEY("post_id","neighbor_id")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content" jsonb NOT NULL,
	"description" text,
	"meta_description" text,
	"cover_image" varchar(500),
	"cover_image_thumb" varchar(500),
	"cover_image_srcset" text,
	"cover_image_full" varchar(500),
	"trip_date" timestamp,
	"gpx_url" varchar(500),
	"caltopo_url" varchar(500),
	"peakbagger_url" varchar(500),
	"nws_url" varchar(500),
	"elevation_ft" integer,
	"elevation_gain_ft" integer,
	"distance_miles" numeric(5, 2),
	"time_category" varchar(20),
	"rock_rating" integer,
	"glacier_rating" varchar(4),
	"snow_rating" varchar(20),
	"off_trail_ratio" integer,
	"is_ski_touring" boolean DEFAULT false NOT NULL,
	"author" varchar(100) DEFAULT 'Siyi' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "post_similarities" ADD CONSTRAINT "post_similarities_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_similarities" ADD CONSTRAINT "post_similarities_neighbor_id_posts_id_fk" FOREIGN KEY ("neighbor_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_similarities_post_rank_idx" ON "post_similarities" USING btree ("post_id","rank");