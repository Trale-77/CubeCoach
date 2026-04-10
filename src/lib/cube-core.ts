// @ts-nocheck
export const FACE_ORDER = ["U", "D", "F", "B", "R", "L"];

export const OPPOSITE_FACE = {
  U: "D",
  D: "U",
  F: "B",
  B: "F",
  R: "L",
  L: "R"
};

export const FACE_COLOR_NAMES = {
  U: "Yellow",
  D: "White",
  F: "Red",
  B: "Orange",
  R: "Green",
  L: "Blue"
};

export const FACE_COLORS = {
  U: "#FFD500",
  D: "#FFFFFF",
  F: "#B90000",
  B: "#FF5900",
  R: "#009B48",
  L: "#0045AD"
};

export const SEARCH_MOVES = [
  "U", "U'", "U2",
  "R", "R'", "R2",
  "F", "F'", "F2",
  "D", "D'", "D2",
  "L", "L'", "L2",
  "B", "B'", "B2"
];

export const MOVE_AXIS = {
  U: "y",
  D: "y",
  R: "x",
  L: "x",
  F: "z",
  B: "z"
};

export const FACE_SEARCH_ORDER = {
  U: 0,
  D: 1,
  R: 2,
  L: 3,
  F: 4,
  B: 5
};

export const FACE_NORMALS = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0]
};

export const faceletMap = new Map();
export const reverseFaceletMap = new Map();
export const cubieFaceMap = new Map();

buildFaceletMaps();

export function buildFaceletMaps() {
  if (faceletMap.size > 0) return;

  for (const face of FACE_ORDER) {
    for (let index = 0; index < 9; index++) {
      const entry = faceletToEntry(face, index);
      faceletMap.set(`${face}:${index}`, entry);
      reverseFaceletMap.set(reverseKey(entry.position, entry.normal), { face, index });
    }
  }

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        const faces = {};
        if (x === 1) faces.R = reverseFaceletMap.get(reverseKey([x, y, z], [1, 0, 0]));
        if (x === -1) faces.L = reverseFaceletMap.get(reverseKey([x, y, z], [-1, 0, 0]));
        if (y === 1) faces.U = reverseFaceletMap.get(reverseKey([x, y, z], [0, 1, 0]));
        if (y === -1) faces.D = reverseFaceletMap.get(reverseKey([x, y, z], [0, -1, 0]));
        if (z === 1) faces.F = reverseFaceletMap.get(reverseKey([x, y, z], [0, 0, 1]));
        if (z === -1) faces.B = reverseFaceletMap.get(reverseKey([x, y, z], [0, 0, -1]));
        cubieFaceMap.set(`${x},${y},${z}`, faces);
      }
    }
  }
}

export function faceletToEntry(face, index) {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const u = col - 1;
  const v = 1 - row;
  switch (face) {
    case "F":
      return { position: [u, v, 1], normal: [0, 0, 1] };
    case "B":
      return { position: [-u, v, -1], normal: [0, 0, -1] };
    case "U":
      return { position: [u, 1, -v], normal: [0, 1, 0] };
    case "D":
      return { position: [u, -1, v], normal: [0, -1, 0] };
    case "R":
      return { position: [1, v, -u], normal: [1, 0, 0] };
    case "L":
      return { position: [-1, v, u], normal: [-1, 0, 0] };
    default:
      throw new Error(`Unknown face ${face}`);
  }
}

export function reverseKey(position, normal) {
  return `${position.join(",")}|${normal.join(",")}`;
}

export function createSolvedState() {
  return {
    U: Array(9).fill("U"),
    D: Array(9).fill("D"),
    F: Array(9).fill("F"),
    B: Array(9).fill("B"),
    R: Array(9).fill("R"),
    L: Array(9).fill("L")
  };
}

export function cloneState(source) {
  const next = {};
  for (const face of FACE_ORDER) {
    next[face] = source[face].slice();
  }
  return next;
}

