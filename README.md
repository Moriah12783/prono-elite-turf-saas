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
- `src/services` : lecture metier cote serveur via Prisma, workflow de publication et adaptateurs mock
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
- le payload envoye est structure pour preparer une future API Elite Turf :
  - `publicationJobId`
  - `provider`
  - `target`
  - `mode`
  - `publicationStatus`
  - `article` avec `title`, `body`, `excerpt`
  - `race` avec `id`, `raceName`, `venue`, `raceTime`

### Comportement du stub `api-custom`

- en mode non configure :
  - l'UI affiche `Mode prepare`
  - la publication repasse sur le fallback mock pour ne rien casser localement
- en mode configure :
  - le provider tente un POST HTTP avec `Authorization: Bearer <token>`
  - la reponse attend au minimum une reference de publication :
    - `url`
    - ou `reference`
    - ou `id`
  - si aucune reference n'est retournee, le job passe en `FAILED`

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

Si ta base locale a deja ete creee avec les anciennes relations en cascade, applique la migration suivante :

```bash
npm run db:migrate
```

Cette migration remplace les `ON DELETE CASCADE` critiques par `ON DELETE RESTRICT` sans changer le modele fonctionnel du MVP.

Une migration supplementaire ajoute aussi les champs d'archivage sur les entites sensibles :

```bash
npm run db:migrate
```

## Evolutions prevues

- branchement de vraies sources hippiques
- moteur IA pour generation et scoring des pronostics
- connecteur WordPress REST API reel
- connecteur API custom reel
- automatisation conditionnelle et scheduler
