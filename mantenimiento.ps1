param(
  [Parameter(Position=0)]
  [ValidateSet("on", "off", "status", "activar", "desactivar")]
  [string]$Action = "status"
)

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = Get-Location }

$indexFile = Join-Path $rootDir "index.html"
$maintFile = Join-Path $rootDir "mantenimiento.html"
$backupFile = Join-Path $rootDir ".index.html.original"

$pubIndexFile = Join-Path $rootDir "public\index.html"
$pubMaintFile = Join-Path $rootDir "public\mantenimiento.html"
$pubBackupFile = Join-Path $rootDir "public\.index.html.original"

$flagFile = Join-Path $rootDir ".maintenance_active"

switch ($Action) {
  { $_ -in @("on", "activar") } {
    if (Test-Path $flagFile) {
      Write-Host "🟡 El modo mantenimiento YA está activo." -ForegroundColor Yellow
      return
    }

    if (-not (Test-Path $maintFile)) {
      Write-Error "No se encontró el archivo $maintFile"
      return
    }

    # Crear backup del index original
    Copy-Item -Path $indexFile -Destination $backupFile -Force
    if (Test-Path $pubIndexFile) {
      Copy-Item -Path $pubIndexFile -Destination $pubBackupFile -Force
    }

    # Sobrescribir index con página de mantenimiento
    Copy-Item -Path $maintFile -Destination $indexFile -Force
    if (Test-Path $pubMaintFile) {
      Copy-Item -Path $pubMaintFile -Destination $pubIndexFile -Force
    }

    Set-Content -Path $flagFile -Value "ACTIVE: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Encoding utf8
    Write-Host "🟢 MODO MANTENIMIENTO ACTIVADO EXITOSAMENTE." -ForegroundColor Green
    Write-Host "El sitio principal (index.html) ahora muestra la pantalla oficial de Mantenimiento con logo animado." -ForegroundColor Cyan
    Write-Host "Para desactivar, ejecuta: .\mantenimiento.ps1 off" -ForegroundColor Gray
  }

  { $_ -in @("off", "desactivar") } {
    if (-not (Test-Path $backupFile)) {
      Write-Host "🟡 No hay respaldo previo (.index.html.original). Verificando estado..." -ForegroundColor Yellow
      if (Test-Path $flagFile) { Remove-Item $flagFile -Force }
      return
    }

    # Restaurar index original
    Copy-Item -Path $backupFile -Destination $indexFile -Force
    Remove-Item -Path $backupFile -Force

    if (Test-Path $pubBackupFile) {
      Copy-Item -Path $pubBackupFile -Destination $pubIndexFile -Force
      Remove-Item -Path $pubBackupFile -Force
    }

    if (Test-Path $flagFile) {
      Remove-Item -Path $flagFile -Force
    }

    Write-Host "🔴 MODO MANTENIMIENTO DESACTIVADO." -ForegroundColor Green
    Write-Host "El sitio web principal (index.html) y cotizador han sido restaurados a su estado original operativo." -ForegroundColor Cyan
  }

  "status" {
    if (Test-Path $flagFile) {
      $since = Get-Content -Path $flagFile -TotalCount 1
      Write-Host "🟢 ESTADO: En Mantenimiento ($since)" -ForegroundColor Yellow
    } else {
      Write-Host "⚪ ESTADO: Normal / Operativo (Sitio público activo)" -ForegroundColor Green
    }
    Write-Host "Uso:" -ForegroundColor Gray
    Write-Host "  .\mantenimiento.ps1 on   -> Activar pantalla En Mantención" -ForegroundColor Gray
    Write-Host "  .\mantenimiento.ps1 off  -> Desactivar y restaurar sitio completo" -ForegroundColor Gray
  }
}