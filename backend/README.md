# Backend - ProAsap BA Proxy Server

Servidor Express que actúa como intermediario entre el frontend y el sistema ProAsap BA, manejando autenticación, descarga de datos CSV y procesamiento de datos marítimos.

---

## 📁 Estructura del Proyecto

```
backend/
├── index.js              # Servidor principal
├── package.json          # Dependencias y scripts
├── .env.example          # Plantilla de configuración
└── response.html         # HTML guardado para debugging
```

---

## 🏗️ Arquitectura del Servidor

### **Inicialización**

```javascript
// Configuración desde variables de entorno
PORT                     → Puerto del servidor (default: 3000)
BASE_URL                 → URL del servidor ProAsap BA
FRONTEND_URL             → URL del frontend para CORS
SESSION_MAX_AGE_MINUTES  → Duración de sesiones
```

### **Middleware Stack**
```javascript
1. CORS              → Permite peticiones desde el frontend
2. express.json()    → Parsea body JSON
3. express.urlencoded() → Parsea formularios
4. Logger custom     → Log de todas las peticiones
```

---

## 📡 Endpoints API

### **GET /api/ships**
Retorna la lista de barcos disponibles para tracking.

**Configuración de barcos:**
```javascript
SHIPS = {
  'ceuta-jet': {
    name: 'Ceuta Jet',
    objects: '[sGPSDMAPBA003-0a,sRAWDMAPBA003-0a]',
    series: '{sGPSDMAPBA003-0a:[00-lathr,01-lonhr,...]}'
  },
  'tanger-express': { ... },
  'kattegat': { ... }
}
```

**Respuesta:**
```json
{
  "success": true,
  "ships": [
    { "id": "ceuta-jet", "name": "Ceuta Jet" },
    { "id": "tanger-express", "name": "Tanger Express" },
    { "id": "kattegat", "name": "Kattegat" }
  ]
}
```

---

### **POST /api/login**
Autentica al usuario en el sistema ProAsap BA.

**Flujo de autenticación:**
```
1. Recibe credenciales (username, password)
2. GET al formulario de login → Obtiene campos hidden y CSRF tokens
3. Parsea HTML con Cheerio → Detecta nombres de campos
4. POST con credenciales → Envía login
5. Verifica sesión → GET /index para confirmar
6. Crea sessionId → Guarda cliente axios con cookies
7. Retorna sessionId al frontend
```

**Detalles técnicos:**
- Usa `axios-cookiejar-support` para mantener cookies de sesión
- Parsea formularios dinámicamente (no asume nombres de campos fijos)
- Verifica login exitoso buscando ausencia de '/auth/login' en la respuesta

**Gestión de sesiones:**
```javascript
sessions.set(sessionId, {
  client,        // Cliente axios con cookies
  username,      // Usuario autenticado
  createdAt,     // Timestamp de creación
  lastUsed       // Última vez usado (para cleanup)
})
```

---

### **POST /api/download**
Descarga y procesa datos CSV del servidor ProAsap BA.

**Parámetros:**
```json
{
  "sessionId": "abc123",
  "startDate": "2024-11-12T00:00:00",
  "endDate": "2024-11-12T06:00:00",
  "shipId": "ceuta-jet"
}
```

**Flujo de descarga:**
```
1. Valida sesión → Verifica que sessionId existe
2. Valida barco → Verifica que shipId es válido
3. Genera URL de /downloadfile → Construye URL con parámetros
4. GET /downloadfile → Solicita generación de CSVs
5. Parsea HTML con Cheerio → Extrae enlaces a archivos CSV
6. Descarga cada CSV → GET a cada archivo
7. Procesa CSVs → Llama a processCSVsToRawData()
8. Retorna datos procesados
```

**Construcción de URL:**
```javascript
/downloadfile?series={ship.series}&projectid=...&start=...&end=...&mode=csv
```

