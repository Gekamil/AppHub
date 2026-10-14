// Servicio de Base de Datos y Autenticacion Persistente para StudentHub
// Sin requerir claves tecnicas ni configuraciones complejas al usuario

const ACCOUNTS_DB_KEY = 'studenthub_accounts_database'
const ACTIVE_USER_KEY = 'studenthub_active_user'

const DEFAULT_ACCOUNTS = [
  {
    uid: 'user-jorge',
    displayName: 'Jorge García',
    email: 'jorge.m@focushub.workspace',
    plan: 'Pro',
    focusStatus: 'Deep Work Block',
    location: 'Málaga, ES',
    password: 'password123',
    createdAt: '2026-10-12T10:00:00.000Z',
    calendars: [
      {
        id: 'cal-default',
        name: 'Personal & General',
        color: '#3b82f6',
        dot: 'bg-blue-500',
        sharedFrom: [],
        isDefault: true,
        syncUrl: '',
      },
      {
        id: 'cal-uni',
        name: 'Universidad',
        color: '#8b5cf6',
        dot: 'bg-purple-500',
        sharedFrom: [],
        syncUrl: '',
      },
      {
        id: 'cal-all',
        name: 'Todo (Vista Unificada)',
        color: '#10b981',
        dot: 'bg-emerald-500',
        sharedFrom: ['cal-default', 'cal-uni'],
        syncUrl: '',
      },
    ],
  },
]

// Obtener todas las cuentas registradas en la base de datos
export const getAllAccounts = () => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.warn('Error leyendo base de datos de cuentas:', e)
  }
  // Si no existe, inicializar con la cuenta por defecto
  localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(DEFAULT_ACCOUNTS))
  return DEFAULT_ACCOUNTS
}

// Guardar lista de cuentas
const saveAllAccounts = (accounts) => {
  try {
    localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(accounts))
  } catch (e) {
    console.warn('Error guardando en base de datos:', e)
  }
}

// Obtener usuario actualmente activo
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY)
    if (raw) {
      const user = JSON.parse(raw)
      if (user && user.uid) return user
    }
  } catch (e) {
    console.warn('Error leyendo usuario activo:', e)
  }
  // Por defecto, usar la primera cuenta registrada
  const accounts = getAllAccounts()
  const defaultUser = accounts[0]
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(defaultUser))
  return defaultUser
}

// Establecer usuario activo
export const setActiveUser = (user) => {
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user))
  // Disparar evento para actualizar componentes
  window.dispatchEvent(new Event('studenthub_auth_changed'))
  return user
}

// Iniciar sesion con email y contrasena
export const loginUser = async (email, password) => {
  const accounts = getAllAccounts()
  const trimmedEmail = email.trim().toLowerCase()
  const found = accounts.find((a) => a.email.toLowerCase() === trimmedEmail)

  if (!found) {
    throw new Error('No existe ninguna cuenta con ese correo electrónico')
  }

  if (password && found.password && found.password !== password) {
    throw new Error('Contraseña incorrecta')
  }

  setActiveUser(found)
  return found
}

// Registrar nueva cuenta de usuario
export const registerUser = async (email, password, displayName = '') => {
  const accounts = getAllAccounts()
  const trimmedEmail = email.trim().toLowerCase()

  if (accounts.some((a) => a.email.toLowerCase() === trimmedEmail)) {
    throw new Error('Ya existe una cuenta con este correo electrónico')
  }

  const newUser = {
    uid: 'user-' + Date.now(),
    displayName: displayName.trim() || trimmedEmail.split('@')[0],
    email: trimmedEmail,
    password: password || '123456',
    plan: 'Pro',
    focusStatus: 'Deep Work Block',
    location: 'Málaga, ES',
    createdAt: new Date().toISOString(),
    calendars: [
      {
        id: 'cal-default',
        name: 'Personal & General',
        color: '#3b82f6',
        dot: 'bg-blue-500',
        sharedFrom: [],
        isDefault: true,
        syncUrl: '',
      },
    ],
    tasks: [],
  }

  accounts.push(newUser)
  saveAllAccounts(accounts)
  setActiveUser(newUser)
  return newUser
}

// Cambiar de cuenta activa con 1 click
export const switchAccount = (uid) => {
  const accounts = getAllAccounts()
  const target = accounts.find((a) => a.uid === uid)
  if (target) {
    return setActiveUser(target)
  }
  return getCurrentUser()
}

// Actualizar datos del perfil activo
export const updateUserProfileData = async (data) => {
  const current = getCurrentUser()
  const accounts = getAllAccounts()
  const index = accounts.findIndex((a) => a.uid === current.uid)

  const updated = { ...current, ...data }

  if (index >= 0) {
    accounts[index] = updated
    saveAllAccounts(accounts)
  }

  setActiveUser(updated)
  return updated
}

// Cerrar sesion (pasa a modo invitado o primer usuario)
export const logoutUser = async () => {
  const guestUser = {
    uid: 'guest',
    displayName: 'Invitado',
    email: 'invitado@studenthub.app',
    plan: 'Free',
    focusStatus: 'En descanso',
    location: 'Málaga, ES',
  }
  return setActiveUser(guestUser)
}

// Sincronizar tareas del usuario activo
export const syncTasksToCloud = async (tasks) => {
  try {
    const current = getCurrentUser()
    if (!current || current.uid === 'guest') return
    const accounts = getAllAccounts()
    const idx = accounts.findIndex((a) => a.uid === current.uid)
    if (idx >= 0) {
      accounts[idx].tasks = tasks
      saveAllAccounts(accounts)
    }
  } catch (e) {
    console.warn('Error sincronizando tareas:', e)
  }
}

// Sincronizar calendarios del usuario activo
export const syncCalendarsToCloud = async (calendars) => {
  try {
    const current = getCurrentUser()
    if (!current || current.uid === 'guest') return
    const accounts = getAllAccounts()
    const idx = accounts.findIndex((a) => a.uid === current.uid)
    if (idx >= 0) {
      accounts[idx].calendars = calendars
      saveAllAccounts(accounts)
    }
  } catch (e) {
    console.warn('Error sincronizando calendarios:', e)
  }
}

// Cargar datos remotos/locales del usuario activo
export const loadUserDataFromCloud = async () => {
  try {
    const current = getCurrentUser()
    if (!current || current.uid === 'guest') return null
    const accounts = getAllAccounts()
    const found = accounts.find((a) => a.uid === current.uid)
    if (found) {
      return {
        tasks: found.tasks || null,
        calendars: found.calendars || null,
      }
    }
  } catch (e) {
    console.warn('Error cargando datos de usuario:', e)
  }
  return null
}
