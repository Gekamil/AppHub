// Servicio y Gestor de Temas, Fuentes y Estilos Visuales de AppHub Focus Hub
// 4 Diseños Radicales e Inconfundibles con Tipografías Únicas:
// 1. Clásica (Apple Cupertino): Limpia, rounded-2xl, fuente Inter
// 2. Aura Rose & Velvet: Lujo editorial, Fraunces itálico + Outfit, seda y curvas de 26px
// 3. The Architectural Ledger: Libro mayor de arquitectura y finanzas, Cinzel + Instrument Serif, papel pergamino y marcos milimétricos
// 4. Neo-Brutalista Industrial: Esquinas estrictas a 0px, marcos de 2px, Syne 800 + Space Mono, sombras duras limpias sin solapar

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
    name: 'Aura Rose & Velvet',
    tag: 'Editorial & Soft',
    description: 'Estética de revista de lujo, titulares en Fraunces itálico, fondo degradado seda/rosa, sombras etéreas y curvas de 26px.',
    fontName: 'Fraunces / Outfit',
    fontFamily: '"Fraunces", "Outfit", serif',
    accentColor: '#f43f5e',
    previewBadge: 'rounded-full px-2.5 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-semibold border border-rose-200/60 dark:border-rose-800/60',
    labels: {
      appTitle: 'Aura Velvet Journal',
      autoOrganizer: 'Ritmo Consciente & Flujo Diario',
      autoOrganizerSubtitle: 'Equilibrio, bienestar y atención cuidada a tus momentos esenciales',
      smartIngestion: 'Captura de Intenciones',
      smartIngestionDesc: 'Anota tus propósitos con calma, belleza y fluidez',
      timeline: 'Secuencia & Armonía del Día',
      timelineDesc: 'Momentos organizados con delicadeza y tiempo para ti',
      myHub: 'Santuario de Recursos & Inspiración',
      myHubDesc: 'Tus lecturas favoritas, cuadernos de notas y espacios bellos',
      filterContext: 'Espacios de Vida',
      allContexts: 'Todas las Áreas',
      todayTasks: 'Momentos para Hoy',
      upcomingTasks: 'Próximas Jornadas',
      calendarTitle: 'Agenda Serena & Ritmo Semanal',
      calendarSubtitle: 'Visualiza tus semanas en armonía con bloques de concentración claros',
      newAction: '+ Nueva Intención',
    },
  },
  {
    id: 'executive',
    name: 'The Architectural Ledger',
    tag: 'Libro Mayor & Precisión',
    description: 'Libro mayor de arquitectura y finanzas, titulares clásicos Cinzel, textura pergamino y marcos milimétricos de precisión.',
    fontName: 'Cinzel / Instrument Serif',
    fontFamily: '"Cinzel", "Instrument Serif", serif',
    accentColor: '#1e3a5f',
    previewBadge: 'rounded-xs px-2 py-0.5 bg-amber-50 text-amber-900 dark:bg-slate-800 dark:text-amber-200 text-xs font-semibold border border-amber-300/80 dark:border-slate-700',
    labels: {
      appTitle: 'ARCHITECTURAL LEDGER // APPHUB',
      autoOrganizer: 'Registro Maestro & Agenda Estratégica',
      autoOrganizerSubtitle: 'Despacho de compromisos, hitos analíticos y ordenación cronológica',
      smartIngestion: 'Indexación de Asignaciones & Hitos',
      smartIngestionDesc: 'Anotación formal de compromisos con verificación directa',
      timeline: 'Cronograma Diario de Asignaciones',
      timelineDesc: 'Distribución horaria estructurada por ventana de ejecución',
      myHub: 'Archivo Documental & Biblioteca Técnica',
      myHubDesc: 'Fuentes de referencia, esquemas analíticos y repositorios',
      filterContext: 'Carteras & Departamentos',
      allContexts: 'Global Portfolios',
      todayTasks: 'Entregables Clave de Hoy',
      upcomingTasks: 'Horizonte Estratégico & Futuro',
      calendarTitle: 'Plan Maestro & Matriz Cronológica',
      calendarSubtitle: 'Mapeo semanal riguroso con sincronización de fuentes externas',
      newAction: '+ Asignar Hito',
    },
  },
  {
    id: 'brutalista',
    name: 'Neo-Brutalista Industrial',
    tag: 'Radical & Táctico',
    description: 'Esquinas rectas a 0px, marcos de 2px de trazo técnico, tipografía Syne 800 + Space Mono y sombras de impacto limpias sin solapamiento.',
    fontName: 'Syne / Space Mono',
    fontFamily: '"Syne", "Space Mono", monospace',
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
    if (saved === 'minimal') return 'aura'
    if (saved === 'cyberpunk') return 'brutalista'
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
