# LEVELIFE

RPG 2D en pixel art para el bienestar universitario. El estudiante explora un campus, vive
historias con decisiones y recibe misiones para su vida cotidiana.

**Explorar → Interactuar → Decidir → Reflexionar → Analizar → Recibir misiones → Actuar → Evolucionar**

## Cómo jugar

Abre `iniciar.bat` con doble clic. Instala lo que falte, levanta el juego y abre
`http://localhost:5173`. También puedes usar:

```
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python run.py
```

| Acción | Teclado | Celular |
|---|---|---|
| Moverse | WASD o flechas | Cruceta |
| Interactuar | Espacio, Enter o E | A |
| Menú | Esc o M | B |

## Motor de análisis

Hoy funciona el **motor simulado** (`server/ai/simulated.py`): son reglas locales, no IA, y el juego
lo indica en cada pantalla donde aparece. Para conectar un modelo real, crea un motor con los mismos
métodos (`analyze`, `new_missions`, `adapt_mission`, `mission_feedback`, `chat`) y devuélvelo desde
`get_engine()` en `server/ai/service.py`. Antes de enviar datos a un servicio externo, actualiza la
política de privacidad y sube `DOCS_VERSION` en `server/config.py`: así se pedirá aceptar de nuevo.

## Estructura

```
run.py, iniciar.bat       arranque
server/
  auth.py                 cuentas, sesión, recuperación y consentimientos
  game.py                 estado, historias, misiones, progreso, asistente y privacidad
  gamification.py         XP, niveles, insignias y recompensas
  content/stories.py      historias ramificadas (se validan al arrancar)
  content/missions.py     catálogo de misiones del motor simulado
  content/world.py        dimensiones, señales, zonas y opciones de personaje
  content/legal.py        términos y política de privacidad
  ai/patterns.py          hechos comparables a partir de las decisiones
  ai/simulated.py         motor local por reglas
  ai/safety.py            guardas ante riesgo y pedidos de diagnóstico
  ai/service.py           orquestación
web/js/
  art.js                  tiles, personajes, logo e iconos dibujados por código
  maps.js                 campus e interiores
  engine.js               render, movimiento, colisiones y cámara
  dialogo.js              caja de diálogo y alternativas
  pantallas.js            portada, cuenta, documentos, editor y tutorial
  menu.js                 menú del juego
  main.js                 ciclo principal
```

## Principios que el código hace cumplir

- **Sin respuestas correctas.** XP, insignias y progreso no dependen de lo elegido. Hay una prueba para eso.
- **Una decisión no es un patrón.** Una señal solo es recurrente si aparece en dos o más historias.
- **Consentimiento separado.** Aceptar los términos no autoriza el análisis; sin esa autorización no se guarda qué elegiste.
- **Riesgo primero.** Un mensaje que sugiere riesgo recibe orientación fija, sin pasar por ningún motor.
- **Control de los datos.** Se pueden consultar, descargar, corregir y borrar desde Configuración.

## Agregar una historia

1. Añádela en `server/content/stories.py`, con 2 a 4 alternativas por nodo.
2. Coloca su NPC con `historia: 'id'` en `web/js/maps.js`.
3. Si el personaje es nuevo, añade su apariencia en `NPCS` de `web/js/art.js`.

## Pruebas

```
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m unittest discover -s tests
.venv\Scripts\python tests\e2e.py
```

`e2e.py` juega una partida real en Chrome, en escritorio y celular, con capturas en `tests/capturas/`.

## Antes de usarlo con estudiantes reales

- Los textos legales son un borrador: deben pasar por revisión legal.
- Las historias, las misiones y el mensaje de riesgo deben pasar por un equipo de bienestar o psicología.
- La detección de riesgo busca frases concretas y puede fallar: no reemplaza el acompañamiento humano.
- La recuperación usa un código entregado al registrarse. Para recuperar por correo hace falta un servidor SMTP.
- Sirve el juego por HTTPS y define `LEVELIFE_SECURE_COOKIES=1`.

## Licencias

El arte y el sonido son originales y se generan por código. Las fuentes Pixelify Sans y VT323 usan
licencia SIL OFL (ver `web/fonts/`). El género se inspira en los RPG clásicos de exploración, sin usar
personajes, logotipos ni mapas de ninguna franquicia.
