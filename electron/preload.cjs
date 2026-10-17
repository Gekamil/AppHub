const { contextBridge, ipcRenderer } = require('electron')

// Exponer capacidades nativas seguras de escritorio a la ventana web
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, data) => callback(data)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, data) => callback(data)),
  restartAndUpdate: () => ipcRenderer.send('restart-and-update'),
})
