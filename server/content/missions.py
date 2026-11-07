"""Catálogo de misiones: inspira al agente y aporta misiones generales."""
from __future__ import annotations


def M(title, dimension, description, objective, minutes, difficulty, frequency, *signals):
    return {"title": title, "dimension": dimension, "description": description, "objective": objective,
            "minutes": minutes, "difficulty": difficulty, "frequency": frequency, "signals": list(signals)}


CATALOG = [
    M("Organiza tu semana", "organizacion", "Durante los próximos tres días, dedica diez minutos a organizar tus actividades y establecer prioridades.",
      "Ver tu semana completa antes de empezar.", 10, 1, "Tres días seguidos", "sobrecarga", "priorizar"),
    M("Lo primero, primero", "organizacion", "Elige la tarea que más pesa hoy y trabaja en ella durante 25 minutos, sin nada más abierto.",
      "Avanzar en una sola cosa a la vez.", 25, 2, "Hoy", "sobrecarga", "postergar"),
    M("El paso diminuto", "organizacion", "Toma algo que vienes aplazando y define la acción más pequeña posible. Hazla hoy.",
      "Romper la inercia con un paso mínimo.", 5, 1, "Hoy", "postergar"),
    M("Plan de tres bloques", "organizacion", "Divide tu próxima entrega en tres bloques y ponle fecha a cada uno en tu calendario.",
      "Convertir una entrega grande en partes manejables.", 20, 2, "Esta semana", "priorizar", "postergar"),
    M("Semana sin sorpresas", "organizacion", "Revisa todas tus fechas del mes y anota cuál será tu semana más cargada y qué harás antes.",
      "Anticipar los momentos de más carga.", 30, 3, "Una vez este mes", "priorizar", "sobrecarga"),
    M("Un momento para ti", "emocional", "Dedica cinco minutos a identificar cómo te sientes y qué situaciones han influido en tu estado de ánimo.",
      "Poner nombre a lo que sientes.", 5, 1, "Hoy", "equilibrar", "autocritica"),
    M("Diario de tres líneas", "emocional", "Antes de dormir, escribe tres líneas sobre tu día: algo difícil, algo bueno y algo neutro.",
      "Mirar el día con más matices.", 5, 1, "Tres noches esta semana", "equilibrar"),
    M("Respiración de intermedio", "emocional", "Entre dos clases, haz cinco respiraciones lentas soltando el aire más despacio de lo que entra.",
      "Crear una pausa breve en un día agitado.", 3, 1, "Una vez al día", "sobrecarga", "sin_pausas"),
    M("Conversación pendiente", "emocional", "Cuéntale a una persona de confianza algo que te haya dado vueltas esta semana.",
      "Compartir lo que sientes con alguien.", 15, 2, "Esta semana", "evitar"),
    M("Aprende a establecer límites", "social", "Practica una respuesta asertiva ante una situación en la que necesites comunicar tus límites.",
      "Decir lo que puedes y lo que no con calma.", 10, 2, "Esta semana", "complacer", "poner_limites"),
    M("Un no amable", "social", "La próxima vez que no puedas ayudar, responde: «Hoy no puedo, pero puedo…» y ofrece lo que sí te sea posible.",
      "Cuidar la relación y tu tiempo a la vez.", 5, 2, "La próxima oportunidad", "complacer"),
    M("Pide una mano", "social", "Escríbele a alguien para pedir ayuda con algo concreto y pequeño.",
      "Practicar pedir apoyo antes de necesitarlo mucho.", 10, 1, "Esta semana", "sobrecarga", "pedir_apoyo"),
    M("Dilo en primera persona", "social", "Prepara una frase que empiece con «Yo siento…» para una conversación que has evitado.",
      "Ordenar lo que quieres decir sin culpar.", 10, 2, "Esta semana", "evitar", "poner_limites"),
    M("Café con alguien nuevo", "social", "Invita a una persona de tu clase con quien casi no hayas hablado a tomar algo.",
      "Ampliar tu red de apoyo en el campus.", 30, 3, "Este mes", "pedir_apoyo"),
    M("Equilibra tu rutina", "fisico", "Identifica momentos de tu jornada en los que puedas incorporar pausas y descanso.",
      "Encontrar espacios reales de descanso.", 10, 1, "Hoy", "sin_pausas", "descansar"),
    M("Hora de cierre", "fisico", "Elige una hora para terminar de estudiar hoy y respétala, aunque quede algo pendiente.",
      "Proteger tu tiempo de sueño.", 5, 2, "Dos noches esta semana", "sin_pausas"),
    M("Paseo sin pantalla", "fisico", "Camina quince minutos sin el celular en la mano.",
      "Mover el cuerpo y despejar la mente.", 15, 1, "Dos veces esta semana", "sin_pausas", "descansar"),
    M("Noche completa", "fisico", "Durante tres noches, deja la pantalla treinta minutos antes de acostarte.",
      "Preparar mejor tu descanso.", 30, 3, "Tres noches esta semana", "sin_pausas", "descansar"),
    M("Lo que sí aprendí", "personal", "Piensa en un resultado que no te gustó y escribe dos cosas que aprendiste de él.",
      "Separar el resultado de tu valor.", 10, 1, "Esta semana", "autocritica", "aprender"),
    M("Como a tu mejor amistad", "personal", "Escribe lo que le dirías a alguien querido en tu misma situación, y léelo para ti.",
      "Hablarte con más amabilidad.", 10, 2, "Esta semana", "autocritica"),
    M("Tres cosas que hice", "personal", "Al final de la semana, anota tres cosas que hiciste, aunque parezcan pequeñas.",
      "Reconocer tu esfuerzo.", 5, 1, "Este fin de semana", "autocritica", "aprender"),
    M("Tu por qué", "personal", "Escribe en un párrafo por qué elegiste tu carrera y qué parte te sigue motivando.",
      "Reconectar con tu motivación.", 15, 2, "Esta semana", "aprender"),
    M("Hablar con quien sabe", "personal", "Agenda una conversación con una persona docente o de orientación sobre un tema que te interese.",
      "Buscar orientación antes de decidir.", 30, 3, "Este mes", "aprender", "pedir_apoyo"),
]

DEFAULT_ORDER = ["organizacion", "emocional", "social", "fisico", "personal"]
