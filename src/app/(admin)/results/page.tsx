import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { SimpleTable } from "@/components/tables/simple-table";
import { RESULT_STATUS_OPTIONS } from "@/domain/options";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import { asStringValue } from "@/lib/validation";
import { getResultById, getResults, getRacesForSelect } from "@/services/backoffice-service";

import { archiveResultAction, restoreResultAction, saveResultAction } from "./actions";

export default async function ResultsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const editId = asStringValue(params.edit);
  const message = asStringValue(params.message);
  const showArchived = asStringValue(params.archived) === "1";
  const tone = asStringValue(params.tone) === "success" ? "success" : "error";
  const listHref = showArchived ? "/results?archived=1" : "/results";

  const [rows, races, editingResult] = await Promise.all([
    getResults({ archived: showArchived }),
    getRacesForSelect(),
    editId ? getResultById(editId) : Promise.resolve(null)
  ]);
  const selectableRaces = editingResult
    ? races
    : races.filter((race) => !race.result);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Controle"
        title="Gestion des resultats"
        description="CRUD admin des arrivees officielles avec comparaison directe face aux pronostics generes."
      />

      <div className="flex justify-end">
        <LinkButton href={showArchived ? "/results" : "/results?archived=1"}>
          {showArchived ? "Voir les resultats actifs" : "Voir les archives"}
        </LinkButton>
      </div>

      {message ? <Notice tone={tone} message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.35fr]">
        <Panel
          title={showArchived && !editingResult ? "Mode archive" : editingResult ? "Modifier un resultat" : "Nouveau resultat"}
          description={
            showArchived && !editingResult
              ? "La creation est desactivee dans la vue archive. Restaurez un resultat ou revenez a la vue active."
              : "L'arrivee officielle est saisie sous forme de numeros separes par des virgules."
          }
        >
          {showArchived && !editingResult ? (
            <p className="text-sm text-slate-500">Les resultats archives restent consultables et restaurables depuis cette vue.</p>
          ) : (
          <form action={saveResultAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={editingResult?.id ?? ""} />
            <input type="hidden" name="archivedView" value={showArchived ? "1" : "0"} />
            <Field label="Course">
              <Select name="raceId" defaultValue={editingResult?.raceId ?? selectableRaces[0]?.id ?? ""} required>
                {selectableRaces.map((race) => (
                  <option key={race.id} value={race.id}>{race.raceName} • {race.venue} • {race.raceTime}</option>
                ))}
              </Select>
            </Field>
            <Field label="Statut officiel">
              <Select name="officialStatus" defaultValue={editingResult?.officialStatus ?? RESULT_STATUS_OPTIONS[0]}>
                {RESULT_STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>{formatStatusLabel(value)}</option>
                ))}
              </Select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Arrivee officielle" hint="Exemple : 3,8,6">
                <Input name="officialArrival" defaultValue={Array.isArray(editingResult?.officialArrival) ? editingResult.officialArrival.join(",") : ""} required />
              </Field>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={!selectableRaces.length && !editingResult}>{editingResult ? "Mettre a jour" : "Creer le resultat"}</Button>
              {editingResult ? <LinkButton href={listHref}>Annuler</LinkButton> : null}
            </div>
          </form>
          )}
          {!showArchived && !editingResult && !selectableRaces.length ? (
            <p className="mt-4 text-sm text-slate-500">
              Toutes les courses ont deja un resultat. Editez une fiche existante ou ajoutez une nouvelle course.
            </p>
          ) : null}
        </Panel>

        <Panel
          title={showArchived ? "Resultats archives" : "Liste des resultats"}
          description={showArchived ? "Historique archive des resultats saisis." : "Suivi des arrivees et lecture rapide de l'ecart entre analyse et reel."}
        >
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
                key: "officialArrival",
                header: "Arrivee",
                render: (row) => row.officialArrival.join(" - ") || "En attente"
              },
              {
                key: "comparison",
                header: "Comparatif",
                render: (row) =>
                  row.race.prediction
                    ? `${row.race.prediction.mainPick} / ${row.race.prediction.basePick} / ${row.race.prediction.outsiderPick}`
                    : "Aucun pronostic"
              },
              {
                key: "status",
                header: "Statut",
                render: (row) => (
                  <div className="space-y-2">
                    <StatusBadge status={row.officialStatus} />
                    <p className="text-xs text-slate-500">{row.importedAt ? formatDateTime(row.importedAt) : "Non importe"}</p>
                    {row.archivedAt ? (
                      <p className="text-xs text-slate-500">
                        Archive le {formatDateTime(row.archivedAt)}
                        {row.archivedBy ? ` par ${row.archivedBy.name}` : ""}
                      </p>
                    ) : null}
                  </div>
                )
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    {!showArchived ? <LinkButton href={`/results?edit=${row.id}`}>Editer</LinkButton> : null}
                    <form action={showArchived ? restoreResultAction : archiveResultAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="archivedView" value={showArchived ? "1" : "0"} />
                      <Button type="submit" variant={showArchived ? "secondary" : "danger"}>
                        {showArchived ? "Restaurer" : "Archiver"}
                      </Button>
                    </form>
                  </div>
                )
              }
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
