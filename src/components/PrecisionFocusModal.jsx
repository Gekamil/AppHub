import { useState, useEffect, useRef } from 'react'

export default function PrecisionFocusModal({
  isOpen,
  onClose,
  activeTask = null,
  onCompleteTask,
  globalTasks = [],
  todayTasks = [],
  secondsRemaining: externalSecs,
  setSecondsRemaining: setExternalSecs,
  totalSeconds: externalTotalSecs,
  setTotalSeconds: setExternalTotalSecs,
  isRunning: externalRunning,
  setIsRunning: setExternalRunning,
}) {
  const [internalTotal, setInternalTotal] = useState(25 * 60)
  const [internalRemaining, setInternalRemaining] = useState(25 * 60)
  const [internalRunning, setInternalRunning] = useState(true)

  const totalSeconds = externalTotalSecs !== undefined ? externalTotalSecs : internalTotal
  const setTotalSeconds = setExternalTotalSecs || setInternalTotal
  const secondsRemaining = externalSecs !== undefined ? externalSecs : internalRemaining
  const setSecondsRemaining = setExternalSecs || setInternalRemaining
  const isRunning = externalRunning !== undefined ? externalRunning : internalRunning
  const setIsRunning = setExternalRunning || setInternalRunning

  // Tarea de enfoque en curso y mensaje de retroalimentación
  const [currentTask, setCurrentTask] = useState(activeTask)
  const [sessionFeedback, setSessionFeedback] = useState('')

  // Tema Claro / Oscuro
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('app_theme') === 'dark' || document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    const handleThemeSync = (e) => {
      const nextTheme = e?.detail || localStorage.getItem('app_theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
      setIsDark(nextTheme === 'dark')
    }
    window.addEventListener('app_theme_changed', handleThemeSync)
    window.addEventListener('storage', handleThemeSync)
    return () => {
      window.removeEventListener('app_theme_changed', handleThemeSync)
      window.removeEventListener('storage', handleThemeSync)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setIsDark(localStorage.getItem('app_theme') === 'dark' || document.documentElement.classList.contains('dark'))
    }
  }, [isOpen])

  // Sincronizar tarea activa exacta al abrir el modal
  useEffect(() => {
    if (activeTask && isOpen) {
      setCurrentTask(activeTask)
      let mins = 25
      if (activeTask.est && typeof activeTask.est === 'string' && /^\s*\d+\s*(m|min)/i.test(activeTask.est)) {
        const parsed = parseInt(activeTask.est.replace(/[^\d]/g, ''), 10)
        if (parsed > 0) mins = parsed
      } else if (activeTask.effort === 'High') {
        mins = 90
      } else if (activeTask.effort === 'Medium') {
        mins = 45
      } else if (activeTask.effort === 'Low') {
        mins = 30
      }
      setTotalSeconds(mins * 60)
      setSecondsRemaining(mins * 60)
      setIsRunning(true)
      setSessionFeedback('')
    }
  }, [activeTask?.id, isOpen])

  // Temporizador de precisión absoluta (exactamente 1 segundo por segundo)
  useEffect(() => {
    let timer = null
    if (isOpen && isRunning) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isOpen, isRunning])

  // Atajos de teclado: Espacio para pausar/reanudar, Escape para salir
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.code === 'Space') {
        e.preventDefault()
        setIsRunning((prev) => !prev)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Cálculo de la siguiente tarea del día para avanzar
  const candidateTasks = todayTasks && todayTasks.length > 0 ? todayTasks : globalTasks
  const currentIndex = candidateTasks.findIndex((t) => t.id === currentTask?.id)
  const nextTask =
    currentIndex >= 0 && currentIndex < candidateTasks.length - 1
      ? candidateTasks[currentIndex + 1]
      : candidateTasks.length > 1 && candidateTasks[0].id !== currentTask?.id
      ? candidateTasks[0]
      : null

  // Avanzar al siguiente evento del día (sin marcarlo como completado en el menú principal)
  const handleCompleteAndNext = () => {
    if (nextTask) {
      setCurrentTask(nextTask)
      let mins = 25
      if (nextTask.est && typeof nextTask.est === 'string' && /^\s*\d+\s*(m|min)/i.test(nextTask.est)) {
        const parsed = parseInt(nextTask.est.replace(/[^\d]/g, ''), 10)
        if (parsed > 0) mins = parsed
      } else if (nextTask.effort === 'High') {
        mins = 90
      } else if (nextTask.effort === 'Medium') {
        mins = 45
      } else if (nextTask.effort === 'Low') {
        mins = 30
      }
      const secs = mins * 60
      setTotalSeconds(secs)
      setSecondsRemaining(secs)
      setIsRunning(true)
      setSessionFeedback(`Bloque completado. Siguiente tarea: "${nextTask.title}"`)
      setTimeout(() => setSessionFeedback(''), 4500)
    } else {
      setSessionFeedback('¡Todos los bloques del día completados!')
      setSecondsRemaining(totalSeconds)
      setIsRunning(false)
    }
    // IMPORTANTE: No invocamos onCompleteTask para no tachar la tarea en la lista general si el usuario desea repetirla.
  }

  if (!isOpen) return null

  // Métricas
  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return {
      mins: String(mins).padStart(2, '0'),
      secs: String(secs).padStart(2, '0'),
    }
  }

  const { mins, secs } = formatTime(secondsRemaining)

  // Estimación de hora de finalización
  const endTimeStr = new Date(Date.now() + secondsRemaining * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Progreso del Dial
  const RADIUS = 172
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS // 1080.77
  const progressRatio = totalSeconds > 0 ? (totalSeconds - secondsRemaining) / totalSeconds : 0
  const strokeDashoffset = CIRCUMFERENCE * (1 - progressRatio)
  const progressDegrees = progressRatio * 360

  // Progreso de objetivos del día
  const completedTasksCount = globalTasks.filter((t) => t.completed).length
  const totalTasksCount = Math.max(globalTasks.length, 4)

  // Conmutar tema
  const handleToggleTheme = () => {
    const htmlEl = document.documentElement
    const nextTheme = htmlEl.classList.contains('dark') ? 'light' : 'dark'
    if (nextTheme === 'dark') {
      htmlEl.classList.add('dark')
    } else {
      htmlEl.classList.remove('dark')
    }
    localStorage.setItem('app_theme', nextTheme)
    setIsDark(nextTheme === 'dark')
    window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: nextTheme }))
  }

  const taskTitle = currentTask?.title || activeTask?.title || 'Sesión de Enfoque'
  const taskDesc = currentTask?.description || (currentTask?.time ? `Programada a las ${currentTask.time}` : 'Bloque de alta concentración')
  const taskContext = currentTask?.context || activeTask?.context || 'Enfoque'

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F5F5F7] dark:bg-[#0D0E12] text-[#1D1D1F] dark:text-[#F5F5F7] font-sans antialiased flex flex-col justify-between overflow-y-auto transition-colors duration-300 animate-in fade-in duration-200"
    >
      {/* 1. Barra Superior macOS / WatchOS Minimal Precision */}
      <header className="w-full px-6 lg:px-12 py-3.5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-2xl bg-white/80 dark:bg-[#181a20]/80 border-b border-black/[0.05] dark:border-white/[0.08] transition-colors shrink-0">
        {/* Izquierda: Dynamic Island Pill Session Status */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-3xl bg-white/90 dark:bg-[#181b22]/90 border border-black/[0.07] dark:border-white/[0.1] shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9500] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9500]"></span>
            </span>
            <span className="text-xs font-semibold tracking-tight text-[#1D1D1F] dark:text-white">
              Modo Enfoque
            </span>
            <span className="text-[10px] text-[#86868B] dark:text-[#A1A1A6]">|</span>
            <span className="text-[11px] font-medium text-[#86868B] dark:text-[#A1A1A6]">
              Bloque {completedTasksCount + 1}/{totalTasksCount}
            </span>
          </div>
        </div>

        {/* Centro: Métrica de Tiempo y Atajo */}
        <div className="hidden md:flex items-center gap-6 text-xs text-[#86868B] dark:text-[#A1A1A6]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#86868B] dark:text-[#A1A1A6]">
              Hoy
            </span>
            <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] font-mono">
              1h 45m
            </span>
          </div>
          <span className="w-1 h-1 rounded-full bg-black/20 dark:bg-white/20"></span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#86868B] dark:text-[#A1A1A6]">
              Atajo
            </span>
            <kbd className="px-2 py-0.5 text-[10px] bg-black/[0.04] dark:bg-white/[0.08] rounded-md border border-black/[0.08] dark:border-white/[0.1] text-[#1D1D1F] dark:text-[#F5F5F7]">
              Espacio
            </kbd>
          </div>
        </div>

        {/* Derecha: Selector de Tema & Botón Salir */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label="Cambiar tema"
            className="flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-3xl bg-white/90 dark:bg-[#181b22]/90 border border-black/[0.07] dark:border-white/[0.1] hover:bg-white dark:hover:bg-[#20232c] text-[#1D1D1F] dark:text-[#F5F5F7] transition shadow-xs cursor-pointer"
          >
            {isDark ? (
              <span className="material-symbols-outlined text-[16px] text-amber-300">light_mode</span>
            ) : (
              <span className="material-symbols-outlined text-[16px] text-[#1D1D1F]">dark_mode</span>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full backdrop-blur-3xl bg-white/90 dark:bg-[#181b22]/90 border border-black/[0.07] dark:border-white/[0.1] hover:bg-red-50 dark:hover:bg-red-950/30 text-[#86868B] dark:text-[#A1A1A6] hover:text-red-600 dark:hover:text-red-400 text-xs font-medium transition shadow-xs cursor-pointer active:scale-95"
            title="Salir (Esc)"
          >
            <span className="material-symbols-outlined text-[15px]">close</span>
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* 2. Área Central de Ultra-Precision Chronograph Dial */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 max-w-4xl mx-auto w-full my-auto">
        <div className="relative flex flex-col items-center justify-center select-none">
          {/* Reloj Dial de Precisión con 60 marcas de división */}
          <div className="relative w-[340px] h-[340px] sm:w-[390px] sm:h-[390px] flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 400 400">
              <defs>
                <linearGradient id="appleArcGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF9500" />
                  <stop offset="100%" stopColor="#FF5E3A" />
                </linearGradient>
                <filter height="140%" id="softGlow" width="140%" x="-20%" y="-20%">
                  <feGaussianBlur result="blur" stdDeviation="3" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 60 Marcas y Submarcas de Precisión */}
              <g className="ticks stroke-[#86868B] dark:stroke-[#505464] opacity-35" strokeLinecap="round">
                {/* 12 Índices Principales */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <line
                    key={deg}
                    className="opacity-90"
                    strokeWidth="2.5"
                    transform={deg === 0 ? undefined : `rotate(${deg} 200 200)`}
                    x1="200"
                    x2="200"
                    y1="26"
                    y2="38"
                  />
                ))}

                {/* Submarcas finas intermedias de minutos */}
                {[
                  6, 12, 18, 24, 36, 42, 48, 54, 66, 72, 78, 84, 96, 102, 108, 114, 126, 132, 138, 144,
                  156, 162, 168, 174, 186, 192, 198, 204, 216, 222, 228, 234, 246, 252, 258, 264, 276,
                  282, 288, 294, 306, 312, 318, 324, 336, 342, 348, 354,
                ].map((deg) => (
                  <line
                    key={deg}
                    strokeWidth="1"
                    transform={`rotate(${deg} 200 200)`}
                    x1="200"
                    x2="200"
                    y1="29"
                    y2="35"
                  />
                ))}
              </g>

              {/* Pista de fondo ultra-fina (r=172 -> Circunferencia ≈ 1080.77) */}
              <circle
                className="stroke-black/[0.06] dark:stroke-white/[0.08]"
                cx="200"
                cy="200"
                fill="none"
                r="172"
                strokeWidth="2.5"
              />

              {/* Arco Activo de Precisión con Gradiente Naranja Apple Watch Ultra */}
              <circle
                className="stroke-[url(#appleArcGradient)] transition-all duration-1000 ease-linear"
                cx="200"
                cy="200"
                fill="none"
                filter="url(#softGlow)"
                r="172"
                strokeDasharray="1080.77"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth="4.5"
              />

              {/* Puntero de Precisión con Halo Pulsante */}
              <g transform={`rotate(${progressDegrees} 200 200)`}>
                <circle className="animate-pulse" cx="200" cy="28" fill="#FF9500" r="5" />
                <circle cx="200" cy="28" fill="#FFFFFF" r="2.5" />
              </g>
            </svg>

            {/* Números y Tipografía Central */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] mb-2 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9500]"></span>
                <span className="text-[11px] font-semibold tracking-wide uppercase text-[#86868B] dark:text-[#A1A1A6]">
                  Sesión de enfoque
                </span>
              </div>

              {/* Contador de Tiempo Gigante Tabular */}
              <div className="text-[76px] sm:text-[90px] font-light tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] font-mono leading-none select-none flex items-baseline justify-center">
                <span className="font-normal">{mins}</span>
                <span className="text-[#FF9500] px-1 font-light opacity-90 animate-pulse">:</span>
                <span className="font-normal">{secs}</span>
              </div>

              {/* Subtexto: Contexto, Hora de inicio y Duración total */}
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#86868B] dark:text-[#A1A1A6] flex-wrap justify-center">
                <span>{activeTask?.time ? `Programada: ${activeTask.time}` : 'Bloque de enfoque'}</span>
                <span className="w-1 h-1 rounded-full bg-black/25 dark:bg-white/25"></span>
                <span className="font-mono">Duración: {Math.round(totalSeconds / 60)} min</span>
                <span className="w-1 h-1 rounded-full bg-black/25 dark:bg-white/25"></span>
                <span className="font-mono">Termina {endTimeStr}</span>
              </div>
            </div>
          </div>

          {/* Selector de Duración Rápida de Enfoque */}
          <div className="mt-5 flex items-center gap-1.5 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] backdrop-blur-md border border-black/[0.05] dark:border-white/[0.08]">
            {[15, 20, 25, 45, 50, 90].map((minsVal) => (
              <button
                key={minsVal}
                type="button"
                onClick={() => {
                  setTotalSeconds(minsVal * 60)
                  setSecondsRemaining(minsVal * 60)
                  setIsRunning(true)
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
                  Math.round(totalSeconds / 60) === minsVal
                    ? 'bg-[#FF9500] text-white shadow-xs'
                    : 'text-[#86868B] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
                title={`Configurar bloque de ${minsVal} minutos`}
              >
                {minsVal}m
              </button>
            ))}
          </div>

          {/* Dock Flotante de Transporte y Control (macOS Dynamic Island Dock) */}
          <div className="mt-5 relative inline-flex items-center p-1.5 rounded-full backdrop-blur-3xl bg-white/90 dark:bg-[#181b22]/90 border border-black/[0.07] dark:border-white/[0.1] shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setSecondsRemaining(totalSeconds)
                setIsRunning(false)
              }}
              className="flex items-center justify-center w-11 h-11 rounded-full text-[#86868B] hover:text-[#1D1D1F] dark:text-[#A1A1A6] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition active:scale-95 cursor-pointer"
              title="Reiniciar temporizador"
            >
              <span className="material-symbols-outlined text-[20px]">restart_alt</span>
            </button>

            <div className="w-px h-5 bg-black/[0.08] dark:bg-white/[0.1] mx-1"></div>

            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] shadow-sm hover:opacity-95 transition active:scale-95 duration-150 cursor-pointer"
              title="Pausar / Reanudar (Espacio)"
            >
              <span className="material-symbols-outlined text-[24px]">
                {isRunning ? 'pause' : 'play_arrow'}
              </span>
            </button>
          </div>
        </div>

        {/* 3. Tarjeta Modular 'Now Working On' (Estilo iOS 18 / Apple Reminders) */}
        <section className="w-full max-w-xl backdrop-blur-3xl bg-white/90 dark:bg-[#16181f]/90 rounded-3xl p-5 sm:p-6 shadow-2xl border border-black/[0.06] dark:border-white/[0.08] mt-8 transition-all">
          {/* Fila Superior: Objetivo Diario & Botón Completar */}
          <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.05] dark:border-white/[0.08]">
            {/* Progreso del Objetivo Diario */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-[#0071E3]"></span>
                <span className="text-xs font-semibold tracking-tight text-[#1D1D1F] dark:text-white">
                  Objetivo diario
                </span>
              </div>
              {/* Segmentos de progreso */}
              <div className="flex items-center gap-1.5 pl-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-5 h-1.5 rounded-full transition-colors ${
                      i < completedTasksCount ? 'bg-[#0071E3]' : 'bg-black/10 dark:bg-white/15'
                    }`}
                  />
                ))}
                <span className="text-[11px] text-[#86868B] dark:text-[#A1A1A6] ml-1 font-mono">
                  {completedTasksCount} de 4
                </span>
              </div>
            </div>

            {/* Categoría y Botón de Acción Completar */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#0071E3]/10 text-[#0071E3] dark:text-[#3894ff] border border-[#0071E3]/20">
                {taskContext}
              </span>
              <button
                type="button"
                onClick={handleCompleteAndNext}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#34C759] hover:bg-[#30B752] text-white text-xs font-semibold transition duration-150 shadow-xs active:scale-95 cursor-pointer"
                title="Completar bloque y avanzar al siguiente evento del día (sin tachar en el menú principal)"
              >
                <span className="material-symbols-outlined text-[15px]">done</span>
                <span>{nextTask ? 'Listo • Siguiente' : 'Completar bloque'}</span>
              </button>
            </div>
          </div>

          {/* Título y Descripción de la Tarea Exacta */}
          <div className="pt-4 pb-2">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#86868B] dark:text-[#A1A1A6] bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 rounded-md">
                <span className="material-symbols-outlined text-[13px] text-[#FF9500]">schedule</span>
                <span>{currentTask?.time || '10:00'}</span>
              </span>
              {currentTask?.effort && (
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-black/[0.04] dark:bg-white/[0.06] text-[#86868B] dark:text-[#A1A1A6]">
                  {currentTask.effort === 'High' ? 'Esfuerzo Alto' : currentTask.effort === 'Medium' ? 'Esfuerzo Medio' : 'Esfuerzo Bajo'}
                </span>
              )}
              {currentTask?.est && (
                <span className="font-mono text-[11px] text-[#86868B] dark:text-[#A1A1A6]">
                  • Est. {currentTask.est}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-white leading-snug">
              {taskTitle}
            </h2>
            {taskDesc && (
              <p className="text-xs sm:text-[13px] text-[#86868B] dark:text-[#A1A1A6] mt-1.5 leading-relaxed font-normal">
                {taskDesc}
              </p>
            )}
          </div>

          {/* Feedback interactivo de paso a siguiente */}
          {sessionFeedback && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-in fade-in duration-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{sessionFeedback}</span>
            </div>
          )}

          {/* Previsualización del Siguiente Evento en Agenda */}
          {nextTask && (
            <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between text-xs text-[#86868B] dark:text-[#A1A1A6]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[15px] text-[#0071E3] shrink-0">arrow_forward</span>
                <span className="shrink-0">Siguiente en agenda:</span>
                <strong className="text-[#1D1D1F] dark:text-white font-medium truncate">{nextTask.title}</strong>
              </div>
              <span className="font-mono text-[11px] shrink-0 ml-2">{nextTask.time || '10:00'} • {nextTask.est || '45m'}</span>
            </div>
          )}
        </section>
      </main>

      {/* 4. Footer Dock Discreto */}
      <footer className="w-full px-6 lg:px-12 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-2xl bg-white/80 dark:bg-[#181a20]/80 border-t border-black/[0.05] dark:border-white/[0.08] text-xs text-[#86868B] dark:text-[#A1A1A6] transition-colors shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#34C759]/15 text-[#34C759]">
            <span className="material-symbols-outlined text-[13px]">shield</span>
          </span>
          <span className="text-xs">
            Escudo Enfoque:{' '}
            <strong className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
              Notificaciones y apps silenciadas
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#86868B] dark:text-[#A1A1A6]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md bg-white/80 dark:bg-[#181b22]/80 border border-black/[0.06] dark:border-white/[0.08]">
            <kbd className="font-sans text-[10px] text-[#1D1D1F] dark:text-[#F5F5F7]">Espacio</kbd>
            <span className="text-[10px]">pausar</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md bg-white/80 dark:bg-[#181b22]/80 border border-black/[0.06] dark:border-white/[0.08]">
            <kbd className="font-sans text-[10px] text-[#1D1D1F] dark:text-[#F5F5F7]">Esc</kbd>
            <span className="text-[10px]">salir</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#86868B] dark:text-[#6C707C]">
          <span>Focus Hub</span>
          <span>•</span>
          <span>Ultra Precision</span>
        </div>
      </footer>
    </div>
  )
}
