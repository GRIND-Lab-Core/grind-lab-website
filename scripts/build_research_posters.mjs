// Run with Node.js 22+ to update the static first frames from the live 3D geometry.
import { mkdir, writeFile } from "node:fs/promises";
import { makeFrame, sceneNames, view } from "../assets/research/direction-scenes.js";

const dest = new URL("../assets/research/directions/", import.meta.url);
await mkdir(dest, { recursive: true });
const number = (value) => Number(value.toFixed(1));

function element({ p, center, radius, fill, stroke, weight, alpha, dash }) {
  const style = [
    'fill="' + (fill ?? "none") + '"',
    stroke && 'stroke="' + stroke + '" stroke-width="' + number(weight) + '"',
    alpha < 1 && 'opacity="' + number(alpha) + '"',
    dash && 'stroke-dasharray="' + dash.join(" ") + '"',
  ].filter(Boolean).join(" ");
  if (center) {
    return '<circle cx="' + number(center[0]) + '" cy="' + number(center[1]) +
      '" r="' + number(radius) + '" ' + style + "/>";
  }
  const points = p.map(([x, y]) => number(x) + "," + number(y)).join(" ");
  const tag = fill ? "polygon" : "polyline";
  return "<" + tag + ' points="' + points + '" ' + style + "/>";
}

for (const name of sceneNames) {
  const shapes = makeFrame(name, 1).map(element).join("\n");
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + view.width + " " +
    view.height + '" stroke-linejoin="round" stroke-linecap="round">\n' + shapes + "\n</svg>\n";
  await writeFile(new URL(name + ".svg", dest), svg);
}
