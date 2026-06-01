param(
  [string]$Version = "latest",
  [string]$InstallDir = "",
  [string]$ModelsDir = "",
  [string]$HostAddress = "127.0.0.1:11434",
  [string]$Model = "",
  [switch]$PullModel,
  [switch]$StartServer,
  [switch]$PersistUserEnv
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $InstallDir) {
  $InstallDir = Join-Path $repoRoot "tools\ollama"
}
if (-not $ModelsDir) {
  $ModelsDir = Join-Path $repoRoot ".ollama\models"
}
if (-not $Model) {
  $Model = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { "llama3.1:8b" }
}

$installPath = [System.IO.Path]::GetFullPath($InstallDir)
$modelsPath = [System.IO.Path]::GetFullPath($ModelsDir)
$repoPath = [System.IO.Path]::GetFullPath($repoRoot)

if (-not $installPath.StartsWith($repoPath, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "InstallDir must stay inside the repository: $repoPath"
}
if (-not $modelsPath.StartsWith($repoPath, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "ModelsDir must stay inside the repository: $repoPath"
}

New-Item -ItemType Directory -Force -Path $installPath | Out-Null
New-Item -ItemType Directory -Force -Path $modelsPath | Out-Null

if ($Version -eq "latest") {
  $downloadUrl = "https://github.com/ollama/ollama/releases/latest/download/ollama-windows-amd64.zip"
} else {
  $normalizedVersion = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
  $downloadUrl = "https://github.com/ollama/ollama/releases/download/$normalizedVersion/ollama-windows-amd64.zip"
}

$downloadDir = Join-Path $repoRoot ".ollama\downloads"
$logDir = Join-Path $repoRoot ".ollama\logs"
New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$zipPath = Join-Path $downloadDir "ollama-windows-amd64-$Version.zip"
Write-Host "Downloading Ollama standalone package..."
Write-Host $downloadUrl
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -MaximumRedirection 5

Write-Host "Extracting Ollama into $installPath"
Expand-Archive -LiteralPath $zipPath -DestinationPath $installPath -Force

$ollamaExe = Join-Path $installPath "ollama.exe"
if (-not (Test-Path $ollamaExe)) {
  throw "ollama.exe was not found after extraction: $ollamaExe"
}

$env:OLLAMA_MODELS = $modelsPath
$env:OLLAMA_HOST = $HostAddress

if ($PersistUserEnv) {
  [Environment]::SetEnvironmentVariable("OLLAMA_MODELS", $modelsPath, "User")
  [Environment]::SetEnvironmentVariable("OLLAMA_HOST", $HostAddress, "User")
}

Write-Host "Ollama installed:"
& $ollamaExe --version
Write-Host "OLLAMA_MODELS=$modelsPath"
Write-Host "OLLAMA_HOST=$HostAddress"

if ($StartServer -or $PullModel) {
  if (-not (Test-OllamaHealth -HostAddress $HostAddress)) {
    $stdout = Join-Path $logDir "ollama-server.out.log"
    $stderr = Join-Path $logDir "ollama-server.err.log"
    Write-Host "Starting Ollama server..."
    Start-Process -FilePath $ollamaExe `
      -ArgumentList @("serve") `
      -WorkingDirectory $installPath `
      -WindowStyle Hidden `
      -RedirectStandardOutput $stdout `
      -RedirectStandardError $stderr | Out-Null

    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
      Start-Sleep -Seconds 1
      if (Test-OllamaHealth -HostAddress $HostAddress) {
        $ready = $true
        break
      }
    }
    if (-not $ready) {
      throw "Ollama server did not become ready on http://$HostAddress"
    }
  }
}

if ($PullModel) {
  Write-Host "Pulling model $Model into project-local model store..."
  & $ollamaExe pull $Model
}

Write-Host "Done."

function Test-OllamaHealth {
  param([string]$HostAddress)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://$HostAddress/api/tags" -TimeoutSec 3
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}
