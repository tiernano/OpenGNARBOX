import os
import shutil
import asyncio
import subprocess

NVME_MOUNT_PATH = "/media/nvme"
SD_MOUNT_PATH = "/media/sd"
BATTERY_SYSFS_PATH = "/sys/class/power_supply/BAT0/capacity"

def get_storage_stats(path: str):
    """Return storage stats for a given path."""
    if not os.path.exists(path) or not os.path.ISMount(path) if hasattr(os.path, 'ismount') else False:
        # For our mock testing without true mounts, just check if path exists
        if not os.path.exists(path):
            return {"presence": False, "total_gb": 0, "used_gb": 0, "free_gb": 0}
            
    try:
        total, used, free = shutil.disk_usage(path)
        return {
            "presence": True,
            "total_gb": round(total / (1024 ** 3), 2),
            "used_gb": round(used / (1024 ** 3), 2),
            "free_gb": round(free / (1024 ** 3), 2)
        }
    except Exception as e:
        return {"presence": False, "total_gb": 0, "used_gb": 0, "free_gb": 0}

def get_battery_stats():
    """Read the battery percentage from sysfs."""
    try:
        if os.path.exists(BATTERY_SYSFS_PATH):
            with open(BATTERY_SYSFS_PATH, 'r') as f:
                return {"level": int(f.read().strip()), "status": "ok"}
    except Exception as e:
        pass
    
    # Fallback or mock value if not found
    return {"level": 85, "status": "mock"}

# Global state to track ongoing backup progress
backup_state = {
    "is_running": False,
    "progress": 0,
    "status": "idle"
}

async def run_rsync_backup():
    """Asynchronous function to perform the rsync operation."""
    global backup_state
    
    if backup_state["is_running"]:
        return
        
    backup_state["is_running"] = True
    backup_state["progress"] = 0
    backup_state["status"] = "running"
    
    # Ensure source exists (e.g. SD card)
    if not os.path.exists(SD_MOUNT_PATH):
        backup_state["status"] = "failed: source not found"
        backup_state["is_running"] = False
        return

    # Ensure destination exists
    if not os.path.exists(NVME_MOUNT_PATH):
        os.makedirs(NVME_MOUNT_PATH, exist_ok=True)
        
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    dest_path = os.path.join(NVME_MOUNT_PATH, f"backup_{timestamp}")
    
    # Run rsync with progress tracking. 
    # Ensure rsync is installed in the alpine image.
    cmd = [
        "rsync", "-av", "--info=progress2", 
        f"{SD_MOUNT_PATH}/", f"{dest_path}/"
    ]
    
    try:
        # Create subprocess
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        while True:
            line = await process.stdout.readline()
            if not line:
                break
                
            decoded = line.decode('utf-8').strip()
            # Simple heuristic to extract percentage if possible
            if "%" in decoded:
                parts = decoded.split()
                for p in parts:
                    if "%" in p:
                        try:
                            val = int(p.replace("%", ""))
                            backup_state["progress"] = val
                        except:
                            pass
                            
        await process.wait()
        
        if process.returncode == 0:
            backup_state["status"] = "completed"
            backup_state["progress"] = 100
        else:
            backup_state["status"] = f"failed with code {process.returncode}"
            
    except Exception as e:
        backup_state["status"] = f"failed: {str(e)}"
    finally:
        backup_state["is_running"] = False
