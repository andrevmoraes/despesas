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
import { ArrowLeft, Plus, Pencil, Trash2, Shield } from 'lucide-react'

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
    senha: '',
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

  const formatPhone = (phone) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 11) return phone
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`
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
        showAlert('Usuário atualizado com sucesso', 'success')
      } else {
        const { error } = await supabase
          .from('users')
          .insert({
            nome: formData.nome,
            telefone: telefoneNumeros,
            senha: formData.senha,
            is_admin: formData.is_admin
          })

        if (error) throw error
        showAlert('Usuário criado com sucesso', 'success')
      }

      await carregarUsers()

      setFormData({
        nome: '',
        telefone: '',
        senha: '',
        is_admin: false
      })
      setEditando(null)
      setShowModal(false)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      showAlert('Erro ao salvar usuário', 'error')
      setLoading(false)
    }
  }

  const abrirEdicao = (user) => {
    setEditando(user)
    setFormData({
      nome: user.nome,
      telefone: formatPhone(user.telefone),
      senha: '',
      is_admin: user.is_admin
    })
    setShowModal(true)
  }

  const abrirNovo = () => {
    setEditando(null)
    setFormData({
      nome: '',
      telefone: '',
      senha: '',
      is_admin: false
    })
    setShowModal(true)
  }

  const deletarUsuario = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error

      showAlert('Usuário deletado com sucesso', 'success')
      await carregarUsers()
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      showAlert('Erro ao deletar usuário', 'error')
    }
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Apenas administradores podem gerenciar usuários.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading && users.length === 0) {
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
              <h1 className="text-2xl font-semibold text-gray-900">Usuários</h1>
              <p className="text-sm text-gray-500">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Button onClick={abrirNovo} className="h-12 px-6 text-base">
            <Plus className="mr-2 h-5 w-5" />
            Adicionar Usuário
          </Button>
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader className="space-y-2 p-6">
            <CardTitle className="text-xl">Lista de Usuários</CardTitle>
            <CardDescription className="text-base">
              Gerencie os usuários cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-gray-100 p-4">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">Nenhum usuário cadastrado</h3>
                <p className="mb-4 text-sm text-gray-500">
                  Comece adicionando o primeiro usuário do sistema
                </p>
                <Button onClick={abrirNovo} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Usuário
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="px-6">Usuário</TableHead>
                      <TableHead className="px-4 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="h-20 border-b hover:bg-gray-50">
                        <TableCell className="px-6 py-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-base text-gray-900">{user.nome}</span>
                              {user.is_admin && (
                                <Badge className="gap-1 text-xs px-2 py-0.5">
                                  <Shield className="h-3 w-3" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatPhone(user.telefone)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-5 text-right">
                          <div className="flex justify-end gap-3">
                            <Button 
                              onClick={() => abrirEdicao(user)}
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            >
                              <Pencil className="h-5 w-5 text-gray-600" />
                            </Button>
                            <Button 
                              onClick={() => deletarUsuario(user.id)}
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
              {editando ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editando 
                ? 'Atualize as informações do usuário abaixo' 
                : 'Preencha as informações para criar um novo usuário'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="nome" className="text-base font-medium">Nome</Label>
              <Input
                id="nome"
                placeholder="Nome completo"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="h-12 text-base border-gray-300"
                required
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="telefone" className="text-base font-medium">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(11) 98765-4321"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="h-12 text-base border-gray-300"
                required
              />
            </div>

            {!editando && (
              <div className="space-y-3">
                <Label htmlFor="senha" className="text-base font-medium">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Senha de acesso"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="h-12 text-base border-gray-300"
                  required
                />
              </div>
            )}

            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center space-x-3">
                <input
                  id="isAdmin"
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-400 cursor-pointer"
                />
                <Label htmlFor="isAdmin" className="cursor-pointer font-normal text-base">
                  Usuário administrador
                </Label>
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

export default Users
