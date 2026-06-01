param(
  [string]$InstallDir = "",
  [string]$ModelsDir = "",
  [string]$HostAddress = "127.0.0.1:11434"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $InstallDir) {
  $InstallDir = Join-Path $repoRoot "tools\ollama"
}
if (-not $ModelsDir) {
  $ModelsDir = Join-Path $repoRoot ".ollama\models"
}

$installPath = [System.IO.Path]::GetFullPath($InstallDir)
$modelsPath = [System.IO.Path]::GetFullPath($ModelsDir)
$ollamaExe = Join-Path $installPath "ollama.exe"

if (-not (Test-Path $ollamaExe)) {
  throw "Ollama is not installed in the project. Run: npm run ollama:install:release"
}

New-Item -ItemType Directory -Force -Path $modelsPath | Out-Null

$env:OLLAMA_MODELS = $modelsPath
$env:OLLAMA_HOST = $HostAddress

Write-Host "Starting project-local Ollama"
Write-Host "OLLAMA_MODELS=$modelsPath"
Write-Host "OLLAMA_HOST=$HostAddress"
& $ollamaExe serve
