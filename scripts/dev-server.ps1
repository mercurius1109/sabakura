param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("start", "stop", "status")]
  [string]$Action
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot ".vite-dev.pid"
$logFile = Join-Path $projectRoot "dev-server.log"
$errorLogFile = Join-Path $projectRoot "dev-server.err.log"
$hostAddress = "127.0.0.1"
$port = 5173

function Get-Runner {
  $runnerCandidates = @(
    @{
      Name = "pnpm"
      Command = "pnpm.cmd"
      FallbackPaths = @(
        (Join-Path $env:APPDATA "npm\pnpm.cmd"),
        (Join-Path $env:LOCALAPPDATA "pnpm\pnpm.cmd")
      )
      Arguments = @("dev")
    },
    @{
      Name = "npm"
      Command = "npm.cmd"
      FallbackPaths = @(
        (Join-Path $env:ProgramFiles "nodejs\npm.cmd"),
        (Join-Path ${env:ProgramFiles(x86)} "nodejs\npm.cmd")
      )
      Arguments = @("run", "dev")
    }
  )

  foreach ($candidate in $runnerCandidates) {
    $resolved = Get-Command $candidate.Command -ErrorAction SilentlyContinue
    if ($resolved) {
      return @{
        FilePath = $resolved.Source
        Arguments = $candidate.Arguments
        Name = $candidate.Name
      }
    }

    foreach ($path in $candidate.FallbackPaths) {
      if ($path -and (Test-Path $path)) {
        return @{
          FilePath = $path
          Arguments = $candidate.Arguments
          Name = $candidate.Name
        }
      }
    }
  }

  throw "Could not find pnpm.cmd or npm.cmd on PATH or in common Node install locations."
}

function Get-TrackedProcess {
  if (-not (Test-Path $pidFile)) {
    return $null
  }

  $rawPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if (-not $rawPid) {
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    return $null
  }

  $process = Get-Process -Id $rawPid -ErrorAction SilentlyContinue
  if (-not $process) {
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    return $null
  }

  return $process
}

function Show-Status {
  $process = Get-TrackedProcess
  if (-not $process) {
    Write-Output "Vite dev server is not running."
    return
  }

  Write-Output ("Vite dev server is running. PID: {0}" -f $process.Id)
  Write-Output ("URL: http://{0}:{1}/" -f $hostAddress, $port)

  if (Test-Path $logFile) {
    Write-Output ("Log: {0}" -f $logFile)
  }

  if (Test-Path $errorLogFile) {
    Write-Output ("Error Log: {0}" -f $errorLogFile)
  }
}

switch ($Action) {
  "start" {
    $existing = Get-TrackedProcess
    if ($existing) {
      Write-Output ("Vite dev server is already running. PID: {0}" -f $existing.Id)
      Write-Output ("URL: http://{0}:{1}/" -f $hostAddress, $port)
      exit 0
    }

    $runner = Get-Runner
    if (Test-Path $logFile) {
      Remove-Item $logFile -ErrorAction SilentlyContinue
    }
    if (Test-Path $errorLogFile) {
      Remove-Item $errorLogFile -ErrorAction SilentlyContinue
    }

    $process = Start-Process `
      -FilePath $runner.FilePath `
      -ArgumentList $runner.Arguments `
      -WorkingDirectory $projectRoot `
      -WindowStyle Hidden `
      -RedirectStandardOutput $logFile `
      -RedirectStandardError $errorLogFile `
      -PassThru

    Set-Content -Path $pidFile -Value $process.Id

    Start-Sleep -Seconds 2
    $tracked = Get-TrackedProcess
    if (-not $tracked) {
      throw "The dev server exited immediately. Check dev-server.log for details."
    }

    Write-Output ("Started Vite dev server with {0}. PID: {1}" -f $runner.Name, $tracked.Id)
    Write-Output ("URL: http://{0}:{1}/" -f $hostAddress, $port)
    Write-Output ("Log: {0}" -f $logFile)
    Write-Output ("Error Log: {0}" -f $errorLogFile)
  }
  "stop" {
    $process = Get-TrackedProcess
    if (-not $process) {
      Write-Output "Vite dev server is not running."
      exit 0
    }

    Stop-Process -Id $process.Id
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Write-Output ("Stopped Vite dev server. PID: {0}" -f $process.Id)
  }
  "status" {
    Show-Status
  }
}
