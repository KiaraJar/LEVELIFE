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

function tejas(g, x, y, base, oscuro, claro) {
  r(g, base, x, y, TILE, TILE);
  for (let f = 0; f < 4; f++) {
    r(g, oscuro, x, y + f * 4 + 3, TILE, 1);
    const d = f % 2 ? 2 : 6;
    r(g, oscuro, x + d, y + f * 4, 1, 3); r(g, oscuro, x + d + 8, y + f * 4, 1, 3);
    r(g, claro, x + d + 2, y + f * 4, 3, 1);
  }
}

// ---------------------------------------------------------------- Tiles
const pintores = {
  pasto(g, x, y, s) {
    // Ajedrezado suave, como un césped de campus bien cuidado.
    const par = (x / TILE + y / TILE) % 2 === 0;
    const a = azar(s);
    r(g, par ? '#6dbb66' : '#64b25f', x, y, TILE, TILE);
    for (let i = 0; i < 3; i++) {
      const px = x + 1 + Math.floor(a() * 13), py = y + 1 + Math.floor(a() * 13);
      r(g, par ? '#5aa758' : '#79c672', px, py, 1, 2); r(g, par ? '#5aa758' : '#79c672', px + 2, py + 1, 1, 1);
    }
  },
  flor(g, x, y, s) {
    pintores.pasto(g, x, y, s); const a = azar(s + 3);
    for (let i = 0; i < 3; i++) { const px = x + 2 + Math.floor(a() * 11), py = y + 2 + Math.floor(a() * 11); r(g, ['#fff4c7', '#ef8fb1', '#f7d04a'][i], px, py, 2, 2); r(g, '#d9573f', px, py, 1, 1); }
  },
  camino(g, x, y, s) {
    const a = azar(s); r(g, '#d8b98a', x, y, TILE, TILE);
    for (let i = 0; i < 7; i++) r(g, a() > 0.5 ? '#c7a574' : '#e6cfa3', x + Math.floor(a() * 14), y + Math.floor(a() * 14), 2, 1);
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
  techoRojo(g, x, y) { tejas(g, x, y, '#a84a39', '#8a3829', '#c2604d'); },
  techoAzul(g, x, y) { tejas(g, x, y, '#3f587f', '#314668', '#567299'); },
  techoVerde(g, x, y) { tejas(g, x, y, '#3a7a60', '#2c604b', '#4f9478'); },
  techoOcre(g, x, y) { tejas(g, x, y, '#b0853a', '#8f6a2c', '#c99f52'); },
  ventana(g, x, y) { pintores.muroClaro(g, x, y); r(g, '#5d4a3a', x + 2, y + 3, 12, 10); r(g, '#a9dcec', x + 3, y + 4, 10, 8); r(g, '#5d4a3a', x + 7, y + 4, 2, 8); r(g, '#dff4fa', x + 4, y + 5, 2, 2); },
  puerta(g, x, y) { r(g, '#e9d9b8', x, y, TILE, TILE); r(g, '#5d3a26', x + 2, y + 1, 12, 15); r(g, '#7b5236', x + 3, y + 2, 10, 14); r(g, '#f3b63f', x + 11, y + 8, 2, 2); },
  cerrada(g, x, y) { pintores.puerta(g, x, y); r(g, '#3b3560', x + 2, y + 6, 12, 2); r(g, '#3b3560', x + 2, y + 10, 12, 2); r(g, '#f3b63f', x + 6, y + 7, 4, 4); },
  banca(g, x, y, s) { pintores.pasto(g, x, y, s); r(g, '#7b5236', x + 1, y + 6, 14, 3); r(g, '#94683f', x + 1, y + 10, 14, 3); r(g, '#4d3423', x + 2, y + 13, 2, 3); r(g, '#4d3423', x + 12, y + 13, 2, 3); },
  letrero(g, x, y, s) { pintores.pasto(g, x, y, s); r(g, '#5d3a26', x + 7, y + 8, 2, 8); r(g, '#94683f', x + 2, y + 2, 12, 8); r(g, '#7b5236', x + 2, y + 9, 12, 1); r(g, '#3b3560', x + 4, y + 4, 8, 1); r(g, '#3b3560', x + 4, y + 6, 6, 1); },
  fuente(g, x, y, s) { pintores.plaza(g, x, y, s); },
  columna(g, x, y) {
    pintores.muroClaro(g, x, y);
    r(g, '#f4ecd8', x + 4, y, 8, TILE); r(g, '#c9b78f', x + 10, y, 2, TILE); r(g, '#2a2238', x + 3, y, 1, TILE); r(g, '#2a2238', x + 12, y, 1, TILE);
    r(g, '#fffaf0', x + 2, y, 12, 2); r(g, '#fffaf0', x + 2, y + 14, 12, 2); r(g, '#b9a67e', x + 2, y + 15, 12, 1);
  },
  escalon(g, x, y) {
    for (let i = 0; i < 4; i++) { r(g, i % 2 ? '#c5bcb1' : '#e2dbd0', x, y + i * 4, TILE, 3); r(g, '#8f8a96', x, y + i * 4 + 3, TILE, 1); }
  },
  pendon(g, x, y) {
    pintores.muroClaro(g, x, y);
    r(g, '#2a2238', x + 3, y + 1, 10, 1); r(g, '#7a1f2e', x + 4, y + 2, 8, 11); r(g, '#a33a4a', x + 4, y + 2, 2, 11);
    r(g, '#f3b63f', x + 6, y + 5, 4, 4); r(g, '#7a1f2e', x + 7, y + 6, 2, 2); r(g, '#7a1f2e', x + 4, y + 12, 2, 2); r(g, '#7a1f2e', x + 10, y + 12, 2, 2);
  },
  bicis(g, x, y, s) {
    pintores.pasto(g, x, y, s);
    r(g, '#8f97a6', x, y + 8, TILE, 1);
    const color = ['#d9573f', '#3f8fc9', '#f3b63f'][s % 3];
    r(g, '#2a2238', x + 1, y + 10, 5, 5); r(g, '#2a2238', x + 10, y + 10, 5, 5); r(g, '#cfd4dd', x + 2, y + 11, 3, 3); r(g, '#cfd4dd', x + 11, y + 11, 3, 3);
    r(g, color, x + 4, y + 9, 8, 2); r(g, color, x + 7, y + 7, 2, 5); r(g, '#2a2238', x + 5, y + 6, 5, 1);
  },
  kiosco(g, x, y, s) {
    pintores.pasto(g, x, y, s);
    r(g, '#2a2238', x, y + 1, TILE, 15); r(g, '#3f8fc9', x + 1, y + 2, 14, 4);
    for (let i = 0; i < 4; i++) r(g, '#f5f1e6', x + 1 + i * 4, y + 2, 2, 4);
    r(g, '#e9d9b8', x + 1, y + 6, 14, 9); r(g, '#5d4a3a', x + 2, y + 7, 12, 4); r(g, '#f5f1e6', x + 3, y + 8, 4, 3); r(g, '#f5f1e6', x + 8, y + 8, 4, 3); r(g, '#94683f', x + 1, y + 11, 14, 2);
  },
  tablero(g, x, y) {
    pintores.pared(g, x, y);
    r(g, '#5d3a26', x + 1, y + 2, 14, 11); r(g, '#b58650', x + 2, y + 3, 12, 9);
    r(g, '#f5f1e6', x + 3, y + 4, 4, 5); r(g, '#ffe39c', x + 8, y + 4, 5, 3); r(g, '#bfe4d0', x + 8, y + 8, 4, 3);
  },
  lectura(g, x, y, s) {
    pintores.piso(g, x, y, s);
    r(g, '#5d3a26', x, y + 3, TILE, 10); r(g, '#94683f', x, y + 3, TILE, 8); r(g, '#b58650', x, y + 4, TILE, 2);
    r(g, '#f5f1e6', x + 2, y + 7, 5, 3); r(g, '#3f9b5f', x + 10, y + 2, 4, 3); r(g, '#ffe39c', x + 11, y + 5, 2, 1); r(g, '#2a2238', x + 11, y + 6, 2, 4);
  },
  pc(g, x, y, s) {
    pintores.piso(g, x, y, s);
    r(g, '#5d6474', x, y + 9, TILE, 6); r(g, '#8f97a6', x, y + 9, TILE, 2);
    r(g, '#2a2238', x + 2, y + 1, 12, 9); r(g, s % 2 ? '#4fc3d9' : '#3fbf6a', x + 3, y + 2, 10, 6); r(g, '#dff4fa', x + 4, y + 3, 5, 1); r(g, '#dff4fa', x + 4, y + 5, 7, 1);
    r(g, '#2a2238', x + 7, y + 10, 2, 2); r(g, '#cfd4dd', x + 3, y + 12, 10, 2);
  },
  cerca(g, x, y, s) {
    pintores.pasto(g, x, y, s);
    r(g, '#5d3a26', x + 1, y + 4, 3, 11); r(g, '#5d3a26', x + 12, y + 4, 3, 11);
    r(g, '#94683f', x + 2, y + 4, 2, 10); r(g, '#94683f', x + 13, y + 4, 2, 10);
    r(g, '#7b5236', x, y + 6, TILE, 3); r(g, '#b58650', x, y + 6, TILE, 1); r(g, '#7b5236', x, y + 11, TILE, 2); r(g, '#b58650', x, y + 11, TILE, 1);
  },
  roca(g, x, y, s) {
    pintores.pasto(g, x, y, s);
    r(g, '#4f5564', x + 2, y + 6, 12, 9); r(g, '#4f5564', x + 4, y + 4, 8, 2);
    r(g, '#8f97a6', x + 3, y + 6, 10, 7); r(g, '#b4bbc7', x + 5, y + 5, 5, 3); r(g, '#6f7686', x + 3, y + 12, 10, 2);
  },
  tocon(g, x, y, s) {
    pintores.pasto(g, x, y, s);
    r(g, '#4d3423', x + 2, y + 5, 12, 10); r(g, '#7b5236', x + 3, y + 8, 10, 6); r(g, '#94683f', x + 5, y + 8, 2, 6);
    r(g, '#d8b98a', x + 3, y + 5, 10, 3); r(g, '#b58650', x + 6, y + 6, 4, 1);
  },
  tablon(g, x, y, s) {
    pintores.pasto(g, x, y, s);
    r(g, '#4d3423', x + 2, y + 9, 2, 7); r(g, '#4d3423', x + 12, y + 9, 2, 7);
    r(g, '#4d3423', x, y + 1, TILE, 11); r(g, '#b58650', x + 1, y + 2, 14, 9);
    r(g, '#f5f1e6', x + 2, y + 3, 5, 6); r(g, '#ffe39c', x + 8, y + 3, 6, 3); r(g, '#bfe4d0', x + 8, y + 7, 5, 3); r(g, '#d9573f', x + 4, y + 3, 1, 1);
  },
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

export const SOLIDOS = new Set(['arbol', 'seto', 'agua', 'muroClaro', 'muroLadrillo', 'muroAzul', 'techoRojo', 'techoAzul', 'techoVerde', 'techoOcre', 'ventana', 'cerrada', 'banca', 'letrero', 'fuente', 'farol', 'arbusto', 'rotulo', 'cerca', 'roca', 'tocon', 'tablon', 'columna', 'pendon', 'bicis', 'kiosco', 'tablero', 'lectura', 'pc', 'pared', 'estante', 'mesa', 'pizarra', 'barra', 'cama', 'planta', 'vacio']);
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

// Contorno oscuro de un píxel: separa a los personajes del fondo.
function contornear(hoja) {
  const g = hoja.getContext('2d');
  const { width: w, height: h } = hoja;
  const img = g.getImageData(0, 0, w, h);
  const solido = (x, y) => x >= 0 && y >= 0 && x < w && y < h && img.data[(y * w + x) * 4 + 3] > 200;
  g.fillStyle = '#2a2238';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (img.data[(y * w + x) * 4 + 3] <= 200 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => solido(x + dx, y + dy))) g.fillRect(x, y, 1, 1);
  }
}

