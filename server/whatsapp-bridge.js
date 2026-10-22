// Puente Local de WhatsApp con Baileys (Protocolo WhatsApp Web Oficial)
// Cada usuario actúa como su propio servidor en local (0 € de coste, 0 servidores externos)
// Sin bloqueos de Meta, sin pedir CIF ni verificación de empresa
// Incluye IA Conversacional Completa, Whisper Audio, Renombrado/Corrección,
// Planificación Compacta de Calendario, Memoria Acumulativa por Lotes y Briefing de Medianoche (00:00).

import {
  makeWASocket,
  useMultiFileAuthState as initMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  extractMessageContent,
  Browsers,
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import pino from 'pino'
import path from 'path'
import fs from 'fs'
import http from 'http'
import https from 'https'
import { FALLBACK_NEWS } from '../src/services/newsService.js'

/**
 * Formato enriquecido para el boletín diario de noticias en WhatsApp.
 * Emplea tipografía estándar de WhatsApp (*negrita*, _cursiva_, viñetas) y cita fuentes autorizadas.
 */
export function formatNewsForWhatsApp(articles = FALLBACK_NEWS) {
  const items = Array.isArray(articles) && articles.length > 0 ? articles : FALLBACK_NEWS
  return items.map((a, idx) => (
    `*${idx + 1}. [${a.category || a.categoryKey}] ${a.title}*\n` +
    `• ${a.summary}\n` +
    `_Fuente: ${a.source || a.sourceName || 'Medio'} (${a.readTime || a.readingTime || '3 min'})_`
  )).join('\n\n')
}

/**
 * Clasificador de consultas de noticias y actualidad para WhatsApp.
 * Detecta consultas directas y sutiles (incluyendo tiempo pasado y tecnología) y descarta acciones de tareas.
 */
export function classifyWhatsAppNewsQuery(userText) {
  const lowerUserText = (userText || '').toLowerCase()
  const isNewsQuery = (
    /(?:noticia|novedad|titular|actualidad|bolet[ií]n)/i.test(lowerUserText) ||
    /(?:qu[eé]\s+(?:hay|sabes|pasa|pas[oó]|ha\s+(?:pasado|ocurrido|sucedido)|ocurri[oó]|sucedi[oó])|dime|cu[eé]ntame).*?(?:tecnolog|inteligencia artificial|\bia\b)/i.test(lowerUserText)
  ) && !/(?:a[ñn]ad|crea|pon|programa|apunta|borra|elimina|quita|suprime|cambia|(?<!qu[eé]\s+)\bpasa\b(?!\s*do)|mueve|asigna)/i.test(lowerUserText)
  const isAIOrTech = /ia|inteligencia artificial|tecnolog|software|hardware/i.test(lowerUserText)
  return { isNewsQuery, isAIOrTech }
}

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
  scheduledBriefings: {
    dailyNews: { enabled: false, time: '08:30' },
    dailyTasks: { enabled: false, time: '09:00' },
    targetJid: null,
  },
}

