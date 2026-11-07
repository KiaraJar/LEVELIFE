"""Ciclo completo por la API. Ejecuta: python -m unittest discover -s tests"""
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

os.environ["GEMINI_API_KEY"] = ""

from server import create_app  # noqa: E402
from server.ai import safety, service  # noqa: E402
from server.ai.patterns import build_context  # noqa: E402
from server.content.stories import STORIES, validate_stories  # noqa: E402
from server.db import connect  # noqa: E402
from server.gamification import level_info  # noqa: E402

CUENTA = {"name": "Ada Pérez", "nickname": "ada_1", "email": "ada@uni.edu", "password": "clave1234", "confirm": "clave1234"}
AVATAR = {"body": 0, "skin": 1, "hairStyle": 2, "hairColor": 3, "face": 0, "top": 1, "topColor": 2,
          "bottom": 0, "bottomColor": 1, "shoes": 0, "shoesColor": 0, "accessory": 0}


def mision(titulo, signal=None):
    return {"title": titulo, "dimension": "fisico", "description": "Camina.", "objective": "Moverte.", "minutes": 20,
            "difficulty": 2, "frequency": "Hoy", "reason": "Surge de tu decisión.", "signal": signal}


class AgenteFalso:
    """Reemplaza al modelo: estas pruebas validan el juego, no al proveedor."""
    name, label = "agente", "Vela de prueba"

    def __init__(self):
        self.mensajes, self.contextos, self.n = [], [], 0

    def analyze(self, ctx, titulo, cantidad):
        self.contextos.append(ctx)
        self.n += 1
        return {"summary": f"Viviste {titulo}.", "observations": [], "strengths": [], "opportunities": [],
                "tentative": not any(s["recurrent"] for s in ctx["signals"]),
                "missions": [mision(f"Misión {self.n}-{i}") for i in range(cantidad)]}

    def new_missions(self, ctx, cantidad):
        self.n += 1
        return [mision(f"Nueva {self.n}-{i}") for i in range(cantidad)]

    def adapt_mission(self, ctx, m, pedido):
        return {"description": f"Ajustada: {pedido}", "minutes": 5, "difficulty": 1, "frequency": "Mañana"}

    def mission_feedback(self, ctx, m, sensacion, nota):
        return "Gracias por intentarlo."

    def chat(self, mensaje, ctx, historial):
        self.mensajes.append(mensaje)
        return "Te leo."


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.addCleanup(self.tmp.cleanup)
        self.app = create_app(str(Path(self.tmp.name) / "t.db"))
        self.c = self.app.test_client()
        self.agente = AgenteFalso()
        parche = mock.patch.object(service, "get_agent", side_effect=lambda: self.agente)
        parche.start()
        self.addCleanup(parche.stop)

    def analisis(self, r):
        """Espera a que el agente termine, como hace el navegador."""
        for _ in range(200):
            estado = self.c.get(f"/api/agent/runs/{r.json['agent_run']}").json
            if estado["status"] != "pendiente":
                return estado
            time.sleep(0.01)
        self.fail("el agente no terminó")

    def post(self, path, data=None, **kw):
        return self.c.post(f"/api{path}", json=data or {}, headers={"X-Levelife": "1"}, **kw)

    def signup(self, ai=True, **cambios):
        r = self.post("/auth/register", {**CUENTA, **cambios})
        self.assertEqual(r.status_code, 201, r.json)
        self.post("/auth/legal/accept", {"terms": True, "privacy": True, "ai_consent": ai})
        return r.json

    def play(self, story="semana", pick=0, reflection="Me hizo pensar."):
        r = self.post(f"/stories/{story}/start")
        self.assertEqual(r.status_code, 200, r.json)
        run, node = r.json["run_id"], r.json["node"]
        while "choices" in node:
            node = self.post(f"/runs/{run}/choose", {"choice": node["choices"][pick % len(node["choices"])]["id"]}).json["node"]
        return self.post(f"/runs/{run}/finish", {"reflection": reflection})

    def count(self, sql):
        conn = connect(self.app.config["DB_PATH"])
        value = conn.execute(sql).fetchone()[0]
        conn.close()
        return value


