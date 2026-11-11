import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import {
  planeCenters, threePlaneCenters, fccCenters,
  metatronCenters, metatronLines, platonicSolid, SOLIDS,
} from "./geometry.js";

const SHARED_SPHERE = new THREE.SphereGeometry(1, 48, 32);

// Planos ortogonales: (x, y) del plano → punto 3D.
const PLANES = [
  (x, y) => ({ x, y, z: 0 }), // XY
  (x, y) => ({ x, y: 0, z: y }), // XZ
  (x, y) => ({ x: 0, y: x, z: y }), // YZ
];

const LAYOUTS = {
  plane: planeCenters,
  planes3: threePlaneCenters,
  fcc: fccCenters,
};

export class View3D {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    container.append(this.renderer.domElement);

    this.scene = new THREE.Scene();
    // Perspectiva para explorar; ortográfica para ver proyecciones exactas.
    this.perspCamera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
    this.camera = this.perspCamera;
    // Vista casi frontal: el plano de la flor (XY) mirando a la cámara.
    this.camera.position.set(0.45, 0.3, 1).normalize();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotateSpeed = 0.8;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(5, 8, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(-6, -3, -5);
    this.scene.add(rim);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.sphereGeo = SHARED_SPHERE;
    this.wireTemplate = sphereWire(8, 7, 48);

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.running = false;
  }

  /** Cuántas esferas tendría esta configuración (para la interfaz). */
  static count(layout, rings) {
    return LAYOUTS[layout](rings).length;
  }