function loadBotSettings() {
  try {
    if (fs.existsSync(BOT_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(BOT_SETTINGS_FILE, 'utf-8'))
      return {
        ...DEFAULT_BOT_SETTINGS,
        ...data,
        scheduledBriefings: {
          ...DEFAULT_BOT_SETTINGS.scheduledBriefings,
          ...(data.scheduledBriefings || {}),
        },
      }
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

*5. Repeticiones y Recordatorios Diarios Automáticos*:
- *"Dime todos los días a las 08:30 las noticias"*: Programa el boletín matutino de actualidad.
- *"Dime todos los días a las 09:00 las cosas que tenga que hacer"*: Programa tu resumen diario de agenda.
- *"Qué ajustes tienes puestos?"* o */ajustes*: Muestra tus briefings y preferencias activas.
- *"Cancela las noticias de todos los días"* o *"Quita las repeticiones"*: Desactiva los avisos programados.

*Comandos rápidos*:
- */help* o *ayuda*: Muestra este manual interactivo.
- */ajustes*: Muestra tus configuraciones, recordatorios periódicos y reglas.
- */calendarios*: Lista tus calendarios actuales y reglas activas.
- */noticias*: Muestra los 6 titulares destacados del día.
- */modo auto*: Activa la asignación autónoma inmediata.
- */modo interactivo*: Activa las preguntas con selector numérico.
- */resumen*: Resumen estructurado de tu día.`
}

export function getSettingsSummaryMessage() {
  const briefings = botSettings.scheduledBriefings || {}
  const newsStatus = briefings.dailyNews?.enabled
    ? `*Activo* (Todos los días a las *${briefings.dailyNews.time}*)`
    : `_Desactivado_`
  const tasksStatus = briefings.dailyTasks?.enabled
    ? `*Activo* (Todos los días a las *${briefings.dailyTasks.time}*)`
    : `_Desactivado_`

  const modeText = botSettings.mode === 'auto' ? '*Automático* (asigna sin preguntar)' : '*Interactivo* (pregunta opciones con selector)'
  const rulesList = Object.entries(botSettings.routingRules || {})
    .map(([kw, cId]) => {
      const c = currentKnownCalendars.find((x) => x.id === cId)
      return `• _${kw}_ -> *${c ? c.name : cId}*`
    })
    .join('\n')

  return `*CONFIGURACIÓN Y AJUSTES DE TU ASISTENTE IA*

*1. Repeticiones y Envíos Diarios Programados*:
• *Noticias diarias*: ${newsStatus}
• *Resumen de agenda/tareas*: ${tasksStatus}

*2. Modo de Asignación de Calendarios*:
• ${modeText}

*3. Reglas de Asignación Aprendidas*:
${rulesList || '• Sin reglas específicas (usa calendarios por defecto)'}

*Cómo modificar tus ajustes*:
- "Dime todos los días a las 08:30 las noticias"
- "Dime todos los días a las 09:00 las cosas que tenga que hacer"
- "Cancela las noticias de todos los días" o "Quita las repeticiones"
- "/modo auto" o "/modo interactivo"`
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

const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
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

// Formatear resumen de agenda para el prompt de la IA (ordenado cronológicamente con calendario y rol explícito)
function formatTasksSummary(tasks) {
  const activeTasks = (tasks || []).filter((t) => !t._deleted)
  if (activeTasks.length === 0) return 'No hay tareas registradas en este momento.'
  return activeTasks
    .slice(0, 200)
    .sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '')
      if (dateCmp !== 0) return dateCmp
      return (a.time || '00:00').localeCompare(b.time || '00:00')
    })
    .map((t) => {
      const descPart = t.description ? ` • Nota: "${t.description}"` : ''
      const estPart = t.est ? ` • Duración: ${t.est}` : ''
      const cal = currentKnownCalendars.find((c) => String(c.id) === String(t.calendarId))
      const calName = cal ? cal.name : (t.calendarName || 'Principal')
      return `- [ID:${t.id} | ${t.date || '2026-10-20'} ${t.time || '10:00'}] "${t.title}" (Calendario: "${calName}" [${t.calendarId || 'cal-default'}] • Rol/Contexto: "${t.context || 'General'}" • Esfuerzo: ${t.effort || 'Medio'}${estPart}${descPart} • ${t.completed ? 'Hecha' : 'Pendiente'})`
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
    } else if (act.type === 'move_calendar_events' || act.type === 'reassign_calendar_events') {
      const sourceCalendarId = act.sourceCalendarId || ''
      const sourceCalendarName = act.sourceCalendarName || ''
      const targetCalendarId = act.targetCalendarId || ''
      const targetCalendarName = act.targetCalendarName || ''
      const targetContext = act.targetContext || targetCalendarName || ''

      const sName = sourceCalendarName.toLowerCase().trim()
      const sId = sourceCalendarId.toLowerCase().trim()

      const targetCal = currentKnownCalendars.find(
        (c) =>
          (targetCalendarId && String(c.id).toLowerCase() === String(targetCalendarId).toLowerCase()) ||
          (targetCalendarName && c.name.toLowerCase().includes(targetCalendarName.toLowerCase())) ||
          (targetContext && c.name.toLowerCase().includes(targetContext.toLowerCase()))
      )
      const finalCalId =
        targetCalendarId ||
        (targetCal ? targetCal.id : ('cal-' + (targetCalendarName || targetContext || 'default').toLowerCase().replace(/\s+/g, '-')))
      const finalCalName = targetCalendarName || (targetCal ? targetCal.name : targetContext || 'General')
      const finalContext = targetContext || finalCalName

      let countMoved = 0
      currentKnownTasks = currentKnownTasks.map((t) => {
        if (t._deleted) return t
        const matchId = sId && String(t.calendarId || '').toLowerCase() === sId
        const matchName =
          sName &&
          ((t.calendarName && t.calendarName.toLowerCase().includes(sName)) ||
            (t.context && t.context.toLowerCase().includes(sName)) ||
            (t.calendarId && String(t.calendarId).toLowerCase().includes(sName)))

        const sourceCalObj = currentKnownCalendars.find((c) => sName && c.name.toLowerCase().includes(sName))
        const matchSourceCalObj = sourceCalObj && String(t.calendarId) === String(sourceCalObj.id)

        if (matchId || matchName || matchSourceCalObj) {
          countMoved++
          return {
            ...t,
            calendarId: finalCalId,
            calendarName: finalCalName,
            context: finalContext,
            updatedAt: Date.now(),
          }
        }
        return t
      })
      if (countMoved > 0) {
        modified.push({ type: 'move_calendar_events', count: countMoved, targetCalendarName: finalCalName })
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
  const models = ['qwen/qwen3.8-27b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
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
                return { choices: [{ message: { content: JSON.stringify(extracted) } }], model }
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
            return { choices: [{ message: { content: JSON.stringify({ reply: raw, actions }) } }], model }
          }
        } catch (recErr) {}
        throw new Error(`Groq error (${res.status}): ${errBody}`)
      }

      const result = await res.json()
      result.model = model
      return result
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

  const whatsappNewsDigest = formatNewsForWhatsApp(FALLBACK_NEWS)

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

NOTICIAS DESTACADAS DE HOY (${todayStr}):
${whatsappNewsDigest}

REGLAS DE ACTUACIÓN, PERSONALIDAD Y FORMATO (ESTRICTAS):

1. PERSONALIDAD DE ASISTENTE ATENTO, CERCANO Y EDUCADO (MAYORDOMO DIGITAL):
   Jorge quiere sentir que habla con un verdadero asistente personal cercano, eficiente y de confianza, con PODER ABSOLUTO para organizar su vida, estudios y trabajo.
   - Abre y confirma tus respuestas con comentarios amables, naturales y resolutivos:
     "¡Claro, Jorge! Aquí tienes tu planning organizado para hoy:"
     "¡Por supuesto! Ya he añadido la actividad a tu agenda."
     "¡Hecho, Jorge! He movido todos los eventos al rol solicitado."
     "¡Anotado! He corregido la hora del evento a las 18:00."
     "¡Hola, Jorge! ¿En qué puedo ayudarte hoy a organizarte?"
   - EQUILIBRIO PERFECTO:
     NO seas un robot frío telegráfico ni uses frases forzadas. Responde con la calidez y precisión de un mayordomo inteligente de primer nivel.

2. FORMATO NATURAL, ELEGANTE Y DIRECTO (SIN BARRAS NI LÍNEAS ARTIFICIALES):
   Escribe como un mayordomo y asistente ejecutivo digital en un chat real de WhatsApp.
   NUNCA comiences ni termines con barras divisorias tipo - - - - - - - - - - - - - - - - - - - - ni ━━━━━━━.
   Escribe tu respuesta con fluidez humana: una apertura educada y atenta, información clara con viñetas (-) y tipografía de WhatsApp (*negrita*), y un cierre útil o confirmación.

3. PODER ABSOLUTO Y CONTROL TOTAL SOBRE LA AGENDA (IGUAL QUE EN LA APP WEB):

   A) MOVER O REASIGNAR TODOS LOS EVENTOS DE UN CALENDARIO O ROL A OTRO ("move_calendar_events"):
      Cuando Jorge diga cosas como:
      - "mira todos los eventos de todo el calendario de Universidad & Estudios y los pongas todos en el rol University"
      - "mete todos los eventos del calendario X en el rol Y"
      - "mueve todas las tareas de X a Y"
      - "pasa todo de X a Y"
      DEBES EMITIR OBLIGATORIAMENTE en el array "actions" la acción "move_calendar_events":
      {
        "type": "move_calendar_events",
        "sourceCalendarName": "nombre del calendario o rol origen (ej: Universidad & Estudios)",
        "sourceCalendarId": "id de origen si se conoce",
        "targetCalendarName": "nombre del rol o calendario destino (ej: University)",
        "targetCalendarId": "id del destino si existe o cal-destino",
        "targetContext": "University"
      }
      En tu respuesta, confirma de forma educada y brillante que has revisado los eventos y que han sido reasignados al nuevo rol/calendario.

   B) CONSULTAR AGENDA Y PLANNING:
      Si Jorge te pide ver el calendario, qué tiene que hacer o el planning:
      - Agrupa los eventos por DÍA en mayúsculas (ej. *MIÉRCOLES 14 OCTUBRE*).
      - Dentro de cada día, ordena las actividades ESTRICTAMENTE DE MENOR A MAYOR HORA.
      - Pon la hora y la duración entre backticks \`HH:MM\` y \`(XXm)\` para tipografía monoespaciada en WhatsApp.
      ("actions": [], "isNewTask": false)

   C) ELIMINACIÓN Y BORRADO DE TAREAS ("delete_task"):
      Si Jorge te pide borrar tareas, emite "delete_task" con su targetTitle o "todos".

   D) AÑADIR TAREAS Y SELECCIÓN DE CALENDARIO ("add_task"):
      - Si pide añadir actividades directamente: emite la acción "add_task".
      - Si en mensajes previos te estuvo contando cosas que tiene que hacer y luego dice "añádelas", rescata TODAS las actividades del historial.
      - En modo AUTOMÁTICO, asigna tú de forma autónoma el calendario más apropiado.

   E) MODIFICAR, RENOMBRAR O MARCAR COMO HECHA ("update_task"):
      - Permite editar cualquier evento: título, hora, fecha, esfuerzo, duración o calendario.
      - Para mover una sola tarea a otro rol/calendario: emite "update_task" actualizando calendarId, calendarName y context.

   F) CONVERSACIÓN GENERAL:
      - Si Jorge te saluda o hace preguntas libres, responde de forma inteligente, empática y servicial.

   G) PROCESAMIENTO DE NOTAS DE VOZ Y AUDIOS CITADOS:
      - Extrae con precisión todas las tareas mencionadas y agéndalas.

   H) CAMBIAR MODO DE ASIGNACIÓN:
      - Permite cambiar entre modo "auto" e "interactive".

   I) CONSULTAS DE NOTICIAS, NOVEDADES Y ACTUALIDAD:
      - Cuando Jorge te pregunte en WhatsApp por noticias o actualidad ("¿Cuáles son las noticias de hoy?", "¿Qué titulares hay?", "noticias", "¿Qué hay de IA o tecnología?"):
        Envía un boletín elegante usando tipografía de WhatsApp (*negrita* en titulares, _cursiva_ en fuentes, viñetas • para resúmenes).
        Cita siempre las fuentes oficiales (Xataka, Genbeta, Agencia SINC / Nature, El País Educación).
        Destaca los procesadores LPU de Groq y las herramientas recomendadas por Genbeta para universitarios.
      - NUNCA uses etiquetas HTML (como <p>, <div>, <br>). Emplea únicamente markdown nativo de WhatsApp.

ESTRUCTURA JSON OBLIGATORIA DE RETORNO:
{
  "reply": "Respuesta en español explicando con claridad y amabilidad los cambios realizados o respondiendo a la pregunta",
  "actions": [
    {
      "type": "move_calendar_events",
      "sourceCalendarName": "Universidad & Estudios",
      "targetCalendarName": "University",
      "targetContext": "University"
    },
    {
      "type": "add_task",
      "task": {
        "title": "Nombre de la tarea",
        "date": "YYYY-MM-DD",
        "time": "HH:MM",
        "effort": "Low" | "Medium" | "High",
        "context": "University" | "Projects" | "Personal" | "Health & Gym",
        "est": "45m",
        "description": "...",
        "calendarId": "cal-university"
      }
    },
    {
      "type": "update_task",
      "targetTitle": "Título a coincidir",
      "updates": {
        "calendarName": "University",
        "context": "University"
      }
    },
    {
      "type": "delete_task",
      "targetTitle": "Título a eliminar"
    }
  ],
  "isNewTask": false
}
IMPORTANTE: Tu respuesta DEBE ser un único objeto JSON que comience con { y termine con }.
NO incluyas barras divisorias tipo - - - - en el texto de "reply".
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

    // Garantizar ejecución de movimiento de eventos si Jorge lo solicitó
    const lowerUserText = (userText || '').toLowerCase()
    const moveMatch = lowerUserText.match(
      /(?:mete|pasa|mueve|cambia|asigna|pon|coloca)\s+(?:todos\s+los\s+eventos|todas\s+las\s+tareas|todo)\s+(?:de\s+mi\s+calendario|del\s+calendario|de)?\s*(.*?)\s+(?:en|al|a)\s+(?:el\s+rol|el\s+calendario|la\s+categor[ií]a|rol|calendario)?\s*(.*)/i
    )
    if (moveMatch && !actions.some((a) => a.type === 'move_calendar_events' || a.type === 'reassign_calendar_events')) {
      const rawSource = moveMatch[1].replace(/mi calendario|calendario|rol|categoría/gi, '').trim()
      const rawTarget = moveMatch[2].replace(/el rol|el calendario|rol|calendario/gi, '').trim()
      const targetCal = currentKnownCalendars.find((c) => c.name.toLowerCase().includes(rawTarget.toLowerCase()))
      const targetCalId = targetCal ? targetCal.id : ('cal-' + rawTarget.toLowerCase().replace(/\s+/g, '-'))
      const targetCalName = targetCal ? targetCal.name : rawTarget

      actions.push({
        type: 'move_calendar_events',
        sourceCalendarName: rawSource,
        targetCalendarName: targetCalName,
        targetCalendarId: targetCalId,
        targetContext: targetCalName,
      })
    }

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
    const fallbackActions = []
    const lowerUserText = (userText || '').toLowerCase()
    const moveMatch = lowerUserText.match(
      /(?:mete|pasa|mueve|cambia|asigna|pon|coloca)\s+(?:todos\s+los\s+eventos|todas\s+las\s+tareas|todo)\s+(?:de\s+mi\s+calendario|del\s+calendario|de)?\s*(.*?)\s+(?:en|al|a)\s+(?:el\s+rol|el\s+calendario|la\s+categor[ií]a|rol|calendario)?\s*(.*)/i
    )
    let fallbackReply = '¡Hola, Jorge! He recibido tu mensaje. ¿Deseas consultar tu agenda o agregar alguna actividad?'

    // Detección de consultas de noticias y actualidad en WhatsApp cuando el motor remoto no responda
    const { isNewsQuery, isAIOrTech } = classifyWhatsAppNewsQuery(lowerUserText)

    if (isNewsQuery) {
      if (isAIOrTech) {
        fallbackReply = `¡Hola, Jorge! Aquí tienes las novedades más destacadas de *Inteligencia Artificial y Tecnología* hoy:\n\n` +
          `*1. [IA] Groq y la nueva ola de procesadores LPU*\n` +
          `• Las unidades LPU superan los 300 tokens por segundo en inferencia de LLMs, permitiendo respuestas de voz instantáneas sin la latencia de GPUs tradicionales.\n` +
          `_Fuente: Xataka (3 min)_\n\n` +
          `*2. [Tech] Herramientas esenciales de desarrollo para universitarios*\n` +
          `• Selección de utilidades open source y bases de datos locales para gestionar apuntes y código con privacidad y sin suscripciones.\n` +
          `_Fuente: Genbeta (4 min)_\n\n` +
          `¿Te gustaría que te resuma alguna de las otras áreas (Ciencia cuántica, Pomodoro, Becas Erasmus+ o Vite en Rust)?`
      } else {
        fallbackReply = `¡Hola, Jorge! Aquí tienes los *6 titulares destacados de hoy* en StudentHub:\n\n` +
          `*1. [IA]* Groq y los chips LPU: Inferencia a 300+ tok/s en tiempo real.\n` +
          `• _Fuente: Xataka (3 min)_\n\n` +
          `*2. [Tech]* Guía Genbeta de apps open-source para universitarios.\n` +
          `• _Fuente: Genbeta (4 min)_\n\n` +
          `*3. [Ciencia]* Supresión de decoherencia en cúbits cuánticos lógicos.\n` +
          `• _Fuente: Agencia SINC / Nature (5 min)_\n\n` +
          `*4. [Productividad]* Protocolo Pomodoro 50/10 respaldado por neurociencia.\n` +
          `• _Fuente: Xataka Ciencia (3 min)_\n\n` +
          `*5. [Universidad]* Nuevas convocatorias Erasmus+ y becas STEM.\n` +
          `• _Fuente: El País Educación (4 min)_\n\n` +
          `*6. [Desarrollo]* Vite y bundlers nativos en Rust a 60 FPS.\n` +
          `• _Fuente: Genbeta Dev (3 min)_\n\n` +
          `¿Deseas que profundice en el resumen de alguna de ellas?`
      }
    } else if (moveMatch) {
      const rawSource = moveMatch[1].replace(/mi calendario|calendario|rol|categoría/gi, '').trim()
      const rawTarget = moveMatch[2].replace(/el rol|el calendario|rol|calendario/gi, '').trim()
      const targetCal = currentKnownCalendars.find((c) => c.name.toLowerCase().includes(rawTarget.toLowerCase()))
      const targetCalId = targetCal ? targetCal.id : ('cal-' + rawTarget.toLowerCase().replace(/\s+/g, '-'))
      const targetCalName = targetCal ? targetCal.name : rawTarget
      fallbackActions.push({
        type: 'move_calendar_events',
        sourceCalendarName: rawSource,
        targetCalendarName: targetCalName,
        targetCalendarId: targetCalId,
        targetContext: targetCalName,
      })
      fallbackReply = `¡Entendido, Jorge! He movido los eventos de "${rawSource}" al rol "${targetCalName}" correctamente.`
    }

    return {
      reply: fallbackReply,
      actions: fallbackActions,
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

  const messageText = `*DÍA ${dayName.toUpperCase()} (${todayStr})*
${taskListFormatted}

*ESTRATEGIA RECOMENDADA*
${aiStrategy}`

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

// Planificador automático de las 00:00 (Medianoche) y recordatorios periódicos diarios
let lastDailyNewsDate = null
let lastDailyTasksDate = null

function startMidnightScheduler() {
  setInterval(async () => {
    try {
      if (currentStatus.status !== 'connected' || !sock) return
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const todayStr = now.toISOString().split('T')[0]
      const currentHm = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

      // 1. Briefing de Medianoche (00:00)
      if (hours === 0 && minutes <= 2 && lastMidnightBriefingDate !== todayStr) {
        console.log(`[Baileys Midnight Scheduler]: Son las 00:00, generando briefing diario...`)
        await generateAndSendMidnightBriefing()
      }

      // 2. Briefing periódico: Noticias Diarias
      const briefings = botSettings.scheduledBriefings || {}
      if (
        briefings.dailyNews?.enabled &&
        briefings.dailyNews.time === currentHm &&
        lastDailyNewsDate !== todayStr
      ) {
        lastDailyNewsDate = todayStr
        const target = briefings.targetJid || lastRecipientJid
        if (target) {
          console.log(`[Baileys Scheduler]: Enviando boletín de noticias programado (${currentHm}) a ${target}...`)
          const newsText = `¡Buenos días, Jorge! Aquí tienes tu *boletín diario de noticias destacadas*:\n\n` +
            formatNewsForWhatsApp(FALLBACK_NEWS) +
            `\n\n_(Configurado todos los días a las ${currentHm}. Escribe /ajustes para ver o cambiar tus recordatorios)_`
          await sock.sendMessage(target, { text: newsText }).catch((e) => console.error(e))
        }
      }

      // 3. Briefing periódico: Resumen diario de Tareas / Agenda
      if (
        briefings.dailyTasks?.enabled &&
        briefings.dailyTasks.time === currentHm &&
        lastDailyTasksDate !== todayStr
      ) {
        lastDailyTasksDate = todayStr
        const target = briefings.targetJid || lastRecipientJid
        if (target) {
          console.log(`[Baileys Scheduler]: Enviando resumen diario de tareas programado (${currentHm}) a ${target}...`)
          const todayTasks = (currentKnownTasks || []).filter((t) => t.date === todayStr)
          let tasksText = ''
          if (todayTasks.length === 0) {
            tasksText = `¡Buenos días, Jorge! No tienes tareas programadas en tu agenda para hoy (${todayStr}). ¡Día completamente despejado!`
          } else {
            tasksText = `¡Buenos días, Jorge! Tienes *${todayTasks.length} ${todayTasks.length === 1 ? 'actividad' : 'actividades'}* para hoy (${todayStr}):\n\n` +
              todayTasks.map((t, idx) => `*${idx + 1}. ${t.title}* [${t.time || 'Sin hora'}] - _${t.context || 'General'}_\n${t.completed ? '• Estado: Completada' : '• Estado: Pendiente'}`).join('\n\n')
          }
          tasksText += `\n\n_(Configurado todos los días a las ${currentHm}. Escribe /ajustes para gestionar tus opciones)_`
          await sock.sendMessage(target, { text: tasksText }).catch((e) => console.error(e))
        }
      }
    } catch (e) {
      console.error('[Baileys Midnight Scheduler Error]:', e.message)
    }
  }, 35000)
}

// Iniciar conexión con Baileys (Soporta Código QR y Código de Vinculación de 8 Dígitos para el mismo móvil)
export async function startBaileysConnection(phoneNumber = null, forceRefresh = false) {
  let cleanPhone = phoneNumber ? String(phoneNumber).replace(/[^0-9]/g, '').replace(/^00/, '') : null
  if (cleanPhone && cleanPhone.length === 9 && (cleanPhone.startsWith('6') || cleanPhone.startsWith('7') || cleanPhone.startsWith('8') || cleanPhone.startsWith('9'))) {
    cleanPhone = '34' + cleanPhone
  }

  // 1. Si ya está conectado y activo, no tocar nada
  if (currentStatus.status === 'connected' && sock) {
    return currentStatus
  }

  // 2. Si ya hay un código de vinculación listo para el MISMO número y el socket sigue vivo, devolverlo sin matar el socket
  if (!forceRefresh && sock && currentStatus.status === 'pairing_code_ready' && currentStatus.pairingCode) {
    if (cleanPhone && currentStatus.phone === `+${cleanPhone}`) {
      return currentStatus
    }
  }

  // 3. Si ya hay un código QR listo y vigente (< 45s) y no se fuerza refresco, devolverlo sin matar el socket
  if (!forceRefresh && !cleanPhone && sock && currentStatus.status === 'qr_ready' && currentStatus.qrCode) {
    if (Date.now() - (currentStatus.lastUpdated || 0) < 45000) {
      return currentStatus
    }
  }

  // Si ya existía un socket previo no conectado o se pide un modo/número nuevo, cerrarlo limpiamente
  if (sock) {
    try {
      sock.ev.removeAllListeners()
      sock.end(undefined)
    } catch (e) {}
    sock = null
  }

  // Comprobar si existen credenciales registradas válidas en el almacenamiento local
  const credsPath = path.join(AUTH_DIR, 'creds.json')
  let hasRegisteredSession = false
  if (fs.existsSync(credsPath)) {
    try {
      const rawCreds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'))
      if (rawCreds && (rawCreds.registered || rawCreds.me?.id)) {
        hasRegisteredSession = true
      }
    } catch (e) {}
  }

  // Limpiar credenciales previas SOLO cuando el usuario solicita refresco forzado explícito
  // o cuando no hay sesión registrada y se solicita un teléfono diferente
  if (forceRefresh) {
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true })
      await clearAuthFromFirestore().catch(() => {})
    } catch (e) {}
  } else if (!hasRegisteredSession && cleanPhone && fs.existsSync(credsPath)) {
    try {
      const rawCreds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'))
      const existingPhone = (rawCreds?.me?.id || '').split(':')[0].split('@')[0]
      if (existingPhone && existingPhone !== cleanPhone) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true })
      }
    } catch (e) {}
  }

  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  } catch (e) {}

  currentStatus = {
    status: 'connecting',
    qrCode: null,
    pairingCode: null,
    user: null,
    phone: cleanPhone ? `+${cleanPhone}` : null,
    error: null,
    lastUpdated: Date.now(),
  }
  broadcastStatusUpdate(currentStatus)

  try {
    const { state, saveCreds } = await initMultiFileAuthState(AUTH_DIR)

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.macOS('Desktop'),
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
    })

    // Si se solicita emparejamiento por código de teléfono en el mismo móvil
    if (cleanPhone && !sock.authState.creds.registered) {
      ;(async () => {
        try {
          // Esperar activamente hasta que el websocket esté abierto
          let wsReady = false
          for (let i = 0; i < 40; i++) {
            if (!sock) return
            if (sock.ws?.isOpen) {
              wsReady = true
              break
            }
            await new Promise((r) => setTimeout(r, 250))
          }

          // Margen de seguridad para completar la negociación inicial del canal de transporte
          await new Promise((r) => setTimeout(r, 500))

          if (sock && !sock.authState.creds.registered) {
            let code = null
            try {
              code = await sock.requestPairingCode(cleanPhone)
            } catch (firstErr) {
              console.warn('[Baileys]: Primer intento de código de vinculación, reintentando...', firstErr.message)
              await new Promise((r) => setTimeout(r, 1200))
              if (sock && !sock.authState.creds.registered) {
                code = await sock.requestPairingCode(cleanPhone)
              }
            }

            if (code) {
              code = code?.match(/.{1,4}/g)?.join('-') || code
              currentStatus = {
                status: 'pairing_code_ready',
                pairingCode: code,
                qrCode: null,
                user: null,
                phone: `+${cleanPhone}`,
                error: null,
                lastUpdated: Date.now(),
              }
              broadcastStatusUpdate(currentStatus)
              console.log(`[Baileys]: Código de vinculación generado para +${cleanPhone}: ${code}`)
            }
          }
        } catch (pairingErr) {
          console.error('[Baileys Pairing Code Error]:', pairingErr)
          currentStatus = {
            ...currentStatus,
            status: 'disconnected',
            pairingCode: null,
            error: `Error al generar código: ${pairingErr.message || 'Error de conexión con WhatsApp'}`,
            lastUpdated: Date.now(),
          }
          broadcastStatusUpdate(currentStatus)
        }
      })()
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
              error: null,
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
        const isLoggedOut = statusCode === DisconnectReason.loggedOut
        const isRestartRequired = statusCode === DisconnectReason.restartRequired

        console.log(`[Baileys]: Conexión cerrada. Código: ${statusCode}. isRestartRequired: ${isRestartRequired}, isLoggedOut: ${isLoggedOut}`)

        // 1. Si WhatsApp desvinculó la sesión explícitamente (401 loggedOut)
        if (isLoggedOut) {
          console.log('[Baileys]: Sesión desvinculada por WhatsApp (loggedOut 401). Limpiando credenciales...')
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
            error: 'Dispositivo desvinculado desde WhatsApp.',
            lastUpdated: Date.now(),
          }
          broadcastStatusUpdate(currentStatus)
          return
        }

        // 2. Si la sesión ya estaba registrada O es un reinicio requerido tras introducir el código (515)
        const isRegistered = Boolean(sock?.authState?.creds?.registered)
        if (isRegistered || isRestartRequired) {
          console.log(`[Baileys]: Reiniciando socket para sesión registrada (Código: ${statusCode})...`)
          currentStatus = {
            ...currentStatus,
            status: 'connecting',
            reconnecting: true,
            lastUpdated: Date.now(),
          }
          broadcastStatusUpdate(currentStatus)
          setTimeout(() => {
            startBaileysConnection(null, false)
          }, isRestartRequired ? 600 : 2500)
          return
        }

        // 3. Si no estaba registrado (estaba esperando QR o código de 8 dígitos y se interrumpió)
        currentStatus = {
          status: 'disconnected',
          qrCode: null,
          pairingCode: null,
          user: null,
          phone: null,
          error: statusCode === 408 ? 'Tiempo de espera agotado. Vuelve a intentarlo.' : null,
          lastUpdated: Date.now(),
        }
        broadcastStatusUpdate(currentStatus)
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
      try {
        await saveCreds()
        backupAuthToFirestore()
      } catch (saveErr) {
        console.warn('[Baileys Creds Save Error]:', saveErr.message)
      }
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
          const helpReply = getHelpMessage()
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
          const calsReply = getCalendarsSummaryMessage()
          try {
            const sent = await sock.sendMessage(from, { text: calsReply }, { quoted: msg })
            if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
          } catch (e) {
            await sock.sendMessage(from, { text: calsReply }).catch(() => {})
          }
          continue
        }

        // 4.2b. COMANDO /noticias o titulares
        if (/^(\/|!|\.)?(noticias|noticia|titulares|actualidad)$/i.test(cleanInstruction) || lowerInstruction === 'noticias' || lowerInstruction === 'titulares') {
          const newsReply = `¡Hola, Jorge! Aquí tienes los *6 titulares destacados de hoy* en StudentHub:\n\n` +
            formatNewsForWhatsApp(FALLBACK_NEWS) +
            `\n\n¿Deseas que te amplíe información sobre alguna de ellas?`
          try {
            const sent = await sock.sendMessage(from, { text: newsReply }, { quoted: msg })
            if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
          } catch (e) {
            await sock.sendMessage(from, { text: newsReply }).catch(() => {})
          }
          continue
        }

        // 4.2c. COMANDO /ajustes o consulta de configuración activa
        if (
          /^(\/|!|\.)?(ajustes|configuracion|settings)$/i.test(cleanInstruction) ||
          /(?:qu[eé]\s+ajustes\s+(?:tienes|hay|est[aá]n)|ver\s+ajustes|mis\s+ajustes|qu[eé]\s+recordatorios\s+tengo)/i.test(lowerInstruction)
        ) {
          const settingsReply = getSettingsSummaryMessage()
          try {
            const sent = await sock.sendMessage(from, { text: settingsReply }, { quoted: msg })
            if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
          } catch (e) {
            await sock.sendMessage(from, { text: settingsReply }).catch(() => {})
          }
          continue
        }

        // 4.2d. PROGRAMAR REPETICIÓN DIARIA DE NOTICIAS ("dime todos los días a las [hora] las noticias")
        const dailyNewsMatch = lowerInstruction.match(
          /(?:dime|ponme|av[ií]same|env[ií]ame|m[aá]ndame|quiero)?.*todos los d[ií]as.*(?:las )?noticias.*?(?:a las? )?(\d{1,2}(?::\d{2})?)/i
        ) || lowerInstruction.match(
          /(?:dime|ponme|av[ií]same|env[ií]ame|m[aá]ndame|quiero)?.*(?:las )?noticias.*todos los d[ií]as.*?(?:a las? )?(\d{1,2}(?::\d{2})?)/i
        )
        if (dailyNewsMatch) {
          let rawTime = dailyNewsMatch[1] || '08:30'
          if (!rawTime.includes(':')) {
            rawTime = `${rawTime.padStart(2, '0')}:00`
          } else {
            const parts = rawTime.split(':')
            rawTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
          }

          if (!botSettings.scheduledBriefings) botSettings.scheduledBriefings = {}
          botSettings.scheduledBriefings.dailyNews = { enabled: true, time: rawTime }
          botSettings.scheduledBriefings.targetJid = from
          saveBotSettings(botSettings)

          const reply = `¡Ajustes actualizados, Jorge!\n\nHe configurado tu *boletín de noticias diarias* para todos los días a las *${rawTime}*. Recibirás puntualmente los 6 titulares más destacados de la jornada.\n\n_(Para consultar tus ajustes en cualquier momento escribe /ajustes o /help)_`
          try {
            const sent = await sock.sendMessage(from, { text: reply }, { quoted: msg })
            if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
          } catch (e) {
            await sock.sendMessage(from, { text: reply }).catch(() => {})
          }
          continue
        }

        // 4.2e. PROGRAMAR REPETICIÓN DIARIA DE TAREAS / AGENDA ("dime todos los días a las [hora] las cosas que tenga que hacer")
        const dailyTasksMatch = lowerInstruction.match(
          /(?:dime|ponme|recu[eé]rdame|env[ií]ame|m[aá]ndame|quiero)?.*todos los d[ií]as.*(?:las cosas|tareas|agenda|qu[eé] tengo que hacer|lo que tengo).*?(?:a las? )?(\d{1,2}(?::\d{2})?)/i
        ) || lowerInstruction.match(
          /(?:dime|ponme|recu[eé]rdame|env[ií]ame|m[aá]ndame|quiero)?.*(?:las cosas|tareas|agenda|qu[eé] tengo que hacer|lo que tengo).*todos los d[ií]as.*?(?:a las? )?(\d{1,2}(?::\d{2})?)/i
        )
        if (dailyTasksMatch) {
          let rawTime = dailyTasksMatch[1] || '09:00'
          if (!rawTime.includes(':')) {
            rawTime = `${rawTime.padStart(2, '0')}:00`
          } else {
            const parts = rawTime.split(':')
            rawTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
          }

          if (!botSettings.scheduledBriefings) botSettings.scheduledBriefings = {}
          botSettings.scheduledBriefings.dailyTasks = { enabled: true, time: rawTime }
          botSettings.scheduledBriefings.targetJid = from
          saveBotSettings(botSettings)

          const reply = `¡Ajustes actualizados, Jorge!\n\nHe configurado tu *resumen diario de tareas y agenda* para todos los días a las *${rawTime}*. Te enviaré cada mañana tus compromisos del día para que nunca se te pase nada.\n\n_(Para consultar tus ajustes escribe /ajustes o /help)_`
          try {
            const sent = await sock.sendMessage(from, { text: reply }, { quoted: msg })
            if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
          } catch (e) {
            await sock.sendMessage(from, { text: reply }).catch(() => {})
          }
          continue
        }

        // 4.2f. CANCELAR REPETICIONES / RECORDATORIOS DIARIOS
        if (
          /(?:cancela|quita|elimina|desactiva|borra).*(?:las noticias|las tareas|los recordatorios|las repeticiones|los briefings|los avisos)/i.test(lowerInstruction)
        ) {
          const isNews = lowerInstruction.includes('noticia')
          const isTasks = lowerInstruction.includes('tarea') || lowerInstruction.includes('agenda') || lowerInstruction.includes('cosas')

          if (!botSettings.scheduledBriefings) botSettings.scheduledBriefings = {}

          let cancelMsg = ''
          if (isNews && !isTasks) {
            botSettings.scheduledBriefings.dailyNews = { enabled: false, time: '08:30' }
            cancelMsg = `¡Hecho! He cancelado el envío diario de noticias. Ya no recibirás el boletín matutino automático.`
          } else if (isTasks && !isNews) {
            botSettings.scheduledBriefings.dailyTasks = { enabled: false, time: '09:00' }
            cancelMsg = `¡Hecho! He cancelado el recordatorio diario de tareas. Ya no recibirás el resumen matutino automático.`
          } else {
            botSettings.scheduledBriefings.dailyNews = { enabled: false, time: '08:30' }
            botSettings.scheduledBriefings.dailyTasks = { enabled: false, time: '09:00' }
            cancelMsg = `¡Hecho, Jorge! He desactivado todas tus repeticiones y recordatorios diarios (noticias y tareas). Puedes volver a configurarlos cuando quieras diciéndomelo en lenguaje natural.`
          }
          saveBotSettings(botSettings)

          try {
            const sent = await sock.sendMessage(from, { text: cancelMsg }, { quoted: msg })
            if (sent?.key?.id) sentBotMessageIds.add(sent.key.id)
          } catch (e) {
            await sock.sendMessage(from, { text: cancelMsg }).catch(() => {})
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
          const modeReply = `¡Entendido, Jorge! He activado el *Modo Automático*.\nA partir de ahora clasificaré y asignaré cada nuevo evento al calendario más apropiado (deporte, uni, personal, trabajo...) de forma autónoma sin preguntarte para ahorrar tiempo.`
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
          const modeReply = `¡Hecho, Jorge! He activado el *Modo Interactivo*.\nCada vez que detecte una nueva cita o evento te preguntaré con opciones rápidas [1, 2, 3...] a qué calendario deseas asignarlo.`
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

            const chosenReply = `¡Perfecto, Jorge! He guardado "*${pending.taskTitle}*" en tu calendario de *${chosenCal.name}*.`
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

        // Formatear respuesta para el usuario (Limpia y natural sin barras artificiales)
        let replyToSend = (aiResult.reply || 'Recibido.').trim()

        // Limpiar cualquier barra divisoria previa o residuos
        replyToSend = replyToSend
          .replace(/^(- - - - - - - - - - - - - - - - - - - -|\*{5,}|━{5,}|─{5,}|-{5,})\s*/gi, '')
          .replace(/\s*(- - - - - - - - - - - - - - - - - - - -|\*{5,}|━{5,}|─{5,}|-{5,})$/gi, '')
          .trim()

        // Si se añadió una tarea en modo interactivo y la respuesta no contiene aún los botones numéricos, añadirlos
        if (addedTaskRef && botSettings.mode === 'interactive') {
          if (!replyToSend.includes('¿En qué calendario') && !replyToSend.includes('[1]')) {
            replyToSend += `\n\n${formatCalendarOptionsText(addedTaskRef.title)}`
          }
        }

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

  if (pathname === '/api/news' && req.method === 'GET') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(FALLBACK_NEWS))
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
      let forceRefresh = false
      try {
        if (body) {
          const parsed = JSON.parse(body)
          phoneNumber = parsed.phoneNumber || null
          forceRefresh = Boolean(parsed.forceRefresh)
        }
      } catch (e) {}

      startBaileysConnection(phoneNumber, forceRefresh)
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
        const forceRefresh = Boolean(parsed.forceRefresh)
        if (!phoneNumber) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Falta phoneNumber' }))
          return
        }
        startBaileysConnection(phoneNumber, forceRefresh)
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

  if (pathname === '/api/ai/chat' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', async () => {
      try {
        const { messages = [], temperature = 0.2, max_tokens = 850, jsonMode = true } = JSON.parse(body || '{}')
        const safeMessages = Array.isArray(messages) ? [...messages] : []
        
        // Groq exige que la palabra 'json' aparezca en los mensajes si response_format es json_object
        if (jsonMode) {
          const hasJson = safeMessages.some((m) => (m.content || '').toLowerCase().includes('json'))
          if (!hasJson) {
            safeMessages.unshift({
              role: 'system',
              content: 'You are an intelligent task and productivity AI assistant. You must respond in valid JSON format.',
            })
          }
        }

        const payload = {
          messages: safeMessages,
          temperature,
          max_tokens,
        }
        if (jsonMode) {
          payload.response_format = { type: 'json_object' }
        }

        let groqRes
        try {
          groqRes = await callGroqWithFallback(payload)
        } catch (callErr) {
          // Si falló con json_object, reintentar sin forzar response_format
          if (jsonMode) {
            const fallbackPayload = { ...payload }
            delete fallbackPayload.response_format
            groqRes = await callGroqWithFallback(fallbackPayload)
          } else {
            throw callErr
          }
        }

        let text = groqRes.choices?.[0]?.message?.content || ''
        // Limpiar posibles bloques markdown ```json ... ```
        if (jsonMode && text.includes('```')) {
          const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
          if (match) text = match[1].trim()
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, content: text, model: groqRes.model || 'groq-proxy' }))
      } catch (err) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: false, error: err.message }))
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
  if (pathname.includes('/assets/')) {
    pathname = pathname.slice(pathname.indexOf('/assets/'))
  }
  if (pathname === '/') pathname = '/index.html'

  const filePath = path.join(DIST_DIR, pathname)
  const ext = path.extname(filePath).toLowerCase()

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.statusCode = 200
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream')
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    } else if (pathname.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
    fs.createReadStream(filePath).pipe(res)
    return true
  }

  // SPA fallback para rutas cliente de React Router (/calendar, /auto-organizer, /notebooks...)
  const indexPath = path.join(DIST_DIR, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    fs.createReadStream(indexPath).pipe(res)
    return true
  }

  return false
}

