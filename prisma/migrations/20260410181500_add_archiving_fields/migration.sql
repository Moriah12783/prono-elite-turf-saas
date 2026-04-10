-- Add lightweight archiving metadata for sensitive business entities.
ALTER TABLE "races"
ADD COLUMN "archived_at" TIMESTAMP(3),
ADD COLUMN "archived_by" TEXT;

ALTER TABLE "predictions"
ADD COLUMN "archived_at" TIMESTAMP(3),
ADD COLUMN "archived_by" TEXT;

ALTER TABLE "results"
ADD COLUMN "archived_at" TIMESTAMP(3),
ADD COLUMN "archived_by" TEXT;

ALTER TABLE "publication_jobs"
ADD COLUMN "archived_at" TIMESTAMP(3),
ADD COLUMN "archived_by" TEXT;

ALTER TABLE "races"
ADD CONSTRAINT "races_archived_by_fkey"
FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "predictions"
ADD CONSTRAINT "predictions_archived_by_fkey"
FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "results"
ADD CONSTRAINT "results_archived_by_fkey"
FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "publication_jobs"
ADD CONSTRAINT "publication_jobs_archived_by_fkey"
FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
