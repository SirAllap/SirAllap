/**
 * Genera preview/index.html a partir de los markdown reales.
 *
 *   npm i marked && node preview/build.mjs
 *
 * Lo que ves en la maqueta sale de los mismos ficheros que copiarias a
 * README.md, asi que no puede divergir. Los SVG propios (hero + snake) se
 * incrustan como data URI: se animan igual que en GitHub y la maqueta
 * funciona sin red.
 */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const require = createRequire(import.meta.url);
let marked;
for (const p of [process.env.MARKED_PATH, 'marked',
  path.join(ROOT, 'node_modules/marked')]) {
  if (!p) continue;
  try { ({ marked } = require(p)); break; } catch { /* siguiente */ }
}
if (!marked) {
  console.error('Falta marked. Ejecuta:  npm i marked');
  process.exit(1);
}
marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });

const dataUri = (rel) =>
  'data:image/svg+xml;base64,' +
  readFileSync(path.join(ROOT, rel)).toString('base64');

const ASSETS = {
  'assets/hero-light.svg': dataUri('assets/hero-light.svg'),
  'assets/hero-dark.svg': dataUri('assets/hero-dark.svg'),
  'assets/snake.svg': dataUri('assets/snake.svg'),
  'assets/snake-dark.svg': dataUri('assets/snake-dark.svg'),
};

/** Sustituye las URLs raw.githubusercontent por los assets locales. */
function inlineAssets(html) {
  for (const [rel, uri] of Object.entries(ASSETS)) {
    const url = `https://raw.githubusercontent.com/SirAllap/SirAllap/main/${rel}`;
    html = html.split(url).join(uri);
  }
  return html;
}

/**
 * <picture> + prefers-color-scheme sigue al SO, no al conmutador de la
 * maqueta. Lo convertimos en dos <img> que controla la clase de tema, que
 * es exactamente lo que GitHub acaba haciendo con su ajuste de tema.
 */
function splitPictures(html) {
  return html.replace(/<picture>([\s\S]*?)<\/picture>/g, (_, inner) => {
    const dark = inner.match(/<source[^>]*prefers-color-scheme:\s*dark[^>]*srcset="([^"]+)"/i);
    const img = inner.match(/<img[^>]*>/i);
    if (!img) return inner;
    const light = img[0];
    if (!dark) return light;
    const darkImg = light.replace(/src="[^"]*"/, `src="${dark[1]}"`);
    return `<span class="only-light">${light}</span>` +
           `<span class="only-dark">${darkImg}</span>`;
  });
}

const render = (file) =>
  splitPictures(inlineAssets(marked.parse(readFileSync(file, 'utf8'))));

