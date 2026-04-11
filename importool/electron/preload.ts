import { contextBridge, ipcRenderer } from 'electron';

console.log("Preload script loading...");

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    scanDirectory: (path: string) => ipcRenderer.invoke('fs:scanDirectory', path),
    hashFile: (path: string) => ipcRenderer.invoke('fs:hashFile', path),
    copyFile: (source: string, dest: string) => ipcRenderer.invoke('fs:copyFile', source, dest),
    deleteFile: (path: string) => ipcRenderer.invoke('fs:deleteFile', path)
  });
  console.log("Electron API exposed successfully.");
} catch (error) {
  console.error("Failed to expose Electron API:", error);
}