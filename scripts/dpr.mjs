// Monograma DPR líquido, generado desde una semilla.
//
// Las formas salen de assets/dpr-pieces.json (vectorizado del arte original con
// scripts/trace_dpr.py): 9 piezas, la D con sus vetas y la R. La P es la R sin
// la pata. Todo pasa por un filtro "gooey" (desenfoque + umbral de alfa), así
// que lo que se acerca se une con un cuello de líquido y lo que se aleja se
// corta como una gota de verdad.
//
// El calor baja de izquierda a derecha: la D hierve (corriente fuerte y gotas
// que salen, flotan y vuelven o se evaporan), la P está templada (cortes cortos
// en los bordes, esquirlas y una burbuja) y la R está fría (casi solo respira).
//
// GitHub no ejecuta JS en un README: todo es SVG + SMIL + CSS. Lo procedural
// ocurre al generar; la Action lo regenera cada noche con la fecha como semilla.
import { readFileSync } from 'node:fs';

const R = JSON.parse(readFileSync(new URL('../assets/dpr-pieces.json', import.meta.url)));
const P = R.pieces.map((p) => p.d);
// 0 cuerpo, 1 ola de arriba de la D, 2/5 manchas, 7 punto, 4/8 barras de la D, 3/6 cortes de la R
const LET = [0, 1];
const FR = [2, 4, 5, 7, 8];
const ALL = P.map((_, i) => i);
const SHIFT = 57; // la R se desplaza para dejar sitio a la P
const LEG = '86,57 117,57 133,106 103,106'; // la pata de la R; fuera de ella queda la P
export const VIEWBOX = [-30, -12, 241, 126];

export const THEMES = {
  dark: { ink: '#f0f2f5', glow: [0.05, 0.16] },
  light: { ink: '#0d1117', glow: [0.03, 0.08] },
};

const paths = (ids, a = () => '') => ids.map((i) => `<path fill-rule="evenodd" d="${P[i]}" ${a(i)}/>`).join('');
const ks = (n) => Array(n).fill('.45 0 .55 1').join(';');

// Marca quieta (para miniaturas): mismas piezas, sin filtros ni movimiento.
export function staticMark(ink, k = 's') {
  return `<defs><clipPath id="${k}l"><rect x="-40" y="-30" width="104.6" height="170"/></clipPath><clipPath id="${k}r"><rect x="64" y="-30" width="120" height="170"/></clipPath><clipPath id="${k}r2"><rect x="66.6" y="-30" width="120" height="170"/></clipPath>
  <mask id="${k}n" maskUnits="userSpaceOnUse" x="-40" y="-30" width="280" height="170"><rect x="-40" y="-30" width="280" height="170" fill="#fff"/><polygon points="${LEG}" fill="#000"/></mask></defs>
  <g fill="${ink}"><g clip-path="url(#${k}l)">${paths(LET)}</g>${paths(FR)}
   <g clip-path="url(#${k}r)"><g mask="url(#${k}n)">${paths([0])}</g></g>${paths([3])}
   <g transform="translate(${SHIFT},0)"><g clip-path="url(#${k}r2)">${paths([0])}</g>${paths([3, 6])}</g></g>`;
}

