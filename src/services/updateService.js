import { Capacitor } from '@capacitor/core'

const CURRENT_VERSION = '0.0.0'
const GITHUB_REPO = 'Gekamil/AppHub'

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
