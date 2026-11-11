# Flor de la Vida

Visualizador web de la **Flor de la Vida** en 2D y 3D.

- **2D · Círculos** — círculos de igual radio sobre una red hexagonal, cada uno pasando por el centro de sus vecinos. Anillos 0–6 (1 → Semilla de la Vida con 7 círculos → Flor de la Vida con 19 …), círculo exterior, animación de la construcción y exportación a SVG.
- **3D · Esferas** — esferas translúcidas (Three.js) con tres disposiciones:
  - *Plano*: la flor clásica hecha de esferas.
  - *Tres planos ortogonales*: la flor replicada en los planos XY, XZ e YZ.
  - *Red FCC (cuboctaedro)*: empaquetamiento compacto de esferas en capas cuboctaédricas (1, 13, 55, 147 …).

## Ejecutar

Es un sitio estático sin paso de compilación (Three.js se carga desde CDN con un *import map*). Solo hace falta servir la carpeta:

```sh
python3 -m http.server 8000
# abre http://localhost:8000  (o http://localhost:8000/#3d)
```

También funciona tal cual en GitHub Pages.

## Estructura

```
index.html        interfaz
src/geometry.js   centros de círculos/esferas (red hexagonal, tres planos, FCC)
src/view2d.js     render SVG
src/view3d.js     render Three.js
src/main.js       controles y estado
```
