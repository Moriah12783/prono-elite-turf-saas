# Plan Quotidien Scheduler PRONO ELITE TURF

Ce document propose un plan quotidien simple, progressif et realiste pour orchestrer les jobs scheduler existants de PRONO ELITE TURF.

Objectif : preparer un vrai branchement cron externe sans contourner les garde-fous deja en place.

## Vue d'ensemble

Les jobs existants doivent s'enchainer dans cet ordre logique :

1. `PREPARE_DAILY_PUBLICATIONS`
2. `VALIDATE_READY_PUBLICATIONS`
3. `ATTEMPT_AUTOMATIC_PUBLICATIONS`

Pourquoi cet ordre :

- `PREPARE_DAILY_PUBLICATIONS` prepare la matiere de travail du jour
- `VALIDATE_READY_PUBLICATIONS` controle ensuite les jobs crees ou deja presents
- `ATTEMPT_AUTOMATIC_PUBLICATIONS` n'intervient qu'une fois les publications verifiees et marquees `READY`

## Dependances logiques

### 1. Preparation avant controle

`VALIDATE_READY_PUBLICATIONS` depend indirectement de `PREPARE_DAILY_PUBLICATIONS` quand le systeme doit creer les brouillons de publication manquants.

Sans preparation :

- certaines courses du jour n'auront aucun `publication_job`
- le controle ne pourra rien valider pour ces courses

### 2. Controle avant tentative automatique

`ATTEMPT_AUTOMATIC_PUBLICATIONS` depend de `VALIDATE_READY_PUBLICATIONS`.

Sans controle recent :

- des jobs peuvent rester en `DRAFT` ou `BLOCKED`
- des publications eligibles peuvent ne jamais passer en `READY`
- la tentative automatique manque de fiabilite

### 3. Publication uniquement sur jobs compatibles

`ATTEMPT_AUTOMATIC_PUBLICATIONS` ne doit agir que sur :

- les jobs `READY`
- les jobs dont le `mode` est compatible avec l'automatisation

Les jobs `MANUAL` restent volontairement hors publication automatique.

## Fenetres UTC actuellement configurees

- `PREPARE_DAILY_PUBLICATIONS` : `05:00-09:00 UTC`
- `VALIDATE_READY_PUBLICATIONS` : `09:00-12:00 UTC`
- `ATTEMPT_AUTOMATIC_PUBLICATIONS` : `12:00-18:00 UTC`

Ces fenetres doivent rester la base de tout cron externe.

## Recommandation quotidienne MVP

### Job 1 : PREPARE_DAILY_PUBLICATIONS

Role :

- repere les courses du jour eligibles
- cree les brouillons manquants si l'execution est reelle

Recommandation initiale :

- demarrage : `dryRun=true`
- execution conseillee : une fois en debut de fenetre, puis une seconde fois si besoin metier

Horaires recommandes :

- `05:05 UTC`
- optionnel : `07:05 UTC`

Cron simple recommande :

```cron
5 5 * * *
5 7 * * *
```

Pourquoi :

- laisse quelques minutes apres l'ouverture de fenetre
- evite les declenchements trop frequents pour un job de preparation
- reste compatible avec l'anti-doublon et la prudence MVP

### Job 2 : VALIDATE_READY_PUBLICATIONS

Role :

- rejoue les controles metier sur les jobs du jour
- met a jour `READY` ou `BLOCKED`

Recommandation initiale :

- demarrage : `dryRun=false`
- execution conseillee : reguliere pendant la fenetre de validation

Horaires recommandes :

- toutes les 15 minutes entre `09:00 UTC` et `11:45 UTC`

Cron simple recommande :

```cron
*/15 9-11 * * *
```

Pourquoi :

- couvre les evolutions du matin
- remet a jour l'etat metier sans effet externe dangereux
- reste raisonnable grace au verrou anti-concurrence

### Job 3 : ATTEMPT_AUTOMATIC_PUBLICATIONS

Role :

- tente l'envoi automatique des jobs `READY`
- respecte les providers et leurs garde-fous

Recommandation initiale :

- demarrage : `dryRun=true`
- passage progressif en `dryRun=false` apres observation

Horaires recommandes :

- toutes les 30 minutes entre `12:00 UTC` et `17:30 UTC`

Cron simple recommande :

```cron
*/30 12-17 * * *
```

