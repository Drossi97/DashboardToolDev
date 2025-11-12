# Frontend - Dashboard Tool

Dashboard web para visualización y análisis de rutas marítimas en tiempo real, construido con Astro, React y TypeScript.

---

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/        # Componentes React
│   ├── contexts/          # Context API para estado global
│   ├── hooks/             # Hooks personalizados
│   ├── layouts/           # Layouts de Astro
│   ├── lib/              # Utilidades y helpers
│   └── pages/            # Páginas de Astro
├── astro.config.mjs      # Configuración de Astro
├── tailwind.config.mjs   # Configuración de Tailwind CSS
└── tsconfig.json         # Configuración de TypeScript
```

---

## 🧩 Componentes

### **App.tsx** (Componente Principal)
Componente raíz que orquesta toda la aplicación.

**Responsabilidades:**
- Gestiona el estado global de trayectos seleccionados
- Controla la visibilidad de las vistas de estadísticas
- Procesa datos descargados del servidor
- Coordina la comunicación entre todos los componentes
- Envuelve la aplicación con `AuthProvider`

**Estructura:**
```tsx
App
├── AuthProvider (Context wrapper)
└── AppContent
    ├── MapViewer (mapa principal)
    ├── LoginModal (si no autenticado)
    ├── Indicador de barco (superior izquierda)
    ├── JourneySelector (panel lateral)
    └── Vistas de estadísticas (condicionales)
        ├── SpeedProfile
        ├── ActivityDistribution
        └── JourneyComparison
```

---

### **LoginModal.tsx** (Autenticación)
Modal de inicio de sesión que aparece cuando el usuario no está autenticado.

**Responsabilidades:**
- Captura credenciales del usuario (usuario y contraseña)
- Maneja el proceso de login a través de `AuthContext`
- Muestra estados de carga (spinner)
- Cierra automáticamente tras login exitoso

**Características:**
- Diseño oscuro con fondo difuminado
- Inputs estilizados sin bordes externos
- Validación de campos requeridos
- Soporte para login con tecla Enter

---

### **JourneySelector.tsx** (Panel Lateral Unificado)
Panel lateral derecho que combina controles de descarga de datos y selección de trayectos.

**Responsabilidades:**
- **Sección "Pedir Datos"** (desplegable):
  - Selector de barco
  - Inputs de fecha/hora de inicio y fin
  - Botón de descarga de datos del servidor
- **Sección "Trayectos"**:
  - Botón de estadísticas
  - Checkbox "Seleccionar Todos"
  - Lista agrupada por día de trayectos disponibles
  - Checkboxes individuales para cada trayecto

**Estructura de datos:**
```
Trayectos agrupados por día:
├── 12/11/2025 (3 trayectos) ← Desplegable
│   ├── Trayecto 1: Tanger Med → Algeciras
│   ├── Trayecto 2: Algeciras → Tanger Med
│   └── Trayecto 3: Incompleto
└── 13/11/2025 (2 trayectos)
```

**Interacciones:**
- Click en fecha → Expande/colapsa trayectos del día
- Click en checkbox de fecha → Selecciona/deselecciona todos los trayectos del día
- Click en trayecto individual → Toggle selección
- Click en "Pedir Datos" → Expande/colapsa controles de descarga

---

### **MapViewer.tsx** (Visualización de Mapas)
Componente que renderiza el mapa interactivo con Leaflet y muestra las rutas marítimas.

**Responsabilidades:**
- Inicializa el mapa de Leaflet centrado en el Estrecho de Gibraltar
- Dibuja polylines (rutas) de los trayectos seleccionados
- Renderiza marcadores de inicio/fin de intervalos
- Gestiona tooltips interactivos con información en tiempo real
- Optimiza el renderizado para grandes volúmenes de datos

**Características técnicas:**
- **Simplificación adaptativa de rutas**: Reduce puntos manteniendo precisión geométrica
- **Detección de curvatura**: Analiza la complejidad de las rutas para optimizar renderizado
- **Tooltips de proximidad**: Muestra información cuando el cursor está cerca de una ruta
- **Marcadores especiales**: Indica finales de trayectos completos
- **Sistema de colores**: Cada trayecto tiene un color único para identificación

**Optimizaciones:**
```tsx
Análisis de ruta:
- Longitud total
- Complejidad de curvatura
- Densidad de puntos óptima

