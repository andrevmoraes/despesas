import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import '../styles/forms.css'
import '../styles/buttons.css'

export default function Login({ showAlert }) {
  const [telefone, setTelefone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const formatarTelefone = (value) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Formata (XX) XXXXX-XXXX
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/g, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
    }

    // Se ultrapassar, recorta para os 11 primeiros dígitos e formata
    const trimmed = numbers.slice(0, 11)
    return trimmed
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Remove formatação
    const telefoneNumeros = telefone.replace(/\D/g, '')

    if (telefoneNumeros.length !== 11) {
      showAlert('Telefone deve ter 11 dígitos (DDD + número)', 'error')
      setLoading(false)
      return
    }

    const result = await login(telefoneNumeros)
    if (!result.success) {
      showAlert(result.error || 'Erro ao fazer login', 'error')
    }
    setLoading(false)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 'var(--spacing-md)'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px',
        backgroundColor: 'var(--bg-secondary)',
        padding: 'var(--spacing-xl)',
        borderLeft: '4px solid var(--primary)'
      }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'var(--font-weight-light)',
          marginBottom: 'var(--spacing-lg)',
          color: 'var(--primary)'
        }}>
          despesas
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input
              type="tel"
              className="form-input"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              disabled={loading}
            />
            <div className="form-helper">
              Digite seu número de telefone cadastrado
            </div>
          </div>

          {error && (
            <div className="form-error" style={{ marginBottom: 'var(--spacing-md)' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn--primary btn--block btn--large"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
