import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Download, Loader2 } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

interface RawDataRow {
  timestamp: string
  date: string
  time: string
  latitude: number | null
  longitude: number | null
  speed: number | null
  navStatus: string
  isGapMarker?: boolean
  gapDuration?: string
  [key: string]: any
}

interface ServerDataSelectorProps {
  onDataDownloaded?: (data: RawDataRow[]) => void
}

export function ServerDataSelector({ onDataDownloaded }: ServerDataSelectorProps) {
  const { isLoading, isAuthenticated, ships, fetchData, fetchShips } = useAuth()
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedShip, setSelectedShip] = useState("ceuta-jet")

  // Cargar lista de barcos
  useEffect(() => {
    fetchShips()
  }, [])

  const handleDownload = async () => {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)

      const result = await fetchData({ start, end, shipId: selectedShip })

      if (result.success && result.data && result.meta) {
        alert(`✔ Descargados ${result.meta.totalRows} filas (${result.meta.filesProcessed} archivos, ${result.meta.gapsDetected} gaps detectados)`)
        if (onDataDownloaded) {
          onDataDownloaded(result.data)
        }
      } else {
        alert(`✖ Error: ${result.error}`)
      }
    } catch (err) {
      alert(`✖ Error: ${err instanceof Error ? err.message : "Error desconocido"}`)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="absolute top-4 left-4 z-[9998] flex items-center gap-3">
      {/* Selector de barco */}
      <select
        id="ship"
        value={selectedShip}
        onChange={(e) => setSelectedShip(e.target.value)}
        disabled={isLoading}
        className="h-10 rounded-lg bg-gray-800/95 backdrop-blur-md border border-gray-700/50 px-4 text-white text-sm font-medium outline-none shadow-lg hover:bg-gray-700/95 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ships.length > 0 ? (
          ships.map((ship) => (
            <option key={ship.id} value={ship.id} className="bg-gray-800">
              {ship.name}
            </option>
          ))
        ) : (
          <>
            <option value="ceuta-jet" className="bg-gray-800">Ceuta Jet</option>
            <option value="tanger-express" className="bg-gray-800">Tanger Express</option>
            <option value="kattegat" className="bg-gray-800">Kattegat</option>
          </>
        )}
      </select>

      {/* Fecha inicio */}
      <input
        id="startDate"
        type="datetime-local"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        disabled={isLoading}
        className="h-10 rounded-lg bg-gray-800/95 backdrop-blur-md border border-gray-700/50 px-4 text-white text-sm outline-none shadow-lg hover:bg-gray-700/95 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      />

      {/* Fecha fin */}
      <input
        id="endDate"
        type="datetime-local"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        disabled={isLoading}
        className="h-10 rounded-lg bg-gray-800/95 backdrop-blur-md border border-gray-700/50 px-4 text-white text-sm outline-none shadow-lg hover:bg-gray-700/95 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      />

      {/* Botón descargar */}
      <Button 
        onClick={handleDownload} 
        disabled={isLoading || !startDate || !endDate}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold px-6 h-10 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Descargando...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </>
        )}
      </Button>
    </div>
  )
}

