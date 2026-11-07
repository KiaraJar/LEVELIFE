"""XP, niveles, insignias y recompensas. Nunca dependen de qué se eligió."""
from __future__ import annotations

import json
import sqlite3
from datetime import date

from .content.world import ZONES

XP_STORY_FIRST, XP_STORY_REPLAY, XP_REFLECTION, XP_ZONE, XP_TUTORIAL = 40, 15, 15, 10, 10
XP_MISSION = {1: 30, 2: 50, 3: 80}
LEVEL_TITLES = ["Primer día", "Paso firme", "Mapa en mano", "Ruta propia", "Guía del campus", "Leyenda serena"]

BADGES = {
    "primera_historia": {"name": "Primera página", "desc": "Viviste tu primera historia.", "icon": "libro"},
    "tres_historias": {"name": "Buen oyente", "desc": "Completaste tres historias distintas.", "icon": "voz"},
    "todas_historias": {"name": "Cronista", "desc": "Completaste todas las historias.", "icon": "pluma"},
    "otra_mirada": {"name": "Otra mirada", "desc": "Repetiste una historia para ver otro camino.", "icon": "ojo"},
    "reflexiva": {"name": "Pausa consciente", "desc": "Escribiste tres reflexiones.", "icon": "hoja"},
    "primera_mision": {"name": "Paso real", "desc": "Completaste tu primera misión.", "icon": "bota"},
    "cinco_misiones": {"name": "Constancia", "desc": "Completaste cinco misiones.", "icon": "estrella"},
    "explorador": {"name": "Mapa completo", "desc": "Visitaste todas las zonas del campus.", "icon": "mapa"},
    "tres_dias": {"name": "Regreso", "desc": "Volviste tres días distintos.", "icon": "sol"},
}

# Recompensas visuales que se ganan participando.
REWARDS = [
    {"id": "corona", "name": "Corona de hojas", "kind": "accessory", "value": 6, "level": 2},
    {"id": "chaqueta", "name": "Chaqueta del campus", "kind": "top", "value": 4, "level": 3},
    {"id": "capa", "name": "Capa viajera", "kind": "accessory", "value": 7, "level": 4},
    {"id": "gorra", "name": "Gorro de cronista", "kind": "accessory", "value": 8, "badge": "todas_historias"},
    {"id": "buzo", "name": "Buzo de la constancia", "kind": "top", "value": 5, "badge": "cinco_misiones"},
    {"id": "estrella", "name": "Insignia estelar", "kind": "accessory", "value": 9, "badge": "explorador"},
]


def level_info(xp: int) -> dict:
    level, floor, step = 1, 0, 100
    while xp >= floor + step:
        floor += step
        level += 1
        step += 50
    title = LEVEL_TITLES[min(level - 1, len(LEVEL_TITLES) - 1)]
    return {"level": level, "title": title, "xp": xp, "into": xp - floor, "needed": step}


def add_xp(db: sqlite3.Connection, user_id: int, amount: int) -> None:
    db.execute("UPDATE users SET xp = xp + ? WHERE id = ?", (amount, user_id))


def touch_day(db: sqlite3.Connection, user_id: int) -> None:
    db.execute("INSERT OR IGNORE INTO activity_days (user_id, day) VALUES (?,?)", (user_id, date.today().isoformat()))


def completed_stories(db: sqlite3.Connection, user_id: int) -> set[str]:
    rows = db.execute("SELECT DISTINCT story_id FROM story_runs WHERE user_id = ? AND finished_at IS NOT NULL", (user_id,))
    return {r["story_id"] for r in rows}


def owned_badges(db: sqlite3.Connection, user_id: int) -> set[str]:
    return {r["badge"] for r in db.execute("SELECT badge FROM badges WHERE user_id = ?", (user_id,))}


def rewards_for(level: int, badges: set[str]) -> list[dict]:
    return [{**r, "owned": r.get("level", 0) <= level and (not r.get("badge") or r["badge"] in badges)} for r in REWARDS]


def grant_badges(db: sqlite3.Connection, user_id: int, total_stories: int) -> list[dict]:
    done = completed_stories(db, user_id)
    runs = db.execute("SELECT COUNT(*) FROM story_runs WHERE user_id = ? AND finished_at IS NOT NULL", (user_id,)).fetchone()[0]
    reflections = db.execute("SELECT COUNT(*) FROM story_runs WHERE user_id = ? AND reflection IS NOT NULL", (user_id,)).fetchone()[0]
    missions = db.execute("SELECT COUNT(*) FROM missions WHERE user_id = ? AND status = 'completada'", (user_id,)).fetchone()[0]
    days = db.execute("SELECT COUNT(*) FROM activity_days WHERE user_id = ?", (user_id,)).fetchone()[0]
    visited = json.loads(db.execute("SELECT visited FROM users WHERE id = ?", (user_id,)).fetchone()["visited"])
    earned = {
        "primera_historia": len(done) >= 1, "tres_historias": len(done) >= 3,
        "todas_historias": len(done) >= total_stories, "otra_mirada": runs > len(done),
        "reflexiva": reflections >= 3, "primera_mision": missions >= 1, "cinco_misiones": missions >= 5,
        "explorador": set(ZONES) <= set(visited), "tres_dias": days >= 3,
    }
    have = owned_badges(db, user_id)
    fresh = []
    for badge, reached in earned.items():
        if reached and badge not in have:
            db.execute("INSERT INTO badges (user_id, badge) VALUES (?,?)", (user_id, badge))
            fresh.append({"id": badge, **BADGES[badge]})
    return fresh
