



import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
BASE_DIR = Path(__file__).resolve().parent



from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.nutrition.api.data.shelters import router as shelters_router
from backend.nutrition.api.data.recomment_prompt import router as recommend_router

app = FastAPI(title="CWI Nutrition API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # loosen for local dev — tighten for production
    allow_methods=["*"],
    allow_headers=["*"],
)

static_path = BASE_DIR / "static"

# Ensure the directory exists to prevent the crash
if not static_path.exists():
    print(f"Warning: {static_path} not found. Creating it now...")
    static_path.mkdir(parents=True, exist_ok=True)
app.include_router(shelters_router)
app.include_router(recommend_router)

# Serve frontend
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
@app.get("/")
def root():
    index_path = static_path / "index.html"
    if not index_path.exists():
        return {"error": "index.html not found in static folder"}
    return FileResponse(str(index_path))


@app.get("/health")
def health():
    return {"status": "ok"}