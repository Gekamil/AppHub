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
      autoOrganizer: 'Línea Temporal Esmerilada',
      autoOrganizerSubtitle: 'Enfoque cognitivo sobre cristal líquido translúcido',
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
    id: 'linear',
    name: 'Obsidian Linear Pro',
    tag: 'Linear & Raycast',
    description: 'Negro obsidiana ultra-profundo (#08090a), bordes micrométricos de 1px (#1f2328), alta densidad tipográfica y acentos de enfoque índigo láser.',
    fontName: 'Inter / Plus Jakarta',
    fontFamily: '"Inter", "Plus Jakarta Sans", sans-serif',
    accentColor: '#5e6ad2',
    previewBadge: 'rounded-md px-2 py-0.5 bg-[#12151c] text-[#8b9bfb] border border-[#272d38] text-xs font-medium',
    labels: {
      appTitle: 'Linear Workspace',
      autoOrganizer: 'Ciclo de Ejecución Diario',
      autoOrganizerSubtitle: 'Gestión de alta densidad y flujos de trabajo sin fricción',
      smartIngestion: 'Comando de Ingesta // ⌘K',
      smartIngestionDesc: 'Prioridad y contexto por lenguaje natural',
      timeline: 'Pipeline de Tareas',
      timelineDesc: 'Ordenado por criticidad y hora de inicio',
      myHub: 'Base de Referencias',
      myHubDesc: 'Documentos, links técnicos y notas de sprint',
      filterContext: 'Filtro por Contexto',
      allContexts: 'Todos los Contextos',
      todayTasks: 'Tareas del Sprint de Hoy',
      upcomingTasks: 'Backlog Próximas Semanas',
      calendarTitle: 'Matriz de Planificación',
      calendarSubtitle: 'Asignación horaria compacta y bloques de enfoque',
      newAction: '+ Nueva Tarea (C)',
    },
  },
  {
    id: 'nordic',
    name: 'Nordic Paper Minimalist',
    tag: 'Editorial & Warm Canvas',
    description: 'Lienzo cálido pergamino (#fbfbfa / #191816), acentos editoriales serif elegantes, sombras orgánicas de papel y máxima calma visual.',
    fontName: 'Fraunces / Inter',
    fontFamily: '"Fraunces", "Inter", Georgia, serif',
    accentColor: '#b45309',
    previewBadge: 'rounded-lg px-2.5 py-0.5 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 text-xs font-serif italic',
    labels: {
      appTitle: 'Cuaderno Nórdico',
      autoOrganizer: 'Agenda & Notas Diarias',
      autoOrganizerSubtitle: 'Planificación pausada y lectura clara sobre papel cálido',
      smartIngestion: 'Anotación Rápida',
      smartIngestionDesc: 'Escribe lo que tienes pendiente para hoy o mañana',
      timeline: 'Línea de Vida Diaria',
      timelineDesc: 'Cronología de lecturas, clases y momentos de foco',
      myHub: 'Biblioteca Personal & Archivo',
      myHubDesc: 'Colección de artículos, PDFs y lecturas guardadas',
      filterContext: 'Temática',
      allContexts: 'Todas las áreas',
      todayTasks: 'Páginas de Hoy',
      upcomingTasks: 'Horizontes Próximos',
      calendarTitle: 'Almanaque & Calendario',
      calendarSubtitle: 'Distribución armónica de semanas y estudio',
      newAction: '+ Escribir Tarea',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon Tactical',
    tag: 'High Voltage & Matrix Grid',
    description: 'Azul medianoche profundo (#030712) con cian eléctrico (#00f0ff) y magenta (#ff007f), cuadrícula técnica de datos y fuentes monoespaciadas.',
    fontName: 'Space Grotesk / Space Mono',
    fontFamily: '"Space Grotesk", "Space Mono", monospace',
    accentColor: '#00f0ff',
    previewBadge: 'rounded-none px-2 py-0.5 bg-[#030712] text-[#00f0ff] border border-[#00f0ff] text-xs font-mono uppercase shadow-[0_0_8px_rgba(0,240,255,0.4)]',
    labels: {
      appTitle: 'CYBER_HUB // V8.4',
      autoOrganizer: 'TELEMETRÍA & COLA DE EJECUCIÓN',
      autoOrganizerSubtitle: 'Monitoreo de tareas en tiempo real y asignación de subrutinas',
      smartIngestion: 'INGESTA DE DATOS // TERMINAL INPUT',
      smartIngestionDesc: 'Procesamiento heurístico en tiempo real sin latencia',
      timeline: 'CRONOLOGÍA TÁCTICA 24H',
      timelineDesc: 'Secuencia indexada por timestamp de inicio',
      myHub: 'DEPÓSITO DE RECURSOS & PROTOCOLOS',
      myHubDesc: 'Nodos de información y enlaces de acceso rápido',
      filterContext: 'SECTORES',
      allContexts: 'ROOT // ALL',
      todayTasks: 'SUBRUTINAS DE HOY',
      upcomingTasks: 'HORIZONTE PRÓXIMO',
      calendarTitle: 'MATRIZ HORARIA DE INTERCONEXIÓN',
      calendarSubtitle: 'Mapeo temporal multidimensional con feeds externos',
      newAction: '[+] INSERTAR SUBRUTINA',
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

export function getAppTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
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
    window.dispatchEvent(new CustomEvent('app_theme_style_changed', { detail: themeId }))
    window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: themeId }))
  } catch (e) {}
  return themeId
}

// Inicializar atributo al cargar preservando dark mode
if (typeof document !== 'undefined') {
  try {
    const cur = getAppTheme()
    document.documentElement.setAttribute('data-theme-style', cur)
    // Garantizar que la clase dark no se pierda al cargar
    const isDark = localStorage.getItem('app_theme') === 'dark' || localStorage.getItem('app_dark_mode') === 'true'
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  } catch (e) {}
}
