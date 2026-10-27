import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  syncTasksToCloud,
  syncCalendarsToCloud,
  loadUserDataFromCloud,
  getCurrentUser,
  isGuestUser,
  getUserCalendars,
  saveUserCalendars,
} from '../services/firebase'
import {
  getSharedRoles,
  addSharedRole,
  deleteSharedRole,
  updateSharedRole,
  pruneOrphanImportedRoles,
  findOrCreateSharedRole,
  ROLE_PRESET_COLORS,
  ROLE_PRESET_ICONS,
  isEventFinished,
} from '../services/sharedRoles'
import { deleteBaileysTask, syncBaileysTasks, syncBaileysCalendars } from '../services/baileysBridge'
import { getAppTheme, getAppThemeTokens } from '../services/appTheme'
import {
  generateShareCode,
  normalizeShareCode,
  fetchSharedCalendar,
  publishSharedCalendarUpdate,
  subscribeToSharedCalendar,
} from '../services/sharedCalendarService'

// Helpers de fecha dinámicos
const formatYMD = (date) => {
  if (!date) return ''
  if (typeof date === 'string') {
    const trimmed = date.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    if (trimmed.includes('T')) return trimmed.split('T')[0]
  }
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const TODAY_YMD = formatYMD(new Date())

// Ordenar actividades de un día: primero las de todo el día, y después en orden temporal ascendente (el más temprano más arriba)
export const sortDayTasks = (tasks = []) => {
  return [...tasks].sort((a, b) => {
    const aAllDay = !a.time || a.time.toLowerCase().includes('todo el d') || a.isAllDay
    const bAllDay = !b.time || b.time.toLowerCase().includes('todo el d') || b.isAllDay
    if (aAllDay && !bAllDay) return -1
    if (!aAllDay && bAllDay) return 1
    if (aAllDay && bAllDay) return (a.title || '').localeCompare(b.title || '')
    return (a.time || '').localeCompare(b.time || '')
  })
}

// Genera un índice O(1) de actividades indexadas por clave de fecha YYYY-MM-DD
export const buildTasksByDateMap = (tasks = []) => {
  const map = new Map()
  if (!tasks || !tasks.length) return map
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    if (!t || !t.date) continue
    let list = map.get(t.date)
    if (!list) {
      list = []
      map.set(t.date, list)
    }
    list.push(t)
  }
  for (const [date, list] of map.entries()) {
    map.set(date, sortDayTasks(list))
  }
  return map
}

const getMonday = (d) => {
  let date
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
    date = new Date(d.trim() + 'T12:00:00')
  } else {
    date = new Date(d)
  }
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  date.setDate(date.getDate() + diff)
  date.setHours(12, 0, 0, 0)
  return date
}

const DAY_SHORT_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]
const MONTH_NAMES = MONTH_NAMES_ES

const getWeekDays = (baseDate) => {
  const mon = getMonday(baseDate)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return {
      dateObj: d,
      ymd: formatYMD(d),
      dayNum: d.getDate(),
      dayShort: DAY_SHORT_ES[i],
    }
  })
}

const getMonthDays = (baseDate) => {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1, 12, 0, 0)
  const firstMonday = getMonday(firstDay)

  const days = []
  const current = new Date(firstMonday)
  current.setHours(12, 0, 0, 0)
  for (let i = 0; i < 42; i++) {
    days.push({
      dateObj: new Date(current),
      ymd: formatYMD(current),
      dayNum: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
    })
    current.setDate(current.getDate() + 1)
  }
  const hasDaysIn6thRow = days.slice(35).some((d) => d.isCurrentMonth)
  return hasDaysIn6thRow ? days : days.slice(0, 35)
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00')

const timeToTop = (timeStr) => {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function getEventDurationMinutes(task) {
  if (!task) return 60
  if (typeof task.duration === 'number' && task.duration > 0) {
    return task.duration
  }
  if (task.time && task.endTime) {
    const [sh, sm] = task.time.split(':').map(Number)
    const [eh, em] = task.endTime.split(':').map(Number)
    if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
      const diff = (eh * 60 + em) - (sh * 60 + sm)
      if (diff > 0) return diff
    }
  }
  if (task.est) {
    const match = String(task.est).match(/(\d+)\s*(m|min|h|hora)/i)
    if (match) {
      const val = parseInt(match[1], 10)
      const unit = match[2].toLowerCase()
      if (unit.startsWith('h')) return val * 60
      return val
    }
  }
  return 60
}

