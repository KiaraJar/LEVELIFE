// Menú del juego: personaje, progreso, misiones, historial, logros, asistente, mapa y configuración.
import { api } from './api.js';
import { TILE, lienzo, pintarBordes, pintarFuente, pintarTile, retratoVela } from './art.js';
import { sonido } from './audio.js';
import { MAPAS } from './maps.js';
import { documentos, editorPersonaje, tutorial, verCodigo } from './pantallas.js';
import { aviso, boton, h, mostrar, ocultar, ventana } from './ui.js';

export class Menu {
  constructor(juego) { this.juego = juego; }

  cerrar() { ocultar(); document.activeElement?.blur(); this.juego.reanudar(); }

  pestanas(activa) {
    const opciones = [['inicio', 'Inicio', () => this.abrir()], ['semana', 'Mi semana', () => this.semana()], ['vela', 'Vela', () => this.asistente()],
      ['mapa', 'Mapa', () => this.mapa()], ['personaje', 'Mi personaje', () => this.personaje()],
      ['tutorial', 'Tutorial', async () => { await tutorial(); this.abrir(); }], ['ajustes', 'Ajustes', () => this.configuracion()]];
    return h('nav', { class: 'tabs', role: 'tablist' },
      opciones.map(([id, texto, accion]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(id === activa), onclick: accion }, texto)),
      h('button', { type: 'button', class: 'cerrar', 'aria-label': 'Cerrar', onclick: () => this.cerrar() }, 'X'));
  }

  panel(activa, titulo, ...hijos) {
    return h('section', { class: 'marco ventana menu-ventana' }, this.pestanas(activa), h('div', { class: 'pane' }, h('h2', {}, titulo), ...hijos));
  }

  motor(ai) { return h('p', { class: 'motor' }, ai.label); }

  abrir() {
    this.juego.pausar();
    sonido.efecto('abrir');
    const e = this.juego.estado;
    const w = this.juego.semana;
    const dato = (valor, nombre) => h('div', { class: 'stat' }, h('b', {}, valor), nombre);
    mostrar(this.panel('inicio', `Hola, ${e.user.nickname}`,
      h('p', { class: 'tenue' }, e.hud.cycle),
      w && h('p', {}, w.current ? `Busca a ${this.juego.nombreDe(w.current.npc)}: ${e.zones[w.current.zone].name}` : 'Tu Vela Report está listo en Mi semana.'),
      h('h3', {}, 'Tu semana hasta ahora'),
      h('div', { class: 'stats' },
        dato(w ? `${Math.min(w.day, w.total)}/${w.total}` : '0', 'Casos'),
        dato(`${e.resources.energy}%`, 'Energía'),
        dato(`${e.resources.tension}%`, 'Carga mental'),
        dato(`${e.resources.performance}%`, 'Rendimiento'),
        dato(`${e.resources.social}%`, 'Red de apoyo')),
      h('h3', {}, 'Controles'),
      h('p', {}, 'Mover: WASD o flechas. Hablar: Espacio, Enter o E. Menú: Esc o M. En celular: cruceta, A y B.')));
  }

  semana() {
    this.juego.pausar();
    const w = this.juego.semana;
    const hechos = Math.min(w.day, w.total);
    mostrar(this.panel('semana', 'Mi Semana 8',
      w.source === 'plantilla' && h('p', { class: 'motor' }, 'Casos base: Vela no participó en su creación.'),
      h('h3', {}, 'Tus actividades'),
      w.tasks.map((t) => h('p', {}, `▶ ${t.name} (${t.day})`)),
      h('h3', {}, 'Tu avance'),
      h('p', {}, w.finished ? `Completaste ${w.total} casos.` : `Caso ${hechos + 1} de ${w.total}.`),
      h('div', { class: 'fila' },
        w.plan && boton('Ver Vela Report', async () => { await this.juego.mostrarPlan(w.plan); this.semana(); }, 'principal'),
        boton('Empezar otra semana', async () => {
          if (!confirm('Se reiniciarán tus casos, tus misiones, tu energía y tu carga mental. ¿Continuar?')) return;
          await this.juego.crearSemana();
          this.juego.pintarSemana();
          ocultar();
          this.juego.reanudar();
        }))));
  }

  async personaje() {
    const avatar = await editorPersonaje(this.juego.estado.user.avatar, this.juego.estado.rewards, { puedeCancelar: true });
    if (avatar) {
      this.juego.actualizar(await api.put('/avatar', { avatar }));
      this.juego.mundo.apariencia(avatar);
      aviso('Personaje guardado');
    }
    this.abrir();
  }

  mapa() {
    const m = MAPAS.campus.tiles;
    const c = lienzo(m[0].length * TILE, m.length * TILE);
    const g = c.getContext('2d');
    m.forEach((fila, j) => fila.forEach((t, i) => pintarTile(g, t, i * TILE, j * TILE, i * 31 + j * 17)));
    pintarBordes(g, m);
    pintarFuente(g, MAPAS.campus.fuente.x * TILE, MAPAS.campus.fuente.y * TILE);
    const mundo = this.juego.mundo;
    if (mundo.nombreMapa === 'campus') {
      g.fillStyle = '#d9573f';
      g.fillRect(mundo.jugador.x - 8, mundo.jugador.y - 8, 32, 32);
      g.fillStyle = '#fff';
      g.fillRect(mundo.jugador.x, mundo.jugador.y, 16, 16);
    }
    c.className = 'mapa-img';
    const zonas = Object.values(this.juego.estado.zones);
    mostrar(this.panel('mapa', 'Mapa del campus', c,
      h('div', { class: 'etiquetas' }, zonas.map((z) => h('span', { class: 'etiqueta' }, z.open ? z.name : `${z.name}: ${z.unlock} historias`)))));
  }

  async asistente() {
    this.juego.pausar();
    const { messages, ai } = await api.get('/assistant');
    const lista = h('div', { class: 'chat', 'aria-live': 'polite' });
    const agregar = (role, texto) => { lista.append(h('p', { class: role }, texto)); lista.scrollTop = lista.scrollHeight; };
    if (!messages.length) agregar('assistant', 'Hola, soy Vela, una agente de IA. Podemos hablar de tus decisiones y misiones. No hago diagnósticos.');
    messages.forEach((m) => agregar(m.role, m.content));
    const entrada = h('input', { maxLength: 500, placeholder: 'Escribe tu mensaje', 'aria-label': 'Mensaje para Vela' });
    const form = h('form', { class: 'fila', onsubmit: async (e) => {
      e.preventDefault();
      const message = entrada.value.trim();
      if (!message) return;
      entrada.value = '';
      agregar('user', message);
      const espera = h('p', { class: 'assistant tenue' }, 'Vela está pensando...');
      lista.append(espera);
      lista.scrollTop = lista.scrollHeight;
      try { agregar('assistant', (await api.post('/assistant', { message })).reply); } catch (err) { aviso(err.message); } finally { espera.remove(); }
    } }, entrada, h('button', { class: 'btn principal', type: 'submit' }, 'Enviar'));
    entrada.style.flex = '1';
    const cara = lienzo(40, 40);
    retratoVela(cara);
    cara.style.cssText = 'width:48px;height:48px;image-rendering:pixelated';
    mostrar(this.panel('vela', 'Vela, tu agente de IA', h('div', { class: 'fila' }, cara, this.motor(ai)), lista, form));
    entrada.style.minHeight = '42px';
    entrada.focus();
  }

  async configuracion() {
    const e = this.juego.estado;
    const u = e.user;
    const docs = await api.get('/auth/legal');
    const salida = h('div', {});
    const entrada = (name, label, value, type = 'text') => h('label', { class: 'campo' }, h('span', {}, label), h('input', { name, type, value: value ?? '', autocomplete: 'off' }));
    const cuenta = h('form', { class: 'pila', onsubmit: async (ev) => {
      ev.preventDefault();
      try {
        await api.patch('/auth/account', Object.fromEntries(new FormData(cuenta)));
        this.juego.actualizar(await api.get('/state'));
        aviso('Cuenta actualizada');
      } catch (err) { aviso(err.message); }
    } }, entrada('name', 'Nombre', u.name), entrada('nickname', 'Nombre de usuario', u.nickname), entrada('email', 'Correo', u.email, 'email'), h('div', {}, h('button', { class: 'btn', type: 'submit' }, 'Guardar datos')));
    const clave = h('form', { class: 'pila', onsubmit: async (ev) => {
      ev.preventDefault();
      try {
        await api.post('/auth/password', Object.fromEntries(new FormData(clave)));
        clave.reset();
        aviso('Contraseña actualizada');
      } catch (err) { aviso(err.message); }
    } }, entrada('current', 'Contraseña actual', '', 'password'), entrada('password', 'Nueva contraseña', '', 'password'), entrada('confirm', 'Confirmar contraseña', '', 'password'), h('div', {}, h('button', { class: 'btn', type: 'submit' }, 'Cambiar contraseña')));
    const consentimiento = h('input', { type: 'checkbox', checked: Boolean(e.consent?.ai), onchange: async (ev) => {
      await api.patch('/auth/consent', { ai_consent: ev.target.checked });
      this.juego.actualizar(await api.get('/state'));
      aviso(ev.target.checked ? 'Análisis activado' : 'Análisis desactivado');
    } });
    mostrar(this.panel('ajustes', 'Ajustes',
      h('h3', {}, 'Cuenta'), h('p', { class: 'tenue chico' }, `Cuenta creada: ${u.created_at}`), cuenta,
      h('h3', {}, 'Seguridad'), clave,
      h('h3', {}, 'Privacidad y consentimientos'),
      this.motor(e.ai),
      h('p', { class: 'chico' }, `Documentos aceptados: versión ${e.consent?.version}. Último cambio: ${e.consent?.at}.`),
      h('label', { class: 'casilla' }, consentimiento, h('span', {}, docs.documents.ai_consent)),
      ...documentos(docs),
      h('div', { class: 'fila' },
        boton('Consultar mis datos', async () => { salida.replaceChildren(h('pre', { class: 'documento chico' }, JSON.stringify(await api.get('/me/records'), null, 1))); }),
        boton('Descargar mis datos', async () => {
          const blob = new Blob([JSON.stringify(await api.get('/me/records'), null, 2)], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: 'levelife-mis-datos.json' });
          a.click();
          URL.revokeObjectURL(a.href);
        }),
        boton('Borrar mis registros', async () => {
          if (!confirm('Se borrarán decisiones, reflexiones, análisis, chat y misiones sin terminar. Conservas tu XP e insignias. ¿Continuar?')) return;
          await api.del('/me/records');
          this.juego.actualizar(await api.get('/state'));
          aviso('Registros eliminados');
        }, 'peligro')),
      salida,
      h('h3', {}, 'Sonido'),
      h('label', { class: 'casilla' }, h('input', { type: 'checkbox', checked: sonido.efectos, onchange: (ev) => sonido.cambiarEfectos(ev.target.checked) }), h('span', {}, 'Efectos de sonido')),
      h('label', { class: 'casilla' }, h('input', { type: 'checkbox', checked: sonido.musica, onchange: (ev) => sonido.cambiarMusica(ev.target.checked) }), h('span', {}, 'Música ambiental')),
      h('h3', {}, 'Sesión'),
      h('div', { class: 'fila' },
        boton('Cerrar sesión', async () => { await api.post('/auth/logout'); location.reload(); }),
        boton('Eliminar mi cuenta', () => this.eliminarCuenta(), 'peligro'))));
  }

  eliminarCuenta() {
    const clave = h('input', { type: 'password', autocomplete: 'current-password' });
    mostrar(ventana('chica', h('h2', {}, 'Eliminar cuenta'), h('p', {}, 'Se borrarán tu cuenta y todos tus datos para siempre. Escribe tu contraseña para confirmar.'),
      h('label', { class: 'campo' }, h('span', {}, 'Contraseña'), clave),
      h('div', { class: 'fila fin' }, boton('Cancelar', () => this.configuracion()), boton('Eliminar para siempre', async () => {
        await api.del('/auth/account', { password: clave.value });
        location.reload();
      }, 'peligro'))));
  }
}

export { verCodigo };