class Cuentas(Base):
    def test_validaciones(self):
        for cambio, codigo in (({"email": "x"}, "invalid_email"), ({"confirm": "otra1234"}, "password_mismatch"),
                               ({"password": "corta1", "confirm": "corta1"}, "weak_password"),
                               ({"nickname": "a"}, "invalid_nickname")):
            self.assertEqual(self.post("/auth/register", {**CUENTA, **cambio}).json["code"], codigo)

    def test_duplicado(self):
        self.signup()
        self.assertEqual(self.post("/auth/register", {**CUENTA, "nickname": "otra"}).status_code, 409)

    def test_contrasena_guardada_con_hash(self):
        self.signup()
        conn = connect(self.app.config["DB_PATH"])
        fila = conn.execute("SELECT pass_hash, recovery_hash FROM users").fetchone()
        conn.close()
        self.assertTrue(fila["pass_hash"].startswith("scrypt:"))
        self.assertNotIn(CUENTA["password"], fila["pass_hash"])

    def test_login_y_logout(self):
        self.signup()
        self.post("/auth/logout")
        self.assertEqual(self.c.get("/api/state").status_code, 401)
        self.assertEqual(self.post("/auth/login", {"login": "ada_1", "password": "mal12345"}).status_code, 401)
        self.assertEqual(self.post("/auth/login", {"login": "ada@uni.edu", "password": CUENTA["password"]}).status_code, 200)
        self.assertEqual(self.c.get("/api/state").status_code, 200)

    def test_limite_de_intentos(self):
        self.signup()
        for _ in range(5):
            self.post("/auth/login", {"login": "ada_1", "password": "mal12345"})
        self.assertEqual(self.post("/auth/login", {"login": "ada_1", "password": CUENTA["password"]}).status_code, 429)

    def test_recuperacion(self):
        codigo = self.signup()["recovery_code"]
        self.post("/auth/logout")
        nueva = {"login": "ada_1", "password": "nueva1234", "confirm": "nueva1234"}
        self.assertEqual(self.post("/auth/recover", {**nueva, "code": "0000-0000"}).status_code, 401)
        r = self.post("/auth/recover", {**nueva, "code": codigo})
        self.assertEqual(r.status_code, 200)
        self.assertNotEqual(r.json["recovery_code"], codigo)
        self.post("/auth/logout")
        self.assertEqual(self.post("/auth/recover", {**nueva, "code": codigo}).status_code, 401, "el código es de un uso")
        self.assertEqual(self.post("/auth/login", {"login": "ada_1", "password": "nueva1234"}).status_code, 200)

    def test_exige_cabecera_csrf(self):
        self.assertEqual(self.c.post("/api/auth/login", json={}).status_code, 403)

    def test_eliminar_cuenta_borra_todo(self):
        self.signup()
        self.play()
        r = self.c.delete("/api/auth/account", json={"password": "mal12345"}, headers={"X-Levelife": "1"})
        self.assertEqual(r.status_code, 403)
        self.c.delete("/api/auth/account", json={"password": CUENTA["password"]}, headers={"X-Levelife": "1"})
        for tabla in ("users", "decisions", "missions", "consents", "story_runs"):
            self.assertEqual(self.count(f"SELECT COUNT(*) FROM {tabla}"), 0, tabla)


class Consentimiento(Base):
    def test_sin_terminos_no_se_juega(self):
        self.post("/auth/register", CUENTA)
        self.assertEqual(self.post("/stories/semana/start").json["code"], "terms_required")

    def test_aceptar_exige_ambas_casillas(self):
        self.post("/auth/register", CUENTA)
        self.assertEqual(self.post("/auth/legal/accept", {"terms": True}).status_code, 400)
        self.assertEqual(self.count("SELECT COUNT(*) FROM consents"), 0)

    def test_registra_version_y_es_independiente(self):
        self.signup(ai=False)
        estado = self.c.get("/api/state").json
        self.assertTrue(estado["terms_ok"])
        self.assertFalse(estado["consent"]["ai"])
        self.assertEqual(estado["consent"]["version"], estado["docs_version"])

    def test_sin_consentimiento_ia_no_guarda_decisiones(self):
        self.signup(ai=False)
        r = self.play()
        self.assertIsNone(r.json["agent_run"])
        self.assertEqual(self.count("SELECT COUNT(*) FROM decisions"), 0)
        self.assertEqual(self.count("SELECT COUNT(reflection) FROM story_runs"), 0)
        self.assertEqual(r.json["missions"][0]["signal"], None)

    def test_retirar_consentimiento_crea_registro(self):
        self.signup()
        self.c.patch("/api/auth/consent", json={"ai_consent": False}, headers={"X-Levelife": "1"})
        self.assertEqual(self.count("SELECT COUNT(*) FROM consents"), 2)
        self.assertFalse(self.c.get("/api/state").json["consent"]["ai"])


