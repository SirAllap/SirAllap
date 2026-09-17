#!/usr/bin/env python3
"""Vectoriza el monograma DPR del portfolio a SVG.

Con --invert saca la polaridad contraria: las letras quedan huecas y
lo que se rellena es el disuelto. Con --animate cada forma sale en su
propio <path> y el monograma se ensambla solo: los fragmentos sueltos
del disuelto entran desde la izquierda y las letras los recogen.

Fuente: pjdpr/public/dpr_dark.png (silueta en el canal alfa).
Se sobremuestrea antes de trazar para que potrace ajuste curvas suaves en
vez de heredar los dientes de sierra del PNG de 318x266.

  python3 scripts/trace_logo.py <png> <salida.svg>
"""
import random
import sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image

UPSCALE = 4
TURD = 7         # descarta motas sueltas del disuelto
OPTTOL = 0.45    # tolerancia de simplificacion de curvas
SIZE = 100.0  # lado del viewBox normalizado
INVERT = False
ANIMATE = False

# --- ensamblaje: cuanto mas pequena y mas a la izquierda esta una forma,
#     mas lejos empieza y mas tarda en posarse ---------------------------
DRIFT_BASE = 8.0
DRIFT_SIZE = 20.0
DRIFT_MAX = 26.0
STAGGER = 0.45
DUR = 0.78
SHIMMER = 11.0    # ciclo del temblor de los fragmentos pequenos

# Color propio del SVG suelto (Tokyo Night, como serallap.com)
FG_LIGHT = "#073642"
FG_DARK = "#c0caf5"


def silhouette(png: Path) -> np.ndarray:
    im = Image.open(png).convert("RGBA")
    a = np.array(im)
    alpha = a[..., 3]
    if alpha.min() == 255:            # sin transparencia: usar luminancia
        lum = np.array(Image.open(png).convert("L"), dtype=float)
        mask = lum > 127 if lum.mean() < 127 else lum < 127
    else:
        mask = alpha > 127
    im2 = Image.fromarray((mask * 255).astype(np.uint8))
    im2 = im2.resize((im2.width * UPSCALE, im2.height * UPSCALE),
                     Image.LANCZOS)
    # potrace rellena la region "negra": la marca debe ser el 0, no el 1.
    m = np.array(im2) <= 127
    return ~m if INVERT else m


def pt(p):
    return (p.x, p.y) if hasattr(p, "x") else (p[0], p[1])


def shapes(path, X, Y):
    """Agrupa cada contorno exterior con sus huecos.

    potrace emite un exterior seguido de sus huecos. Los distingo por el
    signo del area: si separase los huecos en <path> propios se volverian
    manchas solidas y el monograma perderia los contraformas.
    """
    out = []
    for curve in path:
        pts, d = [], []
        sx, sy = pt(curve.start_point)
        pts.append((sx, sy))
        d.append(f"M{X(sx)} {Y(sy)}")
        for seg in curve:
            ex, ey = pt(seg.end_point)
            if seg.is_corner:
                cx, cy = pt(seg.c)
                d.append(f"L{X(cx)} {Y(cy)}L{X(ex)} {Y(ey)}")
                pts.append((cx, cy))
            else:
                a1, b1 = pt(seg.c1)
                a2, b2 = pt(seg.c2)
                d.append(f"C{X(a1)} {Y(b1)} {X(a2)} {Y(b2)} {X(ex)} {Y(ey)}")
            pts.append((ex, ey))
        d.append("Z")

        area = 0.0
        for i in range(len(pts)):
            x0, y0 = pts[i]
            x1, y1 = pts[(i + 1) % len(pts)]
            area += x0 * y1 - x1 * y0
        area /= 2.0

        if not out or (area > 0) == out[0]["outer_sign"]:
            out.append({"d": list(d), "area": abs(area),
                        # normalizadas al viewBox, no en pixeles del bitmap
                        "xs": [X(q[0]) for q in pts],
                        "outer_sign": area > 0})
        else:
            out[-1]["d"] += d          # es un hueco del exterior anterior
    return out


