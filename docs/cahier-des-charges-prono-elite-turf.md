# CAHIER DES CHARGES TECHNIQUE — PRONO ELITE TURF SaaS

## 1. Présentation du projet

### 1.1 Nom du projet
**PRONO ELITE TURF SaaS**

### 1.2 Nature du projet
Développement d’une plateforme SaaS d’administration et d’automatisation dédiée à la production quotidienne de pronostics hippiques pour le site **Elite Turf**.

### 1.3 Vision
Le projet vise à créer un système logiciel capable de :

- gérer les courses du jour,
- structurer les données de course,
- gérer les partants, jockeys/drivers, cotes, non-partants et arrivées,
- produire des pronostics selon la logique métier Elite Turf,
- générer des contenus éditoriaux prêts à publier,
- alimenter un back-office,
- préparer une future publication semi-automatique puis automatique sur le site Elite Turf.

### 1.4 Finalité produit
Le produit doit d’abord servir d’outil opérationnel interne pour Elite Turf, puis être conçu de manière suffisamment modulaire pour évoluer vers un véritable SaaS commercialisable.

## 2. Objectifs du projet

### 2.1 Objectifs fonctionnels
La plateforme doit permettre :

- la gestion centralisée des courses hippiques quotidiennes,
- la collecte ou saisie structurée des données de course,
- la génération de pronostics organisés par logique métier,
- la gestion d’un workflow éditorial,
- la préparation de publications pour un site cible,
- le suivi des résultats réels des courses,
- l’analyse des performances historiques des pronostics.

### 2.2 Objectifs techniques
Le système doit être :

- modulaire,
- maintenable,
- sécurisé,
- évolutif,
- documenté,
- prêt à intégrer ultérieurement un moteur IA et plusieurs connecteurs de données.

### 2.3 Objectifs business
Le projet doit permettre à terme :

- un gain de productivité,
- une réduction du travail manuel quotidien,
- une amélioration de la cohérence éditoriale,
- une préparation à la commercialisation sous forme de SaaS.

## 3. Périmètre fonctionnel

### 3.1 Fonctions incluses dans le MVP
Le MVP devra inclure les fonctionnalités suivantes :

#### A. Administration
- authentification administrateur,
- tableau de bord,
- navigation par modules,
- gestion des statuts métiers.

#### B. Gestion des courses
- création, modification, suppression et consultation de courses,
- affichage des informations principales :
  - nom de la course,
  - hippodrome,
  - date/heure,
  - discipline,
  - distance,
  - nombre de partants,
  - statut de traitement.

#### C. Gestion des partants
- rattachement des partants à une course,
- gestion des champs :
  - numéro,
  - nom du cheval,
  - jockey/driver,
  - entraîneur,
  - cote,
  - statut non-partant,
  - données brutes associées si nécessaire.

#### D. Gestion des pronostics
- création et stockage d’un pronostic pour une course,
- structure minimale :
  - sélection principale,
  - base,
  - outsider,
  - profil spéculatif,
  - indice de confiance,
  - analyse brève,
  - note de prudence.

#### E. Gestion des résultats
- enregistrement des arrivées officielles,
- lien avec la course concernée,
- comparaison avec les pronostics générés.

#### F. Gestion de la publication
- système de brouillon,
- système de validation,
- statut de publication,
- stockage du contenu à publier,
- préparation d’une future intégration API vers le site cible.

#### G. Journalisation
- historique des actions importantes,
- logs de création, modification, validation et publication.

### 3.2 Fonctions prévues hors MVP mais architecture à prévoir
Le système devra être conçu pour permettre ultérieurement :

- la connexion à des sources externes de données,
- l’import automatique des courses et résultats,
- l’intégration à l’API OpenAI,
- la publication automatique sur WordPress ou autre CMS,
- les workflows conditionnels,
- les notifications automatiques,
- le multi-utilisateur avancé,
- le multi-client,
- la facturation SaaS,
- les statistiques avancées.

## 4. Utilisateurs cibles

### 4.1 Administrateur principal
- contrôle global du système,
- gestion des courses,
- validation des pronostics,
- gestion des publications,
- supervision du pipeline.

### 4.2 Éditeur / opérateur
- saisie ou vérification de données,
- gestion des fiches courses,
- validation partielle,
- préparation des publications.

### 4.3 Super admin futur
- gestion multi-clients,
- supervision SaaS,
- facturation,
- gestion des environnements.

## 5. Architecture technique souhaitée

### 5.1 Stack recommandée

