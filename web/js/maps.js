// Mapas construidos por código. Cada celda guarda el nombre de su tile.
const CAMPUS_W = 60, CAMPUS_H = 44;

function nuevo(w, h, tile) { return Array.from({ length: h }, () => Array(w).fill(tile)); }
function area(m, x, y, w, h, tile) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (m[j]?.[i] !== undefined) m[j][i] = tile; }

function edificio(m, x, y, w, techo, muro, alto = 2) {
  area(m, x, y, w, 3, techo);
  area(m, x, y + 3, w, alto, muro);
  for (let i = x + 1; i < x + w - 1; i += 2) m[y + 3][i] = 'ventana';
}

function camino(m, x1, y1, x2, y2, grosor = 2) {
  area(m, Math.min(x1, x2), y1, Math.abs(x2 - x1) + grosor, grosor, 'camino');
  area(m, x2, Math.min(y1, y2), grosor, Math.abs(y2 - y1) + grosor, 'camino');
}

function crearCampus() {
  const m = nuevo(CAMPUS_W, CAMPUS_H, 'pasto');
  // Flores y borde de bosque.
  for (let j = 0; j < CAMPUS_H; j++) for (let i = 0; i < CAMPUS_W; i++) {
    if ((i * 7 + j * 13) % 41 === 0) m[j][i] = 'flor';
    if (i < 2 || j < 2 || i >= CAMPUS_W - 2 || j >= CAMPUS_H - 2) m[j][i] = 'arbol';
  }
  // Plaza central.
  area(m, 22, 18, 16, 10, 'plaza');
  area(m, 28, 21, 4, 4, 'fuente');
  // Caminos entre zonas.
  camino(m, 29, 8, 29, 18);
  camino(m, 12, 22, 22, 22);
  camino(m, 38, 22, 49, 22);
  camino(m, 29, 28, 29, 36);
  camino(m, 8, 12, 12, 22);
  camino(m, 8, 34, 12, 22);
  camino(m, 40, 34, 29, 34);
  camino(m, 50, 12, 49, 22);
  // Biblioteca al norte.
  edificio(m, 23, 3, 14, 'techoAzul', 'muroClaro');
  m[7][29] = 'puerta'; m[7][30] = 'puerta';
  // Cafetería al oeste.
  edificio(m, 4, 7, 11, 'techoOcre', 'muroClaro');
  m[11][8] = 'puerta';
  // Aulas al este.
  edificio(m, 44, 7, 12, 'techoRojo', 'muroLadrillo');
  m[11][50] = 'puerta';
  // Residencia al suroeste.
  edificio(m, 4, 29, 10, 'techoVerde', 'muroAzul');
  m[33][8] = 'puerta';
  // Parque al sureste, con estanque y bancas.
  area(m, 39, 30, 17, 11, 'pasto');
  area(m, 47, 33, 7, 5, 'agua');
  for (const [x, y] of [[40, 31], [43, 31], [40, 39], [54, 39], [45, 39], [55, 31]]) m[y][x] = 'arbol';
  for (const [x, y] of [[42, 36], [44, 36], [41, 33]]) m[y][x] = 'banca';
  area(m, 38, 26, 1, 1, 'pasto');
  // El parque tiene un cerco de setos con una sola entrada, por el paseo del sur.
  for (let i = 39; i < 56; i++) m[29][i] = 'seto';
  for (let j = 29; j < 41; j++) if (j !== 34 && j !== 35) m[j][38] = 'seto';
  // Jardines, árboles y faroles que dan vida al campus.
  for (let i = 18; i < 22; i++) { m[16][i] = 'seto'; m[29][i] = 'seto'; }
  for (let i = 38; i < 42; i++) m[16][i] = 'seto';
  const bosquecillos = [[16, 5], [19, 6], [17, 8], [20, 10], [15, 13], [18, 13], [39, 5], [42, 6], [40, 9], [37, 11], [42, 13], [39, 14],
    [17, 25], [15, 27], [19, 27], [16, 31], [19, 33], [22, 32], [24, 36], [26, 40], [22, 40], [18, 37], [15, 40], [10, 39], [5, 37], [34, 31], [36, 37], [33, 40],
    [52, 15], [55, 18], [44, 17], [53, 26], [47, 26], [56, 24], [4, 16], [6, 19], [3, 23], [6, 26]];
  for (const [x, y] of bosquecillos) m[y][x] = 'arbol';
  for (const [x, y] of [[21, 17], [38, 17], [21, 28], [38, 28], [28, 14], [31, 12], [28, 31], [31, 33], [15, 24], [42, 21]]) m[y][x] = 'farol';
  for (let i = 22; i < 29; i++) { m[17][i] = 'arbusto'; m[28][i] = 'arbusto'; }
  for (let i = 32; i < 38; i++) { m[17][i] = 'arbusto'; m[28][i] = 'arbusto'; }
  for (const [x, y] of [[20, 25], [20, 19], [39, 19], [39, 25]]) m[y][x] = 'banca';
  for (const [x, y, w] of [[26, 13, 2], [33, 10, 3], [10, 15, 3], [48, 16, 3], [16, 22, 2], [43, 25, 3], [24, 33, 3]]) for (let i = 0; i < w; i++) m[y][x + i] = 'flor';
  // Rótulos junto a las puertas.
  m[6][28] = 'rotulo'; m[6][31] = 'rotulo'; m[10][7] = 'rotulo'; m[10][9] = 'rotulo'; m[10][49] = 'rotulo'; m[10][51] = 'rotulo'; m[32][7] = 'rotulo'; m[32][9] = 'rotulo';
  // Letreros.
  m[17][31] = 'letrero'; m[21][20] = 'letrero'; m[21][41] = 'letrero'; m[30][27] = 'letrero'; m[20][11] = 'letrero';
  return m;
}

