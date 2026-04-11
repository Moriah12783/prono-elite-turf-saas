# Contrat API Scheduler Cron

Ce document formalise le contrat d'appel de l'endpoint local :

- `POST /api/jobs/scheduled`

Objectif : permettre a un cron externe, simple et fiable, de declencher les jobs quotidiens de PRONO ELITE TURF sans contourner les garde-fous du back-office.

## Authentification

- Header requis : `Authorization: Bearer <SCHEDULER_API_TOKEN>`
- Variable d'environnement cote application : `SCHEDULER_API_TOKEN`
- Recommandation MVP : token d'au moins 16 caracteres

Exemple :

```http
Authorization: Bearer local-scheduler-token
```

## Content-Type

Le endpoint attend :

- `Content-Type: application/json`

## Requete attendue

```json
{
  "jobKey": "VALIDATE_READY_PUBLICATIONS",
  "dryRun": true,
  "force": false
}
```

### Champs

- `jobKey` : string obligatoire
  - `PREPARE_DAILY_PUBLICATIONS`
  - `VALIDATE_READY_PUBLICATIONS`
  - `ATTEMPT_AUTOMATIC_PUBLICATIONS`
- `dryRun` : boolean optionnel, par defaut `true`
  - `true` : simulation sans effet metier irreversible
  - `false` : execution reelle avec garde-fous complets
- `force` : boolean optionnel, par defaut `false`
  - `false` : respecte les blocages de duplication quotidienne
  - `true` : reserve aux integrations controlees, sans contourner les garde-fous metier ni les fenetres si la logique applicative evolue plus tard

## Jobs disponibles

### `PREPARE_DAILY_PUBLICATIONS`

- repere les courses du jour eligibles
- peut creer des brouillons de publication manquants
- fenetre actuelle : `05:00-09:00 UTC`

Exemple :

```bash
curl -X POST http://localhost:3000/api/jobs/scheduled \
  -H "Authorization: Bearer local-scheduler-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jobKey": "PREPARE_DAILY_PUBLICATIONS",
    "dryRun": true,
    "force": false
  }'
```

### `VALIDATE_READY_PUBLICATIONS`

- rejoue les controles metier des publications du jour
- fenetre actuelle : `09:00-12:00 UTC`

Exemple :

```bash
curl -X POST http://localhost:3000/api/jobs/scheduled \
  -H "Authorization: Bearer local-scheduler-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jobKey": "VALIDATE_READY_PUBLICATIONS",
    "dryRun": false,
    "force": false
  }'
```

### `ATTEMPT_AUTOMATIC_PUBLICATIONS`

- tente de publier uniquement les jobs `READY`
- ignore les publications `MANUAL`
- fenetre actuelle : `12:00-18:00 UTC`

Exemple :

```bash
curl -X POST http://localhost:3000/api/jobs/scheduled \
  -H "Authorization: Bearer local-scheduler-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jobKey": "ATTEMPT_AUTOMATIC_PUBLICATIONS",
    "dryRun": false,
    "force": false
  }'
```

## Reponse de succes

```json
{
  "success": true,
  "code": "job_executed",
  "message": "Execution terminee.",
  "request": {
    "jobKey": "VALIDATE_READY_PUBLICATIONS",
    "dryRun": false,
    "force": false,
    "trigger": "API"
  },
  "job": {
    "key": "VALIDATE_READY_PUBLICATIONS",
    "label": "Controle des publications pretes",
    "description": "Rejoue les verifications metier sur les jobs actifs de la journee pour mettre a jour READY ou BLOCKED.",
    "executionWindowUtc": "09:00-12:00 UTC",
    "caution": "Aucune diffusion externe. Ce job ne fait que controler l'etat metier des publications.",
    "guardrails": {
      "executionWindowUtc": "09:00-12:00 UTC",
      "runningLockWindowMinutes": 15,
      "duplicateProtection": "one-successful-real-run-per-day",
      "outsideWindowPolicy": "skip-real-runs",
      "dryRunAvailable": true
    }
  },
  "outcome": {
    "skipped": false,
    "run": {
      "id": "ck...",
      "jobKey": "VALIDATE_READY_PUBLICATIONS",
      "status": "SUCCEEDED",
      "dryRun": false,
      "runDate": "2026-04-11T00:00:00.000Z",
      "startedAt": "2026-04-11T09:01:00.000Z",
      "finishedAt": "2026-04-11T09:01:03.000Z",
      "errorMessage": null
    },
    "summary": {
      "day": "2026-04-11T00:00:00.000Z",
      "dryRun": false,
      "totals": {
        "candidates": 8,
        "ready": 5,
        "blocked": 3
      }
    }
  }
}
```

## Reponse en cas de garde-fou actif

### Hors fenetre horaire

- la requete reste traçable
- un run `SKIPPED` est cree
- le endpoint retourne `success: true` avec `code: job_skipped`

### Job deja en cours

- le endpoint retourne `409`
- aucun nouveau run concurrent n'est lance

### Run reel deja reussi aujourd'hui

- le endpoint retourne `success: true` avec `code: job_skipped`
- un run `SKIPPED` est historise

## Reponses d'erreur possibles

- `401 missing_bearer_token`
- `403 invalid_bearer_token`
- `415 unsupported_content_type`
- `422 invalid_job_key`
- `409 job_already_running`
- `500 job_execution_failed`
- `503 scheduler_token_missing`
- `503 scheduler_token_too_short`

## Brancher un vrai cron externe

### Option simple avec cron Unix

Exemple toutes les 15 minutes pour le controle :

```cron
*/15 9-11 * * * curl -sS -X POST http://localhost:3000/api/jobs/scheduled \
  -H "Authorization: Bearer ${SCHEDULER_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"jobKey":"VALIDATE_READY_PUBLICATIONS","dryRun":false,"force":false}'
```

### Option avec un service de cron externe

- pointer vers `POST /api/jobs/scheduled`
- definir le header Bearer
- envoyer un JSON par job
- laisser les garde-fous applicatifs gerer :
  - la fenetre horaire
  - l'anti-doublon
  - le verrou anti-concurrence

## Recommandation MVP

Commencer par :

1. `PREPARE_DAILY_PUBLICATIONS` en `dryRun=true`
2. `VALIDATE_READY_PUBLICATIONS` en `dryRun=false`
3. `ATTEMPT_AUTOMATIC_PUBLICATIONS` en `dryRun=true`

Puis activer progressivement les executions reelles une fois les retours observes dans `/scheduler`.
