// Service Worker de AppHub para funcionamiento offline y actualizaciones automáticas (OTA)
const CACHE_NAME = 'apphub-cache-v8'
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg'
]

// Instalación: Precargar shell de la aplicación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

// Activación: Purgar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Estrategia Network-First con fallback a caché
// Permite que cualquier cambio subido a Render o al servidor se reciba al instante
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // Ignorar peticiones a APIs de sincronización en vivo o websockets
  const url = new URL(req.url)
  if (url.pathname.startsWith('/api') || url.pathname.includes('/sse') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return
  }

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone).catch(() => {})
          })
        }
        return networkResponse
      })
      .catch(() => {
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse
          if (req.mode === 'navigate') {
            return caches.match('/')
          }
        })
      })
  )
})
