// Servicio Universal de Sincronización en Tiempo Real para Calendarios Compartidos
// Admite sincronización multi-pestaña inmediata (BroadcastChannel),
// sincronización mediante el servidor local/bridge (SSE + HTTP)
// y sincronización en la nube con Firebase Firestore.

const BROADCAST_CHANNEL_NAME = 'studenthub_shared_calendars_channel'
const SHARED_STORE_PREFIX = 'studenthub_shared_calendar_'
const FIREBASE_CONFIG_KEY = 'studenthub_custom_firebase_config'

let broadcastChannel = null
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
  }
} catch (e) {
  console.warn('BroadcastChannel no soportado en este entorno:', e)
}

// Generar código único y amigable tipo: HUB-CAL-8F42-9D17
export function generateShareCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let part1 = ''
  let part2 = ''
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length))
    part2 += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `HUB-CAL-${part1}-${part2}`
}

// Limpiar y normalizar códigos pegados por el usuario
export function normalizeShareCode(rawInput) {
  if (!rawInput) return ''
  let str = rawInput.trim()
  // Si pegó una URL completa tipo https://.../?connectCode=HUB-CAL-XXXX-YYYY
  const urlMatch = str.match(/[?&]connectCode=([a-zA-Z0-9_-]+)/i)
  if (urlMatch) {
    str = urlMatch[1]
  }
  return str.toUpperCase().trim()
}

// Obtener datos guardados de un calendario compartido en el almacén local
export function getLocalSharedCalendarData(shareCode) {
  if (!shareCode) return null
  const code = normalizeShareCode(shareCode)
  try {
    const raw = localStorage.getItem(`${SHARED_STORE_PREFIX}${code}`)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return null
}

// Guardar datos en el almacén local compartido
export function saveLocalSharedCalendarData(shareCode, calendarData, events = []) {
  if (!shareCode) return
  const code = normalizeShareCode(shareCode)
  const payload = {
    shareCode: code,
    calendar: calendarData,
    events: events,
    updatedAt: Date.now(),
  }
  try {
    localStorage.setItem(`${SHARED_STORE_PREFIX}${code}`, JSON.stringify(payload))
  } catch (e) {}
  return payload
}

// Publicar actualización en tiempo real (BroadcastChannel + Servidor Puente + Firebase)
export async function publishSharedCalendarUpdate(shareCode, calendarData, events = []) {
  if (!shareCode) return
  const code = normalizeShareCode(shareCode)
  const payload = saveLocalSharedCalendarData(code, calendarData, events)

  // 1. Notificar a todas las ventanas / pestañas locales en tiempo real (<1ms)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'SHARED_CALENDAR_UPDATED',
        payload,
      })
    } catch (e) {}
  }

  // 2. Notificar al servidor puente local o proxy si está disponible
  try {
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''
    await fetch(`${apiBase}/api/shared-calendars/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  } catch (e) {}

  // 3. Notificar a Firebase Firestore si está configurado en la nube
  try {
    await publishToFirestore(code, calendarData, events)
  } catch (e) {}

  return payload
}

// Obtener datos de un calendario compartido desde el servidor o almacén
export async function fetchSharedCalendar(shareCode) {
  const code = normalizeShareCode(shareCode)
  if (!code) throw new Error('Código de calendario inválido')

  // Probar primero desde el servidor puente
  try {
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''
    const res = await fetch(`${apiBase}/api/shared-calendars/get?code=${encodeURIComponent(code)}`)
    if (res.ok) {
      const data = await res.json()
      if (data && data.calendar) {
        saveLocalSharedCalendarData(code, data.calendar, data.events || [])
        return data
      }
    }
  } catch (e) {}

  // Probar desde Firebase Firestore
  try {
    const firestoreData = await fetchFromFirestore(code)
    if (firestoreData && firestoreData.calendar) {
      saveLocalSharedCalendarData(code, firestoreData.calendar, firestoreData.events || [])
      return firestoreData
    }
  } catch (e) {}

  // Probar desde almacén local
  const local = getLocalSharedCalendarData(code)
  if (local && local.calendar) {
    return local
  }

  throw new Error(`No se encontró ningún calendario compartido con el código "${code}". Asegúrate de que el código esté bien escrito.`)
}

// Suscribirse a cambios en tiempo real de un calendario compartido
export function subscribeToSharedCalendar(shareCode, onUpdate) {
  const code = normalizeShareCode(shareCode)
  if (!code || typeof onUpdate !== 'function') return () => {}

  // Handler para BroadcastChannel
  const handleBroadcast = (event) => {
    if (event.data?.type === 'SHARED_CALENDAR_UPDATED' && event.data.payload?.shareCode === code) {
      onUpdate(event.data.payload.calendar, event.data.payload.events || [])
    }
  }

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast)
  }

  // Handler para SSE del servidor puente
  let eventSource = null
  try {
    const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''
    eventSource = new EventSource(`${apiBase}/api/shared-calendars/stream?code=${encodeURIComponent(code)}`)
    eventSource.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data)
        if (parsed.type === 'shared_calendar_updated' && parsed.shareCode === code) {
          onUpdate(parsed.calendar, parsed.events || [])
        }
      } catch (e) {}
    }
  } catch (e) {}

  // Handler para Firestore onSnapshot (si está activo)
  let unsubscribeFirestore = () => {}
  try {
    unsubscribeFirestore = subscribeToFirestore(code, onUpdate)
  } catch (e) {}

  // Retornar función de limpieza
  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast)
    }
    if (eventSource) {
      eventSource.close()
    }
    if (typeof unsubscribeFirestore === 'function') {
      unsubscribeFirestore()
    }
  }
}

// Configuración opcional de Firebase Firestore para conexión en la nube entre diferentes dispositivos
export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return null
}

export function saveStoredFirebaseConfig(config) {
  try {
    if (!config) {
      localStorage.removeItem(FIREBASE_CONFIG_KEY)
      return
    }
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config))
  } catch (e) {}
}

let firestoreDb = null

async function getFirestoreInstance() {
  if (firestoreDb) return firestoreDb
  try {
    const config = getStoredFirebaseConfig()
    if (!config || !config.apiKey || !config.projectId) return null

    const { initializeApp, getApps } = await import('firebase/app')
    const { getFirestore } = await import('firebase/firestore')

    let app
    const apps = getApps()
    if (apps.length > 0) {
      app = apps[0]
    } else {
      app = initializeApp(config)
    }
    firestoreDb = getFirestore(app)
    return firestoreDb
  } catch (e) {
    console.warn('No se pudo inicializar Firestore:', e)
    return null
  }
}

async function publishToFirestore(code, calendar, events) {
  const db = await getFirestoreInstance()
  if (!db) return
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'shared_calendars', code), {
    shareCode: code,
    calendar,
    events,
    updatedAt: Date.now(),
  })
}

async function fetchFromFirestore(code) {
  const db = await getFirestoreInstance()
  if (!db) return null
  const { doc, getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(db, 'shared_calendars', code))
  if (snap.exists()) {
    return snap.data()
  }
  return null
}

function subscribeToFirestore(code, onUpdate) {
  let unsub = () => {}
  getFirestoreInstance().then(async (db) => {
    if (!db) return
    const { doc, onSnapshot } = await import('firebase/firestore')
    unsub = onSnapshot(doc(db, 'shared_calendars', code), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        if (data && data.calendar) {
          onUpdate(data.calendar, data.events || [])
        }
      }
    })
  }).catch(() => {})

  return () => unsub()
}
