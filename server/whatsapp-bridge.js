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
} from '@whiskeysockets/baileys'
import QRCode from 'qrcode'
import pino from 'pino'
import path from 'path'
import fs from 'fs'
import http from 'http'

const AUTH_DIR = path.resolve(process.cwd(), '.whatsapp_auth')
const TASKS_FILE = path.resolve(process.cwd(), '.whatsapp_synced_tasks.json')
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_AUDIO_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'
const AI_MODEL = 'openai/gpt-oss-120b'
const WHISPER_MODEL = 'whisper-large-v3-turbo'
const DIVIDER = '- - - - - - - - - - - - - - - - - - - -'

// Estado en memoria del puente
let sock = null
let currentStatus = {
  status: 'disconnected', // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
  qrCode: null,
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

// Cargar tareas guardadas localmente (incluye tombstones de los últimos 15 min)
function loadSyncedTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const data = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'))
      if (Array.isArray(data)) {
        return data.filter(
          (t) => !t._deleted || (Date.now() - (t.deletedAt || 0) < 15 * 60 * 1000)
        )
      }
    }
  } catch (e) {}
  return []
}

function saveSyncedTasks(tasks) {
  try {
    const toSave = (tasks || []).filter(
      (t) => !t._deleted || (Date.now() - (t.deletedAt || 0) < 15 * 60 * 1000)
    )
    fs.writeFileSync(TASKS_FILE, JSON.stringify(toSave, null, 2), 'utf-8')
  } catch (e) {}
}

// Historial en memoria de tareas conocidas
let currentKnownTasks = loadSyncedTasks()