// URLs oficiales de descarga de GitHub Releases (binarios compilados actualizados)
const GITHUB_RELEASE_APK_URL = 'https://github.com/Gekamil/AppHub/releases/download/latest/AppHub.apk'
const GITHUB_RELEASE_SETUP_URL = 'https://github.com/Gekamil/AppHub/releases/download/latest/AppHub-Setup.exe'

function handleDownloadRoute(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost')
  const pathname = parsedUrl.pathname.toLowerCase()

  let targetUrl = null
  if (pathname === '/download/studenthub.apk' || pathname === '/download/apphub.apk') {
    targetUrl = GITHUB_RELEASE_APK_URL
  } else if (
    pathname === '/download/studenthub-setup.exe' ||
    pathname === '/download/apphub-setup.exe' ||
    pathname === '/download/studenthub.exe'
  ) {
    targetUrl = GITHUB_RELEASE_SETUP_URL
  }

  if (!targetUrl) return false

  res.writeHead(302, {
    Location: targetUrl,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  })
  res.end()
  return true
}

// Si se ejecuta directamente con Node (`node server/whatsapp-bridge.js`)
if (process.argv[1] && process.argv[1].endsWith('whatsapp-bridge.js')) {
  const PORT = process.env.PORT || 5005
  const HOST = '0.0.0.0'
  const server = http.createServer((req, res) => {
    if (handleBaileysApiRoute(req, res)) return
    if (handleDownloadRoute(req, res)) return
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
