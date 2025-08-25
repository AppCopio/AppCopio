#!/bin/bash
# Script para iniciar ambos servicios de AppCopio

echo "🚀 Iniciando AppCopio..."

# Verificar que estamos en el directorio correcto
if [ ! -d "appcopio-backend" ] || [ ! -d "appcopio-frontend" ]; then
    echo "❌ Error: Ejecuta este script desde el directorio raíz de AppCopio"
    exit 1
fi

echo "📦 Compilando backend..."
cd appcopio-backend
npx tsc

echo "🔧 Iniciando backend en puerto 4000..."
npm start &
BACKEND_PID=$!

cd ../appcopio-frontend

echo "🎨 Iniciando frontend en puerto 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Servicios iniciados:"
echo "   Backend:  http://localhost:4000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "🛑 Para detener los servicios:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📝 Logs en tiempo real:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"

# Esperar a que terminen los procesos
wait
