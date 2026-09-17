#!/usr/bin/env python3
"""Genera assets/hero-light.svg y assets/hero-dark.svg.

Un solo SVG animado, auto-alojado, sin dependencias externas.
Tecnica de animacion: CSS @keyframes dentro de <style> (lo mismo que usa
Platane/snk para la serpiente, asi que esta probado que GitHub lo respeta
al servir el SVG via raw.githubusercontent.com).

  python3 scripts/build_hero.py
"""
import re
from pathlib import Path

W, H = 880, 210

# --- texto -------------------------------------------------------------
SHOW_NAME = True     # False: solo el monograma, sin nombre al lado
NAME = "David Pallarés"
PROMPT = "~ $"
PHRASES = [
    "building developer tools",
    "watching AI agents so you don't have to",
    "backend by trade, tooling by habit",
]
META = "DAVID PALLARÉS ROBAINA · SEVILLA, ES · SMITH.AI · SERALLAP.COM"
HANDLE = "@SirAllap"

# --- monograma DPR (scripts/trace_logo.py) ----------------------------
MARK_SRC = "logo.svg"   # o "logo-negative.svg" para la version en negativo
MARK_H = 78          # altura en unidades del viewBox
MARK_X, MARK_Y = 0, 8
NAME_X = 118         # el nombre arranca despues del monograma

# --- metrica -----------------------------------------------------------
MONO_SIZE = 18
ADV = MONO_SIZE * 0.6          # avance por caracter en fuente monoespaciada
TEXT_X = 46                    # donde empieza el texto tecleado
BASE_Y = 136                   # linea base del prompt
RULE_Y = 100
LOOP = 21.0                    # duracion total del ciclo (3 frases x 7s)
SEG = LOOP / len(PHRASES)

# --- lanes de telemetria (evoca agentglass: agentes reportando) ---------
LANE_X0, LANE_X1 = 624, 880
LANE_W = LANE_X1 - LANE_X0
LANES = [
    (118, 3.6, 0.55),
    (136, 4.8, 0.85),
    (154, 3.0, 0.40),
    (172, 5.4, 0.70),
]

def mark_svg() -> tuple[str, str]:
    """Incrusta el monograma escalado. Devuelve (css, elementos).

    Un <img> no puede referenciar otro SVG, asi que el monograma se inyecta
    aqui: se reescala por transform y su CSS se concatena al del hero.
    """
    src = (Path(__file__).resolve().parent.parent / "assets" / MARK_SRC)
    if not src.exists():
        return "", ""
    doc = src.read_text(encoding="utf-8")
    vb = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', doc)
    css = re.search(r"<style>(.*?)</style>", doc, re.S)
    paths = re.findall(r"<path[^>]*/>", doc)
    k = MARK_H / float(vb.group(2))
    g = (f'<g class="mark" transform="translate({MARK_X},{MARK_Y}) '
         f'scale({k:.4f})">{"".join(paths)}</g>')
    inner = css.group(1) if css else ""
    # el color propio del logo suelto sobra aqui: lo pone .mark
    inner = re.sub(r"svg\{color:[^}]*\}", "", inner)
    inner = re.sub(r"@media \(prefers-color-scheme:dark\)\{svg\{[^}]*\}\}", "",
                   inner)
    return inner, g


FONT_SANS = ('system-ui,-apple-system,"Segoe UI",Roboto,'
             '"Helvetica Neue",Arial,sans-serif')
FONT_MONO = ('ui-monospace,"SF Mono","JetBrains Mono","Fira Code",'
             'Menlo,Consolas,"Liberation Mono",monospace')

THEMES = {
    # Tokyo Night sobre el lienzo claro/oscuro de GitHub, para que el perfil
    # y serallap.com sean la misma identidad. El acento claro sale de la
    # propia paleta ACCENTS del portfolio (#8b5cf6); #bb9af7 no aguanta
    # sobre blanco.
    "light": {
        "fg": "#073642", "muted": "#586e75", "faint": "#839496",
        "line": "#d4dad8", "hair": "#e7ebe9", "accent": "#8b5cf6",
    },
    "dark": {
        "fg": "#c0caf5", "muted": "#7982a9", "faint": "#565f89",
        "line": "#2f3549", "hair": "#21262d", "accent": "#bb9af7",
    },
}


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def pct(seconds: float) -> str:
    return f"{seconds / LOOP * 100:.3f}%"