// still: la misma marca congelada (sin animación ni halo), para PNG, favicon o impresión.
export function liquidMark({ seed, theme, id = 'dpr', still = false }) {
  let s = (seed % 2147483646) + 1;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const { ink, glow } = THEMES[theme];
  const k = id;
  const SEED = seed;
  let css = '';
  let defs = '';

  // corrientes: ruido horizontal que deforma las vetas; más fuerte cuanto más caliente
  const current = (fid, fq, fq2, sc, dur, sd) => `<filter id="${fid}" x="-40" y="-30" width="280" height="170" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="${fq}" numOctaves="2" seed="${(SEED + sd) % 89}"><animate attributeName="baseFrequency" values="${fq};${fq2};${fq}" dur="${dur}s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" xChannelSelector="R" yChannelSelector="G" scale="${sc[0]}"><animate attributeName="scale" values="${sc.join(';')}" dur="${(dur * 0.8).toFixed(1)}s" repeatCount="indefinite"/></feDisplacementMap></filter>`;
  defs += current(`${k}w`, '0.014 0.10', '0.022 0.08', [2, 3.4, 2], 9, 3);
  defs += current(`${k}wP`, '0.02 0.07', '0.03 0.055', [1.2, 2.6, 1.2], 11, 7);
  defs += current(`${k}wR`, '0.018 0.05', '0.026 0.04', [0.6, 1.4, 0.6], 14, 9);
  // goo: desenfoque y umbral duro de alfa = tensión superficial
  defs += `<filter id="${k}goo" x="-40" y="-30" width="280" height="170" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation=".65"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -14"/></filter>`;
  defs += `<filter id="${k}blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter>`;
  // la corriente fuerte solo en el borde deshecho de la D, fundida con la D quieta
  const band = (mid, inv) => {
    const [a, b] = [0.3, 0.5];
    const st = inv
      ? `<stop offset="${a}" stop-color="#fff" stop-opacity="0"/><stop offset="${b}" stop-color="#fff"/>`
      : `<stop offset="${a}" stop-color="#fff"/><stop offset="${b}" stop-color="#fff" stop-opacity="0"/>`;
    return `<linearGradient id="${mid}g" x1="0" x2="130" y1="0" y2="0" gradientUnits="userSpaceOnUse">${st}</linearGradient><mask id="${mid}" maskUnits="userSpaceOnUse" x="-40" y="-30" width="280" height="170"><rect x="-40" y="-30" width="280" height="170" fill="url(#${mid}g)"/></mask>`;
  };
  defs += band(`${k}wm`, 0) + band(`${k}sm`, 1);
  defs += `<mask id="${k}nl" maskUnits="userSpaceOnUse" x="-40" y="-30" width="280" height="170"><rect x="-40" y="-30" width="280" height="170" fill="#fff"/><polygon points="${LEG}" fill="#000"/></mask>`;
  defs += `<g id="${k}L">${paths(LET)}</g><g id="${k}F">${paths([0])}</g><g id="${k}P"><g mask="url(#${k}nl)">${paths([0])}</g></g>`;
  // la P y la R pasan por un redondeo suave para casar con las curvas de la D
  defs += `<filter id="${k}rnd" x="40" y="-20" width="190" height="140" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="1.25"/><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -7.4"/></filter>`;
  defs += `<clipPath id="${k}lft"><rect x="-40" y="-30" width="104.6" height="170"/></clipPath><clipPath id="${k}rgt"><rect x="64" y="-30" width="120" height="170"/></clipPath><clipPath id="${k}rgt2"><rect x="66.6" y="-30" width="120" height="170"/></clipPath>`;

  // piezas sueltas de la D: cada una va y viene a su ritmo
  FR.forEach((i) => {
    const dx = (2.2 + rnd() * 2.8).toFixed(1);
    const dy = ((rnd() - 0.5) * 3.5).toFixed(1);
    css += `.${k}f${i}{transform-box:fill-box;transform-origin:center;animation:${k}d${i} ${(4.5 + rnd() * 3).toFixed(1)}s ${(-rnd() * 6).toFixed(1)}s cubic-bezier(.45,0,.55,1) infinite alternate}@keyframes ${k}d${i}{to{transform:translate(-${dx}px,${dy}px) rotate(${((rnd() - 0.5) * 8).toFixed(1)}deg)}}`;
  });

  // periodos primos: las gotas se desfasan y el conjunto no se repite a la vista
  const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41].sort(() => rnd() - 0.5);

  // gotas de lámpara de lava: se hinchan en el borde de la D, estiran un cuello
  // que adelgaza y se rompe, flotan y vuelven a fundirse o se evaporan de golpe
  const EM = R.emit.filter(([x]) => x < 16).map(([x, y]) => [x, y + (rnd() - 0.5) * 4]).sort(() => rnd() - 0.5);
  let drops = '';
  EM.slice(0, 8).forEach(([x0, y0], i) => {
    const r = 3 + rnd() * 1.8;
    const d = (PRIMES[i % PRIMES.length] * (0.8 + rnd() * 0.4)).toFixed(1);
    const b = (-rnd() * 14).toFixed(1);
    const dx = -(11 + rnd() * 9);
    const dy = (rnd() - 0.5) * 14;
    const evap = rnd() < 0.45;
    const X = (v) => (x0 + v).toFixed(2);
    const Y = (v) => (y0 + v).toFixed(2);
    const Rr = (v) => (r * v).toFixed(2);
    const T = `dur="${d}s" begin="${b}s" repeatCount="indefinite" calcMode="spline"`;
    const KT = '0;.22;.42;.5;.75;.9;1';
    // al evaporarse desaparece en un instante, sin dejar motas diminutas
    const rAnim = evap
      ? `<animate attributeName="r" values="${Rr(0.5)};${Rr(1)};${Rr(1)};${Rr(0.9)};${Rr(0.8)};0;0" keyTimes="0;.22;.42;.5;.75;.78;1" keySplines="${ks(6)}" ${T}/>`
      : `<animate attributeName="r" values="${Rr(0.5)};${Rr(1)};${Rr(1)};${Rr(0.95)};${Rr(0.9)};${Rr(0.95)};${Rr(0.5)}" keyTimes="${KT}" keySplines="${ks(6)}" ${T}/>`;
    drops += `<circle r="0"><animate attributeName="cx" values="${X(r * 0.5)};${X(-r * 0.5)};${X(-r * 2.4)};${X(-r * 3)};${X(dx)};${evap ? X(dx) : X(-r * 2.2)};${X(r * 0.5)}" keyTimes="${KT}" keySplines="${ks(6)}" ${T}/><animate attributeName="cy" values="${Y(0)};${Y(0)};${Y(dy * 0.1)};${Y(dy * 0.2)};${Y(dy)};${evap ? Y(dy) : Y(dy * 0.2)};${Y(0)}" keyTimes="${KT}" keySplines="${ks(6)}" ${T}/>${rAnim}</circle>`;
    // el cuello: une la gota al borde, adelgaza, se rompe y reaparece al volver
    drops += `<circle r="0"><animate attributeName="cx" values="${X(0)};${X(-r * 0.2)};${X(-r * 1.1)};${X(-r * 1.5)};${X(-r * 1.3)};${X(-r * 0.9)};${X(0)}" keyTimes="${KT}" keySplines="${ks(6)}" ${T}/><animate attributeName="cy" values="${Y(0)};${Y(0)};${Y(dy * 0.05)};${Y(dy * 0.1)};${Y(dy * 0.1)};${Y(dy * 0.08)};${Y(0)}" keyTimes="${KT}" keySplines="${ks(6)}" ${T}/><animate attributeName="r" values="${Rr(0.6)};${Rr(0.7)};${Rr(0.38)};0;0;${evap ? 0 : Rr(0.45)};${Rr(0.6)}" keyTimes="${KT}" keySplines="${ks(6)}" ${T}/></circle>`;
  });

  // cortes ondulados que muerden los bordes de la P (más) y la R (menos)
  const cut = (x, y, len, dir) => {
    const a = (1 + rnd() * 1.6) * (rnd() < 0.5 ? -1 : 1);
    const e = x + dir * len;
    return `<path d="M${(x - dir * 3).toFixed(1)} ${y.toFixed(1)} C${(x + dir * len * 0.35).toFixed(1)} ${(y - a).toFixed(1)} ${(x + dir * len * 0.65).toFixed(1)} ${(y + a).toFixed(1)} ${e.toFixed(1)} ${(y + a * 0.4).toFixed(1)}" fill="none" stroke="#000" stroke-width="${(1.1 + rnd() * 0.7).toFixed(2)}" stroke-linecap="round"/>`;
  };
  const cuts = (mid, nL, nR, maxL) => {
    const ys = [8, 20, 32, 70, 84, 94].sort(() => rnd() - 0.5);
    let o = '';
    for (let i = 0; i < nL; i++) o += cut(65.5, ys[i] + (rnd() - 0.5) * 4, 5 + rnd() * maxL, 1);
    for (let i = 0; i < nR; i++) o += cut(123, 14 + rnd() * 30, 4 + rnd() * maxL * 0.7, -1);
    return `<mask id="${mid}" maskUnits="userSpaceOnUse" x="40" y="-30" width="120" height="170"><rect x="40" y="-30" width="120" height="170" fill="#fff"/>${o}</mask>`;
  };
  defs += cuts(`${k}pc`, 3, 1, 11) + cuts(`${k}rc`, 2, 0, 7);

  // esquirlas desprendidas que flotan junto al borde
  const chip = (x, y, r0) => {
    const d = (PRIMES[Math.floor(rnd() * PRIMES.length)] * 0.7).toFixed(1);
    const dx = -(1.5 + rnd() * 2.5);
    const dy = (rnd() - 0.5) * 3;
    return `<circle cx="${x}" cy="${y.toFixed(1)}" r="${r0.toFixed(2)}"><animateTransform attributeName="transform" type="translate" values="0 0;${dx.toFixed(1)} ${dy.toFixed(1)};0 0" dur="${d}s" begin="-${(rnd() * 9).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="${ks(2)}"/></circle>`;
  };
  const pChips = chip(62.8, 14 + rnd() * 20, 1.3 + rnd() * 0.6) + chip(62.5, 68 + rnd() * 20, 1.3 + rnd() * 0.5);
  const rChips = chip(63, 40 + rnd() * 40, 1.1 + rnd() * 0.5);

  // puentes de líquido entre la P y la R: uno respira, el otro se rompe y se rehace
  const bridge = (y, w0, w1, w2, per) => {
    const a = (0.8 + rnd() * 1.2) * (rnd() < 0.5 ? -1 : 1);
    const d = `M115 ${y.toFixed(1)} C119 ${(y - a).toFixed(1)} 124 ${(y + a).toFixed(1)} 130 ${(y + a * 0.3).toFixed(1)}`;
    return `<path d="${d}" fill="none" stroke="${ink}" stroke-linecap="round" stroke-width="${w0}"><animate attributeName="stroke-width" values="${w0};${w1};${w2};${w1};${w0}" keyTimes="0;.3;.5;.7;1" dur="${per}s" begin="-${(rnd() * per).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="${ks(4)}"/></path>`;
  };
  const bridges = bridge(16 + rnd() * 10, 2.6, 3.2, 2.2, PRIMES[2]) + bridge(38 + rnd() * 10, 0, 2.2, 3, PRIMES[3]);

  // burbuja templada que asoma por arriba de la P y se vuelve a hundir
  const pT = `dur="${PRIMES[0] + PRIMES[1]}s" begin="-${(rnd() * 20).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="${ks(4)}"`;
  const pDrop = `<circle cx="${(90 + rnd() * 20).toFixed(1)}" r="0"><animate attributeName="cy" values="2;0;-3;0;2" keyTimes="0;.25;.55;.85;1" ${pT}/><animate attributeName="r" values="1.8;2.8;2.4;2.8;1.8" keyTimes="0;.25;.55;.85;1" ${pT}/></circle>`;

  css += `.${k}g{animation:${k}gb 8s ease-in-out infinite}@keyframes ${k}gb{0%,100%{opacity:${glow[0]}}50%{opacity:${glow[1]}}}`;
  css += `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

  const halo = still ? '' : `<style>${css}</style><g class="${k}g" fill="${ink}" filter="url(#${k}blur)">${paths(ALL)}</g>`;
  const inner = `<defs>${defs}</defs>${halo}
  <g filter="url(#${k}goo)" fill="${ink}">
   <g clip-path="url(#${k}lft)"><g mask="url(#${k}wm)"><g filter="url(#${k}w)"><use href="#${k}L"/></g></g><g mask="url(#${k}sm)"><use href="#${k}L"/></g></g>
   <g filter="url(#${k}rnd)">
    <g filter="url(#${k}wP)"><g mask="url(#${k}pc)"><g clip-path="url(#${k}rgt)"><use href="#${k}P"/></g>${paths([3])}</g>${pChips}${pDrop}</g>
    <g transform="translate(${SHIFT},0)"><g filter="url(#${k}wR)"><g mask="url(#${k}rc)"><g clip-path="url(#${k}rgt2)"><use href="#${k}F"/></g>${paths([3, 6])}</g>${rChips}</g></g>
   </g>
   <g filter="url(#${k}w)">${paths(FR, (i) => `class="${k}f${i}"`)}</g>
   ${bridges}
   ${drops}
  </g>`;
  return still ? inner.replace(/<animate(Transform)?\b[^>]*\/>/g, '') : inner;
}
