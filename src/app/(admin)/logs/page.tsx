import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SimpleTable } from "@/components/tables/simple-table";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import { getAuditLogs } from "@/services/backoffice-service";

export default async function LogsPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Observabilite"
        title="Logs operationnels"
        description="Historique des actions importantes : creation, modification, validation, publication et mouvements d'authentification."
      />

      <Panel title="Audit logs" description="Journal d'audit minimal, pret a etre enrichi avec niveaux severite et traces techniques si necessaire.">
        <SimpleTable
          rows={logs}
          columns={[
            {
              key: "actor",
              header: "Acteur",
              render: (row) => (
                <div>
                  <p className="font-semibold text-slate-950">{row.actor?.name ?? "Systeme"}</p>
                  <p className="text-slate-500">{row.actor?.email ?? "n/a"}</p>
                </div>
              )
            },
            {
              key: "action",
              header: "Action",
              render: (row) => (
                <div>
                  <p>{formatStatusLabel(row.actionType)}</p>
                  <p className="text-slate-500">{formatStatusLabel(row.entityType)} • {row.entityId}</p>
                </div>
              )
            },
            {
              key: "metadata",
              header: "Contexte",
              render: (row) => row.metadataJson ? JSON.stringify(row.metadataJson) : "-"
            },
            {
              key: "createdAt",
              header: "Date",
              render: (row) => formatDateTime(row.createdAt)
            },
            {
              key: "entity",
              header: "Type",
              render: (row) => <StatusBadge status={row.entityType} />
            }
          ]}
        />
      </Panel>
    </div>
  );
}
