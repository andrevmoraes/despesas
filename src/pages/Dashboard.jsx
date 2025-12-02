import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import * as notificacoes from '../services/notificacoes'
import '../styles/tiles.css'

export default function Dashboard({ showAlert }) {
  const { user, logout } = useAuth()
  const [saldos, setSaldos] = useState([])
  const [totalDevendo, setTotalDevendo] = useState(0)
  const [totalRecebendo, setTotalRecebendo] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notificacoesAtivadas, setNotificacoesAtivadas] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const intervaloNotificacoesRef = useRef(null)

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
        linhas.push(`Você deve me transferir R$ ${formatMoneyText(saldoFinal)}`)
      } else if (saldoFinal < 0) {
        linhas.push(`Eu devo transferir R$ ${formatMoneyText(Math.abs(saldoFinal))}`)
      } else {
        linhas.push(`R$ 0,00`)
      }
    } else {
      // Se só houver uma das categorias, não mostramos Totais — vamos direto ao valor a transferir
      if (saldoFinal > 0) {
        linhas.push(`Você deve me transferir R$ ${formatMoneyText(saldoFinal)}`)
      } else if (saldoFinal < 0) {
        linhas.push(`Eu devo transferir R$ ${formatMoneyText(Math.abs(saldoFinal))}`)
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
      await navigator.clipboard.writeText(texto)
      showAlert('Texto Pix copiado para a área de transferência', 'success')
    } catch (err) {
      console.error('Erro ao copiar PIX:', err)
      showAlert('Não foi possível copiar o texto do PIX.', 'error')
    }
  }

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

    notificacoes.enviarNotificacao('🔔 Teste de notificação', {
      body: 'Se você está vendo esta mensagem, as notificações estão funcionando! 🎉',
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

      const [
        { data: divisoes, error: divisoesError },
        { data: streamingsPagos, error: streamingsError }
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
          .eq('pagador_id', usuario.id)
      ])

      if (divisoesError) throw divisoesError
      if (streamingsError) throw streamingsError

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

  if (loading) {
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
        <div>
          <h1 style={{ 
            fontWeight: 'var(--font-weight-bold)', 
            marginBottom: 'var(--spacing-xs)',
            fontSize: '2.5rem',
            letterSpacing: '-1px'
          }}>
            Olá, {user.nome}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Aqui está um resumo das suas despesas compartilhadas
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {!notificacoesAtivadas && 'Notification' in window && (
            <button 
              onClick={ativarNotificacoes} 
              className="btn btn--accent btn--small"
              title="Receba lembretes no dia das despesas"
            >
              🔔 Ativar Notificações
            </button>
          )}
          {notificacoesAtivadas && (
            <button
              onClick={testarNotificacao}
              className="btn btn--secondary btn--small"
              title="Dispara uma notificação de teste"
            >
              🎯 Testar Notificação
            </button>
          )}
          <button onClick={logout} className="btn btn--ghost btn--small">
            Sair
          </button>
        </div>
      </div>

      {/* Visão geral removida — exibir somente detalhes por pessoa conforme solicitado */}

      <h2 style={{ 
        marginTop: 'var(--spacing-xl)', 
        marginBottom: 'var(--spacing-lg)',
        fontWeight: 'var(--font-weight-light)'
      }}>
        Detalhes por pessoa
      </h2>

      <div className="tile-grid">
        {saldos.map((saldo, index) => (
          <div key={saldo.pessoa.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setExpandedId(expandedId === saldo.pessoa.id ? null : saldo.pessoa.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') setExpandedId(expandedId === saldo.pessoa.id ? null : saldo.pessoa.id) }}
              className={`tile ${saldo.valor > 0 ? 'tile--green' : 'tile--pink'}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="tile__title">{saldo.pessoa.nome}</div>
              <div className="tile__subtitle">
                {saldo.valor > 0 ? 'deve para você' : 'você deve'}
              </div>
              <div className="tile__value">
                R$ {Math.abs(saldo.valor).toFixed(2)}
              </div>
            </div>

            {expandedId === saldo.pessoa.id && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-sm)',
                marginTop: 'var(--spacing-md)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0 }}>Detalhes</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); copiarResumo(saldo) }}
                      className="btn btn--ghost btn--small"
                      title="Copiar resumo"
                      style={{ opacity: 0.9 }}
                    >
                      Copiar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); copiarPix(saldo) }}
                      className="btn btn--ghost btn--small"
                      title="Copiar texto PIX"
                      style={{ opacity: 0.9 }}
                    >
                      Copiar PIX
                    </button>
                  </div>
                </div>
                {saldo.breakdown && saldo.breakdown.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {saldo.breakdown.map((d, i) => {
                      const sign = d.tipo === 'deve_para_voce' ? '+' : '-'
                      const perPerson = Number(d.valor) || 0
                      const total = Number(d.valorTotal) || 0
                      const count = d.participantes || 1
                      return (
                        <li key={`${d.streamingId}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e6e9ef' }}>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            <div>{d.nome}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                              {total.toFixed(2)} / {count} = {perPerson.toFixed(2)}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: d.tipo === 'deve_para_voce' ? 'var(--accent)' : 'var(--danger)' }}>
                            {sign} R$ {perPerson.toFixed(2)}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>Nenhum detalhe disponível</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {saldos.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          color: 'var(--text-muted)',
          padding: 'var(--spacing-xl)'
        }}>
          Nenhum streaming cadastrado ainda
        </div>
      )}
    </div>
  )
}
