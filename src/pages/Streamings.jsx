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
  red: '#e51400'
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

function Streamings({ showAlert }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [streamings, setStreamings] = useState([])
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    nome: '',
    valor_total: '',
    dia_cobranca: '',
    pagador_id: user?.id || '',
    pagador_percentual: 100,
    divisoes: [] // Array de { user_id: string, percentual: number }
  })

  useEffect(() => {
    carregarDados()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const carregarDados = async () => {
    try {
      const { data: streamingsData, error: streamingsError } = await supabase
        .from('streamings')
        .select(`
          *,
          pagador:users!streamings_pagador_id_fkey (nome),
          divisoes (*, user:users (nome))
        `)
        .order('created_at', { ascending: false })

      if (streamingsError) throw streamingsError

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('nome')

      if (usersError) throw usersError

      setStreamings(streamingsData || [])
      setUsers(usersData || [])
      setLoading(false)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validar porcentagens
    const totalPercentual = formData.pagador_percentual + formData.divisoes.reduce((sum, d) => sum + (d.percentual || 0), 0)
    if (Math.abs(totalPercentual - 100) > 0.01) {
      showAlert(`A soma das porcentagens deve ser 100%. Atualmente: ${totalPercentual.toFixed(1)}%`, 'error')
      return
    }

    setLoading(true)

    try {
      const valorTotal = parseFloat(formData.valor_total)
      
      if (editando) {
        const { error: streamingError } = await supabase
          .from('streamings')
          .update({
            nome: formData.nome,
            valor_total: valorTotal,
            dia_cobranca: parseInt(formData.dia_cobranca, 10),
            pagador_id: formData.pagador_id
          })
          .eq('id', editando.id)

        if (streamingError) throw streamingError

        const { error: deleteDivisoesError } = await supabase
          .from('divisoes')
          .delete()
          .eq('streaming_id', editando.id)

        if (deleteDivisoesError) throw deleteDivisoesError

        // Inserir divisão do pagador
        const valorPagador = parseFloat(((valorTotal * formData.pagador_percentual) / 100).toFixed(2))
        const divisoes = [{
          streaming_id: editando.id,
          user_id: formData.pagador_id,
          valor_personalizado: valorPagador
        }]

        // Inserir divisões dos outros participantes
        formData.divisoes.forEach(d => {
          const valorParticipante = parseFloat(((valorTotal * d.percentual) / 100).toFixed(2))
          divisoes.push({
            streaming_id: editando.id,
            user_id: d.user_id,
            valor_personalizado: valorParticipante
          })
        })

        const { error: divisoesError } = await supabase
          .from('divisoes')
          .insert(divisoes)

        if (divisoesError) throw divisoesError

        showAlert('Assinatura atualizada com sucesso', 'success')
      } else {
        const { data: streaming, error: streamingError } = await supabase
          .from('streamings')
          .insert({
            nome: formData.nome,
            valor_total: valorTotal,
            dia_cobranca: parseInt(formData.dia_cobranca, 10),
            pagador_id: formData.pagador_id,
            criado_por: user.id
          })
          .select()
          .single()

        if (streamingError) throw streamingError

        // Inserir divisão do pagador
        const valorPagador = parseFloat(((valorTotal * formData.pagador_percentual) / 100).toFixed(2))
        const divisoes = [{
          streaming_id: streaming.id,
          user_id: formData.pagador_id,
          valor_personalizado: valorPagador
        }]

        // Inserir divisões dos outros participantes
        formData.divisoes.forEach(d => {
          const valorParticipante = parseFloat(((valorTotal * d.percentual) / 100).toFixed(2))
          divisoes.push({
            streaming_id: streaming.id,
            user_id: d.user_id,
            valor_personalizado: valorParticipante
          })
        })

        const { error: divisoesError } = await supabase
          .from('divisoes')
          .insert(divisoes)

        if (divisoesError) throw divisoesError

        showAlert('Assinatura criada com sucesso', 'success')
      }

      await carregarDados()

      setFormData({
        nome: '',
        valor_total: '',
        dia_cobranca: '',
        pagador_id: user.id,
        pagador_percentual: 100,
        divisoes: []
      })
      setEditando(null)
      setShowModal(false)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao salvar streaming:', error)
      showAlert('Erro ao salvar streaming', 'error')
      setLoading(false)
    }
  }

  const abrirEdicao = (streaming) => {
    setEditando(streaming)
    
    // Calcular porcentagens baseadas nos valores personalizados
    const valorTotal = parseFloat(streaming.valor_total) || 0
    const divisaoPagador = (streaming.divisoes || []).find(d => d.user_id === streaming.pagador_id)
    const pagadorPercentual = divisaoPagador && valorTotal > 0 
      ? (parseFloat(divisaoPagador.valor_personalizado) / valorTotal) * 100
      : 100
    
    const outrosDivisoes = (streaming.divisoes || [])
      .filter(d => d.user_id !== streaming.pagador_id)
      .map(d => ({
        user_id: d.user_id,
        percentual: valorTotal > 0 ? (parseFloat(d.valor_personalizado) / valorTotal) * 100 : 0
      }))
    
    setFormData({
      nome: streaming.nome,
      valor_total: streaming.valor_total?.toString() || '',
      dia_cobranca: streaming.dia_cobranca?.toString() || '',
      pagador_id: streaming.pagador_id,
      pagador_percentual: pagadorPercentual,
      divisoes: outrosDivisoes
    })
    setShowModal(true)
  }

  const abrirNovo = () => {
    setEditando(null)
    setFormData({
      nome: '',
      valor_total: '',
      dia_cobranca: '',
      pagador_id: user.id,
      pagador_percentual: 100,
      divisoes: []
    })
    setShowModal(true)
  }

  const deletarStreaming = async (id) => {
    if (!confirm('Tem certeza que deseja remover esta assinatura?')) return

    try {
      const { error } = await supabase
        .from('streamings')
        .delete()
        .eq('id', id)

      if (error) throw error

      showAlert('Assinatura removida com sucesso', 'success')
      await carregarDados()
    } catch (error) {
      console.error('Erro ao deletar streaming:', error)
      showAlert('Erro ao remover assinatura', 'error')
    }
  }

  const toggleDivisao = (userId) => {
    setFormData(prev => {
      const divisaoExiste = prev.divisoes.some(d => d.user_id === userId)
      
      if (divisaoExiste) {
        return {
          ...prev,
          divisoes: prev.divisoes.filter(d => d.user_id !== userId)
        }
      } else {
        return {
          ...prev,
          divisoes: [...prev.divisoes, { user_id: userId, percentual: 0 }]
        }
      }
    })
  }

  const atualizarPercentual = (userId, percentual) => {
    const percentualNum = parseFloat(percentual) || 0
    
    if (userId === formData.pagador_id) {
      setFormData(prev => ({
        ...prev,
        pagador_percentual: percentualNum
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        divisoes: prev.divisoes.map(d => 
          d.user_id === userId ? { ...d, percentual: percentualNum } : d
        )
      }))
    }
  }

  const calcularTotalPercentual = () => {
    const totalOutros = formData.divisoes.reduce((sum, d) => sum + (parseFloat(d.percentual) || 0), 0)
    return (parseFloat(formData.pagador_percentual) || 0) + totalOutros
  }

  if (loading && streamings.length === 0) {
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
              assinaturas
            </h1>
            <p style={{
              fontFamily: 'Segoe UI, sans-serif',
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: '8px 0 0 0',
              textTransform: 'lowercase'
            }}>
              {streamings.length} assinatura{streamings.length !== 1 ? 's' : ''} cadastrada{streamings.length !== 1 ? 's' : ''}
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
        {/* Tile Adicionar Nova Assinatura */}
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
            }}>adicionar assinatura</span>
          </div>
        </MetroTile>

        {/* Tiles de Assinaturas */}
        {streamings.map((streaming) => (
          <MetroTile 
            key={streaming.id}
            color={MetroColors.blue}
            onClick={() => abrirEdicao(streaming)}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{
                  fontFamily: 'Segoe UI, sans-serif',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'white',
                  margin: '0 0 8px 0',
                  textTransform: 'lowercase',
                  wordBreak: 'break-word'
                }}>
                  {streaming.nome.toLowerCase()}
                </h3>
                
                <p style={{
                  fontFamily: 'Segoe UI, sans-serif',
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  margin: '0 0 4px 0'
                }}>
                  pago por: {streaming.pagador?.nome || 'N/A'}
                </p>

                {streaming.divisoes && streaming.divisoes.length > 0 && (
                  <p style={{
                    fontFamily: 'Segoe UI, sans-serif',
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.9)',
                    margin: 0
                  }}>
                    {streaming.divisoes.length} perfil{streaming.divisoes.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div style={{
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '1.5rem',
                fontWeight: 300,
                color: 'white',
                marginTop: '8px'
              }}>
                R$ {Number(streaming.valor_total || 0).toFixed(2).replace('.', ',')}
              </div>
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
                {editando ? 'editar assinatura' : 'nova assinatura'}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Netflix, Spotify, Disney+"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Valor Mensal</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="39.90"
                    value={formData.valor_total}
                    onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dia da Cobrança</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="form-input"
                    placeholder="15"
                    value={formData.dia_cobranca}
                    onChange={(e) => setFormData({ ...formData, dia_cobranca: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quem paga?</label>
                <select
                  className="form-input"
                  value={formData.pagador_id}
                  onChange={(e) => setFormData({ ...formData, pagador_id: e.target.value })}
                  required
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Porcentagem do pagador</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="form-input"
                    placeholder="100"
                    value={formData.pagador_percentual}
                    onChange={(e) => atualizarPercentual(formData.pagador_id, e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <span style={{ 
                    fontFamily: 'Segoe UI, sans-serif',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    minWidth: '25px'
                  }}>%</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dividir com:</label>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  padding: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: '#f9fafb'
                }}>
                  {users
                    .filter(u => u.id !== formData.pagador_id)
                    .map(u => {
                      const divisao = formData.divisoes.find(d => d.user_id === u.id)
                      const isChecked = !!divisao
                      
                      return (
                        <div 
                          key={u.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontFamily: 'Segoe UI, sans-serif',
                            fontSize: '0.875rem',
                            flex: 1
                          }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleDivisao(u.id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            {u.nome}
                          </label>
                          
                          {isChecked && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0"
                                value={divisao.percentual || ''}
                                onChange={(e) => atualizarPercentual(u.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  width: '70px',
                                  padding: '4px 8px',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '4px',
                                  fontFamily: 'Segoe UI, sans-serif',
                                  fontSize: '0.875rem'
                                }}
                              />
                              <span style={{ 
                                fontFamily: 'Segoe UI, sans-serif',
                                fontSize: '0.75rem',
                                color: '#6b7280'
                              }}>%</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  {users.filter(u => u.id !== formData.pagador_id).length === 0 && (
                    <p style={{
                      textAlign: 'center',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      padding: '16px'
                    }}>Nenhuma outra pessoa disponível</p>
                  )}
                </div>
              </div>

              {/* Indicador do Total de Porcentagens */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: calcularTotalPercentual() === 100 ? '#d1fae5' : '#fee2e2',
                border: `2px solid ${calcularTotalPercentual() === 100 ? '#10b981' : '#ef4444'}`,
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontFamily: 'Segoe UI, sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: calcularTotalPercentual() === 100 ? '#065f46' : '#991b1b'
                }}>
                  Total de Porcentagens:
                </span>
                <span style={{
                  fontFamily: 'Segoe UI, sans-serif',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: calcularTotalPercentual() === 100 ? '#065f46' : '#991b1b'
                }}>
                  {calcularTotalPercentual().toFixed(2)}%
                </span>
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
                      if (confirm('Tem certeza que deseja remover esta assinatura?')) {
                        deletarStreaming(editando.id)
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

export default Streamings
