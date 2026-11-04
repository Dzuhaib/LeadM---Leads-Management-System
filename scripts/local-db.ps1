param(
  [ValidateSet("init", "start", "stop", "status", "reset")]
  [string]$Action = "start"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DataRoot = Join-Path $ProjectRoot ".localdb"
$DataDir = Join-Path $DataRoot "data"
$LogFile = Join-Path $DataRoot "postgres.log"
$Port = 5433
$Database = "leadm"

function Find-PostgresBin {
  $command = Get-Command "pg_ctl.exe" -ErrorAction SilentlyContinue
  if ($command) {
    return Split-Path -Parent $command.Source
  }

  $installRoot = "C:\Program Files\PostgreSQL"
  if (Test-Path -LiteralPath $installRoot) {
    $candidates = Get-ChildItem -LiteralPath $installRoot -Directory |
      Sort-Object Name -Descending
    foreach ($candidate in $candidates) {
      $bin = Join-Path $candidate.FullName "bin"
      if (Test-Path -LiteralPath (Join-Path $bin "pg_ctl.exe")) {
        return $bin
      }
    }
  }

  throw "PostgreSQL binaries were not found. Install PostgreSQL or add pg_ctl.exe to PATH."
}

$PgBin = Find-PostgresBin
$PgCtl = Join-Path $PgBin "pg_ctl.exe"
$InitDb = Join-Path $PgBin "initdb.exe"
$Createdb = Join-Path $PgBin "createdb.exe"

function Test-ServerRunning {
  if (-not (Test-Path -LiteralPath $DataDir)) {
    return $false
  }
  & $PgCtl -D $DataDir status *> $null
  return $LASTEXITCODE -eq 0
}

function Initialize-Database {
  if (Test-Path -LiteralPath $DataDir) {
    throw "Local database already exists at $DataDir. Use reset to recreate it."
  }
  New-Item -ItemType Directory -Path $DataRoot -Force | Out-Null
  & $InitDb -D $DataDir -U postgres -A trust -E UTF8 --locale=C | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "initdb failed."
  }
  Start-Database
  & $Createdb -h localhost -p $Port -U postgres $Database
  if ($LASTEXITCODE -ne 0) {
    throw "createdb failed."
  }
  Write-Output "Local database ready on port $Port (database: $Database)."
}

function Start-Database {
  if (Test-ServerRunning) {
    Write-Output "Local database is already running on port $Port."
    return
  }
  if (-not (Test-Path -LiteralPath $DataDir)) {
    throw "No local database found. Run init first."
  }
  New-Item -ItemType Directory -Path $DataRoot -Force | Out-Null
  & $PgCtl -D $DataDir -o "-p $Port" -l $LogFile start
  if ($LASTEXITCODE -ne 0) {
    throw "Could not start the local database. See $LogFile."
  }
}

function Stop-Database {
  if (-not (Test-ServerRunning)) {
    Write-Output "Local database is not running."
    return
  }
  & $PgCtl -D $DataDir -m fast stop | Out-Null
  Write-Output "Local database stopped."
}

switch ($Action) {
  "init" { Initialize-Database }
  "start" { Start-Database }
  "stop" { Stop-Database }
  "status" {
    if (Test-ServerRunning) {
      Write-Output "Local database is running on port $Port."
    } else {
      Write-Output "Local database is not running."
    }
  }
  "reset" {
    if (Test-ServerRunning) {
      & $PgCtl -D $DataDir -m fast stop | Out-Null
    }
    if (Test-Path -LiteralPath $DataDir) {
      Remove-Item -LiteralPath $DataDir -Recurse -Force
    }
    Initialize-Database
  }
}
