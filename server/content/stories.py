"""Historias ramificadas.

Las `signals` son datos internos del análisis: nunca llegan al navegador ni afectan las
recompensas. Ningún camino es "el bueno": cada desenlace muestra lo que se gana y lo que cuesta.
Oradores: "nar" es narración, "yo" es el jugador, y los demás son claves de `cast`.
"""
from __future__ import annotations


def L(speaker: str, text: str) -> dict:
    return {"speaker": speaker, "text": text}


def C(cid: str, text: str, next_node: str, *signals: str) -> dict:
    return {"id": cid, "text": text, "next": next_node, "signals": list(signals)}


def END(title: str, reflect: str, *lines: dict) -> dict:
    return {"lines": list(lines), "end": title, "reflect": reflect}


def validate_stories() -> None:
    from .world import SIGNALS, ZONES

    for story in STORIES.values():
        nodes = story["nodes"]
        assert story["zone"] in ZONES, story["id"]
        seen, pending = set(), [story["start"]]
        while pending:
            node_id = pending.pop()
            if node_id in seen:
                continue
            seen.add(node_id)
            node = nodes[node_id]
            for line in node["lines"]:
                assert line["speaker"] in ("nar", "yo") or line["speaker"] in story["cast"], line
            if "end" in node:
                continue
            assert 2 <= len(node["choices"]) <= 4, node_id
            for choice in node["choices"]:
                assert set(choice["signals"]) <= set(SIGNALS), choice
                pending.append(choice["next"])
        assert seen == set(nodes), f"nodos inalcanzables en {story['id']}: {set(nodes) - seen}"


STORIES: dict[str, dict] = {}

