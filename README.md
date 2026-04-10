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
- `src/services` : lecture metier cote serveur via Prisma
- `src/lib` : auth, audit, validation, helpers et client Prisma
- `prisma` : schema PostgreSQL, roles, seed et donnees de demonstration

## Fonctionnalites MVP presentes

- authentification admin minimale avec session signee
- protection des pages admin
- roles de base `ADMIN`, `EDITOR`, `SUPER_ADMIN`
- CRUD Courses
- CRUD Partants
- CRUD Pronostics
- CRUD Resultats
- audit logs de base
- workflow de publication prepare via `publication_jobs`

## Evolutions prevues

- branchement de vraies sources hippiques
- moteur IA pour generation et scoring des pronostics
- publication automatisee WordPress ou API custom
