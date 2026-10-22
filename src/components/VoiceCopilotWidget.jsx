import { useState, useRef, useEffect, useCallback } from 'react'
import { chatWithAICopilot, applyAIActions } from '../services/aiOrganizer'
import { getCurrentUser, getUserCalendars } from '../services/firebase'
import { syncWidgetData } from '../services/widgetBridge'

export default function VoiceCopilotWidget({ globalTasks, setGlobalTasks, className = '' }) {
  const [responseMsg, setResponseMsg] = useState(() => {
    return localStorage.getItem('studenthub_voice_copilot_response') || 'Toca o mantén pulsado el micro para hablar con la IA'
  })
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')

  const recognitionRef = useRef(null)
  const isHoldModeRef = useRef(false)
  const transcriptRef = useRef('')
  const holdTimeoutRef = useRef(null)

  // Inicializar motor de reconocimiento de voz SpeechRecognition nativo
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'es-ES'

      rec.onresult = (event) => {
        let currentText = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript
        }
        transcriptRef.current = currentText
        setLiveTranscript(currentText)
      }

      rec.onerror = (e) => {
        console.debug('[SpeechRecognition error]:', e.error)
        if (e.error !== 'no-speech') {
          setIsListening(false)
        }
      }

      rec.onend = () => {
        // Si no fue parada voluntaria, asegurarse de enviar si hay texto
        if (isListening) {
          handleStopAndSend()
        }
      }

      recognitionRef.current = rec
    }
  }, [])

  // Auto-iniciar grabación si se abrió directamente desde el widget nativo de Android
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fullQuery = (window.location.search || '') + (window.location.hash || '')
      if (fullQuery.includes('autoRecord=true') || fullQuery.includes('action=voice')) {
        const timer = setTimeout(() => {
          if (!isListening && !isProcessing) {
            startListening()
          }
        }, 350)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  // Enviar mensaje a la IA al finalizar de hablar
  const handleStopAndSend = useCallback(async () => {
    setIsListening(false)
    const textToSend = transcriptRef.current.trim() || liveTranscript.trim()

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }

    if (!textToSend) {
      setLiveTranscript('')
      return
    }

    setIsProcessing(true)
    setResponseMsg(`Procesando: "${textToSend}"...`)

    try {
      const res = await chatWithAICopilot({
        userMessage: textToSend,
        currentTasks: globalTasks || [],
        currentCalendars: getUserCalendars(getCurrentUser()),
        chatHistory: [],
      })

      // Ejecutar automáticamente todas las acciones (crear, mover, borrar, modificar)
      if (res.actions && res.actions.length > 0 && typeof setGlobalTasks === 'function') {
        setGlobalTasks((prev) => applyAIActions(prev, res.actions))
      }

      const reply = res.reply || 'Petición procesada con éxito.'
      setResponseMsg(reply)
      localStorage.setItem('studenthub_voice_copilot_response', reply)

      // Actualizar el widget nativo de Android
      const userCals = getUserCalendars(getCurrentUser())
      const customAccent = localStorage.getItem('studenthub_widget_accent_color') || userCals[0]?.color || '#0071E3'
      syncWidgetData({
        tasks: globalTasks || [],
        calendars: userCals,
        calendarColor: customAccent,
        voiceResponse: reply,
      }).catch(() => {})
    } catch (err) {
      console.warn('[VoiceCopilotWidget] Error processing with AI:', err)
      setResponseMsg('No pude conectar con el servicio de IA. Inténtalo de nuevo.')
    } finally {
      setIsProcessing(false)
      setLiveTranscript('')
      transcriptRef.current = ''
    }
  }, [globalTasks, setGlobalTasks, liveTranscript])

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador o dispositivo no soporta reconocimiento de voz nativo.')
      return
    }
    transcriptRef.current = ''
    setLiveTranscript('')
    setIsListening(true)
    try {
      recognitionRef.current.start()
    } catch {
      try {
        recognitionRef.current.stop()
        setTimeout(() => recognitionRef.current.start(), 100)
      } catch {}
    }
  }

  // Método 1: Clic simple para alternar (Toca para grabar, toca para enviar)
  const handleClickToggle = () => {
    if (isHoldModeRef.current) return // Si fue una pulsación prolongada, ignorar click
    if (isListening) {
      handleStopAndSend()
    } else if (!isProcessing) {
      startListening()
    }
  }

  // Método 2: Mantener pulsado (Mouse / Touch)
  const handleHoldStart = () => {
    isHoldModeRef.current = false
    holdTimeoutRef.current = setTimeout(() => {
      isHoldModeRef.current = true
      if (!isListening && !isProcessing) {
        startListening()
      }
    }, 250)
  }

  const handleHoldEnd = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    if (isHoldModeRef.current) {
      // Estaba en modo mantener pulsado y soltó
      setTimeout(() => {
        isHoldModeRef.current = false
      }, 100)
      if (isListening) {
        handleStopAndSend()
      }
    }
  }

  return (
    <div
      className={`w-full flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-surface-pure/95 border border-outline-variant/30 shadow-md backdrop-blur-xs transition-all ${className}`}
    >
      {/* Parte blanca / tarjeta izquierda para mostrar respuesta rápida y transcripción en vivo */}
      <div className="flex-1 min-w-0 bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-zinc-800 rounded-xl sm:rounded-2xl px-3.5 py-2.5 shadow-inner flex items-center min-h-[44px]">
        {isListening ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 italic truncate">
              {liveTranscript || 'Escuchando tu voz...'}
            </span>
          </div>
        ) : isProcessing ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-[16px] text-primary animate-spin shrink-0">
              progress_activity
            </span>
            <span className="text-xs sm:text-sm text-secondary animate-pulse truncate font-medium">
              Procesando con IA...
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0 w-full">
            <span className="material-symbols-outlined text-[17px] text-primary shrink-0 opacity-80">
              chat_bubble
            </span>
            <p className="text-xs sm:text-sm text-on-surface line-clamp-2 leading-snug font-medium select-text">
              {responseMsg}
            </p>
          </div>
        )}
      </div>

      {/* Botón de Voz derecho (Icono de voz con interacción táctil / mantener pulsado) */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={handleClickToggle}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
          disabled={isProcessing}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl sm:rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md select-none ${
            isListening
              ? 'bg-rose-500 text-white scale-110 shadow-rose-500/40 ring-4 ring-rose-500/25 animate-pulse'
              : 'bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-primary/25'
          } ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
          title={isListening ? 'Pulsa o suelta para enviar a la IA' : 'Pulsa o mantén pulsado para hablar'}
        >
          <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
            {isListening ? 'mic' : 'mic_none'}
          </span>
        </button>

        {isListening && (
          <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping pointer-events-none -z-10" />
        )}
      </div>
    </div>
  )
}
