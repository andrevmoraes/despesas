// Atualize a versão ao alterar a estratégia de cache
const CACHE_NAME = 'cobranca-v3'
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
]

// Instalação do service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto')
        return cache.addAll(urlsToCache)
      })
  )
  // Pede para ativar este SW imediatamente sem aguardar páginas fecharem
  self.skipWaiting()
})

// Ativação do service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Assume o controle das páginas imediatamente após ativação
  self.clients && self.clients.claim()
})

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const request = event.request
  const requestUrl = new URL(request.url)

  // Excluir requisições externas (ex: Supabase) - deixar passar direto para a rede
  if (requestUrl.origin !== self.location.origin) {
    return
  }

  // Para requisições de navegação (HTML) usamos network-first para evitar
  // servir um index.html antigo quando uma nova versão está disponível.
  const acceptHeader = request.headers.get('accept') || ''

  if (request.mode === 'navigate' || acceptHeader.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Atualiza cache com a versão mais recente do HTML
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return networkResponse
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Para arquivos de script e CSS (assets versionados do Vite), usar network-first
  // para garantir que mudanças de UI sejam imediatamente refletidas
  if (requestUrl.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(request.clone())
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return caches.match(request) || networkResponse
          }
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache))
          return networkResponse
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Para outros recursos (imagens, fontes, etc), cache-first para performance
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) return response
      return fetch(request.clone()).then((networkResponse) => {
        // Só cacheia respostas válidas
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse
        }
        const responseToCache = networkResponse.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache))
        return networkResponse
      })
    })
  )
})

// Gerenciar notificações
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { titulo, opcoes } = event.data
    self.registration.showNotification(titulo, opcoes)
  }
})

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow('/')
  )
})