def build(theme: str) -> str:
    c = THEMES[theme]
    widths = [len(p) * ADV for p in PHRASES]

    # ---- keyframes del tecleo: un clipPath por frase ------------------
    type_kf, clips, texts = [], [], []
    for i, (phrase, w) in enumerate(zip(PHRASES, widths)):
        t0 = i * SEG
        k = [("0%", 0)]
        if i:
            k.append((pct(t0), 0))
        k += [
            (pct(t0 + 1.8), w),    # teclea
            (pct(t0 + 5.6), w),    # sostiene
            (pct(t0 + 6.4), 0),    # borra
        ]
        if i < len(PHRASES) - 1:
            k.append(("100%", 0))
        body = "".join(
            f"{stop}{{width:{val:.1f}px"
            + (f";animation-timing-function:steps({len(phrase)},end)"
               if val == 0 or stop == pct(t0 + 5.6) else "")
            + "}"
            for stop, val in k
        )
        type_kf.append(f"@keyframes t{i}{{{body}}}")
        clips.append(
            f'<clipPath id="cp{i}">'
            f'<rect class="rv rv{i}" x="{TEXT_X - 1}" y="{BASE_Y - 20}" '
            f'width="0" height="28"/></clipPath>'
        )
        texts.append(
            f'<g clip-path="url(#cp{i})">'
            f'<text class="mono typed" x="{TEXT_X}" y="{BASE_Y}" '
            f'textLength="{w:.1f}" lengthAdjust="spacing">{esc(phrase)}</text>'
            f"</g>"
        )

    # ---- keyframes del cursor (uno solo para las tres frases) ---------
    car = []
    for i, w in enumerate(widths):
        t0 = i * SEG
        car += [
            (pct(t0), 0),
            (pct(t0 + 1.8), w),
            (pct(t0 + 5.6), w),
            (pct(t0 + 6.4), 0),
        ]
    car.append(("100%", 0))
    seen, uniq = set(), []
    for stop, val in car:
        if stop in seen:
            continue
        seen.add(stop)
        uniq.append((stop, val))
    caret_kf = "@keyframes caret{" + "".join(
        f"{s}{{transform:translateX({v:.1f}px)}}" for s, v in uniq
    ) + "}"

    # ---- lanes --------------------------------------------------------
    lane_svg, lane_css = [], []
    for li, (y, dur, op) in enumerate(LANES):
        lane_svg.append(
            f'<line class="lane" x1="{LANE_X0}" y1="{y}" x2="{LANE_X1}" '
            f'y2="{y}" opacity="{op * 0.5:.2f}"/>'
        )
        for d in range(2):
            lane_svg.append(
                f'<circle class="dot d{li}{d}" cx="{LANE_X0}" cy="{y}" '
                f'r="2.4"/>'
            )
            lane_css.append(
                f".d{li}{d}{{animation:flow {dur}s linear "
                f"{-(d * dur / 2 + li * 0.37):.2f}s infinite}}"
            )

    css = f"""
    text{{font-family:{FONT_SANS}}}
    .mono{{font-family:{FONT_MONO};font-size:{MONO_SIZE}px}}
    .name{{font-size:34px;font-weight:640;letter-spacing:-.9px;fill:{c['fg']};
      animation:rise .9s cubic-bezier(.2,.8,.2,1) both}}
    .prompt{{fill:{c['accent']};animation:rise .9s .18s cubic-bezier(.2,.8,.2,1) both}}
    .typed{{fill:{c['fg']}}}
    .meta{{font-size:11px;letter-spacing:2.4px;fill:{c['faint']};font-weight:500;
      animation:rise .9s .34s cubic-bezier(.2,.8,.2,1) both}}
    .handle{{font-size:14px;letter-spacing:.6px;fill:{c['muted']};text-anchor:end;
      animation:rise .9s .26s cubic-bezier(.2,.8,.2,1) both}}
    .mark{{color:{c['fg']}}}
    .rule{{stroke:{c['line']};stroke-width:1;stroke-dasharray:{W};
      stroke-dashoffset:{W};animation:draw 1.5s .1s cubic-bezier(.2,.8,.2,1) forwards}}
    .lane{{stroke:{c['line']};stroke-width:1}}
    .dot{{fill:{c['accent']}}}
    .caret{{fill:{c['accent']};
      animation:caret {LOOP}s infinite,blink 1.06s steps(1) infinite}}
    {"".join(type_kf)}
    .rv{{animation-duration:{LOOP}s;animation-iteration-count:infinite}}
    {"".join(f'.rv{i}{{animation-name:t{i}}}' for i in range(len(PHRASES)))}
    {caret_kf}
    @keyframes blink{{0%,49%{{opacity:1}}50%,100%{{opacity:0}}}}
    @keyframes draw{{to{{stroke-dashoffset:0}}}}
    @keyframes rise{{from{{opacity:0;transform:translateY(9px)}}
      to{{opacity:1;transform:translateY(0)}}}}
    @keyframes flow{{0%{{opacity:0;transform:translateX(0)}}
      9%{{opacity:1}}86%{{opacity:1}}
      100%{{opacity:0;transform:translateX({LANE_W}px)}}}}
    {"".join(lane_css)}
    @media (prefers-reduced-motion:reduce){{
      .rv,.caret,.dot{{animation:none}}
      .rv0{{width:{widths[0]:.1f}px}}
      .caret{{opacity:0}}
    }}
    """
    mark_css, mark_el = mark_svg()
    css = " ".join((css + mark_css).split())

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{esc(NAME)} — {esc(PHRASES[0])}">
<title>{esc(NAME)} — {esc(PHRASES[0])}</title>
<style>{css}</style>
<defs>{"".join(clips)}</defs>
{mark_el}{f'<text class="name" x="{NAME_X}" y="62">{esc(NAME)}</text>' if SHOW_NAME else ''}
<text class="mono handle" x="{W - 4}" y="64">{esc(HANDLE)}</text>
{"".join(lane_svg)}
<line class="rule" x1="0" y1="{RULE_Y}" x2="{W}" y2="{RULE_Y}"/>
<text class="mono prompt" x="0" y="{BASE_Y}">{esc(PROMPT)}</text>
{"".join(texts)}
<rect class="caret" x="{TEXT_X}" y="{BASE_Y - 15}" width="9" height="20" rx="1"/>
<text class="meta" x="0" y="176">{esc(META)}</text>
</svg>
"""


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "assets"
    for name in THEMES:
        p = out / f"hero-{name}.svg"
        p.write_text(build(name), encoding="utf-8")
        print(f"{p}  {p.stat().st_size:,} bytes")
