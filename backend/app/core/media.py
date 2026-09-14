"""Rutas compartidas para archivos subidos y media estatica."""
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_DIR / "uploads"
SEEDED_UPLOAD_DIR = UPLOAD_DIR / "seed"
STATIC_UPLOADS_URL = "/static/uploads"

