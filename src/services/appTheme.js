// Servicio y Gestor de Temas, Fuentes y Estilos Visuales de AppHub Focus Hub
// Soporta 4 diseños radicales, elegantes y diferentes:
// 1. Clásica (Apple Cupertino): Suave, rounded-2xl, fuente Inter
// 2. Aura Rose & Silk: Elegante, soft, orgánica, colores seda/rosa suave, fuente Outfit / Playfair
// 3. Executive Editorial: Prensa ejecutiva, titulares Newsreader, líneas nítidas de 1px, sobriedad corporativa
// 4. Neo-Brutalista Industrial: Radical, esquinas a 0px, marcos de 2px, sombras duras, fuente Space Grotesk / Mono

const THEME_STORAGE_KEY = 'app_theme_style'

export const APP_THEMES = [
  {
    id: 'clasica',
    name: 'Clásica (Apple Cupertino)',
    tag: 'Por Defecto',
    description: 'Bordes redondeados equilibrados, sombras suaves, tipografía Inter y micro-interacciones de alta fidelidad estilo macOS.',
    fontName: 'Inter / SF Pro',
    fontFamily: '"Inter", -apple-system, sans-serif',
    accentColor: '#0071E3',
    previewBadge: 'rounded-full px-2.5 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-semibold',
    labels: {
      appTitle: 'Focus Hub',
      autoOrganizer: 'Auto-Organizador Inteligente',
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
    name: 'Aura Rose & Silk',
    tag: 'Elegante & Soft',
    description: 'Siluetas orgánicas ultra-redondeadas, tipografía refinada Outfit, reflejos de seda pastel y sombras flotantes de alta elegancia.',
    fontName: 'Outfit / Playfair Display',
    fontFamily: '"Outfit", "Playfair Display", system-ui, sans-serif',
    accentColor: '#ec4899',
    previewBadge: 'rounded-full px-2.5 py-0.5 bg-pink-50 text-pink-600 dark:bg-pink-950/60 dark:text-pink-300 text-xs font-semibold border border-pink-200/60 dark:border-pink-800/60',
    labels: {
      appTitle: 'Aura Focus Journal',
      autoOrganizer: 'Organizador Consciente & Flujo Diario',
      autoOrganizerSubtitle: 'Claridad, bienestar y enfoque pausado en tus prioridades esenciales',
      smartIngestion: 'Captura de Intenciones',
      smartIngestionDesc: 'Anota tus objetivos con calma y fluidez',
      timeline: 'Secuencia & Ritmo del Día',
      timelineDesc: 'Momentos organizados con delicadeza y tiempo para ti',
      myHub: 'Santuario de Recursos & Inspiración',
      myHubDesc: 'Tus lecturas favoritas, enlaces y cuadernos de inspiración',
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
    name: 'Executive Editorial',
    tag: 'Financiero & Sobrio',
    description: 'Titulares Newsreader con clase editorial, marcos nítidos de precisión, paleta pizarra corporativa y sobriedad de alto nivel.',
    fontName: 'Newsreader / Plus Jakarta Sans',
    fontFamily: '"Plus Jakarta Sans", "Newsreader", serif',
    accentColor: '#1e3a8a',
    previewBadge: 'rounded-xs px-2 py-0.5 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700',
    labels: {
      appTitle: 'THE EXECUTIVE JOURNAL // APPHUB',
      autoOrganizer: 'Panel de Operaciones & Agenda Estratégica',
      autoOrganizerSubtitle: 'Gestión ejecutiva, entregables críticos y asignación de prioridades',
      smartIngestion: 'Registro de Compromisos & Hitos',
      smartIngestionDesc: 'Indexación algorítmica con rigor analítico y cero fricción',
      timeline: 'Cronograma de Compromisos Diarios',
      timelineDesc: 'Secuencia ordenada por impacto y ventana de ejecución',
      myHub: 'Centro de Inteligencia & Documentación',
      myHubDesc: 'Archivos corporativos, referencias y fuentes de consulta rápida',
      filterContext: 'Carteras & Departamentos',
      allContexts: 'Global Portfolios',
      todayTasks: 'Entregables Clave de Hoy',
      upcomingTasks: 'Planificación Estratégica & Futura',
      calendarTitle: 'Agenda Ejecutiva & Plan Maestro',
      calendarSubtitle: 'Planificación de alto nivel con sincronización de calendarios institucionales',
      newAction: '+ Asignar Hito',
    },
  },
  {
    id: 'brutalista',
    name: 'Neo-Brutalista Industrial',
    tag: 'Radical & Táctico',
    description: 'Esquinas rectas sin redondear (0px), marcos negros de 2px, sombras sólidas de alto impacto y tipografía técnica de ingeniería.',
    fontName: 'Space Grotesk / JetBrains Mono',
    fontFamily: '"Space Grotesk", "JetBrains Mono", monospace',
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