  render({
    rings, layout, color, opacity, wire, centers, spin, metatron, metatron3, solids, sizes, stroke, ortho,
    vertexSpheres,
  }) {
    this.controls.autoRotate = spin;
    this.setOrtho(ortho);
    disposeChildren(this.group);

    const pts = LAYOUTS[layout](rings);
    const maxRing = Math.max(1, rings);
    const base = new THREE.Color(color);
    const colorFor = (ring) => {
      // Variación sutil de tono y luz según el anillo.
      const c = base.clone();
      const hsl = {};
      c.getHSL(hsl);
      const t = ring / maxRing;
      return c.setHSL((hsl.h + t * 0.08) % 1, hsl.s, Math.min(0.9, hsl.l + (0.5 - t) * 0.15));
    };

    this.addSpheres(pts, (p) => colorFor(p.ring), opacity, wire);

    if (centers) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])), 3));
      this.group.add(new THREE.Points(g, new THREE.PointsMaterial({ color: base, size: 0.08 })));
    }

    this.lineMaterials = [];
    let radius = Math.max(...pts.map((p) => Math.hypot(p.x, p.y, p.z))) + 1;
    if (metatron) {
      // El Cubo de Metatrón en el plano XY y, opcionalmente, en XZ e YZ.
      const planes = metatron3 ? PLANES : PLANES.slice(0, 1);
      const white = new THREE.Color(0xe8e6df);
      for (const toPlane of planes) {
        this.group.add(this.metatron(stroke, toPlane));
        const spheres = metatronCenters().map((c) => toPlane(c.x, c.y));
        this.addSpheres(spheres, () => white, opacity * 0.8, wire);
      }
      radius = Math.max(radius, 5);
    }
    for (const kind of solids) {
      for (const size of sizes) {
        const { vertices, edges } = platonicSolid(kind, size);
        const color = new THREE.Color(SOLIDS[kind].color);
        this.group.add(this.solid(vertices, edges, color, stroke));
        let reach = Math.max(...vertices.map((v) => Math.hypot(...v)));
        if (vertexSpheres) {
          // Una esfera en cada vértice: el sólido construido con esferas.
          const spheres = vertices.map(([x, y, z]) => ({ x, y, z }));
          this.addSpheres(spheres, () => color, opacity, wire);
          reach += 1;
        }
        radius = Math.max(radius, reach);
      }
    }
    this.updateLineResolution();

    // Encuadre: alejar la cámara sólo cuando cambia el tamaño de la figura.
    if (Math.abs(radius - (this.lastRadius ?? 0)) > 1e-6) {
      this.lastRadius = radius;
      this.frame(this.camera.position.clone().sub(this.controls.target));
    }
  }

  setOrtho(on) {
    const next = on ? this.orthoCamera : this.perspCamera;
    if (next === this.camera) return;
    const dir = this.camera.position.clone().sub(this.controls.target);
    this.camera = next;
    this.controls.object = next;
    if (this.lastRadius) this.frame(dir);
  }

  /** Coloca la cámara en la dirección `dir` a la distancia que encuadra la figura. */
  frame(dir) {
    const r = this.lastRadius * 1.08;
    const aspect = this.aspect ?? 1;
    const vfov = THREE.MathUtils.degToRad(this.perspCamera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const dist = r / Math.sin(Math.min(vfov, hfov) / 2);

    for (const cam of [this.perspCamera, this.orthoCamera]) {
      cam.near = dist / 100;
      cam.far = dist * 10;
    }
    const o = this.orthoCamera;
    const half = aspect >= 1 ? r : r / aspect;
    Object.assign(o, { top: half, bottom: -half, left: -half * aspect, right: half * aspect, zoom: 1 });

    this.controls.target.set(0, 0, 0);
    this.camera.position.copy(dir.normalize().multiplyScalar(dist));
    this.camera.up.set(0, 1, 0);
    this.perspCamera.updateProjectionMatrix();
    this.orthoCamera.updateProjectionMatrix();
    this.controls.update();
  }

  /** Vista frontal: lo que se ve coincide con la proyección 2D. */
  frontView() {
    this.frame(new THREE.Vector3(0, 0, 1));
  }

  lines(positions, color, width, opacity = 1) {
    const geo = new LineSegmentsGeometry().setPositions(positions);
    const mat = new LineMaterial({ color, linewidth: width, transparent: opacity < 1, opacity });
    this.lineMaterials.push(mat);
    return new LineSegments2(geo, mat);
  }

  /** Esferas translúcidas instanciadas (y su malla opcional). */
  addSpheres(pts, colorOf, opacity, wire) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity,
      roughness: 0.25,
      metalness: 0.1,
      clearcoat: 0.6,
      depthWrite: opacity > 0.95,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(this.sphereGeo, mat, pts.length);
    const m = new THREE.Matrix4();
    pts.forEach((p, i) => {
      mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z));
      mesh.setColorAt(i, colorOf(p));
    });
    this.group.add(mesh);

    // Malla: meridianos y paralelos de cada esfera, en una sola geometría.
    if (!wire) return;
    const tpl = this.wireTemplate;
    const pos = new Float32Array(tpl.length * pts.length);
    const col = new Float32Array(tpl.length * pts.length);
    pts.forEach((p, i) => {
      const c = colorOf(p);
      const off = i * tpl.length;
      for (let v = 0; v < tpl.length; v += 3) {
        pos[off + v] = tpl[v] + p.x;
        pos[off + v + 1] = tpl[v + 1] + p.y;
        pos[off + v + 2] = tpl[v + 2] + p.z;
        col[off + v] = c.r;
        col[off + v + 1] = c.g;
        col[off + v + 2] = c.b;
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.group.add(new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 }),
    ));
  }

  metatron(stroke, toPlane) {
    const g = new THREE.Group();
    const centers = metatronCenters();
    const P = (x, y) => { const p = toPlane(x, y); return [p.x, p.y, p.z]; };
    const pos = metatronLines().flatMap(([a, b]) => [...P(a.x, a.y), ...P(b.x, b.y)]);
    g.add(this.lines(pos, 0xe8e6df, stroke * 0.8, 0.8));
    const ring = [];
    const segs = 64;
    for (const c of centers) {
      for (let s = 0; s < segs; s++) {
        const t0 = (s / segs) * 2 * Math.PI, t1 = ((s + 1) / segs) * 2 * Math.PI;
        ring.push(...P(c.x + Math.cos(t0), c.y + Math.sin(t0)), ...P(c.x + Math.cos(t1), c.y + Math.sin(t1)));
      }
    }
    g.add(this.lines(ring, 0xe8e6df, stroke * 1.2, 0.9));
    return g;
  }

  solid(vertices, edges, color, stroke) {
    const g = new THREE.Group();
    const pos = edges.flatMap((e) => [...vertices[e.a], ...vertices[e.b]]);
    g.add(this.lines(pos, color, stroke * 2));
    const dots = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      new THREE.MeshBasicMaterial({ color }),
      vertices.length,
    );
    const m = new THREE.Matrix4();
    vertices.forEach((v, i) => dots.setMatrixAt(i, m.makeTranslation(...v)));
    g.add(dots);
    return g;
  }

  updateLineResolution() {
    const size = this.renderer.getSize(new THREE.Vector2());
    for (const mat of this.lineMaterials ?? []) mat.resolution.copy(size);
  }

  /**
   * PNG de la vista actual, renderizado a mayor resolución (lado mayor ≈
   * `target` px) sobre fondo `background`.
   */
  async exportPNG(target = 2048, background = "#0d0f17") {
    const r = this.renderer;
    const prev = r.getPixelRatio();
    const size = r.getSize(new THREE.Vector2());
    const ratio = Math.min(4, Math.max(prev, target / Math.max(size.x, size.y)));
    r.setPixelRatio(ratio);
    r.setSize(size.x, size.y, false);
    r.render(this.scene, this.camera);

    // Copiar en el mismo tick del render (el búfer WebGL no se conserva).
    const out = document.createElement("canvas");
    out.width = r.domElement.width;
    out.height = r.domElement.height;
    const ctx = out.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(r.domElement, 0, 0);

    r.setPixelRatio(prev);
    r.setSize(size.x, size.y, false);
    return new Promise((res) => out.toBlob(res, "image/png"));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    const loop = () => {
      if (!this.running) return;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    this.running = false;
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    this.perspCamera.aspect = this.aspect;
    this.perspCamera.updateProjectionMatrix();
    // La cámara ortográfica conserva su altura y ajusta el ancho.
    const o = this.orthoCamera;
    o.left = o.bottom * this.aspect;
    o.right = o.top * this.aspect;
    o.updateProjectionMatrix();
    this.updateLineResolution();
  }
}

