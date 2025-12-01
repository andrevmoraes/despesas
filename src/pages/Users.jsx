import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import '../styles/forms.css'
import '../styles/buttons.css'
import '../styles/tiles.css'

export default function Users({ showAlert }) {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    is_admin: false
  })

  useEffect(() => {
    carregarUsers()
  }, [])

  const carregarUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('nome')

      if (error) throw error

      setUsers(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      setLoading(false)
    }
  }

  const formatarTelefone = (value) => {
    const numbers = value.replace(/\D/g, '')

    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})(\d)/g, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
    }

    // Mantém apenas os 11 primeiros dígitos e formata
    const trimmed = numbers.slice(0, 11)
    return trimmed
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const telefoneNumeros = formData.telefone.replace(/\D/g, '')

      if (telefoneNumeros.length !== 11) {
        showAlert('Telefone deve ter 11 dígitos (DDD + número)', 'error')
        setLoading(false)
        return
      }

      if (editando) {
        // Atualizar usuário existente
        const { error } = await supabase
          .from('users')
          .update({
            nome: formData.nome,
            telefone: telefoneNumeros,
            is_admin: formData.is_admin
          })
          .eq('id', editando.id)

        if (error) throw error
      } else {
        // Inserir novo usuário
        const { error } = await supabase
          .from('users')
          .insert({
            nome: formData.nome,
            telefone: telefoneNumeros,
            is_admin: formData.is_admin
          })

        if (error) throw error
      }

      await carregarUsers()
      
      setFormData({
        nome: '',
        telefone: '',
        is_admin: false
      })
      setEditando(null)
      setShowModal(false)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      alert('Erro ao salvar usuário. Telefone pode já estar cadastrado.')
      setLoading(false)
    }
  }

  const abrirEdicao = (userToEdit) => {
    setEditando(userToEdit)
    setFormData({
      nome: userToEdit.nome,
      telefone: userToEdit.telefone.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'),
      is_admin: userToEdit.is_admin
    })
    setShowModal(true)
  }

  const abrirNovo = () => {
    setEditando(null)
    setFormData({
      nome: '',
      telefone: '',
      is_admin: false
    })
    setShowModal(true)
  }

  const deletarUser = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error

      await carregarUsers()
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      alert('Erro ao deletar usuário')
    }
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: 'var(--spacing-xl)' }}>
        <h1>Acesso Negado</h1>
        <p>Apenas administradores podem gerenciar usuários.</p>
      </div>
    )
  }

  if (loading && users.length === 0) {
    return <div className="container" style={{ padding: 'var(--spacing-xl)' }}>
      Carregando...
    </div>
  }

  return (
    <div className="container" style={{ padding: 'var(--spacing-xl) var(--spacing-md)' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 'var(--spacing-xl)'
      }}>
        <h1 style={{ fontWeight: 'var(--font-weight-light)' }}>
          Usuários
        </h1>
        <button 
          onClick={abrirNovo} 
          className="btn btn--primary"
        >
          + Adicionar
        </button>
      </div>

      <div className="tile-grid">
        {users.map((u, index) => {
          const cores = ['primary', 'secondary', 'success', 'accent', 'purple']
          const cor = cores[index % cores.length]
          
          return (
            <div key={u.id} className={`tile tile--${cor}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div className="tile__title">{u.nome}</div>
                  <div className="tile__subtitle">
                    {u.telefone.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                  <button 
                    onClick={() => abrirEdicao(u)}
                    className="btn btn--small btn--secondary"
                    style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  {u.id !== user.id && (
                    <button 
                      onClick={() => deletarUser(u.id)}
                      className="btn btn--small btn--danger"
                      style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                      title="Deletar"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
              
              {u.is_admin && (
                <div style={{ 
                  marginTop: 'var(--spacing-md)',
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  display: 'inline-block'
                }}>
                  ADMIN
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--spacing-md)',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: 'var(--spacing-xl)',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h2 style={{ 
              marginBottom: 'var(--spacing-lg)',
              fontWeight: 'var(--font-weight-light)'
            }}>
              {editando ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="João Silva"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatarTelefone(e.target.value) })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  />
                  <span>É administrador?</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                <button 
                  type="button"
                  onClick={() => setShowModal(false)} 
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn--primary"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
