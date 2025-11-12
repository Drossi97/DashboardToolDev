# 🐳 Configuración para Dokploy

Instrucciones específicas para desplegar en Dokploy.

---

## 📦 FRONTEND (Astro)

### **Configuración en Dokploy:**

**General:**
- **Root Directory:** `frontend`
- **Branch:** `main`

**Build Settings:**
- **Build Command:** `pnpm build`
- **Start Command:** `pnpm start`
- **Port:** `4321` (o dejar auto-detect)

**Variables de Entorno:**
```env
PORT=4321
PUBLIC_SERVER_URL=https://tu-backend-url.traefik.me
```

⚠️ **Importante:** Reemplaza `tu-backend-url` con la URL real de tu backend desplegado.

---

## 📦 BACKEND (Express)

### **Configuración en Dokploy:**

**General:**
- **Root Directory:** `backend`
- **Branch:** `main`

**Build Settings:**
- **Build Command:** `pnpm install` (o dejar vacío)
- **Start Command:** `pnpm start`
- **Port:** `3000` (o dejar auto-detect)

**Variables de Entorno:**
```env
PORT=3000
BASE_URL=https://proasapba.guapetononcloud.deep-insight.es
FRONTEND_URL=https://tu-frontend-url.traefik.me
SESSION_MAX_AGE_MINUTES=30
```

⚠️ **Importante:** Reemplaza `tu-frontend-url` con la URL real de tu frontend desplegado.

---

## 🔄 Orden de Despliegue

### **1. Desplegar Backend primero**
- Anotar la URL generada: `https://dashboardtooldev-backend-xxx.traefik.me`

### **2. Desplegar Frontend**
- Configurar variable `PUBLIC_SERVER_URL` con la URL del backend
- Anotar la URL generada: `https://dashboardtooldev-frontend-xxx.traefik.me`

### **3. Actualizar Backend**
- Ir a variables de entorno del backend
- Actualizar `FRONTEND_URL` con la URL del frontend
- Hacer redeploy del backend

---

## 🐛 Solución de Problemas

### **Error: Bad Gateway (502)**

**Causas:**
1. **App no inició correctamente**
   - Revisar logs en Dokploy
   - Verificar que el comando `start` es correcto

2. **Puerto incorrecto**
   - Dokploy espera que la app escuche en `0.0.0.0:PORT`
   - Verifica que `PORT` esté configurado

3. **Build falló**
   - Revisa los logs de build
   - Verifica que `pnpm-lock.yaml` existe

### **Error: Cannot install with "frozen-lockfile"**
- ✅ **Solucionado** - `pnpm-lock.yaml` ya está en el repo

### **Error: Node.js version**
- ✅ **Solucionado** - `.nvmrc` especifica v20.11.0

---

## ✅ Verificación Post-Despliegue

### **Frontend funcionando:**
Visita: `https://tu-frontend.traefik.me`
- ✅ Deberías ver el login

### **Backend funcionando:**
Visita: `https://tu-backend.traefik.me/api/health`
- ✅ Deberías ver: `{"status":"ok","activeSessions":0,"uptime":...}`

### **Conexión funcionando:**
1. Haz login en el frontend
2. Si funciona → ✅ Todo OK
3. Si falla → Verifica variables de entorno (URLs cruzadas)

---

## 📋 Checklist de Variables de Entorno

**Backend en Dokploy:**
- [ ] `PORT` = 3000
- [ ] `BASE_URL` = https://proasapba.guapetononcloud.deep-insight.es
- [ ] `FRONTEND_URL` = URL del frontend en Dokploy
- [ ] `SESSION_MAX_AGE_MINUTES` = 30

**Frontend en Dokploy:**
- [ ] `PORT` = 4321 (opcional, Dokploy puede auto-detectar)
- [ ] `PUBLIC_SERVER_URL` = URL del backend en Dokploy

---

## 💡 Tips

### **Ver logs en tiempo real:**
En Dokploy → Tu aplicación → Logs

### **Ver variables configuradas:**
En Dokploy → Tu aplicación → Environment

### **Forzar rebuild:**
En Dokploy → Tu aplicación → Redeploy

---

## 🆘 Si sigue sin funcionar

**Revisa los logs del frontend en Dokploy:**
- ¿Dice "Server listening on 0.0.0.0:4321"?
- ¿Hay algún error en los logs?

**Para el backend:**
- ¿Dice "🚀 SERVIDOR EXPRESS PROXY INICIADO"?
- ¿Muestra el puerto correcto?

Si necesitas ayuda revisando los logs, compártelos y te ayudo a identificar el problema. 🔍

