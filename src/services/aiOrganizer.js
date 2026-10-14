// Servicio de IA Avanzada para Auto-Organizer y Asistente Global (Groq API de ultra-alta velocidad)
// Modelo: qwen/qwen3.8-27b

const GROQ_API_KEY = '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'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const AI_MODEL = 'qwen/qwen3.8-27b'

/**
 * Organiza inteligentemente las tareas del usuario por orden de prioridad,
 * bloques de enfoque recomendados y distribucion balanceada para la semana.
 */
export async function organizeScheduleWithAI(tasks) {
  if (!tasks || tasks.length === 0) {
    return {
      success: false,
      message: 'No hay tareas para organizar',
      organizedTasks: [],
    }
  }

  const prompt = `Actúa como un experto en productividad personal y organización académica/profesional.
Tengo las siguientes tareas:
${JSON.stringify(tasks.map(t => ({
  id: t.id,
  title: t.title,
  date: t.date,
  time: t.time,
  effort: t.effort,
  context: t.context,
  completed: t.completed,
})))}

Instrucciones:
1. Reorganiza las tareas en el orden óptimo de ejecución para esta semana:
   - Bloques matutinos para tareas de alto esfuerzo (Deep Work / Estudio / Universidad).
   - Bloques vespertinos para proyectos prácticos y deporte.
   - Bloques nocturnos para descanso o tareas personales ligeras.
2. Devuelve ÚNICAMENTE un objeto JSON con este formato exacto, sin explicaciones ni texto adicional:
{
  "summary": "Resumen breve de la estrategia de organización para la semana (2 frases)",
  "recommendedFocusOrder": [ids de tareas en orden optimizado],
  "productivityTip": "Consejo de enfoque para hoy"
}`

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: 'Eres un organizador de productividad. Responde exclusivamente con JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    })

    if (!res.ok) {
      throw new Error(`Error en API Groq: ${res.statusText}`)
    }

    const data = await res.json()
    const content = data.choices[0]?.message?.content || '{}'
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)

    // Reordenar tareas según la recomendación de la IA
    const order = parsed.recommendedFocusOrder || []
    const sortedTasks = [...tasks].sort((a, b) => {
      const idxA = order.indexOf(a.id)
      const idxB = order.indexOf(b.id)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return 0
    })

    return {
      success: true,
      summary: parsed.summary || 'Tareas organizadas por nivel de esfuerzo y bloques de tiempo óptimos.',
      productivityTip: parsed.productivityTip || 'Comienza con la tarea de mayor impacto antes del mediodía.',
      sortedTasks,
    }
  } catch (err) {
    console.warn('Fallo en organizacion IA, aplicando algoritmo local optimizado:', err)
    const effortWeights = { High: 3, Medium: 2, Low: 1 }
    const sorted = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      const dateA = a.date || '9999'
      const dateB = b.date || '9999'
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      return (effortWeights[b.effort] || 2) - (effortWeights[a.effort] || 2)
    })
    return {
      success: true,
      summary: 'Tareas organizadas cronológicamente y por nivel de esfuerzo.',
      productivityTip: 'Asegúrate de tomar descansos cortos de 5 minutos entre bloques de concentración.',
      sortedTasks: sorted,
    }
  }
}

/**
 * Calcula fechas desplazadas (ej. próximos miércoles o días relativos)
 */
