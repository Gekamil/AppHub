import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('semanal')
  const [isIosModalOpen, setIsIosModalOpen] = useState(false)
  const [currentTimeStr, setCurrentTimeStr] = useState('16:03:07')
  const [simulatedVoiceText, setSimulatedVoiceText] = useState('')
  const [isSimulatingVoice, setIsSimulatingVoice] = useState(false)
  const [hasVoiceTaskAdded, setHasVoiceTaskAdded] = useState(false)

  const handleTriggerVoiceDemo = () => {
    if (isSimulatingVoice) return
    setIsSimulatingVoice(true)
    setSimulatedVoiceText('')
    setHasVoiceTaskAdded(false)

    const phrase = 'Añadir examen de Redes el viernes a las 11:00'
    let i = 0
    const interval = setInterval(() => {
      setSimulatedVoiceText(phrase.slice(0, i + 1))
      i++
      if (i >= phrase.length) {
        clearInterval(interval)
        setIsSimulatingVoice(false)
        setHasVoiceTaskAdded(true)
      }
    }, 40)
  }

  // Refs para orbes atmosféricos con Parallax 3D mediante RAF pasivo
  const orb1Ref = useRef(null)
  const orb2Ref = useRef(null)
  const orb3Ref = useRef(null)
  const orb4Ref = useRef(null)

  // Reloj de precisión Madrid para demo en vivo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      setCurrentTimeStr(formatter.format(now))
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // IntersectionObserver para reveal progresivo escalonado
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-elem')
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Parallax 3D ultra-fluido en GPU sin re-renderizados de React (60+ FPS)
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY
          if (orb1Ref.current) {
            orb1Ref.current.style.transform = `translate3d(-50%, ${y * 0.14}px, 0)`
          }
          if (orb2Ref.current) {
            orb2Ref.current.style.transform = `translate3d(0, ${y * -0.08}px, 0)`
          }
          if (orb3Ref.current) {
            orb3Ref.current.style.transform = `translate3d(0, ${y * -0.12}px, 0)`
          }
          if (orb4Ref.current) {
            orb4Ref.current.style.transform = `translate3d(0, ${y * 0.06}px, 0)`
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="landing-root text-[#f5f5f7] min-h-screen relative overflow-x-hidden selection:bg-[#0071e3]/40 selection:text-white">
      {/* 0. SISTEMA DE FONDO AURORA MULTICAPA & EFECTO GLASSIFY */}
      <div className="aurora-container">
        {/* Cuadrícula Geométrica Iluminada */}
        <div className="aurora-grid" />
        {/* Haz Central Superior Hero (Azul Eléctrico + Índigo Apple) */}
        <div ref={orb1Ref} className="aurora-orb aurora-beam-hero" />
        {/* Orbe Lateral Izquierdo (Cobalto Intenso) */}
        <div ref={orb2Ref} className="aurora-orb aurora-orb-left" />
        {/* Orbe Lateral Derecho (Púrpura / Magenta Apple) */}
        <div ref={orb3Ref} className="aurora-orb aurora-orb-right" />
        {/* Orbe Central Bento (Cian Glaciar) */}
        <div ref={orb4Ref} className="aurora-orb aurora-orb-center" />
        {/* Orbe Inferior Descargas (Esmeralda / Menta Pro) */}
        <div className="aurora-orb aurora-orb-bottom" />
      </div>

      {/* 1. NAVEGACIÓN SUPERIOR ESTILO APPLE CON CRISTAL ESMERILADO */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 pt-4 pointer-events-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-6 rounded-full apple-navbar glassify-nav pointer-events-auto">
          {/* Logo oficial de StudentHub de alta definición */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center p-0.5 shadow-md group-hover:border-white/40 group-hover:scale-105 transition-all overflow-hidden">
              <img
                src="/logo.png"
                alt="StudentHub Logo"
                className="w-full h-full object-contain transition-transform"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight text-white font-sans">StudentHub</span>
              <span className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#86868b]">
                v0.0.8
              </span>
            </div>
          </Link>

          {/* Enlaces de Navegación */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-normal text-[#86868b]">
            <a href="#experiencia" className="hover:text-white transition-colors">
              Experiencia
            </a>
            <a href="#caracteristicas" className="hover:text-white transition-colors">
              Capacidades
            </a>
            <a href="#descargas" className="hover:text-white transition-colors">
              Descargas
            </a>
            <a
              href="https://github.com/Gekamil/AppHub"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Código Fuente</span>
              <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
            </a>
          </nav>

          {/* Botón de Entrada Rápida con micro-interacción Apple Sheen */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="apple-btn-blue apple-btn-sheen text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Abrir Web App</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="landing-main relative z-10 w-full pt-32 pb-24">
        {/* 2. HERO PRINCIPAL CINEMATOGRÁFICO CON REVELADO PROGRESIVO */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-16 flex flex-col items-center text-center">
          {/* Eyebrow de Versión */}
          <span className="reveal-elem text-xs sm:text-sm font-semibold tracking-widest text-[#86868b] uppercase mb-4">
            StudentHub 0.0.8 • Multiplataforma
          </span>

          {/* Titular Monumental en Blanco Puro */}
          <h1 className="reveal-elem stagger-1 text-5xl sm:text-7xl lg:text-[84px] font-semibold tracking-tight text-white max-w-4xl leading-[1.04] mb-6">
            Tu semestre.{' '}
            <span className="text-[#86868b] block sm:inline">Bajo control absoluto.</span>
          </h1>

          {/* Subtítulo sobrio y elegante */}
          <p className="reveal-elem stagger-2 text-lg sm:text-2xl text-[#86868b] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            El primer centro de mando académico que combina radar inteligente de exámenes, calendario de alta densidad y tu propio mayordomo en WhatsApp.
          </p>

          {/* Botones de Acción con Sheen y Feedback Táctil */}
          <div className="reveal-elem stagger-3 flex flex-wrap items-center justify-center gap-4 mb-8 w-full max-w-md">
            <a
              href="#descargas"
              className="apple-btn-blue apple-btn-sheen flex-1 min-w-[190px] text-center flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Descargar Gratis</span>
            </a>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="apple-btn-glass flex-1 min-w-[190px] text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Probar en Navegador</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {/* Píldora Interactiva de Comando por Voz IA (Demostración en Vivo) */}
          <div className="reveal-elem stagger-3 max-w-lg w-full mb-10">
            <button
              type="button"
              onClick={handleTriggerVoiceDemo}
              className="w-full p-2.5 sm:p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 hover:border-white/25 backdrop-blur-md transition-all flex items-center justify-between gap-3 text-left cursor-pointer group shadow-sm active:scale-98"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                  isSimulatingVoice ? 'bg-[#30d158]/20 text-[#30d158] animate-pulse' : 'bg-[#2997ff]/20 text-[#2997ff] group-hover:scale-110'
                }`}>
                  <span className="material-symbols-outlined text-[18px]">mic</span>
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-[#2997ff] font-semibold uppercase tracking-wider">
                    {isSimulatingVoice ? 'Capturando audio en tiempo real...' : hasVoiceTaskAdded ? 'Comando Procesado con Éxito' : 'Dictado por Voz IA • Pruébalo'}
                  </span>
                  <span className="text-xs text-slate-200 truncate font-mono">
                    {simulatedVoiceText || 'Haz clic para dictar: "Añadir examen de Redes el viernes a las 11:00"'}
                  </span>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium shrink-0 transition-colors ${
                hasVoiceTaskAdded ? 'bg-[#30d158]/20 text-[#30d158]' : 'bg-white/10 text-white group-hover:bg-[#2997ff]'
              }`}>
                {isSimulatingVoice ? 'Grabando...' : hasVoiceTaskAdded ? '¡Añadido!' : 'Dictar'}
              </span>
            </button>
          </div>

          {/* Franja de Disponibilidad de Hardware */}
          <div className="reveal-elem stagger-4 flex flex-wrap items-center justify-center gap-4 text-xs text-[#86868b]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="material-symbols-outlined text-[15px]">desktop_windows</span> Windows 10 & 11
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="material-symbols-outlined text-[15px]">android</span> Android (Widgets Nativos)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="material-symbols-outlined text-[15px]">phone_iphone</span> iPhone & iPad PWA
            </span>
            <span>•</span>
            <span className="text-[#30d158] font-medium">100% Gratuito y Open Source</span>
          </div>
        </section>

        {/* 3. SHOWCASE DEL PRODUCTO (Marco MacBook Glass con Interfaz Real en Modo Oscuro) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6 scroll-mt-24" id="experiencia">
          <div className="reveal-elem text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Diseñado para el ritmo real del estudiante
            </h2>
            <p className="text-sm sm:text-base text-[#86868b] mt-2">
              Sin pantallas lentas ni distracciones. Cada segundo y cada entrega están donde deben estar.
            </p>
          </div>

          {/* Marco de Pantalla Hardware con Frosted Glass y Reflejo Superior */}
          <div className="reveal-elem stagger-1 relative apple-device-frame glassify-device-frame p-3 sm:p-4 max-w-5xl mx-auto">
            {/* Barra de ventana macOS */}
            <div className="flex items-center justify-between px-3 py-2 text-xs text-[#86868b] border-b border-white/5 mb-3 font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="ml-3 px-3 py-0.5 rounded-full bg-white/5 text-[#86868b] text-[11px] hidden sm:inline-block">
                  studenthub.workspace
                </span>
              </div>

              {/* Selector de Vistas de la App con Feedback Táctil */}
              <div className="flex items-center p-1 rounded-lg bg-black/50 border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('semanal')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                    activeTab === 'semanal' ? 'bg-[#0071e3] text-white shadow-sm' : 'text-[#86868b] hover:text-white'
                  }`}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('mensual')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                    activeTab === 'mensual' ? 'bg-[#0071e3] text-white shadow-sm' : 'text-[#86868b] hover:text-white'
                  }`}
                >
                  Mes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('radar')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                    activeTab === 'radar' ? 'bg-[#0071e3] text-white shadow-sm' : 'text-[#86868b] hover:text-white'
                  }`}
                >
                  Radar IA
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#30d158]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
                <span className="hidden sm:inline">En vivo</span>
              </div>
            </div>

            {/* Interfaz Interior en Modo Oscuro con Altura Estable (CLS = 0) */}
            <div className="rounded-xl bg-[#0c0c0e]/90 backdrop-blur-xl border border-white/5 p-4 sm:p-6 min-h-[480px] flex flex-col justify-between">
              {activeTab === 'semanal' && (
                <div key="semanal" className="tab-pane-animate space-y-4">
                  {/* Cabecera del día */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Viernes, 24 de Octubre</h3>
                      <p className="text-xs text-[#86868b] mt-0.5">
                        Hora local de Madrid: <span className="text-white font-mono">{currentTimeStr}</span> • 4 actividades programadas
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#86868b]">
                      Próximo: Seguridad de Sistemas (09:30)
                    </span>
                  </div>

                  {/* Grid de eventos del día */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {hasVoiceTaskAdded && (
                      <div className="md:col-span-2 p-3 sm:p-3.5 rounded-xl bg-[#2997ff]/10 border border-[#2997ff]/40 flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2997ff] animate-ping shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-[#2997ff] font-bold">11:00 - 12:30</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2997ff]/20 text-[#2997ff] font-semibold">
                                Creado con Voz IA
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-white block truncate">Examen de Redes y Seguridad</span>
                          </div>
                        </div>
                        <span className="text-xs text-[#30d158] font-mono font-medium shrink-0 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          <span>Sincronizado</span>
                        </span>
                      </div>
                    )}

                    {/* Tarjeta Evento 1 */}
                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 hover:border-white/15 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#2997ff] font-semibold">09:30 - 11:30</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2997ff]/20 text-[#2997ff] font-medium">
                          Universidad
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white mt-2">Seguridad de Sistemas Operativos</h4>
                      <p className="text-xs text-[#86868b] mt-1">Repaso intensivo: Criptografía y firmas digitales.</p>
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#86868b]">
                        <span>Prioridad: Alta</span>
                        <span className="text-[#ff453a]">Examen en 2 días</span>
                      </div>
                    </div>

                    {/* Tarjeta Evento 2 */}
                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 hover:border-white/15 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#30d158] font-semibold">12:30 - 13:30</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30d158]/20 text-[#30d158] font-medium">
                          Proyectos
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white mt-2">Backend API & Sincronización</h4>
                      <p className="text-xs text-[#86868b] mt-1">Revisar endpoints de autenticación y exportación de datos.</p>
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#86868b]">
                        <span>Prioridad: Media</span>
                        <span className="text-[#30d158]">En Curso</span>
                      </div>
                    </div>

                    {/* Tarjeta Evento 3 */}
                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 hover:border-white/15 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#bf5af2] font-semibold">16:30 - 17:45</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#bf5af2]/20 text-[#bf5af2] font-medium">
                          Salud & Deporte
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white mt-2">Sesión de Torso y Movilidad</h4>
                      <p className="text-xs text-[#86868b] mt-1">Press banca, jalones y 15 min de estiramientos.</p>
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#86868b]">
                        <span>Prioridad: Media</span>
                        <span className="text-slate-400">16:30</span>
                      </div>
                    </div>

                    {/* Tarjeta Evento 4 */}
                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 hover:border-white/15 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-[#ff9f0a] font-semibold">20:30</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff9f0a]/20 text-[#ff9f0a] font-medium">
                          Personal
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white mt-2">Cena en Osteria Angelic</h4>
                      <p className="text-xs text-[#86868b] mt-1">Reserva confirmada con el grupo de clase.</p>
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#86868b]">
                        <span>Prioridad: Baja</span>
                        <span className="text-slate-400">Plaza Merced</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'mensual' && (
                <div key="mensual" className="tab-pane-animate space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <h3 className="text-base font-semibold text-white">Octubre 2026 • Calendario Integrado</h3>
                    <span className="text-xs text-[#86868b]">Compatible con Google Calendar y Apple Calendar (iCal)</span>
                  </div>

                  <div className="grid grid-cols-7 gap-2 text-center text-xs">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                      <div key={d} className="font-medium text-[#86868b] py-1 text-[11px]">
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                      const isToday = day === 24
                      const hasExam = day === 26
                      const hasLab = [12, 16, 20, 28].includes(day)
                      return (
                        <div
                          key={day}
                          className={`min-h-[56px] p-2 rounded-xl border text-left transition-all ${
                            isToday
                              ? 'bg-[#0071e3]/20 border-[#0071e3] text-white'
                              : hasExam
                              ? 'bg-[#ff453a]/15 border-[#ff453a]/40 text-white'
                              : 'bg-white/[0.04] border-white/5 text-slate-300'
                          }`}
                        >
                          <span className={`text-[11px] font-mono ${isToday ? 'font-bold text-[#2997ff]' : 'text-[#86868b]'}`}>
                            {day}
                          </span>
                          {hasExam && (
                            <span className="mt-1 block text-[9px] px-1 py-0.5 rounded bg-[#ff453a]/30 text-red-200 font-semibold truncate">
                              Examen SO
                            </span>
                          )}
                          {hasLab && (
                            <span className="mt-1 block text-[9px] px-1 py-0.5 rounded bg-[#2997ff]/20 text-blue-200 truncate">
                              Entrega
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'radar' && (
                <div key="radar" className="tab-pane-animate space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <h3 className="text-base font-semibold text-white">Radar Predictivo de Exámenes</h3>
                      <p className="text-xs text-[#86868b]">Cálculo continuo de preparación según tus horas de estudio registradas.</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#ff453a]/20 text-[#ff453a] font-semibold">
                      1 Examen Inminente
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">Seguridad de Sistemas Operativos</h4>
                        <span className="text-xs text-[#ff453a] font-semibold">En 2 días (Lunes)</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#ff453a] h-full w-[85%] rounded-full" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#86868b]">
                        <span>Preparación: 85%</span>
                        <span className="text-[#30d158]">Fase: Repaso activo</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.04] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">Redes y Comunicaciones</h4>
                        <span className="text-xs text-[#ff9f0a] font-semibold">En 8 días (Martes)</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#ff9f0a] h-full w-[45%] rounded-full" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#86868b]">
                        <span>Preparación: 45%</span>
                        <span className="text-[#2997ff]">Fase: Conceptos teóricos</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pie de pantalla */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#86868b]">
                <span>Sincronización instantánea en local y nube</span>
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="apple-link text-xs cursor-pointer font-medium"
                >
                  <span>Abrir aplicación completa</span>
                  <span>&gt;</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SECCIÓN DE CARACTERÍSTICAS (Estilo Bento Grid de Apple) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24" id="caracteristicas">
          <div className="reveal-elem text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold tracking-widest text-[#86868b] uppercase">
              Capacidades Centrales
            </span>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white mt-2">
              Todo pensado para tu éxito académico.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bento 1: Radar Proactivo */}
            <div className="reveal-elem apple-card stagger-1 p-8 sm:p-10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold tracking-wider text-[#ff453a] uppercase">01 • Radar de Exámenes</span>
                <h3 className="text-2xl sm:text-3xl font-semibold text-white mt-2 leading-tight">
                  Adelántate a las fechas límite antes de que sea tarde.
                </h3>
                <p className="text-sm sm:text-base text-[#86868b] mt-3 leading-relaxed">
                  StudentHub analiza tus calendarios universitarios y planifica automáticamente bloques de estudio progresivos para que llegues al examen con la materia dominada.
                </p>
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-medium">Examen Seguridad de Sistemas</span>
                  <span className="text-[#ff453a] font-semibold">En 48 horas</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#ff453a] h-full w-[85%] rounded-full" />
                </div>
                <span className="text-[11px] text-[#86868b] block">3 bloques de repaso recomendados completados</span>
              </div>
            </div>

            {/* Bento 2: WhatsApp Bot */}
            <div className="reveal-elem apple-card stagger-2 p-8 sm:p-10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold tracking-wider text-[#30d158] uppercase">02 • Mayordomo en WhatsApp</span>
                <h3 className="text-2xl sm:text-3xl font-semibold text-white mt-2 leading-tight">
                  Tu agenda en el bolsillo, con solo una nota de voz.
                </h3>
                <p className="text-sm sm:text-base text-[#86868b] mt-3 leading-relaxed">
                  Mándale un audio de WhatsApp mientras vas a la facultad. La inteligencia artificial transcribe tus palabras, identifica la hora y añade el evento a tu calendario al instante.
                </p>
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs">
                <div className="flex justify-end">
                  <div className="bg-[#005c4b] text-white px-3 py-1.5 rounded-xl rounded-tr-none max-w-[85%]">
                    <span>¿Qué actividades tengo programadas para mañana?</span>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#202c33] text-slate-200 px-3 py-1.5 rounded-xl rounded-tl-none max-w-[90%] space-y-0.5">
                    <span className="text-[#30d158] font-semibold block text-[11px]">Mayordomo StudentHub</span>
                    <span>Tienes 2 actividades: Gimnasio a las 16:30 y Entrega de Redes a las 19:00.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento 3: Widgets Móviles */}
            <div className="reveal-elem apple-card stagger-3 p-8 sm:p-10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold tracking-wider text-[#2997ff] uppercase">03 • Widgets Nativos</span>
                <h3 className="text-2xl sm:text-3xl font-semibold text-white mt-2 leading-tight">
                  Tu día de un vistazo, directo en tu pantalla de inicio.
                </h3>
                <p className="text-sm sm:text-base text-[#86868b] mt-3 leading-relaxed">
                  Widgets oficiales para Android y Windows con adaptación automática a modo oscuro o claro, tachado de tareas completadas y botón rápido de voz.
                </p>
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-[#86868b] pb-1 border-b border-white/5">
                  <span className="text-[#2997ff] font-semibold">HOY • WIDGET SEMANAL</span>
                  <span className="text-[#30d158]">Sincronizado</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-slate-500 line-through">
                    <span>• Clase Álgebra 08:30</span>
                    <span className="text-[#30d158] text-[10px]">Hecho</span>
                  </div>
                  <div className="flex items-center justify-between text-white font-medium">
                    <span>• Repaso Sistemas 11:30</span>
                    <span className="text-[#2997ff] text-[10px]">En curso</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento 4: Privacidad y Local-First */}
            <div className="reveal-elem apple-card stagger-4 p-8 sm:p-10 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold tracking-wider text-[#bf5af2] uppercase">04 • Privacidad Absoluta</span>
                <h3 className="text-2xl sm:text-3xl font-semibold text-white mt-2 leading-tight">
                  Tus datos son tuyos. Sin rastreo ni publicidad.
                </h3>
                <p className="text-sm sm:text-base text-[#86868b] mt-3 leading-relaxed">
                  Arquitectura Local-First. Tu información reside en tu equipo y se sincroniza encriptada en la nube mediante Cloud Firestore. Compatible con cualquier suscripción iCal.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-white font-semibold block">Local-First</span>
                  <span className="text-[10px] text-[#86868b]">Sin conexión</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-white font-semibold block">iCal Sync</span>
                  <span className="text-[10px] text-[#86868b]">Google / Apple</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-white font-semibold block">100% Libre</span>
                  <span className="text-[10px] text-[#86868b]">Open Source</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. SECCIÓN DE DESCARGAS (Estilo Tarjetas Apple con Efecto Frosted Glass) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-24" id="descargas">
          <div className="reveal-elem text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold tracking-widest text-[#86868b] uppercase">
              Multiplataforma
            </span>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white mt-2">
              Descarga StudentHub para tu equipo.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Windows */}
            <div className="reveal-elem apple-card stagger-1 p-8 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-6">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801" />
                  </svg>
                </div>
                <span className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">Windows 10 / 11</span>
                <h3 className="text-2xl font-semibold text-white mt-1">Windows (.EXE)</h3>
                <p className="text-xs sm:text-sm text-[#86868b] mt-2 leading-relaxed">
                  Instalador oficial de 64 bits con notificaciones nativas de escritorio y sincronización en segundo plano.
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-white/5">
                <a
                  href="/download/StudentHub-Setup.exe"
                  download="StudentHub-Setup.exe"
                  className="apple-btn-blue apple-btn-sheen w-full flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <span className="material-symbols-outlined text-[17px]">download</span>
                  <span>Descargar Instalador</span>
                </a>
              </div>
            </div>

            {/* Android */}
            <div className="reveal-elem apple-card stagger-2 p-8 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#30d158] mb-6">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.084 12 8.084s-3.5902.3276-5.1368.8657L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                  </svg>
                </div>
                <span className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">Android 10+</span>
                <h3 className="text-2xl font-semibold text-white mt-1">Android (.APK)</h3>
                <p className="text-xs sm:text-sm text-[#86868b] mt-2 leading-relaxed">
                  Paquete APK oficial con widgets interactivos de pantalla de inicio, modo oscuro real y alarmas sonoras.
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-white/5">
                <a
                  href="/download/StudentHub.apk"
                  download="StudentHub.apk"
                  className="apple-btn-blue apple-btn-sheen w-full flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <span className="material-symbols-outlined text-[17px]">download</span>
                  <span>Descargar APK Oficial</span>
                </a>
              </div>
            </div>

            {/* iPhone / Web */}
            <div className="reveal-elem apple-card stagger-3 p-8 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-6">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.61-.75 1.04-1.8 0.92-2.87-.9.04-2.02.63-2.65 1.38-.56.65-.99 1.7-0.88 2.73.99.08 2-.49 2.61-1.24Z" />
                  </svg>
                </div>
                <span className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">iPhone & Web PWA</span>
                <h3 className="text-2xl font-semibold text-white mt-1">iOS & Navegadores</h3>
                <p className="text-xs sm:text-sm text-[#86868b] mt-2 leading-relaxed">
                  Instalable directamente en Safari a pantalla completa como una app nativa, o accesible desde cualquier navegador.
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-white/5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsIosModalOpen(true)}
                  className="apple-btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer text-xs"
                >
                  <span className="material-symbols-outlined text-[17px]">phone_iphone</span>
                  <span>Guía para iPhone</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. FOOTER ESTILO APPLE CON LOGO NÍTIDO */}
      <footer className="border-t border-white/10 py-10 bg-black/30 backdrop-blur-md text-[#86868b] text-xs relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="StudentHub" className="w-6 h-6 object-contain rounded-md shadow-sm" />
            <span className="text-white font-medium">StudentHub</span>
            <span>•</span>
            <span>© 2026 Jorge. Todos los derechos reservados.</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Web App
            </button>
            <a href="#descargas" className="hover:text-white transition-colors">
              Descargas
            </a>
            <a
              href="https://github.com/Gekamil/AppHub"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* MODAL DE INSTALACIÓN iOS / iPHONE CON ACABADO GLASS */}
      {isIosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="apple-card max-w-md w-full p-6 sm:p-8 text-left relative">
            <button
              type="button"
              onClick={() => setIsIosModalOpen(false)}
              className="absolute top-5 right-5 text-[#86868b] hover:text-white p-1 rounded-full cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center border border-white/10">
                <span className="material-symbols-outlined text-[22px]">phone_iphone</span>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Instalar en iPhone o iPad</h3>
                <p className="text-xs text-[#86868b]">Sin pasar por la App Store</p>
              </div>
            </div>

            <ol className="space-y-4 text-xs text-slate-300 my-6">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Abre <strong className="text-white">Safari</strong> en tu iPhone y entra en StudentHub.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Pulsa el botón <strong className="text-white">Compartir</strong> (icono de cuadrado con flecha hacia arriba).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong>.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setIsIosModalOpen(false)}
              className="apple-btn-blue apple-btn-sheen w-full text-xs font-medium cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
