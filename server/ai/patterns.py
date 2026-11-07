"""Convierte decisiones en hechos comparables, sin ningún modelo.

Una señal solo es recurrente si aparece en dos o más historias distintas:
una decisión aislada nunca describe un patrón.
"""
from __future__ import annotations

import sqlite3

from ..content.stories import STORIES
from ..content.world import DIMENSIONS, SIGNALS
from .safety import has_risk


def find_choice(story_id: str, node: str, choice: str) -> dict | None:
    options = STORIES.get(story_id, {}).get("nodes", {}).get(node, {}).get("choices", [])
    return next((c for c in options if c["id"] == choice), None)


def build_facts(db: sqlite3.Connection, user_id: int) -> dict:
    tally: dict[str, dict] = {}
    rows = db.execute(
        "SELECT d.story_id, d.node, d.choice FROM decisions d JOIN story_runs r ON r.id = d.run_id "
        "WHERE d.user_id = ? AND r.finished_at IS NOT NULL ORDER BY d.id", (user_id,),
    )
    decisions = 0
    for row in rows:
        choice = find_choice(row["story_id"], row["node"], row["choice"])
        if choice is None:
            continue
        decisions += 1
        for code in choice["signals"]:
            entry = tally.setdefault(code, {"count": 0, "stories": set(), "last": None})
            entry["count"] += 1
            entry["stories"].add(row["story_id"])
            entry["last"] = {"story": STORIES[row["story_id"]]["title"], "text": choice["text"]}
    signals = [
        {"code": code, **SIGNALS[code], "count": e["count"], "recurrent": len(e["stories"]) >= 2,
         "stories": sorted(STORIES[s]["title"] for s in e["stories"]), "last": e["last"]}
        for code, e in tally.items()
    ]
    signals.sort(key=lambda s: (s["recurrent"], len(s["stories"]), s["count"]), reverse=True)
    missions = [dict(r) for r in db.execute(
        "SELECT title, dimension, signal, status, reject_reason FROM missions WHERE user_id = ?", (user_id,))]
    stories = db.execute(
        "SELECT COUNT(DISTINCT story_id) FROM story_runs WHERE user_id = ? AND finished_at IS NOT NULL", (user_id,)
    ).fetchone()[0]
    return {"stories_played": stories, "decisions": decisions, "signals": signals, "missions": missions}


def build_context(db: sqlite3.Connection, user_id: int) -> dict:
    """Instantánea para el agente. No incluye nombre, usuario ni correo."""
    facts = build_facts(db, user_id)
    history = []
    for run in db.execute(
        "SELECT id, story_id, ending, reflection FROM story_runs WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY id", (user_id,)
    ).fetchall():
        story = STORIES[run["story_id"]]
        picks = [find_choice(d["story_id"], d["node"], d["choice"])
                 for d in db.execute("SELECT story_id, node, choice FROM decisions WHERE run_id = ? ORDER BY id", (run["id"],))]
        reflection = run["reflection"]
        history.append({
            "story": story["title"], "ending": story["nodes"][run["ending"]]["end"],
            "decisions": [p["text"] for p in picks if p],
            # Un texto con señales de riesgo se atiende con ayuda fija y nunca llega al modelo.
            "reflection": None if reflection and has_risk(reflection) else reflection,
        })
    return {**facts, "history": history, "dimensions": dimension_activity(db, user_id)}


def dimension_activity(db: sqlite3.Connection, user_id: int) -> dict:
    """Progreso por participación: nunca por lo que se eligió en las historias."""
    activity = {key: {"label": label, "points": 0, "missions": 0} for key, label in DIMENSIONS.items()}
    for row in db.execute(
        "SELECT dimension, difficulty FROM missions WHERE user_id = ? AND status = 'completada'", (user_id,)
    ):
        if row["dimension"] in activity:
            activity[row["dimension"]]["points"] += 10 * row["difficulty"]
            activity[row["dimension"]]["missions"] += 1
    return activity
