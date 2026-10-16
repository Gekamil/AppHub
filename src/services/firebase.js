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
      if (Array.isArray(parsed)) {
        // Purgar de forma estricta cualquier rastro de cuentas demo o inexistentes
        const clean = parsed.filter(
          (acc) =>
            acc &&
            acc.uid &&
            acc.uid !== 'user-jorge' &&
            acc.uid !== 'guest' &&
            acc.email &&
            acc.email !== 'jorge.m@focushub.workspace' &&
            acc.email !== 'invitado@studenthub.app'
        )
        if (clean.length !== parsed.length) {
          localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(clean))
        }
        return clean
      }
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
      if (
        user &&
        user.uid &&
        user.uid !== 'guest' &&
        user.uid !== 'user-jorge' &&
        !user.isGuest &&
        user.email &&
        user.email !== 'jorge.m@focushub.workspace'
      ) {
        return user
      }
    }
  } catch (e) {
    console.warn('Error leyendo usuario activo:', e)
  }
  // Si no hay sesión válida real, forzar modo invitado
  localStorage.setItem('studenthub_is_authenticated', 'false')
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

// Cerrar sesion (pasa a modo invitado sin sesion y limpia datos temporales)
export const logoutUser = async () => {
  localStorage.setItem('studenthub_is_authenticated', 'false')
  // Al cerrar sesión, limpiar cualquier rastro de tareas en app_global_tasks para que el invitado nunca las vea
  localStorage.removeItem('app_global_tasks')
  return setActiveUser(GUEST_USER)
}

// Obtener tareas del usuario actual garantizando aislamiento estricto y privacidad
export const getUserTasks = (user = getCurrentUser()) => {
  try {
    if (isGuestUser(user)) {
      // Un usuario sin cuenta iniciada NUNCA accede a tareas de otros usuarios
      const rawGuest = localStorage.getItem('studenthub_guest_tasks')
      if (rawGuest !== null) {
        const parsed = JSON.parse(rawGuest)
        if (Array.isArray(parsed)) return parsed
      }
      return [] // Vacío por defecto para invitados (sin eventos ajenos)
    }
    // Usuario registrado: cargar sus tareas privadas
    const accounts = getAllAccounts()
    const found = accounts.find((a) => a.uid === user.uid)
    if (found && Array.isArray(found.tasks)) {
      return found.tasks
    }
    const rawLocal = localStorage.getItem(`studenthub_tasks_${user.uid}`)
    if (rawLocal !== null) {
      const parsed = JSON.parse(rawLocal)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (e) {
    console.warn('Error leyendo tareas de usuario:', e)
  }
  return []
}

// Guardar tareas garantizando aislamiento de usuario y privacidad absoluta
export const saveUserTasks = (tasks, user = getCurrentUser()) => {
  try {
    if (isGuestUser(user)) {
      // Invitado: guardar únicamente en memoria local de invitado (no en cuentas ni en la nube)
      localStorage.setItem('studenthub_guest_tasks', JSON.stringify(tasks))
      return
    }
    // Usuario autenticado: persistir en su propia partición
    localStorage.setItem(`studenthub_tasks_${user.uid}`, JSON.stringify(tasks))
    const accounts = getAllAccounts()
    const idx = accounts.findIndex((a) => a.uid === user.uid)
    if (idx >= 0) {
      accounts[idx].tasks = tasks
      saveAllAccounts(accounts)
    }
  } catch (e) {
    console.warn('Error guardando tareas de usuario:', e)
  }
}

// Obtener calendarios del usuario actual (Aislado por cuenta)
export const getUserCalendars = (user = getCurrentUser()) => {
  const DEFAULT_GUEST_CALENDARS = [
    {
      id: 'cal-default',
      name: 'Personal & General',
      color: '#3b82f6',
      dot: 'bg-blue-500',
      sharedFrom: [],
      isDefault: true,
      syncUrl: '',
    },
  ]

  try {
    if (isGuestUser(user)) {
      const rawGuest = localStorage.getItem('studenthub_guest_calendars')
      if (rawGuest !== null) {
        const parsed = JSON.parse(rawGuest)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
      return DEFAULT_GUEST_CALENDARS
    }

    const accounts = getAllAccounts()
    const found = accounts.find((a) => a.uid === user.uid)
    if (found && Array.isArray(found.calendars) && found.calendars.length > 0) {
      return found.calendars
    }
    const rawLocal = localStorage.getItem(`studenthub_calendars_${user.uid}`)
    if (rawLocal !== null) {
      const parsed = JSON.parse(rawLocal)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.warn('Error leyendo calendarios de usuario:', e)
  }
  return DEFAULT_GUEST_CALENDARS
}

// Guardar calendarios de forma aislada por usuario
export const saveUserCalendars = (calendars, user = getCurrentUser()) => {
  try {
    if (isGuestUser(user)) {
      localStorage.setItem('studenthub_guest_calendars', JSON.stringify(calendars))
      return
    }
    localStorage.setItem(`studenthub_calendars_${user.uid}`, JSON.stringify(calendars))
    const accounts = getAllAccounts()
    const idx = accounts.findIndex((a) => a.uid === user.uid)
    if (idx >= 0) {
      accounts[idx].calendars = calendars
      saveAllAccounts(accounts)
    }
  } catch (e) {
    console.warn('Error guardando calendarios de usuario:', e)
  }
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
