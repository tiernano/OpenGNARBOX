from fastapi import FastAPI, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from system_utils import get_storage_stats, get_battery_stats, NVME_MOUNT_PATH, SD_MOUNT_PATH, run_rsync_backup, backup_state

app = FastAPI(title="OpenGNAR Core API")

@app.get("/api/status")
def get_status():
    return {
        "nvme": get_storage_stats(NVME_MOUNT_PATH),
        "sd": get_storage_stats(SD_MOUNT_PATH),
        "battery": get_battery_stats()
    }

@app.post("/api/backup")
def start_backup(background_tasks: BackgroundTasks):
    if backup_state["is_running"]:
        return {"status": "error", "message": "Backup already running"}
    
    background_tasks.add_task(run_rsync_backup)
    return {"status": "started"}

@app.get("/api/backup/progress")
def get_backup_progress():
    return backup_state

# Mount the static files (frontend)
frontend_path = os.path.join(os.path.dirname(__file__), '..', 'frontend')
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

    @app.get("/")
    def serve_frontend():
        index_file = os.path.join(frontend_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend not found"}
else:
    @app.get("/")
    def serve_fallback():
        return {"message": "OpenGNAR Core is running, but frontend files were not found."}

