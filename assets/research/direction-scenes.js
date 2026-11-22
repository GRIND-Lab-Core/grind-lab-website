// Orthographic illustrations share a camera and lighting, but each models a different process.
// World coordinates are [east, elevation, north]. The returned paths also produce the static artwork.
export const view = { width: 540, height: 312 };
const TAU = Math.PI * 2;
const INK = "#405751", ORANGE = "#ed822f", TEAL = "#377c7c";
const mix = (a, b, t) => a + (b - a) * t;
const between = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
const plan = (points, y) => points.map(([x, z]) => [x, y, z]);
function rect(x, z, width, depth) {
  const left = x - width / 2, right = x + width / 2;
  const back = z - depth / 2, front = z + depth / 2;
  return [[left, back], [right, back], [right, front], [left, front]];
}
const sequence = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
const colorCache = new Map();
function tint(hex, target, fraction) {
  const key = hex + target + fraction;
  if (!colorCache.has(key)) {
    const channels = [1, 3, 5].map((i) =>
      Math.round(mix(parseInt(hex.slice(i, i + 2), 16), parseInt(target.slice(i, i + 2), 16), fraction))
    );
    colorCache.set(key, "#" + channels.map((v) => v.toString(16).padStart(2, "0")).join(""));
  }
  return colorCache.get(key);
}

class Drawing {
  constructor(yaw, pitch, scale, originY) {
    this.sin = Math.sin(yaw);
    this.cos = Math.cos(yaw);
    this.tilt = Math.sin(pitch);
    this.up = Math.cos(pitch);
    this.scale = scale;
    this.originY = originY;
    this.shapes = [];
  }
  project([x, y, z]) {
    const depth = x * this.sin + z * this.cos;
    return [
      270 + (x * this.cos - z * this.sin) * this.scale,
      this.originY + (depth * this.tilt - y * this.up) * this.scale,
      depth * this.up + y * this.tilt,
    ];
  }
  path(points, fill, stroke, weight, layer = 0, alpha = 1, dash) {
    const p = points.map((point) => this.project(point));
    this.shapes.push({
      p,
      fill,
      stroke,
      weight,
      layer,
      alpha,
      dash,
      depth: p.reduce((sum, q) => sum + q[2], 0) / p.length,
    });
  }
  line(points, stroke, weight = 1, layer = 0, alpha = 1, dash) {
    this.path(points, null, stroke, weight, layer, alpha, dash);
  }
  face(points, fill, layer = 0, stroke = null, weight = .6, alpha = 1) {
    this.path(points, fill, stroke, weight, layer, alpha);
  }
  dot(location, radius, fill, layer = 0, stroke = null, weight = 1, alpha = 1) {
    const center = this.project(location);
    this.shapes.push({ center, radius, fill, layer, stroke, weight, alpha, depth: center[2] });
  }
  prism(footprint, bottom, top, color, layer = 0, edge = null) {
    const lo = plan(footprint, bottom), hi = plan(footprint, top);
    for (let i = 0; i < footprint.length; i++) {
      const j = (i + 1) % footprint.length;
      const dx = footprint[j][0] - footprint[i][0], dz = footprint[j][1] - footprint[i][1];
      if (dz * this.sin - dx * this.cos <= 0) continue;
      this.face([lo[i], lo[j], hi[j], hi[i]], tint(color, INK, dz > 0 ? .30 : .15), layer, edge);
    }
    this.face(hi, color, layer, edge);
  }
  box(x, z, w, d, bottom, top, color, layer = 0, edge = null) {
    this.prism(rect(x, z, w, d), bottom, top, color, layer, edge);
  }
  object(x, z, draw) {
    // Draw distant buildings as complete objects so their windows cannot show through nearer roofs.
    const first = this.shapes.length;
    draw();
    const depth = (x * this.sin + z * this.cos) * this.up;
    for (let i = first; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      shape.objectDepth = depth;
      shape.detail = shape.layer;
      shape.layer = 0;
    }
  }
}

