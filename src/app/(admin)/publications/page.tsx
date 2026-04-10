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
import { getPublicationActionPolicy } from "@/domain/entity-action-policy";
import { PUBLICATION_MODE_OPTIONS, PUBLICATION_TARGET_OPTIONS } from "@/domain/options";
import { formatDateTime, formatStatusLabel } from "@/lib/format";
import { parsePublicationDeliveryMeta, parsePublicationPayload } from "@/lib/publication-payload";
import { asStringValue } from "@/lib/validation";
import { getPublicationById, getPublicationRows, getRacesForSelect } from "@/services/backoffice-service";
import { getPublicationTargetRuntimeMode } from "@/services/publication/wordpress-config";
import { normalizePublicationTarget } from "@/services/publication/publication-targets";

import {
  archivePublicationJobAction,
  publishPublicationJobAction,
  restorePublicationJobAction,
  savePublicationJobAction,
  validatePublicationJobAction
} from "./actions";

export default async function PublicationsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const editId = asStringValue(params.edit);
  const message = asStringValue(params.message);
  const showArchived = asStringValue(params.archived) === "1";
  const tone = asStringValue(params.tone) === "success" ? "success" : "error";
  const listHref = showArchived ? "/publications?archived=1" : "/publications";

  const [rows, races, editingPublication] = await Promise.all([
    getPublicationRows({ archived: showArchived }),
    getRacesForSelect(),
    editId ? getPublicationById(editId) : Promise.resolve(null)
  ]);

  const editingPayload = parsePublicationPayload(editingPublication?.payloadJson);
  const editingTarget = normalizePublicationTarget(editingPublication?.target ?? "") ?? "mock";
  const editingRuntimeMode = getPublicationTargetRuntimeMode(editingTarget);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Diffusion"
        title="Gestion des publication jobs"
        description="CRUD admin, controles bloquants et publication par provider structure pour preparer les integrations externes."
      />

      <div className="flex justify-end">
        <LinkButton href={showArchived ? "/publications" : "/publications?archived=1"}>
          {showArchived ? "Voir les publications actives" : "Voir les archives"}
        </LinkButton>
      </div>

      {message ? <Notice tone={tone} message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.35fr]">
        <Panel
          title={showArchived && !editingPublication ? "Mode archive" : editingPublication ? "Modifier une publication" : "Nouvelle publication"}
          description={
            showArchived && !editingPublication
              ? "La creation est desactivee dans la vue archive. Restaurez une publication ou revenez a la vue active."
              : "La publication est d'abord en brouillon, puis controlee avant toute tentative d'envoi."
          }
        >
          {showArchived && !editingPublication ? (
            <p className="text-sm text-slate-500">Les publication jobs archives restent consultables et restaurables depuis cette vue.</p>
          ) : (
            <form action={savePublicationJobAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" value={editingPublication?.id ?? ""} />
              <input type="hidden" name="archivedView" value={showArchived ? "1" : "0"} />
              <Field label="Course">
                <Select name="raceId" defaultValue={editingPublication?.raceId ?? races[0]?.id ?? ""} required>
                  {races.map((race) => (
                    <option key={race.id} value={race.id}>{race.raceName} • {race.venue} • {race.raceTime} • {formatStatusLabel(race.status)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Provider de publication" hint="Le provider determine le connecteur reel ou le fallback mock.">
                <Select name="target" defaultValue={editingTarget}>
                  {PUBLICATION_TARGET_OPTIONS.map((target) => (
                    <option key={target} value={target}>{formatStatusLabel(target)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Mode de publication">
                <Select name="mode" defaultValue={editingPublication?.mode ?? PUBLICATION_MODE_OPTIONS[0]}>
                  {PUBLICATION_MODE_OPTIONS.map((mode) => (
                    <option key={mode} value={mode}>{formatStatusLabel(mode)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Execution effective">
                <div className="flex flex-wrap gap-2 pt-2">
                  <ActionPolicyBadge label={formatStatusLabel(editingTarget)} tone="info" />
                  <ActionPolicyBadge label={formatStatusLabel(editingRuntimeMode)} tone={editingRuntimeMode === "real" ? "allowed" : "blocked"} />
                </div>
              </Field>
              <Field label="Statut actuel">
                <div className="pt-3">
                  <StatusBadge status={editingPublication?.status ?? "DRAFT"} />
                </div>
              </Field>
              <div className="md:col-span-2">
                <Field label="Titre editorial">
                  <Input name="payloadTitle" defaultValue={editingPayload?.title ?? ""} required />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Extrait editorial" hint="Optionnel, utile pour teaser ou meta contenu.">
                  <Textarea name="payloadExcerpt" defaultValue={editingPayload?.excerpt ?? ""} className="min-h-20" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Corps editorial">
                  <Textarea name="payloadBody" defaultValue={editingPayload?.body ?? ""} required className="min-h-36" />
                </Field>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
                <Button type="submit" disabled={!races.length}>{editingPublication ? "Mettre a jour" : "Creer la publication"}</Button>
                {editingPublication ? <LinkButton href={listHref}>Annuler</LinkButton> : null}
              </div>
            </form>
          )}
        </Panel>

        <Panel
          title={showArchived ? "Publications archivees" : "Suivi des publications"}
          description={showArchived ? "Historique archive des jobs de publication." : "Provider, mode effectif, erreurs de publication et payload editorial."}
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
                key: "target",
                header: "Provider / Mode",
                render: (row) => {
                  const normalizedTarget = normalizePublicationTarget(row.target) ?? "mock";
                  const deliveryMeta = parsePublicationDeliveryMeta(row.payloadJson);
                  const effectiveMode = deliveryMeta?.deliveryMode ?? getPublicationTargetRuntimeMode(normalizedTarget);

                  return (
                    <div className="space-y-2">
                      <p>{formatStatusLabel(normalizedTarget)}</p>
                      <p className="text-slate-500">{formatStatusLabel(row.mode)}</p>
                      <div className="flex flex-wrap gap-2">
                        <ActionPolicyBadge label={formatStatusLabel(effectiveMode)} tone={effectiveMode === "real" ? "allowed" : effectiveMode === "prepared" ? "info" : "blocked"} />
                      </div>
                    </div>
                  );
                }
              },
              {
                key: "payload",
                header: "Payload",
                render: (row) => {
                  const payload = parsePublicationPayload(row.payloadJson);
                  const deliveryMeta = parsePublicationDeliveryMeta(row.payloadJson);

                  return (
                    <div>
                      <p className="font-medium text-slate-950">{payload?.title ?? "Payload incomplet"}</p>
                      <p className="text-slate-500">{payload?.body ?? row.errorMessage ?? "Aucun contenu"}</p>
                      {deliveryMeta?.externalReference ? (
                        <p className="mt-1 text-xs text-slate-500">Reference : {deliveryMeta.externalReference}</p>
                      ) : null}
                    </div>
                  );
                }
              },
              {
                key: "status",
                header: "Statut",
                render: (row) => (
                  <div className="space-y-2">
                    <StatusBadge status={row.status} />
                    <p className="text-xs text-slate-500">{row.publishedAt ? formatDateTime(row.publishedAt) : "Non publie"}</p>
                    {row.archivedAt ? (
                      <p className="text-xs text-slate-500">
                        Archivee le {formatDateTime(row.archivedAt)}
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
                  const policy = getPublicationActionPolicy(row);

                  return (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <ActionPolicyBadge label="Archivable" tone={policy.archive.allowed ? "allowed" : "blocked"} />
                        <ActionPolicyBadge label="Supprimable" tone={policy.delete.allowed ? "allowed" : "blocked"} />
                        <ActionPolicyBadge label="Restaurable" tone={policy.restore.allowed ? "allowed" : "blocked"} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!showArchived ? <LinkButton href={`/publications?edit=${row.id}`}>Editer</LinkButton> : null}
                        {!showArchived ? (
                          <form action={validatePublicationJobAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <Button type="submit" variant="secondary">Controler</Button>
                          </form>
                        ) : null}
                        {!showArchived ? (
                          <form action={publishPublicationJobAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <Button type="submit">Publier</Button>
                          </form>
                        ) : null}
                        {!showArchived && policy.archive.allowed ? (
                          <form action={archivePublicationJobAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="archivedView" value="0" />
                            <Button type="submit" variant="danger">Archiver</Button>
                          </form>
                        ) : null}
                        {showArchived && policy.restore.allowed ? (
                          <form action={restorePublicationJobAction}>
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
