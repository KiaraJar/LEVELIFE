// Todo el arte es original y se dibuja por código: tiles, personajes, retratos, logo e iconos.
export const TILE = 16;
export const ANCHO = 16;
export const ALTO = 24;

export const OPCIONES = {
  body: ['Silueta 1', 'Silueta 2', 'Silueta 3'],
  skin: ['#f7d9bd', '#eec39a', '#d9a066', '#b97a4b', '#8a5634', '#5e3a24'],
  hairStyle: ['Corto', 'Melena', 'Rizos', 'Rapado', 'Coleta', 'Largo', 'Moño', 'Puntas'],
  hairColor: ['#2b2233', '#5a3a26', '#8d5a2b', '#d6a648', '#b6452c', '#7b8294', '#3f6fb5', '#c75c9b'],
  face: ['Sereno', 'Sonrisa', 'Curioso', 'Con pecas'],
  top: ['Camiseta', 'Sudadera', 'Camisa', 'Vestido corto', 'Chaqueta', 'Buzo'],
  topColor: ['#d9573f', '#3f8fc9', '#3f9b5f', '#f3b63f', '#7a5cc9', '#e7e2d4', '#2f3350', '#e083a8'],
  bottom: ['Pantalón', 'Corto', 'Falda', 'Falda larga'],
  bottomColor: ['#2f3f6b', '#3b3560', '#6b4a30', '#7a7690', '#2c7247', '#a33a4a'],
  shoes: ['Zapatillas', 'Botas', 'Sandalias'],
  shoesColor: ['#f5f1e6', '#2b2233', '#b6452c', '#3f8fc9', '#6b4a30'],
  accessory: ['Ninguno', 'Gafas', 'Gorra', 'Mochila', 'Bufanda', 'Audífonos', 'Corona de hojas', 'Capa viajera', 'Gorro de cronista', 'Insignia estelar'],
};
export const NOMBRES = { body: 'Apariencia', skin: 'Piel', hairStyle: 'Peinado', hairColor: 'Color de cabello', face: 'Rostro', top: 'Ropa superior', topColor: 'Color de ropa', bottom: 'Prenda inferior', bottomColor: 'Color de prenda', shoes: 'Calzado', shoesColor: 'Color de calzado', accessory: 'Accesorio' };
export const EDICION_LIBRE = { accessory: 6, top: 4 };

export function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return c;
}