STORIES["semana"] = {
    "id": "semana", "title": "Una semana imposible", "zone": "biblioteca", "npc": "tomas",
    "blurb": "Trabajos, un examen y una promesa, todo en los mismos días.",
    "cast": {"tomas": "Tomás", "ines": "Inés"}, "start": "inicio",
    "nodes": {
        "inicio": {
            "lines": [
                L("nar", "En la biblioteca, una mesa casi desaparece bajo cuadernos abiertos."),
                L("tomas", "Hola. Soy Tomás. Perdona el desorden, estoy intentando sobrevivir a esta semana."),
                L("tomas", "Tengo dos trabajos, un examen el viernes y le prometí a mi abuela acompañarla el sábado."),
                L("nar", "Mueve un papel de un lado a otro. Lo vuelve a mover."),
                L("tomas", "Tú qué harías si estuvieras en mi lugar. Dime, de verdad."),
            ],
            "choices": [
                C("a", "Intentar terminar todas las tareas al mismo tiempo.", "todo", "sobrecarga"),
                C("b", "Organizar las actividades según su prioridad.", "orden", "priorizar"),
                C("c", "Ignorar las responsabilidades y distraerse un rato.", "fuga", "postergar"),
                C("d", "Pedir orientación o apoyo.", "apoyo", "pedir_apoyo"),
            ],
        },
        "todo": {
            "lines": [
                L("nar", "Tomás abre cuatro pestañas y dos libros. Durante una hora, todo se mueve a la vez."),
                L("tomas", "Avancé un poco en todo y no terminé nada. Pero siento que no paré ni un segundo."),
                L("yo", "Son las once de la noche. Quedan los mismos pendientes, solo que más despeinados."),
                L("tomas", "¿Sigo así toda la noche o cambio algo?"),
            ],
            "choices": [
                C("a", "Seguir: mañana se verá.", "fin_noche", "sobrecarga", "sin_pausas"),
                C("b", "Parar y elegir solo una cosa para hoy.", "fin_una", "priorizar"),
            ],
        },
        "orden": {
            "lines": [
                L("nar", "Tomás saca una hoja en blanco. Escribe fechas, luego pesos, luego tacha dos cosas."),
                L("tomas", "Visto así no parece tan imposible. Aunque el examen se come casi todo."),
                L("tomas", "El problema es el sábado. Si cuido el plan, quizá no pueda acompañar a mi abuela."),
            ],
            "choices": [
                C("a", "Mantener la promesa y ajustar lo demás.", "fin_promesa", "equilibrar"),
                C("b", "Avisarle a su abuela y proponer otro día.", "fin_aviso", "poner_limites"),
            ],
        },
        "fuga": {
            "lines": [
                L("nar", "Tomás cierra todo. Un video lleva a otro. La biblioteca se va vaciando."),
                L("tomas", "Fue un alivio... hasta que vi la hora. Ahora es igual, pero con menos tiempo."),
                L("tomas", "¿Y si mañana empiezo con algo muy pequeño?"),
            ],
            "choices": [
                C("a", "Sí: una sola tarea de diez minutos.", "fin_pequeno", "priorizar"),
                C("b", "Mejor esperar a sentir más ganas.", "fin_ganas", "postergar"),
            ],
        },
        "apoyo": {
            "lines": [
                L("nar", "Tomás se acerca a Inés, una compañera que ya pasó por esa materia."),
                L("ines", "Te entiendo. Yo tuve esa semana el año pasado. Mira, esto es lo que más pesa en el examen."),
                L("tomas", "No sabía que podía preguntar eso. Pensé que sería molestar."),
                L("ines", "Podemos repasar mañana una hora, si quieres."),
            ],
            "choices": [
                C("a", "Aceptar y repasar en compañía.", "fin_grupo", "pedir_apoyo"),
                C("b", "Agradecer y seguir por cuenta propia.", "fin_solo", "equilibrar"),
            ],
        },
        "fin_noche": END("La noche larga", "¿Qué te dice tu cuerpo cuando intentas abarcarlo todo?",
                         L("nar", "Tomás termina un trabajo al amanecer. Lo entrega a tiempo."),
                         L("tomas", "Salió. No estoy seguro de cuánto recordaré mañana, pero salió.")),
        "fin_una": END("Una cosa a la vez", "¿Qué pasa cuando eliges dejar algo para después?",
                       L("nar", "Tomás termina un solo trabajo. El resto queda en una lista para mañana."),
                       L("tomas", "Me da algo de nervios lo que falta. Pero al menos esto ya no me persigue.")),
        "fin_promesa": END("El sábado cumplido", "¿Qué compromisos sientes que no quieres mover?",
                           L("nar", "El sábado, Tomás acompaña a su abuela. Lleva apuntes que casi no abre."),
                           L("tomas", "El examen no fue perfecto. Esa tarde sí valió la pena.")),
        "fin_aviso": END("Otro día con la abuela", "¿Cómo te sientes cuando cambias un plan con alguien?",
                         L("nar", "Tomás llama a su abuela. Hay un silencio corto, y luego fijan el domingo."),
                         L("tomas", "Me costó decirlo. Ella lo entendió mejor de lo que esperaba.")),
        "fin_pequeno": END("Diez minutos", "¿Qué tarea pequeña te abriría la puerta a las demás?",
                           L("nar", "Al día siguiente, Tomás pone un temporizador. Diez minutos se vuelven treinta."),
                           L("tomas", "No recuperé todo el tiempo. Pero ya no estoy parado.")),
        "fin_ganas": END("Esperando las ganas", "¿Qué haces cuando las ganas no llegan?",
                         L("nar", "Las ganas llegan el jueves por la noche, acompañadas de bastante urgencia."),
                         L("tomas", "Trabajo mejor bajo presión, creo. O eso me digo.")),
        "fin_grupo": END("Dos cabezas", "¿A quién podrías hacerle una pregunta esta semana?",
                         L("nar", "Tomás e Inés repasan una hora. Ríen dos veces, y eso ya es bastante."),
                         L("tomas", "Sigue siendo mucho. Pero ya no se siente como algo solo mío.")),
        "fin_solo": END("Con mapa propio", "¿Cuándo te ayuda más hacer las cosas a tu manera?",
                        L("nar", "Tomás se queda con el consejo de Inés y estudia con su propio método."),
                        L("tomas", "Me sirvió saber dónde enfocarme. El resto lo prefiero resolver así.")),
    },
}

