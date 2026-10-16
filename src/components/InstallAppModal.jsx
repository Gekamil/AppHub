import { useState, useEffect } from 'react'

export default function InstallAppModal({ isOpen, onClose }) {
  const [platform, setPlatform] = useState('android') // 'android' | 'ios' | 'windows'
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [downloadNotice, setDownloadNotice] = useState(null)

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

    // Capturar evento de instalación secundaria PWA
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

  const triggerDownload = async (fileUrl, fileName, fallbackUrl) => {
    setDownloadNotice('Iniciando descarga...')
    try {
      const res = await fetch(fileUrl, { method: 'HEAD' })
      const contentType = res.headers.get('content-type') || ''
      // Si el archivo existe físicamente y no es el index.html de la SPA
      if (res.ok && !contentType.includes('text/html')) {
        const link = document.createElement('a')
        link.href = fileUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setDownloadNotice('Descarga iniciada con éxito.')
        setTimeout(() => setDownloadNotice(null), 3000)
        return
      }
    } catch {
      // Ignorar fallo de fetch HEAD y pasar a fallback
    }

    // Fallback: abrir releases de GitHub
    window.open(fallbackUrl, '_blank')
    setDownloadNotice('Redirigiendo a las descargas oficiales de GitHub...')
    setTimeout(() => setDownloadNotice(null), 4000)
  }

  const GITHUB_REPO_URL = 'https://github.com/Gekamil/AppHub'
  const GITHUB_RELEASES_URL = 'https://github.com/Gekamil/AppHub/releases'

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
                Aplicación nativa para Android, iPhone / iPad y PC
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

          {/* Notificación de estado de descarga si aplica */}
          {downloadNotice && (
            <div className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>{downloadNotice}</span>
            </div>
          )}

          {/* CONTENIDO SEGÚN PLATAFORMA */}

          {/* 1. ANDROID */}
          {platform === 'android' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Opción Prioritaria: Paquete Nativo APK */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-primary/30 flex flex-col gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">apk_install</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-on-surface">Instalación Nativa (.APK)</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Prioritaria
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Instalación oficial y directa en cualquier teléfono o tablet Android sin pasar por Google Play Store.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    triggerDownload(
                      '/download/AppHub.apk',
                      'AppHub.apk',
                      `${GITHUB_RELEASES_URL}/latest`
                    )
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Descargar AppHub para Android (.APK)</span>
                </button>

                <div className="bg-surface-pure p-3 rounded-xl border border-outline-variant/20 flex flex-col gap-1.5 text-[11px] text-secondary">
                  <span className="font-semibold text-on-surface text-[10px] uppercase tracking-wider">
                    Instrucciones de instalación:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-primary">1.</span>
                    <span>Descarga el archivo APK y pulsa en abrir.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-primary">2.</span>
                    <span>Si te lo solicita, activa "Permitir desde esta fuente".</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-primary">3.</span>
                    <span>Pulsa en Instalar y la app aparecerá en tu menú de aplicaciones.</span>
                  </div>
                </div>
              </div>

              {/* Opción Secundaria: PWA Ligera */}
              <div className="p-3 rounded-2xl bg-surface-pure border border-outline-variant/30 flex items-center justify-between gap-3 text-xs opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">web</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-on-surface truncate">Alternativa: Acceso Web Ligero</span>
                    <span className="text-[10px] text-secondary">Sin instalar archivo APK</span>
                  </div>
                </div>
                {isInstallable && (
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="px-3 py-1 rounded-lg bg-surface-subtle hover:bg-surface-muted text-on-surface text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    Instalar PWA
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 2. IPHONE (iOS) */}
          {platform === 'ios' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Opción Prioritaria: Paquete Nativo IPA Sideloading */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-primary/30 flex flex-col gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">ios</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-on-surface">App Nativa iOS (.IPA)</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        100% Gratis
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Instalación nativa directa en tu iPhone o iPad mediante Sideloading, sin App Store y sin pagar suscripciones de desarrollador Apple.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    triggerDownload(
                      '/download/AppHub.ipa',
                      'AppHub.ipa',
                      `${GITHUB_RELEASES_URL}/latest`
                    )
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Descargar Paquete AppHub (.IPA)</span>
                </button>

                <div className="bg-surface-pure p-3.5 rounded-xl border border-outline-variant/20 flex flex-col gap-2 text-[11px] text-secondary">
                  <div className="flex items-center gap-1.5 text-on-surface font-semibold text-xs">
                    <span className="material-symbols-outlined text-primary text-[16px]">install_desktop</span>
                    <span>Instalación mediante AltStore / SideStore / Scarlet:</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">1.</span>
                    <span>Descarga el archivo <strong>AppHub.ipa</strong> en tu dispositivo.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">2.</span>
                    <span>Abre tu app de sideloading (AltStore, SideStore o Scarlet) y pulsa en añadir aplicación (+).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-primary shrink-0">3.</span>
                    <span>Selecciona el archivo descargado. La app se firmará y quedará instalada como aplicación nativa en tu iPhone.</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">bolt</span>
                <span>Las actualizaciones de backend, tareas y calendario se sincronizan en vivo sin necesidad de reinstalar.</span>
              </div>
            </div>
          )}

          {/* 3. WINDOWS / PC */}
          {platform === 'windows' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Opción Prioritaria: Ejecutable de Escritorio (.EXE) */}
              <div className="p-4 rounded-2xl bg-surface-subtle border border-primary/30 flex flex-col gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">desktop_windows</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-on-surface">Instalador de Escritorio (.EXE)</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                        Prioritaria
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Aplicación oficial para Windows 10 y 11 con rendimiento nativo, bandeja del sistema y arranque rápido.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    triggerDownload(
                      '/download/AppHub-Setup.exe',
                      'AppHub-Setup.exe',
                      `${GITHUB_RELEASES_URL}/latest`
                    )
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span>Descargar AppHub para Windows (.exe)</span>
                </button>

                <div className="bg-surface-pure p-3 rounded-xl border border-outline-variant/20 flex flex-col gap-1.5 text-[11px] text-secondary">
                  <span className="font-semibold text-on-surface text-[10px] uppercase tracking-wider">
                    Nota de ejecución:
                  </span>
                  <div className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-amber-500 text-[15px] shrink-0 mt-0.5">verified_user</span>
                    <span>
                      Al ser una versión de distribución directa, si Windows SmartScreen muestra un aviso preventivo, pulsa en <strong>Más información</strong> y luego en <strong>Ejecutar de todas formas</strong>.
                    </span>
                  </div>
                </div>
              </div>

              {/* Opción Secundaria: App Web de Escritorio */}
              <div className="p-3 rounded-2xl bg-surface-pure border border-outline-variant/30 flex items-center justify-between gap-3 text-xs opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">web</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-on-surface truncate">Alternativa: App Web de Escritorio</span>
                    <span className="text-[10px] text-secondary">Ejecutar en ventana sin instalador</span>
                  </div>
                </div>
                {isInstallable && (
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="px-3 py-1 rounded-lg bg-surface-subtle hover:bg-surface-muted text-on-surface text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
                  >
                    Instalar PWA
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pie con estado y enlace al repositorio */}
        <div className="px-6 py-3.5 border-t border-surface-muted bg-surface-subtle/30 flex items-center justify-between text-[11px] text-secondary">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-secondary hover:text-on-surface transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Versión oficial GitHub Releases</span>
          </a>
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
