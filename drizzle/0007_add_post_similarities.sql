CREATE TABLE "post_similarities" (
	"post_id" integer NOT NULL,
	"neighbor_id" integer NOT NULL,
	"score" real NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "post_similarities_post_id_neighbor_id_pk" PRIMARY KEY("post_id","neighbor_id")
);
--> statement-breakpoint
ALTER TABLE "post_similarities" ADD CONSTRAINT "post_similarities_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_similarities" ADD CONSTRAINT "post_similarities_neighbor_id_posts_id_fk" FOREIGN KEY ("neighbor_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_similarities_post_rank_idx" ON "post_similarities" USING btree ("post_id","rank");