#### Frontend
- **Next.js**
- **TypeScript**

#### Backend
- **Node.js / TypeScript**

#### Base de données
- **PostgreSQL**

#### ORM
- **Prisma**

#### UI
- interface moderne, responsive, professionnelle
- composants réutilisables
- architecture claire par modules

#### Authentification
- système d’auth sécurisé
- gestion minimale des rôles

#### API
- architecture prête pour :
  - API interne,
  - API de publication,
  - API de connecteurs externes,
  - intégration future OpenAI.

### 5.2 Principes d’architecture
Le code doit respecter les principes suivants :

- séparation claire entre présentation, logique métier et accès données,
- composants réutilisables,
- services métier isolés,
- statuts métiers explicites,
- code lisible et maintenable,
- évolutivité pensée dès le départ,
- absence de complexité inutile dans le MVP.

## 6. Modules applicatifs

### 6.1 Dashboard
Le dashboard doit afficher :

- nombre de courses du jour,
- nombre de courses en attente,
- nombre de pronostics générés,
- nombre de publications prêtes,
- nombre de publications effectuées,
- alertes ou anomalies.

### 6.2 Module Courses
Le module Courses doit permettre :

- liste des courses,
- filtre par date,
- filtre par statut,
- création et édition d’une course,
- consultation détaillée d’une course.

### 6.3 Module Partants
Le module Partants doit permettre :

- ajout de partants à une course,
- édition des données d’un partant,
- marquage non-partant,
- affichage synthétique et détaillé.

### 6.4 Module Pronostics
Le module Pronostics doit permettre :

- création d’un pronostic lié à une course,
- édition et validation du pronostic,
- consultation de l’analyse,
- affichage du niveau de confiance.

### 6.5 Module Résultats
Le module Résultats doit permettre :

- saisie ou import des arrivées,
- affichage des écarts entre pronostic et résultat,
- historisation.

### 6.6 Module Publications
Le module Publications doit permettre :

- création d’un brouillon,
- validation,
- préparation d’envoi vers API externe,
- suivi du statut :
  - draft,
  - ready,
  - published,
  - failed.

### 6.7 Module Logs
Le module Logs doit permettre :

- consultation des opérations,
- historique des validations,
- erreurs de publication,
- actions administrateur.

## 7. Workflow métier attendu

### 7.1 Cycle de vie d’une course
Une course doit passer par les états suivants :

- collectée
- en attente de validation
- validée
- pronostic généré
- brouillon prêt
- approuvée
- publiée
- archivée
- résultat intégré

### 7.2 Conditions minimales avant génération du pronostic
Le système devra vérifier la présence minimale des données suivantes :

- nom de la course,
- heure/date,
- hippodrome,
- liste des partants,
- cotes ou données de forme si disponibles,
- statut des non-partants.

### 7.3 Conditions minimales avant publication
Le système ne doit pas permettre une publication validée si :

- aucun pronostic n’est généré,
- les données de base sont incomplètes,
- la course n’est pas marquée validée,
- le contenu éditorial n’est pas disponible,
- une anomalie bloquante est détectée.

## 8. Génération des pronostics

### 8.1 Objectif
Le système devra permettre la génération structurée d’un pronostic par course.

### 8.2 Sortie attendue
Pour chaque course, le système devra pouvoir stocker :

- sélection principale,
- base,
- outsider,
- profil spéculatif,
- indice de confiance,
- analyse brève,
- note de prudence.

### 8.3 Architecture prévue
Dans un premier temps :
- moteur mock ou règles métier simples

Dans un second temps :
- intégration avec moteur de scoring
- puis intégration avec OpenAI API pour la génération éditoriale et l’assistance au raisonnement

## 9. Publication externe

### 9.1 Objectif
Le système doit être conçu pour se connecter ultérieurement au site Elite Turf afin de :

- créer des brouillons,
- compléter les contenus d’un article,
- mettre à jour des fiches courses,
- publier des contenus validés.

### 9.2 Contraintes
La logique de publication devra être découplée du cœur métier.

Une couche dédiée devra être prévue pour :

- WordPress REST API,
- API custom,
- ou autre mécanisme futur de publication.

### 9.3 Niveaux de publication
Le système devra permettre les niveaux suivants :

- mode manuel,
- mode brouillon automatique,
- mode publication validée,
- mode automatique futur sous conditions.

## 10. Modèle de données minimal attendu

Le schéma devra comporter au minimum les entités suivantes :

### users
- id
- name
- email
- password hash / auth reference
- role
- created_at
- updated_at

