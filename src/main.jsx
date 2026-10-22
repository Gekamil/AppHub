import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/themes.css'
import App from './App.jsx'
import { CHUNK_RELOAD_STORAGE_KEY, CHUNK_RELOAD_COOLDOWN_MS } from './utils/lazyWithRetry'

// Global listener for Vite chunk preload failures
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    if (typeof event.preventDefault === 'function') {
      event.preventDefault()
    }
    console.warn('[vite:preloadError] Vite detected stale or missing chunk:', event.payload || event)

    // Guard: Do not reload if user is offline
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      console.warn('[vite:preloadError] User is offline; skipping reload.')
      return
    }

    try {
      const lastReload = sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)
      const now = Date.now()

      if (!lastReload || now - parseInt(lastReload, 10) > CHUNK_RELOAD_COOLDOWN_MS) {
        sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now))
        console.info('[vite:preloadError] Reloading page to fetch updated chunk hashes...')
        window.location.reload()
      } else {
        console.warn('[vite:preloadError] Reload cooldown active. Delegating to RootErrorBoundary.')
      }
    } catch (e) {
      console.error('[vite:preloadError] Error handling preload reload:', e)
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