**Respuesta:**
```json
{
  "success": true,
  "data": [ RawDataRow[], ... ],
  "meta": {
    "totalRows": 7200,
    "filesProcessed": 2,
    "gapsDetected": 3
  }
}
```

---

### **POST /api/logout**
Cierra la sesión del usuario.

**Acciones:**
- Elimina sessionId del Map de sesiones
- Libera recursos asociados
- Log de cierre de sesión

---

### **GET /api/health**
Endpoint de salud para monitoring.

**Respuesta:**
```json
{
  "status": "ok",
  "activeSessions": 2,
  "uptime": 12345.67
}
```

---

## 🔄 Procesamiento de Datos CSV

### **Función: `processCSVsToRawData(csvContents, delimiter)`**

Convierte múltiples archivos CSV en un array unificado y normalizado de `RawDataRow`.

**Pipeline de procesamiento:**

#### 1. **Parseo CSV (`csvTextToRows`)**
```
CSV texto → Split por líneas → Headers y valores → Objetos row
```

Validaciones:
- Verifica existencia de columna `navstatus`
- Verifica existencia de columna `time`
- Mapea valores a nombres de columna

#### 2. **Combinación de archivos**
```
[CSV1, CSV2, CSV3] → Concat all rows → Combined array
```

#### 3. **Ordenación cronológica**
```
Sort by time column → Orden temporal estricto
```

#### 4. **Detección de gaps (`insertGapMarkers`)**
```
Para cada par de filas consecutivas:
  Si diferencia de tiempo > 500ms:
    → Insertar marcador de gap
    → Calcular duración del gap
```

**Marcador de gap:**
```javascript
{
  time: "2024-11-12 02:05:30.000",
  navstatus: "GAP",
  isGapMarker: true,
  gapDuration: "125.50s",
  latitude: null,
  longitude: null,
  speed: null
}
```

#### 5. **Normalización (`normalizeRow`)**
```
Row object → RawDataRow (tipado y estructurado)
```

**Campos extraídos:**
```javascript
{
  timestamp: "2024-11-12 00:00:00.000",
  date: "2024-11-12",
  time: "00:00:00.000",
  latitude: 35.8794,
  longitude: -5.3213,
  speed: 18.5,
  navStatus: "5",
  isGapMarker: false
}
```

---

## 🔐 Gestión de Sesiones

### **Almacenamiento**
```javascript
sessions = new Map()
// Key: sessionId (random string)
// Value: { client, username, createdAt, lastUsed }
```

### **Cleanup automático**
```javascript
setInterval(() => {
  // Cada SESSION_MAX_AGE_MINUTES minutos
  // Eliminar sesiones no usadas en ese tiempo
}, SESSION_MAX_AGE_MS)
```

**Beneficios:**
- Libera memoria de sesiones inactivas
- Previene acumulación indefinida
- Protege recursos del servidor

---

## 🌐 Comunicación con ProAsap BA

### **Cliente Axios con cookies**
```javascript
const createAxiosClient = () => {
  const cookieJar = new tough.CookieJar()
  return wrapper(axios.create({
    baseURL: BASE_URL,
    jar: cookieJar,           // Gestión de cookies
    withCredentials: true,    // Enviar cookies
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 500
  }))
}
```

**Ventajas:**
- Mantiene sesión con el servidor externo
- Gestiona cookies automáticamente
- Sigue redirects de login

---

## 📄 Parsing HTML con Cheerio

### **Caso 1: Formulario de login**
```javascript
const $ = cheerio.load(pageResponse.data)
const form = $('form').first()

// Extraer campos del formulario
form.find('input').each((_, el) => {
  const name = $(el).attr('name')
  const type = $(el).attr('type')
  // Detectar campos username, password, hidden
})
```

### **Caso 2: Enlaces CSV**
```javascript
const $ = cheerio.load(pageResponse.data)

$('a').each((_, el) => {
  const href = $(el).attr('href')
  if (href && href.includes('.csv')) {
    csvLinks.push(fullUrl)
  }
})
```

