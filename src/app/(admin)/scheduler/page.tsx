import { ScheduledJobRunStatus } from "@prisma/client";

import { ActionPolicyBadge } from "@/components/ui/action-policy-badge";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
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
  getScheduledJobRuns,
  getSchedulerGlobalAttentionStatus,
  type SchedulerExpectedSummary,
  type SchedulerPeriod
} from "@/services/scheduler/scheduled-job-service";
import { formatExecutionWindow, formatRecommendedMode } from "@/services/scheduler/scheduled-jobs";

import { runScheduledJobAction } from "./actions";

const PERIOD_OPTIONS: Array<{ value: SchedulerPeriod; label: string }> = [
  { value: "today", label: "Aujourd'hui" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 jours" }
];

function getPeriodLabel(period: SchedulerPeriod) {
  return PERIOD_OPTIONS.find((option) => option.value === period)?.label ?? period;
}

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

function getGlobalClasses(level: "ok" | "alert" | "blocked") {
  if (level === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (level === "alert") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-rose-200 bg-rose-50 text-rose-900";
}

function getSafeExpectedSummary(
  summary: Partial<SchedulerExpectedSummary> | null | undefined,
  fallbackLabel: string
): SchedulerExpectedSummary {
  return {
    label: typeof summary?.label === "string" && summary.label.length > 0 ? summary.label : fallbackLabel,
    total: typeof summary?.total === "number" ? summary.total : 0,
    executed: typeof summary?.executed === "number" ? summary.executed : 0,
    pending: typeof summary?.pending === "number" ? summary.pending : 0
  };
}

function getFreshnessSupportText(hasObservedRun: boolean, period: SchedulerPeriod) {
  if (!hasObservedRun) {
    return `Aucun run observe sur ${getPeriodLabel(period).toLowerCase()}.`;
  }

  return "Le bandeau s'appuie sur les runs les plus recents de la periode selectionnee.";
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
  const requestedPeriod = asStringValue(params.period);
  const period: SchedulerPeriod = requestedPeriod === "today" || requestedPeriod === "24h" || requestedPeriod === "7d" ? requestedPeriod : "today";

  const [definitions, overview, globalAttention, runs, alerts] = await Promise.all([
    getScheduledJobDefinitions(),
    getScheduledJobOverview(period),
    getSchedulerGlobalAttentionStatus(period),
    getScheduledJobRuns(25, period),
    getRecentScheduledJobAlerts(6, period)
  ]);
  const expectedSummary = getSafeExpectedSummary(
    globalAttention.expectedSummary ?? globalAttention.expectedToday,
    period === "today" ? "Jobs attendus aujourd'hui" : `Jobs couverts sur ${period}`
  );
  const periodLabel = getPeriodLabel(period);
  const hasObservedRun = Boolean(globalAttention.lastObservedRun);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planification"
        title="Jobs quotidiens"
        description="Tableau de bord de supervision pour preparer, controler et suivre les jobs quotidiens du pipeline PRONO ELITE TURF."
      />

      {message ? <Notice tone={tone} message={message} /> : null}

      <div className="flex flex-wrap gap-3">
        {PERIOD_OPTIONS.map((option) => (
          <LinkButton
            key={option.value}
            href={option.value === "today" ? "/scheduler" : `/scheduler?period=${option.value}`}
          >
            {option.label}{option.value === period ? " • actif" : ""}
          </LinkButton>
        ))}
      </div>

      <div className={`rounded-3xl border p-5 ${getGlobalClasses(globalAttention.level)}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]">Attention aujourd'hui</p>
            <h2 className="mt-1 text-2xl font-semibold">{globalAttention.title}</h2>
            <p className="mt-2 text-sm">{globalAttention.message}</p>
          </div>
          <ActionPolicyBadge
            label={globalAttention.title}
            tone={globalAttention.level === "ok" ? "allowed" : globalAttention.level === "alert" ? "info" : "blocked"}
          />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-700">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Derniere supervision</p>
            <p className="mt-2 font-semibold text-slate-950">{formatDateTime(globalAttention.computedAt)}</p>
            <p className="mt-1 text-xs">
              Dernier run observe : {globalAttention.lastObservedRun ? formatDateTime(globalAttention.lastObservedRun) : "Aucun sur cette periode"}
            </p>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-700">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Fraicheur</p>
            <div className="mt-2 flex items-center gap-2">
              <ActionPolicyBadge
                label={globalAttention.freshness.label}
                tone={globalAttention.freshness.tone === "fresh" ? "allowed" : "info"}
              />
            </div>
            <p className="mt-1 text-xs">{getFreshnessSupportText(hasObservedRun, period)}</p>
          </div>
          <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-700">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{expectedSummary.label}</p>
            <p className="mt-2 font-semibold text-slate-950">
              {expectedSummary.executed} executes / {expectedSummary.total} attendus
            </p>
            <p className="mt-1 text-xs">
              {expectedSummary.pending > 0 ? `Restants : ${expectedSummary.pending}` : "Aucun job restant sur cette periode."}
            </p>
          </div>
        </div>
        {globalAttention.details.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {globalAttention.details.map((detail) => (
              <span key={detail} className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
                {detail}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <Panel
        title="Vue synthese"
        description={`Lecture rapide de l'etat des jobs sur la periode ${periodLabel}.`}
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
          description={`Signalements locaux sur ${periodLabel}.`}
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
        description={`Historique des runs sur ${periodLabel}.`}
      >
        {runs.length ? (
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
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Aucun run sur {periodLabel.toLowerCase()}.</p>
            <p className="mt-1">
              Lance une simulation ou une execution depuis le registre des jobs pour commencer a alimenter la supervision.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
