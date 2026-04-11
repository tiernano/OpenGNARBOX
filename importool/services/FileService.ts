import { IFileService, FileNode } from '../types';

class DockerFileService implements IFileService {
  isNative = false;
  platform = 'web' as const;

  async selectDirectory(): Promise<string | null> {
    return "/media/placeholder";
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

  async copyFile(source: string, dest: string): Promise<boolean> {
    try {
      const res = await fetch('/api/files/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, target: dest })
      });
      if (!res.ok) throw new Error("Failed to copy file");
      return true;
    } catch (e) {
      console.error("Copy Error", e);
      throw e;
    }
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