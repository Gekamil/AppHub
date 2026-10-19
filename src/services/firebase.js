// Servicio de Base de Datos y Autenticacion Persistente en la Nube para StudentHub
// Sincronizado en tiempo real con Firebase Firestore entre todos los dispositivos (Android, iOS, PC y Web)
// Con deduplicación automática, unificación estricta de cuentas por correo y preservación de tareas

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
// Aplica deduplicación y fusión estricta por correo para no tener cuentas duplicadas ni perder tareas
export const getAllAccounts = () => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_DB_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        // Purgar rastro de cuentas demo o de prueba
        const valid = parsed.filter(
          (acc) =>
            acc &&
            acc.email &&
            acc.uid &&
            acc.uid !== 'user-jorge' &&
            acc.uid !== 'guest' &&
            acc.email !== 'jorge.m@focushub.workspace' &&
            acc.email !== 'invitado@studenthub.app'
        )

        // Fusión estricta y deduplicación por correo: una sola cuenta por email
        const accountsByEmail = new Map()

        for (const acc of valid) {
          const emailKey = acc.email.trim().toLowerCase()

          // Recuperar tareas que pudieran estar guardadas en localStorage bajo este uid
          let localUidTasks = []
          try {
            const rawT = localStorage.getItem(`studenthub_tasks_${acc.uid}`)
            if (rawT) {
              const parsedT = JSON.parse(rawT)
              if (Array.isArray(parsedT)) localUidTasks = parsedT
            }
          } catch (e) {}

          // Recuperar tareas de app_global_tasks como respaldo
          let globalTasksBackup = []
          try {
            const rawG = localStorage.getItem('app_global_tasks')
            if (rawG) {
              const parsedG = JSON.parse(rawG)
              if (Array.isArray(parsedG)) globalTasksBackup = parsedG
            }
          } catch (e) {}

          if (!accountsByEmail.has(emailKey)) {
            const combinedTasks = [...(acc.tasks || []), ...localUidTasks, ...globalTasksBackup]
            const taskMap = new Map()
            combinedTasks.forEach((t) => { if (t && t.id) taskMap.set(String(t.id), t) })

            accountsByEmail.set(emailKey, {
              ...acc,
              email: emailKey,
              tasks: Array.from(taskMap.values()),
            })
          } else {
            // Ya existe un registro con este mismo correo: fusionar datos para no perder absolutamente nada
            const existing = accountsByEmail.get(emailKey)

            const combinedTasks = [...(existing.tasks || []), ...(acc.tasks || []), ...localUidTasks]
            const taskMap = new Map()
            combinedTasks.forEach((t) => { if (t && t.id) taskMap.set(String(t.id), t) })

            const combinedCalendars = [...(existing.calendars || []), ...(acc.calendars || [])]
            const calMap = new Map()
            combinedCalendars.forEach((c) => { if (c && c.id) calMap.set(String(c.id), c) })

            const merged = {
              ...existing,
              displayName: existing.displayName || acc.displayName,
              password: existing.password || acc.password,
              tasks: Array.from(taskMap.values()),
              calendars: Array.from(calMap.values()),
              updatedAt: new Date().toISOString(),
            }
            accountsByEmail.set(emailKey, merged)
          }
        }

        const cleanList = Array.from(accountsByEmail.values())
        if (cleanList.length !== parsed.length) {
          localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(cleanList))
        }
        return cleanList
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
        // Asegurarse de retornar la versión canónica y fusionada si existe en getAllAccounts()
        const accounts = getAllAccounts()
        const canonical = accounts.find((a) => a.email && a.email.toLowerCase() === user.email.toLowerCase())
        if (canonical) {
          return canonical
        }
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

