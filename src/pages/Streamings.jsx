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
  red: 'var(--danger)'
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
            <h1 className="metro-hero__title">assinaturas</h1>
            <p className="metro-hero__subtitle">
              {streamings.length} assinatura{streamings.length !== 1 ? 's' : ''} cadastrada{streamings.length !== 1 ? 's' : ''}
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
        {/* Tile Adicionar Nova Assinatura */}
        <MetroTile 
          color="var(--bg-secondary)"
          className="metro-tile--muted"
          onClick={abrirNovo}
        >
          <div className="metro-tile__center">
            <div className="metro-tile__icon">+</div>
            <span className="metro-tile__label">adicionar assinatura</span>
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
                <h3 className="metro-tile__title">
                  {streaming.nome.toLowerCase()}
                </h3>
                
                <p className="metro-tile__meta">
                  pago por: {streaming.pagador?.nome || 'N/A'}
                </p>

                {streaming.divisoes && streaming.divisoes.length > 0 && (
                  <p className="metro-tile__meta">
                    {streaming.divisoes.length} perfil{streaming.divisoes.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              <div className="metro-tile__value">
                R$ {Number(streaming.valor_total || 0).toFixed(2).replace('.', ',')}
              </div>
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
                {editando ? 'editar assinatura' : 'nova assinatura'}
              </h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="metro-modal__body">
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
                  <span className="metro-text-muted" style={{ minWidth: '25px' }}>%</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dividir com:</label>
                <div className="metro-list">
                  {users
                    .filter(u => u.id !== formData.pagador_id)
                    .map(u => {
                      const divisao = formData.divisoes.find(d => d.user_id === u.id)
                      const isChecked = !!divisao
                      
                      return (
                        <div 
                          key={u.id}
                          className="metro-list__item"
                        >
                          <label className="metro-list__label">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleDivisao(u.id)}
                            />
                            {u.nome}
                          </label>
                          
                          {isChecked && (
                            <div className="metro-percentage">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0"
                                value={divisao.percentual || ''}
                                onChange={(e) => atualizarPercentual(u.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="form-input form-input--compact metro-input-compact"
                              />
                              <span>%</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  {users.filter(u => u.id !== formData.pagador_id).length === 0 && (
                    <p className="metro-list__empty">Nenhuma outra pessoa disponível</p>
                  )}
                </div>
              </div>

              {/* Indicador do Total de Porcentagens */}
              <div className={`metro-callout ${calcularTotalPercentual() === 100 ? 'metro-callout--success' : 'metro-callout--danger'}`}>
                <span className="metro-callout__label">
                  Total de Porcentagens:
                </span>
                <span className="metro-callout__value">
                  {calcularTotalPercentual().toFixed(2)}%
                </span>
              </div>

              <div className="metro-modal__actions">
                {editando && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja remover esta assinatura?')) {
                        deletarStreaming(editando.id)
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

export default Streamings
