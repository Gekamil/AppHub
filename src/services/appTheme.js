// Servicio y Gestor de Temas, Fuentes y Estilos Visuales de AppHub Focus Hub
// Diseños refinados con tipografías dedicadas y sincronización dinámica de color de acento

const THEME_STORAGE_KEY = 'app_theme_style'
const ACCENT_STORAGE_KEY = 'studenthub_widget_accent_color'

export const APP_THEMES = [
  {
    id: 'clasica',
    name: 'Clásica (Apple Cupertino)',
    tag: 'Por Defecto',
    description: 'Bordes redondeados equilibrados, sombras suaves, tipografía Inter y micro-interacciones de alta fidelidad estilo macOS.',
    fontName: 'Inter',
    fontFamily: '"Inter", -apple-system, sans-serif',
    accentColor: '#0071E3',
    previewBadge: 'rounded-full px-2.5 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-semibold',
    labels: {
      appTitle: 'Focus Hub',
      autoOrganizer: 'Organizador Semanal',
      autoOrganizerSubtitle: 'Priorización algorítmica y enfoque cognitivo diario',
      smartIngestion: 'Smart Task Ingestion',
      smartIngestionDesc: 'Prioridad y contexto por lenguaje natural',
      timeline: 'Línea de Tiempo Auto-Organizada',
      timelineDesc: 'Ordenado por prioridad y hora de inicio',
      myHub: 'My Hub • Quick Access & Inspiration',
      myHubDesc: 'Recursos, links y notas rápidas ancladas',
      filterContext: 'Filtrar por contexto',
      allContexts: 'Todos',
      todayTasks: 'Tareas de Hoy',
      upcomingTasks: 'Próximas Semanas',
      calendarTitle: 'Calendario & Planificación',
      calendarSubtitle: 'Planifica semanas, bloques de estudio y sincroniza feeds externos',
      newAction: '+ Nueva Tarea',
    },
  },
  {
    id: 'glassify',
    name: 'Glassify Liquid Pro',
    tag: 'Apple Frosted Glass',
    description: 'Cristal esmerilado translúcido con desenfoque de 28px, reflejo specular superior de 1px, orbes atmosféricos y botones cápsula con brillo interno.',
    fontName: 'SF Pro / Inter',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    accentColor: '#2997ff',
    previewBadge: 'rounded-full px-2.5 py-0.5 bg-sky-500/15 text-sky-400 border border-sky-400/30 text-xs font-semibold backdrop-blur-md',
    labels: {
      appTitle: 'Glassify Hub',
      autoOrganizer: 'Planificador & Tareas',
      autoOrganizerSubtitle: 'Organización inteligente y gestión de tiempo sin fricción',
      smartIngestion: 'Captura Rápida de Tareas',
      smartIngestionDesc: 'Priorización reactiva con refracción óptica',
      timeline: 'Línea de Tiempo de Alta Fidelidad',
      timelineDesc: 'Orden dinámico por bloques de atención',
      myHub: 'Cápsula de Recursos & Links',
      myHubDesc: 'Espacio de inspiración rápida flotante',
      filterContext: 'Filtrar por contexto',
      allContexts: 'Todos',
      todayTasks: 'Hoy en Foco',
      upcomingTasks: 'Próximas Semanas',
      calendarTitle: 'Calendario en Cristal Líquido',
      calendarSubtitle: 'Planificación temporal sin fricción visual',
      newAction: '+ Añadir Tarea',
    },
  },
  {
    id: 'aura',
    name: 'Rosa Pastel & Blanco',
    tag: 'Suave & Cálido',
    description: 'Diseño en blanco y rosa suave: atmósfera luminosa, tarjetas limpias y tonos pastel equilibrados.',
    fontName: 'Outfit / Fraunces',
    fontFamily: '"Outfit", "Fraunces", sans-serif',
    accentColor: '#f43f5e',
    previewBadge: 'rounded-full px-2.5 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-semibold border border-rose-200/80 dark:border-rose-800/80',
    labels: {
      appTitle: 'Focus Hub',
      autoOrganizer: 'Organizador Semanal',
      autoOrganizerSubtitle: 'Priorización algorítmica y enfoque cognitivo diario',
      smartIngestion: 'Smart Task Ingestion',
      smartIngestionDesc: 'Prioridad y contexto por lenguaje natural',
      timeline: 'Línea de Tiempo Auto-Organizada',
      timelineDesc: 'Ordenado por prioridad y hora de inicio',
      myHub: 'My Hub • Quick Access & Inspiration',
      myHubDesc: 'Recursos, links y notas rápidas ancladas',
      filterContext: 'Filtrar por contexto',
      allContexts: 'Todos',
      todayTasks: 'Tareas de Hoy',
      upcomingTasks: 'Próximas Semanas',
      calendarTitle: 'Calendario & Planificación',
      calendarSubtitle: 'Planifica semanas, bloques de estudio y sincroniza feeds externos',
      newAction: '+ Nueva Tarea',
    },
  },
  {
    id: 'executive',
    name: 'Profesional Ejecutivo',
    tag: 'Trabajo & Despacho',
    description: 'Diseño en tonos grises, grafito y blanco: líneas sobrias, tipografía limpia y estética corporativa para el trabajo.',
    fontName: 'Plus Jakarta Sans',
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
    accentColor: '#334155',
    previewBadge: 'rounded-md px-2 py-0.5 bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-800 text-xs font-semibold border border-slate-700',
    labels: {
      appTitle: 'Focus Hub',
      autoOrganizer: 'Organizador Semanal',
      autoOrganizerSubtitle: 'Priorización algorítmica y enfoque cognitivo diario',
      smartIngestion: 'Smart Task Ingestion',
      smartIngestionDesc: 'Prioridad y contexto por lenguaje natural',
      timeline: 'Línea de Tiempo Auto-Organizada',
      timelineDesc: 'Ordenado por prioridad y hora de inicio',
      myHub: 'My Hub • Quick Access & Inspiration',
      myHubDesc: 'Recursos, links y notas rápidas ancladas',
      filterContext: 'Filtrar por contexto',
      allContexts: 'Todos',
      todayTasks: 'Tareas de Hoy',
      upcomingTasks: 'Próximas Semanas',
      calendarTitle: 'Calendario & Planificación',
      calendarSubtitle: 'Planifica semanas, bloques de estudio y sincroniza feeds externos',
      newAction: '+ Nueva Tarea',
    },
  },
  {
    id: 'brutalista',
    name: 'Neo-Brutalista Industrial',
    tag: 'Radical & Táctico',
    description: 'Esquinas rectas a 0px, marcos de 2px de trazo técnico, Space Grotesk + Space Mono y sombras de impacto limpias sin solapar.',
    fontName: 'Space Grotesk / Space Mono',
    fontFamily: '"Space Grotesk", "Space Mono", monospace',
    accentColor: '#eab308',
    previewBadge: 'rounded-none px-2 py-0.5 bg-yellow-300 text-slate-950 border-2 border-black text-xs font-bold uppercase',
    labels: {
      appTitle: 'COMMAND_CENTER // RADICAL_SYS',
      autoOrganizer: 'RADAR TÁCTICO & PROTOCOLOS DE ACCIÓN',
      autoOrganizerSubtitle: 'Despacho de misiones operativas y control algorítmico de ejecución',
      smartIngestion: 'DISPATCHER TÁCTICO // INGESTA RÁPIDA',
      smartIngestionDesc: 'Parser heurístico activo · Cero retrasos · Buffer continuo',
      timeline: 'COLA DE EJECUCIÓN // 24 HORAS',
      timelineDesc: 'Jerarquía estricta ordenada por prioridad de misión',
      myHub: 'DEPÓSITO DE PROTOCOLOS & RECURSOS',
      myHubDesc: 'Archivos montados, referencias e índices de alta disponibilidad',
      filterContext: 'SECTORES DE MISIÓN',
      allContexts: 'GLOBAL [ALL]',
      todayTasks: 'MISIONES ACTIVAS // HOY',
      upcomingTasks: 'HORIZONTE TÁCTICO // SEMANAS',
      calendarTitle: 'MATRIZ TEMPORAL DE ASIGNACIÓN',
      calendarSubtitle: 'Mapeo horario multidimensional y feeds externos conectados',
      newAction: '[+] REGISTRAR MISIÓN',
    },
  },
]

