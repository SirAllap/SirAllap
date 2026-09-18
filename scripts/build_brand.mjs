// Exporta el kit del logo a brand/dpr/ (para el portfolio y cualquier otro uso).
//
//   node scripts/build_brand.mjs            # SVG
//   node scripts/build_brand.mjs --png      # y PNG transparentes (necesita google-chrome)
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { liquidMark, VIEWBOX } from './dpr.mjs';

const DIR = new URL('../brand/dpr/', import.meta.url);
const SEED = 20260918; // la versión "oficial": la del día en que se cerró el diseño
const TIGHT = [-6, -4, 197, 110]; // caja justa de la marca, sin margen para gotas
const w = (f, s) => writeFileSync(new URL(f, DIR), `${s}\n`);
const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" role="img" aria-label="DPR">${body}</svg>`;
const still = (theme, id) => liquidMark({ seed: SEED, theme, id, still: true });

mkdirSync(new URL('png/', DIR), { recursive: true });
w('dpr-black.svg', svg(TIGHT, still('light', 'b')));
w('dpr-white.svg', svg(TIGHT, still('dark', 'w')));
// una sola imagen que cambia de tinta con el tema del sistema
w('dpr.svg', svg(TIGHT, `<style>.ink-dark{display:none}@media (prefers-color-scheme:dark){.ink-dark{display:inline}.ink-light{display:none}}</style><g class="ink-light">${still('light', 'a')}</g><g class="ink-dark">${still('dark', 'c')}</g>`));
for (const t of ['dark', 'light']) w(`dpr-liquid-${t}.svg`, svg(VIEWBOX, liquidMark({ seed: SEED, theme: t, id: `l${t[0]}` })));

if (process.argv.includes('--png')) {
  const tmp = fileURLToPath(new URL('png/.render.html', DIR));
  for (const c of ['black', 'white']) {
    for (const px of [512, 1024, 2048]) {
      const h = Math.round((px * TIGHT[3]) / TIGHT[2]);
      writeFileSync(tmp, `<!doctype html><style>html,body{margin:0;background:transparent}img{display:block;width:${px}px}</style><img src="../dpr-${c}.svg">`);
      execFileSync('google-chrome', ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--default-background-color=00000000', '--hide-scrollbars',
        `--window-size=${px},${h}`, `--screenshot=${fileURLToPath(new URL(`png/dpr-${c}-${px}.png`, DIR))}`, `file://${tmp}`], { stdio: 'ignore' });
    }
  }
  execFileSync('rm', [tmp]);
}
console.log('brand/dpr listo');
