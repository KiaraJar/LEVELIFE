// Pantallas previas al mundo: portada, cuenta, documentos, personaje y tutorial.
import { api } from './api.js';
import { ALTO, ANCHO, EDICION_LIBRE, NOMBRES, OPCIONES, avatarAzar, dibujarPersonaje, hojaPersonaje, lienzo, logo } from './art.js';
import { sonido } from './audio.js';
import { boton, h, mostrar, ocultar, ventana } from './ui.js';

function campo(nombre, etiqueta, tipo = 'text', extra = {}) {
  return h('label', { class: 'campo' }, h('span', {}, etiqueta), h('input', { name: nombre, type: tipo, required: true, ...extra }));
}

function formulario(campos, enviar, textoBoton, extra = []) {
  const error = h('p', { class: 'error', hidden: true, role: 'alert' });
  const form = h('form', {
    class: 'pila', novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      error.hidden = true;
      const b = form.querySelector('[type=submit]');
      b.disabled = true;
      try { await enviar(Object.fromEntries(new FormData(form))); } catch (err) { error.textContent = err.message; error.hidden = false; } finally { b.disabled = false; }
    },
  }, ...campos, error, h('div', { class: 'fila fin' }, ...extra, h('button', { class: 'btn principal', type: 'submit' }, textoBoton)));
  return form;
}

export function portada() {
  return new Promise((fin) => {
    const l = logo();
    l.className = 'logo';
    const caja = h('div', { class: 'portada' }, l,
      h('p', { class: 'lema' }, 'Practica tu semana antes de vivirla.'),
      h('p', { class: 'sublema' }, 'Campus FISI · Semana 8: Exámenes Parciales'),
      h('p', { class: 'texto' }, 'Escribe tus pendientes de la semana de parciales. Vela convierte cada uno en casos dentro de tu campus, analiza tus decisiones y te da misiones para tu vida real.'),
      h('div', { class: 'fila' },
        boton('COMENZAR AVENTURA', () => fin('registro'), 'principal'),
        boton('YA TENGO UNA CUENTA', () => fin('login'))));
    mostrar(caja, { oscuro: false });
  });
}

export function registro() {
  return new Promise((fin) => {
    const form = formulario([
      campo('name', 'Nombre', 'text', { autocomplete: 'name', maxlength: 60 }),
      campo('nickname', 'Nombre de usuario (nickname)', 'text', { autocomplete: 'username', maxlength: 20 }),
      campo('email', 'Correo electrónico', 'email', { autocomplete: 'email', maxlength: 120 }),
      campo('password', 'Contraseña', 'password', { autocomplete: 'new-password' }),
      h('p', { class: 'ayuda' }, 'Al menos 8 caracteres, con letras y números.'),
      campo('confirm', 'Confirmar contraseña', 'password', { autocomplete: 'new-password' }),
    ], async (datos) => {
      const r = await api.post('/auth/register', datos);
      fin({ codigo: r.recovery_code });
    }, 'Crear cuenta', [boton('Volver', () => fin(null))]);
    mostrar(ventana('chica', h('h2', {}, 'Crea tu cuenta'), form));
  });
}

export function verCodigo(codigo, titulo = 'Tu código de recuperación') {
  return new Promise((fin) => {
    mostrar(ventana('chica', h('h2', {}, titulo),
      h('p', {}, 'Guárdalo en un lugar seguro. Es la única forma de recuperar tu contraseña y solo se muestra ahora.'),
      h('div', { class: 'codigo' }, codigo),
      h('div', { class: 'fila fin' }, boton('Ya lo guardé', fin, 'principal'))));
  });
}

export function login() {
  return new Promise((fin) => {
    const form = formulario([
      campo('login', 'Usuario o correo', 'text', { autocomplete: 'username' }),
      campo('password', 'Contraseña', 'password', { autocomplete: 'current-password' }),
    ], async (datos) => { await api.post('/auth/login', datos); fin('ok'); }, 'Entrar', [
      boton('Volver', () => fin(null)),
      boton('Olvidé mi contraseña', () => fin('recuperar')),
    ]);
    mostrar(ventana('chica', h('h2', {}, 'Inicia sesión'), form));
  });
}

export function recuperar() {
  return new Promise((fin) => {
    const form = formulario([
      campo('login', 'Usuario o correo', 'text', { autocomplete: 'username' }),
      campo('code', 'Código de recuperación', 'text', { autocomplete: 'off', placeholder: 'XXXX-XXXX-XXXX-XXXX' }),
      campo('password', 'Nueva contraseña', 'password', { autocomplete: 'new-password' }),
      campo('confirm', 'Confirmar contraseña', 'password', { autocomplete: 'new-password' }),
    ], async (datos) => {
      const r = await api.post('/auth/recover', datos);
      fin({ codigo: r.recovery_code });
    }, 'Cambiar contraseña', [boton('Volver', () => fin(null))]);
    mostrar(ventana('chica', h('h2', {}, 'Recupera tu cuenta'), h('p', { class: 'tenue' }, 'Usa el código que recibiste al crear tu cuenta.'), form));
  });
}

