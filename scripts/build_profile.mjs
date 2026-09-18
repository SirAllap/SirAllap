// Genera todos los SVG del perfil y el README.
//
//   GITHUB_TOKEN=... node scripts/build_profile.mjs [semilla]
//
// Sin token usa los datos guardados en assets/profile-data.json. La semilla por
// defecto es la fecha de hoy (AAAAMMDD), así el logo cambia cada día.
// Cada bloque sale en cuatro ficheros: {oscuro, claro} x {escritorio, móvil};
// el README los elige con <picture> según el tema y el ancho de pantalla.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { liquidMark, staticMark, VIEWBOX } from './dpr.mjs';

const ROOT = new URL('../', import.meta.url);
const out = (name, svg) => writeFileSync(new URL(`assets/${name}`, ROOT), `${svg.trim()}\n`);
const USER = 'SirAllap';
const today = new Date().toISOString().slice(0, 10);
const SEED = Number(process.argv[2] || today.replaceAll('-', ''));
const ICONS = JSON.parse(readFileSync(new URL('scripts/icons.json', ROOT)));

const K = {
  dark: { fg: '#f0f2f5', text: '#c9d1d9', dim: '#8b949e', faint: '#6e7681', line: '#262c36', card: '#0f141b', well: '#0b0f15',
    city: ['#1c222b', '#3a424e', '#5d6673', '#9aa3ae', '#f0f2f5'], hold: '#d29922' },
  light: { fg: '#0d1117', text: '#1f2328', dim: '#59636e', faint: '#818b98', line: '#d1d9e0', card: '#f6f8fa', well: '#ffffff',
    city: ['#eff2f5', '#d1d9e0', '#9aa4b0', '#59636e', '#1f2328'], hold: '#9a6700' },
};
const MONO = 'font-family="ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace"';
const svg = (w, h, body, label = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${label ? ` role="img" aria-label="${label}"` : ''}>${body}</svg>`;

// ---------- datos ----------
async function loadData() {
  const cache = new URL('assets/profile-data.json', ROOT);
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    if (!existsSync(cache)) throw new Error('Sin GITHUB_TOKEN y sin assets/profile-data.json');
    return JSON.parse(readFileSync(cache));
  }
  const query = `{ user(login:"${USER}"){ contributionsCollection{ contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount contributionLevel } } } } }
    repository(owner:"${USER}", name:"agentglass"){ stargazerCount } }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (!json.data) throw new Error(JSON.stringify(json.errors || json));
  const cal = json.data.user.contributionsCollection.contributionCalendar;
  const LV = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  // por día: [nivel 0-4 que da GitHub, número de contribuciones]
  const weeks = cal.weeks.map((w) => w.contributionDays.map((d) => [LV[d.contributionLevel] ?? 0, d.contributionCount]));
  let longest = 0;
  let run = 0;
  for (const d of cal.weeks.flatMap((w) => w.contributionDays)) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const data = { total: cal.totalContributions, longest, weeks, stars: json.data.repository.stargazerCount, fetched: today };
  writeFileSync(cache, `${JSON.stringify(data)}\n`);
  return data;
}

// ---------- cabecera: el único bloque que se mueve ----------
const [vx, vy, vw, vh] = VIEWBOX;
const mark = (t, x, y, w) => `<svg x="${x}" y="${y}" width="${w}" height="${(w * vh / vw).toFixed(1)}" viewBox="${VIEWBOX.join(' ')}" overflow="visible">${liquidMark({ seed: SEED, theme: t, id: `d${t[0]}` })}</svg>`;
const header = {
  d: (t, c) => svg(880, 240, `${mark(t, 0, 20, 380)}
    <text x="408" y="112" ${MONO} font-size="44" font-weight="700" fill="${c.fg}" letter-spacing="-1">David Pallarés</text>
    <text x="410" y="148" ${MONO} font-size="15" fill="${c.dim}">backend engineer · sevilla</text>
    <line x1="410" x2="872" y1="176" y2="176" stroke="${c.line}"/>
    <text x="872" y="202" text-anchor="end" ${MONO} font-size="13" fill="${c.faint}">@${USER}</text>`, 'David Pallarés'),
  m: (t, c) => svg(400, 340, `${mark(t, 24, 8, 352)}
    <text x="200" y="262" text-anchor="middle" ${MONO} font-size="32" font-weight="700" fill="${c.fg}" letter-spacing="-.5">David Pallarés</text>
    <text x="200" y="294" text-anchor="middle" ${MONO} font-size="14" fill="${c.dim}">backend engineer</text>
    <text x="200" y="316" text-anchor="middle" ${MONO} font-size="14" fill="${c.dim}">sevilla</text>`, 'David Pallarés'),
};

