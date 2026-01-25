import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import * as notificacoes from '../services/notificacoes'
import DashboardSkeleton from '../components/DashboardSkeleton'
import '../styles/dashboard.css'

// Metro UI Colors
const MetroColors = {
  blue: 'var(--primary)',
  darkBlue: 'var(--secondary)',
  green: 'var(--success)',
  red: 'var(--danger)'
}

// Metro Tile Component
const MetroTile = ({ color, size, hoverable = true, onClick, children, style }) => {
  const sizeClasses = {
    medium: 'metro-tile-medium',
    wide: 'metro-tile-wide'
  }
  
  return (
    <div 
      className={`metro-tile ${sizeClasses[size] || ''} ${hoverable ? 'metro-tile-hoverable' : ''}`}
      onClick={onClick}
      style={{ backgroundColor: color, ...style }}
    >
      {children}
    </div>
  )
}

function Dashboard({ showAlert }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [saldos, setSaldos] = useState([])
  const [totalDevendo, setTotalDevendo] = useState(0)
  const [totalRecebendo, setTotalRecebendo] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notificacoesAtivadas, setNotificacoesAtivadas] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null) // ID da pessoa com menu aberto
  const intervaloNotificacoesRef = useRef(null)
  
  // 🎯 Live Tile Animations (Windows Phone style)
  const [rotation, setRotation] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Formata número para moeda com vírgula (ex: 16,73)
  const formatMoneyText = (value) => {
    const num = Number(value) || 0
    return num.toFixed(2).replace('.', ',')
  }

  // Monta o texto de resumo para copiar baseado no saldo (por pessoa)
  const montarResumoTexto = (saldo) => {
    const nomePessoa = saldo.pessoa?.nome || 'Pessoa'
    const linhas = []

    linhas.push('Resumo das despesas compartilhadas', '')

    // Assinaturas pagas por você (a outra pessoa)
    const porVoce = (saldo.breakdown || []).filter(d => d.tipo === 'você_deve')
    if (porVoce.length > 0) {
      linhas.push('Assinaturas pagas por você:')
      porVoce.forEach(d => {
        const totalTxt = formatMoneyText(d.valorTotal)
        const perTxt = formatMoneyText(d.valor)
        const count = d.participantes || 1
        const nomes = (d.participantesNomes || []).filter(Boolean)
        const used = d.usedProfiles || (nomes.length > 0 ? nomes.length : 1)
        linhas.push(`- ${d.nome}`)
        linhas.push(`  Valor total: R$ ${totalTxt}`)
        linhas.push(`  Meu custo proporcional: R$ ${perTxt} (${used}/${count})`)
      })
      linhas.push('')
    }

    // Assinaturas pagas por mim (você = current user)
    const porMim = (saldo.breakdown || []).filter(d => d.tipo === 'deve_para_voce')
    if (porMim.length > 0) {
      linhas.push('Assinaturas pagas por mim:')
      porMim.forEach(d => {
        const totalTxt = formatMoneyText(d.valorTotal)
        const perTxt = formatMoneyText(d.valor)
        const count = d.participantes || 1
        const nomes = (d.participantesNomes || []).filter(Boolean)
        const used = d.usedProfiles || (nomes.length > 0 ? nomes.length : 1)
        linhas.push(`- ${d.nome}`)
        linhas.push(`  Valor total: R$ ${totalTxt}`)
        linhas.push(`  Seu custo proporcional: R$ ${perTxt} (${used}/${count})`)
      })
      linhas.push('')
    }

    // Totais (apenas se houver assinaturas em ambas as categorias)
    const totalVocePagouPorMim = porVoce.reduce((s, d) => s + (Number(d.valor) || 0), 0)
    const totalEuPagueiPorVoce = porMim.reduce((s, d) => s + (Number(d.valor) || 0), 0)

    const saldoFinal = Number(saldo.valor) || 0

    if (porVoce.length > 0 && porMim.length > 0) {
      linhas.push('Totais:')
      linhas.push(`- Você pagou por mim: R$ ${formatMoneyText(totalVocePagouPorMim)}`)
      linhas.push(`- Eu paguei por você: R$ ${formatMoneyText(totalEuPagueiPorVoce)}`)
      linhas.push('--------------------------------')
      if (saldoFinal > 0) {
        linhas.push(`Você deve me transferir: R$ ${formatMoneyText(saldoFinal)}`)
        // Adiciona chave PIX do usuário atual (quem vai receber)
        const chavePix = user?.telefone ? String(user.telefone).replace(/\D/g, '').replace(/^55/, '') : ''
        if (chavePix) {
          linhas.push(`Minha chave PIX: ${chavePix}`)
        }
      } else if (saldoFinal < 0) {
        linhas.push(`Eu devo te transferir: R$ ${formatMoneyText(Math.abs(saldoFinal))}`)
        // Adiciona chave PIX da pessoa (quem vai receber)
        const chavePix = saldo.pessoa?.telefone ? String(saldo.pessoa.telefone).replace(/\D/g, '').replace(/^55/, '') : ''
        if (chavePix) {
          linhas.push(`Sua chave PIX: ${chavePix}`)
        }
      } else {
        linhas.push(`R$ 0,00`)
      }
    } else {
      // Se só houver uma das categorias, não mostramos Totais — vamos direto ao valor a transferir
      if (saldoFinal > 0) {
        linhas.push(`Você deve me transferir: R$ ${formatMoneyText(saldoFinal)}`)
        // Adiciona chave PIX do usuário atual (quem vai receber)
        const chavePix = user?.telefone ? String(user.telefone).replace(/\D/g, '').replace(/^55/, '') : ''
        if (chavePix) {
          linhas.push(`Minha chave PIX: ${chavePix}`)
        }
      } else if (saldoFinal < 0) {
        linhas.push(`Eu devo te transferir: R$ ${formatMoneyText(Math.abs(saldoFinal))}`)
        // Adiciona chave PIX da pessoa (quem vai receber)
        const chavePix = saldo.pessoa?.telefone ? String(saldo.pessoa.telefone).replace(/\D/g, '').replace(/^55/, '') : ''
        if (chavePix) {
          linhas.push(`Sua chave PIX: ${chavePix}`)
        }
      } else {
        linhas.push(`R$ 0,00`)
      }
    }

    return linhas.join('\n')
  }

  const copiarResumo = async (saldo) => {
    try {
      const texto = montarResumoTexto(saldo)
      await navigator.clipboard.writeText(texto)
      showAlert('Resumo copiado para a área de transferência', 'success')
    } catch (err) {
      console.error('Erro ao copiar resumo:', err)
      showAlert('Não foi possível copiar o resumo. Tente manualmente.', 'error')
    }
  }

  // Formata telefone para uso no PIX (adiciona DDI 55 quando necessário)
  const formatPhoneForPix = (raw) => {
    if (!raw) return ''
    const digits = String(raw).replace(/\D/g, '')
    if (digits.length === 11) return `55${digits}`
    if (digits.length === 13 && digits.startsWith('55')) return digits
    return digits
  }

  const copiarPix = async (saldo) => {
    try {
      const amount = Math.abs(Number(saldo.valor) || 0)
      if (amount <= 0) {
        showAlert('Valor zero — nada a transferir.', 'warning')
        return
      }
      // Determina quem deve receber o PIX:
      // - Se saldo.valor > 0: a pessoa do card nos deve, logo o destinatário é o usuário atual
      // - Se saldo.valor <= 0: o destinatário é a pessoa do card
      let telefoneDest = null
      if (Number(saldo.valor) > 0) {
        telefoneDest = user?.telefone
        if (!telefoneDest) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('telefone')
              .eq('id', user?.id)
              .single()
            if (!error && data?.telefone) telefoneDest = data.telefone
          } catch (err) {
            console.error('Erro ao buscar telefone do usuário atual:', err)
          }
        }
      } else {
        telefoneDest = saldo.pessoa?.telefone
        if (!telefoneDest) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('telefone')
              .eq('id', saldo.pessoa?.id)
              .single()
            if (!error && data?.telefone) telefoneDest = data.telefone
          } catch (err) {
            console.error('Erro ao buscar telefone do destinatário:', err)
          }
        }
      }

      const phoneForPix = formatPhoneForPix(telefoneDest)
      if (!phoneForPix) {
        showAlert('Telefone do destinatário não disponível.', 'error')
        return
      }

      const texto = `R$${formatMoneyText(amount)} para ${phoneForPix}`
      return texto // Retorna para ser usado em outras funções
    } catch (err) {
      console.error('Erro ao gerar texto do PIX:', err)
      showAlert('Não foi possível gerar o texto do PIX.', 'error')
      return null
    }
  }

  const copiarChavePix = async (saldo) => {
    try {
      const amount = Math.abs(Number(saldo.valor) || 0)
      if (amount <= 0) {
        showAlert('Valor zero — nada a transferir.', 'warning')
        return
      }
      
      let telefoneDest = null
      if (Number(saldo.valor) > 0) {
        telefoneDest = user?.telefone
        if (!telefoneDest) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('telefone')
              .eq('id', user?.id)
              .single()
            if (!error && data?.telefone) telefoneDest = data.telefone
          } catch (err) {
            console.error('Erro ao buscar telefone do usuário atual:', err)
          }
        }
      } else {
        telefoneDest = saldo.pessoa?.telefone
        if (!telefoneDest) {
          try {
            const { data, error } = await supabase
              .from('users')
              .select('telefone')
              .eq('id', saldo.pessoa?.id)
              .single()
            if (!error && data?.telefone) telefoneDest = data.telefone
          } catch (err) {
            console.error('Erro ao buscar telefone do destinatário:', err)
          }
        }
      }

      if (!telefoneDest) {
        showAlert('Telefone do destinatário não disponível.', 'error')
        return
      }

      // Remove +55 e formata apenas números
      const chavePix = String(telefoneDest).replace(/\D/g, '').replace(/^55/, '')
      await navigator.clipboard.writeText(chavePix)
      showAlert('Chave PIX copiada para a área de transferência', 'success')
    } catch (err) {
      console.error('Erro ao copiar chave PIX:', err)
      showAlert('Não foi possível copiar a chave PIX.', 'error')
    }
  }

  const abrirWhatsAppItau = async (saldo) => {
    try {
      const textoPixCompleto = await copiarPix(saldo)
      if (!textoPixCompleto) return

      const mensagemEncoded = encodeURIComponent(textoPixCompleto)
      const numeroItau = '5511400415150' // +55 11 4004-1515
      const linkWhatsApp = `https://wa.me/${numeroItau}?text=${mensagemEncoded}`
      
      window.open(linkWhatsApp, '_blank')
    } catch (err) {
      console.error('Erro ao abrir WhatsApp:', err)
      showAlert('Não foi possível abrir o WhatsApp.', 'error')
    }
  }

  const marcarComoPago = async (saldo) => {
    try {
      const amount = Math.abs(Number(saldo.valor) || 0)
      if (amount <= 0) {
        showAlert('Não há valor a pagar neste mês.', 'warning')
        return
      }

      const now = new Date()
      const mes = now.getMonth() + 1 // 1-12
      const ano = now.getFullYear()

      // Verifica quem é o usuário (quem recebe) e quem é a pessoa (quem paga)
      const usuario_id = user?.id
      const pessoa_id = saldo.pessoa?.id

      if (!usuario_id || !pessoa_id) {
        showAlert('Erro ao identificar usuário ou pessoa.', 'error')
        return
      }

      // Insere o pagamento
      const { error } = await supabase
        .from('pagamentos_mensais')
        .insert({
          usuario_id,
          pessoa_id,
          mes,
          ano,
          valor_pago: amount
        })

      if (error) {
        console.error('Erro ao marcar como pago:', error)
        showAlert('Erro ao marcar como pago. Tente novamente.', 'error')
        return
      }

      showAlert('Pagamento registrado com sucesso!', 'success')
      
      // Atualiza apenas o saldo específico no estado local
      setSaldos(prevSaldos => 
        prevSaldos.map(s => 
          s.pessoa.id === pessoa_id 
            ? { ...s, pagoEsseMes: true }
            : s
        )
      )
    } catch (err) {
      console.error('Erro ao marcar como pago:', err)
      showAlert('Não foi possível marcar como pago.', 'error')
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // ⚡ Live Tile Flip Animation (sempre de cima pra baixo)
  useEffect(() => {
    const flipInterval = setInterval(() => {
      setRotation((prev) => prev + 180)
    }, 8000)

    return () => clearInterval(flipInterval)
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setSaldos([])
      setTotalDevendo(0)
      setTotalRecebendo(0)
      setNotificacoesAtivadas(false)
      setLoading(false)

      if (intervaloNotificacoesRef.current) {
        clearInterval(intervaloNotificacoesRef.current)
        intervaloNotificacoesRef.current = null
      }

      return
    }

    carregarSaldos(user)
    verificarPermissaoNotificacoes(user)

    return () => {
      if (intervaloNotificacoesRef.current) {
        clearInterval(intervaloNotificacoesRef.current)
        intervaloNotificacoesRef.current = null
      }
    }
  }, [user])

  const verificarPermissaoNotificacoes = async (usuario) => {
    if (!('Notification' in window)) {
      setNotificacoesAtivadas(false)
      return
    }

    const permissaoConcedida = Notification.permission === 'granted'
    setNotificacoesAtivadas(permissaoConcedida)

    if (!permissaoConcedida || !usuario?.id) {
      if (intervaloNotificacoesRef.current) {
        clearInterval(intervaloNotificacoesRef.current)
        intervaloNotificacoesRef.current = null
      }
      return
    }

    if (intervaloNotificacoesRef.current) {
      clearInterval(intervaloNotificacoesRef.current)
    }

    intervaloNotificacoesRef.current = notificacoes.agendarVerificacaoDiaria(usuario, supabase)
  }

  const ativarNotificacoes = async () => {
    if (!user?.id) {
      showAlert('Faça login para ativar as notificações.', 'error')
      return
    }

    const permitido = await notificacoes.solicitarPermissao()
    setNotificacoesAtivadas(permitido)
    
    if (!permitido) {
      showAlert('Não foi possível ativar as notificações.', 'error')
      return
    }

    const listaNotificacoes = await notificacoes.verificarCobrancasHoje(user, supabase)

    if (listaNotificacoes.length > 0) {
      listaNotificacoes.forEach(({ titulo, opcoes }) => {
        notificacoes.enviarNotificacao(titulo, opcoes)
      })
      showAlert(`${listaNotificacoes.length} notificação(ões) encontrada(s) para hoje!`, 'success')
    } else {
        showAlert('Notificações ativadas! Você será avisado nas datas das despesas.', 'success')
    }

    if (intervaloNotificacoesRef.current) {
      clearInterval(intervaloNotificacoesRef.current)
    }

    intervaloNotificacoesRef.current = notificacoes.agendarVerificacaoDiaria(user, supabase)
  }

  const testarNotificacao = () => {
    if (!('Notification' in window)) {
      showAlert('Este navegador não suporta notificações.', 'error')
      return
    }

    if (Notification.permission !== 'granted') {
      showAlert('Ative as notificações primeiro para realizar o teste.', 'warning')
      return
    }

    notificacoes.enviarNotificacao('Teste de notificação', {
      body: 'Se você está vendo esta mensagem, as notificações estão funcionando!',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'teste-notificacao',
      requireInteraction: false
    })

    showAlert('Notificação de teste enviada! Verifique o navegador.', 'success')
  }

  const carregarSaldos = async (usuario) => {
    if (!usuario?.id) {
      setSaldos([])
      setTotalDevendo(0)
      setTotalRecebendo(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const now = new Date()
      const mesAtual = now.getMonth() + 1
      const anoAtual = now.getFullYear()

      const [
        { data: divisoes, error: divisoesError },
        { data: streamingsPagos, error: streamingsError },
        { data: pagamentosMes, error: pagamentosError }
      ] = await Promise.all([
        supabase
          .from('divisoes')
          .select(`
            *,
            streaming:streamings (
              id,
              nome,
              valor_total,
              pagador_id,
              pagador:users!streamings_pagador_id_fkey (
                id,
                nome
              ),
              divisoes ( id )
            )
          `)
          .eq('user_id', usuario.id),
        supabase
          .from('streamings')
          .select(`
            *,
            divisoes (
              *,
              user:users (
                id,
                nome
              )
            )
          `)
          .eq('pagador_id', usuario.id),
        supabase
          .from('pagamentos_mensais')
          .select('*')
          .eq('usuario_id', usuario.id)
          .eq('mes', mesAtual)
          .eq('ano', anoAtual)
      ])

      if (divisoesError) throw divisoesError
      if (streamingsError) throw streamingsError
      if (pagamentosError) console.error('Erro ao buscar pagamentos:', pagamentosError)

      // Criar mapa de pagamentos do mês
      const pagamentosMap = new Map()
      pagamentosMes?.forEach(p => {
        pagamentosMap.set(p.pessoa_id, p)
      })

      const saldosMap = new Map()
      let totalDevendoAcumulado = 0
      let totalRecebendoAcumulado = 0

      divisoes?.forEach((divisao) => {
        const streaming = divisao.streaming
        if (!streaming) return

        const participantes = (streaming.divisoes?.length || 0) + 1
        const valorTotal = Number(streaming.valor_total) || 0
        const valorPadrao = participantes > 0
          ? valorTotal / participantes
          : 0
        const valorPorPessoa = divisao.valor_personalizado != null
          ? Number(divisao.valor_personalizado)
          : valorPadrao

        if (streaming.pagador_id === usuario.id) {
          return
        }

        const pagador = streaming.pagador || {
          id: streaming.pagador_id,
          nome: 'Pagador'
        }

          if (!saldosMap.has(streaming.pagador_id)) {
            saldosMap.set(streaming.pagador_id, {
              pessoa: pagador,
              valor: 0,
              breakdown: []
            })
        }

        const registro = saldosMap.get(streaming.pagador_id)
        if (!registro.pessoa) {
          registro.pessoa = pagador
        }
          registro.valor -= valorPorPessoa
          totalDevendoAcumulado += valorPorPessoa
          // Adiciona detalhe para justificar o valor
          registro.breakdown.push({
            streamingId: streaming.id,
            nome: streaming.nome,
            valor: valorPorPessoa,
            valorTotal: valorTotal,
            participantes: participantes,
            participantesNomes: (streaming.divisoes || []).map(d => d.user?.nome).filter(Boolean),
            usedProfiles: 1,
            tipo: 'você_deve' // indica que o usuário deve esse valor para o pagador
          })
      })

      streamingsPagos?.forEach((streaming) => {
        const participantes = (streaming.divisoes?.length || 0) + 1
        const valorTotal = Number(streaming.valor_total) || 0
        const valorPadrao = participantes > 0
          ? valorTotal / participantes
          : 0

        streaming.divisoes?.forEach((divisao) => {
          const userId = divisao.user_id
          const participante = divisao.user || {
            id: userId,
            nome: 'Participante'
          }

            if (!saldosMap.has(userId)) {
              saldosMap.set(userId, {
                pessoa: participante,
                valor: 0,
                breakdown: []
              })
          }

          const valorPorPessoa = divisao.valor_personalizado != null
            ? Number(divisao.valor_personalizado)
            : valorPadrao

          const registro = saldosMap.get(userId)
          if (!registro.pessoa) {
            registro.pessoa = participante
          }
          registro.valor += valorPorPessoa
          totalRecebendoAcumulado += valorPorPessoa
          // Adiciona detalhe indicando que esse participante deve esse valor ao usuário
          registro.breakdown.push({
            streamingId: streaming.id,
            nome: streaming.nome,
            valor: valorPorPessoa,
            valorTotal: valorTotal,
            participantes: participantes,
            participantesNomes: (streaming.divisoes || []).map(d => d.user?.nome).filter(Boolean),
            usedProfiles: 1,
            tipo: 'deve_para_voce'
          })
        })
      })

      const saldosOrdenados = Array.from(saldosMap.values())
        .filter((item) => Math.abs(item.valor) > 0.01)
        .map(item => {
          // Verifica se há pagamento do mês atual para esta pessoa
          const pagamento = pagamentosMap.get(item.pessoa.id)
          return {
            ...item,
            pagoEsseMes: !!pagamento
          }
        })
        .sort((a, b) => b.valor - a.valor)

      setSaldos(saldosOrdenados)
      setTotalDevendo(totalDevendoAcumulado)
      setTotalRecebendo(totalRecebendoAcumulado)
    } catch (error) {
      console.error('Erro ao carregar saldos:', error)
      setSaldos([])
      setTotalDevendo(0)
      setTotalRecebendo(0)
    } finally {
      setLoading(false)
    }
  }

  const showSkeleton = !mounted || !user || loading

  if (showSkeleton) {
    return <DashboardSkeleton />
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px' }}>
        {/* Grid de Tiles (Windows Phone Layout Responsivo) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '8px',
        }}>
          {/* Live Tile 4x2 com Flip */}
          <div style={{ 
            gridColumn: 'span 2', 
            perspective: '1000px' 
          }}>
            <div
              style={{
                position: 'relative',
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotation}deg)`,
                transition: 'transform 0.7s ease-in-out',
              }}
            >
              {/* Frente: "Olá, [Nome]" */}
              <div style={{ backfaceVisibility: 'hidden' }}>
                <MetroTile color={MetroColors.blue} size="wide" hoverable={false}>
                  <div>
                    <h2 style={{ 
                      fontFamily: 'Segoe UI, sans-serif',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      textTransform: 'lowercase',
                      color: 'white',
                      margin: 0
                    }}>
                      olá, {user.nome.split(' ')[0].toLowerCase()}
                    </h2>
                    <p style={{ 
                      marginTop: '4px',
                      fontFamily: 'Segoe UI, sans-serif',
                      fontSize: '0.875rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      margin: 0
                    }}>
                      despesas compartilhadas
                    </p>
                  </div>
                </MetroTile>
              </div>

              {/* Verso: Informações de progresso */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)',
              }}>
                <MetroTile color={MetroColors.blue} size="wide" hoverable={false}>
                  <div>
                    <h2 style={{ 
                      fontFamily: 'Segoe UI, sans-serif',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      textTransform: 'lowercase',
                      color: 'white',
                      margin: 0,
                      marginBottom: '16px'
                    }}>
                      resumo financeiro
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontFamily: 'Segoe UI, sans-serif',
                          fontSize: '0.875rem',
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}>recebendo</span>
                        <span style={{ 
                          fontFamily: 'Segoe UI, sans-serif',
                          fontSize: '1.25rem',
                          color: 'white',
                          fontWeight: 300
                        }}>R$ {totalRecebendo.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontFamily: 'Segoe UI, sans-serif',
                          fontSize: '0.875rem',
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}>devendo</span>
                        <span style={{ 
                          fontFamily: 'Segoe UI, sans-serif',
                          fontSize: '1.25rem',
                          color: 'white',
                          fontWeight: 300
                        }}>R$ {totalDevendo.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.3)'
                      }}>
                        <span style={{ 
                          fontFamily: 'Segoe UI, sans-serif',
                          fontSize: '0.875rem',
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontWeight: 600
                        }}>saldo</span>
                        <span style={{ 
                          fontFamily: 'Segoe UI, sans-serif',
                          fontSize: '1.5rem',
                          color: 'white',
                          fontWeight: 600
                        }}>R$ {(totalRecebendo - totalDevendo).toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>
                </MetroTile>
              </div>
            </div>
          </div>

          {/* Título: Pessoas */}
          {saldos.length > 0 && (
            <div style={{ 
              gridColumn: 'span 2',
              marginTop: '16px',
              marginBottom: '8px'
            }}>
              <h3 style={{
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--text-muted)',
                margin: 0
              }}>pessoas</h3>
            </div>
          )}

          {/* Tiles de Pessoas 2x2 */}
          {saldos.map((saldo, index) => {
            const isExpanded = expandedId === saldo.pessoa.id;
            const isEvenPosition = index % 2 === 1; // posição par (direita) no grid
            const isLastItem = index === saldos.length - 1;
            // Verifica se deve mostrar detalhes: quando é posição par E está expandido, 
            // OU quando é posição ímpar E o card da esquerda está expandido
            const previousSaldo = index > 0 ? saldos[index - 1] : null;
            const isPreviousExpanded = previousSaldo && expandedId === previousSaldo.pessoa.id;
            const shouldShowDetails = (isExpanded && (isEvenPosition || isLastItem)) || (isEvenPosition && isPreviousExpanded);
            
            // Encontra o saldo expandido (pode ser o atual ou o anterior)
            const expandedSaldo = isExpanded ? saldo : (isPreviousExpanded ? previousSaldo : null);
            
            return (
              <React.Fragment key={saldo.pessoa.id}>
                <div onClick={() => setExpandedId(isExpanded ? null : saldo.pessoa.id)}>
                  <MetroTile color={MetroColors.blue} size="medium" style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <h2 style={{ 
                        fontFamily: 'Segoe UI, sans-serif',
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        textTransform: 'lowercase',
                        color: 'white',
                        margin: 0
                      }}>
                        {saldo.pessoa.nome.toLowerCase()}
                      </h2>
                      <p style={{ 
                        marginTop: '4px',
                        fontFamily: 'Segoe UI, sans-serif',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.9)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {saldo.pagoEsseMes ? 'tudo certo esse mês' : (saldo.valor > 0 ? 'deve para você' : 'você deve')}
                      </p>
                    </div>
                    <div style={{ 
                      textAlign: 'right',
                      fontFamily: 'Segoe UI, sans-serif',
                      fontSize: '2rem',
                      fontWeight: 300,
                      color: 'rgba(255, 255, 255, 0.2)',
                      marginTop: 'auto',
                      alignSelf: 'flex-end'
                    }}>
                      {saldo.pagoEsseMes ? '' : `R$ ${Math.abs(saldo.valor).toFixed(2).replace('.', ',')}`}
                    </div>
                  </MetroTile>
                </div>

                {/* Detalhes expandidos após completar a linha */}
                {shouldShowDetails && expandedSaldo && (
                  <React.Fragment>
                <div style={{ 
                  gridColumn: 'span 2',
                  background: 'var(--bg-secondary)', 
                  padding: '24px',
                  borderRadius: '4px',
                  overflow: 'visible',
                  animation: 'slideDown 0.3s ease-out'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'relative' }}>
                    <h3 className="metro-details-title">detalhes de {expandedSaldo.pessoa.nome.toLowerCase()}</h3>
                    
                    {/* Botão de três pontos */}
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setMenuOpen(menuOpen === expandedSaldo.pessoa.id ? null : expandedSaldo.pessoa.id);
                      }}
                      className="metro-ellipsis-button"
                    >
                      ⋯
                    </button>

                    {/* Menu popup estilo Windows Phone */}
                    {menuOpen === expandedSaldo.pessoa.id && (
                      <div 
                        className="metro-menu"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            copiarResumo(expandedSaldo);
                            setMenuOpen(null);
                          }}
                          className="metro-menu__item"
                        >
                          copiar resumo
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            copiarChavePix(expandedSaldo);
                            setMenuOpen(null);
                          }}
                          className="metro-menu__item"
                        >
                          copiar chave pix
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            abrirWhatsAppItau(expandedSaldo);
                            setMenuOpen(null);
                          }}
                          className="metro-menu__item"
                        >
                          pix no whatsapp do itaú
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            marcarComoPago(expandedSaldo);
                            setMenuOpen(null);
                          }}
                          className="metro-menu__item"
                        >
                          marcar {new Date().toLocaleDateString('pt-BR', { month: 'long' })} como pago
                        </button>
                      </div>
                    )}
                  </div>
                    {expandedSaldo.breakdown && expandedSaldo.breakdown.length > 0 ? (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {expandedSaldo.breakdown.map((d, i) => {
                          const sign = d.tipo === 'deve_para_voce' ? '+' : '-'
                          const perPerson = Number(d.valor) || 0
                          const total = Number(d.valorTotal) || 0
                          const count = d.participantes || 1
                          return (
                            <li key={`${d.streamingId}-${i}`} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              padding: '12px 0', 
                              borderBottom: i < expandedSaldo.breakdown.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                            }}>
                              <div>
                                <div style={{ 
                                  fontWeight: 600, 
                                  color: 'var(--text-primary)',
                                  marginBottom: '4px'
                                }}>{d.nome}</div>
                                <div style={{ 
                                  fontSize: '0.8rem', 
                                  color: 'var(--text-muted)'
                                }}>
                                  Total: R$ {total.toFixed(2).replace('.', ',')} ÷ {count} perfis = R$ {perPerson.toFixed(2).replace('.', ',')}
                                </div>
                              </div>
                              <div style={{ 
                                fontWeight: 700, 
                                fontSize: '1.1rem',
                                color: d.tipo === 'deve_para_voce' ? 'var(--success)' : 'var(--danger)' 
                              }}>
                                {sign} R$ {perPerson.toFixed(2).replace('.', ',')}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <div style={{ 
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        padding: '24px',
                        fontFamily: 'Segoe UI, sans-serif'
                      }}>Nenhum detalhe disponível</div>
                    )}
                    
                    {/* Total do saldo */}
                    {expandedSaldo.breakdown && expandedSaldo.breakdown.length > 0 && (
                      <div style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '2px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{
                          fontFamily: 'Segoe UI, sans-serif',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {expandedSaldo.valor > 0 ? 'Total a receber' : 'Total a pagar'}
                        </div>
                        <div style={{
                          fontFamily: 'Segoe UI, sans-serif',
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          color: expandedSaldo.valor > 0 ? 'var(--success)' : 'var(--danger)'
                        }}>
                          R$ {Math.abs(expandedSaldo.valor).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
                )}
              </React.Fragment>
            );
          })}

          {/* Título: Configurações */}
          <div style={{ 
            gridColumn: 'span 2',
            marginTop: '16px',
            marginBottom: '8px'
          }}>
            <h3 style={{
              fontFamily: 'Segoe UI, sans-serif',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--text-muted)',
              margin: 0
            }}>configurações</h3>
          </div>

          {/* Tile de Notificações/Configurações */}
          <MetroTile 
            color={MetroColors.blue} 
            size="medium"
            onClick={notificacoesAtivadas ? testarNotificacao : ativarNotificacoes}
          >
            <div>
              <h2 style={{ 
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                textTransform: 'lowercase',
                color: 'white',
                margin: 0
              }}>
                {notificacoesAtivadas ? 'testar' : 'ativar'}
              </h2>
              <p style={{ 
                marginTop: '4px',
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: 0
              }}>
                notificações
              </p>
            </div>
          </MetroTile>

          {/* Tile de Streamings */}
          <MetroTile 
            color={MetroColors.blue} 
            size="medium"
            onClick={() => navigate('/streamings')}
          >
            <div>
              <h2 style={{ 
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                textTransform: 'lowercase',
                color: 'white',
                margin: 0
              }}>
                streamings
              </h2>
              <p style={{ 
                marginTop: '4px',
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: 0
              }}>
                gerenciar assinaturas
              </p>
            </div>
          </MetroTile>

          {/* Tile de Pessoas */}
          <MetroTile 
            color={MetroColors.blue} 
            size="medium"
            onClick={() => navigate('/usuarios')}
          >
            <div>
              <h2 style={{ 
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                textTransform: 'lowercase',
                color: 'white',
                margin: 0
              }}>
                pessoas
              </h2>
              <p style={{ 
                marginTop: '4px',
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: 0
              }}>
                gerenciar grupo
              </p>
            </div>
          </MetroTile>

          {/* Tile de Sair */}
          <MetroTile 
            color={MetroColors.blue} 
            size="medium"
            onClick={logout}
          >
            <div>
              <h2 style={{ 
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '1.25rem',
                fontWeight: 600,
                textTransform: 'lowercase',
                color: 'white',
                margin: 0
              }}>
                sair
              </h2>
              <p style={{ 
                marginTop: '4px',
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.9)',
                margin: 0
              }}>
                encerrar sessão
              </p>
            </div>
          </MetroTile>
        </div>

        {/* Empty State */}
        {saldos.length === 0 && (
          <div style={{ 
            gridColumn: 'span 2',
            marginTop: '64px',
            border: '2px dashed var(--border-subtle)',
            padding: '48px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              marginBottom: '8px',
              fontFamily: 'Segoe UI, sans-serif',
              fontSize: '1.25rem',
              fontWeight: 300,
              textTransform: 'lowercase',
              color: 'var(--text-primary)'
            }}>
              nenhuma despesa
            </h3>
            <p style={{ 
              fontFamily: 'Segoe UI, sans-serif',
              fontSize: '0.875rem',
              color: 'var(--text-muted)'
            }}>
              cadastre streamings para começar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
