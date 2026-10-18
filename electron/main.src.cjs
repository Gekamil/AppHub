const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')

let autoUpdater = null
try {
  const updaterModule = require('electron-updater')
  autoUpdater = updaterModule.autoUpdater
} catch (err) {
  console.warn('[AutoUpdater] electron-updater module not available:', err ? err.message : err)
}

let mainWindow

function setupAutoUpdater(win) {
  if (process.env.NODE_ENV === 'development') return
  if (!autoUpdater) {
    console.warn('[AutoUpdater] Auto-updater is not available in this environment.')
    return
  }

  try {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Comprobando actualizaciones...')
    })

    autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdater] Nueva actualizacion detectada:', info.version)
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-available', { version: info.version })
      }
    })

    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] La aplicacion esta al dia.')
    })

    autoUpdater.on('error', (err) => {
      console.warn('[AutoUpdater Warning]', err ? err.message : err)
    })

    autoUpdater.on('download-progress', (progressObj) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-progress', { percent: progressObj.percent })
      }
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater] Actualizacion descargada:', info.version)
      if (win && !win.isDestroyed()) {
        win.webContents.send('update-downloaded', { version: info.version })
      }
    })

    ipcMain.on('restart-and-update', () => {
      try {
        autoUpdater.quitAndInstall()
      } catch (e) {
        console.warn('[AutoUpdater] quitAndInstall failed:', e.message)
      }
    })

    setTimeout(() => {
      try {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
          console.warn('[AutoUpdater Initial Check Failed]', err ? err.message : err)
        })
      } catch (err) {
        console.warn('[AutoUpdater Check error]', err.message)
      }
    }, 5000)

    setInterval(() => {
      try {
        autoUpdater.checkForUpdates().catch(() => {})
      } catch (err) {}
    }, 4 * 60 * 60 * 1000)
  } catch (err) {
    console.warn('[AutoUpdater Setup Failed]', err ? err.message : err)
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.ico')

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'StudentHub',
    icon: iconPath,
    autoHideMenuBar: true,
    backgroundColor: '#0b0f19',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // En produccion carga la aplicacion en vivo de Render con fallback local si esta offline; en desarrollo carga Vite
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadURL('https://freestudentapphub.onrender.com/#/app').catch((err) => {
      console.warn('[Electron] Remote server unreachable, falling back to local files:', err ? err.message : err)
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'app' })
    })
    setupAutoUpdater(mainWindow)
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron Failed Load] ${errorCode}: ${errorDescription} on ${validatedURL}`)
    if (validatedURL && validatedURL.includes('onrender.com')) {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'app' })
    }
  })

  // Abrir enlaces externos en el navegador predeterminado del sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