STORIES["no"] = {
    "id": "no", "title": "No puedo decir que no", "zone": "cafeteria", "npc": "lucia",
    "blurb": "Siempre hay alguien que necesita un favor. ¿Y lo tuyo?",
    "cast": {"lucia": "Lucía", "nico": "Nico"}, "start": "inicio",
    "nodes": {
        "inicio": {
            "lines": [
                L("nar", "En la cafetería, Lucía mira su café frío mientras su celular vibra sin parar."),
                L("lucia", "Hola. ¿Me acompañas un momento? Necesito hablar con alguien que no me pida nada."),
                L("lucia", "Nico quiere que revise su trabajo. Otra amiga, que le pase apuntes. Y yo tengo mi propia entrega."),
                L("nico", "¡Lucía! Qué bueno que te encuentro. ¿Me ayudas con esto hoy? Eres la única que entiende."),
                L("nar", "Lucía te mira. Luego mira a Nico. ¿Qué crees que debería hacer?"),
            ],
            "choices": [
                C("a", "Aceptar todas las solicitudes.", "acepta", "complacer"),
                C("b", "Explicar que necesita organizar primero sus responsabilidades.", "explica", "poner_limites"),
                C("c", "Alejarse sin explicar la situación.", "aleja", "evitar"),
                C("d", "Buscar una manera equilibrada de ayudar.", "medio", "equilibrar"),
            ],
        },
        "acepta": {
            "lines": [
                L("lucia", "Claro, Nico. Pásamelo."),
                L("nico", "¡Eres lo máximo! También quería preguntarte por lo de mañana..."),
                L("nar", "Lucía sonríe. Abre su agenda y escribe otra línea encima de la última."),
                L("lucia", "No sé en qué momento voy a hacer lo mío. ¿Le digo algo?"),
            ],
            "choices": [
                C("a", "Cumplir con todo, aunque duerma menos.", "fin_todo", "complacer", "sin_pausas"),
                C("b", "Volver y decirle que solo podrá con una parte.", "fin_vuelve", "poner_limites"),
            ],
        },
        "explica": {
            "lines": [
                L("lucia", "Nico, hoy tengo una entrega. Necesito ordenar lo mío primero."),
                L("nico", "Ah. Bueno. Pensé que... no, está bien."),
                L("nar", "Nico se va despacio. Lucía suelta el aire y se queda mirando la puerta."),
                L("lucia", "Me siento mal. ¿Habré sonado fría?"),
            ],
            "choices": [
                C("a", "Mandarle un mensaje amable más tarde.", "fin_mensaje", "equilibrar"),
                C("b", "Dejarlo así y concentrarse en lo suyo.", "fin_firme", "poner_limites"),
            ],
        },
        "aleja": {
            "lines": [
                L("nar", "Lucía guarda el celular, toma su mochila y sale sin decir nada."),
                L("nico", "¿Lucía? ...Bueno."),
                L("lucia", "Ya en el pasillo, me siento rara. Por un lado, libre. Por otro, no tanto."),
                L("lucia", "Ahora Nico me escribió: «¿Estás molesta?»"),
            ],
            "choices": [
                C("a", "Contestar con honestidad lo que pasó.", "fin_honesta", "poner_limites"),
                C("b", "No responder por ahora.", "fin_silencio", "evitar"),
            ],
        },
        "medio": {
            "lines": [
                L("lucia", "Nico, hoy no puedo revisarlo todo. ¿Te sirve si miro la introducción por veinte minutos?"),
                L("nico", "Sí, me salvas. No sabía bien por dónde empezar."),
                L("lucia", "Fue más fácil de lo que pensé. Aunque ahora la otra amiga sigue esperando."),
            ],
            "choices": [
                C("a", "Proponerle lo mismo a la amiga.", "fin_acuerdos", "equilibrar"),
                C("b", "Decirle que esta vez no podrá.", "fin_elige", "poner_limites"),
            ],
        },
        "fin_todo": END("Todas las manos", "¿Qué ganas y qué dejas cuando dices que sí a todo?",
                        L("nar", "Lucía cumple con todos. Entrega lo suyo a las dos de la mañana."),
                        L("lucia", "Me dieron las gracias. Se siente bien. También estoy muy cansada.")),
        "fin_vuelve": END("Media ayuda", "¿Hay un sí que quisieras convertir en un sí parcial?",
                          L("lucia", "Nico, perdona. Puedo ayudarte con una parte, no con todo."),
                          L("nico", "Tranquila, me sirve. No sabía que estabas con tanto.")),
        "fin_mensaje": END("Un mensaje después", "¿Cómo cuidas una relación después de poner un límite?",
                           L("nar", "Por la noche, Lucía le escribe a Nico. Él responde con un emoji de gato."),
                           L("lucia", "Creo que estamos bien. Podía decir que no y seguir siendo amiga.")),
        "fin_firme": END("Lo mío primero", "¿Qué se siente cuando eliges lo tuyo?",
                         L("nar", "Lucía termina su entrega con tiempo de sobra."),
                         L("lucia", "Sigo con una espinita por Nico. Pero el trabajo me quedó bien.")),
        "fin_honesta": END("La verdad, con cuidado", "¿Qué conversación has estado guardando?",
                           L("lucia", "Le escribí que estaba saturada y que no supe decirlo."),
                           L("nico", "Gracias por decírmelo. No me había dado cuenta.")),
        "fin_silencio": END("Un día de distancia", "¿Qué necesitas cuando prefieres tomar distancia?",
                            L("nar", "Lucía apaga las notificaciones y duerme ocho horas."),
                            L("lucia", "Descansé. Mañana tendré que hablar con Nico, supongo.")),
        "fin_acuerdos": END("Veinte minutos para cada quien", "¿Cómo sería para ti ayudar sin desaparecer?",
                            L("nar", "Lucía reparte su ayuda en tramos cortos, y le sobra tiempo para lo suyo."),
                            L("lucia", "No quedó nadie sin atención. Incluida yo.")),
        "fin_elige": END("Hoy, hasta aquí", "¿Cómo decides a quién dedicar tu tiempo?",
                         L("nar", "La amiga responde con un «ok» breve. Lucía lo lee dos veces."),
                         L("lucia", "No todo queda perfecto. Pero hoy ese fue mi límite.")),
    },
}

