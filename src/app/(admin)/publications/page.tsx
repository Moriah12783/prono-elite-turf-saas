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
import {
  parsePublicationAttemptHistory,
  parsePublicationDebugMeta,
  parsePublicationDeliveryMeta,
  parsePublicationPayload
} from "@/lib/publication-payload";
import { asStringValue } from "@/lib/validation";
import { getPublicationById, getPublicationRows, getRacesForSelect } from "@/services/backoffice-service";
import { getPublicationTargetRuntimeMode } from "@/services/publication/publication-runtime";
import { normalizePublicationTarget } from "@/services/publication/publication-targets";

import {
  archivePublicationJobAction,
  publishPublicationJobAction,
  restorePublicationJobAction,
  savePublicationJobAction,
  validatePublicationJobAction
} from "./actions";

function formatJsonBlock(value: unknown) {
  if (value === undefined) {
    return "Aucune donnee disponible.";
  }

  if (value === null) {
    return "null";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Impossible d'afficher cette structure JSON.";
  }
}

export default async function PublicationsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const editId = asStringValue(params.edit);
  const debugId = asStringValue(params.debug);
  const message = asStringValue(params.message);
  const showArchived = asStringValue(params.archived) === "1";
  const tone = asStringValue(params.tone) === "success" ? "success" : "error";
  const listHref = showArchived ? "/publications?archived=1" : "/publications";

  const [rows, races, editingPublication, debugPublication] = await Promise.all([
    getPublicationRows({ archived: showArchived }),
    getRacesForSelect(),
    editId ? getPublicationById(editId) : Promise.resolve(null),
    debugId ? getPublicationById(debugId) : Promise.resolve(null)
  ]);

  const editingPayload = parsePublicationPayload(editingPublication?.payloadJson);
  const editingTarget = normalizePublicationTarget(editingPublication?.target ?? "") ?? "mock";
  const editingRuntimeMode = getPublicationTargetRuntimeMode(editingTarget);
  const debugPayload = parsePublicationPayload(debugPublication?.payloadJson);
  const debugDeliveryMeta = parsePublicationDeliveryMeta(debugPublication?.payloadJson);
  const debugMeta = parsePublicationDebugMeta(debugPublication?.payloadJson);
  const debugHistory = parsePublicationAttemptHistory(debugPublication?.payloadJson).reverse();
  const debugTarget = normalizePublicationTarget(debugPublication?.target ?? "") ?? "mock";
  const debugRuntimeMode = debugDeliveryMeta?.deliveryMode ?? getPublicationTargetRuntimeMode(debugTarget);

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
                        <LinkButton href={showArchived ? `/publications?archived=1&debug=${row.id}` : `/publications?debug=${row.id}`}>
                          Debug
                        </LinkButton>
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

      <Panel
        title={debugPublication ? "Debug publication" : "Vue debug publication"}
        description={
          debugPublication
            ? "Cette fiche montre le payload envoye, la reponse recue et les metadonnees utiles pour deboguer un provider sans exposer les secrets."
            : "Choisissez Debug depuis une ligne de publication pour inspecter la requete envoyee et la reponse retournee."
        }
      >
        {debugPublication ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Provider</p>
                <p className="mt-2 font-semibold text-slate-950">{formatStatusLabel(debugTarget)}</p>
                <p className="mt-1 text-sm text-slate-500">Cible configuree : {debugPublication.target}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mode effectif</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ActionPolicyBadge
                    label={formatStatusLabel(debugRuntimeMode)}
                    tone={debugRuntimeMode === "real" ? "allowed" : debugRuntimeMode === "prepared" ? "info" : "blocked"}
                  />
                  <ActionPolicyBadge label={formatStatusLabel(debugPublication.mode)} tone="info" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Statut</p>
                <div className="mt-2">
                  <StatusBadge status={debugPublication.status} />
                </div>
                <p className="mt-2 text-sm text-slate-500">Reference : {debugDeliveryMeta?.externalReference ?? "Aucune"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Course liee</p>
                <p className="mt-2 font-semibold text-slate-950">{debugPublication.race.raceName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {debugPublication.race.venue} • {debugPublication.race.raceTime} • {formatStatusLabel(debugPublication.race.status)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Synthese editoriale</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p><span className="font-medium text-slate-950">Titre :</span> {debugPayload?.title ?? "Non disponible"}</p>
                  <p><span className="font-medium text-slate-950">Extrait :</span> {debugPayload?.excerpt ?? "Non disponible"}</p>
                  <p><span className="font-medium text-slate-950">Contenu :</span> {debugPayload?.body ?? "Non disponible"}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Horodatages utiles</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p><span className="font-medium text-slate-950">Cree le :</span> {formatDateTime(debugPublication.createdAt)}</p>
                  <p><span className="font-medium text-slate-950">Mis a jour le :</span> {formatDateTime(debugPublication.updatedAt)}</p>
                  <p><span className="font-medium text-slate-950">Derniere tentative :</span> {debugMeta?.lastAttemptAt ? formatDateTime(new Date(debugMeta.lastAttemptAt)) : "Aucune"}</p>
                  <p><span className="font-medium text-slate-950">Publie le :</span> {debugPublication.publishedAt ? formatDateTime(debugPublication.publishedAt) : "Non publie"}</p>
                  <p><span className="font-medium text-slate-950">Archive :</span> {debugPublication.archivedAt ? formatDateTime(debugPublication.archivedAt) : "Non"}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Payload envoye</h3>
                <p className="mt-2 text-sm text-slate-500">Le contenu visible ici exclut les secrets de configuration comme les tokens et mots de passe applicatifs.</p>
                <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{formatJsonBlock(debugMeta?.sentPayload)}</pre>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-950">Reponse recue</h3>
                <p className="mt-2 text-sm text-slate-500">Utile pour verifier le mode mock, WordPress REST ou API custom pendant les tests d'integration.</p>
                <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{formatJsonBlock(debugMeta?.receivedResponse)}</pre>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-950">Etat d'execution</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p><span className="font-medium text-slate-950">Message d'erreur :</span> {debugPublication.errorMessage ?? "Aucune erreur enregistree."}</p>
                <p><span className="font-medium text-slate-950">Provider utilise :</span> {debugDeliveryMeta?.providerKey ? formatStatusLabel(debugDeliveryMeta.providerKey) : "Non determine"}</p>
                <p><span className="font-medium text-slate-950">Reference externe :</span> {debugDeliveryMeta?.externalReference ?? "Aucune"}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-950">Historique des tentatives</h3>
              <p className="mt-2 text-sm text-slate-500">Chaque publication relancee ajoute une trace complete de la tentative sans ecraser les precedentes.</p>
              {debugHistory.length ? (
                <div className="mt-4 space-y-4">
                  {debugHistory.map((attempt, index) => (
                    <div key={`${attempt.attemptedAt ?? "attempt"}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <ActionPolicyBadge
                          label={formatStatusLabel(attempt.providerKey ?? attempt.target ?? "mock")}
                          tone="info"
                        />
                        <ActionPolicyBadge
                          label={formatStatusLabel(attempt.deliveryMode ?? "mock")}
                          tone={attempt.deliveryMode === "real" ? "allowed" : attempt.deliveryMode === "prepared" ? "info" : "blocked"}
                        />
                        {attempt.status ? <StatusBadge status={attempt.status as "DRAFT" | "READY" | "BLOCKED" | "PUBLISHED" | "FAILED"} /> : null}
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p><span className="font-medium text-slate-950">Tentative :</span> {attempt.attemptedAt ? formatDateTime(new Date(attempt.attemptedAt)) : "Inconnue"}</p>
                        <p><span className="font-medium text-slate-950">Reference externe :</span> {attempt.externalReference ?? "Aucune"}</p>
                        <p><span className="font-medium text-slate-950">Publie le :</span> {attempt.publishedAt ? formatDateTime(new Date(attempt.publishedAt)) : "Non publie"}</p>
                        <p><span className="font-medium text-slate-950">Erreur :</span> {attempt.errorMessage ?? "Aucune"}</p>
                      </div>

                      <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Payload envoye</p>
                          <pre className="mt-2 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{formatJsonBlock(attempt.sentPayload)}</pre>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reponse recue</p>
                          <pre className="mt-2 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{formatJsonBlock(attempt.receivedResponse)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Aucune tentative de publication enregistree pour le moment.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Aucune publication selectionnee pour le debug.</p>
        )}
      </Panel>
    </div>
  );
}
