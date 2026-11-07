"""Textos legales. Son un borrador: deben pasar por revisión legal antes de usarse con estudiantes."""

TERMS = [
    ("Objetivo y funcionamiento",
     "LEVELIFE es un videojuego de bienestar universitario. Exploras un campus virtual, vives historias con decisiones y recibes misiones opcionales para tu vida cotidiana."),
    ("Responsabilidades del usuario",
     "Te comprometes a dar datos veraces al registrarte, a proteger tu contraseña y tu código de recuperación, y a usar tu cuenta de forma personal."),
    ("Condiciones de uso",
     "La plataforma tiene fines educativos y de autoconocimiento. No debe usarse para copiar sus contenidos, alterar su funcionamiento ni acceder a cuentas ajenas."),
    ("Historias interactivas",
     "Las historias son ficción y no tienen respuestas correctas. Tus elecciones cambian la narración, pero no se califican ni afectan tus recompensas."),
    ("Uso de inteligencia artificial",
     "El análisis, las misiones personalizadas y la conversación los realiza Vela, un agente de IA. Puede equivocarse: sus respuestas son orientativas y tú decides qué te sirve."),
    ("Alcances y limitaciones",
     "Las recomendaciones son orientativas. No constituyen diagnóstico, tratamiento ni asesoría médica o psicológica, y no reemplazan a una persona profesional. Ante una emergencia, contacta a los servicios de tu país."),
    ("Normas de comportamiento",
     "No uses la plataforma para ofender, acosar ni publicar contenido dañino, incluidos los mensajes al asistente."),
    ("Suspensión o eliminación",
     "Una cuenta puede suspenderse si incumple estas normas. Puedes eliminar tu cuenta cuando quieras desde Configuración, y sus datos se borran de la plataforma."),
]

PRIVACY = [
    ("Datos personales que recopilamos",
     "Nombre, nombre de usuario, correo electrónico, contraseña protegida con hash, apariencia del personaje y progreso del juego."),
    ("Decisiones que se registran",
     "Si autorizas el análisis, guardamos qué alternativas elegiste en cada historia. Sin esa autorización, solo guardamos que completaste la historia y su desenlace."),
    ("Uso para personalizar actividades",
     "Las decisiones y reflexiones autorizadas se usan para identificar patrones entre historias y proponerte misiones. No se usan para etiquetarte ni discriminarte."),
    ("Funcionamiento del análisis",
     "Si autorizas el análisis, tus decisiones, reflexiones, notas de misiones y mensajes a Vela se envían a Google, proveedor del modelo de IA, para generar las respuestas. En su plan gratuito, Google puede usar ese contenido para mejorar sus productos, y puede ser revisado por personas. Tu nombre, usuario y correo no se incluyen, pero evita escribir datos personales o sensibles en esos textos."),
    ("Almacenamiento y protección",
     "Los datos se guardan en la base de datos del servidor. Las contraseñas y los códigos de recuperación se almacenan solo como hash, y la sesión usa una cookie protegida."),
    ("Tus derechos",
     "Puedes consultar, descargar, corregir y eliminar tu información, y retirar tu consentimiento para el análisis en cualquier momento desde Configuración."),
    ("Eliminación de datos",
     "En Configuración puedes borrar tus registros de análisis o eliminar la cuenta completa. Eliminar la cuenta es definitivo."),
]

AI_CONSENT = (
    "Autorizo que se registren mis decisiones y reflexiones y que se envíen, junto con mis mensajes a Vela, a Google para identificar patrones y proponerme misiones. "
    "Es opcional: sin esto puedes jugar igual y recibirás misiones generales."
)

DOCUMENTS = {
    "terms": [{"title": t, "body": b} for t, b in TERMS],
    "privacy": [{"title": t, "body": b} for t, b in PRIVACY],
    "ai_consent": AI_CONSENT,
}
