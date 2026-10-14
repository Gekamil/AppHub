import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import FloatingAICopilot from '../components/FloatingAICopilot'
import { syncTasksToCloud } from '../services/firebase'

const DEFAULT_TASKS = [
  {
    id: 1,
    title: 'Review AI exam notes & Neural Architecture slides',
    description: 'Chapters 4 to 7: Focus on backprop proofs, gradient clipping & transformer attention matrices.',
    date: '2026-10-12',
    time: '09:30',
    effort: 'High',
    context: 'University',
    est: '90m',
    completed: false,
    color: 'bg-primary-container',
    calendarId: 'cal-uni',
    icon: 'school',
  },
  {
    id: 2,
    title: 'Finish React project layout & Tailwind token alignment',
    description: 'Refactor button states and clean redundant nested flex wraps in navigation panel.',
    date: '2026-10-12',
    time: '12:00',
    effort: 'Medium',
    context: 'Projects',
    est: '45m',
    completed: false,
    color: 'bg-secondary-fixed-dim',
    calendarId: 'cal-default',
    icon: 'terminal',
  },
  {
    id: 3,
    title: 'Gym - Upper Body session (Volume focus)',
    description: 'Barbell bench press, incline DB presses, cable rows, face-pulls. Basic Malagueta gym center.',
    date: '2026-10-14',
    time: '16:30',
    effort: 'Medium',
    context: 'Health & Gym',
    est: '60m',
    completed: false,
    color: 'bg-tertiary',
    calendarId: 'cal-default',
    icon: 'fitness_center',
  },
  {
    id: 4,
    title: 'Dinner reservations with Lucía',
    description: 'Osteria Angelic near Plaza de la Merced. Confirmation #8491.',
    date: '2026-10-16',
    time: '20:00',
    effort: 'Low',
    context: 'Personal',
    est: '60m',
    completed: false,
    color: 'bg-tag-personal-text',
    calendarId: 'cal-default',
    icon: 'restaurant',
  },
]

const APP_TABS = ['/calendar', '/', '/notebooks', '/ai-assistant', '/my-hub']

