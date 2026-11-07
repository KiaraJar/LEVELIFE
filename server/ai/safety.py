"""Guardas del asistente. Corren siempre, antes de cualquier motor."""
from __future__ import annotations

import re
import unicodedata

_RISK = re.compile(
    r"suicid|matarme|me quiero matar|quitarme la vida|acabar con mi vida|quiero morir|me quiero morir|"
    r"no quiero (seguir )?vivir|no vale la pena vivir|hacerme dano|autolesi|cortarme|lastimarme|"
    r"desaparecer para siempre|mejor sin mi|acabar con todo"
)
_DIAGNOSIS = re.compile(
    r"tengo (depresion|ansiedad|tdah|bipolaridad|un trastorno)|soy bipolar|diagnostic|estoy deprimid|"
    r"que trastorno|necesito medicamento|que pastilla|que medicina"
)

# Vocabulario clínico que el agente no debe atribuir al estudiante.
_CLINICAL = re.compile(r"diagn[oó]stic|trastorno|patolog|depresi[oó]n|depresiv|burnout|s[ií]ntoma|ansiedad cl[ií]nica|personalidad (evitativa|dependiente)", re.I)

RISK_REPLY = (
    "Lo que me cuentas importa, y gracias por decirlo. Soy parte de un juego y no puedo darte la ayuda "
    "que mereces, pero hay personas que sí. Si crees que podrías hacerte daño ahora, llama a la línea de "
    "emergencias de tu país o ve a urgencias, y avísale a alguien de confianza. También puedes acudir al "
    "servicio de bienestar de tu universidad o buscar una línea de ayuda en findahelpline.com. "
    "No tienes que pasar por esto en soledad."
)
DIAGNOSIS_REPLY = (
    "Eso no lo puedo responder: no hago diagnósticos ni recomiendo tratamientos, y lo que eliges en el "
    "juego tampoco sirve para saberlo. Una persona profesional de la salud puede orientarte; el servicio "
    "de bienestar de tu universidad es un buen punto de partida."
)


def normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text.lower())
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


def has_risk(text: str) -> bool:
    return bool(_RISK.search(normalize(text)))


def output_is_safe(text: str) -> bool:
    return not _CLINICAL.search(text)


def asks_diagnosis(text: str) -> bool:
    return bool(_DIAGNOSIS.search(normalize(text)))
