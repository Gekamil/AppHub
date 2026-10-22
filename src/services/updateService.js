import { Capacitor } from '@capacitor/core'

export const CURRENT_VERSION = '0.0.8'
const GITHUB_REPO = 'Gekamil/AppHub'

export const APP_CHANGELOG = {
  version: '0.0.8',
  date: '22 de Octubre, 2026',
  badge: 'Actualización v0.0.8',
  title: 'StudentHub se ha actualizado con éxito',
  description: 'Hemos aplicado las siguientes mejoras y correcciones en todos tus dispositivos:',
  features: [
    {
      title: 'Motor de Inteligencia Artificial Resiliente',
      description: 'El Asistente IA ahora cuenta con failover dinámico en Groq, respuestas contextuales precisas y control total para añadir o modificar tareas al instante.',
      icon: 'smart_toy',
    },
    {
      title: '4 Nuevos Estilos Visuales de Refero',
      description: 'Disfruta de Glassify Apple, Obsidian Linear, Nordic Paper y Cyberpunk Neon Tactical en toda la aplicación.',
      icon: 'palette',
    },
    {
      title: 'Cero Lag y Rendimiento Optimizado',
      description: 'Carga instantánea de pestañas y memoización profunda de la vista de calendario.',
      icon: 'speed',
    },
    {
      title: 'Widget Android de Voz 1-Tap',
      description: 'Acceso directo desde la pantalla de inicio para hablar con la IA y programar actividades al instante.',
      icon: 'mic',
    },
  ],
}

export async function checkForAppUpdates() {
  // En la web (navegador normal / PWA), no molestamos con descarga de binarios .exe o .apk
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron
  const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

  if (!isElectron && !isAndroid) {
    return { hasUpdate: false }
  }

  // En Electron, electron-updater se encarga de la comprobación automática en segundo plano
  if (isElectron) {
    return { managedByElectron: true }
  }

  // En Android APK nativo comprobamos GitHub Releases API
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
    if (!response.ok) return { hasUpdate: false }

    const release = await response.json()
    const latestVersion = (release.tag_name || '').replace(/^v/, '')

    if (latestVersion && latestVersion !== CURRENT_VERSION) {
      const apkAsset = (release.assets || []).find((a) => a.name.endsWith('.apk'))

      return {
        hasUpdate: true,
        latestVersion,
        releaseNotes: release.body || '',
        downloadUrl: apkAsset?.browser_download_url || release.html_url,
        isAndroid: true,
      }
    }
  } catch (err) {
    console.warn('[UpdateService] Error comprobando actualizaciones:', err.message)
  }

  return { hasUpdate: false }
}
