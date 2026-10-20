param (
    [string]$Url = "postgresql://postgres:postgres@localhost:5432/rakshalogix",
    [switch]$Reset
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Reset) {
    Write-Host ">>> 00_reset.sql" -ForegroundColor Yellow
    psql "$Url" -v ON_ERROR_STOP=1 -f (Join-Path $scriptDir "00_reset.sql")
}

$files = @(
    "01_schema.sql",
    "03_seed_static.sql",
    "02_seed_generated.sql",
    "04_views_functions.sql",
    "05_verify.sql"
)

foreach ($f in $files) {
    Write-Host ">>> $f" -ForegroundColor Cyan
    psql "$Url" -v ON_ERROR_STOP=1 -f (Join-Path $scriptDir $f)
}