Pourquoi :

- cadence suffisante pour un MVP
- limite le risque de bombardement de providers externes
- laisse le temps aux controles precedents de stabiliser les jobs

## Strategie progressive de mise en route

### Phase 1 : test

Objectif : observer sans impact irreversible.

Configuration conseillee :

- `PREPARE_DAILY_PUBLICATIONS` : `dryRun=true`
- `VALIDATE_READY_PUBLICATIONS` : `dryRun=true` ou `false` selon confiance
- `ATTEMPT_AUTOMATIC_PUBLICATIONS` : `dryRun=true`

A surveiller :

- coherence des resumes de run
- alertes admin dans `/scheduler`
- jobs `SKIPPED` hors fenetre
- absence de doublons ou de concurrence anormale

### Phase 2 : semi-automatique

Objectif : automatiser la preparation et le controle, garder la diffusion automatique en observation.

Configuration conseillee :

- `PREPARE_DAILY_PUBLICATIONS` : `dryRun=false`
- `VALIDATE_READY_PUBLICATIONS` : `dryRun=false`
- `ATTEMPT_AUTOMATIC_PUBLICATIONS` : `dryRun=true`

A surveiller :

- creation correcte des brouillons
- transitions `DRAFT` -> `READY` / `BLOCKED`
- stabilite du volume de jobs quotidiens

### Phase 3 : automatique controlee

Objectif : activer l'envoi automatique avec surveillance rapprochee.

Configuration conseillee :

- `PREPARE_DAILY_PUBLICATIONS` : `dryRun=false`
- `VALIDATE_READY_PUBLICATIONS` : `dryRun=false`
- `ATTEMPT_AUTOMATIC_PUBLICATIONS` : `dryRun=false`

Conditions conseillees avant activation :

- plusieurs jours sans anomalie critique sur `/scheduler`
- comprehension claire des alertes et des cas `SKIPPED`
- verification que les providers reels sont correctement configures

## Exemple de plan quotidien recommande

### Variante tres prudente

- `05:05 UTC` : `PREPARE_DAILY_PUBLICATIONS` en `dryRun=true`
- `09:15 UTC` puis `09:45 UTC` puis `10:15 UTC` puis `10:45 UTC` : `VALIDATE_READY_PUBLICATIONS` en `dryRun=false`
- `12:30 UTC` puis `13:30 UTC` puis `14:30 UTC` : `ATTEMPT_AUTOMATIC_PUBLICATIONS` en `dryRun=true`

### Variante MVP exploitable apres validation

- `05:05 UTC` : `PREPARE_DAILY_PUBLICATIONS` en `dryRun=false`
- `*/15 9-11 * * *` : `VALIDATE_READY_PUBLICATIONS` en `dryRun=false`
- `*/30 12-17 * * *` : `ATTEMPT_AUTOMATIC_PUBLICATIONS` en `dryRun=false`

## Coherence avec les garde-fous existants

Ce plan reste coherent avec :

- les fenetres UTC : les cron proposes restent dans les horaires autorises
- l'anti-doublon : un run reel deja `SUCCEEDED` le meme jour sera ignore si necessaire
- le verrou anti-concurrence : les frequences recommandees restent raisonnables face a la fenetre de verrou actuelle
- les alertes admin : les runs `FAILED` et `SKIPPED` hors fenetre remontent dans `/scheduler`

## Ce qu'il faut verifier avant un vrai cron externe

1. que les heures UTC conviennent a l'operation reelle Elite Turf
2. que `SCHEDULER_API_TOKEN` est suffisamment robuste
3. que les jobs apparaissent correctement dans `/scheduler`
4. que les alertes sont bien visibles et comprises par l'equipe admin
5. que `ATTEMPT_AUTOMATIC_PUBLICATIONS` ne cible pas de jobs `MANUAL`
6. que les providers reels eventuels sont configures avant passage en execution reelle

## Point de depart recommande

Pour un premier branchement externe simple :

1. activer `PREPARE_DAILY_PUBLICATIONS` en `dryRun=true`
2. activer `VALIDATE_READY_PUBLICATIONS` en `dryRun=false`
3. laisser `ATTEMPT_AUTOMATIC_PUBLICATIONS` en `dryRun=true` pendant quelques jours
4. passer ensuite progressivement la publication automatique en reel
