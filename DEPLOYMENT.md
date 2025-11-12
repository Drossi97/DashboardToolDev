# 🚀 Guía de Despliegue - Dashboard Tool

Esta guía explica cómo desplegar el proyecto en producción usando servicios gratuitos.

---

## 💰 Costos y Recomendaciones

### **Opción Recomendada (100% GRATUITA)**
- **Frontend**: Vercel (Plan Hobby - GRATIS)
- **Backend**: Railway (GRATIS hasta $5/mes de uso, generalmente no se alcanza en hobby)

### **Alternativas gratuitas para Backend:**
- Render.com (GRATIS con sleep en inactividad)
- Fly.io (GRATIS básico)
- Servidor propio/VPS

---

## 📋 PARTE 1: Desplegar Frontend en Vercel

### **Paso 1: Preparar el repositorio**

Ya está en GitHub: `https://github.com/Drossi97/DashboardToolDev.git` ✅

### **Paso 2: Crear cuenta en Vercel**

1. Ir a https://vercel.com
2. Sign up con tu cuenta de GitHub
3. Autorizar acceso a tus repositorios

### **Paso 3: Importar proyecto**

1. Click en "Add New Project"
2. Seleccionar el repositorio `DashboardToolDev`
3. Vercel detectará automáticamente que es un proyecto con frontend

### **Paso 4: Configurar build**

**Framework Preset:** Astro (o Other si no lo detecta)

**Build Settings:**
```
Root Directory: frontend
Build Command: pnpm build
Output Directory: dist
Install Command: pnpm install
```

**IMPORTANTE - Variables de entorno:**
En el dashboard de Vercel, agregar:
```
# No necesitas variables para el frontend en este momento
# Solo cuando tengas el backend desplegado
```

### **Paso 5: Deploy**

Click en "Deploy" y espera ~2 minutos.

**Resultado:**
- URL generada: `https://dashboard-tool-dev.vercel.app` (o similar)
- Auto-deploy en cada push a `main`

---

## 📋 PARTE 2: Desplegar Backend en Railway

### **¿Por qué Railway?**
- ✅ GRATIS hasta $5/mes de uso (generalmente suficiente para hobby)
- ✅ Soporta sesiones persistentes (a diferencia de serverless)
- ✅ Variables de entorno fáciles
- ✅ Deploy desde GitHub automático

### **Paso 1: Crear cuenta en Railway**

1. Ir a https://railway.app
2. Sign up con GitHub
3. Verificar email

### **Paso 2: Crear nuevo proyecto**

1. Click "New Project"
2. Seleccionar "Deploy from GitHub repo"
3. Seleccionar `DashboardToolDev`

### **Paso 3: Configurar Railway**

**Settings del proyecto:**
```
Root Directory: backend
Start Command: node index.js
```

**Variables de entorno (obligatorias):**
```env
PORT=3000
BASE_URL=https://proasapba.guapetononcloud.deep-insight.es
FRONTEND_URL=https://tu-app.vercel.app
SESSION_MAX_AGE_MINUTES=30
```

⚠️ **IMPORTANTE:** Reemplaza `https://tu-app.vercel.app` con la URL real que te dio Vercel.

### **Paso 4: Deploy**

Railway desplegará automáticamente y te dará una URL:
```
https://tu-backend-production.up.railway.app
```

---

## 🔗 PARTE 3: Conectar Frontend con Backend

### **Actualizar AuthContext.tsx**

Necesitas cambiar la URL del servidor:

```typescript
// En frontend/src/contexts/AuthContext.tsx
const SERVER_URL = import.meta.env.PUBLIC_SERVER_URL || "http://localhost:3000"
```

### **Agregar variable de entorno en Vercel**

En el dashboard de Vercel → Settings → Environment Variables:
```
PUBLIC_SERVER_URL = https://tu-backend-production.up.railway.app
```

### **Redeploy frontend**

Vercel automáticamente redeployará con la nueva variable.

---

## ✅ Verificación del Despliegue

### **1. Backend funcionando:**
Visita: `https://tu-backend.railway.app/api/health`

Deberías ver:
```json
{
  "status": "ok",
  "activeSessions": 0,
  "uptime": 123.45
}
```