export function parseAlgorithm(algorithm) {
  return algorithm
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[()]/g, "").replace(/1/g, "").replace(/3/g, "'"))
    .map((token) => token.replace(/2'$/g, "2"))
    .map((token) => token.replace(/^r/g, "R").replace(/^l/g, "L").replace(/^f/g, "F").replace(/^b/g, "B").replace(/^u/g, "U").replace(/^d/g, "D"))
    .filter((token) => /^[A-Za-z]/.test(token))
    .filter(Boolean);
}

export function generateScramble(length) {
  const bases = ["U", "D", "R", "L", "F", "B"];
  const suffixes = ["", "'", "2"];
  const axisGroup = {
    U: "y",
    D: "y",
    R: "x",
    L: "x",
    F: "z",
    B: "z"
  };

  const moves = [];
  let lastBase = null;
  let lastAxis = null;

  while (moves.length < length) {
    const base = bases[Math.floor(Math.random() * bases.length)];
    const axis = axisGroup[base];
    if (base === lastBase || axis === lastAxis) continue;
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    moves.push(`${base}${suffix}`);
    lastBase = base;
    lastAxis = axis;
  }

  return moves.join(" ");
}

export function invertAlgorithm(algorithm) {
  const tokens = parseAlgorithm(algorithm).reverse();
  return tokens.map(invertMove).join(" ");
}

export function invertMove(move) {
  if (move.endsWith("2")) return move;
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

export function createMoveJob(displayMove, move) {
  return {
    displayMove,
    move,
    layers: getLayersForMove(move),
    quarterTurns: getQuarterTurns(move)
  };
}

export function getQuarterTurns(move) {
  return move.slice(1) === "2" ? 2 : 1;
}

export function getLayersForMove(move) {
  const base = move[0];
  const suffix = move.slice(1);
  const sign = suffix === "'" ? -1 : 1;
  return getMoveLayers(base, sign);
}

export function getMoveLayers(base, sign) {
  const turn = -sign;
  const definitions = {
    U: [{ axis: "y", layer: 1, rotation: turn }],
    D: [{ axis: "y", layer: -1, rotation: -turn }],
    R: [{ axis: "x", layer: 1, rotation: turn }],
    L: [{ axis: "x", layer: -1, rotation: -turn }],
    F: [{ axis: "z", layer: 1, rotation: turn }],
    B: [{ axis: "z", layer: -1, rotation: -turn }],
    M: [{ axis: "x", layer: 0, rotation: turn }],
    x: [
      { axis: "x", layer: -1, rotation: turn },
      { axis: "x", layer: 0, rotation: turn },
      { axis: "x", layer: 1, rotation: turn }
    ],
    y: [
      { axis: "y", layer: -1, rotation: turn },
      { axis: "y", layer: 0, rotation: turn },
      { axis: "y", layer: 1, rotation: turn }
    ],
    r: [
      { axis: "x", layer: 0, rotation: turn },
      { axis: "x", layer: 1, rotation: turn }
    ],
    l: [
      { axis: "x", layer: -1, rotation: -turn },
      { axis: "x", layer: 0, rotation: -turn }
    ]
  };
  return definitions[base];
}

export function applyMovesToState(currentState, moves) {
  let next = cloneState(currentState);
  for (const move of moves) {
    next = applyMoveToState(next, move);
  }
  return next;
}

export function applyMoveToState(currentState, move) {
  let next = cloneState(currentState);
  const job = createMoveJob(move, move);
  for (let step = 0; step < job.quarterTurns; step++) {
    for (const layer of job.layers) {
      next = rotateLayerOnState(next, layer.axis, layer.layer, layer.rotation);
    }
  }
  return next;
}

export function rotateLayerOnState(currentState, axis, layer, rotation) {
  const next = cloneState(currentState);
  for (const face of FACE_ORDER) {
    for (let index = 0; index < 9; index++) {
      const key = `${face}:${index}`;
      const entry = faceletMap.get(key);
      if (entry.position[axisIndex(axis)] !== layer) continue;
      const rotatedPosition = rotateVector(entry.position, axis, rotation);
      const rotatedNormal = rotateVector(entry.normal, axis, rotation);
      const target = reverseFaceletMap.get(reverseKey(rotatedPosition, rotatedNormal));
      next[target.face][target.index] = currentState[face][index];
    }
  }
  return next;
}

export function axisIndex(axis) {
  return axis === "x" ? 0 : axis === "y" ? 1 : 2;
}

export function rotateVector(vector, axis, rotation) {
  let [x, y, z] = vector;
  const steps = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < steps; i++) {
    if (axis === "x") {
      [x, y, z] = [x, -z, y];
    } else if (axis === "y") {
      [x, y, z] = [z, y, -x];
    } else {
      [x, y, z] = [-y, x, z];
    }
  }
  return [x, y, z];
}

export function serializeState(currentState) {
  return FACE_ORDER.map((face) => currentState[face].join("")).join("|");
}

export function isSolved(current) {
  return FACE_ORDER.every((face) => current[face].every((value) => value === current[face][0]));
}
