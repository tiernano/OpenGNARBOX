import os
import shutil
import hashlib
import time
import asyncio
from typing import List, Dict, Any

NVME_MOUNT_PATH = "/media/nvme"
SD_MOUNT_PATH = "/media/sd"
BATTERY_SYSFS_PATH = "/sys/class/power_supply/BAT0/capacity"

# Mock Mode: when running locally without hardware mounts
MOCK_MODE = os.environ.get("MOCK_MODE", "0") == "1"

# In mock mode, we want to simulate a filesystem.
_mock_file_system = {}

def get_storage_stats(path: str):
    if MOCK_MODE:
        return {"presence": True, "total_gb": 1000, "used_gb": 250, "free_gb": 750}
    
    if not os.path.exists(path) or not os.path.ismount(path):
        return {"presence": False, "total_gb": 0, "used_gb": 0, "free_gb": 0}
        
    try:
        total, used, free = shutil.disk_usage(path)
        return {
            "presence": True,
            "total_gb": round(total / (1024 ** 3), 2),
            "used_gb": round(used / (1024 ** 3), 2),
            "free_gb": round(free / (1024 ** 3), 2)
        }
    except Exception:
        return {"presence": False, "total_gb": 0, "used_gb": 0, "free_gb": 0}

def get_battery_stats():
    if MOCK_MODE:
        return {"level": 88, "status": "mock"}
        
    try:
        if os.path.exists(BATTERY_SYSFS_PATH):
            with open(BATTERY_SYSFS_PATH, 'r') as f:
                return {"level": int(f.read().strip()), "status": "ok"}
    except Exception:
        pass
    return {"level": 85, "status": "mock"}

def _get_file_type(ext: str) -> str:
    ext = ext.lower()
    if ext in ['.jpg', '.jpeg', '.png', '.arw', '.cr2', '.nef', '.dng']:
        return "IMAGE"
    if ext in ['.mp4', '.mov', '.avi', '.m4v']:
        return "VIDEO"
    if ext in ['.xml', '.thm', '.lrv', '.xmp']:
        return "META"
    return "UNKNOWN"

def scan_dir(path: str) -> List[Dict[str, Any]]:
    if MOCK_MODE:
        # Mock some files if source is requested
        if path == "/media/sd":
            # Just generate some fake files once
            if "/media/sd" not in _mock_file_system:
                _mock_file_system["/media/sd"] = [
                    {"id": "mock1", "name": "2024-05-10_SONY_DSC001.ARW", "currentPath": "/media/sd/2024-05-10_SONY_DSC001.ARW", "size": 25000000, "extension": "ARW", "createdDate": int(time.time() * 1000), "cameraModel": "SONY"},
                    {"id": "mock2", "name": "2024-05-10_SONY_DSC002.MP4", "currentPath": "/media/sd/2024-05-10_SONY_DSC002.MP4", "size": 150000000, "extension": "MP4", "createdDate": int(time.time() * 1000), "cameraModel": "SONY"}
                ]
            
            for f in _mock_file_system["/media/sd"]:
                f["type"] = _get_file_type(f["extension"])
            return _mock_file_system["/media/sd"]
        
        # Target/Library Mock
        if path not in _mock_file_system:
            return []
        
        for f in _mock_file_system[path]:
            f["type"] = _get_file_type(f["extension"])
        return _mock_file_system[path]

    # Real mode
    files = []
    if not os.path.exists(path):
        return files
        
    for root, _, filenames in os.walk(path):
        for name in filenames:
            file_path = os.path.join(root, name)
            try:
                stat = os.stat(file_path)
                ext = name.split('.')[-1].upper() if '.' in name else ''
                files.append({
                    "id": name + str(stat.st_mtime),
                    "name": name,
                    "originalPath": file_path,
                    "currentPath": file_path,
                    "displayPath": file_path,
                    "size": stat.st_size,
                    "type": _get_file_type(ext),
                    "extension": ext,
                    "hash": None,
                    "createdDate": int(stat.st_mtime * 1000),
                    "cameraModel": "OpenGNAR"
                })
            except Exception as e:
                pass
    return files

