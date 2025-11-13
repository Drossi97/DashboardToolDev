/**
 * Servidor Express - Proxy para ProAsap BA
 * Versión simplificada enfocada en pasar datos correctamente a useCSVConverter
 */

// Cargar variables de entorno
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const fs = require('fs');
const path = require('path');

const app = express();

// Configuración desde variables de entorno
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'https://proasapba.guapetononcloud.deep-insight.es';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4321';
const SESSION_MAX_AGE_MINUTES = parseInt(process.env.SESSION_MAX_AGE_MINUTES || '30', 10);
const LOGIN_PATH = '/auth/login?next=%2Findex';

// Configuración de barcos disponibles
const SHIPS = {
  'ceuta-jet': {
    name: 'Ceuta Jet',
    objects: '[sGPSDMAPBA003-0a,sRAWDMAPBA003-0a]',
    series: '{sGPSDMAPBA003-0a:[00-lathr,01-lonhr,02-ellihr,03-mslhr,04-speed,05-course,06-navstatus]}'
  },
  'tanger-express': {
    name: 'Tanger Express',
    objects: '[sGPSDMAPBA010-0a,sRAWDMAPBA010-0a]',
    series: '{sGPSDMAPBA010-0a:[00-lathr,01-lonhr,02-ellihr,03-mslhr,04-speed,05-course,06-navstatus]}'
  },
  'kattegat': {
    name: 'Kattegat',
    objects: '[sGPSDMAPBA002-0a,sRAWDMAPBA002-0a]',
    series: '{sGPSDMAPBA002-0a:[00-lathr,01-lonhr,02-ellihr,03-mslhr,04-speed,05-course,06-navstatus]}'
  }
};

const DEFAULT_PARAMS = {
  projectid: 'APBALGECIRAS',
  acqid: 'unknown',
  theme: 'dark',
  mode: 'csv'
};

// Store de sesiones
const sessions = new Map();