function azar(semilla) {
  let s = semilla * 9301 + 49297;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function r(g, color, x, y, w = 1, h = 1) { g.fillStyle = color; g.fillRect(x, y, w, h); }

function oscurecer(hex, f = 0.75) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// ---------------------------------------------------------------- Tiles
const pintores = {
  pasto(g, x, y, s) {
    const a = azar(s); r(g, '#67b866', x, y, TILE, TILE);
    for (let i = 0; i < 7; i++) r(g, a() > 0.5 ? '#5aa95b' : '#79c672', x + Math.floor(a() * 15), y + Math.floor(a() * 15), 1, 2);
  },
  flor(g, x, y, s) {
    pintores.pasto(g, x, y, s); const a = azar(s + 3);
    for (let i = 0; i < 3; i++) { const px = x + 2 + Math.floor(a() * 11), py = y + 2 + Math.floor(a() * 11); r(g, ['#fff4c7', '#ef8fb1', '#f7d04a'][i], px, py, 2, 2); r(g, '#d9573f', px, py, 1, 1); }
  },
  camino(g, x, y, s) {
    const a = azar(s); r(g, '#e2cc9a', x, y, TILE, TILE);
    for (let i = 0; i < 6; i++) r(g, a() > 0.5 ? '#d3bb85' : '#ecd9ae', x + Math.floor(a() * 14), y + Math.floor(a() * 14), 2, 1);
  },
  plaza(g, x, y, s) {
    r(g, '#cfc7bd', x, y, TILE, TILE); r(g, '#b9b0a6', x + 15, y, 1, TILE); r(g, '#b9b0a6', x, y + 15, TILE, 1);
    if (s % 2) r(g, '#c5bcb1', x + 1, y + 1, 14, 14); r(g, '#dcd5cc', x + 1, y + 1, 6, 1);
  },
  arbol(g, x, y, s) {
    pintores.pasto(g, x, y, s);
    r(g, '#6b4a30', x + 6, y + 11, 4, 5); r(g, '#2c7247', x + 1, y + 2, 14, 10); r(g, '#2c7247', x + 3, y, 10, 13);
    r(g, '#3f9b5f', x + 3, y + 2, 9, 7); r(g, '#58b672', x + 4, y + 3, 4, 3);
  },
  seto(g, x, y, s) {
    pintores.pasto(g, x, y, s); r(g, '#2f7d4b', x, y + 3, TILE, 12); r(g, '#3f9b5f', x, y + 3, TILE, 7); r(g, '#58b672', x + 3, y + 5, 3, 2); r(g, '#58b672', x + 10, y + 4, 3, 2);
  },
  agua(g, x, y, s, f = 0) {
    r(g, '#4fa3c9', x, y, TILE, TILE); const a = azar(s);
    const dx = (Math.floor(a() * 10) + f * 3) % 12; r(g, '#8cd0e6', x + dx, y + 4 + (s % 3) * 3, 4, 1); r(g, '#3e8db3', x + (dx + 6) % 12, y + 11, 3, 1);
  },
  muroClaro(g, x, y) { r(g, '#e9d9b8', x, y, TILE, TILE); r(g, '#d3c098', x, y + 15, TILE, 1); r(g, '#d3c098', x + 7, y + 7, 1, 8); },
  muroLadrillo(g, x, y) {
    r(g, '#b4583f', x, y, TILE, TILE);
    for (let f = 0; f < 4; f++) { r(g, '#8f4230', x, y + f * 4 + 3, TILE, 1); r(g, '#8f4230', x + (f % 2 ? 3 : 11), y + f * 4, 1, 3); }
  },
  muroAzul(g, x, y) { r(g, '#7fa8c9', x, y, TILE, TILE); r(g, '#658cae', x, y + 12, TILE, 4); r(g, '#658cae', x + 7, y, 1, 12); },
  techoRojo(g, x, y) { r(g, '#c0503c', x, y, TILE, TILE); for (let i = 0; i < 4; i++) r(g, '#9e3d2d', x, y + i * 4 + 3, TILE, 1); r(g, '#d76a54', x + 2, y + 1, 5, 1); },
  techoAzul(g, x, y) { r(g, '#46628f', x, y, TILE, TILE); for (let i = 0; i < 4; i++) r(g, '#374e73', x, y + i * 4 + 3, TILE, 1); r(g, '#5c7fb4', x + 9, y + 5, 4, 1); },
  techoVerde(g, x, y) { r(g, '#3f8a6b', x, y, TILE, TILE); for (let i = 0; i < 4; i++) r(g, '#2f6c53', x, y + i * 4 + 3, TILE, 1); r(g, '#56aa88', x + 5, y + 9, 4, 1); },
  techoOcre(g, x, y) { r(g, '#c9963f', x, y, TILE, TILE); for (let i = 0; i < 4; i++) r(g, '#a67a2e', x, y + i * 4 + 3, TILE, 1); r(g, '#e0b45e', x + 3, y + 5, 5, 1); },
  ventana(g, x, y) { pintores.muroClaro(g, x, y); r(g, '#5d4a3a', x + 2, y + 3, 12, 10); r(g, '#a9dcec', x + 3, y + 4, 10, 8); r(g, '#5d4a3a', x + 7, y + 4, 2, 8); r(g, '#dff4fa', x + 4, y + 5, 2, 2); },
  puerta(g, x, y) { r(g, '#e9d9b8', x, y, TILE, TILE); r(g, '#5d3a26', x + 2, y + 1, 12, 15); r(g, '#7b5236', x + 3, y + 2, 10, 14); r(g, '#f3b63f', x + 11, y + 8, 2, 2); },
  cerrada(g, x, y) { pintores.puerta(g, x, y); r(g, '#3b3560', x + 2, y + 6, 12, 2); r(g, '#3b3560', x + 2, y + 10, 12, 2); r(g, '#f3b63f', x + 6, y + 7, 4, 4); },
  banca(g, x, y, s) { pintores.pasto(g, x, y, s); r(g, '#7b5236', x + 1, y + 6, 14, 3); r(g, '#94683f', x + 1, y + 10, 14, 3); r(g, '#4d3423', x + 2, y + 13, 2, 3); r(g, '#4d3423', x + 12, y + 13, 2, 3); },
  letrero(g, x, y, s) { pintores.pasto(g, x, y, s); r(g, '#5d3a26', x + 7, y + 8, 2, 8); r(g, '#94683f', x + 2, y + 2, 12, 8); r(g, '#7b5236', x + 2, y + 9, 12, 1); r(g, '#3b3560', x + 4, y + 4, 8, 1); r(g, '#3b3560', x + 4, y + 6, 6, 1); },
  fuente(g, x, y, s) { pintores.plaza(g, x, y, s); },
  farol(g, x, y, s) { pintores.pasto(g, x, y, s); r(g, '#2f3350', x + 7, y + 4, 2, 11); r(g, '#2f3350', x + 5, y + 14, 6, 2); r(g, '#2f3350', x + 5, y + 1, 6, 1); r(g, '#ffe39c', x + 5, y + 2, 6, 3); },
  arbusto(g, x, y, s) { pintores.pasto(g, x, y, s); r(g, '#2f7d4b', x + 2, y + 5, 12, 10); r(g, '#3f9b5f', x + 3, y + 5, 10, 6); r(g, '#ef8fb1', x + 5, y + 7, 2, 2); r(g, '#f7d04a', x + 10, y + 9, 2, 2); },
  rotulo(g, x, y) { pintores.muroClaro(g, x, y); r(g, '#3b3560', x, y + 3, TILE, 9); r(g, '#f3b63f', x + 2, y + 6, 12, 1); r(g, '#f3b63f', x + 4, y + 8, 8, 1); },
  piso(g, x, y, s) { r(g, '#c99a63', x, y, TILE, TILE); r(g, '#b58650', x, y + 7, TILE, 1); r(g, '#b58650', x, y + 15, TILE, 1); r(g, '#b58650', x + (s % 2 ? 4 : 11), y, 1, 7); r(g, '#b58650', x + (s % 2 ? 11 : 4), y + 8, 1, 7); },
  baldosa(g, x, y, s) { r(g, (s % 2) ? '#e7e2d4' : '#b9d6cf', x, y, TILE, TILE); },
  alfombra(g, x, y) { r(g, '#b0475a', x, y, TILE, TILE); r(g, '#c96377', x + 2, y + 2, 12, 12); r(g, '#b0475a', x + 4, y + 4, 8, 8); },
  pared(g, x, y) { r(g, '#e9d9b8', x, y, TILE, TILE); r(g, '#f4e7cc', x, y, TILE, 3); r(g, '#b99f75', x, y + 13, TILE, 3); },
  estante(g, x, y, s) {
    r(g, '#5d3a26', x, y, TILE, TILE); const a = azar(s);
    for (let f = 0; f < 2; f++) { r(g, '#3f2818', x + 1, y + 2 + f * 7, 14, 6); for (let i = 0; i < 6; i++) { const c = ['#d9573f', '#3f8fc9', '#3f9b5f', '#f3b63f', '#7a5cc9'][Math.floor(a() * 5)]; r(g, c, x + 2 + i * 2, y + 3 + f * 7, 2, 5); } }
  },
  mesa(g, x, y, s) { pintores.piso(g, x, y, s); r(g, '#94683f', x + 1, y + 3, 14, 9); r(g, '#b58650', x + 2, y + 4, 12, 3); r(g, '#5d3a26', x + 2, y + 12, 2, 3); r(g, '#5d3a26', x + 12, y + 12, 2, 3); },
  silla(g, x, y, s) { pintores.piso(g, x, y, s); r(g, '#3f8fc9', x + 4, y + 5, 8, 7); r(g, '#2f6c9c', x + 4, y + 10, 8, 2); },
  pizarra(g, x, y) { pintores.pared(g, x, y); r(g, '#94683f', x, y + 1, TILE, 12); r(g, '#2c6650', x, y + 2, TILE, 10); r(g, '#e7e2d4', x + 3, y + 5, 7, 1); r(g, '#e7e2d4', x + 5, y + 8, 6, 1); },
  barra(g, x, y) { r(g, '#7b5236', x, y, TILE, TILE); r(g, '#b58650', x, y, TILE, 5); r(g, '#5d3a26', x, y + 14, TILE, 2); },
  cama(g, x, y) { r(g, '#c99a63', x, y, TILE, TILE); r(g, '#5d3a26', x, y + 1, TILE, 14); r(g, '#f5f1e6', x + 1, y + 2, 14, 5); r(g, '#3f8fc9', x + 1, y + 7, 14, 7); },
  planta(g, x, y, s) { pintores.piso(g, x, y, s); r(g, '#a0553d', x + 5, y + 10, 6, 5); r(g, '#3f9b5f', x + 3, y + 2, 10, 9); r(g, '#58b672', x + 5, y + 3, 4, 3); },
  salida(g, x, y) { r(g, '#b0475a', x, y, TILE, TILE); r(g, '#f3b63f', x + 2, y + 12, 12, 2); r(g, '#f3b63f', x + 7, y + 6, 2, 6); },
  vacio(g, x, y) { r(g, '#22213a', x, y, TILE, TILE); },
};

export const SOLIDOS = new Set(['arbol', 'seto', 'agua', 'muroClaro', 'muroLadrillo', 'muroAzul', 'techoRojo', 'techoAzul', 'techoVerde', 'techoOcre', 'ventana', 'cerrada', 'banca', 'letrero', 'fuente', 'farol', 'arbusto', 'rotulo', 'pared', 'estante', 'mesa', 'pizarra', 'barra', 'cama', 'planta', 'vacio']);
export const ANIMADOS = new Set(['agua']);

// Fuente de la plaza: una sola pieza de 4x4 tiles, con el agua animada.
export function pintarFuente(g, x, y, f = 0) {
  const T = TILE * 4;
  r(g, '#8f8a96', x + 6, y + 10, T - 12, T - 14); r(g, '#8f8a96', x + 2, y + 16, T - 4, T - 26);
  r(g, '#b9b0a6', x + 6, y + 10, T - 12, 4); r(g, '#6f6a78', x + 6, y + T - 6, T - 12, 3);
  r(g, '#4fa3c9', x + 8, y + 16, T - 16, T - 24); r(g, '#4fa3c9', x + 5, y + 20, T - 10, T - 32);
  r(g, '#8cd0e6', x + 12 + f * 6, y + 22, 8, 1); r(g, '#8cd0e6', x + 34 - f * 5, y + 38, 8, 1); r(g, '#8cd0e6', x + 16 + f * 3, y + 46, 6, 1);
  r(g, '#b9b0a6', x + 26, y + 18, 12, 18); r(g, '#d3cdc4', x + 28, y + 18, 3, 16);
  r(g, '#dff4fa', x + 30, y + 4 + (f % 2), 4, 16); r(g, '#dff4fa', x + 24, y + 9 + (f % 2), 2, 11); r(g, '#dff4fa', x + 38, y + 9 + (f % 2), 2, 11);
  r(g, '#ffffff', x + 31, y + 2 + (f % 2), 2, 3);
}

export function pintarTile(g, nombre, x, y, semilla, fotograma = 0) {
  (pintores[nombre] ?? pintores.vacio)(g, x, y, semilla, fotograma);
}

// ----------------------------------------------------------- Personajes
// Cada personaje son capas sobre un cuerpo de 16x24. dir: 0 abajo, 1 izquierda, 2 derecha, 3 arriba.
function pintarCabello(g, a, dir, ox, oy) {
  const c = OPCIONES.hairColor[a.hairColor], o = oscurecer(c);
  const est = a.hairStyle;
  if (est === 3) { r(g, c, ox + 4, oy + 1, 8, 2); return; }
  r(g, c, ox + 3, oy, 10, 3);
  r(g, c, ox + 3, oy + 2, 2, 3); r(g, c, ox + 11, oy + 2, 2, 3);
  if (dir === 3) r(g, c, ox + 3, oy + 2, 10, 7);
  if (dir === 1) r(g, c, ox + 8, oy + 2, 5, 5);
  if (dir === 2) r(g, c, ox + 3, oy + 2, 5, 5);
  r(g, o, ox + 3, oy, 10, 1);
  if (est === 1) { r(g, c, ox + 2, oy + 3, 2, 7); r(g, c, ox + 12, oy + 3, 2, 7); }
  if (est === 2) { for (const [dx, dy] of [[2, 1], [13, 1], [1, 4], [14, 4], [2, 7], [13, 7], [6, -1], [10, -1]]) r(g, c, ox + dx, oy + dy, 2, 2); }
  if (est === 4) { r(g, c, ox + (dir === 1 ? 13 : 1), oy + 3, 2, 6); r(g, o, ox + (dir === 1 ? 13 : 1), oy + 3, 2, 1); }
  if (est === 5) { r(g, c, ox + 2, oy + 3, 2, 10); r(g, c, ox + 12, oy + 3, 2, 10); if (dir === 3) r(g, c, ox + 3, oy + 8, 10, 5); }
  if (est === 6) { r(g, c, ox + 6, oy - 3, 4, 3); r(g, o, ox + 6, oy - 1, 4, 1); }
  if (est === 7) { for (let i = 0; i < 4; i++) r(g, c, ox + 4 + i * 3, oy - 2, 2, 2); }
}

function pintarRostro(g, a, dir, ox, oy) {
  if (dir === 3) return;
  const ojo = '#22213a';
  const cara = a.face ?? 0;
  if (dir === 0) {
    r(g, ojo, ox + 5, oy + 5, 2, 2); r(g, ojo, ox + 9, oy + 5, 2, 2);
    if (cara === 1) r(g, '#a33a4a', ox + 6, oy + 8, 4, 1);
    if (cara === 2) r(g, '#a33a4a', ox + 7, oy + 8, 2, 1);
    if (cara === 3) { r(g, '#c47a52', ox + 4, oy + 7, 1, 1); r(g, '#c47a52', ox + 11, oy + 7, 1, 1); }
  } else {
    const x = dir === 1 ? ox + 4 : ox + 10;
    r(g, ojo, x, oy + 5, 2, 2);
    if (cara === 1) r(g, '#a33a4a', dir === 1 ? ox + 4 : ox + 9, oy + 8, 3, 1);
  }
}

function pintarAccesorioAtras(g, a, dir, ox, oy) {
  if (a.accessory === 7) r(g, '#7a5cc9', ox + 2, oy + 10, 12, 11);
  if (a.accessory === 3 && dir === 3) { r(g, '#6b4a30', ox + 4, oy + 11, 8, 7); r(g, '#94683f', ox + 5, oy + 12, 6, 2); }
}

function pintarAccesorioFrente(g, a, dir, ox, oy) {
  const ac = a.accessory;
  if (ac === 1 && dir !== 3) { r(g, '#22213a', ox + 4, oy + 5, 8, 1); r(g, '#dff4fa', ox + 5, oy + 5, 2, 2); r(g, '#dff4fa', ox + 9, oy + 5, 2, 2); }
  if (ac === 2) { r(g, '#3f8fc9', ox + 3, oy, 10, 3); if (dir === 0) r(g, '#2f6c9c', ox + 3, oy + 3, 10, 1); if (dir === 1) r(g, '#2f6c9c', ox + 1, oy + 2, 4, 1); if (dir === 2) r(g, '#2f6c9c', ox + 11, oy + 2, 4, 1); }
  if (ac === 3 && dir !== 3) { r(g, '#6b4a30', ox + 4, oy + 10, 1, 6); r(g, '#6b4a30', ox + 11, oy + 10, 1, 6); }
  if (ac === 4) r(g, '#d9573f', ox + 3, oy + 9, 10, 2);
  if (ac === 5) { r(g, '#2f3350', ox + 3, oy - 1, 10, 1); r(g, '#d9573f', ox + 2, oy + 4, 2, 3); r(g, '#d9573f', ox + 12, oy + 4, 2, 3); }
  if (ac === 6) { r(g, '#58b672', ox + 3, oy, 10, 1); for (let i = 0; i < 4; i++) r(g, '#3f9b5f', ox + 3 + i * 3, oy - 1, 2, 1); }
  if (ac === 8) { r(g, '#3b3560', ox + 3, oy - 1, 10, 3); r(g, '#3b3560', ox + 5, oy - 3, 6, 2); r(g, '#f3b63f', ox + 5, oy, 6, 1); }
  if (ac === 9 && dir !== 3) { r(g, '#f3b63f', ox + 10, oy + 12, 3, 3); r(g, '#fff4c7', ox + 11, oy + 13, 1, 1); }
}

function pintarCuadro(g, a, dir, paso, ox, oy) {
  const piel = OPCIONES.skin[a.skin];
  const ropa = OPCIONES.topColor[a.topColor];
  const inf = OPCIONES.bottomColor[a.bottomColor];
  const cal = OPCIONES.shoesColor[a.shoesColor];
  const ancho = [0, 1, 0][a.body] ?? 0; // la silueta 2 es algo más ancha
  const estrecho = a.body === 2 ? 1 : 0;

  r(g, '#00000033', ox + 3, oy + 21, 10, 2);
  pintarAccesorioAtras(g, a, dir, ox, oy);

  // Piernas y calzado, con la zancada en pasos 1 y 2.
  const pi = paso === 1 ? -1 : 0, pd = paso === 2 ? -1 : 0;
  const falda = a.bottom >= 2;
  if (!falda) {
    r(g, a.bottom === 1 ? piel : inf, ox + 5, oy + 16, 3, 5 + pi);
    r(g, a.bottom === 1 ? piel : inf, ox + 8, oy + 16, 3, 5 + pd);
    r(g, inf, ox + 5, oy + 16, 6, 2);
  } else {
    r(g, piel, ox + 5, oy + 18, 3, 3 + pi); r(g, piel, ox + 8, oy + 18, 3, 3 + pd);
    r(g, inf, ox + 4, oy + 15, 8, a.bottom === 3 ? 6 : 4);
    r(g, oscurecer(inf), ox + 4, oy + (a.bottom === 3 ? 20 : 18), 8, 1);
  }
  const altoCal = a.shoes === 1 ? 3 : 2;
  const calColor = a.shoes === 2 ? piel : cal;
  r(g, calColor, ox + 4, oy + 21 + pi - altoCal + 2, 4, altoCal);
  r(g, calColor, ox + 8, oy + 21 + pd - altoCal + 2, 4, altoCal);
  if (a.shoes === 2) { r(g, cal, ox + 4, oy + 21 + pi, 4, 1); r(g, cal, ox + 8, oy + 21 + pd, 4, 1); }

  // Torso y brazos.
  r(g, ropa, ox + 4 - ancho + estrecho, oy + 9, 8 + ancho * 2 - estrecho * 2, 7);
  const sombra = oscurecer(ropa);
  r(g, sombra, ox + 4 - ancho + estrecho, oy + 15, 8 + ancho * 2 - estrecho * 2, 1);
  if (a.top === 3) r(g, ropa, ox + 3, oy + 14, 10, 4);
  if (a.top === 1) { r(g, sombra, ox + 7, oy + 10, 2, 5); r(g, sombra, ox + 5, oy + 9, 6, 1); }
  if (a.top === 2) { r(g, '#f5f1e6', ox + 7, oy + 9, 2, 3); r(g, sombra, ox + 8, oy + 12, 1, 3); }
  if (a.top === 4) { r(g, '#f5f1e6', ox + 7, oy + 9, 2, 7); r(g, sombra, ox + 4, oy + 9, 1, 7); r(g, sombra, ox + 11, oy + 9, 1, 7); }
  if (a.top === 5) { r(g, '#f5f1e6', ox + 4, oy + 12, 8, 2); }
  if (dir === 0 || dir === 3) {
    const bi = paso === 2 ? 1 : 0, bd = paso === 1 ? 1 : 0;
    r(g, ropa, ox + 3 - ancho + estrecho, oy + 10, 2, 4); r(g, piel, ox + 3 - ancho + estrecho, oy + 14 + bi, 2, 2);
    r(g, ropa, ox + 11 + ancho - estrecho, oy + 10, 2, 4); r(g, piel, ox + 11 + ancho - estrecho, oy + 14 + bd, 2, 2);
  } else {
    r(g, ropa, ox + 7, oy + 10, 2, 4); r(g, piel, ox + 7, oy + 14, 2, 2);
  }

  // Cabeza.
  r(g, piel, ox + 4, oy + 2, 8, 7); r(g, piel, ox + 3, oy + 3, 10, 5);
  r(g, oscurecer(piel, 0.9), ox + 4, oy + 8, 8, 1);
  pintarCabello(g, a, dir, ox, oy);
  pintarRostro(g, a, dir, ox, oy);
  pintarAccesorioFrente(g, a, dir, ox, oy);
}

const cache = new Map();

export function hojaPersonaje(a) {
  const clave = JSON.stringify(a);
  if (cache.has(clave)) return cache.get(clave);
  const hoja = lienzo(ANCHO * 3, (ALTO + 4) * 4);
  const g = hoja.getContext('2d');
  for (let d = 0; d < 4; d++) for (let p = 0; p < 3; p++) pintarCuadro(g, a, d, p, p * ANCHO, d * (ALTO + 4) + 4);
  cache.set(clave, hoja);
  return hoja;
}

export function dibujarPersonaje(g, hoja, dir, paso, x, y) {
  g.drawImage(hoja, paso * ANCHO, dir * (ALTO + 4), ANCHO, ALTO + 4, x, y - 4, ANCHO, ALTO + 4);
}

export function retrato(canvas, a) {
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.save();
  g.scale(2.4, 2.4);
  g.translate(0, 3);
  pintarCuadro(g, a, 0, 0, 0, 0);
  g.restore();
}

export function retratoVela(canvas, parpadeo = false) {
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  r(g, '#3b3560', 18, 2, 4, 2); r(g, '#3b3560', 15, 4, 10, 3); r(g, '#3b3560', 11, 7, 18, 4); r(g, '#3b3560', 8, 11, 24, 18); r(g, '#3b3560', 11, 29, 18, 4);
  r(g, '#f3a93f', 18, 4, 4, 3); r(g, '#f3a93f', 15, 7, 10, 4); r(g, '#f3a93f', 11, 11, 18, 18); r(g, '#f3a93f', 13, 29, 14, 2);
  r(g, '#ffd86a', 14, 14, 12, 15); r(g, '#fff3c0', 17, 9, 4, 8);
  r(g, '#22213a', 15, 18, 3, parpadeo ? 1 : 4); r(g, '#22213a', 23, 18, 3, parpadeo ? 1 : 4);
  r(g, '#d9573f', 18, 25, 5, 1); r(g, '#ef8fb1', 12, 23, 2, 1); r(g, '#ef8fb1', 26, 23, 2, 1);
  r(g, '#8c7fbf', 13, 33, 14, 3); r(g, '#3b3560', 11, 36, 18, 2);
}

// Los NPC usan las mismas capas que el jugador, así que el editor y el mundo comparten estilo.
export const NPCS = {
  tomas: { body: 0, skin: 2, hairStyle: 0, hairColor: 0, face: 2, top: 2, topColor: 1, bottom: 0, bottomColor: 0, shoes: 0, shoesColor: 0, accessory: 1 },
  lucia: { body: 2, skin: 1, hairStyle: 4, hairColor: 4, face: 1, top: 0, topColor: 0, bottom: 2, bottomColor: 1, shoes: 0, shoesColor: 3, accessory: 0 },
  nico: { body: 1, skin: 3, hairStyle: 7, hairColor: 1, face: 1, top: 1, topColor: 3, bottom: 0, bottomColor: 3, shoes: 0, shoesColor: 1, accessory: 2 },
  bruno: { body: 0, skin: 4, hairStyle: 2, hairColor: 0, face: 0, top: 1, topColor: 6, bottom: 0, bottomColor: 3, shoes: 1, shoesColor: 1, accessory: 3 },
  prof: { body: 2, skin: 2, hairStyle: 6, hairColor: 5, face: 0, top: 2, topColor: 4, bottom: 3, bottomColor: 1, shoes: 1, shoesColor: 4, accessory: 1 },
  sara: { body: 1, skin: 0, hairStyle: 5, hairColor: 3, face: 3, top: 0, topColor: 2, bottom: 1, bottomColor: 3, shoes: 0, shoesColor: 3, accessory: 5 },
  dani: { body: 0, skin: 5, hairStyle: 3, hairColor: 0, face: 1, top: 0, topColor: 3, bottom: 1, bottomColor: 4, shoes: 0, shoesColor: 2, accessory: 0 },
  mateo: { body: 1, skin: 2, hairStyle: 7, hairColor: 2, face: 2, top: 1, topColor: 7, bottom: 0, bottomColor: 2, shoes: 2, shoesColor: 2, accessory: 0 },
  valen: { body: 2, skin: 3, hairStyle: 1, hairColor: 7, face: 1, top: 2, topColor: 5, bottom: 2, bottomColor: 5, shoes: 0, shoesColor: 1, accessory: 4 },
  ines: { body: 2, skin: 4, hairStyle: 5, hairColor: 1, face: 1, top: 0, topColor: 4, bottom: 0, bottomColor: 2, shoes: 0, shoesColor: 0, accessory: 0 },
  guia: { body: 0, skin: 1, hairStyle: 0, hairColor: 2, face: 1, top: 4, topColor: 6, bottom: 0, bottomColor: 1, shoes: 1, shoesColor: 1, accessory: 2 },
  estudiante1: { body: 2, skin: 3, hairStyle: 4, hairColor: 3, face: 1, top: 0, topColor: 7, bottom: 2, bottomColor: 0, shoes: 0, shoesColor: 0, accessory: 3 },
  estudiante2: { body: 1, skin: 1, hairStyle: 2, hairColor: 4, face: 2, top: 1, topColor: 2, bottom: 0, bottomColor: 3, shoes: 0, shoesColor: 2, accessory: 5 },
  estudiante3: { body: 0, skin: 5, hairStyle: 6, hairColor: 0, face: 1, top: 2, topColor: 3, bottom: 3, bottomColor: 4, shoes: 2, shoesColor: 4, accessory: 0 },
};

export function avatarAzar() {
  const n = (k) => Math.floor(Math.random() * (EDICION_LIBRE[k] ?? OPCIONES[k].length));
  return Object.fromEntries(Object.keys(OPCIONES).map((k) => [k, n(k)]));
}

// ------------------------------------------------------------------ Logo
const LETRAS = {
  L: ['10000', '10000', '10000', '10000', '11111'], E: ['11111', '10000', '11110', '10000', '11111'],
  V: ['10001', '10001', '01010', '01010', '00100'], I: ['111', '010', '010', '010', '111'], F: ['11111', '10000', '11110', '10000', '10000'],
};

export function logo() {
  const texto = 'LEVELIFE', esc = 4;
  const ancho = [...texto].reduce((s, l) => s + (LETRAS[l][0].length + 1) * esc, 0) + 8;
  const c = lienzo(ancho, 5 * esc + 12);
  const g = c.getContext('2d');
  let x = 4;
  for (const letra of texto) {
    const forma = LETRAS[letra];
    forma.forEach((fila, fy) => [...fila].forEach((v, fx) => {
      if (v !== '1') return;
      const px = x + fx * esc, py = 3 + fy * esc;
      r(g, '#22213a', px - 2, py - 2, esc + 4, esc + 5);
    }));
    x += (forma[0].length + 1) * esc;
  }
  x = 4;
  for (const letra of texto) {
    const forma = LETRAS[letra];
    forma.forEach((fila, fy) => [...fila].forEach((v, fx) => {
      if (v !== '1') return;
      const px = x + fx * esc, py = 3 + fy * esc;
      r(g, fy < 2 ? '#ffd86a' : '#f3a93f', px, py, esc, esc);
      r(g, '#fff3c0', px, py, esc, 1);
    }));
    x += (forma[0].length + 1) * esc;
  }
  return c;
}

// --------------------------------------------------------------- Iconos
const ICONOS = {
  libro: ['#d9573f', [[3, 3, 10, 11]], '#fff4c7', [[5, 5, 6, 1], [5, 8, 6, 1]]],
  voz: ['#3f8fc9', [[2, 3, 12, 8], [5, 11, 3, 3]], '#fff4c7', [[4, 6, 8, 1]]],
  pluma: ['#7a5cc9', [[9, 2, 3, 6], [7, 5, 3, 5], [5, 9, 3, 3]], '#22213a', [[3, 12, 3, 2]]],
  ojo: ['#fff4c7', [[2, 6, 12, 5], [4, 4, 8, 9]], '#3f8fc9', [[6, 6, 4, 5]]],
  hoja: ['#3f9b5f', [[4, 4, 8, 8], [6, 2, 6, 3], [3, 7, 3, 5]], '#2c7247', [[5, 11, 6, 1], [7, 6, 1, 5]]],
  bota: ['#94683f', [[5, 3, 5, 8], [5, 10, 8, 3]], '#5d3a26', [[5, 13, 8, 1]]],
  estrella: ['#f3b63f', [[7, 2, 2, 12], [2, 6, 12, 3], [5, 4, 6, 8]], '#fff4c7', [[7, 6, 2, 2]]],
  mapa: ['#e9d9b8', [[2, 3, 12, 10]], '#d9573f', [[9, 5, 2, 2], [4, 9, 4, 1], [7, 7, 1, 3]]],
  sol: ['#f3b63f', [[5, 5, 6, 6], [7, 2, 2, 12], [2, 7, 12, 2]], '#fff4c7', [[6, 6, 2, 2]]],
  regalo: ['#d9573f', [[3, 5, 10, 9]], '#f3b63f', [[7, 5, 2, 9], [3, 8, 10, 2]]],
};

export function icono(nombre) {
  const c = lienzo(16, 16), g = c.getContext('2d');
  const [c1, f1, c2, f2] = ICONOS[nombre] ?? ICONOS.regalo;
  f1.forEach(([x, y, w, h]) => r(g, c1, x, y, w, h));
  f2.forEach(([x, y, w, h]) => r(g, c2, x, y, w, h));
  return c;
}
