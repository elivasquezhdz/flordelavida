import { View2D } from "./view2d.js";
import { hexCount } from "./geometry.js";

const $ = (id) => document.getElementById(id);
const ui = {
  rings: $("rings"), layout3d: $("layout3d"), color: $("color"), stroke: $("stroke"),
  opacity: $("opacity"), outer: $("outer"), centers: $("centers"), wire: $("wire"), spin: $("spin"),
};

const view2d = new View2D($("view2d"));
let view3d = null; // se carga bajo demanda (Three.js desde CDN)
let View3DClass = null;
let mode = "2d";

const NAMES = { 0: "Un círculo", 1: "Semilla de la Vida", 2: "Flor de la Vida", 3: "Fruto en formación" };

function state() {
  return {
    rings: +ui.rings.value,
    layout: ui.layout3d.value,
    color: ui.color.value,
    stroke: +ui.stroke.value,
    opacity: +ui.opacity.value,
    outer: ui.outer.checked,
    centers: ui.centers.checked,
    wire: ui.wire.checked,
    spin: ui.spin.checked,
  };
}

function update() {
  const s = state();
  $("rings-out").value = s.rings;
  $("stroke-out").value = s.stroke;
  $("opacity-out").value = s.opacity.toFixed(2);

  if (mode === "2d") {
    view2d.render(s);
    const name = NAMES[s.rings] ? ` · ${NAMES[s.rings]}` : "";
    $("count-hint").textContent = `${hexCount(s.rings)} círculos${name}`;
  } else if (view3d) {
    view3d.render(s);
    $("count-hint").textContent = `${View3DClass.count(s.layout, s.rings)} esferas`;
  }
}

async function setMode(next) {
  mode = next;
  document.body.dataset.mode = mode;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.mode === mode));
  $("view2d").toggleAttribute("hidden", mode !== "2d");
  $("view3d").toggleAttribute("hidden", mode !== "3d");

  // La red FCC crece como n³: limitamos los anillos en 3D.
  ui.rings.max = mode === "3d" && ui.layout3d.value === "fcc" ? 4 : 6;
  if (+ui.rings.value > +ui.rings.max) ui.rings.value = ui.rings.max;

  if (mode === "3d") {
    if (!view3d) {
      $("count-hint").textContent = "Cargando 3D…";
      try {
        ({ View3D: View3DClass } = await import("./view3d.js"));
      } catch (err) {
        console.error(err);
        $("count-hint").textContent = "No se pudo cargar Three.js (¿sin conexión?)";
        return;
      }
      view3d = new View3DClass($("view3d"));
    }
    view3d.start();
  } else {
    view3d?.stop();
  }
  update();
}

for (const input of Object.values(ui)) input.addEventListener("input", update);
ui.layout3d.addEventListener("change", () => setMode(mode));
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));
$("animate").addEventListener("click", () => view2d.animate());
$("export-svg").addEventListener("click", () => view2d.exportSVG());

setMode(location.hash === "#3d" ? "3d" : "2d");
