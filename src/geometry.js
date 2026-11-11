// Geometría de la Flor de la Vida.
// Todas las distancias están en unidades del radio r = 1: cada círculo/esfera
// tiene radio 1 y sus centros están separados por 1, de modo que cada círculo
// pasa por los centros de sus vecinos.

const SQRT3_2 = Math.sqrt(3) / 2;

/**
 * Centros de la red hexagonal (triangular) hasta `rings` anillos.
 * rings = 0 → 1 círculo, 1 → Semilla de la Vida (7), 2 → Flor de la Vida (19), ...
 * Devuelve [{x, y, ring}] ordenados por anillo y ángulo.
 */
export function hexCenters(rings) {
  const pts = [];
  for (let q = -rings; q <= rings; q++) {
    for (let s = -rings; s <= rings; s++) {
      const ring = Math.max(Math.abs(q), Math.abs(s), Math.abs(q + s));
      if (ring > rings) continue;
      pts.push({ x: q + s / 2, y: s * SQRT3_2, ring });
    }
  }
  return pts.sort((a, b) => a.ring - b.ring || angle(a) - angle(b));
}

function angle(p) {
  const a = Math.atan2(p.y, p.x);
  return a < 0 ? a + 2 * Math.PI : a;
}

/** Número de círculos para n anillos: 1 + 3n(n+1). */
export const hexCount = (n) => 1 + 3 * n * (n + 1);

/** La flor en el plano XY, como puntos 3D. */
export function planeCenters(rings) {
  return hexCenters(rings).map(({ x, y, ring }) => ({ x, y, z: 0, ring }));
}

/** La flor replicada en los planos XY, XZ e YZ (sin duplicados). */
export function threePlaneCenters(rings) {
  const seen = new Map();
  for (const { x, y, ring } of hexCenters(rings)) {
    for (const p of [
      { x, y, z: 0 },
      { x, y: 0, z: y },
      { x: 0, y: x, z: y },
    ]) {
      const key = [p.x, p.y, p.z].map((v) => v.toFixed(5)).join(",");
      if (!seen.has(key)) seen.set(key, { ...p, ring });
    }
  }
  return [...seen.values()];
}

/**
 * Red cúbica centrada en las caras (FCC) con distancia entre vecinos = 1,
 * organizada en capas cuboctaédricas: 1, 12, 42, 92, ... esferas por capa.
 * Es el empaquetamiento compacto de esferas; su primer capa es el
 * "equilibrio vectorial" (cuboctaedro) de Buckminster Fuller.
 */
export function fccCenters(shells) {
  const pts = [];
  const k = Math.SQRT1_2; // (1,1,0)·k tiene longitud 1
  const n = 2 * shells;
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      for (let l = -n; l <= n; l++) {
        if ((i + j + l) % 2 !== 0) continue;
        const ai = Math.abs(i), aj = Math.abs(j), al = Math.abs(l);
        const ring = Math.max(ai, aj, al, (ai + aj + al) / 2);
        if (ring > shells) continue;
        pts.push({ x: i * k, y: j * k, z: l * k, ring });
      }
    }
  }
  return pts.sort((a, b) => a.ring - b.ring);
}
