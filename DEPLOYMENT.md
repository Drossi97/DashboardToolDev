# 🚀 Guía de Despliegue - Dashboard Tool

Esta guía explica cómo desplegar el proyecto con Docker en Dokploy.

---

## 🐳 Despliegue Unificado con Docker

El proyecto se despliega como **un solo contenedor** que incluye frontend y backend.

### **Ventajas:**
- ✅ Sin problemas de CORS (mismo origen)
- ✅ Una sola URL para todo
- ✅ Configuración simplificada
- ✅ Fácil de mantener

---

## 📋 Requisitos Previos

- Cuenta en Dokploy (o cualquier plataforma que soporte Docker)
- Repositorio en GitHub: `https://github.com/Drossi97/DashboardToolDev.git`
- Node.js 20+ instalado localmente (para desarrollo)

---

## 🚀 Pasos para Desplegar en Dokploy

### **Paso 1: Crear Aplicación**

1. Entra a Dokploy
2. Ve a **Projects** → Tu proyecto
3. Click en **"Create Service"** → **"Application"**
4. Dale un nombre (ej: `dashboard-unified`)

---

### **Paso 2: Configurar Source**

```
Provider: GitHub
Repository: DashboardToolDev
Branch: main
Root Directory: .
```

---

### **Paso 3: Configurar Build**

```
Build Type: Dockerfile
Dockerfile Path: Dockerfile
Docker Context Path: .
Docker Build Stage: (dejar vacío o poner "production")
```

---

### **Paso 4: Configurar Port**

```
Port: 3000
```

⚠️ **MUY IMPORTANTE:** Asegúrate que el puerto sea `3000`, no `4321`

---

### **Paso 5: Variables de Entorno**

Solo necesitas estas 2:

```env
BASE_URL=https://proasapba.guapetononcloud.deep-insight.es
SESSION_MAX_AGE_MINUTES=30
```

**NO necesitas:**
- ❌ `FRONTEND_URL` (sin CORS en modo unificado)
- ❌ `PUBLIC_SERVER_URL` (rutas relativas)
- ❌ `PORT` (se define en la configuración)

---

### **Paso 6: Deploy**

1. Click en **"Deploy"**
2. Espera 5-7 minutos (build multi-stage)
3. Monitorea en la pestaña **"Logs"**

---

## ✅ Verificación

### **Logs exitosos deberían mostrar:**

```
📦 Modo unificado: CORS desactivado (mismo origen)
📂 Sirviendo frontend desde: /app/public
============================================================
🚀 SERVIDOR EXPRESS PROXY INICIADO
============================================================
📡 Puerto:    3000
🌐 URL:       http://0.0.0.0:3000
🔗 Target:    https://proasapba.guapetononcloud.deep-insight.es
⏱️  Sesión:    30 minutos
============================================================
✅ Esperando peticiones...
```

### **URL de la aplicación:**

Dokploy te dará una URL como:
```
https://dashboard-unified-xxxxx.traefik.me
```

**Todo funciona en esa URL:**
- `/` → Frontend (login, mapa, dashboard)
- `/api/login` → Backend API
- `/api/ships` → Backend API
- `/api/download` → Backend API

---

## 🐛 Solución de Problemas

### **Bad Gateway (502)**
- ✅ Verifica que el puerto sea `3000`
- ✅ Revisa los logs para errores de inicio

### **Error de Build**
- ✅ Verifica que `pnpm-lock.yaml` esté en el repo
- ✅ Verifica que Node.js sea 20+

### **Login falla**
- ✅ Verifica que `BASE_URL` sea correcta
- ✅ Revisa logs del backend para errores de conexión

---

## 🔄 Desarrollo Local

Para desarrollo local, puedes seguir usando:

**Backend:**
```bash
cd backend
pnpm install
pnpm dev
```

**Frontend:**
```bash
cd frontend
pnpm install
pnpm dev
```

**Variables locales:**
- Backend: Crear `.env` desde `.env.example`
- Frontend: No necesita variables (usa localhost por defecto)

---

## 📚 Más Información

- **Frontend README:** Documentación técnica del frontend
- **Backend README:** Documentación técnica del backend
- **DOKPLOY.md:** Instrucciones específicas de Dokploy
- **Dockerfile:** Configuración de build multi-stage

