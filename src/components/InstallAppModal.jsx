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

    // Capturar evento de instalación nativa PWA (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

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
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs p-1">
              <img src="/logo.png" alt="AppHub Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-base">Instalar AppHub</h3>
              <p className="text-[11px] text-secondary">
                Disponible en Android, iPhone/iPad y PC
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
              <span>PC / Mac</span>
            </button>
          </div>

          {/* CONTENIDO SEGÚN PLATAFORMA */}

          {/* 1. ANDROID */}
          {platform === 'android' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-surface-subtle border border-outline-variant/30 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">download_for_offline</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">Instalación Directa 1-Click</h4>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Instala AppHub directamente en tu pantalla de inicio con icono propio, sin ocupar almacenamiento y con actualizaciones automáticas al instante.
                    </p>
                  </div>
                </div>

                {isInstallable ? (
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_to_home_screen</span>
                    <span>Instalar en Android ahora</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-secondary bg-surface-pure p-3 rounded-xl border border-outline-variant/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[16px] shrink-0">info</span>
                    <span>Pulsa en los 3 puntos de Chrome y selecciona <strong>Añadir a pantalla de inicio</strong> o <strong>Instalar app</strong>.</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-pure border border-outline-variant/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">apk_install</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-on-surface truncate">Paquete Nativo (.APK)</span>
                    <span className="text-[10px] text-secondary">Para instalación manual o sin navegador</span>
                  </div>
                </div>
                <a
                  href="/download/apphub.apk"
                  download="AppHub.apk"
                  className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-muted text-on-surface text-xs font-semibold transition-colors cursor-pointer shrink-0"
                >
                  Descargar APK
                </a>
              </div>
            </div>
          )}

          {/* 2. IPHONE (iOS) */}
          {platform === 'ios' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-surface-subtle border border-outline-variant/30 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px]">ios_share</span>
                  <span>Cómo instalar en iPhone / iPad (Sin App Store y 100% Gratis)</span>
                </div>

                <div className="flex flex-col gap-2.5 text-xs text-secondary">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Abre esta página en <strong>Safari</strong> desde tu iPhone.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Toca el botón <strong>Compartir</strong> (icono de la caja con la flecha hacia arriba en la barra inferior de Safari).</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Desliza hacia abajo y pulsa en <strong>Añadir a la pantalla de inicio</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span>Pulsa <strong>Añadir</strong>. ¡Listo! Se creará el icono de AppHub en tu iPhone con pantalla completa.</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">bolt</span>
                <span>Todas las actualizaciones que subamos se aplicarán solas en tu iPhone en segundo plano.</span>
              </div>
            </div>
          )}

          {/* 3. WINDOWS / PC */}
          {platform === 'windows' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-surface-subtle border border-outline-variant/30 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">desktop_windows</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">Instalador de Escritorio (.EXE)</h4>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Aplicación nativa de Windows con icono en la barra de tareas, inicio rápido y bandeja del sistema.
                    </p>
                  </div>
                </div>

                <a
                  href="/download/AppHub-Setup.exe"
                  download="AppHub-Setup.exe"
                  className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Descargar AppHub para Windows (.exe)</span>
                </a>
              </div>

              {isInstallable && (
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="p-3 rounded-2xl bg-surface-pure border border-outline-variant/30 flex items-center justify-between text-xs hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">web</span>
                    <span className="font-semibold text-on-surface">Instalar como App Web de Escritorio</span>
                  </div>
                  <span className="material-symbols-outlined text-secondary text-[16px]">chevron_right</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pie con estado de actualización automática */}
        <div className="px-6 py-3.5 border-t border-surface-muted bg-surface-subtle/30 flex items-center justify-between text-[11px] text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Actualizaciones en vivo automáticas</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-primary hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
