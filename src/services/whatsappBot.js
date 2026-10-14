// Servicio de Integración con el Bot Móvil (WhatsApp Cloud API y Telegram Bot)
// WhatsApp: Oficial Meta Cloud API (1.000 conversaciones gratuitas al mes)
// Telegram: API oficial de Telegram Bot (100% gratuita sin límites de conversación)

import { parseNaturalLanguageSchedule, chatWithAICopilot, applyAIActions } from './aiOrganizer'

const STORAGE_KEYS = {
  TOKEN: 'app_whatsapp_access_token',
  PHONE_ID: 'app_whatsapp_phone_number_id',
  WABA_ID: 'app_whatsapp_waba_id',
  USER_PHONE: 'app_whatsapp_user_phone',
  BOT_PHONE: 'app_whatsapp_bot_phone',
  ENABLED: 'app_whatsapp_enabled',
  // Telegram Bot
  TELEGRAM_TOKEN: 'app_telegram_bot_token',
  TELEGRAM_CHAT_ID: 'app_telegram_chat_id',
  ACTIVE_PROVIDER: 'app_bot_active_provider', // 'whatsapp' | 'telegram' | 'both'
}

// Credenciales oficiales de Meta WhatsApp Cloud API proporcionadas por el usuario
export const DEFAULT_WHATSAPP_CONFIG = {
  accessToken: 'EAAXQkIaIchsBStVw79eZACLoXmiG0wL0GvoNSddzS1DFFiACEkHGLSi7m9b1MvyHlPUTVgnlSC1I0FPmvkPbJZCQnN7MRG4SNccnHVpPd3SjxN9RZCEUMWJhq9czLgbf8FSJmAZC1Qf2MknYcjpd01zwYEOr2czykquCD9mKoK0zbdnC8RUCGBLplkbpvaJEp19uWZBfd8FhLAkPf3c5kjT5kS7nX8LXnj3LSlafQbfBYLAVMeuudoSHVQnocvYDvEE30unIKtUUbrKty2EdnMTKLZBEbZAC2BBRKk7',
  phoneNumberId: '1345895558611710',
  wabaId: '1669787831467625',
  userPhone: '',
  botPhone: '+1 555-674-6489',
  enabled: true,
}

export function getWhatsAppConfig() {
  return {
    accessToken: localStorage.getItem(STORAGE_KEYS.TOKEN) || DEFAULT_WHATSAPP_CONFIG.accessToken,
    phoneNumberId: localStorage.getItem(STORAGE_KEYS.PHONE_ID) || DEFAULT_WHATSAPP_CONFIG.phoneNumberId,
    wabaId: localStorage.getItem(STORAGE_KEYS.WABA_ID) || DEFAULT_WHATSAPP_CONFIG.wabaId,
    userPhone: localStorage.getItem(STORAGE_KEYS.USER_PHONE) || DEFAULT_WHATSAPP_CONFIG.userPhone,
    botPhone: localStorage.getItem(STORAGE_KEYS.BOT_PHONE) || DEFAULT_WHATSAPP_CONFIG.botPhone,
    enabled: localStorage.getItem(STORAGE_KEYS.ENABLED) !== null
      ? localStorage.getItem(STORAGE_KEYS.ENABLED) === 'true'
      : true,
    telegramToken: localStorage.getItem(STORAGE_KEYS.TELEGRAM_TOKEN) || '',
    telegramChatId: localStorage.getItem(STORAGE_KEYS.TELEGRAM_CHAT_ID) || '',
    activeProvider: localStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER) || 'whatsapp',
  }
}

export function saveWhatsAppConfig(config) {
  if (config.accessToken !== undefined) localStorage.setItem(STORAGE_KEYS.TOKEN, config.accessToken)
  if (config.phoneNumberId !== undefined) localStorage.setItem(STORAGE_KEYS.PHONE_ID, config.phoneNumberId)
  if (config.wabaId !== undefined) localStorage.setItem(STORAGE_KEYS.WABA_ID, config.wabaId)
  if (config.userPhone !== undefined) localStorage.setItem(STORAGE_KEYS.USER_PHONE, config.userPhone)
  if (config.botPhone !== undefined) localStorage.setItem(STORAGE_KEYS.BOT_PHONE, config.botPhone)
  if (config.enabled !== undefined) localStorage.setItem(STORAGE_KEYS.ENABLED, String(config.enabled))
  if (config.telegramToken !== undefined) localStorage.setItem(STORAGE_KEYS.TELEGRAM_TOKEN, config.telegramToken)
  if (config.telegramChatId !== undefined) localStorage.setItem(STORAGE_KEYS.TELEGRAM_CHAT_ID, config.telegramChatId)
  if (config.activeProvider !== undefined) localStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, config.activeProvider)
}