STORIES["expectativas"] = {
    "id": "expectativas", "title": "El peso de las expectativas", "zone": "aulas", "npc": "bruno",
    "blurb": "Una nota baja y una clase llena de comparaciones.",
    "cast": {"bruno": "Bruno", "prof": "Prof. Aguirre"}, "start": "inicio",
    "nodes": {
        "inicio": {
            "lines": [
                L("nar", "El aula se vacía. Bruno sigue sentado, con el examen boca abajo."),
                L("bruno", "Hola. Me pusieron una nota mucho más baja de la que esperaba."),
                L("bruno", "Todos comparan resultados por el grupo. Yo estudié más que nunca."),
                L("bruno", "No dejo de pensar en eso. ¿Tú cómo lo tomarías?"),
            ],
            "choices": [
                C("a", "Pensar que no tiene capacidad para su carrera.", "duda", "autocritica"),
                C("b", "Identificar sus errores y buscar oportunidades de aprendizaje.", "revisa", "aprender"),
                C("c", "Evitar hablar sobre el resultado.", "calla", "evitar"),
                C("d", "Buscar orientación académica.", "orienta", "pedir_apoyo"),
            ],
        },
        "duda": {
            "lines": [
                L("bruno", "Quizá me equivoqué de carrera. Los demás parecen entenderlo sin esfuerzo."),
                L("nar", "Bruno abre el grupo del curso. Lo cierra. Lo vuelve a abrir."),
                L("bruno", "No sé si hablar con alguien o quedarme con esto."),
            ],
            "choices": [
                C("a", "Contárselo a alguien de confianza.", "fin_cuenta", "pedir_apoyo"),
                C("b", "Salir a caminar y dejar la pregunta para otro día.", "fin_camina", "descansar"),
            ],
        },
        "revisa": {
            "lines": [
                L("nar", "Bruno voltea el examen. Pregunta por pregunta, marca lo que entendió mal."),
                L("bruno", "Casi todos mis errores están en el mismo tema. Eso sí lo puedo mirar."),
                L("bruno", "Aunque sigo con un nudo en el estómago."),
            ],
            "choices": [
                C("a", "Hacer un plan de repaso para ese tema.", "fin_plan", "priorizar"),
                C("b", "Darse la tarde libre antes de seguir.", "fin_tarde", "descansar"),
            ],
        },
        "calla": {
            "lines": [
                L("nar", "Bruno guarda el examen en la mochila, muy abajo."),
                L("bruno", "Si alguien pregunta, diré que bien. Me da pena decir la verdad."),
                L("nar", "En el pasillo, un compañero pregunta: «¿Cómo te fue?»"),
            ],
            "choices": [
                C("a", "Decir «no tan bien» sin dar detalles.", "fin_poco", "equilibrar"),
                C("b", "Cambiar de tema.", "fin_tema", "evitar"),
            ],
        },
        "orienta": {
            "lines": [
                L("nar", "Bruno toca la puerta de la profesora Aguirre."),
                L("prof", "Pasa, Bruno. Una nota no resume lo que sabes. ¿Revisamos juntos el examen?"),
                L("bruno", "Tenía miedo de que pensara que no me esforcé."),
                L("prof", "Veo que te esforzaste. Veamos dónde invertir ese esfuerzo."),
            ],
            "choices": [
                C("a", "Pedirle recursos para reforzar el tema.", "fin_recursos", "aprender"),
                C("b", "Contarle también cómo se ha sentido.", "fin_siente", "pedir_apoyo"),
            ],
        },
        "fin_cuenta": END("Decirlo en voz alta", "¿Con quién puedes hablar cuando dudas de ti?",
                          L("nar", "Bruno llama a su hermana. Ella le recuerda su primer año."),
                          L("bruno", "No resolvió nada, pero la pregunta pesa menos.")),
        "fin_camina": END("Una vuelta al campus", "¿Qué te ayuda a tomar distancia de un mal día?",
                          L("nar", "Bruno camina hasta que el enojo se le pasa un poco."),
                          L("bruno", "Sigo sin respuesta. Por ahora, está bien no tenerla.")),
        "fin_plan": END("El tema difícil", "¿Qué podría enseñarte un resultado que no esperabas?",
                        L("nar", "Bruno arma tres sesiones de repaso. La primera empieza el lunes."),
                        L("bruno", "No sé cómo me irá. Sí sé por dónde empezar.")),
        "fin_tarde": END("Tarde libre", "¿Cuánto tiempo necesitas antes de volver a intentarlo?",
                         L("nar", "Bruno guarda los apuntes y juega fútbol hasta que oscurece."),
                         L("bruno", "Mañana lo vuelvo a mirar. Hoy ya hice suficiente.")),
        "fin_poco": END("A medias", "¿Qué tanto de ti eliges mostrar a los demás?",
                        L("nar", "El compañero se encoge de hombros: «A mí tampoco me fue bien.»"),
                        L("bruno", "No esperaba eso. Quizá no era el único.")),
        "fin_tema": END("Mochila cerrada", "¿Qué temas prefieres guardar para ti?",
                        L("nar", "La conversación pasa a otra cosa. El examen sigue en el fondo de la mochila."),
                        L("bruno", "Por ahora es más cómodo así.")),
        "fin_recursos": END("Plan de ruta", "¿Qué orientación te gustaría pedir?",
                            L("prof", "Te dejo estas guías. Vuelve la próxima semana y las revisamos."),
                            L("bruno", "Salí con más tareas que antes, y extrañamente más tranquilo.")),
        "fin_siente": END("Más que una nota", "¿Quién te ve más allá de tus resultados?",
                          L("prof", "Gracias por contármelo. También existe el servicio de bienestar, si te sirve."),
                          L("bruno", "No me habían preguntado cómo estaba. Eso ayudó.")),
    },
}