export function hexToRgb(hex) {
  if (!hex) return '0, 113, 227'
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  const num = parseInt(c, 16)
  if (isNaN(num)) return '0, 113, 227'
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`
}

export function getActiveAccentColor() {
  try {
    const custom = localStorage.getItem(ACCENT_STORAGE_KEY)
    if (custom && custom.startsWith('#') && (custom.length === 7 || custom.length === 4)) {
      return custom
    }
  } catch (e) {}
  const curTheme = getAppTheme()
  const tokens = getAppThemeTokens(curTheme)
  return tokens.accentColor || '#0071E3'
}

export function applyDynamicAccent(color = null) {
  if (typeof document === 'undefined') return
  const activeColor = color || getActiveAccentColor()
  const rgb = hexToRgb(activeColor)
  document.documentElement.style.setProperty('--app-accent-color', activeColor)
  document.documentElement.style.setProperty('--app-accent-rgb', rgb)
}

export function getAppTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'nordic') {
      localStorage.setItem(THEME_STORAGE_KEY, 'glassify')
      return 'glassify'
    }
    if (saved && APP_THEMES.some((t) => t.id === saved)) {
      return saved
    }
  } catch (e) {}
  return 'clasica'
}

export function getAppThemeTokens(themeId) {
  const targetId = themeId || getAppTheme()
  return APP_THEMES.find((t) => t.id === targetId) || APP_THEMES[0]
}

export function setAppTheme(themeId) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId)
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme-style', themeId)
      applyDynamicAccent()

      // Disparar animación lateral cinematográfica
      const rootEl = document.getElementById('root') || document.body
      rootEl.classList.remove('animate-theme-switch')
      void rootEl.offsetWidth // forzar reflow
      rootEl.classList.add('animate-theme-switch')
      setTimeout(() => {
        rootEl.classList.remove('animate-theme-switch')
      }, 450)
    }
    window.dispatchEvent(new CustomEvent('app_theme_style_changed', { detail: themeId }))
    window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: themeId }))
  } catch (e) {}
  return themeId
}

// Inicializar atributo y color de acento dinámico al cargar preservando dark mode
if (typeof document !== 'undefined') {
  try {
    const cur = getAppTheme()
    document.documentElement.setAttribute('data-theme-style', cur)
    applyDynamicAccent()

    // Garantizar que la clase dark no se pierda al cargar
    const isDark = localStorage.getItem('app_theme') === 'dark' || localStorage.getItem('app_dark_mode') === 'true'
    if (isDark) {
      document.documentElement.classList.add('dark')
    }

    // Escuchar cambios de acento desde widgets o ajustes
    window.addEventListener('studenthub_widget_accent_changed', (e) => {
      if (e.detail) {
        applyDynamicAccent(e.detail)
      }
    })
  } catch (e) {}
}
