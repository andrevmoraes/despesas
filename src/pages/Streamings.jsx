import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import '../styles/forms.css'
import '../styles/buttons.css'
import '../styles/tiles.css'

export default function Streamings({ showAlert }) {
  const { user } = useAuth()
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
    divisoes: []
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      // Carregar streamings
      const { data: streamingsData, error: streamingsError } = await supabase
        .from('streamings')
        .select(`
          *,
          pagador:users!streamings_pagador_id_fkey (nome),
          divisoes (
            *,
            user:users (nome)
          )
        `)
        .order('created_at', { ascending: false })

      if (streamingsError) throw streamingsError

      // Carregar usuários
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
    setLoading(true)

    try {
      if (editando) {
        // Atualizar streaming existente
        const { error: streamingError } = await supabase
          .from('streamings')
          .update({
            nome: formData.nome,
            valor_total: parseFloat(formData.valor_total),
            dia_cobranca: parseInt(formData.dia_cobranca),
            pagador_id: formData.pagador_id
          })
          .eq('id', editando.id)

        if (streamingError) throw streamingError

        // Deletar divisões antigas
        const { error: deleteDivisoesError } = await supabase
          .from('divisoes')
          .delete()
          .eq('streaming_id', editando.id)

        if (deleteDivisoesError) throw deleteDivisoesError

        // Inserir novas divisões
        if (formData.divisoes.length > 0) {
          const divisoes = formData.divisoes.map(userId => ({
            streaming_id: editando.id,
            user_id: userId,
            valor_personalizado: null
          }))

          const { error: divisoesError } = await supabase
            .from('divisoes')
            .insert(divisoes)

          if (divisoesError) throw divisoesError
        }
      } else {
        // Inserir novo streaming
        const { data: streaming, error: streamingError } = await supabase
          .from('streamings')
          .insert({
            nome: formData.nome,
            valor_total: parseFloat(formData.valor_total),
            dia_cobranca: parseInt(formData.dia_cobranca),
            pagador_id: formData.pagador_id,
            criado_por: user.id
          })
          .select()
          .single()

        if (streamingError) throw streamingError

        // Inserir divisões
        if (formData.divisoes.length > 0) {
          const divisoes = formData.divisoes.map(userId => ({
            streaming_id: streaming.id,
            user_id: userId,
            valor_personalizado: null
          }))

          const { error: divisoesError } = await supabase
            .from('divisoes')
            .insert(divisoes)

          if (divisoesError) throw divisoesError
        }
      }

      // Recarregar dados
      await carregarDados()
      
      // Limpar formulário
      setFormData({
        nome: '',
        valor_total: '',
        dia_cobranca: '',
        pagador_id: user.id,
        divisoes: []
      })
      setEditando(null)
      setShowModal(false)
      setLoading(false)
      showAlert('Streaming salvo com sucesso!', 'success')
    } catch (error) {
      console.error('Erro ao salvar streaming:', error)
      showAlert('Erro ao salvar streaming', 'error')
      setLoading(false)
    }
  }

  const abrirEdicao = (streaming) => {
    setEditando(streaming)
    setFormData({
      nome: streaming.nome,
      valor_total: streaming.valor_total.toString(),
      dia_cobranca: streaming.dia_cobranca.toString(),
      pagador_id: streaming.pagador_id,
      divisoes: streaming.divisoes.map(d => d.user_id)
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
      divisoes: []
    })
    setShowModal(true)
  }

  const deletarStreaming = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este streaming?')) return

    try {
      const { error } = await supabase
        .from('streamings')
        .delete()
        .eq('id', id)

      if (error) throw error

      await carregarDados()
    } catch (error) {
      console.error('Erro ao deletar streaming:', error)
      alert('Erro ao deletar streaming')
    }
  }

  const toggleDivisao = (userId) => {
    setFormData(prev => ({
      ...prev,
      divisoes: prev.divisoes.includes(userId)
        ? prev.divisoes.filter(id => id !== userId)
        : [...prev.divisoes, userId]
    }))
  }

  if (loading && streamings.length === 0) {
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
          Streamings
        </h1>
        <button 
          onClick={abrirNovo} 
          className="btn btn--primary"
        >
          + Adicionar
        </button>
      </div>

      <div className="tile-grid">
        {streamings.map((streaming, index) => {
          const cores = ['purple', 'pink', 'lime', 'secondary', 'accent']
          const cor = cores[index % cores.length]
          
          return (
            <div key={streaming.id} className={`tile tile--${cor}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div className="tile__title">{streaming.nome}</div>
                  <div className="tile__subtitle">
                    Pago por: {streaming.pagador.nome}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                  <button 
                    onClick={() => abrirEdicao(streaming)}
                    className="btn btn--small btn--secondary"
                    style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => deletarStreaming(streaming.id)}
                    className="btn btn--small btn--danger"
                    style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                    title="Deletar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="tile__value">
                R$ {streaming.valor_total.toFixed(2)}
              </div>
              
              <div style={{ marginTop: 'var(--spacing-md)', fontSize: '0.875rem' }}>
                <div>Dia da despesa: {streaming.dia_cobranca}</div>
                <div style={{ marginTop: 'var(--spacing-xs)' }}>
                  Dividido com: {streaming.divisoes.length > 0 
                    ? streaming.divisoes.map(d => d.user.nome).join(', ')
                    : 'Ninguém'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {streamings.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          color: 'var(--text-muted)',
          padding: 'var(--spacing-xl)'
        }}>
          Nenhum streaming cadastrado. Clique em "Adicionar" para começar.
        </div>
      )}

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
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ 
              marginBottom: 'var(--spacing-lg)',
              fontWeight: 'var(--font-weight-light)'
            }}>
              {editando ? 'Editar Streaming' : 'Novo Streaming'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome do Streaming</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Netflix, Disney+, etc"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Valor Mensal (R$)</label>
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
                <label className="form-label">Dia da Despesa</label>
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

              <div className="form-group">
                <label className="form-label">Quem Paga?</label>
                <select
                  className="form-select"
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
                <label className="form-label">Dividir com:</label>
                {users
                  .filter(u => u.id !== formData.pagador_id)
                  .map(u => (
                    <div key={u.id} className="form-checkbox" style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <input
                        type="checkbox"
                        checked={formData.divisoes.includes(u.id)}
                        onChange={() => toggleDivisao(u.id)}
                      />
                      <label>{u.nome}</label>
                    </div>
                  ))}
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
