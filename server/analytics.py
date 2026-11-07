"""Motor de telemetría: calcula el reporte sin depender de ningún modelo.

Todos los números salen de lo que realmente se eligió. Describe estilos de afrontamiento
y costes de oportunidad dentro del juego: nunca salud, ni rasgos de la persona.
"""
from __future__ import annotations

from . import config
from .content.world import choice_impact

DIMENSIONS = {
    "energy": "Energía Ejecutiva y Descanso",
    "tension": "Tensión Cognitiva",
    "performance": "Rendimiento Académico",
    "social": "Red de Apoyo y Conexión Social",
}
LOW, HIGH_TENSION = 30, 70

PATTERNS = {
    "sin_pausas": ("sacrificio_descanso", "Sacrificar descanso para avanzar", "Fija una hora de cierre antes de empezar a estudiar."),
    "sobrecarga": ("centralizacion_estres", "Centralizar toda la carga", "Divide lo que tienes en bloques y atiende uno a la vez."),
    "postergar": ("posposicion_decisiva", "Posponer decisiones clave", "Define el paso más pequeño y hazlo hoy."),
    "complacer": ("prioridad_ajena", "Anteponer pedidos ajenos", "Ofrece un tiempo acotado antes de aceptar."),
    "evitar": ("evitacion_conversacion", "Evitar conversaciones incómodas", "Prepara una frase breve para abrir el tema."),
    "autocritica": ("dialogo_exigente", "Exigencia alta con uno mismo", "Separa el resultado de una tarea de tu valor."),
    "priorizar": ("priorizacion_activa", "Priorizar antes de actuar", "Reserva una pausa dentro de tu plan."),
    "pedir_apoyo": ("busqueda_apoyo", "Buscar apoyo en otras personas", "Pide ayuda temprano, antes de que urja."),
    "poner_limites": ("limites_claros", "Comunicar tus límites", "Combina tu límite con una alternativa concreta."),
    "aprender": ("aprendizaje_iterativo", "Aprender de cada intento", "Limita el tiempo de revisión para no dispersarte."),
    "descansar": ("recuperacion_activa", "Proteger la recuperación", "Agenda tu descanso junto a tus entregas."),
    "equilibrar": ("busqueda_equilibrio", "Buscar puntos medios", "Decide de antemano qué parte no negociarás."),
}
STRATEGIES = {
    "energy": "Protege un bloque de descanso de 20 minutos antes de tu siguiente tarea.",
    "tension": "Saca todos tus pendientes de la cabeza a una lista y elige solo uno.",
    "performance": "Trabaja 25 minutos en tu pendiente más próximo, sin nada más abierto.",
    "social": "Escríbele hoy a una persona de tu clase para repasar o conversar.",
}
REFERRAL = "Si la carga se mantiene, conversar con Bienestar Universitario o con tu tutoría psicopedagógica puede darte más opciones."


def _estado(clave: str, valor: int) -> str | None:
    if clave == "tension":
        return "Tensión elevada" if valor > HIGH_TENSION else None
    return "Nivel bajo" if valor < LOW else None


def _consecuencia(etiqueta: str, veces: int, total: dict) -> str:
    def nombre(clave: str) -> str:
        return DIMENSIONS[clave].split(" y ")[0]

    favorable = {k: (v < 0 if k == "tension" else v > 0) for k, v in total.items()}
    ganancias = [f"{v:+d}% {nombre(k)}" for k, v in total.items() if v and favorable[k]]
    costos = [f"{v:+d}% {nombre(k)}" for k, v in total.items() if v and not favorable[k]]
    frase = f"Elegir «{etiqueta}» {veces} veces"
    if ganancias and costos:
        return f"{frase} dejó {', '.join(ganancias)}, con un coste de oportunidad de {', '.join(costos)}."
    if ganancias:
        return f"{frase} dejó {', '.join(ganancias)}."
    return f"{frase} tuvo un coste de oportunidad de {', '.join(costos)}." if costos else f"{frase} no movió tus recursos."