function plotRoad(w, xz, width, layer = -1) {
  const pts = plan(xz, .045);
  w.line(pts, "#c6c1ae", width + 1.5, layer);
  w.line(pts, "#fbf6e6", width, layer + .01);
}
function tree(w, x, z, y, size, color) {
  w.box(x, z, .09 * size, .09 * size, y, y + .37 * size, "#987353");
  const ring = (h, r) =>
    sequence(
      7,
      (i) => [x + size * r * Math.cos(TAU * i / 7), y + h * size, z + size * r * Math.sin(TAU * i / 7)],
    );
  const base = ring(.22, .18), crown = ring(.43, .28), peak = [x - .035 * size, y + .80 * size, z];
  for (let i = 0; i < 7; i++) {
    const j = (i + 1) % 7;
    const shade = tint(color, INK, [.08, .16, .26, .31, .22, .12, .02][i]);
    w.face([base[i], base[j], crown[j], crown[i]], shade);
    w.face([crown[i], crown[j], peak], tint(color, INK, [.02, .08, .16, .22, .12, .06, 0][i]));
  }
}
function house(w, x, z, y, s, roof) {
  const a = .21 * s, b = .15 * s, top = y + .24 * s;
  w.box(x, z, a * 2, b * 2, y, top, "#f7e6c3");
  const ridge = [[x - a - .025 * s, top + .15 * s, z], [x + a + .025 * s, top + .15 * s, z]];
  for (const side of [-1, 1]) {
    const q = z + side * (b + .025 * s);
    w.face(
      [ridge[0], ridge[1], [ridge[1][0], top, q], [ridge[0][0], top, q]],
      side < 0 ? tint(roof, INK, .18) : roof,
    );
  }
  w.face([[x + a, top, z - b], [x + a, top, z + b], [x + a, top + .15 * s, z]], "#ead7b3");
  w.line(
    [[x + a + .001, y + .03 * s, z + .045 * s], [x + a + .001, top - .04 * s, z + .045 * s]],
    "#52645c",
    1.6 * s,
    .1,
  );
}
function trace(w, points, phase, color, layer = 2, size = 3) {
  const f = (phase % 1 + 1) % 1,
    part = f * (points.length - 1),
    index = Math.min(points.length - 2, Math.floor(part));
  const p = between(points[index], points[index + 1], part - index);
  w.dot(p, size + 2, color, layer, null, 1, .16);
  w.dot(p, size, color, layer, "#fff9eb", .9);
}

function evidence(w, t) {
  const levels = [.03, .83 + .075 * Math.sin(t * .58), 1.6 + .12 * Math.sin(t * .58 + .45)];
  const cell = .52, ox = -2.08, oz = -1.30;
  const colors = [["#bdccb6", "#86b2a3", "#d3dabd", "#92b9a9", "#a7c6b5"], [
    "#e0e7d5",
    "#bfccae",
    "#9cb7a4",
    "#e8ddbb",
    "#d3ddc8",
  ], ["#e8dfc8", "#e1d7ba", "#eee9d7", "#d8d0b8", "#f2e7cc"]];
  levels.forEach((h, k) => {
    const layer = k * 5;
    w.box(0, 0, 4.22, 2.66, h - .12, h, "#c6cbb9", layer, "#a2ae9d");
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 5; j++) {
        const x = ox + (i + .5) * cell, z = oz + (j + .5) * cell;
        const idx = Math.abs(Math.round(2 * Math.sin(i * .9 + j * .85) + Math.cos(i * .6 - j * 1.28)) + i + 4) %
          5;
        w.face(plan(rect(x, z, cell - .018, cell - .018), h + .011), colors[k][idx], layer + .2);
        if (k === 2) {
          const peak = Math.exp(-((i - 4.4) ** 2 / 3 + (j - 2.3) ** 2 / 1.6)) +
            .62 * Math.exp(-((i - 1.3) ** 2 + (j - 1) ** 2));
          if (peak > .15) {
            const height = .08 + peak * (.65 + .14 * Math.sin(t * .85 + i * .51 + j * .31));
            w.box(x, z, .375, .375, h + .013, h + height, peak > .52 ? "#f3943c" : "#e5b96e", layer + 1);
          }
        }
      }
    }
    if (k === 0) {
      const river = sequence(40, (i) => {
        const x = -2.06 + 4.12 * i / 39;
        return [x, h + .023, .40 * Math.sin(x * 2.3) + x * .18];
      });
      w.line(river, "#649493", 3.8, layer + .45);
    }
  });
  for (const [x, z] of [[-1.84, -1.04], [-1.84, 1.04], [1.84, 1.04], [1.84, -1.04]]) {
    for (let k = 0; k < 2; k++) {
      const link = [[x, levels[k], z], [x, levels[k + 1] - .1, z]];
      w.line(link, "#768779", .95, k * 5 + 3, .72, [2, 4]);
      if (z > 0) trace(w, link, t * .24 + (x + 2) * .17, "#b56d2d", k * 5 + 3.1, 1.8);
    }
  }
}

