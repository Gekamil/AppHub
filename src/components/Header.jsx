import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import ProfilePopover from './ProfilePopover'
import AIBotIcon from './AIBotIcon'

const mobileNavItems = [
  { name: 'Calendario', shortName: 'Agenda', to: '/calendar', icon: 'calendar_today' },
  { name: 'Tareas', shortName: 'Tareas', to: '/', icon: 'checklist' },
  { name: 'Notas', shortName: 'Notas', to: '/notebooks', icon: 'menu_book' },
  { name: 'Asistente IA', shortName: 'IA', to: '/ai-assistant', icon: 'smart_toy' },
  { name: 'My Hub', shortName: 'Hub', to: '/my-hub', icon: 'hub' },
]

export default function Header({
  onToggleSidebar,
  isSidebarOpen = true,
  navPosition = 'top',
  setNavPosition,
  aiAssistantMode = 'floating',
  setAiAssistantMode,
}) {
  const location = useLocation()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileButtonRef = useRef(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light')
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'es')

  const currentNavItems = aiAssistantMode === 'floating'
    ? mobileNavItems.filter((item) => item.to !== '/ai-assistant')
    : mobileNavItems

  // Pastilla deslizante animada para escritorio y móvil
  const navContainerRef = useRef(null)
  const itemRefs = useRef({})
  const hasMeasuredRef = useRef(false)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0, ready: false })

  const mobileNavContainerRef = useRef(null)
  const mobileItemRefs = useRef({})

  const getActiveItem = () => {
    const currentPath = location.pathname
    return (
      currentNavItems.find((item) =>
        item.to === '/'
          ? currentPath === '/' || currentPath === '/auto-organizer'
          : currentPath.startsWith(item.to)
      ) || currentNavItems[0]
    )
  }

  useLayoutEffect(() => {
    const updateIndicators = () => {
      const activeItem = getActiveItem()
      if (!activeItem) return

      // Pastilla de escritorio
      const desktopEl = itemRefs.current[activeItem.to]
      const desktopContainer = navContainerRef.current
      if (desktopEl && desktopContainer) {
        setIndicatorStyle((prev) => ({
          left: desktopEl.offsetLeft,
          width: desktopEl.offsetWidth,
          opacity: 1,
          ready: hasMeasuredRef.current,
        }))

        if (!hasMeasuredRef.current) {
          requestAnimationFrame(() => {
            hasMeasuredRef.current = true
            setIndicatorStyle((p) => ({ ...p, ready: true }))
          })
        }
      }
    }

    updateIndicators()
    const r1 = requestAnimationFrame(updateIndicators)
    const t1 = setTimeout(updateIndicators, 60)
    if (document.fonts?.ready) {
      document.fonts.ready.then(updateIndicators)
    }
    window.addEventListener('resize', updateIndicators)
    return () => {
      cancelAnimationFrame(r1)
      clearTimeout(t1)
      window.removeEventListener('resize', updateIndicators)
    }
  }, [location.pathname, aiAssistantMode, currentNavItems.length])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('app_theme', theme)
  }, [theme])

  useEffect(() => {
    const handleThemeSync = (e) => {
      const nextTheme = e.detail || localStorage.getItem('app_theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
      setTheme(nextTheme)
    }
    window.addEventListener('app_theme_changed', handleThemeSync)
    window.addEventListener('storage', handleThemeSync)
    return () => {
      window.removeEventListener('app_theme_changed', handleThemeSync)
      window.removeEventListener('storage', handleThemeSync)
    }
  }, [])

  useEffect(() => {
    if (isSettingsOpen) {
      const currentTheme = localStorage.getItem('app_theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
      setTheme(currentTheme)
    }
  }, [isSettingsOpen])

  const handleSelectTheme = (nextTheme) => {
    setTheme(nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('app_theme', nextTheme)
    window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: nextTheme }))
  }

  useEffect(() => {
    localStorage.setItem('app_language', language)
  }, [language])

  return (
    <>
      <header
        className={`fixed top-0 right-0 bg-surface-pure/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex flex-col justify-center px-3 sm:px-gutter-lg transition-all duration-300 left-0 ${
          navPosition === 'sidebar' && isSidebarOpen ? 'md:left-60' : 'md:left-0'
        }`}
      >
        <div className="h-14 flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {navPosition === 'sidebar' && (
              <button
                onClick={onToggleSidebar}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-muted hover:text-on-surface transition-colors cursor-pointer"
                title="Alternar barra lateral"
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[20px] text-primary">adjust</span>
              <span className="font-headline-sm text-sm font-bold text-on-surface tracking-tight">StudentHub</span>
            </div>
          </div>

          {/* Navegación Central en Escritorio (Fila Única con Pastilla Deslizante Fluida) */}
          {navPosition === 'top' && (
            <nav
              ref={navContainerRef}
              className="hidden md:flex items-center gap-1 bg-surface-muted/70 p-1 rounded-2xl border border-outline-variant/30 shadow-2xs relative"
            >
              {/* Pastilla Deslizante Apple */}
              <div
                className="absolute top-1 bottom-1 bg-primary rounded-xl shadow-xs pointer-events-none"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity,
                  transition: indicatorStyle.ready ? 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                }}
              />

              {currentNavItems.map((item) => {
                const isActive = (item.to === '/' && (location.pathname === '/' || location.pathname === '/auto-organizer')) || (item.to !== '/' && location.pathname.startsWith(item.to))
                return (
                  <NavLink
                    key={item.to}
                    ref={(el) => { itemRefs.current[item.to] = el }}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => {
                      const el = itemRefs.current[item.to]
                      if (el) {
                        setIndicatorStyle({
                          left: el.offsetLeft,
                          width: el.offsetWidth,
                          opacity: 1,
                          ready: true,
                        })
                      }
                    }}
                    className={`relative z-10 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                      isActive && indicatorStyle.opacity > 0
                        ? 'text-white font-bold'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}
            </nav>
          )}

          <div className="flex items-center gap-1 sm:gap-space-xs">
            <button
              onClick={() => alert('Módulo en desarrollo')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-muted hover:text-on-surface transition-colors cursor-pointer"
              title="Notificaciones"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-muted hover:text-on-surface transition-colors cursor-pointer"
              title="Ajustes de la aplicación"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </button>
            <button
              ref={profileButtonRef}
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="relative w-8 h-8 rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-[11px] tracking-tight ml-1 cursor-pointer hover:ring-2 hover:ring-primary/40 active:scale-95 transition-all shadow-xs shrink-0"
              title="Menú de perfil y cuenta (Focus Hub)"
            >
              JG
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#161b26]" />
            </button>
          </div>
        </div>

        {/* Fila 2 solo en Móvil cuando navPosition === 'top' con Pastilla Deslizante Fluida que entra 100% en la pantalla */}
        {navPosition === 'top' && (
          <div className="md:hidden pb-2 pt-1 px-1">
            <div
              ref={mobileNavContainerRef}
              className={`grid ${currentNavItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5'} w-full bg-surface-muted/70 p-1 rounded-2xl border border-outline-variant/30 relative`}
            >
              {/* Pastilla Deslizante Móvil Proporcional */}
              {(() => {
                const currentPath = location.pathname
                const activeIdx = currentNavItems.findIndex((item) =>
                  item.to === '/' ? currentPath === '/' || currentPath === '/auto-organizer' : currentPath.startsWith(item.to)
                )
                const validIdx = activeIdx >= 0 ? activeIdx : 0
                const count = currentNavItems.length

                return (
                  <div
                    className="absolute top-1 bottom-1 bg-primary rounded-xl shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                    style={{
                      width: `calc((100% - 8px) / ${count})`,
                      transform: `translateX(calc(${validIdx * 100}% + ${validIdx * 2}px))`,
                    }}
                  />
                )
              })()}

              {currentNavItems.map((item) => {
                const isActive = (item.to === '/' && (location.pathname === '/' || location.pathname === '/auto-organizer')) || (item.to !== '/' && location.pathname.startsWith(item.to))
                return (
                  <NavLink
                    key={item.to}
                    ref={(el) => { mobileItemRefs.current[item.to] = el }}
                    to={item.to}
                    end={item.to === '/'}
                    className={`relative z-10 py-1 px-0.5 rounded-xl flex flex-col items-center justify-center transition-colors duration-200 cursor-pointer ${
                      isActive
                        ? 'text-white font-bold'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                    title={item.name}
                  >
                    <span className="material-symbols-outlined text-[17px] leading-none mb-0.5">{item.icon}</span>
                    <span className="text-[9px] font-semibold tracking-tight truncate max-w-full text-center leading-none">
                      {item.shortName || item.name}
                    </span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        )}
      </header>

      {/* MODAL DE AJUSTES (IDIOMA Y MODO CLARO / OSCURO) */}
      {isSettingsOpen && (
        <div
          onClick={() => setIsSettingsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-pure rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-outline-variant/30 animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-muted">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">settings</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {language === 'es' ? 'Ajustes del Sistema' : 'System Settings'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              {/* Selector de Modo Claro / Oscuro */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                  {language === 'es' ? 'Tema de la Interfaz' : 'Interface Theme'}
                </label>
                <div className="relative flex items-center bg-surface-subtle p-1 rounded-xl border border-outline-variant/30">
                  <div
                    className="absolute top-1 bottom-1 rounded-lg bg-surface-pure shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                    style={{
                      width: 'calc(50% - 4px)',
                      left: '4px',
                      transform: `translateX(${theme === 'light' ? '0%' : '100%'})`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('light')}
                    className={`relative z-10 flex-1 py-2 px-3 rounded-lg text-label-md font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      theme === 'light'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">light_mode</span>
                    <span>{language === 'es' ? 'Claro' : 'Light'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('dark')}
                    className={`relative z-10 flex-1 py-2 px-3 rounded-lg text-label-md font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">dark_mode</span>
                    <span>{language === 'es' ? 'Oscuro' : 'Dark'}</span>
                  </button>
                </div>
              </div>

              {/* Selector de Disposición de Navegación (Superior vs Lateral) */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                  {language === 'es' ? 'Disposición del Menú' : 'Navigation Menu Position'}
                </label>
                <div className="relative flex items-center bg-surface-subtle p-1 rounded-xl border border-outline-variant/30">
                  <div
                    className="absolute top-1 bottom-1 rounded-lg bg-surface-pure shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                    style={{
                      width: 'calc(50% - 4px)',
                      left: '4px',
                      transform: `translateX(${navPosition === 'top' ? '0%' : '100%'})`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setNavPosition && setNavPosition('top')}
                    className={`relative z-10 flex-1 py-2 px-3 rounded-lg text-label-md font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      navPosition === 'top'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">vertical_align_top</span>
                    <span>{language === 'es' ? 'Barra Superior' : 'Top Bar'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNavPosition && setNavPosition('sidebar')}
                    className={`relative z-10 flex-1 py-2 px-3 rounded-lg text-label-md font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      navPosition === 'sidebar'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">dock_to_left</span>
                    <span>{language === 'es' ? 'Barra Lateral' : 'Sidebar'}</span>
                  </button>
                </div>
              </div>

              {/* Selector de Modo del Asistente IA (Pestaña vs Botón Flotante Global) */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                  {language === 'es' ? 'Modo del Asistente IA' : 'AI Assistant Mode'}
                </label>
                <div className="relative flex items-center bg-surface-subtle p-1 rounded-xl border border-outline-variant/30">
                  <div
                    className="absolute top-1 bottom-1 rounded-lg bg-surface-pure shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                    style={{
                      width: 'calc(50% - 4px)',
                      left: '4px',
                      transform: `translateX(${aiAssistantMode === 'tab' ? '0%' : '100%'})`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setAiAssistantMode && setAiAssistantMode('tab')}
                    className={`relative z-10 flex-1 py-2 px-2.5 rounded-lg text-label-md font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      aiAssistantMode === 'tab'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[17px]">tab</span>
                    <span>{language === 'es' ? 'Pestaña' : 'Tab'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiAssistantMode && setAiAssistantMode('floating')}
                    className={`relative z-10 flex-1 py-2 px-2.5 rounded-lg text-label-md font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      aiAssistantMode === 'floating'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    <AIBotIcon className="w-4 h-4 shrink-0" size={16} />
                    <span>{language === 'es' ? 'Botón Flotante' : 'Floating'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-secondary leading-tight">
                  {aiAssistantMode === 'floating'
                    ? (language === 'es'
                        ? 'El asistente te acompaña en todas las páginas con acceso instantáneo a tus tareas.'
                        : 'The assistant follows you everywhere with instant access to your tasks.')
                    : (language === 'es'
                        ? 'El asistente se muestra como pantalla completa en la barra de navegación.'
                        : 'The assistant is accessible as a dedicated navigation tab.')}
                </p>
              </div>

              {/* Selector de Idioma con Banderas Vectoriales Diseñadas */}
              <div className="flex flex-col gap-2">
                <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                  {language === 'es' ? 'Idioma del Sistema' : 'Language'}
                </label>
                <div className="relative flex items-center bg-surface-subtle p-1 rounded-xl border border-outline-variant/30">
                  <div
                    className="absolute top-1 bottom-1 rounded-lg bg-surface-pure shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                    style={{
                      width: 'calc(50% - 4px)',
                      left: '4px',
                      transform: `translateX(${language === 'es' ? '0%' : '100%'})`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setLanguage('es')}
                    className={`relative z-10 flex-1 py-2 px-3 rounded-lg text-label-md font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      language === 'es'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    <svg className="w-4.5 h-3.5 rounded-[2px] shadow-2xs shrink-0 overflow-hidden" viewBox="0 0 640 480">
                      <path fill="#c60b1e" d="M0 0h640v480H0z"/>
                      <path fill="#ffc400" d="M0 120h640v240H0z"/>
                    </svg>
                    <span>Español</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`relative z-10 flex-1 py-2 px-3 rounded-lg text-label-md font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      language === 'en'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    <svg className="w-4.5 h-3.5 rounded-[2px] shadow-2xs shrink-0 overflow-hidden" viewBox="0 0 60 30">
                      <clipPath id="uk-clip-hdr"><path d="M0 0v30h60V0z"/></clipPath>
                      <path d="M0 0v30h60V0z" fill="#012169"/>
                      <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
                      <path d="M0 0l60 30m0-30L0 30" clipPath="url(#uk-clip-hdr)" stroke="#C8102E" strokeWidth="4"/>
                      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
                      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
                    </svg>
                    <span>English</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-surface-muted">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 bg-primary-container hover:bg-primary text-on-primary text-label-md font-semibold rounded-lg transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  {language === 'es' ? 'Guardar y Cerrar' : 'Save & Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DE PERFIL FOCUS HUB (DISEÑO STITCH AISLADO) */}
      <ProfilePopover
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        anchorRef={profileButtonRef}
        placement="header"
      />
    </>
  )
}