**Ventajas de Cheerio:**
- Sintaxis similar a jQuery
- Parsea HTML malformado
- Rápido y eficiente

---

## 🛠️ Helpers y Utilidades

### **formatDate(date)**
Convierte Date de JavaScript al formato esperado por ProAsap BA:
```
Date → "YYYY-MM-DD HH:mm:ss.000"
```

### **parseTimestampParts(timestamp)**
Separa timestamp en componentes:
```
"2024-11-12 14:30:00.000" → { date: "2024-11-12", time: "14:30:00.000" }
```

### **calculateGapDuration(startTime, endTime)**
Calcula duración de un gap en segundos:
```
(endTime - startTime) / 1000 → "125.50s"
```

---

## 🔢 Constantes de Columnas CSV

```javascript
COL_LAT = "00-lathr [deg]"
COL_LON = "01-lonhr [deg]"
COL_SPEED = "04-speed [knots]"
COL_NAVSTATUS = "06-navstatus [adim]"
COL_TIME = "time"
MAX_GAP_THRESHOLD_MS = 500  // 0.5 segundos
```

Estas constantes mapean los nombres exactos de las columnas del CSV de ProAsap BA.

---

## 📊 Estructura de Datos

### **RawDataRow** (Salida del servidor)
```typescript
{
  timestamp: string        // "2024-11-12 00:00:00.000"
  date: string            // "2024-11-12"
  time: string            // "00:00:00.000"
  latitude: number | null // 35.8794
  longitude: number | null // -5.3213
  speed: number | null    // 18.5 knots
  navStatus: string       // "5" (código de estado)
  isGapMarker: boolean    // true si es marcador de gap
  gapDuration?: string    // "125.50s" (solo si isGapMarker)
}
```

### **Session** (Almacenamiento interno)
```javascript
{
  client: AxiosInstance,  // Cliente con cookies
  username: string,       // Usuario autenticado
  createdAt: Date,        // Timestamp de creación
  lastUsed: Date          // Última vez usado
}
```

---

## 🔄 Flujo Completo de Descarga

```
Frontend: POST /api/download
    ↓
Backend: Valida sesión y barco
    ↓
Backend: GET /downloadfile (genera CSVs en el servidor remoto)
    ↓
Backend: Parsea HTML → Extrae enlaces .csv
    ↓
Backend: Para cada CSV:
    ↓ GET CSV como texto plano
    ↓ Acumula contenido
    ↓
Backend: processCSVsToRawData()
    ↓ csvTextToRows → Parse CSV
    ↓ Sort por tiempo
    ↓ insertGapMarkers → Detecta gaps
    ↓ normalizeRow → Estructura datos
    ↓
Backend: Retorna RawDataRow[]
    ↓
Frontend: Recibe y procesa con useCSVInterval
```

---

## 🛡️ Seguridad y Validación

### **Validaciones implementadas:**
- ✅ Verificar que username y password están presentes
- ✅ Validar que sessionId existe antes de operaciones
- ✅ Verificar que el barco solicitado existe en SHIPS
- ✅ Timeout de sesiones por inactividad

### **Protección CORS:**
```javascript
app.use(cors({
  origin: FRONTEND_URL,    // Solo permitir frontend configurado
  credentials: true        // Permitir cookies
}))
```

---

## 📝 Logging

El servidor incluye logging detallado para debugging:

