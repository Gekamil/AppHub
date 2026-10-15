// Servicio y Gestor de Temas, Fuentes y Estilos Visuales de AppHub Focus Hub
// Soporta 4 diseños completos: Clásica, Neo-Brutalismo, Nordic Bento y Terminal Cyberpunk

const THEME_STORAGE_KEY = 'app_theme_style'

export const APP_THEMES = [
  {
    id: 'clasica',
    name: 'Clásica (Apple Cupertino)',
    tag: 'Por Defecto',
    description: 'Bordes redondeados suaves, sombras sutiles, micro-interacciones de alta fidelidad y estética Apple.',
    fontName: 'Inter / SF Pro',
    fontClass: 'font-sans',
    previewBadge: 'rounded-full px-2.5 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-semibold',
    cardClass: 'rounded-2xl sm:rounded-3xl bg-surface-pure border border-slate-200/80 dark:border-slate-800 shadow-sm',
    headerCardClass: 'rounded-2xl sm:rounded-3xl bg-surface-pure border border-slate-200/80 dark:border-slate-800 shadow-sm p-5 sm:p-7',
    buttonClass: 'rounded-xl font-medium shadow-2xs',
    pillClass: 'rounded-xl',
    badgeClass: 'rounded-full',
    inputClass: 'rounded-xl',
    borderClass: 'border-slate-200/80 dark:border-slate-800',
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
    id: 'brutalista',
    name: 'Neo-Brutalismo (Sharp Industrial)',
    tag: 'Bordes 0px',
    description: 'Bordes rectos sin redondear (0px), marcos gruesos de 2px, sombras sólidas duras y estética técnica de alto impacto.',
    fontName: 'JetBrains Mono / Space Grotesk',
    fontClass: 'font-mono font-medium',
    previewBadge: 'rounded-none px-2 py-0.5 bg-yellow-300 text-slate-950 border-2 border-black text-xs font-bold uppercase',
    cardClass: 'rounded-none bg-white dark:bg-[#0c0d12] border-2 border-slate-950 dark:border-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.85)]',
    headerCardClass: 'rounded-none bg-white dark:bg-[#0c0d12] border-2 border-slate-950 dark:border-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.85)] p-5 sm:p-7',
    buttonClass: 'rounded-none border-2 border-slate-950 dark:border-white font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.85)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
    pillClass: 'rounded-none border border-slate-950 dark:border-white font-bold uppercase',
    badgeClass: 'rounded-none border border-slate-950 dark:border-white font-bold uppercase text-[10px]',
    inputClass: 'rounded-none border-2 border-slate-950 dark:border-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.7)]',
    borderClass: 'border-2 border-slate-950 dark:border-white',
    labels: {
      appTitle: 'COMMAND_CENTER // APP_HUB',
      autoOrganizer: 'CENTRO DE CONTROL & RADAR TÁCTICO',
      autoOrganizerSubtitle: 'Despacho de misiones operativas y control de ejecución',
      smartIngestion: 'DISPATCHER TÁCTICO // INGESTA RÁPIDA',
      smartIngestionDesc: 'Parser heurístico activo · Cero retrasos',
      timeline: 'CRONOGRAMA DE EJECUCIÓN 24H',
      timelineDesc: 'Secuencia ordenada por jerarquía de prioridad',
      myHub: 'DEPÓSITO DE RECURSOS & PROTOCOLOS',
      myHubDesc: 'Archivos, referencias e índices de alta disponibilidad',
      filterContext: 'SECTORES DE MISIÓN',
      allContexts: 'GLOBAL [ALL]',
      todayTasks: 'MISIONES ACTIVAS // HOY',
      upcomingTasks: 'HORIZONTE TÁCTICO // SEMANAS',
      calendarTitle: 'MATRIZ TEMPORAL DE ASIGNACIÓN',
      calendarSubtitle: 'Matriz horaria multidimensional y feeds externos conectados',
      newAction: '[+] REGISTRAR MISIÓN',
    },
  },
  {
    id: 'minimal',
    name: 'Nordic Bento (Zen Spatial)',
    tag: 'Minimalista',
    description: 'Cuadrículas Bento equilibradas, esquinas sutiles compactas, tipografía sobria y terminología tranquila de enfoque.',
    fontName: 'DM Sans / Clean Sans',
    fontClass: 'font-sans tracking-tight',
    previewBadge: 'rounded-md px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-medium',
    cardClass: 'rounded-xl bg-surface-pure/90 border border-slate-200/60 dark:border-slate-800/60 shadow-none',
    headerCardClass: 'rounded-xl bg-surface-pure/90 border border-slate-200/60 dark:border-slate-800/60 shadow-none p-5 sm:p-7',
    buttonClass: 'rounded-lg font-normal tracking-tight',
    pillClass: 'rounded-lg',
    badgeClass: 'rounded-md text-[11px] font-normal',
    inputClass: 'rounded-lg border-slate-200/80 dark:border-slate-700/80',
    borderClass: 'border border-slate-200/60 dark:border-slate-800/60',
    labels: {
      appTitle: 'Studio Focus',
      autoOrganizer: 'Espacio de Enfoque Consciente',
      autoOrganizerSubtitle: 'Claridad mental y avance pausado en lo esencial',
      smartIngestion: 'Captura de Actividades',
      smartIngestionDesc: 'Anota tus intenciones con calma',
      timeline: 'Flujo del Día',
      timelineDesc: 'Distribución equilibrada del tiempo',
      myHub: 'Colecciones & Espacios',
      myHubDesc: 'Tus lecturas y herramientas esenciales',
      filterContext: 'Áreas de Vida',
      allContexts: 'Todas las áreas',
      todayTasks: 'Para Hoy',
      upcomingTasks: 'Días Siguientes',
      calendarTitle: 'Agenda & Ritmo',
      calendarSubtitle: 'Visualiza la semana y tus bloques de concentración',
      newAction: '+ Nueva entrada',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Terminal Dev (Cyberpunk Matrix)',
    tag: 'Consola Hacker',
    description: 'Fondo negro azabache, resplandor esmeralda/cian, tipografía monospace de consola y terminología de ingeniería de sistemas.',
    fontName: 'Fira Code / VT323',
    fontClass: 'font-mono text-[13px]',
    previewBadge: 'rounded-none px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/50 text-xs font-mono',
    cardClass: 'rounded-none bg-[#070b12] border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    headerCardClass: 'rounded-none bg-[#070b12] border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)] p-5 sm:p-7',
    buttonClass: 'rounded-none border border-emerald-500/70 text-emerald-400 font-mono tracking-widest uppercase hover:bg-emerald-500/15 transition-colors',
    pillClass: 'rounded-none border border-emerald-500/30 font-mono text-xs',
    badgeClass: 'rounded-none border border-emerald-500/40 bg-emerald-950/40 text-emerald-400 font-mono text-[10px]',
    inputClass: 'rounded-none border border-emerald-500/50 bg-[#04070c] text-emerald-300 font-mono shadow-inner',
    borderClass: 'border border-emerald-500/40',
    labels: {
      appTitle: 'ROOT@SYS_CORE:~$',
      autoOrganizer: 'TERMINAL_ROOT // PROCESS_DAEMON',
      autoOrganizerSubtitle: 'Algoritmo heurístico de scheduling multihilo v4.2',
      smartIngestion: 'INPUT_STREAM // TASK_BUFFER',
      smartIngestionDesc: 'Stdin activo · NLP parse ready',
      timeline: 'DAEMON_EXECUTION_QUEUE',
      timelineDesc: 'Procesos ordenados por prioridad de hilo',
      myHub: 'DATA_VAULT // REPO_FILES',
      myHubDesc: 'Nodos y enlaces montados en el sistema',
      filterContext: 'ACTIVE_CONTEXT_MODULES',
      allContexts: 'SYS_ALL',
      todayTasks: 'THREAD_ACTIVE // 0x01',
      upcomingTasks: 'FUTURE_QUEUE_STACK',
      calendarTitle: 'CHRONOS_SCHEDULER_GRID',
      calendarSubtitle: 'Mapeo de slots y canales de sincronización externa',
      newAction: '> PUSH_TASK',
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
