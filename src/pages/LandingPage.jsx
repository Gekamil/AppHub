import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LandingPage.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('semanal')
  const [isIosModalOpen, setIsIosModalOpen] = useState(false)
  const [currentTimeStr, setCurrentTimeStr] = useState('16:03 : 07')
  const cardRef = useRef(null)
  const orb1Ref = useRef(null)
  const orb2Ref = useRef(null)
  const orb3Ref = useRef(null)
  const spotlightRef = useRef(null)
  const progressBarRef = useRef(null)

  // Reloj de precision Madrid
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
      const parts = formatter.formatToParts(now)
      const h = parts.find((p) => p.type === 'hour')?.value || '12'
      const m = parts.find((p) => p.type === 'minute')?.value || '00'
      const s = parts.find((p) => p.type === 'second')?.value || '00'
      setCurrentTimeStr(`${h}:${m} : ${s}`)
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Spotlight mouse aura ultra fluido a 120 FPS sin re-renders de React
  useEffect(() => {
    let rafMouseId = null
    const handleMouseMove = (e) => {
      if (rafMouseId) cancelAnimationFrame(rafMouseId)
      rafMouseId = requestAnimationFrame(() => {
        if (spotlightRef.current) {
          spotlightRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`
        }
      })
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      if (rafMouseId) cancelAnimationFrame(rafMouseId)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  // Scroll progress y parallax en esferas de luz con aceleracion GPU
  useEffect(() => {
    let rafScrollId = null
    const handleScroll = () => {
      if (rafScrollId) cancelAnimationFrame(rafScrollId)
      rafScrollId = requestAnimationFrame(() => {
        const winScroll = document.documentElement.scrollTop || document.body.scrollTop
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0

        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${scrolled}%`
        }
        if (orb1Ref.current) orb1Ref.current.style.transform = `translate3d(-50%, ${winScroll * 0.1}px, 0)`
        if (orb2Ref.current) orb2Ref.current.style.transform = `translate3d(0, ${winScroll * -0.06}px, 0)`
        if (orb3Ref.current) orb3Ref.current.style.transform = `translate3d(0, ${winScroll * -0.12}px, 0)`
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      if (rafScrollId) cancelAnimationFrame(rafScrollId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // IntersectionObserver para animaciones de revelado
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
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Efecto 3D Tilt táctil y ratón sobre el mockup
  const handleCardMove = (clientX, clientY) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -5
    const rotateY = ((x - centerX) / centerX) * 5
    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`
  }

  const handleCardLeave = () => {
    const card = cardRef.current
    if (!card) return
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
  }

  return (
    <div className="landing-root bg-[#0e0e10] text-[#e5e1e4] antialiased selection:bg-[#7928ca] selection:text-[#eeefff] min-h-screen relative overflow-x-hidden font-sans">
      {/* Interactive Mouse Spotlight Aura */}
      <div
        ref={spotlightRef}
        className="fixed top-0 left-0 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-[#dbb8ff]/10 via-[#00eefc]/10 to-[#00e293]/10 blur-[130px] opacity-70 pointer-events-none -z-10 will-change-transform"
        style={{
          transform: 'translate3d(-500px, -500px, 0) translate(-50%, -50%)',
        }}
      />

      {/* Fixed Top Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-[#353437] z-[100] pointer-events-none">
        <div
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-[#dbb8ff] via-[#00eefc] to-[#00e293] shadow-[0_0_12px_rgba(219,184,255,0.7)] will-change-[width]"
          style={{ width: '0%' }}
        />
      </div>

      {/* Ambient Glow Spheres (Cinematic Parallax Background) */}
      <div
        ref={orb1Ref}
        className="fixed -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[520px] bg-[#7928ca]/25 blur-[150px] rounded-full pointer-events-none -z-10 transition-transform duration-300 ease-out"
      />
      <div
        ref={orb2Ref}
        className="fixed top-[45%] -left-64 w-[600px] h-[600px] bg-[#00eefc]/15 blur-[170px] rounded-full pointer-events-none -z-10 transition-transform duration-300 ease-out"
      />
      <div
        ref={orb3Ref}
        className="fixed bottom-10 -right-64 w-[650px] h-[650px] bg-[#dbb8ff]/10 blur-[180px] rounded-full pointer-events-none -z-10 transition-transform duration-300 ease-out"
      />

      {/* NAVBAR MINIMALISTA */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-8 pt-4 pointer-events-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-5 rounded-full bg-[#0e0e10]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.9)] pointer-events-auto">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8.5 h-8.5 rounded-2xl bg-[#2a2a2c] border border-white/[0.08] flex items-center justify-center p-1 shadow-inner group-hover:border-[#dbb8ff]/50 group-hover:shadow-[0_0_15px_rgba(219,184,255,0.3)] transition-all">
              <img
                src="/logo.png"
                alt="StudentHub Logo"
                className="w-full h-full object-contain filter invert group-hover:scale-105 transition-transform rounded-xl"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] font-semibold tracking-tight text-[#e5e1e4]">StudentHub</span>
              <span className="text-[10px] uppercase tracking-wider text-[#988d9f]">Suite Academica</span>
            </div>
          </Link>

          {/* Botones de Accion */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#201f22]/60 border border-white/[0.05]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e293] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e293]" />
              </span>
              <span className="font-mono text-[11px] text-[#988d9f]">v2.4.1 Online</span>
            </div>

            <a
              href="#descargas"
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#cec2d6] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              Descargas
            </a>

            <button
              type="button"
              onClick={() => navigate('/app')}
              className="px-4 py-2 rounded-full text-xs font-semibold bg-[#7928ca] hover:bg-[#8e3ee8] text-white shadow-[0_0_20px_-3px_rgba(121,40,202,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Entrar a la Web App</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full pt-28 pb-16">
        {/* 1. HERO SECTION */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-12 flex flex-col items-center text-center relative z-10 w-full">
          {/* Badge */}
          <div className="hero-enter hero-delay-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2a2a2c]/80 border border-white/[0.08] backdrop-blur-md shadow-inner mb-6 group hover:border-[#dbb8ff]/40 transition-all">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e293] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e293]" />
            </span>
            <span className="font-mono text-xs text-[#cec2d6]">
              Organizador y suite academica todo en uno <span className="text-[#988d9f]">·</span>{' '}
              <span className="text-[#00e293] font-medium">100% Gratis y Privado</span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="hero-enter hero-delay-2 text-4xl sm:text-5xl md:text-6xl font-semibold max-w-4xl tracking-tight leading-[1.15] mb-6">
            El organizador definitivo para estudiantes que{' '}
            <span className="live-gradient-text inline-block font-bold">no pierden el tiempo</span>
          </h1>

          <p className="hero-enter hero-delay-3 text-base sm:text-lg text-[#988d9f] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            La primera suite academica modular que fusiona radar de examenes con IA, calendario de contextos densos,
            organizador semanal y sincronizacion con bot de WhatsApp.
          </p>

          {/* Cards de Descarga Multiplataforma */}
          <div className="hero-enter hero-delay-4 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 scroll-mt-32" id="descargas">
            {/* Card: Windows (.EXE) */}
            <div className="float-card-1">
              <a
                href="/download/StudentHub-Setup.exe"
                download="StudentHub-Setup.exe"
                className="group relative p-6 rounded-2xl bg-[#1c1b1d]/85 border border-white/[0.08] backdrop-blur-xl shadow-xl hover:border-[#dbb8ff]/60 hover:shadow-[0_12px_45px_-5px_rgba(121,40,202,0.5)] hover:-translate-y-2 transition-all duration-300 text-left flex flex-col justify-between h-full block cursor-pointer"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#dbb8ff]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-[#201f22] flex items-center justify-center text-[#dbb8ff] group-hover:bg-[#7928ca] group-hover:text-white transition-colors shadow-inner">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801" />
                    </svg>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#7928ca]/30 border border-[#dbb8ff]/20 text-[#dbb8ff] font-mono text-[11px] font-semibold">
                    Instalador directo
                  </span>
                </div>
                <div>
                  <div className="text-lg text-[#e5e1e4] font-semibold flex items-center gap-1 group-hover:text-[#dbb8ff] transition-colors">
                    Windows (.EXE)
                    <span className="material-symbols-outlined text-[18px] opacity-0 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all">
                      download
                    </span>
                  </div>
                  <p className="text-xs text-[#988d9f] mt-1.5 leading-normal">
                    Descargar instalador nativo completo para Windows 10 &amp; 11
                  </p>
                  <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[#988d9f] font-mono text-xs">
                    <span>112.8 MB</span>
                    <span className="text-[#00e293] flex items-center gap-1">Verificado</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Card: iOS (iPhone / iPad) */}
            <div className="float-card-2">
              <button
                type="button"
                onClick={() => setIsIosModalOpen(true)}
                className="group relative p-6 rounded-2xl bg-[#1c1b1d]/85 border border-white/[0.08] backdrop-blur-xl shadow-xl hover:border-[#00eefc]/60 hover:shadow-[0_12px_45px_-5px_rgba(0,238,252,0.35)] hover:-translate-y-2 transition-all duration-300 text-left flex flex-col justify-between h-full w-full block cursor-pointer"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#00eefc]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-[#201f22] flex items-center justify-center text-[#00eefc] group-hover:bg-[#00eefc] group-hover:text-[#00363a] transition-colors shadow-inner">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.61-.75 1.04-1.8 0.92-2.87-.9.04-2.02.63-2.65 1.38-.56.65-.99 1.7-0.88 2.73.99.08 2-.49 2.61-1.24Z" />
                    </svg>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#00eefc]/20 border border-[#00eefc]/20 text-[#7df4ff] font-mono text-[11px] font-semibold">
                    iOS 16+
                  </span>
                </div>
                <div>
                  <div className="text-lg text-[#e5e1e4] font-semibold flex items-center gap-1 group-hover:text-[#7df4ff] transition-colors">
                    iPhone / iPad
                    <span className="material-symbols-outlined text-[18px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      open_in_new
                    </span>
                  </div>
                  <p className="text-xs text-[#988d9f] mt-1.5 leading-normal">
                    Instalacion directa Web PWA o Sideload AltStore
                  </p>
                  <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[#988d9f] font-mono text-xs">
                    <span>100% Gratis</span>
                    <span className="text-[#00e293]">Sin coste dev</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Card: Android (.APK) */}
            <div className="float-card-3">
              <a
                href="/download/StudentHub.apk"
                download="StudentHub.apk"
                className="group relative p-6 rounded-2xl bg-[#1c1b1d]/85 border border-white/[0.08] backdrop-blur-xl shadow-xl hover:border-[#00e293]/60 hover:shadow-[0_12px_45px_-5px_rgba(0,226,147,0.35)] hover:-translate-y-2 transition-all duration-300 text-left flex flex-col justify-between h-full block cursor-pointer"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#00e293]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-[#201f22] flex items-center justify-center text-[#00e293] group-hover:bg-[#00e293] group-hover:text-[#003921] transition-colors shadow-inner">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.084 12 8.084s-3.5902.3276-5.1368.8657L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                    </svg>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#006640]/40 border border-[#00e293]/20 text-[#00e293] font-mono text-[11px] font-semibold">
                    APK Nativo
                  </span>
                </div>
                <div>
                  <div className="text-lg text-[#e5e1e4] font-semibold flex items-center gap-1 group-hover:text-[#00e293] transition-colors">
                    Android (.APK)
                    <span className="material-symbols-outlined text-[18px] opacity-0 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all">
                      file_download
                    </span>
                  </div>
                  <p className="text-xs text-[#988d9f] mt-1.5 leading-normal">
                    Descargar e instalar directamente en tu telefono o tablet
                  </p>
                  <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[#988d9f] font-mono text-xs">
                    <span>Nativo</span>
                    <span className="text-[#7df4ff]">Android 10+</span>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Micro-Trust Badges */}
          <div className="hero-enter hero-delay-5 flex flex-wrap items-center justify-center gap-4 text-xs text-[#988d9f]">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00e293] text-[17px]">verified</span>
              <span>100% Gratuito y de codigo abierto</span>
            </div>
            <span className="text-[#39393b]">•</span>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00eefc] text-[17px]">sync_saved_locally</span>
              <span>Sincronizacion Cloud segura</span>
            </div>
            <span className="text-[#39393b]">•</span>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#dbb8ff] text-[17px]">lock</span>
              <span>Cifrado y privacidad garantizada</span>
            </div>
          </div>
        </section>

        {/* 2. DEMO INTERACTIVA & MOCKUP 3D */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-12 relative w-full">
          {/* Header con Switcher Tabs */}
          <div className="reveal-elem flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="font-mono text-xs text-[#00e293] uppercase tracking-wider font-semibold">
                Demostracion en Vivo
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#e5e1e4] mt-1">
                Tu centro de mando academico
              </h2>
            </div>

            {/* Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-[#2a2a2c]/90 border border-white/[0.08] backdrop-blur-md shadow-inner">
              <button
                type="button"
                onClick={() => setActiveView('semanal')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer ${
                  activeView === 'semanal'
                    ? 'bg-[#7928ca] text-white shadow-md font-bold'
                    : 'text-[#cec2d6] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">view_week</span>
                <span>Organizador Semanal</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('mensual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer ${
                  activeView === 'mensual'
                    ? 'bg-[#7928ca] text-white shadow-md font-bold'
                    : 'text-[#cec2d6] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                <span>Calendario Mensual</span>
              </button>
            </div>
          </div>

          {/* Mockup 3D Elevation Container */}
          <div className="mockup-3d-wrap reveal-elem w-full">
            <div
              ref={cardRef}
              onMouseMove={(e) => handleCardMove(e.clientX, e.clientY)}
              onMouseLeave={handleCardLeave}
              onTouchMove={(e) => {
                if (e.touches && e.touches[0]) {
                  handleCardMove(e.touches[0].clientX, e.touches[0].clientY)
                }
              }}
              onTouchEnd={handleCardLeave}
              className="mockup-3d-card relative w-full rounded-2xl bg-[#0e0e10] border border-white/[0.12] p-2.5 sm:p-3.5 shadow-[0_30px_90px_-20px_rgba(121,40,202,0.35)] ring-1 ring-white/[0.05] transition-all"
            >
              {/* Barra de ventana superior */}
              <div className="flex items-center justify-between px-3 py-2 text-[#988d9f] text-xs font-mono border-b border-white/[0.06] mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ffb4ab]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#39393b]" />
                  <div className="w-3 h-3 rounded-full bg-[#00e293]/80" />
                  <span className="ml-2 text-[#cec2d6] text-[11px] hidden sm:inline">
                    StudentHub — Workspace v2.4.1
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-[#201f22] text-[#cec2d6] text-[11px]">
                    Modo Offline Activo
                  </span>
                  <span className="text-[#00e293] text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00e293]" /> Sincronizado
                  </span>
                </div>
              </div>

              {/* Marco de Pantalla */}
              <div className="relative rounded-xl overflow-hidden bg-[#1c1b1d] min-h-[380px] md:min-h-[540px] flex items-center justify-center">
                {activeView === 'semanal' ? (
                  <div className="w-full h-full relative transition-all duration-500 ease-out flex items-center justify-center">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBn6pGApB8ekfSQDgvnjsehJU57qwIrgJ3Y-pq0FRXqrBXl5mj9iDfMcLvr3biWbw88g9EdDyETdSjN9Noj-sg1ENNy0eN9S5qLDYe33U1flLPQS5g-1GqcemSQPKEFwkv_wO4_xnIymoka1vVkaiXBQhS9AgjXYQft7IQqv_liDRE2bzmD8P-W63ydZLd35S9S5KFeDbdfr4N2x4Zj75qc6knypKn9ijz9XjZemrBKhJgp7a1DbPimjRSoD_c1xGtUUIo"
                      alt="StudentHub Organizador Semanal"
                      className="w-full h-auto object-cover rounded-lg shadow-2xl transition-transform duration-700 ease-out hover:scale-[1.01]"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full relative transition-all duration-500 ease-out flex items-center justify-center">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNWBIBjjP7M_XO4I-QJMYdz5TMd-Sk_JvO4W7eMHGXGWdtDTIchhU13wjm_IOMchSabCS1eSCJoYoADmaOe6hZMPcOeQoQtDK-B728md7v_cvukBfct68hpblsBO5ZMOlmNa5z7LqfCSokG3xrQN6NQde032COi58d1IvNZuHjO4MVGbSmzlJRG10mbQnaxpdM9NkORxdPWYl1UCOIOM71f00IlArE0ysJAEEBw4SIMYo8CsXig5c-su0MZ2VRojKQmsM"
                      alt="StudentHub Calendario Mensual"
                      className="w-full h-auto object-cover rounded-lg shadow-2xl transition-transform duration-700 ease-out hover:scale-[1.01]"
                    />
                  </div>
                )}
              </div>

              {/* Barra inferior consola */}
              <div className="mt-2.5 px-3 py-2 rounded-lg bg-[#201f22] flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#988d9f]">
                <div className="flex items-center gap-3">
                  <span className="text-[#e5e1e4] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00e293]" /> Atajos: Ctrl+K / Cmd+K
                  </span>
                  <span className="hidden md:inline">
                    Vista activa:{' '}
                    <span className="text-[#dbb8ff] font-medium">
                      {activeView === 'semanal'
                        ? 'Organizador Semanal & Modo Focus'
                        : 'Calendario & Agenda Mensual'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(activeView === 'semanal' ? '/app' : '/calendar')}
                    className="text-[#00e293] hover:underline flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                  >
                    <span>Abrir en la Web App</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. BENTO GRID FEATURES */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-14 w-full">
          <div className="reveal-elem text-center max-w-3xl mx-auto mb-12">
            <span className="font-mono text-xs text-[#00eefc] font-semibold uppercase tracking-wider">
              Arquitectura Superior
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#e5e1e4] mt-1.5">
              Disenado para la velocidad extrema del semestre real
            </h2>
            <p className="text-sm sm:text-base text-[#988d9f] mt-2.5">
              Sin recargar paginas lentas ni lidiar con interfaces infantiles. Cada detalle esta optimizado
              para ahorrarte segundos cruciales.
            </p>
          </div>

          {/* Grid Bento */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Bento 1: Calendario Envolvente (Span 7) */}
            <div className="reveal-elem md:col-span-7 p-7 rounded-2xl bg-[#1c1b1d]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl relative overflow-hidden flex flex-col justify-between group hover:border-[#dbb8ff]/50 hover:shadow-[0_10px_35px_-5px_rgba(121,40,202,0.35)] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#dbb8ff]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#201f22] flex items-center justify-center text-[#dbb8ff] shadow-inner">
                    <span className="material-symbols-outlined text-[24px]">view_timeline</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2a2a2c] text-[#988d9f] font-mono text-[11px]">
                    v2.4 Core
                  </span>
                </div>
                <h3 className="text-xl text-[#e5e1e4] font-semibold">
                  Calendario Envolvente y Reloj de Precision
                </h3>
                <p className="text-sm text-[#988d9f] mt-2 max-w-lg leading-relaxed">
                  Monitorea el transcurso del dia con reloj sincronizado por segundos, tiempo restante hasta tu
                  proxima entrega y desglose multi-etiqueta sin solapamientos molestos.
                </p>
              </div>

              {/* Widget miniatura */}
              <div className="mt-6 p-4 rounded-xl bg-[#0e0e10]/90 border border-white/[0.05] shadow-inner flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[#988d9f] font-mono text-xs">
                  <span className="text-[#00e293] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00e293] animate-pulse" /> HORA LOCAL MADRID
                  </span>
                  <span className="text-[#e5e1e4] font-medium">{currentTimeStr}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-[#201f22] text-left border border-white/[0.04]">
                    <span className="text-[10px] text-[#988d9f] uppercase block font-mono">Proximo</span>
                    <span className="text-[#e5e1e4] text-xs font-semibold block truncate">Escape Room</span>
                    <span className="font-mono text-[#00eefc] block text-[11px] mt-0.5">En 3h 57m</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#201f22] text-left border border-white/[0.04]">
                    <span className="text-[10px] text-[#988d9f] uppercase block font-mono">Deporte</span>
                    <span className="text-[#e5e1e4] text-xs font-semibold block truncate">Padel Club</span>
                    <span className="font-mono text-[#00e293] block text-[11px] mt-0.5">19:00h Sab</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#201f22] text-left border border-white/[0.04]">
                    <span className="text-[10px] text-[#988d9f] uppercase block font-mono">Estudio</span>
                    <span className="text-[#e5e1e4] text-xs font-semibold block truncate">Seguridad SO</span>
                    <span className="font-mono text-[#ffb4ab] block text-[11px] mt-0.5">Examen 1d</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento 2: Radar de Exámenes Inteligente (Span 5) */}
            <div className="reveal-elem md:col-span-5 p-7 rounded-2xl bg-[#1c1b1d]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl relative overflow-hidden flex flex-col justify-between group hover:border-[#00eefc]/50 hover:shadow-[0_10px_35px_-5px_rgba(0,238,252,0.3)] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00eefc]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#201f22] flex items-center justify-center text-[#00eefc] shadow-inner">
                    <span className="material-symbols-outlined text-[24px]">radar</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#00eefc]/20 text-[#7df4ff] font-mono text-[11px] font-semibold">
                    Proactivo
                  </span>
                </div>
                <h3 className="text-xl text-[#e5e1e4] font-semibold">Radar Inteligente de Examenes</h3>
                <p className="text-sm text-[#988d9f] mt-2 leading-relaxed">
                  Algoritmo de espaciado temporal que detecta fechas de examenes y crea automaticamente hitos de
                  repaso progresivo antes de que sea tarde.
                </p>
              </div>

              {/* Widget radar */}
              <div className="mt-6 p-4 rounded-xl bg-[#0e0e10]/90 border border-white/[0.05] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00eefc] text-[20px]">school</span>
                    <span className="text-xs font-semibold text-[#e5e1e4]">Examen Sistemas Seguros</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#93000a]/40 text-[#ffb4ab] font-mono text-[11px] font-semibold">
                    Cuenta atras: 24h
                  </span>
                </div>
                <div className="w-full bg-[#2a2a2c] h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-gradient-to-r from-[#00eefc] to-[#7928ca] h-full w-[85%] rounded-full shadow-[0_0_10px_rgba(0,238,252,0.5)]" />
                </div>
                <span className="font-mono text-[11px] text-[#988d9f] text-right mt-1">
                  Fase de repaso activo recomendada (85% lista)
                </span>
              </div>
            </div>

            {/* Bento 3: WhatsApp Bot & Modo Focus (Span 5) */}
            <div className="reveal-elem md:col-span-5 p-7 rounded-2xl bg-[#1c1b1d]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl relative overflow-hidden flex flex-col justify-between group hover:border-[#00e293]/50 hover:shadow-[0_10px_35px_-5px_rgba(0,226,147,0.3)] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00e293]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#201f22] flex items-center justify-center text-[#00e293] shadow-inner">
                    <span className="material-symbols-outlined text-[24px]">chat</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#006640]/30 text-[#00e293] font-mono text-[11px] font-semibold">
                    WhatsApp Sync
                  </span>
                </div>
                <h3 className="text-xl text-[#e5e1e4] font-semibold">WhatsApp Bot &amp; Modo Focus</h3>
                <p className="text-sm text-[#988d9f] mt-2 leading-relaxed">
                  ¿Vas de camino a clase? Envia una nota de voz o mensaje a tu bot de WhatsApp y StudentHub lo
                  transcribira e insertara como evento o tarea al instante.
                </p>
              </div>

              <div className="mt-6 p-3.5 rounded-xl bg-[#0e0e10]/90 border border-white/[0.05] font-mono text-xs text-[#cec2d6] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#006640]/50 text-[#00e293] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </div>
                <div className="truncate">
                  <span className="text-[#00e293] font-medium">"Examen de redes el jueves a las 9"</span>
                  <span className="text-[#988d9f] block text-[10px] mt-0.5">Interpretado y agendado en 0.4s</span>
                </div>
              </div>
            </div>

            {/* Bento 4: Entrada con Lenguaje Natural (Span 7) */}
            <div className="reveal-elem md:col-span-7 p-7 rounded-2xl bg-[#1c1b1d]/80 border border-white/[0.08] backdrop-blur-xl shadow-xl relative overflow-hidden flex flex-col justify-between group hover:border-[#dbb8ff]/50 hover:shadow-[0_10px_35px_-5px_rgba(121,40,202,0.35)] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#dbb8ff]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#201f22] flex items-center justify-center text-[#dbb8ff] shadow-inner">
                    <span className="material-symbols-outlined text-[24px]">bolt</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2a2a2c] text-[#988d9f] font-mono text-[11px]">
                    NL Parser 2.0
                  </span>
                </div>
                <h3 className="text-xl text-[#e5e1e4] font-semibold">Entrada con Lenguaje Natural Sin Pausas</h3>
                <p className="text-sm text-[#988d9f] mt-2 max-w-lg leading-relaxed">
                  Escribe como piensas en el campo superior: fechas, etiquetas de contexto y recordatorios se
                  asignan automaticamente sin tocar el raton.
                </p>
              </div>

              {/* Mock input */}
              <div className="mt-6 p-2.5 rounded-xl bg-[#0e0e10]/90 border border-white/[0.05] shadow-inner flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-[#988d9f] w-full px-2">
                  <span className="material-symbols-outlined text-[#00eefc] text-[20px]">add_circle</span>
                  <span className="text-xs text-[#cec2d6] truncate">
                    Deberes de sistemas el viernes, Gym a las 16:30...
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="px-4 py-2 rounded-lg bg-[#7928ca] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shrink-0 hover:bg-[#8e3ee8] transition-all cursor-pointer"
                >
                  <span>Probar</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SECCION FINAL DE DESCARGA & STATS */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-14 relative w-full my-6">
          <div className="reveal-elem relative rounded-3xl bg-[#0e0e10] border border-white/[0.1] p-8 md:p-14 overflow-hidden shadow-[0_25px_90px_-20px_rgba(121,40,202,0.3)] text-center flex flex-col items-center">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#7928ca]/30 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00eefc]/20 blur-[120px] rounded-full pointer-events-none" />
            <span className="font-mono text-xs text-[#00e293] uppercase tracking-wider font-semibold">
              Descarga Inmediata · v2.4.1
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#e5e1e4] mt-2 max-w-3xl leading-tight">
              Empieza a organizar tu vida academica hoy
            </h2>
            <p className="text-sm sm:text-base text-[#988d9f] max-w-xl mt-3 mb-8">
              Sin tarjetas de credito, sin suscripciones trampa. Construido por y para estudiantes exigentes.
            </p>

            {/* Botones de Descarga */}
            <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-2xl mb-10">
              <a
                href="/download/StudentHub-Setup.exe"
                download="StudentHub-Setup.exe"
                className="flex-1 min-w-[200px] flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-[#7928ca] hover:bg-[#8e3ee8] text-white text-sm font-semibold transition-all duration-300 shadow-[0_0_25px_-5px_rgba(121,40,202,0.7)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                <span>Windows (.EXE)</span>
              </a>

              <button
                type="button"
                onClick={() => setIsIosModalOpen(true)}
                className="flex-1 min-w-[200px] flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] border border-white/[0.08] text-[#e5e1e4] text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">phone_iphone</span>
                <span>iPhone / iOS</span>
              </button>

              <a
                href="/download/StudentHub.apk"
                download="StudentHub.apk"
                className="flex-1 min-w-[200px] flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] border border-white/[0.08] text-[#e5e1e4] text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">android</span>
                <span>Android (.APK)</span>
              </a>
            </div>

            {/* Live Trust Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-white/[0.06] w-full max-w-3xl">
              <div className="flex flex-col items-center">
                <span className="text-2xl text-[#dbb8ff] font-bold">+12,400</span>
                <span className="text-xs text-[#988d9f] mt-0.5">Descargas este mes</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl text-[#7df4ff] font-bold">4.9 / 5.0</span>
                <span className="text-xs text-[#988d9f] mt-0.5">Valoracion alumnos</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl text-[#00e293] font-bold">100%</span>
                <span className="text-xs text-[#988d9f] mt-0.5">Codigo Abierto</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl text-[#e5e1e4] font-bold">0 €</span>
                <span className="text-xs text-[#988d9f] mt-0.5">Siempre gratuito</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#0a0a0c] border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-[#2a2a2c] border border-white/[0.08] flex items-center justify-center p-0.5 shadow-inner">
              <img
                src="/logo.png"
                alt="StudentHub Logo"
                className="w-full h-full object-contain filter invert opacity-90 rounded-lg"
              />
            </div>
            <span className="text-base text-[#e5e1e4] font-semibold tracking-tight">StudentHub</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#988d9f]">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Abrir Web App
            </button>
            <span>•</span>
            <a href="#descargas" className="hover:text-white transition-colors">
              Descargas
            </a>
            <span>•</span>
            <p>© 2025 StudentHub. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* MODAL DE INSTALACIÓN iOS / iPHONE */}
      {isIosModalOpen && (
        <div
          onClick={() => setIsIosModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1c1b1d] rounded-3xl border border-white/[0.12] p-6 max-w-md w-full shadow-2xl flex flex-col gap-5 text-left cursor-default animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00eefc]/20 text-[#00eefc] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">phone_iphone</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Instalar StudentHub en iPhone / iPad</h3>
                  <p className="text-[11px] text-[#988d9f]">100% Gratuito y sin suscripciones</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIosModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#988d9f] hover:text-white hover:bg-white/[0.08] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              {/* Opcion A: Instalacion Web Directa */}
              <div className="p-3.5 rounded-2xl bg-[#201f22] border border-[#00e293]/30 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#006640]/40 text-[#00e293] font-mono text-[10px] font-bold">
                    Recomendada · Inmediata
                  </span>
                  <span className="text-white font-semibold">Web App Nativa (PWA)</span>
                </div>
                <p className="text-[#cec2d6] text-[11px] leading-relaxed">
                  1. Abre StudentHub en Safari en tu iPhone.<br />
                  2. Pulsa el boton Compartir en Safari (icono de cuadrado con flecha hacia arriba).<br />
                  3. Selecciona <strong>"Anadir a pantalla de inicio"</strong>.<br />
                  4. La app se abrira a pantalla completa como una aplicacion nativa sin bordes de navegador.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsIosModalOpen(false)
                    navigate('/app')
                  }}
                  className="mt-1 w-full py-2 rounded-xl bg-[#00e293] hover:bg-[#50ffaf] text-[#003921] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  <span>Abrir Web App en Safari</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>

              {/* Opcion B: Sideloading AltStore */}
              <div className="p-3.5 rounded-2xl bg-[#201f22] border border-white/[0.08] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#7928ca]/30 text-[#dbb8ff] font-mono text-[10px] font-bold">
                    Sideloading
                  </span>
                  <span className="text-white font-semibold">Paquete Nativo IPA</span>
                </div>
                <p className="text-[#cec2d6] text-[11px] leading-relaxed">
                  Para usuarios que prefieran instalar la aplicacion mediante AltStore, SideStore o Sideloadly sin pagar cuenta de Apple Developer.
                </p>
                <a
                  href="/download/StudentHub.ipa"
                  download="StudentHub.ipa"
                  onClick={() => setIsIosModalOpen(false)}
                  className="mt-1 w-full py-2 rounded-xl bg-[#2a2a2c] hover:bg-[#353437] text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-white/[0.08] active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Descargar StudentHub.ipa</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
