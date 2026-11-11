import { View2D } from "./view2d.js";
import { hexCount, SOLIDS } from "./geometry.js";

const $ = (id) => document.getElementById(id);
// Casillas de los sólidos platónicos, generadas a partir de SOLIDS.
const solidList = $("solid-list");
for (const [kind, { name, color }] of Object.entries(SOLIDS)) {
  const label = document.createElement("label");
  label.innerHTML = `<input type="checkbox" data-solid="${kind}" /> <span class="swatch" style="background:${color}"></span> ${name}`;
  solidList.append(label);
}
const solidBoxes = [...solidList.querySelectorAll("input")];

const ui = {
  metatron: $("metatron"), solidSize: $("solid-size"), hidden: $("hidden-edges"),
  metatron3: $("metatron3"), vertexSpheres: $("vertex-spheres"),
  rings: $("rings"), layout3d: $("layout3d"), color: $("color"), stroke: $("stroke"),
  opacity: $("opacity"), outer: $("outer"), centers: $("centers"), wire: $("wire"), spin: $("spin"), ortho: $("ortho"),
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
    metatron: ui.metatron.checked,
    solids: solidBoxes.filter((b) => b.checked).map((b) => b.dataset.solid),
    sizes: ui.solidSize.value === "both" ? [2, 4] : [+ui.solidSize.value],
    metatron3: ui.metatron3.checked,
    vertexSpheres: ui.vertexSpheres.checked,
    hidden: ui.hidden.checked,
    ortho: ui.ortho.checked,
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

for (const input of [...Object.values(ui), ...solidBoxes]) input.addEventListener("input", update);
// Al activar el Cubo de Metatrón se muestran también los sólidos que contiene,
// anidados en sus dos tamaños (cada uno se puede apagar después).
const METATRON_SOLIDS = ["star", "cube", "octa", "ico", "dodeca"];
ui.metatron.addEventListener("change", () => {
  if (!ui.metatron.checked) return;
  for (const b of solidBoxes) b.checked = METATRON_SOLIDS.includes(b.dataset.solid);
  ui.solidSize.value = "both";
  update();
});
$("front-view").addEventListener("click", () => {
  ui.spin.checked = false;
  ui.ortho.checked = true;
  update();
  view3d?.frontView();
});
ui.layout3d.addEventListener("change", () => setMode(mode));
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => setMode(t.dataset.mode)));
$("animate").addEventListener("click", () => view2d.animate());
$("export-svg").addEventListener("click", () => view2d.exportSVG());

setMode(location.hash === "#3d" ? "3d" : "2d");
