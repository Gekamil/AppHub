// Puente Local de WhatsApp con Baileys (Protocolo WhatsApp Web Oficial)
// Cada usuario actúa como su propio servidor en local (0 € de coste, 0 servidores externos)
// Sin bloqueos de Meta, sin pedir CIF ni verificación de empresa
// Incluye IA Conversacional Completa, Whisper Audio, Renombrado/Corrección,
// Planificación Compacta de Calendario, Memoria Acumulativa por Lotes y Briefing de Medianoche (00:00).

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  extractMessageContent,
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import pino from 'pino'
import path from 'path'
import fs from 'fs'
import http from 'http'

const AUTH_DIR = path.resolve(process.cwd(), '.whatsapp_auth')
const TASKS_FILE = path.resolve(process.cwd(), '.whatsapp_synced_tasks.json')
const SHARED_CALENDARS_FILE = path.resolve(process.cwd(), '.whatsapp_shared_calendars.json')
const BOT_SETTINGS_FILE = path.resolve(process.cwd(), '.whatsapp_bot_settings.json')
const USER_CALENDARS_FILE = path.resolve(process.cwd(), '.whatsapp_user_calendars.json')

export const DEFAULT_USER_CALENDARS = [
  { id: 'cal-default', name: 'Personal & General', color: '#3b82f6', keywords: ['personal', 'general', 'casa', 'compra', 'quedada', 'cena', 'amigos'] },
  { id: 'cal-university', name: 'Universidad & Estudios', color: '#8b5cf6', keywords: ['uni', 'universidad', 'examen', 'estudio', 'clase', 'profesor', 'entrega', 'ia', 'redes'] },
  { id: 'cal-health', name: 'Salud & Deporte', color: '#10b981', keywords: ['gym', 'gimnasio', 'deporte', 'pádel', 'padel', 'entreno', 'entrenamiento', 'correr', 'partido', 'futbol'] },
  { id: 'cal-work', name: 'Trabajo & Proyectos', color: '#f59e0b', keywords: ['trabajo', 'curro', 'proyecto', 'cliente', 'reunion', 'reunión', 'deploy', 'código'] },
]

export const DEFAULT_BOT_SETTINGS = {
  mode: 'interactive', // 'interactive' (pregunta en qué calendario) | 'auto' (asigna automáticamente)
  routingRules: {
    deporte: 'cal-health',
    gym: 'cal-health',
    padel: 'cal-health',
    pádel: 'cal-health',
    entrenamiento: 'cal-health',
    universidad: 'cal-university',
    uni: 'cal-university',
    estudios: 'cal-university',
    examen: 'cal-university',
    personal: 'cal-default',
    quedadas: 'cal-default',
    amigos: 'cal-default',
    trabajo: 'cal-work',
    curro: 'cal-work',
    proyectos: 'cal-work',
  },
  pendingSelection: null, // { taskId, taskTitle, expiresAt, from }
}

function loadBotSettings() {
  try {
    if (fs.existsSync(BOT_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(BOT_SETTINGS_FILE, 'utf-8'))
      return { ...DEFAULT_BOT_SETTINGS, ...data }
    }
  } catch (e) {}
  return { ...DEFAULT_BOT_SETTINGS }
}

function saveBotSettings(settings) {
  try {
    fs.writeFileSync(BOT_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (e) {}
}

function loadUserCalendars() {
  try {
    if (fs.existsSync(USER_CALENDARS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USER_CALENDARS_FILE, 'utf-8'))
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch (e) {}
  return DEFAULT_USER_CALENDARS
}

function saveUserCalendars(cals) {
  try {
    fs.writeFileSync(USER_CALENDARS_FILE, JSON.stringify(cals, null, 2), 'utf-8')
  } catch (e) {}
}

let botSettings = loadBotSettings()
let currentKnownCalendars = loadUserCalendars()

export function matchCalendarForTask(taskTitle = '', taskContext = '', taskDesc = '') {
  const text = `${taskTitle} ${taskContext} ${taskDesc}`.toLowerCase()
  const rules = botSettings.routingRules || {}
  for (const [kw, calId] of Object.entries(rules)) {
    if (text.includes(kw.toLowerCase())) {
      const found = currentKnownCalendars.find((c) => c.id === calId)
      if (found) return found
    }
  }

  for (const cal of currentKnownCalendars) {
    if (Array.isArray(cal.keywords)) {
      for (const kw of cal.keywords) {
        if (text.includes(kw.toLowerCase())) return cal
      }
    }
    const calName = (cal.name || '').toLowerCase()
    if (text.includes(calName)) return cal
  }

  return currentKnownCalendars[0] || DEFAULT_USER_CALENDARS[0]
}

export function formatCalendarOptionsText(taskTitle = '') {
  const options = currentKnownCalendars.map((c, idx) => `[${idx + 1}] ${c.name}`).join('\n')
  return `¿En qué calendario quieres guardarlo?\n${options}\n\n_(Responde con el número [1, 2, 3...], el nombre del calendario, o escribe 'modo auto' para que decida yo directamente)_`
}

export function getHelpMessage() {
  return `*GUÍA COMPLETA DE STUDENTHUB EN WHATSAPP*

*1. Chat personal (contigo mismo)*:
- Envía notas de voz o textos: Whisper transcribe el audio al instante y la IA lo añade a tu calendario.
- Consultas rápidas: "¿Qué tengo hoy?", "¿Cuál es mi próxima clase?", "Planning de mañana".
- Modificaciones: "Cámbialo a las 18:00", "Marca como hecha la tarea de gym", "Borra el pádel".

*2. En grupos y chats con otras personas*:
- Escribe */ia* en cualquier mensaje para invocar a tu asistente sin salir del grupo.
- Ejemplos:
  - "/ia cuándo es el examen de redes?"
  - "/ia resume las tareas que tenemos para el viernes"

*3. Citar audios de otros para tu calendario*:
- Si un amigo o compañero te manda una nota de voz con una cita o plan, responde a ese audio escribiendo:
  \`/ia añade esto a mi calendario\`
- El asistente descargará y transcribirá el audio citado, detectará la fecha y la hora, y creará el evento en tu StudentHub automáticamente.

*4. Elección y enrutamiento de Calendarios*:
- *Modo interactivo* (por defecto): Cada vez que añades un evento, el bot te pregunta con opciones rápidas [1, 2, 3...] a qué calendario asignarlo.
- *Modo automático*: Asigna por categoría sin preguntar. Para activarlo dile: "activa modo automático" o "modo silencioso".
- *Reglas personalizadas en lenguaje natural*: Puedes decirle:
  _"Quiero que las cosas de deporte vayan a Salud & Deporte y las quedadas a Personal"_.
  El bot aprenderá tus preferencias y las guardará.

*Comandos rápidos*:
- */help* o *ayuda*: Muestra este manual interactivo.
- */calendarios*: Lista tus calendarios actuales y reglas activas.
- */modo auto*: Activa la asignación autónoma inmediata.
- */modo interactivo*: Activa las preguntas con selector numérico.
- */resumen*: Resumen estructurado de tu día.`
}

export function getCalendarsSummaryMessage() {
  const calsList = currentKnownCalendars.map((c, idx) => `[${idx + 1}] *${c.name}* (ID: \`${c.id}\`)`).join('\n')
  const modeText = botSettings.mode === 'auto' ? 'Automático (sin preguntar)' : 'Interactivo (pregunta con selector [1, 2, 3...])'
  const rulesList = Object.entries(botSettings.routingRules || {})
    .map(([kw, cId]) => {
      const c = currentKnownCalendars.find((x) => x.id === cId)
      return `• _${kw}_ -> ${c ? c.name : cId}`
    })
    .join('\n')

  return `*TUS CALENDARIOS EN STUDENTHUB*

${calsList}

*Modo actual*: ${modeText}
_(Dile "modo automático" o "modo interactivo" para cambiarlo)_

*Reglas de asignación activas*:
${rulesList || 'Ninguna regla personalizada.'}

_(Puedes decirle: "quiero que el deporte vaya a Salud & Deporte" para crear nuevas reglas)_`
}

function loadSharedCalendarsStore() {
  try {
    if (fs.existsSync(SHARED_CALENDARS_FILE)) {
      return JSON.parse(fs.readFileSync(SHARED_CALENDARS_FILE, 'utf-8')) || {}
    }
  } catch (e) {}
  return {}
}

function saveSharedCalendarsStore(store) {
  try {
    fs.writeFileSync(SHARED_CALENDARS_FILE, JSON.stringify(store, null, 2), 'utf-8')
  } catch (e) {}
}

let sharedCalendarsMap = loadSharedCalendarsStore()

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyACDRKCK8O50w1FIoYhBMgqsM9yYUzX-io",
  authDomain: "apphub-662ff.firebaseapp.com",
  projectId: "apphub-662ff",
  storageBucket: "apphub-662ff.firebasestorage.app",
  messagingSenderId: "674118426958",
  appId: "1:674118426958:web:2c4afc7b11219c360efe1f",
  measurementId: "G-EWQ8PRXWYX"
}

let bridgeDb = null
async function getBridgeFirestore() {
  if (bridgeDb) return bridgeDb
  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app')
    const { getFirestore } = await import('firebase/firestore')
    const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG)
    bridgeDb = getFirestore(app)
    return bridgeDb
  } catch (e) {
    console.warn('[Baileys Firestore]: Error inicializando Firebase:', e.message)
    return null
  }
}

// Restaurar archivos de sesión desde Firestore (sobrevive a despliegues y reinicios de Render)
export async function restoreAuthFromFirestore() {
  try {
    const db = await getBridgeFirestore()
    if (!db) return false
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'shared_calendars', 'baileys_auth_backup'))
    if (!snap.exists()) {
      console.log('[Baileys Cloud Persistence]: No hay sesión previa guardada en Firestore. Esperando vinculación por QR.')
      return false
    }

    const data = snap.data()
    if (!data || !data.files || typeof data.files !== 'object') {
      console.log('[Baileys Cloud Persistence]: Documento de sesión vacío en Firestore.')
      return false
    }

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true })
    }

    let count = 0
    for (const [filename, content] of Object.entries(data.files)) {
      if (filename && content && typeof content === 'string') {
        fs.writeFileSync(path.join(AUTH_DIR, filename), content, 'utf-8')
        count++
      }
    }

    console.log(`[Baileys Cloud Persistence]: ${count} archivos de autenticación restaurados desde Firestore en Render.`)
    return count > 0
  } catch (e) {
    console.warn('[Baileys Cloud Persistence]: Error al restaurar sesión desde Firestore:', e.message)
    return false
  }
}