function addDays(baseDateStr, days) {
  const d = new Date(baseDateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/**
 * Analiza texto en lenguaje natural avanzado para extraer una o múltiples tareas,
 * o eventos recurrentes (ej. "2 actividades de mates para el jueves de 50m cada una"
 * o "clase de pádel todos los miércoles a las 7").
 */
export async function parseNaturalLanguageSchedule(text, baseDate = '2026-10-14') {
  if (!text || !text.trim()) return null

  // Fecha de referencia: 2026-10-14 (Miércoles)
  const prompt = `Analiza esta petición del usuario para programar tareas o eventos: "${text}".
Fecha de hoy de referencia: ${baseDate} (es Miércoles).
El usuario puede pedir una sola tarea, múltiples tareas simultáneas (ej. "2 actividades de mates...") o eventos recurrentes periódicos (ej. "todos los miércoles a las 7").

Instrucciones de extracción:
1. Identifica si pide múltiples tareas (ej: "2 actividades" -> crea un array con 2 objetos de tarea separados).
2. Si menciona periodicidad ("todos los miércoles", "cada semana"), márcalo con isRecurring: true y recurrence: "weekly".
3. Determina fecha exacta en formato YYYY-MM-DD relativa al ${baseDate}:
   - "jueves" -> 2026-10-15
   - "viernes" -> 2026-10-16
   - "sábado" -> 2026-10-17
   - "domingo" -> 2026-10-18
   - "lunes" -> 2026-10-19
   - "martes" -> 2026-10-20
   - "miércoles" -> 2026-10-14 o 2026-10-21 si es próximo
4. Determina la hora HH:MM (si dice a las 7 de la tarde -> 19:00, si no se indica -> 10:00).
5. Determina el contexto: "University" | "Health & Gym" | "Personal" | "Projects".
6. Determina el esfuerzo: "Low" | "Medium" | "High".
7. Duración estimada (ej: 50m, 60m, 90m).

Devuelve ÚNICAMENTE un JSON con este formato exacto:
{
  "summary": "Explicación concisa y natural en español de lo que se va a programar (1 frase)",
  "isRecurring": true o false,
  "recurrenceFrequency": "weekly" o null,
  "tasks": [
    {
      "title": "Nombre claro de la tarea",
      "description": "Detalles o notas útiles",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "effort": "Low" | "Medium" | "High",
      "context": "University" | "Health & Gym" | "Personal" | "Projects",
      "est": "50m",
      "icon": "calculate" | "fitness_center" | "school" | "terminal" | "task_alt" | "sports_tennis"
    }
  ]
}`

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: 'Eres un asistente experto en análisis de agendas. Responde exclusivamente con JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    })

    if (!res.ok) throw new Error('Error en API Groq')
    const data = await res.json()
    const content = data.choices[0]?.message?.content || '{}'
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)

    let generatedTasks = parsed.tasks || []

    // Si es recurrente semanal (ej. clase de pádel todos los miércoles),
    // creamos automáticamente los eventos de las próximas 4 semanas para que se vean en el calendario
    if (parsed.isRecurring && parsed.recurrenceFrequency === 'weekly' && generatedTasks.length > 0) {
      const baseTask = generatedTasks[0]
      const recurringList = []
      for (let i = 0; i < 4; i++) {
        const nextDate = addDays(baseTask.date || baseDate, i * 7)
        recurringList.push({
          ...baseTask,
          id: Date.now() + i * 100,
          title: baseTask.title,
          date: nextDate,
          isRecurring: true,
          recurrence: 'weekly',
        })
      }
      return {
        summary: parsed.summary || `Programado evento recurrente semanal: ${baseTask.title}`,
        tasks: recurringList,
        isRecurring: true,
      }
    }

    // Normalizar IDs
    const finalized = generatedTasks.map((t, idx) => ({
      id: Date.now() + idx * 50,
      title: t.title || 'Nueva tarea',
      description: t.description || '',
      date: t.date || baseDate,
      time: t.time || '10:00',
      effort: t.effort || 'Medium',
      context: t.context || 'University',
      est: t.est || '45m',
      icon: t.icon || 'task_alt',
      completed: false,
      calendarId: 'cal-default',
      color: t.effort === 'High' ? 'bg-rose-500' : t.effort === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500',
    }))

    return {
      summary: parsed.summary || `Se han generado ${finalized.length} tarea(s) correctamente.`,
      tasks: finalized,
      isRecurring: false,
    }
  } catch (err) {
    console.warn('Error parseando con IA remota, aplicando heurística local avanzada:', err)
    return parseScheduleLocalHeuristics(text, baseDate)
  }
}

/**
 * Heurística local instantánea para detección de lenguaje natural
 * (días relativos, horas, recurrencia, contexto académico/fitness/personal/proyectos)
 */
