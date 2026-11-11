import { hexCenters, metatronCenters, metatronLines, platonicSolid, SOLIDS } from "./geometry.js";

const NS = "http://www.w3.org/2000/svg";

export class View2D {
  constructor(svg) {
    this.svg = svg;
    this.animating = null;
  }

  render({ rings, color, stroke, outer, centers, metatron, solids, solidSize, hidden }) {
    const svg = this.svg;
    svg.replaceChildren();

    const pts = hexCenters(rings);
    // El círculo exterior envuelve la flor: radio = anillos + 1.
    const extent = rings + 1;
    const pad = 0.25;
    let reach = extent;
    if (metatron) reach = Math.max(reach, 5);
    if (solids.length) reach = Math.max(reach, solidSize);
    const R = reach + pad;
    svg.setAttribute("viewBox", `${-R} ${-R} ${2 * R} ${2 * R}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const g = el("g", {
      fill: "none",
      stroke: color,
      "stroke-width": stroke,
      "vector-effect": "non-scaling-stroke",
    });
    // vector-effect no se hereda: lo ponemos en cada elemento.
    this.circles = pts.map((p) => {
      const c = el("circle", {
        cx: fmt(p.x), cy: fmt(-p.y), r: 1,
        "vector-effect": "non-scaling-stroke",
      });
      c.dataset.ring = p.ring;
      g.append(c);
      return c;
    });

    if (outer && rings > 0) {
      const o = el("circle", { cx: 0, cy: 0, r: extent, "vector-effect": "non-scaling-stroke" });
      o.dataset.outer = "";
      g.append(o);
      this.circles.push(o);
    }
    svg.append(g);

    if (metatron) svg.append(drawMetatron(stroke));
    for (const kind of solids) svg.append(drawSolid(kind, solidSize, stroke, hidden));

    if (centers) {
      const dots = el("g", { fill: color });
      for (const p of pts) {
        dots.append(el("circle", { cx: fmt(p.x), cy: fmt(-p.y), r: 0.04 }));
      }
      svg.append(dots);
    }
  }

  /** Dibuja los círculos uno a uno, en orden de anillo y ángulo. */
  animate() {
    if (this.animating) cancelAnimationFrame(this.animating);
    const circles = this.circles ?? [];
    const per = 260; // ms por círculo
    const overlap = 0.55;
    const start = performance.now();
    for (const c of circles) {
      const len = 2 * Math.PI * Number(c.getAttribute("r"));
      c.style.strokeDasharray = `${len}`;
      c.style.strokeDashoffset = `${len}`;
      c.setAttribute("pathLength", len);
    }
    const step = (now) => {
      const t = now - start;
      let done = true;
      circles.forEach((c, i) => {
        const len = Number(c.getAttribute("pathLength"));
        const local = Math.min(1, Math.max(0, (t - i * per * overlap) / per));
        if (local < 1) done = false;
        c.style.strokeDashoffset = `${len * (1 - easeInOut(local))}`;
      });
      this.animating = done ? null : requestAnimationFrame(step);
      if (done) circles.forEach((c) => { c.style.strokeDasharray = ""; c.style.strokeDashoffset = ""; });
    };
    this.animating = requestAnimationFrame(step);
  }

  exportSVG() {
    const clone = this.svg.cloneNode(true);
    clone.setAttribute("xmlns", NS);
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "flor-de-la-vida.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}

const METATRON_COLOR = "#e8e6df";

function drawMetatron(stroke) {
  const g = el("g", { fill: "none", stroke: METATRON_COLOR, "stroke-opacity": 0.75 });
  for (const p of metatronCenters()) {
    g.append(el("circle", {
      cx: fmt(p.x), cy: fmt(-p.y), r: 1,
      "stroke-width": stroke * 1.2, "vector-effect": "non-scaling-stroke",
    }));
  }
  for (const [a, b] of metatronLines()) {
    g.append(el("line", {
      x1: fmt(a.x), y1: fmt(-a.y), x2: fmt(b.x), y2: fmt(-b.y),
      "stroke-width": stroke * 0.6, "vector-effect": "non-scaling-stroke",
    }));
  }
  return g;
}

/** Proyección ortogonal (vista desde +Z) de un sólido platónico. */
function drawSolid(kind, size, stroke, hidden) {
  const { vertices, edges } = platonicSolid(kind, size);
  const color = SOLIDS[kind].color;
  const g = el("g", { stroke: color, fill: "none", "stroke-linecap": "round" });
  // Primero las ocultas (punteadas) para que las visibles queden encima.
  const sorted = [...edges].sort((a, b) => a.visible - b.visible);
  for (const e of sorted) {
    if (!e.visible && !hidden) continue;
    const [a, b] = [vertices[e.a], vertices[e.b]];
    const attrs = {
      x1: fmt(a[0]), y1: fmt(-a[1]), x2: fmt(b[0]), y2: fmt(-b[1]),
      "stroke-width": e.visible ? stroke * 1.6 : stroke * 0.9,
      "vector-effect": "non-scaling-stroke",
    };
    if (!e.visible) Object.assign(attrs, { "stroke-dasharray": "4 4", "stroke-opacity": 0.7 });
    g.append(el("line", attrs));
  }
  const dots = el("g", { fill: color, stroke: "none" });
  for (const v of vertices) dots.append(el("circle", { cx: fmt(v[0]), cy: fmt(-v[1]), r: 0.05 }));
  g.append(dots);
  return g;
}

function el(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

const fmt = (v) => +v.toFixed(6);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