// Respaldar sesión en Firestore para que Render nunca desconecte WhatsApp tras un git push
let backupDebounceTimer = null
export function backupAuthToFirestore() {
  if (backupDebounceTimer) clearTimeout(backupDebounceTimer)
  backupDebounceTimer = setTimeout(async () => {
    try {
      if (!fs.existsSync(AUTH_DIR)) return
      const db = await getBridgeFirestore()
      if (!db) return

      const files = fs.readdirSync(AUTH_DIR)
      const filesMap = {}
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        try {
          filesMap[file] = fs.readFileSync(path.join(AUTH_DIR, file), 'utf-8')
        } catch (readErr) {}
      }

      if (Object.keys(filesMap).length === 0) return

      const { doc, setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, 'shared_calendars', 'baileys_auth_backup'), {
        files: filesMap,
        updatedAt: Date.now(),
      })
      console.log(`[Baileys Cloud Persistence]: Sesión de WhatsApp respaldada en Firestore (${Object.keys(filesMap).length} archivos).`)
    } catch (e) {
      console.warn('[Baileys Cloud Persistence]: Error al respaldar sesión en Firestore:', e.message)
    }
  }, 2500)
}

// Borrar sesión en Firestore al desvincular explícitamente
export async function clearAuthFromFirestore() {
  try {
    const db = await getBridgeFirestore()
    if (!db) return
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'shared_calendars', 'baileys_auth_backup'))
    console.log('[Baileys Cloud Persistence]: Sesión de WhatsApp eliminada de Firestore.')
  } catch (e) {}
}

const GROQ_API_KEY = process.env.GROQ_API_KEY || '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'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_AUDIO_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'
const AI_MODEL = 'openai/gpt-oss-120b'
const WHISPER_MODEL = 'whisper-large-v3-turbo'
const DIVIDER = '- - - - - - - - - - - - - - - - - - - -'

// Estado en memoria del puente
let sock = null
let currentStatus = {
  status: 'disconnected', // 'disconnected' | 'connecting' | 'qr_ready' | 'pairing_code_ready' | 'connected'
  qrCode: null,
  pairingCode: null,
  user: null,
  phone: null,
  lastUpdated: Date.now(),
}

// Registro de mensajes enviados por el bot para evitar bucles
const sentBotMessageIds = new Set()

// Memoria conversacional multi-turno por usuario/chat (últimos 20 mensajes para retener listas)
const conversationHistories = new Map()

// Destinatario reciente y control de briefing de medianoche
let lastUserJid = null
let lastMidnightBriefingDate = null

// Cargar tareas guardadas localmente
function loadSyncedTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const data = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'))
      if (Array.isArray(data)) {
        return data.filter((t) => !t._deleted)
      }
    }
  } catch (e) {}
  return []
}

function saveSyncedTasks(tasks) {
  try {
    const toSave = (tasks || []).filter((t) => !t._deleted)
    fs.writeFileSync(TASKS_FILE, JSON.stringify(toSave, null, 2), 'utf-8')
  } catch (e) {}
}

// Historial en memoria de tareas conocidas
let currentKnownTasks = loadSyncedTasks()

// Clientes conectados por Server-Sent Events (SSE) para sincronización ultra rápida en tiempo real (<50ms)
const sseClients = new Set()

export function broadcastTasksUpdate(tasks, deletedIds = []) {
  const activeTasks = (tasks || currentKnownTasks).filter((t) => !t._deleted)
  const message = `data: ${JSON.stringify({
    type: 'tasks_updated',
    tasks: activeTasks,
    deletedIds: Array.isArray(deletedIds) ? deletedIds.map(String) : [],
    timestamp: Date.now(),
  })}\n\n`

  for (const client of sseClients) {
    try {
      client.write(message)
    } catch (err) {
      sseClients.delete(client)
    }
  }
}

export function broadcastStatusUpdate(status) {
  const message = `data: ${JSON.stringify({ type: 'status_updated', status: status || currentStatus, timestamp: Date.now() })}\n\n`
  for (const client of sseClients) {
    try {
      client.write(message)
    } catch (err) {
      sseClients.delete(client)
    }
  }
}

export function broadcastSharedCalendarUpdate(shareCode, calendar, events = []) {
  const message = `data: ${JSON.stringify({
    type: 'shared_calendar_updated',
    shareCode,
    calendar,
    events,
    timestamp: Date.now(),
  })}\n\n`
  for (const client of sseClients) {
    try {
      client.write(message)
    } catch (err) {
      sseClients.delete(client)
    }
  }
}

// Keep-alive heartbeat cada 20s para mantener abiertos los túneles y proxies (Render, Cloudflare)
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n')
    } catch (err) {
      sseClients.delete(client)
    }
  }
}, 20000)

// Sincronización entrante desde el cliente web (soporta upsert incremental o reemplazo atómico total con deletedIds)
export function updateKnownTasks(tasks, options = {}) {
  const { replace = false, deletedIds = [] } = options

  if (Array.isArray(deletedIds) && deletedIds.length > 0) {
    const delSet = new Set(deletedIds.map(String))
    currentKnownTasks = currentKnownTasks.filter((t) => !delSet.has(String(t.id)))
  }

  if (replace) {
    if (Array.isArray(tasks)) {
      currentKnownTasks = tasks
        .filter((t) => t && t.id && !t._deleted)
        .map((t) => ({
          ...t,
          updatedAt: t.updatedAt || Date.now(),
        }))
    }
    saveSyncedTasks(currentKnownTasks)
    broadcastTasksUpdate(currentKnownTasks, deletedIds)
    return
  }

  if (!Array.isArray(tasks) || tasks.length === 0) {
    if (Array.isArray(deletedIds) && deletedIds.length > 0) {
      saveSyncedTasks(currentKnownTasks)
      broadcastTasksUpdate(currentKnownTasks, deletedIds)
    }
    return
  }

  let hasModifications = Array.isArray(deletedIds) && deletedIds.length > 0
  const serverMap = new Map()
  currentKnownTasks.forEach((t) => {
    if (t.id) serverMap.set(String(t.id), t)
  })

  for (const incoming of tasks) {
    if (!incoming || !incoming.id || incoming._deleted) continue
    const sId = String(incoming.id)
    const existing = serverMap.get(sId)

    if (existing) {
      const changed =
        existing.title !== incoming.title ||
        existing.time !== incoming.time ||
        existing.date !== incoming.date ||
        existing.completed !== incoming.completed ||
        existing.description !== incoming.description ||
        existing.context !== incoming.context

      if (changed) {
        Object.assign(existing, {
          title: incoming.title || existing.title,
          time: incoming.time || existing.time,
          date: incoming.date || existing.date,
          completed: incoming.completed !== undefined ? incoming.completed : existing.completed,
          description: incoming.description !== undefined ? incoming.description : existing.description,
          effort: incoming.effort || existing.effort,
          context: incoming.context || existing.context,
          est: incoming.est || existing.est,
          color: incoming.color || existing.color,
          calendarId: incoming.calendarId || existing.calendarId,
          updatedAt: Date.now(),
        })
        hasModifications = true
      }
    } else {
      // Verificar duplicado por clave (título + fecha + hora)
      const incomingKey = `${(incoming.title || '').trim().toLowerCase()}_${incoming.date}_${incoming.time}`
      const isDuplicate = currentKnownTasks.some(
        (t) => `${(t.title || '').trim().toLowerCase()}_${t.date}_${t.time}` === incomingKey
      )
      if (!isDuplicate) {
        currentKnownTasks.push({
          ...incoming,
          updatedAt: Date.now(),
        })
        hasModifications = true
      }
    }
  }

  if (hasModifications) {
    saveSyncedTasks(currentKnownTasks)
    broadcastTasksUpdate(currentKnownTasks, deletedIds)
  }
}

