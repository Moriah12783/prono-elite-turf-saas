-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('COLLECTED', 'PENDING_VALIDATION', 'VALIDATED', 'PREDICTION_GENERATED', 'DRAFT_READY', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'RESULT_INTEGRATED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'READY', 'BLOCKED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ConfidenceLabel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "RunnerStatus" AS ENUM ('DECLARED', 'NON_RUNNER', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ResultOfficialStatus" AS ENUM ('PENDING', 'PARTIAL', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "PublicationMode" AS ENUM ('MANUAL', 'AUTO_DRAFT', 'VALIDATED', 'CONDITIONAL_AUTOMATIC');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VALIDATE', 'APPROVE', 'PUBLISH', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('USER', 'RACE', 'RUNNER', 'PREDICTION', 'RESULT', 'PUBLICATION_JOB', 'AUTH_SESSION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "races" (
    "id" TEXT NOT NULL,
    "external_source_id" TEXT,
    "race_name" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "race_date" DATE NOT NULL,
    "race_time" TEXT NOT NULL,
    "race_datetime" TIMESTAMP(3) NOT NULL,
    "discipline" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "runners_count" INTEGER NOT NULL DEFAULT 0,
    "status" "RaceStatus" NOT NULL,
    "quality_score" INTEGER,
    "publication_status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runners" (
    "id" TEXT NOT NULL,
    "race_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "horse_name" TEXT NOT NULL,
    "jockey_name" TEXT,
    "trainer_name" TEXT,
    "odds" DECIMAL(8,2),
    "is_non_runner" BOOLEAN NOT NULL DEFAULT false,
    "status" "RunnerStatus" NOT NULL DEFAULT 'DECLARED',
    "raw_data_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "runners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "race_id" TEXT NOT NULL,
    "main_pick" TEXT NOT NULL,
    "base_pick" TEXT NOT NULL,
    "outsider_pick" TEXT NOT NULL,
    "speculative_pick" TEXT NOT NULL,
    "confidence_label" "ConfidenceLabel" NOT NULL,
    "analysis_text" TEXT NOT NULL,
    "caution_text" TEXT NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "race_id" TEXT NOT NULL,
    "official_arrival" JSONB NOT NULL,
    "official_status" "ResultOfficialStatus" NOT NULL DEFAULT 'PENDING',
    "imported_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_jobs" (
    "id" TEXT NOT NULL,
    "race_id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "mode" "PublicationMode" NOT NULL,
    "payload_json" JSONB,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action_type" "AuditActionType" NOT NULL,
    "entity_type" "AuditEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "races_external_source_id_key" ON "races"("external_source_id");

-- CreateIndex
CREATE INDEX "races_race_date_status_idx" ON "races"("race_date", "status");

-- CreateIndex
CREATE INDEX "races_publication_status_idx" ON "races"("publication_status");

-- CreateIndex
CREATE INDEX "runners_race_id_status_idx" ON "runners"("race_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "runners_race_id_number_key" ON "runners"("race_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "predictions_race_id_key" ON "predictions"("race_id");

-- CreateIndex
CREATE INDEX "predictions_approval_status_idx" ON "predictions"("approval_status");

-- CreateIndex
CREATE UNIQUE INDEX "results_race_id_key" ON "results"("race_id");

-- CreateIndex
CREATE INDEX "results_official_status_idx" ON "results"("official_status");

-- CreateIndex
CREATE INDEX "publication_jobs_race_id_status_idx" ON "publication_jobs"("race_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "runners" ADD CONSTRAINT "runners_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_jobs" ADD CONSTRAINT "publication_jobs_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
