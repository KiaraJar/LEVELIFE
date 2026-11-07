"""Semana 8: convierte cada pendiente real en casos jugables, y las decisiones en un plan con misiones."""
from __future__ import annotations

import json

from flask import Blueprint, g, jsonify

from .ai import service
from .analytics import analyze_session, default_goals, default_strategies, hard_situations, style_line
from .ai.safety import RISK_REPLY, has_risk
from .auth import ai_allowed, body, play_required
from .content.week import DAYS, SLOTS, cases_per_task, sort_tasks, template_plan, template_week
from .content.scenarios import AREAS, conflicts, public_areas
from .content.world import MISSION_RECOVERY, START_RESOURCES, choice_impact
from .db import get_db
from .errors import ApiError
from .game import _apply_resources, _resources

week_api = Blueprint("week", __name__)
MAX_TASKS = 5


def _current(db):
    return db.execute("SELECT * FROM weeks WHERE user_id = ? ORDER BY id DESC LIMIT 1", (g.user["id"],)).fetchone()


def _public_day(days: list[dict], index: int) -> dict | None:
    if index >= len(days):
        return None
    day = days[index]
    zone, npc = SLOTS[index % len(SLOTS)]
    return {
        "index": index, "name": day.get("task", ""), "zone": zone, "npc": npc, "scene": day["scene"],
        "options": [{"id": i, "text": o["text"], "impact": choice_impact(o)} for i, o in enumerate(day["options"])],
    }


def _view(row) -> dict | None:
    if row is None:
        return None
    days = json.loads(row["days"])
    return {
        "tasks": json.loads(row["tasks"]), "day": row["day"], "total": len(days), "source": row["source"],
        "current": _public_day(days, row["day"]), "finished": row["day"] >= len(days),
        "plan": json.loads(row["plan"]) if row["plan"] else None,
    }


def verdict(impact: dict, resources: dict, analysis: str | None) -> dict:
    """El veredicto sale de los números del juego y habla de la decisión, no de la persona."""
    if impact["performance"] > 0:
        label = "Hoy rindes"
    elif impact["performance"] < 0:
        label = "Hoy no rindes"
    else:
        label = "Hoy mantienes tu rendimiento"
    if resources["energy"] <= 30 or resources["tension"] >= 70:
        label += ", pero a un costo alto"
    if analysis:
        text = analysis
    elif impact["performance"] > 0:
        text = "Parece que esta decisión te acerca a tus entregas, aunque consume recursos."
    else:
        text = "Quizá esta decisión te da aire ahora, aunque deja menos avance para después."
    return {"label": label, "text": text, "performance": impact["performance"]}


def _clean_tasks(raw) -> list[dict]:
    if not isinstance(raw, list):
        raise ApiError(400, "invalid_tasks", "Escribe al menos un pendiente.")
    tasks = []
    for item in raw[:MAX_TASKS]:
        name = str((item or {}).get("name") or "").strip()[:80] if isinstance(item, dict) else ""
        day = item.get("day") if isinstance(item, dict) else None
        if name:
            tasks.append({"name": name, "day": day if day in DAYS else "Sin fecha"})
    if not tasks:
        raise ApiError(400, "invalid_tasks", "Escribe al menos un pendiente.")
    return tasks


@week_api.get("/week")
@play_required
def week_state():
    return jsonify(week=_view(_current(get_db())), ai=service.status(), areas=public_areas())


@week_api.post("/week")
@play_required
def week_create():
    data = body()
    area = data.get("area")
    if area not in AREAS:
        raise ApiError(400, "invalid_area", "Elige tu área de estudios.")
    tasks = sort_tasks(_clean_tasks(data.get("tasks")))
    if any(has_risk(t["name"]) for t in tasks):
        return jsonify(support=RISK_REPLY, week=None)  # este texto nunca llega al modelo
    db = get_db()
    uid = g.user["id"]
    days, source = None, "plantilla"
    if ai_allowed(db, uid):
        days = service.generate_week(tasks, cases_per_task(len(tasks)), AREAS[area]["label"], conflicts(area))
        if days:
            source = "vela"
    days = days or template_week(tasks, area)
    db.execute("DELETE FROM resources WHERE user_id = ?", (uid,))
    db.execute("INSERT INTO weeks (user_id, tasks, days, source, area) VALUES (?,?,?,?,?)",
               (uid, json.dumps(tasks, ensure_ascii=False), json.dumps(days, ensure_ascii=False), source, area))
    db.commit()
    return jsonify(week=_view(_current(db)), resources=dict(START_RESOURCES))