export function parseScheduleLocalHeuristics(text, baseDate = '2026-10-14') {
  if (!text || !text.trim()) return { summary: 'Sin texto', tasks: [], isRecurring: false }

  const lower = text.toLowerCase()

  // 1. Detección de fecha relativa al baseDate (2026-10-14 es Miércoles)
  let targetDate = baseDate
  const dayOffsets = {
    'hoy': 0,
    'mañana': 1,
    'pasado mañana': 2,
    'jueves': 1,
    'viernes': 2,
    'sábado': 3,
    'sabado': 3,
    'domingo': 4,
    'lunes': 5,
    'martes': 6,
    'miércoles': 7,
    'miercoles': 7,
  }

  for (const [dayKey, offset] of Object.entries(dayOffsets)) {
    if (lower.includes(dayKey)) {
      targetDate = addDays(baseDate, offset)
      break
    }
  }

  // 2. Periodicidad (recurrentes)
  const isRecurring = /todos los|cada semana|cada martes|cada lunes|cada miercoles|cada miércoles|cada jueves|cada viernes|cada sabado|cada sábado|cada domingo/i.test(lower)

  // 3. Hora
  let targetTime = '10:00'
  const timeMatch = lower.match(/(?:a las?|alas?)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la mañana|de la tarde|de la noche)?/i)
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10)
    const min = timeMatch[2] ? timeMatch[2] : '00'
    const modifier = (timeMatch[3] || '').toLowerCase()
    if ((modifier.includes('pm') || modifier.includes('tarde') || modifier.includes('noche')) && hour < 12) {
      hour += 12
    }
    targetTime = `${String(hour).padStart(2, '0')}:${min}`
  } else if (/gimnasio|gym|entrenar|padel|pádel/i.test(lower)) {
    targetTime = '18:00'
  } else if (/cena|cenar|noche/i.test(lower)) {
    targetTime = '21:00'
  }

  // 4. Contexto
  let context = 'University'
  let icon = 'school'
  if (/gimnasio|gym|entrenar|pesas|padel|pádel|correr|running|fitness|deporte/i.test(lower)) {
    context = 'Health & Gym'
    icon = 'fitness_center'
  } else if (/cena|comer|amigos|lucía|lucia|familia|comprar|supermercado|cine/i.test(lower)) {
    context = 'Personal'
    icon = 'person'
  } else if (/react|proyecto|api|deploy|código|codigo|tail|web|bug|github/i.test(lower)) {
    context = 'Projects'
    icon = 'terminal'
  }

  // 5. Esfuerzo y duración estimada
  let effort = 'Medium'
  let est = '45m'
  if (/examen|final|parcial|deploy|urgente/i.test(lower)) {
    effort = 'High'
    est = '90m'
  } else if (/repasar|lectura|leer|comprar|llamar/i.test(lower)) {
    effort = 'Low'
    est = '30m'
  } else if (/gimnasio|gym|entrenar|padel|pádel/i.test(lower)) {
    effort = 'Medium'
    est = '60m'
  }

  // 6. Limpieza de título
  let cleanTitle = text.trim()
  cleanTitle = cleanTitle.replace(/^(?:añadir|crear|programar|pon|recuerda|ponme)\s+/i, '')
  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)

  const baseTask = {
    id: Date.now(),
    title: cleanTitle,
    description: `Programado automáticamente: ${cleanTitle}`,
    date: targetDate,
    time: targetTime,
    effort,
    context,
    est,
    icon,
    completed: false,
    calendarId: 'cal-default',
    color: effort === 'High' ? 'bg-rose-500' : effort === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500',
  }

  if (isRecurring) {
    const recurringList = []
    for (let i = 0; i < 4; i++) {
      const nextDate = addDays(targetDate, i * 7)
      recurringList.push({
        ...baseTask,
        id: Date.now() + i * 100,
        title: baseTask.title,
        date: nextDate,
        isRecurring: true,
        recurrence: 'weekly',
      })
    }
    return {
      summary: `Programado evento recurrente semanal: ${baseTask.title}`,
      tasks: recurringList,
      isRecurring: true,
    }
  }

  return {
    summary: `Programada con IA: ${baseTask.title} (${targetDate} a las ${targetTime}, ${context})`,
    tasks: [baseTask],
    isRecurring: false,
  }
}

