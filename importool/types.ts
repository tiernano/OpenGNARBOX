export enum FileType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  META = 'META', // XML, THM, etc.
  UNKNOWN = 'UNKNOWN'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  HASHING_SOURCE = 'HASHING_SOURCE',
  BACKING_UP = 'BACKING_UP',
  MOVING = 'MOVING',
  HASHING_DEST = 'HASHING_DEST',
  VERIFYING = 'VERIFYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
  SKIPPED = 'SKIPPED',
  WAITING_FOR_USER = 'WAITING_FOR_USER',
  STOPPED = 'STOPPED'
}

export enum DuplicateStrategy {
  SKIP = 'SKIP',
  OVERWRITE = 'OVERWRITE',
  RENAME = 'RENAME', // Appends _1, _2
  ASK = 'ASK' // Manual Compare
}

export interface FileNode {
  id: string;
  name: string;
  originalPath: string; // Absolute path or URI
  currentPath: string; // Absolute path or URI
  displayPath?: string; // Relative path for UI
  size: number;
  type: FileType;
  extension: string;
  hash: string | null;
  createdDate: Date;
  cameraModel: string;
}

export interface FolderNode {
  name: string;
  path: string;
  children: (FolderNode | FileNode)[];
  isFile: boolean;
}

export interface Job {
  id: string;
  fileId: string;
  sourcePath: string;
  proposedPath: string;
  status: TransactionStatus;
  backupPath?: string;
  error?: string;
  timestamp: number;
}

export interface AppConfig {
  backupRetentionDays: number;
  organizationPattern: string; 
  libraryRoot?: string;
  backupLocation?: string;
  enableBackup: boolean;
  duplicateStrategy: DuplicateStrategy;
  ignoredExtensions: string[]; // New: e.g. ['.xml', '.thm']
}

export interface ConnectedFolders {
  source: string | null; // Paths instead of Handles
  library: string | null;
  backup: string | null;
}

export interface FinalReport {
  totalFiles: number;
  totalSizeMB: number;
  durationSeconds: number;
  processedCount: number;
  skippedCount: number;
  errorCount: number;
  duplicateCount: number;
  folderSource: string;
  folderDest: string;
}

// Unified Service Interface
export interface IFileService {
  isNative: boolean;
  platform: 'electron' | 'android' | 'ios' | 'web';
  selectDirectory: () => Promise<string | null>;
  scanDirectory: (path: string) => Promise<FileNode[]>;
  hashFile: (path: string) => Promise<string>;
  copyFile: (source: string, dest: string) => Promise<boolean>;
  deleteFile: (path: string) => Promise<boolean>;
}

// Window Interface for Electron API
declare global {
  interface Window {
    electronAPI?: {
      selectDirectory: () => Promise<string | null>;
      scanDirectory: (path: string) => Promise<any[]>;
      hashFile: (path: string) => Promise<string>;
      copyFile: (source: string, dest: string) => Promise<boolean>;
      deleteFile: (path: string) => Promise<boolean>;
    };
  }
}