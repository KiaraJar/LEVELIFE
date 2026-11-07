// Caja de diálogo: texto letra por letra, retratos y alternativas.
import { sonido } from './audio.js';
import { NPCS, retrato, retratoVela } from './art.js';

const $ = (id) => document.getElementById(id);
const VELOCIDAD = 22;

class Dialogo {
  constructor() {
    this.caja = $('dialogo');
    this.lienzo = $('dialogo-retrato').querySelector('canvas');
    this.avanzar = null;
    this.teclaOpcion = null;
    this.avatar = null;
    this.caja.addEventListener('pointerup', (e) => { if (!e.target.closest('button')) this.accion(); });
  }

  get abierto() { return !this.caja.hidden; }

  abrir() { this.caja.hidden = false; document.body.classList.add('dialogando'); }

  cerrar() {
    this.caja.hidden = true;
    document.body.classList.remove('dialogando');
    $('dialogo-opciones').replaceChildren();
  }

  accion() { this.avanzar?.(); }

  tecla(codigo) { return this.teclaOpcion?.(codigo) ?? false; }

  pintarOrador(orador, nombres) {
    const retratoCaja = $('dialogo-retrato');
    if (orador === 'nar') { retratoCaja.hidden = true; $('dialogo-nombre').textContent = ''; return; }
    retratoCaja.hidden = false;
    if (orador === 'vela') { retratoVela(this.lienzo); $('dialogo-nombre').textContent = 'Vela'; return; }
    retrato(this.lienzo, orador === 'yo' ? this.avatar : NPCS[orador]);
    $('dialogo-nombre').textContent = orador === 'yo' ? 'Tú' : (nombres?.[orador] ?? orador);
  }

  // Muestra una línea; el primer toque completa el texto y el segundo continúa.
  linea(texto) {
    const parrafo = $('dialogo-texto');
    const sigue = $('dialogo-sigue');
    sigue.hidden = true;
    return new Promise((fin) => {
      let i = 0;
      let reloj;
      const completar = () => {
        clearInterval(reloj);
        parrafo.textContent = texto;
        sigue.hidden = false;
        this.avanzar = () => { this.avanzar = null; fin(); };
      };
      this.avanzar = completar;
      parrafo.textContent = '';
      reloj = setInterval(() => {
        i += 1;
        parrafo.textContent = texto.slice(0, i);
        if (i % 3 === 0) sonido.efecto('letra');
        if (i >= texto.length) completar();
      }, VELOCIDAD);
    });
  }

  async decir(lineas, nombres) {
    this.abrir();
    for (const { speaker, text } of lineas) {
      this.pintarOrador(speaker, nombres);
      await this.linea(text);
    }
  }

  elegir(opciones) {
    const caja = $('dialogo-opciones');
    $('dialogo-sigue').hidden = true;
    $('dialogo-nombre').textContent = '';
    $('dialogo-texto').textContent = '¿Qué harías?';
    $('dialogo-retrato').hidden = false;
    retrato(this.lienzo, this.avatar);
    return new Promise((fin) => {
      let actual = 0;
      const elegir = (op) => {
        sonido.efecto('elegir');
        this.teclaOpcion = null;
        caja.replaceChildren();
        fin(op.id);
      };
      const botones = opciones.map((op, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = op.text;
        b.addEventListener('click', () => elegir(op));
        b.addEventListener('pointerenter', () => marcar(i));
        return b;
      });
      const marcar = (i) => {
        actual = (i + botones.length) % botones.length;
        botones.forEach((b, n) => b.classList.toggle('sel', n === actual));
        botones[actual].focus({ preventScroll: true });
      };
      caja.replaceChildren(...botones);
      marcar(0);
      this.teclaOpcion = (codigo) => {
        if (['ArrowUp', 'KeyW'].includes(codigo)) { marcar(actual - 1); return true; }
        if (['ArrowDown', 'KeyS'].includes(codigo)) { marcar(actual + 1); return true; }
        if (['Enter', 'Space', 'KeyE'].includes(codigo)) { elegir(opciones[actual]); return true; }
        const n = Number(codigo.replace('Digit', '')) - 1;
        if (opciones[n]) { elegir(opciones[n]); return true; }
        return false;
      };
    });
  }
}

export const dialogo = new Dialogo();
