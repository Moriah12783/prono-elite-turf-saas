import { ScheduledJobRunStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SimpleTable } from "@/components/tables/simple-table";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import { asStringValue } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth";
import { getScheduledJobDefinitions, getScheduledJobRuns } from "@/services/scheduler/scheduled-job-service";

import { runScheduledJobAction } from "./actions";

function getRunSummaryText(summary: unknown) {
  if (!summary || typeof summary !== "object") {
    return "Aucun resume disponible.";
  }

  const candidate = summary as Record<string, unknown>;
  const totals = typeof candidate.totals === "object" && candidate.totals !== null ? (candidate.totals as Record<string, unknown>) : null;

  if (!totals) {
    return "Execution terminee sans resume chiffre.";
  }

  return Object.entries(totals)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" � ");
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

  const [definitions, runs] = await Promise.all([getScheduledJobDefinitions(), getScheduledJobRuns(25)]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planification"
        title="Jobs quotidiens"
        description="Socle prudent pour preparer, controler et tenter les publications quotidiennes sans automatiser le metier sensible d'un seul coup."
      />

      {message ? <Notice tone={tone} message={message} /> : null}

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
