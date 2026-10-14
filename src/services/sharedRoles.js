// Servicio de Roles y Clasificaciones Personalizadas Compartidas (Memoria Compartida entre Auto-Organizer y Calendario)

const STORAGE_KEY = 'app_shared_roles'

export const ROLE_PRESET_COLORS = [
  { name: 'Azul', hex: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  { name: 'Naranja', hex: '#f97316', bg: 'bg-orange-50 dark:bg-orange-950/60', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  { name: 'Morado', hex: '#a855f7', bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  { name: 'Esmeralda', hex: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  { name: 'Rosa', hex: '#f43f5e', bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
  { name: 'Cian', hex: '#06b6d4', bg: 'bg-cyan-50 dark:bg-cyan-950/60', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800', dot: 'bg-cyan-500' },
  { name: 'Índigo', hex: '#6366f1', bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500' },
  { name: 'Ámbar', hex: '#eab308', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
]

export const ROLE_PRESET_ICONS = [
  'school',
  'terminal',
  'person',
  'fitness_center',
  'work',
  'language',
  'palette',
  'music_note',
  'menu_book',
  'sports_tennis',
  'computer',
  'flight',
  'science',
  'favorite',
  'lightbulb',
  'task_alt',
]

const DEFAULT_ROLES = [
  {
    id: 'University',
    name: 'University',
    label: 'Universidad',
    icon: 'school',
    color: '#3b82f6',
    hex: '#3b82f6',
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200/80 dark:border-blue-800/80',
    activeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80',
  },
  {
    id: 'Projects',
    name: 'Projects',
    label: 'Proyectos',
    icon: 'terminal',
    color: '#f97316',
    hex: '#f97316',
    dot: 'bg-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/60',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200/80 dark:border-orange-800/80',
    activeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/80',
  },
  {
    id: 'Personal',
    name: 'Personal',
    label: 'Personal',
    icon: 'person',
    color: '#a855f7',
    hex: '#a855f7',
    dot: 'bg-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200/80 dark:border-purple-800/80',
    activeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/80',
  },
  {
    id: 'Health & Gym',
    name: 'Health & Gym',
    label: 'Salud & Gym',
    icon: 'fitness_center',
    color: '#10b981',
    hex: '#10b981',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200/80 dark:border-emerald-800/80',
    activeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
  },
]

export function getSharedRoles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('Error reading shared roles from localStorage:', e)
  }
  return DEFAULT_ROLES
}

export function saveSharedRoles(roles) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roles))
    window.dispatchEvent(new CustomEvent('shared_roles_updated', { detail: roles }))
  } catch (e) {
    console.warn('Error saving shared roles to localStorage:', e)
  }
  return roles
}

export function addSharedRole({ name, hexColor, icon }) {
  const current = getSharedRoles()
  const id = name.trim().replace(/\s+/g, '-') + '-' + Date.now().toString(36)
  const palette = ROLE_PRESET_COLORS.find((p) => p.hex.toLowerCase() === (hexColor || '').toLowerCase()) || {
    hex: hexColor || '#3b82f6',
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
  }

  const newRole = {
    id,
    name: name.trim(),
    label: name.trim(),
    icon: icon || 'task_alt',
    color: palette.hex,
    hex: palette.hex,
    dot: palette.dot,
    bg: palette.bg,
    text: palette.text,
    border: palette.border,
    activeClass: `${palette.bg} ${palette.text} ${palette.border}`,
  }

  const updated = [...current, newRole]
  return saveSharedRoles(updated)
}

export function deleteSharedRole(id) {
  const current = getSharedRoles()
  if (current.length <= 1) {
    return current // No borrar si solo queda uno
  }
  const updated = current.filter((r) => r.id !== id && r.name !== id)
  return saveSharedRoles(updated)
}
