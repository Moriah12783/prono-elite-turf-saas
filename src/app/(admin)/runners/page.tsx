import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Notice } from "@/components/ui/notice";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { SimpleTable } from "@/components/tables/simple-table";
import { RUNNER_STATUS_OPTIONS } from "@/domain/options";
import { formatOdds, formatStatusLabel } from "@/lib/format";
import { asStringValue } from "@/lib/validation";
import { getRacesForSelect, getRunnerById, getRunners } from "@/services/backoffice-service";

import { deleteRunnerAction, saveRunnerAction } from "./actions";

export default async function RunnersPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const editId = asStringValue(params.edit);
  const message = asStringValue(params.message);
  const tone = asStringValue(params.tone) === "success" ? "success" : "error";

  const [rows, races, editingRunner] = await Promise.all([
    getRunners(),
    getRacesForSelect(),
    editId ? getRunnerById(editId) : Promise.resolve(null)
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Terrain"
        title="Gestion des partants"
        description="CRUD admin des partants avec gestion des cotes, non-partants et donnees brutes associees."
      />

      {message ? <Notice tone={tone} message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.35fr]">
        <Panel title={editingRunner ? "Modifier un partant" : "Nouveau partant"} description="Les validations minimales couvrent numero, liaison course et informations essentielles.">
          <form action={saveRunnerAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={editingRunner?.id ?? ""} />
            <Field label="Course" hint="Creer d'abord une course si la liste est vide.">
              <Select name="raceId" defaultValue={editingRunner?.raceId ?? races[0]?.id ?? ""} required>
                {races.map((race) => (
                  <option key={race.id} value={race.id}>{race.raceName} • {race.venue} • {race.raceTime}</option>
                ))}
              </Select>
            </Field>
            <Field label="Numero">
              <Input type="number" name="number" defaultValue={editingRunner?.number ?? ""} min={1} required />
            </Field>
            <Field label="Nom du cheval">
              <Input name="horseName" defaultValue={editingRunner?.horseName ?? ""} required />
            </Field>
            <Field label="Jockey / Driver">
              <Input name="jockeyName" defaultValue={editingRunner?.jockeyName ?? ""} />
            </Field>
            <Field label="Entraineur">
              <Input name="trainerName" defaultValue={editingRunner?.trainerName ?? ""} />
            </Field>
            <Field label="Cote">
              <Input type="number" name="odds" defaultValue={editingRunner?.odds?.toString() ?? ""} step="0.1" min={0} />
            </Field>
            <Field label="Statut">
              <Select name="status" defaultValue={editingRunner?.status ?? RUNNER_STATUS_OPTIONS[0]}>
                {RUNNER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Non-partant" hint="Cocher si le cheval est retire.">
              <input type="checkbox" name="isNonRunner" defaultChecked={editingRunner?.isNonRunner ?? false} className="h-5 w-5 rounded border-slate-300" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Donnees brutes JSON" hint='Exemple : {"music":"1a2a3a"}'>
                <Textarea name="rawDataJson" defaultValue={editingRunner?.rawDataJson ? JSON.stringify(editingRunner.rawDataJson) : ""} />
              </Field>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={!races.length}>{editingRunner ? "Mettre a jour" : "Creer le partant"}</Button>
              {editingRunner ? <LinkButton href="/runners">Annuler</LinkButton> : null}
            </div>
          </form>
        </Panel>

        <Panel title="Liste des partants" description="Vue operationnelle exploitable par l'editeur et l'administrateur.">
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
                key: "horse",
                header: "Partant",
                render: (row) => (
                  <div>
                    <p className="font-semibold text-slate-950">{row.number}. {row.horseName}</p>
                    <p className="text-slate-500">{row.trainerName ?? "Entraineur non renseigne"}</p>
                  </div>
                )
              },
              {
                key: "pilot",
                header: "Jockey / Driver",
                render: (row) => row.jockeyName ?? "-"
              },
              {
                key: "odds",
                header: "Cote",
                render: (row) => formatOdds(row.odds?.toString())
              },
              {
                key: "status",
                header: "Statut",
                render: (row) => <StatusBadge status={row.status} />
              },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <LinkButton href={`/runners?edit=${row.id}`}>Editer</LinkButton>
                    <form action={deleteRunnerAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" variant="danger">Supprimer</Button>
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