function textoDocumento(secciones) {
  return secciones.flatMap((s) => [h('h4', {}, s.title), h('p', {}, s.body)]);
}

export function documentos(legal) {
  const cuerpo = h('div', { class: 'documento', tabindex: 0 });
  const pestanas = [['terms', 'Términos y condiciones'], ['privacy', 'Política de privacidad']].map(([clave, texto]) => h('button', {
    type: 'button',
    onclick: (e) => {
      pestanas.forEach((p) => p.setAttribute('aria-selected', 'false'));
      e.currentTarget.setAttribute('aria-selected', 'true');
      cuerpo.replaceChildren(...textoDocumento(legal.documents[clave]));
      cuerpo.scrollTop = 0;
    },
  }, texto));
  pestanas[0].setAttribute('aria-selected', 'true');
  pestanas[1].setAttribute('aria-selected', 'false');
  cuerpo.replaceChildren(...textoDocumento(legal.documents.terms));
  return [h('div', { class: 'pestanas', role: 'tablist' }, pestanas), cuerpo];
}

export async function legal() {
  const docs = await api.get('/auth/legal');
  return new Promise((fin) => {
    const terminos = h('input', { type: 'checkbox' });
    const privacidad = h('input', { type: 'checkbox' });
    const ia = h('input', { type: 'checkbox' });
    const aceptar = boton('ACEPTO LOS TÉRMINOS Y CONDICIONES', async () => {
      await api.post('/auth/legal/accept', { terms: true, privacy: true, ai_consent: ia.checked });
      fin(true);
    }, 'principal');
    const actualizar = () => { aceptar.disabled = !(terminos.checked && privacidad.checked); };
    terminos.addEventListener('change', actualizar);
    privacidad.addEventListener('change', actualizar);
    actualizar();
    mostrar(ventana('', h('h2', {}, 'Antes de entrar'), h('p', { class: 'tenue chico' }, `Versión de los documentos: ${docs.version}`),
      ...documentos(docs),
      h('label', { class: 'casilla' }, terminos, h('span', {}, 'He leído y acepto los términos y condiciones.')),
      h('label', { class: 'casilla' }, privacidad, h('span', {}, 'Confirmo que he leído la política de privacidad.')),
      h('h3', {}, 'Consentimiento opcional'),
      h('label', { class: 'casilla' }, ia, h('span', {}, docs.documents.ai_consent)),
      h('div', { class: 'fila fin' }, boton('NO ACEPTO', () => fin(false), 'peligro'), aceptar)));
  });
}

export function noAcepto() {
  return new Promise((fin) => {
    mostrar(ventana('chica', h('h2', {}, 'Sin aceptación no podemos seguir'),
      h('p', {}, 'Para usar LEVELIFE debes aceptar los términos y confirmar que leíste la política de privacidad. Tu cuenta queda guardada, y puedes volver cuando quieras.'),
      h('div', { class: 'fila fin' }, boton('Salir', () => fin(false)), boton('Volver a leer', () => fin(true), 'principal'))));
  });
}

// ------------------------------------------------------------------ Editor
export function editorPersonaje(actual, recompensas, { puedeCancelar = false } = {}) {
  return new Promise((fin) => {
    let avatar = { ...(actual ?? avatarAzar()) };
    const permitido = (clave, valor) => {
      const libres = EDICION_LIBRE[clave];
      if (libres === undefined || valor < libres) return true;
      return recompensas.some((r) => r.owned && r.kind === clave && r.value === valor);
    };
    const vista = lienzo(ANCHO, ALTO + 4);
    vista.style.width = '';
    let reloj = 0;
    const pintar = () => {
      const g = vista.getContext('2d');
      g.clearRect(0, 0, vista.width, vista.height);
      const dir = [0, 2, 3, 1][Math.floor(reloj / 8) % 4];
      dibujarPersonaje(g, hojaPersonaje(avatar), dir, [1, 0, 2, 0][reloj % 4], 0, 4);
    };
    pintar();
    const animacion = setInterval(() => { reloj += 1; pintar(); }, 260);

    const etiqueta = (clave) => {
      const valor = OPCIONES[clave][avatar[clave]];
      return valor.startsWith('#') ? `Tono ${avatar[clave] + 1}` : valor;
    };
    const valores = {};
    const refrescar = () => { for (const [k, el] of Object.entries(valores)) el.textContent = etiqueta(k); pintar(); };
    const girar = (clave, paso) => {
      const n = OPCIONES[clave].length;
      let v = avatar[clave];
      do { v = (v + paso + n) % n; } while (!permitido(clave, v));
      avatar[clave] = v;
      sonido.efecto('letra');
      refrescar();
    };
    const atributos = h('div', { class: 'atributos' }, Object.keys(OPCIONES).map((clave) => {
      valores[clave] = h('span', { class: 'valor' }, etiqueta(clave));
      return h('div', { class: 'atributo' }, h('span', { class: 'nombre' }, NOMBRES[clave]),
        h('button', { type: 'button', 'aria-label': `${NOMBRES[clave]} anterior`, onclick: () => girar(clave, -1) }, '◀'),
        valores[clave],
        h('button', { type: 'button', 'aria-label': `${NOMBRES[clave]} siguiente`, onclick: () => girar(clave, 1) }, '▶'));
    }));
    atributos.hidden = !actual;
    const salir = (valor) => { clearInterval(animacion); fin(valor); };
    mostrar(ventana('ancha', h('h2', {}, 'Crea tu personaje'),
      h('div', { class: 'editor' }, h('div', { class: 'vista' }, vista), h('div', { class: 'pila' },
        h('p', { class: 'tenue' }, 'Elige lo que te represente. Los nombres de cada opción son solo una guía.'), atributos)),
      h('div', { class: 'fila fin' },
        puedeCancelar && boton('Cancelar', () => salir(null)),
        boton('ALEATORIZAR', () => {
          const nuevo = avatarAzar();
          avatar = nuevo;
          refrescar();
        }),
        boton('PERSONALIZAR', () => { atributos.hidden = !atributos.hidden; }),
        boton('CONFIRMAR PERSONAJE', () => salir(avatar), 'principal'))));
  });
}