STORIES["descanso"] = {
    "id": "descanso", "title": "También necesito descansar", "zone": "parque", "npc": "sara",
    "blurb": "Muchas horas de estudio y una banca que invita a parar.",
    "cast": {"sara": "Sara", "dani": "Dani"}, "start": "inicio",
    "nodes": {
        "inicio": {
            "lines": [
                L("nar", "En el parque, Sara subraya un libro con los ojos casi cerrados."),
                L("sara", "Hola. Llevo días durmiendo cuatro horas. Dejé el voleibol y casi no veo a mis amigos."),
                L("sara", "Si paro, siento que me quedo atrás. Si sigo, siento que me apago."),
                L("nar", "Una hoja cae sobre su libro. Sara ni la nota."),
                L("sara", "¿Qué harías en mi lugar?"),
            ],
            "choices": [
                C("a", "Continuar estudiando sin descansar.", "sigue", "sin_pausas"),
                C("b", "Establecer pausas y horarios de descanso.", "pausas", "descansar"),
                C("c", "Abandonar todas sus actividades académicas.", "suelta", "postergar"),
                C("d", "Buscar un equilibrio entre estudio y tiempo personal.", "balance", "equilibrar"),
            ],
        },
        "sigue": {
            "lines": [
                L("nar", "Sara toma otro café y vuelve a la misma página."),
                L("sara", "Llevo veinte minutos en este párrafo. Pero parar me da culpa."),
                L("dani", "¡Sara! Hoy entrenamos a las cinco. Te guardamos un lugar."),
            ],
            "choices": [
                C("a", "Decirle a Dani que hoy no puede.", "fin_sigue", "sin_pausas"),
                C("b", "Ir solo media hora al entrenamiento.", "fin_media", "equilibrar"),
            ],
        },
        "pausas": {
            "lines": [
                L("sara", "Podría trabajar cincuenta minutos y parar diez. Y cerrar a las diez de la noche."),
                L("nar", "Pone una alarma. Cuando suena, le cuesta creerlo."),
                L("sara", "Se siente raro parar justo cuando iba entendiendo."),
            ],
            "choices": [
                C("a", "Respetar la pausa.", "fin_pausa", "descansar"),
                C("b", "Ajustar el horario a su propio ritmo.", "fin_ritmo", "priorizar"),
            ],
        },
        "suelta": {
            "lines": [
                L("sara", "Ya no quiero saber nada. Cierro todo, no voy a clases esta semana."),
                L("nar", "Sara se acuesta en el pasto. Por primera vez en días, respira lento."),
                L("sara", "Se siente bien. Y también me da un poco de miedo."),
            ],
            "choices": [
                C("a", "Hablar con alguien sobre cómo se siente.", "fin_habla", "pedir_apoyo"),
                C("b", "Tomarse un día y volver poco a poco.", "fin_vuelve", "descansar"),
            ],
        },
        "balance": {
            "lines": [
                L("sara", "Podría proteger el voleibol los martes y estudiar mejor los otros días."),
                L("dani", "¡Eso! Y si quieres, repasamos juntas después del entrenamiento."),
                L("sara", "Aunque esta semana hay un parcial. No sé si es el momento."),
            ],
            "choices": [
                C("a", "Empezar ya, aunque sea poco.", "fin_empieza", "equilibrar"),
                C("b", "Empezar después del parcial.", "fin_despues", "postergar"),
            ],
        },
        "fin_sigue": END("Una página más", "¿Qué te da culpa cuando descansas?",
                         L("nar", "Sara estudia hasta muy tarde. Al día siguiente, el café ya no hace efecto."),
                         L("sara", "Cubrí el temario. Me gustaría recordar en qué momento se acabó la semana.")),
        "fin_media": END("Media hora de red", "¿Qué pequeña actividad te devuelve energía?",
                         L("nar", "Sara juega media hora. Sale con las mejillas rojas."),
                         L("sara", "No perdí tanto tiempo. Y volví a leer mejor, creo.")),
        "fin_pausa": END("La alarma amiga", "¿Qué señal te ayudaría a detenerte?",
                         L("nar", "Sara camina diez minutos por el parque. Nota que ya es otoño."),
                         L("sara", "No sabía cuánto llevaba sin mirar hacia arriba.")),
        "fin_ritmo": END("A mi ritmo", "¿Cómo sería un horario hecho a tu medida?",
                         L("nar", "Sara cambia las pausas por bloques de noventa minutos."),
                         L("sara", "Las reglas de otros no me funcionaban. Esta sí, por ahora.")),
        "fin_habla": END("Una llamada", "¿Con quién hablarías si todo se sintiera demasiado?",
                         L("nar", "Sara busca el servicio de bienestar de la universidad y pide una cita."),
                         L("sara", "No sé qué voy a decir. Pero ya no lo estoy cargando sola.")),
        "fin_vuelve": END("Volver despacio", "¿Qué necesitas para retomar algo que dejaste?",
                          L("nar", "Tras un día de descanso, Sara retoma una sola materia."),
                          L("sara", "No fue dramático. Solo volví.")),
        "fin_empieza": END("Martes de voleibol", "¿Qué parte de tu vida quisieras proteger?",
                           L("nar", "Sara entrena el martes. El parcial sigue ahí, y ella también."),
                           L("sara", "Con esto me acuerdo de que soy más que mis apuntes.")),
        "fin_despues": END("Después del parcial", "¿Qué cosas dejas para cuando pase lo urgente?",
                           L("nar", "Sara marca en el calendario la fecha después del parcial."),
                           L("sara", "Ojalá no se mueva otra vez. Esta vez lo dejé escrito.")),
    },
}

