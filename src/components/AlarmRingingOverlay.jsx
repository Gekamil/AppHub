import { useState, useEffect } from 'react'
import { stopAlarmSound } from '../services/notificationAlarmService'

export default function AlarmRingingOverlay({ onTaskCompleted }) {
  const [activeAlarm, setActiveAlarm] = useState(null)

  useEffect(() => {
    const handleAlarmTrigger = (e) => {
      if (e.detail && e.detail.task) {
        setActiveAlarm(e.detail)
      }
    }
    window.addEventListener('studenthub_event_alarm', handleAlarmTrigger)
    return () => window.removeEventListener('studenthub_event_alarm', handleAlarmTrigger)
  }, [])

  const handleDismiss = () => {
    stopAlarmSound()
    setActiveAlarm(null)
  }

  const handleCompleteTask = () => {
    stopAlarmSound()
    if (activeAlarm?.task?.id && typeof onTaskCompleted === 'function') {
      onTaskCompleted(activeAlarm.task.id)
    }
    setActiveAlarm(null)
  }

  if (!activeAlarm) return null

  const { task, hasAlarm } = activeAlarm

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl bg-surface-pure border border-amber-500/40 shadow-2xl p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-150 relative overflow-hidden">
        {/* Glow de acento superior */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

        {/* Icono de Alarma Pulsante */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center animate-bounce">
            <span className="material-symbols-outlined text-[32px]">
              {hasAlarm ? 'notifications_active' : 'schedule'}
            </span>
          </div>
          {hasAlarm && (
            <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping -z-10" />
          )}
        </div>

        {/* Mensaje */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
            {hasAlarm ? '¡Alarma de Actividad!' : '¡Evento Iniciando Ahora!'}
          </span>
          <h3 className="font-bold text-on-surface text-lg leading-tight line-clamp-2">
            {task.title || 'Actividad programada'}
          </h3>
          <p className="text-xs text-secondary font-code-sm mt-0.5">
            {task.time || 'Ahora'} • {task.context || task.role || 'General'}
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col w-full gap-2 mt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">stop_circle</span>
            <span>{hasAlarm ? 'Detener Alarma' : 'Entendido'}</span>
          </button>

          {onTaskCompleted && (
            <button
              type="button"
              onClick={handleCompleteTask}
              className="w-full py-2 px-4 rounded-xl bg-surface-subtle hover:bg-surface-muted text-on-surface font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-500">check</span>
              <span>Marcar como completada</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
