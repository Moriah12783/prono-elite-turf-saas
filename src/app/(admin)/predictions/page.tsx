import { ActionPolicyBadge } from "@/components/ui/action-policy-badge";
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
import { Textarea } from "@/components/ui/textarea";
import { getPredictionActionPolicy } from "@/domain/entity-action-policy";
import { APPROVAL_STATUS_OPTIONS, CONFIDENCE_LABEL_OPTIONS } from "@/domain/options";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import { asStringValue } from "@/lib/validation";
import { getPredictionById, getPredictions, getRacesForSelect } from "@/services/backoffice-service";

import { archivePredictionAction, restorePredictionAction, savePredictionAction } from "./actions";

export default async function PredictionsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const editId = asStringValue(params.edit);
  const message = asStringValue(params.message);
  const showArchived = asStringValue(params.archived) === "1";
  const tone = asStringValue(params.tone) === "success" ? "success" : "error";
  const listHref = showArchived ? "/predictions?archived=1" : "/predictions";

  const [rows, races, editingPrediction] = await Promise.all([
    getPredictions({ archived: showArchived }),
    getRacesForSelect(),
    editId ? getPredictionById(editId) : Promise.resolve(null)
  ]);
  const selectableRaces = editingPrediction ? races : races.filter((race) => !race.prediction);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Production"
        title="Gestion des pronostics"
        description="CRUD admin pour la structure pronostic du cahier des charges : selection principale, base, outsider, profil speculatif, confiance et validation."
      />

      <div className="flex justify-end">
        <LinkButton href={showArchived ? "/predictions" : "/predictions?archived=1"}>
          {showArchived ? "Voir les pronostics actifs" : "Voir les archives"}
        </LinkButton>
      </div>

      {message ? <Notice tone={tone} message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.35fr]">
        <Panel
          title={showArchived && !editingPrediction ? "Mode archive" : editingPrediction ? "Modifier un pronostic" : "Nouveau pronostic"}
          description={
            showArchived && !editingPrediction
              ? "La creation est desactivee dans la vue archive. Restaurez un pronostic ou revenez a la vue active."
              : "Formulaire aligne sur la structure metier Elite Turf, sans logique IA prematuree."
          }
        >
          {showArchived && !editingPrediction ? (
            <p className="text-sm text-slate-500">Les pronostics archives restent consultables et restaurables depuis cette vue.</p>
          ) : (
            <form action={savePredictionAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" value={editingPrediction?.id ?? ""} />
              <input type="hidden" name="archivedView" value={showArchived ? "1" : "0"} />
              <Field label="Course">
                <Select name="raceId" defaultValue={editingPrediction?.raceId ?? selectableRaces[0]?.id ?? ""} required>
                  {selectableRaces.map((race) => (
                    <option key={race.id} value={race.id}>{race.raceName} • {race.venue} • {race.raceTime}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Indice de confiance">
                <Select name="confidenceLabel" defaultValue={editingPrediction?.confidenceLabel ?? CONFIDENCE_LABEL_OPTIONS[0]}>
                  {CONFIDENCE_LABEL_OPTIONS.map((value) => (
                    <option key={value} value={value}>{formatStatusLabel(value)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Selection principale">
                <Input name="mainPick" defaultValue={editingPrediction?.mainPick ?? ""} required />
              </Field>
              <Field label="Base">
                <Input name="basePick" defaultValue={editingPrediction?.basePick ?? ""} required />
              </Field>
              <Field label="Outsider">
                <Input name="outsiderPick" defaultValue={editingPrediction?.outsiderPick ?? ""} required />
              </Field>
              <Field label="Profil speculatif">
                <Input name="speculativePick" defaultValue={editingPrediction?.speculativePick ?? ""} required />
              </Field>
              <Field label="Statut d'approbation">
                <Select name="approvalStatus" defaultValue={editingPrediction?.approvalStatus ?? APPROVAL_STATUS_OPTIONS[0]}>
                  {APPROVAL_STATUS_OPTIONS.map((value) => (
                    <option key={value} value={value}>{formatStatusLabel(value)}</option>
                  ))}
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Analyse breve">
                  <Textarea name="analysisText" defaultValue={editingPrediction?.analysisText ?? ""} required />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Note de prudence">
                  <Textarea name="cautionText" defaultValue={editingPrediction?.cautionText ?? ""} required />
                </Field>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
                <Button type="submit" disabled={!selectableRaces.length && !editingPrediction}>{editingPrediction ? "Mettre a jour" : "Creer le pronostic"}</Button>
                {editingPrediction ? <LinkButton href={listHref}>Annuler</LinkButton> : null}
              </div>
            </form>
          )}
          {!showArchived && !editingPrediction && !selectableRaces.length ? (
            <p className="mt-4 text-sm text-slate-500">
              Toutes les courses ont deja un pronostic. Editez une fiche existante ou creez une nouvelle course.
            </p>
          ) : null}
        </Panel>

        <Panel
          title={showArchived ? "Pronostics archives" : "Liste des pronostics"}
          description={showArchived ? "Historique archive des fiches pronostic." : "Suivi des pronostics generes, du niveau de confiance et du statut editorial."}
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
                key: "picks",
                header: "Selection",
                render: (row) => `${row.mainPick} / ${row.basePick} / ${row.outsiderPick} / ${row.speculativePick}`
              },
              {
                key: "confidence",
                header: "Confiance",
                render: (row) => formatStatusLabel(row.confidenceLabel)
              },
              {
                key: "status",
                header: "Statut",
                render: (row) => (
                  <div className="space-y-2">
                    <StatusBadge status={row.approvalStatus} />
                    <p className="text-xs text-slate-500">{formatDateTime(row.generatedAt)}</p>
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
                render: (row) => {
                  const policy = getPredictionActionPolicy(row);

                  return (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <ActionPolicyBadge label="Archivable" tone={policy.archive.allowed ? "allowed" : "blocked"} />
                        <ActionPolicyBadge label="Supprimable" tone={policy.delete.allowed ? "allowed" : "blocked"} />
                        <ActionPolicyBadge label="Restaurable" tone={policy.restore.allowed ? "allowed" : "blocked"} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!showArchived ? <LinkButton href={`/predictions?edit=${row.id}`}>Editer</LinkButton> : null}
                        {!showArchived && policy.archive.allowed ? (
                          <form action={archivePredictionAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="archivedView" value="0" />
                            <Button type="submit" variant="danger">Archiver</Button>
                          </form>
                        ) : null}
                        {showArchived && policy.restore.allowed ? (
                          <form action={restorePredictionAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="archivedView" value="1" />
                            <Button type="submit" variant="secondary">Restaurer</Button>
                          </form>
                        ) : null}
                      </div>
                      <p className="max-w-xs text-xs text-slate-500">{policy.guidance}</p>
                    </div>
                  );
                }
              }
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
