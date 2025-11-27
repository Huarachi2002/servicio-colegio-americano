# Imagen base Node.js 20 LTS Alpine (ligera)
FROM node:20-alpine AS builder

# Instalar dependencias necesarias para bcrypt y mssql
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# ==================== PRODUCCIÓN ====================
FROM node:20-alpine AS production

# Instalar dependencias necesarias para bcrypt nativo
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar archivos compilados desde builder
COPY --from=builder /app/dist ./dist

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=8080

# Puerto expuesto
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Comando de inicio
CMD ["node", "dist/main.js"]
