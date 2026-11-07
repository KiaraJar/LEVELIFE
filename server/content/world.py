"""Dimensiones, señales, zonas y opciones del personaje."""
from __future__ import annotations

DIMENSIONS = {
    "emocional": "Bienestar emocional",
    "organizacion": "Organización académica",
    "social": "Bienestar social",
    "fisico": "Bienestar físico",
    "personal": "Desarrollo personal",
}

# kind: "recurso" es algo que ya aparece; "oportunidad" es algo que podría explorarse.
SIGNALS = {
    "priorizar": {"dim": "organizacion", "kind": "recurso", "phrase": "ordenar y decidir qué va primero"},
    "pedir_apoyo": {"dim": "social", "kind": "recurso", "phrase": "apoyarte en otras personas"},
    "poner_limites": {"dim": "social", "kind": "recurso", "phrase": "decir hasta dónde llegas"},
    "aprender": {"dim": "personal", "kind": "recurso", "phrase": "buscar qué aprender de lo que pasa"},
    "descansar": {"dim": "fisico", "kind": "recurso", "phrase": "darle espacio a tu descanso"},
    "equilibrar": {"dim": "emocional", "kind": "recurso", "phrase": "buscar puntos medios"},
    "sobrecarga": {"dim": "organizacion", "kind": "oportunidad", "phrase": "cargar con todo al mismo tiempo",
                   "focus": "repartir la carga"},
    "postergar": {"dim": "organizacion", "kind": "oportunidad", "phrase": "dejar para después lo que pesa",
                  "focus": "dar un primer paso pequeño"},
    "complacer": {"dim": "social", "kind": "oportunidad", "phrase": "poner primero lo que otros necesitan",
                  "focus": "hacer espacio para lo tuyo"},
    "evitar": {"dim": "social", "kind": "oportunidad", "phrase": "esquivar conversaciones incómodas",
               "focus": "poner en palabras lo que pasa"},
    "autocritica": {"dim": "personal", "kind": "oportunidad", "phrase": "hablarte con dureza",
                    "focus": "tratarte con más amabilidad"},
    "sin_pausas": {"dim": "fisico", "kind": "oportunidad", "phrase": "dejar el descanso para el final",
                   "focus": "incluir pausas en tu día"},
}

# Efecto de cada señal en los recursos del juego. Todas tienen ganancias y costos:
# ninguna decisión es la mejor. Son reglas del juego, no una medida de la persona.
IMPACTS = {
    "priorizar": {"energy": -10, "tension": -10, "performance": 10, "social": 0},
    "pedir_apoyo": {"energy": -5, "tension": -15, "performance": 5, "social": 10},
    "poner_limites": {"energy": -5, "tension": -10, "performance": -5, "social": -5},
    "aprender": {"energy": -10, "tension": -5, "performance": 10, "social": 0},
    "descansar": {"energy": 15, "tension": -15, "performance": -10, "social": 0},
    "equilibrar": {"energy": -10, "tension": -10, "performance": 5, "social": 5},
    "sobrecarga": {"energy": -15, "tension": 15, "performance": 10, "social": -5},
    "postergar": {"energy": 10, "tension": 15, "performance": -10, "social": 0},
    "complacer": {"energy": -15, "tension": -5, "performance": -5, "social": 5},
    "evitar": {"energy": 5, "tension": 10, "performance": -5, "social": -10},
    "autocritica": {"energy": -15, "tension": 15, "performance": 5, "social": -5},
    "sin_pausas": {"energy": -15, "tension": 15, "performance": 10, "social": -5},
}
MAX_IMPACT = 15  # una sola decisión no debe agotar los recursos
MISSION_RECOVERY = {"energy": 15, "tension": -10, "performance": 0, "social": 0}
REST_RECOVERY = {"energy": 12, "tension": -8, "performance": 0, "social": 0}
REST_SECONDS = 90
START_RESOURCES = {"energy": 80, "tension": 30, "performance": 50, "social": 50}
HUD_INFO = {"student": "Estudiante", "semester": "Semestre 1", "cycle": "Semana 8: Exámenes Parciales"}


def choice_impact(choice: dict) -> dict:
    total = {"energy": 0, "tension": 0, "performance": 0, "social": 0}
    for code in choice["signals"]:
        for key, value in IMPACTS[code].items():
            total[key] += value
    return {key: max(-MAX_IMPACT, min(MAX_IMPACT, value)) for key, value in total.items()}


ZONES = {
    "plaza": {"name": "Plaza central", "unlock": 0},
    "biblioteca": {"name": "Biblioteca", "unlock": 0},
    "cafeteria": {"name": "Cafetería", "unlock": 0},
    "aulas": {"name": "Laboratorio de Cómputo", "unlock": 0},
    "parque": {"name": "Parque universitario", "unlock": 2},
    "residencia": {"name": "Residencia universitaria", "unlock": 0},
}

# Cantidad de opciones por atributo. Deben coincidir con web/js/art.js.
AVATAR_OPTIONS = {
    "body": 3, "skin": 6, "hairStyle": 8, "hairColor": 8, "face": 4, "top": 6, "topColor": 8,
    "bottom": 4, "bottomColor": 6, "shoes": 3, "shoesColor": 5, "accessory": 10,
}
FREE_ACCESSORIES = 6  # los accesorios 6 a 9 se ganan como recompensa
FREE_TOPS = 4  # las prendas 4 y 5 se ganan como recompensa
