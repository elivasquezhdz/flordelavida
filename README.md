# Flor de la Vida

Visualizador web de la **Flor de la Vida** en 2D y 3D.

- **2D · Círculos** — círculos de igual radio sobre una red hexagonal, cada uno pasando por el centro de sus vecinos. Anillos 0–6 (1 → Semilla de la Vida con 7 círculos → Flor de la Vida con 19 …), círculo exterior, animación de la construcción y exportación a SVG.
- **3D · Esferas** — esferas translúcidas (Three.js) con tres disposiciones:
  - *Plano*: la flor clásica hecha de esferas.
  - *Tres planos ortogonales*: la flor replicada en los planos XY, XZ e YZ.
  - *Red FCC (cuboctaedro)*: empaquetamiento compacto de esferas en capas cuboctaédricas (1, 13, 55, 147 …).

- **Geometría sagrada** (en 2D y 3D):
  - *Cubo de Metatrón*: los 13 círculos del Fruto de la Vida y las 78 líneas que unen sus centros.
  - *Sólidos platónicos*: tetraedro, estrella tetraédrica, cubo, octaedro, icosaedro y dodecaedro. Se orientan con un eje ternario hacia el observador, así que su proyección cae sobre los puntos del Cubo de Metatrón (tamaño interior de 2 radios o exterior de 4). En 2D las aristas ocultas se dibujan punteadas. En 3D se ven los sólidos reales, y el botón *Vista frontal (proyección)* activa la cámara ortográfica para que la vista coincida exactamente con la proyección 2D.

## Ejecutar

Es un sitio estático sin paso de compilación (Three.js se carga desde CDN con un *import map*). Solo hace falta servir la carpeta:

```sh
python3 -m http.server 8000
# abre http://localhost:8000  (o http://localhost:8000/#3d)
```

## Despliegue

Publicado en GitHub Pages: https://elivasquezhdz.github.io/flordelavida/

El workflow `.github/workflows/pages.yml` copia el sitio a la rama `gh-pages` en cada push a `main` (o manualmente desde la pestaña *Actions*).

## Estructura

```
index.html        interfaz
src/geometry.js   centros de círculos/esferas (red hexagonal, tres planos, FCC)
src/view2d.js     render SVG
src/view3d.js     render Three.js
src/main.js       controles y estado
```
