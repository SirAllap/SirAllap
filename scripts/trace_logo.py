#!/usr/bin/env python3
"""Vectoriza el monograma DPR del portfolio a SVG.

Con --invert saca la polaridad contraria: las letras quedan huecas y
lo que se rellena es el disuelto.

Fuente: pjdpr/public/dpr_dark.png (silueta en el canal alfa).
Se sobremuestrea antes de trazar para que potrace ajuste curvas suaves en
vez de heredar los dientes de sierra del PNG de 318x266.

  python3 scripts/trace_logo.py <png> <salida.svg>
"""
import sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image

UPSCALE = 4
TURD = 24        # descarta motas sueltas del disuelto
OPTTOL = 0.45    # tolerancia de simplificacion de curvas
SIZE = 100.0  # lado del viewBox normalizado
INVERT = False


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

    out = []
    for curve in path:
        sx, sy = pt(curve.start_point)
        out.append(f"M{X(sx)} {Y(sy)}")
        for seg in curve:
            ex, ey = pt(seg.end_point)
            if seg.is_corner:
                cx, cy = pt(seg.c)
                out.append(f"L{X(cx)} {Y(cy)}L{X(ex)} {Y(ey)}")
            else:
                a1, b1 = pt(seg.c1)
                a2, b2 = pt(seg.c2)
                out.append(f"C{X(a1)} {Y(b1)} {X(a2)} {Y(b2)} {X(ex)} {Y(ey)}")
        out.append("Z")
    return "".join(out), w * s, h * s


def main() -> None:
    global INVERT
    args = [a for a in sys.argv[1:] if a != "--invert"]
    INVERT = "--invert" in sys.argv
    src = Path(args[0])
    dst = Path(args[1])
    d, w, h = trace(silhouette(src))
    dst.write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE:.0f} {SIZE:.0f}"'
        f' role="img" aria-label="DPR">\n<title>DPR</title>\n'
        f'<path fill="currentColor" fill-rule="evenodd" d="{d}"/>\n</svg>\n',
        encoding="utf-8")
    print(f"{dst}  {dst.stat().st_size:,} bytes  "
          f"marca {w:.1f}x{h:.1f} en viewBox {SIZE:.0f}")


if __name__ == "__main__":
    main()
