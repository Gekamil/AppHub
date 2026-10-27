import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import ProfilePopover from './ProfilePopover'
import AccountModal from './AccountModal'
import InstallAppModal from './InstallAppModal'
import AIBotIcon from './AIBotIcon'
import { getCurrentUser, isGuestUser } from '../services/firebase'
import { APP_THEMES, getAppTheme, setAppTheme } from '../services/appTheme'
import { getVisibleNavTabs, setVisibleNavTab, NAV_TAB_DEFINITIONS } from '../services/navSettings'
import { CURRENT_VERSION, APP_CHANGELOG } from '../services/updateService'

const CHANGELOG_STORAGE_KEY = `studenthub_seen_changelog_v${CURRENT_VERSION.replace(/\./g, '_')}`

const mobileNavItems = [
  { name: 'Calendario', shortName: 'Agenda', to: '/calendar', icon: 'calendar_today' },
  { name: 'Tareas', shortName: 'Tareas', to: '/app', icon: 'checklist' },
  { name: 'Notas', shortName: 'Notas', to: '/notebooks', icon: 'menu_book' },
  { name: 'Asistente IA', shortName: 'IA', to: '/ai-assistant', icon: 'smart_toy' },
  { name: 'My Hub', shortName: 'Hub', to: '/my-hub', icon: 'hub' },
  { name: 'Noticias', shortName: 'Noticias', to: '/news', icon: 'newspaper' },
]

