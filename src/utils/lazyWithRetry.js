import { lazy } from 'react'

export const CHUNK_RELOAD_STORAGE_KEY = 'studenthub_chunk_reload_cooldown'
export const CHUNK_RELOAD_COOLDOWN_MS = 15000

/**
 * Checks whether an error is caused by a failed dynamic chunk or module import
 * (typically after a new release has replaced old hashed chunks).
 *
 * @param {Error|any} error
 * @returns {boolean}
 */
export function isChunkLoadError(error) {
  if (!error) return false
  const msg = String(error?.message || error || '')
  return (
    error?.name === 'ChunkLoadError' ||
    /Loading chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Failed to load module script/i.test(msg) ||
    /Unexpected token '<'/i.test(msg) ||
    /Load failed/i.test(msg)
  )
}

/**
 * Wraps dynamic component imports with React.lazy and automatic retry/reload logic
 * when a stale chunk fails to load after a deployment.
 * Eagerly pre-fetches and caches chunk modules so tab switching is instantaneous (0ms delay).
 *
 * @param {Function} componentImportFn - Dynamic import function, e.g. () => import('./pages/MyHubPage')
 * @param {string|object} [nameOrOptions] - Chunk name string or configuration options
 * @returns {React.LazyExoticComponent}
 */
export function lazyWithRetry(componentImportFn, nameOrOptions = {}) {
  const options = typeof nameOrOptions === 'string'
    ? { chunkName: nameOrOptions }
    : (nameOrOptions || {})
  const chunkName = options.chunkName || 'chunk'
  const cooldownMs = options.cooldownMs || CHUNK_RELOAD_COOLDOWN_MS

  let cachedPromise = null
  const loadModule = () => {
    if (!cachedPromise) {
      cachedPromise = componentImportFn().catch((err) => {
        cachedPromise = null // Clear cache so subsequent retry or reload can trigger
        throw err
      })
    }
    return cachedPromise
  }

  // Pre-fetch immediately in non-blocking background task
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      loadModule().catch(() => {})
    }, 20)
  }

  const LazyComponent = lazy(async () => {
    try {
      return await loadModule()
    } catch (error) {
      console.warn(`[lazyWithRetry] Error loading chunk "${chunkName}":`, error)

      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
      const canReload = !isOffline && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined'

      if (isChunkLoadError(error) && canReload) {
        const lastReload = sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)
        const now = Date.now()

        if (!lastReload || now - parseInt(lastReload, 10) > cooldownMs) {
          sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now))
          console.info(`[lazyWithRetry] Stale chunk detected for "${chunkName}". Refreshing page to load latest version...`)
          window.location.reload()
          // Return a pending promise so Suspense fallback remains active while page reloads
          return new Promise(() => {})
        } else {
          console.warn(`[lazyWithRetry] Reload cooldown active (${Math.round((now - parseInt(lastReload, 10)) / 1000)}s ago). Passing error to RootErrorBoundary.`)
        }
      }

      // If already reloaded recently or offline or not a chunk error, bubble error to RootErrorBoundary
      throw error
    }
  })

  LazyComponent.preload = loadModule
  return LazyComponent
}

export default lazyWithRetry