STORIES["luces"] = {
    "id": "luces", "title": "Las luces de las tres", "zone": "residencia", "npc": "mateo",
    "blurb": "En la residencia, los horarios se deshacen sin que nadie lo note.",
    "cast": {"mateo": "Mateo", "valen": "Valentina"}, "start": "inicio",
    "nodes": {
        "inicio": {
            "lines": [
                L("nar", "Son las tres de la mañana y la luz de la sala común sigue encendida."),
                L("mateo", "¿Tampoco duermes? Yo ya ni sé cuándo como. Vivo de galletas."),
                L("mateo", "Mi cuarto es un caos, debo lavar ropa y mañana tengo clase temprano."),
                L("mateo", "Mi familia cree que todo va bien. ¿Por dónde empezarías?"),
            ],
            "choices": [
                C("a", "Armar una rutina básica para la semana.", "rutina", "priorizar"),
                C("b", "Seguir así hasta que acabe el semestre.", "aguanta", "sin_pausas"),
                C("c", "Hablar con su compañera de piso.", "compa", "pedir_apoyo"),
                C("d", "Dormir ya y pensarlo mañana.", "duerme", "descansar"),
            ],
        },
        "rutina": {
            "lines": [
                L("mateo", "Tres comidas de verdad, ropa los domingos y a la cama antes de la una. ¿Es mucho?"),
                L("nar", "Mateo escribe la lista en una servilleta y la pega en la nevera."),
                L("mateo", "Empezar todo el lunes parece imposible."),
            ],
            "choices": [
                C("a", "Empezar con un solo hábito.", "fin_habito", "priorizar"),
                C("b", "Intentarlo todo de una vez.", "fin_todo", "sobrecarga"),
            ],
        },
        "aguanta": {
            "lines": [
                L("mateo", "Faltan seis semanas. Se puede. Ya descansaré en vacaciones."),
                L("valen", "Mateo, llevas tres días con la misma taza."),
                L("mateo", "Es mi taza de la suerte."),
            ],
            "choices": [
                C("a", "Reírse y cambiar de tema.", "fin_risa", "evitar"),
                C("b", "Admitir que está cansado.", "fin_admite", "pedir_apoyo"),
            ],
        },
        "compa": {
            "lines": [
                L("valen", "¿A esta hora? Bueno, dime."),
                L("mateo", "Siento que todo se me está desordenando."),
                L("valen", "A mí también me pasó. ¿Cocinamos juntos los jueves? Así comemos algo verde."),
            ],
            "choices": [
                C("a", "Aceptar y fijar el día.", "fin_jueves", "pedir_apoyo"),
                C("b", "Agradecer, pero prefiere arreglarse solo.", "fin_solo", "equilibrar"),
            ],
        },
        "duerme": {
            "lines": [
                L("nar", "Mateo apaga la luz. Duerme cinco horas, y son las mejores de la semana."),
                L("mateo", "Hoy veo todo un poco menos gris. ¿Qué hago con este impulso?"),
            ],
            "choices": [
                C("a", "Lavar la ropa y seguir con el día.", "fin_ropa", "priorizar"),
                C("b", "Disfrutarlo sin planear nada.", "fin_disfruta", "descansar"),
            ],
        },
        "fin_habito": END("Un hábito", "¿Qué hábito pequeño cambiaría tu semana?",
                          L("nar", "Mateo solo cambia el desayuno. Dos semanas después, sigue haciéndolo."),
                          L("mateo", "No soy otra persona. Pero desayuno.")),
        "fin_todo": END("Lunes de cambio total", "¿Qué pasa cuando quieres cambiarlo todo a la vez?",
                        L("nar", "El lunes sale perfecto. El miércoles, la servilleta se cae de la nevera."),
                        L("mateo", "Algo quedó, al menos. La ropa está limpia.")),
        "fin_risa": END("La taza de la suerte", "¿Qué haces con el cansancio cuando alguien lo nota?",
                        L("nar", "Mateo y Valentina se ríen. La luz de la sala sigue encendida."),
                        L("mateo", "Seis semanas. Se puede. Creo.")),
        "fin_admite": END("Decirlo", "¿A quién le dirías que estás en un momento difícil?",
                          L("mateo", "La verdad, estoy agotado."),
                          L("valen", "Se nota. Gracias por decirlo. ¿Pongo agua para un té?")),
        "fin_jueves": END("Jueves de cocina", "¿Con quién podrías compartir una rutina?",
                          L("nar", "El primer jueves se les quema el arroz. Comen igual."),
                          L("mateo", "Es lo mejor que me ha pasado esta semana, y eso que se quemó.")),
        "fin_solo": END("Por mi cuenta", "¿Qué prefieres resolver por tu cuenta?",
                        L("nar", "Mateo ordena su cuarto solo, con música y a su ritmo."),
                        L("mateo", "Saber que Valentina está ahí también ayuda.")),
        "fin_ropa": END("Ropa limpia", "¿Qué haces cuando tienes un buen día?",
                        L("nar", "La lavadora gira. Mateo mira la ropa como si fuera televisión."),
                        L("mateo", "Algo tan simple, y me siento persona de nuevo.")),
        "fin_disfruta": END("Un día sin lista", "¿Cuándo fue tu último día sin planes?",
                            L("nar", "Mateo camina al sol y compra un jugo."),
                            L("mateo", "La ropa sigue ahí. Pero hoy no le debo nada al día.")),
    },
}