Estrategias de simplificación:
- Rutas muy curvas → Mantener 80-90% puntos
- Rutas largas con curvas → Mantener 60-70% puntos
- Rutas rectas → Mantener 40-50% puntos
```

**Tooltips interactivos:**
- Muestran velocidad interpolada en tiempo real
- Progreso en la trayectoria (%)
- Duración y horarios del intervalo
- Estado de navegación y actividad

---

### **SpeedProfile.tsx** (Vista de Estadísticas - Velocidad)
Modal que muestra análisis detallado de velocidad por trayecto.

**Responsabilidades:**
- Renderiza gráficos de líneas con Chart.js
- Muestra velocidad a lo largo del tiempo
- Compara múltiples trayectos simultáneamente
- Incluye líneas de referencia (velocidad promedio, estado de navegación)

**Características:**
- Selector de vista entre Speed/Activity/Comparison
- Toggles para mostrar/ocultar líneas de referencia
- Leyenda interactiva con colores por trayecto
- Información resumida de cada trayecto seleccionado

---

### **ActivityDistribution.tsx** (Vista de Estadísticas - Actividad)
Modal que visualiza la distribución de actividades (navegando, atracado, etc.).

**Responsabilidades:**
- Gráfico de barras con distribución de actividades por trayecto
- Muestra porcentajes de tiempo en cada estado
- Permite comparar actividades entre múltiples trayectos
- Incluye totales y promedios

**Datos mostrados:**
- Navegando cerca de puertos
- Atracado en puerto
- Navegando en tránsito
- Estados especiales (gaps, datos incompletos)

---

### **JourneyComparison.tsx** (Vista de Estadísticas - Comparación)
Modal avanzado para comparación directa de dos grupos de trayectos.

**Responsabilidades:**
- Divide trayectos en dos grupos (A y B)
- Genera gráficos comparativos de velocidad
- Calcula estadísticas agregadas por grupo
- Muestra diferencias y similitudes

**Funcionalidad:**
- Selector de trayectos independiente para cada grupo
- Gráficos superpuestos con colores diferenciados
- Métricas comparativas (velocidad media, duración total, distancia)

---

## 🔧 Contexts

### **AuthContext.tsx** (Estado de Autenticación Global)
Proporciona estado y funciones de autenticación a toda la aplicación.

**Estado gestionado:**
```tsx
{
  isLoading: boolean          // Estado de carga
  isAuthenticated: boolean    // Si el usuario está autenticado
  error: string | null        // Mensajes de error
  ships: Ship[]               // Lista de barcos disponibles
  sessionId: string | null    // ID de sesión del servidor
  username: string | null     // Nombre del usuario autenticado
}
```

**Funciones expuestas:**
- `login(credentials)` → Autentica al usuario en el servidor
- `logout()` → Cierra la sesión
- `fetchData(dateRange)` → Descarga datos CSV del servidor
- `fetchShips()` → Obtiene lista de barcos disponibles

**Comunicación con backend:**
```
POST /api/login          → Autenticación
POST /api/logout         → Cierre de sesión
POST /api/download       → Descarga de datos CSV
GET  /api/ships          → Lista de barcos
```

---

## 🎣 Hooks

### **useCSVInterval.ts** (Procesamiento de Datos CSV)
Hook personalizado que procesa datos CSV crudos y los convierte en trayectos e intervalos estructurados.

**Responsabilidades:**
- Recibe datos crudos del servidor (`RawDataRow[]`)
- Detecta cambios de estado de navegación (navStatus)
- Agrupa filas en intervalos por actividad
- Clasifica intervalos (navegando, atracado, en tránsito)
- Agrupa intervalos en trayectos completos
- Detecta puertos de origen y destino
- Calcula estadísticas (velocidad media, duración, distancia)

**Flujo de procesamiento:**
```
RawDataRow[] (del servidor)
    ↓
Detección de cambios de estado
    ↓
Agrupación en intervalos
    ↓
Clasificación de actividad
    ↓
Agrupación en trayectos
    ↓
Cálculo de estadísticas
    ↓
CSVIntervalResult (estructura final)
```

**Estructura de salida:**
```tsx
{
  success: true,
  data: {
    journeys: Journey[],      // Trayectos completos
    summary: {
      totalIntervals: number,
      totalJourneys: number,
      // ... más estadísticas
    }
  }
}
```

**Tipos de datos:**
```tsx
Journey {
  journeyIndex: number
  intervals: Interval[]
  metadata: {
    startDate: string
    endDate: string
    startPort: string
    endPort: string
    totalDuration: string
    isIncomplete: boolean
  }
}

Interval {
  intervalNumber: number
  journeyIndex: number
  classificationType: string
  navStatus: string
  avgSpeed: number
  duration: string
  coordinatePoints: Point[]
  startTime: string
  endTime: string
}
```

---

## 📚 Librerías Auxiliares

### **lib/colors.ts**
Genera colores únicos y consistentes para cada trayecto.

**Función principal:**
```tsx
getJourneyColor(journeyIndex: number): string
```

Retorna colores HEX basados en una paleta predefinida, ciclando cuando hay más trayectos que colores disponibles.

---

### **lib/utils.ts**
Utilidades generales de Tailwind CSS.

**Función principal:**
```tsx
cn(...inputs): string  // Combina clases CSS condicionalmente
```

---

## 🎨 Componentes UI

### **ui/button.tsx**
Componente reutilizable de botón con variantes y estados.

### **ui/card.tsx**
Componentes Card y CardContent para contenedores estilizados.

### **ui/label.tsx**
Componente Label para etiquetas de formularios.

---

## 🗂️ Layouts

### **Layout.astro**
Layout base de Astro que envuelve todas las páginas.

**Incluye:**
- Configuración HTML base
- Meta tags
- Importación de Leaflet CSS/JS
- Variables CSS globales
- Estilos para scrollbars personalizados
- Estilos para select y datetime-local

---

## 📄 Páginas

### **pages/index.astro**
Punto de entrada de la aplicación.

**Estructura:**
```astro
<Layout title="Dashboard">
  <App client:only="react" />