def trace(mask: np.ndarray) -> tuple[str, float, float]:
    ys, xs = np.nonzero(mask)
    x0, x1 = xs.min(), xs.max() + 1
    y0, y1 = ys.min(), ys.max() + 1
    mask = mask[y0:y1, x0:x1]
    h, w = mask.shape
    s = SIZE / max(w, h)
    ox, oy = (SIZE - w * s) / 2, (SIZE - h * s) / 2
    X = lambda v: round(v * s + ox, 2)
    Y = lambda v: round(v * s + oy, 2)

    path = potrace.Bitmap(mask).trace(
        turdsize=TURD, alphamax=1.0, opticurve=True, opttolerance=OPTTOL)
    return shapes(path, X, Y), w * s, h * s


def render(shp, animated: bool) -> tuple[str, str]:
    """Devuelve (elementos, css) para las formas trazadas."""
    theme = (f"svg{{color:{FG_LIGHT}}}"
             f"@media (prefers-color-scheme:dark){{svg{{color:{FG_DARK}}}}}")
    if not animated:
        d = "".join(x for sh in shp for x in sh["d"])
        return f'<path fill="currentColor" fill-rule="evenodd" d="{d}"/>', theme

    big = max(sh["area"] for sh in shp) ** 0.5
    rng = random.Random(3)
    els, css = [], []
    for i, sh in enumerate(sorted(shp, key=lambda k: min(k["xs"]))):
        x0 = min(sh["xs"]) / SIZE                   # 0 izquierda, 1 derecha
        sz = min(1.0, (sh["area"] ** 0.5) / big)    # 0 mota, 1 letra
        frag = sz < 0.30

        drift = -min(DRIFT_MAX,
                     (DRIFT_BASE + DRIFT_SIZE * (1 - sz)) * (1.25 - x0))
        delay = STAGGER * x0 + rng.uniform(0, 0.10)

        els.append(f'<path class="s{" f" if frag else ""} n{i}" '
                   f'fill="currentColor" fill-rule="evenodd" '
                   f'd="{"".join(sh["d"])}"/>')
        if frag:
            css.append(f".n{i}{{--dx:{drift:.1f}px;"
                       f"--sh:{rng.choice((-1.6, 1.6)):.1f}px;"
                       f"animation-delay:{delay:.2f}s,{rng.uniform(0, SHIMMER):.1f}s}}")
        else:
            css.append(f".n{i}{{--dx:{drift:.1f}px;animation-delay:{delay:.2f}s}}")

    style = f"""
    svg{{color:{FG_LIGHT}}}
    @media (prefers-color-scheme:dark){{svg{{color:{FG_DARK}}}}}
    .s{{animation:settle {DUR}s cubic-bezier(.16,.84,.3,1) both}}
    .s.f{{animation-name:settle,shimmer;
      animation-duration:{DUR}s,{SHIMMER}s;
      animation-timing-function:cubic-bezier(.16,.84,.3,1),steps(1,end);
      animation-iteration-count:1,infinite;
      animation-fill-mode:both,none}}
    @keyframes settle{{
      from{{opacity:0;transform:translateX(var(--dx))}}
      to{{opacity:1;transform:translateX(0)}}
    }}
    @keyframes shimmer{{
      0%,93%,100%{{transform:translateX(0)}}
      96%{{transform:translateX(var(--sh))}}
    }}
    {"".join(css)}
    @media (prefers-reduced-motion:reduce){{
      .s,.s.f{{animation:none;opacity:1;transform:none}}
    }}
    """
    return "".join(els), " ".join(style.split())


def main() -> None:
    global INVERT, ANIMATE
    flags = {"--invert", "--animate"}
    args = [a for a in sys.argv[1:] if a not in flags]
    INVERT = "--invert" in sys.argv
    ANIMATE = "--animate" in sys.argv
    src, dst = Path(args[0]), Path(args[1])

    shp, w, h = trace(silhouette(src))
    body, style = render(shp, ANIMATE)
    st = f"<style>{style}</style>\n" if style else ""
    dst.write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE:.0f} {SIZE:.0f}"'
        f' role="img" aria-label="DPR">\n<title>DPR</title>\n{st}{body}\n</svg>\n',
        encoding="utf-8")
    print(f"{dst}  {dst.stat().st_size:,} bytes  {len(shp)} formas  "
          f"marca {w:.1f}x{h:.1f} en viewBox {SIZE:.0f}")


if __name__ == "__main__":
    main()