const VARIANTS = [
  {
    id: 'signature',
    tab: 'A · Signature',
    kicker: 'Recomendada',
    file: path.join(HERE, 'variants/signature.md'),
    lead: 'Un solo golpe visual arriba —tu logo, animado— y debajo, un único proyecto: agentglass.',
    notes: [
      ['Tu logo, vectorizado y animado',
       'Tu <code>dpr_dark.png</code> era un PNG de 318×266: borroso al escalar, sin versión clara, imposible de animar. Ahora son 9 formas independientes que entran desplazadas desde la izquierda y se recomponen en ~1,2 s. Los fragmentos sueltos siguen temblando cada 11 s.'],
      ['Solo agentglass en la sección de trabajo',
       'Lo demás bajó a <code>&lt;details&gt;</code>, plegado. Un perfil con un proyecto fuerte pesa más que uno con cuatro medianos.'],
      ['Misma identidad que serallap.com',
       'El hero va en Tokyo Night —tu paleta real— en vez del teal que me inventé: <code>#bb9af7</code> en oscuro y <code>#8b5cf6</code> (de tu propia lista ACCENTS) en claro, que <code>#bb9af7</code> no aguanta sobre blanco.'],
      ['Hero propio, no un GIF de catálogo',
       'Logo + nombre arriba, tecleo con cursor abajo, lanes de telemetría a la derecha. Cuatro animaciones CSS, cero servicios de terceros, nadie más lo tiene.'],
      ['Los iconos pasan de 4 bloques a 1 fila',
       'Cuatro secciones con <code>---</code> entre ellas fragmentaban la página y hacían scroll. Mismos iconos, una sola fila, una sola sección.'],
      ['Fuera el contador de visitas y los GIFs de relleno',
       'Ruido, tracking de terceros y dos imágenes que no dicen nada de ti.'],
      ['Las estrellas salen de shields.io, en vivo',
       'Un número escrito a mano envejece; a los tres meses parece abandono.'],
    ],
  },
  {
    id: 'scalpel',
    tab: 'B · Bisturí',
    kicker: 'El extremo',
    file: path.join(HERE, 'variants/scalpel.md'),
    lead: 'El polo opuesto: cero imágenes. Es la vía de Dev-next-gen, el perfil más serio de los que mandaste.',
    notes: [
      ['Ni una sola imagen',
       'Sin hero, sin iconos, sin serpiente. Todo el peso lo lleva lo que dices. Carga instantánea, se lee igual en móvil, no se rompe nunca.'],
      ['Funciona solo si cada línea es un hecho',
       'Es el truco de Dev-next-gen: no hay adorno que tape una frase vacía. Por eso desaparece el “I care about: clean architecture”.'],
      ['Lo pongo como referencia, no como recomendación',
       'Marca el límite de “menos es más”. Lo bueno de verlo es que te deja elegir un punto entre A y B a conciencia.'],
    ],
  },
  {
    id: 'current',
    tab: 'Actual',
    kicker: 'Lo que hay hoy',
    file: path.join(ROOT, 'README.md'),
    lead: 'Tu README en producción ahora mismo, renderizado aquí para comparar de verdad.',
    notes: [
      ['85 líneas, 6 reglas horizontales, 22 iconos, 0 proyectos',
       'Un perfil que enumera tecnologías en vez de enseñar trabajo se lee como alguien que está empezando. Tú llevas 4 años y tienes una herramienta con 299 estrellas.'],
      ['Los repos fijados son de bootcamp',
       'hotel_miranda, OxygenShop, app-photos, node_app: 2022–2024. Mientras tanto agentglass, waybar-scripts-collection, quickshell-popups y ccusage-gnome no aparecen por ningún lado.'],
      ['Los GIFs son de la lista de Anmol-Baranwal',
       'El de arriba está en miles de perfiles. Un hero propio cuesta lo mismo y no lo tiene nadie.'],
      ['<code>assets/file.css</code> está vacío',
       'Archivo de 0 bytes en el repo. Lo dejo sin tocar, pero bórralo.'],
    ],
  },
];

const panels = VARIANTS.map((v) => `
<section class="panel" data-variant="${v.id}">
  <div class="frame">
    <div class="frame-bar">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      <span class="frame-path">github.com / <b>SirAllap</b></span>
    </div>
    <article class="markdown-body">${render(v.file)}</article>
  </div>
  <aside class="rail">
    <p class="rail-lead">${v.lead}</p>
    ${v.notes.map(([h, b]) => `<div class="note"><h4>${h}</h4><p>${b}</p></div>`).join('')}
  </aside>
  <p class="foot">${v.id === 'current'
    ? 'Este es el README que hay en <code>main</code> ahora mismo. No lo he tocado.'
    : `Para dejarlo asi en el perfil: <code>cp preview/variants/${v.id}.md README.md</code>` +
      ' — el hero ya esta en <code>assets/</code>, y se regenera con' +
      ' <code>python3 scripts/build_hero.py</code>.'}</p>
</section>`).join('');

const tabs = VARIANTS.map((v, i) => `
  <button class="tab${i === 0 ? ' on' : ''}" data-go="${v.id}">
    <span>${v.tab}</span><em>${v.kicker}</em>
  </button>`).join('');

const html = readFileSync(path.join(HERE, 'template.html'), 'utf8')
  .replace('<!--TABS-->', tabs)
  .replace('<!--PANELS-->', panels)
  .replace('<!--FIRST-->', VARIANTS[0].id);

const out = path.join(HERE, 'index.html');
writeFileSync(out, html);
console.log(`${out}  ${(html.length / 1024).toFixed(0)} KB`);
