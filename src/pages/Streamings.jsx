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

        {/* Table Card */}
        <Card>
          <CardHeader className="space-y-2 p-6">
            <CardTitle className="text-xl">Lista de Assinaturas</CardTitle>
            <CardDescription className="text-base">
              Gerencie suas assinaturas e despesas compartilhadas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {streamings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="mb-4 rounded-full bg-gray-100 p-4">
                  <DollarSign className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">Nenhuma assinatura cadastrada</h3>
                <p className="mb-4 text-sm text-gray-500">
                  Comece adicionando sua primeira assinatura
                </p>
                <Button onClick={abrirNovo} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Assinatura
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="px-6">Nome</TableHead>
                      <TableHead className="px-4">Valor</TableHead>
                      <TableHead className="px-4 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {streamings.map((streaming) => (
                      <TableRow key={streaming.id} className="h-20 border-b hover:bg-gray-50">
                        <TableCell className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="font-semibold text-base text-gray-900">{streaming.nome}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <User className="h-4 w-4" />
                              <span>{streaming.pagador?.nome}</span>
                              <span className="text-gray-300">•</span>
                              <Calendar className="h-4 w-4" />
                              <span>Dia {streaming.dia_cobranca}</span>
                            </div>
                            {streaming.divisoes && streaming.divisoes.length > 0 && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Users className="h-3.5 w-3.5" />
                                <span>Dividida com {streaming.divisoes.length} pessoa{streaming.divisoes.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-5">
                          <Badge variant="secondary" className="gap-1 font-mono text-sm px-3 py-1.5">
                            R$ {Number(streaming.valor_total || 0).toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-5 text-right">
                          <div className="flex justify-end gap-3">
                            <Button 
                              onClick={() => abrirEdicao(streaming)}
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            >
                              <Pencil className="h-5 w-5 text-gray-600" />
                            </Button>
                            <Button 
                              onClick={() => deletarStreaming(streaming.id)}
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 rounded-lg border border-red-200 hover:border-red-300 hover:bg-red-50"
                            >
                              <Trash2 className="h-5 w-5 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent onClose={() => setShowModal(false)}>
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar Assinatura' : 'Nova Assinatura'}
            </DialogTitle>
            <DialogDescription>
              {editando 
                ? 'Atualize as informações da assinatura abaixo' 
                : 'Preencha as informações para criar uma nova assinatura'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="nome" className="text-base font-medium">Nome da Assinatura</Label>
              <Input
                id="nome"
                placeholder="Netflix, Spotify, etc."
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="h-12 text-base border-gray-300"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="valor" className="text-base font-medium">Valor Mensal (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="39.90"
                  value={formData.valor_total}
                  onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                  className="h-12 text-base border-gray-300"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="dia" className="text-base font-medium">Dia da Cobrança</Label>
                <Input
                  id="dia"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="15"
                  value={formData.dia_cobranca}
                  onChange={(e) => setFormData({ ...formData, dia_cobranca: e.target.value })}
                  className="h-12 text-base border-gray-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="pagador" className="text-base font-medium">Quem paga?</Label>
              <select
                id="pagador"
                value={formData.pagador_id}
                onChange={(e) => setFormData({ ...formData, pagador_id: e.target.value })}
                className="flex h-12 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950"
                required
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Dividir com:</Label>
              <div className="space-y-3 rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                {users
                  .filter(u => u.id !== formData.pagador_id)
                  .map(u => (
                    <div key={u.id} className="flex items-center space-x-3 py-2 px-2 rounded-md hover:bg-white transition-colors">
                      <input
                        id={`user-${u.id}`}
                        type="checkbox"
                        checked={formData.divisoes.includes(u.id)}
                        onChange={() => toggleDivisao(u.id)}
                        className="h-5 w-5 rounded border-gray-400 cursor-pointer"
                      />
                      <Label htmlFor={`user-${u.id}`} className="cursor-pointer font-normal text-base flex-1">
                        {u.nome}
                      </Label>
                    </div>
                  ))}
                {users.filter(u => u.id !== formData.pagador_id).length === 0 && (
                  <p className="text-base text-gray-500 text-center py-2">Nenhum outro usuário disponível</p>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1 h-12 text-base border-2"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={loading}
                className="flex-1 h-12 text-base"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Streamings
