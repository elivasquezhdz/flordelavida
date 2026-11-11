import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { planeCenters, threePlaneCenters, fccCenters } from "./geometry.js";

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
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
    this.camera.position.set(4, 3, 6);

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

    this.sphereGeo = new THREE.SphereGeometry(1, 48, 32);
    this.wireTemplate = sphereWire(8, 7, 48);

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.running = false;
  }

  /** Cuántas esferas tendría esta configuración (para la interfaz). */
  static count(layout, rings) {
    return LAYOUTS[layout](rings).length;
  }

  render({ rings, layout, color, opacity, wire, centers, spin }) {
    this.controls.autoRotate = spin;
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

    // Esferas translúcidas (instanciadas).
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
      m.makeTranslation(p.x, p.y, p.z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, colorFor(p.ring));
    });
    this.group.add(mesh);

    // Malla: meridianos y paralelos de cada esfera, en una sola geometría.
    if (wire) {
      const tpl = this.wireTemplate;
      const pos = new Float32Array(tpl.length * pts.length);
      const col = new Float32Array(tpl.length * pts.length);
      pts.forEach((p, i) => {
        const c = colorFor(p.ring);
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
      const lines = new THREE.LineSegments(
        g,
        new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 }),
      );
      this.group.add(lines);
    }

    if (centers) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z])), 3));
      this.group.add(new THREE.Points(g, new THREE.PointsMaterial({ color: base, size: 0.08 })));
    }

    // Encuadre: alejar la cámara según el tamaño de la figura.
    const radius = Math.max(...pts.map((p) => Math.hypot(p.x, p.y, p.z))) + 1;
    if (radius !== this.lastRadius) {
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      const dist = radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.05;
      this.camera.position.copy(dir.multiplyScalar(dist));
      this.controls.target.set(0, 0, 0);
      this.lastRadius = radius;
    }
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
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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
    if (child.geometry && !child.isInstancedMesh) child.geometry.dispose();
    child.material?.dispose();
    child.dispose?.();
  }
}
