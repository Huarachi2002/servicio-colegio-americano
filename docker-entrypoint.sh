#!/bin/sh
set -e

echo "🚀 Iniciando aplicación DMS2 NestJS..."

# Ejecutar migraciones si está habilitado
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "📦 Ejecutando migraciones de base de datos..."
    node ./node_modules/typeorm/cli.js migration:run -d dist/config/typeorm.config.js
    echo "✅ Migraciones completadas"
fi

echo "🎯 Iniciando servidor..."
exec node dist/main.js
