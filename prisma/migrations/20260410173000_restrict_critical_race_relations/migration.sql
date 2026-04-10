-- Harden critical race relations to prevent dangerous cascading deletes.
ALTER TABLE "runners" DROP CONSTRAINT "runners_race_id_fkey";
ALTER TABLE "runners"
ADD CONSTRAINT "runners_race_id_fkey"
FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "predictions" DROP CONSTRAINT "predictions_race_id_fkey";
ALTER TABLE "predictions"
ADD CONSTRAINT "predictions_race_id_fkey"
FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "results" DROP CONSTRAINT "results_race_id_fkey";
ALTER TABLE "results"
ADD CONSTRAINT "results_race_id_fkey"
FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "publication_jobs" DROP CONSTRAINT "publication_jobs_race_id_fkey";
ALTER TABLE "publication_jobs"
ADD CONSTRAINT "publication_jobs_race_id_fkey"
FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
