# Maqueta del perfil

Abre `preview/index.html` en el navegador. Tres pestañas (Signature, Bisturí,
Actual) y conmutador de tema claro/oscuro. Lo que se ve sale de los markdown de
`variants/`, así que la maqueta no puede divergir de lo que acabaría en el perfil.

## Aplicar una variante

```sh
cp preview/variants/signature.md README.md   # o scalpel.md
```

El hero ya está en `assets/hero-light.svg` y `assets/hero-dark.svg`.

## Retocar el hero

Nombre, frases del tecleo, colores y ritmo de la animación están al principio de
`scripts/build_hero.py`:

```sh
python3 scripts/build_hero.py
```

Regenera los dos temas a la vez. No edites los SVG a mano.

## Regenerar la maqueta

```sh
npm i marked && node preview/build.mjs
```