// Transcripción de notas de voz y audios con Groq Whisper
export async function transcribeAudioWithWhisper(audioBuffer, mimetype = 'audio/ogg') {
  try {
    let extension = 'ogg'
    if (mimetype.includes('mp4') || mimetype.includes('m4a')) extension = 'm4a'
    else if (mimetype.includes('mp3')) extension = 'mp3'
    else if (mimetype.includes('wav')) extension = 'wav'

    const formData = new FormData()
    const blob = new Blob([audioBuffer], { type: mimetype })
    formData.append('file', blob, `voice_note.${extension}`)
    formData.append('model', WHISPER_MODEL)
    formData.append('language', 'es')
    formData.append('response_format', 'json')

    const res = await fetch(GROQ_AUDIO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Whisper API devolvió ${res.status}: ${errText}`)
    }

    const data = await res.json()
    return (data.text || '').trim()
  } catch (err) {
    console.error('[Baileys Whisper Error]:', err.message)
    throw err
  }
}

// Formatear resumen de agenda para el prompt de la IA (ordenado cronológicamente)
function formatTasksSummary(tasks) {
  const activeTasks = (tasks || []).filter((t) => !t._deleted)
  if (activeTasks.length === 0) return 'No hay tareas registradas en este momento.'
  return activeTasks
    .slice(0, 50)
    .sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '')
      if (dateCmp !== 0) return dateCmp
      return (a.time || '00:00').localeCompare(b.time || '00:00')
    })
    .map((t) => {
      const descPart = t.description ? ` • Nota: "${t.description}"` : ''
      const estPart = t.est ? ` • Duración: ${t.est}` : ''
      return `- [ID:${t.id} | ${t.date || '2026-10-14'} ${t.time || '10:00'}] "${t.title}" (${t.context || 'General'} • Esfuerzo ${t.effort || 'Medio'}${estPart}${descPart} • ${t.completed ? 'Hecha' : 'Pendiente'})`
    })
    .join('\n')
}

// Contexto dinámico de fechas exactas en el huso de España (Europe/Madrid)
export function getCalendarReferenceContext(now = new Date()) {
  let todayYmd
  let dayOfWeek
  let currentTimeStr
  try {
    const fmtDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' })
    todayYmd = fmtDate.format(now)
    const fmtDay = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long' })
    const rawD = fmtDay.format(now)
    dayOfWeek = rawD.charAt(0).toUpperCase() + rawD.slice(1)
    const fmtTime = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false })
    currentTimeStr = fmtTime.format(now)
  } catch (e) {
    todayYmd = now.toISOString().split('T')[0]
    const daysArr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    dayOfWeek = daysArr[now.getDay()]
    currentTimeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const [y, m, d] = todayYmd.split('-').map(Number)
  const baseD = new Date(y, m - 1, d, 12, 0, 0)
  const dayNum = baseD.getDay() // 0 = Domingo, 1 = Lunes...
  const diffToMonday = (dayNum === 0 ? -6 : 1) - dayNum
  const monday = new Date(baseD)
  monday.setDate(baseD.getDate() + diffToMonday)

  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const thisWeekDates = {}
  const nextWeekDates = {}

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday)
    cur.setDate(monday.getDate() + i)
    const ymd = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    thisWeekDates[dayNames[i].toLowerCase()] = ymd
  }

  for (let i = 7; i < 14; i++) {
    const cur = new Date(monday)
    cur.setDate(monday.getDate() + i)
    const ymd = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    nextWeekDates[dayNames[i - 7].toLowerCase()] = ymd
  }

  const calendarTableText = `CALENDARIO DE FECHAS OFICIALES EXACTAS (HOY ES ${dayOfWeek.toUpperCase()} ${todayYmd}):
Esta semana en curso:
- Lunes: ${thisWeekDates['lunes']}
- Martes: ${thisWeekDates['martes']}
- Miércoles: ${thisWeekDates['miércoles']}
- Jueves: ${thisWeekDates['jueves']}
- Viernes: ${thisWeekDates['viernes']}
- Sábado: ${thisWeekDates['sábado']}
- Domingo ("este domingo", "el domingo", "el fin de semana"): ${thisWeekDates['domingo']}

Próxima semana:
- Próximo Lunes: ${nextWeekDates['lunes']}
- Próximo Domingo ("el domingo que viene", "el próximo domingo"): ${nextWeekDates['domingo']}

REGLA CRUCIAL PARA ASIGNAR FECHAS ("date"):
Cuando Jorge mencione "domingo", "este domingo" o un evento para el fin de semana, ASIGNA EXACTAMENTE la fecha del domingo de esta semana: "${thisWeekDates['domingo']}".
NUNCA inventes una fecha en el pasado ni saltes al lunes ${nextWeekDates['lunes']} cuando te pida domingo.`

  return {
    todayYmd,
    dayOfWeek,
    currentTimeStr,
    thisSundayYmd: thisWeekDates['domingo'],
    thisSaturdayYmd: thisWeekDates['sábado'],
    nextSundayYmd: nextWeekDates['domingo'],
    calendarTableText,
    thisWeekDates,
  }
}

// Aplicar acciones (add, update, delete) sobre currentKnownTasks
export function applyBridgeActions(actions, source = 'whatsapp') {
  if (!Array.isArray(actions) || actions.length === 0) return []

  const modified = []
  const calRef = getCalendarReferenceContext()

  for (const act of actions) {
    if (act.type === 'add_task' && act.task) {
      const t = act.task
      let cleanDate = (t.date || '').trim()
      const mDate = cleanDate.match(/\d{4}-\d{2}-\d{2}/)
      if (mDate) {
        cleanDate = mDate[0]
      } else {
        const lowerDate = cleanDate.toLowerCase()
        if (lowerDate.includes('domingo')) {
          cleanDate = lowerDate.includes('próximo') || lowerDate.includes('proximo') || lowerDate.includes('que viene')
            ? calRef.nextSundayYmd
            : calRef.thisSundayYmd
        } else if (lowerDate.includes('sábado') || lowerDate.includes('sabado')) {
          cleanDate = calRef.thisSaturdayYmd
        } else {
          cleanDate = calRef.todayYmd
        }
      }

      const matchedCal = matchCalendarForTask(t.title, t.context, t.description)
      const chosenCalId = t.calendarId || matchedCal.id || 'cal-default'

      const newTask = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        title: t.title || 'Nueva tarea',
        date: cleanDate,
        time: t.time || '10:00',
        effort: t.effort || 'Medium',
        context: t.context || 'University',
        est: t.est || '45m',
        description: t.description || '',
        recurrence: t.recurrence || 'none',
        completed: false,
        calendarId: chosenCalId,
        color:
          t.effort === 'High'
            ? 'bg-rose-500'
            : t.effort === 'Medium'
            ? 'bg-amber-500'
            : 'bg-emerald-500',
        icon: 'task_alt',
        source,
        updatedAt: Date.now(),
      }
      currentKnownTasks = [newTask, ...currentKnownTasks]
      modified.push(newTask)

      // Si el bot está en modo interactivo, registrar para confirmación o cambio de calendario
      if (botSettings.mode === 'interactive') {
        botSettings.pendingSelection = {
          taskId: newTask.id,
          taskTitle: newTask.title,
          matchedCalId: chosenCalId,
          expiresAt: Date.now() + 15 * 60 * 1000,
        }
        saveBotSettings(botSettings)
      }
    } else if (act.type === 'update_task') {
      const targetId = act.targetId
      let targetTitle = (act.targetTitle || '').trim().toLowerCase()
      const updates = act.updates || {}

      // Si targetTitle es genérico ("el evento", "la tarea", "este evento"), ignorar como nombre literal
      const isGeneric =
        !targetTitle ||
        /^(el\s+)?(evento|tarea|actividad|cita|asunto|ultimo|último|este|esta)$/i.test(targetTitle)

      let idx = -1
      if (targetId) {
        idx = currentKnownTasks.findIndex((t) => !t._deleted && String(t.id) === String(targetId))
      }
      if (idx === -1 && targetTitle && !isGeneric) {
        // 1. Coincidencia exacta
        idx = currentKnownTasks.findIndex(
          (t) => !t._deleted && (t.title || '').trim().toLowerCase() === targetTitle
        )
        // 2. Coincidencia parcial si targetTitle >= 3 caracteres
        if (idx === -1 && targetTitle.length >= 3) {
          idx = currentKnownTasks.findIndex((t) => {
            if (t._deleted) return false
            const tName = (t.title || '').toLowerCase()
            return tName.includes(targetTitle) || targetTitle.includes(tName)
          })
        }
      }
      // 3. Si no se encontró por título o fue orden genérica, actualizar el evento más reciente
      if (idx === -1 && currentKnownTasks.length > 0) {
        let bestIdx = -1
        let maxTime = -1
        for (let i = 0; i < currentKnownTasks.length; i++) {
          const t = currentKnownTasks[i]
          if (t._deleted) continue
          const tTime = Number(t.updatedAt || t.id || 0)
          if (tTime > maxTime) {
            maxTime = tTime
            bestIdx = i
          }
        }
        idx = bestIdx
      }

      if (idx !== -1) {
        const prev = currentKnownTasks[idx]
        const updated = {
          ...prev,
          ...updates,
          _deleted: false,
          updatedAt: Date.now(),
        }
        if (updates.effort) {
          updated.color =
            updates.effort === 'High'
              ? 'bg-rose-500'
              : updates.effort === 'Medium'
              ? 'bg-amber-500'
              : 'bg-emerald-500'
        }
        currentKnownTasks[idx] = updated
        modified.push(updated)
      }
    } else if (act.type === 'delete_task' || act.type === 'delete_all_tasks') {
      const targetId = act.targetId
      let targetTitle = (act.targetTitle || '').trim().toLowerCase()
      const isDeleteAll =
        act.type === 'delete_all_tasks' ||
        targetTitle === 'todas' ||
        targetTitle === 'todos' ||
        targetTitle === 'todo' ||
        targetTitle === 'todas las tareas' ||
        targetTitle === 'todos los eventos'

      if (isDeleteAll) {
        const delIds = currentKnownTasks.map((t) => t.id)
        currentKnownTasks = []
        saveSyncedTasks(currentKnownTasks)
        broadcastTasksUpdate(currentKnownTasks, delIds)
        return []
      }

      const isGeneric =
        !targetTitle ||
        /^(el\s+)?(evento|tarea|actividad|cita|asunto|ultimo|último|este|esta)$/i.test(targetTitle)

      let idx = -1
      if (targetId) {
        idx = currentKnownTasks.findIndex((t) => !t._deleted && String(t.id) === String(targetId))
      }
      if (idx === -1 && targetTitle && !isGeneric) {
        idx = currentKnownTasks.findIndex(
          (t) => !t._deleted && (t.title || '').trim().toLowerCase() === targetTitle
        )
        if (idx === -1 && targetTitle.length >= 3) {
          idx = currentKnownTasks.findIndex((t) => {
            if (t._deleted) return false
            const tName = (t.title || '').toLowerCase()
            return tName.includes(targetTitle) || targetTitle.includes(tName)
          })
        }
      }
      if (idx === -1 && isGeneric && currentKnownTasks.length > 0) {
        let bestIdx = -1
        let maxTime = -1
        for (let i = 0; i < currentKnownTasks.length; i++) {
          const t = currentKnownTasks[i]
          if (t._deleted) continue
          const tTime = Number(t.updatedAt || t.id || 0)
          if (tTime > maxTime) {
            maxTime = tTime
            bestIdx = i
          }
        }
        idx = bestIdx
      }

      if (idx !== -1) {
        const [removed] = currentKnownTasks.splice(idx, 1)
        saveSyncedTasks(currentKnownTasks)
        broadcastTasksUpdate(currentKnownTasks, [removed.id])
        return [removed]
      }
    } else if (act.type === 'set_bot_mode') {
      botSettings.mode = act.mode === 'auto' ? 'auto' : 'interactive'
      saveBotSettings(botSettings)
    } else if (act.type === 'set_routing_rule') {
      if (act.keyword && act.calendarId) {
        if (!botSettings.routingRules) botSettings.routingRules = {}
        botSettings.routingRules[act.keyword.toLowerCase().trim()] = act.calendarId
        saveBotSettings(botSettings)
      }
    }
  }

  saveSyncedTasks(currentKnownTasks)
  broadcastTasksUpdate(currentKnownTasks)
  return modified
}

// Llamada resiliente a Groq con failover automático de modelos ante 429
async function callGroqWithFallback(payload) {
  const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']
  let lastError = null

  for (const model of models) {
    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          model,
        }),
      })

      if (res.status === 429) {
        console.warn(`[Baileys Groq]: 429 Rate limit en ${model}, reintentando con fallback...`)
        continue
      }

      if (!res.ok) {
        const errBody = await res.text()
        // Rescate si el modelo devolvió failed_generation
        try {
          const parsedErr = JSON.parse(errBody)
          if (parsedErr.error?.failed_generation) {
            const raw = parsedErr.error.failed_generation.trim()
            const jsonMatch = raw.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              try {
                const extracted = JSON.parse(jsonMatch[0])
                return { choices: [{ message: { content: JSON.stringify(extracted) } }] }
              } catch (e) {}
            }
            const actions = []
            const rectMatch = raw.match(/Nueva hora:\s*\*?([0-9]{1,2}:[0-9]{2})/i)
            const titleMatch = raw.match(/Título(?:\s+anterior)?:\s*\*?([^\n\r•]+)/i)
            if (rectMatch) {
              actions.push({
                type: 'update_task',
                targetTitle: titleMatch ? titleMatch[1].trim() : '',
                updates: { time: rectMatch[1].trim() },
              })
            }
            return { choices: [{ message: { content: JSON.stringify({ reply: raw, actions }) } }] }
          }
        } catch (recErr) {}
        throw new Error(`Groq error (${res.status}): ${errBody}`)
      }

      return await res.json()
    } catch (e) {
      lastError = e
    }
  }

  throw lastError || new Error('Todos los modelos Groq fallaron')
}

// Procesar mensaje en lenguaje natural con Groq AI
export async function processMessageWithAI(userText, fromUser = 'default') {
  const calRef = getCalendarReferenceContext()
  const todayStr = calRef.todayYmd
  const dayOfWeek = calRef.dayOfWeek
  const currentTimeStr = calRef.currentTimeStr
  const tasksSummary = formatTasksSummary(currentKnownTasks)
  const calsText = currentKnownCalendars
    .map((c, idx) => `[${idx + 1}] ID: "${c.id}" - Nombre: "${c.name}"`)
    .join('\n')
  const routingRulesText = Object.entries(botSettings.routingRules || {})
    .map(([k, v]) => `- "${k}" -> Calendario "${v}"`)
    .join('\n')

  const systemPrompt = `Eres "AI Helper", el asistente personal de élite de Jorge en su WhatsApp.
Fecha y hora actual: ${todayStr} (${dayOfWeek}), ${currentTimeStr}.
Usuario: Jorge (estudiante universitario de informática/sistemas, desarrollador tech, deportista pádel/gym, vida personal).

${calRef.calendarTableText}

CALENDARIOS ACTIVOS EN STUDENTHUB:
${calsText}

MODO DE ASIGNACIÓN ACTUAL: ${botSettings.mode === 'auto' ? 'AUTOMÁTICO (asigna de forma autónoma sin preguntar)' : 'INTERACTIVO (pregunta con selector [1, 2, 3...])'}
REGLAS DE ASIGNACIÓN GUARDADAS:
${routingRulesText || 'Sin reglas específicas'}

AGENDA ACTUAL EN SU APLICACIÓN (ORDEN CRONOLÓGICO):
${tasksSummary}

REGLAS DE ACTUACIÓN, PERSONALIDAD Y FORMATO (ESTRICTAS):

1. PERSONALIDAD DE ASISTENTE ATENTO, CERCANO Y EDUCADO:
   Jorge quiere sentir que habla con un verdadero asistente personal cercano, eficiente y amable, no con una máquina telegráfica fría.
   - Abre y confirma tus respuestas con comentarios amables y naturales que le gusten, por ejemplo:
     "¡Claro, Jorge! Aquí tienes tu planning organizado para hoy:"
     "¡Por supuesto! Ya he añadido la actividad a tu agenda."
     "¡Hecho, Jorge! He eliminado las tareas que me pediste de tu calendario."
     "¡Anotado! He corregido la hora del evento a las 18:00."
     "¡Hola, Jorge! ¿En qué puedo ayudarte hoy a organizarte?"
   - EQUILIBRIO PERFECTO DE LONGITUD:
     NO seas un robot telegráfico frío de 2 palabras (eso le disgusta), pero TAMPOCO escribas cartas interminables que ocupen toda la pantalla del móvil.
     La estructura ideal es: 1 frase amable de inicio/confirmación + la lista o datos estructurados con viñetas + 1 frase corta de cierre o consejo útil.

2. BARRAS DIVISORIAS OBLIGATORIAS:
   TODA respuesta tuya debe comenzar y terminar EXACTAMENTE con la barra:
   - - - - - - - - - - - - - - - - - - - -
   (NO uses líneas continuas tipo ━━━━━━━, usa estrictamente guiones espaciados: - - - - - - - - - - - - - - - - - - - -).

3. CAPACIDAD TOTAL DE GESTIÓN (IGUAL QUE EN LA APP WEB):

   A) CONSULTAR AGENDA Y PLANNING:
      Si Jorge te pide ver el calendario, qué tiene que hacer o el planning:
      - Agrupa los eventos por DÍA en mayúsculas (ej. *MIÉRCOLES 14 OCTUBRE*).
      - Dentro de cada día, ordena las actividades ESTRICTAMENTE DE MENOR A MAYOR HORA.
      - Pon la hora y la duración entre backticks \`HH:MM\` y \`(XXm)\` para tipografía monoespaciada en WhatsApp.
      Ejemplo:
      - - - - - - - - - - - - - - - - - - - -
      ¡Claro, Jorge! Aquí tienes tu planning para hoy:

      *MIÉRCOLES 14 OCTUBRE*
      - Review AI exam notes \`09:30\` \`(90m)\`
      - Finish React project layout \`12:00\` \`(45m)\`
      - Gym - Upper Body session \`16:30\` \`(60m)\`

      ¡Que tengas un día muy productivo!
      - - - - - - - - - - - - - - - - - - - -
      ("actions": [], "isNewTask": false)

   B) ELIMINACIÓN Y BORRADO DE TAREAS ("delete_task"):
      Si Jorge te dice:
      - "borra los 3 eventos falsos que has creado"
      - "elimina la tarea de pádel"
      - "borra el examen de redes"
      - "borra todas las tareas" / "limpia la agenda"
      - "borra los eventos que creaste"
      DEBES EMITIR la acción "delete_task" para CADA evento que deba ser eliminado en el array "actions".
      Si pide borrar eventos falsos o de prueba, revisa la AGENDA ACTUAL arriba y emite "delete_task" con los títulos de esas tareas (o con targetTitle: "falso" o targetTitle: "todos" si pide borrar todo).
      Responde amablemente:
      - - - - - - - - - - - - - - - - - - - -
      ¡Hecho, Jorge! He eliminado las tareas que me pediste de tu agenda.
      - - - - - - - - - - - - - - - - - - - -

   C) AÑADIR TAREAS Y SELECCIÓN DE CALENDARIO ("add_task"):
      - Si pide añadir actividades directamente ("añade X mañana a las 18:00", "apúntame pádel el jueves a las 19"): emite la acción "add_task".
      - Si en mensajes previos te estuvo contando cosas que tiene que hacer (ej. "tengo que estudiar redes, luego ir al gym, después reunión...") sin pedirte agendarlas, y luego dice "añádelas al calendario" o "apúntamelas todas":
        REVISA TODO EL HISTORIAL y rescata TODAS las actividades mencionadas, creando una acción "add_task" individual para CADA UNA sin dejarte ninguna.
      - Si se indica duración (ej. "dura 1 hora"), pon est: "60m" y description: "Duración estimada: 1 hora. Bloque reservado en planning.".
      - Si el modo es INTERACTIVO:
        En tu mensaje de confirmación, añade al final de forma limpia y atractiva la pregunta de a qué calendario asignarlo con los botones numéricos:
        ¿En qué calendario quieres guardarlo?
        [1] Personal & General
        [2] Universidad & Estudios
        [3] Salud & Deporte
        [4] Trabajo & Proyectos
        (Responde con el número [1, 2, 3...], el nombre del calendario o 'modo auto')
      - Si el modo es AUTOMÁTICO:
        Asigna directamente en el campo "calendarId" el calendario más adecuado según el tema (ej: pádel/gym -> cal-health, uni/examen -> cal-university, trabajo -> cal-work, ocio/personal -> cal-default). En tu respuesta confirma en qué calendario quedó guardado.

   D) MODIFICAR, RENOMBRAR O MARCAR COMO HECHA ("update_task"):
      - Renombrar: "cambia el nombre de X por Y" -> { "type": "update_task", "targetTitle": "X", "updates": { "title": "Y" } }.
      - Rectificar hora: "no, me he equivocado es a las 20:30" -> { "type": "update_task", "updates": { "time": "20:30" } }.
      - Marcar completada: "marca como hecha la tarea de gym" -> { "type": "update_task", "targetTitle": "gym", "updates": { "completed": true } }.
      - Responde amablemente confirmando la actualización.

   E) CONVERSACIÓN GENERAL:
      - Si Jorge te saluda o te hace preguntas libres, responde como un asistente inteligente, empático y conversacional, siempre dentro de las barras.

   F) PROCESAMIENTO DE NOTAS DE VOZ Y AUDIOS CITADOS O MENSAJES CITADOS:
      Si el usuario cita una nota de voz o mensaje (verás el bloque "[Audio / Nota de voz citada transcrita]: ..."), o si te pide "añade los eventos de este audio", "escucha este audio", "añade esto", etc.:
      - Extrae con máxima precisión TODOS los compromisos, reuniones, partidos, citas, entrenamientos, entregas, viajes, exámenes o tareas que se mencionen en el audio o mensaje citado.
      - Para cada actividad extraída, genera una acción "add_task" individual con su fecha (YYYY-MM-DD), hora (HH:MM), contexto y duración estimada adecuada.
      - En tu respuesta amigable, confirma qué actividades has extraído del audio y añadido a su calendario.

   G) CAMBIAR MODO DE ASIGNACIÓN O REGLAS EN LENGUAJE NATURAL:
      - Si Jorge pide "activa modo automático" / "modo predeterminado" / "asigna tú directamente":
        Emite acción { "type": "set_bot_mode", "mode": "auto" } y confirma amablemente.
      - Si Jorge pide "modo interactivo" / "pregúntame siempre":
        Emite acción { "type": "set_bot_mode", "mode": "interactive" } y confirma amablemente.
      - Si Jorge te dice reglas como "quiero que las cosas de deporte vayan a Salud & Deporte y las quedadas a Personal":
        Emite acciones { "type": "set_routing_rule", "keyword": "deporte", "calendarId": "cal-health" } y confirma amablemente.

ESTRUCTURA JSON OBLIGATORIA DE RETORNO:
{
  "reply": "- - - - - - - - - - - - - - - - - - - -\\n¡Claro, Jorge! ...\\n- - - - - - - - - - - - - - - - - - - -",
  "actions": [
    {
      "type": "add_task",
      "task": {
        "title": "Nombre descriptivo de la tarea",
        "date": "YYYY-MM-DD",
        "time": "HH:MM",
        "effort": "Low" | "Medium" | "High",
        "context": "University" | "Projects" | "Personal" | "Health & Gym",
        "est": "30m" | "45m" | "60m" | "90m" | "120m",
        "description": "...",
        "calendarId": "cal-default" | "cal-university" | "cal-health" | "cal-work",
        "recurrence": "none" | "daily" | "weekly"
      }
    },
    {
      "type": "update_task",
      "targetTitle": "Título a coincidir (o vacío)",
      "targetId": null,
      "updates": {
        "title": "Nuevo título",
        "time": "HH:MM",
        "date": "YYYY-MM-DD",
        "est": "60m",
        "calendarId": "...",
        "completed": true/false,
        "description": "..."
      }
    },
    {
      "type": "delete_task",
      "targetTitle": "Título o parte del título a eliminar (o 'todos')",
      "targetId": null
    },
    {
      "type": "set_bot_mode",
      "mode": "auto" | "interactive"
    },
    {
      "type": "set_routing_rule",
      "keyword": "deporte",
      "calendarId": "cal-health"
    }
  ],
  "isNewTask": true/false
}
IMPORTANTE: Tu respuesta DEBE ser un único objeto JSON que comience con { y termine con }.
NO imprimas barras ni texto fuera del JSON; las barras - - - - - - - - - - - - - - - - - - - - deben estar DENTRO del valor string de la propiedad "reply".
Las claves del JSON deben ser obligatoriamente: "reply", "actions", "isNewTask".`

  // Historial conversacional previo (retener hasta 20 turnos para captar listas de cosas contadas)
  let history = conversationHistories.get(fromUser) || []

  try {
    const messagesPayload = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-14),
      { role: 'user', content: userText },
    ]

    const data = await callGroqWithFallback({
      messages: messagesPayload,
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    })

    const content = data.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    let reply = parsed.reply || 'Recibido.'
    let actions = Array.isArray(parsed.actions) ? parsed.actions : []

    // Compatibilidad si la IA devolvió newTasks o task clásico
    if (actions.length === 0 && Array.isArray(parsed.newTasks) && parsed.newTasks.length > 0) {
      actions = parsed.newTasks.map((t) => ({ type: 'add_task', task: t }))
    } else if (actions.length === 0 && parsed.task) {
      actions = [{ type: 'add_task', task: parsed.task }]
    }

    const isNewTask = actions.some((a) => a.type === 'add_task')
    const newTasks = actions
      .filter((a) => a.type === 'add_task' && a.task)
      .map((a) => a.task)

    // Guardar en historial conversacional
    history.push({ role: 'user', content: userText })
    history.push({ role: 'assistant', content: reply })
    if (history.length > 24) history = history.slice(-24)
    conversationHistories.set(fromUser, history)

    return {
      reply,
      actions,
      isNewTask,
      newTasks,
    }
  } catch (err) {
    console.error('[Baileys AI Error]:', err.message)
    return {
      reply: `${DIVIDER}\n*ASISTENTE*\nHe recibido tu mensaje. ¿Deseas consultar tu agenda o agregar alguna actividad?\n${DIVIDER}`,
      actions: [],
      isNewTask: false,
      newTasks: [],
    }
  }
}

