import React, { createContext, useContext, useState, ReactNode } from 'react'

interface LoginCredentials {
  username: string
  password: string
}

interface DateRange {
  start: Date
  end: Date
  shipId?: string
}

interface Ship {
  id: string
  name: string
}

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

interface FetchResult {
  success: boolean
  data?: RawDataRow[]
  meta?: {
    totalRows: number
    filesProcessed: number
    gapsDetected: number
  }
  error?: string
}

interface AuthContextType {
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  ships: Ship[]
  sessionId: string | null
  username: string | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  fetchData: (dateRange: DateRange) => Promise<FetchResult>
  fetchShips: () => Promise<Ship[]>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SERVER_URL = "http://localhost:3000"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [ships, setShips] = useState<Ship[]>([])

  const fetchShips = async (): Promise<Ship[]> => {
    try {
      const response = await fetch(`${SERVER_URL}/api/ships`)
      const result = await response.json()
      
      if (result.success && result.ships) {
        setShips(result.ships)
        return result.ships
      }
      return []
    } catch (err) {
      console.error("Error al obtener barcos:", err)
      return []
    }
  }

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      console.log(`→ Iniciando sesión: ${credentials.username}`)

      const response = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al hacer login')
      }

      setSessionId(data.sessionId)
      setUsername(credentials.username)
      setIsAuthenticated(true)
      console.log(`✔ Login exitoso (Session: ${data.sessionId})`)
      return true

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido al hacer login"
      setError(errorMsg)
      setIsAuthenticated(false)
      setSessionId(null)
      setUsername(null)
      console.error("✖ Error en login:", errorMsg)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const fetchData = async (dateRange: DateRange): Promise<FetchResult> => {
    if (!isAuthenticated || !sessionId) {
      return {
        success: false,
        error: "No autenticado. Debe hacer login primero."
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log(`→ Descargando datos: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`)

      const response = await fetch(`${SERVER_URL}/api/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
          shipId: dateRange.shipId || 'ceuta-jet'
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al descargar datos')
      }

      console.log(`✔ Datos descargados:`)
      console.log(`  • Total filas: ${result.meta.totalRows}`)
      console.log(`  • Archivos: ${result.meta.filesProcessed}`)
      console.log(`  • Gaps detectados: ${result.meta.gapsDetected}`)

      return {
        success: true,
        data: result.data,
        meta: result.meta
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Error desconocido al descargar datos"
      setError(errorMsg)
      console.error("✖ Error en descarga:", errorMsg)
      return {
        success: false,
        error: errorMsg
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    if (sessionId) {
      try {
        await fetch(`${SERVER_URL}/api/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId })
        })
      } catch (err) {
        console.error("Error al cerrar sesión:", err)
      }
    }

    setIsAuthenticated(false)
    setSessionId(null)
    setUsername(null)
    setError(null)
  }

  return (
    <AuthContext.Provider value={{
      isLoading,
      isAuthenticated,
      error,
      ships,
      sessionId,
      username,
      login,
      logout,
      fetchData,
      fetchShips
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

