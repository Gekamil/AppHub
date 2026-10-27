import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import FloatingAICopilot from '../components/FloatingAICopilot'
import UpdateNotification from '../components/UpdateNotification'
import AlarmRingingOverlay from '../components/AlarmRingingOverlay'
import VoiceCopilotWidget from '../components/VoiceCopilotWidget'
import {
  requestNotificationPermission,
  checkUpcomingTasksAlarms,
} from '../services/notificationAlarmService'
import {
  getCurrentUser,
  isGuestUser,
  getUserTasks,
  saveUserTasks,
  syncTasksToCloud,
  getUserCalendars,
  loadUserDataFromCloud,
  subscribeToUserCloudData,
} from '../services/firebase'
import {
  getBaileysRecentTasks,
  syncBaileysTasks,
  subscribeToBaileysLiveUpdates,
} from '../services/baileysBridge'
import { getVisibleNavTabs } from '../services/navSettings'
import { syncWidgetData, checkInitialWidgetRoute, listenWidgetRoute } from '../services/widgetBridge'
import { getDailyNews } from '../services/newsService'

const DEFAULT_TASKS = []

const APP_TABS = ['/calendar', '/', '/notebooks', '/ai-assistant', '/my-hub', '/news']

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()

  const [navPosition, setNavPosition] = useState(() => {
    return localStorage.getItem('app_nav_position') || 'top'
  })

  const [aiAssistantMode, setAiAssistantMode] = useState(() => {
    return localStorage.getItem('app_ai_assistant_mode') || 'floating'
  })

  const [visibleTabs, setVisibleTabs] = useState(() => getVisibleNavTabs())

  useEffect(() => {
    const handleTabsChange = (e) => {
      if (e.detail) setVisibleTabs(e.detail)
    }
    window.addEventListener('app_visible_tabs_changed', handleTabsChange)
    return () => window.removeEventListener('app_visible_tabs_changed', handleTabsChange)
  }, [])

  // Si el usuario accede a una pestaña desactivada en ajustes, redirigir automáticamente a /calendar
  useEffect(() => {
    const curPath = location.pathname
    const norm = (curPath === '/auto-organizer' || curPath === '') ? '/' : curPath

    if (norm.startsWith('/notebooks') && visibleTabs['/notebooks'] === false) {
      navigate('/calendar')
    } else if (norm.startsWith('/my-hub') && visibleTabs['/my-hub'] === false) {
      navigate('/calendar')
    } else if (norm.startsWith('/ai-assistant') && (visibleTabs['/ai-assistant'] === false || aiAssistantMode === 'floating')) {
      navigate('/calendar')
    } else if (norm.startsWith('/news') && visibleTabs['/news'] === false) {
      navigate('/calendar')
    }
  }, [location.pathname, visibleTabs, aiAssistantMode, navigate])

  useEffect(() => {
    localStorage.setItem('app_nav_position', navPosition)
  }, [navPosition])

  useEffect(() => {
    localStorage.setItem('app_ai_assistant_mode', aiAssistantMode)
  }, [aiAssistantMode])

  // Soporte Global de Navegación por Gestos:
  // Móvil / Tablet: Deslizar con 2 dedos horizontalmente entre páginas (solo si no está en modo lateral)
  // FILTRADO ESTRICTO: Solo permite navegar entre pestañas que estén actualmente activadas en visibleTabs
  const touchStateRef = useRef({ active: false, startX: 0, startY: 0, maxFingers: 1 })

  useEffect(() => {
    // Si la navegación está en modo barra lateral, deshabilitar gestos de deslizamiento con 2 dedos
    if (navPosition === 'sidebar') return

    const candidateTabs = [
      { id: '/calendar', path: '/calendar' },
      { id: '/app', path: '/app' },
      { id: '/notebooks', path: '/notebooks' },
      ...(aiAssistantMode === 'tab' ? [{ id: '/ai-assistant', path: '/ai-assistant' }] : []),
      { id: '/my-hub', path: '/my-hub' },
      { id: '/news', path: '/news' },
    ]

    const currentTabs = candidateTabs
      .filter((tab) => visibleTabs[tab.id] !== false && (tab.id !== '/app' || visibleTabs['/'] !== false))
      .map((tab) => tab.path)

    const getTabIndex = (path) => {
      const normalized = (path === '/auto-organizer' || path === '/' || path === '') ? '/app' : path
      const idx = currentTabs.findIndex((t) => t === normalized || (t !== '/app' && normalized.startsWith(t)))
      return idx >= 0 ? idx : 0
    }

    const handleTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return
      const count = e.touches.length
      if (!touchStateRef.current.active) {
        touchStateRef.current = {
          active: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          maxFingers: count,
        }
      } else {
        touchStateRef.current.maxFingers = Math.max(touchStateRef.current.maxFingers, count)
      }
    }

    const handleTouchMove = (e) => {
      if (touchStateRef.current.active && e.touches) {
        touchStateRef.current.maxFingers = Math.max(touchStateRef.current.maxFingers, e.touches.length)
        if (e.touches.length >= 2 && e.cancelable) {
          // Prevenir zoom o pellizco accidental al deslizar con 2 dedos
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = (e) => {
      if (!touchStateRef.current.active) return
      const touch = (e.changedTouches && e.changedTouches[0]) || null
      const endX = touch ? touch.clientX : touchStateRef.current.startX
      const endY = touch ? touch.clientY : touchStateRef.current.startY
      const deltaX = endX - touchStateRef.current.startX
      const deltaY = endY - touchStateRef.current.startY
      const maxFingers = touchStateRef.current.maxFingers

      // Solo finalizar cuando se han levantado todos los dedos
      if (e.touches && e.touches.length > 0) return
      touchStateRef.current.active = false

      // Gestos con 2 o más dedos en pantalla táctil (móvil, tablet, pantalla táctil de portátil)
      if (maxFingers >= 2 && Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
        const currentIdx = getTabIndex(location.pathname)
        // Gesto hacia la izquierda (deltaX < 0) => avanza a la página de la derecha
        if (deltaX < 0 && currentIdx < currentTabs.length - 1) {
          navigate(currentTabs[currentIdx + 1])
        } else if (deltaX > 0 && currentIdx > 0) {
          // Gesto hacia la derecha (deltaX > 0) => retrocede a la página de la izquierda
          navigate(currentTabs[currentIdx - 1])
        }
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [location.pathname, navigate, navPosition, aiAssistantMode, visibleTabs])

  const [globalTasks, setGlobalTasks] = useState(() => {
    const user = getCurrentUser()
    return getUserTasks(user)
  })

  // Precarga silenciosa en segundo plano de las 12 noticias del dia para que la IA disponga de los titulares reales
  useEffect(() => {
    getDailyNews().catch(() => {})
  }, [])

  // Sincronización en tiempo real bidireccional con Firestore Cloud (Web <-> Móvil <-> Escritorio)
  useEffect(() => {
    const curUser = getCurrentUser()
    if (!curUser || isGuestUser(curUser)) return

    let isMounted = true

    // 1. Carga inicial inmediata desde la nube para que el móvil tenga siempre los datos reales de la web
    loadUserDataFromCloud().then((data) => {
      if (!isMounted || !data || !Array.isArray(data.tasks)) return
      isRemoteSyncRef.current = true
      setGlobalTasks((prev) => {
        const prevJson = JSON.stringify(prev || [])
        const remoteJson = JSON.stringify(data.tasks)
        return prevJson === remoteJson ? prev : data.tasks
      })
    }).catch(() => {})

    // 2. Suscripción viva a Firestore onSnapshot
    const unsub = subscribeToUserCloudData(curUser, (data) => {
      if (!isMounted || !data || !Array.isArray(data.tasks)) return
      isRemoteSyncRef.current = true
      setGlobalTasks((prev) => {
        const prevJson = JSON.stringify(prev || [])
        const remoteJson = JSON.stringify(data.tasks)
        return prevJson === remoteJson ? prev : data.tasks
      })
    })

    return () => {
      isMounted = false
      if (typeof unsub === 'function') unsub()
    }
  }, [])

  // Escuchar cambios de autenticación (login, logout, cambio de usuario)
  useEffect(() => {
    const handleAuthChange = () => {
      const user = getCurrentUser()
      setGlobalTasks(getUserTasks(user))
      if (user && !isGuestUser(user)) {
        loadUserDataFromCloud().then((data) => {
          if (data && Array.isArray(data.tasks)) {
            isRemoteSyncRef.current = true
            setGlobalTasks(data.tasks)
          }
        }).catch(() => {})
      }
    }
    window.addEventListener('studenthub_auth_changed', handleAuthChange)
    return () => window.removeEventListener('studenthub_auth_changed', handleAuthChange)
  }, [])

  // Control para evitar rebotes de sincronización remota
  const isRemoteSyncRef = useRef(false)
  const lastPushedTasksJsonRef = useRef('')

  // Escuchar enlaces y rutas provenientes de los widgets de Android
  useEffect(() => {
    checkInitialWidgetRoute(navigate)
    const cleanup = listenWidgetRoute(navigate)
    return () => {
      if (typeof cleanup === 'function') cleanup()
    }
  }, [navigate])

  const [isVoiceCopilotOpen, setIsVoiceCopilotOpen] = useState(false)

  // Escuchar apertura directa del Asistente de Voz Copiloto (desde widget o acción)
  useEffect(() => {
    const checkVoiceParam = () => {
      const fullSearch = (location.search || '') + (window.location.search || '') + (window.location.hash || '')
      if (fullSearch.includes('action=voice_copilot') || fullSearch.includes('action=voice')) {
        setIsVoiceCopilotOpen(true)
      }
    }
    checkVoiceParam()
    const handleOpenVoice = () => setIsVoiceCopilotOpen(true)
    window.addEventListener('studenthub_open_voice_copilot', handleOpenVoice)
    return () => window.removeEventListener('studenthub_open_voice_copilot', handleOpenVoice)
  }, [location.search, location.pathname])

  // Escuchar cambios de color de acento de widgets desde Ajustes para refrescar al instante
  useEffect(() => {
    const handleWidgetAccentChange = (e) => {
      const hex = e.detail
      if (!hex) return
      const curUser = getCurrentUser()
      const userCals = getUserCalendars(curUser)
      syncWidgetData({ tasks: globalTasks, calendars: userCals, calendarColor: hex }).catch(() => {})
    }
    window.addEventListener('studenthub_widget_accent_changed', handleWidgetAccentChange)
    return () => window.removeEventListener('studenthub_widget_accent_changed', handleWidgetAccentChange)
  }, [globalTasks])

  // Escuchar cambios de tema (dark/light, estilo de tema) para sincronizar widgets de Android de inmediato
  useEffect(() => {
    const handleThemeChanged = () => {
      const curUser = getCurrentUser()
      const userCals = getUserCalendars(curUser)
      const customWidgetAccent = localStorage.getItem('studenthub_widget_accent_color')
      let primaryColor = customWidgetAccent || '#0071E3'
      if (!customWidgetAccent) {
        const activeCalId = localStorage.getItem('app_active_calendar_id')
        const activeCal = (userCals || []).find((c) => c.id === activeCalId) || userCals[0]
        if (activeCal && activeCal.color) primaryColor = activeCal.color
      }
      syncWidgetData({ tasks: globalTasks, calendars: userCals, calendarColor: primaryColor }).catch(() => {})
    }
    window.addEventListener('app_theme_changed', handleThemeChanged)
    window.addEventListener('app_theme_style_changed', handleThemeChanged)
    window.addEventListener('studenthub_theme_changed', handleThemeChanged)
    return () => {
      window.removeEventListener('app_theme_changed', handleThemeChanged)
      window.removeEventListener('app_theme_style_changed', handleThemeChanged)
      window.removeEventListener('studenthub_theme_changed', handleThemeChanged)
    }
  }, [globalTasks])

  // Comprobador en vivo de Alarmas Sonoras y Notificaciones de inicio de eventos
  useEffect(() => {
    requestNotificationPermission().catch(() => {})
    checkUpcomingTasksAlarms(globalTasks)
    const timer = setInterval(() => {
      checkUpcomingTasksAlarms(globalTasks)
    }, 15000)
    return () => clearInterval(timer)
  }, [globalTasks])

  // Sincronizar tareas persistentemente con el espacio privado de la cuenta activa y los widgets del sistema
  useEffect(() => {
    const curUser = getCurrentUser()
    saveUserTasks(globalTasks, curUser)

    // Obtener paleta de color del widget: prioridad al color personalizado de Ajustes, o al calendario activo
    const userCals = getUserCalendars(curUser)
    let primaryColor = '#0071E3'
    try {
      const customWidgetAccent = localStorage.getItem('studenthub_widget_accent_color')
      if (customWidgetAccent) {
        primaryColor = customWidgetAccent
      } else {
        const activeCalId = localStorage.getItem('app_active_calendar_id')
        const activeCal = (userCals || []).find((c) => c.id === activeCalId) || userCals[0]
        if (activeCal && activeCal.color) {
          primaryColor = activeCal.color
        }
      }
    } catch (e) {}
    syncWidgetData({ tasks: globalTasks, calendars: userCals, calendarColor: primaryColor })

    // Si la actualización procedió de una sincronización remota (Firestore o SSE), no rebotar hacia la nube
    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false
      return
    }

    // Si el usuario está en modo invitado (sin sesión iniciada), NO sincronizar hacia la nube ni Baileys
    if (isGuestUser(curUser)) {
      return
    }

    syncTasksToCloud(globalTasks)

    const currentJson = JSON.stringify(globalTasks)
    if (lastPushedTasksJsonRef.current === currentJson) return

    // Debounce de 300ms para enviar inmediatamente al puente en Render
    const timer = setTimeout(() => {
      lastPushedTasksJsonRef.current = currentJson
      syncBaileysTasks(globalTasks).catch(() => {})
    }, 300)

    return () => clearTimeout(timer)
  }, [globalTasks])

  // Escuchar eventos de actualización externa o entre pestañas
  useEffect(() => {
    const handleStorageUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setGlobalTasks(e.detail)
      } else {
        const curUser = getCurrentUser()
        setGlobalTasks(getUserTasks(curUser))
      }
    }
    window.addEventListener('global_tasks_updated', handleStorageUpdate)
    return () => window.removeEventListener('global_tasks_updated', handleStorageUpdate)
  }, [])

  // Función de mezcla atómica de tareas entrantes desde el servidor (SSE / Polling)
  const mergeRemoteTasks = useCallback((syncedTasks, deletedIds = []) => {
    if (!Array.isArray(syncedTasks)) return

    const delSet = new Set((deletedIds || []).map(String))

    setGlobalTasks((prevTasks) => {
      // 1. Quitar cualquier tarea cuyo ID esté explícitamente en deletedIds
      let current = (prevTasks || []).filter((t) => !delSet.has(String(t.id)))

      const remoteMap = new Map()
      syncedTasks.forEach((st) => {
        if (st && st.id && !delSet.has(String(st.id))) {
          remoteMap.set(String(st.id), st)
        }
      })

      let hasModifications = false

      // 2. Actualizar tareas existentes que hayan cambiado en el servidor (renombrado, hora, notas...)
      current = current.map((t) => {
        const remote = remoteMap.get(String(t.id))
        if (remote) {
          remoteMap.delete(String(t.id)) // Marcada como procesada
          const titleChanged = remote.title && remote.title !== t.title
          const timeChanged = remote.time && remote.time !== t.time
          const dateChanged = remote.date && remote.date !== t.date
          const descChanged = remote.description !== undefined && remote.description !== t.description
          const estChanged = remote.est && remote.est !== t.est
          const effortChanged = remote.effort && remote.effort !== t.effort
          const contextChanged = remote.context && remote.context !== t.context
          const completedChanged = remote.completed !== undefined && remote.completed !== t.completed

          if (titleChanged || timeChanged || dateChanged || descChanged || estChanged || effortChanged || contextChanged || completedChanged) {
            hasModifications = true
            return {
              ...t,
              title: remote.title || t.title,
              time: remote.time || t.time,
              date: remote.date || t.date,
              description: remote.description !== undefined ? remote.description : t.description,
              est: remote.est || t.est,
              effort: remote.effort || t.effort,
              context: remote.context || t.context,
              color: remote.color || t.color,
              completed: remote.completed !== undefined ? remote.completed : t.completed,
              updatedAt: remote.updatedAt || Date.now(),
            }
          }
        }
        return t
      })

      // 3. Añadir nuevas tareas que vinieron del servidor y no teníamos
      const existingKeys = new Set(
        current.map((t) => `${(t.title || '').trim().toLowerCase()}_${t.date}_${t.time}`)
      )

      for (const [, newRemoteTask] of remoteMap) {
        if (newRemoteTask._deleted) continue
        const key = `${(newRemoteTask.title || '').trim().toLowerCase()}_${newRemoteTask.date}_${newRemoteTask.time}`
        if (!existingKeys.has(key)) {
          current.unshift(newRemoteTask)
          hasModifications = true
        }
      }

      if (hasModifications || delSet.size > 0) {
        isRemoteSyncRef.current = true
        lastPushedTasksJsonRef.current = JSON.stringify(current)
        try {
          localStorage.setItem('app_global_tasks', JSON.stringify(current))
        } catch (e) {}
        return current
      }
      return prevTasks
    })
  }, [])

  // Sincronización en tiempo real ultra rápida (<50ms) mediante Server-Sent Events (SSE)
  // con respaldo periódico por sondeo (8s) ante suspensiones en móviles
  // RESTRICCIÓN ESTRICTA DE PRIVACIDAD: Un usuario sin sesión NUNCA recibe eventos de otros usuarios ni del servidor
  useEffect(() => {
    let isCancelled = false
    let unsubscribe = () => {}

    const setupSync = () => {
      const curUser = getCurrentUser()
      if (isGuestUser(curUser)) return // Invitado sin sesión: no recibir eventos remotos

      unsubscribe = subscribeToBaileysLiveUpdates((remoteTasks, deletedIds) => {
        if (!isCancelled && !isGuestUser(getCurrentUser())) {
          mergeRemoteTasks(remoteTasks, deletedIds)
        }
      })

      const fallbackSync = async () => {
        if (isGuestUser(getCurrentUser())) return
        try {
          const syncedTasks = await getBaileysRecentTasks()
          if (!isCancelled && Array.isArray(syncedTasks) && syncedTasks.length > 0 && !isGuestUser(getCurrentUser())) {
            mergeRemoteTasks(syncedTasks)
          }
        } catch (err) {}
      }

      fallbackSync()
    }

    setupSync()
    const interval = setInterval(() => {
      if (!isCancelled && !isGuestUser(getCurrentUser())) {
        getBaileysRecentTasks().then((syncedTasks) => {
          if (!isCancelled && Array.isArray(syncedTasks) && syncedTasks.length > 0 && !isGuestUser(getCurrentUser())) {
            mergeRemoteTasks(syncedTasks)
          }
        }).catch(() => {})
      }
    }, 8000)

    const handleAuth = () => {
      unsubscribe()
      setupSync()
    }
    window.addEventListener('studenthub_auth_changed', handleAuth)

    return () => {
      isCancelled = true
      unsubscribe()
      clearInterval(interval)
      window.removeEventListener('studenthub_auth_changed', handleAuth)
    }
  }, [mergeRemoteTasks])

  const [hubCategories, setHubCategories] = useState([
    { id: 'all', label: 'All Resources' },
    { id: 'university', label: 'University', color: 'bg-tag-university-text' },
    { id: 'dev', label: 'Dev & Design', color: 'bg-primary-container' },
    { id: 'personal', label: 'Personal', color: 'bg-tag-personal-text' },
    { id: 'maker', label: 'Maker & 3D', color: 'bg-tertiary' },
  ])

  const [notebookFolders, setNotebookFolders] = useState([
    {
      id: 'f-1',
      name: 'University Notes',
      icon: 'school',
      iconColor: 'text-tag-university-text',
      expanded: true,
      notes: [
        { id: 'n-1', title: 'Linear Algebra & Matrices', active: false },
        { id: 'n-2', title: 'Cybersecurity Protocols', active: true },
        { id: 'n-3', title: 'Database Systems Exam Prep', active: false },
        { id: 'n-4', title: 'Computer Architecture', active: false },
      ],
    },
    {
      id: 'f-2',
      name: 'Personal Projects',
      icon: 'terminal',
      iconColor: 'text-tag-personal-text',
      expanded: false,
      notes: [
        { id: 'n-5', title: 'React UI Component Architecture', active: false },
        { id: 'n-6', title: '3D Printer Slicer Configs', active: false },
      ],
    },
    {
      id: 'f-3',
      name: 'Reading & Research',
      icon: 'library_books',
      iconColor: 'text-tertiary',
      expanded: false,
      notes: [
        { id: 'n-7', title: 'Deep Work Chapter Summary', active: false },
        { id: 'n-8', title: 'Zero Trust Security Whitepaper', active: false },
      ],
    },
  ])


  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  )

  const showSidebar = navPosition === 'sidebar'

  // Memoized outlet context
  const _memoContext = useMemo(() => ({
    globalTasks,
    isSidebarOpen,
    navPosition,
    aiAssistantMode,
    hubCategories,
    notebookFolders,
  }), [
    globalTasks,
    isSidebarOpen,
    navPosition,
    aiAssistantMode,
    hubCategories,
    notebookFolders,
  ])

  const outletContextValue = useMemo([() => ({
    globalTasks,
    setGlobalTasks,
    isSidebarOpen,
    setIsSidebarOpen,
    navPosition,
    setNavPosition,
    aiAssistantMode,
    setAiAssistantMode,
    hubCategories,
    setHubCategories,
    notebookFolders,
    setNotebookFolders,
  })][0], [
    globalTasks,
    isSidebarOpen,
    navPosition,
    aiAssistantMode,
    hubCategories,
    notebookFolders,
  ])

  return (
    <div className="bg-surface-subtle font-body-md text-on-surface min-h-screen overflow-x-hidden">
      {showSidebar && (
        <Sidebar isSidebarOpen={isSidebarOpen} onCloseSidebar={() => setIsSidebarOpen(false)} />
      )}
      <div
        className={`transition-all duration-300 ${
          showSidebar && isSidebarOpen ? 'md:pl-60 pl-0' : 'pl-0'
        }`}
      >
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={showSidebar && isSidebarOpen}
          navPosition={navPosition}
          setNavPosition={setNavPosition}
          aiAssistantMode={aiAssistantMode}
          setAiAssistantMode={setAiAssistantMode}
        />
        <main
          className={`w-full ${
            navPosition === 'top' ? 'pt-28 md:pt-22' : 'pt-20 md:pt-16'
          } px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 pb-20 md:pb-margin-lg bg-surface-subtle min-h-screen`}
        >
          <Outlet context={outletContextValue} />
        </main>
        {aiAssistantMode === 'floating' && (
          <FloatingAICopilot globalTasks={globalTasks} setGlobalTasks={setGlobalTasks} />
        )}

        {/* Modal / Widget Desplegable de Voz con IA */}
        {isVoiceCopilotOpen && (
          <div
            onClick={() => setIsVoiceCopilotOpen(false)}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/40 animate-in fade-in duration-150 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg cursor-default flex flex-col gap-2 mb-2 sm:mb-0"
            >
              <div className="flex items-center justify-between px-2 text-white text-xs font-semibold drop-shadow-md">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">graphic_eq</span>
                  <span>Copiloto de Voz IA</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsVoiceCopilotOpen(false)}
                  className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white cursor-pointer"
                  title="Cerrar"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <VoiceCopilotWidget
                globalTasks={globalTasks}
                setGlobalTasks={setGlobalTasks}
                className="shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* Notificaciones y Alarmas Sonoras en Vivo */}
        <AlarmRingingOverlay
          onTaskCompleted={(taskId) => {
            setGlobalTasks((prev) =>
              (prev || []).map((t) => (t.id === taskId ? { ...t, completed: true } : t))
            )
          }}
        />
        <UpdateNotification />
      </div>
    </div>
  )
}
