import { ScheduledJobRunStatus } from "@prisma/client";

import { ActionPolicyBadge } from "@/components/ui/action-policy-badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SimpleTable } from "@/components/tables/simple-table";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import { asStringValue } from "@/lib/validation";
import {
  getRecentScheduledJobAlerts,
  getScheduledJobDefinitions,
  getScheduledJobOverview,
  getScheduledJobRuns
} from "@/services/scheduler/scheduled-job-service";
import { formatExecutionWindow, formatRecommendedMode } from "@/services/scheduler/scheduled-jobs";

import { runScheduledJobAction } from "./actions";

function getRunSummaryText(summary: unknown) {
  if (!summary || typeof summary !== "object") {
    return "Aucun resume disponible.";
  }

  const candidate = summary as Record<string, unknown>;
  const totals = typeof candidate.totals === "object" && candidate.totals !== null ? (candidate.totals as Record<string, unknown>) : null;

  if (!totals) {
    return typeof candidate.message === "string" ? candidate.message : "Execution terminee sans resume chiffre.";
  }

  return Object.entries(totals)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" • ");
}

function getJobHealth(job: {
  lastStatus: ScheduledJobRunStatus | null;
  recentFailureCount: number;
  recentOutsideWindowSkipCount: number;
}) {
  if (job.recentFailureCount > 0) {
    return {
      label: "Echec recent",
      tone: "critical" as const,
      badgeTone: "blocked" as const
    };
  }

  if (job.lastStatus === ScheduledJobRunStatus.SKIPPED || job.recentOutsideWindowSkipCount > 0) {
    return {
      label: "Hors fenetre recent",
      tone: "warning" as const,
      badgeTone: "info" as const
    };
  }

  if (job.lastStatus === ScheduledJobRunStatus.SUCCEEDED) {
    return {
      label: "Sain",
      tone: "healthy" as const,
      badgeTone: "allowed" as const
    };
  }

  return {
    label: "A surveiller",
    tone: "neutral" as const,
    badgeTone: "info" as const
  };
}

function getCardClasses(tone: "healthy" | "warning" | "critical" | "neutral") {
  if (tone === "healthy") {
    return "border-emerald-200 bg-emerald-50/70";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50/80";
  }

  if (tone === "critical") {
    return "border-rose-200 bg-rose-50/80";
  }

  return "border-slate-200 bg-slate-50";
}

