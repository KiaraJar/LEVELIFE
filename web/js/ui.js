// Utilidades de interfaz. El texto siempre entra como nodo de texto, nunca como HTML.
import { sonido } from './audio.js';

export function h(etiqueta, attrs = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const hijo of hijos.flat()) if (hijo !== null && hijo !== undefined && hijo !== false) el.append(hijo);
  return el;
}

export function boton(texto, accion, clase = '') {
  return h('button', {
    class: `btn ${clase}`, type: 'button',
    onclick: async (e) => {
      sonido.iniciar();
      sonido.efecto('elegir');
      const b = e.currentTarget;
      b.disabled = true;
      try { await accion(e); } catch (err) { aviso(err.message); console.error(err); } finally { b.disabled = false; }
    },
  }, texto);
}

const capa = () => document.getElementById('capa');

export function mostrar(contenido, { oscuro = true, lateral = false } = {}) {
  const c = capa();
  c.replaceChildren(contenido);
  c.className = lateral ? 'lateral' : (oscuro ? 'oscuro' : '');
  c.hidden = false;
  contenido.querySelector?.('input, textarea, button')?.focus({ preventScroll: true });
}

export function ocultar() {
  const c = capa();
  c.hidden = true;
  c.replaceChildren();
}

export const capaAbierta = () => !capa().hidden;

export function ventana(clase, ...hijos) {
  return h('section', { class: `marco ventana ${clase}` }, ...hijos);
}

const cola = [];
let mostrando = false;

function siguienteAviso() {
  const a = document.getElementById('aviso');
  if (!cola.length) { mostrando = false; a.hidden = true; return; }
  mostrando = true;
  a.textContent = cola.shift();
  a.hidden = false;
  setTimeout(siguienteAviso, 2400);
}

export function aviso(texto) {
  if (cola.includes(texto)) return;
  cola.push(texto);
  if (!mostrando) siguienteAviso();
}

export function celebrar() {
  sonido.efecto('logro');
  const caja = h('div', { class: 'brillos' });
  for (let i = 0; i < 26; i++) {
    const p = h('i');
    p.style.left = '50%'; p.style.top = '45%';
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 520}px`);
    p.style.setProperty('--dy', `${(Math.random() - 0.5) * 420}px`);
    p.style.background = ['#f3b63f', '#d9573f', '#3f9b5f', '#3f8fc9'][i % 4];
    caja.append(p);
  }
  document.body.append(caja);
  setTimeout(() => caja.remove(), 1100);
}

export async function fundido(accion) {
  const f = document.getElementById('fundido');
  f.classList.add('activo');
  await new Promise((r) => setTimeout(r, 240));
  await accion();
  f.classList.remove('activo');
  await new Promise((r) => setTimeout(r, 240));
}
