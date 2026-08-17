ALTER TABLE "expense_attachments" ALTER COLUMN "expense_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_attachments" ADD COLUMN "project_id" uuid;--> statement-breakpoint
UPDATE "expense_attachments" a SET "project_id" = e."project_id" FROM "expenses" e WHERE e."id" = a."expense_id";--> statement-breakpoint
DELETE FROM "expense_attachments" WHERE "project_id" IS NULL;--> statement-breakpoint
ALTER TABLE "expense_attachments" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_attachments" ADD COLUMN "pending_expense_id" uuid;--> statement-breakpoint
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_attachments_expense_idx" ON "expense_attachments" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "expense_attachments_pending_idx" ON "expense_attachments" USING btree ("project_id","pending_expense_id");