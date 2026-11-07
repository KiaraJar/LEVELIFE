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

ZONES = {
    "plaza": {"name": "Plaza central", "unlock": 0},
    "biblioteca": {"name": "Biblioteca", "unlock": 0},
    "cafeteria": {"name": "Cafetería", "unlock": 0},
    "aulas": {"name": "Aulas", "unlock": 1},
    "parque": {"name": "Parque universitario", "unlock": 2},
    "residencia": {"name": "Residencia universitaria", "unlock": 3},
}

# Cantidad de opciones por atributo. Deben coincidir con web/js/art.js.
AVATAR_OPTIONS = {
    "body": 3, "skin": 6, "hairStyle": 8, "hairColor": 8, "face": 4, "top": 6, "topColor": 8,
    "bottom": 4, "bottomColor": 6, "shoes": 3, "shoesColor": 5, "accessory": 10,
}
FREE_ACCESSORIES = 6  # los accesorios 6 a 9 se ganan como recompensa
FREE_TOPS = 4  # las prendas 4 y 5 se ganan como recompensa
