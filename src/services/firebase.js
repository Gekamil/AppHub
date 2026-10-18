// Servicio de Base de Datos y Autenticacion Persistente en la Nube para StudentHub
// Sincronizado en tiempo real con Firebase Firestore entre todos los dispositivos (Android, iOS, PC y Web)

import { db } from './firebaseConfig'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

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

// Genera un ID de documento normalizado y seguro para Firestore
export const getAccountDocId = (email) => {
  if (!email) return ''
  const clean = email.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
  return `account_${clean}`
}

// Obtener todas las cuentas guardadas en la caché local del dispositivo
export const getAllAccounts = () => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // Purgar rastro de cuentas demo o de prueba
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
    console.warn('Error leyendo base de datos de cuentas local:', e)
  }
  return []
}

// Guardar lista de cuentas en la caché local
const saveAllAccounts = (accounts) => {
  try {
    localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(accounts))
  } catch (e) {
    console.warn('Error guardando en caché local:', e)
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

// Obtener usuario actualmente activo (por defecto Invitado a menos que haya login explícito)
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
  localStorage.setItem('studenthub_is_authenticated', 'false')
  return GUEST_USER
}

// Establecer usuario activo y emitir evento
export const setActiveUser = (user) => {
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user))
  window.dispatchEvent(new Event('studenthub_auth_changed'))
  return user
}

// Iniciar sesión con email y contraseña consultando la Nube (Firestore) y la caché local
export const loginUser = async (email, password) => {
  const trimmedEmail = (email || '').trim().toLowerCase()
  if (!trimmedEmail) {
    throw new Error('Por favor, introduce tu correo electrónico')
  }

  const docId = getAccountDocId(trimmedEmail)
  let found = null

  // 1. Consultar en la base de datos en la nube (Firestore) para soporte multidispositivo real
  try {
    if (db) {
      const docRef = doc(db, 'shared_calendars', docId)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        found = snap.data()
        console.log('[Cloud Auth]: Cuenta recuperada con éxito desde Firestore Cloud:', trimmedEmail)
      }
    }
  } catch (cloudErr) {
    console.warn('[Cloud Auth]: Aviso al consultar cuenta en Firestore:', cloudErr.message)
  }

  // 2. Si no se encontró en la nube o no había conexión, buscar en la caché local del dispositivo
  if (!found) {
    const localAccounts = getAllAccounts()
    found = localAccounts.find((a) => a.email && a.email.toLowerCase() === trimmedEmail)
  }

  // 3. Si no existe en ningún lado, indicar error claro
  if (!found) {
    throw new Error(
      'No existe ninguna cuenta registrada con ese correo electrónico. Si la creaste en otro dispositivo, comprueba que el correo esté bien escrito o pulsa en Registrarse para crearla.'
    )
  }

  // 4. Validar contraseña
  if (password && found.password && found.password !== password) {
    throw new Error('Contraseña incorrecta. Por favor, revisa las mayúsculas y minúsculas.')
  }

  // 5. Guardar/actualizar la cuenta en la caché local del dispositivo
  const accounts = getAllAccounts()
  const existingIdx = accounts.findIndex((a) => a.email && a.email.toLowerCase() === trimmedEmail)
  if (existingIdx >= 0) {
    accounts[existingIdx] = { ...accounts[existingIdx], ...found }
  } else {
    accounts.push(found)
  }
  saveAllAccounts(accounts)

  // 6. Sincronizar tareas y calendarios guardados en la nube hacia este dispositivo
  if (found.tasks && Array.isArray(found.tasks) && found.tasks.length > 0) {
    try {
      localStorage.setItem('app_global_tasks', JSON.stringify(found.tasks))
      localStorage.setItem(`studenthub_tasks_${found.uid}`, JSON.stringify(found.tasks))
      window.dispatchEvent(new CustomEvent('global_tasks_updated', { detail: found.tasks }))
    } catch (e) {}
  }
  if (found.calendars && Array.isArray(found.calendars) && found.calendars.length > 0) {
    try {
      localStorage.setItem(`studenthub_calendars_${found.uid}`, JSON.stringify(found.calendars))
    } catch (e) {}
  }

  // 7. Si la cuenta solo existía en local (por ejemplo creada offline), subirla a Firestore para que quede en la nube
  try {
    if (db) {
      setDoc(doc(db, 'shared_calendars', docId), found, { merge: true }).catch(() => {})
    }
  } catch (e) {}

  localStorage.setItem('studenthub_is_authenticated', 'true')
  setActiveUser(found)
  return found
}