const patch = (x, z) => .10 + .035 * Math.sin(x * 2 + z) + .075 * Math.max(0, Math.sin(z * 1.7 - x * .65));
function observation(w, t) {
  w.box(0, 0, 4.84, 2.95, -.17, .065, "#c0baa1", -5);
  const nx = 22, nz = 13;
  const colors = ["#c4cd91", "#b0bd8a", "#9eb490", "#d2c093", "#c2cf9e", "#e5ce99"];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = -2.42 + 4.84 * i / nx, z = -1.475 + 2.95 * j / nz, dx = 4.84 / nx, dz = 2.95 / nz;
      const water = z < -.60 + .29 * Math.sin(x * 1.6) + .19 * x;
      const corners = [[x, z], [x + dx, z], [x + dx, z + dz], [x, z + dz]].map((
        [u, v],
      ) => [u, water ? .075 : patch(u, v), v]);
      const fill = water
        ? ["#83b8b6", "#8dbfbd", "#9bc6c2"][Math.abs(i + Math.floor(j / 3)) % 3]
        : colors[(Math.floor(i / 3) * 7 + Math.floor(j / 3) * 3 + Math.floor(i / 6 + j / 4)) % colors.length];
      w.face(corners, fill, -4, fill, .45);
    }
  }
  const sx = .75 * Math.sin(t * .42) - .12, sz = -.48, sy = 2.38 + .065 * Math.sin(t * .7);
  const sensor = [sx, sy - .18, sz], scanX = sx + .45 * Math.sin(t * .75) + .22;
  const footprint = plan(rect(scanX, .28, .63, 2.0), .205);
  w.face(footprint, "#96d8c8", -2, "#367e7b", 1.2, .72);
  for (let j = 0; j <= 6; j++) {
    w.line(
      [between(footprint[0], footprint[3], j / 6), between(footprint[1], footprint[2], j / 6)],
      "#e9fff0",
      .85,
      -1,
    );
  }
  w.face([sensor, footprint[0], footprint[3]], "#91cbc3", 0, null, 0, .20);
  w.face([sensor, footprint[1], footprint[2]], "#c4ded4", 0, null, 0, .32);
  for (const p of [footprint[0], footprint[2], footprint[3]]) w.line([sensor, p], "#599d97", .8, .2, .58);
  const orbit = sequence(30, (i) => {
    const x = -2.6 + 5.25 * i / 29;
    return [x, sy - .13 + .10 * Math.cos(x), sz - .12 * x * x];
  });
  w.line(orbit, "#aeaa8b", .85, 1, .82, [3, 4]);
  w.box(sx, sz, 1.18, .07, sy - .025, sy + .04, "#707e7b", 3);
  for (const side of [-1, 1]) {
    const cx = sx + side * 1.12;
    w.box(cx, sz, 1.30, .68, sy - .032, sy + .03, "#8faaa9", 3.2);
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        const x = cx - .65 + (i + .5) * 1.3 / 5, z = sz - .34 + (j + .5) * .68 / 3;
        w.face(plan(rect(x, z, .231, .196), sy + .04), ["#325470", "#446a81", "#52788c"][(i + j) % 3], 3.3);
      }
    }
  }
  w.box(sx, sz, .57, .51, sy - .24, sy + .23, "#edb765", 4, "#947b51");
  w.box(sx, sz, .45, .41, sy + .23, sy + .29, "#f4ddb0", 4.1);
  const lensZ = sz + .26;
  w.face(
    [[sx - .16, sy - .16, lensZ], [sx + .16, sy - .16, lensZ], [sx + .16, sy + .10, lensZ], [
      sx - .16,
      sy + .10,
      lensZ,
    ]],
    "#485b60",
    4.3,
  );
  w.dot([sx, sy - .035, lensZ], 5.6, "#8fb5b1", 4.4, "#334c50", 1.5);
  w.line([[sx + .18, sy + .26, sz], [sx + .27, sy + .54, sz - .05]], "#697973", 1.7, 4.5);
  w.dot([sx + .27, sy + .54, sz - .05], 2, "#e69d54", 4.6);
}