// Generación y envío del Briefing Diario de Medianoche (00:00)
export async function generateAndSendMidnightBriefing(targetJid = null) {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const dayName = days[now.getDay()]

  // Buscar tareas de hoy
  const todayTasks = currentKnownTasks.filter(
    (t) => !t.completed && (t.date === todayStr || t.recurrence === 'daily')
  )

  if (todayTasks.length === 0) {
    console.log(`[Baileys Midnight]: No hay tareas para hoy (${todayStr}), no se envía briefing.`)
    return { success: true, reason: 'Sin tareas para hoy', previewMessage: null }
  }

  // Ordenar tareas por hora
  todayTasks.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'))

  const taskListFormatted = todayTasks
    .map(
      (t) =>
        `- ${t.title} \`${t.time || 'Flexible'}\` \`(${t.est || '45m'})\``
    )
    .join('\n')

  // Pedirle a Groq una estrategia motivadora y concisa
  let aiStrategy = 'Prioriza el bloque más exigente a primera hora y respeta los descansos para mantener tu energía.'
  try {
    const prompt = `Hoy es ${dayName}, ${todayStr}. Jorge tiene estas tareas programadas para hoy:
${taskListFormatted}

Escribe una breve estrategia de organización en 2 frases contundentes para que Jorge se organice hoy de forma impecable.`

    const data = await callGroqWithFallback({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 250,
    })
    aiStrategy = data.choices[0]?.message?.content?.trim() || aiStrategy
  } catch (e) {
    console.error('[Baileys Midnight Briefing Strategy Error]:', e.message)
  }

  const messageText = `${DIVIDER}
*DÍA ${dayName.toUpperCase()} (${todayStr})*
${taskListFormatted}

*ESTRATEGIA RECOMENDADA*
${aiStrategy}
${DIVIDER}`

  if (!sock || currentStatus.status !== 'connected') {
    return {
      success: false,
      reason: 'WhatsApp no está conectado actualmente (se enviará automáticamente al vincular)',
      previewMessage: messageText,
      tasksCount: todayTasks.length,
    }
  }

  const myRawPhone = (sock.user?.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '')
  const mySelfJid = myRawPhone ? `${myRawPhone}@s.whatsapp.net` : null
  const recipient = targetJid || mySelfJid || lastUserJid || sock.user?.id

  if (!recipient) {
    return { success: false, reason: 'No se encontró destinatario para enviar el briefing' }
  }

  try {
    const sent = await sock.sendMessage(recipient, { text: messageText })
    if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
    lastMidnightBriefingDate = todayStr
    console.log(`[Baileys Midnight]: Briefing diario enviado con éxito a ${recipient}`)
    return { success: true, sentTo: recipient, message: messageText }
  } catch (err) {
    console.error('[Baileys Midnight Send Error]:', err.message)
    return { success: false, error: err.message }
  }
}

