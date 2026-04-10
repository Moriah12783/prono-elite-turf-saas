CREATE TYPE "ScheduledJobKey" AS ENUM ('PREPARE_DAILY_PUBLICATIONS', 'VALIDATE_READY_PUBLICATIONS', 'ATTEMPT_AUTOMATIC_PUBLICATIONS');
CREATE TYPE "ScheduledJobRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');
CREATE TYPE "ScheduledJobTrigger" AS ENUM ('MANUAL', 'API', 'CRON');

ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'SCHEDULED_JOB_RUN';

CREATE TABLE "scheduled_job_runs" (
  "id" TEXT NOT NULL,
  "job_key" "ScheduledJobKey" NOT NULL,
  "trigger" "ScheduledJobTrigger" NOT NULL,
  "run_date" DATE NOT NULL,
  "status" "ScheduledJobRunStatus" NOT NULL DEFAULT 'PENDING',
  "dry_run" BOOLEAN NOT NULL DEFAULT true,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "requested_by" TEXT,
  "summary_json" JSONB,
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "scheduled_job_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scheduled_job_runs_job_key_run_date_idx" ON "scheduled_job_runs"("job_key", "run_date");
CREATE INDEX "scheduled_job_runs_status_created_at_idx" ON "scheduled_job_runs"("status", "created_at");

ALTER TABLE "scheduled_job_runs"
  ADD CONSTRAINT "scheduled_job_runs_requested_by_fkey"
  FOREIGN KEY ("requested_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