def hash_file(path: str) -> str:
    if MOCK_MODE:
        # Simulate work
        time.sleep(0.5)
        # return a stable hash based on path name
        return hashlib.sha256(path.split('/')[-1].encode()).hexdigest()
        
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
        
    sha256 = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(4096 * 1024), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def copy_file(source: str, dest: str) -> bool:
    if MOCK_MODE:
        time.sleep(1.0)
        # Find file in mock source to move to dest
        f_obj = None
        for k, vlist in _mock_file_system.items():
            for f in vlist:
                if f["currentPath"] == source:
                    f_obj = dict(f)
                    break
            if f_obj: break
            
        if not f_obj:
            raise FileNotFoundError(f"Source mock file not found: {source}")
            
        dest_dir = os.path.dirname(dest)
        if dest_dir not in _mock_file_system:
            _mock_file_system[dest_dir] = []
            
        f_obj["currentPath"] = dest
        f_obj["name"] = os.path.basename(dest)
        _mock_file_system[dest_dir].append(f_obj)
        return True
        
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copy2(source, dest)
    return True

def delete_file(path: str) -> bool:
    if MOCK_MODE:
        for k, vlist in _mock_file_system.items():
            _mock_file_system[k] = [f for f in vlist if f["currentPath"] != path]
        return True
        
    if os.path.exists(path):
        os.remove(path)
    return True

def list_dir_contents(path: str) -> List[Dict[str, Any]]:
    if MOCK_MODE:
        if path == "/media":
            return [
                {"name": "nvme", "isDirectory": True, "path": "/media/nvme", "size": 0},
                {"name": "sd", "isDirectory": True, "path": "/media/sd", "size": 0}
            ]
        elif path == "/media/sd":
            if "/media/sd" not in _mock_file_system:
                _mock_file_system["/media/sd"] = [
                    {"name": "2024-05-10_SONY_DSC001.ARW", "isDirectory": False, "path": "/media/sd/2024-05-10_SONY_DSC001.ARW", "size": 25000000},
                    {"name": "DCIM", "isDirectory": True, "path": "/media/sd/DCIM", "size": 0}
                ]
            return _mock_file_system["/media/sd"]
        return []
    
    files = []
    if not os.path.exists(path):
        return files
    
    try:
        entries = os.listdir(path)
        for name in entries:
            full_path = os.path.join(path, name)
            try:
                stat = os.stat(full_path)
                files.append({
                    "name": name,
                    "isDirectory": os.path.isdir(full_path),
                    "path": full_path,
                    "size": stat.st_size,
                    "createdDate": int(stat.st_mtime * 1000)
                })
            except Exception:
                pass
    except Exception:
        pass
    return sorted(files, key=lambda x: (not x["isDirectory"], x["name"].lower()))

async def copy_file_chunked(source: str, dest: str):
    import aiofiles
    if MOCK_MODE:
        for i in range(1, 11):
            await asyncio.sleep(0.1)
            yield float(i * 10)
        return

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    file_size = os.path.getsize(source)
    if file_size == 0:
        yield 100.0
        return

    chunk_size = 1024 * 1024 * 10 # 10MB chunks
    copied = 0

    async with aiofiles.open(source, 'rb') as src, aiofiles.open(dest, 'wb') as dst:
        while True:
            chunk = await src.read(chunk_size)
            if not chunk:
                break
            await dst.write(chunk)
            copied += len(chunk)
            yield min(100.0, (copied / file_size) * 100)

def create_zip_file(paths: List[str], output_path: str, max_mb: int = 4000) -> str:
    import zipfile
    max_bytes = max_mb * 1024 * 1024
    current_bytes = 0
    
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for path in paths:
            if not os.path.exists(path):
                continue
                
            if os.path.isfile(path):
                size = os.path.getsize(path)
                if current_bytes + size > max_bytes:
                    break
                zipf.write(path, arcname=os.path.basename(path))
                current_bytes += size
                
            elif os.path.isdir(path):
                for root, _, files in os.walk(path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        size = os.path.getsize(file_path)
                        if current_bytes + size > max_bytes:
                            break
                        arcname = os.path.relpath(file_path, os.path.dirname(path))
                        zipf.write(file_path, arcname=arcname)
                        current_bytes += size
                    if current_bytes > max_bytes:
                        break
    return output_path
