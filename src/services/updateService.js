import { Capacitor } from '@capacitor/core'

export const CURRENT_VERSION = '0.0.4'
const GITHUB_REPO = 'Gekamil/AppHub'

export const APP_CHANGELOG = {
  version: '0.0.4',
  date: '19 de Octubre, 2026',
  badge: 'Actualización v0.0.4',
  title: 'StudentHub se ha actualizado con éxito',
  description: 'Hemos aplicado las siguientes mejoras y correcciones en todos tus dispositivos:',
  features: [
    {
      title: 'Persistencia Total de Calendarios y Auto-Recuperación',
      description: 'Los calendarios creados ahora se sincronizan en la nube (Firestore) y se recuperan automáticamente a partir de sus eventos, apareciendo siempre en el selector.',
      icon: 'calendar_month',
    },
    {
      title: 'Filtrado Contextual Inteligente',
      description: 'Los eventos de universidad, deportes y proyectos se enlazan de forma inmediata a sus respectivos calendarios.',
      icon: 'filter_alt',
    },
    {
      title: 'WhatsApp con Código de 8 dígitos 100% Estable',
      description: 'El socket de enlace se mantiene activo y protegido mientras introduces el código en tu móvil, garantizando que WhatsApp complete la vinculación sin errores.',
      icon: 'pin',
    },
    {
      title: 'Generación Inmediata de Código QR',
      description: 'Limpieza automática de sesiones expiradas para que el código QR aparezca en pantalla al instante sin demoras ni bucles de carga.',
      icon: 'qr_code',
    },
    {
      title: 'App de Escritorio Windows con Conexión Live',
      description: 'La app instalada en Windows ahora se conecta directamente al servidor en la nube. Cualquier cambio futuro aparecerá automáticamente al abrir la aplicación sin tener que reinstalar.',
      icon: 'desktop_windows',
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
