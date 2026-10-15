// Servicio y Gestor de Temas, Fuentes y Estilos Visuales de AppHub Focus Hub
// 4 Diseños Radicales, Modernos e Inconfundibles con Tipografías Dedicadas:
// 1. Clásica (Apple Cupertino): Limpia, rounded-2xl, fuente Inter, azul Apple
// 2. Blossom Study (Pastel Aesthetic): Estilo Notion / Goodnotes, Fraunces itálico + Outfit, pastel y curvas de 32px
// 3. Linear Obsidian Pro: Estilo Linear / Raycast, Sora + Space Mono, obsidiana profundo, borde láser y alta densidad
// 4. Neo-Brutalista Industrial: Esquinas estrictas a 0px, marcos de 2px, Space Grotesk + Space Mono, sombras de bloque sin solapamiento

const THEME_STORAGE_KEY = 'app_theme_style'

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
    description: 'Diseño corporativo con barras de navegación en grafito pizarra, líneas estructuradas y máxima claridad visual para el trabajo.',
    fontName: 'Plus Jakarta Sans',
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
    accentColor: '#000000',
    previewBadge: 'rounded-md px-2 py-0.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold border border-slate-900 dark:border-white',
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

export function getAppTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'linear' || saved === 'cyberpunk') return 'executive'
    if (saved === 'minimal') return 'aura'
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
      
      // Disparar animación lateral cinematográfica
      const rootEl = document.getElementById('root') || document.body
      rootEl.classList.remove('animate-theme-switch')
      void rootEl.offsetWidth // forzar reflow
      rootEl.classList.add('animate-theme-switch')
      setTimeout(() => {
        rootEl.classList.remove('animate-theme-switch')
      }, 450)
    }
    window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: themeId }))
  } catch (e) {}
  return themeId
}

// Inicializar atributo al cargar
if (typeof document !== 'undefined') {
  try {
    const cur = getAppTheme()
    document.documentElement.setAttribute('data-theme-style', cur)
  } catch (e) {}
}
