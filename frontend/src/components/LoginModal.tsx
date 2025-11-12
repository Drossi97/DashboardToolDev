import { useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Label } from "./ui/label"
import { Globe, User, Lock, ChevronRight, Loader2 } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

interface LoginModalProps {
  onLoginSuccess: () => void
}

export function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const { isLoading, error, login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async () => {
    const success = await login({ username, password })
    if (success) {
      // Cerrar el modal después de 500ms
      setTimeout(() => {
        onLoginSuccess()
      }, 500)
    } else {
      // El error se muestra a través del contexto
      alert("✖ Error al iniciar sesión")
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <div className="relative">
          {/* Fondo con blur */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl"></div>
          
          <Card className="relative bg-gradient-to-br from-gray-800/95 to-gray-900/95 border-2 border-gray-500/60 shadow-2xl backdrop-blur-md ring-1 ring-white/10">
            <CardContent className="p-8">
              <div className="space-y-6 pt-6">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg mb-4">
                    <Globe className="h-8 w-8 text-blue-100" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Dashboard Tool</h3>
                  <p className="text-gray-400">Inicia sesión para acceder al sistema</p>
                </div>

                {/* Formulario */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username" className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Usuario
                    </Label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nombre de usuario"
                      disabled={isLoading}
                      className="flex w-full rounded-lg bg-gray-700/80 px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:bg-gray-600/80 h-12 shadow-inner transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Contraseña
                    </Label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña"
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && username && password) {
                          handleLogin()
                        }
                      }}
                      className="flex w-full rounded-lg bg-gray-700/80 px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:bg-gray-600/80 h-12 shadow-inner transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  <Button 
                    onClick={handleLogin} 
                    disabled={isLoading || !username || !password}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-4 text-base shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Iniciando sesión...
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-5 w-5 mr-2" />
                        Iniciar Sesión
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

