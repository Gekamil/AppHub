import { useState, useRef, useEffect } from 'react'
import { chatWithAICopilot, applyAIActions } from '../services/aiOrganizer'
import { getCurrentUser, isGuestUser, getUserCalendars } from '../services/firebase'
import AIBotIcon from './AIBotIcon'

export default function FloatingAICopilot({ globalTasks = [], setGlobalTasks }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    const cur = getCurrentUser()
    const guest = isGuestUser(cur)
    const name = !guest && cur.displayName ? ` ${cur.displayName.split(' ')[0]}` : ''
    return [
      {
        id: 1,
        sender: 'assistant',
        text: `¡Hola${name}! Soy tu Copiloto IA con control total. Puedo añadir tareas, organizar tus bloques de estudio, corregir horas o fechas y responder a tus dudas.`,
        timestamp: 'Ahora',
      },
    ]
  })
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setUnreadCount(0)
    }
  }, [messages, isOpen])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Escuchar logs automáticos (ej. auto-organizador) o mensajes de WhatsApp
  useEffect(() => {
    const handleAddLog = (e) => {
      const detail = e.detail
      if (!detail) return
      const logMsg = {
        id: Date.now(),
        sender: 'assistant',
        text: detail.text || '',
        planData: detail.planData || null,
        type: detail.type || 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, logMsg])
      if (!isOpen) {
        setUnreadCount((c) => c + 1)
      }
    }
    window.addEventListener('copilot_add_log', handleAddLog)
    return () => window.removeEventListener('copilot_add_log', handleAddLog)
  }, [isOpen])

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputText
    if (!textToSend.trim() || isLoading) return

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!customText) setInputText('')
    setIsLoading(true)

    try {
      const response = await chatWithAICopilot({
        userMessage: userMsg.text,
        currentTasks: globalTasks,
        currentCalendars: getUserCalendars(getCurrentUser()),
        chatHistory: messages,
      })

      // Ejecutar automáticamente todas las acciones sobre globalTasks
      if (response.actions && response.actions.length > 0 && setGlobalTasks) {
        setGlobalTasks((prev) => applyAIActions(prev, response.actions))
      }

      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: response.reply,
        actions: response.actions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: 'Ha ocurrido un error al procesar tu solicitud. Por favor, inténtalo de nuevo.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'assistant',
        text: 'Historial reiniciado. ¿En qué te puedo ayudar ahora?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setUnreadCount(0)
  }

  // Componente para renderizar respuestas enriquecidas con tablas y gráficos en vez de texto plano
  const renderMessageBody = (msg) => {
    // 1. Si contiene datos de plan de organización gráfica
    if (msg.planData) {
      const { summary, tip, tasks = [] } = msg.planData
      return (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-primary font-semibold text-xs border-b border-outline-variant/30 pb-1.5">
            <span className="material-symbols-outlined text-[16px]">calendar_view_week</span>
            <span>Plan de Organización Semanal</span>
          </div>
          {summary && (
            <p className="text-xs text-on-surface leading-relaxed font-medium bg-surface-pure/80 p-2 rounded-xl border border-outline-variant/20">
              {summary}
            </p>
          )}

          {tasks.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-outline-variant/30 shadow-2xs">
              <table className="w-full text-[11px] text-left border-collapse bg-surface-pure/60">
                <thead>
                  <tr className="bg-surface-muted/80 text-secondary border-b border-outline-variant/30">
                    <th className="py-1.5 px-2 font-semibold">Hora</th>
                    <th className="py-1.5 px-2 font-semibold">Actividad</th>
                    <th className="py-1.5 px-2 font-semibold">Esfuerzo</th>
                    <th className="py-1.5 px-2 font-semibold">Rol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {tasks.map((t, idx) => (
                    <tr key={idx} className="hover:bg-surface-muted/30 transition-colors">
                      <td className="py-1 px-2 font-mono text-[10px] text-secondary">{t.time || 'Hoy'}</td>
                      <td className="py-1 px-2 font-medium text-on-surface truncate max-w-[130px]" title={t.title}>
                        {t.title}
                      </td>
                      <td className="py-1 px-2">
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                            t.effort === 'High'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : t.effort === 'Medium'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {t.effort === 'High' ? 'Alto' : t.effort === 'Medium' ? 'Medio' : 'Bajo'}
                        </span>
                      </td>
                      <td className="py-1 px-2">
                        <span className="text-[10px] text-secondary font-medium">{t.context}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tip && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
              <span className="material-symbols-outlined text-[16px] text-amber-500 shrink-0 mt-0.5">
                lightbulb
              </span>
              <div className="leading-snug">
                <span className="font-semibold block">Consejo Estratégico:</span>
                <span>{tip}</span>
              </div>
            </div>
          )}
        </div>
      )
    }

    // 2. Detección de tablas markdown en el texto plano (| Col 1 | Col 2 |)
    if (msg.text && msg.text.includes('|') && msg.text.includes('\n')) {
      const lines = msg.text.split('\n')
      const tableLines = []
      const outsideLinesBefore = []
      const outsideLinesAfter = []
      let insideTable = false

      for (const line of lines) {
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
          insideTable = true
          tableLines.push(line)
        } else if (insideTable) {
          outsideLinesAfter.push(line)
        } else {
          outsideLinesBefore.push(line)
        }
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split('|')
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          .map((c) => c.trim())

        const bodyRows = tableLines
          .slice(2)
          .map((rowStr) =>
            rowStr
              .split('|')
              .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
              .map((c) => c.trim())
          )

        return (
          <div className="space-y-2">
            {outsideLinesBefore.length > 0 && (
              <p className="whitespace-pre-line">{outsideLinesBefore.join('\n')}</p>
            )}
            <div className="overflow-x-auto rounded-xl border border-outline-variant/30 my-1">
              <table className="w-full text-[11px] text-left border-collapse bg-surface-pure/60">
                <thead>
                  <tr className="bg-surface-muted/80 text-secondary border-b border-outline-variant/30">
                    {headerCells.map((h, i) => (
                      <th key={i} className="py-1.5 px-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {bodyRows.map((r, ri) => (
                    <tr key={ri} className="hover:bg-surface-muted/30 transition-colors">
                      {r.map((cell, ci) => (
                        <td key={ci} className="py-1 px-2 font-medium">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {outsideLinesAfter.length > 0 && (
              <p className="whitespace-pre-line">{outsideLinesAfter.join('\n')}</p>
            )}
          </div>
        )
      }
    }

    // 3. Renderizado normal
    return <p className="whitespace-pre-line">{msg.text}</p>
  }

  return (
    <>
      {/* Botón Flotante Global: El Logo Es Todo El Botón (Fondo Blanco, Silueta Azul, Sombra Elevada) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Abrir Asistente IA"
        title={isOpen ? 'Cerrar Copiloto IA' : 'Copiloto IA (Control Total)'}
        className={`fixed z-40 transition-all duration-300 shadow-xl flex items-center justify-center group cursor-pointer ${
          isOpen
            ? 'bottom-[72px] right-3.5 sm:bottom-6 sm:right-6 bg-white dark:bg-[#16181f] text-on-surface border border-slate-300 dark:border-slate-700 scale-95 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl'
            : 'bottom-[72px] right-3.5 sm:bottom-6 sm:right-6 bg-white dark:bg-[#16181f] text-on-surface border border-slate-200/90 dark:border-slate-800 hover:border-primary/50 active:scale-95 hover:shadow-2xl w-12 h-12 sm:w-14 sm:h-14 rounded-2xl'
        } backdrop-blur-md`}
      >
        <div className="relative flex items-center justify-center">
          {isOpen ? (
            <span className="material-symbols-outlined text-[24px] text-slate-700 dark:text-slate-300 transition-transform duration-300">
              close
            </span>
          ) : (
            <AIBotIcon
              className="w-10 h-10 shrink-0 transition-transform duration-300 group-hover:scale-108 drop-shadow-sm"
              size={40}
              showBackground={false}
              primaryColor="#2563EB"
              secondaryColor="#3B82F6"
              accentColor="#60A5FA"
            />
          )}

          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#16181f] shadow-xs">
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Ventana Flotante del Asistente */}
      {isOpen && (
        <div
          className="fixed bottom-36 right-3 sm:bottom-22 sm:right-6 z-50 w-[94vw] sm:w-[420px] h-[550px] max-h-[82vh] bg-surface-pure/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-outline-variant/40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Cabecera del Copiloto */}
          <div className="px-4 py-3 border-b border-surface-muted bg-surface-subtle/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <AIBotIcon className="w-8 h-8 rounded-xl shrink-0 shadow-xs" size={32} />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-headline-sm text-sm font-bold text-on-surface">AI Helper</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="En línea y sincronizado"></span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                title="Limpiar conversación"
                className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">restart_alt</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Cerrar"
                className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">close</span>
              </button>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm">
            {/* Sugerencias Rápidas Iniciales */}
            {messages.length <= 1 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider block">
                  Preguntas sugeridas:
                </span>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSendMessage('¿Qué cosas tengo que hacer hoy?')}
                    className="text-left px-3 py-2 rounded-xl bg-surface-subtle hover:bg-surface-muted border border-outline-variant/30 text-xs text-on-surface transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <span>¿Qué cosas tengo que hacer hoy?</span>
                    <span className="material-symbols-outlined text-[14px] text-secondary group-hover:text-primary">arrow_forward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('Añade 2 ejercicios de mates para el jueves que duran 50m cada uno')}
                    className="text-left px-3 py-2 rounded-xl bg-surface-subtle hover:bg-surface-muted border border-outline-variant/30 text-xs text-on-surface transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <span>Añade 2 ejercicios de mates para el jueves (50m)</span>
                    <span className="material-symbols-outlined text-[14px] text-secondary group-hover:text-primary">arrow_forward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('Tengo clase de pádel todos los miércoles a las 7')}
                    className="text-left px-3 py-2 rounded-xl bg-surface-subtle hover:bg-surface-muted border border-outline-variant/30 text-xs text-on-surface transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <span>Clase de pádel todos los miércoles a las 19:00</span>
                    <span className="material-symbols-outlined text-[14px] text-secondary group-hover:text-primary">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary-container text-on-primary rounded-tr-none shadow-xs'
                      : 'bg-surface-subtle text-on-surface rounded-tl-none border border-outline-variant/30 shadow-2xs'
                  }`}
                >
                  {renderMessageBody(msg)}

                  {/* Banners dinámicos de acciones ejecutadas por la IA */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-outline-variant/30 flex flex-col gap-1.5">
                      {msg.actions.map((act, idx) => {
                        if (act.type === 'add_tasks' && act.tasks) {
                          return (
                            <div key={idx} className="flex flex-col gap-1">
                              <span className="font-code-sm text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                {act.tasks.length === 1 ? 'Tarea añadida al calendario:' : `${act.tasks.length} tareas añadidas:`}
                              </span>
                              {act.tasks.map((t, ti) => (
                                <div key={ti} className="px-2 py-1 rounded-lg bg-surface-pure border border-outline-variant/30 text-[10px] sm:text-[11px] flex items-center justify-between gap-1.5">
                                  <span className="font-medium text-on-surface truncate">{t.title}</span>
                                  <span className="font-code-sm text-secondary shrink-0">{t.date} • {t.time}</span>
                                </div>
                              ))}
                            </div>
                          )
                        }
                        if (act.type === 'move_calendar_events') {
                          return (
                            <div key={idx} className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-[11px] flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                              <span className="material-symbols-outlined text-[14px]">sync_alt</span>
                              <span className="font-medium">
                                Eventos movidos de "{act.sourceCalendarName}" al rol/calendario "{act.targetCalendarName || act.targetContext}"
                              </span>
                            </div>
                          )
                        }
                        if (act.type === 'update_task') {
                          return (
                            <div key={idx} className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-[11px] flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                              <span className="material-symbols-outlined text-[14px]">edit_calendar</span>
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
                            <div key={idx} className="px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 text-[11px] flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                              <span className="material-symbols-outlined text-[14px]">update</span>
                              <span className="font-medium">
                                Recurrencia semanal activada ({act.count || 4} semanas programadas)
                              </span>
                            </div>
                          )
                        }
                        if (act.type === 'complete_task') {
                          return (
                            <div key={idx} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-[11px] flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                              <span className="material-symbols-outlined text-[14px]">task_alt</span>
                              <span className="font-medium">Tarea marcada como completada</span>
                            </div>
                          )
                        }
                        if (act.type === 'delete_task') {
                          return (
                            <div key={idx} className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/80 text-[11px] flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                              <span className="font-medium">Tarea eliminada correctamente</span>
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  )}
                </div>
                <span className="font-code-sm text-[10px] text-secondary mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 p-2 bg-surface-subtle rounded-xl w-fit border border-outline-variant/30">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-ping"></span>
                <span className="font-code-sm text-xs text-secondary">Analizando agenda con IA...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Barra de Entrada de Mensaje */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="p-3 border-t border-surface-muted bg-surface-subtle/50 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pregunta algo o di 'Añade x a mis tareas'..."
              className="flex-1 h-10 px-3.5 bg-surface-pure rounded-xl border border-outline-variant/30 text-xs sm:text-sm text-on-surface placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="h-10 w-10 rounded-xl bg-primary-container text-on-primary disabled:opacity-40 hover:bg-primary transition-all flex items-center justify-center shrink-0 shadow-xs cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
