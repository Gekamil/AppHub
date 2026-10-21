import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('semanal')
  const [isIosModalOpen, setIsIosModalOpen] = useState(false)
  const [currentTimeStr, setCurrentTimeStr] = useState('16:03:07')
  const spotlightRef = useRef(null)

  // Reloj en tiempo real Europa/Madrid
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

  // Spotlight mouse aura suave a 60-120 FPS
  useEffect(() => {
    let rafId = null
    const handleMouseMove = (e) => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        if (spotlightRef.current) {
          spotlightRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
        }
      })
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  // IntersectionObserver para apariciones suaves
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
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="landing-root bg-[#030712] text-[#f3f4f6] min-h-screen relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Patrón de cuadrícula técnica Refero */}
      <div className="refero-bg-grid fixed inset-0 pointer-events-none z-0 opacity-80" />

      {/* Esferas de luz ambiental */}
      <div className="refero-glow-top" />
      <div className="refero-glow-coral" />
      <div className="refero-glow-cyan" />

      {/* Interactive Mouse Spotlight Aura */}
      <div
        ref={spotlightRef}
        className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-blue-500/10 blur-[120px] pointer-events-none z-0 will-change-transform"
        style={{ transform: 'translate3d(-500px, -500px, 0) translate(-50%, -50%)' }}
      />

      {/* 1. NAVEGACIÓN SUPERIOR FLOTANTE (Refero Glass Pill) */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 pt-4 pointer-events-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-5 rounded-full bg-[#0a0f1d]/80 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] pointer-events-auto transition-all">
          {/* Logo y Marca */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shadow-inner group-hover:border-indigo-400/50 transition-all">
              <span className="w-2.5 h-2.5 bg-[#ff6363] rotate-45 rounded-[2px] shadow-[0_0_8px_rgba(255,99,99,0.9)]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold tracking-tight text-white font-sans">StudentHub</span>
              <span className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                v0.0.8
              </span>
            </div>
          </Link>

          {/* Enlaces del Menú */}
          <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium text-slate-400">
            <a href="#workspace" className="hover:text-white transition-colors">
              Espacio de Trabajo
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Características
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
              <span>GitHub</span>
              <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
            </a>
          </nav>

          {/* Botón de Acción Directa */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="refero-btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Entrar a la Web App</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="landing-main relative z-10 w-full pt-28 pb-20">
        {/* 2. HERO SECTION */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-14 flex flex-col items-center text-center">
          {/* Announcement Pill Tag */}
          <div className="hero-enter hero-delay-1 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 shadow-inner mb-6 hover:border-indigo-400/40 transition-all cursor-default">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-xs font-medium text-slate-300">
              v0.0.8 Disponible <span className="text-slate-600">|</span> Widgets Android & WhatsApp Bot con IA
            </span>
            <span className="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
          </div>

          {/* Monumental Headline */}
          <h1 className="hero-enter hero-delay-2 text-4xl sm:text-6xl lg:text-[68px] font-bold tracking-tight text-white max-w-4xl leading-[1.08] mb-6">
            Domina tu semestre.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Sin caos ni fricción.
            </span>
          </h1>

          {/* Subtítulo Descriptivo */}
          <p className="hero-enter hero-delay-3 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-9 leading-relaxed font-normal">
            El primer centro de mando académico que fusiona radar inteligente de exámenes, calendario de contextos densos,
            organizador de tareas y sincronización bidireccional con tu WhatsApp.
          </p>

          {/* Botones Principales CTA */}
          <div className="hero-enter hero-delay-4 flex flex-wrap items-center justify-center gap-3.5 mb-10 w-full max-w-md">
            <a
              href="#descargas"
              className="refero-btn-primary flex-1 min-w-[190px] py-3 px-5 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Descargar Gratis</span>
            </a>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="refero-btn-secondary flex-1 min-w-[190px] py-3 px-5 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Abrir en Navegador</span>
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </button>
          </div>

          {/* Metadata de Plataformas */}
          <div className="hero-enter hero-delay-5 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="material-symbols-outlined text-[14px]">desktop_windows</span> Windows 10/11
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="material-symbols-outlined text-[14px]">android</span> Android (.APK)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="material-symbols-outlined text-[14px]">phone_iphone</span> iPhone PWA
            </span>
            <span>•</span>
            <span className="text-[#10b981] font-semibold">100% Gratuito y Open Source</span>
          </div>
        </section>

        {/* 3. COCKPIT INTERACTIVO / PRODUCT SHOWCASE (Refero High-Fidelity UI) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6 scroll-mt-24" id="workspace">
          {/* Header de la sección del Cockpit */}
          <div className="reveal-elem flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                Espacio de Trabajo Unificado
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                Tu centro de control en tiempo real
              </h2>
            </div>

            {/* Píldora selector de vistas interactivas */}
            <div className="inline-flex p-1 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveTab('semanal')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'semanal'
                    ? 'bg-white/10 text-white shadow-xs font-semibold border border-white/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">view_week</span>
                <span>Organizador Semanal</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mensual')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'mensual'
                    ? 'bg-white/10 text-white shadow-xs font-semibold border border-white/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">calendar_month</span>
                <span>Calendario Mensual</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('radar')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'radar'
                    ? 'bg-white/10 text-white shadow-xs font-semibold border border-white/10'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">radar</span>
                <span>Radar de Exámenes</span>
              </button>
            </div>
          </div>

          {/* Marco de Navegador Realista y Elegante en Modo Oscuro Puro */}
          <div className="reveal-elem relative rounded-2xl bg-[#090d16] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Barra superior de la ventana */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0a0f1d] border-b border-white/5 font-mono text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="ml-2 px-2.5 py-0.5 rounded bg-white/[0.04] border border-white/5 text-slate-400 text-[11px] hidden sm:inline-block">
                  https://studenthub.workspace/agenda
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-[#10b981]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  <span>Sincronización activa</span>
                </span>
                <span className="text-slate-500 hidden sm:inline">|</span>
                <span className="text-slate-400 hidden sm:inline">{currentTimeStr}</span>
              </div>
            </div>

            {/* Contenido Visual Interactivo según la pestaña activa */}
            <div className="p-4 sm:p-6 min-h-[460px] bg-gradient-to-b from-[#090d16] to-[#06080e] flex flex-col justify-between">
              {activeTab === 'semanal' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Fila de Encabezado del Workspace */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <span>Viernes, 24 de Octubre</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
                          4 actividades planificadas
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Próximo bloque de estudio: <strong className="text-white">Seguridad de Sistemas</strong> a las 09:30 AM
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-mono">
                        Tiempo semanal: 14h 30m
                      </span>
                    </div>
                  </div>

                  {/* Lista de Tareas y Eventos del Día */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {/* Item 1 */}
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-400/30 transition-all flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[18px]">school</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-blue-400 font-semibold">09:30 - 11:30</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-300 font-medium">Universidad</span>
                          </div>
                          <h4 className="text-sm font-semibold text-white mt-0.5">Repaso Examen Seguridad de Sistemas</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Temas 4 a 7: Criptografía asimétrica y firmas digitales.</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-[#ff6363] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 shrink-0">
                        Prioridad Alta
                      </span>
                    </div>

                    {/* Item 2 */}
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-emerald-400/30 transition-all flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[18px]">terminal</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-emerald-400 font-semibold">12:30 - 13:30</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 font-medium">Proyectos</span>
                          </div>
                          <h4 className="text-sm font-semibold text-white mt-0.5">Implementar Endpoints de API en Backend</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Conectar autenticación y validación de tokens.</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-[#10b981] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                        En Curso
                      </span>
                    </div>

                    {/* Item 3 */}
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-purple-400/30 transition-all flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[18px]">fitness_center</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-purple-400 font-semibold">16:30 - 17:45</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 font-medium">Salud & Deporte</span>
                          </div>
                          <h4 className="text-sm font-semibold text-white mt-0.5">Sesión de Torso y Cardio</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Press banca, remo con barra y 20m de intervalos.</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-white/5 shrink-0">
                        Pendiente
                      </span>
                    </div>

                    {/* Item 4 */}
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-amber-400/30 transition-all flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[18px]">restaurant</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-amber-400 font-semibold">20:30</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 font-medium">Personal</span>
                          </div>
                          <h4 className="text-sm font-semibold text-white mt-0.5">Cena en el Centro con Compañeros</h4>
                          <p className="text-xs text-slate-400 mt-0.5">Reserva confirmada en Osteria.</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-white/5 shrink-0">
                        Programado
                      </span>
                    </div>
                  </div>

                  {/* Pills flotantes de sincronización */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Sincronizado vía WhatsApp Bot hace 4 minutos</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono">
                      <span>Presiona / para buscar rápidamente</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'mensual' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <h3 className="text-base font-semibold text-white">Octubre 2026 • Vista Cuadrícula Mensual</h3>
                    <span className="text-xs text-slate-400 font-mono">Soporte iCal Google / Apple Calendar</span>
                  </div>

                  {/* Mini-Grid de Calendario Mensual */}
                  <div className="grid grid-cols-7 gap-2 text-center text-xs">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                      <div key={d} className="font-mono text-slate-500 py-1 font-semibold uppercase text-[11px]">
                        {d}
                      </div>
                    ))}
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                      const isToday = day === 24
                      const hasExam = day === 26
                      const hasEvent = [12, 16, 20, 24, 28].includes(day)
                      return (
                        <div
                          key={day}
                          className={`min-h-[58px] p-1.5 rounded-lg border text-left transition-all ${
                            isToday
                              ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                              : hasExam
                              ? 'bg-red-500/10 border-red-500/30 text-white'
                              : 'bg-white/[0.02] border-white/5 text-slate-300 hover:border-white/20'
                          }`}
                        >
                          <span className={`text-[11px] font-mono ${isToday ? 'font-bold text-indigo-300' : 'text-slate-400'}`}>
                            {day}
                          </span>
                          {hasExam && (
                            <span className="mt-1 block text-[10px] px-1 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold truncate">
                              Examen SO
                            </span>
                          )}
                          {hasEvent && !hasExam && (
                            <span className="mt-1 block text-[10px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 truncate">
                              Entrega Lab
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'radar' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div>
                      <h3 className="text-base font-semibold text-white">Radar Inteligente de Exámenes y Entregas</h3>
                      <p className="text-xs text-slate-400">Algoritmo predictivo de espaciado temporal basado en fechas límite.</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                      1 Examen Inminente
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">Seguridad de Sistemas Operativos</h4>
                        <span className="font-mono text-xs text-[#ff6363] font-bold">En 2 días (Lunes 26)</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-500 to-red-500 h-full w-[85%] rounded-full shadow-[0_0_8px_rgba(255,99,99,0.5)]" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Preparación calculada: 85%</span>
                        <span className="text-emerald-400">Fase: Repaso activo de problemas</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">Redes y Comunicaciones II</h4>
                        <span className="font-mono text-xs text-amber-400 font-bold">En 8 días (Martes 3)</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-[45%] rounded-full" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Preparación calculada: 45%</span>
                        <span className="text-indigo-400">Fase: Estudio de protocolos de enrutamiento</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Barra de atajos y pie del mockup */}
              <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px]">↵ Enter</span>
                  <span>Nueva tarea</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px] ml-2">/</span>
                  <span>Búsqueda instantánea</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>Abrir Workspace Completo</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SECCIÓN DE DESCARGAS MULTIPLATAFORMA (Refero Elevated Cards) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-24" id="descargas">
          <div className="reveal-elem text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Instalación Directa
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1.5">
              Disponible en todos tus dispositivos
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-2.5">
              Descarga la aplicación nativa para tu sistema operativo o accede directamente desde cualquier navegador web.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tarjeta Windows */}
            <div className="reveal-elem refero-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.2)] group-hover:border-blue-400/50 transition-all">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801" />
                    </svg>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 font-mono text-[11px]">
                    Windows 10 / 11
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  Windows (.EXE)
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Instalador nativo completo con notificaciones de escritorio, sincronización silenciosa y arranque ultrarrápido.
                </p>

                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-[16px]">check_circle</span>
                    <span>Instalador oficial 64-bit seguro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-[16px]">check_circle</span>
                    <span>Notificaciones emergentes de tareas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-[16px]">check_circle</span>
                    <span>Atajos de teclado globales</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-5 border-t border-white/5">
                <a
                  href="/download/StudentHub-Setup.exe"
                  download="StudentHub-Setup.exe"
                  className="refero-btn-primary w-full py-3 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-[17px]">download</span>
                  <span>Descargar Instalador (.EXE)</span>
                </a>
                <span className="block text-center text-[11px] font-mono text-slate-500 mt-2">
                  Versión 0.0.8 • 64-bit ejecutable
                </span>
              </div>
            </div>

            {/* Tarjeta Android */}
            <div className="reveal-elem refero-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.2)] group-hover:border-emerald-400/50 transition-all">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.084 12 8.084s-3.5902.3276-5.1368.8657L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                    </svg>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-semibold">
                    Widgets de Inicio
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Android (.APK)
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Widgets interactivos de inicio en modo oscuro y claro real, alarmas sonoras automáticas y sincronización móvil.
                </p>

                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span>
                    <span>Widget de planificación semanal con tachado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span>
                    <span>Widget de calendario con minicuadrícula</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span>
                    <span>Selector de color de acento y modo oscuro</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-5 border-t border-white/5">
                <a
                  href="/download/StudentHub.apk"
                  download="StudentHub.apk"
                  className="refero-btn-primary w-full py-3 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span className="material-symbols-outlined text-[17px]">download</span>
                  <span>Descargar APK Oficial</span>
                </a>
                <span className="block text-center text-[11px] font-mono text-slate-500 mt-2">
                  Android 10 o superior • v0.0.8
                </span>
              </div>
            </div>

            {/* Tarjeta iPhone / Web */}
            <div className="reveal-elem refero-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.2)] group-hover:border-purple-400/50 transition-all">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.61-.75 1.04-1.8 0.92-2.87-.9.04-2.02.63-2.65 1.38-.56.65-.99 1.7-0.88 2.73.99.08 2-.49 2.61-1.24Z" />
                    </svg>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[11px]">
                    iOS / Web PWA
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                  iPhone, iPad & Web
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Instalación instantánea como Progressive Web App (PWA) en Safari a pantalla completa, o acceso directo en tu navegador.
                </p>

                <ul className="mt-5 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400 text-[16px]">check_circle</span>
                    <span>Sin descargas de la App Store</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400 text-[16px]">check_circle</span>
                    <span>Modo sin conexión con caché local</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400 text-[16px]">check_circle</span>
                    <span>Sincronizado con todos tus calendarios</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-5 border-t border-white/5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsIosModalOpen(true)}
                  className="refero-btn-secondary w-full py-3 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer font-semibold"
                >
                  <span className="material-symbols-outlined text-[17px]">install_mobile</span>
                  <span>Ver Cómo Instalar en iPhone</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Abrir directamente en navegador →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 5. BENTO GRID DE CARACTERÍSTICAS (Refero Asymmetric 12-Column Grid) */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-24" id="features">
          <div className="reveal-elem text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold">
              Arquitectura & Capacidades
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-1.5">
              Todo lo que necesitas para tu carrera
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mt-2.5">
              Diseñado meticulosamente para eliminar la fricción entre tus horarios de clase, fechas de exámenes y vida personal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Bento 1: Radar Proactivo de Exámenes (Span 7) */}
            <div className="reveal-elem md:col-span-7 refero-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-[20px]">radar</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-300 font-mono text-[11px] font-semibold">
                    #001 - RADAR PROACTIVO
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white">Radar Inteligente de Exámenes y Repaso</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Detecta automáticamente exámenes y entregas críticas en tus calendarios. El algoritmo calcula el tiempo restante y sugiere bloques de estudio progresivos para evitar atracones de última hora.
                </p>
              </div>

              {/* Mockup visual interior */}
              <div className="mt-6 p-4 rounded-xl bg-[#06080e] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-400 text-[18px]">school</span>
                    <span className="text-xs font-semibold text-white">Seguridad de Sistemas Operativos</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-[10px] font-bold">
                    Quedan 24 horas
                  </span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-red-500 h-full w-[88%] rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Hitos completados: 5 de 6</span>
                  <span className="text-emerald-400">Estado: Listo para examen</span>
                </div>
              </div>
            </div>

            {/* Bento 2: WhatsApp Bot (Span 5) */}
            <div className="reveal-elem md:col-span-5 refero-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px] font-semibold">
                    #002 - MAYORDOMO IA
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white">Mayordomo en WhatsApp</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Mándale notas de voz o mensajes: tu bot transcribe, interpreta horarios y agenda tus tareas al instante sin que tengas que abrir la aplicación.
                </p>
              </div>

              {/* Chat bubble mockup WhatsApp */}
              <div className="mt-6 p-3.5 rounded-xl bg-[#06080e] border border-white/5 space-y-2.5 text-xs font-sans">
                <div className="flex justify-end">
                  <div className="bg-[#005c4b] text-white px-3 py-1.5 rounded-lg rounded-tr-none max-w-[85%] shadow-sm">
                    <span>¿Qué actividades tengo mañana por la tarde?</span>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-[#202c33] text-slate-200 px-3 py-1.5 rounded-lg rounded-tl-none max-w-[90%] shadow-sm space-y-1">
                    <span className="text-emerald-400 font-semibold block text-[11px]">StudentHub AI Butler</span>
                    <span>Mañana tienes 2 actividades: Gimnasio a las 16:30 y Entrega de Redes a las 19:00.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento 3: Widgets de Pantalla de Inicio (Span 5) */}
            <div className="reveal-elem md:col-span-5 refero-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-[20px]">widgets</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono text-[11px] font-semibold">
                    #003 - WIDGETS NATIVOS
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white">Widgets Nativos en Móvil</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Consulta tu día en tu pantalla de inicio con soporte de modo oscuro real, eventos finalizados con tachado automático y botón rápido de voz.
                </p>
              </div>

              {/* Mockup de widget móvil */}
              <div className="mt-6 p-3.5 rounded-xl bg-[#06080e] border border-white/5 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-white/5">
                  <span className="text-indigo-400 font-semibold">HOY • 3 TAREAS</span>
                  <span className="text-[11px] text-emerald-400 font-bold">1 Completada</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-slate-500 line-through">
                    <span>• Clase Álgebra 08:30</span>
                    <span className="text-emerald-500 text-[10px]">Hecho</span>
                  </div>
                  <div className="flex items-center justify-between text-white font-medium">
                    <span>• Repaso Sistemas 11:30</span>
                    <span className="text-indigo-400 text-[10px]">En curso</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>• Gimnasio Torso 16:30</span>
                    <span className="text-slate-500 text-[10px]">16:30</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento 4: Privacidad y Multi-Feed iCal (Span 7) */}
            <div className="reveal-elem md:col-span-7 refero-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-[20px]">sync</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[11px] font-semibold">
                    #004 - SINCRONIZACIÓN Y PRIVACIDAD
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white">Sincronización Total y Arquitectura Local-First</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                  Conecta calendarios iCal externos (Google Calendar, Apple, TeamUp o Campus Virtual). Tus datos se guardan de forma local en tu dispositivo con copia de seguridad instantánea en Cloud Firestore.
                </p>
              </div>

              {/* Badges de integración técnica */}
              <div className="mt-6 grid grid-cols-3 gap-2.5 pt-2">
                <div className="p-2.5 rounded-xl bg-[#06080e] border border-white/5 text-center">
                  <span className="text-xs font-semibold text-white block">Google & Apple</span>
                  <span className="text-[10px] text-slate-400 font-mono">Sync iCal en vivo</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#06080e] border border-white/5 text-center">
                  <span className="text-xs font-semibold text-white block">Local-First</span>
                  <span className="text-[10px] text-slate-400 font-mono">Resistencia offline</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#06080e] border border-white/5 text-center">
                  <span className="text-xs font-semibold text-white block">Groq LPU IA</span>
                  <span className="text-[10px] text-slate-400 font-mono">Respuesta en &lt; 0.5s</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. CALL TO ACTION FINAL */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="reveal-elem refero-card p-8 sm:p-14 rounded-3xl text-center relative overflow-hidden flex flex-col items-center">
            {/* Ambient light inside card */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent blur-[80px] pointer-events-none" />

            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold relative z-10">
              Comienza Ahora · 100% Gratuito
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-2 max-w-2xl leading-tight relative z-10">
              Organiza tu semestre como un profesional
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mt-3 mb-8 font-normal relative z-10">
              Sin registros forzosos, sin publicidad y con código abierto para toda la comunidad universitaria.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3.5 w-full max-w-lg mb-10 relative z-10">
              <a
                href="/download/StudentHub-Setup.exe"
                download="StudentHub-Setup.exe"
                className="refero-btn-primary flex-1 min-w-[170px] py-3 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">download</span>
                <span>Windows (.EXE)</span>
              </a>

              <a
                href="/download/StudentHub.apk"
                download="StudentHub.apk"
                className="refero-btn-secondary flex-1 min-w-[170px] py-3 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer font-semibold"
              >
                <span className="material-symbols-outlined text-[17px]">android</span>
                <span>Android (.APK)</span>
              </a>

              <button
                type="button"
                onClick={() => navigate('/app')}
                className="refero-btn-secondary flex-1 min-w-[170px] py-3 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer font-semibold"
              >
                <span className="material-symbols-outlined text-[17px]">open_in_new</span>
                <span>Abrir Web App</span>
              </button>
            </div>

            {/* Métricas de Confianza */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-white/5 w-full max-w-2xl text-center relative z-10 font-mono">
              <div>
                <span className="text-2xl text-white font-bold block">100%</span>
                <span className="text-xs text-slate-500">Gratuito</span>
              </div>
              <div>
                <span className="text-2xl text-white font-bold block">Local-First</span>
                <span className="text-xs text-slate-500">Privacidad total</span>
              </div>
              <div>
                <span className="text-2xl text-white font-bold block">WhatsApp</span>
                <span className="text-xs text-slate-500">Bot con IA</span>
              </div>
              <div>
                <span className="text-2xl text-white font-bold block">v0.0.8</span>
                <span className="text-xs text-slate-500">Última versión</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 7. FOOTER */}
      <footer className="relative z-10 border-t border-white/5 py-8 bg-[#02050c]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#ff6363] rotate-45 rounded-[2px]" />
            <span className="text-sm text-white font-semibold tracking-tight">StudentHub</span>
            <span className="text-xs text-slate-500 font-mono">v0.0.8</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Web App
            </button>
            <a href="#workspace" className="hover:text-white transition-colors">
              Espacio de Trabajo
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
              <span>GitHub</span>
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </a>
          </div>
        </div>
      </footer>

      {/* MODAL GUIADO DE INSTALACIÓN iOS / PWA */}
      {isIosModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="refero-card max-w-md w-full p-6 rounded-2xl relative shadow-2xl border border-white/20">
            <button
              type="button"
              onClick={() => setIsIosModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">phone_iphone</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instalar en iPhone o iPad</h3>
                <p className="text-xs text-slate-400">Sin pasar por la App Store</p>
              </div>
            </div>

            <ol className="space-y-3.5 text-xs text-slate-300 my-5">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Abre <strong className="text-white">Safari</strong> en tu iPhone y entra en la dirección web de StudentHub.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Pulsa el botón <strong className="text-white">Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra inferior.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Baja por las opciones y selecciona <strong className="text-white">"Añadir a pantalla de inicio"</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>
                  Pulsa <strong className="text-white">Añadir</strong>. ¡Listo! Se abrirá como app nativa a pantalla completa.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setIsIosModalOpen(false)}
              className="refero-btn-primary w-full py-2.5 text-xs font-semibold cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
