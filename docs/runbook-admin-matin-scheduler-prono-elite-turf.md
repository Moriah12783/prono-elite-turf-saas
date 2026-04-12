# Runbook admin du matin

Phase actuelle :

- `PREPARE_DAILY_PUBLICATIONS` en `dryRun=true`
- `VALIDATE_READY_PUBLICATIONS` en `dryRun=false`
- `ATTEMPT_AUTOMATIC_PUBLICATIONS` en `dryRun=true`

Temps de lecture : 3 a 5 minutes.

## Ordre de verification

1. Ouvrir `/scheduler`
2. Regarder le bandeau global
3. Regarder `Vue synthese`
4. Regarder `Alertes recentes`
5. Regarder `Derniers runs`
6. Si besoin, verifier les publications `READY` ou `BLOCKED`

## 1. Bandeau global

Verifier :

- niveau global : `OK`, `Alerte` ou `Bloque`
- fraicheur
- jobs attendus executes / restants

Interpretation rapide :

- `OK` : on continue
- `Alerte` : un point demande verification, mais le pipeline reste exploitable
- `Bloque` : traiter avant d'aller plus loin

## 2. Vue synthese

Verifier pour chaque job :

- dernier statut
- dernier succes / dernier echec
- echecs recents
- skips hors fenetre

Point d'attention pendant cette phase :

- `VALIDATE_READY_PUBLICATIONS` doit bien tourner en reel
- `PREPARE_DAILY_PUBLICATIONS` et `ATTEMPT_AUTOMATIC_PUBLICATIONS` doivent rester en simulation

## 3. Alertes recentes

Verifier s'il y a :

- un `FAILED`
- un `SKIPPED` hors fenetre
- une alerte repetee sur le meme job

## 4. Derniers runs

Verifier :

- que les runs du jour existent
- que leur ordre est coherent
- que les resumes paraissent plausibles

## 5. Publications si utile

Verifier rapidement :

- si des publications sont `READY`
- si des publications sont `BLOCKED`
- si un blocage semble legitime ou anormal

## Que faire selon le cas

### Si tout est OK

- ne rien changer
- laisser la journee tourner
- refaire un controle plus tard si besoin

### Si un job est en alerte

- lire l'alerte
- verifier le job dans `Vue synthese`
- verifier le detail dans `Derniers runs`
- si l'alerte est ponctuelle et comprise, surveiller sans changer la configuration

### Si un job critique est bloque

Jobs critiques dans cette phase :

- `VALIDATE_READY_PUBLICATIONS`

Action :

1. ouvrir `Alertes recentes`
2. ouvrir `Derniers runs`
3. identifier le dernier run en echec
4. ne pas augmenter l'automatisation
5. repasser en mode plus prudent si le probleme se repete

### Si un job a ete ignore hors fenetre

Action :

1. verifier l'heure du run
2. verifier la fenetre UTC du job
3. corriger si besoin le cron ou la tache planifiee
4. si le skip est exceptionnel et compris, surveiller simplement

## Mini checklist quotidienne

- bandeau global lu
- fraicheur verifiee
- validation du jour observee
- alertes recentes lues
- derniers runs relus
- publications `READY` / `BLOCKED` verifiees si necessaire
- aucune decision d'automatisation prise en presence d'un doute

## Regle simple

Tant que la phase semi-automatique n'est pas stabilisee :

- ne pas passer `PREPARE_DAILY_PUBLICATIONS` en reel trop vite
- ne pas passer `ATTEMPT_AUTOMATIC_PUBLICATIONS` en reel tant que le scheduler n'est pas propre plusieurs jours de suite