const riverZ = (x) => -.04 + .43 * Math.sin(1.35 * x + .30);
function valleyHeight(x, z) {
  const d = Math.abs(z - riverZ(x));
  return .05 + .25 * d + .13 * d * d + .14 * Math.sin(2.0 * x + .7 * z) * Math.min(d, 1.5) +
    .20 * Math.exp(-((x + 1.35) ** 2 + (z + 1.1) ** 2) * 1.7);
}
function valley(w, t) {
  const width = 4.95, depth = 3.32, nx = 29, nz = 19, dx = width / nx, dz = depth / nz;
  const hues = ["#b9ceb1", "#b2c7a4", "#acbf97", "#b6c29b", "#c2caa3", "#cfd0a8", "#dad3af", "#e0d7b5"];
  const terrain = (x, z) => [x, valleyHeight(x, z), z];
  w.box(0, 0, width, depth, -.18, .035, "#b7ad90", -6);
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = -width / 2 + i * dx, z = -depth / 2 + j * dz;
      const a = terrain(x, z), b = terrain(x + dx, z), c = terrain(x + dx, z + dz), d = terrain(x, z + dz);
      for (const tri of [[a, b, d], [b, c, d]]) {
        const h = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        const shade = Math.max(
          0,
          Math.min(7, Math.floor(h * 5.5 + .75 * Math.sin(x * 1.5) - .8 * Math.cos(z * 2))),
        );
        w.face(tri, hues[shade], -4, hues[shade], .52);
      }
      if (j === nz - 1) w.face([d, c, [c[0], .01, c[2]], [d[0], .01, d[2]]], "#b8af90", -5, "#b8af90", .5);
      if (i === nx - 1) w.face([b, c, [c[0], .01, c[2]], [b[0], .01, b[2]]], "#a59d82", -5, "#a59d82", .5);
    }
  }
  const samples = sequence(55, (i) => -width / 2 + width * i / 54);
  for (const side of [-1, 1]) {
    for (let k = 1; k <= 9; k++) {
      const ridge = [];
      for (const x of samples) {
        const z = riverZ(x) + side * (.18 * k + .040 * Math.sin(x * 2.5 + k * .7));
        if (Math.abs(z) < depth / 2) ridge.push(terrain(x, z));
        else if (ridge.length) w.line(ridge.splice(0), "#849679", .68, -3, .64);
      }
      if (ridge.length) w.line(ridge, "#849679", .68, -3, .64);
    }
  }
  const waterHeight = .175 + .047 * Math.sin(t * .63);
  function bank(x, side) {
    const channel = riverZ(x);
    let dry = 1.55, wet = 0;
    for (let i = 0; i < 9; i++) {
      const distance = (wet + dry) / 2;
      if (valleyHeight(x, channel + side * distance) > waterHeight) dry = distance;
      else wet = distance;
    }
    return [x, waterHeight, channel + side * wet];
  }
  const left = samples.map((x) => bank(x, -1)), right = samples.map((x) => bank(x, 1));
  const deepBank = ([x, h, z]) => [x, h, mix(riverZ(x), z, .72)];
  w.face([...left, ...right.slice().reverse()], "#97c6b3", -2);
  w.face([...left.map(deepBank), ...right.map(deepBank).reverse()], "#6aaba9", -1.9);
  w.line(right, "#e5edc9", 1.1, -1.8);
  for (let i = 0; i < 13; i++) {
    const f = (i / 13 + t * .051) % 1, x = -2.45 + f * 4.60;
    w.line(
      sequence(5, (k) => {
        const u = x + k * .046;
        return [u, waterHeight + .005, riverZ(u) + .07 * Math.sin(i * 2.4)];
      }),
      "#cde5d8",
      1.2,
      -1.7,
    );
  }
  const homes = [
    [-1.85, .57],
    [-1.4, .72],
    [-.98, .73],
    [-.61, .65],
    [-.29, .79],
    [.72, -.71],
    [1.06, -.91],
    [1.42, -.76],
    [1.78, -.62],
    [.13, .74],
    [1.72, .86],
  ];
  for (const [i, [x, offset]] of homes.entries()) {
    const z = riverZ(x) + offset;
    w.object(x, z, () => house(w, x, z, valleyHeight(x, z), .66, ["#c57c53", "#a88061", "#d59766"][i % 3]));
  }
  const trees = [
    [-2, -1],
    [-1.8, -1.27],
    [-1.46, -1.18],
    [-.72, -1.42],
    [-.43, -1.26],
    [-.19, -1.44],
    [.36, 1.24],
    [.58, 1.41],
    [.85, 1.22],
    [1.86, 1.28],
    [2.12, 1.06],
  ];
  for (const [i, [x, z]] of trees.entries()) {
    w.object(x, z, () => tree(w, x, z, valleyHeight(x, z), .56 + (i % 3) * .09, "#73977d"));
  }
  const bridgeX = .32, bridgeZ = riverZ(bridgeX);
  w.box(bridgeX, bridgeZ, .15, 1.26, .24, .30, "#ebc28e", .5);
  for (const x of [bridgeX - .073, bridgeX + .073]) {
    w.line([[x, .34, bridgeZ - .63], [x, .34, bridgeZ + .63]], "#735e48", .9, .65);
  }
}

