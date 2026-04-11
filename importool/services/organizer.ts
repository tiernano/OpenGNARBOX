import { FileNode, AppConfig } from '../types';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface FileMetadata {
  year: string;
  month: string;
  day: string;
  camera: string;
  cleanName: string; // The original name without previous date prefixes if they existed
}

/**
 * Parses the filename or stats to extract metadata.
 * Pattern target: YYYY-MM-DD_CameraModel_OriginalName.Ext
 */
export const extractMetadata = (file: FileNode): FileMetadata => {
  // Regex: 2022-04-15_ILCE-7RM4_DSC05434.ARW
  // Group 1: Year, 2: Month, 3: Day, 4: Camera, 5: Rest of filename
  const regex = /^(\d{4})-(\d{2})-(\d{2})_([A-Za-z0-9-]+)_(.*)/;
  const match = file.name.match(regex);

  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    const month = MONTH_NAMES[monthIndex] || "Unknown";
    const day = match[3];
    const camera = match[4];
    const cleanName = match[5].split('.')[0]; // remove extension from the captured tail
    
    return { year, month, day, camera, cleanName };
  }

  // Fallback: Use File Creation Date
  const date = file.createdDate;
  const year = date.getFullYear().toString();
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate().toString().padStart(2, '0');
  
  // Default camera if not found in name
  const camera = file.cameraModel === 'Unknown' ? 'UnknownCamera' : file.cameraModel;
  
  // If the file is just "DSC001.ARW", cleanName is "DSC001"
  const cleanName = file.name.replace(/\.[^/.]+$/, "");

  return { year, month, day, camera, cleanName };
};

export const calculateDestinationPath = (file: FileNode, config: AppConfig): string => {
  const { year, month, day, camera, cleanName } = extractMetadata(file);
  const ext = file.extension.toUpperCase();

  // Folder Structure: Library / Camera_Year / Month / Ext /
  const folderName = `${camera}_${year}`;
  
  // File Name Transformation: YYYY-MM-DD_Camera_OriginalName.Ext
  // This ensures the pattern is fixed if it was wrong.
  const numericMonth = (MONTH_NAMES.indexOf(month) + 1).toString().padStart(2, '0');
  const finalFileName = `${year}-${numericMonth}-${day}_${camera}_${cleanName}.${ext}`;
  
  return `${config.libraryRoot}/${folderName}/${month}/${ext}/${finalFileName}`;
};

/**
 * Checks if a file exists in the library using robust comparison.
 * 1. Hashes (Strict Content Match)
 * 2. Metadata Fingerprint (Size + Time) - Substitute for mobile/performance
 */
export const isDuplicate = (incoming: FileNode, existingLibrary: FileNode[]): boolean => {
  return existingLibrary.some(existing => {
      // 1. Content Hash Check (Strongest)
      // If both files have hashes (SHA256 or Mobile META-HASH), compare them directly.
      if (incoming.hash && existing.hash) {
          return incoming.hash === existing.hash && incoming.size === existing.size;
      }

      // 2. Metadata Fingerprint (Substitute Comparison)
      // Used when hashes are not yet calculated to provide a fail-safe check.
      
      // Size Check: Must be exact byte match.
      if (incoming.size !== existing.size) return false;

      // Time Check: Creation/Modification time must be within 2 seconds.
      // (Accounts for minor filesystem differences between FAT32/ExFAT/APFS)
      const timeDiff = Math.abs(incoming.createdDate.getTime() - existing.createdDate.getTime());
      if (timeDiff > 2000) return false;

      // Camera Model Check: Reduce false positives if two different cameras 
      // took a photo at the same second with same size (unlikely but possible).
      if (incoming.cameraModel !== 'Unknown' && existing.cameraModel !== 'Unknown') {
         if (incoming.cameraModel !== existing.cameraModel) return false;
      }

      // If Size, Time, and Camera match, it is effectively the same capture.
      return true;
  });
};