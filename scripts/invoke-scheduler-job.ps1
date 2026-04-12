param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("PREPARE_DAILY_PUBLICATIONS", "VALIDATE_READY_PUBLICATIONS", "ATTEMPT_AUTOMATIC_PUBLICATIONS")]
  [string]$JobKey,

  [switch]$DryRun,

  [switch]$Force,

  [string]$BaseUrl = "http://localhost:3000",

  [string]$TokenEnvVar = "PRONO_SCHEDULER_API_TOKEN"
)

$token = [System.Environment]::GetEnvironmentVariable($TokenEnvVar, "Process")

if ([string]::IsNullOrWhiteSpace($token)) {
  $token = [System.Environment]::GetEnvironmentVariable($TokenEnvVar, "User")
}

if ([string]::IsNullOrWhiteSpace($token)) {
  $token = [System.Environment]::GetEnvironmentVariable($TokenEnvVar, "Machine")
}

if ([string]::IsNullOrWhiteSpace($token)) {
  throw "La variable d'environnement $TokenEnvVar est introuvable."
}

$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}

$body = @{
  jobKey = $JobKey
  dryRun = $DryRun.IsPresent
  force = $Force.IsPresent
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/jobs/scheduled" -Headers $headers -Body $body
