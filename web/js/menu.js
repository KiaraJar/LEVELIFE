// Menú del juego: personaje, progreso, misiones, historial, logros, asistente, mapa y configuración.
import { api } from './api.js';
import { TILE, icono, lienzo, pintarFuente, pintarTile, retratoVela } from './art.js';
import { sonido } from './audio.js';
import { MAPAS } from './maps.js';
import { documentos, editorPersonaje, tutorial, verCodigo } from './pantallas.js';
import { aviso, boton, celebrar, h, mostrar, ocultar, ventana } from './ui.js';

const DIFICULTAD = { 1: 'Fácil', 2: 'Media', 3: 'Retadora' };
const ESTADOS = { propuesta: 'Propuesta', activa: 'En curso', completada: 'Completada', rechazada: 'Rechazada' };

export class Menu {
  constructor(juego) { this.juego = juego; }

  cerrar() { ocultar(); document.activeElement?.blur(); this.juego.reanudar(); }

  cabecera(titulo, volver = () => this.abrir()) {
    return h('div', { class: 'cabecera' }, h('h2', {}, titulo), h('div', { class: 'fila' }, boton('Volver', volver), boton('Cerrar', () => this.cerrar())));
  }

  motor(ai) { return h('p', { class: 'motor' }, ai.label); }

