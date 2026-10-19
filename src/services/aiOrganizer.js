// Servicio de IA Avanzada para Auto-Organizer y Asistente Global (Groq API de ultra-alta velocidad)
// Modelo: qwen/qwen3.8-27b

const GROQ_API_KEY = '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'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODELS = ['qwen/qwen3.8-27b', 'allam-2-7b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']
const RENDER_BACKEND_URL = 'https://freestudentapphub.onrender.com'

/**
 * Llamada resiliente a la API de Groq con failover automático entre modelos
 * y fallback directo al backend de Render si la red cliente falla.
 */
export async function callGroqWithFallback({ messages, temperature = 0.2, max_tokens = 850, jsonMode = true }) {
  let lastError = null

  // 1. Probar modelos de texto disponibles en Groq directamente
  for (const model of GROQ_MODELS) {
    try {
      const body = {
        model,
        messages,
        temperature,
        max_tokens,
      }
      if (jsonMode) {
        body.response_format = { type: 'json_object' }
      }

      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ''
        if (text && text.trim()) {
          return { success: true, content: text, model }
        }
      } else {
        const errText = await res.text().catch(() => '')
        console.warn(`[AI Failover] Modelo ${model} respondió status ${res.status}: ${errText.slice(0, 80)}`)
        lastError = new Error(`Groq ${model} status ${res.status}`)
      }
    } catch (err) {
      console.warn(`[AI Failover] Excepción con modelo ${model}:`, err.message)
      lastError = err
    }
  }

  // 2. Fallback a endpoint de chat en backend Render
  try {
    const userText = messages[messages.length - 1]?.content || ''
    const backendRes = await fetch(`${RENDER_BACKEND_URL}/api/baileys/chat-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: userText,
        applyActions: false,
      }),
    })
    if (backendRes.ok) {
      const data = await backendRes.json()
      if (data && (data.reply || data.content)) {
        return {
          success: true,
          content: JSON.stringify(data),
          model: 'render-backend-bridge',
          parsedData: data,
        }
      }
    }
  } catch (backendErr) {
    console.warn('[AI Failover] Fallback a backend Render falló:', backendErr.message)
  }

  return { success: false, error: lastError }
}

export function getCalendarReference(targetDate = null) {
  const baseD = targetDate
    ? new Date(targetDate + (targetDate.length === 10 ? 'T12:00:00' : ''))
    : new Date()
  const todayYmd = `${baseD.getFullYear()}-${String(baseD.getMonth() + 1).padStart(2, '0')}-${String(baseD.getDate()).padStart(2, '0')}`

  const dayOfWeekNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const dayOfWeek = dayOfWeekNames[baseD.getDay()]

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
- Domingo: ${thisWeekDates['domingo']}
Próxima semana:
- Lunes que viene: ${nextWeekDates['lunes']}
- Martes que viene: ${nextWeekDates['martes']}
- Miércoles que viene: ${nextWeekDates['miércoles']}
- Jueves que viene: ${nextWeekDates['jueves']}
- Viernes que viene: ${nextWeekDates['viernes']}
- Sábado que viene: ${nextWeekDates['sábado']}
- Domingo que viene: ${nextWeekDates['domingo']}`

  return {
    todayYmd,
    dayOfWeek,
    calendarTableText,
    thisWeekDates,
    nextWeekDates,
  }
}

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
    const aiRes = await callGroqWithFallback({
      messages: [
        { role: 'system', content: 'Eres un organizador de productividad. Responde exclusivamente con JSON válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 600,
      jsonMode: true,
    })

    if (!aiRes.success) {
      throw new Error('Servicio de IA temporalmente inaccesible')
    }

    const content = aiRes.content || '{}'
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
export async function parseNaturalLanguageSchedule(text, baseDate = null) {
  if (!text || !text.trim()) return null

  const calRef = getCalendarReference(baseDate)

  const prompt = `Analiza esta petición del usuario para programar tareas o eventos: "${text}".
${calRef.calendarTableText}
El usuario puede pedir una sola tarea, múltiples tareas simultáneas (ej. "2 actividades de mates...") o eventos recurrentes periódicos (ej. "todos los miércoles a las 7").

Instrucciones de extracción:
1. Identifica si pide múltiples tareas (ej: "2 actividades" -> crea un array con 2 objetos de tarea separados).
2. Si menciona periodicidad ("todos los miércoles", "cada semana"), márcalo con isRecurring: true y recurrence: "weekly".
3. Determina fecha exacta en formato YYYY-MM-DD consultando la tabla de fechas:
   - Consulta el día nombrado en la tabla oficial de fechas y extrae estrictamente su fecha YYYY-MM-DD correspondiente.
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
    const aiRes = await callGroqWithFallback({
      messages: [
        { role: 'system', content: 'Eres un asistente experto en análisis de agendas. Responde exclusivamente con JSON válido.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 800,
      jsonMode: true,
    })

    if (!aiRes.success) throw new Error('Servicio de IA temporalmente inaccesible')
    const content = aiRes.content || '{}'
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
export function parseScheduleLocalHeuristics(text, baseDate = null) {
  if (!text || !text.trim()) return { summary: 'Sin texto', tasks: [], isRecurring: false }

  const calRef = getCalendarReference(baseDate)
  const effBaseDate = calRef.todayYmd

  const lower = text.toLowerCase()

  // 1. Detección de fecha relativa al baseDate
  let targetDate = effBaseDate

  if (lower.includes('hoy')) {
    targetDate = effBaseDate
  } else if (lower.includes('pasado mañana') || lower.includes('pasado manana')) {
    targetDate = addDays(effBaseDate, 2)
  } else if (lower.includes('mañana') || lower.includes('manana')) {
    targetDate = addDays(effBaseDate, 1)
  } else {
    const dayTargetMap = {
      'domingo': calRef.thisWeekDates['domingo'],
      'lunes': calRef.thisWeekDates['lunes'],
      'martes': calRef.thisWeekDates['martes'],
      'miércoles': calRef.thisWeekDates['miércoles'],
      'miercoles': calRef.thisWeekDates['miércoles'],
      'jueves': calRef.thisWeekDates['jueves'],
      'viernes': calRef.thisWeekDates['viernes'],
      'sábado': calRef.thisWeekDates['sábado'],
      'sabado': calRef.thisWeekDates['sábado'],
    }

    for (const [dayKey, dayYmd] of Object.entries(dayTargetMap)) {
      if (lower.includes(dayKey)) {
        targetDate = dayYmd
        if (dayYmd < effBaseDate || lower.includes('que viene') || lower.includes('proximo') || lower.includes('próximo')) {
          const nextDayMap = {
            'domingo': calRef.nextWeekDates['domingo'],
            'lunes': calRef.nextWeekDates['lunes'],
            'martes': calRef.nextWeekDates['martes'],
            'miércoles': calRef.nextWeekDates['miércoles'],
            'miercoles': calRef.nextWeekDates['miércoles'],
            'jueves': calRef.nextWeekDates['jueves'],
            'viernes': calRef.nextWeekDates['viernes'],
            'sábado': calRef.nextWeekDates['sábado'],
            'sabado': calRef.nextWeekDates['sábado'],
          }
          targetDate = nextDayMap[dayKey] || dayYmd
        }
        break
      }
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
        date: t.date || getCalendarReference().todayYmd,
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
          const nextDate = addDays(base.date || getCalendarReference().todayYmd, i * 7)
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
 * Resuelve peticiones conversacionales y de control de calendario de forma local
 * cuando los servicios remotos no responden o hay problemas de conexión.
 */
export function resolveAICopilotLocally(userMessage, currentTasks = [], chatHistory = []) {
  const calRef = getCalendarReference()
  const todayStr = calRef.todayYmd
  const lower = (userMessage || '').toLowerCase().trim()

  // 1. Consulta de tareas de hoy / resumen
  if (/qu[eé] tengo hoy|tengo hoy|tareas de hoy|mi d[ií]a|agenda de hoy|horario de hoy|qu[eé] hay hoy/i.test(lower)) {
    const todayTasks = (currentTasks || []).filter(t => t.date === todayStr && !t.completed)
    if (todayTasks.length === 0) {
      return {
        reply: `Hoy (${calRef.dayOfWeek}, ${todayStr}) no tienes tareas pendientes registradas en tu calendario. ¿Quieres que programemos alguna sesión de estudio, gym o proyecto?`,
        actions: [],
      }
    }
    const list = todayTasks.map(t => `• ${t.time || 'Durante el día'}: ${t.title} (${t.context || 'General'})`).join('\n')
    return {
      reply: `Hoy (${calRef.dayOfWeek}, ${todayStr}) tienes ${todayTasks.length} tarea(s) pendiente(s):\n\n${list}\n\n¿Quieres que modifique la hora de alguna o marque alguna como completada?`,
      actions: [],
    }
  }

  // 2. Consulta de mañana
  if (/qu[eé] tengo ma[ñn]ana|tareas de ma[ñn]ana|agenda de ma[ñn]ana/i.test(lower)) {
    const tomorrowStr = addDays(todayStr, 1)
    const tomorrowTasks = (currentTasks || []).filter(t => t.date === tomorrowStr && !t.completed)
    if (tomorrowTasks.length === 0) {
      return {
        reply: `Mañana (${tomorrowStr}) no tienes tareas pendientes asignadas. ¿Quieres que programemos alguna?`,
        actions: [],
      }
    }
    const list = tomorrowTasks.map(t => `• ${t.time || 'Durante el día'}: ${t.title}`).join('\n')
    return {
      reply: `Para mañana tienes ${tomorrowTasks.length} tarea(s):\n\n${list}`,
      actions: [],
    }
  }

  // 3. Borrar / Eliminar tarea
  if (/borra|elimina|quita|suprime/i.test(lower)) {
    const targetMatch = lower.replace(/borra(?:r)?|elimina(?:r)?|quita(?:r)?|suprime|la tarea de|la tarea|el evento|de mi calendario/gi, '').trim()
    const found = (currentTasks || []).find(t => t.title && t.title.toLowerCase().includes(targetMatch))
    if (found) {
      return {
        reply: `He eliminado "${found.title}" de tu calendario correctamente.`,
        actions: [{ type: 'delete_task', taskId: found.id, targetTitle: found.title }],
      }
    }
    return {
      reply: `He buscado "${targetMatch}" para eliminarla pero no he encontrado ninguna tarea coincidente. Puedes comprobar el nombre exacto en el calendario.`,
      actions: [],
    }
  }

  // 4. Completar tarea
  if (/terminad[ao]|completad[ao]|hech[ao]|marcar como (?:hecha|completada)|ya hice/i.test(lower)) {
    const targetMatch = lower.replace(/he terminado|he completado|ya he hecho|marcar como hecha|marca como hecha|marca como completada|la tarea de|la tarea|el evento/gi, '').trim()
    const found = (currentTasks || []).find(t => t.title && t.title.toLowerCase().includes(targetMatch))
    if (found) {
      return {
        reply: `He marcado "${found.title}" como completada en tu calendario.`,
        actions: [{ type: 'complete_task', taskId: found.id, targetTitle: found.title, completed: true }],
      }
    }
  }

  // 5. Cambiar / Mover / Modificar hora o fecha
  if (/cambia|pasa|mueve|pon|aplaza|retrasa/i.test(lower) && (/a las|para el|al /i.test(lower) || /\d{1,2}:\d{2}/.test(lower))) {
    const timeMatch = lower.match(/(?:a las?|alas?)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la mañana|de la tarde|de la noche)?/i)
    let newTime = null
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10)
      const m = timeMatch[2] || '00'
      const mod = (timeMatch[3] || '').toLowerCase()
      if ((mod.includes('pm') || mod.includes('tarde') || mod.includes('noche')) && h < 12) h += 12
      newTime = `${String(h).padStart(2, '0')}:${m}`
    }

    const matchedTask = (currentTasks || []).find(t => t.title && lower.includes(t.title.toLowerCase()))
    if (matchedTask) {
      const updates = {}
      if (newTime) updates.time = newTime
      return {
        reply: `He actualizado la tarea "${matchedTask.title}"${newTime ? ` a las ${newTime}` : ''} en tu calendario.`,
        actions: [{ type: 'update_task', taskId: matchedTask.id, targetTitle: matchedTask.title, updates }],
      }
    }
  }

  // 6. Añadir / Programar nueva(s) tarea(s)
  if (/a[ñn]ade|crea|pon|programa|apunta|tengo que|debo|clase de|partido de|entrenamiento/i.test(lower)) {
    const parsed = parseScheduleLocalHeuristics(userMessage)
    if (parsed && parsed.tasks && parsed.tasks.length > 0) {
      const titles = parsed.tasks.map(t => `"${t.title}" (${t.date} a las ${t.time})`).join(', ')
      return {
        reply: `He programado en tu calendario: ${titles}. ¿Quieres que ajuste la duración o el nivel de esfuerzo?`,
        actions: [{ type: 'add_tasks', tasks: parsed.tasks }],
      }
    }
  }

  // 7. Respuesta conversacional inteligente por defecto
  const pendingCount = (currentTasks || []).filter(t => !t.completed).length
  return {
    reply: `Entendido. Tienes ${pendingCount} tareas activas en tu calendario. Puedes pedirme que añada una nueva tarea (ej: "Añade estudio de Redes el jueves a las 17:00"), que mueva la hora de alguna, que marque una tarea como completada o que te muestre el resumen de tu día.`,
    actions: [],
  }
}

/**
 * Conversación inteligente con el Asistente IA (Groq) con failover automático y CONTROL TOTAL sobre tareas
 */
export async function chatWithAICopilot({ userMessage, currentTasks = [], chatHistory = [] }) {
  const calRef = getCalendarReference()
  const todayStr = calRef.todayYmd

  // Contexto conciso y optimizado en tokens (máximo 25 tareas relevantes)
  const tasksSummary = (currentTasks || []).slice(0, 25).map(t => ({
    id: t.id,
    title: t.title,
    date: t.date,
    time: t.time,
    effort: t.effort,
    context: t.context,
    completed: !!t.completed,
    isRecurring: !!t.isRecurring,
  }))

  const systemPrompt = `Eres el Asistente Inteligente de Productividad integrado en StudentHub con CONTROL TOTAL sobre el calendario y tareas del usuario.
${calRef.calendarTableText}
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

Devuelve ÚNICAMENTE un JSON con esta estructura exacta, sin texto adicional:
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
    ...chatHistory.slice(-4).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: userMessage },
  ]

  try {
    const aiResult = await callGroqWithFallback({
      messages,
      temperature: 0.2,
      max_tokens: 850,
      jsonMode: true,
    })

    if (aiResult.success) {
      const content = aiResult.content || '{}'
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : (aiResult.parsedData || JSON.parse(content))

      const actions = parsed.actions || []
      if (parsed.newTasks && parsed.newTasks.length > 0 && actions.length === 0) {
        actions.push({
          type: 'add_tasks',
          tasks: parsed.newTasks,
        })
      }

      if (parsed.reply || actions.length > 0) {
        return {
          reply: parsed.reply || 'He procesado tu petición correctamente.',
          actions,
        }
      }
    }

    // Fallback inteligente local
    console.info('[AI Copilot] Conexión remota no disponible, resolviendo con motor local...')
    return resolveAICopilotLocally(userMessage, currentTasks, chatHistory)
  } catch (err) {
    console.warn('[AI Copilot] Error procesando chat con IA, resolviendo con motor local:', err)
    return resolveAICopilotLocally(userMessage, currentTasks, chatHistory)
  }
}