export function updateKnownTasks(tasks) {
  if (Array.isArray(tasks)) {
    // 1. Identificar tombstones activos para que la sincronización del frontend nunca los resucite
    const deletedIds = new Set(
      currentKnownTasks.filter((t) => t._deleted).map((t) => String(t.id))
    )
    const deletedTitles = currentKnownTasks
      .filter((t) => t._deleted && t.title)
      .map((t) => t.title.trim().toLowerCase())

    const validIncoming = tasks.filter((t) => {
      if (deletedIds.has(String(t.id))) return false
      const tTitle = (t.title || '').trim().toLowerCase()
      if (
        tTitle &&
        deletedTitles.some((dt) => dt === tTitle || tTitle.includes(dt) || dt.includes(tTitle))
      ) {
        return false
      }
      return true
    })

    const incomingIds = new Set(validIncoming.map((t) => String(t.id)))
    const incomingKeys = new Set(
      validIncoming.map((t) => `${(t.title || '').trim().toLowerCase()}_${t.date}_${t.time}`)
    )

    // Tareas creadas por WhatsApp pendientes de incorporarse en frontend
    const pendingWhatsAppTasks = currentKnownTasks.filter(
      (bt) =>
        !bt._deleted &&
        !incomingIds.has(String(bt.id)) &&
        !incomingKeys.has(`${(bt.title || '').trim().toLowerCase()}_${bt.date}_${bt.time}`) &&
        (bt.source?.startsWith('whatsapp') || bt.source === 'chat_test')
    )

    const activeTombstones = currentKnownTasks.filter(
      (t) => t._deleted && Date.now() - (t.deletedAt || 0) < 15 * 60 * 1000
    )

    currentKnownTasks = [...activeTombstones, ...pendingWhatsAppTasks, ...validIncoming]
    saveSyncedTasks(currentKnownTasks)
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

// Aplicar acciones (add, update, delete) sobre currentKnownTasks
export function applyBridgeActions(actions, source = 'whatsapp') {
  if (!Array.isArray(actions) || actions.length === 0) return []

  const modified = []

  for (const act of actions) {
    if (act.type === 'add_task' && act.task) {
      const t = act.task
      const newTask = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        title: t.title || 'Nueva tarea',
        date: t.date || new Date().toISOString().split('T')[0],
        time: t.time || '10:00',
        effort: t.effort || 'Medium',
        context: t.context || 'University',
        est: t.est || '45m',
        description: t.description || '',
        recurrence: t.recurrence || 'none',
        completed: false,
        calendarId: 'cal-default',
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
    } else if (act.type === 'update_task') {
      const targetId = act.targetId
      const targetTitle = (act.targetTitle || '').trim().toLowerCase()
      const updates = act.updates || {}

      let idx = -1
      if (targetId) {
        idx = currentKnownTasks.findIndex((t) => !t._deleted && String(t.id) === String(targetId))
      }
      if (idx === -1 && targetTitle) {
        idx = currentKnownTasks.findIndex((t) => {
          if (t._deleted) return false
          const tName = (t.title || '').toLowerCase()
          return tName === targetTitle || tName.includes(targetTitle) || targetTitle.includes(tName)
        })
      }
      if (idx === -1 && currentKnownTasks.length > 0) {
        idx = currentKnownTasks.findIndex((t) => !t._deleted)
      }

      if (idx !== -1) {
        const prev = currentKnownTasks[idx]
        const updated = {
          ...prev,
          ...updates,
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
      const targetTitle = (act.targetTitle || '').trim().toLowerCase()
      const isDeleteAll =
        act.type === 'delete_all_tasks' ||
        targetTitle === 'todas' ||
        targetTitle === 'todos' ||
        targetTitle === 'todo' ||
        targetTitle === 'todas las tareas' ||
        targetTitle === 'todos los eventos'

      const matchedIndices = []
      for (let i = 0; i < currentKnownTasks.length; i++) {
        const t = currentKnownTasks[i]
        if (t._deleted) continue

        if (isDeleteAll) {
          matchedIndices.push(i)
          continue
        }

        const tId = String(t.id)
        const tName = (t.title || '').trim().toLowerCase()

        if (targetId && tId === String(targetId)) {
          matchedIndices.push(i)
          continue
        }

        if (targetTitle) {
          // 1. Coincidencia exacta
          if (tName === targetTitle) {
            matchedIndices.push(i)
            continue
          }

          // 2. Si targetTitle o tName son muy cortos (<= 2 caracteres), exigir palabra completa
          if (targetTitle.length <= 2 || tName.length <= 2) {
            const shortWordRegex = new RegExp(`(^|\\s|[.,;:-])${targetTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[.,;:-])`, 'i')
            if (shortWordRegex.test(tName)) {
              matchedIndices.push(i)
              continue
            }
          } else {
            // 3. Para 3 o más caracteres: coincidencia de inclusión segura
            if (tName.includes(targetTitle)) {
              matchedIndices.push(i)
              continue
            }
            const nameRegex = new RegExp(`(^|\\s|[.,;:-])${tName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s|[.,;:-])`, 'i')
            if (nameRegex.test(targetTitle)) {
              matchedIndices.push(i)
              continue
            }
          }

          // 4. Tokens significativos
          const stopWords = new Set([
            'para', 'esta', 'este', 'estos', 'estas', 'tres', 'dos', 'cuatro', 'cinco',
            'evento', 'eventos', 'tarea', 'tareas', 'que', 'has', 'creado', 'los', 'las', 'mis',
            'borra', 'elimina', 'quita', 'llamada', 'llamado', 'favor', 'por'
          ])
          const tokens = targetTitle
            .split(/[\s,]+/)
            .filter((w) => w.length >= 3 && !stopWords.has(w))

          if (tokens.length > 0) {
            const hasMatch = tokens.some((tok) => {
              const singular = tok.endsWith('s') ? tok.slice(0, -1) : tok
              return tName.includes(tok) || tName.includes(singular)
            })
            if (hasMatch) {
              matchedIndices.push(i)
              continue
            }
          }

          // 5. Si pide borrar tareas falsas o de prueba explícitas
          if (
            (targetTitle.includes('falso') || targetTitle.includes('inventad') || targetTitle.includes('de prueba')) &&
            (tName.includes('fals') || tName.includes('prueb') || tName.includes('invent') || t.source?.startsWith('whatsapp') || t.source?.startsWith('chat'))
          ) {
            matchedIndices.push(i)
            continue
          }
        }
      }

      for (const idx of matchedIndices) {
        const item = currentKnownTasks[idx]
        item._deleted = true
        item.deletedAt = Date.now()
        item.updatedAt = Date.now()
        modified.push({ ...item })
      }
    }
  }

  saveSyncedTasks(currentKnownTasks)
  return modified
}

// Llamada resiliente a Groq con failover automático de modelos ante 429
async function callGroqWithFallback(payload) {
  const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']
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
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const dayOfWeek = days[now.getDay()]
  const currentTimeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const tasksSummary = formatTasksSummary(currentKnownTasks)

  const systemPrompt = `Eres "AI Helper", el asistente personal de élite de Jorge en su WhatsApp.
Fecha y hora actual: ${todayStr} (${dayOfWeek}), ${currentTimeStr}.
Usuario: Jorge (estudiante universitario de informática/sistemas, desarrollador tech, deportista pádel/gym, vida personal).

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

   C) AÑADIR TAREAS Y MEMORIA POR LOTES TRAS HISTORIAL ("add_task"):
      - Si pide añadir actividades directamente ("añade X mañana a las 18:00", "apúntame pádel el jueves a las 19"): emite la acción "add_task".
      - Si en mensajes previos te estuvo contando cosas que tiene que hacer (ej. "tengo que estudiar redes, luego ir al gym, después reunión...") sin pedirte agendarlas, y luego dice "añádelas al calendario" o "apúntamelas todas":
        REVISA TODO EL HISTORIAL y rescata TODAS las actividades mencionadas, creando una acción "add_task" individual para CADA UNA sin dejarte ninguna.
      - Si se indica duración (ej. "dura 1 hora"), pon est: "60m" y description: "Duración estimada: 1 hora. Bloque reservado en planning.".
      - Si es un examen con preparación (ej. 2 semanas), crea el examen más un hito previo de inicio de estudio 7-10 días antes ("Comenzar estudio para...") y un repaso intensivo 2 días antes ("Repaso intensivo...").
      - Responde amablemente confirmando los eventos añadidos.

   D) MODIFICAR, RENOMBRAR O MARCAR COMO HECHA ("update_task"):
      - Renombrar: "cambia el nombre de X por Y" -> { "type": "update_task", "targetTitle": "X", "updates": { "title": "Y" } }.
      - Rectificar hora: "no, me he equivocado es a las 20:30" -> { "type": "update_task", "updates": { "time": "20:30" } }.
      - Marcar completada: "marca como hecha la tarea de gym" -> { "type": "update_task", "targetTitle": "gym", "updates": { "completed": true } }.
      - Responde amablemente confirmando la actualización.

   E) CONVERSACIÓN GENERAL:
      - Si Jorge te saluda o te hace preguntas libres, responde como un asistente inteligente, empático y conversacional, siempre dentro de las barras.

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
        "completed": true/false,
        "description": "..."
      }
    },
    {
      "type": "delete_task",
      "targetTitle": "Título o parte del título a eliminar (o 'todos')",
      "targetId": null
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

// Iniciar conexión con Baileys
export async function startBaileysConnection() {
  if (currentStatus.status === 'connected' && sock) {
    return currentStatus
  }

  currentStatus = {
    status: 'connecting',
    qrCode: null,
    user: null,
    phone: null,
    lastUpdated: Date.now(),
  }

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['StudentHub App', 'Chrome', '120.0.0'],
    })

    // Actualizaciones de Conexión (QR, Conectado, Desconectado)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { scale: 8, margin: 2 })
          currentStatus = {
            status: 'qr_ready',
            qrCode: qrDataUrl,
            user: null,
            phone: null,
            lastUpdated: Date.now(),
          }
          console.log('[Baileys]: Código QR generado y listo para escanear.')
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
          user: null,
          phone: null,
          lastUpdated: Date.now(),
          reconnecting: shouldReconnect,
        }

        console.log(`[Baileys]: Conexión cerrada (Código: ${statusCode}). Reconectar: ${shouldReconnect}`)

        if (shouldReconnect) {
          setTimeout(() => startBaileysConnection(), 3000)
        } else {
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true })
          } catch (e) {}
        }
      } else if (connection === 'open') {
        const userJid = sock.user?.id || ''
        const rawPhone = userJid.split(':')[0] || userJid.split('@')[0]

        currentStatus = {
          status: 'connected',
          qrCode: null,
          user: sock.user?.name || 'Usuario StudentHub',
          phone: rawPhone ? `+${rawPhone}` : 'Dispositivo Vinculado',
          lastUpdated: Date.now(),
        }

        console.log(`[Baileys]: Conexión abierta con éxito. Usuario: ${currentStatus.phone}`)
      }
    })

    sock.ev.on('creds.update', saveCreds)

    // Escucha de mensajes entrantes (Texto y Notas de Voz)
    const processedMsgIds = new Set()

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return

      for (const msg of messages) {
        if (!msg.message) continue
        const from = msg.key.remoteJid
        if (!from || from === 'status@broadcast') continue

        // Evitar procesar mensajes enviados por el propio bot
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

        // REGLA DE PRIVACIDAD ESTRICTA:
        // 1. En chat consigo mismo (isChatWithSelf): responde directamente.
        // 2. En chat con otras personas o grupos (!isChatWithSelf):
        //    "solo yo, al otro no le hace caso" -> Si el mensaje lo envió otra persona (!msg.key.fromMe), se ignora por completo.
        if (!isChatWithSelf && !msg.key.fromMe) {
          continue
        }

        // Si es el chat propio, guardarlo para briefings automáticos de medianoche
        if (isChatWithSelf) {
          lastUserJid = from
        }

        // Detectar si es una nota de voz o mensaje de audio
        const innerMsg =
          msg.message.ephemeralMessage?.message ||
          msg.message.viewOnceMessage?.message ||
          msg.message.viewOnceMessageV2?.message ||
          msg.message

        const audioMsg = innerMsg.audioMessage
        let userText = ''
        let isVoiceNote = false

        if (audioMsg) {
          isVoiceNote = true
          console.log(`[Baileys]: Audio detectado en ${from} (${isChatWithSelf ? 'Chat Propio' : 'Chat Externo'}). Transcribiendo...`)
          try {
            const audioBuffer = await downloadMediaMessage(
              msg,
              'buffer',
              {},
              { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
            )
            const mimetype = audioMsg.mimetype || 'audio/ogg; codecs=opus'
            userText = await transcribeAudioWithWhisper(audioBuffer, mimetype)
            console.log(`[Baileys]: Audio transcrito con éxito: "${userText}"`)
          } catch (audioErr) {
            console.error('[Baileys Audio Error]:', audioErr.message)
            continue
          }
        } else {
          // Extraer texto regular
          userText =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            ''
        }

        if (!userText || !userText.trim()) continue

        // Evitar procesar respuestas emitidas por el propio bot (barras divisoras)
        const trimmed = userText.trim()
        if (trimmed.startsWith('- - - - - - - - - - - - - - - - - - - -') || trimmed.includes(DIVIDER)) {
          continue
        }

        // CONTROL DE COMANDO /ia EN CHATS CON OTRAS PERSONAS O GRUPOS:
        // "si estoy en chat de otros, solo responda si hago al final /ia y solo yo, al otro no le hace caso"
        const iaTriggerRegex = /(?:^|\s|\b)(?:\/|barra\s*)ia\s*$/i
        if (!isChatWithSelf) {
          if (!iaTriggerRegex.test(trimmed)) {
            // Conversación normal con otra persona: no intervenir
            continue
          }
          // Limpiar el comando /ia del texto para enviarlo limpio a la IA
          userText = trimmed.replace(iaTriggerRegex, '').trim() || 'Hola'
        }

        // Registrar el ID del mensaje para evitar duplicados
        if (msg.key.id) {
          processedMsgIds.add(msg.key.id)
          if (processedMsgIds.size > 2000) processedMsgIds.clear()
        }

        console.log(
          `[Baileys Mensaje Procesado de ${from} (${isChatWithSelf ? 'Chat Propio' : 'Chat Externo + /ia'} | ${isVoiceNote ? 'Audio' : 'Texto'})]: "${userText}"`
        )

        // Analizar con IA (Conversación Total, Renombrado, Memoria y Anticipación de Carga)
        const aiResult = await processMessageWithAI(userText.trim(), from)

        // Si se generaron acciones (añadir, modificar, eliminar), aplicarlas inmediatamente
        if (Array.isArray(aiResult.actions) && aiResult.actions.length > 0) {
          const modified = applyBridgeActions(
            aiResult.actions,
            isVoiceNote ? 'whatsapp_audio_whisper' : 'whatsapp_text_baileys'
          )
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

        // Garantizar barras de guiones espaciados exactamente arriba y abajo
        replyToSend = `${DIVIDER}\n${replyToSend}\n${DIVIDER}`

        // Responder por WhatsApp al chat de origen
        if (replyToSend) {
          try {
            const sentMsg = await sock.sendMessage(from, { text: replyToSend })
            if (sentMsg?.key?.id) {
              sentBotMessageIds.add(sentMsg.key.id)
            }
            console.log(`[Baileys]: Respuesta enviada a ${from}`)
          } catch (sendErr) {
            console.error('[Baileys Error Enviando]:', sendErr.message)
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

  sock = null
  currentStatus = {
    status: 'disconnected',
    qrCode: null,
    user: null,
    phone: null,
    lastUpdated: Date.now(),
  }
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
  return loadSyncedTasks()
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
    startBaileysConnection()
      .then((st) => {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(st))
      })
      .catch((err) => {
        res.statusCode = 500
        res.end(JSON.stringify({ error: err.message }))
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

  if (pathname === '/api/baileys/sync-tasks' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        const { tasks } = JSON.parse(body)
        updateKnownTasks(tasks)
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

  server.listen(PORT, HOST, () => {
    console.log(`[WhatsApp Baileys Bridge] Servidor escuchando en http://${HOST}:${PORT}`)
  })
}
