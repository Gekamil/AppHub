import { useState, useRef, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { chatWithAICopilot, applyAIActions } from '../services/aiOrganizer'
import { getCurrentUser, isGuestUser } from '../services/firebase'
import AIBotIcon from '../components/AIBotIcon'

export default function AIAssistantPage() {
  const { globalTasks = [], setGlobalTasks } = useOutletContext() || {}
  const [messages, setMessages] = useState(() => {
    const cur = getCurrentUser()
    const guest = isGuestUser(cur)
    const name = !guest && cur.displayName ? ` ${cur.displayName.split(' ')[0]}` : ''
    return [
      {
        id: 1,
        sender: 'assistant',
        text: `¡Hola${name}! Soy tu asistente de productividad inteligente. Puedo revisar tu agenda, organizar tus tareas o añadir cualquier evento a tu calendario.`,
        timestamp: 'Ahora',
      },
    ]
  })
  const [inputVal, setInputVal] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const pendingTodayCount = globalTasks.filter((t) => !t.completed).length

  const handleSend = async (customPrompt = null) => {
    const textToSend = customPrompt || inputVal
    if (!textToSend.trim() || isTyping) return

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMessage])
    if (!customPrompt) setInputVal('')
    setIsTyping(true)

    try {
      const response = await chatWithAICopilot({
        userMessage: userMessage.text,
        currentTasks: globalTasks,
        chatHistory: messages,
      })

      // Ejecutar automáticamente todas las acciones sobre globalTasks
      if (response.actions && response.actions.length > 0 && setGlobalTasks) {
        setGlobalTasks((prev) => applyAIActions(prev, response.actions))
      }

      const assistantMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: response.reply,
        actions: response.actions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: 'No he podido procesar la petición con la IA. Por favor, comprueba tu conexión o vuelve a intentarlo.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  const handleClear = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'assistant',
        text: 'Historial reiniciado. ¿En qué te puedo ayudar hoy con tu planificación?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-4">
      {/* Cabecera del Asistente */}
      <div className="w-full bg-white/80 dark:bg-[#161b26]/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <h1 className="font-headline-md text-xl sm:text-2xl text-on-surface font-extrabold tracking-tight">
              Asistente de Productividad IA
            </h1>
            <span className="font-code-sm text-xs text-primary bg-primary/10 px-2.5 py-0.5 rounded-full font-bold">
              Groq Qwen 3.8
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-secondary text-xs font-medium">
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-code-sm">CONTEXTO:</span>
            <span>{pendingTodayCount} tareas pendientes</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Sincronizado con Calendario</span>
            <span>•</span>
            <span>Acceso en lenguaje natural</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-secondary hover:text-on-surface hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Limpiar chat</span>
          </button>
        </div>
      </div>

      {/* Superficie Principal del Chat */}
      <div className="w-full bg-white/90 dark:bg-[#161b26]/90 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 flex flex-col min-h-[520px] max-h-[70vh]">
        {/* Historial de Mensajes */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="flex items-center justify-center gap-3 text-secondary font-code-sm text-xs py-2">
            <div className="h-[1px] w-12 bg-slate-200 dark:bg-slate-800"></div>
            <span>Sesión conectada en tiempo real • StudentHub</span>
            <div className="h-[1px] w-12 bg-slate-200 dark:bg-slate-800"></div>
          </div>

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 w-full ${
                m.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.sender === 'assistant' && (
                <AIBotIcon className="w-8 h-8 rounded-xl shrink-0 shadow-xs" size={32} />
              )}

              <div
                className={`flex flex-col max-w-xl ${
                  m.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    m.sender === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-on-surface rounded-tl-none border border-slate-200/80 dark:border-slate-700/80'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Banners dinámicos de acciones ejecutadas por la IA */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                      {m.actions.map((act, idx) => {
                        if (act.type === 'add_tasks' && act.tasks) {
                          return (
                            <div key={idx} className="space-y-1">
                              <span className="font-code-sm text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                {act.tasks.length === 1 ? 'Tarea programada en el calendario:' : `${act.tasks.length} tareas programadas:`}
                              </span>
                              {act.tasks.map((t, ti) => (
                                <div key={ti} className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#161b26] border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2 shadow-2xs">
                                  <span className="font-semibold text-on-surface truncate">{t.title}</span>
                                  <span className="font-code-sm text-secondary shrink-0">{t.date} • {t.time}</span>
                                </div>
                              ))}
                            </div>
                          )
                        }
                        if (act.type === 'update_task') {
                          return (
                            <div key={idx} className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-xs flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                              <span className="material-symbols-outlined text-[15px]">edit_calendar</span>
                              <span className="font-medium">
                                Tarea modificada {act.targetTitle ? `(${act.targetTitle})` : ''}
                                {act.updates?.time ? ` a las ${act.updates.time}` : ''}
                                {act.updates?.effort ? ` • Esfuerzo ${act.updates.effort}` : ''}
                              </span>
                            </div>
                          )
                        }
                        if (act.type === 'make_recurring') {
                          return (
                            <div key={idx} className="px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 text-xs flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                              <span className="material-symbols-outlined text-[15px]">update</span>
                              <span className="font-medium">
                                Recurrencia semanal activada ({act.count || 4} semanas programadas en calendario)
                              </span>
                            </div>
                          )
                        }
                        if (act.type === 'complete_task') {
                          return (
                            <div key={idx} className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-xs flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                              <span className="material-symbols-outlined text-[15px]">task_alt</span>
                              <span className="font-medium">Tarea marcada como completada</span>
                            </div>
                          )
                        }
                        if (act.type === 'delete_task') {
                          return (
                            <div key={idx} className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/80 text-xs flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                              <span className="font-medium">Tarea eliminada correctamente</span>
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  )}
                </div>
                <span className="font-code-sm text-[10px] text-secondary mt-1 px-1">{m.timestamp}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200 dark:border-slate-700 text-xs text-secondary font-code-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              <span>Procesando consulta con Groq...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Acciones Rápidas Sugeridas */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-wider mr-1">Sugerencias:</span>
          <button
            type="button"
            onClick={() => handleSend('¿Qué cosas tengo que hacer hoy?')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-on-surface transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
            <span>¿Qué tengo que hacer hoy?</span>
          </button>
          <button
            type="button"
            onClick={() => handleSend('Añade 2 ejercicios de mates para el jueves de 50m cada uno')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-on-surface transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <span className="material-symbols-outlined text-[14px] text-secondary">add_task</span>
            <span>2 ejercicios de mates para el jueves</span>
          </button>
          <button
            type="button"
            onClick={() => handleSend('Tengo clase de pádel todos los miércoles a las 7')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-on-surface transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <span className="material-symbols-outlined text-[14px] text-tertiary">sports_tennis</span>
            <span>Pádel todos los miércoles a las 19:00</span>
          </button>
        </div>

        {/* Barra de Entrada de Chat */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="mt-3 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
        >
          <span className="material-symbols-outlined text-secondary text-[20px] ml-2">psychology</span>
          <input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Pregunta a la IA (ej. '¿Qué tengo que hacer hoy?' o 'Añade clase de pádel los miércoles a las 7')..."
            className="flex-1 bg-transparent border-0 outline-none text-xs sm:text-sm text-on-surface placeholder:text-secondary py-1.5"
            type="text"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isTyping}
            className="h-10 px-4 rounded-xl bg-primary text-white disabled:opacity-40 hover:opacity-95 active:scale-95 transition-all flex items-center gap-1 font-semibold text-xs cursor-pointer shadow-xs"
          >
            <span>Enviar</span>
            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
          </button>
        </form>
      </div>
    </div>
  )
}