/**
 * Función compatible hacia atrás
 */
export async function parseNaturalLanguageTask(text) {
  const result = await parseNaturalLanguageSchedule(text)
  return result?.tasks?.[0] || null
}

/**
 * Aplica con seguridad un conjunto de acciones automáticas dictadas por la IA sobre la lista de tareas.
 * Soporta: add_tasks, update_task, delete_task, complete_task y make_recurring.
 */
export function applyAIActions(currentTasks = [], actions = []) {
  if (!actions || actions.length === 0) return currentTasks

  let updatedTasks = [...currentTasks]

  for (const act of actions) {
    if (act.type === 'add_tasks' || act.type === 'add_task') {
      const items = act.tasks || (act.task ? [act.task] : [])
      const newItems = items.map((t, idx) => ({
        id: t.id || Date.now() + idx * 75,
        title: t.title || 'Nueva tarea',
        description: t.description || '',
        date: t.date || '2026-10-14',
        time: t.time || '10:00',
        effort: t.effort || 'Medium',
        context: t.context || 'University',
        est: t.est || (t.effort === 'High' ? '90m' : t.effort === 'Medium' ? '45m' : '30m'),
        icon: t.icon || 'task_alt',
        completed: Boolean(t.completed),
        calendarId: t.calendarId || 'cal-default',
        color: t.effort === 'High' ? 'bg-rose-500' : t.effort === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500',
        isRecurring: Boolean(t.isRecurring),
        recurrence: t.recurrence || null,
      }))
      updatedTasks = [...newItems, ...updatedTasks]
    } else if (act.type === 'update_task') {
      const { taskId, targetTitle, updates = {} } = act
      updatedTasks = updatedTasks.map((t) => {
        const matchesId = taskId && String(t.id) === String(taskId)
        const matchesTitle = targetTitle && t.title.toLowerCase().includes(targetTitle.toLowerCase())
        if (matchesId || matchesTitle) {
          const newEffort = updates.effort || t.effort
          const effortColors = {
            Low: 'bg-emerald-500',
            Medium: 'bg-amber-500',
            High: 'bg-rose-500',
          }
          return {
            ...t,
            ...updates,
            effort: newEffort,
            color: effortColors[newEffort] || t.color,
          }
        }
        return t
      })
    } else if (act.type === 'delete_task') {
      const { taskId, targetTitle } = act
      updatedTasks = updatedTasks.filter((t) => {
        if (taskId && String(t.id) === String(taskId)) return false
        if (targetTitle && t.title.toLowerCase().includes(targetTitle.toLowerCase())) return false
        return true
      })
    } else if (act.type === 'complete_task') {
      const { taskId, targetTitle, completed = true } = act
      updatedTasks = updatedTasks.map((t) => {
        const matchesId = taskId && String(t.id) === String(taskId)
        const matchesTitle = targetTitle && t.title.toLowerCase().includes(targetTitle.toLowerCase())
        if (matchesId || matchesTitle) {
          return { ...t, completed }
        }
        return t
      })
    } else if (act.type === 'make_recurring') {
      const { taskId, targetTitle, frequency = 'weekly', count = 4 } = act
      const base = updatedTasks.find(
        (t) => (taskId && String(t.id) === String(taskId)) || (targetTitle && t.title.toLowerCase().includes(targetTitle.toLowerCase()))
      )
      if (base) {
        updatedTasks = updatedTasks.map((t) => (t.id === base.id ? { ...t, isRecurring: true, recurrence: frequency } : t))
        const recurringList = []
        for (let i = 1; i < count; i++) {
          const nextDate = addDays(base.date || '2026-10-14', i * 7)
          recurringList.push({
            ...base,
            id: Date.now() + i * 110,
            title: base.title,
            date: nextDate,
            isRecurring: true,
            recurrence: frequency,
          })
        }
        updatedTasks = [...updatedTasks, ...recurringList]
      }
    }
  }

  return updatedTasks
}

