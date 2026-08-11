ALTER TABLE "documents"
ALTER COLUMN "status" SET DATA TYPE text
USING "status"::text;
--> statement-breakpoint

UPDATE "documents"
SET "status" = CASE
  WHEN "status" = 'pending' THEN 'uploaded'
  WHEN "status" = 'completed' THEN 'ready'
  ELSE "status"
END;
--> statement-breakpoint

ALTER TABLE "documents"
ALTER COLUMN "status" SET DEFAULT 'uploaded';
--> statement-breakpoint

DROP TYPE "public"."document_status";
--> statement-breakpoint

CREATE TYPE "public"."document_status"
AS ENUM('uploaded', 'processing', 'ready', 'failed');
--> statement-breakpoint

ALTER TABLE "documents"
ALTER COLUMN "status"
SET DEFAULT 'uploaded'::"public"."document_status";
--> statement-breakpoint

ALTER TABLE "documents"
ALTER COLUMN "status"
SET DATA TYPE "public"."document_status"
USING "status"::"public"."document_status";