function preloadNavRoute(to) {
  try {
    if (to === '/calendar') import('../pages/CalendarPage')
    else if (to === '/news') import('../pages/NewsPage')
    else if (to === '/notebooks') import('../pages/NotebooksPage')
    else if (to === '/ai-assistant') import('../pages/AIAssistantPage')
    else if (to === '/my-hub') import('../pages/MyHubPage')
    else if (to === '/app' || to === '/') import('../pages/AutoOrganizerPage')
  } catch (e) {}
}

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
  const [user, setUser] = useState(getCurrentUser())
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [accountModalTab, setAccountModalTab] = useState('profile')
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [hasUnreadChangelog, setHasUnreadChangelog] = useState(() => {
    try {
      return !localStorage.getItem(CHANGELOG_STORAGE_KEY)
    } catch (e) {
      return false
    }
  })
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light')
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'es')
  const [currentAppTheme, setCurrentAppTheme] = useState(() => getAppTheme())
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false)
  const [visibleTabs, setVisibleTabs] = useState(() => getVisibleNavTabs())

  const notifRef = useRef(null)
  const profileButtonRef = useRef(null)
  const mobileProfileButtonRef = useRef(null)

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [isStandaloneApp, setIsStandaloneApp] = useState(() => {
    if (typeof window === 'undefined') return false
    const isCap = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())
    const isElec = !!(window.electronAPI?.isElectron || /Electron/i.test(navigator.userAgent || ''))
    const isPwa = window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true
    return isCap || isElec || isPwa
  })
  const isElectron = typeof window !== 'undefined' && !!(window.electronAPI?.isElectron || /Electron/i.test(navigator.userAgent || ''))

  useEffect(() => {
    if (isElectron && window.electronAPI?.setTitleBarTheme) {
      const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('app_theme') === 'dark'
      window.electronAPI.setTitleBarTheme(isDark)
    }
  }, [theme, currentAppTheme, isElectron])

  useEffect(() => {
    const checkStandalone = () => {
      const isCap = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform())
      const isElec = !!(window.electronAPI?.isElectron || /Electron/i.test(navigator.userAgent || ''))
      const isPwa = window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true
      setIsStandaloneApp(isCap || isElec || isPwa)
    }

    checkStandalone()
    const mql = window.matchMedia?.('(display-mode: standalone)')
    if (mql?.addEventListener) {
      mql.addEventListener('change', checkStandalone)
      return () => mql.removeEventListener('change', checkStandalone)
    }
  }, [])

  useEffect(() => {
    const handleTabsChange = (e) => {
      if (e.detail) setVisibleTabs(e.detail)
    }
    window.addEventListener('app_visible_tabs_changed', handleTabsChange)
    return () => window.removeEventListener('app_visible_tabs_changed', handleTabsChange)
  }, [])

  useEffect(() => {
    const handleThemeStyleChange = (e) => {
      if (e.detail && APP_THEMES.some((t) => t.id === e.detail)) {
        setCurrentAppTheme(e.detail)
      }
    }
    window.addEventListener('app_theme_style_changed', handleThemeStyleChange)
    window.addEventListener('app_theme_changed', handleThemeStyleChange)
    return () => {
      window.removeEventListener('app_theme_style_changed', handleThemeStyleChange)
      window.removeEventListener('app_theme_changed', handleThemeStyleChange)
    }
  }, [])

  const activeThemeObj = APP_THEMES.find((t) => t.id === currentAppTheme) || APP_THEMES[0]

  const [widgetAccentColor, setWidgetAccentColor] = useState(() => {
    return localStorage.getItem('studenthub_widget_accent_color') || '#0071E3'
  })

  const handleSelectWidgetAccent = (hex) => {
    setWidgetAccentColor(hex)
    localStorage.setItem('studenthub_widget_accent_color', hex)
    window.dispatchEvent(new CustomEvent('studenthub_widget_accent_changed', { detail: hex }))
  }

  const handleSelectThemeStyle = (themeId) => {
    setAppTheme(themeId)
    setCurrentAppTheme(themeId)
    setIsThemeDropdownOpen(false)
  }

  const isGuest = isGuestUser(user)

  // Escuchar cambios de autenticación
  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getCurrentUser())
    }
    window.addEventListener('studenthub_auth_changed', handleAuthChange)
    return () => window.removeEventListener('studenthub_auth_changed', handleAuthChange)
  }, [])

  // Escuchar apertura remota del modal de cuentas desde cualquier parte
  useEffect(() => {
    const handleOpenAccountModal = (e) => {
      setAccountModalTab(e.detail?.tab || 'profile')
      setIsAccountModalOpen(true)
      setIsProfileOpen(false)
    }
    window.addEventListener('studenthub_open_account_modal', handleOpenAccountModal)
    return () => window.removeEventListener('studenthub_open_account_modal', handleOpenAccountModal)
  }, [])

  const currentNavItems = mobileNavItems.filter((item) => {
    if (item.to === '/ai-assistant' && aiAssistantMode === 'floating') return false
    return visibleTabs[item.to] !== false
  })

  // Pastilla deslizante animada para escritorio y móvil
  const navContainerRef = useRef(null)
  const itemRefs = useRef({})
  const hasMeasuredRef = useRef(false)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, scaleX: 1, opacity: 0, ready: false })

  const mobileNavContainerRef = useRef(null)
  const mobileItemRefs = useRef({})

  const getActiveItem = () => {
    const currentPath = location.pathname
    return (
      currentNavItems.find((item) =>
        item.to === '/app' || item.to === '/'
          ? currentPath === '/app' || currentPath === '/' || currentPath === '/auto-organizer'
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
          scaleX: 1,
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
      // SOLO procesar si el valor recibido es estrictamente 'dark' o 'light'
      if (e.detail === 'dark' || e.detail === 'light') {
        setTheme(e.detail)
      } else if (!e.detail) {
        const nextTheme = localStorage.getItem('app_theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
        setTheme(nextTheme === 'dark' ? 'dark' : 'light')
      }
    }
    window.addEventListener('app_dark_mode_changed', handleThemeSync)
    window.addEventListener('app_theme_changed', handleThemeSync)
    window.addEventListener('storage', handleThemeSync)
    return () => {
      window.removeEventListener('app_dark_mode_changed', handleThemeSync)
      window.removeEventListener('app_theme_changed', handleThemeSync)
      window.removeEventListener('storage', handleThemeSync)
    }
  }, [])

  useEffect(() => {
    if (isSettingsOpen) {
      const currentTheme = localStorage.getItem('app_theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
      setTheme(currentTheme === 'dark' ? 'dark' : 'light')
    }
  }, [isSettingsOpen])

  const handleSelectTheme = (nextTheme) => {
    const valid = nextTheme === 'dark' ? 'dark' : 'light'
    setTheme(valid)
    if (valid === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('app_theme', valid)
    window.dispatchEvent(new CustomEvent('app_dark_mode_changed', { detail: valid }))
    window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: valid }))
  }

  useEffect(() => {
    localStorage.setItem('app_language', language)
  }, [language])

  const handleDismissChangelog = () => {
    try {
      localStorage.setItem(CHANGELOG_STORAGE_KEY, 'true')
    } catch (e) {}
    setHasUnreadChangelog(false)
  }

  const handleToggleNotifications = () => {
    setIsNotificationsOpen((prev) => {
      const next = !prev
      if (prev && hasUnreadChangelog) {
        handleDismissChangelog()
      }
      return next
    })
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false)
        if (isInstallModalOpen) setIsInstallModalOpen(false)
        if (isProfileOpen) setIsProfileOpen(false)
        if (isNotificationsOpen) {
          if (hasUnreadChangelog) handleDismissChangelog()
          setIsNotificationsOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSettingsOpen, isInstallModalOpen, isProfileOpen, isNotificationsOpen, hasUnreadChangelog])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isNotificationsOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        if (hasUnreadChangelog) handleDismissChangelog()
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isNotificationsOpen, hasUnreadChangelog])

  return (
    <>
      <header
        className={`fixed top-0 right-0 bg-surface-pure/90 dark:bg-[#040506]/90 backdrop-blur-2xl border-b border-slate-200/80 dark:border-[#27272a] shadow-[0_1px_8px_rgba(0,0,0,0.03)] dark:shadow-none z-50 flex flex-col justify-center pt-[env(safe-area-inset-top,0px)] px-3 sm:px-gutter-lg pl-[max(env(safe-area-inset-left,0px),12px)] pr-[max(env(safe-area-inset-right,0px),12px)] ${isElectron ? 'md:pr-38' : ''} transition-all duration-300 left-0 app-drag-region ${
          navPosition === 'sidebar' && isSidebarOpen ? 'md:left-60' : 'md:left-0'
        }`}
      >
        <div className="h-14 flex items-center justify-between w-full">
          <div className="flex items-center gap-2 app-no-drag">
            {navPosition === 'sidebar' && (
              <button
                onClick={onToggleSidebar}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-muted hover:text-on-surface transition-colors cursor-pointer app-no-drag"
                title="Alternar barra lateral"
              >
                <span className="material-symbols-outlined text-[20px]">menu</span>
              </button>
            )}
            <NavLink
              to={isStandaloneApp ? '/app' : '/'}
              className="flex items-center gap-2 group cursor-pointer app-no-drag"
              title={isStandaloneApp ? 'StudentHub Tareas' : 'Ir a la pagina principal de StudentHub'}
            >
              <img
                src="/logo.png"
                alt="StudentHub Logo"
                className="w-6 h-6 rounded-xl object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              <span className="font-headline-sm text-sm font-bold text-on-surface tracking-tight">StudentHub</span>
            </NavLink>
          </div>

          {/* Navegación Central en Escritorio (Fila Única con Pastilla Deslizante Fluida) */}
          {navPosition === 'top' && (
            <nav
              ref={navContainerRef}
              className="hidden md:flex items-center gap-1.5 bg-surface-muted/80 dark:bg-[#111214] p-1.5 rounded-2xl border border-slate-200/80 dark:border-[#27272a] shadow-2xs relative app-no-drag"
            >
              {/* Pastilla Deslizante con acento dinámico GPU acelerado */}
              <div
                className="absolute top-1.5 bottom-1.5 left-0 rounded-xl shadow-xs pointer-events-none will-change-transform"
                style={{
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity,
                  backgroundColor: 'var(--app-accent-color, #0071E3)',
                  transform: `translateX(${indicatorStyle.left}px) scaleX(${indicatorStyle.scaleX || 1})`,
                  transformOrigin: 'left center',
                  willChange: 'transform',
                  transition: indicatorStyle.ready ? 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease' : 'none',
                }}
              />

              {currentNavItems.map((item) => {
                const isActive = ((item.to === '/app' || item.to === '/') && (location.pathname === '/app' || location.pathname === '/' || location.pathname === '/auto-organizer')) || (item.to !== '/app' && item.to !== '/' && location.pathname.startsWith(item.to))
                return (
                  <NavLink
                    key={item.to}
                    ref={(el) => { itemRefs.current[item.to] = el }}
                    to={item.to}
                    end={item.to === '/app' || item.to === '/'}
                    onMouseEnter={() => preloadNavRoute(item.to)}
                    onTouchStart={() => preloadNavRoute(item.to)}
                    onClick={() => {
                      const el = itemRefs.current[item.to]
                      if (el) {
                        setIndicatorStyle({
                          left: el.offsetLeft,
                          width: el.offsetWidth,
                          scaleX: 1,
                          opacity: 1,
                          ready: true,
                        })
                      }
                    }}
                    className={`relative z-10 px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors duration-200 cursor-pointer ${
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

          <div className="hidden md:flex items-center gap-1 sm:gap-space-xs app-no-drag">
            {!isStandaloneApp && (
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(true)}
                style={{ backgroundColor: 'var(--app-accent-color, #146ef5)' }}
                className="h-8 px-3 rounded-xl flex items-center gap-1.5 text-white transition-all cursor-pointer font-semibold text-xs active:scale-95 shadow-2xs app-no-drag hover:brightness-110"
                title="Descargar o instalar StudentHub en tu móvil (Android / iOS) o PC"
              >
                <span className="material-symbols-outlined text-[17px]">install_mobile</span>
                <span className="hidden sm:inline font-bold">Instalar App</span>
              </button>
            )}
            <button
              type="button"
              data-notif-button
              onClick={handleToggleNotifications}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-muted hover:text-on-surface transition-colors cursor-pointer app-no-drag relative"
              title="Centro de notificaciones"
            >
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              {hasUnreadChangelog && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white dark:ring-[#161b26] animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-muted hover:text-on-surface transition-colors cursor-pointer app-no-drag"
              title="Ajustes de la aplicación"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </button>
            {isGuest ? (
              <button
                ref={profileButtonRef}
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="relative w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center ml-1 cursor-pointer hover:ring-2 hover:ring-primary/40 active:scale-95 transition-all shadow-xs shrink-0 app-no-drag"
                title="Modo Invitado (Sin sesión) • Pulsa para abrir menú o iniciar sesión"
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white dark:border-[#161b26]"
                  title="Sin sesión iniciada"
                />
              </button>
            ) : (
              <button
                ref={profileButtonRef}
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="relative w-8 h-8 rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-[11px] tracking-tight ml-1 cursor-pointer hover:ring-2 hover:ring-primary/40 active:scale-95 transition-all shadow-xs shrink-0 app-no-drag"
                title={`Conectado como ${user.displayName || 'Usuario'} (Sesión activa)`}
              >
                {user.displayName
                  ? user.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()
                  : 'U'}
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#161b26]"
                  title="Sesión activa"
                />
              </button>
            )}
          </div>

          {/* Controles para Móvil en la barra superior (Notificaciones, Ajustes y Perfil) */}
          <div className="flex md:hidden items-center gap-1.5 sm:gap-2 app-no-drag shrink-0 relative z-10">
            <button
              type="button"
              data-notif-button
              onClick={handleToggleNotifications}
              className={`w-9.5 h-9.5 min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center transition-colors cursor-pointer relative active:scale-95 ${
                isNotificationsOpen ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-muted hover:text-on-surface'
              }`}
              title="Centro de notificaciones"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {hasUnreadChangelog && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white dark:ring-[#161b26] animate-pulse"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className={`w-9.5 h-9.5 min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                isSettingsOpen ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-muted hover:text-on-surface'
              }`}
              title="Ajustes de la aplicación"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </button>
            {isGuest ? (
              <button
                ref={mobileProfileButtonRef}
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="relative w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center ml-0.5 cursor-pointer hover:ring-2 hover:ring-primary/40 active:scale-95 transition-all shadow-xs shrink-0"
                title="Modo Invitado • Pulsa para abrir menú"
              >
                <span className="material-symbols-outlined text-[19px]">person</span>
              </button>
            ) : (
              <button
                ref={mobileProfileButtonRef}
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="relative w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-[11px] tracking-tight ml-0.5 cursor-pointer hover:ring-2 hover:ring-primary/40 active:scale-95 transition-all shadow-xs shrink-0"
                title={`Conectado como ${user.displayName || 'Usuario'}`}
              >
                {user.displayName
                  ? user.displayName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                  : 'U'}
                <span
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-[#161b26]"
                  title="Sesión activa"
                />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BARRA INFERIOR DE NAVEGACIÓN MÓVIL PRINCIPAL (SOLO VISIBLE CUANDO LA ORGANIZACIÓN ES "BARRA") */}
      {navPosition === 'top' && (
        <nav
          aria-label="Barra de navegación móvil"
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-pure/95 dark:bg-[#080b11]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-[#27272a] h-16.5 sm:h-18 px-3 flex items-center justify-around shadow-[0_-4px_24px_rgba(0,0,0,0.06)] app-no-drag pb-[max(env(safe-area-inset-bottom,0px),6px)] pt-1"
        >
          {currentNavItems.map((item) => {
            const isActive =
              ((item.to === '/app' || item.to === '/') &&
                (location.pathname === '/app' || location.pathname === '/' || location.pathname === '/auto-organizer')) ||
              (item.to !== '/app' && item.to !== '/' && location.pathname.startsWith(item.to))

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app' || item.to === '/'}
                onMouseEnter={() => preloadNavRoute(item.to)}
                onTouchStart={() => preloadNavRoute(item.to)}
                className={`flex-1 py-1 px-0.5 rounded-xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 ${
                  isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-on-surface'
                }`}
                title={item.name}
              >
                <div
                  className={`w-12 h-7.5 sm:w-13 sm:h-8 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'bg-primary/12 text-primary font-bold shadow-2xs' : ''
                  }`}
                >
                  <span className="material-symbols-outlined text-[21px] leading-none">
                    {item.icon}
                  </span>
                </div>
                <span className={`text-[10.5px] sm:text-xs tracking-tight truncate max-w-full text-center leading-none mt-1 ${
                  isActive ? 'font-bold text-primary' : 'font-medium'
                }`}>
                  {item.shortName || item.name}
                </span>
              </NavLink>
            )
          })}
        </nav>
      )}

      {/* CENTRO DE NOTIFICACIONES */}
      {isNotificationsOpen && (
        <div
          ref={notifRef}
          className={`fixed z-[60] ${
            isMobile
              ? 'top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.5rem)] right-3 left-3 w-auto max-w-sm ml-auto shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150'
              : 'top-14 right-4 sm:right-6 md:right-16 w-80 shadow-xl animate-in fade-in zoom-in-95 duration-150'
          } bg-white dark:bg-[#161b26] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 text-left select-none`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-xs text-on-surface">Notificaciones</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              hasUnreadChangelog
                ? 'text-primary bg-primary/10 font-bold'
                : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
            }`}>
              {hasUnreadChangelog ? APP_CHANGELOG.badge || 'Novedades' : 'Al día'}
            </span>
          </div>

          {hasUnreadChangelog ? (
            <div className="py-2.5 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">published_with_changes</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {APP_CHANGELOG.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0">{APP_CHANGELOG.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {APP_CHANGELOG.description}
                  </p>
                </div>
              </div>

              {APP_CHANGELOG.features && APP_CHANGELOG.features.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {APP_CHANGELOG.features.slice(0, 3).map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-[14px] text-primary shrink-0 mt-0.5">
                        {feat.icon || 'check_circle'}
                      </span>
                      <span>
                        <strong className="text-slate-900 dark:text-white font-semibold">{feat.title}:</strong>{' '}
                        {feat.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleDismissChangelog}
                  className="w-full py-1.5 px-3 rounded-lg bg-primary hover:bg-primary/95 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-98"
                >
                  <span className="material-symbols-outlined text-[14px]">done_all</span>
                  <span>Marcar como leído</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center justify-center text-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
              <p className="text-xs font-semibold text-on-surface">Todo sincronizado</p>
              <p className="text-[11px] text-secondary">No tienes tareas atrasadas ni avisos pendientes.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE AJUSTES (IDIOMA, TEMA Y PESTAÑAS - DISEÑO EXPANDIDO LATERAL) */}
      {isSettingsOpen && (
        <div
          onClick={() => setIsSettingsOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/50 cursor-pointer"
        >
          <div
            role="dialog"
            aria-modal="true"
            data-floating-menu="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl lg:max-w-3xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 cursor-default relative max-h-[82vh] sm:max-h-[88vh] flex flex-col mb-1 sm:mb-0 transform-gpu"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-muted shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold text-sm sm:text-base">
                    {language === 'es' ? 'Ajustes del Sistema' : 'System Settings'}
                  </h3>
                  <p className="text-[11px] text-secondary">
                    {language === 'es' ? 'Personalización visual, diseño y navegación' : 'Visual customization, layout & navigation'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-muted transition-colors cursor-pointer"
                title="Cerrar ajustes"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* COLUMNA 1: Apariencia, Tema, Idioma */}
              <div className="flex flex-col gap-4">
                {/* SELECTOR DESPLEGABLE DE FUENTE Y DISEÑO VISUAL */}
                <div className="flex flex-col gap-2 relative">
                  <div className="flex items-center justify-between">
                    <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                      {language === 'es' ? 'Fuente & Diseño Visual' : 'Font & Visual Style'}
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-subtle border border-outline-variant/20 text-secondary font-medium">
                      4 estilos
                    </span>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsThemeDropdownOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-outline-variant/40 hover:border-primary/50 text-xs transition-all cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: activeThemeObj.accentColor || '#0071E3' }}
                        />
                        <div className="flex flex-col text-left min-w-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                            Fuente: {activeThemeObj.fontName.split('/')[0].trim()}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {activeThemeObj.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-pure border border-outline-variant/30 text-secondary font-semibold">
                          {activeThemeObj.tag}
                        </span>
                        <span
                          className="material-symbols-outlined text-[18px] text-slate-400 group-hover:text-primary transition-transform duration-200"
                          style={{ transform: isThemeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          expand_more
                        </span>
                      </div>
                    </button>

                    {/* Menu Desplegable de Fuentes y Diseños */}
                    {isThemeDropdownOpen && (
                      <div className="mt-1.5 bg-white dark:bg-[#161b26] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-150">
                        {APP_THEMES.map((th) => {
                          const isSelected = th.id === currentAppTheme
                          return (
                            <button
                              key={th.id}
                              type="button"
                              onClick={() => handleSelectThemeStyle(th.id)}
                              className={`flex items-start gap-2.5 p-2 rounded-xl transition-all cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-primary/10 text-primary font-bold border border-primary/30 shadow-2xs'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 mt-1 shadow-xs"
                                style={{ backgroundColor: th.accentColor || '#0071E3' }}
                              />
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-xs truncate">
                                    {th.name}
                                  </span>
                                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold tracking-wider shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {th.tag}
                                  </span>
                                </div>
                                <span className="text-[10px] text-secondary line-clamp-1 mt-0.5">
                                  {th.description}
                                </span>
                              </div>
                              {isSelected && (
                                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-1">
                                  check_circle
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selector de Modo Claro / Oscuro */}
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                    {language === 'es' ? 'Tema de la Interfaz' : 'Interface Theme'}
                  </label>
                  <div className="relative flex items-center bg-surface-subtle p-1 rounded-xl border border-outline-variant/30">
                    <div
                      className="absolute z-0 top-1 bottom-1 rounded-lg bg-surface-pure shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
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

                {/* Selector de Color de Acento de los Widgets */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                      {language === 'es' ? 'Color de los Widgets' : 'Widget Accent Color'}
                    </label>
                    <span className="font-mono text-[10px] text-secondary font-bold uppercase">
                      {widgetAccentColor}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-surface-subtle rounded-xl border border-outline-variant/30 flex-wrap">
                    {[
                      { name: 'Azul', hex: '#0071E3' },
                      { name: 'Esmeralda', hex: '#10B981' },
                      { name: 'Morado', hex: '#8B5CF6' },
                      { name: 'Rosa', hex: '#EC4899' },
                      { name: 'Naranja', hex: '#F97316' },
                      { name: 'Ámbar', hex: '#F59E0B' },
                      { name: 'Cian', hex: '#06B6D4' },
                      { name: 'Rojo', hex: '#EF4444' },
                    ].map((col) => {
                      const isSelected = widgetAccentColor.toLowerCase() === col.hex.toLowerCase()
                      return (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => handleSelectWidgetAccent(col.hex)}
                          className={`w-7 h-7 rounded-full transition-transform cursor-pointer relative shadow-xs flex items-center justify-center ${
                            isSelected ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface-pure' : 'hover:scale-105 opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={col.name}
                        >
                          {isSelected && (
                            <span className="material-symbols-outlined text-[14px] text-white font-bold drop-shadow-xs">
                              check
                            </span>
                          )}
                        </button>
                      )
                    })}
                    {/* Selector RGB Personalizado */}
                    <label
                      className={`relative w-7 h-7 rounded-full cursor-pointer flex items-center justify-center border border-dashed border-outline hover:border-primary transition-all overflow-hidden ${
                        ![
                          '#0071e3', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#f59e0b', '#06b6d4', '#ef4444'
                        ].includes(widgetAccentColor.toLowerCase())
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-pure'
                          : ''
                      }`}
                      title={language === 'es' ? 'Selector RGB Personalizado' : 'Custom RGB Picker'}
                      style={{
                        backgroundColor: ![
                          '#0071e3', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#f59e0b', '#06b6d4', '#ef4444'
                        ].includes(widgetAccentColor.toLowerCase())
                          ? widgetAccentColor
                          : 'transparent',
                      }}
                    >
                      <input
                        type="color"
                        value={widgetAccentColor}
                        onChange={(e) => handleSelectWidgetAccent(e.target.value)}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                      <span className="material-symbols-outlined text-[14px] text-secondary pointer-events-none">
                        palette
                      </span>
                    </label>
                  </div>
                </div>

                {/* Selector de Idioma con Banderas Vectoriales Diseñadas */}
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                    {language === 'es' ? 'Idioma del Sistema' : 'Language'}
                  </label>
                  <div className="relative flex items-center bg-surface-subtle p-1 rounded-xl border border-outline-variant/30">
                    <div
                      className="absolute z-0 top-1 bottom-1 rounded-lg bg-surface-pure shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
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
              </div>

              {/* COLUMNA 2: Pestañas Visibles, Disposición del Menú, Asistente IA */}
              <div className="flex flex-col gap-4">
                {/* Personalizar Pestañas Visibles (Poder quitar elementos de arriba/lateral) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                      {language === 'es' ? 'Pestañas Visibles' : 'Visible Navigation Tabs'}
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {language === 'es' ? 'Muestra u oculta módulos' : 'Toggle modules'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 bg-surface-subtle p-2 rounded-xl border border-outline-variant/30">
                    {NAV_TAB_DEFINITIONS.map((def) => {
                      const isVisible = visibleTabs[def.id] !== false
                      return (
                        <div
                          key={def.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-surface-pure hover:bg-surface-muted/80 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="material-symbols-outlined text-[17px] text-primary shrink-0">
                              {def.icon?.toLowerCase?.() || def.icon}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-on-surface truncate">
                                {def.label}
                              </span>
                              <span className="text-[10px] text-secondary line-clamp-1">
                                {def.desc}
                              </span>
                            </div>
                          </div>

                          {def.canToggle ? (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = setVisibleNavTab(def.id, !isVisible)
                                setVisibleTabs(updated)
                              }}
                              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ml-2 ${
                                isVisible ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                                  isVisible ? 'left-5.5' : 'left-0.5'
                                }`}
                              />
                            </button>
                          ) : (
                            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 shrink-0 ml-2">
                              Troncal
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Selector de Disposición de Navegación (Barra vs Barra Lateral) */}
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                    {language === 'es' ? 'Disposición de Navegación' : 'Navigation Layout'}
                  </label>
                  <div className="relative flex items-center bg-surface-subtle p-1 rounded-xl border border-outline-variant/30">
                    <div
                      className={`absolute z-0 top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-surface-pure shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
                        navPosition === 'top' ? 'left-1 translate-x-0' : 'left-1 translate-x-full'
                      }`}
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
                      <span className="material-symbols-outlined text-[18px]">view_headline</span>
                      <span>{language === 'es' ? 'Barra' : 'Bar'}</span>
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

                {/* Selector de Modo del Asistente IA */}
                <div className="flex flex-col gap-2">
                  <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                    {language === 'es' ? 'Modo del Asistente IA' : 'AI Assistant Mode'}
                  </label>
                  <div className="relative flex items-center bg-surface-subtle p-1 rounded-xl border border-outline-variant/30">
                    <div
                      className="absolute z-0 top-1 bottom-1 rounded-lg bg-surface-pure shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
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
                </div>

                {/* OPCIÓN PARA DESCARGAR O INSTALAR APP (DENTRO DE AJUSTES) */}
                {!isStandaloneApp && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-subtle border border-outline-variant/30 mt-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[19px]">install_mobile</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-on-surface block truncate">
                          {language === 'es' ? 'Instalar o Descargar App' : 'Install or Download App'}
                        </span>
                        <span className="text-[10.5px] text-secondary block truncate">
                          {language === 'es' ? 'APK Android, Windows o acceso directo PWA' : 'Android APK, Windows or PWA shortcut'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false)
                        setIsInstallModalOpen(true)
                      }}
                      className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs shrink-0 ml-2"
                    >
                      {language === 'es' ? 'Instalar' : 'Install'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-5 py-3.5 border-t border-surface-muted flex items-center justify-between bg-surface-pure rounded-b-2xl sm:rounded-b-3xl shrink-0">
              <span className="text-[11px] text-secondary">
                {language === 'es' ? 'Los cambios se aplican al instante' : 'Changes apply immediately'}
              </span>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-primary-container hover:bg-primary text-on-primary text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                {language === 'es' ? 'Guardar y Cerrar' : 'Save & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DE PERFIL FOCUS HUB (DISEÑO STITCH AISLADO) */}
      <ProfilePopover
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        anchorRef={isMobile ? mobileProfileButtonRef : profileButtonRef}
        placement="header"
        onOpenAccountModal={(tab) => {
          setAccountModalTab(tab)
          setIsAccountModalOpen(true)
          setIsProfileOpen(false)
        }}
      />

      {/* MODAL DE CUENTAS INDEPENDIENTE Y ESTABLE */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        initialTab={accountModalTab}
      />
      {/* MODAL DE INSTALACIÓN Y DESCARGA MULTIPLATAFORMA (ANDROID / IOS / PC) */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </>
  )
}

