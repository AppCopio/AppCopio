# Script PowerShell para iniciar AppCopio
# Usar: .\start-services.ps1

Write-Host "🚀 Iniciando AppCopio..." -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (!(Test-Path "appcopio-backend") -or !(Test-Path "appcopio-frontend")) {
    Write-Host "❌ Error: Ejecuta este script desde el directorio raíz de AppCopio" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Compilando backend..." -ForegroundColor Yellow
Set-Location appcopio-backend
npx tsc

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en la compilación del backend" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Iniciando backend en puerto 4000..." -ForegroundColor Blue
$backendJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    npm start 
}

Set-Location ../appcopio-frontend

Write-Host "🎨 Iniciando frontend en puerto 5173..." -ForegroundColor Magenta
$frontendJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD  
    npm run dev 
}

Write-Host ""
Write-Host "✅ Servicios iniciados:" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:4000" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 Para detener los servicios, presiona Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Mostrar logs en tiempo real
try {
    while ($true) {
        Start-Sleep -Seconds 2
        
        # Verificar si los jobs siguen corriendo
        if ($backendJob.State -eq "Failed" -or $frontendJob.State -eq "Failed") {
            Write-Host "❌ Error: Uno de los servicios falló" -ForegroundColor Red
            break
        }
    }
} finally {
    # Limpiar jobs al salir
    Write-Host "🧹 Deteniendo servicios..." -ForegroundColor Yellow
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
}
