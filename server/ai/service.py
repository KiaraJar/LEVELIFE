"""Orquesta a Vela: decide cuándo actúa, guarda sus resultados y nunca deja caer la partida."""
from __future__ import annotations

import json
import logging
import sqlite3
import threading

from .. import config, db as base
from ..content.missions import CATALOG, DEFAULT_ORDER
from . import safety
from .patterns import build_context

log = logging.getLogger("levelife.agente")
MAX_OPEN = 5
SIN_AGENTE = "Vela no está disponible ahora. Inténtalo más tarde."
_agente = None


def get_agent():
    """Devuelve el agente si hay credenciales; sin ellas, el juego lo indica en lugar de simularlo."""
    global _agente
    if not config.ai_ready():
        return None
    if _agente is None:
        from .agent import Agente

        _agente = Agente()
    return _agente


def status() -> dict:
    agente = get_agent()
    if agente is None:
        return {"available": False, "label": "Vela sin conectar: falta configurar la clave de IA"}
    return {"available": True, "label": agente.label}


def save_missions(db: sqlite3.Connection, user_id: int, missions: list[dict], engine: str) -> list[dict]:
    existentes = {r["title"].lower() for r in db.execute("SELECT title FROM missions WHERE user_id = ?", (user_id,))}
    abiertas = db.execute(
        "SELECT COUNT(*) FROM missions WHERE user_id = ? AND status IN ('propuesta','activa')", (user_id,)
    ).fetchone()[0]
    espacio = max(0, MAX_OPEN - abiertas)
    guardadas = []
    for mision in missions:
        if len(guardadas) >= espacio:
            break
        if mision["title"].lower() in existentes:
            continue
        cur = db.execute(
            "INSERT INTO missions (user_id, title, description, dimension, objective, minutes, difficulty, "
            "frequency, reason, signal, engine) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (user_id, mision["title"], mision["description"], mision["dimension"], mision["objective"],
             mision["minutes"], mision["difficulty"], mision["frequency"], mision["reason"],
             mision.get("signal"), engine),
        )
        guardadas.append(dict(db.execute("SELECT * FROM missions WHERE id = ?", (cur.lastrowid,)).fetchone()))
    return guardadas


def catalog_missions(db: sqlite3.Connection, user_id: int, count: int) -> list[dict]:
    """Misiones generales del catálogo: no usan datos del estudiante ni ninguna IA."""
    tomadas = {r["title"] for r in db.execute("SELECT title FROM missions WHERE user_id = ?", (user_id,))}
    elegidas: list[dict] = []
    for dimension in DEFAULT_ORDER:
        opcion = next((m for m in CATALOG if m["dimension"] == dimension and m["difficulty"] == 1 and m["title"] not in tomadas), None)
        if opcion and len(elegidas) < count:
            elegidas.append({**opcion, "signal": None, "reason": "Misión general del catálogo: no usa tus decisiones."})
    return save_missions(db, user_id, elegidas, "catalogo")


def _trabajar(ruta: str, run_id: int, user_id: int, titulo: str) -> None:
    conexion = base.connect(ruta)
    estado, cuerpo = "no_disponible", None
    try:
        agente = get_agent()
        if agente is not None:
            resultado = agente.analyze(build_context(conexion, user_id), titulo, 2)
            misiones = save_missions(conexion, user_id, resultado.pop("missions"), agente.name)
            conexion.execute("INSERT INTO analyses (user_id, engine, body) VALUES (?,?,?)",
                             (user_id, agente.name, json.dumps(resultado, ensure_ascii=False)))
            estado, cuerpo = "listo", json.dumps({"analysis": resultado, "mission_ids": [m["id"] for m in misiones]}, ensure_ascii=False)
    except Exception as error:  # un fallo del agente nunca debe romper la partida
        log.warning("Vela no pudo analizar (%s)", type(error).__name__)
    finally:
        if estado != "listo":
            generales = catalog_missions(conexion, user_id, 1)
            cuerpo = json.dumps({"analysis": None, "mission_ids": [m["id"] for m in generales]})
        conexion.execute("UPDATE agent_runs SET status = ?, body = ? WHERE id = ?", (estado, cuerpo, run_id))
        conexion.commit()
        conexion.close()


