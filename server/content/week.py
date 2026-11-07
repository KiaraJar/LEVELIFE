"""Estructura de Semana 8 y casos base por si la agente no está disponible."""
from __future__ import annotations

from .scenarios import pool

DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
# Lugares y personas por los que pasa la semana, en orden.
SLOTS = [("biblioteca", "tomas"), ("cafeteria", "lucia"), ("aulas", "bruno"), ("residencia", "mateo"), ("biblioteca", "ines"), ("cafeteria", "nico")]


def cases_per_task(total_tasks: int) -> int:
    """Con pocos pendientes hay más casos por actividad, para que la semana no quede corta."""
    return 3 if total_tasks <= 2 else 2


def sort_tasks(tasks: list[dict]) -> list[dict]:
    return sorted(tasks, key=lambda t: DAYS.index(t["day"]) if t["day"] in DAYS else len(DAYS))


def template_week(tasks: list[dict], area: str) -> list[dict]:
    """No usa IA: coloca el nombre de cada pendiente en casos escritos para su área."""
    casos = pool(area)
    cantidad = cases_per_task(len(tasks))
    semana = []
    for i, tarea in enumerate(tasks):
        for j in range(cantidad):
            caso = casos[(i * cantidad + j) % len(casos)]
            semana.append({"task": tarea["name"], "scene": caso["scene"].replace("{task}", tarea["name"]),
                           "options": [dict(o) for o in caso["options"]]})
    return semana


def template_plan(tasks: list[dict]) -> dict:
    return {
        "summary": "Reporte base: Vela no estaba disponible, así que estos resultados salen solo de tus números.",
        "patterns": [],
        "strategies": [],
        "missions": [
            {"task": t["name"], "title": "Primer paso", "detail": f"Dedica 25 minutos a «{t['name']}», sin nada más abierto.",
             "when": "Antes de la fecha", "minutes": 25, "done": False}
            for t in tasks
        ],
    }
