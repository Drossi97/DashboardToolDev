import { AuthProvider } from '../contexts/AuthContext'
import App from './App'

export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}

