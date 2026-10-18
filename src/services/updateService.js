import { Capacitor } from '@capacitor/core'

export const CURRENT_VERSION = '0.0.2'
const GITHUB_REPO = 'Gekamil/AppHub'

export const APP_CHANGELOG = {
  version: '0.0.2',
  date: '18 de Octubre, 2026',
  badge: 'Actualización v0.0.2',
  title: '¡StudentHub se ha actualizado con éxito!',
  description: 'Hemos aplicado las siguientes mejoras y correcciones en todos tus dispositivos:',
  features: [
    {
      title: 'WhatsApp sin cámara (Código de 8 dígitos)',
      description: 'Vincula WhatsApp directamente en este mismo móvil sin tener que escanear la pantalla con otra cámara.',
      icon: 'pin',
    },
    {
      title: 'Sincronización en la Nube y Fusión de Cuentas',
      description: 'Tus cuentas, tareas y notas se sincronizan en tiempo real con Firebase Firestore. Se han unificado las cuentas duplicadas sin perder datos.',
      icon: 'cloud_sync',
    },
    {
      title: 'Conexión Directa al Servidor Cloud',
      description: 'El bot de WhatsApp y las funciones en tiempo real se conectan al servidor en la nube desde la web y desde las apps instaladas (.apk y .exe).',
      icon: 'lan',
    },
    {
      title: 'Espaciado Superior Móvil Ajustado',
      description: 'La barra de navegación ya no tapa el selector de fecha ni los botones superiores en pantallas móviles.',
      icon: 'aspect_ratio',
    },
  ],
}

export async function checkForAppUpdates() {
  // En Electron, electron-updater se encarga de la comprobacion automatica en segundo plano
  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    return { managedByElectron: true }
  }

  // En Android u otros entornos comprobamos GitHub Releases API
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
    if (!response.ok) return { hasUpdate: false }

    const release = await response.json()
    const latestVersion = (release.tag_name || '').replace(/^v/, '')

    if (latestVersion && latestVersion !== CURRENT_VERSION) {
      const isAndroid = Capacitor.getPlatform() === 'android'
      const apkAsset = (release.assets || []).find((a) => a.name.endsWith('.apk'))
      const exeAsset = (release.assets || []).find((a) => a.name.endsWith('.exe'))

      return {
        hasUpdate: true,
        latestVersion,
        releaseNotes: release.body || '',
        downloadUrl: isAndroid
          ? apkAsset?.browser_download_url || release.html_url
          : exeAsset?.browser_download_url || release.html_url,
        isAndroid,
      }
    }
  } catch (err) {
    console.warn('[UpdateService] Error comprobando actualizaciones:', err.message)
  }

  return { hasUpdate: false }
}