</Layout>
```

El atributo `client:only="react"` asegura que el componente React se renderice solo en el cliente.

---

## 🔄 Flujo de Datos

```
Usuario → Login
    ↓
AuthContext guarda sesión
    ↓
JourneySelector visible
    ↓
Usuario selecciona barco + fechas → Click "Descargar"
    ↓
AuthContext.fetchData() → POST al backend
    ↓
Backend devuelve RawDataRow[]
    ↓
useCSVInterval.processRawData()
    ↓
Genera Journeys e Intervals
    ↓
MapViewer dibuja rutas
    ↓
JourneySelector lista trayectos
    ↓
Usuario selecciona trayectos
    ↓
MapViewer actualiza visualización
    ↓
Usuario abre estadísticas
    ↓
SpeedProfile/ActivityDistribution/JourneyComparison
```

---

## 🎯 Patrones de Diseño Utilizados

### **Composition Pattern**
Los componentes se componen jerárquicamente, cada uno con responsabilidad única.

### **Container/Presentational Pattern**
- `App.tsx` = Container (lógica de estado)
- Componentes de estadísticas = Presentational (reciben datos via props)

### **Custom Hooks Pattern**
`useCSVInterval` encapsula lógica compleja de procesamiento, reutilizable y testeable.

### **Context Pattern**
`AuthContext` provee estado de autenticación sin prop drilling.

---

## 🔑 Conceptos Clave

### **Trayecto (Journey)**
Un viaje completo de un puerto a otro, compuesto por múltiples intervalos.

### **Intervalo (Interval)**
Segmento de la ruta con estado de navegación homogéneo (ej: "Navegando cerca de Algeciras").

### **RawDataRow**
Fila de datos cruda del CSV con timestamp, coordenadas, velocidad, navStatus, etc.

### **CSVIntervalResult**
Resultado procesado que contiene journeys estructurados y estadísticas.

---

## 🎨 Estilo y Diseño

### **Framework CSS**
Tailwind CSS para estilos utilitarios y diseño responsive.

### **Tema**
- **Paleta principal**: Grises oscuros (gray-700, gray-800, gray-900)
- **Acentos**: Azul (blue-600, blue-700) para acciones primarias
- **Estados**: Verde (éxito), Naranja (incompleto), Rojo (error)

### **Consistencia visual**
- Bordes redondeados (`rounded-lg`, `rounded-xl`)
- Fondos semitransparentes con blur (`backdrop-blur-md`)
- Sombras para profundidad (`shadow-lg`, `shadow-xl`)
- Líneas divisorias grises (`border-gray-600`)

---

## 📊 Visualización de Datos

### **Leaflet (Mapas)**
- Tiles de CartoDB Voyager (estilo limpio)
- Centro: Estrecho de Gibraltar (36.0°N, 5.4°W)
- Zoom inicial: 10
- Sin controles de zoom (minimalista)

### **Chart.js (Gráficos)**
- Gráficos de líneas para velocidad en el tiempo
- Gráficos de barras para distribución de actividades
- Tooltips personalizados con información detallada
- Colores consistentes con los trayectos del mapa

---

## 🚀 Tecnologías

- **Astro**: Framework web para renderizado híbrido
- **React**: Librería UI para componentes interactivos
- **TypeScript**: Tipado estático para mayor robustez
- **Tailwind CSS**: Framework de utilidades CSS
- **Leaflet**: Librería de mapas interactivos
- **Chart.js**: Librería de gráficos
- **Lucide React**: Iconos SVG

---

## 📝 Convenciones de Código

### **Nombrado de componentes**
- PascalCase para componentes: `MapViewer`, `LoginModal`
- camelCase para funciones: `handleDownload`, `toggleJourney`
- UPPER_SNAKE_CASE para constantes: `SERVER_URL`

### **Organización de imports**
```tsx
1. React y hooks
2. Componentes UI propios
3. Contexts
4. Librerías externas
5. Tipos e interfaces
```

### **Props de componentes**
Siempre definidas con TypeScript interfaces para claridad y autocomplete.

---

## 🔍 Puntos de Integración

### **Backend API**
El frontend se comunica con el backend Express en `http://localhost:3000` a través de `AuthContext`.

### **Procesamiento CSV**
Los datos del servidor ya vienen preprocesados. `useCSVInterval` se encarga de la lógica de agrupación en trayectos.

### **Estado compartido**
- `AuthContext`: Sesión y autenticación
- Props drilling: Trayectos seleccionados (desde App a componentes hijos)

