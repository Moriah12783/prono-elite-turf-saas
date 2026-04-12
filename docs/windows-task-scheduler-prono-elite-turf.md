# Windows Task Scheduler pour PRONO ELITE TURF

Ce document propose un premier branchement reel, prudent et directement testable du scheduler via le Planificateur de taches Windows.

Objectif :

- declencher `POST /api/jobs/scheduled` depuis Windows
- garder les garde-fous applicatifs deja en place
- commencer avec une automatisation progressive et sure

## Configuration MVP recommande

Pour une premiere mise en route locale :

1. `PREPARE_DAILY_PUBLICATIONS` en `dryRun=true`
2. `VALIDATE_READY_PUBLICATIONS` en `dryRun=false`
3. `ATTEMPT_AUTOMATIC_PUBLICATIONS` en `dryRun=true`

## Preparer le token proprement sous Windows

Le plus simple pour un usage local est de stocker le token scheduler dans une variable d'environnement utilisateur.

### PowerShell

```powershell
[System.Environment]::SetEnvironmentVariable(
  "PRONO_SCHEDULER_API_TOKEN",
  "remplace-ici-par-un-token-long-et-prive",
  "User"
)
```

Puis fermer et rouvrir PowerShell pour recharger la variable.

Verification :

```powershell
$env:PRONO_SCHEDULER_API_TOKEN
```

Remarque :

- cette variable sert uniquement au client local Windows Task Scheduler
- elle peut etre differente de la variable serveur `SCHEDULER_API_TOKEN`, mais en pratique elles doivent contenir la meme valeur pour que l'authentification fonctionne

## Tester d'abord manuellement

Avant de creer des taches planifiees, tester les appels a la main dans PowerShell.

### 1. PREPARE_DAILY_PUBLICATIONS en dryRun

```powershell
$headers = @{
  Authorization = "Bearer $env:PRONO_SCHEDULER_API_TOKEN"
  "Content-Type" = "application/json"
}

$body = @{
  jobKey = "PREPARE_DAILY_PUBLICATIONS"
  dryRun = $true
  force = $false
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/jobs/scheduled" -Headers $headers -Body $body
```

### 2. VALIDATE_READY_PUBLICATIONS en reel

```powershell
$headers = @{
  Authorization = "Bearer $env:PRONO_SCHEDULER_API_TOKEN"
  "Content-Type" = "application/json"
}

$body = @{
  jobKey = "VALIDATE_READY_PUBLICATIONS"
  dryRun = $false
  force = $false
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/jobs/scheduled" -Headers $headers -Body $body
```

### 3. ATTEMPT_AUTOMATIC_PUBLICATIONS en dryRun

```powershell
$headers = @{
  Authorization = "Bearer $env:PRONO_SCHEDULER_API_TOKEN"
  "Content-Type" = "application/json"
}

$body = @{
  jobKey = "ATTEMPT_AUTOMATIC_PUBLICATIONS"
  dryRun = $true
  force = $false
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/jobs/scheduled" -Headers $headers -Body $body
```

## Script PowerShell simple reutilisable

Un script reutilisable est deja disponible dans le projet :

- `scripts\invoke-scheduler-job.ps1`

Il :

- lit le token depuis `PRONO_SCHEDULER_API_TOKEN`
- appelle `POST /api/jobs/scheduled`
- accepte les switches `-DryRun` et `-Force`

