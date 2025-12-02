export const solicitarPermissao = async () => {
  if (!('Notification' in window)) {
    console.log('Este navegador não suporta notificações')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

export const enviarNotificacao = (titulo, opcoes = {}) => {
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Enviar via Service Worker para funcionar em background
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        titulo,
        opcoes
      })
    } else {
      // Fallback: notificação direta
      new Notification(titulo, opcoes)
    }
  }
}

export const verificarCobrancasHoje = async (user, supabase) => {
  if (!user?.id) {
    return []
  }

  const hoje = new Date().getDate()
  
  try {
    // Buscar streamings que vencem hoje
    const { data: streamings, error } = await supabase
      .from('streamings')
      .select(`
        *,
        pagador:users!streamings_pagador_id_fkey (nome),
        divisoes (
          *,
          user:users (id, nome)
        )
      `)
      .eq('dia_cobranca', hoje)

    if (error) throw error

    const notificacoes = []

    streamings?.forEach((streaming) => {
      const totalPessoas = streaming.divisoes.length + 1
      const valorPorPessoa = streaming.valor_total / totalPessoas

      // Se o usuário é o pagador
      if (streaming.pagador_id === user.id) {
        const totalReceber = valorPorPessoa * streaming.divisoes.length
        if (totalReceber > 0) {
          notificacoes.push({
            titulo: '💰 Você vai receber hoje!',
            opcoes: {
              body: `${streaming.nome}: R$ ${totalReceber.toFixed(2)} de ${streaming.divisoes.length} ${streaming.divisoes.length === 1 ? 'pessoa' : 'pessoas'}`,
              icon: '/icon-192.svg',
              badge: '/icon-192.svg',
              tag: `receber-${streaming.id}`,
              requireInteraction: true
            }
          })
        }
      }

      // Se o usuário está nas divisões
      const estaNaDivisao = streaming.divisoes.some(d => d.user_id === user.id)
      if (estaNaDivisao) {
        notificacoes.push({
          titulo: '💸 Você tem despesas para acertar hoje!',
          opcoes: {
            body: `${streaming.nome}: R$ ${valorPorPessoa.toFixed(2)} para ${streaming.pagador.nome}`,
            icon: '/icon-192.svg',
            badge: '/icon-192.svg',
            tag: `pagar-${streaming.id}`,
            requireInteraction: true
          }
        })
      }
    })

    return notificacoes
  } catch (error) {
    console.error('Erro ao verificar despesas:', error)
    return []
  }
}

export const agendarVerificacaoDiaria = (user, supabase) => {
  if (!user?.id) {
    return null
  }

  const executarVerificacao = async () => {
    const notificacoes = await verificarCobrancasHoje(user, supabase)
    notificacoes.forEach(({ titulo, opcoes }) => {
      enviarNotificacao(titulo, opcoes)
    })
  }

  executarVerificacao()

  const intervalo = setInterval(executarVerificacao, 60 * 60 * 1000)

  return intervalo
}