export function hojaPersonaje(a) {
  const clave = JSON.stringify(a);
  if (cache.has(clave)) return cache.get(clave);
  const hoja = lienzo(ANCHO * 3, (ALTO + 4) * 4);
  const g = hoja.getContext('2d', { willReadFrequently: true });
  for (let d = 0; d < 4; d++) for (let p = 0; p < 3; p++) pintarCuadro(g, a, d, p, p * ANCHO, d * (ALTO + 4) + 4);
  contornear(hoja);
  cache.set(clave, hoja);
  return hoja;
}

// ---------------------------------------------------- Árboles con volumen
function disco(g, color, cx, cy, radio) {
  g.fillStyle = color;
  for (let y = -radio; y <= radio; y++) {
    const ancho = Math.round(Math.sqrt(radio * radio - y * y));
    g.fillRect(cx - ancho, cy + y, ancho * 2 + 1, 1);
  }
}

const arboles = [];
export const ARBOL = { ancho: 32, alto: 40 };

export function arbolGrande(semilla) {
  const tipo = semilla % 3;
  if (arboles[tipo]) return arboles[tipo];
  const c = lienzo(ARBOL.ancho, ARBOL.alto), g = c.getContext('2d');
  const [oscuro, base, luz, brillo] = [['#1f5a3c', '#2f7d4b', '#45a05f', '#6cc07a'], ['#27613a', '#3a8748', '#55a858', '#83c76d'], ['#1c5247', '#2b7361', '#409378', '#6db79a']][tipo];
  r(g, '#00000033', 8, 35, 16, 4);
  r(g, '#2a2238', 13, 25, 6, 12); r(g, '#6b4a30', 14, 25, 4, 11); r(g, '#94683f', 14, 25, 1, 11);
  const copa = [[16, 14, 12], [9, 19, 7], [23, 19, 7]];
  copa.forEach(([x, y, k]) => disco(g, '#2a2238', x, y, k + 1));
  copa.forEach(([x, y, k]) => disco(g, oscuro, x, y, k));
  disco(g, base, 16, 13, 10); disco(g, base, 10, 18, 5); disco(g, base, 22, 18, 5);
  disco(g, luz, 14, 11, 7); disco(g, luz, 21, 15, 4);
  disco(g, brillo, 12, 8, 3); disco(g, brillo, 20, 11, 2);
  arboles[tipo] = c;
  return c;
}

