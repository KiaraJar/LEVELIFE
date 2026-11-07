"""Fábrica de la aplicación Flask."""
from __future__ import annotations

from flask import Flask, jsonify, request, send_from_directory

from . import config, db
from .auth import auth_api
from .errors import ApiError
from .game import game_api
from .week import week_api


def create_app(db_path: str | None = None) -> Flask:
    app = Flask(__name__, static_folder=str(config.ROOT / "web"), static_url_path="/web")
    app.config["DB_PATH"] = db_path or config.DB_PATH
    app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
    db.init_app(app)
    app.register_blueprint(auth_api, url_prefix="/api/auth")
    app.register_blueprint(game_api, url_prefix="/api")
    app.register_blueprint(week_api, url_prefix="/api")

    @app.get("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    @app.before_request
    def csrf_guard():
        # Los formularios de otros sitios no pueden fijar esta cabecera sin pasar por CORS.
        if request.path.startswith("/api/") and request.method not in ("GET", "HEAD", "OPTIONS"):
            if request.headers.get("X-Levelife") != "1":
                raise ApiError(403, "bad_origin", "Petición no permitida.")

    @app.errorhandler(ApiError)
    def api_error(err: ApiError):
        return jsonify(error=err.message, code=err.code), err.status

    @app.after_request
    def headers(resp):
        resp.headers["Content-Security-Policy"] = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:"
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Referrer-Policy"] = "no-referrer"
        return resp

    return app