// ---------------------------------------------------------------- Semana 8
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export function selectorArea(areas) {
  return new Promise((fin) => {
    mostrar(ventana('chica', h('h2', {}, '¿Qué estudias?'),
      h('p', {}, 'Vela adaptará los dilemas a tu área.'),
      h('div', { class: 'pila' }, areas.map((a) => boton(a.label, () => fin(a.id))))));
  });
}

export function formularioSemana(ai) {
  return new Promise((fin) => {
    const fila = (i) => h('div', { class: 'pendiente' },
      h('input', { name: `nombre${i}`, maxLength: 80, autocomplete: 'off', 'aria-label': `Pendiente ${i + 1}`,
        placeholder: ['Ej.: Parcial de Cálculo', 'Ej.: Trabajo de Base de Datos', 'Otro pendiente', 'Otro pendiente', 'Otro pendiente'][i] }),
      h('select', { name: `dia${i}`, 'aria-label': `Día del pendiente ${i + 1}` }, DIAS.map((d) => h('option', {}, d))));
    const form = formulario([0, 1, 2, 3, 4].map(fila), (datos) => {
      const tasks = [0, 1, 2, 3, 4].map((i) => ({ name: datos[`nombre${i}`].trim(), day: datos[`dia${i}`] })).filter((t) => t.name);
      if (!tasks.length) throw new Error('Escribe al menos un pendiente.');
      fin(tasks);
    }, 'Crear mi semana');
    form.querySelectorAll('input').forEach((c) => { c.required = false; });
    mostrar(ventana('', h('h2', {}, 'Semana 8: Exámenes Parciales'),
      h('p', {}, '¿Qué tienes de verdad esta semana? Escribe de 1 a 5 pendientes y el día de cada uno.'),
      h('p', { class: 'tenue chico' }, ai.available
        ? 'Vela creará varios casos para cada uno. Evita escribir datos personales.'
        : 'Vela no está conectada: usarás casos base con tus pendientes.'),
      form));
  });
}

// ---------------------------------------------------------------- Tutorial
const PASOS = [
  ['Moverte', 'Usa las flechas o WASD. En el celular, usa la cruceta de la izquierda.'],
  ['Interactuar', 'Acércate a una persona u objeto, mira hacia ahí y pulsa Espacio, Enter, E o el botón A.'],
  ['Vivir tus casos', 'Cada actividad tiene varios casos. Busca a la persona con el signo amarillo: la barra superior te dice dónde está.'],
  ['Elegir alternativas', 'Elige con las flechas o con un toque. No hay respuestas correctas: nadie te está calificando.'],
  ['Tu plan real', 'Al terminar, Vela analiza tus patrones y te da una misión por actividad. Pulsa «Mi semana» para revisarlas.'],
  ['Cuidar tus recursos', 'Cada decisión mueve tu energía y tu carga mental. Ninguna opción es la correcta. Una banca o una cama te ayudan a recuperarte.'],
  ['Revisar tu progreso', 'Pulsa Esc, M o el botón B para abrir el menú. Ahí están tu avance, tus logros y este tutorial.'],
];

export function tutorial() {
  return new Promise((fin) => {
    let paso = 0;
    const titulo = h('h2', {}), texto = h('p', {}), cuenta = h('p', { class: 'tenue chico' });
    const pintar = () => {
      titulo.textContent = PASOS[paso][0];
      texto.textContent = PASOS[paso][1];
      cuenta.textContent = `Paso ${paso + 1} de ${PASOS.length}`;
      siguiente.textContent = paso === PASOS.length - 1 ? '¡Listo!' : 'Siguiente';
    };
    const siguiente = boton('Siguiente', () => {
      if (paso === PASOS.length - 1) { ocultar(); fin('completo'); return; }
      paso += 1;
      pintar();
    }, 'principal');
    mostrar(ventana('chica', cuenta, titulo, texto, h('div', { class: 'fila fin' }, boton('Saltar tutorial', () => { ocultar(); fin('saltado'); }), siguiente)), { oscuro: false });
    pintar();
  });
}
