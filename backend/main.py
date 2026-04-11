from fastapi import FastAPI, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import time

from system_utils import (
    get_storage_stats, get_battery_stats, NVME_MOUNT_PATH, SD_MOUNT_PATH,
    scan_dir, hash_file, copy_file, delete_file, list_dir_contents, 
    copy_file_chunked, create_zip_file
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

@app.get("/api/files/list")
def _list_files(path: str = "/media"):
    try:
        files = list_dir_contents(path)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/download")
def _download_files(paths: str, background_tasks: BackgroundTasks):
    try:
        path_list = [p.strip() for p in paths.split(",")]
        if not path_list:
            raise HTTPException(status_code=400, detail="No paths provided")
            
        if len(path_list) == 1 and os.path.isfile(path_list[0]):
            return FileResponse(path_list[0], filename=os.path.basename(path_list[0]))
            
        # multiple files or a directory -> create zip
        zip_name = f"OpenGNAR_Download_{int(time.time())}.zip"
        zip_path = os.path.join("/tmp/", zip_name)
        
        create_zip_file(path_list, zip_path)
        
        if not os.path.exists(zip_path):
             raise HTTPException(status_code=500, detail="Failed to create zip")
             
        # cleanup after sending
        background_tasks.add_task(os.remove, zip_path)
        
        return FileResponse(zip_path, filename=zip_name, media_type="application/zip")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/api/ws/copy")
async def websocket_copy(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            source = data.get("source")
            target = data.get("target")
            if not source or not target:
                await websocket.send_json({"error": "Missing source or target"})
                continue
                
            try:
                # Run the chunked copy
                async for progress in copy_file_chunked(source, target):
                    await websocket.send_json({"progress": progress})
                
                await websocket.send_json({"status": "completed"})
            except Exception as e:
                import traceback
                traceback.print_exc()
                await websocket.send_json({"error": str(e), "status": "error"})
                
    except WebSocketDisconnect:
        pass


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