### races
- id
- external_source_id
- race_name
- venue
- race_date
- race_time
- race_datetime
- discipline
- distance
- runners_count
- status
- quality_score
- publication_status
- created_at
- updated_at

### runners
- id
- race_id
- number
- horse_name
- jockey_name
- trainer_name
- odds
- is_non_runner
- raw_data_json
- created_at
- updated_at

### predictions
- id
- race_id
- main_pick
- base_pick
- outsider_pick
- speculative_pick
- confidence_label
- analysis_text
- caution_text
- approval_status
- generated_at
- approved_by
- created_at
- updated_at

### results
- id
- race_id
- official_arrival
- official_status
- imported_at
- created_at
- updated_at

### publication_jobs
- id
- race_id
- target
- mode
- payload_json
- status
- published_at
- error_message
- created_at
- updated_at

### audit_logs
- id
- actor_id
- action_type
- entity_type
- entity_id
- metadata_json
- created_at

## 11. Exigences UI / UX

L’interface doit être :

- propre,
- moderne,
- professionnelle,
- responsive,
- lisible,
- orientée productivité.

### Attendus UX
- sidebar claire,
- vues liste + détail,
- filtres,
- badges de statuts,
- actions rapides,
- formulaires propres,
- tables lisibles,
- indicateurs visuels de progression.

### Attendus design
- esthétique sobre,
- composant réutilisables,
- hiérarchie visuelle forte,
- aucune surcharge inutile.

## 12. Exigences qualité

Le code livré devra être :

- propre,
- commenté intelligemment quand nécessaire,
- structuré,
- typé,
- cohérent,
- facile à reprendre.

Le projet devra inclure :

- une structure de dossiers claire,
- un README,
- des instructions de lancement local,
- des données mock ou seed,
- une logique d’erreur minimale,
- des validations côté formulaire et backend.

## 13. Exigences de sécurité

Le système devra intégrer au minimum :

- authentification sécurisée,
- pages admin protégées,
- validation des entrées,
- séparation des rôles minimale,
- protection contre accès non autorisés,
- journalisation des actions critiques.

Aucune clé sensible ne devra être hardcodée.

Les secrets devront être stockés via variables d’environnement.

## 14. Performance et évolutivité

Le projet devra être pensé pour évoluer sans refonte brutale.

L’architecture devra permettre :

- ajout de connecteurs de données,
- ajout d’un moteur IA,
- ajout de tâches planifiées,
- ajout du multi-tenant,
- ajout d’une API publique/privée,
- ajout d’analytics plus poussées.

## 15. Contraintes de réalisation

Le MVP ne doit pas chercher à tout faire.

Le développeur / agent de code doit :

- privilégier la clarté,
- éviter l’usine à gaz,
- construire un socle stable,
- préparer le futur sans surcharger le présent.

Il faut viser :
- robustesse,
- cohérence,
- maintenabilité,
- vitesse d’itération.

## 16. Livrables attendus

### Livrables MVP
- structure du projet,
- configuration stack,
- schéma Prisma,
- seed de démonstration,
- dashboard admin,
- modules principaux,
- workflow initial,
- README d’installation,
- documentation minimale du code.

### Livrables futurs
- module IA branché,
- module import automatisé,
- module publication API,
- analytics,
- rôle avancés,
- SaaS multi-client.

## 17. Feuille de route technique recommandée

### Étape 1
Initialisation projet  
Stack, architecture, auth, DB, dashboard

### Étape 2
CRUD métiers  
Courses, partants, pronostics, résultats

### Étape 3
Workflow  
Statuts, validations, publication state machine

### Étape 4
Services métier  
Scoring mock, génération mock, publication mock

### Étape 5
Intégrations  
OpenAI API, source connectors, WordPress/API cible

### Étape 6
Automatisation  
scheduler, jobs, notifications, QA checks

### Étape 7
Industrialisation  
multi-users, roles avancés, analytics, SaaSization

## 18. Directive d’implémentation pour Codex

Le projet doit être développé comme un produit professionnel.

Codex doit :

- créer une base saine,
- ne pas ajouter de complexité inutile,
- découper le projet en modules,
- garder une architecture extensible,
- produire du code réutilisable,
- inclure des exemples mock,
- documenter comment lancer et tester le projet.

Il doit éviter :

- les dépendances exotiques inutiles,
- les patterns trop sophistiqués pour le MVP,
- les hacks fragiles,
- les fichiers monolithiques gigantesques,
- la confusion entre logique métier et interface.
