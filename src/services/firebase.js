// Servicio de Base de Datos y Autenticacion Persistente para StudentHub
// Sin requerir claves tecnicas ni configuraciones complejas al usuario

const ACCOUNTS_DB_KEY = 'studenthub_accounts_database'
const ACTIVE_USER_KEY = 'studenthub_active_user'

export const GUEST_USER = {
  uid: 'guest',
  displayName: 'Invitado',
  email: '',
  plan: 'Free',
  isGuest: true,
  focusStatus: 'Sin sesión',
  location: 'Málaga, ES',
}

const DEFAULT_ACCOUNTS = []

// Obtener todas las cuentas registradas en la base de datos
export const getAllAccounts = () => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.warn('Error leyendo base de datos de cuentas:', e)
  }
  return []
}

// Guardar lista de cuentas
const saveAllAccounts = (accounts) => {
  try {
    localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(accounts))
  } catch (e) {
    console.warn('Error guardando en base de datos:', e)
  }
}

// Comprobar si el usuario actual está en modo invitado o sin sesión iniciada
export const isGuestUser = (user) => {
  if (!user) return true
  if (user.uid === 'guest' || user.isGuest === true || !user.email) return true
  try {
    const isAuth = localStorage.getItem('studenthub_is_authenticated')
    return isAuth !== 'true'
  } catch (e) {
    return true
  }
}

// Obtener usuario actualmente activo (por defecto siempre Invitado a menos que haya login explícito)
export const getCurrentUser = () => {
  try {
    const isAuth = localStorage.getItem('studenthub_is_authenticated')
    if (isAuth !== 'true') {
      return GUEST_USER
    }
    const raw = localStorage.getItem(ACTIVE_USER_KEY)
    if (raw) {
      const user = JSON.parse(raw)
      if (user && user.uid && user.uid !== 'guest' && !user.isGuest && user.email) {
        return user
      }
    }
  } catch (e) {
    console.warn('Error leyendo usuario activo:', e)
  }
  return GUEST_USER
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

  localStorage.setItem('studenthub_is_authenticated', 'true')
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
  localStorage.setItem('studenthub_is_authenticated', 'true')
  setActiveUser(newUser)
  return newUser
}

// Cambiar de cuenta activa con 1 click
export const switchAccount = (uid) => {
  if (uid === 'guest') {
    return logoutUser()
  }
  const accounts = getAllAccounts()
  const target = accounts.find((a) => a.uid === uid)
  if (target) {
    localStorage.setItem('studenthub_is_authenticated', 'true')
    return setActiveUser(target)
  }
  return logoutUser()
}

// Eliminar una cuenta guardada en el dispositivo
export const deleteAccount = async (uid) => {
  let accounts = getAllAccounts()
  accounts = accounts.filter((a) => a.uid !== uid)
  saveAllAccounts(accounts)
  const current = getCurrentUser()
  if (current.uid === uid) {
    if (accounts.length > 0) {
      localStorage.setItem('studenthub_is_authenticated', 'true')
      setActiveUser(accounts[0])
    } else {
      await logoutUser()
    }
  } else {
    window.dispatchEvent(new Event('studenthub_auth_changed'))
  }
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

// Cerrar sesion (pasa a modo invitado sin sesion)
export const logoutUser = async () => {
  localStorage.setItem('studenthub_is_authenticated', 'false')
  return setActiveUser(GUEST_USER)
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
