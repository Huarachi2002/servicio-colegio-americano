# ==================== SCRIPT DE DESPLIEGUE ====================
# Ejecutar en PowerShell como Administrador
# .\deploy.ps1

param(
    [switch]$Build,
    [switch]$Restart,
    [switch]$Logs,
    [switch]$Stop,
    [switch]$Status
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DMS2 NestJS - Script de Despliegue   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Verificar Docker
try {
    docker --version | Out-Null
    Write-Host "[OK] Docker instalado" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker no esta instalado" -ForegroundColor Red
    exit 1
}

# Verificar archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "[WARN] Archivo .env no encontrado" -ForegroundColor Yellow
    if (Test-Path ".env.production") {
        Copy-Item ".env.production" ".env"
        Write-Host "[OK] Copiado .env.production a .env" -ForegroundColor Green
        Write-Host "[!] IMPORTANTE: Edita el archivo .env con tus credenciales" -ForegroundColor Yellow
    } else {
        Write-Host "[ERROR] No se encontro .env.production" -ForegroundColor Red
        exit 1
    }
}

# Opciones del script
if ($Status) {
    Write-Host "`n[*] Estado de los contenedores:" -ForegroundColor Cyan
    docker-compose ps
    exit 0
}

if ($Logs) {
    Write-Host "`n[*] Mostrando logs (Ctrl+C para salir):" -ForegroundColor Cyan
    docker-compose logs -f --tail=100
    exit 0
}

if ($Stop) {
    Write-Host "`n[*] Deteniendo contenedores..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "[OK] Contenedores detenidos" -ForegroundColor Green
    exit 0
}

if ($Restart) {
    Write-Host "`n[*] Reiniciando contenedores..." -ForegroundColor Yellow
    docker-compose restart
    Write-Host "[OK] Contenedores reiniciados" -ForegroundColor Green
    exit 0
}

# Build y despliegue (default o con -Build)
Write-Host "`n[1/4] Construyendo imagenes..." -ForegroundColor Cyan
docker-compose build --no-cache

Write-Host "`n[2/4] Deteniendo contenedores anteriores..." -ForegroundColor Cyan
docker-compose down

Write-Host "`n[3/4] Iniciando contenedores..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "`n[4/4] Verificando estado..." -ForegroundColor Cyan
Start-Sleep -Seconds 10
docker-compose ps

# Verificar health
$health = docker inspect --format='{{.State.Health.Status}}' dms2_app 2>$null
if ($health -eq "healthy") {
    Write-Host "`n[OK] Servicio desplegado correctamente!" -ForegroundColor Green
} else {
    Write-Host "`n[WARN] Servicio iniciando... Verificar con: .\deploy.ps1 -Logs" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Comandos utiles:                      " -ForegroundColor Cyan
Write-Host "  .\deploy.ps1 -Status  # Ver estado    " -ForegroundColor White
Write-Host "  .\deploy.ps1 -Logs    # Ver logs      " -ForegroundColor White
Write-Host "  .\deploy.ps1 -Restart # Reiniciar     " -ForegroundColor White
Write-Host "  .\deploy.ps1 -Stop    # Detener       " -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
