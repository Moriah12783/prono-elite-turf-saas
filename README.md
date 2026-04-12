# PRONO ELITE TURF

MVP d'un back-office SaaS pour piloter la production quotidienne de pronostics hippiques.

## Stack

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS

## Lancement local

1. Installer les dependances :

```bash
npm install
```

2. Creer le fichier d'environnement :

```bash
copy .env.example .env
```

Variables principales :

- `DATABASE_URL` : connexion PostgreSQL
- `AUTH_SECRET` : secret de signature de session
- `ADMIN_NAME` : nom du compte admin seed
- `ADMIN_EMAIL` : email du compte admin seed
- `ADMIN_PASSWORD` : mot de passe du compte admin seed
- `WORDPRESS_BASE_URL` : URL racine de l'instance WordPress cible
- `WORDPRESS_USERNAME` : compte WordPress autorise a publier via REST
- `WORDPRESS_APP_PASSWORD` : mot de passe applicatif WordPress
- `WORDPRESS_POSTS_ENDPOINT` : endpoint REST des articles, par defaut `/wp-json/wp/v2/posts`
- `WORDPRESS_DEFAULT_STATUS` : statut WordPress du post cree (`draft`, `publish`, `pending`, `private`)
- `API_CUSTOM_BASE_URL` : URL racine de l'API custom cible
- `API_CUSTOM_TOKEN` : token Bearer de l'API custom
- `API_CUSTOM_ENDPOINT` : endpoint de publication custom, par defaut `/publications`
- `API_CUSTOM_DEFAULT_STATUS` : statut transmis au payload custom (`draft`, `publish`, `pending`, `private`)
- `SCHEDULER_API_TOKEN` : token Bearer utilise par l'endpoint local des jobs planifies, recommande avec au moins 16 caracteres

3. Generer Prisma puis executer la migration :

```bash
npm run db:generate
npm run db:migrate
```

4. Charger les donnees d'amorcage :

```bash
npm run db:seed
```

5. Lancer le serveur :

```bash
npm run dev
```