/**
 * Conversación inteligente con el Asistente IA (Groq) con CONTROL TOTAL sobre el calendario y tareas
 */
export async function chatWithAICopilot({ userMessage, currentTasks = [], chatHistory = [] }) {
  const todayStr = '2026-10-14'

  // Contexto conciso de tareas actuales
  const tasksSummary = currentTasks.map(t => ({
    id: t.id,
    title: t.title,
    date: t.date,
    time: t.time,
    effort: t.effort,
    context: t.context,
    est: t.est,
    completed: t.completed,
    isRecurring: t.isRecurring,
  }))

  const systemPrompt = `Eres el Asistente Inteligente de Productividad integrado en StudentHub con CONTROL TOTAL sobre el calendario y tareas del usuario.
Fecha actual de referencia: ${todayStr} (Miércoles).
Tareas actuales del usuario en el sistema:
${JSON.stringify(tasksSummary, null, 2)}

Tienes permisos plenos para:
1. MODIFICAR/EDITAR tareas existentes cuando el usuario diga que se ha equivocado, quiera cambiar la hora, fecha, título, descripción, dificultad/esfuerzo, duración o categoría (ej: "Me he equivocado con esto, cámbialo a las 18:00", "Ponle a mates dificultad alta", "Pasa la cena al sábado"). Identifica la tarea por su "taskId" y/o "targetTitle".
2. CREAR o AÑADIR nuevas tareas/eventos (simples o múltiples, ej: "Añade 2 ejercicios de mates para el jueves de 50m cada uno").
3. AÑADIR RECURRENCIA / REPETICIÓN (ej: "Haz que se repita la clase de pádel todos los miércoles", "Ponlo semanal").
4. CAMBIAR DIFICULTAD / ESFUERZO (ej: "Ponle a esta tarea esfuerzo alto", "Bájale la dificultad a bajo"). Valores válidos: "Low", "Medium", "High".
5. COMPLETAR / DESMARCAR tareas (ej: "Ya he terminado el gimnasio", "Marca como hecha la tarea de IA").
6. ELIMINAR / BORRAR tareas (ej: "Borra la tarea de la cena").
7. RESPONDER DUDAS y dar consejos sobre qué hacer hoy, cómo organizarse, técnica Pomodoro o descansos.

Devuelve ÚNICAMENTE un JSON con esta estructura exacta, sin texto introductorio ni explicaciones fuera del JSON:
{
  "reply": "Respuesta en español explicando con claridad y amabilidad los cambios realizados o respondiendo a la pregunta",
  "actions": [
    {
      "type": "add_tasks" | "update_task" | "delete_task" | "complete_task" | "make_recurring",
      "taskId": 1,
      "targetTitle": "palabras clave para identificar la tarea si aplica",
      "tasks": [ ... ],
      "updates": {
        "time": "HH:MM",
        "date": "YYYY-MM-DD",
        "effort": "Low" | "Medium" | "High",
        "title": "Nuevo título",
        "description": "Nueva descripción",
        "context": "University" | "Health & Gym" | "Personal" | "Projects",
        "est": "50m"
      },
      "frequency": "weekly",
      "count": 4,
      "completed": true
    }
  ]
}`

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-6).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: userMessage },
  ]

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 850,
      }),
    })

    if (!res.ok) throw new Error('Error al conectar con Groq API')
    const data = await res.json()
    const content = data.choices[0]?.message?.content || '{}'
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content)

    // Normalizar lista de acciones devuelta por la IA
    const actions = parsed.actions || []
    if (parsed.newTasks && parsed.newTasks.length > 0 && actions.length === 0) {
      actions.push({
        type: 'add_tasks',
        tasks: parsed.newTasks,
      })
    }

    return {
      reply: parsed.reply || 'He procesado tu petición correctamente.',
      actions,
    }
  } catch (err) {
    console.warn('Error en chat IA:', err)
    return {
      reply: 'No he podido contactar con el servicio en este momento. Si deseas gestionar una tarea, puedes usar los controles de la aplicación.',
      actions: [],
    }
  }
}