Exemples :

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\HP\Documents\New project\scripts\invoke-scheduler-job.ps1" -JobKey PREPARE_DAILY_PUBLICATIONS -DryRun
```

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\HP\Documents\New project\scripts\invoke-scheduler-job.ps1" -JobKey VALIDATE_READY_PUBLICATIONS
```

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\HP\Documents\New project\scripts\invoke-scheduler-job.ps1" -JobKey ATTEMPT_AUTOMATIC_PUBLICATIONS -DryRun
```

## Exemples de taches planifiees Windows

Les commandes ci-dessous utilisent `schtasks`.

Important :

- elles declenchent PowerShell
- elles appellent directement l'endpoint local
- elles n'annulent jamais les garde-fous applicatifs

### PREPARE_DAILY_PUBLICATIONS en dryRun=true

```powershell
schtasks /Create /TN "PRONO ELITE TURF\\Prepare Daily Publications" /SC DAILY /ST 05:05 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""$headers=@{Authorization='Bearer '+$env:PRONO_SCHEDULER_API_TOKEN;'Content-Type'='application/json'}; $body=@{jobKey='PREPARE_DAILY_PUBLICATIONS';dryRun=$true;force=$false}|ConvertTo-Json; Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/jobs/scheduled' -Headers $headers -Body $body""" /F
```

### VALIDATE_READY_PUBLICATIONS en dryRun=false

```powershell
schtasks /Create /TN "PRONO ELITE TURF\\Validate Ready Publications" /SC MINUTE /MO 15 /ST 09:00 /ET 11:59 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""$headers=@{Authorization='Bearer '+$env:PRONO_SCHEDULER_API_TOKEN;'Content-Type'='application/json'}; $body=@{jobKey='VALIDATE_READY_PUBLICATIONS';dryRun=$false;force=$false}|ConvertTo-Json; Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/jobs/scheduled' -Headers $headers -Body $body""" /F
```

### ATTEMPT_AUTOMATIC_PUBLICATIONS en dryRun=true

```powershell
schtasks /Create /TN "PRONO ELITE TURF\\Attempt Automatic Publications" /SC MINUTE /MO 30 /ST 12:00 /ET 17:59 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""$headers=@{Authorization='Bearer '+$env:PRONO_SCHEDULER_API_TOKEN;'Content-Type'='application/json'}; $body=@{jobKey='ATTEMPT_AUTOMATIC_PUBLICATIONS';dryRun=$true;force=$false}|ConvertTo-Json; Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/jobs/scheduled' -Headers $headers -Body $body""" /F
```

## Variante recommandee avec script `.ps1`

Pour Windows Task Scheduler, cette variante est la plus stable et la plus facile a maintenir.

Exemples :

### Prepare

```powershell
schtasks /Create /TN "PRONO ELITE TURF\\Prepare Daily Publications" /SC DAILY /ST 05:05 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\HP\Documents\New project\scripts\invoke-scheduler-job.ps1\" -JobKey PREPARE_DAILY_PUBLICATIONS -DryRun" /F
```

### Validate

```powershell
schtasks /Create /TN "PRONO ELITE TURF\\Validate Ready Publications" /SC MINUTE /MO 15 /ST 09:00 /ET 11:59 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\HP\Documents\New project\scripts\invoke-scheduler-job.ps1\" -JobKey VALIDATE_READY_PUBLICATIONS" /F
```

### Attempt

```powershell
schtasks /Create /TN "PRONO ELITE TURF\\Attempt Automatic Publications" /SC MINUTE /MO 30 /ST 12:00 /ET 17:59 /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"C:\Users\HP\Documents\New project\scripts\invoke-scheduler-job.ps1\" -JobKey ATTEMPT_AUTOMATIC_PUBLICATIONS -DryRun" /F
```

## Verification dans le back-office

Apres execution manuelle ou planifiee :

1. ouvrir `http://localhost:3000/scheduler`
2. verifier que le run apparait dans `Derniers runs`
3. verifier le statut du run :
   - `SUCCEEDED`
   - `SKIPPED`
   - `FAILED`
4. verifier `Alertes recentes` si besoin
5. verifier la vue synthese pour voir si l'etat du job a change

## Lecture des garde-fous sous Windows

Les taches Windows ne contournent pas :

- les fenetres horaires UTC
- l'anti-doublon quotidien des runs reels reussis
- le verrou anti-concurrence
- la remontee d'alertes dans `/scheduler`

Si une tache part hors fenetre :

- le run sera historise en `SKIPPED`
- l'admin le verra dans `/scheduler`

## Strategie de passage progressif

### Etape 1 : tests manuels PowerShell

- tester les 3 jobs avec `Invoke-RestMethod`
- verifier `/scheduler`

### Etape 2 : planification prudente

- `PREPARE_DAILY_PUBLICATIONS` en `dryRun=true`
- `VALIDATE_READY_PUBLICATIONS` en `dryRun=false`
- `ATTEMPT_AUTOMATIC_PUBLICATIONS` en `dryRun=true`

### Etape 3 : automatisation renforcee

Quand plusieurs jours sont stables :

- passer `PREPARE_DAILY_PUBLICATIONS` en `dryRun=false`
- garder `ATTEMPT_AUTOMATIC_PUBLICATIONS` en `dryRun=true` encore un temps

### Etape 4 : automatisation controlee complete

Seulement apres verification fonctionnelle des providers :

- passer `ATTEMPT_AUTOMATIC_PUBLICATIONS` en `dryRun=false`

## Recommandation pratique

Pour un usage local Windows, commencer par :

1. definir `PRONO_SCHEDULER_API_TOKEN`
2. tester les appels PowerShell a la main
3. creer ensuite les taches planifiees
4. verifier chaque jour `/scheduler` pendant la phase de rodage
