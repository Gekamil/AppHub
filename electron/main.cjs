const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

let mainWindow

function setupAutoUpdater(win) {
  if (process.env.NODE_ENV === 'development') return

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
    autoUpdater.quitAndInstall()
  })

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.warn('[AutoUpdater Initial Check Failed]', err ? err.message : err)
    })
  }, 5000)

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 4 * 60 * 60 * 1000)
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

  // En produccion carga dist/index.html con hash router; en desarrollo carga el servidor de Vite
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'app' })
    setupAutoUpdater(mainWindow)
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron Failed Load] ${errorCode}: ${errorDescription} on ${validatedURL}`)
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
