// Motor del mundo: render por tiles, movimiento, colisiones, cámara y NPC.
import { ANCHO, ANIMADOS, NPCS, SOLIDOS, TILE, dibujarPersonaje, hojaPersonaje, lienzo, pintarFuente, pintarTile } from './art.js';
import { MAPAS, PUNTO_INICIAL } from './maps.js';

const VEL = 1.25; // píxeles lógicos por fotograma
const DIRS = { down: [0, 1, 0], left: [-1, 0, 1], right: [1, 0, 2], up: [0, -1, 3] };
const VECTOR = [[0, 1], [-1, 0], [1, 0], [0, -1]];

export class Mundo {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.mapa = null;
    this.capa = null;
    this.jugador = { x: 0, y: 0, dir: 0, paso: 0, anda: false, hoja: null };
    this.npcs = [];
    this.teclas = new Set();
    this.pausa = true;
    this.tiempo = 0;
    this.camara = { x: 0, y: 0 };
    this.escala = 3;
    this.ajustar();
    addEventListener('resize', () => this.ajustar());
    this.alEntrarSalida = null;
    this.alCambiarZona = null;
    this.alMoverse = null;
    this.zonaActual = null;
  }

  ajustar() {
    const w = innerWidth, h = innerHeight;
    this.escala = Math.max(2, Math.floor(Math.min(w / 300, h / 200)));
    this.canvas.width = Math.ceil(w / this.escala);
    this.canvas.height = Math.ceil(h / this.escala);
    this.g.imageSmoothingEnabled = false;
  }

  apariencia(avatar) { this.jugador.hoja = hojaPersonaje(avatar); }

  cargar(nombre, tx, ty, dir = 0) {
    const m = MAPAS[nombre] ?? MAPAS[PUNTO_INICIAL.map];
    this.nombreMapa = MAPAS[nombre] ? nombre : PUNTO_INICIAL.map;
    this.mapa = m;
    this.alto = m.tiles.length;
    this.ancho = m.tiles[0].length;
    this.capa = lienzo(this.ancho * TILE, this.alto * TILE);
    const g = this.capa.getContext('2d');
    this.animados = [];
    for (let j = 0; j < this.alto; j++) for (let i = 0; i < this.ancho; i++) {
      const t = m.tiles[j][i];
      pintarTile(g, t, i * TILE, j * TILE, i * 31 + j * 17);
      if (ANIMADOS.has(t)) this.animados.push([t, i, j]);
    }
    Object.assign(this.jugador, { x: tx * TILE, y: ty * TILE, dir, anda: false });
    this.npcs = m.npcs.map((n) => ({ ...n, px: n.x * TILE, py: n.y * TILE, hoja: hojaPersonaje(NPCS[n.id]), paso: 0, espera: 60 + Math.random() * 120, meta: null, ox: n.x * TILE, oy: n.y * TILE }));
    this.centrar();
    this.zonaActual = undefined;
    this.revisarZona();
  }

  celda() { return [Math.round(this.jugador.x / TILE), Math.round(this.jugador.y / TILE)]; }

  libre(px, py, ignorar = null) {
    // Caja de colisión a los pies del personaje.
    const puntos = [[px + 3, py + 8], [px + 12, py + 8], [px + 3, py + 15], [px + 12, py + 15]];
    for (const [x, y] of puntos) {
      const i = Math.floor(x / TILE), j = Math.floor(y / TILE);
      const t = this.mapa.tiles[j]?.[i];
      if (t === undefined || SOLIDOS.has(t)) return false;
    }
    if (ignorar === this.jugador && this.bloqueado?.(px, py)) return false;
    const yo = this.jugador;
    if (ignorar !== yo && Math.abs(yo.x - px) < 12 && Math.abs(yo.y - py) < 12) return false;
    return !this.npcs.some((n) => n !== ignorar && Math.abs(n.px - px) < 12 && Math.abs(n.py - py) < 12);
  }

  mover() {
    const yo = this.jugador;
    const orden = [...this.teclas];
    const dir = orden.length ? DIRS[orden[orden.length - 1]] : null;
    yo.anda = false;
    if (!dir) return;
    yo.dir = dir[2];
    yo.anda = true;
    const nx = yo.x + dir[0] * VEL, ny = yo.y + dir[1] * VEL;
    if (this.libre(nx, ny, yo)) { yo.x = nx; yo.y = ny; } else {
      // Desliza en las esquinas para que no se atasque en los bordes.
      if (dir[0] && this.libre(nx, Math.round(yo.y / TILE) * TILE, yo)) yo.y += Math.sign(Math.round(yo.y / TILE) * TILE - yo.y) * VEL;
      if (dir[1] && this.libre(Math.round(yo.x / TILE) * TILE, ny, yo)) yo.x += Math.sign(Math.round(yo.x / TILE) * TILE - yo.x) * VEL;
    }
    this.alMoverse?.();
    this.revisarSalida();
    this.revisarZona();
  }

  revisarSalida() {
    const [i, j] = this.celda();
    const salida = this.mapa.salidas.find((s) => s.x === i && s.y === j);
    if (salida && this.alEntrarSalida) this.alEntrarSalida(salida);
  }

  revisarZona() {
    const [i, j] = this.celda();
    const zona = this.mapa.zona ?? this.mapa.zonaEn?.(i, j) ?? null;
    if (zona !== this.zonaActual) { this.zonaActual = zona; this.alCambiarZona?.(zona); }
  }

  moverNpcs() {
    for (const n of this.npcs) {
      if (n.ruta !== 'pasea') continue;
      if (n.espera > 0) { n.espera -= 1; n.anda = false; continue; }
      if (!n.meta) {
        n.dir = Math.floor(Math.random() * 4);
        const [dx, dy] = VECTOR[n.dir];
        const tx = n.px + dx * TILE, ty = n.py + dy * TILE;
        const lejos = Math.abs(tx - n.ox) > TILE * 3 || Math.abs(ty - n.oy) > TILE * 3;
        if (lejos || !this.libre(tx, ty, n)) { n.espera = 40; continue; }
        n.meta = [tx, ty];
      }
      const [tx, ty] = n.meta;
      n.px += Math.sign(tx - n.px) * 0.5;
      n.py += Math.sign(ty - n.py) * 0.5;
      n.anda = true;
      if (n.px === tx && n.py === ty) { n.meta = null; n.espera = 60 + Math.random() * 180; }
    }
  }

  frente() {
    const yo = this.jugador;
    const [dx, dy] = VECTOR[yo.dir];
    return [Math.round((yo.x + dx * 10) / TILE), Math.round((yo.y + dy * 10) / TILE)];
  }

  objetivo() {
    const yo = this.jugador;
    const [fx, fy] = this.frente();
    const npc = this.npcs.find((n) => Math.abs(n.px - fx * TILE) < 11 && Math.abs(n.py - fy * TILE) < 11)
      ?? this.npcs.find((n) => Math.abs(n.px - yo.x) + Math.abs(n.py - yo.y) < 22);
    if (npc) return { tipo: 'npc', npc };
    return { tipo: 'tile', tile: this.mapa.tiles[fy]?.[fx], x: fx, y: fy };
  }

  mirarA(npc) {
    const dx = this.jugador.x - npc.px, dy = this.jugador.y - npc.py;
    npc.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
  }

  centrar() {
    const yo = this.jugador;
    const vw = this.canvas.width, vh = this.canvas.height;
    const mw = this.ancho * TILE, mh = this.alto * TILE;
    const cx = yo.x + ANCHO / 2 - vw / 2, cy = yo.y + 12 - vh / 2;
    this.camara.x = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, cx));
    this.camara.y = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, cy));
  }

  dibujar() {
    const { g, camara } = this;
    if (!this.capa) return;
    const cx = Math.round(camara.x), cy = Math.round(camara.y);
    g.fillStyle = '#22213a';
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.tiempo % 24 === 0) {
      const f = Math.floor(this.tiempo / 24) % 4, lg = this.capa.getContext('2d');
      for (const [t, i, j] of this.animados) pintarTile(lg, t, i * TILE, j * TILE, i * 31 + j * 17, f);
    }
    g.drawImage(this.capa, -cx, -cy);
    if (this.mapa.fuente) pintarFuente(g, this.mapa.fuente.x * TILE - cx, this.mapa.fuente.y * TILE - cy, Math.floor(this.tiempo / 14) % 4);
    const yo = this.jugador;
    const entes = [
      ...this.npcs.map((n) => ({ y: n.py, hoja: n.hoja, dir: n.dir, paso: n.anda ? 1 + (Math.floor(this.tiempo / 12) % 2) : 0, x: n.px })),
      { y: yo.y, hoja: yo.hoja, dir: yo.dir, paso: yo.anda ? 1 + (Math.floor(this.tiempo / 8) % 2) : 0, x: yo.x },
    ].sort((a, b) => a.y - b.y);
    for (const e of entes) if (e.hoja) dibujarPersonaje(g, e.hoja, e.dir, e.paso, Math.round(e.x) - cx, Math.round(e.y) - cy - 8);
    this.dibujarMarcas(cx, cy);
  }

  // Marca sobre los NPC que tienen una historia disponible.
  dibujarMarcas(cx, cy) {
    const { g } = this;
    const sube = Math.floor(this.tiempo / 20) % 2;
    for (const n of this.npcs) {
      if (!n.historia || !this.marcaDe?.(n.historia)) continue;
      const x = Math.round(n.px) - cx + 7, y = Math.round(n.py) - cy - 18 - sube;
      g.fillStyle = '#22213a'; g.fillRect(x - 1, y - 1, 4, 9);
      g.fillStyle = '#f3b63f'; g.fillRect(x, y, 2, 4); g.fillRect(x, y + 5, 2, 2);
    }
  }

  ciclo() {
    this.tiempo += 1;
    if (!this.pausa) { this.mover(); this.moverNpcs(); this.centrar(); }
    if (this.paneo) {
      this.moverNpcs();
      this.camara.x = 300 + Math.sin(this.tiempo / 900) * 240;
      this.camara.y = 230 + Math.cos(this.tiempo / 1300) * 90;
    }
    this.dibujar();
    requestAnimationFrame(() => this.ciclo());
  }
}