@week_api.post("/week/choose")
@play_required
def week_choose():
    db = get_db()
    row = _current(db)
    if row is None:
        raise ApiError(404, "week_not_found", "Primero escribe tus pendientes.")
    days = json.loads(row["days"])
    if row["day"] >= len(days):
        raise ApiError(409, "week_finished", "Esta semana ya terminó.")
    option = body().get("option")
    choices = days[row["day"]]["options"]
    if type(option) is not int or not 0 <= option < len(choices):
        raise ApiError(400, "invalid_choice", "Esa alternativa no está disponible.")
    chosen = choices[option]
    if ai_allowed(db, g.user["id"]):  # sin consentimiento no se registra qué se eligió
        days[row["day"]]["chosen"] = option
    impact = choice_impact(chosen)
    resources = _apply_resources(db, g.user["id"], impact)
    db.execute("UPDATE weeks SET day = ?, days = ? WHERE id = ?",
               (row["day"] + 1, json.dumps(days, ensure_ascii=False), row["id"]))
    db.commit()
    return jsonify(result=chosen["result"], verdict=verdict(impact, resources, chosen.get("analysis")),
                   resources=resources, week=_view(_current(db)))


@week_api.post("/week/comment")
@play_required
def week_comment():
    """Comentario de Vela tras cada caso. Sin consentimiento no hay decisiones que comentar."""
    db = get_db()
    row = _current(db)
    if row is None or not ai_allowed(db, g.user["id"]):
        return jsonify(comment=None)
    days = json.loads(row["days"])
    if not any("chosen" in d for d in days):
        return jsonify(comment=None)
    return jsonify(comment=service.style_comment(days) or style_line(days))


@week_api.post("/week/plan")
@play_required
def week_plan():
    db = get_db()
    row = _current(db)
    if row is None or row["day"] < len(json.loads(row["days"])):
        raise ApiError(409, "week_open", "Termina tus casos para recibir tu plan.")
    if row["plan"]:
        return jsonify(plan=json.loads(row["plan"]))
    tasks, days = json.loads(row["tasks"]), json.loads(row["days"])
    resources = _resources(db, g.user["id"])
    report = analyze_session(days, resources)
    dificiles = hard_situations(days)
    narrative = None
    if ai_allowed(db, g.user["id"]):
        narrative = service.week_plan(tasks, days, report["patterns"], resources, AREAS[row["area"]]["label"], dificiles)
    narrative = narrative or template_plan(tasks)
    guias = {p["signal"]: p["guidance"] for p in narrative["patterns"]}
    for patron in report["patterns"]:
        patron["guidance"] = guias.get(patron["code"], patron["guidance"])
    strategies = (narrative["strategies"] + default_strategies(report["dimensions"]))[:2]
    goals = narrative.get("goals") or default_goals(dificiles)
    plan = {**report, "summary": narrative["summary"], "strategies": strategies, "goals": goals, "missions": narrative["missions"]}
    db.execute("UPDATE weeks SET plan = ? WHERE id = ?", (json.dumps(plan, ensure_ascii=False), row["id"]))
    db.commit()
    return jsonify(plan=plan)


@week_api.post("/week/missions/<int:index>/done")
@play_required
def week_mission_done(index: int):
    db = get_db()
    row = _current(db)
    plan = json.loads(row["plan"]) if row and row["plan"] else None
    if plan is None or not 0 <= index < len(plan["missions"]):
        raise ApiError(404, "mission_not_found", "No encontramos esa misión.")
    mission = plan["missions"][index]
    resources = _resources(db, g.user["id"])
    if not mission["done"]:
        mission["done"] = True
        resources = _apply_resources(db, g.user["id"], MISSION_RECOVERY)
        db.execute("UPDATE weeks SET plan = ? WHERE id = ?", (json.dumps(plan, ensure_ascii=False), row["id"]))
        db.commit()
    return jsonify(plan=plan, resources=resources)
