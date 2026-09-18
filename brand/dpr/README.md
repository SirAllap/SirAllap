# DPR — David Pallarés Robaina

Kit del monograma. Tinta plana, blanco o negro, sin color.

| Fichero | Uso |
| --- | --- |
| `dpr.svg` | Marca quieta que cambia sola de negro a blanco con el tema del sistema. La opción por defecto en web. |
| `dpr-black.svg`, `dpr-white.svg` | Marca quieta en una sola tinta, para fondos claros u oscuros. |
| `dpr-liquid-dark.svg`, `dpr-liquid-light.svg` | Versión animada (gotas de la D, corriente en las vetas). Sirve en un `<img>`, sin JS. |
| `png/dpr-{black,white}-{512,1024,2048}.png` | Fondo transparente, para redes, favicon grande o documentos. |
| `source/dpr-reference.png` | Arte original del que sale el vector. |

## Cómo se construye

- `assets/dpr-pieces.json`: las 9 piezas vectorizadas del original y los puntos
  del borde de la D de donde salen las gotas. Se regenera con
  `python3 scripts/trace_dpr.py brand/dpr/source/dpr-reference.png 195,255,705,660`.
- `scripts/dpr.mjs`: `liquidMark({ seed, theme, still })` devuelve el interior
  del SVG. `still: true` da la marca congelada. Cada semilla da otro reparto de
  gotas y cortes; la oficial es `20260918`.
- `scripts/build_brand.mjs`: regenera este kit (`--png` exporta también los PNG
  con google-chrome).

## En el portfolio

Para la marca quieta, basta con `<img src="dpr.svg" alt="DPR">`. Para la viva,
`<img src="dpr-liquid-dark.svg">` o un `<picture>` con `prefers-color-scheme`.
Si el portfolio tiene build en Node, puede importar `scripts/dpr.mjs` y generar
una semilla por visita o por día.
