// An illustrative watershed in world coordinates. The camera projects the same
// relief, river and settlements for all three thematic layers.
const HALF_X = 1.16;
const HALF_Z = .77;
const NX = 42;
const NZ = 32;
const TAU = Math.PI * 2;
const clamp = (value) => Math.min(1, Math.max(0, value));

function riverX(z) {
  return .05 + .29 * Math.sin(4.1 * z + .35) + .075 * Math.sin(9 * z);
}

function hill(x, z, cx, cz, wx, wz) {
  return Math.exp(-(((x - cx) / wx) ** 2 + ((z - cz) / wz) ** 2));
}

function elevation(x, z) {
  const riverDistance = Math.abs(x - riverX(z));
  const valley = 1 - Math.exp(-((riverDistance / .25) ** 2));
  const ridges = .60 * hill(x, z, -.65, -.34, .52, .42) +
    .28 * hill(x, z, -.87, .23, .40, .33) +
    .51 * hill(x, z, .79, .32, .52, .39) +
    .31 * hill(x, z, .92, -.43, .46, .36);
  const folds = .045 * Math.sin(12 * x + 7 * z) + .024 * Math.sin(14 * z - 8 * x) +
    .012 * Math.cos(23 * x - 9 * z);
  return .024 + valley * Math.max(.015, .052 + ridges + folds);
}

function blend(a, b, amount) {
  const t = clamp(amount);
  return a.map((c, i) => c + (b[i] - c) * t);
}

function rgb(color) {
  return 'rgb(' + color.map((c) => Math.max(0, Math.min(255, Math.round(c)))).join(',') + ')';
}

function heatLevel(x, z) {
  return clamp(
    .98 * hill(x, z, -.32, .26, .32, .32) +
      .92 * hill(x, z, .55, -.32, .31, .28) + .72 * hill(x, z, .05, -.62, .29, .21),
  );
}

function faceColors(x, z) {
  const h = elevation(x, z);
  const slopeX = (elevation(x + .012, z) - elevation(x - .012, z)) / .024;
  const slopeZ = (elevation(x, z + .012) - elevation(x, z - .012)) / .024;
  const light = Math.max(.67, Math.min(1.19, .98 - .19 * slopeX - .16 * slopeZ));
  const relief = blend([126, 157, 131], [238, 227, 191], (h - .04) / .54).map((c) => c * light);
  const bank = Math.abs(x - riverX(z));
  const flood = clamp((.215 + .025 * Math.sin(7 * z) - bank) / .123);
  return {
    flood: rgb(blend(relief, [73, 179, 168], flood * .95)),
    heat: rgb(
      blend(blend(relief, [240, 173, 101], heatLevel(x, z) * 1.5), [199, 70, 44], heatLevel(x, z) ** 1.5),
    ),
    mobility: rgb(relief),
  };
}

function groundPoint(x, z, lift = 0) {
  return [x, elevation(x, z) + lift, z];
}

function contourSegments(corners) {
  const heights = corners.map((p) => p[1]);
  const low = Math.min(...heights), high = Math.max(...heights);
  const segments = [];
  for (let level = Math.ceil(low / .046) * .046; level < high; level += .046) {
    const hits = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      if ((a[1] < level) === (b[1] < level)) continue;
      const t = (level - a[1]) / (b[1] - a[1]);
      hits.push([a[0] + (b[0] - a[0]) * t, level + .0004, a[2] + (b[2] - a[2]) * t]);
    }
    for (let i = 1; i < hits.length; i += 2) segments.push([hits[i - 1], hits[i]]);
  }
  return segments;
}

const settlements = [[-.32, .26], [.55, -.32], [.05, -.61], [-.52, -.13]];
const streets = [[0, 3], [3, 2], [2, 1], [0, 1]];

function route(a, b) {
  return Array.from({ length: 33 }, (_, i) => {
    const t = i / 32;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t + .08 * Math.sin(Math.PI * t);
    return groundPoint(x, z, .012);
  });
}

export function createLandscape() {
  const grid = Array.from(
    { length: NZ + 1 },
    (_, j) =>
      Array.from(
        { length: NX + 1 },
        (_, i) => groundPoint(-HALF_X + 2 * HALF_X * i / NX, -HALF_Z + 2 * HALF_Z * j / NZ),
      ),
  );
  const tiles = [];
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const corners = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]];
      const x = (corners[0][0] + corners[2][0]) / 2, z = (corners[0][2] + corners[2][2]) / 2;
      tiles.push({ corners, x, z, fills: faceColors(x, z), contours: contourSegments(corners) });
    }
  }
  const rim = [
    ...grid[0],
    ...grid.slice(1).map((row) => row[NX]),
    ...grid[NZ].slice(0, -1).reverse(),
    ...grid.slice(1, -1).reverse().map((row) => row[0]),
  ];
  const river = Array.from({ length: 101 }, (_, i) => {
    const z = -HALF_Z + 2 * HALF_Z * i / 100;
    return groundPoint(riverX(z), z, .013);
  });
  const buildings = [];
  for (const [cx, cz] of settlements) {
    for (let i = 0; i < 6; i++) {
      const x = cx + ((i % 3) - 1) * .051, z = cz + (Math.floor(i / 3) - .5) * .056;
      buildings.push({ x, z, base: elevation(x, z), height: .019 + .024 * ((i * 7) % 5) / 4 });
    }
  }
  return {
    tiles,
    vertices: grid.flat(),
    edges: rim.map((a, i) => [a, rim[(i + 1) % rim.length]]),
    river,
    roads: streets.map(([a, b]) => route(settlements[a], settlements[b])),
    buildings,
  };
}

