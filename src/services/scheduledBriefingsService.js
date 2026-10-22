/**
 * Scheduled Briefings Service for StudentHub AI Copilot
 * Manages recurring daily morning tasks & news briefing schedules.
 */

const STORAGE_KEY = 'studenthub_ai_scheduled_briefings'

export const DEFAULT_BRIEFINGS = {
  dailyNews: {
    enabled: false,
    time: '09:00',
  },
  dailyTasks: {
    enabled: false,
    time: '08:30',
  },
  lastUpdated: null,
}

export function getScheduledBriefings() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_BRIEFINGS
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        dailyNews: {
          enabled: !!parsed?.dailyNews?.enabled,
          time: parsed?.dailyNews?.time || '09:00',
        },
        dailyTasks: {
          enabled: !!parsed?.dailyTasks?.enabled,
          time: parsed?.dailyTasks?.time || '08:30',
        },
        lastUpdated: parsed?.lastUpdated || null,
      }
    }
  } catch (err) {}
  return DEFAULT_BRIEFINGS
}

export function saveScheduledBriefings(briefings) {
  try {
    const toSave = {
      dailyNews: {
        enabled: !!briefings?.dailyNews?.enabled,
        time: briefings?.dailyNews?.time || '09:00',
      },
      dailyTasks: {
        enabled: !!briefings?.dailyTasks?.enabled,
        time: briefings?.dailyTasks?.time || '08:30',
      },
      lastUpdated: Date.now(),
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studenthub_briefings_changed', { detail: toSave }))
      }
    }
    return toSave
  } catch (err) {
    return getScheduledBriefings()
  }
}

export function setDailyNewsBriefing(time = '09:00', enabled = true) {
  const current = getScheduledBriefings()
  const updated = {
    ...current,
    dailyNews: {
      enabled,
      time: time || current.dailyNews.time || '09:00',
    },
  }
  return saveScheduledBriefings(updated)
}

export function setDailyTasksBriefing(time = '08:30', enabled = true) {
  const current = getScheduledBriefings()
  const updated = {
    ...current,
    dailyTasks: {
      enabled,
      time: time || current.dailyTasks.time || '08:30',
    },
  }
  return saveScheduledBriefings(updated)
}

export function cancelDailyNewsBriefing() {
  const current = getScheduledBriefings()
  return saveScheduledBriefings({
    ...current,
    dailyNews: { ...current.dailyNews, enabled: false },
  })
}

export function cancelDailyTasksBriefing() {
  const current = getScheduledBriefings()
  return saveScheduledBriefings({
    ...current,
    dailyTasks: { ...current.dailyTasks, enabled: false },
  })
}

export function cancelAllBriefings() {
  return saveScheduledBriefings({
    dailyNews: { enabled: false, time: '09:00' },
    dailyTasks: { enabled: false, time: '08:30' },
  })
}