  abrir() {
    this.juego.pausar();
    sonido.efecto('abrir');
    const e = this.juego.estado;
    const op = (texto, accion) => boton(texto, accion);
    mostrar(ventana('', h('div', { class: 'cabecera' }, h('h2', {}, 'Menú'), boton('Cerrar', () => this.cerrar())),
      h('p', { class: 'tenue' }, `${e.user.nickname} · Nivel ${e.level.level}: ${e.level.title}`),
      h('div', { class: 'menu' },
        op('Mi personaje', () => this.personaje()), op('Mi progreso', () => this.progreso()),
        op('Mis misiones', () => this.misiones()), op('Mi historial', () => this.historial()),
        op('Mis logros', () => this.logros()), op('Mi asistente IA', () => this.asistente()),
        op('Mapa del campus', () => this.mapa()), op('Inventario', () => this.inventario()),
        op('Tutorial', async () => { await tutorial(); this.abrir(); }), op('Configuración', () => this.configuracion()))));
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

  async progreso() {
    const p = await api.get('/progress');
    const dims = Object.values(p.dimensions);
    const tope = Math.max(40, ...dims.map((d) => d.points));
    mostrar(ventana('', this.cabecera('Mi progreso'),
      h('p', { class: 'tenue' }, 'El avance viene de las misiones que completas. Lo que eliges en las historias no cambia estas barras.'),
      ...dims.map((d) => {
        const barra = h('i');
        barra.style.width = `${(d.points / tope) * 100}%`;
        return h('div', { class: 'barra' }, h('span', {}, d.label), h('div', { class: 'pista' }, barra), h('span', {}, `${d.missions} mis.`));
      }),
      h('p', {}, `Historias vividas: ${p.stories_done} de ${p.stories_total}. Misiones completadas: ${p.missions.done}. En curso: ${p.missions.active}.`),
      p.strengths.length > 0 && h('div', {}, h('h3', {}, 'Lo que ha aparecido a tu favor'), h('p', {}, p.strengths.join(' · '))),
      p.growth.length > 0 && h('div', {}, h('h3', {}, 'Podrías explorar'), h('p', {}, p.growth.join(' · '))),
      p.analysis && h('div', {}, h('h3', {}, `Último análisis (${p.analysis.date})`), h('p', {}, p.analysis.summary), ...p.analysis.observations.map((o) => h('p', { class: 'tenue' }, o))),
      this.motor(p.ai)));
  }

  tarjetaMision(m, alCambiar) {
    const acciones = [];
    const accion = (texto, f, clase) => acciones.push(boton(texto, f, clase));
    if (m.status === 'propuesta') accion('Aceptar', async () => { this.juego.actualizar((await api.post(`/missions/${m.id}/accept`)).state); await alCambiar(); }, 'verde');
    if (m.status === 'activa') accion('Marcar completada', () => this.completar(m, alCambiar), 'verde');
    if (['propuesta', 'activa'].includes(m.status)) {
      accion('Pedir cambio', () => this.modificar(m, alCambiar));
      accion('Rechazar', () => this.rechazar(m, alCambiar));
    }
    return h('article', { class: 'mision' }, h('h4', {}, m.title),
      h('div', { class: 'etiquetas' },
        h('span', { class: 'etiqueta dim' }, m.dimension_label), h('span', { class: 'etiqueta' }, `${m.minutes} min`),
        h('span', { class: 'etiqueta' }, DIFICULTAD[m.difficulty]), h('span', { class: 'etiqueta' }, m.frequency),
        h('span', { class: 'etiqueta' }, `+${m.xp} XP`), h('span', { class: 'etiqueta' }, ESTADOS[m.status])),
      h('p', {}, m.description), h('p', { class: 'tenue' }, `Objetivo: ${m.objective}`),
      m.reason && h('p', { class: 'tenue chico' }, m.reason),
      m.feedback && h('p', { class: 'chico' }, `Vela: ${m.feedback}`),
      acciones.length > 0 && h('div', { class: 'fila' }, acciones));
  }

  async misiones(volver = () => this.abrir()) {
    this.juego.pausar();
    const { missions, ai } = await api.get('/missions');
    const abiertas = missions.filter((m) => ['propuesta', 'activa'].includes(m.status));
    const hechas = missions.filter((m) => m.status === 'completada');
    const recargar = () => this.misiones(volver);
    mostrar(ventana('ancha', this.cabecera('MIS MISIONES DE BIENESTAR', volver), this.motor(ai),
      abiertas.length ? abiertas.map((m) => this.tarjetaMision(m, recargar)) : h('p', {}, 'No tienes misiones abiertas. Vive una historia o pide una nueva.'),
      h('div', { class: 'fila' }, boton('Pedir una misión', async () => {
        const r = await api.post('/missions/request');
        this.juego.actualizar(r.state);
        await recargar();
      }, 'principal')),
      hechas.length > 0 && h('h3', {}, 'Completadas'), hechas.map((m) => this.tarjetaMision(m, recargar))));
  }

  completar(m, alCambiar) {
    const nota = h('textarea', { rows: 3, maxLength: 400, placeholder: 'Opcional: ¿qué notaste?' });
    const elegir = (texto, feeling) => boton(texto, async () => {
      const r = await api.post(`/missions/${m.id}/complete`, { feeling, note: nota.value });
      this.juego.actualizar(r.state);
      celebrar();
      this.juego.recompensa(r);
      mostrar(ventana('chica', h('h2', {}, '¡Misión completada!'), h('p', {}, `+${r.xp} XP`), h('p', {}, r.feedback ?? 'Tu experiencia quedó registrada.'), h('div', { class: 'fila fin' }, boton('Seguir', alCambiar, 'principal'))));
    });
    mostrar(ventana('chica', h('h2', {}, m.title), h('p', {}, '¿Cómo te fue?'), nota, h('div', { class: 'fila fin' }, elegir('Fácil', 'facil'), elegir('Regular', 'regular'), elegir('Difícil', 'dificil'), boton('Cancelar', alCambiar))));
  }

  modificar(m, alCambiar) {
    const pedir = (texto, request) => boton(texto, async () => {
      await api.post(`/missions/${m.id}/modify`, { request });
      aviso('Misión ajustada');
      await alCambiar();
    });
    const texto = h('textarea', { rows: 2, maxLength: 200, placeholder: 'O cuéntale a Vela qué necesitas cambiar' });
    const pedirVela = boton('Pedir a Vela', async () => {
      if (!texto.value.trim()) { aviso('Escribe qué necesitas cambiar.'); return; }
      await api.post(`/missions/${m.id}/modify`, { text: texto.value });
      aviso('Vela ajustó tu misión');
      await alCambiar();
    }, 'principal');
    mostrar(ventana('chica', h('h2', {}, 'Ajustar misión'), h('p', {}, `¿Cómo adaptamos «${m.title}»?`), h('div', { class: 'fila' }, pedir('Más corta', 'mas_corta'), pedir('Más fácil', 'mas_facil'), pedir('En otra fecha', 'otra_fecha')), texto, h('div', { class: 'fila fin' }, boton('Cancelar', alCambiar), pedirVela)));
  }

  rechazar(m, alCambiar) {
    const motivo = (texto, reason) => boton(texto, async () => {
      this.juego.actualizar((await api.post(`/missions/${m.id}/reject`, { reason })).state);
      await alCambiar();
    });
    mostrar(ventana('chica', h('h2', {}, 'Rechazar misión'), h('p', {}, 'Nos ayuda a no insistir. ¿Por qué no encaja?'), h('div', { class: 'fila' }, motivo('No me sirve', 'no_me_sirve'), motivo('Muy difícil', 'muy_dificil'), motivo('Ahora no', 'ahora_no'), boton('Cancelar', alCambiar))));
  }

  async historial() {
    const { runs } = await api.get('/history');
    mostrar(ventana('', this.cabecera('Mi historial'),
      runs.length ? runs.map((r) => h('article', { class: 'mision' }, h('h4', {}, r.title), h('p', { class: 'tenue' }, `${r.date} · Desenlace: ${r.ending}`),
        r.decisions.length ? r.decisions.map((d) => h('p', {}, `▶ ${d}`)) : h('p', { class: 'tenue' }, 'Decisiones no registradas: el análisis estaba desactivado.'),
        r.reflection && h('p', { class: 'tenue' }, `Tu reflexión: ${r.reflection}`))) : h('p', {}, 'Aún no has vivido ninguna historia.')));
  }

  logros() {
    const e = this.juego.estado;
    mostrar(ventana('', this.cabecera('Mis logros'), h('p', {}, `Nivel ${e.level.level}: ${e.level.title} · ${e.level.xp} XP`),
      h('div', { class: 'logros' }, e.badges.map((b) => h('div', { class: `logro ${b.owned ? '' : 'bloqueado'}` }, icono(b.icon), h('b', {}, b.name), b.desc)))));
  }

  inventario() {
    const e = this.juego.estado;
    mostrar(ventana('', this.cabecera('Inventario de recompensas'), h('p', { class: 'tenue' }, 'Lo que ganas aparece en el editor de personaje.'),
      h('div', { class: 'logros' }, e.rewards.map((r) => h('div', { class: `logro ${r.owned ? '' : 'bloqueado'}` }, icono('regalo'), h('b', {}, r.name), r.owned ? 'Disponible' : (r.level ? `Nivel ${r.level}` : 'Gana una insignia'))))));
  }

  mapa() {
    const m = MAPAS.campus.tiles;
    const c = lienzo(m[0].length * TILE, m.length * TILE);
    const g = c.getContext('2d');
    m.forEach((fila, j) => fila.forEach((t, i) => pintarTile(g, t, i * TILE, j * TILE, i * 31 + j * 17)));
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
    mostrar(ventana('ancha', this.cabecera('Mapa del campus'), c,
      h('div', { class: 'etiquetas' }, zonas.map((z) => h('span', { class: 'etiqueta' }, z.open ? z.name : `${z.name}: ${z.unlock} historias`)))));
  }

  async asistente(volver = () => this.abrir()) {
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
    mostrar(ventana('', this.cabecera('Mi asistente IA', volver), h('div', { class: 'fila' }, cara, this.motor(ai)), lista, form));
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
    mostrar(ventana('', this.cabecera('Configuración'),
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