// Middleware
app.use(cors({
  origin: FRONTEND_URL || '*',  // Fallback a wildcard si FRONTEND_URL no existe
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Helper: Crear cliente axios con cookies
const createAxiosClient = () => {
  const cookieJar = new tough.CookieJar();
  return wrapper(axios.create({
    baseURL: BASE_URL,
    jar: cookieJar,
    withCredentials: true,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 500
  }));
};

// Helper: Formatear fecha
const formatDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date(date);
  return (
    d.getFullYear() + '-' +
    pad(d.getMonth() + 1) + '-' +
    pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' +
    pad(d.getMinutes()) + ':' +
    pad(d.getSeconds()) + '.000'
  );
};

// ============================================================================
// PROCESAMIENTO CSV (Lógica de useCSVConverter.ts)
// ============================================================================

const COL_LAT = "00-lathr [deg]";
const COL_LON = "01-lonhr [deg]";
const COL_SPEED = "04-speed [knots]";
const COL_NAVSTATUS = "06-navstatus [adim]";
const COL_TIME = "time";
const MAX_GAP_THRESHOLD_MS = 500; // 0.5 segundos

/**
 * Parsear timestamp en partes
 */
const parseTimestampParts = (timestamp) => {
  if (!timestamp || typeof timestamp !== "string") return null;
  const parts = timestamp.split(" ");
  if (parts.length < 2) return null;
  return { date: parts[0], time: parts[1], raw: timestamp };
};

/**
 * Convertir texto CSV a filas
 */
const csvTextToRows = (csvString, delimiter = ",") => {
  if (!csvString?.trim()) return [];
  
  const lines = csvString.replace(/\r\n?/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];
  
  const delim = delimiter === "\\t" || delimiter === "tab" ? "\t" : delimiter;
  const headers = lines[0].split(delim).map((h) => h.trim());
  
  const hasNavstatusHeader = headers.some((h) => h.toLowerCase().includes("navstatus"));
  const hasTimeHeader = headers.some((h) => h.trim() === COL_TIME);
  if (!hasNavstatusHeader || !hasTimeHeader) return [];

  return lines.slice(1).map((line) => {
    const values = line.split(delim).map((v) => v.trim());
    const row = {};
    headers.forEach((header, idx) => {
      const key = header || `column_${idx}`;
      const value = values[idx];
      row[key] = value === "" || value === undefined ? null : value;
    });
    return row;
  });
};

/**
 * Normalizar fila a RawDataRow
 */
const normalizeRow = (row) => {
  const timestamp = row[COL_TIME];
  const parts = parseTimestampParts(timestamp);
  
  return {
    timestamp: timestamp || "",
    date: parts?.date || "",
    time: parts?.time || "",
    latitude: row[COL_LAT] ? parseFloat(row[COL_LAT]) : null,
    longitude: row[COL_LON] ? parseFloat(row[COL_LON]) : null,
    speed: row[COL_SPEED] ? parseFloat(row[COL_SPEED]) : null,
    navStatus: row[COL_NAVSTATUS] || "",
    isGapMarker: row.isGapMarker || false,
    gapDuration: row.gapDuration,
    ...row
  };
};

/**
 * Calcular duración de gap
 */
const calculateGapDuration = (startTime, endTime) => {
  try {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffMs = end - start;
    const seconds = (diffMs / 1000).toFixed(2);
    return `${seconds}s`;
  } catch {
    return "0s";
  }
};

/**
 * Insertar marcadores de gap
 */
const insertGapMarkers = (rows) => {
  if (rows.length === 0) return rows;
  
  const result = [];
  
  for (let i = 0; i < rows.length; i++) {
    const currentRow = rows[i];
    result.push(currentRow);
    
    if (i < rows.length - 1) {
      const nextRow = rows[i + 1];
      const currentTime = currentRow[COL_TIME];
      const nextTime = nextRow[COL_TIME];
      
      if (currentTime && nextTime) {
        try {
          const currentMs = new Date(currentTime).getTime();
          const nextMs = new Date(nextTime).getTime();
          const gapMs = nextMs - currentMs;
          
          if (gapMs > MAX_GAP_THRESHOLD_MS) {
            const gapMarker = {
              [COL_TIME]: currentTime,
              [COL_LAT]: null,
              [COL_LON]: null,
              [COL_SPEED]: null,
              [COL_NAVSTATUS]: "GAP",
              isGapMarker: true,
              gapDuration: calculateGapDuration(currentTime, nextTime)
            };
            result.push(gapMarker);
          }
        } catch {
          // Continuar si hay error al parsear fechas
        }
      }
    }
  }
  
  return result;
};

/**
 * Convertir múltiples CSVs a RawDataRow[]
 */
const processCSVsToRawData = (csvContents, delimiter = ",") => {
  console.log(`\n  🔄 Procesando ${csvContents.length} archivo(s) CSV...`);
  
  let combined = [];
  
  // Procesar cada CSV
  for (let i = 0; i < csvContents.length; i++) {
    const csvString = csvContents[i];
    const rows = csvTextToRows(csvString, delimiter);
    
    if (rows.length === 0) {
      console.log(`     ⚠ Archivo ${i + 1}: Sin datos válidos`);
    } else {
      combined = combined.concat(rows);
      console.log(`     ✔ Archivo ${i + 1}: ${rows.length} filas`);
    }
  }
  
  if (combined.length === 0) {
    return { success: false, error: "No se pudieron leer filas válidas" };
  }
  
  console.log(`  → Total de filas combinadas: ${combined.length}`);
  
  // Ordenar cronológicamente
  console.log(`  → Ordenando cronológicamente...`);
  combined.sort((a, b) => {
    const timeA = a?.[COL_TIME];
    const timeB = b?.[COL_TIME];
    
    if (!timeA || !timeB) return 0;
    
    try {
      const dateA = new Date(timeA);
      const dateB = new Date(timeB);
      return dateA.getTime() - dateB.getTime();
    } catch {
      return 0;
    }
  });
  
  // Insertar marcadores de gap
  console.log(`  → Detectando gaps...`);
  const combinedWithGaps = insertGapMarkers(combined);
  const gapsDetected = combinedWithGaps.length - combined.length;
  console.log(`     ✔ ${gapsDetected} gap(s) detectado(s)`);
  
  // Normalizar datos
  console.log(`  → Normalizando datos...`);
  const normalizedData = combinedWithGaps.map(normalizeRow);
  
  console.log(`  ✔ Procesamiento completo: ${normalizedData.length} filas`);
  
  return {
    success: true,
    data: normalizedData,
    meta: {
      totalRows: normalizedData.length,
      filesProcessed: csvContents.length,
      gapsDetected: gapsDetected
    }
  };
};

/**
 * GET /api/ships - Obtener lista de barcos disponibles
 */
app.get('/api/ships', (req, res) => {
  const shipsList = Object.entries(SHIPS).map(([id, ship]) => ({
    id,
    name: ship.name
  }));
  
  res.json({
    success: true,
    ships: shipsList
  });
});

/**
 * POST /api/login
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Usuario y contraseña son requeridos'
      });
    }

    console.log(`\n→ LOGIN: Intentando login para usuario: ${username}`);

    const client = createAxiosClient();

    // 1. Obtener formulario de login
    const loginPageUrl = `${BASE_URL}${LOGIN_PATH}`;
    console.log('  → Obteniendo formulario de login...');
    const pageResponse = await client.get(loginPageUrl);

    const $ = cheerio.load(pageResponse.data);
    const form = $('form').first();

    if (!form.length) {
      throw new Error('No se encontró formulario de login');
    }

    // Extraer campos
    const formData = new URLSearchParams();
    let usernameField = null;
    let passwordField = null;

    form.find('input').each((_, el) => {
      const name = $(el).attr('name');
      const type = ($(el).attr('type') || '').toLowerCase();
      const value = $(el).attr('value') || '';

      if (!name) return;

      if (type === 'hidden') {
        formData.append(name, value);
      } else if (type === 'password') {
        passwordField = name;
      } else if (type === 'text' || type === 'email') {
        if (/user|mail|login|name/i.test(name)) {
          usernameField = name;
        }
      }
    });

    usernameField = usernameField || 'username';
    passwordField = passwordField || 'password';

    console.log(`  → Campos detectados: usuario="${usernameField}", password="${passwordField}"`);

    formData.set(usernameField, username);
    formData.set(passwordField, password);

    // 2. Enviar POST de login
    const action = form.attr('action') || LOGIN_PATH;
    const postUrl = action.startsWith('http') ? action : `${BASE_URL}${action}`;
    
    console.log('  → Enviando POST de login...');
    await client.post(postUrl, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // 3. Verificar login
    console.log('  → Verificando sesión...');
    const indexResponse = await client.get(`${BASE_URL}/index`);
    const indexHtml = indexResponse.data;

    if (indexHtml.includes('auth/login') || indexHtml.includes('password')) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales incorrectas'
      });
    }

    // 4. Guardar sesión
    const sessionId = Math.random().toString(36).substring(7);
    sessions.set(sessionId, {
      client,
      username,
      createdAt: new Date(),
      lastUsed: new Date()
    });

    console.log(`✔ LOGIN EXITOSO: ${username} (session: ${sessionId})\n`);

    res.json({
      success: true,
      sessionId,
      username
    });

  } catch (error) {
    console.error('✖ ERROR EN LOGIN:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al hacer login'
    });
  }
});

// Funciones helper eliminadas - ya no se necesitan generar URLs manualmente
// El servidor obtiene las URLs directamente del HTML de /downloadfile

/**
 * POST /api/download
 */
app.post('/api/download', async (req, res) => {
  try {
    const { sessionId, startDate, endDate, shipId = 'ceuta-jet' } = req.body;

    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: 'Sesión requerida'
      });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Sesión inválida o expirada'
      });
    }

    // Validar que el barco existe
    const ship = SHIPS[shipId];
    if (!ship) {
      return res.status(400).json({
        success: false,
        error: `Barco no válido: ${shipId}. Opciones: ${Object.keys(SHIPS).join(', ')}`
      });
    }

    session.lastUsed = new Date();
    const { client } = session;

    console.log(`\n→ DESCARGA: ${ship.name} (${shipId})`);
    console.log(`  → Rango: ${startDate} - ${endDate}`);

    // Construir URL de /downloadfile para GENERAR los archivos
    const params = new URLSearchParams({
      projectid: DEFAULT_PARAMS.projectid,
      acqid: DEFAULT_PARAMS.acqid,
      theme: DEFAULT_PARAMS.theme,
      mode: DEFAULT_PARAMS.mode,
      start: formatDate(startDate),
      end: formatDate(endDate)
    });

    const downloadUrl = `/downloadfile?series=${encodeURIComponent(ship.series)}&${params.toString()}`;
    console.log(`  → Solicitando generación de archivos...`);
    console.log(`  → URL: ${BASE_URL}${downloadUrl}`);

    // Hacer petición para GENERAR los archivos
    const pageResponse = await client.get(downloadUrl);
    
    // Guardar HTML para análisis
    const htmlPath = path.join(__dirname, 'response.html');
    fs.writeFileSync(htmlPath, pageResponse.data);
    console.log(`  → HTML guardado en: ${htmlPath}`);
    console.log(`  → Longitud HTML: ${pageResponse.data.length} bytes\n`);

    // Parsear HTML con cheerio
    const $ = cheerio.load(pageResponse.data);
    
    // Buscar enlaces CSV
    const csvLinks = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('.csv')) {
        // Construir URL correctamente
        let fullUrl;
        if (href.startsWith('http')) {
          fullUrl = href;
        } else if (href.startsWith('/')) {
          fullUrl = `${BASE_URL}${href}`;
        } else {
          fullUrl = `${BASE_URL}/${href}`;  // Agregar / si no tiene
        }
        csvLinks.push(fullUrl);
        console.log(`  ✔ Enlace encontrado: ${href} → ${fullUrl}`);
      }
    });

    if (csvLinks.length === 0) {
      console.log(`  ⚠ No se encontraron enlaces CSV en el HTML`);
      console.log(`  → Revisa el archivo ${htmlPath} para ver la estructura`);
      return res.json({
        success: true,
        data: [],
        filesDownloaded: 0
      });
    }

    console.log(`  ✔ Total de enlaces encontrados: ${csvLinks.length}\n`);

    // Descargar cada CSV como TEXTO PLANO
    const csvContents = [];
    let successCount = 0;
    let errorCount = 0;

    for (const link of csvLinks) {
      try {
        const filename = link.split('/').pop();
        console.log(`  → Descargando: ${filename}`);
        
        const csvResponse = await client.get(link, {
          responseType: 'text',
          validateStatus: (status) => status < 500
        });

        if (csvResponse.status === 200 && csvResponse.data) {
          // IMPORTANTE: Guardar el CSV como texto plano
          const csvText = csvResponse.data;
          csvContents.push(csvText);
          successCount++;
          
          // Debug: Mostrar info del CSV
          const lines = csvText.split('\n');
          console.log(`    ✔ Descargado (${csvText.length} bytes, ${lines.length} líneas)`);
          console.log(`    Header: ${lines[0].substring(0, 70)}...`);
          
        } else {
          errorCount++;
          console.log(`    ✖ Error HTTP ${csvResponse.status}`);
        }
      } catch (err) {
        errorCount++;
        console.error(`    ✖ Error: ${err.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\n  📊 Resultados de descarga:`);
    console.log(`     ✔ Descargados: ${successCount}`);
    console.log(`     ✖ Errores: ${errorCount}`);

    if (csvContents.length === 0) {
      console.log(`\n⚠️ No se descargaron archivos\n`);
      return res.json({
        success: true,
        data: [],
        meta: {
          totalRows: 0,
          filesProcessed: 0,
          gapsDetected: 0
        }
      });
    }

    console.log(`\n✔ DESCARGA COMPLETA: ${csvContents.length} archivo(s)`);
    console.log(`  Total de datos CSV: ${csvContents.reduce((sum, csv) => sum + csv.length, 0)} bytes`);
    
    // PROCESAR CSVs a RawDataRow[]
    const processResult = processCSVsToRawData(csvContents);
    
    if (!processResult.success) {
      console.error(`\n✖ Error al procesar CSVs: ${processResult.error}\n`);
      return res.status(500).json({
        success: false,
        error: processResult.error
      });
    }

    console.log('\n📊 DATOS PROCESADOS PARA EL FRONTEND:');
    console.log(`  - Tipo: Array<RawDataRow>`);
    console.log(`  - Total de filas: ${processResult.data.length}`);
    console.log(`  - Archivos procesados: ${processResult.meta.filesProcessed}`);
    console.log(`  - Gaps detectados: ${processResult.meta.gapsDetected}`);
    
    // Mostrar muestra de datos
    if (processResult.data.length > 0) {
      const firstRow = processResult.data[0];
      console.log(`\n  Ejemplo de fila (primera):`);
      console.log(`    timestamp: ${firstRow.timestamp}`);
      console.log(`    latitude: ${firstRow.latitude}`);
      console.log(`    longitude: ${firstRow.longitude}`);
      console.log(`    speed: ${firstRow.speed}`);
      console.log(`    navStatus: ${firstRow.navStatus}`);
    }
    console.log('');

    res.json({
      success: true,
      data: processResult.data,
      meta: processResult.meta
    });

  } catch (error) {
    console.error('✖ ERROR EN DESCARGA:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al descargar datos'
    });
  }
});

