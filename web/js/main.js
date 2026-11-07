// Ciclo principal: conecta cuenta, mundo, historias, análisis y misiones.
import { ApiError, api } from './api.js';
import { TILE } from './art.js';
import { sonido } from './audio.js';
import { dialogo } from './dialogo.js';
import { Mundo } from './engine.js';
import { MAPAS, PUNTO_INICIAL } from './maps.js';
import { Menu } from './menu.js';
import * as P from './pantallas.js';
import { aviso, boton, capaAbierta, celebrar, fundido, h, mostrar, ocultar, ventana } from './ui.js';

const $ = (id) => document.getElementById(id);
const TECLAS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const DIALOGO_VELA = (text) => ({ speaker: 'vela', text });
const PAUSA_VELA = 1500;
const ESPERA_MAXIMA = 100000;

class Juego {
  constructor() {
    this.mundo = new Mundo($('mundo'));
    this.menu = new Menu(this);
    this.estado = null;
    this.ocupado = true;
    this.ultimoGuardado = 0;
    this.ultimoAviso = 0;
    this.mundo.alEntrarSalida = (s) => this.usarSalida(s);
    this.mundo.alCambiarZona = (z) => this.cambiarZona(z);
    this.mundo.alMoverse = () => this.guardarPosicion();
    this.mundo.marcaDe = (id) => this.estado?.stories.find((s) => s.id === id)?.open;
    this.mundo.bloqueado = (px, py) => this.parqueCerrado(px, py);
    this.conectarControles();
    this.mundo.ciclo();
  }

