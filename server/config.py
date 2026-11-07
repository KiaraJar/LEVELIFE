"""Configuración por variables de entorno, con lectura opcional de .env."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for raw in env_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            if value.strip():
                os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load_dotenv()

DB_PATH = os.environ.get("LEVELIFE_DB", str(ROOT / "data" / "levelife.db"))
PORT = int(os.environ.get("LEVELIFE_PORT", "5173"))
SECURE_COOKIES = os.environ.get("LEVELIFE_SECURE_COOKIES", "0") == "1"
SESSION_DAYS = 14
DOCS_VERSION = "2026-11-07-gemini"
# En orden de preferencia: si uno está saturado o sin cupo, se usa el siguiente.
AI_MODELS = [m.strip() for m in os.environ.get(
    "LEVELIFE_MODELS", "gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite").split(",") if m.strip()]
AI_BASE_URL = os.environ.get("LEVELIFE_AI_BASE_URL", "")  # solo para pruebas locales


def ai_key() -> str:
    return os.environ.get("GEMINI_API_KEY", "")


def ai_ready() -> bool:
    return bool(ai_key())
