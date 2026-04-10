import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SimpleTable } from "@/components/tables/simple-table";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import { getPublicationRows } from "@/services/backoffice-service";

export default async function PublicationsPage() {
  const rows = await getPublicationRows();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Diffusion"
        title="Workflow de publication"
        description="Suivi des brouillons, prets a publier, publications effectuees et echecs, avec une couche decouplee du coeur metier."
      />

      <Panel title="Publication jobs" description="Socle prepare pour WordPress REST API, API custom ou workflow conditionnel futur.">
        <SimpleTable
          rows={rows}
          columns={[
            {
              key: "race",
              header: "Course",
              render: (row) => (
                <div>
                  <p className="font-semibold text-slate-950">{row.race.raceName}</p>
                  <p className="text-slate-500">{row.race.venue} • {row.race.raceTime}</p>
                </div>
              )
            },
            {
              key: "target",
              header: "Cible",
              render: (row) => (
                <div>
                  <p>{row.target}</p>
                  <p className="text-slate-500">{formatStatusLabel(row.mode)}</p>
                </div>
              )
            },
            {
              key: "status",
              header: "Statut",
              render: (row) => <StatusBadge status={row.status} />
            },
            {
              key: "publishedAt",
              header: "Horodatage",
              render: (row) => row.publishedAt ? formatDateTime(row.publishedAt) : "Non publie"
            }
          ]}
        />
      </Panel>
    </div>
  );
}
