"""API del juego: estado, historias, misiones, progreso, asistente y privacidad."""
from __future__ import annotations

import json
import time

from flask import Blueprint, current_app, g, jsonify

from . import config
from .ai import service
from .ai.patterns import build_facts, dimension_activity, find_choice
from .ai.safety import RISK_REPLY, has_risk
from .auth import ai_allowed, body, consent_of, login_required, play_required, terms_current
from .content.stories import STORIES, validate_stories
from .content.world import (
    AVATAR_OPTIONS, DIMENSIONS, FREE_ACCESSORIES, FREE_TOPS, HUD_INFO, MISSION_RECOVERY, REST_RECOVERY, REST_SECONDS, SIGNALS, START_RESOURCES, ZONES,
    choice_impact,
)
from .db import get_db
from .errors import ApiError
from .gamification import (
    BADGES, XP_MISSION, XP_REFLECTION, XP_STORY_FIRST, XP_STORY_REPLAY, XP_TUTORIAL, XP_ZONE, add_xp,
    completed_stories, grant_badges, level_info, owned_badges, rewards_for, touch_day,
)

game_api = Blueprint("game", __name__)
validate_stories()

REJECT_REASONS = {"no_me_sirve", "muy_dificil", "ahora_no"}
MODIFY_REQUESTS = {"mas_corta", "mas_facil", "otra_fecha"}
FEELINGS = {"facil", "regular", "dificil"}


def _user():
    return get_db().execute("SELECT * FROM users WHERE id = ?", (g.user["id"],)).fetchone()


def _badges_fresh(db, uid: int) -> list[dict]:
    return grant_badges(db, uid, len(STORIES))


def _resources(db, uid: int) -> dict:
    row = db.execute("SELECT energy, tension, performance, social FROM resources WHERE user_id = ?", (uid,)).fetchone()
    return dict(row) if row else dict(START_RESOURCES)


def _apply_resources(db, uid: int, change: dict) -> dict:
    current = _resources(db, uid)
    fresh = {k: max(0, min(100, current[k] + change[k])) for k in current}
    db.execute("INSERT OR REPLACE INTO resources (user_id, energy, tension, performance, social) VALUES (?,?,?,?,?)",
               (uid, fresh["energy"], fresh["tension"], fresh["performance"], fresh["social"]))
    return fresh


def _mission_view(row) -> dict:
    data = dict(row)
    data.pop("user_id", None)
    data["xp"] = XP_MISSION[data["difficulty"]]
    data["dimension_label"] = DIMENSIONS[data["dimension"]]
    return data


def _state() -> dict:
    db = get_db()
    user = _user()
    uid = user["id"]
    done = completed_stories(db, uid)
    level = level_info(user["xp"])
    badges = owned_badges(db, uid)
    consent = consent_of(db, uid)
    plays = {r["story_id"]: r["n"] for r in db.execute(
        "SELECT story_id, COUNT(*) AS n FROM story_runs WHERE user_id = ? AND finished_at IS NOT NULL GROUP BY story_id", (uid,))}
    zones = {k: {**z, "open": len(done) >= z["unlock"]} for k, z in ZONES.items()}
    return {
        "user": {
            "name": user["name"], "nickname": user["nickname"], "email": user["email"],
            "avatar": json.loads(user["avatar"]) if user["avatar"] else None,
            "position": json.loads(user["position"]), "visited": json.loads(user["visited"]),
            "intro_done": bool(user["intro_done"]), "tutorial_done": bool(user["tutorial_done"]),
            "created_at": user["created_at"],
        },
        "terms_ok": terms_current(db, uid),
        "consent": consent and {"ai": bool(consent["ai_consent"]), "version": consent["docs_version"], "at": consent["created_at"]},
        "docs_version": config.DOCS_VERSION,
        "level": level,
        "hud": HUD_INFO,
        "resources": _resources(db, uid),
        "zones": zones,
        "stories": [
            {"id": s["id"], "title": s["title"], "zone": s["zone"], "blurb": s["blurb"], "npc": s["npc"],
             "cast": s["cast"], "open": zones[s["zone"]]["open"], "plays": plays.get(s["id"], 0)}
            for s in STORIES.values()
        ],
        "badges": [{"id": k, **v, "owned": k in badges} for k, v in BADGES.items()],
        "rewards": rewards_for(level["level"], badges),
        "missions_open": db.execute(
            "SELECT COUNT(*) FROM missions WHERE user_id = ? AND status IN ('propuesta','activa')", (uid,)).fetchone()[0],
        "ai": service.status(),
    }


