import { useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Alert from './components/Alert'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import DashboardSkeleton from './components/DashboardSkeleton'
import './styles/global.css'
import './styles/metro.css'
import './styles/tiles.css'
import './styles/buttons.css'
import './styles/forms.css'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Streamings = lazy(() => import('./pages/Streamings'))
const Users = lazy(() => import('./pages/Users'))

function AppContent() {
  const { user, loading, error } = useAuth()
  const [alert, setAlert] = useState({ message: '', type: 'info' })

  const showAlert = (message, type = 'info') => setAlert({ message, type })
  const closeAlert = () => setAlert({ message: '', type: 'info' })

  if (error) {
    return (
      <div className="metro-page metro-page--centered">
        <div className="metro-panel metro-panel--plain" style={{ textAlign: 'center', maxWidth: '420px' }}>
          <h2 className="metro-panel__title metro-title--danger" style={{ marginBottom: '16px' }}>Erro de Configuração</h2>
          <p style={{ marginBottom: '20px' }}>{error}</p>
          <p className="metro-text-muted" style={{ fontSize: '14px' }}>
            Verifique o arquivo <code>.env</code> na raiz do projeto e reinicie o servidor. Use <code>VITE_PUBLIC_SUPABASE_URL</code> e <code>VITE_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="metro-page metro-page--centered">
          <div className="metro-spinner"></div>
        </div>
      }>
        <Login showAlert={showAlert} />
      </Suspense>
    )
  }

  return (
    <BrowserRouter>
      <Alert message={alert.message} type={alert.type} onClose={closeAlert} />
      <Suspense fallback={
        <div className="metro-page metro-page--centered">
          <div className="metro-spinner"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Dashboard showAlert={showAlert} />} />
          <Route path="/streamings" element={<Streamings showAlert={showAlert} />} />
          <Route path="/usuarios" element={<Users showAlert={showAlert} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
