import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import AutoOrganizerPage from './pages/AutoOrganizerPage'
import NotebooksPage from './pages/NotebooksPage'
import CalendarPage from './pages/CalendarPage'
import AIAssistantPage from './pages/AIAssistantPage'
import MyHubPage from './pages/MyHubPage'

function RootErrorBoundary() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#121620] flex items-center justify-center p-6 text-slate-800 dark:text-slate-100 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-[#161b26] rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-4">
        <img src="/logo.png" alt="AppHub Logo" className="w-12 h-12 object-contain bg-white rounded-2xl p-1 shadow-xs border border-slate-200 dark:border-slate-700 shrink-0" />
        <h2 className="text-base font-bold">Recuperando sesión de AppHub</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Se ha restablecido la conexion correctamente. Pulsa para continuar al calendario.
        </p>
        <button
          type="button"
          onClick={() => { window.location.href = '/calendar' }}
          className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:opacity-90 cursor-pointer shadow-sm active:scale-95 transition-all"
        >
          Continuar al Calendario
        </button>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RootErrorBoundary />,
    children: [
      { path: '/', element: <AutoOrganizerPage /> },
      { path: '/auto-organizer', element: <Navigate to="/" replace /> },
      { path: '/notebooks', element: <NotebooksPage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/ai-assistant', element: <AIAssistantPage /> },
      { path: '/my-hub', element: <MyHubPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
