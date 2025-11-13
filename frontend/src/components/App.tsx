import React, { useState, useRef } from "react"
import { useCSVInterval, type RawDataRow } from "../hooks/useCSVInterval"
import { LoginModal } from "./LoginModal"
import { AuthProvider, useAuth } from "../contexts/AuthContext"
import MapViewer, { MapViewerRef } from "./MapViewer"
import JourneySelector from "./JourneySelector"
import SpeedProfile from "./SpeedProfile"
import ActivityDistribution from "./ActivityDistribution"
import JourneyComparison from "./JourneyComparison"

function AppContent() {
  const [selectedJourneys, setSelectedJourneys] = useState<Set<number>>(new Set())
  const [showStats, setShowStats] = useState(false)
  const [activeStatsView, setActiveStatsView] = useState<'speed' | 'activity' | 'comparison'>('speed')
  const [currentShipName, setCurrentShipName] = useState<string>("")
  
  const csvProcessor = useCSVInterval()
  const mapViewerRef = useRef<MapViewerRef>(null)
  const { isAuthenticated } = useAuth()

  // Procesar datos descargados del servidor
  const handleDataDownloaded = async (rawData: RawDataRow[]) => {
    if (rawData.length === 0 || csvProcessor.isProcessing) return

    try {
      console.log(`→ Procesando ${rawData.length} filas descargadas del servidor...`)
      
      // Pasar datos directamente a useCSVInterval (ya vienen procesados)
      const result = await csvProcessor.processRawData(rawData)
      
      if (result?.success && 'data' in result && result.data) {
        console.log(`✔ Datos procesados:`)
        console.log(`  • Trayectos: ${result.data.journeys.length}`)
        console.log(`  • Intervalos: ${result.data.summary.totalIntervals}`)
      }
    } catch (error) {
      console.error("Error procesando datos descargados:", error)
    }
  }

  // Manejar login exitoso
  const handleLoginSuccess = () => {
    // El modal se cerrará automáticamente
  }

  // Alternar selección de trayecto
  const toggleJourneySelection = (journeyIndex: number) => {
    
    const newSelectedJourneys = new Set(selectedJourneys)
    if (newSelectedJourneys.has(journeyIndex)) {
      newSelectedJourneys.delete(journeyIndex)
    } else {
      newSelectedJourneys.add(journeyIndex)
    }
    
    setSelectedJourneys(newSelectedJourneys)
  }

  // Seleccionar todos los trayectos
  const selectAllJourneys = () => {
    if (!csvProcessor.results?.data?.journeys) return
    
    // Extraer todos los journeyIndex de los journeys
    const allJourneyIndexes = new Set<number>(
      csvProcessor.results.data.journeys.map(journey => journey.journeyIndex)
    )
    
    setSelectedJourneys(allJourneyIndexes)
  }

  // Deseleccionar todos los trayectos
  const deselectAllJourneys = () => {
    setSelectedJourneys(new Set())
  }

  // Alternar múltiples trayectos de una vez
  const toggleMultipleJourneys = (journeyIndices: number[]) => {
    const newSelectedJourneys = new Set(selectedJourneys)
    const allSelected = journeyIndices.every(index => newSelectedJourneys.has(index))
    
    if (allSelected) {
      // Deseleccionar todos
      journeyIndices.forEach(index => {
        newSelectedJourneys.delete(index)
      })
    } else {
      // Seleccionar todos
      journeyIndices.forEach(index => {
        newSelectedJourneys.add(index)
      })
    }
    
    setSelectedJourneys(newSelectedJourneys)
  }

  // Manejar cambio de barco
  const handleShipChange = (shipId: string, shipName: string) => {
    setCurrentShipName(shipName)
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white">
      {/* Mapa */}
      <MapViewer 
        ref={mapViewerRef}
        csvResults={csvProcessor.results}
        selectedJourneys={selectedJourneys}
      />

      {/* Indicador de barco - superior izquierda */}
      {isAuthenticated && currentShipName && csvProcessor.results?.success && csvProcessor.results.data && (
        <div className="absolute top-4 left-4 z-[9997] flex items-center gap-2">
          <svg className="h-5 w-5 drop-shadow-lg" fill="#2563EB" viewBox="0 0 24 24">
            <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v-2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.32-.42-.58-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.46.26-.58.5s-.15.52-.06.78L3.95 19z"/>
          </svg>
          <p className="font-bold text-sm drop-shadow-lg" style={{ color: '#4D6882' }}>
            {currentShipName}
          </p>
        </div>
      )}

      {/* Modal de login - solo si no está autenticado */}
      {!isAuthenticated && (
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      )}

      {/* Panel lateral unificado - solo mostrar cuando está autenticado */}
      {isAuthenticated && (
        <JourneySelector
          csvResults={csvProcessor.results}
          selectedJourneys={selectedJourneys}
          onToggleJourney={toggleJourneySelection}
          onShowStats={() => setShowStats(true)}
          onStatsViewChange={setActiveStatsView}
          onSelectAll={selectAllJourneys}
          onDeselectAll={deselectAllJourneys}
          onToggleMultipleJourneys={toggleMultipleJourneys}
          onDataDownloaded={handleDataDownloaded}
          onShipChange={handleShipChange}
        />
      )}

      {/* Estadísticas - Vista unificada */}
      {activeStatsView === 'speed' && (
        <SpeedProfile
          csvResults={csvProcessor.results}
          selectedJourneys={selectedJourneys}
          isVisible={showStats}
          onClose={() => setShowStats(false)}
          onViewChange={setActiveStatsView}
        />
      )}
      
      {activeStatsView === 'activity' && (
        <ActivityDistribution
          csvResults={csvProcessor.results}
          selectedJourneys={selectedJourneys}
          isVisible={showStats}
          onClose={() => setShowStats(false)}
          onViewChange={setActiveStatsView}
        />
      )}
      
      {activeStatsView === 'comparison' && (
        <JourneyComparison
          csvResults={csvProcessor.results}
          selectedJourneys={selectedJourneys}
          journeys={csvProcessor.results?.data?.journeys || []}
          intervalData={[]}
          colors={{}}
          isVisible={showStats}
          onClose={() => setShowStats(false)}
          onViewChange={setActiveStatsView}
        />
      )}

    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}