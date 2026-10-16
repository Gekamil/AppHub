const { contextBridge } = require('electron')

// Exponer capacidades nativas seguras de escritorio a la ventana web
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
})
