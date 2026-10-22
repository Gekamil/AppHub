// Servicio de Configuracion de Visibilidad de Pestanas de Navegacion
// Permite al usuario activar/desactivar pestanas (Notas, My Hub, Asistente IA, etc.)
// tanto en la barra superior como en la barra lateral.

const STORAGE_KEY = 'app_visible_nav_tabs'

export const DEFAULT_VISIBLE_TABS = {
  '/calendar': true,
  '/app': true,
  '/': true,
  '/notebooks': true,
  '/ai-assistant': true,
  '/my-hub': true,
  '/news': true,
}

export const NAV_TAB_DEFINITIONS = [
  {
    id: '/calendar',
    label: 'Calendario & Agenda',
    desc: 'Planificacion temporal, vistas por dia/semana/mes e iCal',
    icon: 'calendar_today',
    canToggle: false, // El calendario es troncal
  },
  {
    id: '/app',
    label: 'Organizador de Tareas',
    desc: 'Priorizacion cognitiva inteligente y timeline de ejecucion',
    icon: 'checklist',
    canToggle: false, // Las tareas son troncales
  },
  {
    id: '/notebooks',
    label: 'Notas & Documentos',
    desc: 'Editor enriquecido tipo Notion para asignaturas y proyectos',
    icon: 'menu_book',
    canToggle: true,
  },
  {
    id: '/ai-assistant',
    label: 'Asistente IA (Pestana)',
    desc: 'Chat conversacional a pantalla completa con el agente de IA',
    icon: 'smart_toy',
    canToggle: true,
  },
  {
    id: '/my-hub',
    label: 'My Hub (Recursos & Links)',
    desc: 'Directorio de enlaces rapidos, archivos y marcadores',
    icon: 'hub',
    canToggle: true,
  },
  {
    id: '/news',
    label: 'Noticias',
    desc: 'Noticias y actualidad diaria',
    icon: 'Newspaper',
    canToggle: true,
  },
]

export function getVisibleNavTabs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed['/'] !== undefined && parsed['/app'] === undefined) {
        parsed['/app'] = parsed['/']
      }
      return {
        ...DEFAULT_VISIBLE_TABS,
        ...parsed,
        // Garantizar que Calendario y Tareas siempre permanezcan activos
        '/calendar': true,
        '/app': true,
        '/': true,
      }
    }
  } catch (e) {}
  return { ...DEFAULT_VISIBLE_TABS }
}

export function setVisibleNavTab(tabId, isVisible) {
  try {
    if (tabId === '/calendar' || tabId === '/app' || tabId === '/') return getVisibleNavTabs()
    const current = getVisibleNavTabs()
    const updated = {
      ...current,
      [tabId]: Boolean(isVisible),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app_visible_tabs_changed', { detail: updated }))
    }
    return updated
  } catch (e) {
    return getVisibleNavTabs()
  }
}
