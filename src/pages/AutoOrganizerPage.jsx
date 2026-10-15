import { useState, useEffect, useRef, useMemo } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { organizeScheduleWithAI, parseNaturalLanguageTask, parseNaturalLanguageSchedule, applyAIActions, parseScheduleLocalHeuristics } from '../services/aiOrganizer'
import PrecisionFocusModal from '../components/PrecisionFocusModal'
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  sendWhatsAppMessage,
  generateDailyBriefing,
  generateAnticipationAlerts,
  getWhatsAppLogs,
  processIncomingWhatsAppMessage,
} from '../services/whatsappBot'
import {
  getSharedRoles,
  saveSharedRoles,
  addSharedRole,
  deleteSharedRole,
  ROLE_PRESET_COLORS,
  ROLE_PRESET_ICONS,
} from '../services/sharedRoles'
import {
  getBaileysStatus,
  requestBaileysConnect,
  requestBaileysDisconnect,
  getBaileysRecentTasks,
  sendBaileysMessage,
  syncBaileysTasks,
  testBaileysChat,
} from '../services/baileysBridge'

export default function AutoOrganizerPage() {
  const { globalTasks = [], setGlobalTasks } = useOutletContext() || {}
  const navigate = useNavigate()

  // Estados de Entrada Rápida Progresiva
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isQuickPromptOpen, setIsQuickPromptOpen] = useState(false)
  const [pendingQuickTitle, setPendingQuickTitle] = useState('')
  const [quickEffort, setQuickEffort] = useState('Medium')
  const [quickContext, setQuickContext] = useState('University')

  const [selectedEffort, setSelectedEffort] = useState('Medium')
  const [selectedContext, setSelectedContext] = useState('University')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedTime, setSelectedTime] = useState('10:00')

  // Filtros y Vista
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'pending' | 'completed'
  const [selectedContextFilter, setSelectedContextFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedRadarDate, setSelectedRadarDate] = useState('2026-10-14')

  // Modal y Configuración de Bot de WhatsApp (Meta Cloud API + Baileys Puente Local)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [whatsAppConfig, setWhatsAppConfig] = useState(getWhatsAppConfig())
  const [whatsAppTestText, setWhatsAppTestText] = useState('')
  const [whatsAppNotificationMsg, setWhatsAppNotificationMsg] = useState('')

  // Estado de WhatsApp Web Autónomo (Baileys)
  const [baileysState, setBaileysState] = useState({
    status: 'disconnected', // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
    qrCode: null,
    user: null,
    phone: null,
  })
  const [isBaileysActionLoading, setIsBaileysActionLoading] = useState(false)

  // Estado del Modal de Tarea (Simple vs Avanzado)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false)
  const [taskModalMode, setTaskModalMode] = useState(() => {
    return localStorage.getItem('auto_task_modal_mode') || 'simple'
  })
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    effort: 'Medium',
    context: 'University',
    est: '45m',
    calendarId: 'cal-default',
    icon: 'task_alt',
  })

  // Clasificaciones y Roles con memoria compartida (Sincronización bidireccional con el Calendario)
  const [roles, setRoles] = useState(() => getSharedRoles())
  const contexts = roles // Alias para compatibilidad total con el resto del código

  // Estados para modal de creación y personalización de roles
  const [isManageRolesModalOpen, setIsManageRolesModalOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState(ROLE_PRESET_COLORS[0].hex)
  const [newRoleIcon, setNewRoleIcon] = useState('task_alt')

  useEffect(() => {
    const handleRolesUpdated = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setRoles(e.detail)
      }
    }
    window.addEventListener('shared_roles_updated', handleRolesUpdated)
    return () => window.removeEventListener('shared_roles_updated', handleRolesUpdated)
  }, [])

  // Sondeo periódico de estado y tareas recibidas por WhatsApp Web (Baileys)
  useEffect(() => {
    let isCancelled = false

    const checkStatusAndSync = async () => {
      try {
        const statusData = await getBaileysStatus()
        if (!isCancelled && statusData) {
          setBaileysState((prev) => {
            if (
              prev.status !== statusData.status ||
              prev.qrCode !== statusData.qrCode ||
              prev.phone !== statusData.phone
            ) {
              return { ...prev, ...statusData }
            }
            return prev
          })
        }

        const syncedTasks = await getBaileysRecentTasks()
        if (!isCancelled && Array.isArray(syncedTasks) && syncedTasks.length > 0) {
          setGlobalTasks((prevTasks) => {
            let hasModifications = false
            const remoteMap = new Map()
            syncedTasks.forEach((st) => {
              if (st.id) remoteMap.set(String(st.id), st)
            })

            // 1. Detectar actualizaciones en tareas existentes (renombrado, horas, fecha, notas, est...)
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

            // 2. Eliminar tareas marcadas como eliminadas en el puente (por ID o por Título)
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
              const msg =
                newlyAdded.length > 0
                  ? `${newlyAdded.length} tarea(s) sincronizada(s) desde WhatsApp`
                  : 'Agenda actualizada desde WhatsApp'
              setAiNotification(msg)
              setTimeout(() => setAiNotification(''), 5000)
              return [...newlyAdded, ...filteredExisting]
            }
            return prevTasks
          })
        }
      } catch (err) {}
    }

    checkStatusAndSync()
    const intervalTime = isWhatsAppModalOpen ? 2500 : 8000
    const interval = setInterval(checkStatusAndSync, intervalTime)

    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [isWhatsAppModalOpen, setGlobalTasks])

  // Sincronizar agenda completa con el puente local del bot de WhatsApp
  useEffect(() => {
    if (Array.isArray(globalTasks) && globalTasks.length > 0) {
      syncBaileysTasks(globalTasks)
    }
  }, [globalTasks])

  // Estado de Organización con IA (Groq)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiStrategy, setAiStrategy] = useState(null)
  const [aiNotification, setAiNotification] = useState('')

  // Temporizador de Enfoque (Pomodoro)
  const [activeFocusTask, setActiveFocusTask] = useState(null)
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60)
  const [pomodoroTotalSeconds, setPomodoroTotalSeconds] = useState(25 * 60)
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false)


  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const startFocusTimer = (task) => {
    setActiveFocusTask(task)
    let mins = 25
    if (task?.est && typeof task.est === 'string' && /^\s*\d+\s*(m|min)/i.test(task.est)) {
      const parsed = parseInt(task.est.replace(/[^\d]/g, ''), 10)
      if (parsed > 0) mins = parsed
    } else if (task?.effort === 'High') {
      mins = 90
    } else if (task?.effort === 'Medium') {
      mins = 45
    } else if (task?.effort === 'Low') {
      mins = 30
    }
    const secs = mins * 60
    setPomodoroTotalSeconds(secs)
    setPomodoroSeconds(secs)
    setIsPomodoroRunning(true)
    setIsFocusModalOpen(true)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFocusModalOpen) {
        setIsFocusModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFocusModalOpen])

  // Guardar preferencia de modo de modal
  const toggleModalMode = (mode) => {
    setTaskModalMode(mode)
    localStorage.setItem('auto_task_modal_mode', mode)
  }

  // Abrir Modal para crear o editar
  const handleOpenCreateModal = () => {
    setEditingTaskId(null)
    setTaskFormData({
      title: newTaskTitle || '',
      description: '',
      date: selectedDate || new Date().toISOString().split('T')[0],
      time: selectedTime || '10:00',
      effort: selectedEffort || 'Medium',
      context: selectedContext || 'University',
      est: '45m',
      calendarId: 'cal-default',
      icon: 'task_alt',
    })
    setIsTaskModalOpen(true)
  }

  const handleOpenEditModal = (task) => {
    setEditingTaskId(task.id)
    setTaskFormData({
      title: task.title || '',
      description: task.description || '',
      date: task.date || new Date().toISOString().split('T')[0],
      time: task.time || '10:00',
      effort: task.effort || 'Medium',
      context: task.context || 'University',
      est: task.est || '45m',
      calendarId: task.calendarId || 'cal-default',
      icon: task.icon || 'task_alt',
    })
    setIsTaskModalOpen(true)
  }

  // Guardar tarea (crear o editar)
  const handleSaveTask = (e) => {
    e.preventDefault()
    if (!taskFormData.title.trim()) return

    const effortColors = {
      Low: 'bg-emerald-500',
      Medium: 'bg-amber-500',
      High: 'bg-rose-500',
    }

    if (editingTaskId) {
      setGlobalTasks((prev) =>
        prev.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                ...taskFormData,
                title: taskFormData.title.trim(),
                color: effortColors[taskFormData.effort] || 'bg-primary-container',
              }
            : t
        )
      )
    } else {
      const newTask = {
        id: Date.now(),
        title: taskFormData.title.trim(),
        description: taskFormData.description.trim() || `Programado para ${taskFormData.date} a las ${taskFormData.time}`,
        date: taskFormData.date,
        time: taskFormData.time,
        effort: taskFormData.effort,
        context: taskFormData.context,
        est: taskFormData.est || '45m',
        completed: false,
        calendarId: taskFormData.calendarId || 'cal-default',
        icon: taskFormData.icon || 'task_alt',
        color: effortColors[taskFormData.effort] || 'bg-primary-container',
      }
      setGlobalTasks((prev) => [newTask, ...prev])
    }

    setNewTaskTitle('')
    setIsTaskModalOpen(false)
  }

  // Ingesta Directa con IA: al pulsar Enter, procesa automáticamente la frase,
  // asigna fecha, hora, rol y esfuerzo, y la añade directamente sin pasos manuales 1 a 1.
  const handleDirectSmartIngestion = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const rawText = (newTaskTitle || pendingQuickTitle || '').trim()
    if (!rawText) return

    setIsAiLoading(true)
    setAiNotification(`Procesando con IA: "${rawText}"...`)
    setNewTaskTitle('')
    setPendingQuickTitle('')
    setIsQuickPromptOpen(false)

    try {
      const result = await parseNaturalLanguageSchedule(rawText, selectedDate || '2026-10-14')
      if (result && result.tasks && result.tasks.length > 0) {
        setGlobalTasks((prev) => [...result.tasks, ...prev])
        setAiNotification(result.summary || `${result.tasks.length} evento(s) asignado(s) con éxito.`)
        setTimeout(() => setAiNotification(''), 4500)
        setIsAiLoading(false)
        return
      }
    } catch (err) {
      console.warn('Fallo en llamada remota IA, usando análisis heurístico inmediato:', err)
    }

    // Heurística local de ultra-precisión (fallback instantáneo sin latencia)
    const localResult = parseScheduleLocalHeuristics(rawText, selectedDate || '2026-10-14')
    if (localResult && localResult.tasks && localResult.tasks.length > 0) {
      setGlobalTasks((prev) => [...localResult.tasks, ...prev])
      setAiNotification(localResult.summary)
      setTimeout(() => setAiNotification(''), 4500)
    }
    setIsAiLoading(false)
  }

  // Conmutar estado de completada
  const toggleTaskCompleted = (id) => {
    setGlobalTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  // Eliminar tarea
  const handleDeleteTask = (id) => {
    setGlobalTasks((prev) => prev.filter((t) => t.id !== id))
  }

  // Auto-Organizar con IA: Reordena y envía logs estructurados y gráficos al asistente/bot
  const handleAutoOrganizeWithAI = async () => {
    if (globalTasks.length === 0) return
    setIsAiLoading(true)
    setAiNotification('Analizando prioridades y bloques de esfuerzo con IA...')

    try {
      const result = await organizeScheduleWithAI(globalTasks)
      if (result.success && result.sortedTasks) {
        setGlobalTasks(result.sortedTasks)

        // Enviar log estructurado con tabla y consejo al asistente IA (FloatingAICopilot y chat con bot)
        window.dispatchEvent(
          new CustomEvent('copilot_add_log', {
            detail: {
              type: 'schedule_plan',
              text: `Plan de Organización Semanal generado con éxito`,
              planData: {
                summary: result.summary,
                tip: result.productivityTip,
                tasks: result.sortedTasks.slice(0, 8),
              },
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          })
        )

        setAiStrategy(null)
        setAiNotification('Horario organizado con éxito. Plan visual guardado en el asistente.')
        setTimeout(() => setAiNotification(''), 5000)
      }
    } catch (err) {
      setAiNotification('Error al contactar con el organizador IA')
    } finally {
      setIsAiLoading(false)
    }
  }

  // Creación de nuevo rol compartido
  const handleAddNewRole = () => {
    if (!newRoleName.trim()) return
    const updated = addSharedRole({
      name: newRoleName.trim(),
      hexColor: newRoleColor,
      icon: newRoleIcon,
    })
    setRoles(updated)
    setNewRoleName('')
    setAiNotification(`Rol "${newRoleName.trim()}" creado y compartido con el Calendario.`)
    setTimeout(() => setAiNotification(''), 4000)
  }

  // Eliminación de rol compartido
  const handleDeleteRole = (roleId) => {
    const updated = deleteSharedRole(roleId)
    setRoles(updated)
    setAiNotification('Rol eliminado de la memoria compartida.')
    setTimeout(() => setAiNotification(''), 4000)
  }

  // Control de Conexión de WhatsApp Web (Baileys)
  const handleConnectBaileys = async () => {
    setIsBaileysActionLoading(true)
    setWhatsAppNotificationMsg('Iniciando sesión y generando código QR seguro...')
    try {
      const res = await requestBaileysConnect()
      setBaileysState((prev) => ({ ...prev, ...res }))
    } catch (e) {
      setWhatsAppNotificationMsg('Error al conectar con el puente local')
    } finally {
      setIsBaileysActionLoading(false)
    }
  }

  const handleDisconnectBaileys = async () => {
    setIsBaileysActionLoading(true)
    setWhatsAppNotificationMsg('Cerrando sesión de WhatsApp...')
    try {
      const res = await requestBaileysDisconnect()
      setBaileysState({ status: 'disconnected', qrCode: null, user: null, phone: null })
      setWhatsAppNotificationMsg('Dispositivo desvinculado con éxito.')
      setTimeout(() => setWhatsAppNotificationMsg(''), 4000)
    } catch (e) {
      setWhatsAppNotificationMsg('Error al desvincular')
    } finally {
      setIsBaileysActionLoading(false)
    }
  }

  // Enviar Briefing Matutino a WhatsApp
  const handleSendDailyBriefing = async () => {
    const briefingText = generateDailyBriefing(globalTasks)
    setAiNotification('Enviando briefing a WhatsApp...')

    if (baileysState.status === 'connected') {
      const targetPhone = baileysState.phone || whatsAppConfig.userPhone
      const res = await sendBaileysMessage({ to: targetPhone, text: briefingText })
      if (res.success) {
        setAiNotification('Briefing matutino enviado a tu WhatsApp')
      } else {
        setAiNotification(`Error al enviar por WhatsApp: ${res.error}`)
      }
    } else {
      const res = await sendWhatsAppMessage({ text: briefingText })
      if (res.success) {
        setAiNotification(
          res.simulated
            ? 'Briefing generado y registrado en el historial del bot.'
            : 'Briefing enviado con éxito a tu WhatsApp.'
        )
      } else {
        setAiNotification(`Error en WhatsApp: ${res.error}`)
      }
    }
    setTimeout(() => setAiNotification(''), 5000)
  }

  // Enviar o simular mensaje entrante de WhatsApp
  const handleSimulateWhatsAppMessage = async (e) => {
    e.preventDefault()
    if (!whatsAppTestText.trim()) return

    const incomingText = whatsAppTestText.trim()
    setWhatsAppTestText('')
    setWhatsAppNotificationMsg('Procesando mensaje con el bot IA...')

    try {
      if (baileysState.status === 'connected' && baileysState.phone) {
        await sendBaileysMessage({ to: baileysState.phone, text: incomingText })
      }

      // Probar directamente con el motor inteligente de WhatsApp
      const result = await testBaileysChat(incomingText)
      if (result.newTasks && Array.isArray(result.newTasks) && result.newTasks.length > 0) {
        const mapped = result.newTasks.map((t) => ({
          id: Date.now() + Math.floor(Math.random() * 1000),
          ...t,
          completed: false,
          calendarId: 'cal-default',
          color:
            t.effort === 'High'
              ? 'bg-rose-500'
              : t.effort === 'Medium'
              ? 'bg-amber-500'
              : 'bg-emerald-500',
          icon: 'task_alt',
          source: 'whatsapp_baileys',
        }))
        setGlobalTasks((prev) => [...mapped, ...prev])
      }
      setWhatsAppNotificationMsg(`Bot respondió: "${result.reply}"`)
      setTimeout(() => setWhatsAppNotificationMsg(''), 9000)
    } catch (err) {
      setWhatsAppNotificationMsg('Error al procesar mensaje con el bot')
    }
  }

  // Filtrado de Tareas
  const filteredTasks = globalTasks.filter((task) => {
    if (filterStatus === 'pending' && task.completed) return false
    if (filterStatus === 'completed' && !task.completed) return false
    if (selectedContextFilter !== 'All' && task.context !== selectedContextFilter) return false
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchTitle = (task.title || '').toLowerCase().includes(query)
      const matchDesc = (task.description || '').toLowerCase().includes(query)
      return matchTitle || matchDesc
    }
    return true
  })

  // Métricas y Alcance
  const todayYmd = '2026-10-14'
  const weekStart = '2026-10-12'
  const weekEnd = '2026-10-18'

  // Tareas de esta semana (Lunes 12 a Domingo 18 de octubre)
  const tasksThisWeek = useMemo(() => {
    return filteredTasks.filter((t) => t.date && t.date >= weekStart && t.date <= weekEnd)
  }, [filteredTasks])

  // Tareas de hoy
  const tasksToday = useMemo(() => {
    return filteredTasks.filter((t) => t.date === todayYmd)
  }, [filteredTasks])

  // Próxima actividad pendiente para el panel de Enfoque Rápido
  const nextTaskToday = useMemo(() => {
    const pending = tasksToday.filter((t) => !t.completed)
    if (pending.length === 0) return null
    return [...pending].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))[0]
  }, [tasksToday])

  const completedTodayCount = tasksToday.filter((t) => t.completed).length

  const estimatedTodayMins = useMemo(() => {
    return tasksToday.reduce((acc, t) => {
      const est = t.est || '45m'
      const num = parseInt(est) || 45
      return acc + num
    }, 0)
  }, [tasksToday])

  // Tareas del resto de la semana (Jueves 15 a Domingo 18 de octubre)
  const tasksRestOfWeek = useMemo(() => {
    return filteredTasks.filter((t) => t.date && t.date > todayYmd && t.date <= weekEnd)
  }, [filteredTasks])

  // Tareas de semanas posteriores (para no saturar la vista semanal)
  const tasksFutureWeeks = useMemo(() => {
    return filteredTasks.filter((t) => t.date && t.date > weekEnd)
  }, [filteredTasks])

  // Tareas pasadas o sin fecha
  const tasksPastOrOther = useMemo(() => {
    return filteredTasks.filter((t) => !t.date || t.date < todayYmd)
  }, [filteredTasks])

  const totalCount = globalTasks.length
  const completedCount = globalTasks.filter((t) => t.completed).length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Tareas relevantes para el balance visual semanal
  const relevantTasksForDistribution = tasksThisWeek
  const relevantTotalCount = relevantTasksForDistribution.length

  // Alertas de Anticipación Inteligente (Exámenes 2 semanas antes, entregas 4 días antes, deportes hoy)
  const anticipationAlerts = generateAnticipationAlerts(globalTasks, todayYmd)

  // Días de la semana para el Cronograma Gráfico Semanal
  const weekDays = [
    { label: 'Lun', date: '2026-10-12', dayNum: 12 },
    { label: 'Mar', date: '2026-10-13', dayNum: 13 },
    { label: 'Mié', date: '2026-10-14', dayNum: 14, isToday: true },
    { label: 'Jue', date: '2026-10-15', dayNum: 15 },
    { label: 'Vie', date: '2026-10-16', dayNum: 16 },
    { label: 'Sáb', date: '2026-10-17', dayNum: 17 },
    { label: 'Dom', date: '2026-10-18', dayNum: 18 },
  ]

  // Cálculo de distribución porcentual por rol para la barra gráfica
  const roleDistribution = roles.map((r) => {
    const count = relevantTasksForDistribution.filter(
      (t) => t.context === r.name || t.context === r.id || t.context === r.label
    ).length
    return {
      role: r,
      count,
      percent: relevantTotalCount > 0 ? Math.round((count / relevantTotalCount) * 100) : 0,
    }
  })

  // Lista de iconos disponibles para el selector visual de tareas avanzadas
  const ALL_TASK_ICONS = [
    'task_alt', 'school', 'fitness_center', 'terminal', 'person', 'work',
    'restaurant', 'menu_book', 'timer', 'alarm', 'flight', 'computer',
    'code', 'palette', 'music_note', 'local_cafe', 'movie', 'shopping_cart',
    'lightbulb', 'star', 'sports_tennis', 'science', 'favorite', 'flag'
  ]

  // Calcular los roles únicos activos presentes en las tareas no completadas (estrictamente máximo 3 colores simultáneos)
  const activeTaskRoles = useMemo(() => {
    const uncompletedTasks = (globalTasks || []).filter((t) => !t.completed)
    const contexts = []
    for (const t of uncompletedTasks) {
      if (t.context && !contexts.includes(t.context)) {
        contexts.push(t.context)
      }
      if (contexts.length === 3) break
    }

    if (contexts.length === 0) {
      for (const t of (globalTasks || [])) {
        if (t.context && !contexts.includes(t.context)) {
          contexts.push(t.context)
        }
        if (contexts.length === 3) break
      }
    }

    return contexts.map((ctxName) => {
      const match = roles.find(
        (r) => r.name === ctxName || r.id === ctxName || r.label === ctxName
      )
      return {
        context: ctxName,
        hex: match?.hex || '#3b82f6',
      }
    })
  }, [globalTasks, roles])

  const slot0 = activeTaskRoles[0] || null
  const slot1 = activeTaskRoles[1] || null
  const slot2 = activeTaskRoles[2] || null

  return (
    <div className="relative min-h-screen text-on-surface">
      {/* Halo de Fondo Luminoso Dinámico: Máximo 3 colores activos derivados de las tareas con desvanecimiento lento */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Color 1 - Slot Superior Izquierdo */}
        <div
          className="absolute -top-32 left-10 w-[550px] h-[550px] rounded-full blur-[140px] transform-gpu pointer-events-none transition-all duration-1000 ease-in-out"
          style={{
            backgroundColor: slot0 ? slot0.hex : 'transparent',
            opacity: slot0 ? 0.16 : 0,
            transform: slot0 ? 'scale(1)' : 'scale(0.75)',
          }}
        />
        {/* Color 2 - Slot Superior Derecho */}
        <div
          className="absolute top-10 right-10 w-[520px] h-[520px] rounded-full blur-[140px] transform-gpu pointer-events-none transition-all duration-1000 ease-in-out"
          style={{
            backgroundColor: slot1 ? slot1.hex : 'transparent',
            opacity: slot1 ? 0.15 : 0,
            transform: slot1 ? 'scale(1)' : 'scale(0.75)',
          }}
        />
        {/* Color 3 - Slot Central Inferior */}
        <div
          className="absolute top-1/2 left-1/4 w-[480px] h-[480px] rounded-full blur-[140px] transform-gpu pointer-events-none transition-all duration-1000 ease-in-out"
          style={{
            backgroundColor: slot2 ? slot2.hex : 'transparent',
            opacity: slot2 ? 0.13 : 0,
            transform: slot2 ? 'scale(1)' : 'scale(0.75)',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col w-full max-w-[2400px] 2xl:max-w-[2800px] mx-auto space-y-6 sm:space-y-8 pb-16 px-3 sm:px-6">
        {/* 1. Cabecera Principal Elegante (Sin botón redundante de Añadir Tarea) */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Organizador Semanal
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Miércoles, 14 de octubre</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{totalCount - completedCount} pendientes</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>{completedCount} completadas ({progressPercent}%)</span>
            </div>
          </div>

          {/* Acciones de Cabecera: Icono Carpeta para Auto-organizar, Focus y WhatsApp */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAutoOrganizeWithAI}
              disabled={isAiLoading}
              className="h-8.5 px-3.5 rounded-xl bg-white dark:bg-[#161b26] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs border border-slate-200/90 dark:border-slate-800 shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Organizar automáticamente la semana con IA y enviar logs al bot"
            >
              <span className={`material-symbols-outlined text-[16px] text-primary ${isAiLoading ? 'animate-spin' : ''}`}>
                {isAiLoading ? 'sync' : 'folder_open'}
              </span>
              <span>{isAiLoading ? 'Organizando...' : 'Auto-Organizar'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!activeFocusTask) {
                  const firstPending = globalTasks.find((t) => !t.completed) || globalTasks[0]
                  if (firstPending) {
                    startFocusTimer(firstPending)
                  } else {
                    setActiveFocusTask({
                      id: 999999,
                      title: 'Bloque Libre de Concentración',
                      context: 'Personal',
                      effort: 'Medium',
                      est: '25m',
                      description: 'Sesión enfocada de trabajo o estudio profundo sin distracciones.',
                    })
                    setPomodoroSeconds(25 * 60)
                    setIsPomodoroRunning(true)
                    setIsFocusModalOpen(true)
                  }
                } else {
                  setIsFocusModalOpen(true)
                }
              }}
              className="h-8.5 px-3.5 rounded-xl bg-white dark:bg-[#161b26] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs border border-slate-200/90 dark:border-slate-800 shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Abrir reloj de concentración"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-500">timer</span>
              <span>Modo Focus</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="h-8.5 px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium text-xs border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Bot de WhatsApp con vinculación QR y servidor local"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>WhatsApp Bot</span>
              {baileysState.status === 'connected' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="WhatsApp Web Conectado"></span>
              ) : baileysState.status === 'qr_ready' ? (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="QR pendiente de escaneo"></span>
              ) : null}
            </button>
          </div>
        </section>

        {/* Notificación Discreta en la cabecera */}
        {aiNotification && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            <span>{aiNotification}</span>
          </div>
        )}

        {/* 2. Disposición Dividida en 2 Columnas: Izquierda (Ingesta Rápida) + Derecha (Radar Gráfico) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* COLUMNA IZQUIERDA: Barra de Ingesta Rápida + Centro de Enfoque de Hoy (Llena el espacio vacío con utilidad real) */}
          <div className="w-full space-y-4">
            {/* 1. Barra de Entrada Rápida con Ingesta Directa por IA */}
            <div className="bg-white dark:bg-[#161b26] rounded-2xl p-1.5 sm:p-2 border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
              <form onSubmit={handleDirectSmartIngestion} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-[20px] ml-2 shrink-0">
                  add_task
                </span>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="¿Qué necesitas hacer? (ej. Deberes de sistemas el viernes, Gimnasio todos los martes...)"
                  className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none py-1.5 px-1 min-w-0"
                />
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
                  title="Configuración manual con todos los campos"
                >
                  <span className="material-symbols-outlined text-[13px]">tune</span>
                  <span className="hidden sm:inline">Avanzado</span>
                </button>
                <button
                  type="submit"
                  disabled={isAiLoading || !newTaskTitle.trim()}
                  className="h-7 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0 disabled:opacity-50"
                  title="Añadir directamente con IA (Enter)"
                >
                  <span>{isAiLoading ? 'Procesando...' : 'Añadir'}</span>
                  <kbd className="hidden sm:inline-block px-1 py-0.2 rounded bg-black/20 text-[10px] font-mono leading-none">
                    ↵
                  </kbd>
                </button>
              </form>
            </div>

            {/* 2. Centro de Enfoque y Momentum de Hoy (Llena armónicamente el espacio debajo del buscador) */}
            <div className="bg-white dark:bg-[#161b26] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
              {/* Cabecera del Panel de Enfoque */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[19px]">bolt</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                      Enfoque de Hoy
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Miércoles, 14 de Octubre • {tasksToday.length} {tasksToday.length === 1 ? 'actividad' : 'actividades'}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {completedTodayCount}/{tasksToday.length} hechas
                </span>
              </div>

              {/* Tarjeta de Próxima Actividad con Lanzador de Focus Directo */}
              {nextTaskToday ? (
                <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
                      <span className="material-symbols-outlined text-[20px]">{nextTaskToday.icon || 'play_circle'}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
                          Próxima actividad
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          {nextTaskToday.time || '10:00'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate pt-0.5">
                        {nextTaskToday.title}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startFocusTimer(nextTaskToday)}
                    className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95"
                    title="Iniciar temporizador Focus Pomodoro para esta tarea"
                  >
                    <span className="material-symbols-outlined text-[15px]">play_arrow</span>
                    <span>Focus</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-2.5 text-xs text-slate-500">
                  <span className="material-symbols-outlined text-[20px] text-emerald-500 shrink-0">check_circle</span>
                  <span>No tienes tareas pendientes para hoy. Todo al día.</span>
                </div>
              )}

              {/* Atajos Rápidos de Contexto / Rol */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Filtrar por contexto
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedContextFilter('All')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedContextFilter === 'All'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Todos ({globalTasks.length})
                  </button>
                  {roles.map((r) => {
                    const count = globalTasks.filter((t) => t.context === r.name || t.context === r.id || t.context === r.label).length
                    const isSelected = selectedContextFilter === r.name || selectedContextFilter === r.id
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedContextFilter(isSelected ? 'All' : r.name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-primary bg-white dark:bg-[#161b26] text-slate-900 dark:text-white font-bold shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: r.hex }} />
                        <span>{r.label || r.name}</span>
                        <span className="text-[10px] opacity-75 font-mono">({count})</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Barra de Progreso y Tiempo de Hoy */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${tasksToday.length > 0 ? Math.round((completedTodayCount / tasksToday.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono">
                    {tasksToday.length > 0 ? Math.round((completedTodayCount / tasksToday.length) * 100) : 0}% hoy
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {estimatedTodayMins > 0 ? `~${Math.round(estimatedTodayMins / 60)}h ${estimatedTodayMins % 60}m estimadas` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: PLAN SEMANAL ESTRICTAMENTE SEMANAL (DISEÑO APPLE LIMPIO) */}
          <div className="w-full bg-white dark:bg-[#161b26] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            {/* Cabecera Apple del Plan Semanal (Sin switchers redundantes) */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#0071E3] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[19px]">view_week</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                    Plan Semanal
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    12 - 18 de octubre • Agenda de la semana
                  </p>
                </div>
              </div>

              <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium font-mono">
                {tasksThisWeek.length} {tasksThisWeek.length === 1 ? 'tarea' : 'tareas'}
              </span>
            </div>

            {/* RUNWAY DE 7 DÍAS ESTILO APPLE + AGENDA DIARIA */}
            <div className="space-y-3">
              {/* Runway Compacto de 7 Días Estilo Apple */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 pt-0.5">
                {weekDays.map((day) => {
                  const dayTasks = (globalTasks || []).filter((t) => t.date === day.date)
                  const isSelected = selectedRadarDate === day.date
                  const isToday = day.isToday

                  // Obtener hasta 3 colores únicos de rol para los puntos indicadores de tareas
                  const uniqueDayColors = Array.from(
                    new Set(
                      dayTasks.map((t) => {
                        const role = roles.find((r) => r.name === t.context || r.id === t.context)
                        return role ? role.hex : '#0071E3'
                      })
                    )
                  ).slice(0, 3)

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedRadarDate(day.date)}
                      className={`flex flex-col items-center py-2 px-1 rounded-2xl transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-blue-500/10 dark:bg-blue-500/15 ring-2 ring-[#0071E3]/50 shadow-xs'
                          : isToday
                          ? 'bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/70'
                          : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-semibold tracking-wider uppercase ${
                          isToday ? 'text-[#0071E3] dark:text-blue-400 font-bold' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {day.label}
                      </span>

                      {/* Círculo del número del día */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs my-1 transition-all ${
                          isToday
                            ? 'bg-[#0071E3] text-white shadow-xs font-bold'
                            : isSelected
                            ? 'bg-blue-500/20 text-[#0071E3] dark:text-blue-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 font-medium'
                        }`}
                      >
                        {day.dayNum}
                      </div>

                      {/* Puntos de tareas estilo Apple Calendar */}
                      <div className="h-2 flex items-center justify-center gap-0.5">
                        {uniqueDayColors.length > 0 ? (
                          uniqueDayColors.map((hex, i) => (
                            <span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: hex }}
                            />
                          ))
                        ) : (
                          <span className="w-1 h-1 rounded-full bg-transparent" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Tarjeta de Agenda del Día Seleccionado (Estilo Apple Reminders/Calendar) */}
              <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/70 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-[#0071E3] dark:text-blue-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[15px]">event</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {weekDays.find((d) => d.date === selectedRadarDate)?.label || 'Día'}, {weekDays.find((d) => d.date === selectedRadarDate)?.dayNum || '14'} de Octubre
                      {selectedRadarDate === todayYmd && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-[#0071E3]/15 text-[#0071E3] dark:text-blue-400 text-[10px] font-bold">
                          HOY
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {(globalTasks || []).filter((t) => t.date === selectedRadarDate).length}{' '}
                    {(globalTasks || []).filter((t) => t.date === selectedRadarDate).length === 1 ? 'tarea' : 'tareas'}
                  </span>
                </div>

                {(globalTasks || []).filter((t) => t.date === selectedRadarDate).length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {(globalTasks || []).filter((t) => t.date === selectedRadarDate).map((t) => {
                      const roleMatch = roles.find((r) => r.name === t.context || r.id === t.context)
                      return (
                        <div
                          key={t.id}
                          className={`p-2.5 rounded-xl bg-white dark:bg-[#161b26] border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2.5 transition-all shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 ${
                            t.completed ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: roleMatch ? roleMatch.hex : '#0071E3' }}
                            />
                            <span className="font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                              {t.time || '10:00'}
                            </span>
                            <span className={`text-xs font-medium text-slate-900 dark:text-white truncate ${t.completed ? 'line-through' : ''}`}>
                              {t.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                              style={{
                                backgroundColor: `${roleMatch?.hex || '#0071E3'}15`,
                                color: roleMatch?.hex || '#0071E3',
                              }}
                            >
                              {roleMatch?.label || roleMatch?.name || t.context}
                            </span>
                            {t.est && (
                              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                                {t.est}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                    Día despejado. No hay tareas programadas para esta fecha.
                  </div>
                )}
              </div>

              {/* Barra Segmentada de Balance de Enfoque Semanal */}
              <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white">Balance de Enfoque Semanal</span>
                  <span className="font-mono">{tasksThisWeek.length} tareas</span>
                </div>

                {/* Barra Continua Segmentada */}
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-200/80 dark:bg-slate-700/80 gap-0.5">
                  {roleDistribution.map((rd) => {
                    if (rd.percent === 0) return null
                    return (
                      <div
                        key={rd.role.id}
                        style={{ width: `${rd.percent}%`, backgroundColor: rd.role.hex }}
                        className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                        title={`${rd.role.label || rd.role.name}: ${rd.count} tareas (${rd.percent}%)`}
                      />
                    )
                  })}
                </div>

                {/* Leyenda Gráfica con Colores */}
                <div className="flex items-center gap-2.5 flex-wrap text-[10px]">
                  {roles.map((r) => {
                    const count = tasksThisWeek.filter(
                      (t) => t.context === r.name || t.context === r.id || t.context === r.label
                    ).length
                    if (count === 0) return null
                    return (
                      <div key={r.id} className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: r.hex }} />
                        <span className="font-medium">{r.label || r.name}:</span>
                        <span className="font-mono text-slate-900 dark:text-white font-semibold">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Fila del Bot de WhatsApp Conectado (Sin número personal harcodeado) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span
                  className={`w-2 h-2 rounded-full ${
                    baileysState.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>
                  WhatsApp Bot:{' '}
                  <strong className="font-medium text-slate-900 dark:text-white">
                    {baileysState.status === 'connected'
                      ? baileysState.phone || 'Dispositivo Vinculado'
                      : 'Listo para conectar'}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleSendDailyBriefing}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Enviar briefing</span>
                <span className="material-symbols-outlined text-[14px]">send</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Sesión de Enfoque Activa (Dynamic Island Bar) */}
        {activeFocusTask && !isFocusModalOpen && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-slate-900 text-white dark:bg-[#161b26] border border-slate-700/60 dark:border-slate-800 shadow-md animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
              <span className="font-mono text-xs sm:text-sm font-bold tracking-wider">{formatTimer(pomodoroSeconds)}</span>
              <span className="text-xs text-slate-300 truncate max-w-[160px] sm:max-w-md">{activeFocusTask.title}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors cursor-pointer"
              >
                {isPomodoroRunning ? 'Pausar' : 'Reanudar'}
              </button>
              <button
                type="button"
                onClick={() => setIsFocusModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-white text-slate-900 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Ampliar
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFocusTask(null)
                  setIsPomodoroRunning(false)
                }}
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Detener sesión"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. Lista de Tareas (Un solo selector limpio de estado: Todas | Pendientes | Hechas) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg text-slate-900 dark:text-white font-bold tracking-tight">
                Tareas
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                {filteredTasks.length}
              </span>
            </div>

            {/* UN ÚNICO SELECTOR LIMPIO: Todas | Pendientes | Hechas */}
            <div className="relative inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div
                className="absolute top-0.5 bottom-0.5 rounded-lg bg-white dark:bg-[#161b26] shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                style={{
                  width: 'calc((100% - 4px) / 3)',
                  left: '2px',
                  transform: `translateX(${
                    filterStatus === 'all' ? '0%' : filterStatus === 'pending' ? '100%' : '200%'
                  })`,
                }}
              />
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`relative z-10 w-16 sm:w-20 py-1 text-center rounded-lg text-xs transition-colors cursor-pointer ${
                  filterStatus === 'all' ? 'text-primary font-bold' : 'text-secondary hover:text-on-surface'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`relative z-10 w-16 sm:w-20 py-1 text-center rounded-lg text-xs transition-colors cursor-pointer ${
                  filterStatus === 'pending' ? 'text-primary font-bold' : 'text-secondary hover:text-on-surface'
                }`}
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`relative z-10 w-16 sm:w-20 py-1 text-center rounded-lg text-xs transition-colors cursor-pointer ${
                  filterStatus === 'completed' ? 'text-primary font-bold' : 'text-secondary hover:text-on-surface'
                }`}
              >
                Hechas
              </button>
            </div>
          </div>

          {/* Bloque 1: Tareas de Hoy */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                Hoy (Miércoles, 14 Oct) • {tasksToday.length} tareas
              </h3>
            </div>

            <div className="flex flex-col gap-2.5">
              {tasksToday.map((task) => (
                <TaskCardItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTaskCompleted}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteTask}
                  onStartFocus={startFocusTimer}
                />
              ))}
              {tasksToday.length === 0 && (
                <div className="p-4 bg-white/60 dark:bg-[#161b26]/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-secondary">
                  No hay tareas pendientes para hoy. Puedes añadir una arriba desde la barra de entrada rápida.
                </div>
              )}
            </div>
          </div>

          {/* Bloque 2: Esta Semana (15 a 18 Octubre) */}
          <div className="space-y-3 pt-3">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                Esta Semana (15 - 18 Oct) • {tasksRestOfWeek.length} tareas
              </h3>
            </div>

            <div className="flex flex-col gap-2.5">
              {tasksRestOfWeek.map((task) => (
                <TaskCardItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTaskCompleted}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDeleteTask}
                  onStartFocus={startFocusTimer}
                />
              ))}
              {tasksRestOfWeek.length === 0 && (
                <div className="p-4 bg-white/60 dark:bg-[#161b26]/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-secondary">
                  No hay tareas adicionales programadas para el resto de esta semana.
                </div>
              )}
            </div>
          </div>

          {/* Bloque 3: Tareas de Próximas Semanas */}
          {tasksFutureWeeks.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Próximas Semanas (A partir del 19 Oct) • {tasksFutureWeeks.length} tareas
                </h3>
              </div>

              <div className="flex flex-col gap-2.5">
                {tasksFutureWeeks.map((task) => (
                  <TaskCardItem
                    key={task.id}
                    task={task}
                    onToggle={toggleTaskCompleted}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteTask}
                    onStartFocus={startFocusTimer}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bloque 4: Otras tareas o sin fecha específica */}
          {tasksPastOrOther.length > 0 && (
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Otras tareas • {tasksPastOrOther.length}
                </h3>
              </div>

              <div className="flex flex-col gap-2.5">
                {tasksPastOrOther.map((task) => (
                  <TaskCardItem
                    key={task.id}
                    task={task}
                    onToggle={toggleTaskCompleted}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteTask}
                    onStartFocus={startFocusTimer}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* MODAL DE INTEGRACIÓN CON WHATSAPP BOT (BAILEYS PUENTE LOCAL AUTÓNOMO) */}
      {isWhatsAppModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWhatsAppModalOpen(false)
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] w-full max-w-xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto text-xs"
          >
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    Bot Móvil de WhatsApp (Servidor Local Privado)
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    {baileysState.status === 'connected' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>
                          Conectado: <strong className="font-mono text-slate-800 dark:text-slate-200">{baileysState.phone ? baileysState.phone : 'Dispositivo vinculado'}</strong>
                        </span>
                      </>
                    ) : baileysState.status === 'qr_ready' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">Esperando escaneo de código QR</span>
                      </>
                    ) : baileysState.status === 'connecting' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">Iniciando puente local...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <span>Desconectado</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* CUERPO SEGÚN ESTADO DE CONEXIÓN */}
            {/* 1. Conectado */}
            {baileysState.status === 'connected' && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200 text-xs">
                      WhatsApp Web Vinculado y Activo
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] font-bold">
                    {baileysState.phone ? baileysState.phone : 'Dispositivo Activo'}
                  </span>
                </div>

                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  El bot está escuchando mensajes y notas de voz en tiempo real con IA. Puedes preguntarle cualquier duda académica, conversar con él, consultar tu agenda (*"¿qué tengo hoy?"*) o dictarle tareas y exámenes por audio o texto para que se añadan al instante a tu organizador y calendario.
                </p>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                  <button
                    type="button"
                    onClick={handleSendDailyBriefing}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[15px]">send</span>
                    <span>Enviar Briefing Ahora</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectBaileys}
                    disabled={isBaileysActionLoading}
                    className="py-1.5 px-3 rounded-xl bg-white dark:bg-[#121620] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold text-xs border border-rose-200/80 dark:border-rose-900/40 transition-colors cursor-pointer"
                  >
                    Desvincular WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* 2. QR Listo para Escaneo */}
            {baileysState.status === 'qr_ready' && baileysState.qrCode && (
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/70">
                  <img
                    src={baileysState.qrCode}
                    alt="Código QR de WhatsApp"
                    className="w-52 h-52 sm:w-56 sm:h-56 object-contain"
                  />
                </div>

                <div className="w-full space-y-2 text-slate-700 dark:text-slate-300 text-xs">
                  <span className="font-semibold block text-center text-slate-900 dark:text-white">
                    Pasos para vincular tu teléfono:
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-[#121620] p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                    <li>Abre WhatsApp en tu teléfono móvil.</li>
                    <li>Ve a <strong>Ajustes / Configuración</strong> y selecciona <strong>Dispositivos vinculados</strong>.</li>
                    <li>Toca en <strong>Vincular un dispositivo</strong> y apunta con la cámara a este código QR.</li>
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnectBaileys}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
                >
                  Cancelar vinculación
                </button>
              </div>
            )}

            {/* 3. Conectando / Generando QR */}
            {baileysState.status === 'connecting' && (
              <div className="flex flex-col items-center justify-center py-10 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                  Iniciando puente local y generando código QR seguro...
                </p>
                <span className="text-[11px] text-slate-500">
                  Esto tarda unos segundos mientras se inicializa el socket en tu equipo.
                </span>
              </div>
            )}

            {/* 4. Desconectado / Pantalla Inicial de Vinculación */}
            {baileysState.status === 'disconnected' && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3.5">
                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-xs">
                    Vinculación Rápida por Código QR (Sin servidores ni límites)
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Cada instalación de la app actúa como su propio servidor seguro en local mediante el protocolo oficial de WhatsApp Web. No necesitas crear cuentas de empresa en Meta, pagar suscripciones de servidores en la nube ni verificar documentos.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#121620] border border-slate-200/70 dark:border-slate-800 space-y-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">IA Conversacional</span>
                    <span className="text-slate-500 text-[10px]">Responde cualquier duda, saluda y te orienta en el móvil.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#121620] border border-slate-200/70 dark:border-slate-800 space-y-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Audios con Whisper</span>
                    <span className="text-slate-500 text-[10px]">Envía notas de voz: las transcribe y programa todo.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#121620] border border-slate-200/70 dark:border-slate-800 space-y-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">100% Local y Gratis</span>
                    <span className="text-slate-500 text-[10px]">Tu equipo es tu servidor sin cuotas ni intermediarios.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConnectBaileys}
                  disabled={isBaileysActionLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 text-xs"
                >
                  <span className="material-symbols-outlined text-[17px]">qr_code_scanner</span>
                  <span>Generar Código QR de Vinculación</span>
                </button>
              </div>
            )}


            {/* AVISO DE PRIVACIDAD EN LETRA PEQUEÑA */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                Aviso de privacidad y funcionamiento local: Esta aplicación no lee, recopila ni almacena tus mensajes personales en ningún servidor externo. La vinculación se ejecuta directamente en tu equipo mediante el protocolo de WhatsApp Web y se utiliza exclusivamente para permitirte conversar y gestionar tu calendario de forma 100% gratuita y sin intermediarios.
              </p>
            </div>

            {/* Botones Inferiores */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleSendDailyBriefing}
                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
                <span>Enviar Briefing Matutino</span>
              </button>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="py-2 px-4 bg-primary text-white rounded-xl font-semibold hover:opacity-95 transition-all cursor-pointer shadow-xs active:scale-95 text-xs"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GESTIÓN Y CREACIÓN DE ROLES (MEMORIA COMPARTIDA CON EL CALENDARIO) */}
      {isManageRolesModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsManageRolesModalOpen(false)
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">palette</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    Gestionar Roles & Clasificaciones
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Memoria compartida con el Calendario y Tareas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsManageRolesModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Lista de Roles Existentes */}
            <div className="space-y-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                Roles Activos ({roles.length})
              </span>
              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: r.hex }} />
                      <span className="material-symbols-outlined text-[16px] text-slate-600 dark:text-slate-400">
                        {r.icon || 'task_alt'}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {r.label || r.name}
                      </span>
                    </div>

                    {roles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(r.id)}
                        className="w-6 h-6 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors cursor-pointer"
                        title="Eliminar este rol"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Crear Nuevo Rol */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                Crear Nueva Clasificación / Rol
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nombre del Rol
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="ej. Idiomas, Finanzas, Tesis..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                />
              </div>

              {/* Selector de Color */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Color asignado
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {ROLE_PRESET_COLORS.map((pc) => (
                    <button
                      key={pc.hex}
                      type="button"
                      onClick={() => setNewRoleColor(pc.hex)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer shrink-0 border-2 ${
                        newRoleColor === pc.hex ? 'scale-115 border-slate-900 dark:border-white shadow-xs' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: pc.hex }}
                      title={pc.name}
                    />
                  ))}
                </div>
              </div>

              {/* Selector de Icono */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Icono asignado
                </label>
                <div className="grid grid-cols-8 gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {ROLE_PRESET_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewRoleIcon(ic)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        newRoleIcon === ic
                          ? 'bg-primary text-white shadow-xs scale-105'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{ic}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddNewRole}
                className="w-full py-2.5 px-4 bg-primary text-white font-semibold rounded-xl hover:opacity-95 active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Crear Rol & Guardar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Tarea Completo con Selector Simple vs Avanzado (Matching Calendario) */}
      {isTaskModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsTaskModalOpen(false)
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            {/* Header del Modal con Selector Deslizante Simple vs Avanzado */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    {editingTaskId ? 'edit_note' : 'add_task'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    {editingTaskId ? 'Editar Tarea' : 'Nueva Tarea'}
                  </h3>
                  <p className="text-[11px] text-secondary">
                    {taskModalMode === 'simple' ? 'Modo rápido sin scroll' : 'Configuración detallada con iconos y repetición'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Selector Deslizante Apple Simple vs Avanzado */}
                <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  <div
                    className="absolute top-0.5 bottom-0.5 rounded-lg bg-white dark:bg-[#161b26] shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                    style={{
                      width: 'calc(50% - 2px)',
                      left: '2px',
                      transform: `translateX(${taskModalMode === 'simple' ? '0%' : '100%'})`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleModalMode('simple')}
                    className={`relative z-10 w-16 py-1 text-center rounded-lg text-xs transition-colors cursor-pointer ${
                      taskModalMode === 'simple'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface font-medium'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleModalMode('advanced')}
                    className={`relative z-10 w-16 py-1 text-center rounded-lg text-xs transition-colors cursor-pointer ${
                      taskModalMode === 'advanced'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface font-medium'
                    }`}
                  >
                    Avanzado
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Formulario de Tarea */}
            <form onSubmit={handleSaveTask} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Título de la actividad *</label>
                <input
                  type="text"
                  required
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  placeholder="ej. Estudiar examen de Inteligencia Artificial"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                />
              </div>

              {/* Modo Avanzado: Selector Visual de Iconos */}
              {taskModalMode === 'advanced' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Icono representativo
                  </label>
                  <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 max-h-28 overflow-y-auto">
                    {ALL_TASK_ICONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setTaskFormData({ ...taskFormData, icon: ic })}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                          taskFormData.icon === ic
                            ? 'bg-primary text-white shadow-xs scale-105'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={ic}
                      >
                        <span className="material-symbols-outlined text-[16px]">{ic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modo Avanzado: Selector de Recurrencia / Repetición */}
              {taskModalMode === 'advanced' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Repetición / Recurrencia
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'none', label: 'No se repite' },
                      { id: 'daily', label: 'Todos los días' },
                      { id: 'weekly', label: 'Cada semana' },
                      { id: 'weekdays', label: 'Lunes a Viernes' },
                    ].map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setTaskFormData({ ...taskFormData, recurrence: rec.id })}
                        className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center ${
                          (taskFormData.recurrence || 'none') === rec.id
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs font-semibold'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {rec.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modo Avanzado: Notas */}
              {taskModalMode === 'advanced' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Notas o descripción</label>
                  <textarea
                    rows={2}
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    placeholder="Capítulos 4 a 7, demostraciones de backprop..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs resize-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={taskFormData.date}
                    onChange={(e) => setTaskFormData({ ...taskFormData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs font-code-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    value={taskFormData.time}
                    onChange={(e) => setTaskFormData({ ...taskFormData, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs font-code-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold">Rol / Clasificación</label>
                    <button
                      type="button"
                      onClick={() => setIsManageRolesModalOpen(true)}
                      className="text-primary hover:underline text-[10px] font-semibold cursor-pointer"
                    >
                      + Roles
                    </button>
                  </div>
                  <select
                    value={taskFormData.context}
                    onChange={(e) => setTaskFormData({ ...taskFormData, context: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs cursor-pointer"
                  >
                    {roles.map((c) => (
                      <option key={c.id} value={c.name || c.id}>{c.label || c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Esfuerzo</label>
                  <select
                    value={taskFormData.effort}
                    onChange={(e) => setTaskFormData({ ...taskFormData, effort: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs cursor-pointer"
                  >
                    <option value="Low">Bajo (30m)</option>
                    <option value="Medium">Medio (45m)</option>
                    <option value="High">Alto (90m)</option>
                  </select>
                </div>
              </div>

              {taskModalMode === 'advanced' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Duración estimada</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {['30m', '45m', '60m', '90m', '120m'].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setTaskFormData({ ...taskFormData, est: dur })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-code-sm transition-all cursor-pointer ${
                          taskFormData.est === dur
                            ? 'bg-primary text-white font-bold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-secondary hover:text-on-surface'
                        }`}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-primary text-white rounded-xl font-semibold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                >
                  {editingTaskId ? 'Guardar Cambios' : 'Añadir al Calendario y Lista'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ULTRA-PRECISIÓN DE ENFOQUE (DISEÑO STITCH FOCUS HUB EXACTO) */}
      <PrecisionFocusModal
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        activeTask={activeFocusTask}
        secondsRemaining={pomodoroSeconds}
        setSecondsRemaining={setPomodoroSeconds}
        totalSeconds={pomodoroTotalSeconds}
        setTotalSeconds={setPomodoroTotalSeconds}
        isRunning={isPomodoroRunning}
        setIsRunning={setIsPomodoroRunning}
        onCompleteTask={(taskId) => {
          toggleTaskCompleted(taskId)
          setIsFocusModalOpen(false)
        }}
        globalTasks={globalTasks}
        todayTasks={tasksToday}
      />
    </div>
  )
}

// Componente Tarjeta de Tarea Individual con Animación de Checkmark y Botón Focus Centrado
function TaskCardItem({ task, onToggle, onEdit, onDelete, onStartFocus }) {
  const effortBadges = {
    High: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80',
    Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80',
    Low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80',
  }

  const contextBadges = {
    University: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60',
    'Health & Gym': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
    Personal: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60',
    Projects: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
  }

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-2xl bg-white/90 dark:bg-[#161b26]/90 backdrop-blur-sm border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs hover:shadow-xs group ${
        task.completed
          ? 'opacity-55 border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Sección Izquierda: Checkbox con Dibujo de Tick Animado + Info */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {/* Checkbox con animación SVG stroke cuando se marca hecha */}
        <button
          type="button"
          onClick={() => onToggle(task.id)}
          className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 border transform active:scale-90 ${
            task.completed
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
              : 'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
        >
          {task.completed && (
            <svg
              className="w-3.5 h-3.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" className="animate-checkmark-tick" />
            </svg>
          )}
        </button>

        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
            <span className="inline-flex items-center gap-1 font-mono text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
              <span className="material-symbols-outlined text-[13px] text-primary">schedule</span>
              <span>{task.time || '10:00'}</span>
            </span>
            {task.est && (
              <span className="inline-flex items-center gap-1 font-mono text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                <span>{task.est}</span>
              </span>
            )}
            {task.date && (
              <span className="font-mono text-slate-400 dark:text-slate-500">
                • {task.date}
              </span>
            )}
            <span className={`px-2 py-0.2 rounded-full font-semibold border ${effortBadges[task.effort] || effortBadges.Medium}`}>
              {task.effort === 'High' ? 'Alto' : task.effort === 'Medium' ? 'Medio' : 'Bajo'}
            </span>
            <span className={`px-2 py-0.2 rounded-full font-medium border ${contextBadges[task.context] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
              {task.context}
            </span>
          </div>

          <h4
            className={`font-semibold text-xs sm:text-sm text-on-surface leading-snug truncate ${
              task.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
            }`}
          >
            {task.title}
          </h4>

          {task.description && (
            <p className="text-xs text-secondary line-clamp-1">{task.description}</p>
          )}
        </div>
      </div>

      {/* Sección Central: Botón de Focus Elegante y Discreto */}
      <div className="flex items-center justify-center shrink-0 px-1 self-start sm:self-center">
        {!task.completed ? (
          <button
            type="button"
            onClick={() => onStartFocus(task)}
            className="h-7 px-3 rounded-full bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 dark:hover:bg-primary text-slate-700 dark:text-slate-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Iniciar temporizador de enfoque para esta tarea"
          >
            <span className="material-symbols-outlined text-[14px] text-amber-500 group-hover:text-white transition-colors">
              play_arrow
            </span>
            <span>Focus</span>
          </button>
        ) : (
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50">
            Completada
          </span>
        )}
      </div>

      {/* Sección Derecha: Iconos Reducidos y Discretos para Editar y Borrar */}
      <div className="flex items-center gap-1 self-end sm:self-center shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Editar tarea"
        >
          <span className="material-symbols-outlined text-[14px]">edit</span>
        </button>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          title="Eliminar tarea"
        >
          <span className="material-symbols-outlined text-[14px]">delete</span>
        </button>
      </div>
    </div>
  )
}

