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
    const rotateX = ((y - centerY) / centerY) * -4
    const rotateY = ((x - centerX) / centerX) * 4
    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`
  }

  const handleCardLeave = () => {
    const card = cardRef.current
    if (!card) return
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
  }

  return (
    <div className="landing-root bg-[#040506] text-[#ffffff] antialiased min-h-screen relative overflow-x-hidden font-sans">
      {/* Interactive Mouse Spotlight Aura */}
      <div
        ref={spotlightRef}
        className="fixed top-0 left-0 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-[#63a1ff]/10 via-[#ff6363]/10 to-[#146ef5]/10 blur-[140px] opacity-60 pointer-events-none -z-10 will-change-transform"
        style={{
          transform: 'translate3d(-500px, -500px, 0) translate(-50%, -50%)',
        }}
      />

      {/* Fixed Top Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-[#1b1c1e] z-[100] pointer-events-none">
        <div
          ref={progressBarRef}
          className="h-full bg-gradient-to-r from-[#ff6363] via-[#63a1ff] to-[#146ef5] shadow-[0_0_12px_rgba(255,99,99,0.7)] will-change-[width]"
          style={{ width: '0%' }}
        />
      </div>

      {/* Atmospheric Hero Gradients (Raycast Signature Composition: Cobalt + Electric Sky + Coral Pulse) */}
      <div
        ref={orb1Ref}
        className="fixed -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-[radial-gradient(ellipse_at_center,_rgba(20,60,163,0.35)_0%,_rgba(4,63,150,0.18)_40%,_transparent_70%)] blur-[120px] rounded-full pointer-events-none -z-10 transition-transform duration-300 ease-out"
      />
      <div
        ref={orb2Ref}
        className="fixed top-[20%] -left-48 w-[600px] h-[450px] bg-[#ff6363]/12 blur-[150px] rounded-full pointer-events-none -z-10 transition-transform duration-300 ease-out"
      />
      <div
        ref={orb3Ref}
        className="fixed bottom-10 -right-48 w-[650px] h-[500px] bg-[#63a1ff]/10 blur-[160px] rounded-full pointer-events-none -z-10 transition-transform duration-300 ease-out"
      />

      {/* GLASS NAVIGATION BAR (Raycast Floating Pill Nav + Webflow Discipline) */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-8 pt-4 pointer-events-none">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4 sm:px-5 rounded-full bg-[#07080a]/85 backdrop-blur-2xl border border-[#363739] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.85)] pointer-events-auto transition-all">
          {/* Brand Logo with Raycast Coral Diamond Mark */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#111214] border border-[#363739] flex items-center justify-center p-1 shadow-inner group-hover:border-[#ff6363]/60 transition-all">
              <span className="w-2.5 h-2.5 bg-[#ff6363] rotate-45 rounded-[2px] shadow-[0_0_8px_rgba(255,99,99,0.8)]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold tracking-tight text-white font-sans">StudentHub</span>
              <span className="hidden sm:inline-block font-mono text-[10px] text-[#6a6b6c] uppercase tracking-wider">
                v0.0.8
              </span>
            </div>
          </Link>

          {/* Nav Links (Ghost links in Ash #9c9c9d hovering to Pure White) */}
          <div className="hidden md:flex items-center gap-6 text-[13px] font-medium text-[#9c9c9d]">
            <a href="#descargas" className="hover:text-white transition-colors cursor-pointer">
              Descargas
            </a>
            <a href="#demo" className="hover:text-white transition-colors cursor-pointer">
              Workspace
            </a>
            <a href="#features" className="hover:text-white transition-colors cursor-pointer">
              Características
            </a>
            <a
              href="https://github.com/Gekamil/AppHub"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>GitHub</span>
              <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
            </a>
          </div>

          {/* Primary Action Button (Raycast Mist #e6e6e6 Action Fill) */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="raycast-mist-btn px-3.5 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <span>Entrar a la Web App</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="landing-main w-full pt-28 pb-16 bg-[#040506]">
        {/* 1. HERO SECTION (Webflow Monumental Headline + Raycast Cockpit Rigor) */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 pt-10 pb-12 flex flex-col items-center text-center relative z-10 w-full">
          {/* Eyebrow Tag in Geist Mono */}
          <div className="hero-enter hero-delay-1 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#111214] border border-[#27272a] shadow-inner mb-6 group hover:border-[#ff6363]/40 transition-all">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6363] shadow-[0_0_6px_rgba(255,99,99,0.9)]" />
            <span className="font-mono text-[11px] text-[#9c9c9d] tracking-wider uppercase">
              SUITE ACADÉMICA MULTIPLATAFORMA <span className="text-[#454647]">|</span>{' '}
              <span className="text-white font-medium">100% LOCAL-FIRST & PRIVADA</span>
            </span>
          </div>

          {/* Monumental Headline: High Contrast, Chiseled Negative Tracking, Crisp Inter */}
          <h1 className="hero-enter hero-delay-2 text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-medium tracking-tight text-white max-w-4xl leading-[1.08] mb-6">
            El organizador definitivo para estudiantes que{' '}
            <span className="text-white relative inline-block">
              no pierden el tiempo.
              <span className="absolute left-0 bottom-1 w-full h-[3px] bg-gradient-to-r from-[#ff6363] via-[#63a1ff] to-[#146ef5] rounded-full" />
            </span>
          </h1>

          {/* Subtitle in Ash #9c9c9d */}
          <p className="hero-enter hero-delay-3 text-base sm:text-lg text-[#9c9c9d] max-w-2xl mx-auto mb-9 leading-relaxed font-normal">
            La primera suite académica modular que fusiona radar de exámenes con IA, calendario de contextos densos,
            organizador semanal y sincronización en tiempo real con WhatsApp.
          </p>

          {/* Primary Action Button Group */}
          <div className="hero-enter hero-delay-4 flex flex-wrap items-center justify-center gap-3.5 mb-10 w-full max-w-md">
            <a
              href="#descargas"
              className="raycast-mist-btn flex-1 min-w-[180px] py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-[17px]">download</span>
              <span>Descargar Aplicación</span>
            </a>
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="flex-1 min-w-[180px] py-2.5 px-4 rounded-lg bg-[#111214] hover:bg-[#1b1c1e] text-white border border-[#363739] hover:border-[#6a6b6c] text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Abrir Web App</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          </div>

          {/* Technical Metadata Strip (Geist Mono 12px with pipes) */}
          <div className="hero-enter hero-delay-5 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-[#6a6b6c] mb-14">
            <span>v0.0.8</span>
            <span>|</span>
            <span>Windows 10 & 11</span>
            <span>|</span>
            <span>Android 10+ (.APK)</span>
            <span>|</span>
            <span>iPhone PWA</span>
            <span>|</span>
            <span className="text-[#59d499]">100% Código Abierto</span>
          </div>

          {/* CARDS DE DESCARGA MULTIPLATAFORMA (Raycast Key-Shadow Stack) */}
          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 text-left scroll-mt-28" id="descargas">
            {/* Card: Windows (.EXE) */}
            <div className="float-card-1">
              <a
                href="/download/StudentHub-Setup.exe"
                download="StudentHub-Setup.exe"
                className="raycast-key-card p-6 rounded-2xl flex flex-col justify-between h-full transition-all group block cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#111214] border border-[#27272a] flex items-center justify-center text-white group-hover:border-[#ff6363]/50 transition-colors">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.949-1.801" />
                      </svg>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#111214] border border-[#27272a] text-[#9c9c9d] font-mono text-[10px] uppercase">
                      Instalador directo
                    </span>
                  </div>
                  <h3 className="text-base text-white font-semibold flex items-center gap-1 group-hover:text-[#ff6363] transition-colors">
                    <span>Windows (.EXE)</span>
                    <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                      download
                    </span>
                  </h3>
                  <p className="text-xs text-[#9c9c9d] mt-1.5 leading-relaxed">
                    Instalador nativo completo con notificaciones de escritorio para Windows 10 y 11.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1b1c1e] flex items-center justify-between font-mono text-[11px] text-[#6a6b6c]">
                  <span>64-bit ejecutable</span>
                  <span className="text-[#59d499] flex items-center gap-1">Verificado</span>
                </div>
              </a>
            </div>

            {/* Card: Android (.APK) */}
            <div className="float-card-2">
              <a
                href="/download/StudentHub.apk"
                download="StudentHub.apk"
                className="raycast-key-card p-6 rounded-2xl flex flex-col justify-between h-full transition-all group block cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#111214] border border-[#27272a] flex items-center justify-center text-white group-hover:border-[#59d499]/50 transition-colors">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.084 12 8.084s-3.5902.3276-5.1368.8657L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                      </svg>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#111214] border border-[#27272a] text-[#59d499] font-mono text-[10px] uppercase">
                      APK Oficial
                    </span>
                  </div>
                  <h3 className="text-base text-white font-semibold flex items-center gap-1 group-hover:text-[#59d499] transition-colors">
                    <span>Android (.APK)</span>
                    <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                      download
                    </span>
                  </h3>
                  <p className="text-xs text-[#9c9c9d] mt-1.5 leading-relaxed">
                    Widgets de pantalla de inicio en modo oscuro y claro, alarmas sonoras y sincronización en segundo plano.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1b1c1e] flex items-center justify-between font-mono text-[11px] text-[#6a6b6c]">
                  <span>Android 10+</span>
                  <span className="text-[#59d499]">Nativo con Widgets</span>
                </div>
              </a>
            </div>

            {/* Card: iOS (iPhone / iPad) */}
            <div className="float-card-3">
              <button
                type="button"
                onClick={() => setIsIosModalOpen(true)}
                className="raycast-key-card p-6 rounded-2xl flex flex-col justify-between h-full transition-all group block cursor-pointer w-full text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#111214] border border-[#27272a] flex items-center justify-center text-white group-hover:border-[#63a1ff]/50 transition-colors">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.87c.61-.75 1.04-1.8 0.92-2.87-.9.04-2.02.63-2.65 1.38-.56.65-.99 1.7-0.88 2.73.99.08 2-.49 2.61-1.24Z" />
                      </svg>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#111214] border border-[#27272a] text-[#63a1ff] font-mono text-[10px] uppercase">
                      iOS 16+
                    </span>
                  </div>
                  <h3 className="text-base text-white font-semibold flex items-center gap-1 group-hover:text-[#63a1ff] transition-colors">
                    <span>iPhone / iPad</span>
                    <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                      open_in_new
                    </span>
                  </h3>
                  <p className="text-xs text-[#9c9c9d] mt-1.5 leading-relaxed">
                    Instalación directa PWA en Safari a pantalla completa o sideload de paquete IPA con AltStore.
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-[#1b1c1e] flex items-center justify-between font-mono text-[11px] text-[#6a6b6c]">
                  <span>PWA o Sideload</span>
                  <span className="text-[#63a1ff]">Instalación Guiada</span>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* 2. DEMO INTERACTIVA & BROWSER MOCKUP (Webflow Realistic Chrome + Raycast Surfaces) */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-14 relative w-full" id="demo">
          {/* Header con Switcher Tabs */}
          <div className="reveal-elem flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="font-mono text-xs text-[#ff6363] uppercase tracking-wider font-semibold">
                Espacio de Trabajo
              </span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-1">
                Tu centro de mando académico
              </h2>
            </div>

            {/* Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-[#07080a] border border-[#27272a] shadow-inner">
              <button
                type="button"
                onClick={() => setActiveView('semanal')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  activeView === 'semanal'
                    ? 'bg-[#1b1c1e] text-white border border-[#363739] shadow-xs font-semibold'
                    : 'text-[#9c9c9d] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">view_week</span>
                <span>Organizador Semanal</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('mensual')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  activeView === 'mensual'
                    ? 'bg-[#1b1c1e] text-white border border-[#363739] shadow-xs font-semibold'
                    : 'text-[#9c9c9d] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">calendar_month</span>
                <span>Calendario Mensual</span>
              </button>
            </div>
          </div>

          {/* Webflow Realistic Browser-Frame Mockup */}
          <div className="mockup-3d-wrap reveal-elem w-full">
            <div
              ref={cardRef}
              onMouseMove={(e) => handleCardMove(e.clientX, e.clientY)}
              onMouseLeave={handleCardLeave}
              className="mockup-3d-card relative w-full rounded-2xl bg-[#07080a] border border-[#27272a] p-2.5 sm:p-3.5 shadow-[rgba(0,0,0,0.5)_0px_20px_50px_0px] ring-1 ring-white/[0.05] transition-all"
            >
              {/* Barra de ventana superior con dots de macOS y campo de dirección URL */}
              <div className="flex items-center justify-between px-3 py-2 text-[#9c9c9d] text-xs font-mono border-b border-[#1b1c1e] mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                  <span className="ml-2 px-2.5 py-0.5 rounded bg-[#111214] text-[#9c9c9d] text-[11px] border border-[#27272a] hidden sm:inline-block">
                    https://studenthub.workspace/agenda
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#59d499] text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#59d499]" /> Sincronización activa
                  </span>
                </div>
              </div>

              {/* Marco de Pantalla */}
              <div className="relative rounded-xl overflow-hidden bg-[#111214] min-h-[380px] md:min-h-[500px] flex items-center justify-center border border-[#1b1c1e]">
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
              <div className="mt-2.5 px-3 py-2 rounded-lg bg-[#111214] flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#6a6b6c] border border-[#1b1c1e]">
                <div className="flex items-center gap-3">
                  <span className="text-[#9c9c9d] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#59d499]" /> Atajos de teclado: / para saltar, Enter para confirmar
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(activeView === 'semanal' ? '/app' : '/calendar')}
                    className="text-white hover:text-[#ff6363] flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    <span>Abrir en la aplicación</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. BENTO GRID FEATURES (Raycast Key Treatment + Webflow Structure) */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-14 w-full" id="features">
          <div className="reveal-elem text-center max-w-2xl mx-auto mb-12">
            <span className="font-mono text-xs text-[#63a1ff] font-semibold uppercase tracking-wider">
              Ingeniería y Rendimiento
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mt-1.5">
              Diseñado para la velocidad del semestre real
            </h2>
            <p className="text-sm sm:text-base text-[#9c9c9d] mt-2.5">
              Sin recargar páginas lentas ni lidiar con interfaces infladas. Cada elemento está pensado para
              ofrecer máxima legibilidad y control inmediato.
            </p>
          </div>

          {/* Grid Bento */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Bento 1: Calendario Envolvente (Span 7) */}
            <div className="reveal-elem md:col-span-7 raycast-key-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#111214] border border-[#27272a] flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[20px]">view_timeline</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#111214] border border-[#27272a] text-[#6a6b6c] font-mono text-[11px]">
                    v0.0.8 Core
                  </span>
                </div>
                <h3 className="text-lg text-white font-semibold">
                  Calendario Envolvente y Reloj de Precisión
                </h3>
                <p className="text-xs sm:text-sm text-[#9c9c9d] mt-2 max-w-lg leading-relaxed">
                  Monitorea el transcurso del día con reloj sincronizado por segundos, tiempo restante hasta tu
                  próxima entrega y desglose multi-etiqueta sin solapamientos molestos.
                </p>
              </div>

              {/* Widget miniatura */}
              <div className="mt-6 p-3.5 rounded-xl bg-[#111214] border border-[#27272a] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[#9c9c9d] font-mono text-xs">
                  <span className="text-[#59d499] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#59d499] animate-pulse" /> HORA LOCAL MADRID
                  </span>
                  <span className="text-white font-medium">{currentTimeStr}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-[#07080a] text-left border border-[#27272a]">
                    <span className="text-[10px] text-[#6a6b6c] uppercase block font-mono">Próximo</span>
                    <span className="text-white text-xs font-semibold block truncate">Escape Room</span>
                    <span className="font-mono text-[#63a1ff] block text-[11px] mt-0.5">En 3h 57m</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#07080a] text-left border border-[#27272a]">
                    <span className="text-[10px] text-[#6a6b6c] uppercase block font-mono">Deporte</span>
                    <span className="text-white text-xs font-semibold block truncate">Pádel Club</span>
                    <span className="font-mono text-[#59d499] block text-[11px] mt-0.5">19:00h Sáb</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#07080a] text-left border border-[#27272a]">
                    <span className="text-[10px] text-[#6a6b6c] uppercase block font-mono">Estudio</span>
                    <span className="text-white text-xs font-semibold block truncate">Seguridad SO</span>
                    <span className="font-mono text-[#ff6363] block text-[11px] mt-0.5">Examen 1d</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento 2: Radar de Exámenes Inteligente (Span 5) */}
            <div className="reveal-elem md:col-span-5 raycast-key-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#111214] border border-[#27272a] flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[20px]">radar</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#111214] border border-[#27272a] text-[#ff6363] font-mono text-[11px] font-semibold">
                    Proactivo
                  </span>
                </div>
                <h3 className="text-lg text-white font-semibold">Radar Inteligente de Exámenes</h3>
                <p className="text-xs sm:text-sm text-[#9c9c9d] mt-2 leading-relaxed">
                  Algoritmo de espaciado temporal que detecta fechas de exámenes y crea automáticamente hitos de
                  repaso progresivo antes de que sea tarde.
                </p>
              </div>

              {/* Widget radar */}
              <div className="mt-6 p-3.5 rounded-xl bg-[#111214] border border-[#27272a] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ff6363] text-[18px]">school</span>
                    <span className="text-xs font-semibold text-white">Examen Sistemas Seguros</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#452324] text-[#ff6363] font-mono text-[10px] font-semibold">
                    En 24h
                  </span>
                </div>
                <div className="w-full bg-[#07080a] h-1.5 rounded-full overflow-hidden mt-2 border border-[#27272a]">
                  <div className="bg-[#ff6363] h-full w-[85%] rounded-full shadow-[0_0_8px_rgba(255,99,99,0.5)]" />
                </div>
                <span className="font-mono text-[10px] text-[#6a6b6c] text-right mt-1">
                  Fase de repaso activo recomendada (85%)
                </span>
              </div>
            </div>

            {/* Bento 3: WhatsApp Bot & Sincronización (Span 5) */}
            <div className="reveal-elem md:col-span-5 raycast-key-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#111214] border border-[#27272a] flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#111214] border border-[#27272a] text-[#59d499] font-mono text-[11px] font-semibold">
                    WhatsApp Bot
                  </span>
                </div>
                <h3 className="text-lg text-white font-semibold">Bot Personal de WhatsApp</h3>
                <p className="text-xs sm:text-sm text-[#9c9c9d] mt-2 leading-relaxed">
                  Envía una nota de voz o un mensaje de texto a tu propio bot: el sistema lo transcribe, interpreta
                  fechas y lo añade a tu agenda al instante.
                </p>
              </div>

              <div className="mt-6 p-3 rounded-xl bg-[#111214] border border-[#27272a] font-mono text-xs text-white flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#59d499]/20 text-[#59d499] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[15px]">send</span>
                </div>
                <div className="truncate">
                  <span className="text-[#59d499] font-medium text-xs">"Examen de redes el jueves a las 9"</span>
                  <span className="text-[#6a6b6c] block text-[10px] mt-0.5">Interpretado y agendado en 0.4s</span>
                </div>
              </div>
            </div>

            {/* Bento 4: Ingesta en Lenguaje Natural (Span 7) */}
            <div className="reveal-elem md:col-span-7 raycast-key-card p-7 rounded-2xl flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#111214] border border-[#27272a] flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-[20px]">bolt</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#111214] border border-[#27272a] text-[#9c9c9d] font-mono text-[11px]">
                    Fast Ingestion
                  </span>
                </div>
                <h3 className="text-lg text-white font-semibold">Entrada con Lenguaje Natural Sin Pausas</h3>
                <p className="text-xs sm:text-sm text-[#9c9c9d] mt-2 max-w-lg leading-relaxed">
                  Escribe de forma natural: fechas, roles de contexto y alarmas se reconocen sin tener que tocar
                  desplegables ni formularios lentos.
                </p>
              </div>

              {/* Mock input */}
              <div className="mt-6 p-2 rounded-xl bg-[#111214] border border-[#27272a] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#9c9c9d] w-full px-2">
                  <span className="material-symbols-outlined text-[#63a1ff] text-[18px]">add_circle</span>
                  <span className="text-xs text-[#9c9c9d] truncate">
                    Deberes de seguridad el viernes, Gym a las 16:30...
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app')}
                  className="px-3 py-1.5 rounded-md bg-[#e6e6e6] text-[#1b1c1e] text-xs font-semibold shrink-0 hover:bg-white transition-all cursor-pointer"
                >
                  <span>Probar</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SECCIÓN FINAL CTA */}
        <section className="max-w-5xl mx-auto px-4 md:px-8 py-14 relative w-full my-6">
          <div className="reveal-elem raycast-key-card p-8 md:p-14 rounded-3xl text-center flex flex-col items-center relative overflow-hidden">
            <span className="font-mono text-xs text-[#ff6363] uppercase tracking-wider font-semibold">
              Acceso Inmediato · v0.0.8
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-white mt-2 max-w-2xl leading-tight">
              Empieza a organizar tu vida académica hoy
            </h2>
            <p className="text-sm sm:text-base text-[#9c9c9d] max-w-xl mt-3 mb-8 font-normal">
              Sin suscripciones trampa ni anuncios. Diseñado por y para estudiantes exigentes.
            </p>

            {/* Botones de Descarga */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-xl mb-10">
              <a
                href="/download/StudentHub-Setup.exe"
                download="StudentHub-Setup.exe"
                className="raycast-mist-btn flex-1 min-w-[170px] py-3 px-4 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[17px]">download</span>
                <span>Windows (.EXE)</span>
              </a>

              <a
                href="/download/StudentHub.apk"
                download="StudentHub.apk"
                className="flex-1 min-w-[170px] py-3 px-4 rounded-lg bg-[#111214] hover:bg-[#1b1c1e] text-white border border-[#363739] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">android</span>
                <span>Android (.APK)</span>
              </a>

              <button
                type="button"
                onClick={() => setIsIosModalOpen(true)}
                className="flex-1 min-w-[170px] py-3 px-4 rounded-lg bg-[#111214] hover:bg-[#1b1c1e] text-white border border-[#363739] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">phone_iphone</span>
                <span>iPhone / iOS</span>
              </button>
            </div>

            {/* Metadatos de Confianza */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-[#1b1c1e] w-full max-w-2xl font-mono text-center">
              <div>
                <span className="text-xl text-white font-bold block">100%</span>
                <span className="text-[11px] text-[#6a6b6c]">Gratuito</span>
              </div>
              <div>
                <span className="text-xl text-white font-bold block">Local-First</span>
                <span className="text-[11px] text-[#6a6b6c]">Privacidad</span>
              </div>
              <div>
                <span className="text-xl text-white font-bold block">WhatsApp</span>
                <span className="text-[11px] text-[#6a6b6c]">Sincronización</span>
              </div>
              <div>
                <span className="text-xl text-white font-bold block">Widgets</span>
                <span className="text-[11px] text-[#6a6b6c]">Android Nativo</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#040506] border-t border-[#1b1c1e] py-8">
        <div className="max-w-5xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#ff6363] rotate-45 rounded-[2px]" />
            <span className="text-sm text-white font-semibold tracking-tight font-sans">StudentHub</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-[#6a6b6c]">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Abrir Web App
            </button>
            <span>|</span>
            <a href="#descargas" className="hover:text-white transition-colors">
              Descargas
            </a>
            <span>|</span>
            <a
              href="https://github.com/Gekamil/AppHub"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Código Fuente
            </a>
          </div>
        </div>
      </footer>

      {/* MODAL DE INSTALACIÓN iOS / iPHONE */}
      {isIosModalOpen && (
        <div
          onClick={() => setIsIosModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="raycast-key-card rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 text-left cursor-default animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#111214] border border-[#27272a] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">phone_iphone</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Instalar StudentHub en iPhone / iPad</h3>
                  <p className="text-[11px] text-[#9c9c9d]">100% Gratuito y sin suscripciones</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIosModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9c9c9d] hover:text-white hover:bg-[#111214] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              {/* Opcion A: Instalacion Web Directa PWA */}
              <div className="p-3.5 rounded-xl bg-[#111214] border border-[#27272a] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#59d499]/20 text-[#59d499] font-mono text-[10px] font-bold">
                    Recomendada · Inmediata
                  </span>
                  <span className="text-white font-semibold">Web App Nativa (PWA)</span>
                </div>
                <p className="text-[#9c9c9d] text-[11px] leading-relaxed">
                  1. Abre StudentHub en Safari en tu iPhone.<br />
                  2. Pulsa el botón Compartir en Safari (cuadrado con flecha hacia arriba).<br />
                  3. Selecciona <strong>"Añadir a pantalla de inicio"</strong>.<br />
                  4. La app se abrirá a pantalla completa como una aplicación nativa.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsIosModalOpen(false)
                    navigate('/app')
                  }}
                  className="raycast-mist-btn mt-1 w-full py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>Abrir Web App en Safari</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>

              {/* Opcion B: Sideloading AltStore */}
              <div className="p-3.5 rounded-xl bg-[#111214] border border-[#27272a] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#63a1ff]/20 text-[#63a1ff] font-mono text-[10px] font-bold">
                    Sideloading
                  </span>
                  <span className="text-white font-semibold">Paquete Nativo IPA</span>
                </div>
                <p className="text-[#9c9c9d] text-[11px] leading-relaxed">
                  Para usuarios que prefieran instalar la aplicación mediante AltStore, SideStore o Sideloadly sin cuenta de pago.
                </p>
                <a
                  href="/download/StudentHub.ipa"
                  download="StudentHub.ipa"
                  onClick={() => setIsIosModalOpen(false)}
                  className="mt-1 w-full py-2 rounded-lg bg-[#07080a] hover:bg-[#1b1c1e] text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-[#27272a] active:scale-95 transition-all"
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
