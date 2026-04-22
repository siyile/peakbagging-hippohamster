ALTER TABLE "posts" ADD COLUMN "elevation_ft" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "elevation_gain_ft" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "distance_miles" numeric(5,2);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "time_category" varchar(20);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "rock_rating" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "glacier_rating" varchar(4);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "off_trail_ratio" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_ski_touring" boolean DEFAULT false NOT NULL;
