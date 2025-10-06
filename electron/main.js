const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const serve = require('electron-serve');
const isDev = !app.isPackaged;

// Load from 'dist' directory when packaged
const loadURL = serve({ directory: 'dist' });

// Create the browser window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev,
    },
    title: '3D Dragon Game',
    show: false,
  });

  // Hide menu bar in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Load the appropriate URL based on environment
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    loadURL(mainWindow);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle MacOS full-screen behavior
  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('fullscreen-change', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('fullscreen-change', false);
  });
}

// Create window when app is ready
app.whenReady().then(() => {
  createWindow();

  // MacOS: recreate window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on MacOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});