$backendRoot = "D:\otm\Backend"
$backendVenv = Join-Path $backendRoot ".venv"
$activateScript = Join-Path $backendVenv "Scripts\Activate.ps1"
$pythonExe = Join-Path $backendVenv "Scripts\python.exe"
$managePy = Join-Path $backendRoot "manage.py"

if (-not (Test-Path $activateScript)) {
    Write-Error "Backend virtual environment not found: $activateScript"
    exit 1
}

if (-not (Test-Path $pythonExe)) {
    Write-Error "Backend Python executable not found: $pythonExe"
    exit 1
}

if (-not (Test-Path $managePy)) {
    Write-Error "manage.py not found: $managePy"
    exit 1
}

Set-Location $backendRoot

$env:VIRTUAL_ENV_DISABLE_PROMPT = "1"
. $activateScript

function global:prompt {
    "(.venv-backend) $(Get-Location)> "
}

Write-Host "Backend environment ready at $backendRoot" -ForegroundColor Green
Write-Host "Use: python manage.py runserver 0.0.0.0:7000" -ForegroundColor Yellow
