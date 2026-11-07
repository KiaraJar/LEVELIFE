"""Juega una partida real en Chrome, sin red externa: python tests/e2e.py"""
import json
import os
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright
from waitress import create_server

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))



class ApiFalsa(BaseHTTPRequestHandler):
    """Hace de proveedor de IA: consulta una herramienta y luego responde."""
    n = 0

    def do_POST(self):
        cuerpo = json.loads(self.rfile.read(int(self.headers["content-length"])))
        generacion = cuerpo.get("generationConfig", {})
        ya_consulto = any("functionResponse" in p for c in cuerpo["contents"] for p in c.get("parts", []))
        if generacion.get("responseMimeType") == "application/json":
            ApiFalsa.n += 1
            mision = {"title": f"Camino propio {ApiFalsa.n}", "dimension": "social", "description": "Escríbele a alguien de confianza.",
                      "objective": "Compartir cómo vas.", "minutes": 10, "difficulty": 1, "frequency": "Esta semana",
                      "reason": "Surge de tu decisión en la historia.", "signal": None}
            datos = {"missions": [mision]}
            if "summary" in json.dumps(generacion):
                datos = {"summary": "Parece que esta historia te hizo pensar en tu semana.", "observations": [{"text": "Quizá buscaste ordenar antes de actuar.", "signal": None}],
                         "strengths": ["detenerte a pensar"], "opportunities": ["pedir apoyo a tiempo"],
                         "missions": [mision, {**mision, "title": f"Pausa elegida {ApiFalsa.n}", "dimension": "fisico"}]}
            partes = [{"text": json.dumps(datos, ensure_ascii=False)}]
        elif ya_consulto:
            partes = [{"text": "Te leo. Parece que ha sido una semana intensa."}]
        else:
            partes = [{"functionCall": {"name": "ver_senales", "args": {}}}]
        respuesta = json.dumps({"candidates": [{"content": {"role": "model", "parts": partes}, "finishReason": "STOP"}],
                                "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 10}}).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(respuesta)))
        self.end_headers()
        self.wfile.write(respuesta)

    def log_message(self, *_):
        pass


api_falsa = ThreadingHTTPServer(("127.0.0.1", 0), ApiFalsa)
threading.Thread(target=api_falsa.serve_forever, daemon=True).start()
os.environ["GEMINI_API_KEY"] = "prueba"
os.environ["LEVELIFE_AI_BASE_URL"] = f"http://127.0.0.1:{api_falsa.server_port}"

from server import create_app  # noqa: E402

CAPTURAS = RAIZ / "tests" / "capturas"
CAPTURAS.mkdir(exist_ok=True)
errores: list[str] = []


def cap(p, nombre):
    p.wait_for_timeout(250)
    p.screenshot(path=str(CAPTURAS / f"{nombre}.png"))


def avanzar_dialogo(p, limite=60):
    """Pulsa Espacio hasta que aparezcan opciones o se cierre la caja."""
    for _ in range(limite):
        if p.locator("#dialogo-opciones button").count() or p.locator("#dialogo").is_hidden():
            return
        p.keyboard.press("Space")
        p.wait_for_timeout(60)


def teletransportar(p, x, y, dir_=0):
    p.evaluate(f"() => {{ const m = window.levelife.mundo; m.jugador.x = {x}*16; m.jugador.y = {y}*16; m.jugador.dir = {dir_}; m.revisarZona(); m.centrar(); }}")


def vivir_historia(p, x, y, dir_, nombre=None):
    teletransportar(p, x, y, dir_)
    p.keyboard.press("Space")
    p.wait_for_selector("#dialogo:not([hidden])")
    capturado = False
    for _ in range(8):
        avanzar_dialogo(p)
        if p.locator("#dialogo-opciones button").count():
            if nombre and not capturado:
                cap(p, f"{nombre}_decision")
                capturado = True
            p.keyboard.press("Enter")
            p.wait_for_timeout(120)
            continue
        break
    p.wait_for_selector("#capa textarea")
    if nombre:
        cap(p, f"{nombre}_reflexion")
    p.fill("#capa textarea", "Me hizo pensar en mi semana.")
    p.click("#capa >> text=Continuar")
    p.wait_for_selector("#capa >> text=Historia vivida")
    p.click("#capa >> text=Continuar")
    p.wait_for_selector("#capa >> text=Vela está analizando")
    p.wait_for_selector("#dialogo:not([hidden])")
    if nombre:
        cap(p, f"{nombre}_vela")
    avanzar_dialogo(p)
    p.wait_for_selector("#capa >> text=Nuevas misiones")
    if nombre:
        cap(p, f"{nombre}_misiones")
    p.locator("#capa .btn.verde").first.click()
    p.wait_for_timeout(250)
    p.click("#capa >> text=Decidir después")
    p.wait_for_timeout(150)


def jugar(navegador, url):
    contexto = navegador.new_context(viewport={"width": 1100, "height": 720})
    p = contexto.new_page()
    p.on("pageerror", lambda e: errores.append(f"pageerror: {e}"))
    p.on("console", lambda m: errores.append(f"console: {m.text}") if m.type == "error" and "401" not in m.text else None)
    p.goto(url)
    p.wait_for_selector("text=COMENZAR AVENTURA")
    p.wait_for_timeout(1000)
    cap(p, "01_portada")
    p.click("text=COMENZAR AVENTURA")
    for campo, valor in (("name", "Ada Pérez"), ("nickname", "ada_test"), ("email", "ada@uni.edu"), ("password", "clave1234"), ("confirm", "clave1234")):
        p.fill(f"input[name={campo}]", valor)
    cap(p, "02_registro")
    p.click("text=Crear cuenta")
    p.wait_for_selector(".codigo")
    p.click("text=Ya lo guardé")

    p.wait_for_selector("text=NO ACEPTO")
    assert p.locator("button:has-text('ACEPTO LOS TÉRMINOS')").is_disabled(), "aceptar debe iniciar desactivado"
    assert p.locator("input[type=checkbox]").evaluate_all("c => c.every(x => !x.checked)"), "ninguna casilla marcada"
    cap(p, "03_terminos")
    casillas = p.locator(".casilla input")
    casillas.nth(0).check()
    casillas.nth(1).check()
    casillas.nth(2).check()
    p.click("button:has-text('ACEPTO LOS TÉRMINOS')")

    p.wait_for_selector("text=CONFIRMAR PERSONAJE")
    p.click("text=PERSONALIZAR")
    cap(p, "04_editor")
    p.click("text=ALEATORIZAR")
    p.click("text=CONFIRMAR PERSONAJE")

    p.wait_for_selector("#dialogo:not([hidden])", timeout=8000)
    p.wait_for_timeout(1400)
    cap(p, "05_introduccion")
    avanzar_dialogo(p)
    p.wait_for_selector("text=Paso 1 de 6")
    cap(p, "06_tutorial")
    for _ in range(5):
        p.click("text=Siguiente")
    p.click("text=¡Listo!")
    p.wait_for_timeout(400)

    # El movimiento real debe cambiar la posición y las colisiones deben detenerlo.
    inicio = p.evaluate("() => window.levelife.mundo.jugador.x")
    p.keyboard.down("ArrowLeft")
    p.wait_for_timeout(500)
    p.keyboard.up("ArrowLeft")
    assert p.evaluate("() => window.levelife.mundo.jugador.x") < inicio, "el personaje no se movió"
    cap(p, "07_campus")
    teletransportar(p, 29, 25, 3)
    p.keyboard.down("ArrowUp")
    p.wait_for_timeout(800)
    p.keyboard.up("ArrowUp")
    assert p.evaluate("() => window.levelife.mundo.jugador.y") > 24 * 16, "la fuente debe bloquear el paso"

    # Puerta de la Biblioteca y primera historia.
    teletransportar(p, 29, 9, 3)
    p.keyboard.down("ArrowUp")
    p.wait_for_function("() => window.levelife.mundo.nombreMapa === 'biblioteca'", timeout=5000)
    p.keyboard.up("ArrowUp")
    p.wait_for_timeout(700)
    cap(p, "08_biblioteca")
    vivir_historia(p, 13, 10, 2, "09")
    assert p.evaluate("() => window.levelife.estado.zones.aulas.open"), "Aulas debe abrirse"

    p.click("#hud-misiones")
    p.wait_for_selector("text=MIS MISIONES DE BIENESTAR")
    cap(p, "10_misiones")
    p.locator("#capa >> text=Marcar completada").first.click()
    p.fill("#capa textarea", "Lo logré.")
    p.click("#capa >> text=Regular")
    p.wait_for_selector("text=¡Misión completada!")
    cap(p, "11_mision_ok")
    p.click("#capa >> text=Seguir")
    p.wait_for_selector("text=MIS MISIONES DE BIENESTAR")
    p.click("#capa >> text=Cerrar")

    # Menú completo.
    p.keyboard.press("m")
    p.wait_for_selector("#capa >> text=Menú")
    cap(p, "12_menu")
    for opcion, espera, nombre in (
        ("Mi progreso", "text=Lo que eliges en las historias", "13_progreso"),
        ("Mi historial", "text=Desenlace", "14_historial"),
        ("Mis logros", "text=Primera página", "15_logros"),
        ("Inventario", "text=Corona de hojas", "16_inventario"),
        ("Mapa del campus", ".mapa-img", "17_mapa"),
        ("Configuración", "text=Privacidad y consentimientos", "18_configuracion"),
    ):
        p.click(f"#capa button:has-text('{opcion}')")
        p.wait_for_selector(espera)
        cap(p, nombre)
        p.click("#capa >> text=Volver")
        p.wait_for_selector("#capa >> text=Mi progreso")
    p.click("#capa button:has-text('Mi asistente IA')")
    p.wait_for_selector(".chat")
    p.fill("#capa input", "¿Qué has notado en mis decisiones?")
    p.keyboard.press("Enter")
    p.wait_for_selector(".chat .assistant >> nth=1")
    cap(p, "19_asistente")
    p.click("#capa >> text=Cerrar")

    # Persistencia al recargar.
    p.evaluate("() => window.levelife.guardarPosicion(true)")
    p.wait_for_timeout(300)
    p.reload()
    p.wait_for_function("() => window.levelife?.ocupado === false", timeout=8000)
    assert p.evaluate("() => window.levelife.estado.user.nickname") == "ada_test"
    assert p.evaluate("() => window.levelife.mundo.nombreMapa") == "biblioteca", "debe conservar el mapa"
    contexto.close()


def movil(navegador, url):
    contexto = navegador.new_context(viewport={"width": 390, "height": 760}, has_touch=True, is_mobile=True)
    p = contexto.new_page()
    p.on("pageerror", lambda e: errores.append(f"movil: {e}"))
    p.goto(url)
    p.wait_for_selector("text=COMENZAR AVENTURA")
    p.wait_for_timeout(1000)
    cap(p, "20_movil_portada")
    p.click("text=YA TENGO UNA CUENTA")
    p.fill("input[name=login]", "ada_test")
    p.fill("input[name=password]", "clave1234")
    p.click("button:has-text('Entrar')")
    p.wait_for_function("() => window.levelife?.ocupado === false", timeout=8000)
    assert p.locator("#tactil").is_visible(), "la cruceta debe verse"
    teletransportar(p, 9, 9, 0)
    cap(p, "21_movil_mundo")
    inicio = p.evaluate("() => window.levelife.mundo.jugador.y")
    caja = p.locator("[data-dir=up]").bounding_box()
    p.dispatch_event("[data-dir=up]", "pointerdown")
    p.wait_for_timeout(400)
    p.dispatch_event("[data-dir=up]", "pointerup")
    assert caja and p.evaluate("() => window.levelife.mundo.jugador.y") < inicio, "la cruceta debe mover"
    contexto.close()


def main():
    tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
    os.environ.pop("LEVELIFE_DB", None)
    app = create_app(str(Path(tmp.name) / "e2e.db"))
    servidor = create_server(app, host="127.0.0.1", port=0, threads=8)
    threading.Thread(target=servidor.run, daemon=True).start()
    url = f"http://127.0.0.1:{servidor.effective_port}/"
    with sync_playwright() as pw:
        navegador = pw.chromium.launch(channel="chrome")
        try:
            jugar(navegador, url)
            movil(navegador, url)
        finally:
            navegador.close()
    if errores:
        print("ERRORES DE PÁGINA:", *errores, sep="\n  ")
        sys.exit(1)
    print("Partida completa sin errores.")


if __name__ == "__main__":
    main()