def start_analysis(db: sqlite3.Connection, ruta: str, user_id: int, titulo: str) -> int:
    """Registra el análisis y lo ejecuta aparte: el agente puede tardar y el juego no debe esperar."""
    run_id = db.execute("INSERT INTO agent_runs (user_id, story) VALUES (?,?)", (user_id, titulo)).lastrowid
    db.commit()
    threading.Thread(target=_trabajar, args=(ruta, run_id, user_id, titulo), daemon=True).start()
    return run_id


def request_missions(db: sqlite3.Connection, user_id: int, count: int, consented: bool) -> list[dict]:
    agente = get_agent()
    if consented and agente is not None:
        try:
            return save_missions(db, user_id, agente.new_missions(build_context(db, user_id), count), agente.name)
        except Exception as error:
            log.warning("Vela no pudo proponer misiones (%s)", type(error).__name__)
    return catalog_missions(db, user_id, count)


def adapt_mission(db: sqlite3.Connection, user_id: int, mission: dict, request: str) -> dict | None:
    agente = get_agent()
    if agente is None:
        return None
    try:
        return agente.adapt_mission(build_context(db, user_id), mission, request)
    except Exception as error:
        log.warning("Vela no pudo ajustar la misión (%s)", type(error).__name__)
        return None


def mission_feedback(db: sqlite3.Connection, user_id: int, mission: dict, feeling: str, note: str | None) -> str | None:
    agente = get_agent()
    if agente is None:
        return None
    if safety.has_risk(note or ""):
        return safety.RISK_REPLY
    try:
        return agente.mission_feedback(build_context(db, user_id), mission, feeling, note or "")
    except Exception as error:
        log.warning("Vela no pudo responder (%s)", type(error).__name__)
        return None


def generate_week(tareas: list[dict], cantidad: int, area: str, conflictos: list[str]) -> list[dict] | None:
    agente = get_agent()
    if agente is None:
        return None
    try:
        return agente.generate_week(tareas, cantidad, area, conflictos)
    except Exception as error:
        log.warning("Vela no pudo crear los casos (%s)", type(error).__name__)
        return None


def style_comment(casos: list[dict]) -> str | None:
    agente = get_agent()
    if agente is None:
        return None
    decisiones = [{"caso": c["scene"], "eligio": c["options"][c["chosen"]]["text"]} for c in casos if "chosen" in c]
    try:
        return agente.style_comment(decisiones)
    except Exception as error:
        log.warning("Vela no pudo comentar (%s)", type(error).__name__)
        return None


def week_plan(tareas: list[dict], casos: list[dict], patrones: list[dict], recursos: dict, area: str, dificiles: list[dict]) -> dict | None:
    agente = get_agent()
    if agente is None:
        return None
    decisiones = [{"actividad": c.get("task"), "caso": c["scene"], "eligio": c["options"][c["chosen"]]["text"],
                   "senales": c["options"][c["chosen"]]["signals"]} for c in casos if "chosen" in c]
    try:
        return agente.week_plan(tareas, decisiones, patrones, recursos, area, dificiles)
    except Exception as error:
        log.warning("Vela no pudo crear el plan (%s)", type(error).__name__)
        return None


def chat(db: sqlite3.Connection, user_id: int, message: str, consented: bool) -> dict:
    """Las guardas corren antes: un mensaje de riesgo nunca llega al modelo."""
    risk = safety.has_risk(message)
    if risk:
        reply = safety.RISK_REPLY
    elif safety.asks_diagnosis(message):
        reply = safety.DIAGNOSIS_REPLY
    elif not consented:
        reply = "Para conversar conmigo necesito tu autorización, porque tus mensajes se envían a un servicio de IA. Puedes activarla en Configuración."
    elif (agente := get_agent()) is None:
        reply = SIN_AGENTE
    else:
        historial = [dict(r) for r in db.execute(
            "SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 12", (user_id,))][::-1]
        while historial and historial[0]["role"] != "user":
            historial.pop(0)
        try:
            reply = agente.chat(message, build_context(db, user_id), historial)
        except Exception as error:
            log.warning("Vela no pudo responder (%s)", type(error).__name__)
            reply = SIN_AGENTE
    db.execute("INSERT INTO chat_messages (user_id, role, content) VALUES (?,?,?)", (user_id, "user", message))
    db.execute("INSERT INTO chat_messages (user_id, role, content) VALUES (?,?,?)", (user_id, "assistant", reply))
    return {"reply": reply, "risk": risk}
