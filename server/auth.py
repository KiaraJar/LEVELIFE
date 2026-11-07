"""Cuentas: registro, sesión, recuperación y consentimientos."""
from __future__ import annotations

import hashlib
import re
import secrets
import sqlite3
import time
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, g, jsonify, make_response, request
from werkzeug.security import check_password_hash, generate_password_hash

from . import config
from .content.legal import DOCUMENTS
from .db import get_db
from .errors import ApiError

auth_api = Blueprint("auth", __name__)

COOKIE = "levelife_session"
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
NICKNAME = re.compile(r"^[A-Za-z0-9_áéíóúÁÉÍÓÚñÑ]{3,20}$")
MAX_FAILURES, WINDOW = 5, 600.0
_DUMMY_HASH = generate_password_hash("levelife-sin-cuenta")


def body() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def _sha(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _new_recovery_code() -> tuple[str, str]:
    raw = secrets.token_hex(8).upper()
    code = "-".join(raw[i:i + 4] for i in range(0, 16, 4))
    return code, generate_password_hash(code)


def _validate_password(password: str, confirm: str) -> None:
    if password != confirm:
        raise ApiError(400, "password_mismatch", "Las contraseñas no coinciden.")
    if len(password) < 8 or not re.search(r"[A-Za-zÁ-ú]", password) or not re.search(r"\d", password):
        raise ApiError(400, "weak_password", "La contraseña necesita al menos 8 caracteres, con letras y números.")


def _clean_identity(data: dict) -> tuple[str, str, str]:
    name = str(data.get("name") or "").strip()[:60]
    nickname = str(data.get("nickname") or "").strip()
    email = str(data.get("email") or "").strip().lower()[:120]
    if len(name) < 2:
        raise ApiError(400, "invalid_name", "Escribe tu nombre.")
    if not NICKNAME.match(nickname):
        raise ApiError(400, "invalid_nickname", "El nombre de usuario debe tener de 3 a 20 letras, números o guiones bajos.")
    if not EMAIL.match(email):
        raise ApiError(400, "invalid_email", "Escribe un correo electrónico válido.")
    return name, nickname, email


def _open_session(user_id: int, status: int = 200, **payload):
    token = secrets.token_urlsafe(32)
    expires = datetime.now() + timedelta(days=config.SESSION_DAYS)
    get_db().execute("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)",
                     (_sha(token), user_id, expires.isoformat(timespec="seconds")))
    get_db().commit()
    resp = make_response(jsonify(payload), status)
    resp.set_cookie(COOKIE, token, max_age=config.SESSION_DAYS * 86400, httponly=True, samesite="Lax",
                    secure=config.SECURE_COOKIES or request.is_secure, path="/")
    return resp


def current_user():
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    return get_db().execute(
        "SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id "
        "WHERE s.token_hash = ? AND s.expires_at > ?",
        (_sha(token), datetime.now().isoformat(timespec="seconds")),
    ).fetchone()


def consent_of(db: sqlite3.Connection, user_id: int):
    return db.execute("SELECT * FROM consents WHERE user_id = ? ORDER BY id DESC LIMIT 1", (user_id,)).fetchone()


def terms_current(db: sqlite3.Connection, user_id: int) -> bool:
    row = consent_of(db, user_id)
    return bool(row and row["docs_version"] == config.DOCS_VERSION and row["terms_accepted"] and row["privacy_read"])


def ai_allowed(db: sqlite3.Connection, user_id: int) -> bool:
    row = consent_of(db, user_id)
    return bool(row and row["ai_consent"])


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        g.user = current_user()
        if g.user is None:
            raise ApiError(401, "not_authenticated", "Inicia sesión para continuar.")
        return view(*args, **kwargs)
    return wrapped


def play_required(view):
    """Las funciones del juego exigen sesión y documentos vigentes aceptados."""
    @wraps(view)
    @login_required
    def wrapped(*args, **kwargs):
        if not terms_current(get_db(), g.user["id"]):
            raise ApiError(403, "terms_required", "Debes aceptar los términos para continuar.")
        return view(*args, **kwargs)
    return wrapped


# ---------------------------------------------------------------- Límite de intentos
def _failure_key(login: str) -> str:
    return _sha(f"{login.lower()}|{request.remote_addr}")


def _check_rate(login: str) -> None:
    db = get_db()
    db.execute("DELETE FROM auth_failures WHERE at < ?", (time.time() - WINDOW,))
    count = db.execute("SELECT COUNT(*) FROM auth_failures WHERE key = ?", (_failure_key(login),)).fetchone()[0]
    if count >= MAX_FAILURES:
        raise ApiError(429, "too_many_attempts", "Demasiados intentos. Espera unos minutos.")


def _fail(login: str, code: str, message: str) -> ApiError:
    db = get_db()
    db.execute("INSERT INTO auth_failures (key, at) VALUES (?,?)", (_failure_key(login), time.time()))
    db.commit()
    return ApiError(401, code, message)


# --------------------------------------------------------------------- Rutas
@auth_api.post("/register")
def register():
    data = body()
    name, nickname, email = _clean_identity(data)
    password = str(data.get("password") or "")
    _validate_password(password, str(data.get("confirm") or ""))
    code, recovery_hash = _new_recovery_code()
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO users (name, nickname, email, pass_hash, recovery_hash) VALUES (?,?,?,?,?)",
            (name, nickname, email, generate_password_hash(password), recovery_hash),
        )
    except sqlite3.IntegrityError:
        raise ApiError(409, "account_exists", "Ese nombre de usuario o correo ya está registrado.")
    return _open_session(cur.lastrowid, 201, recovery_code=code)


