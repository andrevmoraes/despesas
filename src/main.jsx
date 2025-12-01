import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration.scope)
      })
      .catch((error) => {
        console.log('Falha ao registrar Service Worker:', error)
      })
  })
}

// Log inicial para diagnóstico (versão do React e userAgent)
try {
  console.log('main.jsx inicializando', {
    reactVersion: React?.version || null,
    userAgent: navigator.userAgent
  })
} catch (e) {
  console.log('Erro ao logar main.jsx', e)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)

