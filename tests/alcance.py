"""Comprueba a pie, sin teletransporte, que todo el mundo sea alcanzable: python tests/alcance.py"""
import sys
import tempfile
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright
from waitress import create_server

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from server import create_app  # noqa: E402

BUSCAR = """async () => {
  const { MAPAS } = await import('/web/js/maps.js');
  const { SOLIDOS } = await import('/web/js/art.js');
  const inicios = { campus: [29, 26], biblioteca: [9, 12], cafeteria: [8, 11], aulas: [8, 11], residencia: [8, 11] };
  const fallos = [];
  for (const [nombre, m] of Object.entries(MAPAS)) {
    const t = m.tiles;
    const npc = new Set(m.npcs.filter((n) => n.ruta === 'quieto').map((n) => `${n.x},${n.y}`));
    const pisable = (x, y) => t[y]?.[x] !== undefined && !SOLIDOS.has(t[y][x]) && !npc.has(`${x},${y}`);
    const visto = new Set([inicios[nombre].join()]);
    const cola = [inicios[nombre]];
    while (cola.length) {
      const [x, y] = cola.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${x + dx},${y + dy}`;
        if (!visto.has(k) && pisable(x + dx, y + dy)) { visto.add(k); cola.push([x + dx, y + dy]); }
      }
    }
    const junto = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => visto.has(`${x + dx},${y + dy}`));
    for (const n of m.npcs) if (!junto(n.x, n.y)) fallos.push(`${nombre}: no se llega a ${n.nombre}`);
    for (const s of m.salidas) if (!visto.has(`${s.x},${s.y}`)) fallos.push(`${nombre}: salida ${s.x},${s.y} inalcanzable`);
    for (const k of Object.keys(m.letreros ?? {})) { const [x, y] = k.split(',').map(Number); if (!junto(x, y)) fallos.push(`${nombre}: letrero ${k}`); if (t[y][x] !== 'letrero') fallos.push(`${nombre}: ${k} no es letrero`); }
    for (const s of m.salidas) { const d = MAPAS[s.a]; if (SOLIDOS.has(d.tiles[s.ay][s.ax])) fallos.push(`${nombre}: la salida lleva a un tile sólido en ${s.a}`); }
    if (m.npcs.some((n) => SOLIDOS.has(t[n.y][n.x]))) fallos.push(`${nombre}: un NPC está dentro de un sólido`);
  }
  return fallos;
}"""


def main():
    tmp = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
    servidor = create_server(create_app(str(Path(tmp.name) / "a.db")), host="127.0.0.1", port=0)
    threading.Thread(target=servidor.run, daemon=True).start()
    with sync_playwright() as pw:
        navegador = pw.chromium.launch(channel="chrome")
        pagina = navegador.new_page()
        pagina.goto(f"http://127.0.0.1:{servidor.effective_port}/")
        fallos = pagina.evaluate(BUSCAR)
        navegador.close()
    if fallos:
        print(*fallos, sep="\n")
        sys.exit(1)
    print("Todo el mundo es alcanzable a pie.")


if __name__ == "__main__":
    main()
