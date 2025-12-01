import React, { useState } from 'react'
import Alert from './components/Alert'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Streamings from './pages/Streamings'
import Users from './pages/Users'
import BottomNav from './components/BottomNav'
import './styles/global.css'
import './styles/tiles.css'
import './styles/buttons.css'
import './styles/forms.css'
import './styles/navigation.css'

function AppContent() {
  const { user, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [alert, setAlert] = useState({ message: '', type: 'info' })

  const showAlert = (message, type = 'info') => setAlert({ message, type })
  const closeAlert = () => setAlert({ message: '', type: 'info' })

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        Carregando...
      </div>
    )
  }

  if (!user) {
    return <Login showAlert={showAlert} />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard showAlert={showAlert} />
      case 'streamings':
        return <Streamings showAlert={showAlert} />
      case 'users':
        return <Users showAlert={showAlert} />
      default:
        return <Dashboard showAlert={showAlert} />
    }
  }

  return (
    <div className="page-content">
      <Alert message={alert.message} type={alert.type} onClose={closeAlert} />
      {renderPage()}
      <BottomNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  )
}

function App() {
  try {
    console.log('App component render - reactVersion:', React?.version)
  } catch (e) {
    console.log('App: erro ao logar versão do React', e)
  }
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