// -------------------------------------------------- Letreros y etiquetas
const FUENTE = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', ' ': '000000000000000', '.': '000000000000010',
};
const SIN_TILDE = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N' };

function escribir(g, texto, x, y, color) {
  [...texto.toUpperCase()].forEach((letra, i) => {
    const forma = FUENTE[SIN_TILDE[letra] ?? letra] ?? FUENTE[' '];
    [...forma].forEach((v, n) => { if (v === '1') r(g, color, x + i * 4 + (n % 3), y + Math.floor(n / 3), 1, 1); });
  });
}

const etiquetas = new Map();
export function etiqueta(texto) {
  if (etiquetas.has(texto)) return etiquetas.get(texto);
  const ancho = texto.length * 4 + 7;
  const c = lienzo(ancho, 11), g = c.getContext('2d');
  r(g, '#2a2238', 1, 0, ancho - 2, 11); r(g, '#2a2238', 0, 1, ancho, 9);
  r(g, '#f2e6c9', 1, 1, ancho - 2, 9); r(g, '#d8c49a', 1, 9, ancho - 2, 1);
  escribir(g, texto, 4, 3, '#3b3560');
  etiquetas.set(texto, c);
  return c;
}

// Reloj de la fachada: una marca fácil de reconocer en el campus.
export function reloj(g, cx, cy) {
  disco(g, '#2a2238', cx, cy, 11); disco(g, '#b0853a', cx, cy, 10); disco(g, '#fffaf0', cx, cy, 8);
  r(g, '#2a2238', cx, cy - 6, 1, 6); r(g, '#2a2238', cx, cy, 5, 1); r(g, '#d9573f', cx, cy, 1, 1);
  for (const [dx, dy] of [[0, -7], [7, 0], [0, 7], [-7, 0]]) r(g, '#3b3560', cx + dx, cy + dy, 1, 1);
}

