// Servicio de Configuración de Visibilidad de Pestañas de Navegación
// Permite al usuario activar/desactivar pestañas (Notas, My Hub, Asistente IA, etc.)
// tanto en la barra superior como en la barra lateral.

const STORAGE_KEY = 'app_visible_nav_tabs'

export const DEFAULT_VISIBLE_TABS = {
  '/calendar': true,
  '/': true,
  '/notebooks': true,
  '/ai-assistant': true,
  '/my-hub': true,
}

export const NAV_TAB_DEFINITIONS = [
  {
    id: '/calendar',
    label: 'Calendario & Agenda',
    desc: 'Planificación temporal, vistas por día/semana/mes e iCal',
    icon: 'calendar_today',
    canToggle: false, // El calendario es troncal
  },
  {
    id: '/',
    label: 'Organizador de Tareas',
    desc: 'Priorización cognitiva inteligente y timeline de ejecución',
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
    label: 'Asistente IA (Pestaña)',
    desc: 'Chat conversacional a pantalla completa con el agente de IA',
    icon: 'smart_toy',
    canToggle: true,
  },
  {
    id: '/my-hub',
    label: 'My Hub (Recursos & Links)',
    desc: 'Directorio de enlaces rápidos, archivos y marcadores',
    icon: 'hub',
    canToggle: true,
  },
]

export function getVisibleNavTabs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_VISIBLE_TABS,
        ...parsed,
        // Garantizar que Calendario y Tareas siempre permanezcan activos
        '/calendar': true,
        '/': true,
      }
    }
  } catch (e) {}
  return { ...DEFAULT_VISIBLE_TABS }
}

export function setVisibleNavTab(tabId, isVisible) {
  try {
    if (tabId === '/calendar' || tabId === '/') return getVisibleNavTabs()
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
