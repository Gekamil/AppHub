import React, { useState, useEffect } from 'react'
import { checkForAppUpdates, APP_CHANGELOG, CURRENT_VERSION } from '../services/updateService'

const CHANGELOG_STORAGE_KEY = `studenthub_seen_changelog_v${CURRENT_VERSION.replace(/\./g, '_')}`

export default function UpdateNotification() {
  const [updateState, setUpdateState] = useState(null)
  const [showChangelog, setShowChangelog] = useState(false)

  useEffect(() => {
    // 1. Comprobar si ya vio el aviso de novedades de la versión actual
    try {
      const seen = localStorage.getItem(CHANGELOG_STORAGE_KEY)
      if (!seen) {
        setShowChangelog(true)
      }
    } catch (e) {
      setShowChangelog(true)
    }

    // 2. Permitir volver a abrir el changelog desde cualquier parte de la app
    const handleOpenChangelog = () => setShowChangelog(true)
    window.addEventListener('studenthub_open_changelog', handleOpenChangelog)

    // 3. Escuchar actualizaciones binarias de Electron en la app de escritorio
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      if (typeof window.electronAPI.onUpdateAvailable === 'function') {
        window.electronAPI.onUpdateAvailable((data) => {
          setUpdateState({
            type: 'downloading',
            version: data?.version || '',
          })
        })
      }

      if (typeof window.electronAPI.onUpdateDownloaded === 'function') {
        window.electronAPI.onUpdateDownloaded((data) => {
          setUpdateState({
            type: 'downloaded',
            version: data?.version || '',
          })
        })
      }
      return () => window.removeEventListener('studenthub_open_changelog', handleOpenChangelog)
    }

    // 4. En dispositivos móviles (Android APK) comprobar GitHub Releases
    checkForAppUpdates().then((res) => {
      if (res?.hasUpdate) {
        setUpdateState({
          type: 'manual',
          version: res.latestVersion,
          url: res.downloadUrl,
          isAndroid: res.isAndroid,
        })
      }
    })

    return () => window.removeEventListener('studenthub_open_changelog', handleOpenChangelog)
  }, [])

  const handleDismissChangelog = () => {
    try {
      localStorage.setItem(CHANGELOG_STORAGE_KEY, 'true')
    } catch (e) {}
    setShowChangelog(false)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showChangelog) {
        handleDismissChangelog()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showChangelog])

  const handleApplyUpdate = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.restartAndUpdate) {
      window.electronAPI.restartAndUpdate()
    } else if (updateState?.url) {
      window.location.href = updateState.url
    }
  }

  return (
    <>
      {/* 1. Modal / Popup de Novedades de la Actualización */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#161b26] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">published_with_changes</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                      {APP_CHANGELOG.badge}
                    </span>
                    <span className="text-[11px] text-slate-400">{APP_CHANGELOG.date}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {APP_CHANGELOG.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissChangelog}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar aviso"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {APP_CHANGELOG.description}
            </p>

            <div className="space-y-2.5">
              {APP_CHANGELOG.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">{feat.icon}</span>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      {feat.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDismissChangelog}
                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/95 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>¡Entendido, gracias!</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Banner de Descarga / Actualización Binaria (Electron o APK) */}
      {updateState && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full p-4 rounded-2xl bg-white/95 dark:bg-[#161b26]/95 border border-primary/30 shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">
                  {updateState.type === 'downloading' ? 'sync' : 'system_update'}
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {updateState.type === 'downloading'
                    ? 'Descargando actualización...'
                    : 'Actualización binaria lista'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {updateState.type === 'downloading'
                    ? 'Se aplicará automáticamente en segundo plano.'
                    : `Versión ${updateState.version || 'nueva'} disponible.`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setUpdateState(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs p-1 cursor-pointer"
              title="Cerrar aviso"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {updateState.type === 'downloaded' && (
            <button
              onClick={handleApplyUpdate}
              className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reiniciar y aplicar cambios</span>
            </button>
          )}

          {updateState.type === 'manual' && (
            <a
              href={updateState.url}
              className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer no-underline text-center"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Descargar nueva versión ({updateState.version})</span>
            </a>
          )}
        </div>
      )}
    </>
  )
}