def analyze_session(history: list[dict], resources: dict) -> dict:
    """history son los casos de la sesión; solo cuentan los que guardan la opción elegida."""
    grupos: dict[str, dict] = {}
    for caso in history:
        if "chosen" not in caso:
            continue
        opcion = caso["options"][caso["chosen"]]
        impacto = choice_impact(opcion)
        for codigo in opcion["signals"]:
            grupo = grupos.setdefault(codigo, {"veces": 0, "total": dict.fromkeys(DIMENSIONS, 0)})
            grupo["veces"] += 1
            for clave, valor in impacto.items():
                grupo["total"][clave] += valor
    patrones = []
    for codigo, grupo in sorted(grupos.items(), key=lambda par: -par[1]["veces"]):
        if grupo["veces"] < 2:
            continue
        etiqueta, nombre, guia = PATTERNS[codigo]
        patrones.append({"code": codigo, "tag": etiqueta, "label": nombre, "count": grupo["veces"],
                         "consequence": _consecuencia(nombre, grupo["veces"], grupo["total"]), "guidance": guia})
    dimensiones = [{"key": k, "label": v, "value": resources[k], "alert": _estado(k, resources[k])} for k, v in DIMENSIONS.items()]
    return {
        "dimensions": dimensiones, "patterns": patrones,
        "alerts": [f"{d['label']}: {d['value']}%" for d in dimensiones if d["alert"]],
        "referral": {"text": REFERRAL, "url": config.WELLBEING_URL or None},
    }


def hard_situations(history: list[dict], limite: int = 2) -> list[dict]:
    """Casos cuya respuesta costó más recursos: es lo que los números pueden mostrar."""
    casos = []
    for caso in history:
        if "chosen" not in caso:
            continue
        opcion = caso["options"][caso["chosen"]]
        i = choice_impact(opcion)
        costo = max(0, -i["energy"]) + max(0, i["tension"]) + max(0, -i["performance"]) + max(0, -i["social"])
        if costo:
            casos.append({"task": caso.get("task"), "situation": caso["scene"], "chose": opcion["text"], "code": opcion["signals"][0], "cost": costo})
    return sorted(casos, key=lambda c: -c["cost"])[:limite]


def default_goals(dificiles: list[dict]) -> list[dict]:
    return [{
        "situation": c["situation"],
        "goal": "Responder con más margen la próxima vez que ocurra algo parecido.",
        "steps": ["Antes de decidir, pausa dos minutos y nombra qué es lo prioritario.", PATTERNS[c["code"]][2], "Al terminar, anota qué funcionó y qué cambiarías."],
        "measure": "Lo cumples si usas estos pasos en tu próxima situación parecida.",
    } for c in dificiles]


def style_line(history: list[dict]) -> str | None:
    """Comentario sin modelo: describe lo elegido en el juego, nunca la personalidad."""
    conteo: dict[str, int] = {}
    for caso in history:
        if "chosen" in caso:
            for codigo in caso["options"][caso["chosen"]]["signals"]:
                conteo[codigo] = conteo.get(codigo, 0) + 1
    if not conteo:
        return None
    codigo, veces = max(conteo.items(), key=lambda par: par[1])
    nombre = PATTERNS[codigo][1].lower()
    if veces == 1:
        return f"Por ahora solo es una pista: en tu última decisión aparece «{nombre}»."
    return f"Hasta ahora parece que tiendes a «{nombre}». Solo describe tus decisiones en el juego."


def default_strategies(dimensions: list[dict]) -> list[str]:
    """Dos microestrategias según lo más exigido de la sesión."""
    def urgencia(d: dict) -> int:
        return d["value"] if d["key"] == "tension" else 100 - d["value"]

    return [STRATEGIES[d["key"]] for d in sorted(dimensions, key=urgencia, reverse=True)[:2]]