@game_api.get("/state")
@login_required
def state():
    db = get_db()
    touch_day(db, g.user["id"])
    fresh = _badges_fresh(db, g.user["id"]) if terms_current(db, g.user["id"]) else []
    db.commit()
    return jsonify({**_state(), "new_badges": fresh})


@game_api.put("/avatar")
@play_required
def save_avatar():
    avatar = body().get("avatar")
    if not isinstance(avatar, dict):
        raise ApiError(400, "invalid_avatar", "Apariencia no válida.")
    clean = {}
    for key, count in AVATAR_OPTIONS.items():
        value = avatar.get(key)
        if type(value) is not int or not 0 <= value < count:
            raise ApiError(400, "invalid_avatar", "Apariencia no válida.")
        clean[key] = value
    db = get_db()
    owned = [r for r in rewards_for(level_info(_user()["xp"])["level"], owned_badges(db, g.user["id"])) if r["owned"]]
    if clean["accessory"] >= FREE_ACCESSORIES and clean["accessory"] not in {r["value"] for r in owned if r["kind"] == "accessory"}:
        raise ApiError(403, "locked_item", "Ese accesorio aún no está desbloqueado.")
    if clean["top"] >= FREE_TOPS and clean["top"] not in {r["value"] for r in owned if r["kind"] == "top"}:
        raise ApiError(403, "locked_item", "Esa prenda aún no está desbloqueada.")
    db.execute("UPDATE users SET avatar = ? WHERE id = ?", (json.dumps(clean), g.user["id"]))
    db.commit()
    return jsonify(_state())


@game_api.post("/position")
@play_required
def save_position():
    data = body()
    if not isinstance(data.get("map"), str) or len(data["map"]) > 20:
        raise ApiError(400, "invalid_position", "Posición no válida.")
    if type(data.get("x")) is not int or type(data.get("y")) is not int:
        raise ApiError(400, "invalid_position", "Posición no válida.")
    db = get_db()
    db.execute("UPDATE users SET position = ? WHERE id = ?",
               (json.dumps({"map": data["map"], "x": data["x"], "y": data["y"]}), g.user["id"]))
    db.commit()
    return jsonify(ok=True)


@game_api.post("/flags")
@play_required
def set_flags():
    data = body()
    db = get_db()
    user = _user()
    reward = 0
    if data.get("intro"):
        db.execute("UPDATE users SET intro_done = 1 WHERE id = ?", (user["id"],))
    if data.get("tutorial") is not None:
        db.execute("UPDATE users SET tutorial_done = 1 WHERE id = ?", (user["id"],))
        if data["tutorial"] == "completo" and not user["tutorial_done"]:
            reward = XP_TUTORIAL
            add_xp(db, user["id"], reward)
    db.commit()
    return jsonify(xp=reward, state=_state())


@game_api.post("/visit")
@play_required
def visit():
    zone = body().get("zone")
    if zone not in ZONES:
        raise ApiError(400, "invalid_zone", "Zona desconocida.")
    db = get_db()
    user = _user()
    visited = json.loads(user["visited"])
    reward = 0
    if zone not in visited:
        visited.append(zone)
        reward = XP_ZONE
        db.execute("UPDATE users SET visited = ? WHERE id = ?", (json.dumps(visited), user["id"]))
        add_xp(db, user["id"], reward)
    fresh = _badges_fresh(db, user["id"])
    db.commit()
    return jsonify(xp=reward, new_badges=fresh, state=_state())


