// Vela Report: panel final con las 4 dimensiones, patrones, microestrategias y misiones.
import { api } from './api.js';
import { aviso, h, mostrar, ocultar } from './ui.js';

function dimension(d) {
  const barra = h('i', { class: d.alert ? 'alerta' : '' });
  barra.style.width = `${d.value}%`;
  return h('div', { class: 'dim', title: `${d.label}: ${d.value}%` },
    h('div', { class: 'dim-cabecera' }, h('span', {}, d.label), h('b', {}, `${d.value}%`)),
    h('div', { class: 'dim-pista' }, barra),
    d.alert && h('p', { class: 'dim-alerta' }, `▲ ${d.alert}`));
}

export function velaReport(plan, juego) {
  return new Promise((fin) => {
    const misiones = plan.missions ?? [];
    const patrones = plan.patterns ?? [];
    const estrategias = plan.strategies ?? [];
    const texto = [...estrategias.map((e) => `Microestrategia: ${e}`), ...(plan.goals ?? []).map((m) => `Meta: ${m.goal} Pasos: ${m.steps.join(' ')}`), ...misiones.map((m) => `${m.task}: ${m.title} (${m.when}, ${m.minutes} min). ${m.detail}`)].join('\n');
    const marcar = (i) => async (e) => {
      const r = await api.post(`/week/missions/${i}/done`);
      juego.semana.plan = r.plan;
      juego.pintarRecursos(r.resources);
      e.target.disabled = true;
      e.target.textContent = 'Hecha ✓';
    };
    const copiar = h('button', { type: 'button', onclick: async () => {
      try { await navigator.clipboard.writeText(texto); aviso('Plan copiado'); } catch { aviso('No se pudo copiar. Puedes anotarlo.'); }
    } }, 'Copiar plan');
    const derivacion = plan.referral;
    mostrar(h('section', { class: 'consola reporte' },
      h('h2', {}, 'VELA REPORT'),
      h('p', {}, plan.summary),
      plan.dimensions && h('div', { class: 'dims' }, plan.dimensions.map(dimension)),
      h('h3', {}, '[patrones_recurrentes]'),
      patrones.length
        ? patrones.map((p) => h('div', { class: 'patron' },
          h('p', {}, h('b', {}, `${p.label} `), h('span', { class: 'tenue' }, `${p.tag} ×${p.count}`)),
          p.consequence && h('p', {}, p.consequence),
          h('p', { class: 'guia' }, `Ajuste: ${p.guidance}`)))
        : h('p', { class: 'linea' }, '> Ninguna decisión se repitió lo suficiente para ser un patrón.'),
      estrategias.length > 0 && h('div', {}, h('h3', {}, '[microestrategias]'), estrategias.map((e) => h('p', { class: 'linea' }, `> ${e}`))),
      (plan.goals ?? []).length > 0 && h('div', {}, h('h3', {}, '[metas_de_mejora]'), plan.goals.map((m) => h('div', { class: 'patron meta' },
        h('p', { class: 'tenue' }, m.situation),
        h('p', {}, h('b', {}, m.goal)),
        m.steps.map((p, i) => h('p', { class: 'linea' }, `${i + 1}. ${p}`)),
        h('p', { class: 'guia' }, `Logro: ${m.measure}`)))),
      h('h3', {}, '[misiones_por_actividad]'),
      misiones.map((m, i) => h('div', { class: 'mision-plan' },
        h('p', {}, h('b', {}, m.task)),
        h('p', { class: 'linea' }, `> ${m.title} | ${m.when} | ${m.minutes} min`),
        h('p', {}, m.detail),
        h('button', { type: 'button', class: 'secundario', disabled: Boolean(m.done), onclick: marcar(i) }, m.done ? 'Hecha ✓' : 'Marcar como hecha'))),
      derivacion && h('p', { class: 'derivacion' }, derivacion.text, derivacion.url && ' ',
        derivacion.url && h('a', { href: derivacion.url, target: '_blank', rel: 'noopener noreferrer' }, 'Ir a Bienestar Universitario')),
      h('p', { class: 'tenue' }, 'Análisis orientativo de un juego: no mide tu salud ni tu capacidad. Tú decides qué te sirve.'),
      h('div', { class: 'fila fin' }, copiar, h('button', { type: 'button', onclick: () => { ocultar(); fin(); } }, 'Cerrar'))));
  });
}
