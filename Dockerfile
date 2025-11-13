# Usar Node.js 20 LTS
FROM node:20-alpine AS base

# Instalar pnpm
RUN npm install -g pnpm@8.15.0

# ============================================
# STAGE 1: Build Frontend
# ============================================
FROM base AS frontend-builder

WORKDIR /app/frontend

# Copiar archivos de dependencias
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY frontend/ ./

# Build del frontend
RUN pnpm build

# ============================================
# STAGE 2: Build Backend + Runtime
# ============================================
FROM base AS production

WORKDIR /app

# Copiar backend
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY backend/ ./

# Copiar frontend built desde el stage anterior
COPY --from=frontend-builder /app/frontend/dist ./public

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicio
CMD ["node", "index.js"]