function interior(w, h, piso) {
  const m = nuevo(w, h, 'vacio');
  area(m, 1, 2, w - 2, h - 3, piso);
  area(m, 1, 0, w - 2, 2, 'pared');
  return m;
}

function crearBiblioteca() {
  const m = interior(20, 14, 'piso');
  area(m, 2, 2, 7, 1, 'estante'); area(m, 11, 2, 7, 1, 'estante');
  for (const y of [5, 8]) { area(m, 3, y, 5, 1, 'estante'); area(m, 12, y, 5, 1, 'estante'); }
  area(m, 9, 3, 2, 10, 'alfombra');
  area(m, 13, 11, 3, 1, 'mesa');
  m[12][14] = 'silla'; m[2][9] = 'planta'; m[2][10] = 'planta';
  m[13][9] = 'salida'; m[13][10] = 'salida';
  return m;
}

function crearCafeteria() {
  const m = interior(18, 13, 'baldosa');
  area(m, 2, 3, 14, 1, 'barra');
  for (const [x, y] of [[3, 7], [8, 7], [13, 7], [3, 10], [13, 10]]) { area(m, x, y, 2, 1, 'mesa'); m[y + 1][x] = 'silla'; }
  m[12][8] = 'salida'; m[12][9] = 'salida';
  return m;
}

function crearAulas() {
  const m = interior(18, 13, 'piso');
  area(m, 4, 1, 10, 1, 'pizarra');
  for (const y of [5, 7, 9]) for (const x of [3, 6, 11, 14]) { m[y][x] = 'mesa'; m[y + 1][x] = 'silla'; }
  m[3][14] = 'mesa'; m[3][15] = 'mesa';
  m[12][8] = 'salida'; m[12][9] = 'salida';
  return m;
}

function crearResidencia() {
  const m = interior(18, 13, 'piso');
  for (const x of [2, 7, 12]) { area(m, x, 2, 2, 3, 'cama'); m[2][x + 2] = 'estante'; }
  area(m, 6, 8, 6, 3, 'alfombra');
  area(m, 8, 8, 2, 1, 'mesa');
  m[9][2] = 'planta'; m[9][15] = 'planta';
  m[12][8] = 'salida'; m[12][9] = 'salida';
  return m;
}

const decir = (...lineas) => ({ lineas });

