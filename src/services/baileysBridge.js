// Servicio del Frontend para comunicarse con el Puente Local de WhatsApp Baileys

export async function getBaileysStatus() {
  try {
    const res = await fetch('/api/baileys/status')
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}
  return { status: 'disconnected', qrCode: null, user: null, phone: null }
}

export async function requestBaileysConnect() {
  try {
    const res = await fetch('/api/baileys/connect', { method: 'POST' })
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}
  return { status: 'connecting', qrCode: null }
}

export async function requestBaileysDisconnect() {
  try {
    const res = await fetch('/api/baileys/disconnect', { method: 'POST' })
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}
  return { status: 'disconnected', qrCode: null }
}

export async function getBaileysRecentTasks() {
  try {
    const res = await fetch('/api/baileys/recent-tasks')
    if (res.ok) {
      return await res.json()
    }
  } catch (e) {}
  return []
}

export async function sendBaileysMessage({ to, text }) {
  try {
    const res = await fetch('/api/baileys/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text }),
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function syncBaileysTasks(tasks) {
  try {
    const res = await fetch('/api/baileys/sync-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks }),
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export async function testBaileysChat(text) {
  try {
    const res = await fetch('/api/baileys/chat-test', {
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
    const res = await fetch('/api/baileys/trigger-midnight-briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    return await res.json()
  } catch (e) {
    return { success: false, error: e.message }
  }
}

