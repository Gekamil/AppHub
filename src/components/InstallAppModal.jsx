import { useState, useEffect } from 'react'

export default function InstallAppModal({ isOpen, onClose }) {
  const [platform, setPlatform] = useState('android') // 'android' | 'ios' | 'windows'
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    // Detectar plataforma del usuario
    const ua = navigator.userAgent || ''
    if (/iPad|iPhone|iPod/.test(ua)) {
      setPlatform('ios')
    } else if (/Android/.test(ua)) {
      setPlatform('android')
    } else {
      setPlatform('windows')
    }

    // Capturar evento de instalacion secundaria PWA si esta disponible en el navegador
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstallable(false)
        onClose()
      }
      setDeferredPrompt(null)
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-pure rounded-3xl shadow-2xl w-full max-w-lg border border-outline-variant/30 cursor-default relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-muted bg-surface-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-white flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs p-0.5">
              <img src="/logo.png" alt="StudentHub Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-base">Instalar StudentHub</h3>
              <p className="text-[11px] text-secondary">
                Aplicacion oficial preparada para instalar en tu dispositivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Selector de Plataforma */}
        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-2 p-1 bg-surface-subtle rounded-2xl border border-outline-variant/30">
            <button
              type="button"
              onClick={() => setPlatform('android')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                platform === 'android'
                  ? 'bg-surface-pure text-primary shadow-xs font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">android</span>
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatform('ios')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                platform === 'ios'
                  ? 'bg-surface-pure text-primary shadow-xs font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">phone_iphone</span>
              <span>iPhone (iOS)</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatform('windows')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                platform === 'windows'
                  ? 'bg-surface-pure text-primary shadow-xs font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">laptop</span>
              <span>Windows PC</span>
            </button>
          </div>

          {/* CONTENIDO SEGUN PLATAFORMA */}

          {/* 1. ANDROID */}
          {platform === 'android' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Opcion Prioritaria: Descarga directa APK */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-primary/30 flex flex-col gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">apk_install</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-on-surface">Instalador Directo APK</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Listo para instalar
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Descarga directa del archivo de instalacion para cualquier telefono o tablet Android.
                    </p>
                  </div>
                </div>

                <a
                  href="/download/StudentHub.apk"
                  download="StudentHub.apk"
                  className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer no-underline text-center"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Descargar e Instalar APK (StudentHub.apk)</span>
                </a>

                <div className="bg-surface-pure p-3 rounded-xl border border-outline-variant/20 flex flex-col gap-1.5 text-[11px] text-secondary">
                  <span className="font-semibold text-on-surface text-[10px] uppercase tracking-wider">
                    Pasos sencillos:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-primary">1.</span>
                    <span>Pulsa el boton para descargar StudentHub.apk en tu movil.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-primary">2.</span>
                    <span>Abre la notificacion de descarga y pulsa en <strong>Instalar</strong>.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-primary">3.</span>
                    <span>La aplicacion quedara instalada directamente con su propio icono.</span>
                  </div>
                </div>
              </div>

              {/* Aviso de widgets nativos */}
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-start gap-2.5 text-[11px] text-amber-900 dark:text-amber-300">
                <span className="material-symbols-outlined text-[16px] text-amber-500 shrink-0 mt-0.5">info</span>
                <p className="leading-snug">
                  <strong>Importante:</strong> Los widgets de calendario y planificacion semanal solo funcionan con la <strong>APK nativa</strong> descargada desde el boton de arriba. Si instalas desde el navegador (menu del navegador &gt; Instalar aplicacion), se instalara una version web ligera sin widgets.
                </p>
              </div>

              {/* Opcion Secundaria: PWA Ligera */}
              {isInstallable && (
                <div className="p-3 rounded-2xl bg-surface-pure border border-outline-variant/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">web</span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-on-surface truncate">Alternativa: Acceso Web (sin widgets)</span>
                      <span className="text-[10px] text-secondary">Solo acceso rapido por navegador, sin widgets nativos</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="px-3 py-1 rounded-lg bg-surface-subtle hover:bg-surface-muted text-on-surface text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    Instalar PWA
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. IPHONE (iOS) */}
          {platform === 'ios' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Opcion A: Instalacion Web Directa (Recomendada y 100% Gratis) */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-primary/30 flex flex-col gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">phone_iphone</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-on-surface">Instalacion Inmediata en iPhone</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        100% Gratis
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Instalacion directa en pantalla completa como aplicacion nativa sin pagar suscripciones a Apple.
                    </p>
                  </div>
                </div>

                <div className="bg-surface-pure p-3.5 rounded-xl border border-outline-variant/20 flex flex-col gap-2 text-[11px] text-secondary">
                  <span className="font-semibold text-on-surface text-[10px] uppercase tracking-wider">
                    Pasos en Safari (iPhone / iPad):
                  </span>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">1.</span>
                    <span>Pulsa el boton <strong>Compartir</strong> en Safari (icono de cuadrado con flecha hacia arriba).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">2.</span>
                    <span>Desplaza hacia abajo y selecciona <strong>"Anadir a pantalla de inicio"</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">3.</span>
                    <span>Pulsa <strong>Anadir</strong>. La app se abrira en pantalla completa como una aplicacion nativa sin bordes ni barra de navegacion.</span>
                  </div>
                </div>

                <a
                  href="/download/StudentHub.ipa"
                  download="StudentHub.ipa"
                  className="w-full py-2.5 px-4 rounded-xl bg-surface-pure hover:bg-surface-muted border border-outline-variant/40 text-on-surface font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer no-underline text-center mt-1"
                >
                  <span className="material-symbols-outlined text-[17px]">download</span>
                  <span>Descargar Archivo .IPA (Para AltStore / SideStore)</span>
                </a>
              </div>
            </div>
          )}

          {/* 3. WINDOWS / PC */}
          {platform === 'windows' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Opcion Prioritaria: Ejecutable de Escritorio (.EXE) */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-primary/30 flex flex-col gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">desktop_windows</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-on-surface">Instalador para Windows (.EXE)</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        Listo para instalar
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Instalador directo oficial para Windows 10 y 11. Solo descargar y ejecutar para instalar.
                    </p>
                  </div>
                </div>

                <a
                  href="/download/StudentHub-Setup.exe"
                  download="StudentHub-Setup.exe"
                  className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer no-underline text-center"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Descargar Instalador de Windows (StudentHub-Setup.exe)</span>
                </a>

                <div className="bg-surface-pure p-3 rounded-xl border border-outline-variant/20 flex flex-col gap-1.5 text-[11px] text-secondary">
                  <span className="font-semibold text-on-surface text-[10px] uppercase tracking-wider">
                    Instalacion en 1 paso:
                  </span>
                  <div className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[15px] shrink-0 mt-0.5">check_circle</span>
                    <span>
                      Al terminar la descarga, pulsa dos veces sobre <strong>StudentHub-Setup.exe</strong> para instalar y abrir StudentHub en tu ordenador.
                    </span>
                  </div>
                </div>
              </div>

              {/* Opcion Secundaria: PWA */}
              {isInstallable && (
                <div className="p-3 rounded-2xl bg-surface-pure border border-outline-variant/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">web</span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-on-surface truncate">Alternativa: App Web</span>
                      <span className="text-[10px] text-secondary">Instalar directo en el navegador</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="px-3 py-1 rounded-lg bg-surface-subtle hover:bg-surface-muted text-on-surface text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    Instalar PWA
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie de modal sin enlaces externos */}
        <div className="px-6 py-3.5 border-t border-surface-muted bg-surface-subtle/30 flex items-center justify-between text-[11px] text-secondary">
          <div className="flex items-center gap-1.5 text-on-surface font-medium">
            <span className="material-symbols-outlined text-[15px] text-emerald-500">verified</span>
            <span>Instalador oficial verificado y listo</span>
          </div>
          <span className="font-mono text-[10px] text-secondary">v2.4.1</span>
        </div>
      </div>
    </div>
  )
}