/**
 * POST /api/logout
 */
app.post('/api/logout', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    console.log(`→ Cerrando sesión: ${session.username}`);
    sessions.delete(sessionId);
  }
  res.json({ success: true });
});

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    activeSessions: sessions.size,
    uptime: process.uptime()
  });
});

/**
 * GET /
 */
app.get('/', (req, res) => {
  res.json({
    name: 'ProAsap BA Proxy Server',
    version: '2.0.0',
    status: 'running',
    activeSessions: sessions.size
  });
});

// Limpiar sesiones antiguas
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_MINUTES * 60 * 1000;
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastUsed > SESSION_MAX_AGE_MS) {
      console.log(`→ Limpiando sesión expirada: ${session.username}`);
      sessions.delete(sessionId);
    }
  }
}, SESSION_MAX_AGE_MS);

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SERVIDOR EXPRESS PROXY INICIADO');
  console.log('='.repeat(60));
  console.log(`📡 Puerto:    ${PORT}`);
  console.log(`🌐 URL:       http://localhost:${PORT}`);
  console.log(`🎯 Frontend:  ${FRONTEND_URL}`);
  console.log(`🔗 Target:    ${BASE_URL}`);
  console.log(`⏱️  Sesión:    ${SESSION_MAX_AGE_MINUTES} minutos`);
  console.log('='.repeat(60));
  console.log('\n✅ Esperando peticiones...\n');
});