function tower(w, x, z, width, depth, height, color) {
  w.box(x, z, width, depth, .05, height, color, 0);
  w.box(x, z, width * 1.045, depth * 1.045, height, height + .035, tint(color, "#fff6da", .36), .02);
  const floors = Math.floor((height - .13) / .18);
  for (let floor = 0; floor < floors; floor++) {
    const y = .17 + floor * .18;
    for (let j = 0; j < 3; j++) {
      const cx = x + width * (j - 1) / 3.9, cz = z + depth * (j - 1) / 3.9;
      w.line(
        [[cx - .034, y, z + depth / 2 + .005], [cx + .034, y, z + depth / 2 + .005]],
        "#766f60",
        1.7,
        .04,
        .86,
      );
      w.line(
        [[x + width / 2 + .005, y, cz - .033], [x + width / 2 + .005, y, cz + .033]],
        "#696d61",
        1.55,
        .04,
        .82,
      );
    }
  }
}
function flows(w, t) {
  w.box(0, 0, 4.88, 3.15, -.16, 0, "#cfc4a1", -5);
  const columns = 7, rows = 5, dx = 4.88 / columns, dz = 3.15 / rows;
  for (let i = 0; i < columns; i++) {
    for (let j = 0; j < rows; j++) {
      const x = -2.44 + (i + .5) * dx, z = -1.575 + (j + .5) * dz;
      const tone = (i < 3
        ? ["#dec3a1", "#e8ceae", "#e1bb97"]
        : i === 3
        ? ["#d6c7a1", "#dfccaa", "#d0c7a4"]
        : ["#adbe94", "#c3cda4", "#b7c89a"])[(i + 2 * j) % 3];
      w.face(plan(rect(x, z, dx - .026, dz - .032), .008), tone, -4);
    }
  }
  for (const x of [-1.48, -.61, .25]) plotRoad(w, [[x, -1.55], [x, 1.55]], 3.7);
  for (const z of [-.66, .33, 1.1]) plotRoad(w, [[-2.40, z], [.40, z]], 3.7);
  const trail = [[.15, 1.11], [.72, .78], [1.03, .16], [1.75, .04], [2.36, -.54]];
  plotRoad(w, trail, 3.4);
  const buildings = [
    [-1.94, -1.07, .48, .44, 1.37],
    [-1.08, -1.05, .52, .47, 1.84],
    [-.17, -1.04, .40, .37, .87],
    [-1.9, -.15, .54, .57, 1.55],
    [-1.04, -.18, .43, .51, 1.14],
    [-.13, -.18, .36, .38, .74],
    [-1.91, .71, .48, .40, .71],
    [-1.03, .73, .53, .37, .89],
    [-.16, .76, .43, .38, .48],
    [-1.68, 1.33, .30, .24, .36],
  ];
  buildings.forEach(([x, z, width, depth, h], i) => {
    const shadow = [
      [x - width / 2, z + depth / 2],
      [x + width / 2, z + depth / 2],
      [x + width / 2 + .21 * h, z + depth / 2 + .14 * h],
      [x + width / 2 + .21 * h, z - depth / 2 + .14 * h],
      [x + width / 2, z - depth / 2],
      [x - width / 2, z - depth / 2],
    ];
    w.face(plan(shadow, .049), "#6c6357", -.55, null, 0, .18);
    w.object(x, z, () => tower(w, x, z, width, depth, h, ["#dbab83", "#c89072", "#e6c69b", "#d7a07a"][i % 4]));
  });
  const grove = [
    [.70, -1.18],
    [1.02, -1.27],
    [1.38, -1.08],
    [1.85, -1.28],
    [2.08, -.88],
    [.71, -.57],
    [1.12, -.55],
    [1.47, -.42],
    [1.91, .48],
    [2.12, .73],
    [1.56, .63],
    [1.30, 1.11],
    [1.72, 1.25],
    [.52, 1.29],
    [.83, 1.19],
    [2.15, 1.3],
  ];
  grove.forEach(([x, z], i) =>
    w.object(
      x,
      z,
      () => tree(w, x, z, .025, .75 + (i * 7 % 5) * .11, ["#8eb08a", "#779e81", "#a1b780", "#87a871"][i % 4]),
    )
  );
  const routes = [
    [[-1.54, .31, .33], [-.07, .40, .70], [.83, .42, .63], [1.40, .28, .60]],
    [[-1.56, .44, -.72], [-.70, .61, -.88], [.63, .73, -.57], [1.45, .43, -.77]],
  ];
  routes.forEach((v, i) => {
    const pts = sequence(41, (k) => {
      const f = k / 40, g = 1 - f;
      return [0, 1, 2].map((c) =>
        g ** 3 * v[0][c] + 3 * g * g * f * v[1][c] + 3 * g * f * f * v[2][c] + f ** 3 * v[3][c] +
        (c === 1 ? .41 * Math.sin(Math.PI * f) : 0)
      );
    });
    w.line(pts, i === 0 ? "#bc652e" : "#337e78", 1.9, 1, .85);
    for (let j = 0; j < 2; j++) trace(w, pts, t * .12 + j * .5 + i * .24, i === 0 ? ORANGE : TEAL, 1.05, 2.7);
  });
}

