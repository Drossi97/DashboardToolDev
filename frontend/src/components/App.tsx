import React, { useState, useRef } from "react"
import { useCSVInterval, type RawDataRow } from "../hooks/useCSVInterval"
import { LoginModal } from "./LoginModal"
import { ServerDataSelector } from "./ServerDataSelector"
import { useAuth } from "../contexts/AuthContext"
import MapViewer, { MapViewerRef } from "./MapViewer"
import JourneySelector from "./JourneySelector"
import SpeedProfile from "./SpeedProfile"
import ActivityDistribution from "./ActivityDistribution"
import JourneyComparison from "./JourneyComparison"

export default function App() {
  const [selectedJourneys, setSelectedJourneys] = useState<Set<number>>(new Set())
  const [showStats, setShowStats] = useState(false)
  const [activeStatsView, setActiveStatsView] = useState<'speed' | 'activity' | 'comparison'>('speed')
  
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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white">
      {/* Mapa */}
      <MapViewer 
        ref={mapViewerRef}
        csvResults={csvProcessor.results}
        selectedJourneys={selectedJourneys}
      />

      {/* Modal de login - solo si no está autenticado */}
      {!isAuthenticated && (
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      )}

      {/* Selector de datos del servidor - aparece cuando está autenticado */}
      {isAuthenticated && (
        <ServerDataSelector
          onDataDownloaded={handleDataDownloaded}
        />
      )}

      {/* Selector de trayectos - solo mostrar cuando está autenticado */}
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