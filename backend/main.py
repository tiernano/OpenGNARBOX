import os
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from system_utils import (
    get_storage_stats, get_battery_stats, NVME_MOUNT_PATH, SD_MOUNT_PATH,
    scan_dir, hash_file, copy_file, delete_file
)

app = FastAPI(title="OpenGNAR Core API")

@app.get("/api/status")
def get_status():
    return {
        "nvme": get_storage_stats(NVME_MOUNT_PATH),
        "sd": get_storage_stats(SD_MOUNT_PATH),
        "battery": get_battery_stats()
    }

@app.get("/api/files/scan")
def _scan_files(path: str):
    try:
        files = scan_dir(path)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PathRequest(BaseModel):
    path: str

@app.post("/api/files/hash")
def _hash_file(req: PathRequest):
    try:
        h = hash_file(req.path)
        return {"hash": h}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CopyRequest(BaseModel):
    source: str
    target: str

@app.post("/api/files/copy")
def _copy_file(req: CopyRequest):
    try:
        success = copy_file(req.source, req.target)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/files/delete")
def _delete_file(req: PathRequest):
    try:
        success = delete_file(req.path)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mount the static files (frontend dist built by Vite)
frontend_path = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Serve index.html for unknown routes to support SPA
        index_file = os.path.join(frontend_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend not found"}
else:
    @app.get("/")
    def serve_fallback():
        return {"message": "OpenGNAR Core is running, but frontend/dist files were not found."}