// Enviar correo de bienvenida con enlace a la web de descarga
export const sendWelcomeEmail = async (user) => {
  if (!user || !user.email) return null
  const downloadUrl = 'https://apphub-download.vercel.app'

  const emailPayload = {
    id: 'mail-' + Date.now(),
    to: user.email,
    name: user.displayName || user.email.split('@')[0],
    subject: '¡Bienvenido a StudentHub! Enlace de descarga oficial',
    timestamp: new Date().toISOString(),
    downloadUrl,
    content: `Hola ${user.displayName || 'Usuario'},\n\n¡Gracias por crear tu cuenta en StudentHub!\n\nPuedes descargar la aplicación oficial para todos tus dispositivos (Android, iOS y PC) desde nuestra web:\n${downloadUrl}\n\n¡Que disfrutes al máximo de tu nuevo espacio de productividad!\n\nEl equipo de StudentHub`,
  }

  try {
    const raw = localStorage.getItem('apphub_welcome_emails') || '[]'
    const list = JSON.parse(raw)
    list.unshift(emailPayload)
    localStorage.setItem('apphub_welcome_emails', JSON.stringify(list))
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apphub_welcome_email_sent', { detail: emailPayload }))
  }

  try {
    fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload),
    }).catch(() => {})
  } catch (e) {}

  return emailPayload
}

