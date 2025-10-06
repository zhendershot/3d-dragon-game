const { contextBridge, ipcRenderer } = require('electron');

// Expose select APIs to renderer process
contextBridge.exposeInMainWorld('electron', {
  // Add any functionality you want to expose here
  onFullscreenChange: (callback) => ipcRenderer.on('fullscreen-change', (_, value) => callback(value)),
  getAppVersion: () => process.env.npm_package_version,
});