### **2. Frontend funcionando:**
Visita: `https://tu-app.vercel.app`

Deberías ver el login.

### **3. Conexión frontend-backend:**
- Intenta hacer login
- Si funciona → ✅ Todo conectado
- Si no funciona → Verifica variables de entorno

---

## 🐛 Problemas Comunes

### **Error de CORS**
**Causa:** FRONTEND_URL mal configurada en Railway

**Solución:**
```env
FRONTEND_URL=https://tu-dominio-exacto.vercel.app
```
(Sin barra final `/`)

### **Backend no inicia**
**Causa:** Variables de entorno faltantes

**Solución:** Verifica que todas las variables estén en Railway.

### **Login falla**
**Causa:** Conexión con ProAsap BA bloqueada

**Solución:** Verifica que BASE_URL sea correcta y accesible desde Railway.

---

## 💡 Consejos Pro

### **Dominios personalizados (GRATIS)**
- Vercel permite agregar dominios custom sin costo
- Railway también permite dominios custom

### **Monitoreo**
- Vercel muestra analytics de visitas
- Railway muestra logs en tiempo real
- Ambos tienen dashboards de métricas

### **CI/CD automático**
- Push a `main` → Auto-deploy en ambos servicios
- Sin configuración adicional necesaria

---

## 📊 Límites del Plan Gratuito

### **Vercel (Hobby - GRATIS)**
```
✅ Proyectos ilimitados
✅ 100 GB bandwidth/mes
✅ Builds ilimitados
✅ Auto HTTPS
✅ CDN global
```

### **Railway (Starter - GRATIS)**
```
✅ $5 de crédito gratis/mes
✅ ~500 horas de ejecución/mes
✅ 100 GB bandwidth
⚠️ Si excedes $5, pasan a plan pago ($5/mes base)
```

**Para un proyecto de hobby/desarrollo:**
- Frontend: 100% gratis siempre
- Backend: Gratis si no tiene mucho tráfico

---

## 🔐 Seguridad en Producción

### **Variables de entorno**
- ✅ Nunca hacer commit de `.env`
- ✅ Usar `.env.example` como plantilla
- ✅ Configurar en dashboard de cada servicio

### **CORS**
Ya está configurado dinámicamente:
```javascript
origin: process.env.FRONTEND_URL
```

### **HTTPS**
- Vercel: Automático
- Railway: Automático

---

## 📝 Checklist de Despliegue

### **Antes de desplegar:**
- [ ] Código subido a GitHub
- [ ] `.env.example` creado en backend
- [ ] `.gitignore` actualizado
- [ ] Variables de entorno documentadas

### **Frontend (Vercel):**
- [ ] Cuenta Vercel creada
- [ ] Proyecto importado desde GitHub
- [ ] Build settings configurados (root: `frontend`)
- [ ] Deploy exitoso
- [ ] URL anotada

### **Backend (Railway):**
- [ ] Cuenta Railway creada
- [ ] Proyecto creado desde GitHub
- [ ] Root directory configurado (`backend`)
- [ ] Variables de entorno configuradas:
  - [ ] PORT
  - [ ] BASE_URL
  - [ ] FRONTEND_URL (URL de Vercel)
  - [ ] SESSION_MAX_AGE_MINUTES
- [ ] Deploy exitoso
- [ ] URL anotada

### **Conexión:**
- [ ] PUBLIC_SERVER_URL configurada en Vercel
- [ ] Frontend redeployado
- [ ] Login testeado
- [ ] Descarga de datos testeada

---

## 🎯 Resumen Rápido

**¿Me costará dinero?**
- Frontend: **NO** (100% gratis)
- Backend: **Probablemente NO** si es hobby/desarrollo
- Solo pagarías si tienes MUCHO tráfico (poco probable en desarrollo)

**¿Cuánto tiempo toma?**
- Setup inicial: ~15-20 minutos
- Deploys posteriores: Automáticos al hacer push

**¿Es complicado?**
- **No**, ambos servicios tienen UI muy amigables
- Deploy con 1 click desde GitHub

---

## 🆘 ¿Necesitas ayuda paso a paso?

Si quieres que te guíe en el proceso de despliegue ahora mismo, dime y te voy ayudando paso a paso con cada pantalla. 🚀

