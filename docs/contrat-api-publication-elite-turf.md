# Contrat d'API de publication Elite Turf

Ce document formalise le contrat cible entre le back-office `PRONO ELITE TURF SaaS` et une future API de publication Elite Turf.

## Objectif

Permettre au back-office d'envoyer un pronostic editorial pret a publier vers une API externe stable, simple et exploitable pour une automatisation quotidienne.

## Endpoint cible propose

- Methode : `POST`
- Endpoint type : `/publications`
- Authentification : `Authorization: Bearer <token>`
- Content-Type : `application/json`

## Payload entrant propose

```json
{
  "requestId": "clx123publicationjob",
  "provider": "api-custom",
  "target": "elite-turf",
  "mode": "MANUAL",
  "publicationStatus": "draft",
  "course": {
    "id": "clx123race",
    "raceName": "Prix de Vincennes",
    "venue": "Vincennes",
    "raceDateTime": "2026-04-10T13:45:00.000Z"
  },
  "article": {
    "title": "Pronostic Quinté+ du Prix de Vincennes",
    "excerpt": "Notre base solide et l'outsider a suivre.",
    "content": "<p>Analyse complete...</p>",
    "contentFormat": "html"
  },
  "metadata": {
    "sourceSystem": "prono-elite-turf-saas",
    "publicationJobId": "clx123publicationjob",
    "generatedAt": "2026-04-10T11:30:00.000Z"
  }
}
```

## Champs obligatoires

- `requestId`
- `provider`
- `target`
- `mode`
- `publicationStatus`
- `course.id`
- `course.raceName`
- `course.venue`
- `article.title`
- `article.content`
- `article.contentFormat`
- `metadata.sourceSystem`
- `metadata.publicationJobId`
- `metadata.generatedAt`

## Champs optionnels

- `course.raceDateTime`
- `article.excerpt`

## Signification metier des champs

- `requestId` : identifiant idempotent de la demande de publication
- `provider` : provider source cote back-office
- `target` : systeme cible logique, ici `elite-turf`
- `mode` : mode de publication du workflow back-office
- `publicationStatus` : statut editorial demande a l'API cible (`draft`, `publish`, `pending`, `private`)
- `course.*` : identification metier de la course
- `article.*` : contenu editorial a publier
- `metadata.*` : informations de tracabilite pour debug, audit et automatisation

## Reponse cible proposee

```json
{
  "success": true,
  "publicationId": "elite-turf-post-98765",
  "externalReference": "https://elite-turf.example.com/pronostics/prix-de-vincennes",
  "status": "published",
  "message": "Publication creee avec succes.",
  "receivedAt": "2026-04-10T11:30:03.000Z"
}
```

## Champs de reponse

- `success` : bool
- `publicationId` : identifiant interne de l'objet publie cote Elite Turf
- `externalReference` : URL ou reference exploitable par le back-office
- `status` : `accepted`, `draft`, `published`, `failed`
- `message` : message humain optionnel
- `receivedAt` : horodatage de reception/traitement

## Regles de reponse

- si `success=false`, l'API devrait renseigner `message`
- si `success=true`, l'API devrait retourner au moins :
  - `publicationId`
  - ou `externalReference`
- le back-office considere l'appel invalide si aucune reference n'est retournee

## Compatibilite avec l'automatisation quotidienne

Le contrat est prevu pour :

- une publication par course
- une execution planifiee quotidienne
- une logique idempotente grace a `requestId`
- une tracabilite via `metadata.generatedAt` et `metadata.publicationJobId`

## Notes d'implementation

- le payload actuel du provider `api-custom` est deja aligne sur ce contrat
- l'API Elite Turf pourra plus tard enrichir la structure avec :
  - slug
  - taxonomy
  - auteur
  - date de publication planifiee
  - tags/labels
  - canal de diffusion

Le MVP reste volontairement simple pour garder un contrat clair et stable.
