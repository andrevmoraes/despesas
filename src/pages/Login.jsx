import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import '../styles/forms.css'
import '../styles/buttons.css'

function Login({ showAlert }) {
  const [telefone, setTelefone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const formatarTelefone = (value) => {
    // Remove tudo que não é número
    let numbers = value.replace(/\D/g, '')
    
    // Se começa com 1, mantém; senão, adiciona 1 no início
    if (numbers.length > 0 && !numbers.startsWith('1')) {
      numbers = '1' + numbers
    }
    
    // Limita a 11 dígitos (1 + DDD + 8 dígitos)
    numbers = numbers.slice(0, 11)
    
    // Formata (XX) XXXXX-XXXX
    return numbers
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
    <div className="metro-page metro-page--centered">
      <div className="metro-panel">
        <h1 className="metro-panel__title">despesas</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input
              type="tel"
              className="form-input"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              disabled={loading}
            />
            <div className="form-helper">
              Digite seu número de telefone (DDD + número)
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

export default Login
