import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import process from 'process';

// __dirname is globally available in Electron's CommonJS environment.
// No polyfill needed.

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log("Loading preload from:", preloadPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d1117'
  });

  const devUrl = 'http://localhost:5173';
  
  mainWindow.loadURL(devUrl).catch((err) => {
    console.log("Failed to load dev URL, loading local file", err);
    mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
  });

  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('fs:scanDirectory', async (_, dirPath: string) => {
  return await scanDirRecursive(dirPath, dirPath);
});

async function scanDirRecursive(rootDir: string, currentPath: string): Promise<any[]> {
  let results: any[] = [];
  try {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        const subResults = await scanDirRecursive(rootDir, fullPath);
        results = results.concat(subResults);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        const ext = path.extname(entry.name).replace('.', '').toUpperCase();
        
        let type = 'UNKNOWN';
        if (['ARW', 'JPG', 'JPEG', 'PNG', 'CR2', 'NEF', 'DNG', 'RAF'].includes(ext)) type = 'IMAGE';
        if (['MP4', 'MOV', 'AVI', 'MKV', 'M4V'].includes(ext)) type = 'VIDEO';
        if (['XML', 'THM', 'XMP', 'LRV'].includes(ext)) type = 'META';

        const relativePath = path.relative(rootDir, fullPath);

        results.push({
          id: crypto.randomUUID(), 
          name: entry.name,
          originalPath: fullPath,
          currentPath: fullPath,
          displayPath: relativePath,
          size: stats.size,
          type,
          extension: ext,
          createdDate: stats.mtime,
          cameraModel: 'Unknown',
          hash: null // Initialized as null
        });
      }
    }
  } catch (err) {
    console.error(`Error scanning ${currentPath}:`, err);
  }
  return results;
}

ipcMain.handle('fs:hashFile', async (_, filePath: string) => {
  return new Promise((resolve, reject) => {
    // SHA-256 is the standard for data integrity
    const hash = crypto.createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
});

ipcMain.handle('fs:copyFile', async (_, sourcePath: string, destPath: string) => {
  try {
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(sourcePath, destPath);
    return true;
  } catch (e) {
    console.error("Copy failed", e);
    throw e;
  }
});

ipcMain.handle('fs:deleteFile', async (_, filePath: string) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (e) {
    console.error("Delete failed", e);
    throw e;
  }
});