export function formatEventDurationLabel(task) {
  const dur = getEventDurationMinutes(task)
  const h = Math.floor(dur / 60)
  const m = dur % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export function getUniqueTaskCount(taskList) {
  if (!taskList || taskList.length === 0) return 0
  const seenSeries = new Set()
  let count = 0
  for (const t of taskList) {
    if (t.recurrenceGroupId) {
      if (!seenSeries.has(t.recurrenceGroupId)) {
        seenSeries.add(t.recurrenceGroupId)
        count++
      }
    } else if (t.isRecurring || (t.recurrence && t.recurrence !== 'none')) {
      const key = `${(t.title || '').trim().toLowerCase()}::${(t.context || '').trim().toLowerCase()}::${t.time || ''}`
      if (!seenSeries.has(key)) {
        seenSeries.add(key)
        count++
      }
    } else {
      count++
    }
  }
  return count
}

const CATEGORY_PALETTES = [
  { name: 'Azul', bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', hex: '#3b82f6' },
  { name: 'Esmeralda', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', hex: '#10b981' },
  { name: 'Púrpura', bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500', hex: '#a855f7' },
  { name: 'Ámbar', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', hex: '#f59e0b' },
  { name: 'Rosa', bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500', hex: '#f43f5e' },
  { name: 'Cian', bg: 'bg-cyan-50 dark:bg-cyan-950/60', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500', hex: '#06b6d4' },
  { name: 'Índigo', bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500', hex: '#6366f1' },
  { name: 'Gris', bg: 'bg-slate-100 dark:bg-slate-800/80', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500', hex: '#64748b' },
]

const ALL_EVENT_ICONS = [
  'event', 'school', 'fitness_center', 'terminal', 'person', 'work',
  'restaurant', 'menu_book', 'timer', 'alarm', 'flight', 'sports_gymnastics',
  'computer', 'code', 'sports_soccer', 'palette', 'music_note', 'local_cafe',
  'movie', 'shopping_cart', 'call', 'mail', 'home', 'flag',
  'star', 'favorite', 'checklist', 'lightbulb', 'construction', 'directions_car',
  'directions_bike', 'pets', 'medication', 'savings'
]

const CALENDAR_PALETTES = [
  { name: 'Azul', color: '#3b82f6', dot: 'bg-blue-500' },
  { name: 'Púrpura', color: '#8b5cf6', dot: 'bg-purple-500' },
  { name: 'Esmeralda', color: '#10b981', dot: 'bg-emerald-500' },
  { name: 'Ámbar', color: '#f59e0b', dot: 'bg-amber-500' },
  { name: 'Rosa', color: '#f43f5e', dot: 'bg-rose-500' },
  { name: 'Cian', color: '#06b6d4', dot: 'bg-cyan-500' },
  { name: 'Índigo', color: '#6366f1', dot: 'bg-indigo-500' },
]

function ClockWidget({ clockMode, setClockMode, activeCalendar, todayTasks, setSelectedDetailTask, getCatScheme }) {
  const [liveClockTime, setLiveClockTime] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setLiveClockTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = liveClockTime.getHours()
  const minutes = liveClockTime.getMinutes()
  const seconds = liveClockTime.getSeconds()
  const hourAngle = ((hours % 12) + minutes / 60) * 30
  const minuteAngle = (minutes + seconds / 60) * 6
  const secondAngle = seconds * 6

  const getCountdownInfo = (taskTime) => {
    if (!taskTime) return { text: 'Todo el día', color: 'bg-surface-muted text-secondary' }
    const [h, m] = taskTime.split(':').map(Number)
    const nowMinutes = hours * 60 + minutes
    const taskMinutes = (h || 0) * 60 + (m || 0)
    const diff = taskMinutes - nowMinutes

    if (diff > 0) {
      const diffH = Math.floor(diff / 60)
      const diffM = diff % 60
      const text = diffH > 0 ? `En ${diffH}h ${diffM}m` : `En ${diffM}m`
      return { text, color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold' }
    } else if (diff >= -60 && diff <= 0) {
      return { text: 'En curso', color: 'bg-primary/20 text-primary font-bold animate-pulse' }
    } else {
      return { text: 'Finalizado', color: 'bg-surface-muted text-secondary opacity-60' }
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
          Hora Local
        </span>
        <div className="relative inline-flex bg-surface-muted p-0.5 rounded-lg text-[10px] font-semibold border border-outline-variant/20">
          <div
            className="absolute top-0.5 bottom-0.5 rounded-md bg-surface-pure shadow-2xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
            style={{
              width: 'calc(50% - 2px)',
              left: '2px',
              transform: `translateX(${clockMode === 'digital' ? '0%' : '100%'})`,
            }}
          />
          <button
            type="button"
            onClick={() => setClockMode('digital')}
            className={`relative z-10 w-14 py-0.5 text-center rounded-md transition-colors cursor-pointer ${
              clockMode === 'digital'
                ? 'text-on-surface font-bold'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Digital
          </button>
          <button
            type="button"
            onClick={() => setClockMode('analog')}
            className={`relative z-10 w-14 py-0.5 text-center rounded-md transition-colors cursor-pointer ${
              clockMode === 'analog'
                ? 'text-on-surface font-bold'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            Analógico
          </button>
        </div>
      </div>

      {clockMode === 'digital' ? (
        <div className="p-3 bg-gradient-to-br from-surface-subtle via-surface-subtle/70 to-surface-muted/30 rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-center text-center shadow-inner">
          <div className="flex items-baseline font-code-sm tracking-tight text-on-surface">
            <span className="text-3xl font-extrabold font-mono">
              {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
            </span>
            <span className="text-primary text-base font-bold ml-1 font-mono">
              :{String(seconds).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-secondary text-[11px] font-medium mt-1">
            <span className="material-symbols-outlined text-[13px] text-primary">location_on</span>
            <span>Madrid (UTC+2) · {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gradient-to-br from-surface-subtle via-surface-subtle/70 to-surface-muted/30 rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-center shadow-inner">
          <svg className="w-24 h-24 drop-shadow-sm" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" className="fill-surface-pure stroke-outline-variant/40" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="42" className="fill-none stroke-surface-muted/50" strokeWidth="1" />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <line
                key={deg}
                x1="50"
                y1={deg % 90 === 0 ? "10" : "12"}
                x2="50"
                y2="15"
                className={deg % 90 === 0 ? "stroke-on-surface" : "stroke-secondary"}
                strokeWidth={deg % 90 === 0 ? "2" : "1"}
                strokeLinecap="round"
                transform={`rotate(${deg} 50 50)`}
              />
            ))}
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="25"
              className="stroke-on-surface"
              strokeWidth="3.2"
              strokeLinecap="round"
              transform={`rotate(${hourAngle} 50 50)`}
            />
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="17"
              className="stroke-on-surface-variant"
              strokeWidth="2.2"
              strokeLinecap="round"
              transform={`rotate(${minuteAngle} 50 50)`}
            />
            <line
              x1="50"
              y1="54"
              x2="50"
              y2="13"
              style={{ stroke: activeCalendar.color }}
              strokeWidth="1.5"
              strokeLinecap="round"
              transform={`rotate(${secondAngle} 50 50)`}
            />
            <circle cx="50" cy="50" r="3.5" style={{ fill: activeCalendar.color }} />
            <circle cx="50" cy="50" r="1.5" className="fill-white" />
          </svg>
          <div className="text-[11px] font-code-sm font-semibold text-secondary mt-1">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')} · Madrid
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
            Hoy ({todayTasks.length})
          </span>
          <span className="text-[10px] text-primary font-code-sm font-semibold">
            {todayTasks.filter((t) => !t.completed).length} pendientes
          </span>
        </div>

        <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-0.5 scrollbar-thin overscroll-contain">
          {todayTasks.map((task) => {
            const countdown = getCountdownInfo(task.time)
            const scheme = getCatScheme(task.context)
            return (
              <div
                key={task.id}
                onClick={() => setSelectedDetailTask(task)}
                className="p-2 rounded-xl bg-surface-subtle hover:bg-surface-muted transition-colors flex items-center justify-between gap-2 cursor-pointer border border-outline-variant/20"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full ${scheme.dot} shrink-0`} />
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-semibold text-on-surface truncate">{task.title}</span>
                    <span className="text-[10px] text-secondary font-code-sm">
                      {task.time || 'Todo el día'} · {task.context}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-code-sm shrink-0 ${countdown.color}`}>
                  {countdown.text}
                </span>
              </div>
            )
          })}
          {todayTasks.length === 0 && (
            <p className="text-xs text-secondary text-center py-2 italic bg-surface-subtle/50 rounded-xl">
              Sin eventos hoy en este calendario.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper para parsear archivos y feeds iCal / RFC 5545 (TeamUp, Google Calendar, Móvil / Apple)
function parseICS(icsContent, calendarId) {
  const events = []
  if (!icsContent || typeof icsContent !== 'string') return events

  // Desplegar líneas continuas (RFC 5545)
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const lines = unfolded.split(/\r\n|\n|\r/)

  let inEvent = false
  let cur = {}

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) continue

    if (rawLine === 'BEGIN:VEVENT') {
      inEvent = true
      cur = {}
      continue
    }

    if (rawLine === 'END:VEVENT') {
      if (inEvent && (cur.summary || cur.dtstart)) {
        let date = ''
        let time = ''
        let endTime = ''
        let durationMinutes = 60
        let isAllDay = true

        if (cur.dtstart) {
          const colonPos = cur.dtstart.lastIndexOf(':')
          const val = colonPos >= 0 ? cur.dtstart.slice(colonPos + 1).trim() : cur.dtstart.trim()

          if (val.length >= 8) {
            const y = val.slice(0, 4)
            const m = val.slice(4, 6)
            const d = val.slice(6, 8)
            date = `${y}-${m}-${d}`

            if (val.includes('T')) {
              const timePart = val.split('T')[1]
              if (timePart && timePart.length >= 4) {
                const hh = timePart.slice(0, 2)
                const mm = timePart.slice(2, 4)
                time = `${hh}:${mm}`
                isAllDay = false
              }
            }
          }
        }

        // Extracción de DTEND o DURATION para calcular la duración exacta del evento
        if (cur.dtend) {
          const colonPos = cur.dtend.lastIndexOf(':')
          const endVal = colonPos >= 0 ? cur.dtend.slice(colonPos + 1).trim() : cur.dtend.trim()
          if (endVal.includes('T')) {
            const timePart = endVal.split('T')[1]
            if (timePart && timePart.length >= 4) {
              const eh = timePart.slice(0, 2)
              const em = timePart.slice(2, 4)
              endTime = `${eh}:${em}`
            }
          }
        }

        if (time && endTime) {
          const [sh, sm] = time.split(':').map(Number)
          const [eh, em] = endTime.split(':').map(Number)
          if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
            const diff = (eh * 60 + em) - (sh * 60 + sm)
            if (diff > 0) durationMinutes = diff
          }
        } else if (cur.duration) {
          // RFC 5545 DURATION (ej: PT1H30M, PT2H, PT45M)
          const durStr = cur.duration
          const hMatch = durStr.match(/(\d+)H/i)
          const mMatch = durStr.match(/(\d+)M/i)
          let total = 0
          if (hMatch) total += parseInt(hMatch[1], 10) * 60
          if (mMatch) total += parseInt(mMatch[1], 10)
          if (total > 0) {
            durationMinutes = total
            if (time && !endTime) {
              const [sh, sm] = time.split(':').map(Number)
              const totalM = (sh * 60 + sm + total) % 1440
              const endH = String(Math.floor(totalM / 60)).padStart(2, '0')
              const endM = String(totalM % 60).padStart(2, '0')
              endTime = `${endH}:${endM}`
            }
          }
        }

        if (date) {
          let assignedContext = 'Personal'
          if (cur.categories) {
            let rawCat = cur.categories
              .replace(/\\,/g, ',')
              .replace(/\\;/g, ';')
              .replace(/\\\\/g, '\\')
              .trim()

            // Si es jerárquica con '>', tomar el segmento final
            if (rawCat.includes('>')) {
              const segs = rawCat.split('>')
              rawCat = segs[segs.length - 1].trim()
            } else if (rawCat.includes(',')) {
              rawCat = rawCat.split(',')[0].trim()
            }

            if (rawCat) {
              const matchedRole = findOrCreateSharedRole(rawCat, 'school', true)
              if (matchedRole) {
                assignedContext = matchedRole.name || rawCat
              } else {
                assignedContext = rawCat
              }
            }
          }

          events.push({
            id: 'ext-' + (cur.uid || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            title: (cur.summary || 'Evento importado')
              .replace(/\\,/g, ',')
              .replace(/\\;/g, ';')
              .replace(/\\n/g, ' ')
              .replace(/\\\\/g, '\\'),
            description: (cur.description || '')
              .replace(/\\,/g, ',')
              .replace(/\\;/g, ';')
              .replace(/\\n/g, '\n')
              .replace(/\\\\/g, '\\'),
            date,
            time,
            endTime: endTime || '',
            duration: durationMinutes,
            est: durationMinutes >= 60 ? `${Math.round(durationMinutes / 60)}h` : `${durationMinutes}m`,
            isAllDay,
            context: assignedContext,
            effort: 'Medium',
            icon: 'sync',
            calendarId: calendarId || 'cal-default',
            completed: false,
            isExternalSync: true,
          })
        }
      }
      inEvent = false
      continue
    }

    if (inEvent) {
      const colonIdx = rawLine.indexOf(':')
      if (colonIdx > 0) {
        const propPart = rawLine.slice(0, colonIdx)
        const propName = propPart.split(';')[0].toUpperCase().trim()
        const value = rawLine.slice(colonIdx + 1).trim()

        if (propName === 'SUMMARY') cur.summary = value
        else if (propName === 'DESCRIPTION') cur.description = value
        else if (propName === 'DTSTART') cur.dtstart = rawLine
        else if (propName === 'DTEND') cur.dtend = rawLine
        else if (propName === 'DURATION') cur.duration = value
        else if (propName === 'UID') cur.uid = value
        else if (propName === 'CATEGORIES') cur.categories = value
      }
    }
  }

  return events
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const outletCtx = useOutletContext() || {}
  const [localTasks, setLocalTasks] = useState([])
  const globalTasks = outletCtx.globalTasks ?? localTasks
  const setGlobalTasks = (updater) => {
    if (typeof outletCtx.setGlobalTasks === 'function') {
      outletCtx.setGlobalTasks(updater)
    }
    setLocalTasks(updater)
  }

  // Vistas y fechas dinámicas
  const [calendarView, setCalendarView] = useState('month') // 'month' | 'week' | 'day'
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [miniDate, setMiniDate] = useState(() => new Date())
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [isMobileWidgetsOpen, setIsMobileWidgetsOpen] = useState(false)

  // Estados para reordenar calendarios por arrastre (drag-and-drop y táctil)
  const [draggedCalIdx, setDraggedCalIdx] = useState(null)
  const [dragOverCalIdx, setDragOverCalIdx] = useState(null)
  const calTouchDragRef = useRef(null)

  // Sistema de Múltiples Calendarios con Persistencia y Aislamiento por Cuenta
  const isRemoteCalendarSyncRef = useRef(true)
  const lastSyncedCalendarsJsonRef = useRef('')
  const [calendars, setCalendars] = useState(() => {
    return getUserCalendars(getCurrentUser())
  })

  // Escuchar cambios de sesión (login, logout, cambio de cuenta) para actualizar calendarios privados
  useEffect(() => {
    const handleAuthChange = () => {
      const curUser = getCurrentUser()
      isRemoteCalendarSyncRef.current = true
      setCalendars(getUserCalendars(curUser))
    }
    window.addEventListener('studenthub_auth_changed', handleAuthChange)
    return () => window.removeEventListener('studenthub_auth_changed', handleAuthChange)
  }, [])

  // Escuchar actualizaciones en tiempo real de calendarios desde la nube (ej: cambios hechos en el móvil)
  useEffect(() => {
    const handleRemoteCalendarsUpdated = (e) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        isRemoteCalendarSyncRef.current = true
        setCalendars(e.detail)
      }
    }
    window.addEventListener('studenthub_calendars_updated', handleRemoteCalendarsUpdated)
    return () => window.removeEventListener('studenthub_calendars_updated', handleRemoteCalendarsUpdated)
  }, [])

  // Sincronizar calendarios de forma aislada para la cuenta activa, en la nube Firestore y con el puente WhatsApp
  useEffect(() => {
    const curUser = getCurrentUser()
    saveUserCalendars(calendars, curUser)

    const curJson = JSON.stringify(calendars || [])
    if (isRemoteCalendarSyncRef.current) {
      isRemoteCalendarSyncRef.current = false
      lastSyncedCalendarsJsonRef.current = curJson
      return
    }

    if (lastSyncedCalendarsJsonRef.current === curJson) return

    const timer = setTimeout(() => {
      lastSyncedCalendarsJsonRef.current = curJson
      if (!isGuestUser(curUser)) {
        syncCalendarsToCloud(calendars).catch(() => {})
      }
      syncBaileysCalendars(calendars).catch(() => {})
    }, 1200)

    return () => clearTimeout(timer)
  }, [calendars])

  // Cargar datos remotos de calendarios al iniciar sin sobreescribir ni borrar los calendarios locales
  useEffect(() => {
    const curUser = getCurrentUser()
    if (isGuestUser(curUser)) return // Un invitado sin cuenta NUNCA descarga datos de otros
    loadUserDataFromCloud().then((cloudData) => {
      if (cloudData && cloudData.calendars && Array.isArray(cloudData.calendars) && cloudData.calendars.length > 0) {
        isRemoteCalendarSyncRef.current = true
        setCalendars(cloudData.calendars)
        saveUserCalendars(cloudData.calendars, curUser)
      }
    }).catch(() => {})
  }, [])



  const handleReorderCalendars = (fromIdx, toIdx) => {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return
    setCalendars((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIdx, 1)
      updated.splice(toIdx, 0, moved)
      return updated
    })
  }

  const handleTouchStartCal = (idx, e) => {
    calTouchDragRef.current = { startIdx: idx, startY: e.touches[0].clientY }
    setDraggedCalIdx(idx)
  }

  const handleTouchMoveCal = (e) => {
    if (!calTouchDragRef.current) return
    const currentY = e.touches[0].clientY
    const deltaY = currentY - calTouchDragRef.current.startY
    const itemHeight = 36
    const steps = Math.round(deltaY / itemHeight)
    const targetIdx = Math.max(0, Math.min(calendars.length - 1, calTouchDragRef.current.startIdx + steps))
    if (targetIdx !== dragOverCalIdx) {
      setDragOverCalIdx(targetIdx)
    }
  }

  const handleTouchEndCal = () => {
    if (calTouchDragRef.current && dragOverCalIdx !== null && dragOverCalIdx !== calTouchDragRef.current.startIdx) {
      handleReorderCalendars(calTouchDragRef.current.startIdx, dragOverCalIdx)
    }
    calTouchDragRef.current = null
    setDraggedCalIdx(null)
    setDragOverCalIdx(null)
  }
  const [activeCalendarId, setActiveCalendarId] = useState(() => {
    try {
      return localStorage.getItem('studenthub_active_cal_id') || 'cal-default'
    } catch (e) {
      return 'cal-default'
    }
  })

  useEffect(() => {
    try {
      if (activeCalendarId) {
        localStorage.setItem('studenthub_active_cal_id', activeCalendarId)
      }
    } catch (e) {}
  }, [activeCalendarId])
  const [calendarMode, setCalendarMode] = useState('single') // 'single' | 'cascade'
  const [isCalDropdownOpen, setIsCalDropdownOpen] = useState(false)
  const calDropdownRef = useRef(null)
  const calDropdownBtnRef = useRef(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, right: 0 })

  const updateDropdownPos = useCallback(() => {
    if (!calDropdownBtnRef.current) return
    const rect = calDropdownBtnRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 8,
      left: rect.left,
      right: window.innerWidth - rect.right,
    })
  }, [])

  const handleToggleCalDropdown = () => {
    if (!isCalDropdownOpen && calDropdownBtnRef.current) {
      const rect = calDropdownBtnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
        right: window.innerWidth - rect.right,
      })
    }
    setIsCalDropdownOpen((prev) => !prev)
  }

  useEffect(() => {
    if (!isCalDropdownOpen) return
    updateDropdownPos()
    const handleRecalc = () => updateDropdownPos()
    window.addEventListener('resize', handleRecalc)
    window.addEventListener('scroll', handleRecalc, true)
    return () => {
      window.removeEventListener('resize', handleRecalc)
      window.removeEventListener('scroll', handleRecalc, true)
    }
  }, [isCalDropdownOpen, updateDropdownPos])
  const [collapsedCalIds, setCollapsedCalIds] = useState([])
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)
  const [editingCalendarId, setEditingCalendarId] = useState(null)
  const [calendarModalTab, setCalendarModalTab] = useState('edit') // 'edit' | 'import'
  const [importCalendarCode, setImportCalendarCode] = useState('')
  const [isConnectingSharedCal, setIsConnectingSharedCal] = useState(false)
  const [copiedCodeToast, setCopiedCodeToast] = useState(false)
  const [copiedLinkToast, setCopiedLinkToast] = useState(false)
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false)
  const [calendarForm, setCalendarForm] = useState({
    name: '',
    color: '#3b82f6',
    sharedFrom: [],
    syncUrl: '',
    isShared: false,
    shareCode: '',
    sharedRole: 'owner',
  })

  // Widgets reordenables, eliminables y con animaciones de arrastre en panel lateral derecho
  const ALL_WIDGETS = [
    { id: 'clock', name: 'Reloj & Hoy', icon: 'schedule' },
    { id: 'miniCal', name: 'Mini Calendario', icon: 'calendar_month' },
    { id: 'calendars', name: 'Mis Calendarios', icon: 'view_agenda' },
    { id: 'deadlines', name: 'Próximas Entregas', icon: 'flag' },
    { id: 'allocation', name: 'Métricas de Tiempo', icon: 'pie_chart' },
  ]
  const [sidebarWidgets, setSidebarWidgets] = useState(['clock', 'miniCal', 'calendars', 'deadlines', 'allocation'])
  const [collapsedWidgets, setCollapsedWidgets] = useState([])
  const [draggedWidgetIdx, setDraggedWidgetIdx] = useState(null)
  const [dragOverWidgetIdx, setDragOverWidgetIdx] = useState(null)

  // Estados para el widget de Reloj
  const [clockMode, setClockMode] = useState('digital') // 'digital' | 'analog'

  // Scrollbar gutter para alinear la cabecera con el timetable pixel-perfect
  const [scrollbarGutter, setScrollbarGutter] = useState(0)

  // Categorías y Roles con memoria compartida (sincronizados con Auto-Organizer)
  const [categories, setCategories] = useState(() => getSharedRoles())
  const [roleToDelete, setRoleToDelete] = useState(null)

  useEffect(() => {
    const handleRolesUpdated = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCategories(e.detail)
      }
    }
    window.addEventListener('shared_roles_updated', handleRolesUpdated)
    return () => window.removeEventListener('shared_roles_updated', handleRolesUpdated)
  }, [])

  // Suscripción en tiempo real a los calendarios compartidos activos
  useEffect(() => {
    const unsubs = []
    const sharedCals = (calendars || []).filter((c) => c.isShared && c.shareCode)

    for (const cal of sharedCals) {
      const unsub = subscribeToSharedCalendar(cal.shareCode, (remoteCal, remoteEvents) => {
        if (remoteCal && remoteCal.name) {
          setCalendars((prev) =>
            prev.map((c) =>
              c.shareCode === cal.shareCode
                ? { ...c, name: remoteCal.name, color: remoteCal.color || c.color }
                : c
            )
          )
        }
        if (Array.isArray(remoteEvents)) {
          setGlobalTasks((prev) => {
            const currentForCal = (prev || []).filter((t) => t.calendarId === cal.id)
            const currentKey = currentForCal.map((t) => `${t.id}_${t.date}_${t.time}_${t.title}_${t.completed}`).sort().join('|')
            const remoteKey = remoteEvents.map((t) => `${t.id}_${t.date}_${t.time}_${t.title}_${t.completed}`).sort().join('|')
            if (currentKey === remoteKey) return prev

            const others = (prev || []).filter((t) => t.calendarId !== cal.id)
            const mappedRemote = remoteEvents.map((t) => ({
              ...t,
              calendarId: cal.id,
            }))
            return [...others, ...mappedRemote]
          })
        }
      })
      if (typeof unsub === 'function') unsubs.push(unsub)
    }

    return () => {
      unsubs.forEach((u) => typeof u === 'function' && u())
    }
  }, [calendars.map((c) => `${c.id}:${c.shareCode}:${c.isShared}`).join(',')])

  // Sincronización saliente hacia calendarios compartidos cuando se modifican sus eventos
  const isInitialSyncMount = useRef(true)
  const lastPublishedSharedJsonRef = useRef('')
  useEffect(() => {
    if (isInitialSyncMount.current) {
      isInitialSyncMount.current = false
      return
    }
    const sharedCals = (calendars || []).filter((c) => c.isShared && c.shareCode)
    if (sharedCals.length === 0) return

    const currentData = sharedCals.map((cal) => ({
      shareCode: cal.shareCode,
      events: (globalTasks || []).filter((t) => t.calendarId === cal.id),
    }))
    const currentJson = JSON.stringify(currentData)
    if (lastPublishedSharedJsonRef.current === currentJson) return

    const timer = setTimeout(() => {
      lastPublishedSharedJsonRef.current = currentJson
      for (const cal of sharedCals) {
        const eventsForCal = (globalTasks || []).filter((t) => t.calendarId === cal.id)
        publishSharedCalendarUpdate(cal.shareCode, cal, eventsForCal).catch(() => {})
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [globalTasks, calendars])

  // Auto-detección de enlace de conexión compartida en la URL (?connectCode=HUB-CAL-...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const connectCode = params.get('connectCode')
      if (connectCode) {
        const cleanCode = normalizeShareCode(connectCode)
        const alreadyConnected = calendars.some((c) => c.shareCode === cleanCode)
        if (!alreadyConnected) {
          const confirmConnect = window.confirm(
            `Se ha detectado una invitación para conectar el calendario compartido [${cleanCode}]. ¿Deseas conectarte y sincronizarlo en tiempo real?`
          )
          if (confirmConnect) {
            handleConnectSharedCalendar(cleanCode)
          }
        }
        const cleanUrl = window.location.pathname
        window.history.replaceState({}, '', cleanUrl)
      }
    } catch (e) {}
  }, [])

  // Modales y selectores personalizados elegantes (sin desplegables nativos cuadrados)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [eventModalMode, setEventModalMode] = useState(() => {
    return localStorage.getItem('event_modal_mode') || 'simple'
  })

  const toggleEventModalMode = (mode) => {
    setEventModalMode(mode)
    localStorage.setItem('event_modal_mode', mode)
  }
  const [selectedDetailTask, setSelectedDetailTask] = useState(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [isCalSelectDropdownOpen, setIsCalSelectDropdownOpen] = useState(false)
  const [isCatSelectDropdownOpen, setIsCatSelectDropdownOpen] = useState(false)
  const [isRecurrenceSelectDropdownOpen, setIsRecurrenceSelectDropdownOpen] = useState(false)
  const [feedbackToast, setFeedbackToast] = useState(null)
  const isMobileScreen = typeof window !== 'undefined' && (
    window.innerWidth < 768 ||
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
  )
  const [showHourlyGrid, setShowHourlyGrid] = useState(false)
  const [widgetLayout, setWidgetLayout] = useState('surround') // 'surround' | 'sidebar'
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [datePickerYear, setDatePickerYear] = useState(2026)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [slideDirection, setSlideDirection] = useState('none')

  // Menu contextual para roles (clic derecho) y modal de edición rápida
  const [roleContextMenu, setRoleContextMenu] = useState(null)
  const [roleToEdit, setRoleToEdit] = useState(null)
  const [appTheme, setAppThemeState] = useState(() => getAppTheme())

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail && APP_THEMES.some((t) => t.id === e.detail)) {
        setAppThemeState(e.detail)
      } else if (!e.detail) {
        setAppThemeState(getAppTheme())
      }
    }
    window.addEventListener('app_theme_style_changed', handleThemeChange)
    window.addEventListener('app_theme_changed', handleThemeChange)
    return () => {
      window.removeEventListener('app_theme_style_changed', handleThemeChange)
      window.removeEventListener('app_theme_changed', handleThemeChange)
    }
  }, [])

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (roleContextMenu) setRoleContextMenu(null)
      if (
        isCalDropdownOpen &&
        calDropdownRef.current &&
        !calDropdownRef.current.contains(e.target) &&
        calDropdownBtnRef.current &&
        !calDropdownBtnRef.current.contains(e.target)
      ) {
        setIsCalDropdownOpen(false)
      }
    }
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [roleContextMenu, isCalDropdownOpen])

  // Soporte universal de tecla Escape para cerrar modales, selectores y menus contextuales
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isCalDropdownOpen) {
          setIsCalDropdownOpen(false)
          return
        }
        if (isIconPickerOpen) {
          setIsIconPickerOpen(false)
          return
        }
        if (isCalSelectDropdownOpen || isCatSelectDropdownOpen || isRecurrenceSelectDropdownOpen) {
          setIsCalSelectDropdownOpen(false)
          setIsCatSelectDropdownOpen(false)
          setIsRecurrenceSelectDropdownOpen(false)
          return
        }
        if (roleContextMenu) {
          setRoleContextMenu(null)
          return
        }
        if (selectedDetailTask) {
          setSelectedDetailTask(null)
          return
        }
        if (taskToDelete) {
          setTaskToDelete(null)
          return
        }
        if (roleToEdit) {
          setRoleToEdit(null)
          return
        }
        if (isDatePickerOpen) {
          setIsDatePickerOpen(false)
          return
        }
        if (isEventModalOpen) {
          setIsEventModalOpen(false)
          return
        }
        if (isCalendarModalOpen) {
          setIsCalendarModalOpen(false)
          return
        }
        if (isCategoryModalOpen) {
          setIsCategoryModalOpen(false)
          return
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isCalDropdownOpen,
    isIconPickerOpen,
    isCalSelectDropdownOpen,
    isCatSelectDropdownOpen,
    isRecurrenceSelectDropdownOpen,
    roleContextMenu,
    selectedDetailTask,
    taskToDelete,
    roleToEdit,
    isDatePickerOpen,
    isEventModalOpen,
    isCalendarModalOpen,
    isCategoryModalOpen,
  ])

  const themeTokens = useMemo(() => getAppThemeTokens(appTheme), [appTheme])

  // Formulario Evento fluido con soporte de duración y hora de finalización
  const [eventForm, setEventForm] = useState({
    title: '',
    date: formatYMD(new Date()),
    time: '10:00',
    duration: 60,
    endTime: '11:00',
    isAllDay: false,
    effort: 'Medium',
    context: 'University',
    recurrence: 'none',
    icon: 'event',
    description: '',
    calendarId: 'cal-default',
    hasAlarm: false,
  })

  // Nueva categoría form y edición
  const [newCatName, setNewCatName] = useState('')
  const [selectedPalette, setSelectedPalette] = useState(CATEGORY_PALETTES[0])
  const [editingCategory, setEditingCategory] = useState(null) // { id, name, hex }

  // Ticker de tiempo real aislado para actualizar eventos finalizados en cambios de minuto sin re-renderizar continuamente la página
  const [nowTicker, setNowTicker] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setNowTicker((prev) => (now.getMinutes() !== prev.getMinutes() ? now : prev))
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const timetableRef = useRef(null)

  // Medir scrollbarGutter para alinear perfectamente cabecera y tabla de horas
  useEffect(() => {
    const updateGutter = () => {
      if (timetableRef.current) {
        const gutter = timetableRef.current.offsetWidth - timetableRef.current.clientWidth
        setScrollbarGutter(gutter)
      }
    }
    updateGutter()
    window.addEventListener('resize', updateGutter)
    return () => window.removeEventListener('resize', updateGutter)
  }, [calendarView, currentDate, activeCalendarId, calendarMode])

  // Scroll automático a 08:00
  useEffect(() => {
    if (timetableRef.current) {
      timetableRef.current.scrollTop = 480
    }
  }, [calendarView, currentDate, activeCalendarId, calendarMode])

  const getCatScheme = (catName) => {
    const found = categories.find((c) => c.name === catName)
    if (found) return found
    return { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', hex: '#3b82f6' }
  }

  // Filtrado de tareas según filtros categóricos (memoizado con useMemo)
  const filteredTasks = useMemo(() => {
    return (globalTasks || []).filter((task) => {
      if (selectedFilter === 'All') return true
      return task.context === selectedFilter
    })
  }, [globalTasks, selectedFilter])

  // Obtener tareas visibles para un calendario específico (incluyendo compartidos)
  const getTasksForCalendar = useCallback((cal) => {
    if (!cal) return filteredTasks
    return filteredTasks.filter((t) => {
      const taskCalId = t.calendarId || 'cal-default'
      if (taskCalId === cal.id) return true
      if (cal.sharedFrom && cal.sharedFrom.includes(taskCalId)) return true

      // Si el calendario es el de Universidad y la tarea es de ámbito académico/UMA
      if (cal.id === 'cal-university' && (
        (t.context || '').toLowerCase().includes('uni') ||
        (t.title || '').includes('@uma.es') ||
        (t.description || '').includes('@uma.es')
      )) {
        return true
      }
      // Si el calendario es Salud & Deporte y el contexto es Health & Gym
      if (cal.id === 'cal-health' && (t.context || '').toLowerCase().includes('health')) {
        return true
      }
      // Si el calendario es Trabajo & Proyectos y el contexto es Projects o Work
      if (cal.id === 'cal-work' && (
        (t.context || '').toLowerCase().includes('project') ||
        (t.context || '').toLowerCase().includes('work')
      )) {
        return true
      }
      return false
    })
  }, [filteredTasks])

  const activeCalendar = useMemo(() => {
    return (
      calendars.find((c) => c.id === activeCalendarId) ||
      calendars[0] || {
        id: 'cal-default',
        name: 'Personal & General',
        color: '#3b82f6',
        dot: 'bg-blue-500',
        sharedFrom: [],
        isDefault: true,
        syncUrl: '',
      }
    )
  }, [calendars, activeCalendarId])

  useEffect(() => {
    if (calendars.length > 0 && !calendars.some((c) => c.id === activeCalendarId)) {
      setActiveCalendarId(calendars[0].id)
    }
  }, [calendars, activeCalendarId])

  const currentCalendarTasks = useMemo(() => {
    return getTasksForCalendar(activeCalendar)
  }, [getTasksForCalendar, activeCalendar])

  const pendingTasks = useMemo(() => {
    return currentCalendarTasks.filter((t) => !t.completed)
  }, [currentCalendarTasks])

  const categoryCounts = useMemo(() => {
    const counts = {}
    if (!globalTasks || !categories) return counts
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i]
      counts[cat.id] = getUniqueTaskCount(
        globalTasks.filter(
          (t) => t.context === cat.name || t.context === cat.id || t.context === cat.label
        )
      )
    }
    return counts
  }, [globalTasks, categories])

  // Colores dinámicos del fondo según todos los calendarios presentes
  const otherCalendars = calendars.filter((c) => c.id !== activeCalendarId)
  const bgCal1 = activeCalendar?.color || '#3b82f6'
  const bgCal2 = otherCalendars[0]?.color || '#8b5cf6'
  const bgCal3 = otherCalendars[1]?.color || '#10b981'
  const bgCal4 = otherCalendars[2]?.color || '#f59e0b'

  // Handlers para eventos
  const handleOpenEventModal = (params = {}) => {
    const targetDate = params.date || formatYMD(currentDate) || formatYMD(new Date())
    const isAllDay = !!params.isAllDay
    const targetTime = isAllDay ? '' : (params.time || '10:00')
    const calId = params.calendarId || activeCalendarId

    const dur = 60
    let endH = '11', endM = '00'
    if (targetTime) {
      const [sh, sm] = targetTime.split(':').map(Number)
      const totalM = (sh * 60 + (sm || 0) + dur) % 1440
      endH = String(Math.floor(totalM / 60)).padStart(2, '0')
      endM = String(totalM % 60).padStart(2, '0')
    }

    setEditingTaskId(null)
    setEventForm({
      title: '',
      date: targetDate,
      time: targetTime,
      duration: dur,
      endTime: isAllDay ? '' : `${endH}:${endM}`,
      isAllDay,
      effort: 'Medium',
      context: categories[0]?.name || 'University',
      recurrence: 'none',
      icon: 'event',
      description: '',
      calendarId: calId,
      hasAlarm: false,
    })
    setIsIconPickerOpen(false)
    setIsCalSelectDropdownOpen(false)
    setIsCatSelectDropdownOpen(false)
    setIsRecurrenceSelectDropdownOpen(false)
    setIsEventModalOpen(true)
  }

  const generateRecurringEvents = (baseEvent) => {
    if (!baseEvent.recurrence || baseEvent.recurrence === 'none') return []
    const events = []
    const groupId = baseEvent.recurrenceGroupId || baseEvent.id

    if (baseEvent.recurrence === 'daily') {
      // 60 días continuos (2 meses) para un horizonte ágil y óptimo
      for (let i = 1; i <= 60; i++) {
        const nextD = new Date(baseEvent.date + 'T12:00:00')
        nextD.setDate(nextD.getDate() + i)
        events.push({
          ...baseEvent,
          id: `${groupId}-d-${i}`,
          recurrenceGroupId: groupId,
          date: formatYMD(nextD),
        })
      }
    } else if (baseEvent.recurrence === 'weekly') {
      // 12 semanas continuas (3 meses) en vez de 104 semanas (2 años)
      for (let i = 1; i <= 12; i++) {
        const nextD = new Date(baseEvent.date + 'T12:00:00')
        nextD.setDate(nextD.getDate() + i * 7)
        events.push({
          ...baseEvent,
          id: `${groupId}-w-${i}`,
          recurrenceGroupId: groupId,
          date: formatYMD(nextD),
        })
      }
    } else if (baseEvent.recurrence === 'monthly') {
      // 12 meses continuos (1 año) en vez de 60 meses
      for (let i = 1; i <= 12; i++) {
        const nextD = new Date(baseEvent.date + 'T12:00:00')
        nextD.setMonth(nextD.getMonth() + i)
        events.push({
          ...baseEvent,
          id: `${groupId}-m-${i}`,
          recurrenceGroupId: groupId,
          date: formatYMD(nextD),
        })
      }
    } else if (baseEvent.recurrence === 'yearly') {
      // 3 años continuos en vez de 10
      for (let i = 1; i <= 3; i++) {
        const nextD = new Date(baseEvent.date + 'T12:00:00')
        nextD.setFullYear(nextD.getFullYear() + i)
        events.push({
          ...baseEvent,
          id: `${groupId}-y-${i}`,
          recurrenceGroupId: groupId,
          date: formatYMD(nextD),
        })
      }
    }
    return events
  }

  const handleStartEditEvent = (task) => {
    setEditingTaskId(task.id)
    const isAllDay = !!task.isAllDay
    const dur = getEventDurationMinutes(task)
    let endTime = isAllDay ? '' : (task.endTime || '')
    if (!endTime && task.time && !isAllDay) {
      const [sh, sm] = task.time.split(':').map(Number)
      const totalM = (sh * 60 + (sm || 0) + dur) % 1440
      const endH = String(Math.floor(totalM / 60)).padStart(2, '0')
      const endM = String(totalM % 60).padStart(2, '0')
      endTime = `${endH}:${endM}`
    }

    setEventForm({
      title: task.title,
      date: task.date,
      time: isAllDay ? '' : (task.time || '10:00'),
      duration: dur,
      endTime,
      isAllDay,
      effort: task.effort || 'Medium',
      context: task.context || 'University',
      recurrence: task.recurrence || 'none',
      icon: task.icon || 'event',
      description: task.description || '',
      calendarId: task.calendarId || activeCalendarId,
      hasAlarm: !!task.hasAlarm,
    })
    setIsIconPickerOpen(false)
    setIsCalSelectDropdownOpen(false)
    setIsCatSelectDropdownOpen(false)
    setIsRecurrenceSelectDropdownOpen(false)
    setSelectedDetailTask(null)
    setIsEventModalOpen(true)
  }

  const handleOpenEditTask = handleStartEditEvent

  const handleSaveEvent = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const cleanTitle = eventForm.title.trim()
    if (!cleanTitle) return

    const targetCalId = eventForm.calendarId || activeCalendarId
    const durMinutes = eventForm.duration || 60
    const estLabel = durMinutes >= 60 ? `${Math.round(durMinutes / 60)}h` : `${durMinutes}m`

    if (editingTaskId) {
      const prevTask = (globalTasks || []).find((t) => String(t.id) === String(editingTaskId))
      const recurrenceChanged = prevTask?.recurrence !== eventForm.recurrence
      const groupId = prevTask?.recurrenceGroupId || editingTaskId

      setGlobalTasks((prev) => {
        let updated = (prev || []).map((t) =>
          String(t.id) === String(editingTaskId)
            ? {
                ...t,
                title: cleanTitle,
                description: eventForm.description.trim(),
                date: eventForm.date,
                time: eventForm.isAllDay ? '' : eventForm.time,
                endTime: eventForm.isAllDay ? '' : (eventForm.endTime || ''),
                duration: durMinutes,
                est: estLabel,
                isAllDay: eventForm.isAllDay,
                effort: eventForm.effort,
                context: eventForm.context,
                icon: eventForm.icon || 'event',
                calendarId: targetCalId,
                hasAlarm: Boolean(eventForm.hasAlarm),
                recurrence: eventForm.recurrence,
                recurrenceGroupId: eventForm.recurrence !== 'none' ? groupId : null,
              }
            : t
        )

        // Si se activó o cambió la recurrencia durante la edición, generar ocurrencias futuras continuas
        if (recurrenceChanged && eventForm.recurrence !== 'none') {
          // Limpiar eventos repetidos anteriores si existían
          if (prevTask?.recurrenceGroupId) {
            updated = updated.filter(
              (t) => String(t.id) === String(editingTaskId) || t.recurrenceGroupId !== prevTask.recurrenceGroupId
            )
          }
          const baseUpdated = {
            ...prevTask,
            id: editingTaskId,
            title: cleanTitle,
            description: eventForm.description.trim(),
            date: eventForm.date,
            time: eventForm.isAllDay ? '' : eventForm.time,
            endTime: eventForm.isAllDay ? '' : (eventForm.endTime || ''),
            duration: durMinutes,
            est: estLabel,
            isAllDay: eventForm.isAllDay,
            effort: eventForm.effort,
            context: eventForm.context,
            icon: eventForm.icon || 'event',
            calendarId: targetCalId,
            hasAlarm: Boolean(eventForm.hasAlarm),
            recurrence: eventForm.recurrence,
            recurrenceGroupId: groupId,
          }
          const futureRecurrences = generateRecurringEvents(baseUpdated)
          updated = [...updated, ...futureRecurrences]
        }
        return updated
      })

      setIsEventModalOpen(false)
      setEditingTaskId(null)
      setFeedbackToast('Evento actualizado')
      setTimeout(() => setFeedbackToast(null), 3000)
      return
    }

    const groupId = Date.now()
    const baseEvent = {
      id: groupId,
      title: cleanTitle,
      description: eventForm.description.trim(),
      date: eventForm.date,
      time: eventForm.isAllDay ? '' : eventForm.time,
      endTime: eventForm.isAllDay ? '' : (eventForm.endTime || ''),
      duration: durMinutes,
      est: estLabel,
      isAllDay: eventForm.isAllDay,
      effort: eventForm.effort,
      context: eventForm.context,
      icon: eventForm.icon || 'event',
      hasAlarm: Boolean(eventForm.hasAlarm),
      recurrence: eventForm.recurrence,
      recurrenceGroupId: eventForm.recurrence !== 'none' ? groupId : null,
      calendarId: targetCalId,
      completed: false,
    }

    const eventsToAdd = [baseEvent, ...generateRecurringEvents(baseEvent)]

    if (typeof setGlobalTasks === 'function') {
      setGlobalTasks((prev) => [...(prev || []), ...eventsToAdd])
    }

    // Garantizar visibilidad inmediata del evento:
    if (selectedFilter !== 'All' && selectedFilter !== eventForm.context) {
      setSelectedFilter('All')
    }
    if (activeCalendarId !== targetCalId) {
      const activeCal = calendars.find((c) => c.id === activeCalendarId)
      if (!activeCal?.sharedFrom?.includes(targetCalId)) {
        setActiveCalendarId(targetCalId)
      }
    }
    const parsedDate = new Date(eventForm.date + 'T12:00:00')
    if (!isNaN(parsedDate.getTime())) {
      setCurrentDate(parsedDate)
    }
    if (eventForm.time && !eventForm.isAllDay && timetableRef.current) {
      const topPos = timeToTop(eventForm.time)
      timetableRef.current.scrollTop = Math.max(0, topPos - 120)
    }

    setIsEventModalOpen(false)
    setFeedbackToast('¡Evento creado con éxito!')
    setTimeout(() => setFeedbackToast(null), 3000)
  }

  const deleteTask = (id) => {
    const task = (globalTasks || []).find((t) => String(t.id) === String(id))
    if (task && (task.recurrenceGroupId || (task.recurrence && task.recurrence !== 'none'))) {
      setTaskToDelete(task)
      return
    }
    confirmDeleteTask(id, 'single')
  }

  const confirmDeleteTask = (id, mode) => {
    const targetTask = (globalTasks || []).find((t) => String(t.id) === String(id))
    if (!targetTask) return

    if (mode === 'all' && (targetTask.recurrenceGroupId || (targetTask.recurrence && targetTask.recurrence !== 'none'))) {
      const gId = targetTask.recurrenceGroupId || targetTask.id
      setGlobalTasks((prev) =>
        (prev || []).filter(
          (t) => String(t.id) !== String(gId) && t.recurrenceGroupId !== gId && String(t.id) !== String(id)
        )
      )
    } else {
      setGlobalTasks((prev) => (prev || []).filter((t) => String(t.id) !== String(id)))
    }

    deleteBaileysTask(id).catch(() => {})

    if (selectedDetailTask && String(selectedDetailTask.id) === String(id)) {
      setSelectedDetailTask(null)
    }
    setTaskToDelete(null)
    setFeedbackToast(mode === 'all' ? 'Serie de eventos eliminada' : 'Evento eliminado')
    setTimeout(() => setFeedbackToast(null), 3000)
  }

  // Manejo de categorías (Memoria compartida con Auto-Organizer)
  const handleAddCategory = () => {
    if (!newCatName.trim()) return
    const updated = addSharedRole({
      name: newCatName.trim(),
      hexColor: selectedPalette.hex,
      icon: 'task_alt',
    })
    setCategories(updated)
    setNewCatName('')
  }

  const handleUpdateCategory = (roleId, newName, newHex) => {
    if (!newName || !newName.trim()) return
    const updated = updateSharedRole(roleId, {
      name: newName.trim(),
      hexColor: newHex || selectedPalette.hex,
    })
    setCategories(updated)
    setEditingCategory(null)
    setFeedbackToast(`Categoría "${newName.trim()}" actualizada correctamente`)
    setTimeout(() => setFeedbackToast(null), 3000)
  }

  const handleDeleteCategory = (catName) => {
    const role = categories.find((c) => c.name === catName || c.id === catName || c.label === catName)
    if (!role) return
    setRoleToDelete(role)
  }

  // Confirmación de borrado de rol (solo rol o rol + actividades asociadas)
  const handleConfirmDeleteRole = (role, deleteActivities) => {
    if (!role) return

    const roleName = role.name
    const roleId = role.id
    const roleLabel = role.label || role.name

    const isMatch = (t) =>
      t.context === roleName ||
      t.context === roleId ||
      t.context === roleLabel

    const toDelete = (globalTasks || []).filter(isMatch)
    const deletedIds = toDelete.map((t) => t.id)

    if (deleteActivities) {
      const remainingTasks = (globalTasks || []).filter((t) => !isMatch(t))
      setGlobalTasks(remainingTasks)
      try {
        localStorage.setItem('app_global_tasks', JSON.stringify(remainingTasks))
      } catch (e) {}
      syncBaileysTasks(remainingTasks, { replace: true, deletedIds }).catch(() => {})
      syncTasksToCloud(remainingTasks).catch(() => {})

      const updated = deleteSharedRole(role.id)
      setCategories(updated)
      if (selectedFilter === roleName || selectedFilter === roleId) setSelectedFilter('All')
      setFeedbackToast(`Rol "${roleLabel}" y ${toDelete.length} actividades eliminadas permanentemente`)
      setTimeout(() => setFeedbackToast(null), 3500)
    } else {
      const updatedTasks = (globalTasks || []).map((t) =>
        isMatch(t) ? { ...t, context: 'Personal' } : t
      )
      setGlobalTasks(updatedTasks)
      try {
        localStorage.setItem('app_global_tasks', JSON.stringify(updatedTasks))
      } catch (e) {}
      syncBaileysTasks(updatedTasks).catch(() => {})
      syncTasksToCloud(updatedTasks).catch(() => {})

      const updated = deleteSharedRole(role.id)
      setCategories(updated)
      if (selectedFilter === roleName || selectedFilter === roleId) setSelectedFilter('All')
      setFeedbackToast(`Rol "${roleLabel}" eliminado. Actividades conservadas en Personal`)
      setTimeout(() => setFeedbackToast(null), 3500)
    }

    setRoleToDelete(null)
  }

  // Limpiar eventos importados de un calendario específico
  const handleClearExternalFromCal = (calId) => {
    const isTarget = (t) =>
      (t.calendarId === calId || (!t.calendarId && calId === 'cal-default')) && t.isExternalSync
    const toDelete = (globalTasks || []).filter(isTarget)
    if (toDelete.length === 0) return
    const confirmed = window.confirm(
      `¿Deseas eliminar las ${toDelete.length} actividades importadas por sincronización externa de este calendario? Las tareas manuales se conservarán intactas.`
    )
    if (!confirmed) return
    const deletedIds = toDelete.map((t) => t.id)
    const remainingTasks = (globalTasks || []).filter((t) => !isTarget(t))
    setGlobalTasks(remainingTasks)
    try {
      localStorage.setItem('app_global_tasks', JSON.stringify(remainingTasks))
    } catch (e) {}
    syncBaileysTasks(remainingTasks, { replace: true, deletedIds }).catch(() => {})
    syncTasksToCloud(remainingTasks).catch(() => {})
    const cleanedRoles = pruneOrphanImportedRoles(remainingTasks)
    setCategories(cleanedRoles)
    setFeedbackToast(`Se eliminaron ${toDelete.length} eventos importados y sus roles vacíos`)
    setTimeout(() => setFeedbackToast(null), 3500)
  }

  // Manejo de Calendarios múltiples y Sincronización Externa (TeamUp, Google Calendar, Móvil)
  const handleCloseCalendarModal = () => {
    if (editingCalendarId && !calendars.some((c) => c.id === editingCalendarId)) {
      setGlobalTasks((prev) => (prev || []).filter((t) => t.calendarId !== editingCalendarId))
    }
    setIsCalendarModalOpen(false)
  }

  const handleOpenAddCalendar = () => {
    const newCalId = `cal-${Date.now()}`
    setEditingCalendarId(newCalId)
    setCalendarModalTab('edit')
    setCalendarForm({
      name: '',
      color: '#3b82f6',
      sharedFrom: [],
      syncUrl: '',
      isShared: false,
      shareCode: '',
      sharedRole: 'owner',
    })
    setIsCalendarModalOpen(true)
  }

  const handleOpenEditCalendar = (cal, e) => {
    if (e) e.stopPropagation()
    setEditingCalendarId(cal.id)
    setCalendarModalTab('edit')
    setCalendarForm({
      name: cal.name,
      color: cal.color || '#3b82f6',
      sharedFrom: cal.sharedFrom || [],
      syncUrl: cal.syncUrl || '',
      isShared: Boolean(cal.isShared),
      shareCode: cal.shareCode || '',
      sharedRole: cal.sharedRole || 'owner',
    })
    setIsCalendarModalOpen(true)
  }

  const handleToggleShareCurrentCalendar = () => {
    if (calendarForm.isShared && calendarForm.shareCode) {
      setCalendarForm((prev) => ({
        ...prev,
        isShared: false,
      }))
      setFeedbackToast('Modo compartido desactivado para este calendario')
      setTimeout(() => setFeedbackToast(null), 3000)
    } else {
      const newCode = calendarForm.shareCode || generateShareCode()
      setCalendarForm((prev) => ({
        ...prev,
        isShared: true,
        shareCode: newCode,
        sharedRole: 'owner',
      }))
      setFeedbackToast(`Código generado: ${newCode}`)
      setTimeout(() => setFeedbackToast(null), 3000)
    }
  }

  const handleCopyShareCode = (code) => {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCodeToast(true)
      setTimeout(() => setCopiedCodeToast(false), 2000)
      setFeedbackToast(`Código ${code} copiado al portapapeles`)
      setTimeout(() => setFeedbackToast(null), 2500)
    }).catch(() => {})
  }

  const handleCopyShareLink = (code) => {
    if (!code) return
    const link = `${window.location.origin}/calendar?connectCode=${encodeURIComponent(code)}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLinkToast(true)
      setTimeout(() => setCopiedLinkToast(false), 2000)
      setFeedbackToast(`Enlace directo copiado al portapapeles`)
      setTimeout(() => setFeedbackToast(null), 2500)
    }).catch(() => {})
  }

  const handleConnectSharedCalendar = async (customCode) => {
    const codeToConnect = normalizeShareCode(customCode || importCalendarCode)
    if (!codeToConnect) {
      setFeedbackToast('Introduce un código o enlace de calendario válido')
      setTimeout(() => setFeedbackToast(null), 3000)
      return
    }

    const existing = calendars.find((c) => c.shareCode === codeToConnect)
    if (existing) {
      setActiveCalendarId(existing.id)
      setIsCalendarModalOpen(false)
      setFeedbackToast(`Ya estás conectado a "${existing.name}"`)
      setTimeout(() => setFeedbackToast(null), 3000)
      return
    }

    setIsConnectingSharedCal(true)
    try {
      const data = await fetchSharedCalendar(codeToConnect)
      const remoteCal = data.calendar || {}
      const remoteEvents = Array.isArray(data.events) ? data.events : []

      const newCalId = `cal-shared-${Date.now()}`
      const newCal = {
        id: newCalId,
        name: remoteCal.name || `Calendario Compartido (${codeToConnect.slice(-4)})`,
        color: remoteCal.color || '#f43f5e',
        dot: 'bg-rose-500',
        sharedFrom: [],
        syncUrl: '',
        isShared: true,
        shareCode: codeToConnect,
        sharedRole: 'member',
        connectedAt: Date.now(),
      }

      setCalendars((prev) => {
        const updated = [...prev, newCal]
        const curUser = getCurrentUser()
        saveUserCalendars(updated, curUser)
        syncCalendarsToCloud(updated).catch(() => {})
        return updated
      })
      setActiveCalendarId(newCal.id)

      if (remoteEvents.length > 0) {
        const mappedEvents = remoteEvents.map((t) => ({
          ...t,
          calendarId: newCal.id,
        }))
        setGlobalTasks((prev) => [...(prev || []), ...mappedEvents])
      }

      setImportCalendarCode('')
      setIsCalendarModalOpen(false)
      setFeedbackToast(`Conectado en tiempo real a "${newCal.name}"`)
      setTimeout(() => setFeedbackToast(null), 3500)
    } catch (err) {
      setFeedbackToast(err.message || 'Error al conectar con el calendario compartido')
      setTimeout(() => setFeedbackToast(null), 4000)
    } finally {
      setIsConnectingSharedCal(false)
    }
  }

  const handleSaveCalendar = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!calendarForm.name.trim()) return

    const cleanSyncUrl = calendarForm.syncUrl?.trim() || ''
    const targetCalId = editingCalendarId || `cal-${Date.now()}`
    const existing = calendars.find((c) => c.id === targetCalId)

    if (existing) {
      const updatedCal = {
        ...existing,
        name: calendarForm.name.trim(),
        color: calendarForm.color,
        sharedFrom: calendarForm.sharedFrom,
        syncUrl: cleanSyncUrl,
        isShared: Boolean(calendarForm.isShared),
        shareCode: calendarForm.shareCode || existing.shareCode || '',
        sharedRole: calendarForm.sharedRole || existing.sharedRole || 'owner',
      }
      setCalendars((prev) => {
        const updated = prev.map((c) => (c.id === targetCalId ? updatedCal : c))
        const curUser = getCurrentUser()
        saveUserCalendars(updated, curUser)
        syncCalendarsToCloud(updated).catch(() => {})
        return updated
      })
      setFeedbackToast(`Calendario "${calendarForm.name.trim()}" guardado`)
      setTimeout(() => setFeedbackToast(null), 3000)
      if (cleanSyncUrl && cleanSyncUrl !== existing.syncUrl) {
        handleSyncCalendar(targetCalId, cleanSyncUrl)
      }
      if (updatedCal.isShared && updatedCal.shareCode) {
        const calEvents = (globalTasks || []).filter((t) => t.calendarId === targetCalId)
        publishSharedCalendarUpdate(updatedCal.shareCode, updatedCal, calEvents).catch(() => {})
      }
    } else {
      const newCal = {
        id: targetCalId,
        name: calendarForm.name.trim(),
        color: calendarForm.color,
        dot: 'bg-primary',
        sharedFrom: calendarForm.sharedFrom,
        syncUrl: cleanSyncUrl,
        isShared: Boolean(calendarForm.isShared),
        shareCode: calendarForm.shareCode || '',
        sharedRole: calendarForm.sharedRole || 'owner',
      }
      setCalendars((prev) => {
        const updated = [...prev, newCal]
        const curUser = getCurrentUser()
        saveUserCalendars(updated, curUser)
        syncCalendarsToCloud(updated).catch(() => {})
        return updated
      })
      setActiveCalendarId(newCal.id)
      setFeedbackToast(`Calendario "${newCal.name}" creado con éxito`)
      setTimeout(() => setFeedbackToast(null), 3000)
      if (cleanSyncUrl) {
        handleSyncCalendar(newCal.id, cleanSyncUrl)
      }
      if (newCal.isShared && newCal.shareCode) {
        const calEvents = (globalTasks || []).filter((t) => t.calendarId === targetCalId)
        publishSharedCalendarUpdate(newCal.shareCode, newCal, calEvents).catch(() => {})
      }
    }
    setIsCalendarModalOpen(false)
  }

  const handleDeleteCalendar = (calId) => {
    if (calendars.length <= 1) {
      setFeedbackToast('No puedes eliminar el único calendario activo')
      setTimeout(() => setFeedbackToast(null), 3000)
      return
    }
    const calToDelete = calendars.find((c) => c.id === calId)
    const confirmed = window.confirm(
      `¿Deseas eliminar el calendario "${calToDelete?.name || ''}" y todos sus eventos asociados?`
    )
    if (!confirmed) return

    const toDelete = (globalTasks || []).filter((t) => t.calendarId === calId)
    const deletedIds = toDelete.map((t) => t.id)
    const remainingTasks = (globalTasks || []).filter((t) => t.calendarId !== calId)

    setCalendars((prev) => {
      const remainingCals = prev.filter((c) => c.id !== calId)
      const curUser = getCurrentUser()
      saveUserCalendars(remainingCals, curUser)
      syncCalendarsToCloud(remainingCals).catch(() => {})
      return remainingCals
    })
    setGlobalTasks(remainingTasks)
    try {
      localStorage.setItem('app_global_tasks', JSON.stringify(remainingTasks))
    } catch (e) {}
    syncBaileysTasks(remainingTasks, { replace: true, deletedIds }).catch(() => {})
    syncTasksToCloud(remainingTasks).catch(() => {})

    if (activeCalendarId === calId) {
      const remaining = calendars.filter((c) => c.id !== calId)
      setActiveCalendarId(remaining[0]?.id || 'cal-default')
    }
    setIsCalendarModalOpen(false)
    setFeedbackToast(`Calendario "${calToDelete?.name || ''}" eliminado`)
    setTimeout(() => setFeedbackToast(null), 3000)
  }

  // Sincronización de calendario externo mediante feed iCal / Webcal (TeamUp, Google Calendar, etc.)
  const handleSyncCalendar = async (calId, urlToSync) => {
    const targetUrl = urlToSync || calendarForm.syncUrl
    if (!targetUrl || !targetUrl.trim()) {
      setFeedbackToast('Introduce una URL válida de iCal / TeamUp / Google Calendar')
      setTimeout(() => setFeedbackToast(null), 3000)
      return
    }

    setIsSyncingCalendar(true)
    let cleanUrl = targetUrl.trim()
    if (cleanUrl.startsWith('webcal://')) {
      cleanUrl = cleanUrl.replace('webcal://', 'https://')
    }

    // Auto-conversión universal e inteligente de URLs de TeamUp (ej: teamup.com/ks..., teamup.com/c/ks..., ics.teamup.com...)
    const teamupMatch = cleanUrl.match(/(?:ics\.)?teamup\.com\/(?:feed\/|c\/)?([a-zA-Z0-9_-]+)/i)
    if (teamupMatch && !cleanUrl.endsWith('.ics') && !cleanUrl.includes('/0.ics')) {
      const teamupKey = teamupMatch[1]
      cleanUrl = `https://ics.teamup.com/feed/${teamupKey}/0.ics`
    }

    try {
      let icsText = ''
      const apiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''
      const candidateProxies = [
        `${apiBase}/api/proxy-ics?url=${encodeURIComponent(cleanUrl)}`,
        `/api/proxy-ics?url=${encodeURIComponent(cleanUrl)}`,
        cleanUrl,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`,
        `https://corsproxy.io/?url=${encodeURIComponent(cleanUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}`,
      ]

      for (const endpoint of candidateProxies) {
        try {
          const res = await fetch(endpoint)
          if (res.ok) {
            const txt = await res.text()
            if (txt && txt.includes('BEGIN:VCALENDAR')) {
              icsText = txt
              break
            }
          }
        } catch {
          // continuar con el siguiente proxy transparente
        }
      }

      if (!icsText || !icsText.includes('BEGIN:VCALENDAR')) {
        throw new Error('No se pudo obtener un feed iCal/ICS válido desde el enlace')
      }

      const targetCalId = calId || editingCalendarId || activeCalendarId
      const importedEvents = parseICS(icsText, targetCalId)

      if (importedEvents.length === 0) {
        setFeedbackToast('Feed conectado pero no contiene eventos VEVENT')
        setTimeout(() => setFeedbackToast(null), 3500)
        return
      }

      // Reemplazar eventos anteriores de esta sincronización para este calendario
      setGlobalTasks((prev) => {
        const remaining = (prev || []).filter(
          (t) => !(t.isExternalSync && t.calendarId === targetCalId)
        )
        return [...remaining, ...importedEvents]
      })

      // Guardar URL y hora de sync
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setCalendars((prev) =>
        prev.map((c) =>
          c.id === targetCalId
            ? { ...c, syncUrl: targetUrl.trim(), lastSynced: nowTime }
            : c
        )
      )

      if (editingCalendarId) {
        setCalendarForm((prev) => ({ ...prev, syncUrl: targetUrl.trim() }))
      }

      setFeedbackToast(`¡Sincronizado! Se importaron ${importedEvents.length} eventos de TeamUp/Google`)
      setTimeout(() => setFeedbackToast(null), 3500)
    } catch (err) {
      console.error(err)
      setFeedbackToast('Error al conectar con el enlace. También puedes subir el archivo .ics directamente')
      setTimeout(() => setFeedbackToast(null), 4000)
    } finally {
      setIsSyncingCalendar(false)
    }
  }

  // Importar archivo .ics local (exportado desde móvil, Apple Calendar o Google Calendar)
  const handleImportICSFile = (e, calId) => {
    const file = e.target.files?.[0]
    if (!file) return
    const targetCalId = calId || editingCalendarId || activeCalendarId

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result
        if (typeof content === 'string') {
          const importedEvents = parseICS(content, targetCalId)
          if (importedEvents.length === 0) {
            setFeedbackToast('El archivo no contiene eventos VEVENT válidos')
            setTimeout(() => setFeedbackToast(null), 3500)
            return
          }
          setGlobalTasks((prev) => [...(prev || []), ...importedEvents])
          setFeedbackToast(`¡Importados ${importedEvents.length} eventos del archivo .ics!`)
          setTimeout(() => setFeedbackToast(null), 3500)
        }
      } catch (err) {
        console.error(err)
        setFeedbackToast('Error al leer el archivo .ics')
        setTimeout(() => setFeedbackToast(null), 3000)
      }
    }
    reader.readAsText(file)
  }

  // Reordenar calendarios en Modo Cascada
  const moveCalendar = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= calendars.length) return
    setCalendars((prev) => {
      const copy = [...prev]
      const [moved] = copy.splice(fromIdx, 1)
      copy.splice(toIdx, 0, moved)
      return copy
    })
  }

  const toggleCollapseCalendar = (calId) => {
    setCollapsedCalIds((prev) =>
      prev.includes(calId) ? prev.filter((id) => id !== calId) : [...prev, calId]
    )
  }

  // Widgets: Reordenar, Eliminar/Ocultar y Añadir con animaciones
  const moveWidget = (fromIdx, toIdx) => {
    if (
      fromIdx < 0 ||
      fromIdx >= sidebarWidgets.length ||
      toIdx < 0 ||
      toIdx >= sidebarWidgets.length ||
      fromIdx === toIdx
    )
      return
    setSidebarWidgets((prev) => {
      const copy = [...prev]
      const temp = copy[fromIdx]
      copy[fromIdx] = copy[toIdx]
      copy[toIdx] = temp
      return copy
    })
  }

  const removeWidget = (widgetId) => {
    setSidebarWidgets((prev) => prev.filter((id) => id !== widgetId))
  }

  const addWidget = (widgetId) => {
    if (!sidebarWidgets.includes(widgetId)) {
      setSidebarWidgets((prev) => [...prev, widgetId])
    }
  }

  const toggleCollapseWidget = (widgetId) => {
    setCollapsedWidgets((prev) =>
      prev.includes(widgetId) ? prev.filter((id) => id !== widgetId) : [...prev, widgetId]
    )
  }

  // Drag & drop animado
  const handleDragStart = (e, idx) => {
    setDraggedWidgetIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnter = (idx) => {
    if (draggedWidgetIdx !== null && draggedWidgetIdx !== idx) {
      setDragOverWidgetIdx(idx)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDragEnd = () => {
    setDraggedWidgetIdx(null)
    setDragOverWidgetIdx(null)
  }

  const handleDrop = (targetIdx) => {
    if (draggedWidgetIdx !== null && draggedWidgetIdx !== targetIdx) {
      moveWidget(draggedWidgetIdx, targetIdx)
    }
    setDraggedWidgetIdx(null)
    setDragOverWidgetIdx(null)
  }

  // Navegación de periodos fluida
  const handlePrevPeriod = () => {
    setSlideDirection('left')
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (calendarView === 'month') {
        d.setMonth(d.getMonth() - 1)
      } else if (calendarView === 'week') {
        d.setDate(d.getDate() - 7)
      } else {
        d.setDate(d.getDate() - 1)
      }
      return d
    })
  }

  const handleNextPeriod = () => {
    setSlideDirection('right')
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (calendarView === 'month') {
        d.setMonth(d.getMonth() + 1)
      } else if (calendarView === 'week') {
        d.setDate(d.getDate() + 7)
      } else {
        d.setDate(d.getDate() + 1)
      }
      return d
    })
  }

  // Soporte de gestos táctiles (Swipe 1 dedo: periodo anterior/siguiente)
  const touchStateRef = useRef({ active: false, startX: 0, startY: 0, maxFingers: 1 })

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return
    const count = e.touches.length
    if (!touchStateRef.current.active) {
      touchStateRef.current = {
        active: true,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        maxFingers: count,
      }
    } else {
      touchStateRef.current.maxFingers = Math.max(touchStateRef.current.maxFingers, count)
    }
  }

  const handleTouchMove = (e) => {
    if (touchStateRef.current.active && e.touches) {
      touchStateRef.current.maxFingers = Math.max(touchStateRef.current.maxFingers, e.touches.length)
    }
  }

  const handleTouchEnd = (e) => {
    if (!touchStateRef.current.active) return
    const touch = (e.changedTouches && e.changedTouches[0]) || null
    const endX = touch ? touch.clientX : touchStateRef.current.startX
    const endY = touch ? touch.clientY : touchStateRef.current.startY
    const deltaX = endX - touchStateRef.current.startX
    const deltaY = endY - touchStateRef.current.startY
    const maxFingers = touchStateRef.current.maxFingers

    if (e.touches && e.touches.length > 0) return
    touchStateRef.current.active = false

    // Si es gesto de 1 dedo, navegar periodo del calendario
    if (maxFingers === 1 && Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        handleNextPeriod()
      } else {
        handlePrevPeriod()
      }
    }
  }

  const getPeriodTitle = () => {
    const month = MONTH_NAMES_ES[currentDate.getMonth()]
    const year = currentDate.getFullYear()
    if (calendarView === 'month') {
      return `${month} ${year}`
    }
    if (calendarView === 'day') {
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      return `${dayNames[currentDate.getDay()]}, ${currentDate.getDate()} de ${month} de ${year}`
    }
    const weekDays = getWeekDays(currentDate)
    const first = weekDays[0]
    const last = weekDays[6]
    return `${first.dayNum} ${MONTH_NAMES_ES[first.dateObj.getMonth()].slice(0, 3)} – ${last.dayNum} ${MONTH_NAMES_ES[last.dateObj.getMonth()].slice(0, 3)} ${year}`
  }

  // Gráfica de distribución de categorías
  const weeklyAllocation = {
    totalHours: `${(currentCalendarTasks.length * 1.5).toFixed(1)}h`,
    diffText: `${currentCalendarTasks.length} actividades`,
    categories: categories.map((cat) => {
      const count = currentCalendarTasks.filter((t) => t.context === cat.name).length
      return {
        label: cat.name,
        hours: `${(count * 1.5).toFixed(1)}h`,
        count,
        color: cat.dot,
        bg: cat.bg,
        hex: cat.hex,
      }
    }),
  }

  // ===================== RENDERIZADORES DE VISTAS =====================

  // 1. Vista de Mes Continua (Líneas divisorias integradas continuas estilo Apple Calendar)
  const renderMonthView = (tasksToDisplay, calObj) => {
    const tasksByDate = buildTasksByDateMap(tasksToDisplay)
    return (
      <div className="flex flex-col w-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#161b26]">
        {/* Month Header Days */}
        <div className="grid grid-cols-7 bg-slate-100/90 dark:bg-[#141824] border-b border-slate-200/80 dark:border-slate-800 py-2 sm:py-2.5 text-center">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => {
            const fullDay = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][idx]
            return (
              <span key={day} className="font-label-sm text-[11px] sm:text-label-sm text-secondary uppercase tracking-wider font-semibold">
                <span className="sm:hidden">{day}</span>
                <span className="hidden sm:inline">{fullDay}</span>
              </span>
            )
          })}
        </div>
        {/* Month Grid Cells Continuas (Matriz continua sin cajas redondeadas flotantes) */}
        <div className="grid grid-cols-7 gap-px bg-slate-200/80 dark:bg-slate-800/80">
          {getMonthDays(currentDate).map((cell) => {
            const isToday = cell.ymd === TODAY_YMD
            const isSelected = cell.ymd === formatYMD(currentDate)
            const cellTasks = tasksByDate.get(cell.ymd) || []

          return (
            <div
              key={cell.ymd}
              onClick={() => {
                setCurrentDate(cell.dateObj)
                setCalendarView('day')
              }}
              className={`min-h-[64px] sm:min-h-[115px] p-1 sm:p-2 transition-colors cursor-pointer group flex flex-col justify-between ${
                isToday
                  ? 'bg-primary-fixed/15 dark:bg-primary-fixed/10'
                  : cell.isCurrentMonth
                  ? 'bg-white dark:bg-[#161b26] hover:bg-slate-50 dark:hover:bg-[#1c2230]'
                  : 'bg-slate-50/70 dark:bg-[#11141d]/70 text-secondary/60 hover:bg-slate-100/70 dark:hover:bg-[#141824]'
              } ${isSelected ? 'ring-2 ring-inset ring-primary z-10' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-label-sm text-[11px] sm:text-xs rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-medium ${
                    isToday
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : cell.isCurrentMonth
                      ? 'text-on-surface'
                      : 'text-secondary opacity-60'
                  }`}
                >
                  {cell.dayNum}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEventModal({ date: cell.ymd, calendarId: calObj?.id })
                  }}
                  className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-primary/10 text-secondary hover:text-primary transition-opacity cursor-pointer z-10"
                  title="Añadir evento este día"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                </button>
              </div>

              {/* Versión móvil: puntos de color indicadores sin desbordar */}
              <div className="flex sm:hidden items-center justify-center gap-0.5 mt-1">
                {cellTasks.slice(0, 3).map((task) => {
                  const scheme = getCatScheme(task.context)
                  return (
                    <span key={task.id} className={`w-1.5 h-1.5 rounded-full ${scheme.dot} shrink-0`} />
                  )
                })}
                {cellTasks.length > 3 && (
                  <span className="w-1 h-1 rounded-full bg-secondary shrink-0" />
                )}
              </div>

              {/* Versión Desktop: Tarjetas preview con texto y horas */}
              <div className="hidden sm:flex flex-col gap-1 mt-1 overflow-hidden">
                {cellTasks.slice(0, 3).map((task) => {
                  const scheme = getCatScheme(task.context)
                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDetailTask(task)
                      }}
                      className={`group/item relative px-1.5 py-0.5 rounded-md text-[11px] flex items-center shadow-2xs transition-all border border-black/5 dark:border-white/5 ${scheme.bg} ${scheme.text} ${
                        task.completed || isEventFinished(task, nowTicker) ? 'opacity-40 line-through grayscale-[30%]' : ''
                      }`}
                      title={`${task.time || 'Todo el día'} · ${task.title}`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full min-w-0 pr-1 group-hover/item:pr-7">
                        <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full ${scheme.dot} shrink-0`}></span>
                          <span className="truncate font-semibold text-[10.5px] leading-tight">{task.title}</span>
                        </div>
                        {task.time && (
                          <span className="font-code-sm text-[9px] opacity-75 shrink-0 font-medium ml-0.5">
                            {task.time}
                          </span>
                        )}
                      </div>
                      <div className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 flex items-center z-20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteTask(task.id)
                          }}
                          className="hover:text-error w-3.5 h-3.5 rounded flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer p-0 shrink-0"
                          title="Eliminar evento"
                        >
                          <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M2 2l8 8M10 2l-8 8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
                {cellTasks.length > 3 && (
                  <span className="text-[10px] text-secondary font-code-sm pl-1 font-medium">
                    +{cellTasks.length - 3} más
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
    )
  }

  // 2. Vista Semanal Adaptable (Por defecto limpia sin desbordar horas, con botón Expandir / Comprimir 24h)
  const renderWeekView = (tasksToDisplay, calObj) => {
    const tasksByDate = buildTasksByDateMap(tasksToDisplay)
    const weekDays = getWeekDays(currentDate)
    const weekActivitiesCount = weekDays.reduce((acc, d) => acc + (tasksByDate.get(d.ymd)?.length || 0), 0)
    return (
    <div className="flex flex-col w-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#161b26]">
      {/* Barra de opciones de la Vista Semanal: Botón Expandir / Comprimir Horario 24h */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-[#141824]/90">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
            {getPeriodTitle()}
          </span>
          <span className="text-[11px] text-secondary font-code-sm hidden sm:inline">
            · {weekActivitiesCount} actividades
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowHourlyGrid((prev) => !prev)}
          className="px-3 py-1.5 rounded-xl bg-surface-pure hover:bg-surface-subtle text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs border border-outline-variant/30 cursor-pointer active:scale-95"
          title={showHourlyGrid ? 'Ocultar horas y ver agenda semanal' : 'Ver cuadrícula horaria de 24 horas'}
        >
          <span className="material-symbols-outlined text-[15px] text-primary">
            {showHourlyGrid ? 'vertical_align_center' : 'schedule'}
          </span>
          <span>{showHourlyGrid ? 'Comprimir horario (Vista Agenda)' : 'Expandir horario 24h'}</span>
        </button>
      </div>

      {/* Contenido según showHourlyGrid */}
      {!showHourlyGrid ? (
        /* Vista Agenda Semanal Continua de 7 Columnas sin desbordamiento de horas vacías */
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-px bg-slate-200/80 dark:bg-slate-800/80 min-h-[360px]">
          {getWeekDays(currentDate).map((day) => {
            const isToday = day.ymd === TODAY_YMD
            const dayTasks = tasksByDate.get(day.ymd) || []

            return (
              <div
                key={day.ymd}
                onClick={() => {
                  setCurrentDate(day.dateObj)
                  setCalendarView('day')
                }}
                className={`p-2.5 flex flex-col justify-between transition-colors cursor-pointer group ${
                  isToday
                    ? 'bg-primary-fixed/15 dark:bg-primary-fixed/10'
                    : 'bg-white dark:bg-[#161b26] hover:bg-slate-50 dark:hover:bg-[#1a202c]'
                }`}
              >
                <div>
                  {/* Encabezado del Día */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col">
                      <span className={`text-[11px] uppercase tracking-wider font-bold ${isToday ? 'text-primary' : 'text-secondary'}`}>
                        {day.dayShort}
                      </span>
                      <span className={`text-base font-bold ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                        {day.dayNum}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEventModal({ date: day.ymd, calendarId: calObj?.id })
                      }}
                      className="p-1 rounded-lg hover:bg-primary/10 text-secondary hover:text-primary transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                      title="Añadir evento a este día"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>

                  {/* Lista de Eventos de la Jornada */}
                  <div className="flex flex-col gap-1.5">
                    {dayTasks.map((task) => {
                      const scheme = getCatScheme(task.context)
                      return (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDetailTask(task)
                          }}
                          className={`p-2 rounded-xl border border-black/5 dark:border-white/5 shadow-2xs flex flex-col gap-1 transition-all hover:shadow-xs cursor-pointer group ${scheme.bg} ${scheme.text} ${
                            task.completed || isEventFinished(task, nowTicker) ? 'opacity-40 line-through grayscale-[30%]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 min-w-0">
                            <span className="font-semibold text-xs truncate leading-snug">{task.title}</span>
                            <div className="flex items-center shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteTask(task.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:text-error w-3.5 h-3.5 rounded flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all shrink-0 cursor-pointer p-0"
                                title="Eliminar evento"
                              >
                                <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                  <path d="M2 2l8 8M10 2l-8 8" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] opacity-80 font-code-sm">
                            <span className="material-symbols-outlined text-[11px]">schedule</span>
                            <span>{task.isAllDay ? 'Todo el día' : task.time || '--:--'}</span>
                          </div>
                        </div>
                      )
                    })}

                    {dayTasks.length === 0 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEventModal({ date: day.ymd, calendarId: calObj?.id })
                        }}
                        className="py-6 rounded-xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-1 text-center text-secondary/60 hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px] opacity-40">add</span>
                        <span className="text-[10px] font-medium">Libre</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pie del día */}
                <div className="pt-2 text-[10px] text-secondary font-code-sm">
                  {dayTasks.length > 0 ? `${dayTasks.length} act.` : ''}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Vista de Horario Expandido 24 horas (Horas 00:00 - 23:00) */
        <div className="flex flex-col w-full overflow-x-auto scrollbar-thin">
          <div className="min-w-[700px] flex flex-col">
            {/* Encabezados de días */}
            <div
              style={{ paddingRight: `${scrollbarGutter}px` }}
              className="grid grid-cols-[56px_repeat(7,1fr)] sm:grid-cols-[64px_repeat(7,1fr)] bg-slate-100/90 dark:bg-[#141824] border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-20"
            >
              <div className="p-space-xs sm:p-space-sm flex items-end justify-center text-slate-500 dark:text-slate-400 font-code-sm border-r border-slate-200/80 dark:border-slate-800 font-semibold text-[11px]">
                <span>GMT+2</span>
              </div>
              {getWeekDays(currentDate).map((day, idx) => {
                const isToday = day.ymd === TODAY_YMD
                const isLast = idx === 6
                return (
                  <div
                    key={day.ymd}
                    onClick={() => {
                      setCurrentDate(day.dateObj)
                      setCalendarView('day')
                    }}
                    className={`p-space-xs sm:p-space-sm flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/40 ${
                      !isLast ? 'border-r border-slate-200/80 dark:border-slate-800' : ''
                    } transition-colors ${
                      isToday ? 'bg-primary/10 border-b-2 border-primary' : ''
                    }`}
                  >
                    <span className={`font-label-sm text-[11px] sm:text-xs uppercase tracking-wider ${isToday ? 'text-primary font-bold' : 'text-secondary'}`}>
                      {day.dayShort}
                    </span>
                    <span className={`font-headline-md text-headline-md ${isToday ? 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-xs text-xs sm:text-sm font-bold' : 'text-on-surface'}`}>
                      {day.dayNum}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Fila Fija para Eventos de Todo el Día */}
            <div
              style={{ paddingRight: `${scrollbarGutter}px` }}
              className="grid grid-cols-[56px_repeat(7,1fr)] sm:grid-cols-[64px_repeat(7,1fr)] border-b border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-[#121622] min-h-[36px] items-center"
            >
              <div className="px-1.5 py-1 text-center text-[10px] font-code-sm text-slate-500 dark:text-slate-400 uppercase font-semibold border-r border-slate-200/80 dark:border-slate-800">
                All Day
              </div>
              {weekDays.map((day, idx) => {
                const dayList = tasksByDate.get(day.ymd) || []
                const allDayTasks = dayList.filter((t) => !t.time || t.isAllDay)
                const isLast = idx === 6
                return (
                  <div
                    key={day.ymd}
                    onClick={() => handleOpenEventModal({ date: day.ymd, isAllDay: true, calendarId: calObj?.id })}
                    className={`p-1 flex flex-col gap-1 ${
                      !isLast ? 'border-r border-slate-200/80 dark:border-slate-800' : ''
                    } min-h-[36px] hover:bg-slate-200/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors`}
                    title="Clic para añadir evento de todo el día"
                  >
                    {allDayTasks.map((task) => {
                      const scheme = getCatScheme(task.context)
                      return (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDetailTask(task)
                          }}
                          className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold truncate cursor-pointer shadow-xs border ${scheme.bg} ${scheme.text} border-black/5 dark:border-white/5`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Timetable Scrollable 24 Horas */}
            <div
              ref={timetableRef}
              className="max-h-[600px] overflow-y-scroll scrollbar-thin grid grid-cols-[56px_repeat(7,1fr)] sm:grid-cols-[64px_repeat(7,1fr)] border-t border-slate-200/80 dark:border-slate-800 relative bg-surface-subtle/30"
            >
              <div className="flex flex-col text-slate-500 dark:text-slate-400 font-code-sm select-none border-r border-slate-200/80 dark:border-slate-800 bg-slate-100/80 dark:bg-[#10131d]">
                {HOURS_24.map((hour) => (
                  <div key={hour} className="h-[60px] flex items-start justify-center pt-1 text-[11px] font-medium">
                    {hour}
                  </div>
                ))}
              </div>

              {weekDays.map((day, idx) => {
                const isToday = day.ymd === TODAY_YMD
                const dayList = tasksByDate.get(day.ymd) || []
                const dayTasks = dayList.filter((task) => task.time && !task.isAllDay)
                const isLast = idx === 6

                return (
                  <div
                    key={day.ymd}
                    className={`relative h-[1440px] transition-colors ${
                      !isLast ? 'border-r border-slate-200/80 dark:border-slate-800' : ''
                    } ${isToday ? 'bg-primary/5' : 'bg-white dark:bg-[#161b26]'}`}
                  >
                    {HOURS_24.map((hour, hourIdx) => (
                      <div
                        key={hour}
                        onClick={() => handleOpenEventModal({ date: day.ymd, time: hour, calendarId: calObj?.id })}
                        className="absolute left-0 right-0 h-[60px] border-t border-slate-100 dark:border-slate-800/70 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group/slot"
                        style={{ top: hourIdx * 60 }}
                        title={`Añadir a las ${hour}`}
                      >
                        <span className="opacity-0 group-hover/slot:opacity-50 text-[9px] font-code-sm text-secondary pl-1 select-none">
                          + {hour}
                        </span>
                      </div>
                    ))}

                    {dayTasks.map((task) => {
                      const top = timeToTop(task.time)
                      const durMins = getEventDurationMinutes(task)
                      const cardHeight = Math.max(48, durMins - 2)
                      const scheme = getCatScheme(task.context)
                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedDetailTask(task)}
                          className={`absolute left-1 right-1 z-10 ${scheme.bg} hover:shadow-md transition-all rounded-xl p-1.5 flex flex-col justify-between overflow-hidden cursor-pointer group border border-black/5 dark:border-white/10 ${
                            task.completed || isEventFinished(task, nowTicker) ? 'opacity-40 line-through grayscale-[30%]' : ''
                          }`}
                          style={{ top, height: cardHeight }}
                        >
                          <div className="flex items-center justify-between gap-1 min-w-0">
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              <span className={`w-1.5 h-1.5 rounded-full ${scheme.dot} shrink-0`}></span>
                              <span className={`font-label-sm text-xs font-semibold truncate ${scheme.text}`}>{task.title}</span>
                            </div>
                            <div className="flex items-center shrink-0 z-20">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteTask(task.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:text-error w-3.5 h-3.5 rounded flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer p-0"
                                title="Eliminar evento"
                              >
                                <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                  <path d="M2 2l8 8M10 2l-8 8" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className={`flex items-center justify-between ${scheme.text} font-code-sm text-[10px] opacity-80 pt-0.5`}>
                            <span>
                              {task.time}{task.endTime ? ` - ${task.endTime}` : ''} ({formatEventDurationLabel(task)})
                            </span>
                            <span className="truncate max-w-[65px] font-medium text-right">{task.context}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
    )
  }

  // 3. Vista de Día
  const renderDayView = (tasksToDisplay, calObj) => {
    const tasksByDate = buildTasksByDateMap(tasksToDisplay)
    const dayTasks = tasksByDate.get(formatYMD(currentDate)) || []
    const timedTasks = dayTasks.filter((t) => t.time && !t.isAllDay)
    const allDayTasks = dayTasks.filter((t) => !t.time || t.isAllDay)
    const weekDays = getWeekDays(currentDate)

    return (
      <div className="flex flex-col w-full">
        {/* Cabecera de Día y Selector de Día de la Semana estilo Apple */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-space-md border-b border-surface-muted/30 bg-surface-pure gap-2 sm:gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <span className="font-headline-sm sm:font-headline-md text-sm sm:text-headline-md font-bold text-on-surface truncate">
              {getPeriodTitle()}
            </span>
            {formatYMD(currentDate) === TODAY_YMD && (
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm font-semibold text-xs shrink-0">
                Hoy
              </span>
            )}
          </div>
          {/* Tira Horizontal de Días de la Semana estilo Apple */}
          <div className="flex items-center gap-1.5 bg-surface-muted/70 p-1.5 rounded-2xl overflow-x-auto scrollbar-none w-full sm:w-auto">
            {weekDays.map((d) => {
              const isSel = d.ymd === formatYMD(currentDate)
              const count = (tasksByDate.get(d.ymd) || []).length
              return (
                <button
                  key={d.ymd}
                  type="button"
                  onClick={() => setCurrentDate(d.dateObj)}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 min-w-[40px] active:scale-95 ${
                    isSel
                      ? 'bg-primary text-white shadow-sm font-bold'
                      : 'text-secondary hover:text-on-surface hover:bg-surface-pure/50'
                  }`}
                >
                  <span className="uppercase text-[10px] tracking-wider opacity-80">{d.dayShort.slice(0, 3)}</span>
                  <span className="text-xs sm:text-sm font-bold">{d.dayNum}</span>
                  {count > 0 && !isSel && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary sm:hidden"></span>
                  )}
                  {count > 0 && isSel && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white sm:hidden"></span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Resumen / Agenda Serena del Día (Estilo Apple limpio y despejado) */}
        <div className="p-3 sm:p-4 bg-surface-subtle/50 border-b border-surface-muted/30 flex flex-col gap-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
              Agenda del día ({dayTasks.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHourlyGrid((prev) => !prev)}
                className="px-2.5 sm:px-3 py-1 rounded-xl bg-surface-pure hover:bg-surface-subtle text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs border border-outline-variant/30 cursor-pointer active:scale-95"
                title={showHourlyGrid ? 'Comprimir y ver solo agenda' : 'Ver horario continuo de 24 horas'}
              >
                <span className="material-symbols-outlined text-[15px] text-primary">
                  {showHourlyGrid ? 'vertical_align_center' : 'schedule'}
                </span>
                <span>{showHourlyGrid ? 'Comprimir horario' : 'Expandir horario 24h'}</span>
              </button>
            </div>
          </div>

          {/* En modo expandir horario 24h, las tarjetas desaparecen de arriba y se muestran únicamente en el horario continuo */}
          {!showHourlyGrid && (
            dayTasks.length === 0 ? (
              <div className="py-6 px-4 text-center bg-surface-pure/80 rounded-2xl border border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-1.5 shadow-2xs">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">wb_sunny</span>
                </div>
                <span className="text-xs font-semibold text-on-surface">Día despejado</span>
                <span className="text-[11px] text-secondary">No tienes eventos programados para hoy</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dayTasks.map((task) => {
                  const scheme = getCatScheme(task.context)
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedDetailTask(task)}
                      className={`p-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-2xs flex items-center justify-between gap-2 cursor-pointer hover:shadow-xs transition-all ${scheme.bg} ${scheme.text} ${
                        task.completed || isEventFinished(task, nowTicker) ? 'opacity-40 line-through grayscale-[30%]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ${scheme.dot} shrink-0`}></span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs sm:text-sm truncate text-on-surface">{task.title}</span>
                          <div className="flex items-center gap-1.5 text-[11px] opacity-80 font-code-sm">
                            <span>{task.time || 'Todo el día'}</span>
                            <span>·</span>
                            <span className="truncate">{task.context}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteTask(task.id)
                          }}
                          className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 text-secondary hover:text-error transition-colors cursor-pointer"
                          title="Eliminar evento"
                        >
                          <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M2 2l8 8M10 2l-8 8" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>

        {allDayTasks.length > 0 && (
          <div className="p-2.5 sm:p-3 border-b border-surface-muted/30 bg-surface-subtle/30 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Todo el día:</span>
            {allDayTasks.map((task) => {
              const scheme = getCatScheme(task.context)
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedDetailTask(task)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs ${scheme.bg} ${scheme.text}`}
                >
                  {task.icon && <span className="material-symbols-outlined text-[14px]">{task.icon}</span>}
                  <span>{task.title}</span>
                </div>
              )
            })}
          </div>
        )}

      <div ref={timetableRef} className={`max-h-[600px] overflow-y-auto scrollbar-thin grid-cols-[56px_1fr] sm:grid-cols-[64px_1fr] border-t border-slate-200/80 dark:border-slate-800 relative ${showHourlyGrid ? 'grid' : 'hidden'}`}>
        <div className="w-[56px] sm:w-[64px] flex flex-col text-secondary font-code-sm text-code-sm select-none border-r border-slate-200/80 dark:border-slate-800">
          {HOURS_24.map((hour) => (
            <div key={hour} className="h-[60px] flex items-start justify-center pt-1 text-[11px]">
              {hour}
            </div>
          ))}
        </div>

        <div className="relative h-[1440px] bg-white dark:bg-[#161b26]">
          {HOURS_24.map((hour, idx) => (
            <div
              key={hour}
              onClick={() => handleOpenEventModal({ date: formatYMD(currentDate), time: hour, calendarId: calObj?.id })}
              className="absolute left-0 right-0 h-[60px] border-t border-slate-100 dark:border-slate-800/70 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group/slot"
              style={{ top: idx * 60 }}
              title={`Añadir a las ${hour}`}
            >
              <span className="opacity-0 group-hover/slot:opacity-60 text-[10px] font-code-sm text-secondary pl-2 pt-0.5 select-none">
                + Añadir a las {hour}
              </span>
            </div>
          ))}

          {timedTasks.map((task) => {
              const top = timeToTop(task.time)
              const durMins = getEventDurationMinutes(task)
              const cardHeight = Math.max(48, durMins - 2)
              const scheme = getCatScheme(task.context)
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedDetailTask(task)}
                  className={`absolute left-2 right-2 sm:left-4 sm:right-4 z-10 ${scheme.bg} hover:shadow-md transition-all rounded-2xl p-2.5 sm:p-3 flex items-center justify-between group cursor-pointer border border-black/5 dark:border-white/10 ${
                    task.completed || isEventFinished(task, nowTicker) ? 'opacity-40 line-through grayscale-[30%]' : ''
                  }`}
                  style={{ top, height: cardHeight }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${scheme.dot} shrink-0`} />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-headline-sm text-body-md font-semibold ${scheme.text} truncate`}>{task.title}</span>
                        <span className="px-2 py-0.2 rounded-full bg-white/70 dark:bg-white/10 text-[11px] font-medium text-secondary">
                          {task.context}
                        </span>
                        {task.effort && (
                          <span className="px-2 py-0.2 rounded-full bg-white/70 dark:bg-white/10 text-[11px] font-medium text-secondary">
                            {task.effort}
                          </span>
                        )}
                        <span className="px-2 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-semibold font-code-sm">
                          {formatEventDurationLabel(task)}
                        </span>
                      </div>
                      <div className={`font-code-sm text-xs ${scheme.text} flex items-center gap-1 mt-0.5 font-medium`}>
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        <span>
                          {task.time}{task.endTime ? ` - ${task.endTime}` : ''}
                        </span>
                        {task.description && (
                          <span className="opacity-70 ml-2 truncate max-w-[280px]">· {task.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0 z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTask(task.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-error w-5 h-5 rounded-md flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer shrink-0 p-0"
                      title="Eliminar evento"
                    >
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M2 2l8 8M10 2l-8 8" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

  const renderCalendarContent = (tasksToDisplay, calObj) => {
    if (calendarView === 'month') return renderMonthView(tasksToDisplay, calObj)
    if (calendarView === 'day') return renderDayView(tasksToDisplay, calObj)
    return renderWeekView(tasksToDisplay, calObj)
  }

  // ===================== WIDGETS DE BARRA LATERAL =====================

  // Widget 1: Mis Calendarios (Limpio, sin spamear engranajes)
  const renderCalendarsWidget = () => (
    <div className="flex flex-col gap-3">
      {/* Switcher Modo Único vs Cascada */}
      <div className="grid grid-cols-2 gap-1 bg-surface-muted p-1 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => setCalendarMode('single')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            calendarMode === 'single'
              ? 'bg-surface-pure text-on-surface shadow-xs font-bold'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">view_agenda</span>
          <span>Único</span>
        </button>
        <button
          type="button"
          onClick={() => setCalendarMode('cascade')}
          className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
            calendarMode === 'cascade'
              ? 'bg-surface-pure text-on-surface shadow-xs font-bold'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">vertical_split</span>
          <span>Cascada</span>
        </button>
      </div>

      {/* Lista de Calendarios con click para activar y botón sutil de editar */}
      <div className="flex flex-col gap-1.5">
        {calendars.map((cal) => {
          const calTasks = getTasksForCalendar(cal)
          const isSelected = activeCalendarId === cal.id
          return (
            <div
              key={cal.id}
              onClick={() => {
                setActiveCalendarId(cal.id)
                if (calendarMode === 'cascade') setCalendarMode('single')
              }}
              className={`p-2 rounded-xl flex items-center justify-between transition-all cursor-pointer border group/cal ${
                isSelected
                  ? 'bg-surface-pure border-primary/50 shadow-xs ring-1 ring-primary/30'
                  : 'bg-surface-subtle/70 border-outline-variant/20 hover:bg-surface-muted'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cal.color }}></span>
                <span className="font-label-md text-label-md text-on-surface font-semibold truncate">{cal.name}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-code-sm bg-surface-pure text-secondary border border-outline-variant/30">
                  {calTasks.length}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {cal.syncUrl && (
                  <span className="material-symbols-outlined text-[14px] text-primary" title="Sincronizado externamente (TeamUp/Google)">
                    sync
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleOpenEditCalendar(cal, e)}
                  className="opacity-60 group-hover/cal:opacity-100 hover:opacity-100 p-1 rounded-md text-secondary hover:text-on-surface hover:bg-surface-muted transition-opacity cursor-pointer shrink-0"
                  title="Configurar o eliminar este calendario"
                >
                  <span className="material-symbols-outlined text-[15px]">settings</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleOpenAddCalendar}
        className="w-full py-1.5 px-3 rounded-xl bg-surface-muted hover:bg-surface-variant text-primary text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[15px]">add</span>
        <span>+ Añadir calendario</span>
      </button>
    </div>
  )

  // Widget 2: Mini Calendario
  const renderMiniCalWidget = () => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-space-sm">
        <span className="font-headline-sm text-headline-sm text-on-surface">
          {MONTH_NAMES[miniDate.getMonth()]} {miniDate.getFullYear()}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMiniDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="w-6 h-6 flex items-center justify-center text-secondary hover:text-on-surface rounded transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMiniDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="w-6 h-6 flex items-center justify-center text-secondary hover:text-on-surface rounded transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center font-code-sm text-[11px] gap-y-1 text-secondary mb-1">
        <span className="py-1">M</span>
        <span className="py-1">T</span>
        <span className="py-1">W</span>
        <span className="py-1">T</span>
        <span className="py-1">F</span>
        <span className="py-1">S</span>
        <span className="py-1">S</span>

        {getMonthDays(miniDate).map((cell) => {
          const isSelected = cell.ymd === formatYMD(currentDate)
          const isToday = cell.ymd === TODAY_YMD
          const hasEvents = currentCalendarTasks.some((t) => t.date === cell.ymd)

          return (
            <button
              key={cell.ymd}
              type="button"
              onClick={() => {
                setCurrentDate(cell.dateObj)
              }}
              className={`py-1 rounded-lg flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                  : isToday
                  ? 'bg-primary-fixed text-primary font-bold'
                  : cell.isCurrentMonth
                  ? 'text-on-surface hover:bg-surface-muted'
                  : 'text-outline-variant hover:bg-surface-muted/50'
              }`}
            >
              <span>{cell.dayNum}</span>
              {hasEvents && (
                <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'} -mt-0.5`}></span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  // Widget 3: Próximas Entregas (Solo eventos futuros o de hoy que no hayan finalizado)
  const renderDeadlinesWidget = () => {
    const upcomingDeadlines = currentCalendarTasks
      .filter((t) => {
        if (t.completed || t.done) return false
        if (!t.date) return false
        const taskYmd = String(t.date).slice(0, 10)
        // Ignorar eventos de fechas pasadas
        if (taskYmd < TODAY_YMD) return false
        // Si es de hoy, comprobar que no haya finalizado ya
        if (taskYmd === TODAY_YMD && isEventFinished(t, nowTicker)) return false
        return true
      })
      .sort((a, b) => {
        const da = String(a.date).slice(0, 10)
        const db = String(b.date).slice(0, 10)
        if (da !== db) return da.localeCompare(db)
        return (a.time || '').localeCompare(b.time || '')
      })

    return (
      <div className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
            {upcomingDeadlines.length} próximas
          </span>
        </div>
        <div className="flex flex-col gap-space-sm">
          {upcomingDeadlines.slice(0, 4).map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedDetailTask(item)}
              className="p-space-sm rounded-xl bg-surface-subtle hover:bg-surface-muted transition-colors flex flex-col gap-1 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-headline-sm text-body-sm text-on-surface font-semibold leading-tight truncate">
                  {item.title}
                </span>
                <span className="px-1.5 py-0.5 rounded-md font-code-sm text-[10px] uppercase font-bold shrink-0 bg-tag-urgent-bg text-tag-urgent-text">
                  {item.effort || 'Task'}
                </span>
              </div>
              <div className="flex items-center justify-between text-secondary font-label-sm text-label-sm">
                <span className="flex items-center gap-1 text-on-surface-variant font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  {item.date === TODAY_YMD ? 'Hoy' : item.date} · {item.time || 'Todo el día'}
                </span>
                <span className="font-code-sm text-code-sm">{item.context}</span>
              </div>
            </div>
          ))}
          {upcomingDeadlines.length === 0 && (
            <p className="text-secondary font-body-sm text-body-sm text-center py-2">
              ¡Sin entregas pendientes próximas! Todo al día.
            </p>
          )}
        </div>
      </div>
    )
  }

  // Widget 0: Reloj en Vivo (Analógico / Digital) & Cuenta Atrás de Eventos de Hoy
  const renderClockWidget = () => (
    <ClockWidget
      clockMode={clockMode}
      setClockMode={setClockMode}
      activeCalendar={activeCalendar}
      todayTasks={currentCalendarTasks.filter((t) => t.date === TODAY_YMD)}
      setSelectedDetailTask={setSelectedDetailTask}
      getCatScheme={getCatScheme}
    />
  )

  // Widget 4: Distribución de Horas y Gráfica Proporcional Dinámica (Semanal)
  const renderAllocationWidget = () => {
    const getTaskHours = (task) => {
      if (task.durationHours && !isNaN(task.durationHours)) return Number(task.durationHours)
      if (task.durationMinutes && !isNaN(task.durationMinutes)) return Number(task.durationMinutes) / 60
      if (task.startTime && task.endTime) {
        const [sh, sm] = task.startTime.split(':').map(Number)
        const [eh, em] = task.endTime.split(':').map(Number)
        if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
          const diff = (eh * 60 + em) - (sh * 60 + sm)
          if (diff > 0) return diff / 60
        }
      }
      if (task.effort === 'High') return 2.5
      if (task.effort === 'Low') return 0.5
      return 1.5
    }

    // Filtrar estrictamente las actividades de la semana activa (Lunes a Domingo)
    const baseDate = currentDate || new Date()
    const d = new Date(baseDate)
    const dayOfWeek = d.getDay()
    const diffToMonday = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diffToMonday))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const mondayYmd = formatYMD(monday)
    const sundayYmd = formatYMD(sunday)

    const weeklyTasks = currentCalendarTasks.filter((t) => {
      const taskYmd = (t.date || '').slice(0, 10)
      return taskYmd >= mondayYmd && taskYmd <= sundayYmd
    })

    const catStats = categories.map((cat) => {
      const catTasks = weeklyTasks.filter((t) => t.context === cat.name)
      const hours = catTasks.reduce((acc, t) => acc + getTaskHours(t), 0)
      return {
        ...cat,
        count: catTasks.length,
        hours: Math.round(hours * 10) / 10,
      }
    })

    const totalHours = Math.round(catStats.reduce((acc, c) => acc + c.hours, 0) * 10) / 10
    const totalCount = weeklyTasks.length
    const maxCatHours = Math.max(...catStats.map((c) => c.hours), 0.1)

    return (
      <div className="flex flex-col gap-3">
        {/* Resumen Total */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-headline-lg text-headline-lg text-on-surface font-bold">
              {totalHours}h
            </span>
            <span className="font-code-sm text-xs text-tertiary flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              {totalCount} actividades esta semana
            </span>
          </div>
          <span className="px-2 py-1 rounded-xl bg-primary/10 text-primary text-[11px] font-code-sm font-semibold">
            Semana activa ({monday.getDate()}/{monday.getMonth() + 1} - {sunday.getDate()}/{sunday.getMonth() + 1})
          </span>
        </div>

        {/* Barra Proporcional Segmentada (Estilo Apple Screen Time / GitHub) */}
        {totalCount > 0 && totalHours > 0 ? (
          <div className="w-full flex flex-col gap-2.5">
            {/* Barra Proporcional Segmentada (Ancho dinámico exacto al % de horas) */}
            <div className="w-full h-3 rounded-full bg-surface-muted overflow-hidden flex shadow-inner">
              {catStats.map((cat) => {
                if (cat.hours <= 0) return null
                const pct = (cat.hours / totalHours) * 100
                return (
                  <div
                    key={cat.id}
                    className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full hover:brightness-110"
                    style={{ width: `${pct}%`, backgroundColor: cat.hex }}
                    title={`${cat.name}: ${cat.hours}h (${pct.toFixed(0)}%)`}
                  />
                )
              })}
            </div>

            {/* Gráfica de Barras Verticales Escala Dinámica (Altura proporcional a las horas) */}
            <div className="pt-2 pb-1.5 flex items-end justify-between gap-1.5 h-24 px-2.5 bg-surface-subtle/70 rounded-xl border border-outline-variant/20">
              {catStats.map((cat) => {
                const heightPct = cat.hours > 0 ? Math.max(16, Math.round((cat.hours / maxCatHours) * 100)) : 8
                return (
                  <div key={cat.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <span className="text-[10px] font-code-sm font-semibold text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                      {cat.hours}h
                    </span>
                    <div
                      className="w-full max-w-[22px] rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-2xs"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: cat.hex,
                        opacity: cat.hours > 0 ? 1 : 0.25,
                      }}
                      title={`${cat.name}: ${cat.hours}h (${cat.count} tareas)`}
                    />
                    <span className="text-[9px] font-medium text-secondary truncate max-w-[42px] text-center">
                      {cat.name.slice(0, 4)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Leyenda Detallada con Horas y Tarjetas Proporcionales */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-secondary font-code-sm text-[11px]">
              {catStats.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center gap-1.5 truncate p-1.5 rounded-xl transition-all ${
                    cat.hours > 0 ? 'bg-surface-pure shadow-2xs border border-outline-variant/20' : 'opacity-60'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cat.dot}`}></span>
                  <span className="truncate flex-1 font-medium text-on-surface">{cat.name}</span>
                  <span className="font-bold text-on-surface shrink-0">{cat.hours}h</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-secondary text-center py-3 italic">
            Sin actividades asignadas en este calendario.
          </p>
        )}
      </div>
    )
  }

  // Helper para títulos de widgets
  const getWidgetMeta = (wId) => ALL_WIDGETS.find((w) => w.id === wId) || { name: wId, icon: 'widgets' }

  // ===================== RENDER PRINCIPAL =====================

  return (
    <div className="flex flex-col w-full max-w-[2400px] 2xl:max-w-[2800px] mx-auto relative isolate overflow-x-clip">
      {/* Toast de confirmación de eventos y acciones (Oculto en móvil para no tapar la pantalla con avisos molestos) */}
      {feedbackToast && !isMobileScreen && (
        <div
          onClick={() => setFeedbackToast(null)}
          className="fixed top-28 sm:top-24 md:top-20 left-1/2 -translate-x-1/2 z-[9999] max-w-[90vw] cursor-pointer bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200 border border-white/10 dark:border-black/10 transition-transform active:scale-95"
          title="Toca para descartar"
        >
          <span className={`material-symbols-outlined text-[20px] ${feedbackToast.toLowerCase().includes('error') ? 'text-rose-400 dark:text-rose-600' : 'text-emerald-400 dark:text-emerald-600'}`}>
            {feedbackToast.toLowerCase().includes('error') ? 'error' : 'check_circle'}
          </span>
          <span className="truncate">{feedbackToast}</span>
          <span className="material-symbols-outlined text-[16px] opacity-60 ml-1">close</span>
        </div>
      )}

      {/* Fondo de Diseño Dinámico Multitono (Atmosphere Aurora Mesh optimizado por GPU a 120 FPS - desactivado en móvil para máximo rendimiento) */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden contain-strict">
        {/* Patrón de textura arquitectónica sutil */}
        <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07] bg-[radial-gradient(#000_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#fff_1.2px,transparent_1.2px)] [background-size:20px_20px]" />
        
        {/* Aurora principal: color del calendario activo */}
        <div
          className="hidden sm:block absolute -top-24 -left-20 w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] rounded-full blur-[64px] sm:blur-[96px] opacity-30 dark:opacity-20 transition-[background-color] duration-700 ease-out transform-gpu will-change-transform"
          style={{ backgroundColor: bgCal1 }}
        />
        
        {/* Aurora secundaria en cuadrante superior derecho: segundo calendario */}
        <div
          className="hidden sm:block absolute top-1/6 -right-16 w-[400px] sm:w-[580px] h-[400px] sm:h-[580px] rounded-full blur-[70px] sm:blur-[100px] opacity-20 dark:opacity-15 transition-[background-color] duration-700 ease-out transform-gpu will-change-transform"
          style={{ backgroundColor: bgCal2 }}
        />
        
        {/* Resplandor terciario inferior: tercer calendario */}
        <div
          className="hidden sm:block absolute -bottom-10 left-1/4 w-[380px] sm:w-[500px] h-[380px] sm:h-[500px] rounded-full blur-[70px] sm:blur-[100px] opacity-20 dark:opacity-15 transition-[background-color] duration-700 ease-out transform-gpu will-change-transform"
          style={{ backgroundColor: bgCal3 }}
        />

        {/* Resplandor cuaternario: cuarto calendario si existe */}
        {otherCalendars.length > 2 && (
          <div
            className="hidden sm:block absolute bottom-1/4 -right-20 w-[350px] sm:w-[480px] h-[350px] sm:h-[480px] rounded-full blur-[70px] sm:blur-[100px] opacity-15 dark:opacity-10 transition-[background-color] duration-700 ease-out transform-gpu will-change-transform"
            style={{ backgroundColor: bgCal4 }}
          />
        )}
      </div>

      {/* Top Command & Filter Deck (Elegante y Limpio: Solo 2 filas) */}
      <div className={`w-full flex flex-col gap-space-md mb-space-xl pt-3.5 sm:pt-0.5 relative ${isCalDropdownOpen ? 'z-50' : 'z-20'}`}>
        {/* Fila 1: Navegador de Fecha, Selector de Calendario y Vistas */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-white dark:bg-[#161b26] p-3 sm:p-space-md rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 relative ${isCalDropdownOpen ? 'z-50' : 'z-10'}`}>
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => {
                  setDatePickerYear(currentDate.getFullYear())
                  setIsDatePickerOpen(true)
                }}
                className="group flex items-center justify-between gap-1.5 font-headline-sm sm:font-headline-lg text-sm sm:text-xl md:text-2xl font-bold text-on-surface tracking-tight cursor-pointer hover:text-primary transition-colors text-left w-[130px] xs:w-[155px] sm:w-[210px] md:w-[245px] shrink-0 pr-1"
                title="Pulsar para saltar a cualquier mes o año (ej: 2027)"
              >
                <span className="truncate">{getPeriodTitle()}</span>
                <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-secondary group-hover:text-primary transition-transform group-hover:scale-110 shrink-0">
                  calendar_month
                </span>
              </button>

              <div className="flex items-center bg-surface-muted rounded-xl p-0.5 shrink-0">
                <button
                  type="button"
                  aria-label="Previous period"
                  onClick={handlePrevPeriod}
                  className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer"
                  title="Periodo anterior"
                >
                  <span className="material-symbols-outlined text-[17px]">chevron_left</span>
                </button>
                <button
                  type="button"
                  aria-label="Next period"
                  onClick={handleNextPeriod}
                  className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-on-surface rounded-lg transition-colors cursor-pointer"
                  title="Periodo siguiente"
                >
                  <span className="material-symbols-outlined text-[17px]">chevron_right</span>
                </button>
              </div>

              {/* Botón Hoy visible y fluido en móvil y ordenador */}
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  setSlideDirection('none')
                  setCurrentDate(now)
                  setMiniDate(now)
                }}
                className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1 bg-surface-muted hover:bg-primary/15 hover:text-primary text-on-surface font-label-md text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs border border-outline-variant/30"
                title="Ir al día de hoy"
              >
                Hoy
              </button>
            </div>

            {/* Botón circular Apple Añadir Evento en móvil */}
            <button
              type="button"
              onClick={() => handleOpenEventModal({ date: formatYMD(currentDate), calendarId: activeCalendarId })}
              className="sm:hidden w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-sm cursor-pointer active:scale-90 transition-transform shrink-0"
              title="Añadir evento"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Selector de Calendario Dropdown */}
            <div className="relative">
              <button
                ref={calDropdownBtnRef}
                type="button"
                onClick={handleToggleCalDropdown}
                className="h-8 px-2.5 sm:px-3 rounded-xl bg-surface-muted hover:bg-surface-variant text-on-surface font-label-md text-xs sm:text-label-md flex items-center gap-1.5 transition-all cursor-pointer border border-outline-variant/30 active:scale-95 shadow-2xs"
                title="Cambiar o configurar calendario activo"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeCalendar.color }}></span>
                <span className="font-semibold truncate max-w-[110px] sm:max-w-[180px]">{activeCalendar.name}</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  {isCalDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {isCalDropdownOpen && typeof document !== 'undefined' && createPortal(
                <>
                  {/* Backdrop invisible para capturar clics exteriores y cerrar instantáneamente */}
                  <div
                    className="fixed inset-0 z-[99998]"
                    onClick={() => setIsCalDropdownOpen(false)}
                  />
                  <div
                    ref={calDropdownRef}
                    data-floating-menu
                    style={{
                      position: 'fixed',
                      top: `${dropdownPos.top}px`,
                      right: typeof window !== 'undefined' && window.innerWidth >= 640 ? `${Math.max(16, dropdownPos.right)}px` : 'auto',
                      left: typeof window !== 'undefined' && window.innerWidth < 640 ? `${Math.max(16, Math.min(dropdownPos.left, window.innerWidth - 304))}px` : 'auto',
                      zIndex: 99999,
                    }}
                    className="w-72 max-w-[calc(100vw-32px)] bg-white dark:bg-[#161b26] rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-700 p-2.5 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold text-secondary uppercase tracking-wider flex items-center justify-between">
                      <span>Calendarios</span>
                      <span className="text-[9px] font-normal opacity-70">Arrastra para ordenar</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      {calendars.map((cal, idx) => {
                        const isSelected = activeCalendarId === cal.id
                        const isDragging = draggedCalIdx === idx
                        const isOver = dragOverCalIdx === idx && draggedCalIdx !== idx
                        return (
                          <div
                            key={cal.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', String(idx))
                              setDraggedCalIdx(idx)
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                              if (dragOverCalIdx !== idx) setDragOverCalIdx(idx)
                            }}
                            onDragLeave={() => {
                              if (dragOverCalIdx === idx) setDragOverCalIdx(null)
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              const from = draggedCalIdx ?? parseInt(e.dataTransfer.getData('text/plain'), 10)
                              handleReorderCalendars(from, idx)
                              setDraggedCalIdx(null)
                              setDragOverCalIdx(null)
                            }}
                            onDragEnd={() => {
                              setDraggedCalIdx(null)
                              setDragOverCalIdx(null)
                            }}
                            className={`p-1.5 rounded-xl flex items-center justify-between text-left transition-all group/item ${
                              isDragging ? 'opacity-40 scale-95 border border-dashed border-primary' : ''
                            } ${
                              isOver ? 'border-t-2 border-primary bg-primary/10' : ''
                            } ${
                              isSelected ? 'bg-primary-fixed/20 text-primary font-bold' : 'hover:bg-surface-muted text-on-surface'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span
                                onTouchStart={(e) => handleTouchStartCal(idx, e)}
                                onTouchMove={handleTouchMoveCal}
                                onTouchEnd={handleTouchEndCal}
                                className="material-symbols-outlined text-[16px] text-secondary cursor-grab active:cursor-grabbing hover:text-on-surface shrink-0 select-none p-0.5 touch-none"
                                title="Arrastrar para ordenar calendario"
                              >
                                drag_indicator
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveCalendarId(cal.id)
                                  setIsCalDropdownOpen(false)
                                }}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer py-0.5"
                              >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cal.color }}></span>
                                <span className="text-body-sm truncate">{cal.name}</span>
                                {cal.syncUrl && (
                                  <span className="material-symbols-outlined text-[13px] text-secondary shrink-0" title="Enlazado a TeamUp/Google">
                                    sync
                                  </span>
                                )}
                                {cal.isShared && (
                                  <span className="material-symbols-outlined text-[13px] text-rose-500 shrink-0" title={`Compartido en tiempo real (${cal.shareCode || ''})`}>
                                    hub
                                  </span>
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              {isSelected && (
                                <span className="material-symbols-outlined text-[15px] text-primary">check</span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setIsCalDropdownOpen(false)
                                  handleOpenEditCalendar(cal, e)
                                }}
                                className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                title={`Configurar o eliminar calendario "${cal.name}"`}
                              >
                                <span className="material-symbols-outlined text-[15px]">settings</span>
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-2 pt-2 border-t border-surface-muted flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCalendarMode(calendarMode === 'single' ? 'cascade' : 'single')
                          setIsCalDropdownOpen(false)
                        }}
                        className="p-1.5 rounded-lg hover:bg-surface-muted text-label-sm font-medium flex items-center justify-between text-secondary hover:text-on-surface cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">
                            {calendarMode === 'single' ? 'vertical_split' : 'view_agenda'}
                          </span>
                          <span>{calendarMode === 'single' ? 'Modo Cascada' : 'Modo Único'}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-secondary font-code-sm">
                          {calendarMode === 'single' ? 'Activar' : 'Activo'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleOpenAddCalendar()
                          setCalendarModalTab('edit')
                          setIsCalDropdownOpen(false)
                        }}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary text-label-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>+ Nuevo calendario</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleOpenAddCalendar()
                          setCalendarModalTab('import')
                          setIsCalDropdownOpen(false)
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-label-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">hub</span>
                        <span>Conectar con código compartido</span>
                      </button>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>

            {/* Segmented View Toggle (Día | Sem | Mes) con Pastilla Deslizante Apple Fluida */}
            <div
              data-calendar-view-toggle
              data-segmented-toggle
              className="relative inline-flex items-center bg-slate-200/90 dark:bg-slate-800/90 p-1 rounded-2xl shrink-0 border border-slate-300/80 dark:border-slate-700 shadow-inner"
            >
              <div
                data-slider-pill
                className="absolute top-1 bottom-1 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-slate-300/90 dark:border-slate-600 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                style={{
                  width: 'calc((100% - 8px) / 3)',
                  left: '4px',
                  transform: `translateX(${
                    calendarView === 'day' ? '0%' : calendarView === 'week' ? '100%' : '200%'
                  })`,
                }}
              />
              <button
                type="button"
                data-active={calendarView === 'day' ? 'true' : 'false'}
                onClick={() => setCalendarView('day')}
                className={`relative z-10 w-12 sm:w-14 py-1 text-center rounded-xl font-medium text-xs sm:text-label-sm transition-colors duration-200 cursor-pointer ${
                  calendarView === 'day'
                    ? 'text-primary font-bold'
                    : 'text-slate-700 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Día
              </button>
              <button
                type="button"
                data-active={calendarView === 'week' ? 'true' : 'false'}
                onClick={() => setCalendarView('week')}
                className={`relative z-10 w-12 sm:w-14 py-1 text-center rounded-xl font-medium text-xs sm:text-label-sm transition-colors duration-200 cursor-pointer ${
                  calendarView === 'week'
                    ? 'text-primary font-bold'
                    : 'text-slate-700 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sem
              </button>
              <button
                type="button"
                data-active={calendarView === 'month' ? 'true' : 'false'}
                onClick={() => setCalendarView('month')}
                className={`relative z-10 w-12 sm:w-14 py-1 text-center rounded-xl font-medium text-xs sm:text-label-sm transition-colors duration-200 cursor-pointer ${
                  calendarView === 'month'
                    ? 'text-primary font-bold'
                    : 'text-slate-700 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Mes
              </button>
            </div>
          </div>
        </div>

        {/* Fila 2: Etiquetas de Actividades y Filtro (Diseño sofisticado con fondo gris sutil y toggle-off) */}
        <div className="flex items-center justify-between gap-2 bg-slate-100/70 dark:bg-[#121620] p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 whitespace-nowrap min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setSelectedFilter('All')}
              className={`px-3 py-1 rounded-xl font-label-sm text-label-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                selectedFilter === 'All'
                  ? 'bg-white dark:bg-slate-800 shadow-xs text-on-surface font-bold ring-1 ring-slate-300 dark:ring-slate-600'
                  : 'bg-transparent hover:bg-white/60 dark:hover:bg-slate-800/60 text-secondary hover:text-on-surface'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-on-surface"></span>
              <span>{themeTokens?.labels?.allContexts || 'All Activities'}</span>
              <span className="text-secondary font-code-sm text-[10px] ml-1">{getUniqueTaskCount(globalTasks)}</span>
            </button>

            {categories.map((cat) => {
              const count = categoryCounts[cat.id] || 0
              const isSelected = selectedFilter === cat.name
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedFilter(selectedFilter === cat.name ? 'All' : cat.name)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setRoleContextMenu({ x: e.clientX, y: e.clientY, role: cat })
                  }}
                  className={`px-3 py-1 rounded-xl font-label-sm text-label-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? `${cat.bg} ${cat.text} font-bold ring-2 ring-primary shadow-xs`
                      : 'bg-white/70 dark:bg-slate-800/60 hover:bg-white text-secondary hover:text-on-surface'
                  }`}
                  title={
                    isSelected
                      ? 'Clic para quitar filtro (Clic derecho para editar o eliminar rol)'
                      : `Filtrar por ${cat.name} (Clic derecho para editar o eliminar rol)`
                  }
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`}></span>
                  <span>{cat.name}</span>
                  <span className="opacity-75 font-code-sm text-[10px] ml-0.5">{count}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="p-1 sm:px-2.5 sm:py-1 rounded-xl bg-white/60 hover:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800 text-secondary hover:text-on-surface text-label-sm font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Personalizar actividades y categorías"
            >
              <span className="material-symbols-outlined text-[15px]">tune</span>
              <span className="hidden sm:inline">Editar</span>
            </button>
            {selectedFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedFilter('All')}
                className="text-[11px] text-primary hover:underline font-semibold cursor-pointer px-1.5 py-0.5 whitespace-nowrap"
              >
                Mostrar todo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid & Sidebar Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg xl:gap-space-xl items-start">
        {/* Main View Area (Modo Único vs Modo Cascada Organizado con soporte táctil Swipe) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'pan-y' }}
          className="xl:col-span-9 flex flex-col gap-6"
        >
          {calendarMode === 'single' ? (
            <div
              className="bg-white dark:bg-[#161b26] rounded-3xl shadow-sm border overflow-hidden flex flex-col transition-all duration-300"
              style={{
                borderColor: `${activeCalendar.color}40`,
                boxShadow: `0 6px 28px -4px ${activeCalendar.color}18`
              }}
            >
              {/* Barra Superior Distintiva con Nombre y Color del Calendario Activo */}
              <div
                className="hidden sm:flex px-5 py-3.5 border-b items-center justify-between flex-wrap gap-2 transition-colors"
                style={{
                  backgroundColor: `${activeCalendar.color}0D`,
                  borderBottomColor: `${activeCalendar.color}25`,
                  borderTop: `4px solid ${activeCalendar.color}`
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-xs ring-2 ring-white/80 dark:ring-white/20 animate-pulse"
                    style={{ backgroundColor: activeCalendar.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
                        {activeCalendar.name}
                      </h2>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-code-sm font-semibold border"
                        style={{
                          color: activeCalendar.color,
                          backgroundColor: `${activeCalendar.color}18`,
                          borderColor: `${activeCalendar.color}30`
                        }}
                      >
                        {currentCalendarTasks.length} eventos
                      </span>
                      {activeCalendar.sharedFrom && activeCalendar.sharedFrom.length > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-code-sm text-secondary">
                          <span className="material-symbols-outlined text-[13px]">share</span>
                          Incluye {activeCalendar.sharedFrom.length} calendarios
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {activeCalendar.syncUrl && (
                    <button
                      type="button"
                      disabled={isSyncingCalendar}
                      onClick={() => handleSyncCalendar(activeCalendar.id, activeCalendar.syncUrl)}
                      className="px-2 sm:px-2.5 py-1.5 rounded-xl border border-outline-variant/30 text-secondary hover:text-on-surface hover:bg-surface-muted transition-all flex items-center gap-1 text-label-sm font-medium cursor-pointer shadow-2xs"
                      title="Sincronizar eventos externos ahora"
                    >
                      <span className={`material-symbols-outlined text-[15px] ${isSyncingCalendar ? 'animate-spin' : ''}`}>
                        sync
                      </span>
                      <span className="hidden sm:inline">{isSyncingCalendar ? 'Sincronizando...' : 'Sincronizar'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditCalendar(activeCalendar, e)}
                    className="px-2 sm:px-2.5 py-1.5 rounded-xl border border-outline-variant/30 text-secondary hover:text-on-surface hover:bg-surface-muted transition-all flex items-center gap-1 text-label-sm font-medium cursor-pointer shadow-2xs"
                    title="Configurar o eliminar este calendario"
                  >
                    <span className="material-symbols-outlined text-[15px]">settings</span>
                    <span className="hidden sm:inline">Configurar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEventModal({ calendarId: activeCalendar.id })}
                    className="px-2.5 sm:px-3 py-1.5 text-white text-label-sm font-semibold rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer hover:brightness-105"
                    style={{ backgroundColor: activeCalendar.color }}
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span className="hidden sm:inline">Añadir evento</span>
                    <span className="sm:hidden">Añadir</span>
                  </button>
                </div>
              </div>

              <div
                key={`${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}-${calendarView}`}
                className={`transition-all duration-200 ease-out transform-gpu ${
                  slideDirection === 'right'
                    ? 'animate-in fade-in slide-in-from-right-3 duration-200'
                    : slideDirection === 'left'
                    ? 'animate-in fade-in slide-in-from-left-3 duration-200'
                    : 'animate-in fade-in duration-150'
                }`}
              >
                {renderCalendarContent(currentCalendarTasks, activeCalendar)}
              </div>
            </div>
          ) : (
            /* MODO CASCADA ORGANIZABLE, COMPACTO Y SIN SCROLL INFINITO */
            <div className="flex flex-col gap-5">
              {calendars.map((cal, calIdx) => {
                const calTasks = getTasksForCalendar(cal)
                const isCollapsed = collapsedCalIds.includes(cal.id)
                return (
                  <div
                    key={cal.id}
                    className="bg-surface-pure rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-all duration-200"
                    style={{
                      borderColor: `${cal.color}35`,
                      borderTop: `4px solid ${cal.color}`,
                      boxShadow: `0 4px 20px -4px ${cal.color}12`
                    }}
                  >
                    {/* Header del Calendario con Identificación Limpia de Color y Colapsar */}
                    <div
                      className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2 transition-colors"
                      style={{
                        backgroundColor: `${cal.color}0D`,
                        borderBottomColor: `${cal.color}25`
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white/60 dark:ring-white/20" style={{ backgroundColor: cal.color }}></span>
                        <h3 className="font-headline-sm text-body-md font-bold text-on-surface">{cal.name}</h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-code-sm font-semibold border"
                          style={{
                            color: cal.color,
                            backgroundColor: `${cal.color}15`,
                            borderColor: `${cal.color}30`
                          }}
                        >
                          {calTasks.length} eventos
                        </span>
                        {cal.syncUrl && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-code-sm bg-primary/10 text-primary font-medium" title="Enlazado externamente">
                            <span className="material-symbols-outlined text-[12px]">sync</span>
                            Enlazado
                          </span>
                        )}
                        {cal.sharedFrom && cal.sharedFrom.length > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-code-sm text-secondary">
                            <span className="material-symbols-outlined text-[13px]">share</span>
                            +{cal.sharedFrom.length}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {cal.syncUrl && (
                          <button
                            type="button"
                            disabled={isSyncingCalendar}
                            onClick={() => handleSyncCalendar(cal.id, cal.syncUrl)}
                            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-muted transition-colors cursor-pointer"
                            title="Sincronizar eventos de TeamUp/Google ahora"
                          >
                            <span className={`material-symbols-outlined text-[16px] ${isSyncingCalendar ? 'animate-spin' : ''}`}>
                              sync
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditCalendar(cal, e)}
                          className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-muted transition-colors cursor-pointer"
                          title={`Configurar o eliminar calendario "${cal.name}"`}
                        >
                          <span className="material-symbols-outlined text-[16px]">settings</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEventModal({ calendarId: cal.id })}
                          className="px-2.5 py-1 text-white text-label-sm font-semibold rounded-lg hover:brightness-105 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                          style={{ backgroundColor: cal.color }}
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          <span>Añadir evento</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCollapseCalendar(cal.id)}
                          className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-muted transition-colors cursor-pointer"
                          title={isCollapsed ? 'Expandir calendario' : 'Colapsar calendario'}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isCollapsed ? 'expand_more' : 'expand_less'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Contenido fluido sin scroll interno anidado */}
                    {!isCollapsed && (
                      <div className="w-full">
                        {renderCalendarContent(calTasks, cal)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Utility Panel: Widgets Animados, Arrastrables y Personalizables */}
        <div className="xl:col-span-3 flex flex-col gap-3 sm:gap-space-lg w-full">
          {/* Botón Acordeón en Móvil para resumir widgets y no saturar la pantalla */}
          <button
            type="button"
            onClick={() => setIsMobileWidgetsOpen((prev) => !prev)}
            className="xl:hidden w-full flex items-center justify-between p-3.5 bg-white dark:bg-[#161b26] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm cursor-pointer text-on-surface"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">widgets</span>
              <span className="font-headline-sm text-sm font-bold">Widgets y Herramientas</span>
              <span className="text-[10px] text-secondary bg-surface-muted px-2 py-0.5 rounded-full font-code-sm">
                {sidebarWidgets.length} activos
              </span>
            </div>
            <span className="material-symbols-outlined text-secondary text-[20px]">
              {isMobileWidgetsOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Switcher de Disposición en Desktop: Envolvente vs Lateral */}
          <div className="hidden xl:flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
              {widgetLayout === 'surround' ? 'Disposición Envolvente' : 'Disposición Lateral'}
            </span>
            <button
              type="button"
              onClick={() => setWidgetLayout(widgetLayout === 'surround' ? 'sidebar' : 'surround')}
              className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              title="Cambiar distribución de widgets alrededor del calendario"
            >
              <span className="material-symbols-outlined text-[14px]">
                {widgetLayout === 'surround' ? 'view_sidebar' : 'view_quilt'}
              </span>
              <span>{widgetLayout === 'surround' ? 'Columna única' : 'Envolver calendario'}</span>
            </button>
          </div>

          {/* Contenedor de Widgets: En móvil muestra todos si está abierto; en desktop muestra según widgetLayout */}
          <div className={`${isMobileWidgetsOpen ? 'flex' : 'hidden xl:flex'} flex-col gap-space-lg w-full`}>
            {((isMobileWidgetsOpen || widgetLayout === 'sidebar') ? sidebarWidgets : sidebarWidgets.slice(0, 2)).map((widgetId, idx) => {
              const isCollapsed = collapsedWidgets.includes(widgetId)
              const meta = getWidgetMeta(widgetId)

              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={() => handleDrop(idx)}
                  className={`bg-white dark:bg-[#161b26] rounded-3xl shadow-sm border overflow-hidden flex flex-col transition-all duration-300 ease-out group/widget ${
                    draggedWidgetIdx === idx
                      ? 'scale-90 opacity-40 rotate-1 shadow-2xl border-primary ring-2 ring-primary/30 cursor-grabbing bg-primary/5'
                      : dragOverWidgetIdx === idx
                      ? 'scale-105 border-dashed border-2 border-primary shadow-lg ring-2 ring-primary/20 bg-primary/5'
                      : 'border-slate-200/80 dark:border-slate-800 hover:shadow-md'
                  }`}
                >
                  {/* Toolbar Superior del Widget */}
                  <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-secondary">
                    <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing">
                      <span
                        className="material-symbols-outlined text-[15px] opacity-40 group-hover/widget:opacity-80 transition-opacity"
                        title="Arrastrar para reordenar"
                      >
                        drag_indicator
                      </span>
                      <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                        {meta.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Botón único de Colapsar / Expandir */}
                      <button
                        type="button"
                        onClick={() => toggleCollapseWidget(widgetId)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-surface-muted hover:text-on-surface transition-colors cursor-pointer"
                        title={isCollapsed ? 'Expandir widget' : 'Colapsar widget'}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isCollapsed ? 'expand_more' : 'expand_less'}
                        </span>
                      </button>

                      {/* Botón de Eliminar / Ocultar Widget */}
                      <button
                        type="button"
                        onClick={() => removeWidget(widgetId)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-error/15 text-secondary hover:text-error transition-colors cursor-pointer"
                        title="Ocultar widget"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                  </div>

                  {/* Contenido del Widget (solo visible si no está colapsado) */}
                  {!isCollapsed && (
                    <div className="p-space-md animate-in fade-in duration-150">
                      {widgetId === 'clock' && renderClockWidget()}
                      {widgetId === 'calendars' && renderCalendarsWidget()}
                      {widgetId === 'miniCal' && renderMiniCalWidget()}
                      {widgetId === 'deadlines' && renderDeadlinesWidget()}
                      {widgetId === 'allocation' && renderAllocationWidget()}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Sección para añadir widgets ocultos */}
            {widgetLayout !== 'surround' && sidebarWidgets.length < ALL_WIDGETS.length && (
              <div className="p-3 border-2 border-dashed border-outline-variant/40 rounded-2xl flex flex-col items-center justify-center gap-2 text-center bg-surface-subtle/30 animate-in fade-in duration-200">
                <span className="text-xs text-secondary font-medium">Widgets disponibles:</span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {ALL_WIDGETS.filter((w) => !sidebarWidgets.includes(w.id)).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => addWidget(w.id)}
                      className="px-2.5 py-1 rounded-xl bg-surface-pure hover:bg-primary-fixed/20 hover:text-primary text-on-surface font-label-sm text-xs font-semibold flex items-center gap-1 shadow-2xs border border-outline-variant/30 transition-all cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span>{w.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estante de Widgets Envolventes Inferiores (Rodeando el calendario por debajo) */}
      {widgetLayout === 'surround' && (
        <div className="hidden xl:flex flex-col gap-3 mt-4 pt-4 border-t border-slate-200/70 dark:border-slate-800/70 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-primary text-[18px]">view_quilt</span>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                Herramientas Envolventes Inferiores ({Math.max(0, sidebarWidgets.length - 2)})
              </span>
              <span className="text-[11px] text-secondary">
                · Arrastra cualquier widget para moverlo a la columna lateral o cambiar su orden
              </span>
            </div>
            {sidebarWidgets.length > 2 && sidebarWidgets.length < ALL_WIDGETS.length && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-secondary">Añadir:</span>
                {ALL_WIDGETS.filter((w) => !sidebarWidgets.includes(w.id)).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => addWidget(w.id)}
                    className="px-2 py-0.5 rounded-lg bg-surface-pure hover:bg-primary/10 hover:text-primary text-secondary text-xs font-semibold border border-outline-variant/30 transition-colors cursor-pointer"
                  >
                    + {w.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {sidebarWidgets.length > 2 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-lg items-start">
            {sidebarWidgets.slice(2).map((widgetId, subIdx) => {
              const actualIdx = subIdx + 2
              const isCollapsed = collapsedWidgets.includes(widgetId)
              const meta = getWidgetMeta(widgetId)

              return (
                <div
                  key={widgetId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, actualIdx)}
                  onDragEnter={() => handleDragEnter(actualIdx)}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={() => handleDrop(actualIdx)}
                  className={`bg-white dark:bg-[#161b26] rounded-3xl shadow-sm border overflow-hidden flex flex-col transition-all duration-300 ease-out group/widget ${
                    draggedWidgetIdx === actualIdx
                      ? 'scale-90 opacity-40 rotate-1 shadow-2xl border-primary ring-2 ring-primary/30 cursor-grabbing bg-primary/5'
                      : dragOverWidgetIdx === actualIdx
                      ? 'scale-105 border-dashed border-2 border-primary shadow-lg ring-2 ring-primary/20 bg-primary/5'
                      : 'border-slate-200/80 dark:border-slate-800 hover:shadow-md'
                  }`}
                >
                  <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-secondary">
                    <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing">
                      <span className="material-symbols-outlined text-[15px] opacity-40 group-hover/widget:opacity-80 transition-opacity">
                        drag_indicator
                      </span>
                      <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                        {meta.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleCollapseWidget(widgetId)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-surface-muted hover:text-on-surface transition-colors cursor-pointer"
                        title={isCollapsed ? 'Expandir widget' : 'Colapsar widget'}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isCollapsed ? 'expand_more' : 'expand_less'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeWidget(widgetId)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-error/15 text-secondary hover:text-error transition-colors cursor-pointer"
                        title="Ocultar widget"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="p-space-md animate-in fade-in duration-150">
                      {widgetId === 'clock' && renderClockWidget()}
                      {widgetId === 'calendars' && renderCalendarsWidget()}
                      {widgetId === 'miniCal' && renderMiniCalWidget()}
                      {widgetId === 'deadlines' && renderDeadlinesWidget()}
                      {widgetId === 'allocation' && renderAllocationWidget()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          ) : (
            <div className="p-4 border-2 border-dashed border-outline-variant/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left bg-surface-subtle/30 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-secondary">
                <span className="material-symbols-outlined text-[20px] text-primary">add_to_photos</span>
                <span className="text-xs font-medium">Zona inferior envolvente vacía: añade widgets aquí para rodear el calendario por debajo.</span>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {ALL_WIDGETS.filter((w) => !sidebarWidgets.includes(w.id)).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => addWidget(w.id)}
                    className="px-2.5 py-1 rounded-xl bg-surface-pure hover:bg-primary-fixed/20 hover:text-primary text-on-surface font-label-sm text-xs font-semibold flex items-center gap-1 shadow-2xs border border-outline-variant/30 transition-all cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>{w.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* POPUP 1: MODAL FLUIDO PARA AÑADIR / EDITAR EVENTO (CUSTOM SELECTORS, BACKDROP SUAVE Y FOOTER FIJO) */}
      {isEventModalOpen && (
        <div
          onClick={() => {
            setIsEventModalOpen(false)
            setEditingTaskId(null)
          }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-all duration-200 animate-in fade-in"
        >
          <div
            role="dialog"
            data-floating-menu
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] rounded-t-3xl sm:rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.4)] w-full max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col border border-slate-300 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 ease-out pb-safe sm:pb-0 transform-gpu"
          >
            {/* Modal Header Fijo con Selector de Modo Simple vs Avanzado */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#161b26] shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-md shadow-primary/25 shrink-0">
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px]">
                    {editingTaskId ? 'edit_calendar' : 'calendar_add_on'}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-sm sm:text-base text-on-surface font-bold tracking-tight">
                    {editingTaskId ? 'Editar Evento' : 'Nuevo Evento'}
                  </h3>
                  <p className="text-[11px] text-secondary font-medium hidden xs:block">
                    {eventModalMode === 'simple' ? 'Modo rápido sin scroll' : 'Configuración detallada'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Selector Simple vs Avanzado (Persistente) con Pastilla Deslizante Apple */}
                <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                  <div
                    className="absolute top-0.5 bottom-0.5 rounded-lg bg-white dark:bg-[#161b26] shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
                    style={{
                      width: 'calc(50% - 2px)',
                      left: '2px',
                      transform: `translateX(${eventModalMode === 'simple' ? '0%' : '100%'})`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleEventModalMode('simple')}
                    className={`relative z-10 w-16 sm:w-20 py-1 text-center rounded-lg text-xs transition-colors duration-200 cursor-pointer ${
                      eventModalMode === 'simple'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface font-medium'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleEventModalMode('advanced')}
                    className={`relative z-10 w-16 sm:w-20 py-1 text-center rounded-lg text-xs transition-colors duration-200 cursor-pointer ${
                      eventModalMode === 'advanced'
                        ? 'text-primary font-bold'
                        : 'text-secondary hover:text-on-surface font-medium'
                    }`}
                  >
                    Avanzado
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsEventModalOpen(false)
                    setEditingTaskId(null)
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Cerrar modal"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body dentro de Formulario Nativo */}
            <form onSubmit={handleSaveEvent} className="flex flex-col flex-1 overflow-hidden">
              {eventModalMode === 'simple' ? (
                /* Modo Simple: Solo título, día/hora, icono y categoría en tarjeta compacta SIN SCROLL */
                <div className="p-4 sm:p-5 flex flex-col gap-3.5 flex-1">
                  {/* Título */}
                  <div>
                    <label className="block font-label-sm text-xs text-secondary mb-1 font-medium">Nombre de la actividad *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Entreno de pierna, Estudio examen IA..."
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      className="w-full h-10 px-3.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-slate-800/40 rounded-xl text-on-surface text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner"
                      autoFocus
                    />
                  </div>

                  {/* Día y Hora en 1 sola fila compacta */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-label-sm text-xs text-secondary mb-1 font-medium">Día</label>
                      <input
                        type="date"
                        required
                        value={eventForm.date}
                        onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                        className="w-full h-10 px-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-slate-800/40 rounded-xl text-on-surface text-xs sm:text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-label-sm text-xs text-secondary font-medium">Hora</label>
                        <label className="flex items-center gap-1 text-[11px] text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={eventForm.isAllDay}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setEventForm((prev) => ({
                                ...prev,
                                isAllDay: checked,
                                time: checked ? '' : (prev.time || '10:00'),
                                endTime: checked ? '' : (prev.endTime || '11:00'),
                              }))
                            }}
                            className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                          />
                          <span>Todo el día</span>
                        </label>
                      </div>
                      {eventForm.isAllDay ? (
                        <div className="h-10 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-secondary font-medium select-none">
                          <span className="material-symbols-outlined text-[17px] text-amber-500">wb_sunny</span>
                          <span>Todo el día (sin hora)</span>
                        </div>
                      ) : (
                        <input
                          type="time"
                          value={eventForm.time || '10:00'}
                          onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                          className="w-full h-10 px-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-slate-800/40 rounded-xl text-on-surface text-xs sm:text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                        />
                      )}
                    </div>
                  </div>

                  {/* Icono representativo rápido */}
                  <div>
                    <label className="block font-label-sm text-xs text-secondary mb-1.5 font-medium">Icono representativo</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['event', 'school', 'fitness_center', 'work', 'person', 'terminal', 'restaurant'].map((ico) => (
                        <button
                          key={ico}
                          type="button"
                          onClick={() => setEventForm({ ...eventForm, icon: ico })}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            eventForm.icon === ico
                              ? 'bg-primary text-white shadow-xs ring-2 ring-primary/40 scale-105'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-secondary hover:text-on-surface'
                          }`}
                          title={ico}
                        >
                          <span className="material-symbols-outlined text-[18px]">{ico}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsIconPickerOpen((prev) => !prev)}
                        className="h-9 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-secondary hover:text-on-surface text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Ver más iconos"
                      >
                        <span className="material-symbols-outlined text-[16px]">more_horiz</span>
                        <span>Más</span>
                      </button>
                    </div>

                    {isIconPickerOpen && (
                      <div className="mt-2 p-2 bg-white dark:bg-[#1a202c] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl grid grid-cols-6 gap-1 max-h-36 overflow-y-auto animate-in fade-in duration-150">
                        {ALL_EVENT_ICONS.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => {
                              setEventForm({ ...eventForm, icon })
                              setIsIconPickerOpen(false)
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                              eventForm.icon === icon
                                ? 'bg-primary text-white'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">{icon}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Categoría rápida */}
                  <div>
                    <label className="block font-label-sm text-xs text-secondary mb-1 font-medium">Categoría</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {categories.map((cat) => {
                        const isSelected = eventForm.context === cat.name
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setEventForm({ ...eventForm, context: cat.name })}
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? `${cat.bg} ${cat.text} ring-2 ring-primary shadow-xs font-bold`
                                : 'bg-slate-100 dark:bg-slate-800/60 text-secondary hover:text-on-surface'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                            <span>{cat.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Alarma sonora opcional */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[18px] ${eventForm.hasAlarm ? 'text-amber-500' : 'text-secondary'}`}>
                        {eventForm.hasAlarm ? 'notifications_active' : 'notifications'}
                      </span>
                      <span className="text-xs font-medium text-on-surface">Alarma sonora al empezar el evento</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!eventForm.hasAlarm}
                        onChange={(e) => setEventForm({ ...eventForm, hasAlarm: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500 shadow-xs"></div>
                    </label>
                  </div>
                </div>
              ) : (
                /* Modo Avanzado: Organizado en 2 columnas para no desbordar */
                <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain flex flex-col gap-3.5 scrollbar-thin flex-1 transform-gpu max-h-[68vh]">
                  {/* Título */}
                  <div>
                    <label className="block font-label-sm text-label-sm text-secondary mb-1.5 font-medium">Título de la actividad *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Entreno de pierna, Estudio examen IA..."
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      className="w-full h-10 px-3.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-slate-800/40 rounded-xl text-on-surface text-body-md border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner"
                      autoFocus
                    />
                  </div>

                  {/* Calendario asignado y Todo el día en 2 columnas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="block font-label-sm text-label-sm text-secondary mb-1 font-medium">Calendario asignado</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCalSelectDropdownOpen((prev) => !prev)
                          setIsCatSelectDropdownOpen(false)
                          setIsRecurrenceSelectDropdownOpen(false)
                          setIsIconPickerOpen(false)
                        }}
                        className="w-full h-10 px-3.5 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between transition-all cursor-pointer text-body-sm text-on-surface"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: calendars.find((c) => c.id === eventForm.calendarId)?.color || '#3b82f6' }}
                          />
                          <span className="font-semibold truncate">
                            {calendars.find((c) => c.id === eventForm.calendarId)?.name || 'Personal & General'}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          {isCalSelectDropdownOpen ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {isCalSelectDropdownOpen && (
                        <div
                          data-floating-menu
                          className="absolute left-0 right-0 top-full mt-1 z-[100] bg-white dark:bg-[#1a202c] border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 max-h-48 overflow-y-auto animate-in fade-in duration-150"
                        >
                          {calendars.map((cal) => {
                            const isSelected = eventForm.calendarId === cal.id
                            return (
                              <button
                                key={cal.id}
                                type="button"
                                onClick={() => {
                                  setEventForm({ ...eventForm, calendarId: cal.id })
                                  setIsCalSelectDropdownOpen(false)
                                }}
                                className={`p-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                                  isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-on-surface'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: cal.color }} />
                                  <span className="text-body-sm">{cal.name}</span>
                                </div>
                                {isSelected && <span className="material-symbols-outlined text-[16px] text-primary">check</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <div className="flex items-center justify-between px-2.5 sm:px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 h-10">
                        <span className="font-label-sm text-[11px] sm:text-xs text-on-surface font-semibold">Todo el día</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={eventForm.isAllDay}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setEventForm((prev) => ({
                                ...prev,
                                isAllDay: checked,
                                time: checked ? '' : (prev.time || '10:00'),
                                endTime: checked ? '' : (prev.endTime || '11:00'),
                              }))
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary shadow-xs"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between px-2.5 sm:px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 h-10">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`material-symbols-outlined text-[16px] ${eventForm.hasAlarm ? 'text-amber-500' : 'text-secondary'}`}>
                            {eventForm.hasAlarm ? 'notifications_active' : 'notifications'}
                          </span>
                          <span className="font-label-sm text-[11px] sm:text-xs text-on-surface font-semibold truncate">Alarma</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!eventForm.hasAlarm}
                            onChange={(e) => setEventForm({ ...eventForm, hasAlarm: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-8 h-4.5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500 shadow-xs"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Fecha, Hora y Duración en 3 columnas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-label-sm text-label-sm text-secondary mb-1 font-medium">Fecha</label>
                      <input
                        type="date"
                        required
                        value={eventForm.date}
                        onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                        className="w-full h-10 px-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-slate-800/40 rounded-xl text-on-surface text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      />
                    </div>
                    {eventForm.isAllDay ? (
                      <div className="sm:col-span-2 flex flex-col justify-end">
                        <div className="h-10 px-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-secondary font-medium select-none">
                          <span className="material-symbols-outlined text-[18px] text-amber-500">wb_sunny</span>
                          <span>Evento de jornada completa (sin horario específico)</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block font-label-sm text-label-sm text-secondary mb-1 font-medium">Hora inicio</label>
                          <input
                            type="time"
                            value={eventForm.time || '10:00'}
                            onChange={(e) => {
                              const newTime = e.target.value
                              const dur = eventForm.duration || 60
                              const [sh, sm] = (newTime || '10:00').split(':').map(Number)
                              const totalM = (sh * 60 + (sm || 0) + dur) % 1440
                              const endH = String(Math.floor(totalM / 60)).padStart(2, '0')
                              const endM = String(totalM % 60).padStart(2, '0')
                              setEventForm({
                                ...eventForm,
                                time: newTime,
                                endTime: `${endH}:${endM}`,
                              })
                            }}
                            className="w-full h-10 px-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-slate-800/40 rounded-xl text-on-surface text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                          />
                        </div>
                        <div>
                          <label className="block font-label-sm text-label-sm text-secondary mb-1 font-medium">
                            Duración {eventForm.endTime ? `(hasta ${eventForm.endTime})` : ''}
                          </label>
                          <select
                            value={eventForm.duration || 60}
                            onChange={(e) => {
                              const dur = parseInt(e.target.value, 10)
                              const [sh, sm] = (eventForm.time || '10:00').split(':').map(Number)
                              const totalM = (sh * 60 + (sm || 0) + dur) % 1440
                              const endH = String(Math.floor(totalM / 60)).padStart(2, '0')
                              const endM = String(totalM % 60).padStart(2, '0')
                              setEventForm({
                                ...eventForm,
                                duration: dur,
                                endTime: `${endH}:${endM}`,
                              })
                            }}
                            className="w-full h-10 px-3 bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-slate-800/40 rounded-xl text-on-surface text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer"
                          >
                            <option value={30}>30 minutos</option>
                            <option value={45}>45 minutos</option>
                            <option value={60}>1 hora (60m)</option>
                            <option value={90}>1 hora 30 min (90m)</option>
                            <option value={120}>2 horas (120m)</option>
                            <option value={150}>2 horas 30 min (150m)</option>
                            <option value={180}>3 horas (180m)</option>
                            <option value={240}>4 horas (240m)</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Categoría y Esfuerzo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="block font-label-sm text-label-sm text-secondary mb-1 font-medium">Categoría</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCatSelectDropdownOpen((prev) => !prev)
                          setIsCalSelectDropdownOpen(false)
                          setIsRecurrenceSelectDropdownOpen(false)
                          setIsIconPickerOpen(false)
                        }}
                        className="w-full h-10 px-3 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between transition-all cursor-pointer text-body-sm text-on-surface"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ${getCatScheme(eventForm.context).dot}`} />
                          <span className="font-semibold truncate text-xs sm:text-sm">{eventForm.context}</span>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          {isCatSelectDropdownOpen ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {isCatSelectDropdownOpen && (
                        <div
                          data-floating-menu
                          className="absolute left-0 right-0 top-full mt-1 z-[100] bg-white dark:bg-[#1a202c] border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 max-h-48 overflow-y-auto animate-in fade-in duration-150"
                        >
                          {categories.map((cat) => {
                            const isSelected = eventForm.context === cat.name
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setEventForm({ ...eventForm, context: cat.name })
                                  setIsCatSelectDropdownOpen(false)
                                }}
                                className={`p-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                                  isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-on-surface'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cat.dot}`} />
                                  <span className="text-body-sm">{cat.name}</span>
                                </div>
                                {isSelected && <span className="material-symbols-outlined text-[16px] text-primary">check</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-label-sm text-label-sm text-secondary mb-1 font-medium">Esfuerzo</label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-800/40 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] text-center font-medium h-10 items-center">
                        {['Low', 'Medium', 'High'].map((eff) => (
                          <button
                            key={eff}
                            type="button"
                            onClick={() => setEventForm({ ...eventForm, effort: eff })}
                            className={`py-1 rounded-lg transition-all cursor-pointer ${
                              eventForm.effort === eff
                                ? 'bg-white dark:bg-slate-700 text-on-surface shadow-xs font-bold ring-1 ring-slate-300 dark:ring-slate-600'
                                : 'text-secondary hover:text-on-surface'
                            }`}
                          >
                            {eff}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Repetición y Selector de Icono en 2 columnas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="block font-label-sm text-label-sm text-secondary mb-1 font-medium">Repetición periódica</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecurrenceSelectDropdownOpen((prev) => !prev)
                          setIsCalSelectDropdownOpen(false)
                          setIsCatSelectDropdownOpen(false)
                          setIsIconPickerOpen(false)
                        }}
                        className="w-full h-10 px-3 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between transition-all cursor-pointer text-body-sm text-on-surface"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-[17px] text-secondary">update</span>
                          <span className="font-semibold truncate text-xs">
                            {eventForm.recurrence === 'daily'
                              ? 'Todos los días'
                              : eventForm.recurrence === 'weekly'
                              ? 'Todas las semanas'
                              : eventForm.recurrence === 'monthly'
                              ? 'Todos los meses'
                              : eventForm.recurrence === 'yearly'
                              ? 'Todos los años'
                              : 'No repetir (Único)'}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          {isRecurrenceSelectDropdownOpen ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {isRecurrenceSelectDropdownOpen && (
                        <div
                          data-floating-menu
                          className="absolute left-0 right-0 top-full mt-1 z-[100] bg-white dark:bg-[#1a202c] border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 animate-in fade-in duration-150"
                        >
                          {[
                            { id: 'none', label: 'No repetir (Evento único)' },
                            { id: 'daily', label: 'Todos los días (Continuo)' },
                            { id: 'weekly', label: 'Todas las semanas (Continuo)' },
                            { id: 'monthly', label: 'Todos los meses (Continuo)' },
                            { id: 'yearly', label: 'Todos los años (Anual)' },
                          ].map((item) => {
                            const isSelected = eventForm.recurrence === item.id
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setEventForm({ ...eventForm, recurrence: item.id })
                                  setIsRecurrenceSelectDropdownOpen(false)
                                }}
                                className={`p-2 rounded-lg flex items-center justify-between text-left transition-colors cursor-pointer ${
                                  isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-on-surface'
                                }`}
                              >
                                <span className="text-body-sm">{item.label}</span>
                                {isSelected && <span className="material-symbols-outlined text-[16px] text-primary">check</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <label className="block font-label-sm text-label-sm text-secondary mb-1 font-medium">Icono representativo</label>
                      <button
                        type="button"
                        onClick={() => setIsIconPickerOpen((prev) => !prev)}
                        className="w-full h-10 px-3 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between transition-all cursor-pointer text-body-sm text-on-surface"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-[15px]">{eventForm.icon || 'event'}</span>
                          </span>
                          <span className="font-semibold capitalize text-xs">{eventForm.icon || 'event'}</span>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          {isIconPickerOpen ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>

                      {isIconPickerOpen && (
                        <div
                          data-floating-menu
                          className="absolute left-0 right-0 top-full mt-1 z-[100] p-2.5 bg-white dark:bg-[#1a202c] rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xl grid grid-cols-6 gap-1 max-h-40 overflow-y-auto animate-in fade-in duration-150"
                        >
                          {ALL_EVENT_ICONS.map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => {
                                setEventForm({ ...eventForm, icon })
                                setIsIconPickerOpen(false)
                              }}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                eventForm.icon === icon
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary'
                              }`}
                              title={icon}
                            >
                              <span className="material-symbols-outlined text-[16px]">{icon}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Descripción opcional */}
                  <div>
                    <label className="block font-label-sm text-label-sm text-secondary mb-1 font-medium">Notas / Descripción (opcional)</label>
                    <textarea
                      rows={2}
                      placeholder="Detalles, notas, link..."
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-slate-800/40 rounded-xl text-on-surface text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions Footer FIJO SIEMPRE VISIBLE */}
              <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#121620]/80 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsEventModalOpen(false)
                    setEditingTaskId(null)
                  }}
                  className="px-4 py-2 rounded-xl text-secondary hover:bg-slate-200/60 dark:hover:bg-slate-800 text-label-md font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-label-md font-bold shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                >
                  {editingTaskId ? 'Actualizar Evento' : 'Guardar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP 2: DETALLE COMPLETO DEL EVENTO (ESTILO PREMIUM LIMPIO Y ANIMACIÓN) */}
      {selectedDetailTask && (
        <div
          onClick={() => setSelectedDetailTask(null)}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-all duration-200 animate-in fade-in"
        >
          <div
            role="dialog"
            data-floating-menu
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] rounded-t-3xl sm:rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.4)] w-full max-w-sm max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto border border-slate-300 dark:border-slate-700 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 ease-out pb-safe sm:pb-0"
          >
            {/* Header con color de categoría */}
            <div className={`p-4.5 ${getCatScheme(selectedDetailTask.context).bg} flex items-center justify-between border-b border-black/5`}>
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[22px] ${getCatScheme(selectedDetailTask.context).text}`}>
                  {selectedDetailTask.icon || 'event'}
                </span>
                <span className={`font-label-sm text-xs font-bold uppercase tracking-wider ${getCatScheme(selectedDetailTask.context).text}`}>
                  {selectedDetailTask.context}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetailTask(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 text-current transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Contenido detallado */}
            <div className="p-5 flex flex-col gap-3.5">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold leading-snug">
                {selectedDetailTask.title}
              </h2>

              <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl text-body-sm text-secondary border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-2 text-on-surface font-semibold">
                  <span className="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
                  <span>{selectedDetailTask.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                  <span>{selectedDetailTask.time ? selectedDetailTask.time : 'Todo el día'}</span>
                </div>
                {selectedDetailTask.recurrence && selectedDetailTask.recurrence !== 'none' && (
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-[18px]">repeat</span>
                    <span className="capitalize font-medium">Repetición: {selectedDetailTask.recurrence}</span>
                  </div>
                )}
                {selectedDetailTask.effort && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    <span>Esfuerzo: <strong>{selectedDetailTask.effort}</strong></span>
                  </div>
                )}
                {selectedDetailTask.hasAlarm && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                    <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                    <span>Alarma sonora activada al empezar</span>
                  </div>
                )}
              </div>

              {selectedDetailTask.description ? (
                <div>
                  <span className="font-label-sm text-xs text-secondary uppercase font-bold tracking-wider">Notas y Descripción:</span>
                  <p className="mt-1.5 text-body-sm text-on-surface bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl whitespace-pre-wrap leading-relaxed border border-slate-200/80 dark:border-slate-700/80">
                    {selectedDetailTask.description}
                  </p>
                </div>
              ) : (
                <p className="text-secondary text-xs italic">Sin notas adicionales.</p>
              )}

              {/* Mensaje de ayuda para editar */}
              <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">info</span>
                <p className="leading-snug">
                  Haz clic en Editar evento para modificar los detalles de esta tarea.
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => deleteTask(selectedDetailTask.id)}
                  className="w-full sm:w-auto justify-center px-3 sm:px-4 py-2.5 rounded-2xl text-error hover:bg-error/10 text-xs sm:text-label-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0">delete</span>
                  <span className="whitespace-nowrap">Eliminar evento</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleStartEditEvent(selectedDetailTask)}
                    className="flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2.5 rounded-2xl bg-primary text-white hover:bg-primary/90 text-xs sm:text-label-sm font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px] shrink-0">edit</span>
                    <span className="whitespace-nowrap">Editar evento</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDetailTask(null)}
                    className="flex-1 sm:flex-none justify-center px-3 sm:px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-on-surface text-xs sm:text-label-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 3: GESTOR Y PERSONALIZADOR DE CATEGORÍAS (DISEÑO LATERAL 2 COLUMNAS ESTILO APPLE) */}
      {isCategoryModalOpen && (
        <div
          onClick={() => setIsCategoryModalOpen(false)}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-all duration-200 animate-in fade-in"
        >
          <div
            role="dialog"
            data-floating-menu
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] rounded-t-3xl sm:rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.4)] w-full max-w-3xl max-h-[90dvh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-slate-300 dark:border-slate-700 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 ease-out pb-safe sm:pb-0"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#161b26] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary flex items-center justify-center shadow-md shadow-primary/25">
                  <span className="material-symbols-outlined text-[22px]">palette</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base text-on-surface font-bold tracking-tight">Gestionar Categorías</h3>
                  <p className="text-[11px] text-secondary font-medium">Personaliza etiquetas, colores y distribución</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1">
              {/* Columna Izquierda: Categorías activas */}
              <div className="flex flex-col gap-3">
                <label className="block font-label-sm text-label-sm text-secondary font-medium">Categorías activas ({categories.length}):</label>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3.5 h-3.5 rounded-full shadow-2xs ${c.dot}`}></span>
                        <span className="font-label-md text-label-md text-on-surface font-bold">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory({
                              id: c.id,
                              name: c.name,
                              hex: c.hex || '#3b82f6',
                            })
                            const foundPal = CATEGORY_PALETTES.find((p) => p.hex.toLowerCase() === (c.hex || '').toLowerCase())
                            if (foundPal) {
                              setSelectedPalette(foundPal)
                            } else {
                              setSelectedPalette({
                                name: 'Personalizado',
                                bg: 'bg-primary-50 dark:bg-primary-950/60',
                                text: 'text-primary dark:text-primary-300',
                                dot: 'bg-primary',
                                hex: c.hex || '#3b82f6',
                              })
                            }
                          }}
                          className="p-1.5 rounded-xl text-secondary hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          title="Editar categoría"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c.name)}
                          disabled={categories.length <= 1}
                          className={`p-1.5 rounded-xl text-secondary hover:text-error hover:bg-error/10 transition-colors ${
                            categories.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          title="Eliminar categoría"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna Derecha: Crear nueva categoría o Editar categoría seleccionada */}
              <div className="flex flex-col gap-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                {editingCategory ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-label-sm text-label-sm text-primary font-bold">Editar categoría:</label>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="text-xs text-secondary hover:underline cursor-pointer"
                      >
                        Cancelar edición
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nombre de la categoría..."
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleUpdateCategory(editingCategory.id, editingCategory.name, selectedPalette.hex)
                          }
                        }}
                        className="flex-1 h-10 px-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateCategory(editingCategory.id, editingCategory.name, selectedPalette.hex)}
                        className="px-4 py-2 bg-primary text-white text-label-sm font-semibold rounded-2xl hover:opacity-95 transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-label-sm text-label-sm text-secondary font-medium mb-1.5">Añadir nueva categoría:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nombre (ej: Trabajo, Música)..."
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCategory()
                          }
                        }}
                        className="flex-1 h-10 px-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="px-4 py-2 bg-primary-container text-on-primary text-label-sm font-semibold rounded-2xl hover:bg-primary transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
                      >
                        + Añadir
                      </button>
                    </div>
                  </div>
                )}

                {/* Paleta de colores + Selector RGB personalizado */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-secondary font-medium">Color del distintivo:</span>
                    <span className="text-[11px] font-mono text-secondary">{selectedPalette?.hex}</span>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {CATEGORY_PALETTES.map((pal) => (
                      <button
                        key={pal.name}
                        type="button"
                        onClick={() => setSelectedPalette(pal)}
                        className={`w-7 h-7 rounded-full ${pal.dot} transition-all cursor-pointer shadow-2xs ${
                          selectedPalette.name === pal.name ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
                        }`}
                        title={pal.name}
                      />
                    ))}

                    {/* Selector de color personalizado RGB / Rueda Arcoíris (SIEMPRE ÚLTIMA OPCIÓN) */}
                    <label
                      className={`relative w-7 h-7 rounded-full cursor-pointer overflow-hidden border border-slate-300 dark:border-slate-600 flex items-center justify-center shadow-2xs hover:scale-110 transition-all ${
                        !CATEGORY_PALETTES.some((p) => p.hex === selectedPalette?.hex) ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                      }`}
                      title="Seleccionar color RGB personalizado"
                      style={{
                        background: 'conic-gradient(from 180deg at 50% 50%, #ff0000 0deg, #ff8800 60deg, #ffff00 120deg, #00ff00 180deg, #00ffff 240deg, #0000ff 300deg, #ff00ff 360deg)'
                      }}
                    >
                      <input
                        type="color"
                        value={selectedPalette?.hex?.startsWith('#') && selectedPalette.hex.length === 7 ? selectedPalette.hex : '#3b82f6'}
                        onChange={(e) => {
                          const hex = e.target.value
                          setSelectedPalette({
                            name: 'Personalizado',
                            bg: 'bg-primary-50 dark:bg-primary-950/60',
                            text: 'text-primary dark:text-primary-300',
                            dot: 'bg-primary',
                            hex,
                          })
                        }}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                      <span className="material-symbols-outlined text-[13px] text-white drop-shadow pointer-events-none">
                        palette
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#141824]/50 shrink-0">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-on-surface text-label-md font-semibold rounded-2xl transition-colors cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: Confirmación de borrado de Rol / Actividades por Rol */}
      {roleToDelete && (() => {
        const roleTasks = (globalTasks || []).filter(
          (t) =>
            t.context === roleToDelete.name ||
            t.context === roleToDelete.id ||
            t.context === roleToDelete.label
        )
        const totalCount = roleTasks.length
        const extCount = roleTasks.filter((t) => t.isExternalSync).length

        return (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#161b26] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">delete_sweep</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    ¿Cómo deseas eliminar "{roleToDelete.label || roleToDelete.name}"?
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Tiene <strong className="text-on-surface font-semibold">{totalCount} {totalCount === 1 ? 'actividad' : 'actividades'}</strong> asociadas
                    {extCount > 0 ? ` (${extCount} importadas)` : ''}.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-xs text-secondary leading-relaxed">
                Elige si deseas eliminar únicamente la etiqueta del rol (las actividades se conservarán asignadas a Personal) o purgar el rol junto con todas sus actividades de una sola vez.
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteRole(roleToDelete, false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] text-secondary">label_off</span>
                  <span>Eliminar solo rol (conservar actividades en Personal)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmDeleteRole(roleToDelete, true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-rose-600/25"
                >
                  <span className="material-symbols-outlined text-[17px]">delete_forever</span>
                  <span>Eliminar actividades Y ROL ({totalCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRoleToDelete(null)}
                  className="w-full py-2 text-secondary hover:text-on-surface text-xs font-medium text-center transition-colors cursor-pointer mt-0.5"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MENU CONTEXTUAL CLIC DERECHO EN ROLES */}
      {roleContextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed z-[1000] bg-white dark:bg-[#161b26] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 w-52 flex flex-col gap-1 text-xs animate-in zoom-in-95 duration-100 select-none"
          style={{
            top: Math.min(typeof window !== 'undefined' ? window.innerHeight - 130 : 500, roleContextMenu.y),
            left: Math.min(typeof window !== 'undefined' ? window.innerWidth - 220 : 500, roleContextMenu.x),
          }}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 truncate">
            <span className={`w-2 h-2 rounded-full ${roleContextMenu.role.dot || 'bg-primary'}`} />
            <span className="truncate">{roleContextMenu.role.label || roleContextMenu.role.name}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setRoleToEdit({ ...roleContextMenu.role })
              setRoleContextMenu(null)
            }}
            className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 cursor-pointer transition-colors text-left"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">edit</span>
            <span>Editar rol</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleToDelete(roleContextMenu.role)
              setRoleContextMenu(null)
            }}
            className="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2 cursor-pointer transition-colors text-left"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>Eliminar rol...</span>
          </button>
        </div>
      )}

      {/* MODAL RAPIDO PARA EDITAR ROL */}
      {roleToEdit && (
        <div
          onClick={() => setRoleToEdit(null)}
          className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: roleToEdit.hex || '#3b82f6' }}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {roleToEdit.icon || 'school'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Editar Rol
                  </h3>
                  <p className="text-[10px] text-secondary">
                    Personaliza nombre, color e icono
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoleToEdit(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del rol
                </label>
                <input
                  type="text"
                  value={roleToEdit.name || ''}
                  onChange={(e) => setRoleToEdit({ ...roleToEdit, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Color distintivo
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ROLE_PRESET_COLORS.map((pal) => (
                    <button
                      key={pal.name}
                      type="button"
                      onClick={() => setRoleToEdit({ ...roleToEdit, hex: pal.hex })}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-all ${
                        roleToEdit.hex === pal.hex ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: pal.hex }}
                      title={pal.name}
                    />
                  ))}

                  {/* Selector de color personalizado RGB / Rueda Arcoíris (SIEMPRE ÚLTIMA OPCIÓN) */}
                  <label
                    className={`relative w-6 h-6 rounded-full cursor-pointer overflow-hidden border border-slate-300 dark:border-slate-600 flex items-center justify-center shadow-2xs hover:scale-110 transition-all ${
                      !ROLE_PRESET_COLORS.some((p) => p.hex === roleToEdit.hex) ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                    }`}
                    title="Seleccionar color RGB personalizado"
                    style={{
                      background: 'conic-gradient(from 180deg at 50% 50%, #ff0000 0deg, #ff8800 60deg, #ffff00 120deg, #00ff00 180deg, #00ffff 240deg, #0000ff 300deg, #ff00ff 360deg)'
                    }}
                  >
                    <input
                      type="color"
                      value={roleToEdit.hex?.startsWith('#') && roleToEdit.hex.length === 7 ? roleToEdit.hex : '#3b82f6'}
                      onChange={(e) => setRoleToEdit({ ...roleToEdit, hex: e.target.value })}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                    <span className="material-symbols-outlined text-[13px] text-white drop-shadow pointer-events-none">
                      palette
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Icono
                </label>
                <div className="grid grid-cols-8 gap-1 max-h-28 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  {ROLE_PRESET_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setRoleToEdit({ ...roleToEdit, icon: ic })}
                      className={`h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        roleToEdit.icon === ic
                          ? 'bg-primary text-white shadow-xs font-bold'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700'
                      }`}
                      title={ic}
                    >
                      <span className="material-symbols-outlined text-[16px]">{ic}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRoleToEdit(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-200 transition-colors cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!roleToEdit.name.trim()) return
                  const updated = updateSharedRole(roleToEdit.id, {
                    name: roleToEdit.name.trim(),
                    hexColor: roleToEdit.hex,
                    icon: roleToEdit.icon,
                  })
                  setCategories(updated)
                  setRoleToEdit(null)
                  setFeedbackToast(`Rol "${roleToEdit.name.trim()}" actualizado`)
                  setTimeout(() => setFeedbackToast(null), 3000)
                }}
                className="flex-1 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-95 shadow-xs transition-opacity cursor-pointer text-xs"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP 4: GESTOR DE CALENDARIOS (DISEÑO LATERAL 2 COLUMNAS ESTILO APPLE) */}
      {isCalendarModalOpen && (
        <div
          onClick={() => setIsCalendarModalOpen(false)}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-all duration-200 animate-in fade-in"
        >
          <div
            role="dialog"
            data-floating-menu
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] rounded-t-3xl sm:rounded-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.4)] w-full max-w-4xl max-h-[90dvh] sm:max-h-[85vh] overflow-hidden flex flex-col border border-slate-300 dark:border-slate-700 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 ease-out pb-safe sm:pb-0"
          >
            {/* Modal Header */}
            <div className="flex flex-col px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#161b26] shrink-0 gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md text-white font-bold"
                    style={{ backgroundColor: calendarModalTab === 'import' ? '#f43f5e' : (calendarForm.color || '#3b82f6') }}
                  >
                    <span className="material-symbols-outlined text-[22px]">
                      {calendarModalTab === 'import' ? 'hub' : 'calendar_month'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-base text-on-surface font-bold tracking-tight">
                      {editingCalendarId && calendars.some((c) => c.id === editingCalendarId)
                        ? 'Configurar Calendario'
                        : calendarModalTab === 'import'
                        ? 'Importar Calendario Compartido'
                        : 'Añadir Nuevo Calendario'}
                    </h3>
                    <p className="text-[11px] text-secondary font-medium">
                      {calendarModalTab === 'import'
                        ? 'Conecta mediante código o enlace para trabajar a tiempo real'
                        : 'Define nombre, color, enlace externo y compartición'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseCalendarModal}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Si estamos creando un nuevo calendario, permitir alternar entre crear desde cero o conectar código */}
              {(!editingCalendarId || !calendars.some((c) => c.id === editingCalendarId)) && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCalendarModalTab('edit')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      calendarModalTab === 'edit'
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">add_circle</span>
                    <span>Crear nuevo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarModalTab('import')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      calendarModalTab === 'import'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-secondary hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">hub</span>
                    <span>Importar / Conectar con código</span>
                  </button>
                </div>
              )}
            </div>

            {/* PANEL 1: IMPORTAR CALENDARIO COMPARTIDO CON CÓDIGO / ENLACE */}
            {calendarModalTab === 'import' ? (
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-50/60 via-slate-50 to-blue-50/60 dark:from-rose-950/20 dark:via-slate-800/40 dark:to-blue-950/20 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[22px]">hub</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Conectar Calendario en Tiempo Real
                      </h4>
                      <p className="text-xs text-secondary">
                        Pega el código de conexión (ej: HUB-CAL-XXXX-XXXX) o el enlace completo para sincronizarte
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Código de conexión o Enlace *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Ej: HUB-CAL-8F42-9D17 o https://.../?connectCode=..."
                        value={importCalendarCode}
                        onChange={(e) => setImportCalendarCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleConnectSharedCalendar()
                          }
                        }}
                        className="flex-1 h-11 px-3.5 bg-white dark:bg-slate-900/80 rounded-xl text-on-surface text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono text-xs uppercase shadow-inner"
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={isConnectingSharedCal || !importCalendarCode.trim()}
                        onClick={() => handleConnectSharedCalendar()}
                        className="h-11 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0"
                      >
                        <span className={`material-symbols-outlined text-[17px] ${isConnectingSharedCal ? 'animate-spin' : ''}`}>
                          {isConnectingSharedCal ? 'progress_activity' : 'cloud_sync'}
                        </span>
                        <span>{isConnectingSharedCal ? 'Conectando...' : 'Conectar y Sincronizar'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-secondary space-y-2">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-rose-500">sync_alt</span>
                      <span>Sincronización Bidireccional Automática</span>
                    </div>
                    <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                      Ambos usuarios trabajaréis sobre el mismo calendario. Cuando cualquiera agregue, edite, reprograme o elimine un evento, se reflejará al instante en las aplicaciones de ambos sin tener que recargar.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCloseCalendarModal}
                    className="px-4 py-2.5 rounded-2xl text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 text-label-md font-medium transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveCalendar} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1">
                {/* Columna Izquierda: Identidad y Compartición */}
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block font-label-sm text-label-sm text-secondary mb-1.5 font-medium">Nombre del calendario *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Universidad, Vida Normal, Trabajo..."
                      value={calendarForm.name}
                      onChange={(e) => setCalendarForm({ ...calendarForm, name: e.target.value })}
                      className="w-full h-11 px-3.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white dark:bg-slate-800/40 rounded-2xl text-on-surface text-body-md border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner"
                      autoFocus
                    />
                  </div>

                  {/* Selector de Color (Paletas Preset + Selector RGB / HEX Personalizado) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-label-sm text-label-sm text-secondary font-medium">Color distintivo</label>
                      <span className="text-[11px] font-mono font-semibold text-secondary">{calendarForm.color || '#3b82f6'}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {CALENDAR_PALETTES.map((pal) => (
                        <button
                          key={pal.name}
                          type="button"
                          onClick={() => setCalendarForm({ ...calendarForm, color: pal.color })}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all cursor-pointer shadow-2xs ${pal.dot} ${
                            calendarForm.color === pal.color ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
                          }`}
                          title={pal.name}
                        />
                      ))}

                      {/* Selector de color personalizado RGB / Rueda Arcoíris */}
                      <label
                        className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full cursor-pointer overflow-hidden border border-slate-300 dark:border-slate-600 flex items-center justify-center shadow-2xs hover:scale-105 transition-all ${
                          !CALENDAR_PALETTES.some((p) => p.color === calendarForm.color) ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                        }`}
                        title="Seleccionar color RGB personalizado"
                        style={{
                          background: 'conic-gradient(from 180deg at 50% 50%, #ff0000 0deg, #ff8800 60deg, #ffff00 120deg, #00ff00 180deg, #00ffff 240deg, #0000ff 300deg, #ff00ff 360deg)'
                        }}
                      >
                        <input
                          type="color"
                          value={calendarForm.color?.startsWith('#') && calendarForm.color.length === 7 ? calendarForm.color : '#3b82f6'}
                          onChange={(e) => setCalendarForm({ ...calendarForm, color: e.target.value })}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                        <span className="material-symbols-outlined text-[14px] text-white drop-shadow pointer-events-none">
                          palette
                        </span>
                      </label>

                      {/* Entrada Manual Hex / RGB */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[10px] text-secondary font-medium uppercase">Hex/RGB:</span>
                        <input
                          type="text"
                          value={calendarForm.color || ''}
                          onChange={(e) => setCalendarForm({ ...calendarForm, color: e.target.value })}
                          placeholder="#3b82f6 o rgb(...)"
                          className="w-24 sm:w-28 h-7 px-2 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Configuración de compartición / inclusión de otros calendarios */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
                      <span className="font-label-sm text-label-sm text-on-surface font-bold">
                        ¿Ver eventos de otros calendarios aquí?
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary leading-relaxed">
                      Selecciona los calendarios cuyos eventos quieres incluir y visualizar dentro de este calendario:
                    </p>
                    <div className="flex flex-col gap-1.5 mt-1 max-h-36 overflow-y-auto pr-1">
                      {calendars
                        .filter((c) => c.id !== editingCalendarId)
                        .map((otherCal) => {
                          const isChecked = calendarForm.sharedFrom.includes(otherCal.id)
                          return (
                            <label
                              key={otherCal.id}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-body-sm text-on-surface"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCalendarForm({
                                      ...calendarForm,
                                      sharedFrom: [...calendarForm.sharedFrom, otherCal.id],
                                    })
                                  } else {
                                    setCalendarForm({
                                      ...calendarForm,
                                      sharedFrom: calendarForm.sharedFrom.filter((id) => id !== otherCal.id),
                                    })
                                  }
                                }}
                                className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer accent-primary"
                              />
                              <span className="w-3 h-3 rounded-full shadow-2xs" style={{ backgroundColor: otherCal.color }}></span>
                              <span className="font-medium text-xs">{otherCal.name}</span>
                            </label>
                          )
                        })}
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Sincronización Externa TeamUp, Google Calendar, Móvil y Conexión Compartida */}
                <div className="flex flex-col gap-3.5 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                  {/* Tarjeta de Compartición en Tiempo Real */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/50 via-slate-50 to-rose-50/30 dark:from-rose-950/20 dark:via-slate-800/40 dark:to-rose-950/10 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-rose-500">hub</span>
                        <span className="font-label-sm text-label-sm text-on-surface font-bold">
                          Compartir en tiempo real
                        </span>
                      </div>
                      {calendarForm.isShared && calendarForm.shareCode ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Conectado
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-secondary font-semibold font-mono">
                          Privado
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-secondary leading-relaxed">
                      Conecta este calendario con tu pareja o amigos. Ambos veréis y modificaréis eventos de forma sincronizada en tiempo real.
                    </p>

                    {calendarForm.isShared && calendarForm.shareCode ? (
                      <div className="space-y-2.5 pt-1">
                        {/* Caja de Código */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-secondary">Código de conexión</span>
                            <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 truncate tracking-wider">
                              {calendarForm.shareCode}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyShareCode(calendarForm.shareCode)}
                            className="h-8 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 active:scale-95"
                            title="Copiar código al portapapeles"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {copiedCodeToast ? 'check' : 'content_copy'}
                            </span>
                            <span>{copiedCodeToast ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>

                        {/* Caja de Enlace Directo */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-700/80 flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-secondary">Enlace directo para compartir</span>
                            <span className="text-[11px] text-secondary font-mono truncate">
                              {`${window.location.origin}/calendar?connectCode=${calendarForm.shareCode}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyShareLink(calendarForm.shareCode)}
                            className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-on-surface text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 active:scale-95"
                            title="Copiar enlace directo"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {copiedLinkToast ? 'check' : 'link'}
                            </span>
                            <span>{copiedLinkToast ? 'Copiado' : 'Enlace'}</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">cloud_sync</span>
                            Sincronización bidireccional activa
                          </span>
                          <button
                            type="button"
                            onClick={handleToggleShareCurrentCalendar}
                            className="text-[10px] text-error hover:underline font-semibold cursor-pointer"
                          >
                            Desactivar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleToggleShareCurrentCalendar}
                        className="h-10 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">share</span>
                        <span>Activar y Generar Código Compartido</span>
                      </button>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">sync</span>
                        <span className="font-label-sm text-label-sm text-on-surface font-bold">
                          Enlazar calendario externo
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-code-sm font-semibold">
                        iCal / Webcal
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-secondary font-medium mr-1">Compatible con:</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-semibold text-on-surface shadow-2xs">
                        <span className="material-symbols-outlined text-[13px] text-blue-500">calendar_today</span> TeamUp
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-semibold text-on-surface shadow-2xs">
                        <span className="material-symbols-outlined text-[13px] text-primary">event_available</span> Google Calendar
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-semibold text-on-surface shadow-2xs">
                        <span className="material-symbols-outlined text-[13px] text-emerald-500">smartphone</span> Móvil / Apple
                      </span>
                    </div>

                    <p className="text-[11px] text-secondary leading-relaxed">
                      Pega el enlace iCal/Webcal (ej: feed de TeamUp o dirección privada iCal de Google Calendar) para importar automáticamente horas y eventos:
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        placeholder="https://ics.teamup.com/... o enlace iCal"
                        value={calendarForm.syncUrl || ''}
                        onChange={(e) => setCalendarForm({ ...calendarForm, syncUrl: e.target.value })}
                        className="flex-1 h-10 px-3 bg-white dark:bg-slate-900/60 rounded-xl text-on-surface text-body-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-inner font-code-sm text-xs"
                      />
                      <button
                        type="button"
                        disabled={isSyncingCalendar || !calendarForm.syncUrl?.trim()}
                        onClick={() => handleSyncCalendar(editingCalendarId, calendarForm.syncUrl)}
                        className="h-10 px-3.5 rounded-xl bg-primary-container text-on-primary font-label-md text-xs font-semibold hover:bg-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shrink-0 active:scale-95 shadow-2xs"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${isSyncingCalendar ? 'animate-spin' : ''}`}>
                          {isSyncingCalendar ? 'progress_activity' : 'sync'}
                        </span>
                        <span>{isSyncingCalendar ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
                      </button>
                    </div>

                    {/* Subida directa de archivo .ics de respaldo */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-secondary">
                        <span className="material-symbols-outlined text-[15px]">upload_file</span>
                        <span>O importa un archivo .ics de tu móvil/Google</span>
                      </div>
                      <label className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-on-surface text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">file_open</span>
                        <span>Subir archivo .ics</span>
                        <input
                          type="file"
                          accept=".ics,text/calendar"
                          onChange={(e) => handleImportICSFile(e, editingCalendarId)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between p-3.5 sm:p-4 px-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#141824]/50 shrink-0 gap-3">
                {editingCalendarId && calendars.some((c) => c.id === editingCalendarId) ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleDeleteCalendar(editingCalendarId)}
                      disabled={calendars.length <= 1}
                      className={`w-full sm:w-auto px-3.5 py-2.5 rounded-2xl text-error hover:bg-error/10 text-xs sm:text-label-sm font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        calendars.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      title={calendars.length <= 1 ? 'No puedes eliminar el único calendario activo' : 'Eliminar este calendario'}
                    >
                      <span className="material-symbols-outlined text-[16px] shrink-0">delete</span>
                      <span>Eliminar calendario</span>
                    </button>

                    {(() => {
                      const extCount = (globalTasks || []).filter(
                        (t) =>
                          (t.calendarId === editingCalendarId || (!t.calendarId && editingCalendarId === 'cal-default')) &&
                          t.isExternalSync
                      ).length
                      if (extCount === 0) return null
                      return (
                        <button
                          type="button"
                          onClick={() => handleClearExternalFromCal(editingCalendarId)}
                          className="w-full sm:w-auto px-3 py-2.5 rounded-2xl text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-xs sm:text-label-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                          title="Eliminar eventos importados por feed externo de este calendario"
                        >
                          <span className="material-symbols-outlined text-[16px] shrink-0">mop</span>
                          <span>Limpiar {extCount} importados</span>
                        </button>
                      )
                    })()}
                  </div>
                ) : (
                  <div></div>
                )}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCloseCalendarModal}
                    className="flex-1 sm:flex-none justify-center px-4 py-2.5 rounded-2xl text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-label-md font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-none justify-center px-5 py-2.5 rounded-2xl bg-primary text-white hover:bg-primary/90 text-xs sm:text-label-md font-semibold shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    {editingCalendarId ? 'Guardar Cambios' : 'Crear Calendario'}
                  </button>
                </div>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
      {/* POPUP: SALTO DIRECTO DE MES Y AÑO (EJ: 2027 SIN IR MES A MES) */}
      {isDatePickerOpen && (
        <div
          onClick={() => setIsDatePickerOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-primary">calendar_month</span>
                <h3 className="font-headline-sm text-base text-on-surface font-bold">Saltar a Fecha</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Selector de Año con flechas y accesos rápidos */}
            <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Año</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDatePickerYear((prev) => prev - 1)}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-on-surface hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <span className="font-headline-sm text-lg font-bold text-on-surface px-2 min-w-[50px] text-center">
                    {datePickerYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDatePickerYear((prev) => prev + 1)}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-on-surface hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Botones rápidos de años */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                {[2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setDatePickerYear(yr)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                      datePickerYear === yr
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700/80 text-secondary hover:text-on-surface'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuadrícula de 12 Meses */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider px-1">Mes</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  'Enero', 'Febrero', 'Marzo', 'Abril',
                  'Mayo', 'Junio', 'Julio', 'Agosto',
                  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
                ].map((mName, mIdx) => {
                  const isCurrent =
                    currentDate.getFullYear() === datePickerYear && currentDate.getMonth() === mIdx
                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => {
                        const targetDate = new Date(datePickerYear, mIdx, 1)
                        setCurrentDate(targetDate)
                        setMiniDate(targetDate)
                        setIsDatePickerOpen(false)
                        setFeedbackToast(`Mostrando ${mName} ${datePickerYear}`)
                        setTimeout(() => setFeedbackToast(null), 3000)
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                        isCurrent
                          ? 'bg-primary text-white border-primary shadow-sm font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-slate-200/60 dark:border-slate-700/60 text-on-surface'
                      }`}
                    >
                      <span>{mName.slice(0, 3)}</span>
                      <span className="text-[10px] opacity-75 font-normal">{mName}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Botón rápido Hoy */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const today = new Date(2026, 9, 12)
                  setCurrentDate(today)
                  setMiniDate(today)
                  setIsDatePickerOpen(false)
                }}
                className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">today</span>
                <span>Ir al día de hoy</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-secondary hover:text-on-surface cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: CONFIRMACIÓN DE BORRADO DE EVENTO RECURRENTE */}
      {taskToDelete && (
        <div
          onClick={() => setTaskToDelete(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#161b26] rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">update</span>
              </span>
              <div>
                <h3 className="font-bold text-on-surface text-sm sm:text-base">Evento recurrente</h3>
                <p className="text-xs text-secondary mt-0.5 truncate max-w-[220px]">
                  &quot;{taskToDelete.title}&quot; se repite periódicamente.
                </p>
              </div>
            </div>

            <p className="text-xs text-secondary leading-relaxed">
              ¿Deseas eliminar únicamente esta repetición o todos los eventos vinculados a esta serie?
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => confirmDeleteTask(taskToDelete.id, 'single')}
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-on-surface transition-colors cursor-pointer text-left flex items-center justify-between"
              >
                <span>Solo este evento</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">delete</span>
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteTask(taskToDelete.id, 'all')}
                className="w-full py-2.5 px-3.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 text-xs font-bold transition-colors cursor-pointer text-left flex items-center justify-between"
              >
                <span>Todos los eventos de la serie</span>
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="w-full py-2 rounded-xl text-secondary hover:text-on-surface text-xs font-medium cursor-pointer transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