@auth_api.post("/login")
def login():
    data = body()
    identifier = str(data.get("login") or "").strip()
    password = str(data.get("password") or "")
    _check_rate(identifier)
    row = get_db().execute(
        "SELECT * FROM users WHERE nickname = ? OR email = ?", (identifier, identifier)
    ).fetchone()
    valid = check_password_hash(row["pass_hash"] if row else _DUMMY_HASH, password)
    if row is None or not valid:
        raise _fail(identifier, "bad_credentials", "Usuario o contraseña incorrectos.")
    return _open_session(row["id"], ok=True)


@auth_api.post("/logout")
def logout():
    token = request.cookies.get(COOKIE)
    if token:
        db = get_db()
        db.execute("DELETE FROM sessions WHERE token_hash = ?", (_sha(token),))
        db.commit()
    resp = make_response(jsonify(ok=True))
    resp.delete_cookie(COOKIE, path="/")
    return resp


@auth_api.post("/recover")
def recover():
    """Cambia la contraseña con el código de recuperación entregado al registrarse."""
    data = body()
    identifier = str(data.get("login") or "").strip()
    code = str(data.get("code") or "").strip().upper()
    password = str(data.get("password") or "")
    _check_rate(identifier)
    _validate_password(password, str(data.get("confirm") or ""))
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE nickname = ? OR email = ?", (identifier, identifier)).fetchone()
    valid = check_password_hash(row["recovery_hash"] if row else _DUMMY_HASH, code)
    if row is None or not valid:
        raise _fail(identifier, "bad_recovery", "Los datos de recuperación no son correctos.")
    fresh, fresh_hash = _new_recovery_code()
    db.execute("UPDATE users SET pass_hash = ?, recovery_hash = ? WHERE id = ?",
               (generate_password_hash(password), fresh_hash, row["id"]))
    db.execute("DELETE FROM sessions WHERE user_id = ?", (row["id"],))
    return _open_session(row["id"], recovery_code=fresh)


@auth_api.patch("/account")
@login_required
def update_account():
    name, nickname, email = _clean_identity(body())
    db = get_db()
    try:
        db.execute("UPDATE users SET name = ?, nickname = ?, email = ? WHERE id = ?",
                   (name, nickname, email, g.user["id"]))
    except sqlite3.IntegrityError:
        raise ApiError(409, "account_exists", "Ese nombre de usuario o correo ya está registrado.")
    db.commit()
    return jsonify(ok=True)


def _require_password(password: str) -> None:
    if not check_password_hash(g.user["pass_hash"], password):
        raise ApiError(403, "bad_password", "La contraseña actual no es correcta.")


@auth_api.post("/password")
@login_required
def change_password():
    data = body()
    _require_password(str(data.get("current") or ""))
    password = str(data.get("password") or "")
    _validate_password(password, str(data.get("confirm") or ""))
    db = get_db()
    db.execute("UPDATE users SET pass_hash = ? WHERE id = ?", (generate_password_hash(password), g.user["id"]))
    db.execute("DELETE FROM sessions WHERE user_id = ?", (g.user["id"],))
    return _open_session(g.user["id"], ok=True)


@auth_api.delete("/account")
@login_required
def delete_account():
    _require_password(str(body().get("password") or ""))
    db = get_db()
    db.execute("DELETE FROM users WHERE id = ?", (g.user["id"],))
    db.commit()
    resp = make_response(jsonify(ok=True))
    resp.delete_cookie(COOKIE, path="/")
    return resp


@auth_api.get("/legal")
def legal():
    return jsonify(version=config.DOCS_VERSION, documents=DOCUMENTS)


@auth_api.post("/legal/accept")
@login_required
def accept_legal():
    data = body()
    if data.get("terms") is not True or data.get("privacy") is not True:
        raise ApiError(400, "acceptance_required", "Debes aceptar los términos y confirmar que leíste la política.")
    db = get_db()
    db.execute(
        "INSERT INTO consents (user_id, docs_version, terms_accepted, privacy_read, ai_consent) VALUES (?,?,1,1,?)",
        (g.user["id"], config.DOCS_VERSION, int(data.get("ai_consent") is True)),
    )
    db.commit()
    return jsonify(ok=True)


@auth_api.patch("/consent")
@login_required
def change_consent():
    """Cada cambio queda como una nueva fila: el historial de consentimiento no se reescribe."""
    db = get_db()
    last = consent_of(db, g.user["id"])
    if last is None:
        raise ApiError(403, "terms_required", "Debes aceptar los términos para continuar.")
    db.execute(
        "INSERT INTO consents (user_id, docs_version, terms_accepted, privacy_read, ai_consent) VALUES (?,?,?,?,?)",
        (g.user["id"], last["docs_version"], last["terms_accepted"], last["privacy_read"],
         int(body().get("ai_consent") is True)),
    )
    db.commit()
    return jsonify(ok=True)