export const MAPAS = {
  campus: {
    nombre: 'Campus', tiles: crearCampus(), fuente: { x: 28, y: 21 }, zonaEn(x, y) {
      if (x >= 22 && x < 38 && y >= 18 && y < 28) return 'plaza';
      if (x >= 38 && y >= 28) return 'parque';
      return null;
    },
    salidas: [
      { x: 29, y: 7, a: 'biblioteca', ax: 9, ay: 12, zona: 'biblioteca' }, { x: 30, y: 7, a: 'biblioteca', ax: 10, ay: 12, zona: 'biblioteca' },
      { x: 8, y: 11, a: 'cafeteria', ax: 8, ay: 11, zona: 'cafeteria' },
      { x: 50, y: 11, a: 'aulas', ax: 8, ay: 11, zona: 'aulas' },
      { x: 8, y: 33, a: 'residencia', ax: 8, ay: 11, zona: 'residencia' },
    ],
    npcs: [
      { id: 'guia', x: 26, y: 26, dir: 0, ruta: 'quieto', nombre: 'Rafa, guía del campus', decir: decir('¡Te damos la bienvenida al campus! En cada edificio hay alguien con una historia.', 'Empieza por la Biblioteca o la Cafetería. Las demás zonas se abren al vivir historias.') },
      { id: 'estudiante1', x: 35, y: 24, dir: 1, ruta: 'pasea', nombre: 'Mar', decir: decir('Dicen que el parque es perfecto para pensar. Se abre cuando hayas vivido un par de historias.') },
      { id: 'estudiante2', x: 18, y: 23, dir: 2, ruta: 'pasea', nombre: 'Leo', decir: decir('Las misiones de Vela son para la vida real. Las puedes cambiar si no te encajan.') },
      { id: 'estudiante3', x: 30, y: 33, dir: 3, ruta: 'pasea', nombre: 'Noa', decir: decir('Aquí nadie te pone nota por lo que eliges. Yo repetí una historia solo para ver qué pasaba.') },
      { id: 'sara', x: 44, y: 34, dir: 0, ruta: 'quieto', nombre: 'Sara', historia: 'descanso' },
      { id: 'dani', x: 46, y: 31, dir: 0, ruta: 'pasea', nombre: 'Dani', decir: decir('¡Entrenamos a las cinco! Sara dice que vendrá. Eso espero.') },
    ],
    letreros: {
      '31,17': 'Norte: Biblioteca.', '20,21': 'Oeste: Cafetería y Residencia.', '41,21': 'Este: Aulas. Sureste: Parque.',
      '27,30': 'Sur: paseo del campus y Parque universitario.', '11,20': 'Cafetería al norte. Residencia al sur.',
    },
    bancas: 'Te sientas un momento. El viento mueve las hojas. Nadie te espera ahora.',
    reja: { x1: 38, x2: 38, y1: 28, y2: 41, zona: 'parque' },
  },
  biblioteca: {
    nombre: 'Biblioteca', tiles: crearBiblioteca(), zona: 'biblioteca',
    salidas: [{ x: 9, y: 13, a: 'campus', ax: 29, ay: 8 }, { x: 10, y: 13, a: 'campus', ax: 30, ay: 8 }],
    npcs: [
      { id: 'tomas', x: 14, y: 10, dir: 0, ruta: 'quieto', nombre: 'Tomás', historia: 'semana' },
      { id: 'ines', x: 5, y: 7, dir: 2, ruta: 'quieto', nombre: 'Inés', decir: decir('Estudiar en grupo me salvó el año pasado. Y también estudiar sola. Depende del día.') },
    ],
    estantes: 'Hay libros sobre casi todo. Un marcador dice: «Una página también cuenta».',
  },
  cafeteria: {
    nombre: 'Cafetería', tiles: crearCafeteria(), zona: 'cafeteria',
    salidas: [{ x: 8, y: 12, a: 'campus', ax: 8, ay: 12 }, { x: 9, y: 12, a: 'campus', ax: 8, ay: 12 }],
    npcs: [
      { id: 'lucia', x: 9, y: 8, dir: 0, ruta: 'quieto', nombre: 'Lucía', historia: 'no' },
      { id: 'nico', x: 14, y: 5, dir: 3, ruta: 'quieto', nombre: 'Nico', decir: decir('¿Has visto a Lucía? Ella siempre me ayuda.') },
    ],
    barra: 'Huele a café y a pan recién hecho. Hoy el menú dice: «sopa y calma».',
  },
  aulas: {
    nombre: 'Aulas', tiles: crearAulas(), zona: 'aulas',
    salidas: [{ x: 8, y: 12, a: 'campus', ax: 50, ay: 12 }, { x: 9, y: 12, a: 'campus', ax: 50, ay: 12 }],
    npcs: [
      { id: 'bruno', x: 8, y: 7, dir: 0, ruta: 'quieto', nombre: 'Bruno', historia: 'expectativas' },
      { id: 'prof', x: 12, y: 3, dir: 0, ruta: 'quieto', nombre: 'Prof. Aguirre', decir: decir('Mi oficina siempre está abierta. A veces una buena pregunta vale más que una buena nota.') },
    ],
    pizarra: 'Alguien escribió: «Equivocarse también es información».',
  },
  residencia: {
    nombre: 'Residencia', tiles: crearResidencia(), zona: 'residencia',
    salidas: [{ x: 8, y: 12, a: 'campus', ax: 8, ay: 34 }, { x: 9, y: 12, a: 'campus', ax: 8, ay: 34 }],
    npcs: [
      { id: 'mateo', x: 6, y: 9, dir: 2, ruta: 'quieto', nombre: 'Mateo', historia: 'luces' },
      { id: 'valen', x: 13, y: 9, dir: 1, ruta: 'quieto', nombre: 'Valentina', decir: decir('Los jueves cocinamos. Bueno, lo intentamos.') },
    ],
    camas: 'Una cama bien hecha. Parece una invitación.',
  },
};

export const PUNTO_INICIAL = { map: 'campus', x: 29, y: 26 };