function network(w, t) {
  const radius = 1.69, cy = 1.47, turn = .15 * t - .6;
  function onSphere(lat, lon, r = radius) {
    const phi = lat * Math.PI / 180, theta = lon * Math.PI / 180 + turn;
    return [r * Math.cos(phi) * Math.cos(theta), cy + r * Math.sin(phi), r * Math.cos(phi) * Math.sin(theta)];
  }
  const facing = ([x, y, z]) => ((x * w.sin + z * w.cos) * w.up + (y - cy) * w.tilt) / radius;
  w.dot([0, cy, 0], radius * w.scale, "#e3ece1", -4, "#9bb6a7", .9);
  function globeLine(points, color, width, layer, opacity) {
    let run = [], front;
    for (const point of points) {
      const visible = facing(point) >= 0;
      if (run.length && front !== visible) {
        run.push(point);
        w.line(run, front ? color : "#a9bdb1", front ? width : .67, front ? layer : -3, front ? opacity : .28);
        run = [point];
      } else run.push(point);
      front = visible;
    }
    if (run.length > 1) {
      w.line(run, front ? color : "#a9bdb1", front ? width : .67, front ? layer : -3, front ? opacity : .28);
    }
  }
  for (let lat = -60; lat <= 60; lat += 20) {
    globeLine(sequence(65, (i) => onSphere(lat, i * 360 / 64)), "#96b5a6", .75, -1, .8);
  }
  for (let lon = 0; lon < 360; lon += 24) {
    globeLine(sequence(37, (i) => onSphere(-90 + i * 5, lon)), "#96b5a6", .75, -1, .8);
  }
  // An irregular spherical mesh makes the local neighborhoods of the graph visible as the globe turns.
  const rings = [-61, -32, -3, 28, 57].map((lat, j) =>
    sequence(11, (i) => {
      const lon = i * 360 / 11 + (j % 2) * 16 + 6 * Math.sin(i * 4.1 + j);
      return onSphere(lat + 6 * Math.sin(i * 2.1 - j), lon);
    })
  );
  for (let j = 0; j < rings.length; j++) {
    for (let i = 0; i < 11; i++) {
      const a = rings[j][i], b = rings[j][(i + 1) % 11], c = rings[j + 1]?.[(i + (j % 2)) % 11];
      if (c && facing(a) > .18 && facing(b) > .05 && facing(c) > .05 && (i + 2 * j) % 3 === 0) {
        w.face([a, b, c], (i + j) % 2 ? "#a8cabe" : "#b8ceba", -.8, null, 0, .60);
      }
      for (const point of [b, c, rings[j + 1]?.[(i + (j % 2 ? 0 : 10)) % 11]]) {
        if (point && facing(a) > .01 && facing(point) > .01) w.line([a, point], "#799e90", .83, 0, .76);
      }
      if (facing(a) > .01) w.dot(a, 2.25, (i + j) % 3 === 0 ? "#b66d3d" : "#517f78", .3, "#edf2dc", .65);
    }
  }
  const hubs = [[32, 41], [49, 122], [-12, 83], [-26, 146], [11, -12], [38, -89], [-18, -49]];
  const links = [[0, 1], [0, 2], [2, 3], [4, 0], [5, 4], [5, 6], [1, 3], [6, 2]];
  links.forEach(([from, to], i) => {
    const a = onSphere(...hubs[from], 1), b = onSphere(...hubs[to], 1);
    a[1] -= cy;
    b[1] -= cy;
    const pts = sequence(35, (k) => {
      const f = k / 34,
        v = between(a, b, f),
        h = (radius + .025 + (.22 + .08 * (i % 3)) * Math.sin(Math.PI * f)) / Math.hypot(...v);
      return [h * v[0], cy + h * v[1], h * v[2]];
    });
    const visible = pts.filter((p) => facing(p) > -.015);
    if (visible.length > 1) w.line(visible, i % 3 === 1 ? "#397f7c" : "#db8846", 1.6, 1, .95);
    const p = pts[Math.floor(((t * .13 + i * .173) % 1) * 34)];
    if (facing(p) > .01) w.dot(p, 2.6, "#f9aa55", 1.1, "#fffae5", .9);
  });
  for (const [lat, lon] of hubs) {
    const p = onSphere(lat, lon, radius + .022);
    if (facing(p) > .01) {
      w.dot(p, 6, "#dc8c4c", 1.2, null, 0, .25);
      w.dot(p, 3.8, "#e3893d", 1.3, "#fff2cc", 1.15);
    }
  }
}