class Historias(Base):
    def test_contenido_valido(self):
        validate_stories()
        self.assertEqual(len(STORIES), 5)

    def test_todos_los_caminos_terminan(self):
        for story in STORIES.values():
            for node in story["nodes"].values():
                for choice in node.get("choices", []):
                    self.assertIn(choice["next"], story["nodes"])

    def test_el_navegador_no_ve_senales(self):
        self.signup()
        r = self.post("/stories/semana/start")
        self.assertNotIn("signals", str(r.json))

    def test_zonas_bloqueadas(self):
        self.signup()
        self.assertEqual(self.post("/stories/expectativas/start").status_code, 403)
        self.play()
        self.assertEqual(self.post("/stories/expectativas/start").status_code, 200)

    def test_recompensas_no_dependen_de_lo_elegido(self):
        xps = []
        for i in range(4):
            self.c = self.app.test_client()
            self.signup(nickname=f"ada{i}", email=f"ada{i}@uni.edu")
            xps.append(sum(x["xp"] for x in self.play(pick=i).json["rewards"]))
        self.assertEqual(len(set(xps)), 1)

    def test_una_decision_no_es_patron(self):
        self.signup()
        self.assertTrue(self.analisis(self.play())["analysis"]["tentative"])

    def test_patron_exige_dos_historias(self):
        self.signup()
        self.play("semana", pick=1)  # termina eligiendo poner límites
        analisis = self.analisis(self.play("no", pick=1))["analysis"]  # la misma señal, en otra historia
        self.assertFalse(analisis["tentative"])

    def test_no_se_elige_dos_veces_despues_de_terminar(self):
        self.signup()
        r = self.post("/stories/semana/start")
        run, node = r.json["run_id"], r.json["node"]
        while "choices" in node:
            node = self.post(f"/runs/{run}/choose", {"choice": "a"}).json["node"]
        self.post(f"/runs/{run}/finish")
        self.assertEqual(self.post(f"/runs/{run}/finish").status_code, 409)


class Misiones(Base):
    def primera(self):
        return self.analisis(self.play())["missions"][0]

    def test_ciclo_completo(self):
        self.signup()
        m = self.primera()
        self.assertEqual(m["status"], "propuesta")
        for campo in ("title", "description", "dimension_label", "objective", "minutes", "difficulty", "frequency", "reason"):
            self.assertTrue(m[campo], campo)
        self.assertEqual(self.post(f"/missions/{m['id']}/complete", {"feeling": "facil"}).status_code, 409)
        self.post(f"/missions/{m['id']}/accept")
        r = self.post(f"/missions/{m['id']}/complete", {"feeling": "dificil", "note": "Costó."})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json["feedback"])
        self.assertTrue(any(b["id"] == "primera_mision" for b in r.json["new_badges"]))

    def test_modificar_rapido_y_con_el_agente(self):
        self.signup()
        m = self.primera()
        r = self.post(f"/missions/{m['id']}/modify", {"request": "mas_corta"})
        self.assertLess(r.json["mission"]["minutes"], m["minutes"])
        r = self.post(f"/missions/{m['id']}/modify", {"text": "solo tengo las noches"})
        self.assertEqual(r.json["mission"]["description"], "Ajustada: solo tengo las noches")

    def test_sin_clave_el_juego_sigue_y_lo_indica(self):
        self.signup()
        with mock.patch.object(service, "get_agent", return_value=None):
            estado = self.analisis(self.play())
            self.assertEqual(estado["status"], "no_disponible")
            self.assertEqual(self.post("/assistant", {"message": "hola"}).json["reply"], service.SIN_AGENTE)
            pedida = self.post("/missions/request")
        self.assertEqual(pedida.json["missions"][0]["engine"], "catalogo")

    def test_fallo_del_agente_no_rompe_la_partida(self):
        self.signup()
        with mock.patch.object(self.agente, "analyze", side_effect=RuntimeError("caído")):
            self.assertEqual(self.analisis(self.play())["status"], "no_disponible")

    def test_mision_repetida_no_se_guarda(self):
        self.signup()
        m = self.primera()
        self.agente.new_missions = lambda ctx, n: [mision(m["title"])]
        self.assertEqual(self.post("/missions/request").status_code, 409)

    def test_el_agente_ve_lo_rechazado(self):
        self.signup()
        m = self.primera()
        self.post(f"/missions/{m['id']}/reject", {"reason": "no_me_sirve"})
        self.analisis(self.play("no"))
        rechazadas = [x for x in self.agente.contextos[-1]["missions"] if x["status"] == "rechazada"]
        self.assertEqual(rechazadas[0]["reject_reason"], "no_me_sirve")

    def test_mision_ajena(self):
        self.signup()
        m = self.primera()
        self.c = self.app.test_client()
        self.signup(nickname="otra", email="otra@uni.edu")
        self.assertEqual(self.post(f"/missions/{m['id']}/accept").status_code, 404)