// Planificador automático de las 00:00 (Medianoche)
function startMidnightScheduler() {
  setInterval(async () => {
    try {
      if (currentStatus.status !== 'connected' || !sock) return
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const todayStr = now.toISOString().split('T')[0]

      if (hours === 0 && minutes <= 2 && lastMidnightBriefingDate !== todayStr) {
        console.log(`[Baileys Midnight Scheduler]: Son las 00:00, generando briefing diario...`)
        await generateAndSendMidnightBriefing()
      }
    } catch (e) {
      console.error('[Baileys Midnight Scheduler Error]:', e.message)
    }
  }, 40000)
}

// Iniciar conexión con Baileys (Soporta Código QR y Código de Vinculación de 8 Dígitos para el mismo móvil)
export async function startBaileysConnection(phoneNumber = null) {
  if (currentStatus.status === 'connected' && sock) {
    return currentStatus
  }

  // Si ya existía un socket previo pendiente o desconectado, cerrarlo limpiamente
  if (sock) {
    try {
      sock.end(undefined)
    } catch (e) {}
    sock = null
  }

  const cleanPhone = phoneNumber ? String(phoneNumber).replace(/[^0-9]/g, '') : null

  currentStatus = {
    status: 'connecting',
    qrCode: null,
    pairingCode: null,
    user: null,
    phone: cleanPhone ? `+${cleanPhone}` : null,
    lastUpdated: Date.now(),
  }
  broadcastStatusUpdate(currentStatus)

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true })
    }

    // Si Render reinició el contenedor y la carpeta local está vacía, restaurar desde Firestore
    if (!fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
      await restoreAuthFromFirestore()
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['StudentHub App', 'Chrome', '120.0.0'],
    })

    // Si se solicita emparejamiento por código de teléfono en el mismo móvil
    if (cleanPhone && !sock.authState.creds.registered) {
      setTimeout(async () => {
        try {
          if (sock && !sock.authState.creds.registered) {
            let code = await sock.requestPairingCode(cleanPhone)
            code = code?.match(/.{1,4}/g)?.join('-') || code
            currentStatus = {
              status: 'pairing_code_ready',
              pairingCode: code,
              qrCode: null,
              user: null,
              phone: `+${cleanPhone}`,
              lastUpdated: Date.now(),
            }
            broadcastStatusUpdate(currentStatus)
            console.log(`[Baileys]: Código de vinculación generado para +${cleanPhone}: ${code}`)
          }
        } catch (pairingErr) {
          console.error('[Baileys Pairing Code Error]:', pairingErr)
          currentStatus = {
            ...currentStatus,
            status: 'disconnected',
            pairingCode: null,
            error: `Error al generar código: ${pairingErr.message}`,
            lastUpdated: Date.now(),
          }
          broadcastStatusUpdate(currentStatus)
        }
      }, 2500)
    }

    // Actualizaciones de Conexión (QR, Conectado, Desconectado)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { scale: 8, margin: 2 })
          if (!cleanPhone && currentStatus.status !== 'pairing_code_ready') {
            currentStatus = {
              status: 'qr_ready',
              qrCode: qrDataUrl,
              pairingCode: null,
              user: null,
              phone: null,
              lastUpdated: Date.now(),
            }
            broadcastStatusUpdate(currentStatus)
            console.log('[Baileys]: Código QR generado y listo para escanear.')
          }
        } catch (e) {
          console.error('[Baileys QR Error]:', e)
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        currentStatus = {
          status: 'disconnected',
          qrCode: null,
          pairingCode: null,
          user: null,
          phone: null,
          lastUpdated: Date.now(),
          reconnecting: shouldReconnect,
        }
        broadcastStatusUpdate(currentStatus)

        console.log(`[Baileys]: Conexión cerrada (Código: ${statusCode}). Reconectar: ${shouldReconnect}`)

        // Solo autoreconectar si ya estaba previamente autenticado/registrado.
        // Si no estaba registrado (estaba esperando QR o código), no reintentar en bucle para evitar rate-limits de WhatsApp.
        if (shouldReconnect && sock?.authState?.creds?.registered) {
          setTimeout(() => startBaileysConnection(), 3000)
        }
      } else if (connection === 'open') {
        const userJid = sock.user?.id || ''
        const rawPhone = userJid.split(':')[0] || userJid.split('@')[0]

        currentStatus = {
          status: 'connected',
          qrCode: null,
          pairingCode: null,
          user: sock.user?.name || 'Usuario StudentHub',
          phone: rawPhone ? `+${rawPhone}` : 'Dispositivo Vinculado',
          lastUpdated: Date.now(),
        }
        broadcastStatusUpdate(currentStatus)

        // Respaldar sesión en Firestore inmediatamente tras conectar con éxito
        backupAuthToFirestore()

        console.log(`[Baileys]: Conexión abierta con éxito. Usuario: ${currentStatus.phone}`)
      }
    })

    sock.ev.on('creds.update', async () => {
      await saveCreds()
      backupAuthToFirestore()
    })

    // Escucha de mensajes entrantes (Texto y Notas de Voz)
    const processedMsgIds = new Set()

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      // Permitir tanto 'notify' como 'append' (mensajes sincronizados desde el propio teléfono móvil)
      if (type !== 'notify' && type !== 'append') return

      for (const msg of messages) {
        if (!msg.message) continue
        const from = msg.key.remoteJid
        if (!from || from === 'status@broadcast') continue

        // Ignorar mensajes antiguos del histórico sincronizados al inicio (más de 3 minutos de antigüedad)
        const msgTime = Number(msg.messageTimestamp || 0) * 1000
        if (msgTime > 0 && Date.now() - msgTime > 3 * 60 * 1000) {
          continue
        }

        // Evitar procesar mensajes enviados por el propio bot o ya procesados
        if (msg.key.id && sentBotMessageIds.has(msg.key.id)) continue
        if (msg.key.id && processedMsgIds.has(msg.key.id)) continue

        // Identificar si es el chat personal del usuario (Chat consigo mismo / Notas personales)
        const myRawPhone = (sock.user?.id || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '')
        const myLid = sock.user?.lid ? sock.user.lid.split(':')[0].split('@')[0] : null
        const remotePhone = from.split('@')[0].split(':')[0].replace(/[^0-9]/g, '')

        const isChatWithSelf = Boolean(
          (myRawPhone && (remotePhone === myRawPhone || from.startsWith(myRawPhone))) ||
          (myLid && from.includes(myLid))
        )

        // Si es el chat propio, guardarlo para briefings automáticos de medianoche
        if (isChatWithSelf) {
          lastUserJid = from
        }

        // Desempaquetar mensaje interno (ephemeral, viewOnce, etc.)
        const innerMsg =
          msg.message.ephemeralMessage?.message ||
          msg.message.viewOnceMessage?.message ||
          msg.message.viewOnceMessageV2?.message ||
          msg.message

        // Extraer texto plano o pie de foto
        const rawText = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          innerMsg?.conversation ||
          innerMsg?.extendedTextMessage?.text ||
          innerMsg?.imageMessage?.caption ||
          innerMsg?.videoMessage?.caption ||
          ''
        ).trim()

        // Evitar procesar respuestas emitidas por el propio bot (barras divisoras)
        if (rawText.startsWith('- - - - - - - - - - - - - - - - - - - -') || rawText.includes(DIVIDER)) {
          continue
        }

        // REGEX UNIVERSAL PARA COMANDO /ia (al inicio, en medio o al final, ej: "/ia añade...", "/ia", "haz esto /ia")
        const iaTriggerRegex = /(?:^|\s)(?:\/|!|\.|barra\s*)ia(?::|,|\s|$)/i
        const hasIaTrigger = iaTriggerRegex.test(rawText)

        // En canales externos o grupos (!isChatWithSelf): SOLO se atiende si lleva el comando /ia explícito
        if (!isChatWithSelf && !hasIaTrigger) {
          continue
        }

        // Extraer mensaje citado (si el usuario está respondiendo a un audio, texto o mensaje anterior)
        const contextInfo =
          msg.message?.extendedTextMessage?.contextInfo ||
          innerMsg?.extendedTextMessage?.contextInfo ||
          innerMsg?.imageMessage?.contextInfo ||
          innerMsg?.videoMessage?.contextInfo ||
          innerMsg?.audioMessage?.contextInfo

        let quotedContent = null
        if (contextInfo?.quotedMessage) {
          try {
            quotedContent = extractMessageContent(contextInfo.quotedMessage) || contextInfo.quotedMessage
          } catch (e) {
            quotedContent = contextInfo.quotedMessage
          }
          quotedContent =
            quotedContent?.ephemeralMessage?.message ||
            quotedContent?.viewOnceMessage?.message ||
            quotedContent?.viewOnceMessageV2?.message ||
            quotedContent
        }

        // 1. Detección y transcripción de AUDIO CITADO (cuando se responde a un audio con /ia)
        const quotedAudio =
          quotedContent?.audioMessage ||
          (quotedContent?.documentMessage && quotedContent.documentMessage.mimetype?.startsWith('audio/')
            ? quotedContent.documentMessage
            : null)

        let quotedAudioTranscript = ''
        if (quotedAudio) {
          console.log(`[Baileys]: Audio citado detectado en ${from} (Stanza: ${contextInfo.stanzaId}). Descargando...`)
          try {
            const quotedMsgForDownload = {
              key: {
                remoteJid: from,
                id: contextInfo.stanzaId,
                participant: contextInfo.participant || from,
              },
              message: quotedContent,
            }
            const audioBuffer = await downloadMediaMessage(
              quotedMsgForDownload,
              'buffer',
              {},
              { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            )
            const mimetype = quotedAudio.mimetype || 'audio/ogg; codecs=opus'
            quotedAudioTranscript = await transcribeAudioWithWhisper(audioBuffer, mimetype)
            console.log(`[Baileys]: Audio citado transcrito con Whisper: "${quotedAudioTranscript}"`)
          } catch (audioErr) {
            console.error('[Baileys Error Descargando Audio Citado]:', audioErr.message)
          }
        }

        // 2. Detección y transcripción de AUDIO DIRECTO (nota de voz enviada en el chat personal)
        const directAudio = innerMsg?.audioMessage
        let directAudioTranscript = ''
        let isVoiceNote = false

        if (directAudio) {
          isVoiceNote = true
          console.log(`[Baileys]: Audio directo detectado en ${from}. Transcribiendo...`)
          try {
            const audioBuffer = await downloadMediaMessage(
              msg,
              'buffer',
              {},
              { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            )
            const mimetype = directAudio.mimetype || 'audio/ogg; codecs=opus'
            directAudioTranscript = await transcribeAudioWithWhisper(audioBuffer, mimetype)
            console.log(`[Baileys]: Audio directo transcrito con Whisper: "${directAudioTranscript}"`)
          } catch (audioErr) {
            console.error('[Baileys Audio Directo Error]:', audioErr.message)
            continue
          }
        }

        // 3. Extraer texto del mensaje citado (si citó un texto en vez de audio)
        const quotedText = (
          quotedContent?.conversation ||
          quotedContent?.extendedTextMessage?.text ||
          quotedContent?.imageMessage?.caption ||
          quotedContent?.videoMessage?.caption ||
          ''
        ).trim()

        // 4. Limpiar el prefijo /ia del comando del usuario
        const cleanInstruction = rawText.replace(iaTriggerRegex, ' ').replace(/\s+/g, ' ').trim()
        const lowerInstruction = cleanInstruction.toLowerCase()

        // 4.1. COMANDO /help o ayuda
        if (/^(\/|!|\.)?(help|ayuda)$/i.test(cleanInstruction) || lowerInstruction === 'ayuda' || lowerInstruction === 'help') {
          const helpReply = `${DIVIDER}\n${getHelpMessage()}\n${DIVIDER}`
          try {
            const sent = await sock.sendMessage(from, { text: helpReply }, { quoted: msg })
            if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
          } catch (e) {
            await sock.sendMessage(from, { text: helpReply }).catch(() => {})
          }
          continue
        }

        // 4.2. COMANDO /calendarios
        if (/^(\/|!|\.)?(calendarios|calendars)$/i.test(cleanInstruction)) {
          const calsReply = `${DIVIDER}\n${getCalendarsSummaryMessage()}\n${DIVIDER}`
          try {
            const sent = await sock.sendMessage(from, { text: calsReply }, { quoted: msg })
            if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
          } catch (e) {
            await sock.sendMessage(from, { text: calsReply }).catch(() => {})
          }
          continue
        }

        // 4.3. CAMBIOS DIRECTOS DE MODO (AUTOMÁTICO / INTERACTIVO)
        if (
          /^(\/|!|\.)?modo\s+(auto|predeterminado|automatico)$/i.test(cleanInstruction) ||
          lowerInstruction.includes('activar modo automatico') ||
          lowerInstruction.includes('activa modo automatico') ||
          lowerInstruction.includes('activar modo predeterminado') ||
          lowerInstruction.includes('modo predeterminado') ||
          lowerInstruction.includes('asigna automaticamente')
        ) {
          botSettings.mode = 'auto'
          saveBotSettings(botSettings)
          const modeReply = `${DIVIDER}\n¡Entendido, Jorge! He activado el *Modo Automático*.\nA partir de ahora clasificaré y asignaré cada nuevo evento al calendario más apropiado (deporte, uni, personal, trabajo...) de forma autónoma sin preguntarte para ahorrar tiempo.\n${DIVIDER}`
          try {
            const sent = await sock.sendMessage(from, { text: modeReply }, { quoted: msg })
            if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
          } catch (e) {
            await sock.sendMessage(from, { text: modeReply }).catch(() => {})
          }
          continue
        }

        if (
          /^(\/|!|\.)?modo\s+(interactivo|manual)$/i.test(cleanInstruction) ||
          lowerInstruction.includes('activar modo interactivo') ||
          lowerInstruction.includes('activa modo interactivo') ||
          lowerInstruction.includes('preguntame siempre') ||
          lowerInstruction.includes('pregúntame siempre')
        ) {
          botSettings.mode = 'interactive'
          saveBotSettings(botSettings)
          const modeReply = `${DIVIDER}\n¡Hecho, Jorge! He activado el *Modo Interactivo*.\nCada vez que detecte una nueva cita o evento te preguntaré con opciones rápidas [1, 2, 3...] a qué calendario deseas asignarlo.\n${DIVIDER}`
          try {
            const sent = await sock.sendMessage(from, { text: modeReply }, { quoted: msg })
            if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
          } catch (e) {
            await sock.sendMessage(from, { text: modeReply }).catch(() => {})
          }
          continue
        }

        // 4.4. RESPONDER A SELECCIÓN PENDIENTE DE CALENDARIO ([1], [2], [3] o nombre de calendario)
        if (botSettings.pendingSelection && botSettings.pendingSelection.expiresAt > Date.now()) {
          const pending = botSettings.pendingSelection
          const numMatch = cleanInstruction.match(/^\[?(\d+)\]?$/)
          let chosenCal = null

          if (numMatch) {
            const idx = parseInt(numMatch[1], 10) - 1
            if (idx >= 0 && idx < currentKnownCalendars.length) {
              chosenCal = currentKnownCalendars[idx]
            }
          } else if (cleanInstruction.length >= 2 && !cleanInstruction.startsWith('/')) {
            chosenCal = currentKnownCalendars.find((c) => {
              const cName = (c.name || '').toLowerCase()
              return (
                cName === lowerInstruction ||
                cName.includes(lowerInstruction) ||
                (Array.isArray(c.keywords) && c.keywords.some((kw) => lowerInstruction.includes(kw)))
              )
            })
          }

          if (chosenCal) {
            const tIdx = currentKnownTasks.findIndex((t) => String(t.id) === String(pending.taskId))
            if (tIdx >= 0) {
              currentKnownTasks[tIdx].calendarId = chosenCal.id
              currentKnownTasks[tIdx].updatedAt = Date.now()
              saveSyncedTasks(currentKnownTasks)
              broadcastTasksUpdate(currentKnownTasks)
            }
            botSettings.pendingSelection = null
            saveBotSettings(botSettings)

            const chosenReply = `${DIVIDER}\n¡Perfecto, Jorge! He guardado "*${pending.taskTitle}*" en tu calendario de *${chosenCal.name}*.\n${DIVIDER}`
            try {
              const sent = await sock.sendMessage(from, { text: chosenReply }, { quoted: msg })
              if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
            } catch (e) {
              await sock.sendMessage(from, { text: chosenReply }).catch(() => {})
            }
            continue
          }
        }

        // 5. Construir el prompt completo para la Inteligencia Artificial
        let userText = ''
        if (quotedAudioTranscript) {
          const instruction = cleanInstruction || 'Analiza el audio citado y crea, añade o programa en el calendario cualquier evento, tarea o cita que se mencione.'
          userText = `[Audio / Nota de voz citada transcrita]: "${quotedAudioTranscript}"\n\nInstrucción: ${instruction}`
        } else if (directAudioTranscript) {
          userText = directAudioTranscript
        } else if (quotedText) {
          const instruction = cleanInstruction || 'Analiza el mensaje citado y añade o programa cualquier evento o tarea mencionado.'
          userText = `[Mensaje citado]: "${quotedText}"\n\nInstrucción: ${instruction}`
        } else {
          userText = cleanInstruction || (isChatWithSelf ? rawText : 'Hola')
        }

        if (!userText || !userText.trim()) continue

        // Registrar el ID del mensaje para evitar duplicados
        if (msg.key.id) {
          processedMsgIds.add(msg.key.id)
          if (processedMsgIds.size > 2000) processedMsgIds.clear()
        }

        console.log(
          `[Baileys Mensaje Procesado de ${from} (${isChatWithSelf ? 'Chat Propio' : 'Canal Externo + /ia'} | ${isVoiceNote || quotedAudioTranscript ? 'Audio' : 'Texto'})]: "${userText.slice(0, 100)}..."`
        )

        // Analizar con IA (Conversación Total, Renombrado, Memoria y Anticipación de Carga)
        const aiResult = await processMessageWithAI(userText.trim(), from)

        // Si se generaron acciones (añadir, modificar, eliminar), aplicarlas inmediatamente
        let addedTaskRef = null
        if (Array.isArray(aiResult.actions) && aiResult.actions.length > 0) {
          const modified = applyBridgeActions(
            aiResult.actions,
            isVoiceNote || quotedAudioTranscript ? 'whatsapp_audio_whisper' : 'whatsapp_text_baileys'
          )
          const addedAction = aiResult.actions.find((a) => a.type === 'add_task')
          if (addedAction?.task) {
            addedTaskRef = addedAction.task
          }
          console.log(
            `[Baileys]: ${modified.length} acción(es) aplicadas en local:`,
            modified.map((m) => `${m.title || m.id} (${m._deleted ? 'eliminada' : 'actualizada/creada'})`).join(', ')
          )
        }

        // Formatear respuesta para el usuario (SIN prefijo de transcripción)
        let replyToSend = (aiResult.reply || 'Recibido.').trim()

        // Limpiar cualquier barra divisoria previa para evitar duplicados
        replyToSend = replyToSend
          .replace(/^(- - - - - - - - - - - - - - - - - - - -|\*{5,}|━{5,}|─{5,}|-{5,})\s*/i, '')
          .replace(/\s*(- - - - - - - - - - - - - - - - - - - -|\*{5,}|━{5,}|─{5,}|-{5,})$/i, '')
          .trim()

        // Si se añadió una tarea en modo interactivo y la respuesta no contiene aún los botones numéricos, añadirlos
        if (addedTaskRef && botSettings.mode === 'interactive') {
          if (!replyToSend.includes('¿En qué calendario') && !replyToSend.includes('[1]')) {
            replyToSend += `\n\n${formatCalendarOptionsText(addedTaskRef.title)}`
          }
        }

        // Garantizar barras de guiones espaciados exactamente arriba y abajo
        replyToSend = `${DIVIDER}\n${replyToSend}\n${DIVIDER}`

        // Responder por WhatsApp al chat de origen citando el mensaje original para mayor claridad
        if (replyToSend) {
          try {
            const sentMsg = await sock.sendMessage(from, { text: replyToSend }, { quoted: msg })
            if (sentMsg?.key?.id) {
              sentBotMessageIds.add(sentMsg.key.id)
            }
            console.log(`[Baileys]: Respuesta enviada a ${from}`)
          } catch (sendErr) {
            console.warn('[Baileys Error Enviando con Cita, reintentando sin cita]:', sendErr.message)
            try {
              const fallbackMsg = await sock.sendMessage(from, { text: replyToSend })
              if (fallbackMsg?.key?.id) {
                sentBotMessageIds.add(fallbackMsg.key.id)
              }
              console.log(`[Baileys]: Respuesta enviada sin cita a ${from}`)
            } catch (fallbackErr) {
              console.error('[Baileys Error Enviando Definitivo]:', fallbackErr.message)
            }
          }
        }
      }
    })
  } catch (err) {
    console.error('[Baileys Init Error]:', err)
    currentStatus = {
      status: 'disconnected',
      qrCode: null,
      error: err.message,
      lastUpdated: Date.now(),
    }
  }

  return currentStatus
}

