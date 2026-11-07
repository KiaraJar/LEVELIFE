# LEVELIFE

Es un videojuego en RPG 2D para el bienestar universitario. **Practica tu semana antes de vivirla:** el estudiante
escribe sus pendientes reales de la semana de parciales, los vive como casos en un campus y recibe un análisis
de sus decisiones, metas de mejora y una misión para cada actividad.

Público inicial: estudiantes de primeros ciclos, durante la semana de exámenes parciales.

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

## Cómo funciona

1. Eliges tu área de estudios y escribes de 1 a 5 pendientes con su fecha.
2. Vela convierte cada pendiente en varios casos, con decisiones y consecuencias.
3. Cada decisión mueve cuatro dimensiones: energía, tensión, rendimiento y red de apoyo.
4. Tras cada caso, Vela dice si esa decisión te ayudó a rendir y comenta tu estilo de decidir.
5. Al final, el Vela Report muestra tus dimensiones, patrones, metas de mejora, microestrategias y misiones.

## Agente de IA

Vela es la agente del juego (`server/ai/agent.py`) y usa Gemini mediante el SDK oficial de Google. Crea los casos,
comenta cada respuesta, redacta el reporte y conversa. Los números del reporte no dependen del modelo: los calcula
`server/analytics.py` a partir de lo que realmente se eligió.

Para activarla:

1. Copia `.env.example` como `.env`.
2. Pon tu clave en `GEMINI_API_KEY`. Se crea gratis en Google AI Studio.
3. Reinicia el juego.

Sin clave o si el modelo falla, el juego usa casos base por área y un reporte calculado, identificados como tales.

## Estructura

```
run.py, iniciar.bat       arranque
server/
  auth.py                 cuentas, sesión, recuperación y consentimientos
  week.py                 pendientes, casos, comentarios y reporte de la semana
  analytics.py            dimensiones, patrones, alertas y situaciones difíciles
  game.py                 estado, recursos, asistente y privacidad
  gamification.py         XP, niveles, insignias y recompensas
  content/scenarios/      casos por área de estudios, en JSON
  content/week.py         estructura de la semana y casos base
  content/missions.py     catálogo: inspiración del agente y misiones generales
  content/world.py        dimensiones, señales, zonas y opciones de personaje
  content/legal.py        términos y política de privacidad
  ai/patterns.py          hechos comparables a partir de las decisiones
  ai/agent.py             agente de IA y sus herramientas
  ai/safety.py            guardas ante riesgo y pedidos de diagnóstico
  ai/service.py           orquestación
web/js/
  art.js                  tiles, personajes, logo e iconos dibujados por código
  maps.js                 campus e interiores
  engine.js               render, movimiento, colisiones y cámara
  dialogo.js              caja de diálogo y alternativas
  pantallas.js            portada, cuenta, documentos, editor y tutorial
  menu.js                 menú del juego
  vela_report.js          reporte final
  main.js                 ciclo principal
```

## Principios que el código hace cumplir

- **Sin respuestas correctas.** Cada decisión tiene ganancias y costos en energía, carga mental y rendimiento. XP, insignias y progreso no dependen de lo elegido, y hay una prueba para eso.
- **Una decisión no es un patrón.** Una etiqueta solo es patrón si se repite dos o más veces en la sesión.
- **Sin etiquetas personales.** Vela comenta decisiones dentro del juego, no la personalidad, la salud ni la capacidad.
- **Consentimiento separado.** Aceptar los términos no autoriza el análisis; sin esa autorización no se guarda qué elegiste.
- **Riesgo primero.** Un mensaje que sugiere riesgo recibe orientación fija y nunca llega al modelo.
- **Datos mínimos.** Nombre, usuario y correo no se envían al modelo.
- **Control de los datos.** Se pueden consultar, descargar, corregir y borrar desde Configuración.

## Agregar casos

Añádelos en `server/content/scenarios/`. Cada caso tiene una escena con `{task}` y tres opciones, cada una con su
consecuencia y una señal de `server/content/world.py`. Ninguna opción debe ser solo ganancia o solo costo.

## Pruebas

```
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m unittest discover -s tests
.venv\Scripts\python tests\e2e.py
```

`e2e.py` juega una partida real en Chrome, en escritorio y celular, con capturas en `tests/capturas/`.
Usa una API de IA falsa local: no gasta créditos.

## Antes de usarlo con estudiantes reales

- Los textos legales son un borrador: deben pasar por revisión legal.
- Las historias, las misiones y el mensaje de riesgo deben pasar por un equipo de bienestar o psicología.
- La detección de riesgo busca frases concretas y puede fallar: no reemplaza el acompañamiento humano.
- La recuperación usa un código entregado al registrarse. Para recuperar por correo hace falta un servidor SMTP.
- Sirve el juego por HTTPS y define `LEVELIFE_SECURE_COOKIES=1`.

## Origen del proyecto

La paleta, los marcos, el HUD, el diálogo y las pestañas del menú provienen de un prototipo de LEVELIFE
creado antes de la hackatón, y la organización autorizó reutilizar esa interfaz. Otras partes de la base se
escribieron después de revisar ese prototipo y se le parecen. El agente Vela, los casos por actividad, la
telemetría y el reporte final se desarrollaron durante el evento.

## Licencias

El arte y el sonido son originales y se generan por código. Las fuentes Pixelify Sans y VT323 usan
licencia SIL OFL (ver `web/fonts/`). El género se inspira en los RPG clásicos de exploración, sin usar
personajes, logotipos ni mapas de ninguna franquicia.