/** Posiciones (pares de segmentos) de meridianos y paralelos de una esfera unitaria. */
function sphereWire(meridians, parallels, segs) {
  const out = [];
  const push = (a, b) => out.push(...a, ...b);
  for (let i = 0; i < meridians; i++) {
    const phi = (i / meridians) * Math.PI;
    const cp = Math.cos(phi), sp = Math.sin(phi);
    for (let s = 0; s < segs; s++) {
      const t0 = (s / segs) * 2 * Math.PI, t1 = ((s + 1) / segs) * 2 * Math.PI;
      push(
        [Math.sin(t0) * cp, Math.cos(t0), Math.sin(t0) * sp],
        [Math.sin(t1) * cp, Math.cos(t1), Math.sin(t1) * sp],
      );
    }
  }
  for (let j = 1; j <= parallels; j++) {
    const lat = (j / (parallels + 1)) * Math.PI;
    const y = Math.cos(lat), r = Math.sin(lat);
    for (let s = 0; s < segs; s++) {
      const t0 = (s / segs) * 2 * Math.PI, t1 = ((s + 1) / segs) * 2 * Math.PI;
      push([r * Math.cos(t0), y, r * Math.sin(t0)], [r * Math.cos(t1), y, r * Math.sin(t1)]);
    }
  }
  return new Float32Array(out);
}

function disposeChildren(group) {
  for (const child of [...group.children]) {
    group.remove(child);
    child.traverse((o) => {
      if (o.geometry && o.geometry !== SHARED_SPHERE) o.geometry.dispose();
      o.material?.dispose();
    });
  }
}