// Desconectar y borrar sesión
export async function disconnectBaileys() {
  try {
    if (sock) {
      await sock.logout()
    }
  } catch (e) {}

  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true })
  } catch (e) {}

  await clearAuthFromFirestore().catch(() => {})

  sock = null
  currentStatus = {
    status: 'disconnected',
    qrCode: null,
    pairingCode: null,
    user: null,
    phone: null,
    lastUpdated: Date.now(),
  }
  broadcastStatusUpdate(currentStatus)
  return currentStatus
}

// Enviar mensaje manual
export async function sendBaileysMessage(toPhone, text) {
  if (!sock || currentStatus.status !== 'connected') {
    return { success: false, error: 'WhatsApp Web no está conectado' }
  }

  try {
    const cleanPhone = toPhone.replace(/[^0-9]/g, '')
    const jid = `${cleanPhone}@s.whatsapp.net`
    await sock.sendMessage(jid, { text })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Estado actual
export function getBaileysStatus() {
  return currentStatus
}

export function getRecentSyncedTasks() {
  return currentKnownTasks.filter((t) => !t._deleted)
}

// Middleware para Vite / Express
export function handleBaileysApiRoute(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost')
  const pathname = parsedUrl.pathname

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return true
  }

  // Proxy universal de feeds iCal / ICS (TeamUp, Google Calendar, Apple, etc.)
  if (pathname === '/api/proxy-ics') {
    const targetUrl = parsedUrl.searchParams.get('url')
    if (!targetUrl) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Falta el parámetro url' }))
      return true
    }

    let fetchUrl = targetUrl.trim()
    if (fetchUrl.startsWith('webcal://')) {
      fetchUrl = fetchUrl.replace('webcal://', 'https://')
    }

    // Auto-conversión universal para cualquier URL de TeamUp (ej: teamup.com/ks..., teamup.com/c/ks..., ics.teamup.com...)
    const teamupMatch = fetchUrl.match(/(?:ics\.)?teamup\.com\/(?:feed\/|c\/)?([a-zA-Z0-9_-]+)/i)
    if (teamupMatch && !fetchUrl.endsWith('.ics') && !fetchUrl.includes('/0.ics')) {
      const teamupKey = teamupMatch[1]
      fetchUrl = `https://ics.teamup.com/feed/${teamupKey}/0.ics`
    }

    console.log(`[Proxy-ICS]: Descargando calendario externo desde: ${fetchUrl}`)

    fetch(fetchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/calendar, text/plain, */*',
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          res.statusCode = response.status
          res.setHeader('Content-Type', 'text/plain')
          res.end(`Error del servidor iCal externo: ${response.status} ${response.statusText}`)
          return
        }
        const text = await response.text()
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
        res.end(text)
      })
      .catch((err) => {
        console.error('[Proxy-ICS Error]:', err.message)
        res.statusCode = 500
        res.setHeader('Content-Type', 'text/plain')
        res.end(`Error conectando con feed iCal: ${err.message}`)
      })

    return true
  }

  // Canal Server-Sent Events (SSE) para sincronización en tiempo real (<50ms)
  if (pathname === '/api/baileys/events-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    })
    res.write(': connected\n\n')

    // Snapshot inmediato de tareas y estado al conectarse
    const initialTasks = currentKnownTasks.filter((t) => !t._deleted)
    res.write(`data: ${JSON.stringify({ type: 'tasks_updated', tasks: initialTasks, timestamp: Date.now() })}\n\n`)
    res.write(`data: ${JSON.stringify({ type: 'status_updated', status: currentStatus, timestamp: Date.now() })}\n\n`)

    sseClients.add(res)

    req.on('close', () => {
      sseClients.delete(res)
    })
    return true
  }

  // Canal SSE exclusivo o compatible para calendarios compartidos
  if (pathname === '/api/shared-calendars/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    })
    res.write(': connected\n\n')

    const reqCode = parsedUrl.searchParams.get('code')
    if (reqCode && sharedCalendarsMap[reqCode]) {
      const initial = sharedCalendarsMap[reqCode]
      res.write(`data: ${JSON.stringify({
        type: 'shared_calendar_updated',
        shareCode: reqCode,
        calendar: initial.calendar,
        events: initial.events || [],
        timestamp: Date.now(),
      })}\n\n`)
    }

    sseClients.add(res)
    req.on('close', () => {
      sseClients.delete(res)
    })
    return true
  }

  // Obtener calendario compartido por código
  if (pathname === '/api/shared-calendars/get' && req.method === 'GET') {
    const code = parsedUrl.searchParams.get('code')
    if (code && sharedCalendarsMap[code]) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(sharedCalendarsMap[code]))
      return true
    }
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Calendario no encontrado' }))
    return true
  }

  // Sincronizar y publicar calendario compartido
  if (pathname === '/api/shared-calendars/sync' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { shareCode, calendar, events } = JSON.parse(body)
        if (!shareCode) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Falta shareCode' }))
          return
        }
        const record = {
          shareCode,
          calendar,
          events: Array.isArray(events) ? events : [],
          updatedAt: Date.now(),
        }
        sharedCalendarsMap[shareCode] = record
        saveSharedCalendarsStore(sharedCalendarsMap)
        broadcastSharedCalendarUpdate(shareCode, calendar, events)

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      } catch (e) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return true
  }

  if (pathname === '/api/ping' || pathname === '/health') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() }))
    return true
  }

  if (pathname === '/api/baileys/status') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(getBaileysStatus()))
    return true
  }

  if (pathname === '/api/baileys/connect' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      let phoneNumber = null
      try {
        if (body) {
          const parsed = JSON.parse(body)
          phoneNumber = parsed.phoneNumber || null
        }
      } catch (e) {}

      startBaileysConnection(phoneNumber)
        .then((st) => {
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(st))
        })
        .catch((err) => {
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        })
    })
    return true
  }

  if (pathname === '/api/baileys/pairing-code' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}')
        const phoneNumber = parsed.phoneNumber
        if (!phoneNumber) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Falta phoneNumber' }))
          return
        }
        startBaileysConnection(phoneNumber)
          .then((st) => {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(st))
          })
          .catch((err) => {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          })
      } catch (e) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return true
  }

  if (pathname === '/api/baileys/disconnect' && req.method === 'POST') {
    disconnectBaileys().then((st) => {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(st))
    })
    return true
  }

  if (pathname === '/api/baileys/recent-tasks') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(getRecentSyncedTasks()))
    return true
  }

  if (pathname === '/api/baileys/delete-task' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { id } = JSON.parse(body)
        if (id) {
          const sId = String(id)
          const idx = currentKnownTasks.findIndex((t) => String(t.id) === sId)
          if (idx !== -1) {
            currentKnownTasks.splice(idx, 1)
            saveSyncedTasks(currentKnownTasks)
            broadcastTasksUpdate(currentKnownTasks, [sId])
          }
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true }))
      } catch (e) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return true
  }

  if (pathname === '/api/baileys/sync-tasks' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { tasks, replace, deletedIds } = JSON.parse(body)
        updateKnownTasks(tasks, { replace: Boolean(replace), deletedIds: deletedIds || [] })
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, count: currentKnownTasks.length }))
      } catch (e) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return true
  }

  if (pathname === '/api/baileys/sync-calendars' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { calendars } = JSON.parse(body)
        if (Array.isArray(calendars) && calendars.length > 0) {
          currentKnownCalendars = calendars
          saveUserCalendars(calendars)
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, count: currentKnownCalendars.length }))
      } catch (e) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return true
  }

  if (pathname === '/api/baileys/bot-settings') {
    if (req.method === 'GET') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(botSettings))
      return true
    }
    if (req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        try {
          const updates = JSON.parse(body)
          botSettings = { ...botSettings, ...updates }
          saveBotSettings(botSettings)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true, settings: botSettings }))
        } catch (e) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: e.message }))
        }
      })
      return true
    }
  }

  if (pathname === '/api/baileys/chat-test' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', async () => {
      try {
        const { text, applyActions = true } = JSON.parse(body)
        const result = await processMessageWithAI(text, 'console_test')
        if (applyActions && Array.isArray(result.actions) && result.actions.length > 0) {
          const modified = applyBridgeActions(result.actions, 'chat_test')
          result.appliedCount = modified.length
          result.modified = modified
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result))
      } catch (e) {
        res.statusCode = 500
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return true
  }

  if (pathname === '/api/baileys/trigger-midnight-briefing' && req.method === 'POST') {
    generateAndSendMidnightBriefing()
      .then((result) => {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result))
      })
      .catch((err) => {
        res.statusCode = 500
        res.end(JSON.stringify({ error: err.message }))
      })
    return true
  }

  if (pathname === '/api/baileys/send' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', async () => {
      try {
        const { to, text } = JSON.parse(body)
        const result = await sendBaileysMessage(to, text)
        res.statusCode = result.success ? 200 : 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result))
      } catch (e) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return true
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', async () => {
      try {
        const user = JSON.parse(body)
        if (!user || !user.email) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Falta email' }))
          return
        }
        const cleanEmail = user.email.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
        const docId = `account_${cleanEmail}`
        const db = await getBridgeFirestore()
        if (db) {
          const { doc, setDoc } = await import('firebase/firestore')
          await setDoc(doc(db, 'shared_calendars', docId), user, { merge: true })
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, user }))
      } catch (e) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return true
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', async () => {
      try {
        const { email, password } = JSON.parse(body)
        if (!email) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Falta email' }))
          return
        }
        const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
        const docId = `account_${cleanEmail}`
        const db = await getBridgeFirestore()
        if (db) {
          const { doc, getDoc } = await import('firebase/firestore')
          const snap = await getDoc(doc(db, 'shared_calendars', docId))
          if (snap.exists()) {
            const user = snap.data()
            if (password && user.password && user.password !== password) {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Contraseña incorrecta' }))
              return
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, user }))
            return
          }
        }
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'No existe ninguna cuenta con ese correo electrónico' }))
      } catch (e) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return true
  }

  return false
}

// Iniciar planificador de medianoche
startMidnightScheduler()

// Servir archivos estáticos del build de Vite (dist/) en producción (Render)
const DIST_DIR = path.resolve(process.cwd(), 'dist')
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function serveStatic(req, res) {
  if (!fs.existsSync(DIST_DIR)) return false

  const parsedUrl = new URL(req.url, 'http://localhost')
  let pathname = parsedUrl.pathname
  if (pathname === '/') pathname = '/index.html'

  const filePath = path.join(DIST_DIR, pathname)
  const ext = path.extname(filePath).toLowerCase()

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.statusCode = 200
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream')
    fs.createReadStream(filePath).pipe(res)
    return true
  }

  // SPA fallback para rutas cliente de React Router (/calendar, /auto-organizer, /notebooks...)
  const indexPath = path.join(DIST_DIR, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    fs.createReadStream(indexPath).pipe(res)
    return true
  }

  return false
}

// Si se ejecuta directamente con Node (`node server/whatsapp-bridge.js`)
if (process.argv[1] && process.argv[1].endsWith('whatsapp-bridge.js')) {
  const PORT = process.env.PORT || 5005
  const HOST = '0.0.0.0'
  const server = http.createServer((req, res) => {
    if (handleBaileysApiRoute(req, res)) return
    if (serveStatic(req, res)) return

    res.statusCode = 404
    res.end('Not Found')
  })

  server.listen(PORT, HOST, async () => {
    console.log(`[WhatsApp Baileys Bridge] Servidor escuchando en http://${HOST}:${PORT}`)

    // Auto-restaurar sesión persistente de WhatsApp (local o desde Firestore si Render reinició)
    const credsPath = path.join(AUTH_DIR, 'creds.json')
    if (!fs.existsSync(credsPath)) {
      console.log('[Baileys Cloud Persistence]: No hay credenciales locales. Buscando respaldo en Firestore...')
      await restoreAuthFromFirestore()
    }

    if (fs.existsSync(credsPath)) {
      console.log('[Baileys]: Sesión previa detectada. Restaurando conexión automáticamente...')
      startBaileysConnection().catch((err) => {
        console.warn('[Baileys Auto-Connect Warn]:', err.message)
      })
    }
  })
}