// ---------- work ----------
const chip = (c, x, y, t, s) => {
  const w = t.length * s * 0.62 + 18;
  return [`<rect x="${x}" y="${y}" width="${w.toFixed(0)}" height="${s + 13}" rx="${(s + 13) / 2}" fill="none" stroke="${c.line}"/><text x="${x + 9}" y="${y + s + 4}" ${MONO} font-size="${s}" fill="${c.dim}">${t}</text>`, w];
};
const chips = (c, x, y, list, s) => list.map((t) => { const [o, w] = chip(c, x, y, t, s); x += w + 8; return o; }).join('');
const star = (cx, cy, R, fill) => {
  let p = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * 0.45 : R;
    const an = -Math.PI / 2 + (i * Math.PI) / 5;
    p += `${i ? 'L' : 'M'}${(cx + r * Math.cos(an)).toFixed(1)} ${(cy + r * Math.sin(an)).toFixed(1)}`;
  }
  return `<path d="${p}Z" fill="${fill}" stroke="${fill}" stroke-width="${(R * 0.12).toFixed(1)}" stroke-linejoin="round"/>`;
};
const badge = (c, x, y, s, stars) => `<rect x="${x}" y="${y}" width="${150 * s}" height="${64 * s}" rx="${14 * s}" fill="${c.well}" stroke="${c.line}"/>${star(x + 34 * s, y + 32 * s, 17 * s, c.fg)}
  <text x="${x + 62 * s}" y="${y + 34 * s}" ${MONO} font-size="${28 * s}" font-weight="700" fill="${c.fg}">${stars}</text><text x="${x + 63 * s}" y="${y + 51 * s}" ${MONO} font-size="${10 * s}" fill="${c.dim}" letter-spacing="1.5">STARS</text>`;