@game_api.post("/rest")
@play_required
def rest():
    """Sentarse o descansar recupera recursos, con una espera para que no se abuse."""
    db = get_db()
    uid = g.user["id"]
    last = db.execute("SELECT at FROM rests WHERE user_id = ?", (uid,)).fetchone()
    now = time.time()
    if last and now - last["at"] < REST_SECONDS:
        return jsonify(rested=False, resources=_resources(db, uid))
    db.execute("INSERT OR REPLACE INTO rests (user_id, at) VALUES (?,?)", (uid, now))
    resources = _apply_resources(db, uid, REST_RECOVERY)
    db.commit()
    return jsonify(rested=True, resources=resources)


# ---------------------------------------------------------------- Historias
def _public_node(story: dict, node_id: str) -> dict:
    """Lo que ve el navegador. Nunca incluye las señales del análisis."""
    node = story["nodes"][node_id]
    public = {"id": node_id, "lines": node["lines"]}
    if "end" in node:
        public.update(end=node["end"], reflect=node["reflect"])
    else:
        public["choices"] = [{"id": c["id"], "text": c["text"], "impact": choice_impact(c)} for c in node["choices"]]
    return public


def _run(run_id: int):
    run = get_db().execute("SELECT * FROM story_runs WHERE id = ? AND user_id = ?", (run_id, g.user["id"])).fetchone()
    if run is None:
        raise ApiError(404, "run_not_found", "No encontramos esa partida.")
    if run["finished_at"]:
        raise ApiError(409, "run_finished", "Esta historia ya terminó.")
    return run


@game_api.post("/stories/<story_id>/start")
@play_required
def story_start(story_id: str):
    story = STORIES.get(story_id)
    if story is None:
        raise ApiError(404, "story_not_found", "Esa historia no existe.")
    db = get_db()
    uid = g.user["id"]
    if len(completed_stories(db, uid)) < ZONES[story["zone"]]["unlock"]:
        raise ApiError(403, "story_locked", "Esta historia aún está bloqueada.")
    db.execute("DELETE FROM story_runs WHERE user_id = ? AND finished_at IS NULL", (uid,))
    cur = db.execute("INSERT INTO story_runs (user_id, story_id, node) VALUES (?,?,?)", (uid, story_id, story["start"]))
    db.commit()
    return jsonify(run_id=cur.lastrowid, title=story["title"], cast=story["cast"], node=_public_node(story, story["start"]))


@game_api.post("/runs/<int:run_id>/choose")
@play_required
def run_choose(run_id: int):
    run = _run(run_id)
    story = STORIES[run["story_id"]]
    node = story["nodes"][run["node"]]
    choice_id = body().get("choice")
    choice = next((c for c in node.get("choices", []) if c["id"] == choice_id), None)
    if choice is None:
        raise ApiError(400, "invalid_choice", "Esa alternativa no está disponible.")
    db = get_db()
    if ai_allowed(db, g.user["id"]):  # sin consentimiento no se registra qué se eligió
        db.execute("INSERT INTO decisions (run_id, user_id, story_id, node, choice) VALUES (?,?,?,?,?)",
                   (run_id, g.user["id"], run["story_id"], run["node"], choice_id))
    db.execute("UPDATE story_runs SET node = ? WHERE id = ?", (choice["next"], run_id))
    resources = _apply_resources(db, g.user["id"], choice_impact(choice))
    db.commit()
    return jsonify(node=_public_node(story, choice["next"]), resources=resources)