function access(w, t) {
  w.box(0, 0, 4.86, 3.2, -.18, .01, "#c6c4a5", -5);
  const centersX = [-1.98, -1.06, -.14, .78, 1.70], centersZ = [-1.13, -.34, .46, 1.22];
  const zoneColors = ["#e0bb91", "#e5cca3", "#dbd2ae", "#bccdab", "#a5c3a9"];
  centersX.forEach((x, i) =>
    centersZ.forEach((z, j) => {
      const skew = .10 * Math.sin(i * 1.3 + j);
      const footprint = [[x - .39, z - .29], [x + .36, z - .31 + skew], [x + .39, z + .28], [
        x - .37 + .06 * Math.cos(j),
        z + .28,
      ]];
      w.prism(footprint, .012, .055, zoneColors[Math.min(4, Math.max(0, i + (j === 1 ? -1 : 0)))], -3);
    })
  );
  const channel = sequence(40, (i) => {
    const z = -1.58 + 3.16 * i / 39;
    return [-.51 + .17 * Math.sin(z * 2.15), .070, z];
  });
  w.line(channel, "#75aaa7", 11, -2);
  w.line(channel, "#a0c7bb", 6, -1.99);
  for (const z of [-.73, .86]) w.box(-.51 + .17 * Math.sin(z * 2.15), z, .51, .18, .075, .12, "#ebdfbe", -1.7);
  const clinicX = 1.38, clinicZ = -.63;
  // Rings follow the map plane. The moving routes follow streets and cross at the footbridges.
  for (let i = 0; i < 3; i++) {
    const r = .36 + 1.35 * ((t * .095 + i / 3) % 1);
    const pts = sequence(
      80,
      (j) => [clinicX + r * Math.cos(j * TAU / 79), .086, clinicZ + .76 * r * Math.sin(j * TAU / 79)],
    );
    const run = [];
    for (const p of pts) {
      if (Math.abs(p[0]) < 2.39 && Math.abs(p[2]) < 1.52) run.push(p);
      else if (run.length) w.line(run.splice(0), "#57978b", 1.15, -1, .70, [3, 3.5]);
    }
    if (run.length) w.line(run, "#57978b", 1.15, -1, .7, [3, 3.5]);
  }
  const routes = [
    [[-2.04, 1.18], [-1.58, 1.18], [-1.58, .85], [-.02, .85], [.37, .52], [.37, -.14], [1.37, -.14], [
      1.37,
      -.50,
    ]],
    [[-.98, -1.12], [-.98, -.73], [.30, -.73], [.37, -.93], [1.38, -.93], [1.38, -.78]],
    [[1.87, .69], [1.87, .21], [1.43, .21], [1.43, -.42]],
  ];
  routes.forEach((coords, i) => {
    const pts = plan(coords, .139), color = ["#c77b3b", "#a0854d", "#438279"][i];
    w.line(pts, "#fbf3d9", 4.5, -.4);
    w.line(pts, color, 2.1, -.3);
    w.dot(pts[0], 4.2, color, -.2, "#fff6d9", 1.3);
    trace(w, pts, t * .11 + i * .21, color, -.1, 2.7);
  });
  for (
    const [x, z] of [
      [-2.10, -.94],
      [-1.77, -.92],
      [-1.92, -.24],
      [-1.62, .43],
      [-.98, .37],
      [.04, 1.21],
      [.76, .48],
      [1.70, 1.18],
      [1.88, -1.10],
    ]
  ) w.object(x, z, () => house(w, x, z, .064, .65, "#c29c75"));
  [[-.16, -1.21], [.77, -1.2], [.82, .98], [2.04, -.23], [-2.10, .37], [-.97, 1.21]].forEach(([x, z], i) =>
    w.object(x, z, () => tree(w, x, z, .055, .43 + (i % 2) * .10, "#8fa980"))
  );
  w.object(clinicX, clinicZ, () => {
    w.box(clinicX, clinicZ, .74, .55, .065, .60, "#e4e5d0", 1);
    w.box(clinicX, clinicZ, .78, .59, .60, .69, "#568a82", 1.2);
    w.box(clinicX, clinicZ, .135, .39, .691, .718, "#fff3cf", 1.4);
    w.box(clinicX, clinicZ, .40, .13, .691, .721, "#fff3cf", 1.41);
    w.face(
      [[clinicX - .12, .067, clinicZ + .28], [clinicX + .10, .067, clinicZ + .28], [
        clinicX + .10,
        .35,
        clinicZ + .28,
      ], [clinicX - .12, .35, clinicZ + .28]],
      "#6c9290",
      1.5,
    );
  });
}

