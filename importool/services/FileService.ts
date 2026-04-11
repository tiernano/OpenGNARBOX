import { IFileService, FileNode } from '../types';

class DockerFileService implements IFileService {

  async selectDirectory(): Promise<string | null> {
    return "/media/placeholder";
  }

  async listDirectory(path: string): Promise<{name: string, isDirectory: boolean, path: string, size: number, createdDate: number}[]> {
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("Failed to list directory");
      const data = await res.json();
      return data.files;
    } catch (e) {
      console.error("List Error", e);
      return [];
    }
  }

  async scanDirectory(path: string): Promise<FileNode[]> {
    try {
      const res = await fetch(`/api/files/scan?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error("Failed to scan directory");
      const data = await res.json();
      
      return data.files.map((f: any) => ({
        ...f,
        createdDate: new Date(f.createdDate)
      }));
    } catch (e) {
      console.error("Scan Error", e);
      return [];
    }
  }

  async hashFile(path: string): Promise<string> {
    try {
      const res = await fetch('/api/files/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (!res.ok) throw new Error("Failed to hash file");
      const data = await res.json();
      return data.hash;
    } catch (e) {
      console.error("Hash Error", e);
      throw e;
    }
  }

  copyFile(source: string, dest: string, onProgress?: (progress: number) => void): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws/copy`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws.send(JSON.stringify({ source, target: dest }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.progress !== undefined && onProgress) {
            onProgress(data.progress);
          } else if (data.status === 'completed') {
            ws.close();
            resolve(true);
          } else if (data.status === 'skipped') {
            ws.close();
            console.warn(`Skipped: ${data.reason} (existing: ${data.existing_path})`);
            resolve(false);
          } else if (data.error) {
             ws.close();
             reject(new Error(data.error));
          }
        };

        ws.onerror = (err) => {
          console.error("WebSocket copy error", err);
          reject(new Error("WebSocket connection failed"));
        };
      } catch (e) {
         console.error("Copy Initiation Error", e);
         reject(e);
      }
    });
  }

  async deleteFile(path: string): Promise<boolean> {
     try {
       const res = await fetch('/api/files/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      if (!res.ok) throw new Error("Failed to delete file");
      return true;
     } catch (e) {
       console.error("Delete Error", e);
       throw e;
     }
  }
}

export const fileService: IFileService = new DockerFileService();