const lanes = (c, x, y, w) => ['Claude Code', 'Codex', 'Gemini CLI', 'OpenCode'].map((n, i) => {
  const yy = y + i * 24;
  const bw = [0.82, 0.58, 0.4, 0.26][i] * w;
  const hold = i === 3;
  return `<circle cx="${x + 4}" cy="${yy - 4}" r="3" fill="${hold ? c.hold : c.fg}" opacity="${hold ? 1 : 0.9 - i * 0.2}"/><text x="${x + 14}" y="${yy}" ${MONO} font-size="12" fill="${c.dim}">${n}</text><rect x="${x + 110}" y="${yy - 8}" width="${w}" height="6" rx="3" fill="${c.line}"/><rect x="${x + 110}" y="${yy - 8}" width="${bw.toFixed(0)}" height="6" rx="3" fill="${c.fg}" opacity="${(1 - i * 0.2).toFixed(1)}"/>${hold ? `<text x="${x + 110 + w}" y="${yy + 14}" text-anchor="end" ${MONO} font-size="10" fill="${c.hold}">⏸ hold · rm -rf ./build</text>` : ''}`;
}).join('');
const glass = {
  d: (t, c, D) => svg(880, 250, `<rect x=".5" y=".5" width="879" height="249" rx="14" fill="${c.card}" stroke="${c.line}"/>
    <text x="32" y="64" ${MONO} font-size="32" font-weight="700" fill="${c.fg}">agentglass</text>
    <text x="32" y="104" ${MONO} font-size="15" fill="${c.dim}">Every AI coding agent on your machine,</text>
    <text x="32" y="126" ${MONO} font-size="15" fill="${c.dim}">on one screen. Nothing leaves the machine.</text>
    ${chips(c, 32, 196, ['Bun', 'SQLite', 'React', 'Electron'], 13)}
    ${badge(c, 698, 28, 1, D.stars)}
    <line x1="500" x2="500" y1="36" y2="214" stroke="${c.line}"/>
    ${lanes(c, 530, 128, 208)}`, 'agentglass'),
  m: (t, c, D) => svg(400, 390, `<rect x=".5" y=".5" width="399" height="389" rx="14" fill="${c.card}" stroke="${c.line}"/>
    <text x="22" y="52" ${MONO} font-size="26" font-weight="700" fill="${c.fg}">agentglass</text>
    ${badge(c, 22, 74, 0.9, D.stars)}
    <text x="22" y="164" ${MONO} font-size="14" fill="${c.dim}">Every AI coding agent on your</text>
    <text x="22" y="184" ${MONO} font-size="14" fill="${c.dim}">machine, on one screen.</text>
    <text x="22" y="204" ${MONO} font-size="14" fill="${c.dim}">Nothing leaves the machine.</text>
    ${lanes(c, 22, 236, 236)}
    ${chips(c, 22, 344, ['Bun', 'SQLite', 'React', 'Electron'], 12)}`, 'agentglass'),
};
const browser = (t, c, x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${c.well}" stroke="${c.line}"/><line x1="${x}" x2="${x + w}" y1="${y + 22}" y2="${y + 22}" stroke="${c.line}"/>
  <text x="${x + w / 2}" y="${y + 15}" text-anchor="middle" ${MONO} font-size="10" fill="${c.faint}">serallap.com</text>
  <svg x="${x + 16}" y="${y + 36}" width="70" height="${(70 * vh / vw).toFixed(1)}" viewBox="${VIEWBOX.join(' ')}">${staticMark(c.fg, `s${t[0]}${x}`)}</svg>
  <rect x="${x + 98}" y="${y + 44}" width="${w * 0.3}" height="8" rx="2" fill="${c.text}" opacity=".7"/><rect x="${x + 98}" y="${y + 60}" width="${w * 0.46}" height="5" rx="2" fill="${c.faint}" opacity=".6"/><rect x="${x + 98}" y="${y + 71}" width="${w * 0.38}" height="5" rx="2" fill="${c.faint}" opacity=".6"/>
  <rect x="${x + 18}" y="${y + h - 30}" width="64" height="16" rx="4" fill="${c.fg}" opacity=".85"/>`;
const site = {
  d: (t, c) => svg(880, 200, `<rect x=".5" y=".5" width="879" height="199" rx="14" fill="${c.card}" stroke="${c.line}"/>
    <text x="32" y="58" ${MONO} font-size="28" font-weight="700" fill="${c.fg}">serallap.com</text>
    <text x="32" y="96" ${MONO} font-size="15" fill="${c.dim}">Everything else I build, in one place.</text>
    <text x="32" y="162" ${MONO} font-size="15" fill="${c.fg}">Open the portfolio →</text>
    ${browser(t, c, 560, 26, 290, 148)}`, 'serallap.com'),
  m: (t, c) => svg(400, 300, `<rect x=".5" y=".5" width="399" height="299" rx="14" fill="${c.card}" stroke="${c.line}"/>
    ${browser(t, c, 22, 22, 356, 140)}
    <text x="22" y="208" ${MONO} font-size="24" font-weight="700" fill="${c.fg}">serallap.com</text>
    <text x="22" y="236" ${MONO} font-size="14" fill="${c.dim}">Everything else I build.</text>
    <text x="22" y="270" ${MONO} font-size="14" fill="${c.fg}">Open the portfolio →</text>`, 'serallap.com'),
};

// ---------- stack: marcas de Simple Icons (CC0) ----------
const GROUPS = [
  ['AT WORK', [['python', 'Python'], ['django', 'Django'], ['postgresql', 'Postgres'], ['docker', 'Docker'], ['amazonwebservices', 'AWS'], ['nginx', 'Nginx']]],
  ['BUILDING TOOLS', [['bun', 'Bun'], ['typescript', 'TypeScript'], ['react', 'React'], ['sqlite', 'SQLite'], ['electron', 'Electron'], ['tauri', 'Tauri']]],
  ['MY DESK', [['linux', 'Linux'], ['hyprland', 'Hyprland'], [null, 'Quickshell'], ['tmux', 'tmux'], ['neovim', 'Neovim']]],
];
const tile = (c, x, y, w, h, [ic, name]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${c.card}" stroke="${c.line}"/>
  ${ic ? `<g transform="translate(${x + w / 2 - 15},${y + 16}) scale(1.25)" fill="${c.fg}"><path d="${ICONS[ic]}"/></g>` : `<text x="${x + w / 2}" y="${y + 40}" text-anchor="middle" ${MONO} font-size="24" font-weight="700" fill="${c.fg}">&gt;_</text>`}
  <text x="${x + w / 2}" y="${y + h - 14}" text-anchor="middle" ${MONO} font-size="12" fill="${c.text}">${name}</text>`;
const stack = {
  d: (t, c) => {
    let s = '';
    GROUPS.forEach(([g, items], r) => {
      const y = r * 112;
      g.split(' ').forEach((w, j) => { s += `<text x="0" y="${y + 48 + j * 16}" ${MONO} font-size="11" fill="${c.faint}" letter-spacing="2">${w}</text>`; });
      items.forEach((it, i) => { s += tile(c, 142 + i * 123, y + 4, 113, 94, it); });
    });
    return svg(880, 334, s, 'Stack');
  },
  m: (t, c) => {
    let s = '';
    let y = 0;
    GROUPS.forEach(([g, items]) => {
      s += `<text x="0" y="${y + 14}" ${MONO} font-size="11" fill="${c.faint}" letter-spacing="2">${g}</text>`;
      y += 26;
      items.forEach((it, i) => { s += tile(c, (i % 3) * 134, y + Math.floor(i / 3) * 104, 124, 94, it); });
      y += Math.ceil(items.length / 3) * 104 + 18;
    });
    return svg(400, y - 18, s, 'Stack');
  },
};

// ---------- actividad: el año de contribuciones como ciudad isométrica ----------
function towers(c, weeks, ox, oy, s) {
  // altura por raíz del número de contribuciones: se ven los días flojos y los picos
  const max = Math.max(1, ...weeks.flat().map(([, n]) => n));
  let o = '';
  weeks.forEach((days, col) => days.forEach(([v, n], row) => {
    const h = (3 + 66 * Math.sqrt(n / max)) * s;
    const bx = ox + (col - row) * 12.5 * s;
    const by = oy + (col + row) * 6.2 * s;
    const w = 12 * s;
    const q = 6 * s;
    const f = c.city[v];
    o += `<g transform="translate(${bx.toFixed(1)},${by.toFixed(1)})"><path d="M0 ${(-h).toFixed(1)} l${w} ${-q} l${w} ${q} l${-w} ${q}z" fill="${f}"/><path d="M0 ${(-h).toFixed(1)} l${w} ${q} v${h.toFixed(1)} l${-w} ${-q}z" fill="${f}" opacity=".8"/><path d="M${2 * w} ${(-h).toFixed(1)} l${-w} ${q} v${h.toFixed(1)} l${w} ${-q}z" fill="${f}" opacity=".55"/></g>`;
  }));
  return o;
}
const stat = (c, x, y, n, l, anc = 'end', s = 1) => `<text x="${x}" y="${y}" text-anchor="${anc}" ${MONO} font-size="${30 * s}" font-weight="700" fill="${c.fg}">${n}</text><text x="${x}" y="${y + 20 * s}" text-anchor="${anc}" ${MONO} font-size="${11 * s}" fill="${c.faint}" letter-spacing="1.5">${l}</text>`;
const activity = {
  d: (t, c, D) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 30 880 400" width="880" height="400" role="img" aria-label="${D.total} contributions in the last year">${towers(c, D.weeks, 90, 80, 1)}${stat(c, 860, 74, D.total.toLocaleString('en-US'), 'CONTRIBUTIONS · LAST YEAR')}${stat(c, 860, 140, `${D.longest} days`, 'LONGEST STREAK')}</svg>`,
  m: (t, c, D) => svg(400, 320, `${stat(c, 0, 34, D.total.toLocaleString('en-US'), 'CONTRIBUTIONS', 'start', 0.9)}${stat(c, 210, 34, `${D.longest} days`, 'LONGEST STREAK', 'start', 0.9)}${towers(c, D.weeks, 45, 118, 0.52)}`, `${D.total} contributions in the last year`),
};

// ---------- contacto: una imagen por botón, así se recolocan en el móvil ----------
const globe = '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.8"/><ellipse cx="12" cy="12" rx="4" ry="9.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 12h19M4 7h16M4 17h16" stroke="currentColor" stroke-width="1.4" fill="none"/>';
const mail = '<rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 6.5 12 13l8.5-6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>';
const pill = (c, label, icon, primary) => {
  const w = Math.round(label.length * 8.4 + 64);
  const ink = primary ? (c === K.dark ? '#0d1117' : '#ffffff') : c.fg;
  return svg(w, 46, `<rect x=".5" y=".5" width="${w - 1}" height="45" rx="23" fill="${primary ? c.fg : c.card}" stroke="${primary ? 'none' : c.line}"/>
   <g transform="translate(18,11)" color="${ink}" fill="${ink}">${icon}</g>
   <text x="50" y="28" ${MONO} font-size="14" font-weight="${primary ? 700 : 500}" fill="${ink}">${label}</text>`, label);
};
const LINKS = [
  ['site', 'serallap.com', globe, true, 'https://serallap.com'],
  ['linkedin', 'LinkedIn', `<path d="${ICONS.linkedin}"/>`, false, 'https://www.linkedin.com/in/davidpallaresrobaina/'],
  ['mail', 'david.pr.developer@gmail.com', mail, false, 'mailto:david.pr.developer@gmail.com'],
];

// ---------- README ----------
const picture = (name, alt, mobile = true) => `<picture>
${mobile ? `  <source media="(max-width: 600px) and (prefers-color-scheme: dark)" srcset="assets/${name}-m-dark.svg">
  <source media="(max-width: 600px)" srcset="assets/${name}-m-light.svg">
` : ''}  <source media="(prefers-color-scheme: dark)" srcset="assets/${name}-dark.svg">
  <img alt="${alt}" src="assets/${name}-light.svg" width="100%">
</picture>`;
const readme = () => `<!-- Generado por scripts/build_profile.mjs; no editar a mano. -->
${picture('header', 'DPR — David Pallarés, backend engineer in Sevilla')}

## Work

<a href="https://github.com/${USER}/agentglass">
${picture('agentglass', 'agentglass — every AI coding agent on your machine, on one screen')}
</a>

<a href="https://serallap.com">
${picture('portfolio', 'serallap.com — everything else I build')}
</a>

## Stack

${picture('stack', 'Python, Django, Postgres, Docker, AWS, Nginx, Bun, TypeScript, React, SQLite, Electron, Tauri, Linux, Hyprland, Quickshell, tmux, Neovim')}

## Activity

${picture('activity', 'A year of contributions as an isometric city')}

## Say hi

<p>
${LINKS.map(([id, label, , , href]) => `<a href="${href}"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/link-${id}-dark.svg"><img alt="${label}" src="assets/link-${id}-light.svg" height="46"></picture></a>`).join('\n')}
</p>
`;

const D = await loadData();
for (const t of ['dark', 'light']) {
  const c = K[t];
  const blocks = { header, agentglass: glass, portfolio: site, stack, activity };
  for (const [name, b] of Object.entries(blocks)) {
    out(`${name}-${t}.svg`, b.d(t, c, D));
    out(`${name}-m-${t}.svg`, b.m(t, c, D));
  }
  out(`dpr-${t}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX.join(' ')}" role="img" aria-label="DPR">${liquidMark({ seed: SEED, theme: t, id: `x${t[0]}` })}</svg>`);
  for (const [id, label, icon, primary] of LINKS) out(`link-${id}-${t}.svg`, pill(c, label, icon, primary));
}
writeFileSync(new URL('README.md', ROOT), readme());
console.log(`seed ${SEED} · ${D.total} contributions · longest ${D.longest} · ★ ${D.stars}`);
