// Efectos y música generados con Web Audio. Todo es original y está apagado hasta que se active.
const NOTAS = [262, 330, 392, 440, 392, 330, 294, 349, 440, 523, 440, 349];

class Sonido {
  constructor() {
    this.efectos = localStorage.getItem('lv_efectos') !== '0';
    this.musica = localStorage.getItem('lv_musica') === '1';
    this.ctx = null;
    this.timer = null;
    this.paso = 0;
  }

  iniciar() {
    if (!this.ctx) {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) return;
      this.ctx = new Contexto();
    }
    this.ctx.resume();
    if (this.musica) this.arrancarMusica();
  }

  tono(freq, inicio, dur, vol = 0.04, tipo = 'square') {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gan = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.value = freq;
    const t = this.ctx.currentTime + inicio;
    gan.gain.setValueAtTime(vol, t);
    gan.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gan).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  efecto(nombre) {
    if (!this.efectos) return;
    const f = {
      letra: () => this.tono(880, 0, 0.02, 0.012),
      elegir: () => this.tono(660, 0, 0.07),
      abrir: () => { this.tono(440, 0, 0.07); this.tono(660, 0.07, 0.09); },
      puerta: () => { this.tono(196, 0, 0.1); this.tono(147, 0.09, 0.14); },
      logro: () => [523, 659, 784, 1047].forEach((n, i) => this.tono(n, i * 0.09, 0.16)),
    }[nombre];
    f?.();
  }

  arrancarMusica() {
    if (this.timer || !this.ctx) return;
    this.timer = setInterval(() => {
      this.tono(NOTAS[this.paso % NOTAS.length], 0, 0.42, 0.012, 'triangle');
      this.paso += 1;
    }, 480);
  }

  cambiarMusica(activa) {
    this.musica = activa;
    localStorage.setItem('lv_musica', activa ? '1' : '0');
    if (activa) { this.iniciar(); this.arrancarMusica(); } else { clearInterval(this.timer); this.timer = null; }
  }

  cambiarEfectos(activos) {
    this.efectos = activos;
    localStorage.setItem('lv_efectos', activos ? '1' : '0');
  }
}

export const sonido = new Sonido();