@game_api.post("/runs/<int:run_id>/finish")
@play_required
def run_finish(run_id: int):
    run = _run(run_id)
    story = STORIES[run["story_id"]]
    if "end" not in story["nodes"][run["node"]]:
        raise ApiError(400, "run_not_ended", "La historia aún no llega a su desenlace.")
    db = get_db()
    uid = g.user["id"]
    allowed = ai_allowed(db, uid)
    reflection = str(body().get("reflection") or "").strip()[:600] or None
    before = level_info(_user()["xp"])["level"]
    first = run["story_id"] not in completed_stories(db, uid)
    db.execute("UPDATE story_runs SET ending = ?, reflection = ?, finished_at = datetime('now','localtime') WHERE id = ?",
               (run["node"], reflection if allowed else None, run_id))
    rewards = [{"label": "Historia vivida" if first else "Otra mirada", "xp": XP_STORY_FIRST if first else XP_STORY_REPLAY}]
    if reflection:
        rewards.append({"label": "Reflexión", "xp": XP_REFLECTION})
    add_xp(db, uid, sum(r["xp"] for r in rewards))
    touch_day(db, uid)
    missions = [] if allowed else service.catalog_missions(db, uid, 1)
    fresh = _badges_fresh(db, uid)
    db.commit()
    agent_run = service.start_analysis(db, current_app.config["DB_PATH"], uid, story["title"]) if allowed else None
    level = level_info(_user()["xp"])
    support = RISK_REPLY if reflection and has_risk(reflection) else None
    return jsonify(rewards=rewards, agent_run=agent_run, support=support, missions=[_mission_view(m) for m in missions],
                   new_badges=fresh, level=level, level_up=level["level"] > before, state=_state())


@game_api.get("/agent/runs/<int:run_id>")
@play_required
def agent_run(run_id: int):
    db = get_db()
    row = db.execute("SELECT * FROM agent_runs WHERE id = ? AND user_id = ?", (run_id, g.user["id"])).fetchone()
    if row is None:
        raise ApiError(404, "run_not_found", "No encontramos ese análisis.")
    body_data = json.loads(row["body"]) if row["body"] else {}
    ids = body_data.get("mission_ids", [])
    rows = [db.execute("SELECT * FROM missions WHERE id = ? AND user_id = ?", (i, g.user["id"])).fetchone() for i in ids]
    return jsonify(status=row["status"], analysis=body_data.get("analysis"),
                   missions=[_mission_view(r) for r in rows if r], state=_state())