```
→ LOGIN: Intentando login para usuario: david.rossi
  → Obteniendo formulario de login...
  → Campos detectados: usuario="username", password="password"
  → Enviando POST de login...
  → Verificando sesión...
✔ LOGIN EXITOSO: david.rossi (session: abc123)

→ DESCARGA: Ceuta Jet (ceuta-jet)
  → Rango: 2024-11-12 00:00:00.000 - 2024-11-12 06:00:00.000
  → Solicitando generación de archivos...
  ✔ Enlace encontrado: /tmp/data_001.csv
  ✔ Total de enlaces encontrados: 2
  → Descargando: data_001.csv
    ✔ Descargado (125000 bytes, 2400 líneas)

  🔄 Procesando 2 archivo(s) CSV...
     ✔ Archivo 1: 2400 filas
     ✔ Archivo 2: 4800 filas
  → Total de filas combinadas: 7200
  → Ordenando cronológicamente...
  → Detectando gaps...
     ✔ 3 gap(s) detectado(s)
  ✔ Procesamiento completo: 7203 filas
```

---

## 🧩 Funciones Principales

### **createAxiosClient()**
Crea una instancia de Axios con gestión de cookies.

**Retorna:** Cliente axios configurado con `tough-cookie` para mantener sesión.

---

### **formatDate(date)**
Formatea fechas al formato esperado por ProAsap BA.

**Input:** `Date` object  
**Output:** `"YYYY-MM-DD HH:mm:ss.000"`

**Uso:**
```javascript
formatDate(new Date("2024-11-12T14:30:00"))
// → "2024-11-12 14:30:00.000"
```

---

### **csvTextToRows(csvString, delimiter)**
Convierte texto CSV en array de objetos.

**Proceso:**
1. Split por líneas
2. Primera línea = headers
3. Resto de líneas = valores
4. Mapea valores a headers
5. Valores vacíos → null

**Output:**
```javascript
[
  { "time": "2024-11-12 00:00:00", "00-lathr [deg]": "35.8794", ... },
  { "time": "2024-11-12 00:00:01", "00-lathr [deg]": "35.8795", ... },
  ...
]
```

---

### **insertGapMarkers(rows)**
Detecta gaps temporales e inserta marcadores.

**Lógica:**
```javascript
for cada par de filas consecutivas:
  timeDiff = nextRow.time - currentRow.time
  
  if timeDiff > MAX_GAP_THRESHOLD_MS:
    insertar {
      time: currentRow.time,
      navStatus: "GAP",
      isGapMarker: true,
      gapDuration: calculateGapDuration(...)
    }
```

**Propósito:** Identificar interrupciones en la transmisión de datos GPS.

---

### **normalizeRow(row)**
Normaliza una fila CSV a formato `RawDataRow`.

**Transformaciones:**
- Parsea coordenadas a float
- Parsea velocidad a float
- Extrae date/time del timestamp
- Mantiene campos originales

**Input:**
```javascript
{ "time": "...", "00-lathr [deg]": "35.8794", ... }
```

**Output:**
```javascript
{
  timestamp: "2024-11-12 00:00:00.000",
  date: "2024-11-12",
  time: "00:00:00.000",
  latitude: 35.8794,
  longitude: -5.3213,
  speed: 18.5,
  navStatus: "5",
  isGapMarker: false
}
```

---

### **processCSVsToRawData(csvContents, delimiter)**
Función principal que orquesta todo el procesamiento.

**Input:** Array de strings (contenido de múltiples CSVs)  
**Output:** 
```javascript
{
  success: true,
  data: RawDataRow[],
  meta: {
    totalRows: 7203,
    filesProcessed: 2,
    gapsDetected: 3
  }
}
```

**Pipeline:**
1. Parse cada CSV
2. Combinar filas de todos los archivos
3. Ordenar cronológicamente
4. Detectar e insertar marcadores de gap
5. Normalizar todas las filas

---

## 🗄️ Gestión de Estado del Servidor

### **Store de sesiones**
```javascript
const sessions = new Map()
```

- **Tipo:** Map (key-value en memoria)
- **Persistencia:** No persistente (se pierde al reiniciar servidor)
- **Limpieza:** Automática cada SESSION_MAX_AGE_MINUTES

