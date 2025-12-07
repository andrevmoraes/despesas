import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, DollarSign, Users, User } from 'lucide-react'

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
    divisoes: []
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
    setLoading(true)

    try {
      if (editando) {
        const { error: streamingError } = await supabase
          .from('streamings')
          .update({
            nome: formData.nome,
            valor_total: parseFloat(formData.valor_total),
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

        showAlert('Streaming atualizado com sucesso', 'success')
      } else {
        const { data: streaming, error: streamingError } = await supabase
          .from('streamings')
          .insert({
            nome: formData.nome,
            valor_total: parseFloat(formData.valor_total),
            dia_cobranca: parseInt(formData.dia_cobranca, 10),
            pagador_id: formData.pagador_id,
            criado_por: user.id
          })
          .select()
          .single()

        if (streamingError) throw streamingError

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

        showAlert('Streaming criado com sucesso', 'success')
      }

      await carregarDados()

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
      valor_total: streaming.valor_total?.toString() || '',
      dia_cobranca: streaming.dia_cobranca?.toString() || '',
      pagador_id: streaming.pagador_id,
      divisoes: (streaming.divisoes || []).map(d => d.user_id)
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

      showAlert('Streaming deletado com sucesso', 'success')
      await carregarDados()
    } catch (error) {
      console.error('Erro ao deletar streaming:', error)
      showAlert('Erro ao deletar streaming', 'error')
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
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #0078D7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/')} variant="outline" size="icon" className="h-12 w-12">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Assinaturas</h1>
              <p className="text-sm text-gray-500">{streamings.length} assinatura{streamings.length !== 1 ? 's' : ''} cadastrada{streamings.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button onClick={abrirNovo} className="h-12 px-6 text-base">
            <Plus className="mr-2 h-5 w-5" />
            Adicionar Assinatura
          </Button>
        </div>

        {/* Cards Grid */}
        {streamings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-gray-100 p-4">
                <DollarSign className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">Nenhuma assinatura cadastrada</h3>
              <p className="mb-6 text-sm text-gray-500">
                Comece adicionando sua primeira assinatura
              </p>
              <Button onClick={abrirNovo} className="h-12 px-6">
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Assinatura
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {streamings.map((streaming) => (
              <Card 
                key={streaming.id}
                className="group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] border-2"
                onClick={() => abrirEdicao(streaming)}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {streaming.nome}
                      </h3>
                      <Badge variant="secondary" className="font-mono text-sm px-2.5 py-1 shrink-0">
                        R$ {Number(streaming.valor_total || 0).toFixed(2)}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate">{streaming.pagador?.nome}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>Cobrança dia {streaming.dia_cobranca}</span>
                    </div>

                    {streaming.divisoes && streaming.divisoes.length > 0 && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="h-4 w-4 shrink-0" />
                        <span>Dividida com {streaming.divisoes.length} pessoa{streaming.divisoes.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <div className="pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        deletarStreaming(streaming.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent onClose={() => setShowModal(false)} className="max-w-lg">
          <DialogHeader className="space-y-3 pb-6 border-b">
            <DialogTitle className="text-2xl">
              {editando ? 'Editar Assinatura' : 'Nova Assinatura'}
            </DialogTitle>
            <DialogDescription className="text-base">
              {editando 
                ? 'Atualize as informações da assinatura' 
                : 'Preencha os dados para criar uma nova assinatura'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            {/* Nome */}
            <div className="space-y-3">
              <Label htmlFor="nome" className="text-base font-semibold text-gray-700">
                Nome da Assinatura
              </Label>
              <Input
                id="nome"
                placeholder="Ex: Netflix, Spotify, Disney+"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="h-14 text-base border-2 border-gray-200 focus:border-blue-500 transition-colors"
                required
              />
            </div>

            {/* Valor e Dia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="valor" className="text-base font-semibold text-gray-700">
                  Valor Mensal
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    placeholder="39.90"
                    value={formData.valor_total}
                    onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                    className="h-14 text-base pl-12 border-2 border-gray-200 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="dia" className="text-base font-semibold text-gray-700">
                  Dia da Cobrança
                </Label>
                <Input
                  id="dia"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="15"
                  value={formData.dia_cobranca}
                  onChange={(e) => setFormData({ ...formData, dia_cobranca: e.target.value })}
                  className="h-14 text-base border-2 border-gray-200 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Pagador */}
            <div className="space-y-3">
              <Label htmlFor="pagador" className="text-base font-semibold text-gray-700">
                Quem paga?
              </Label>
              <select
                id="pagador"
                value={formData.pagador_id}
                onChange={(e) => setFormData({ ...formData, pagador_id: e.target.value })}
                className="flex h-14 w-full rounded-md border-2 border-gray-200 bg-white px-4 text-base shadow-sm transition-colors focus:border-blue-500 focus:outline-none"
                required
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>

            {/* Divisões */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-700">
                Dividir com:
              </Label>
              <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 space-y-2 max-h-48 overflow-y-auto">
                {users
                  .filter(u => u.id !== formData.pagador_id)
                  .map(u => (
                    <label 
                      key={u.id} 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.divisoes.includes(u.id)}
                        onChange={() => toggleDivisao(u.id)}
                        className="h-5 w-5 rounded border-2 border-gray-300 cursor-pointer"
                      />
                      <span className="text-base text-gray-700">{u.nome}</span>
                    </label>
                  ))}
                {users.filter(u => u.id !== formData.pagador_id).length === 0 && (
                  <p className="text-base text-gray-500 text-center py-4">Nenhum outro usuário disponível</p>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-6 border-t-2">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1 h-14 text-base border-2 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={loading}
                className="flex-1 h-14 text-base bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Salvando...' : editando ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Streamings
