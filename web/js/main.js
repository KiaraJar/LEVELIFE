// Ciclo principal: conecta cuenta, mundo, historias, análisis y misiones.
import { ApiError, api } from './api.js';
import { TILE, icono, retrato } from './art.js';
import { sonido } from './audio.js';
import { dialogo } from './dialogo.js';
import { Mundo } from './engine.js';
import { MAPAS, PUNTO_INICIAL } from './maps.js';
import { Menu } from './menu.js';
import * as P from './pantallas.js';
import { aviso, boton, capaAbierta, celebrar, fundido, h, mostrar, ocultar, ventana } from './ui.js';
import { velaReport } from './vela_report.js';

const $ = (id) => document.getElementById(id);
const TECLAS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const DIALOGO_VELA = (text) => ({ speaker: 'vela', text });

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
    this.mundo.marcaDe = (n) => this.semana?.current?.npc === n.id;
    this.mundo.bloqueado = (px, py) => this.parqueCerrado(px, py);
    document.querySelectorAll('[data-icono]').forEach((el) => el.append(icono(el.dataset.icono)));
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
    $('hud-misiones').addEventListener('click', () => { if (!this.ocupado) this.menu.semana(); });
    $('hud-vela').addEventListener('click', () => { if (!this.ocupado) this.menu.asistente(); });
    $('hud-mapa').addEventListener('click', () => { if (!this.ocupado) { this.pausar(); this.menu.mapa(); } });
  }

  cerrarCapa() { if (!this.ocupado) this.menu.cerrar(); }

  pausar() { this.mundo.pausa = true; this.mundo.teclas.clear(); }

  reanudar() { this.ocupado = false; this.mundo.pausa = false; }

  // --------------------------------------------------------------- Estado
  actualizar(estado) {
    this.estado = estado;
    if (!estado.user) return;
    $('hud-nombre').textContent = `${estado.hud.student} | ${estado.hud.semester}`;
    $('hud-ciclo').textContent = estado.hud.cycle;
    this.pintarRecursos(estado.resources);
    this.pintarSemana();
    dialogo.avatar = estado.user.avatar;
    if (estado.user.avatar) retrato($('hud-cara'), estado.user.avatar);
  }

  pintarRecursos(r) {
    if (this.estado) this.estado.resources = r;
    const barra = (id, valor, color) => {
      $(id).style.width = `${valor}%`;
      $(id).style.backgroundColor = color;
      $(`${id}-valor`).textContent = `${valor}%`;
    };
    // Energía: de amarillo a verde. Carga mental: de cian a rojo.
    barra('hud-energia', r.energy, r.energy > 60 ? '#3fbf6a' : (r.energy > 30 ? '#a8c93f' : '#f3b63f'));
    barra('hud-tension', r.tension, r.tension > 70 ? '#d9573f' : (r.tension > 40 ? '#f3a93f' : '#4fc3d9'));
  }

  recompensa(r) {
    if (r.level_up) { celebrar(); aviso(`¡Subiste al nivel ${r.level.level}: ${r.level.title}!`); }
    for (const b of r.new_badges ?? []) aviso(`Insignia: ${b.name}`);
  }

  // --------------------------------------------------------------- Inicio
  async arrancar() {
    this.mundo.cargar('campus', 29, 10);
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
    $('objetivo').hidden = false;
    if ($('tactil').dataset.disponible) $('tactil').hidden = false;
    if (!this.estado.user.intro_done) await this.introduccion();
    else {
      const p = this.estado.user.position;
      this.mundo.cargar(p.map ?? PUNTO_INICIAL.map, p.x ?? PUNTO_INICIAL.x, p.y ?? PUNTO_INICIAL.y);
    }
    await this.cargarSemana();
    ocultar();
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
      { speaker: 'nar', text: 'Semana 8. El campus huele a café y a apuntes de último minuto.' },
      DIALOGO_VELA('Es semana de parciales en la FISI, y todo parece caer al mismo tiempo.'),
      DIALOGO_VELA(this.estado.ai.available
        ? 'Soy Vela, una agente de inteligencia artificial. Convierto tus pendientes reales en una semana que puedes ensayar antes de vivirla.'
        : 'Soy Vela, una agente de inteligencia artificial, pero ahora no estoy conectada. Puedes jugar igual y recibirás misiones generales.'),
      DIALOGO_VELA('Vamos con lo básico.'),
    ]);
    dialogo.cerrar();
    const resultado = await P.tutorial();
    const r = await api.post('/flags', { intro: true, tutorial: resultado });
    this.actualizar(r.state);
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
    aviso(`${this.estado.zones[zona].name}: tu Semana 8 no pasa por aquí.`);
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
    $('hud-zona').textContent = this.mundo.nombreMapa === 'campus' && zona !== 'parque' ? 'Campus FISI' : nombre;
    if (!zona || this.estado.user.visited.includes(zona)) return;
    api.post('/visit', { zone: zona }).then((r) => {
      this.actualizar(r.state);
      if (r.xp) aviso(`Zona descubierta: ${nombre}`);
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
      if (this.semana?.current?.npc === npc.id) return this.jugarDia();
      return this.conversar(npc.decir.lineas.map((text) => ({ speaker: npc.id, text })), { [npc.id]: npc.nombre });
    }
    const m = this.mundo.mapa;
    const textos = {
      letrero: m.letreros?.[`${o.x},${o.y}`], banca: m.bancas, estante: m.estantes, barra: m.barra, pizarra: m.pizarra, cama: m.camas,
      fuente: 'El agua cae sin apuro. Alguien dejó una moneda y un deseo.',
      tablon: m.tablon,
      tablero: 'Avisos: tutorías, grupos de estudio y un recordatorio: «Calendario de parciales, semana 8».',
      kiosco: m.kiosco, lectura: m.lectura, pc: m.pc,
    };
    const texto = textos[o.tile];
    if (texto) this.conversar([{ speaker: 'nar', text: texto }]);
    if (['banca', 'cama'].includes(o.tile)) this.descansar();
    return undefined;
  }

  async descansar() {
    const r = await api.post('/rest');
    this.pintarRecursos(r.resources);
    aviso(r.rested ? 'Descansaste: recuperas energía y bajas tu carga mental.' : 'Ya descansaste hace poco.');
  }

  // -------------------------------------------------------------- Semana 8
  nombreDe(id) {
    for (const mapa of Object.values(MAPAS)) {
      const n = mapa.npcs.find((x) => x.id === id);
      if (n) return n.nombre;
    }
    return id;
  }

  pintarSemana() {
    const w = this.semana;
    if (!w) return;
    const quedan = w.total - w.day;
    $('hud-cuenta').textContent = w.finished ? 'Reporte listo' : `${quedan} ${quedan === 1 ? 'Dilema' : 'Dilemas'}`;
    const hoy = w.current;
    $('hud-objetivo').textContent = hoy
      ? `Busca a ${this.nombreDe(hoy.npc)}: ${this.estado.zones[hoy.zone].name}`
      : 'Revisa tu Vela Report en Agenda';
  }

  async cargarSemana() {
    const r = await api.get('/week');
    this.semana = r.week;
    this.areas = r.areas;
    if (!this.semana) await this.crearSemana();
    this.pintarSemana();
  }

  esperando(titulo, texto) {
    mostrar(ventana('chica', h('h2', {}, titulo), h('p', {}, texto)));
  }

  async crearSemana() {
    const area = await P.selectorArea(this.areas);
    for (;;) {
      const tasks = await P.formularioSemana(this.estado.ai);
      this.esperando('Vela está creando tus casos', 'Está convirtiendo cada pendiente en situaciones con decisiones y consecuencias. Puede tardar un momento.');
      try {
        const r = await api.post('/week', { tasks, area });
        ocultar();
        if (r.support) { await this.ventanaApoyo(r.support); continue; }
        this.semana = r.week;
        this.pintarRecursos(r.resources);
        this.actualizar(await api.get('/state'));
        if (r.week.source === 'plantilla') aviso('Casos base: Vela no participó en esta semana.');
        return;
      } catch (err) { aviso(err.message); }
    }
  }

  async jugarDia() {
    const hoy = this.semana.current;
    this.ocupado = true;
    this.pausar();
    try {
      const nombres = { [hoy.npc]: this.nombreDe(hoy.npc) };
      await dialogo.decir([{ speaker: hoy.npc, text: hoy.scene }], nombres);
      const option = await dialogo.elegir(hoy.options);
      const r = await api.post('/week/choose', { option });
      this.semana = r.week;
      this.pintarRecursos(r.resources);
      this.pintarSemana();
      // El comentario se pide de inmediato: así suele estar listo al terminar de leer.
      const comentario = api.post('/week/comment').catch(() => ({ comment: null }));
      await dialogo.decir([{ speaker: 'nar', text: r.result }, DIALOGO_VELA(`${r.verdict.label}. ${r.verdict.text}`)]);
      const { comment } = await comentario;
      if (comment) await dialogo.decir([DIALOGO_VELA(comment)]);
      dialogo.cerrar();
      if (r.week.finished) await this.cerrarSemana();
    } catch (err) {
      dialogo.cerrar();
      aviso(err.message);
      console.error(err);
    }
    this.reanudar();
  }

  async cerrarSemana() {
    this.esperando('Vela está preparando tu reporte', 'Está calculando tus dimensiones y patrones, y preparando una misión para cada actividad.');
    const { plan } = await api.post('/week/plan');
    this.semana.plan = plan;
    ocultar();
    celebrar();
    await this.mostrarPlan(plan);
  }

  ventanaApoyo(texto) {
    return new Promise((fin) => {
      mostrar(ventana('chica', h('h2', {}, 'Antes de seguir'), h('p', {}, texto), h('div', { class: 'fila fin' }, boton('Entendido', () => { ocultar(); fin(); }, 'principal'))));
    });
  }

  mostrarPlan(plan) {
    return velaReport(plan, this);
  }
}

export const juego = new Juego();
juego.arrancar().catch((err) => { console.error(err); aviso(err.message); });
window.levelife = juego; // ayuda a las pruebas de extremo a extremo
