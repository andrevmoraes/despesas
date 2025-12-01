import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

// Diagnostic log: ajuda a identificar múltiplas cópias do React
try {
  console.log('AuthContext carregado', { reactVersion: React?.version, hasUseState: typeof React.useState === 'function' })
} catch (e) {
  console.log('AuthContext: erro no log diagnóstico', e)
}

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica se há usuário logado no localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (telefone) => {
    try {
      // Busca usuário pelo telefone
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telefone', telefone)
        .single()

      if (error) throw error

      if (data) {
        setUser(data)
        localStorage.setItem('user', JSON.stringify(data))
        return { success: true, user: data }
      }

      return { success: false, error: 'Usuário não encontrado' }
    } catch (error) {
      console.error('Erro no login:', error)
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin: user?.is_admin || false
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
