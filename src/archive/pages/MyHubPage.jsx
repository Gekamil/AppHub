import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAppTheme, APP_THEMES } from '../services/appTheme'

export default function MyHubPage() {
  const navigate = useNavigate()
  const [, setAppThemeState] = useState(() => getAppTheme())

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail && APP_THEMES.some((t) => t.id === e.detail)) {
        setAppThemeState(e.detail)
      } else if (!e.detail) {
        setAppThemeState(getAppTheme())
      }
    }
    window.addEventListener('app_theme_style_changed', handleThemeChange)
    window.addEventListener('app_theme_changed', handleThemeChange)
    return () => {
      window.removeEventListener('app_theme_style_changed', handleThemeChange)
      window.removeEventListener('app_theme_changed', handleThemeChange)
    }
  }, [])

  return (
    <div className="relative w-full min-h-[calc(100vh-140px)] rounded-3xl overflow-hidden flex items-center justify-center p-6 text-center select-none bg-surface-subtle/30">
      {/* Tarjeta de estado de mantenimiento / preview limpia sin doble árbol fantasma ni blurs pesados */}
      <div className="max-w-md w-full bg-white/90 dark:bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-[32px]">lock</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mx-auto">
            <span className="material-symbols-outlined text-[14px]">construction</span>
            <span>Próximamente</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            My Hub (Recursos & Enlaces)
          </h2>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed">
            Este módulo se encuentra protegido y en fase de optimización. Si deseas trabajar únicamente con Calendario y Tareas, puedes desactivar esta pestaña en <strong>Ajustes &gt; Pestañas Visibles</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          <span>Ir al Calendario</span>
        </button>
      </div>
    </div>
  )
}
