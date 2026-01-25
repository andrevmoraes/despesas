import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import DashboardSkeleton from '../components/DashboardSkeleton'
import '../styles/forms.css'

// Metro Colors (Windows Phone)
const MetroColors = {
  blue: '#0078D7',
  green: '#00a300',
  orange: '#ff8c00',
  purple: '#a200ff',
  red: '#e51400',
  yellow: '#ffb900'
}

// Metro Tile Component
const MetroTile = ({ color, onClick, children, style }) => {
  return (
    <div 
      className="metro-tile metro-tile-hoverable"
      onClick={onClick}
      style={{ 
        backgroundColor: color,
        minHeight: '160px',
        padding: '20px',
        cursor: 'pointer',
        position: 'relative',
        ...style 
      }}
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
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#ffffff',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <h2 style={{
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: '1.5rem',
            fontWeight: 300,
            color: '#1f2937',
            marginBottom: '16px'
          }}>acesso negado</h2>
          <p style={{
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '24px'
          }}>apenas administradores podem gerenciar pessoas</p>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: MetroColors.blue,
              color: 'white',
              border: 'none',
              fontFamily: 'Segoe UI, sans-serif',
              fontSize: '0.875rem',
              textTransform: 'lowercase',
              cursor: 'pointer',
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
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
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#ffffff',
      padding: '16px',
      paddingBottom: '80px'
    }}>
      {/* Header Tile */}
      <MetroTile 
        color={MetroColors.blue}
        style={{ marginBottom: '16px', cursor: 'default' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: 'Segoe UI, sans-serif',
              fontSize: '3rem',
              fontWeight: 300,
              color: 'white',
              margin: 0,
              lineHeight: 1,
              textTransform: 'lowercase',
              letterSpacing: '-2px'
            }}>
              pessoas
            </h1>
            <p style={{
              fontFamily: 'Segoe UI, sans-serif',
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: '8px 0 0 0',
              textTransform: 'lowercase'
            }}>
              {users.length} pessoa{users.length !== 1 ? 's' : ''} cadastrada{users.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              fontSize: '1.25rem',
              cursor: 'pointer',
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          >
            ←
          </button>
        </div>
      </MetroTile>

      {/* Grid de Tiles */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '16px'
      }}>
        {/* Tile Adicionar Nova Pessoa */}
        <MetroTile 
          color="#e5e7eb"
          onClick={abrirNovo}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '3rem',
              color: '#9ca3af',
              marginBottom: '8px'
            }}>+</div>
            <span style={{
              fontFamily: 'Segoe UI, sans-serif',
              fontSize: '0.875rem',
              color: '#6b7280',
              textTransform: 'lowercase'
            }}>adicionar pessoa</span>
          </div>
        </MetroTile>

        {/* Tiles de Pessoas */}
        {users.map((pessoa, index) => (
          <MetroTile 
            key={pessoa.id}
            color={MetroColors.blue}
            onClick={() => abrirEdicao(pessoa)}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              position: 'relative'
            }}>
              <h3 style={{
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'white',
                margin: '0 0 4px 0',
                textTransform: 'lowercase',
                wordBreak: 'break-word',
                paddingRight: pessoa.is_admin ? '60px' : '0'
              }}>
                {pessoa.nome.toLowerCase()}
              </h3>

              {pessoa.is_admin && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  color: 'white',
                  textTransform: 'lowercase',
                  fontFamily: 'Segoe UI, sans-serif'
                }}>
                  admin
                </div>
              )}
              
              <p style={{
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: 0
              }}>
                {formatPhone(pessoa.telefone)}
              </p>
            </div>
          </MetroTile>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px'
        }}
        onClick={() => setShowModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              backgroundColor: MetroColors.blue,
              padding: '24px',
              color: 'white'
            }}>
              <h2 style={{
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '1.5rem',
                fontWeight: 300,
                margin: 0,
                textTransform: 'lowercase'
              }}>
                {editando ? 'editar pessoa' : 'nova pessoa'}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
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
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontFamily: 'Segoe UI, sans-serif',
                  fontSize: '0.875rem',
                  color: '#1f2937'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                  />
                  administrador (pode gerenciar pessoas)
                </label>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '8px',
                marginTop: '24px'
              }}>
                {editando && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja remover esta pessoa do grupo?')) {
                        deletarUsuario(editando.id)
                        setShowModal(false)
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: MetroColors.red,
                      color: 'white',
                      border: 'none',
                      fontFamily: 'Segoe UI, sans-serif',
                      fontSize: '0.875rem',
                      textTransform: 'lowercase',
                      cursor: 'pointer'
                    }}
                  >
                    remover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#e5e7eb',
                    color: '#1f2937',
                    border: 'none',
                    fontFamily: 'Segoe UI, sans-serif',
                    fontSize: '0.875rem',
                    textTransform: 'lowercase',
                    cursor: 'pointer'
                  }}
                >
                  cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: MetroColors.blue,
                    color: 'white',
                    border: 'none',
                    fontFamily: 'Segoe UI, sans-serif',
                    fontSize: '0.875rem',
                    textTransform: 'lowercase',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
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
