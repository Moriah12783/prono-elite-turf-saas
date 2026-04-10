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
import { PUBLICATION_STATUS_OPTIONS, RACE_STATUS_OPTIONS } from "@/domain/options";
import { formatDate, formatStatusLabel } from "@/lib/format";
import { asStringValue } from "@/lib/validation";
import { getRaceById, getRaces } from "@/services/backoffice-service";

import { deleteCourseAction, saveCourseAction } from "./actions";

export default async function CoursesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const editId = asStringValue(params.edit);
  const message = asStringValue(params.message);
  const tone = asStringValue(params.tone) === "success" ? "success" : "error";

  const [races, editingRace] = await Promise.all([getRaces(), editId ? getRaceById(editId) : Promise.resolve(null)]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Referentiel"
        title="Gestion des courses"
        description="CRUD admin des courses avec statuts metier, qualite de donnees et readiness publication conformes au cahier des charges."
      />

      {message ? <Notice tone={tone} message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.35fr]">
        <Panel title={editingRace ? "Modifier une course" : "Nouvelle course"} description="Saisie minimale necessaire avant generation de pronostic et publication.">
          <form action={saveCourseAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={editingRace?.id ?? ""} />
            <Field label="Nom de la course">
              <Input name="raceName" defaultValue={editingRace?.raceName ?? ""} required />
            </Field>
            <Field label="Hippodrome">
              <Input name="venue" defaultValue={editingRace?.venue ?? ""} required />
            </Field>
            <Field label="Date">
              <Input type="date" name="raceDate" defaultValue={editingRace ? editingRace.raceDate.toISOString().slice(0, 10) : ""} required />
            </Field>
            <Field label="Heure">
              <Input type="time" name="raceTime" defaultValue={editingRace?.raceTime ?? ""} required />
            </Field>
            <Field label="Discipline">
              <Input name="discipline" defaultValue={editingRace?.discipline ?? ""} required />
            </Field>
            <Field label="Distance (m)">
              <Input type="number" name="distance" defaultValue={editingRace?.distance ?? ""} min={1} required />
            </Field>
            <Field label="Score qualite" hint="Optionnel, entre 0 et 100.">
              <Input type="number" name="qualityScore" defaultValue={editingRace?.qualityScore ?? ""} min={0} max={100} />
            </Field>
            <Field label="Source externe" hint="Identifiant source optionnel.">
              <Input name="externalSourceId" defaultValue={editingRace?.externalSourceId ?? ""} />
            </Field>
            <Field label="Statut metier">
              <Select name="status" defaultValue={editingRace?.status ?? RACE_STATUS_OPTIONS[0]}>
                {RACE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Statut publication">
              <Select name="publicationStatus" defaultValue={editingRace?.publicationStatus ?? PUBLICATION_STATUS_OPTIONS[0]}>
                {PUBLICATION_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </Select>
            </Field>
            <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
              <Button type="submit">{editingRace ? "Mettre a jour" : "Creer la course"}</Button>
              {editingRace ? <LinkButton href="/courses">Annuler</LinkButton> : null}
            </div>
          </form>
        </Panel>

        <Panel title="Liste des courses" description="Vue de gestion principale pour la production quotidienne.">
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
                key: "meta",
                header: "Meta",
                render: (race) => `${race.discipline} • ${race.distance}m • ${race.runnersCount} partants`
              },
              {
                key: "workflow",
                header: "Workflow",
                render: (race) => (
                  <div className="space-y-2">
                    <StatusBadge status={race.status} />
                    <div><StatusBadge status={race.publicationStatus} /></div>
                  </div>
                )
              },
              {
                key: "actions",
                header: "Actions",
                render: (race) => (
                  <div className="flex flex-wrap gap-2">
                    <LinkButton href={`/courses?edit=${race.id}`}>Editer</LinkButton>
                    <form action={deleteCourseAction}>
                      <input type="hidden" name="id" value={race.id} />
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
