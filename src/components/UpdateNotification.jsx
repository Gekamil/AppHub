import React, { useState, useEffect } from 'react'
import { checkForAppUpdates } from '../services/updateService'

export default function UpdateNotification() {
  const [updateState, setUpdateState] = useState(null)
  // updateState: { type: 'downloaded' | 'available' | 'manual', version: string, url?: string }

  useEffect(() => {
    // 1. Escuchar eventos en Electron si estamos en la app de escritorio
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
      return
    }

    // 2. En dispositivos moviles (Android APK) comprobar GitHub Releases
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
  }, [])

  if (!updateState) return null

  const handleApplyUpdate = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.restartAndUpdate) {
      window.electronAPI.restartAndUpdate()
    } else if (updateState.url) {
      window.location.href = updateState.url
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full p-4 rounded-2xl bg-surface-pure/95 border border-primary/30 shadow-2xl backdrop-blur-xl animate-fade-in flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">
              {updateState.type === 'downloading' ? 'sync' : 'system_update'}
            </span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-on-surface">
              {updateState.type === 'downloading'
                ? 'Descargando actualizacion...'
                : 'Actualizacion lista'}
            </h4>
            <p className="text-[11px] text-secondary">
              {updateState.type === 'downloading'
                ? 'Se aplicara automaticamente en segundo plano.'
                : `Version ${updateState.version || 'nueva'} disponible.`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setUpdateState(null)}
          className="text-secondary hover:text-on-surface text-xs p-1"
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
          <span>Actualizar aplicacion</span>
        </a>
      )}
    </div>
  )
}