// Registrar nueva cuenta de usuario en Firebase Firestore Cloud y caché local
export const registerUser = async (email, password, displayName = '') => {
  const trimmedEmail = (email || '').trim().toLowerCase()
  if (!trimmedEmail) {
    throw new Error('Por favor, introduce un correo electrónico válido')
  }

  const docId = getAccountDocId(trimmedEmail)

  // 1. Comprobar si ya existe en la nube Firestore
  try {
    if (db) {
      const snap = await getDoc(doc(db, 'shared_calendars', docId))
      if (snap.exists()) {
        throw new Error(
          'Ya existe una cuenta registrada con este correo electrónico. Por favor, inicia sesión con tu contraseña.'
        )
      }
    }
  } catch (err) {
    if (err.message && err.message.includes('Ya existe')) {
      throw err
    }
  }

  // 2. Comprobar si ya existe en la caché local
  const accounts = getAllAccounts()
  if (accounts.some((a) => a.email && a.email.toLowerCase() === trimmedEmail)) {
    throw new Error('Ya existe una cuenta registrada con este correo electrónico. Inicia sesión con tu contraseña.')
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
    updatedAt: new Date().toISOString(),
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

  // 3. Guardar en la nube Firestore de forma inmediata
  try {
    if (db) {
      await setDoc(doc(db, 'shared_calendars', docId), newUser)
      console.log('[Cloud Auth]: Nueva cuenta guardada en Firebase Firestore:', docId)
    }
  } catch (cloudErr) {
    console.warn('[Cloud Auth]: Error al guardar cuenta en Firestore:', cloudErr.message)
  }

  // 4. Guardar en la caché local de este dispositivo
  accounts.push(newUser)
  saveAllAccounts(accounts)
  localStorage.setItem('studenthub_is_authenticated', 'true')
  setActiveUser(newUser)

  // 5. Enviar correo de bienvenida
  try {
    await sendWelcomeEmail(newUser)
  } catch (err) {
    console.warn('Error emitiendo correo de bienvenida:', err)
  }

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

// Eliminar una cuenta guardada en el dispositivo y en la nube
export const deleteAccount = async (uid) => {
  let accounts = getAllAccounts()
  const target = accounts.find((a) => a.uid === uid)
  accounts = accounts.filter((a) => a.uid !== uid)
  saveAllAccounts(accounts)

  // Eliminar de Firestore en la nube
  if (target && target.email) {
    try {
      if (db) {
        const docId = getAccountDocId(target.email)
        await deleteDoc(doc(db, 'shared_calendars', docId))
        console.log('[Cloud Auth]: Cuenta eliminada de Firestore Cloud:', docId)
      }
    } catch (e) {
      console.warn('Error eliminando cuenta en Firestore:', e)
    }
  }

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

// Actualizar datos del perfil activo en local y en la nube
export const updateUserProfileData = async (data) => {
  const current = getCurrentUser()
  const accounts = getAllAccounts()
  const index = accounts.findIndex((a) => a.uid === current.uid)

  const updated = { ...current, ...data, updatedAt: new Date().toISOString() }

  if (index >= 0) {
    accounts[index] = updated
    saveAllAccounts(accounts)
  }

  setActiveUser(updated)

  // Sincronizar en la nube
  if (current.email) {
    try {
      if (db) {
        const docId = getAccountDocId(current.email)
        await setDoc(doc(db, 'shared_calendars', docId), updated, { merge: true })
      }
    } catch (e) {
      console.warn('Error sincronizando perfil en Firestore:', e)
    }
  }

  return updated
}

// Cerrar sesión
export const logoutUser = async () => {
  localStorage.setItem('studenthub_is_authenticated', 'false')
  localStorage.removeItem('app_global_tasks')
  return setActiveUser(GUEST_USER)
}

// Obtener tareas del usuario actual
export const getUserTasks = (user = getCurrentUser()) => {
  try {
    if (isGuestUser(user)) {
      const rawGuest = localStorage.getItem('studenthub_guest_tasks')
      if (rawGuest !== null) {
        const parsed = JSON.parse(rawGuest)
        if (Array.isArray(parsed)) return parsed
      }
      return []
    }
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

// Guardar tareas en la partición del usuario
export const saveUserTasks = (tasks, user = getCurrentUser()) => {
  try {
    if (isGuestUser(user)) {
      localStorage.setItem('studenthub_guest_tasks', JSON.stringify(tasks))
      return
    }
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

// Obtener calendarios del usuario actual
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

// Sincronizar tareas del usuario activo con la nube (Firestore Cloud)
export const syncTasksToCloud = async (tasks) => {
  try {
    const current = getCurrentUser()
    if (!current || isGuestUser(current) || !current.email) return

    // 1. Guardar en caché local
    const accounts = getAllAccounts()
    const idx = accounts.findIndex((a) => a.uid === current.uid)
    if (idx >= 0) {
      accounts[idx].tasks = tasks
      saveAllAccounts(accounts)
    }

    // 2. Guardar en Firestore en la nube para sincronización en tiempo real
    if (db) {
      const docId = getAccountDocId(current.email)
      await setDoc(
        doc(db, 'shared_calendars', docId),
        { tasks, updatedAt: new Date().toISOString() },
        { merge: true }
      )
    }
  } catch (e) {
    console.warn('Error sincronizando tareas en la nube:', e)
  }
}

// Sincronizar calendarios del usuario activo con la nube (Firestore Cloud)
export const syncCalendarsToCloud = async (calendars) => {
  try {
    const current = getCurrentUser()
    if (!current || isGuestUser(current) || !current.email) return

    // 1. Guardar en caché local
    const accounts = getAllAccounts()
    const idx = accounts.findIndex((a) => a.uid === current.uid)
    if (idx >= 0) {
      accounts[idx].calendars = calendars
      saveAllAccounts(accounts)
    }

    // 2. Guardar en Firestore en la nube
    if (db) {
      const docId = getAccountDocId(current.email)
      await setDoc(
        doc(db, 'shared_calendars', docId),
        { calendars, updatedAt: new Date().toISOString() },
        { merge: true }
      )
    }
  } catch (e) {
    console.warn('Error sincronizando calendarios en la nube:', e)
  }
}

// Cargar datos remotos del usuario activo desde la nube
export const loadUserDataFromCloud = async () => {
  try {
    const current = getCurrentUser()
    if (!current || isGuestUser(current) || !current.email) return null

    // 1. Consultar Firestore Cloud
    if (db) {
      const docId = getAccountDocId(current.email)
      const snap = await getDoc(doc(db, 'shared_calendars', docId))
      if (snap.exists()) {
        const cloudData = snap.data()
        if (cloudData.tasks && Array.isArray(cloudData.tasks)) {
          localStorage.setItem('app_global_tasks', JSON.stringify(cloudData.tasks))
          localStorage.setItem(`studenthub_tasks_${current.uid}`, JSON.stringify(cloudData.tasks))
        }
        if (cloudData.calendars && Array.isArray(cloudData.calendars)) {
          localStorage.setItem(`studenthub_calendars_${current.uid}`, JSON.stringify(cloudData.calendars))
        }
        return {
          tasks: cloudData.tasks || null,
          calendars: cloudData.calendars || null,
        }
      }
    }

    // 2. Fallback local
    const accounts = getAllAccounts()
    const found = accounts.find((a) => a.uid === current.uid)
    if (found) {
      return {
        tasks: found.tasks || null,
        calendars: found.calendars || null,
      }
    }
  } catch (e) {
    console.warn('Error cargando datos de usuario desde la nube:', e)
  }
  return null
}

// Auto-migración en segundo plano: sube a Firestore cualquier cuenta que estuviera guardada previamente solo en este dispositivo
export const syncLocalAccountsToCloud = async () => {
  try {
    if (!db || typeof window === 'undefined') return
    const localAccounts = getAllAccounts()
    for (const acc of localAccounts) {
      if (acc && acc.email && acc.uid && acc.uid !== 'guest' && acc.uid !== 'user-jorge') {
        const docId = getAccountDocId(acc.email)
        const snap = await getDoc(doc(db, 'shared_calendars', docId))
        if (!snap.exists()) {
          console.log('[Cloud Auth Migration]: Subiendo cuenta previa a Firestore Cloud:', acc.email)
          await setDoc(doc(db, 'shared_calendars', docId), acc)
        }
      }
    }
  } catch (e) {
    console.warn('[Cloud Auth Migration Error]:', e.message)
  }
}

// Disparar auto-migración tras el arranque
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncLocalAccountsToCloud().catch(() => {})
  }, 1500)
}
