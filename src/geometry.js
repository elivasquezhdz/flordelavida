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

// ---------------------------------------------------------------------------
// Cubo de Metatrón y sólidos platónicos
// ---------------------------------------------------------------------------

/**
 * Los 13 centros del Fruto de la Vida: el centro, 6 a distancia 2 y 6 a
 * distancia 4 (todos sobre la red hexagonal de la flor).
 */
export function metatronCenters() {
  const pts = [{ x: 0, y: 0 }];
  for (const d of [2, 4]) {
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      pts.push({ x: d * Math.cos(a), y: d * Math.sin(a) });
    }
  }
  return pts;
}

/** Las 78 líneas del Cubo de Metatrón: todos los pares de los 13 centros. */
export function metatronLines() {
  const pts = metatronCenters();
  const lines = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) lines.push([pts[i], pts[j]]);
  }
  return lines;
}

const PHI = (1 + Math.sqrt(5)) / 2;

function cyclic(list) {
  return list.flatMap(([a, b, c]) => [[a, b, c], [b, c, a], [c, a, b]]);
}
function signs(v) {
  // Todas las combinaciones de signo de las componentes no nulas, sin repetir.
  let out = [[]];
  for (const c of v) out = out.flatMap((p) => (c === 0 ? [[...p, 0]] : [[...p, c], [...p, -c]]));
  return out;
}

const RAW = {
  tetra: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]],
  cube: signs([1, 1, 1]),
  octa: cyclic([[1, 0, 0], [-1, 0, 0]]),
  ico: cyclic(signs([0, 1, PHI])),
  dodeca: [...signs([1, 1, 1]), ...cyclic(signs([0, 1 / PHI, PHI]))],
};
RAW.tetraDual = RAW.tetra.map((v) => v.map((c) => -c));

export const SOLIDS = {
  tetra: { name: "Tetraedro", color: "#ff7a6b" },
  star: { name: "Estrella tetraédrica", color: "#ffb36b" },
  cube: { name: "Hexaedro (cubo)", color: "#4fd1c5" },
  octa: { name: "Octaedro", color: "#b794f6" },
  ico: { name: "Icosaedro", color: "#63b3ed" },
  dodeca: { name: "Dodecaedro", color: "#68d391" },
};

/**
 * Sólido platónico orientado con un eje de simetría ternaria (1,1,1) sobre el
 * eje Z, girado para que un vértice exterior apunte al eje X y escalado para
 * que su proyección ortogonal sobre el plano XY tenga radio `size`.
 * Así, visto de frente, coincide con los puntos del Cubo de Metatrón.
 *
 * Devuelve { vertices: [[x,y,z]], edges: [{a, b, visible}] }, donde
 * `visible` indica si la arista se ve desde +Z (si no, es una arista oculta).
 */
export function platonicSolid(kind, size) {
  if (kind === "star") {
    const a = platonicSolid("tetra", size);
    const b = platonicSolid("tetraDualSolid", size);
    const n = a.vertices.length;
    return {
      vertices: [...a.vertices, ...b.vertices],
      edges: [...a.edges, ...b.edges.map((e) => ({ ...e, a: e.a + n, b: e.b + n }))],
    };
  }
  const raw = RAW[kind === "tetraDualSolid" ? "tetraDual" : kind];
  const R = alignMatrix(); // misma orientación para todos
  let verts = raw.map((v) => mul(R, v));

  // Giro en el plano: el vértice con mayor radio proyectado hacia +X.
  // (Para el tetraedro dual se usa el giro del tetraedro, para que formen la estrella.)
  const ref = kind === "tetraDualSolid" ? RAW.tetra.map((v) => mul(R, v)) : verts;
  const far = ref.reduce((best, v) => (Math.hypot(v[0], v[1]) > Math.hypot(best[0], best[1]) + 1e-9 ? v : best));
  const rz = rotZ(-Math.atan2(far[1], far[0]));
  verts = verts.map((v) => mul(rz, v));

  const maxR = Math.max(...ref.map((v) => Math.hypot(v[0], v[1])));
  const s = size / maxR;
  verts = verts.map((v) => v.map((c) => c * s));

  // Aristas: pares de vértices a la distancia mínima.
  let min = Infinity;
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++) min = Math.min(min, dist(verts[i], verts[j]));
  const pairs = [];
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++)
      if (dist(verts[i], verts[j]) <= min * 1.001) pairs.push([i, j]);

  const normals = faceNormals(verts, pairs);
  const edges = [];
  for (const [i, j] of pairs) {
    {
      // La arista es visible si alguna de sus caras adyacentes mira hacia +Z.
      const visible = normals.some((n) => {
        const top = Math.max(...verts.map((v) => dot(v, n)));
        const onFace = Math.abs(dot(verts[i], n) - top) < 1e-6 && Math.abs(dot(verts[j], n) - top) < 1e-6;
        return onFace && n[2] > -1e-6;
      });
      edges.push({ a: i, b: j, visible });
    }
  }
  return { vertices: verts, edges };
}

/**
 * Normales exteriores de las caras de un poliedro convexo centrado en el
 * origen: planos por dos aristas que comparten vértice y dejan a todos los
 * vértices de un mismo lado.
 */
function faceNormals(verts, pairs) {
  const out = [];
  const eps = 1e-6;
  for (const [a, b] of pairs) {
    for (const [c, d] of pairs) {
      const shared = [a, b].find((v) => v === c || v === d);
      if (shared === undefined || (a === c && b === d)) continue;
      const p = verts[shared];
      const u = sub(verts[a === shared ? b : a], p);
      const w = sub(verts[c === shared ? d : c], p);
      let n = cross(u, w);
      const len = Math.hypot(...n);
      if (len < eps) continue;
      n = n.map((x) => x / len);
      if (dot(n, p) < 0) n = n.map((x) => -x);
      const top = dot(n, p);
      if (verts.some((v) => dot(v, n) > top + eps)) continue;
      if (!out.some((m) => dot(m, n) > 1 - eps)) out.push(n);
    }
  }
  return out;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

// Rotación que lleva el eje (1,1,1) al eje Z (fórmula de Rodrigues).
function alignMatrix() {
  const a = [1, 1, 1].map((c) => c / Math.sqrt(3));
  const z = [0, 0, 1];
  const k = cross(a, z);
  const sin = Math.hypot(...k);
  const cos = dot(a, z);
  const [x, y, w] = k.map((c) => c / sin);
  const C = 1 - cos;
  return [
    [cos + x * x * C, x * y * C - w * sin, x * w * C + y * sin],
    [y * x * C + w * sin, cos + y * y * C, y * w * C - x * sin],
    [w * x * C - y * sin, w * y * C + x * sin, cos + w * w * C],
  ];
}
const rotZ = (t) => [[Math.cos(t), -Math.sin(t), 0], [Math.sin(t), Math.cos(t), 0], [0, 0, 1]];
const mul = (M, v) => M.map((row) => dot(row, v));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
