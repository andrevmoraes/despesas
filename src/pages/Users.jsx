import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardSkeleton from '../components/DashboardSkeleton'
import '../styles/forms.css'

// Metro Colors (Windows Phone)
const MetroColors = {
  blue: 'var(--primary)',
  green: 'var(--success)',
  orange: 'var(--accent)',
  purple: 'var(--wp-purple)',
  red: 'var(--danger)',
  yellow: 'var(--wp-lime)'
}

// Metro Tile Component
const MetroTile = ({ color, onClick, children, style, className = '', hoverable = true }) => {
  return (
    <div 
      className={`metro-tile ${hoverable ? 'metro-tile--interactive' : ''} ${className}`}
      onClick={onClick}
      style={{ 
        backgroundColor: color,
        minHeight: '160px',
        ...style 
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

function Users({ showAlert }) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
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
      console.error('Erro ao carregar pessoas:', error)
      setLoading(false)
    }
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 11) return phone
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`
  }

  const formatarTelefone = (value) => {
    let numbers = value.replace(/\D/g, '')
    if (numbers.length > 0 && !numbers.startsWith('1')) {
      numbers = '1' + numbers
    }
    numbers = numbers.slice(0, 11)
    return numbers
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
        const { error } = await supabase
          .from('users')
          .update({
            nome: formData.nome,
            telefone: telefoneNumeros,
            is_admin: formData.is_admin
          })
          .eq('id', editando.id)

        if (error) throw error
        showAlert('Pessoa atualizada com sucesso', 'success')
      } else {
        const { error } = await supabase
          .from('users')
          .insert({
            nome: formData.nome,
            telefone: telefoneNumeros,
            is_admin: formData.is_admin
          })

        if (error) throw error
        showAlert('Pessoa criada com sucesso', 'success')
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
      showAlert('Erro ao salvar pessoa', 'error')
      setLoading(false)
    }
  }

  const abrirEdicao = (user) => {
    setEditando(user)
    setFormData({
      nome: user.nome,
      telefone: formatPhone(user.telefone),
      is_admin: user.is_admin
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

  const deletarUsuario = async (id) => {
    if (!confirm('Tem certeza que deseja remover esta pessoa do grupo?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error

      showAlert('Pessoa removida com sucesso', 'success')
      await carregarUsers()
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      showAlert('Erro ao remover pessoa', 'error')
    }
  }

  if (!isAdmin) {
    return (
      <div className="metro-page metro-page--centered">
        <div className="metro-panel metro-panel--plain" style={{ textAlign: 'center', maxWidth: '420px' }}>
          <h2 className="metro-panel__title">acesso negado</h2>
          <p className="metro-text-muted" style={{ marginBottom: '24px' }}>apenas administradores podem gerenciar pessoas</p>
          <button
            onClick={() => navigate('/')}
            className="btn btn--primary btn--block"
          >
            ← voltar ao dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading && users.length === 0) {
    return <DashboardSkeleton />
  }

  return (
    <div className="metro-page metro-page--with-nav">
      {/* Header Tile */}
      <MetroTile 
        color={MetroColors.blue}
        className="metro-tile-wide"
        hoverable={false}
        style={{ marginBottom: '16px' }}
      >
        <div className="metro-hero">
          <div style={{ flex: 1 }}>
            <h1 className="metro-hero__title">pessoas</h1>
            <p className="metro-hero__subtitle">
              {users.length} pessoa{users.length !== 1 ? 's' : ''} cadastrada{users.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="metro-icon-button"
          >
            ←
          </button>
        </div>
      </MetroTile>

      {/* Grid de Tiles */}
      <div className="metro-grid">
        {/* Tile Adicionar Nova Pessoa */}
        <MetroTile 
          color="var(--bg-secondary)"
          className="metro-tile--muted"
          onClick={abrirNovo}
        >
          <div className="metro-tile__center">
            <div className="metro-tile__icon">+</div>
            <span className="metro-tile__label">adicionar pessoa</span>
          </div>
        </MetroTile>

        {/* Tiles de Pessoas */}
        {users.map((pessoa) => (
          <MetroTile 
            key={pessoa.id}
            color={MetroColors.blue}
            onClick={() => abrirEdicao(pessoa)}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <h3 className="metro-tile__title" style={{ paddingRight: pessoa.is_admin ? '60px' : '0' }}>
                {pessoa.nome.toLowerCase()}
              </h3>

              {pessoa.is_admin && (
                <div className="metro-badge">
                  admin
                </div>
              )}
              
              <p className="metro-tile__meta">
                {formatPhone(pessoa.telefone)}
              </p>
            </div>
          </MetroTile>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="metro-modal-overlay" onClick={() => setShowModal(false)}>
          <div 
            className="metro-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="metro-modal__header">
              <h2 className="metro-modal__title">
                {editando ? 'editar pessoa' : 'nova pessoa'}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="metro-modal__body">
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nome da pessoa"
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
                  placeholder="(11) 98765-4321"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatarTelefone(e.target.value) })}
                  required
                />
                <div className="form-helper">Usado para login no app</div>
              </div>

              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  />
                  administrador (pode gerenciar pessoas)
                </label>
              </div>

              <div className="metro-modal__actions">
                {editando && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja remover esta pessoa do grupo?')) {
                        deletarUsuario(editando.id)
                        setShowModal(false)
                      }
                    }}
                    className="btn btn--danger"
                  >
                    remover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn--ghost"
                >
                  cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn--primary"
                >
                  {loading ? 'salvando...' : editando ? 'atualizar' : 'criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