# ----------------------------------------------------------------- Misiones
def _quick_change(mission: dict, kind: str) -> dict:
    """Ajustes directos que no necesitan al agente."""
    adapted = dict(mission)
    if kind == "mas_corta":
        adapted["minutes"] = max(2, mission["minutes"] // 2)
    elif kind == "mas_facil":
        adapted["difficulty"] = max(1, mission["difficulty"] - 1)
        adapted["minutes"] = max(2, round(mission["minutes"] * 0.7))
    else:
        adapted["frequency"] = "Cuando te acomode este mes"
    return adapted


def _mission(mission_id: int, *allowed: str):
    row = get_db().execute("SELECT * FROM missions WHERE id = ? AND user_id = ?", (mission_id, g.user["id"])).fetchone()
    if row is None:
        raise ApiError(404, "mission_not_found", "No encontramos esa misión.")
    if row["status"] not in allowed:
        raise ApiError(409, "mission_closed", "Esa misión no admite esta acción.")
    return row


@game_api.get("/missions")
@play_required
def missions_list():
    rows = get_db().execute(
        "SELECT * FROM missions WHERE user_id = ? ORDER BY COALESCE(completed_at, created_at) DESC, id DESC", (g.user["id"],))
    return jsonify(missions=[_mission_view(r) for r in rows], ai=service.status())


@game_api.post("/missions/request")
@play_required
def missions_request():
    db = get_db()
    created = service.request_missions(db, g.user["id"], 1, ai_allowed(db, g.user["id"]))
    db.commit()
    if not created:
        raise ApiError(409, "missions_full", "Ya tienes 5 misiones abiertas, o no quedan nuevas por ahora.")
    return jsonify(missions=[_mission_view(m) for m in created], state=_state())


@game_api.post("/missions/<int:mission_id>/accept")
@play_required
def mission_accept(mission_id: int):
    _mission(mission_id, "propuesta")
    db = get_db()
    db.execute("UPDATE missions SET status = 'activa' WHERE id = ?", (mission_id,))
    db.commit()
    return jsonify(state=_state())


@game_api.post("/missions/<int:mission_id>/reject")
@play_required
def mission_reject(mission_id: int):
    _mission(mission_id, "propuesta", "activa")
    reason = body().get("reason")
    if reason not in REJECT_REASONS:
        raise ApiError(400, "invalid_reason", "Motivo no válido.")
    db = get_db()
    db.execute("UPDATE missions SET status = 'rechazada', reject_reason = ? WHERE id = ?", (reason, mission_id))
    db.commit()
    return jsonify(state=_state())


@game_api.post("/missions/<int:mission_id>/modify")
@play_required
def mission_modify(mission_id: int):
    mission = dict(_mission(mission_id, "propuesta", "activa"))
    data = body()
    request_kind = data.get("request")
    text = str(data.get("text") or "").strip()[:200]
    db = get_db()
    if request_kind in MODIFY_REQUESTS:
        adapted = _quick_change(mission, request_kind)
    elif text:
        if not ai_allowed(db, g.user["id"]):
            raise ApiError(403, "consent_required", "Para pedirle cambios a Vela, activa el análisis en Configuración.")
        adapted = service.adapt_mission(db, g.user["id"], mission, text)
        if adapted is None:
            raise ApiError(503, "agent_unavailable", service.SIN_AGENTE)
    else:
        raise ApiError(400, "invalid_request", "Cuéntanos qué cambio necesitas.")
    db.execute("UPDATE missions SET description = ?, minutes = ?, difficulty = ?, frequency = ? WHERE id = ?",
               (adapted["description"], adapted["minutes"], adapted["difficulty"], adapted["frequency"], mission_id))
    db.commit()
    row = db.execute("SELECT * FROM missions WHERE id = ?", (mission_id,)).fetchone()
    return jsonify(mission=_mission_view(row))


@game_api.post("/missions/<int:mission_id>/complete")
@play_required
def mission_complete(mission_id: int):
    mission = _mission(mission_id, "activa")
    data = body()
    feeling = data.get("feeling")
    if feeling not in FEELINGS:
        raise ApiError(400, "invalid_feeling", "Cuéntanos cómo te fue.")
    db = get_db()
    uid = g.user["id"]
    before = level_info(_user()["xp"])["level"]
    note = str(data.get("note") or "").strip()[:400] or None
    feedback = service.mission_feedback(db, uid, dict(mission), feeling, note) if ai_allowed(db, uid) else None
    db.execute("UPDATE missions SET status = 'completada', note = ?, feedback = ?, completed_at = datetime('now','localtime') WHERE id = ?",
               (note, feedback, mission_id))
    xp = XP_MISSION[mission["difficulty"]]
    add_xp(db, uid, xp)
    _apply_resources(db, uid, MISSION_RECOVERY)
    touch_day(db, uid)
    fresh = _badges_fresh(db, uid)
    db.commit()
    level = level_info(_user()["xp"])
    return jsonify(xp=xp, feedback=feedback, new_badges=fresh, level=level, level_up=level["level"] > before, state=_state())


# ----------------------------------------------------------- Progreso e historial
@game_api.get("/progress")
@play_required
def progress():
    db = get_db()
    uid = g.user["id"]
    allowed = ai_allowed(db, uid)
    facts = build_facts(db, uid) if allowed else {"signals": []}
    counts = {r["status"]: r["n"] for r in db.execute(
        "SELECT status, COUNT(*) AS n FROM missions WHERE user_id = ? GROUP BY status", (uid,))}
    last = db.execute("SELECT engine, body, created_at FROM analyses WHERE user_id = ? ORDER BY id DESC LIMIT 1", (uid,)).fetchone()
    return jsonify(
        dimensions=dimension_activity(db, uid),
        missions={"done": counts.get("completada", 0), "active": counts.get("activa", 0), "proposed": counts.get("propuesta", 0)},
        stories_done=len(completed_stories(db, uid)), stories_total=len(STORIES),
        strengths=[s["phrase"] for s in facts["signals"] if s["kind"] == "recurso"][:4],
        growth=[s["focus"] for s in facts["signals"] if s["kind"] == "oportunidad"][:4],
        analysis={**json.loads(last["body"]), "engine": last["engine"], "date": last["created_at"][:10]} if last else None,
        ai=service.status(),
    )


@game_api.get("/history")
@play_required
def history():
    db = get_db()
    uid = g.user["id"]
    runs = []
    for run in db.execute("SELECT * FROM story_runs WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY id DESC", (uid,)).fetchall():
        story = STORIES[run["story_id"]]
        picks = [find_choice(d["story_id"], d["node"], d["choice"])
                 for d in db.execute("SELECT * FROM decisions WHERE run_id = ? ORDER BY id", (run["id"],))]
        runs.append({"title": story["title"], "ending": story["nodes"][run["ending"]]["end"], "date": run["finished_at"][:10],
                     "reflection": run["reflection"], "decisions": [p["text"] for p in picks if p]})
    return jsonify(runs=runs)


# ----------------------------------------------------------------- Asistente
@game_api.get("/assistant")
@play_required
def assistant_history():
    rows = get_db().execute(
        "SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 40", (g.user["id"],)).fetchall()
    return jsonify(messages=[dict(r) for r in rows][::-1], ai=service.status())


@game_api.post("/assistant")
@play_required
def assistant_send():
    message = str(body().get("message") or "").strip()
    if not message or len(message) > 500:
        raise ApiError(400, "invalid_message", "Escribe un mensaje de hasta 500 caracteres.")
    db = get_db()
    result = service.chat(db, g.user["id"], message, ai_allowed(db, g.user["id"]))
    db.commit()
    return jsonify(result)


# ---------------------------------------------------------------- Privacidad
@game_api.get("/me/records")
@login_required
def my_records():
    db = get_db()
    uid = g.user["id"]
    table = lambda sql: [dict(r) for r in db.execute(sql, (uid,))]  # noqa: E731
    decisions = []
    for row in db.execute("SELECT * FROM decisions WHERE user_id = ? ORDER BY id", (uid,)).fetchall():
        choice = find_choice(row["story_id"], row["node"], row["choice"])
        decisions.append({"fecha": row["created_at"], "historia": STORIES[row["story_id"]]["title"],
                          "decision": choice and choice["text"],
                          "relacionado_con": [SIGNALS[s]["phrase"] for s in choice["signals"]] if choice else []})
    return jsonify(
        recursos=_resources(db, uid),
        semanas=table("SELECT tasks, day, plan, created_at FROM weeks WHERE user_id = ?"),
        cuenta={"nombre": g.user["name"], "usuario": g.user["nickname"], "correo": g.user["email"], "creada": g.user["created_at"]},
        consentimientos=table("SELECT docs_version, terms_accepted, privacy_read, ai_consent, created_at FROM consents WHERE user_id = ?"),
        decisiones=decisions,
        reflexiones=table("SELECT story_id, reflection, finished_at FROM story_runs WHERE user_id = ? AND reflection IS NOT NULL"),
        analisis=table("SELECT engine, body, created_at FROM analyses WHERE user_id = ?"),
        misiones=table("SELECT title, dimension, status, note, feedback, created_at, completed_at FROM missions WHERE user_id = ?"),
        asistente=table("SELECT role, content, created_at FROM chat_messages WHERE user_id = ?"),
    )


@game_api.delete("/me/records")
@login_required
def delete_records():
    """Borra lo analizable. Conserva XP, insignias e historias terminadas para no perder el avance."""
    db = get_db()
    uid = g.user["id"]
    for sql in (
        "DELETE FROM decisions WHERE user_id = ?",
        "DELETE FROM resources WHERE user_id = ?",
        "DELETE FROM weeks WHERE user_id = ?",
        "DELETE FROM analyses WHERE user_id = ?",
        "DELETE FROM chat_messages WHERE user_id = ?",
        "DELETE FROM missions WHERE user_id = ? AND status != 'completada'",
        "UPDATE story_runs SET reflection = NULL WHERE user_id = ?",
        "UPDATE missions SET note = NULL, reason = '', signal = NULL, feedback = NULL WHERE user_id = ?",
    ):
        db.execute(sql, (uid,))
    db.commit()
    return jsonify(ok=True)
