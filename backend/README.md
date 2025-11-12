# ProAsap BA Proxy Server

Servidor Express que actúa como proxy para el sistema ProAsap BA, manejando autenticación, descarga de datos CSV y procesamiento de datos para el Dashboard Tool.

## 🚀 Configuración

### Variables de Entorno

El servidor utiliza variables de entorno para configuración. Crea un archivo `.env` en el directorio `backend/` basándote en el archivo `.env.example`:

```bash
cp .env.example .env
```

#### Variables Disponibles

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor Express | `3000` |
| `BASE_URL` | URL del servidor ProAsap BA | `https://proasapba.guapetononcloud.deep-insight.es` |
| `FRONTEND_URL` | URL del frontend (para CORS) | `http://localhost:4321` |
| `SESSION_MAX_AGE_MINUTES` | Duración de la sesión en minutos | `30` |

### Instalación

```bash
# Instalar dependencias
pnpm install

# o con npm
npm install
```

### Ejecución

```bash
# Modo desarrollo (con auto-reload)
pnpm dev

# Modo producción
pnpm start
```

## 📡 Endpoints API

### `POST /api/login`
Autentica un usuario en el sistema ProAsap BA.

**Body:**
```json
{
  "username": "usuario",
  "password": "contraseña"
}
```

### `GET /api/ships`
Obtiene la lista de barcos disponibles.

### `POST /api/download`
Descarga y procesa datos CSV de un barco en un rango de fechas.

**Body:**
```json
{
  "sessionId": "session-id",
  "shipId": "ceuta-jet",
  "startDate": "2024-01-01T00:00:00",
  "endDate": "2024-01-02T00:00:00"
}
```

### `POST /api/logout`
Cierra la sesión del usuario.

### `GET /api/health`
Verifica el estado del servidor.

## 🔧 Desarrollo

### Estructura
- **Autenticación:** Manejo de login con cookies
- **Descarga de datos:** Obtención de archivos CSV desde ProAsap BA
- **Procesamiento:** Conversión y normalización de datos CSV
- **Gestión de sesiones:** Almacenamiento temporal de sesiones activas

### Tecnologías
- Express.js
- Axios (con soporte de cookies)
- Cheerio (parsing HTML)
- dotenv (variables de entorno)