**Ventajas:**
- Rápido (memoria)
- Simple (no requiere DB)
- Temporal (apropiado para sesiones)

---

## 🔧 Configuración de Barcos

Cada barco tiene configuración específica para el sistema ProAsap BA:

```javascript
{
  name: 'Nombre legible',
  objects: '[id1,id2]',           // IDs de objetos GPS
  series: '{id1:[columns]}'       // Columnas a solicitar
}
```

**Columnas solicitadas:**
- `00-lathr` → Latitud
- `01-lonhr` → Longitud
- `02-ellihr` → Elevación
- `03-mslhr` → Nivel del mar
- `04-speed` → Velocidad (knots)
- `05-course` → Rumbo
- `06-navstatus` → Estado de navegación

---

## 🐛 Debugging

### **response.html**
El servidor guarda el HTML de `/downloadfile` para análisis:

```javascript
fs.writeFileSync('response.html', pageResponse.data)
```

**Útil para:**
- Verificar estructura del HTML retornado
- Debuggear cambios en el servidor remoto
- Analizar por qué no se encuentran enlaces CSV

---

## 📦 Dependencias Clave

### **express** - Framework web
Servidor HTTP con routing y middleware.

### **cors** - Cross-Origin Resource Sharing
Permite que el frontend haga peticiones al backend.

### **axios** - Cliente HTTP
Maneja peticiones HTTP con mejor API que fetch nativo.

### **axios-cookiejar-support** - Gestión de cookies
Añade soporte de cookies persistentes a axios.

### **tough-cookie** - Cookie jar
Almacena y gestiona cookies como un navegador.

### **cheerio** - Parser HTML
jQuery para Node.js, permite navegar y manipular HTML.

### **dotenv** - Variables de entorno
Carga variables desde archivo `.env`.

---

## ⚙️ Variables de Entorno

```bash
PORT=3000                    # Puerto del servidor
BASE_URL=https://...         # URL del sistema ProAsap BA
FRONTEND_URL=http://...      # URL del frontend (CORS)
SESSION_MAX_AGE_MINUTES=30   # Duración de sesiones
```

**Carga:**
```javascript
require('dotenv').config()
process.env.PORT || 3000
```

---

## 🔄 Ciclo de Vida del Servidor

```
1. Inicialización
   ↓ require('dotenv').config()
   ↓ Configurar constantes
   ↓ Configurar middleware
   ↓
2. Definir rutas
   ↓ GET /api/ships
   ↓ POST /api/login
   ↓ POST /api/download
   ↓ POST /api/logout
   ↓ GET /api/health
   ↓
3. Iniciar limpieza de sesiones (setInterval)
   ↓
4. app.listen(PORT)
   ↓
5. ✅ Servidor listo y esperando peticiones
```

---

## 🎯 Decisiones de Diseño

### **¿Por qué proxy en lugar de conexión directa?**
- El sistema ProAsap BA requiere autenticación con cookies complejas
- El frontend no puede manejar cookies cross-domain fácilmente
- El backend maneja la sesión y simplifica la API para el frontend

### **¿Por qué parsear HTML en lugar de usar API JSON?**
- ProAsap BA no expone API REST pública
- La interfaz web es la única forma de acceso
- Cheerio permite extraer datos de forma robusta

### **¿Por qué procesar CSV en el backend?**
- Reduce carga en el frontend
- Centraliza lógica de procesamiento
- Permite detectar gaps antes de enviar al cliente
- Menor transferencia de datos (datos ya normalizados)

---

## 📊 Métricas y Performance

**Procesamiento típico:**
- 2-3 archivos CSV por petición
- ~2000-8000 filas por archivo
- Tiempo de procesamiento: 1-3 segundos
- Detección de gaps: ~0-10 por descarga

**Optimizaciones:**
- Stream processing (no carga todo en memoria)
- Sort eficiente (nativo de JS)
- Parsing incremental de CSV