function polygon(ctx, points, fill, stroke, width) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function line(ctx, points, color, width) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function dot(ctx, p, r, color) {
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

const floodGauges = [-.48, .02, .48];
const heatSites = [settlements[0], settlements[1], settlements[2]];

export function drawLandscape(ctx, model, width, height, angle, time, layer) {
  const base = -.145;
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  const depth = (x, z) => -x * sine + z * cosine;
  const halfWidth = HALF_X * Math.abs(cosine) + HALF_Z * Math.abs(sine);
  const halfDepth = HALF_X * Math.abs(sine) + HALF_Z * Math.abs(cosine);
  const bottom = halfDepth * .48 - base * .875;
  let top = Infinity;
  for (const [x, y, z] of model.vertices) top = Math.min(top, depth(x, z) * .48 - y * .875);
  const scale = Math.min(width * .91 / (2 * halfWidth), height * .83 / (bottom - top));
  const centerY = height * .51 - (top + bottom) * scale / 2;
  const project = ([x, y, z]) => [
    width * .5 + (x * cosine + z * sine) * scale,
    centerY + (depth(x, z) * .48 - y * .875) * scale,
  ];
  ctx.clearRect(0, 0, width, height);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // The rock section under the relief keeps the model readable at any rotation.
  const lower = (p, y) => project([p[0], y, p[2]]);
  model.edges.sort(([a], [b]) => depth(a[0], a[2]) - depth(b[0], b[2]));
  for (const [a, b] of model.edges) {
    const side = Math.abs(a[0] - b[0]) < .0001;
    const ink = side ? '#6d725f' : '#83816a';
    polygon(ctx, [project(a), project(b), lower(b, base), lower(a, base)], ink, ink, .55);
    line(ctx, [lower(a, -.072), lower(b, -.072)], side ? '#a49a77' : '#b2a681', .8);
    line(ctx, [lower(a, -.12), lower(b, -.12)], '#5e6756', .65);
  }

  model.tiles.sort((a, b) => depth(a.x, a.z) - depth(b.x, b.z));
  for (const tile of model.tiles) {
    const color = tile.fills[layer];
    polygon(ctx, tile.corners.map(project), color, color, .64);
    if (tile.contours.length) {
      ctx.beginPath();
      for (const [a, b] of tile.contours) {
        ctx.moveTo(...project(a));
        ctx.lineTo(...project(b));
      }
      ctx.strokeStyle = 'rgba(55,75,53,.42)';
      ctx.lineWidth = Math.max(.48, scale * .0028);
      ctx.stroke();
    }
  }

  const river = model.river.map(project);
  line(ctx, river, layer === 'flood' ? '#257c78' : '#508a89', scale * .019);
  line(ctx, river, layer === 'flood' ? '#96ddd0' : '#a1c5ac', scale * .0075);
  model.roads.forEach((road) =>
    line(
      ctx,
      road.map(project),
      layer === 'mobility' ? '#ad5f30' : 'rgba(91,83,60,.55)',
      scale * (layer === 'mobility' ? .012 : .0045),
    )
  );

  model.buildings.sort((a, b) => depth(a.x, a.z) - depth(b.x, b.z));
  for (const { x, z, base: y, height: h } of model.buildings) {
    const dx = .018, dz = .014;
    const corners = [[x - dx, z - dz], [x + dx, z - dz], [x + dx, z + dz], [x - dx, z + dz]];
    const top = corners.map(([u, v]) => project([u, y + h, v]));
    const bottom = corners.map(([u, v]) => project([u, y, v]));
    const rightX = sine < 0 ? 1 : 3, frontZ = cosine > 0 ? 2 : 0;
    for (const [i, ink] of [[rightX, '#847c68'], [frontZ, '#b2a489']]) {
      const j = (i + 1) % 4;
      polygon(ctx, [bottom[i], bottom[j], top[j], top[i]], ink);
    }
    polygon(ctx, top, '#eee0bc');
  }

  if (layer === 'mobility') {
    model.roads.forEach((road, i) => {
      line(ctx, road.map(project), '#ffc674', Math.max(1.1, scale * .006));
      const travel = ((time * .18 + i * .29) % 1) * (road.length - 1);
      const a = road[Math.floor(travel)], b = road[Math.ceil(travel)], t = travel % 1;
      const p = project(a.map((v, k) => v + (b[k] - v) * t));
      dot(ctx, p, scale * .018, '#73431c');
      dot(ctx, p, scale * .011, '#fff6d6');
    });
  } else {
    const sites = layer === 'flood' ? floodGauges.map((z) => [riverX(z), z]) : heatSites;
    sites.forEach(([x, z], i) => {
      const t = (time * .46 + i * .33) % 1, color = layer === 'flood' ? '210,255,236' : '255,225,167';
      const wave = .025 + .075 * t;
      const ring = Array.from({ length: 31 }, (_, j) => {
        const u = x + wave * Math.cos(TAU * j / 30), v = z + wave * Math.sin(TAU * j / 30);
        return project(groundPoint(u, v, .015));
      });
      line(ctx, ring, 'rgba(' + color + ',' + (.9 * (1 - t)).toFixed(3) + ')', Math.max(.8, scale * .005));
      const foot = groundPoint(x, z, .018), head = [x, foot[1] + .076, z];
      line(ctx, [project(foot), project(head)], '#304c43', Math.max(.9, scale * .006));
      dot(ctx, project(head), scale * .018, '#304c43');
      dot(ctx, project(head), scale * .010, layer === 'flood' ? '#b3f4e2' : '#ffbe86');
    });
  }
}