  // ------------------------------------------------------------ Controles
  conectarControles() {
    addEventListener('keydown', (e) => {
      sonido.iniciar();
      if (capaAbierta()) { if (e.code === 'Escape') this.cerrarCapa(); return; }
      if (e.target.matches?.('input, textarea')) return;
      if (dialogo.abierto) {
        if (dialogo.tecla(e.code) || ['Space', 'Enter', 'KeyE'].includes(e.code)) {
          e.preventDefault();
          if (!e.repeat && !dialogo.teclaOpcion) dialogo.accion();
        }
        return;
      }
      if (this.ocupado) return;
      if (TECLAS[e.code]) {
        e.preventDefault();
        this.mundo.teclas.delete(TECLAS[e.code]);
        this.mundo.teclas.add(TECLAS[e.code]);
      } else if (['Space', 'Enter', 'KeyE'].includes(e.code) && !e.repeat) {
        e.preventDefault();
        this.interactuar();
      } else if (['Escape', 'KeyM'].includes(e.code)) {
        this.menu.abrir();
      }
    });
    addEventListener('keyup', (e) => { if (TECLAS[e.code]) this.mundo.teclas.delete(TECLAS[e.code]); });
    addEventListener('blur', () => this.mundo.teclas.clear());
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) $('tactil').dataset.disponible = '1';
    document.querySelectorAll('[data-dir]').forEach((b) => {
      const dir = b.dataset.dir;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); sonido.iniciar(); if (!this.ocupado) this.mundo.teclas.add(dir); });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => this.mundo.teclas.delete(dir));
    });
    document.querySelector('[data-boton=a]').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (dialogo.abierto) dialogo.accion(); else if (!this.ocupado) this.interactuar();
    });
    document.querySelector('[data-boton=b]').addEventListener('pointerdown', (e) => { e.preventDefault(); if (!this.ocupado) this.menu.abrir(); });
    $('hud-menu').addEventListener('click', () => { if (!this.ocupado) this.menu.abrir(); });
    $('hud-misiones').addEventListener('click', () => { if (!this.ocupado) this.menu.misiones(() => this.menu.cerrar()); });
    $('hud-mapa').addEventListener('click', () => { if (!this.ocupado) { this.pausar(); this.menu.mapa(); } });
  }

  cerrarCapa() { if (!this.ocupado) this.menu.cerrar(); }

  pausar() { this.mundo.pausa = true; this.mundo.teclas.clear(); }

  reanudar() { this.ocupado = false; this.mundo.pausa = false; }

  // --------------------------------------------------------------- Estado
  actualizar(estado) {
    this.estado = estado;
    if (!estado.user) return;
    $('hud-nombre').textContent = estado.user.nickname;
    $('hud-nivel').textContent = `Nv ${estado.level.level}`;
    $('hud-xp').firstElementChild.style.width = `${(estado.level.into / estado.level.needed) * 100}%`;
    $('hud-cuenta').textContent = estado.missions_open;
    dialogo.avatar = estado.user.avatar;
  }

  recompensa(r) {
    if (r.level_up) { celebrar(); aviso(`¡Subiste al nivel ${r.level.level}: ${r.level.title}!`); }
    for (const b of r.new_badges ?? []) aviso(`Insignia: ${b.name}`);
  }

  // --------------------------------------------------------------- Inicio
  async arrancar() {
    this.mundo.cargar('campus', 29, 24);
    this.mundo.paneo = true;
    try {
      this.actualizar(await api.get('/state'));
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) throw err;
      return this.bienvenida();
    }
    return this.continuar();
  }

  async bienvenida() {
    for (;;) {
      const destino = await P.portada();
      if (destino === 'registro') {
        const r = await P.registro();
        if (r) { await P.verCodigo(r.codigo); break; }
      } else if (await this.flujoLogin()) break;
    }
    this.actualizar(await api.get('/state'));
    return this.continuar();
  }

  async flujoLogin() {
    for (;;) {
      const r = await P.login();
      if (r === 'ok') return true;
      if (r === null) return false;
      const recuperado = await P.recuperar();
      if (recuperado) { await P.verCodigo(recuperado.codigo, 'Tu nuevo código de recuperación'); return true; }
    }
  }

  async continuar() {
    while (!this.estado.terms_ok) {
      if (await P.legal()) { this.actualizar(await api.get('/state')); break; }
      if (!(await P.noAcepto())) {
        await api.post('/auth/logout');
        location.reload();
        return;
      }
    }
    if (!this.estado.user.avatar) {
      const avatar = await P.editorPersonaje(null, this.estado.rewards);
      this.actualizar(await api.put('/avatar', { avatar }));
    }
    ocultar();
    this.mundo.paneo = false;
    this.mundo.apariencia(this.estado.user.avatar);
    $('hud').hidden = false;
    if ($('tactil').dataset.disponible) $('tactil').hidden = false;
    if (!this.estado.user.intro_done) await this.introduccion();
    else {
      const p = this.estado.user.position;
      this.mundo.cargar(p.map ?? PUNTO_INICIAL.map, p.x ?? PUNTO_INICIAL.x, p.y ?? PUNTO_INICIAL.y);
    }
    this.reanudar();
  }

  async introduccion() {
    this.mundo.cargar('campus', 29, 35, 3);
    await new Promise((r) => setTimeout(r, 400));
    this.mundo.pausa = false;
    this.mundo.teclas.add('up');
    await new Promise((r) => setTimeout(r, 1500));
    this.pausar();
    await dialogo.decir([
      { speaker: 'nar', text: 'Tu primer día en el campus. El aire huele a pasto y a café.' },
      DIALOGO_VELA('¡Bienvenido a tu nueva aventura! Este campus está lleno de historias, desafíos y experiencias.'),
      DIALOGO_VELA('Explora sus espacios, conoce a otros estudiantes y descubre cómo tus decisiones pueden convertirse en oportunidades para crecer.'),
      DIALOGO_VELA(this.estado.ai.available
        ? 'Soy Vela, una agente de inteligencia artificial. Te acompaño a convertir tus decisiones en misiones para tu vida real.'
        : 'Soy Vela, una agente de inteligencia artificial, pero ahora no estoy conectada. Puedes jugar igual y recibirás misiones generales.'),
      DIALOGO_VELA('Vamos con lo básico.'),
    ]);
    dialogo.cerrar();
    const resultado = await P.tutorial();
    const r = await api.post('/flags', { intro: true, tutorial: resultado });
    this.actualizar(r.state);
    if (r.xp) aviso(`+${r.xp} XP por completar el tutorial`);
  }

  // ---------------------------------------------------------------- Mundo
  zonaAbierta(zona) { return this.estado?.zones[zona]?.open ?? true; }

  parqueCerrado(px, py) {
    if (this.mundo.nombreMapa !== 'campus' || this.zonaAbierta('parque')) return false;
    const dentro = px + 12 >= 38 * TILE && py + 15 >= 28 * TILE;
    if (dentro) this.avisarCierre('parque');
    return dentro;
  }

  avisarCierre(zona) {
    if (performance.now() - this.ultimoAviso < 3000) return;
    this.ultimoAviso = performance.now();
    const z = this.estado.zones[zona];
    aviso(`${z.name}: se abre al vivir ${z.unlock} ${z.unlock === 1 ? 'historia' : 'historias'}.`);
  }

  async usarSalida(salida) {
    const yo = this.mundo.jugador;
    if (salida.zona && !this.zonaAbierta(salida.zona)) {
      yo.y = (salida.y + 1) * TILE;
      this.avisarCierre(salida.zona);
      return;
    }
    if (this.ocupado) return;
    this.ocupado = true;
    this.pausar();
    sonido.efecto('puerta');
    await fundido(() => {
      this.mundo.cargar(salida.a, salida.ax, salida.ay, salida.zona ? 3 : 0);
      this.guardarPosicion(true);
    });
    this.reanudar();
  }

  cambiarZona(zona) {
    if (!this.estado || this.mundo.paneo) return;
    const nombre = zona ? this.estado.zones[zona].name : this.mundo.mapa.nombre;
    $('hud-zona').textContent = nombre;
    if (!zona || this.estado.user.visited.includes(zona)) return;
    api.post('/visit', { zone: zona }).then((r) => {
      this.actualizar(r.state);
      if (r.xp) aviso(`Zona descubierta: ${nombre} (+${r.xp} XP)`);
      this.recompensa(r);
    }).catch((err) => console.error(err));
  }

  guardarPosicion(ahora = false) {
    if (!ahora && performance.now() - this.ultimoGuardado < 4000) return;
    this.ultimoGuardado = performance.now();
    const [x, y] = this.mundo.celda();
    api.post('/position', { map: this.mundo.nombreMapa, x, y }).catch(() => {});
  }

  async conversar(lineas, nombres) {
    this.ocupado = true;
    this.pausar();
    await dialogo.decir(lineas, nombres);
    dialogo.cerrar();
    this.reanudar();
  }

  interactuar() {
    const o = this.mundo.objetivo();
    if (o.tipo === 'npc') {
      const { npc } = o;
      this.mundo.mirarA(npc);
      if (npc.historia) return this.iniciarHistoria(npc.historia);
      return this.conversar(npc.decir.lineas.map((text) => ({ speaker: npc.id, text })), { [npc.id]: npc.nombre });
    }
    const m = this.mundo.mapa;
    const textos = {
      letrero: m.letreros?.[`${o.x},${o.y}`], banca: m.bancas, estante: m.estantes, barra: m.barra, pizarra: m.pizarra, cama: m.camas,
      fuente: 'El agua cae sin apuro. Alguien dejó una moneda y un deseo.',
    };
    const texto = textos[o.tile];
    if (texto) this.conversar([{ speaker: 'nar', text: texto }]);
    return undefined;
  }

  // ------------------------------------------------------------ Historias
  async iniciarHistoria(id) {
    this.ocupado = true;
    this.pausar();
    try {
      const inicio = await api.post(`/stories/${id}/start`);
      let { node } = inicio;
      const { run_id: run, cast, title } = inicio;
      sonido.efecto('abrir');
      for (;;) {
        await dialogo.decir(node.lines, cast);
        if (!node.choices) break;
        const choice = await dialogo.elegir(node.choices);
        ({ node } = await api.post(`/runs/${run}/choose`, { choice }));
      }
      dialogo.cerrar();
      await this.cierreHistoria(run, node, title);
    } catch (err) {
      dialogo.cerrar();
      aviso(err.message);
      console.error(err);
    }
    this.reanudar();
  }

  reflexion(node) {
    return new Promise((fin) => {
      const texto = h('textarea', { rows: 4, maxLength: 600, placeholder: 'Escribe lo que quieras, o déjalo en blanco.' });
      mostrar(ventana('chica', h('h2', {}, node.end), h('p', {}, node.reflect), texto,
        h('p', { class: 'ayuda' }, 'Es opcional y no se califica.'),
        h('div', { class: 'fila fin' }, boton('Continuar', () => fin(texto.value), 'principal'))));
    });
  }

  async cierreHistoria(run, node, title) {
    const reflection = await this.reflexion(node);
    ocultar();
    const r = await api.post(`/runs/${run}/finish`, { reflection });
    this.actualizar(r.state);
    await this.ventanaRecompensas(title, r);
    this.recompensa(r);
    if (r.support) await this.ventanaApoyo(r.support);
    if (r.agent_run) await this.resultadoVela(r.agent_run);
    else if (r.missions.length) await this.propuestas(r.missions);
  }

  ventanaApoyo(texto) {
    return new Promise((fin) => {
      mostrar(ventana('chica', h('h2', {}, 'Antes de seguir'), h('p', {}, texto), h('div', { class: 'fila fin' }, boton('Entendido', () => { ocultar(); fin(); }, 'principal'))));
    });
  }

  // El análisis corre en el servidor. Se puede seguir jugando: lo que proponga queda en Misiones.
  esperarVela(id) {
    return new Promise((fin) => {
      let activo = true;
      mostrar(ventana('chica', h('h2', {}, 'Vela está analizando'), h('p', {}, 'Está revisando tus decisiones y reflexiones. Puede tardar un momento.'),
        h('div', { class: 'fila fin' }, boton('Seguir jugando', () => { activo = false; ocultar(); aviso('Lo que proponga Vela aparecerá en Misiones.'); fin(null); }))));
      const limite = performance.now() + ESPERA_MAXIMA;
      const revisar = async () => {
        if (!activo) return;
        try {
          const e = await api.get(`/agent/runs/${id}`);
          if (e.status !== 'pendiente') { ocultar(); fin(e); return; }
        } catch (err) { console.error(err); }
        if (performance.now() > limite) { ocultar(); aviso('Vela sigue trabajando. Revisa Misiones más tarde.'); fin(null); return; }
        setTimeout(revisar, PAUSA_VELA);
      };
      setTimeout(revisar, PAUSA_VELA);
    });
  }

  async resultadoVela(id) {
    const e = await this.esperarVela(id);
    if (!e) return;
    this.actualizar(e.state);
    if (e.analysis) {
      const { analysis: a } = e;
      const lineas = [a.summary, ...a.observations.slice(0, 2).map((o) => o.text)];
      if (a.strengths[0]) lineas.push(`Algo que aparece a tu favor: ${a.strengths[0]}.`);
      if (a.opportunities[0]) lineas.push(`Si te interesa, podrías explorar: ${a.opportunities[0]}. Tú decides.`);
      await dialogo.decir(lineas.map(DIALOGO_VELA));
      dialogo.cerrar();
    } else {
      aviso('Vela no está disponible ahora. Tus decisiones quedaron guardadas.');
    }
    if (e.missions.length) await this.propuestas(e.missions);
  }

  ventanaRecompensas(title, r) {
    return new Promise((fin) => {
      celebrar();
      mostrar(ventana('chica', h('h2', {}, 'Historia vivida'), h('p', {}, `«${title}»`),
        ...r.rewards.map((x) => h('p', {}, `★ ${x.label}: +${x.xp} XP`)),
        r.new_badges.map((b) => h('p', {}, `Insignia nueva: ${b.name}`)),
        h('div', { class: 'fila fin' }, boton('Continuar', () => { ocultar(); fin(); }, 'principal'))));
    });
  }

  propuestas(misiones) {
    return new Promise((fin) => {
      const pintar = async () => {
        const { missions, ai } = await api.get('/missions');
        const ids = new Set(misiones.map((m) => m.id));
        const actuales = missions.filter((m) => ids.has(m.id) && m.status === 'propuesta');
        if (!actuales.length) { ocultar(); fin(); return; }
        mostrar(ventana('ancha', h('h2', {}, 'Nuevas misiones para tu vida real'), this.menu.motor(ai),
          actuales.map((m) => this.menu.tarjetaMision(m, pintar)),
          h('div', { class: 'fila fin' }, boton('Decidir después', () => { ocultar(); fin(); }))));
      };
      pintar();
    });
  }
}

export const juego = new Juego();
juego.arrancar().catch((err) => { console.error(err); aviso(err.message); });
window.levelife = juego; // ayuda a las pruebas de extremo a extremo
