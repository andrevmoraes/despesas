import { useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Alert from './components/Alert'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import DashboardSkeleton from './components/DashboardSkeleton'
import './styles/global.css'
import './styles/tiles.css'
import './styles/buttons.css'
import './styles/forms.css'

const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Streamings = lazy(() => import('./pages/Streamings'))
const Users = lazy(() => import('./pages/Users'))

function AppContent() {
  const { user, loading } = useAuth()
  const [alert, setAlert] = useState({ message: '', type: 'info' })

  const showAlert = (message, type = 'info') => setAlert({ message, type })
  const closeAlert = () => setAlert({ message: '', type: 'info' })

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #0078D7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #0078D7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
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