// Iniciar sesión con email y contraseña consultando Firestore Cloud y fusionando datos locales
export const loginUser = async (email, password) => {
  const trimmedEmail = (email || '').trim().toLowerCase()
  if (!trimmedEmail) {
    throw new Error('Por favor, introduce tu correo electrónico')
  }

  const docId = getAccountDocId(trimmedEmail)
  let cloudAccount = null

  // 1. Consultar en la base de datos en la nube (Firestore) para soporte multidispositivo real
  try {
    if (db) {
      const docRef = doc(db, 'shared_calendars', docId)
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        cloudAccount = snap.data()
        console.log('[Cloud Auth]: Cuenta recuperada con éxito desde Firestore Cloud:', trimmedEmail)
      }
    }
  } catch (cloudErr) {
    console.warn('[Cloud Auth]: Aviso al consultar cuenta en Firestore:', cloudErr.message)
  }

  // 2. Buscar en la caché local del dispositivo
  const localAccounts = getAllAccounts()
  const localAccount = localAccounts.find((a) => a.email && a.email.toLowerCase() === trimmedEmail)

  if (!cloudAccount && !localAccount) {
    throw new Error(
      'No existe ninguna cuenta registrada con ese correo electrónico. Si la creaste en otro dispositivo, comprueba que el correo esté bien escrito o pulsa en Registrarse para crearla.'
    )
  }

  // Fusionar datos de la nube con datos locales para que NINGUNA tarea se pierda
  const baseAccount = cloudAccount || localAccount
  const extraAccount = localAccount || cloudAccount

  const allTasks = [...(baseAccount.tasks || []), ...(extraAccount?.tasks || [])]
  const taskMap = new Map()
  allTasks.forEach((t) => { if (t && t.id) taskMap.set(String(t.id), t) })

  const allCals = [...(baseAccount.calendars || []), ...(extraAccount?.calendars || [])]
  const calMap = new Map()
  allCals.forEach((c) => { if (c && c.id) calMap.set(String(c.id), c) })

  const mergedUser = {
    ...baseAccount,
    displayName: baseAccount.displayName || extraAccount?.displayName,
    password: baseAccount.password || extraAccount?.password,
    tasks: Array.from(taskMap.values()),
    calendars: Array.from(calMap.values()),
    updatedAt: new Date().toISOString(),
  }

  // Validar contraseña
  if (password && mergedUser.password && mergedUser.password !== password) {
    throw new Error('Contraseña incorrecta. Por favor, revisa las mayúsculas y minúsculas.')
  }

  // Guardar en Firestore la versión combinada completa
  try {
    if (db) {
      setDoc(doc(db, 'shared_calendars', docId), mergedUser, { merge: true }).catch(() => {})
    }
  } catch (e) {}

  // Guardar en la caché local del dispositivo (asegurando una sola cuenta por email)
  const updatedAccounts = getAllAccounts().filter((a) => a.email && a.email.toLowerCase() !== trimmedEmail)
  updatedAccounts.push(mergedUser)
  saveAllAccounts(updatedAccounts)

  // Sincronizar tareas hacia localStorage para que la vista se actualice inmediatamente
  if (mergedUser.tasks && Array.isArray(mergedUser.tasks)) {
    try {
      localStorage.setItem('app_global_tasks', JSON.stringify(mergedUser.tasks))
      localStorage.setItem(`studenthub_tasks_${mergedUser.uid}`, JSON.stringify(mergedUser.tasks))
      window.dispatchEvent(new CustomEvent('global_tasks_updated', { detail: mergedUser.tasks }))
    } catch (e) {}
  }
  if (mergedUser.calendars && Array.isArray(mergedUser.calendars)) {
    try {
      localStorage.setItem(`studenthub_calendars_${mergedUser.uid}`, JSON.stringify(mergedUser.calendars))
    } catch (e) {}
  }

  localStorage.setItem('studenthub_is_authenticated', 'true')
  setActiveUser(mergedUser)
  return mergedUser
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
// Si ya existía una cuenta con ese correo, fusiona de forma inteligente y loguea automáticamente
export const registerUser = async (email, password, displayName = '') => {
  const trimmedEmail = (email || '').trim().toLowerCase()
  if (!trimmedEmail) {
    throw new Error('Por favor, introduce un correo electrónico válido')
  }

  const docId = getAccountDocId(trimmedEmail)

  // 1. Comprobar si ya existe en la nube Firestore
  let existingCloud = null
  try {
    if (db) {
      const snap = await getDoc(doc(db, 'shared_calendars', docId))
      if (snap.exists()) {
        existingCloud = snap.data()
      }
    }
  } catch (err) {}

  // 2. Comprobar si ya existe en la caché local
  const accounts = getAllAccounts()
  const existingLocal = accounts.find((a) => a.email && a.email.toLowerCase() === trimmedEmail)

  // Si ya existe (en local o en Firestore), fusionar de forma inteligente para no crear duplicados ni borrar tareas
  if (existingCloud || existingLocal) {
    const base = existingCloud || existingLocal
    const extra = existingLocal || existingCloud

    const allTasks = [...(base.tasks || []), ...(extra?.tasks || [])]
    const taskMap = new Map()
    allTasks.forEach((t) => { if (t && t.id) taskMap.set(String(t.id), t) })

    const allCals = [...(base.calendars || []), ...(extra?.calendars || [])]
    const calMap = new Map()
    allCals.forEach((c) => { if (c && c.id) calMap.set(String(c.id), c) })

    const mergedUser = {
      ...base,
      displayName: displayName.trim() || base.displayName || trimmedEmail.split('@')[0],
      password: password || base.password || '123456',
      tasks: Array.from(taskMap.values()),
      calendars: Array.from(calMap.values()),
      updatedAt: new Date().toISOString(),
    }

    try {
      if (db) {
        await setDoc(doc(db, 'shared_calendars', docId), mergedUser, { merge: true })
      }
    } catch (e) {}

    const cleanList = accounts.filter((a) => a.email && a.email.toLowerCase() !== trimmedEmail)
    cleanList.push(mergedUser)
    saveAllAccounts(cleanList)

    if (mergedUser.tasks && mergedUser.tasks.length > 0) {
      try {
        localStorage.setItem('app_global_tasks', JSON.stringify(mergedUser.tasks))
        localStorage.setItem(`studenthub_tasks_${mergedUser.uid}`, JSON.stringify(mergedUser.tasks))
        window.dispatchEvent(new CustomEvent('global_tasks_updated', { detail: mergedUser.tasks }))
      } catch (e) {}
    }
    if (mergedUser.calendars && mergedUser.calendars.length > 0) {
      try {
        localStorage.setItem(`studenthub_calendars_${mergedUser.uid}`, JSON.stringify(mergedUser.calendars))
      } catch (e) {}
    }

    localStorage.setItem('studenthub_is_authenticated', 'true')
    setActiveUser(mergedUser)
    return mergedUser
  }

  // Si es una cuenta 100% nueva:
  const defaultCalendars = [
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
      id: 'cal-university',
      name: 'Universidad & Estudios',
      color: '#8b5cf6',
      dot: 'bg-purple-500',
      sharedFrom: [],
      syncUrl: '',
    },
    {
      id: 'cal-health',
      name: 'Salud & Deporte',
      color: '#10b981',
      dot: 'bg-emerald-500',
      sharedFrom: [],
      syncUrl: '',
    },
    {
      id: 'cal-work',
      name: 'Trabajo & Proyectos',
      color: '#f59e0b',
      dot: 'bg-amber-500',
      sharedFrom: [],
      syncUrl: '',
    },
  ]

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
    calendars: defaultCalendars,
    tasks: [],
  }

  // Guardar en Firestore Cloud
  try {
    if (db) {
      await setDoc(doc(db, 'shared_calendars', docId), newUser)
      console.log('[Cloud Auth]: Nueva cuenta guardada en Firebase Firestore:', docId)
    }
  } catch (cloudErr) {
    console.warn('[Cloud Auth]: Error al guardar cuenta en Firestore:', cloudErr.message)
  }

  // Guardar en la caché local
  const cleanList = accounts.filter((a) => a.email && a.email.toLowerCase() !== trimmedEmail)
  cleanList.push(newUser)
  saveAllAccounts(cleanList)

  localStorage.setItem('studenthub_is_authenticated', 'true')
  setActiveUser(newUser)

  try {
    await sendWelcomeEmail(newUser)
  } catch (err) {}

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
    // Restaurar tareas en app_global_tasks
    if (target.tasks && Array.isArray(target.tasks)) {
      try {
        localStorage.setItem('app_global_tasks', JSON.stringify(target.tasks))
        localStorage.setItem(`studenthub_tasks_${target.uid}`, JSON.stringify(target.tasks))
        window.dispatchEvent(new CustomEvent('global_tasks_updated', { detail: target.tasks }))
      } catch (e) {}
    }
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
    if (found && Array.isArray(found.tasks) && found.tasks.length > 0) {
      return found.tasks
    }
    const rawLocal = localStorage.getItem(`studenthub_tasks_${user.uid}`)
    if (rawLocal !== null) {
      const parsed = JSON.parse(rawLocal)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    // Fallback a app_global_tasks
    const rawGlobal = localStorage.getItem('app_global_tasks')
    if (rawGlobal !== null) {
      const parsed = JSON.parse(rawGlobal)
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

// Calendarios por defecto del sistema
export const DEFAULT_USER_CALENDARS = [
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
    id: 'cal-university',
    name: 'Universidad & Estudios',
    color: '#8b5cf6',
    dot: 'bg-purple-500',
    sharedFrom: [],
    syncUrl: '',
  },
  {
    id: 'cal-health',
    name: 'Salud & Deporte',
    color: '#10b981',
    dot: 'bg-emerald-500',
    sharedFrom: [],
    syncUrl: '',
  },
  {
    id: 'cal-work',
    name: 'Trabajo & Proyectos',
    color: '#f59e0b',
    dot: 'bg-amber-500',
    sharedFrom: [],
    syncUrl: '',
  },
]

// Obtener calendarios del usuario actual
export const getUserCalendars = (user = getCurrentUser()) => {
  try {
    if (isGuestUser(user)) {
      const rawGuest = localStorage.getItem('studenthub_guest_calendars')
      if (rawGuest !== null) {
        const parsed = JSON.parse(rawGuest)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
      return DEFAULT_USER_CALENDARS
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
  return DEFAULT_USER_CALENDARS
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
    // Sincronizar automáticamente en la nube Firestore
    syncCalendarsToCloud(calendars).catch(() => {})
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
          // Fusionar con los calendarios locales para NUNCA borrar creaciones locales
          const localCals = getUserCalendars(current)
          const mergedCalsMap = new Map()
          localCals.forEach((c) => { if (c && c.id) mergedCalsMap.set(c.id, c) })
          cloudData.calendars.forEach((c) => {
            if (c && c.id) {
              if (!mergedCalsMap.has(c.id)) {
                mergedCalsMap.set(c.id, c)
              } else {
                mergedCalsMap.set(c.id, { ...c, ...mergedCalsMap.get(c.id) })
              }
            }
          })
          const mergedCals = Array.from(mergedCalsMap.values())
          localStorage.setItem(`studenthub_calendars_${current.uid}`, JSON.stringify(mergedCals))
          cloudData.calendars = mergedCals
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
// y fusiona tareas para que no se pierdan
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
        } else {
          // Si ya existe en la nube, asegurar que las tareas locales se fusionen y no se pierdan
          const cloudData = snap.data()
          const combined = [...(cloudData.tasks || []), ...(acc.tasks || [])]
          const taskMap = new Map()
          combined.forEach((t) => { if (t && t.id) taskMap.set(String(t.id), t) })
          if (taskMap.size > (cloudData.tasks || []).length) {
            console.log('[Cloud Auth Migration]: Sincronizando tareas locales adicionales a Firestore:', acc.email)
            await setDoc(doc(db, 'shared_calendars', docId), { tasks: Array.from(taskMap.values()) }, { merge: true })
          }
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