// Enviar mensaje a través de WhatsApp Cloud API oficial de Meta
export async function sendWhatsAppMessage({ to, text }) {
  const config = getWhatsAppConfig()
  const recipient = to || config.userPhone

  if (!recipient) {
    return { success: false, error: 'No se ha configurado el número de teléfono del destinatario' }
  }

  const cleanTo = recipient.replace(/[^0-9]/g, '')

  // Enviar a la API oficial de Meta Graph
  if (config.accessToken && config.phoneNumberId) {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: { preview_url: false, body: text },
        }),
      })

      const data = await response.json()
      if (response.ok) {
        logWhatsAppEvent({
          direction: 'outgoing',
          provider: 'whatsapp',
          text,
          status: 'sent',
          data,
        })
        return { success: true, data }
      } else {
        const errorMsg = data?.error?.message || 'Error en API de WhatsApp'
        const errorCode = data?.error?.code
        const errorDetails = data?.error?.error_data?.details || ''

        // Error #131030: Teléfono no añadido a la lista de prueba de Meta
        let friendlyError = errorMsg
        if (errorCode === 131030 || errorDetails.includes('lista de autorizados') || errorDetails.includes('allowed list')) {
          friendlyError = `El número ${config.userPhone} no está en la lista de prueba de Meta. Añádelo en Meta Developers > WhatsApp > API Setup > To.`
        }

        logWhatsAppEvent({
          direction: 'outgoing',
          provider: 'whatsapp',
          text,
          status: 'error',
          error: friendlyError,
          code: errorCode,
        })

        return {
          success: false,
          code: errorCode,
          error: friendlyError,
          rawError: data,
        }
      }
    } catch (err) {
      logWhatsAppEvent({
        direction: 'outgoing',
        provider: 'whatsapp',
        text,
        status: 'network_error',
        error: err.message,
      })
      return { success: false, error: err.message }
    }
  }

  // Si no hay token configurado
  logWhatsAppEvent({ direction: 'outgoing', provider: 'whatsapp', text, status: 'simulated' })
  return { success: true, simulated: true }
}

