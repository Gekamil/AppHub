// Servicio de Alarmas Sonoras y Notificaciones de Inicio de Eventos para StudentHub
// Funciona en Web, Móvil (PWA y Capacitor) mediante Web Audio API, Vibración y Notificaciones del Sistema

let audioCtx = null
let alarmInterval = null
const notifiedEventIds = new Set()

// Obtener o crear contexto de audio para sintetizar alarma sonora sin dependencias externas
function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// Reproducir un pitido de alarma armónico y agradable pero bien audible
export function playChimeTone(freq = 660, type = 'sine', duration = 0.25, volume = 0.4) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)

    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch (err) {
    console.debug('[AlarmSound] AudioContext error:', err)
  }
}

// Iniciar secuencia continua de alarma sonora
export function startAlarmSound() {
  stopAlarmSound()
  // Tono doble de alerta (880Hz -> 1174Hz) estilo reloj digital moderno
  const playPattern = () => {
    playChimeTone(880, 'triangle', 0.15, 0.5)
    setTimeout(() => playChimeTone(1174, 'sine', 0.25, 0.6), 160)
  }
  playPattern()
  alarmInterval = setInterval(playPattern, 1200)
}

// Detener la alarma sonora
export function stopAlarmSound() {
  if (alarmInterval) {
    clearInterval(alarmInterval)
    alarmInterval = null
  }
}

// Solicitar permisos de notificación al usuario
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  try {
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission()
      return res
    }
    return Notification.permission
  } catch {
    return 'denied'
  }
}

// Disparar notificación del sistema y alarma sonora
export function triggerEventAlert(task) {
  if (!task || !task.id) return
  if (notifiedEventIds.has(String(task.id))) return
  notifiedEventIds.add(String(task.id))

  const title = task.title || 'Actividad programada'
  const time = task.time || 'Ahora'
  const context = task.context || task.role || 'General'

  // 1. Notificación del sistema si está permitida
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`¡Comienza tu evento: ${title}!`, {
        body: `Hora: ${time} • ${context}\nPulsa para abrir StudentHub`,
        icon: '/logo.png',
        badge: '/favicon.svg',
        vibrate: [300, 150, 300, 150, 500],
        tag: `event-${task.id}`,
      })
    } catch (e) {
      console.debug('[Notification] Error creating notification:', e)
    }
  }

  // 2. Vibración háptica en móviles si es soportada
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([400, 200, 400, 200, 600])
    } catch {}
  }

  // 3. Si tiene alarma activada (hasAlarm: true): hacer sonar alarma y emitir evento para modal en pantalla
  if (task.hasAlarm) {
    startAlarmSound()
  } else {
    // Si no tiene alarma activa pero sí notificación de inicio: emitir chime sutil de aviso
    playChimeTone(587, 'sine', 0.3, 0.4)
  }

  // 4. Emitir evento global en la app para mostrar banner/modal interactivo de alarma o aviso
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('studenthub_event_alarm', {
        detail: {
          task,
          hasAlarm: Boolean(task.hasAlarm),
          timestamp: Date.now(),
        },
      })
    )
  }
}

// Comprobador periódico de inicio de tareas para hoy
export function checkUpcomingTasksAlarms(tasks = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) return

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const todayYmd = `${y}-${m}-${d}`

  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const nowTotalMinutes = currentHour * 60 + currentMinute

  tasks.forEach((t) => {
    if (!t || t.completed || t.done || !t.date) return
    const taskDate = String(t.date).slice(0, 10)
    if (taskDate !== todayYmd) return

    // Obtener hora de inicio
    if (!t.time) return
    const match = String(t.time).match(/(\d{1,2}):(\d{2})/i)
    if (!match) return

    let startH = parseInt(match[1], 10)
    const startM = parseInt(match[2], 10)
    const lowerTime = String(t.time).toLowerCase()
    if (lowerTime.includes('pm') && startH < 12) startH += 12
    if (lowerTime.includes('am') && startH === 12) startH = 0

    const taskStartMinutes = startH * 60 + startM

    // Si la hora de inicio es AHORA (dentro del mismo minuto o máximo 1 minuto de retraso)
    if (nowTotalMinutes >= taskStartMinutes && nowTotalMinutes <= taskStartMinutes + 1) {
      triggerEventAlert(t)
    }
  })
}
