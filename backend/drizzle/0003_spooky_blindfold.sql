CREATE TABLE "shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"recipient_id" integer NOT NULL,
	"file_id" integer,
	"folder_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shares_one_target" CHECK (("shares"."file_id" IS NULL) <> ("shares"."folder_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shares_recipient_file_idx" ON "shares" USING btree ("recipient_id","file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shares_recipient_folder_idx" ON "shares" USING btree ("recipient_id","folder_id");--> statement-breakpoint
CREATE INDEX "shares_owner_idx" ON "shares" USING btree ("owner_id");