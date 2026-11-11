import { hexCenters } from "./geometry.js";

const NS = "http://www.w3.org/2000/svg";

export class View2D {
  constructor(svg) {
    this.svg = svg;
    this.animating = null;
  }

  render({ rings, color, stroke, outer, centers }) {
    const svg = this.svg;
    svg.replaceChildren();

    const pts = hexCenters(rings);
    // El círculo exterior envuelve la flor: radio = anillos + 1.
    const extent = rings + 1;
    const pad = 0.25;
    const R = extent + pad;
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

function el(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

const fmt = (v) => +v.toFixed(6);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
