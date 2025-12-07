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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
              <p className="text-sm text-gray-500 mt-1">
                {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={abrirNovo} 
            className="w-full sm:w-auto h-12 px-6 text-base bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            Novo Usuário
          </Button>
        </div>

        {/* Cards Grid */}
        {users.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300 bg-white/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-blue-100 p-6">
                <Shield className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900">Nenhum usuário cadastrado</h3>
              <p className="mb-6 text-gray-500 max-w-sm">
                Comece adicionando o primeiro usuário do sistema para gerenciar acessos
              </p>
              <Button onClick={abrirNovo} className="h-12 px-6 bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Primeiro Usuário
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <Card 
                key={user.id}
                className="group relative overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200"
              >
                <CardContent className="p-6">
                  {/* Header com Avatar */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {user.nome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                        {user.nome}
                      </h3>
                      {user.is_admin && (
                        <Badge className="mt-1 gap-1 text-xs bg-amber-100 text-amber-700 border-amber-200">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Telefone:</span>
                      <div className="text-gray-900 mt-0.5">{formatPhone(user.telefone)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <Button
                      onClick={() => abrirEdicao(user)}
                      variant="outline"
                      className="flex-1 h-10 border-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => deletarUsuario(user.id)}
                      variant="outline"
                      className="h-10 px-4 border-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
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
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold">
              {editando ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              {editando 
                ? 'Atualize as informações do usuário' 
                : 'Preencha os dados para criar um novo usuário'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-semibold text-gray-700">
                Nome Completo
              </Label>
              <Input
                id="nome"
                placeholder="Ex: João da Silva"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="h-12 text-base"
                required
              />
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-sm font-semibold text-gray-700">
                Telefone
              </Label>
              <Input
                id="telefone"
                placeholder="(11) 98765-4321"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="h-12 text-base"
                required
              />
            </div>

            {/* Senha (apenas criação) */}
            {!editando && (
              <div className="space-y-2">
                <Label htmlFor="senha" className="text-sm font-semibold text-gray-700">
                  Senha
                </Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Crie uma senha segura"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="h-12 text-base"
                  required
                />
              </div>
            )}

            {/* Admin Checkbox */}
            <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="mt-1 h-5 w-5 rounded border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">Usuário Administrador</div>
                  <div className="text-xs text-gray-500 mt-0.5">Acesso completo para gerenciar usuários e configurações</div>
                </div>
              </label>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1 h-12 text-base"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={loading}
                className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700"
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

export default Users