const scenes = {
  geoai: { draw: evidence, yaw: .65, pitch: .52, scale: 72, origin: 204 },
  observation: { draw: observation, yaw: .58, pitch: .50, scale: 63, origin: 212 },
  hazards: { draw: valley, yaw: .64, pitch: .56, scale: 74, origin: 176 },
  systems: { draw: flows, yaw: .52, pitch: .46, scale: 75, origin: 197 },
  spatial: { draw: network, yaw: .54, pitch: .34, scale: 78, origin: 264 },
  equity: { draw: access, yaw: .62, pitch: .59, scale: 78, origin: 154 },
};
export const sceneNames = Object.keys(scenes);
export function makeFrame(name, t) {
  const scene = scenes[name];
  const frame = new Drawing(
    scene.yaw + .064 * Math.sin(t * .27),
    scene.pitch + .012 * Math.sin(t * .22),
    scene.scale,
    scene.origin,
  );
  scene.draw(frame, t);
  return frame.shapes.sort((a, b) =>
    a.layer - b.layer ||
    (a.objectDepth ?? a.depth) - (b.objectDepth ?? b.depth) ||
    (a.detail ?? 0) - (b.detail ?? 0) || a.depth - b.depth
  );
}
export function paint(context, shapes) {
  for (const { p, center, radius, fill, stroke, weight, alpha, dash } of shapes) {
    context.beginPath();
    if (center) context.arc(center[0], center[1], radius, 0, TAU);
    else {
      context.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length; i++) context.lineTo(p[i][0], p[i][1]);
      if (fill) context.closePath();
    }
    context.globalAlpha = alpha;
    if (fill) {
      context.fillStyle = fill;
      context.fill();
    }
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = weight;
      context.setLineDash(dash || []);
      context.stroke();
    }
  }
  context.globalAlpha = 1;
}