// Enviar mensaje a través de Telegram Bot API
export async function sendTelegramMessage({ text, chatId = null }) {
  const config = getWhatsAppConfig()
  const token = config.telegramToken
  const targetChatId = chatId || config.telegramChatId

  if (!token || !targetChatId) {
    return { success: false, error: 'Telegram no configurado (Token o Chat ID ausente)' }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'HTML',
      }),
    })
    const data = await res.json()
    if (data.ok) {
      logWhatsAppEvent({ direction: 'outgoing', provider: 'telegram', text, status: 'sent', data })
      return { success: true, data }
    } else {
      logWhatsAppEvent({ direction: 'outgoing', provider: 'telegram', text, status: 'error', error: data.description })
      return { success: false, error: data.description }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Enviar mensaje a través del canal activo (WhatsApp o Telegram)
export async function sendBotMessage({ text, to = null }) {
  const config = getWhatsAppConfig()
  if (config.activeProvider === 'telegram') {
    return await sendTelegramMessage({ text })
  }
  return await sendWhatsAppMessage({ to, text })
}

// Historial de mensajes y logs del Bot
export function getWhatsAppLogs() {
  try {
    const raw = localStorage.getItem('app_whatsapp_logs')
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

export function logWhatsAppEvent(event) {
  try {
    const current = getWhatsAppLogs()
    const updated = [
      {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...event,
      },
      ...current.slice(0, 49),
    ]
    localStorage.setItem('app_whatsapp_logs', JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('whatsapp_log_updated'))
  } catch (e) {}
}

// Generar resumen matutino para WhatsApp / Telegram
export function generateDailyBriefing(tasks, todayYmd = '2026-10-14') {
  const todayTasks = (tasks || []).filter((t) => t.date === todayYmd && !t.completed)
  if (todayTasks.length === 0) {
    return '¡Buenos días Jorge! No tienes tareas urgentes pendientes para hoy. Disfruta del día.'
  }

  const lines = todayTasks.map((t) => `• ${t.time || 'Hoy'}: ${t.title} (${t.effort || 'Normal'})`)
  return `¡Buenos días Jorge! Tu agenda para hoy:\n${lines.join('\n')}\n¡A por el día!`
}

// Generar alertas de anticipación inteligente (Exámenes 2 semanas antes, entregas 4 días antes, eventos de hoy)
export function generateAnticipationAlerts(tasks, todayYmd = '2026-10-14') {
  const alerts = []
  const today = new Date(todayYmd)

  ;(tasks || []).forEach((task) => {
    if (task.completed || !task.date) return
    const taskDate = new Date(task.date)
    const diffTime = taskDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const titleLower = (task.title || '').toLowerCase()
    const isExam = titleLower.includes('examen') || titleLower.includes('parcial') || titleLower.includes('final')
    const isDelivery = titleLower.includes('entrega') || titleLower.includes('proyecto') || titleLower.includes('practica')
    const isSport = titleLower.includes('padel') || titleLower.includes('pádel') || titleLower.includes('gym') || titleLower.includes('gimnasio')

    // Alerta de Examen (Anticipación de hasta 14 días)
    if (isExam && diffDays > 0 && diffDays <= 14) {
      alerts.push({
        id: `exam-${task.id}`,
        type: 'exam',
        taskTitle: task.title,
        diffDays,
        message: `Examen en ${diffDays} día${diffDays > 1 ? 's' : ''}: Periodo de estudio activo sugerido (2 semanas de antelación).`,
        time: task.time,
        date: task.date,
        badge: 'Examen Próximo',
        color: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
      })
    }
    // Alerta de Entrega (Anticipación de hasta 4 días)
    else if (isDelivery && diffDays > 0 && diffDays <= 4) {
      alerts.push({
        id: `delivery-${task.id}`,
        type: 'delivery',
        taskTitle: task.title,
        diffDays,
        message: `Entrega en ${diffDays} día${diffDays > 1 ? 's' : ''}: Faltan pocos días para cerrar la versión final.`,
        time: task.time,
        date: task.date,
        badge: 'Entrega Crítica',
        color: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      })
    }
    // Recordatorio de Deporte / Ocio de Hoy
    else if (isSport && diffDays === 0) {
      alerts.push({
        id: `sport-${task.id}`,
        type: 'sport',
        taskTitle: task.title,
        diffDays: 0,
        message: `Hoy tienes ${task.title} programado a las ${task.time || 'la tarde'}.`,
        time: task.time,
        date: task.date,
        badge: 'Actividad de Hoy',
        color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      })
    }
  })

  return alerts
}

// Procesar mensaje entrante del usuario (vía webhook o chat integrado)
export async function processIncomingWhatsAppMessage(text, currentTasks) {
  logWhatsAppEvent({ direction: 'incoming', provider: 'whatsapp', text, status: 'received' })

  try {
    // 1. Intentar analizar creación o modificación de tareas con IA
    const scheduleResult = await parseNaturalLanguageSchedule(text)
    if (scheduleResult && scheduleResult.tasks && scheduleResult.tasks.length > 0) {
      const summary = scheduleResult.summary || `He añadido ${scheduleResult.tasks.length} tarea(s) a tu agenda.`
      await sendWhatsAppMessage({ text: `Entendido. ${summary}` })
      return {
        reply: `Entendido. ${summary}`,
        newTasks: scheduleResult.tasks,
        actions: [],
      }
    }

    // 2. Si no es creación de tarea, conversar con el Copiloto IA (Control Total)
    const copilotResult = await chatWithAICopilot({
      userMessage: text,
      currentTasks,
    })

    await sendWhatsAppMessage({ text: copilotResult.reply })
    return {
      reply: copilotResult.reply,
      newTasks: [],
      actions: copilotResult.actions || [],
    }
  } catch (err) {
    const errorReply = 'Lo siento, no he podido procesar ese mensaje en este momento.'
    await sendWhatsAppMessage({ text: errorReply })
    return { reply: errorReply, newTasks: [], actions: [] }
  }
}
