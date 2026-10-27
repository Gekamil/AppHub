import { Suspense, useEffect } from 'react'
import { createBrowserRouter, createHashRouter, RouterProvider, Navigate, useRouteError } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import UpdateNotification from './components/UpdateNotification'
import { lazyWithRetry, isChunkLoadError } from './utils/lazyWithRetry'

const AutoOrganizerPage = lazyWithRetry(() => import('./pages/AutoOrganizerPage'), 'AutoOrganizerPage')
const NotebooksPage = lazyWithRetry(() => import('./pages/NotebooksPage'), 'NotebooksPage')
const CalendarPage = lazyWithRetry(() => import('./pages/CalendarPage'), 'CalendarPage')
const AIAssistantPage = lazyWithRetry(() => import('./pages/AIAssistantPage'), 'AIAssistantPage')
const MyHubPage = lazyWithRetry(() => import('./pages/MyHubPage'), 'MyHubPage')
const NewsPage = lazyWithRetry(() => import('./pages/NewsPage'), 'NewsPage')
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'), 'LandingPage')

function preloadAppRoutes() {
  const preload = () => {
    try {
      import('./pages/AutoOrganizerPage')
      import('./pages/NotebooksPage')
      import('./pages/CalendarPage')
      import('./pages/AIAssistantPage')
      import('./pages/MyHubPage')
      import('./pages/NewsPage')
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    setTimeout(preload, 50)
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => preload(), { timeout: 1000 })
    }
  }
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
      <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
    </div>
  )
}

const isElectronApp =
  typeof window !== 'undefined' &&
  (!!window.electronAPI?.isElectron ||
    /Electron/i.test(navigator.userAgent || '') ||
    window.location.protocol === 'file:')

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  const isCap = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())
  const isElec = !!(window.electronAPI?.isElectron || /Electron/i.test(navigator.userAgent || ''))
  const isPwa = window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true
  return isCap || isElec || isPwa || window.location.protocol === 'file:'
}

function RootDispatcher() {
  // Si la aplicación se ejecuta como aplicación nativa de escritorio o móvil instalada
  // se abre directamente el espacio de trabajo en /app sin pasar por la landing pública
  if (isStandaloneMode()) {
    return <Navigate to="/app" replace />
  }
  // En visitas web normales, se renderiza la landing page interactiva completa
  return <LandingPage />
}

function RootErrorBoundary() {
  const error = useRouteError()
  if (error) {
    console.error('[RootErrorBoundary caught error]:', error)
  }

  const errorMessage = error?.message || (typeof error === 'string' ? error : '') || error?.statusText || ''
  const isChunkError = isChunkLoadError(error)

  const handleSafeReload = () => {
    try {
      sessionStorage.clear()
    } catch (e) {}
    window.location.reload()
  }

  const handleResumeWorkspace = () => {
    window.location.href = '/app'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#121620] flex items-center justify-center p-6 text-slate-800 dark:text-slate-100 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-[#161b26] rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-4">
        <img
          src="/logo.png"
          alt="StudentHub Logo"
          className="w-12 h-12 object-contain bg-white rounded-2xl p-1 shadow-xs border border-slate-200 dark:border-slate-700 shrink-0"
        />
        <h2 className="text-base font-bold">
          {isChunkError ? 'Actualizando StudentHub a la última versión' : 'Recuperando sesión de StudentHub'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isChunkError
            ? 'Se ha publicado una nueva actualización de StudentHub. Pulsa para recargar y aplicar los cambios sin perder tus datos ni notas guardadas.'
            : 'Se ha restablecido la conexión correctamente. Pulsa para reanudar tu espacio de trabajo.'}
        </p>

        {errorMessage && (
          <div className="w-full text-left p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-mono text-[11px] break-all max-h-32 overflow-y-auto">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full pt-2">
          <button
            type="button"
            onClick={handleResumeWorkspace}
            className="w-full px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:opacity-90 cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            Continuar a StudentHub
          </button>
          <button
            type="button"
            onClick={handleSafeReload}
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:opacity-90 cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            {isChunkError ? 'Actualizar ahora' : 'Recargar página'}
          </button>
        </div>
      </div>
    </div>
  )
}

const createRouter = isElectronApp ? createHashRouter : createBrowserRouter

const router = createRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<PageFallback />}>
        <RootDispatcher />
      </Suspense>
    ),
    errorElement: <RootErrorBoundary />,
  },
  {
    path: '/landing',
    element: (
      <Suspense fallback={<PageFallback />}>
        <LandingPage />
      </Suspense>
    ),
    errorElement: <RootErrorBoundary />,
  },
  {
    element: <AppShell />,
    errorElement: <RootErrorBoundary />,
    children: [
      {
        path: '/app',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AutoOrganizerPage />
          </Suspense>
        ),
      },
      { path: '/auto-organizer', element: <Navigate to="/app" replace /> },
      {
        path: '/notebooks',
        element: (
          <Suspense fallback={<PageFallback />}>
            <NotebooksPage />
          </Suspense>
        ),
      },
      {
        path: '/calendar',
        element: (
          <Suspense fallback={<PageFallback />}>
            <CalendarPage />
          </Suspense>
        ),
      },
      {
        path: '/ai-assistant',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AIAssistantPage />
          </Suspense>
        ),
      },
      {
        path: '/my-hub',
        element: (
          <Suspense fallback={<PageFallback />}>
            <MyHubPage />
          </Suspense>
        ),
      },
      {
        path: '/news',
        element: (
          <Suspense fallback={<PageFallback />}>
            <NewsPage />
          </Suspense>
        ),
      },
      { path: '*', element: <Navigate to="/app" replace /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

export default function App() {
  useEffect(() => {
    preloadAppRoutes()
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      <UpdateNotification />
    </>
  )
}