6. Ouvrir [http://localhost:3000](http://localhost:3000)

7. Se connecter avec le compte admin seed :

- email : `admin@elite-turf.local`
- mot de passe : `ChangeMe123!`

## Structure

- `src/app` : routes App Router, login, pages admin et server actions
- `src/components` : layout et composants UI reutilisables
- `src/domain` : options et types metier alignes sur le cahier des charges
- `src/services` : lecture metier cote serveur via Prisma, workflow de publication, planification et adaptateurs
- `src/lib` : auth, audit, validation, helpers, synchronisation des statuts et client Prisma
- `prisma` : schema PostgreSQL, roles, seed et donnees de demonstration

## Fonctionnalites MVP presentes

- authentification admin minimale avec session signee
- protection des pages admin
- roles de base `ADMIN`, `EDITOR`, `SUPER_ADMIN`
- CRUD Courses
- CRUD Partants
- CRUD Pronostics
- CRUD Resultats
- CRUD Publication Jobs
- audit logs de base
- workflow de publication minimal avec statuts `DRAFT`, `READY`, `BLOCKED`, `PUBLISHED`, `FAILED`
- controle metier bloquant avant publication
- service de publication mock prepare pour WordPress REST API et API custom
- vue debug publication avec historique des tentatives
- socle de jobs planifies quotidiens avec execution manuelle et endpoint API securise

## Workflow de publication MVP

- creation/modification d'un `publication_job` en brouillon
- controle metier centralise pour verifier la course, le pronostic, le contenu editorial et les anomalies bloquantes
- passage automatique en `READY` ou `BLOCKED`
- tentative de publication mock via une couche de service decouplee
- retour en `PUBLISHED` ou `FAILED`

## Publication WordPress REST API

- la couche de publication conserve un provider abstrait, un service de publication et un workflow de pre-validation
- si la cible ressemble a WordPress et que la configuration WordPress est complete, le provider `wordpress-rest` est utilise
- si la configuration WordPress est absente ou incomplete, le systeme repasse automatiquement en mode mock sans publier reellement
- le fallback mock conserve donc le workflow local actuel et evite toute diffusion accidentelle

### Mode mock

- actif par defaut si les variables WordPress ne sont pas renseignees
- une publication reussie retourne une reference du type `mock-<publicationJobId>`
- utile pour tester le workflow complet localement sans dependre d'une instance externe

### Mode WordPress reel

- active uniquement si `WORDPRESS_BASE_URL`, `WORDPRESS_USERNAME` et `WORDPRESS_APP_PASSWORD` sont renseignes
- le provider appelle l'endpoint REST WordPress des posts avec authentification Basic basee sur le mot de passe applicatif
- le payload envoye est un article standard avec :
  - `title`
  - `content`
  - `excerpt`
  - `status`
- le contenu inclut un rappel de la course puis le corps editorial formate en HTML simple

### Tester localement sans casser le fonctionnement actuel

1. laisser les variables WordPress vides pour rester en mode mock
2. creer ou editer un `publication_job`
3. lancer `Controler`
4. lancer `Publier`
5. verifier qu'une reference `mock-*` est enregistree dans le payload

### Brancher une vraie instance WordPress

1. creer un utilisateur ou utiliser un compte editeur/admin WordPress
2. generer un mot de passe applicatif WordPress pour ce compte
3. renseigner dans `.env` :
   - `WORDPRESS_BASE_URL`
   - `WORDPRESS_USERNAME`
   - `WORDPRESS_APP_PASSWORD`
   - optionnellement `WORDPRESS_POSTS_ENDPOINT`
   - optionnellement `WORDPRESS_DEFAULT_STATUS`
4. redemarrer `npm run dev`
5. relancer une publication depuis l'admin

### Comportement et erreurs

- si WordPress retourne une erreur HTTP, le job passe en `FAILED` avec le message REST recupere quand il existe
- si la reponse est invalide ou sans identifiant de post, le job passe aussi en `FAILED`
- en cas d'erreur reseau, un message explicite `Erreur reseau WordPress` est renvoye
- si `WORDPRESS_DEFAULT_STATUS=draft`, le job local passe tout de meme en `PUBLISHED` des qu'un post WordPress est cree avec succes
  - dans le MVP actuel, `PUBLISHED` signifie "transmis avec succes au systeme cible"

## Publication API custom

- `api-custom` est maintenant un vrai provider stub structure au meme niveau architectural que `wordpress-rest`
- si `API_CUSTOM_BASE_URL` et `API_CUSTOM_TOKEN` sont renseignes, le provider peut envoyer une requete POST reelle vers l'endpoint custom configure
- si la configuration est absente ou incomplete, le systeme conserve un comportement sur et repasse en mode mock
- le payload envoye est structure pour preparer une future API Elite Turf

### Brancher plus tard une vraie API Elite Turf

1. definir le contrat exact de l'endpoint cible
2. ajuster si besoin la structure du payload dans `api-custom-provider.ts`
3. renseigner dans `.env` :
   - `API_CUSTOM_BASE_URL`
   - `API_CUSTOM_TOKEN`
   - `API_CUSTOM_ENDPOINT`
   - optionnellement `API_CUSTOM_DEFAULT_STATUS`
4. redemarrer `npm run dev`
5. tester une publication avec la cible `API custom`

Le contrat cible propose pour Elite Turf est documente ici :

- [docs/contrat-api-publication-elite-turf.md](C:\Users\HP\Documents\New%20project\docs\contrat-api-publication-elite-turf.md)

### Simuler localement l'API Elite Turf

Le projet expose un endpoint local de test compatible avec le contrat Elite Turf :

- `POST /api/test/elite-turf/publications`

Pour tester le provider `api-custom` en local :

1. configurer `.env` ainsi :
   - `API_CUSTOM_BASE_URL=http://localhost:3000`
   - `API_CUSTOM_TOKEN=test-token`
   - `API_CUSTOM_ENDPOINT=/api/test/elite-turf/publications?mode=success`
2. redemarrer `npm run dev`
3. creer ou editer un `publication_job` avec la cible `API custom`
4. lancer `Controler`
5. lancer `Publier`

### Modes de test disponibles

- `mode=success`
  - reponse 201 avec publication acceptee
- `mode=business_error`
  - reponse 409 avec erreur metier simulee
- `mode=validation_error`
  - reponse 422 avec erreur de validation simulee
- `mode=technical_error`
  - reponse 500 avec erreur technique simulee

### Exemple de configuration locale

```env
API_CUSTOM_BASE_URL="http://localhost:3000"
API_CUSTOM_TOKEN="test-token"
API_CUSTOM_ENDPOINT="/api/test/elite-turf/publications?mode=success"
API_CUSTOM_DEFAULT_STATUS="draft"
```

## Vue debug publication

- chaque ligne de `Publications` propose une action `Debug`
- la fiche de debug affiche :
  - le provider cible
  - le mode effectif
  - le statut du job
  - le payload envoye
  - la reponse recue
  - la reference externe
  - le message d'erreur
  - les horodatages utiles
- cette vue fonctionne pour `mock`, `wordpress-rest` et `api-custom`
- aucun secret de configuration n'y est affiche
- chaque relance de publication ajoute maintenant une entree dans l'historique des tentatives

## Jobs planifies quotidiens

Une premiere couche de planification est disponible pour preparer l'automatisation quotidienne sans automatiser tout le metier d'un coup.

### Jobs disponibles

- `PREPARE_DAILY_PUBLICATIONS`
  - repere les courses du jour eligibles
  - peut creer les brouillons de publication manquants en `AUTO_DRAFT`
- `VALIDATE_READY_PUBLICATIONS`
  - rejoue le controle metier sur les publications du jour
  - met a jour `READY` ou `BLOCKED`
- `ATTEMPT_AUTOMATIC_PUBLICATIONS`
  - tente uniquement les publications `READY`
  - ignore les jobs `MANUAL`
  - respecte les garde-fous des providers

### Garde-fous

- verrou anti-concurrence : un job deja `RUNNING` bloque un nouveau run du meme type pendant une fenetre de securite
- garde-fou quotidien : un run reel deja `SUCCEEDED` le meme jour bloque une nouvelle execution non forcee
- `dryRun` disponible pour tout job afin de tester sans effet de bord
- les runs sont historises en base dans `scheduled_job_runs`

### Fenetres horaires et alertes MVP

- chaque job possede une fenetre simple d'execution en UTC
- les executions reelles hors fenetre sont ignorees avec un run `SKIPPED`
- les simulations restent autorisees pour tester le pipeline localement
- les runs `FAILED` et les `SKIPPED` hors fenetre remontent dans le panneau `Alertes recentes` de `/scheduler`

Fenetres actuellement configurees :

- `PREPARE_DAILY_PUBLICATIONS` : `05:00-09:00 UTC`
- `VALIDATE_READY_PUBLICATIONS` : `09:00-12:00 UTC`
- `ATTEMPT_AUTOMATIC_PUBLICATIONS` : `12:00-18:00 UTC`

### Plan quotidien recommande

Le plan quotidien d''orchestration recommande est documente ici :

- [docs/plan-quotidien-scheduler-prono-elite-turf.md](C:\Users\HP\Documents\New%20project\docs\plan-quotidien-scheduler-prono-elite-turf.md)

Ce document couvre :

- l''ordre logique entre les jobs
- les frequences cron recommandees
- les heures UTC conseillees
- la strategie de mise en route progressive
- les dependances et verifications avant un vrai cron externe
### Contrat API cron / scheduler

Le contrat d'appel complet est documente ici :

- [docs/contrat-api-scheduler-cron.md](C:\Users\HP\Documents\New%20project\docs\contrat-api-scheduler-cron.md)
- [docs/windows-task-scheduler-prono-elite-turf.md](C:\Users\HP\Documents\New%20project\docs\windows-task-scheduler-prono-elite-turf.md)

L'endpoint expose maintenant :

- `GET /api/jobs/scheduled`
  - retourne le contrat d'appel, les jobs disponibles, la fenetre UTC et les garde-fous
- `POST /api/jobs/scheduled`
  - declenche un job precis
  - respecte les fenetres horaires, l'anti-doublon et le verrou anti-concurrence meme via API

### Tester depuis l'admin

1. ouvrir `/scheduler`
2. lancer un job en `Simulation`
3. verifier le resume dans `Derniers runs`
4. lancer ensuite `Executer` pour les jobs sans risque souhaites

### Tester via l'endpoint API local

Endpoint :

- `POST /api/jobs/scheduled`

Headers :

- `Authorization: Bearer <SCHEDULER_API_TOKEN>`
- `Content-Type: application/json`

Exemple de lecture du contrat :

```bash
curl http://localhost:3000/api/jobs/scheduled
```

Exemple de simulation :

```bash
curl -X POST http://localhost:3000/api/jobs/scheduled \
  -H "Authorization: Bearer local-scheduler-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jobKey": "VALIDATE_READY_PUBLICATIONS",
    "dryRun": true,
    "force": false
  }'
```

Exemple d'execution reelle :

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

### Premier branchement cron externe prudent

Pour un premier passage du test manuel vers un declenchement quotidien externe, la recommandation MVP est :

1. `PREPARE_DAILY_PUBLICATIONS` en `dryRun=true`
2. `VALIDATE_READY_PUBLICATIONS` en `dryRun=false`
3. `ATTEMPT_AUTOMATIC_PUBLICATIONS` en `dryRun=true`

Exemples de cron simples :

```cron
# Preparation prudente
5 5 * * * curl -sS -X POST https://ton-domaine/api/jobs/scheduled -H "Authorization: Bearer ${SCHEDULER_API_TOKEN}" -H "Content-Type: application/json" -d '{"jobKey":"PREPARE_DAILY_PUBLICATIONS","dryRun":true,"force":false}'

# Controle metier reel
*/15 9-11 * * * curl -sS -X POST https://ton-domaine/api/jobs/scheduled -H "Authorization: Bearer ${SCHEDULER_API_TOKEN}" -H "Content-Type: application/json" -d '{"jobKey":"VALIDATE_READY_PUBLICATIONS","dryRun":false,"force":false}'

# Publication automatique en observation
*/30 12-17 * * * curl -sS -X POST https://ton-domaine/api/jobs/scheduled -H "Authorization: Bearer ${SCHEDULER_API_TOKEN}" -H "Content-Type: application/json" -d '{"jobKey":"ATTEMPT_AUTOMATIC_PUBLICATIONS","dryRun":true,"force":false}'
```

Ces appels externes respectent toujours :

- les fenetres horaires
- l'anti-doublon quotidien
- le verrou anti-concurrence
- les alertes visibles dans `/scheduler`

Pour une mise en route progressive :

1. commencer avec la configuration prudente ci-dessus
2. verifier pendant plusieurs jours les runs et alertes dans `/scheduler`
3. passer `PREPARE_DAILY_PUBLICATIONS` en reel seulement apres validation des brouillons auto
4. passer `ATTEMPT_AUTOMATIC_PUBLICATIONS` en reel seulement une fois la supervision stable
5. conserver `force=false` par defaut dans les appels cron externes

Sous Windows, un script reutilisable est disponible pour simplifier le Planificateur de taches :

- [invoke-scheduler-job.ps1](C:\Users\HP\Documents\New%20project\scripts\invoke-scheduler-job.ps1)

## Strategie de relations et suppressions

- les relations critiques vers `races` sont protegees en base par `ON DELETE RESTRICT`
- une course ne peut donc pas etre supprimee si des `runners`, `predictions`, `results` ou `publication_jobs` existent encore
- les garde-fous applicatifs restent en place pour fournir des messages metier explicites avant meme que la base ne refuse l'operation
- `Prediction.approvedBy` et `AuditLog.actor` restent en `SET NULL` pour conserver l'historique si un utilisateur disparait

## Strategie d'archivage MVP

- les entites sensibles `races`, `predictions`, `results` et `publication_jobs` disposent d'un archivage reversible via `archived_at` et `archived_by`
- les listes admin affichent par defaut uniquement les elements actifs
- une vue archivee dediee permet de consulter puis restaurer les elements archives
- l'archivage d'une course archive aussi les fiches sensibles liees pour garder des listes coherentes
- les `runners` restent en suppression physique car ils sont des donnees de detail rattachees a une course et deja proteges par les garde-fous metier

## Migration Prisma supplementaire

Si ta base locale a deja ete creee avec les anciennes relations en cascade, applique les migrations disponibles :

```bash
npm run db:migrate
```

Les migrations actuelles couvrent notamment :

- le durcissement des relations critiques en `RESTRICT`
- l'ajout des champs d'archivage sur les entites sensibles
- la creation de `scheduled_job_runs` pour la planification quotidienne

## Evolutions prevues

- branchement de vraies sources hippiques
- moteur IA pour generation et scoring des pronostics
- connecteur WordPress REST API reel
- connecteur API custom reel
- automatisation conditionnelle et scheduler complet