export function placa(g, texto, cx, y) {
  const ancho = texto.length * 4 + 9;
  const x = Math.round(cx - ancho / 2);
  r(g, '#2a2238', x, y, ancho, 11); r(g, '#3b3560', x + 1, y + 1, ancho - 2, 9); r(g, '#f3b63f', x + 1, y + 1, ancho - 2, 1);
  escribir(g, texto, x + 5, y + 3, '#f7f0dd');
}

// Bordes de caminos y plazas: el suelo deja de verse como cuadros sueltos.
export function pintarBordes(g, tiles) {
  const suelo = new Set(['camino', 'plaza', 'fuente', 'puerta']);
  tiles.forEach((fila, j) => fila.forEach((t, i) => {
    if (t !== 'camino' && t !== 'plaza') return;
    const x = i * TILE, y = j * TILE;
    const borde = t === 'camino' ? '#b08a5a' : '#a79e92';
    const libre = (a, b) => tiles[b]?.[a] !== undefined && !suelo.has(tiles[b][a]);
    if (libre(i, j - 1)) { r(g, borde, x, y, TILE, 1); r(g, '#4f9a55', x + (i * 7) % 10, y - 1, 3, 2); }
    if (libre(i, j + 1)) r(g, borde, x, y + 15, TILE, 1);
    if (libre(i - 1, j)) r(g, borde, x, y, 1, TILE);
    if (libre(i + 1, j)) r(g, borde, x + 15, y, 1, TILE);
  }));
  // Sombra bajo los aleros: da altura a los edificios.
  tiles.forEach((fila, j) => fila.forEach((t, i) => {
    if (t.startsWith('techo') && !tiles[j + 1]?.[i]?.startsWith('techo')) {
      r(g, '#2a2238', i * TILE, j * TILE + 14, TILE, 2);
      r(g, '#00000033', i * TILE, (j + 1) * TILE, TILE, 3);
    }
  }));
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
  estudiante4: { body: 0, skin: 2, hairStyle: 7, hairColor: 0, face: 2, top: 1, topColor: 6, bottom: 0, bottomColor: 0, shoes: 0, shoesColor: 0, accessory: 3 },
  estudiante5: { body: 2, skin: 4, hairStyle: 5, hairColor: 0, face: 1, top: 2, topColor: 1, bottom: 0, bottomColor: 1, shoes: 0, shoesColor: 1, accessory: 3 },
  estudiante6: { body: 1, skin: 1, hairStyle: 0, hairColor: 1, face: 0, top: 1, topColor: 4, bottom: 0, bottomColor: 3, shoes: 1, shoesColor: 1, accessory: 1 },
  estudiante7: { body: 2, skin: 3, hairStyle: 4, hairColor: 2, face: 3, top: 0, topColor: 5, bottom: 2, bottomColor: 2, shoes: 0, shoesColor: 3, accessory: 3 },
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
  bateria: ['#e9e4d4', [[2, 5, 11, 7], [13, 7, 2, 3]], '#3fbf6a', [[3, 6, 3, 5], [7, 6, 3, 5]]],
  cerebro: ['#ef8fb1', [[4, 3, 8, 2], [2, 5, 12, 6], [4, 11, 8, 2]], '#c75c8a', [[8, 4, 1, 9], [4, 7, 3, 1], [10, 8, 3, 1]]],
  llama: ['#f3a93f', [[7, 1, 2, 2], [6, 3, 4, 2], [4, 5, 8, 7], [5, 12, 6, 2]], '#ffe39c', [[6, 7, 4, 6], [7, 5, 2, 2]]],
  pin: ['#d9573f', [[5, 2, 6, 7], [6, 9, 4, 2], [7, 11, 2, 3]], '#fff4c7', [[7, 4, 2, 2]]],
  agenda: ['#f2e6c9', [[2, 3, 12, 11]], '#d9573f', [[2, 3, 12, 3], [4, 1, 2, 3], [10, 1, 2, 3], [5, 8, 2, 2], [9, 8, 2, 2], [5, 11, 2, 1]]],
};

export function icono(nombre) {
  const c = lienzo(16, 16), g = c.getContext('2d');
  const [c1, f1, c2, f2] = ICONOS[nombre] ?? ICONOS.regalo;
  f1.forEach(([x, y, w, h]) => r(g, c1, x, y, w, h));
  f2.forEach(([x, y, w, h]) => r(g, c2, x, y, w, h));
  return c;
}