export default function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()

  const [navPosition, setNavPosition] = useState(() => {
    return localStorage.getItem('app_nav_position') || 'top'
  })

  const [aiAssistantMode, setAiAssistantMode] = useState(() => {
    return localStorage.getItem('app_ai_assistant_mode') || 'floating'
  })

  useEffect(() => {
    localStorage.setItem('app_nav_position', navPosition)
  }, [navPosition])

  useEffect(() => {
    localStorage.setItem('app_ai_assistant_mode', aiAssistantMode)
  }, [aiAssistantMode])

  // Soporte Global de Navegación por Gestos:
  // 1. Móvil / Tablet: Deslizar con 2 dedos horizontalmente entre páginas (solo si no está en modo lateral)
  // 2. Ordenador (Trackpad / Touchpad): Deslizar con 2 dedos horizontalmente (solo si no está en modo lateral)
  const touchStateRef = useRef({ active: false, startX: 0, startY: 0, maxFingers: 1 })
  const lastWheelTimeRef = useRef(0)

  useEffect(() => {
    // Si la navegación está en modo barra lateral, deshabilitar gestos de deslizamiento con 2 dedos
    if (navPosition === 'sidebar') return

    const currentTabs = aiAssistantMode === 'floating'
      ? ['/calendar', '/', '/notebooks', '/my-hub']
      : ['/calendar', '/', '/notebooks', '/ai-assistant', '/my-hub']

    const getTabIndex = (path) => {
      const normalized = (path === '/auto-organizer' || path === '') ? '/' : path
      const idx = currentTabs.findIndex((t) => t === normalized || (t !== '/' && normalized.startsWith(t)))
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

    // Gestos de trackpad de portátil con 2 dedos (evento wheel horizontal)
    const handleWheel = (e) => {
      if (e.ctrlKey) return // Ignorar zoom de página
      if (Math.abs(e.deltaX) < 35) return
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.1) return

      const now = Date.now()
      if (now - lastWheelTimeRef.current < 500) return // Cooldown suave

      const currentIdx = getTabIndex(location.pathname)

      // En trackpad: mover 2 dedos a la izquierda genera deltaX > 0 => avanza a la página de la derecha
      if (e.deltaX > 0 && currentIdx < currentTabs.length - 1) {
        lastWheelTimeRef.current = now
        navigate(currentTabs[currentIdx + 1])
      } else if (e.deltaX < 0 && currentIdx > 0) {
        // Mover 2 dedos a la derecha genera deltaX < 0 => retrocede a la página de la izquierda
        lastWheelTimeRef.current = now
        navigate(currentTabs[currentIdx - 1])
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('wheel', handleWheel, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [location.pathname, navigate, navPosition, aiAssistantMode])

  const [globalTasks, setGlobalTasks] = useState(() => {
    try {
      const stored = localStorage.getItem('app_global_tasks')
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return parsed
      }
    } catch (e) {}
    try {
      localStorage.setItem('app_global_tasks', JSON.stringify(DEFAULT_TASKS))
    } catch (e) {}
    return DEFAULT_TASKS
  })

  // Sincronizar tareas persistentemente con localStorage y la nube
  useEffect(() => {
    try {
      localStorage.setItem('app_global_tasks', JSON.stringify(globalTasks))
      syncTasksToCloud(globalTasks)
    } catch (e) {}
  }, [globalTasks])

  // Escuchar eventos de actualización externa o entre pestañas
  useEffect(() => {
    const handleStorageUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setGlobalTasks(e.detail)
      } else {
        try {
          const stored = localStorage.getItem('app_global_tasks')
          if (stored !== null) setGlobalTasks(JSON.parse(stored))
        } catch (err) {}
      }
    }
    window.addEventListener('global_tasks_updated', handleStorageUpdate)
    return () => window.removeEventListener('global_tasks_updated', handleStorageUpdate)
  }, [])

  // Sincronización continua y global de tareas de WhatsApp Baileys con el estado de toda la aplicación
  useEffect(() => {
    let isCancelled = false

    const checkAndSyncWhatsApp = async () => {
      try {
        const res = await fetch('/api/baileys/recent-tasks')
        if (!res.ok) return
        const syncedTasks = await res.json()
        if (isCancelled || !Array.isArray(syncedTasks) || syncedTasks.length === 0) return

        setGlobalTasks((prevTasks) => {
          let hasModifications = false
          const remoteMap = new Map()
          syncedTasks.forEach((st) => {
            if (st.id) remoteMap.set(String(st.id), st)
          })

          // 1. Detectar actualizaciones en tareas existentes (renombrado, horas, notas, est...)
          let updatedExisting = prevTasks.map((t) => {
            const remote = remoteMap.get(String(t.id))
            if (remote) {
              const titleChanged = remote.title && remote.title !== t.title
              const timeChanged = remote.time && remote.time !== t.time
              const dateChanged = remote.date && remote.date !== t.date
              const descChanged = remote.description !== undefined && remote.description !== t.description
              const estChanged = remote.est && remote.est !== t.est
              const effortChanged = remote.effort && remote.effort !== t.effort
              const contextChanged = remote.context && remote.context !== t.context

              if (titleChanged || timeChanged || dateChanged || descChanged || estChanged || effortChanged || contextChanged) {
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
                }
              }
            }
            return t
          })

          // 2. Eliminar tareas marcadas como eliminadas en WhatsApp (por ID o por Título)
          const deletedTasks = syncedTasks.filter((st) => st._deleted)
          const deletedIds = new Set(deletedTasks.filter((st) => st.id).map((st) => String(st.id)))
          const deletedTitles = deletedTasks
            .filter((st) => st.title)
            .map((st) => st.title.trim().toLowerCase())

          const filteredExisting = updatedExisting.filter((t) => {
            if (deletedIds.has(String(t.id))) {
              hasModifications = true
              return false
            }
            const tTitle = (t.title || '').trim().toLowerCase()
            if (
              tTitle &&
              deletedTitles.some(
                (dt) => dt === tTitle || tTitle.includes(dt) || dt.includes(tTitle)
              )
            ) {
              hasModifications = true
              return false
            }
            return true
          })

          // 3. Incorporar tareas recién añadidas desde WhatsApp
          const existingIds = new Set(filteredExisting.map((t) => String(t.id)))
          const existingKeys = new Set(
            filteredExisting.map((t) => `${t.title?.trim().toLowerCase()}_${t.date}_${t.time}`)
          )
          const newlyAdded = syncedTasks.filter(
            (st) =>
              !st._deleted &&
              !existingIds.has(String(st.id)) &&
              !existingKeys.has(`${st.title?.trim().toLowerCase()}_${st.date}_${st.time}`)
          )

          if (newlyAdded.length > 0 || hasModifications) {
            const result = [...newlyAdded, ...filteredExisting]
            try {
              localStorage.setItem('app_global_tasks', JSON.stringify(result))
            } catch (e) {}
            return result
          }
          return prevTasks
        })
      } catch (err) {}
    }

    checkAndSyncWhatsApp()
    const interval = setInterval(checkAndSyncWhatsApp, 2500)
    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [])

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
            navPosition === 'top' ? 'pt-28 sm:pt-32 md:pt-22' : 'pt-20 md:pt-16'
          } px-3 sm:px-6 md:px-gutter-lg pb-margin-lg bg-surface-subtle min-h-screen`}
        >
          <Outlet
            context={{
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
            }}
          />
        </main>
        {aiAssistantMode === 'floating' && (
          <FloatingAICopilot globalTasks={globalTasks} setGlobalTasks={setGlobalTasks} />
        )}
      </div>
    </div>
  )
}