export default async function SchedulerPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const message = asStringValue(params.message);
  const tone = asStringValue(params.tone) === "success" ? "success" : "error";

  const [definitions, overview, runs, alerts] = await Promise.all([
    getScheduledJobDefinitions(),
    getScheduledJobOverview(),
    getScheduledJobRuns(25),
    getRecentScheduledJobAlerts(6)
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planification"
        title="Jobs quotidiens"
        description="Tableau de bord de supervision pour preparer, controler et suivre les jobs quotidiens du pipeline PRONO ELITE TURF."
      />

      {message ? <Notice tone={tone} message={message} /> : null}

      <Panel
        title="Vue synthese"
        description="Lecture rapide de l'etat quotidien par job : dernier run, dernier succes, dernier echec, fenetre UTC et signaux de supervision."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {overview.map((job) => {
            const health = getJobHealth(job);

            return (
              <div key={job.key} className={`rounded-3xl border p-5 ${getCardClasses(health.tone)}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{formatStatusLabel(job.key)}</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-950">{job.label}</h3>
                  </div>
                  <ActionPolicyBadge label={health.label} tone={health.badgeTone} />
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p><span className="font-medium text-slate-950">Dernier statut :</span> {job.lastStatus ? formatStatusLabel(job.lastStatus) : "Aucun run"}</p>
                  <p><span className="font-medium text-slate-950">Dernier run :</span> {job.lastRun ? formatDateTime(job.lastRun.createdAt) : "Aucun"}</p>
                  <p><span className="font-medium text-slate-950">Dernier succes :</span> {job.lastSuccess ? formatDateTime(job.lastSuccess.createdAt) : "Aucun"}</p>
                  <p><span className="font-medium text-slate-950">Dernier echec :</span> {job.lastFailure ? formatDateTime(job.lastFailure.createdAt) : "Aucun"}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Echecs recents</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{job.recentFailureCount}</p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Skips hors fenetre</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{job.recentOutsideWindowSkipCount}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <p><span className="font-medium text-slate-950">Fenetre :</span> {formatExecutionWindow(job)}</p>
                  <p><span className="font-medium text-slate-950">Mode recommande :</span> {formatRecommendedMode(job)}</p>
                  <p>{job.caution}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {alerts.length ? (
        <Panel
          title="Alertes recentes"
          description="Signalements locaux issus des derniers runs en echec ou ignores hors fenetre."
        >
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={alert.status} />
                  <p className="font-semibold text-slate-950">{formatStatusLabel(alert.jobKey)}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(alert.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm text-slate-700">{alert.errorMessage ?? getRunSummaryText(alert.summaryJson)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Declencheur : {alert.requestedBy?.name ?? formatStatusLabel(alert.trigger)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel
        title="Registre des jobs"
        description="Chaque job peut etre lance en simulation ou en execution reelle depuis l'admin. Les runs reussis du jour sont bloques en reexecution non forcee."
      >
        <div className="space-y-4">
          {definitions.map((job) => (
            <div key={job.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={ScheduledJobRunStatus.PENDING} />
                    <p className="text-base font-semibold text-slate-950">{job.label}</p>
                  </div>
                  <p className="text-sm text-slate-600">{job.description}</p>
                  <p className="text-xs text-slate-500">{job.caution}</p>
                  <p className="text-xs text-slate-500">Fenetre d'execution : {formatExecutionWindow(job)}</p>
                  <p className="text-xs text-slate-500">Mode recommande : {formatRecommendedMode(job)}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatStatusLabel(job.key)}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <form action={runScheduledJobAction}>
                    <input type="hidden" name="jobKey" value={job.key} />
                    <input type="hidden" name="dryRun" value="1" />
                    <Button type="submit" variant="secondary">Lancer en simulation</Button>
                  </form>
                  <form action={runScheduledJobAction}>
                    <input type="hidden" name="jobKey" value={job.key} />
                    <input type="hidden" name="dryRun" value="0" />
                    <Button type="submit">Executer</Button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Derniers runs"
        description="Historique recent des executions manuelles, API ou cron."
      >
        <SimpleTable
          rows={runs}
          columns={[
            {
              key: "jobKey",
              header: "Job",
              render: (row) => (
                <div>
                  <p className="font-semibold text-slate-950">{formatStatusLabel(row.jobKey)}</p>
                  <p className="text-xs text-slate-500">{row.dryRun ? "Simulation" : "Execution reelle"}</p>
                </div>
              )
            },
            {
              key: "status",
              header: "Statut",
              render: (row) => (
                <div className="space-y-2">
                  <StatusBadge status={row.status} />
                  <p className="text-xs text-slate-500">{formatStatusLabel(row.trigger)}</p>
                </div>
              )
            },
            {
              key: "timing",
              header: "Horodatages",
              render: (row) => (
                <div className="space-y-1 text-sm text-slate-600">
                  <p>Run date : {formatDateTime(row.runDate)}</p>
                  <p>Debut : {row.startedAt ? formatDateTime(row.startedAt) : "-"}</p>
                  <p>Fin : {row.finishedAt ? formatDateTime(row.finishedAt) : "-"}</p>
                </div>
              )
            },
            {
              key: "summary",
              header: "Resume",
              render: (row) => (
                <div>
                  <p className="text-sm text-slate-600">{getRunSummaryText(row.summaryJson)}</p>
                  {row.errorMessage ? <p className="mt-1 text-xs text-rose-600">{row.errorMessage}</p> : null}
                </div>
              )
            },
            {
              key: "actor",
              header: "Declencheur",
              render: (row) => (
                <div className="text-sm text-slate-600">
                  <p>{row.requestedBy?.name ?? "Systeme"}</p>
                  <p className="text-xs text-slate-500">{row.requestedBy?.email ?? formatStatusLabel(row.trigger)}</p>
                </div>
              )
            }
          ]}
        />
      </Panel>
    </div>
  );
}
