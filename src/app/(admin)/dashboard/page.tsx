import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SimpleTable } from "@/components/tables/simple-table";
import { formatDate, formatStatusLabel } from "@/lib/format";
import { getAuditLogs, getDashboardMetrics, getRaces } from "@/services/backoffice-service";

export default async function DashboardPage() {
  const [metrics, races, logs] = await Promise.all([getDashboardMetrics(), getRaces(), getAuditLogs()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vue d'ensemble"
        title="Dashboard operationnel"
        description="Pilotage quotidien conforme au cahier des charges : suivi des courses, avancement de production, publication et alertes d'exploitation."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.95fr]">
        <Panel title="Courses actives" description="Synthese de la journee avec workflow, production et publication.">
          <SimpleTable
            rows={races}
            columns={[
              {
                key: "course",
                header: "Course",
                render: (race) => (
                  <div>
                    <p className="font-semibold text-slate-950">{race.raceName}</p>
                    <p className="text-slate-500">{race.venue} • {formatDate(race.raceDate)} • {race.raceTime}</p>
                  </div>
                )
              },
              {
                key: "status",
                header: "Traitement",
                render: (race) => <StatusBadge status={race.status} />
              },
              {
                key: "prediction",
                header: "Pronostic",
                render: (race) => race.prediction ? formatStatusLabel(race.prediction.approvalStatus) : "A creer"
              },
              {
                key: "publication",
                header: "Publication",
                render: (race) => <StatusBadge status={race.publicationStatus} />
              }
            ]}
          />
        </Panel>

        <Panel title="Journal recent" description="Audit trail des actions critiques et des mouvements admin.">
          <div className="space-y-4">
            {logs.slice(0, 6).map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-950">{formatStatusLabel(log.actionType)}</p>
                  <StatusBadge status={log.entityType} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {log.actor?.name ?? "Systeme"} • {formatStatusLabel(log.entityType)} • {formatDate(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