class Personaje(Base):
    def put(self, avatar):
        return self.c.put("/api/avatar", json={"avatar": avatar}, headers={"X-Levelife": "1"})

    def test_guardar_y_rangos(self):
        self.signup()
        self.assertEqual(self.put(AVATAR).status_code, 200)
        self.assertEqual(self.c.get("/api/state").json["user"]["avatar"], AVATAR)
        self.assertEqual(self.put({**AVATAR, "skin": 99}).status_code, 400)

    def test_recompensa_bloqueada(self):
        self.signup()
        self.assertEqual(self.put({**AVATAR, "accessory": 6}).status_code, 403)


class Asistente(Base):
    def test_riesgo_y_diagnostico_no_llegan_al_modelo(self):
        self.signup()
        r = self.post("/assistant", {"message": "Quisiera QUITARME la vida"})
        self.assertTrue(r.json["risk"])
        self.assertIn("emergencias", r.json["reply"])
        self.assertIn("no hago diagnósticos", self.post("/assistant", {"message": "¿tengo depresión?"}).json["reply"])
        self.assertEqual(self.agente.mensajes, [])

    def test_reflexion_de_riesgo_recibe_ayuda_y_no_llega_al_modelo(self):
        self.signup()
        r = self.play(reflection="A veces quiero morir")
        self.assertIn("emergencias", r.json["support"])
        self.analisis(r)
        self.assertIsNone(self.agente.contextos[-1]["history"][0]["reflection"])

    def test_sin_consentimiento_el_chat_no_llega_al_modelo(self):
        self.signup(ai=False)
        self.assertIn("autorización", self.post("/assistant", {"message": "hola"}).json["reply"])
        self.assertEqual(self.agente.mensajes, [])

    def test_datos_personales_no_van_al_agente(self):
        self.signup()
        self.play(reflection="Me hizo pensar.")
        conn = connect(self.app.config["DB_PATH"])
        contexto = str(build_context(conn, 1))
        conn.close()
        for dato in (CUENTA["name"], CUENTA["nickname"], CUENTA["email"]):
            self.assertNotIn(dato, contexto)

    def test_deteccion(self):
        self.assertFalse(safety.has_risk("me muero de la risa"))

    def test_indica_si_vela_esta_conectada(self):
        self.signup()
        self.assertTrue(self.c.get("/api/state").json["ai"]["available"])
        with mock.patch.object(service, "get_agent", return_value=None):
            self.assertFalse(self.c.get("/api/state").json["ai"]["available"])


class Privacidad(Base):
    def test_consultar_y_borrar(self):
        self.signup()
        self.analisis(self.play())
        xp = self.c.get("/api/state").json["level"]["xp"]
        registros = self.c.get("/api/me/records").json
        self.assertTrue(registros["decisiones"])
        self.c.delete("/api/me/records", headers={"X-Levelife": "1"})
        self.assertEqual(self.count("SELECT COUNT(*) FROM decisions"), 0)
        self.assertEqual(self.c.get("/api/state").json["level"]["xp"], xp)


class Niveles(unittest.TestCase):
    def test_umbrales(self):
        self.assertEqual(level_info(0)["level"], 1)
        self.assertEqual(level_info(100)["level"], 2)
        self.assertEqual(level_info(250)["level"], 3)


if __name__ == "__main__":
    unittest.main()
