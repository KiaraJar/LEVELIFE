"""Carga los escenarios por área desde archivos JSON."""
from __future__ import annotations

import json
from pathlib import Path

_RUTA = Path(__file__).parent


def _leer(nombre: str) -> dict:
    return json.loads((_RUTA / f"{nombre}.json").read_text(encoding="utf-8"))


GENERAL = _leer("general")
# Cada opción del selector apunta a su archivo de escenarios.
AREAS = {
    "ingenieria": {"label": "Ingeniería de Sistemas e Informática", "data": _leer("ingenieria")},
    "salud": {"label": "Ciencias de la Salud", "data": _leer("salud")},
    "derecho": {"label": "Derecho", "data": _leer("sociales_derecho")},
    "sociales": {"label": "Ciencias Sociales y Educación", "data": _leer("sociales_derecho")},
}


def public_areas() -> list[dict]:
    return [{"id": clave, "label": area["label"]} for clave, area in AREAS.items()]


def conflicts(area: str) -> list[str]:
    return AREAS[area]["data"]["conflictos"] + GENERAL["conflictos"]


def pool(area: str) -> list[dict]:
    """Primero lo propio del área, luego lo transversal."""
    return AREAS[area]["data"]["casos"] + GENERAL["casos"]
