CREATE TYPE "public"."funding_source_kind" AS ENUM('loan', 'capital', 'own');--> statement-breakpoint
CREATE TABLE "funding_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "funding_source_kind" NOT NULL,
	"amount" numeric(14, 2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "funding_source_id" uuid;--> statement-breakpoint
ALTER TABLE "funding_sources" ADD CONSTRAINT "funding_sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funding_sources_project_idx" ON "funding_sources" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_funding_source_id_funding_sources_id_fk" FOREIGN KEY ("funding_source_id") REFERENCES "public"."funding_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Obstoječi projekti: dosedanji proračun postane kredit, dodamo še lastna sredstva brez omejitve.
INSERT INTO "funding_sources" ("project_id", "name", "kind", "amount", "sort_order")
SELECT "id", 'Kredit', 'loan', "total_budget", 0 FROM "projects";--> statement-breakpoint
INSERT INTO "funding_sources" ("project_id", "name", "kind", "amount", "sort_order")
SELECT "id", 'Lastna sredstva', 'own', NULL, 2 FROM "projects";--> statement-breakpoint
UPDATE "expenses" SET "funding_source_id" = "fs"."id"
FROM "funding_sources" "fs"
WHERE "fs"."project_id" = "expenses"."project_id" AND "fs"."kind" = 'loan';
