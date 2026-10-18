export const RENDER_BACKEND_URL = 'https://freestudentapphub.onrender.com'

export function getApiBase() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin || ''
    const proto = window.location.protocol || ''
    const host = window.location.hostname || ''

    // Si ya estamos navegando en la web alojada en Render, usar endpoints relativos
    if (origin.includes('onrender.com')) {
      return ''
    }

    // Si estamos en la app móvil (.apk en Capacitor/Android), app de escritorio (.exe en Electron),
    // o cualquier entorno fuera del host de Render (Vercel, localhost, file://, capacitor://)
    if (
      proto === 'file:' ||
      proto === 'capacitor:' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      origin.includes('vercel.app')
    ) {
      return RENDER_BACKEND_URL
    }
  }
  return RENDER_BACKEND_URL
}

export const API_BASE = getApiBase()

export async function getBaileysStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/status`)
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}
  return { status: 'disconnected', qrCode: null, pairingCode: null, user: null, phone: null }
}

export async function requestBaileysConnect(phoneNumber = null) {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}
  return { status: 'connecting', qrCode: null, pairingCode: null }
}

export async function requestBaileysPairingCode(phoneNumber) {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/pairing-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    })
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}
  return { status: 'connecting', pairingCode: null }
}

export async function requestBaileysDisconnect() {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/disconnect`, { method: 'POST' })
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}
  return { status: 'disconnected', qrCode: null, pairingCode: null }
}

export async function getBaileysRecentTasks() {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/recent-tasks`)
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}
  return []
}

export async function sendBaileysMessage({ to, text }) {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text }),
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function syncBaileysTasks(tasks, options = {}) {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/sync-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tasks,
        replace: Boolean(options?.replace),
        deletedIds: Array.isArray(options?.deletedIds) ? options.deletedIds : [],
      }),
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function testBaileysChat(text) {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/chat-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    return await res.json()
  } catch (e) {
    return { reply: `Error: ${e.message}`, isNewTask: false, newTasks: [] }
  }
}

export async function triggerMidnightBriefing() {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/trigger-midnight-briefing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function deleteBaileysTask(id) {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/delete-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

// Suscribirse a actualizaciones en tiempo real instantáneas (<50ms) vía Server-Sent Events
export function subscribeToBaileysLiveUpdates(onTasksUpdated, onStatusUpdated) {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return () => {}
  }

  let es = null
  let reconnectTimeout = null
  let isClosed = false

  function connect() {
    if (isClosed) return
    try {
      const url = `${API_BASE}/api/baileys/events-stream`
      es = new EventSource(url)

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'tasks_updated' && Array.isArray(data.tasks)) {
            if (typeof onTasksUpdated === 'function') {
              onTasksUpdated(data.tasks, data.deletedIds || [])
            }
          } else if (data.type === 'status_updated' && data.status) {
            if (typeof onStatusUpdated === 'function') {
              onStatusUpdated(data.status)
            }
          }
        } catch (e) {}
      }

      es.onerror = () => {
        if (es) {
          try {
            es.close()
          } catch (e) {}
          es = null
        }
        if (!isClosed) {
          reconnectTimeout = setTimeout(connect, 3000)
        }
      }
    } catch (err) {
      if (!isClosed) {
        reconnectTimeout = setTimeout(connect, 3000)
      }
    }
  }

  connect()

  return () => {
    isClosed = true
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    if (es) {
      try {
        es.close()
      } catch (e) {}
    }
  }
}

export async function syncBaileysCalendars(calendars) {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/sync-calendars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendars }),
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function getBaileysBotSettings() {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/bot-settings`)
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}
  return null
}

export async function saveBaileysBotSettings(settings) {
  try {
    const res = await fetch(`${API_BASE}/api/baileys/bot-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}



