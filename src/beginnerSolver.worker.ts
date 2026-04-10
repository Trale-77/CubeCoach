// @ts-nocheck
import f2lData from "../f2l_complete.json";
import f2lExtendedData from "../f2l_extended.json";
import f2lVolume3Data from "../f2l_volume3.json";
import f2lVolume4Data from "../f2l_volume4.json";
import {
  FACE_ORDER,
  SEARCH_MOVES,
  MOVE_AXIS,
  FACE_SEARCH_ORDER,
  FACE_NORMALS,
  cubieFaceMap,
  createSolvedState,
  cloneState,
  parseAlgorithm,
  applyMovesToState,
  applyMoveToState,
  serializeState,
  isSolved
} from "./lib/cube-core";

const BEGINNER_SEARCH_LIMITS = {
  maxNodes: 500000000,
  maxMs: 900000
};
const WHITE_CROSS_PREFERRED_MAX = 8;
const WHITE_CROSS_HARD_MAX = 12;
const CFOP_F2L_PREFERRED_MAX = 9;
const CFOP_F2L_HARD_MAX = 14;
const CFOP_F2L_SOFT_MAX = 12;
const CFOP_F2L_RECOVERY_MAX = 20;
let CFOP_F2L_STANDARD_CASES = null;
let CFOP_F2L_STANDARD_CASES_BY_SIGNATURE = null;
let CFOP_F2L_ADVANCED_CASES = null;
let CFOP_F2L_ADVANCED_CASES_BY_SIGNATURE = null;
const CFOP_F2L_LEARNED_ALGORITHMS_BY_SIGNATURE = new Map();
const CFOP_F2L_KNOWN_RECOVERY_SIGNATURES = new Set([
  "-1,1,1:x=D:y=F:z=R|-1,0,-1:x=F:z=R",
  "-1,1,1:x=D:y=F:z=R|-1,0,-1:x=R:z=F",
  "-1,1,-1:x=F:y=D:z=R|1,0,1:x=F:z=R",
  "-1,1,1:x=F:y=R:z=D|-1,0,1:x=F:z=R",
  "1,-1,-1:x=F:y=D:z=R|0,1,-1:y=R:z=F",
  "1,-1,1:x=D:y=F:z=R|-1,1,0:x=R:y=F",
  "1,-1,1:x=D:y=F:z=R|-1,1,0:x=R:y=F",
  "-1,1,-1:x=D:y=R:z=F|-1,0,1:x=F:z=R",
  "-1,-1,-1:x=D:y=F:z=R|0,1,-1:y=R:z=F",
  "1,-1,1:x=F:y=R:z=D|1,0,1:x=F:z=R",
  "1,-1,-1:x=F:y=D:z=R|1,0,-1:x=F:z=R",
  "1,1,1:x=D:y=R:z=F|0,1,-1:y=R:z=F",
  "-1,-1,-1:x=R:y=D:z=F|-1,1,0:x=F:y=R",
  "-1,-1,-1:x=F:y=R:z=D|0,1,-1:y=R:z=F",
  "1,1,1:x=D:y=R:z=F|1,0,-1:x=F:z=R",
  "-1,1,-1:x=F:y=D:z=R|1,0,1:x=R:z=F",
  "1,1,-1:x=F:y=R:z=D|-1,0,1:x=R:z=F",
  "1,-1,1:x=D:y=F:z=R|1,0,1:x=R:z=F"
]);
self.addEventListener("message", (event) => {
  const reportProgress = (message) => {
    self.postMessage({ id: event.data.id, type: "progress", message });
  };
  try {
    const result = computeBeginnerMethodSolution(event.data.cube, event.data.scope || "FULL", reportProgress);
    self.postMessage({ id: event.data.id, solution: result?.solution || null, breakdown: result?.breakdown || null });
  } catch (error) {
    self.postMessage({
      id: event.data.id,
      type: "error",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});


function buildCfopF2lCaseLibrary(groupNames) {
  const cases = [];
  for (const groupName of groupNames) {
    for (const entry of f2lData?.[groupName] || []) {
      const algorithms = [];
      for (const algorithm of entry?.algs?.FR || []) {
        const normalized = parseAlgorithm(algorithm).join(" ");
        if (!normalized || !isSupportedF2lAlgorithm(normalized)) continue;
        if (!algorithms.includes(normalized)) {
          algorithms.push(normalized);
        }
      }
      if (algorithms.length === 0) continue;
      const setupMoves = parseAlgorithm(entry.setup || "");
      if (!isSupportedF2lAlgorithm(setupMoves.join(" "))) continue;
      const setupState = applyMovesToState(createSolvedState(), setupMoves);
      const signature = computeCfopPairSignature(setupState, {
        corner: [1, -1, 1],
        edge: [1, 0, 1],
        frame: getSlotFrameForMiddleEdge([1, 0, 1])
      });
      cases.push({
        id: entry.id || `${groupName}_${entry.number}`,
        category: entry.category || groupName,
        signature,
        algorithms
      });
    }
  }
  return cases;
}

function buildCfopF2lExtendedCaseLibrary() {
  const cases = [];
  appendSectionedF2lCases(cases, f2lExtendedData);
  appendSectionedF2lCases(cases, f2lVolume3Data);
  appendSectionedF2lCases(cases, f2lVolume4Data);
  return cases;
}

function appendSectionedF2lCases(targetCases, sourceData) {
  for (const [sectionName, sectionValue] of Object.entries(sourceData || {})) {
    if (sectionName === "meta") continue;
    const entries = Array.isArray(sectionValue?.cases) ? sectionValue.cases : [];
    for (const entry of entries) {
      const algorithms = [];
      for (const algorithm of entry?.algs || []) {
        const normalized = parseAlgorithm(algorithm).join(" ");
        if (!normalized || !isSupportedF2lAlgorithm(normalized)) continue;
        if (!algorithms.includes(normalized)) {
          algorithms.push(normalized);
        }
      }
      if (algorithms.length === 0) continue;
      const setupMoves = parseAlgorithm(entry.setup || "");
      if (!isSupportedF2lAlgorithm(setupMoves.join(" "))) continue;
      const setupState = applyMovesToState(createSolvedState(), setupMoves);
      const signature = computeCfopPairSignature(setupState, {
        corner: [1, -1, 1],
        edge: [1, 0, 1],
        frame: getSlotFrameForMiddleEdge([1, 0, 1])
      });
      targetCases.push({
        id: entry.id || `${sectionName}_${entry.label || "case"}`,
        category: sectionName,
        signature,
        algorithms
      });
    }
  }
}

function buildCfopF2lCaseIndex(cases) {
  const index = new Map();
  for (const entry of cases) {
    if (!index.has(entry.signature)) {
      index.set(entry.signature, []);
    }
    index.get(entry.signature).push(entry);
  }
  return index;
}

function ensureCfopF2lCaseLibrary() {
  if (CFOP_F2L_STANDARD_CASES_BY_SIGNATURE) {
    return;
  }
  CFOP_F2L_STANDARD_CASES = buildCfopF2lCaseLibrary(["standard_f2l"]);
  CFOP_F2L_STANDARD_CASES_BY_SIGNATURE = buildCfopF2lCaseIndex(CFOP_F2L_STANDARD_CASES);
}

function ensureCfopF2lAdvancedCaseLibrary() {
  if (CFOP_F2L_ADVANCED_CASES_BY_SIGNATURE) {
    return;
  }
  CFOP_F2L_ADVANCED_CASES = buildCfopF2lCaseLibrary(["advanced_f2l"]).concat(buildCfopF2lExtendedCaseLibrary());
  CFOP_F2L_ADVANCED_CASES_BY_SIGNATURE = buildCfopF2lCaseIndex(CFOP_F2L_ADVANCED_CASES);
}

function isSupportedF2lAlgorithm(algorithm) {
  return algorithm
    .split(/\s+/)
    .every((token) => ["U", "D", "R", "L", "F", "B"].includes(token[0]));
}

function computeCfopPairSignature(currentState, pair) {
  const frame = pair.frame;
  const inverseFrame = {};
  for (const [relativeFace, actualFace] of Object.entries(frame)) {
    inverseFrame[actualFace] = relativeFace;
  }
  const cornerIdentity = getSolvedPieceIdentity(pair.corner);
  const edgeIdentity = getSolvedPieceIdentity(pair.edge);
  const cornerCoords = findPieceByIdentity(currentState, cornerIdentity);
  const edgeCoords = findPieceByIdentity(currentState, edgeIdentity);
  if (!cornerCoords || !edgeCoords) {
    return "missing";
  }
  return [
    serializeRelativePieceSignature(currentState, cornerCoords, frame, inverseFrame),
    serializeRelativePieceSignature(currentState, edgeCoords, frame, inverseFrame)
  ].join("|");
}

function serializeRelativePieceSignature(currentState, actualCoords, frame, inverseFrame) {
  const rel = getRelativeCoords(actualCoords, frame);
  const stickers = getStickerMapAtState(currentState, actualCoords);
  const parts = [`${rel.join(",")}`];
  if (rel[0] !== 0) {
    const actualFace = rel[0] > 0 ? frame.R : frame.L;
    parts.push(`x=${inverseFrame[stickers[actualFace]]}`);
  }
  if (rel[1] !== 0) {
    const actualFace = rel[1] > 0 ? frame.U : frame.D;
    parts.push(`y=${inverseFrame[stickers[actualFace]]}`);
  }
  if (rel[2] !== 0) {
    const actualFace = rel[2] > 0 ? frame.F : frame.B;
    parts.push(`z=${inverseFrame[stickers[actualFace]]}`);
  }
  return parts.join(":");
}

function createMoveJob(displayMove, move) {
  return {
    displayMove,
    move,
    layers: getLayersForMove(move),
    quarterTurns: getQuarterTurns(move)
  };
}

function getQuarterTurns(move) {
  return move.slice(1) === "2" ? 2 : 1;
}

function getLayersForMove(move) {
  const base = move[0];
  const suffix = move.slice(1);
  const sign = suffix === "'" ? -1 : 1;
  return getMoveLayers(base, sign);
}

function getMoveLayers(base, sign) {
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

function axisIndex(axis) {
  return axis === "x" ? 0 : axis === "y" ? 1 : 2;
}

function getStickerMapAtState(currentState, coords) {
  const faces = cubieFaceMap.get(coords.join(","));
  const stickers = {};
  for (const [faceName, facelet] of Object.entries(faces)) {
    stickers[faceName] = currentState[facelet.face][facelet.index];
  }
  return stickers;
}

function isPieceSolvedAt(currentState, coords) {
  const stickers = getStickerMapAtState(currentState, coords);
  return Object.entries(stickers).every(([face, sticker]) => sticker === face);
}

function isCorrectPieceAt(currentState, coords) {
  const stickers = Object.values(getStickerMapAtState(currentState, coords)).slice().sort().join("");
  const faces = Object.keys(getStickerMapAtState(currentState, coords)).slice().sort().join("");
  return stickers === faces;
}

function arePositionsSolved(currentState, targets) {
  return targets.every((coords) => isPieceSolvedAt(currentState, coords));
}

function serializeStickerMap(stickers) {
  return Object.entries(stickers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([face, sticker]) => `${face}${sticker}`)
    .join("");
}

function getSolvedPieceIdentity(coords) {
  return Object.keys(getStickerMapAtState(createSolvedState(), coords)).sort().join("");
}

function findPieceByIdentity(currentState, identity) {
  for (const [key, faces] of cubieFaceMap.entries()) {
    const coords = key.split(",").map(Number);
    const stickers = {};
    for (const [faceName, facelet] of Object.entries(faces)) {
      stickers[faceName] = currentState[facelet.face][facelet.index];
    }
    const stickerIdentity = Object.values(stickers).slice().sort().join("");
    if (stickerIdentity === identity) return coords;
  }
  return null;
}

function getBeginnerSearchKey(currentState, target, preservedTargets) {
  const allTargets = [target, ...preservedTargets];
  return allTargets.map((coords) => {
    const identity = getSolvedPieceIdentity(coords);
    const located = findPieceByIdentity(currentState, identity);
    const orientation = located ? serializeStickerMap(getStickerMapAtState(currentState, located)) : "missing";
    return `${coords.join(",")}=${located ? located.join(",") : "?"}:${orientation}`;
  }).join("|");
}

function shouldAbortBeginnerSearch(searchContext) {
  searchContext.nodes += 1;
  if (searchContext.nodes > searchContext.maxNodes) {
    searchContext.aborted = true;
    return true;
  }
  if (searchContext.nodes % 512 === 0 && Date.now() - searchContext.startedAt > searchContext.maxMs) {
    searchContext.aborted = true;
    return true;
  }
  return false;
}

function solveStageTargetsOneByOne(startState, orderedTargets, maxDepthPerTarget, searchContext) {
  let working = cloneState(startState);
  const moves = [];
  const solvedTargets = [];
  for (const target of orderedTargets) {
    if (isPieceSolvedAt(working, target) && arePositionsSolved(working, solvedTargets)) {
      solvedTargets.push(target);
      continue;
    }
    const targetMoves = findMovesForTargetWithPreservation(working, target, solvedTargets, maxDepthPerTarget, searchContext);
    if (targetMoves === null) return null;
    working = applyMovesToState(working, targetMoves);
    moves.push(...targetMoves);
    solvedTargets.push(target);
  }
  return moves;
}

function findMovesForTargetWithPreservation(startState, target, preservedTargets, maxDepth, searchContext) {
  if (isPieceSolvedAt(startState, target) && arePositionsSolved(startState, preservedTargets)) return [];
  const visited = new Map();
  for (let depth = 1; depth <= maxDepth; depth++) {
    visited.clear();
    const result = depthLimitedTargetSearch(startState, target, preservedTargets, depth, [], "", "", visited, searchContext);
    if (result) return result;
    if (searchContext.aborted) return null;
  }
  return null;
}

function depthLimitedTargetSearch(currentState, target, preservedTargets, depthRemaining, path, lastFace, lastAxis, visited, searchContext) {
  if (isPieceSolvedAt(currentState, target) && arePositionsSolved(currentState, preservedTargets)) return path.slice();
  if (depthRemaining === 0) return null;
  if (shouldAbortBeginnerSearch(searchContext)) return null;

  const stateKey = `${getBeginnerSearchKey(currentState, target, preservedTargets)}|${depthRemaining}`;
  if (visited.has(stateKey) && visited.get(stateKey) >= depthRemaining) return null;
  visited.set(stateKey, depthRemaining);

  for (const move of getCandidateMovesForTarget(currentState, target)) {
    const face = move[0];
    const axis = MOVE_AXIS[face];
    if (face === lastFace) continue;
    if (lastAxis && axis === lastAxis && FACE_SEARCH_ORDER[face] < FACE_SEARCH_ORDER[lastFace]) continue;
    const nextState = applyMoveToState(currentState, move);
    path.push(move);
    const result = depthLimitedTargetSearch(nextState, target, preservedTargets, depthRemaining - 1, path, face, axis, visited, searchContext);
    path.pop();
    if (result) return result;
    if (searchContext.aborted) return null;
  }
  return null;
}

function getCandidateMovesForTarget(currentState, target) {
  const identity = getSolvedPieceIdentity(target);
  const located = findPieceByIdentity(currentState, identity) || target;
  const currentFaces = Object.keys(getStickerMapAtState(currentState, located));
  const targetFaces = Object.keys(getStickerMapAtState(createSolvedState(), target));
  const allowedFaces = new Set([...currentFaces, ...targetFaces, "U"]);
  if (targetFaces.includes("D")) allowedFaces.add("D");
  const orderedFaces = ["U", "R", "F", "D", "L", "B"].filter((face) => allowedFaces.has(face));
  const moves = [];
  for (const face of orderedFaces) {
    moves.push(face, `${face}'`, `${face}2`);
  }
  return moves;
}

function buildAufAlgorithmOptions(algorithms) {
  const aufs = [[], ["U"], ["U2"], ["U'"]];
  const options = [];
  for (const auf of aufs) {
    for (const algorithm of algorithms) {
      options.push([...auf, ...algorithm]);
    }
  }
  return options;
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function getRelativeCoords(actualCoords, orientation) {
  return [
    dot(actualCoords, FACE_NORMALS[orientation.R]),
    dot(actualCoords, FACE_NORMALS[orientation.U]),
    dot(actualCoords, FACE_NORMALS[orientation.F])
  ];
}

function getRelativePiece(currentState, actualCoords, orientation) {
  const rel = getRelativeCoords(actualCoords, orientation);
  const stickers = getStickerMapAtState(currentState, actualCoords);
  return {
    actualCoords,
    pos: { x: rel[0], y: rel[1], z: rel[2] },
    colors: [
      rel[0] === 0 ? null : stickers[rel[0] > 0 ? orientation.R : orientation.L],
      rel[1] === 0 ? null : stickers[rel[1] > 0 ? orientation.U : orientation.D],
      rel[2] === 0 ? null : stickers[rel[2] > 0 ? orientation.F : orientation.B]
    ]
  };
}

function findRelativePieceByActualIdentity(currentState, actualIdentity, orientation) {
  const actualCoords = findPieceByIdentity(currentState, actualIdentity);
  return actualCoords ? getRelativePiece(currentState, actualCoords, orientation) : null;
}

function normalizePythonMoveToken(token) {
  if (!token) return "";
  if (token.endsWith("2")) return token[0] + "2";
  return token.endsWith("i") ? `${token[0]}'` : token;
}

function executeRelativeAlgorithm(currentState, moveList, orientation, algorithm) {
  let working = cloneState(currentState);
  for (const rawToken of algorithm.trim().split(/\s+/).filter(Boolean)) {
    const token = normalizePythonMoveToken(rawToken);
    const actualMove = `${orientation[token[0]]}${token.slice(1)}`;
    working = applyMoveToState(working, actualMove);
    moveList.push(actualMove);
  }
  return working;
}

function getRelativeFaceTurnNamesFromPiece(relativePiece) {
  if (relativePiece.pos.x !== 0) {
    return relativePiece.pos.x > 0 ? ["R", "R'"] : ["L", "L'"];
  }
  if (relativePiece.pos.y !== 0) {
    return relativePiece.pos.y > 0 ? ["U", "U'"] : ["D", "D'"];
  }
  if (relativePiece.pos.z !== 0) {
    return relativePiece.pos.z > 0 ? ["F", "F'"] : ["B", "B'"];
  }
  return [null, null];
}

function getSlotFrameForBottomCorner(coords) {
  const key = coords.join(",");
  const frames = {
    "1,-1,1": { F: "F", R: "R" },
    "1,-1,-1": { F: "R", R: "B" },
    "-1,-1,-1": { F: "B", R: "L" },
    "-1,-1,1": { F: "L", R: "F" }
  };
  const slot = frames[key];
  if (!slot) {
    throw new Error(`Unsupported bottom corner slot: ${key}`);
  }
  return {
    U: "U",
    D: "D",
    F: slot.F,
    B: oppositeFace(slot.F),
    R: slot.R,
    L: oppositeFace(slot.R)
  };
}

function oppositeFace(face) {
  return (
    face === "U" ? "D" :
    face === "D" ? "U" :
    face === "F" ? "B" :
    face === "B" ? "F" :
    face === "R" ? "L" :
    "R"
  );
}

function findMacroSequence(startState, goalFn, optionsBuilder, maxDepth) {
  if (goalFn(startState)) return [];
  const options = optionsBuilder();
  const startKey = serializeState(startState);
  const queue = [{ state: cloneState(startState), moves: [], depth: 0, lastOption: -1 }];
  const visited = new Map([[startKey, 0]]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.depth >= maxDepth) continue;
    for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
      if (optionIndex === current.lastOption) continue;
      const nextMoves = options[optionIndex];
      const nextState = applyMovesToState(current.state, nextMoves);
      const nextPath = current.moves.concat(nextMoves);
      if (goalFn(nextState)) return nextPath;
      const key = serializeState(nextState);
      const nextDepth = current.depth + 1;
      if (visited.has(key) && visited.get(key) <= nextDepth) continue;
      visited.set(key, nextDepth);
      queue.push({ state: nextState, moves: nextPath, depth: nextDepth, lastOption: optionIndex });
    }
  }
  return null;
}

function isYellowCrossSolved(currentState) {
  return ["U:1", "U:3", "U:5", "U:7"].every((key) => {
    const [face, index] = key.split(":");
    return currentState[face][Number(index)] === "U";
  });
}

function areTopEdgesSolved(currentState) {
  return (
    isPieceSolvedAt(currentState, [0, 1, 1]) &&
    isPieceSolvedAt(currentState, [1, 1, 0]) &&
    isPieceSolvedAt(currentState, [0, 1, -1]) &&
    isPieceSolvedAt(currentState, [-1, 1, 0])
  );
}

function areTopCornersPositioned(currentState) {
  return (
    isCorrectPieceAt(currentState, [1, 1, 1]) &&
    isCorrectPieceAt(currentState, [1, 1, -1]) &&
    isCorrectPieceAt(currentState, [-1, 1, -1]) &&
    isCorrectPieceAt(currentState, [-1, 1, 1])
  );
}

function areTopCornersOriented(currentState) {
  return (
    getStickerMapAtState(currentState, [1, 1, 1]).U === "U" &&
    getStickerMapAtState(currentState, [1, 1, -1]).U === "U" &&
    getStickerMapAtState(currentState, [-1, 1, -1]).U === "U" &&
    getStickerMapAtState(currentState, [-1, 1, 1]).U === "U"
  );
}

function isBeginnerLastLayerEdgesSolved(currentState) {
  return isYellowCrossSolved(currentState) && areTopEdgesSolved(currentState);
}

function isBeginnerLastLayerCornerPermutationSolved(currentState) {
  return isBeginnerLastLayerEdgesSolved(currentState) && areTopCornersPositioned(currentState);
}

function solveLastLayerEdgesBeginner(startState, edgePermAlg) {
  if (isBeginnerLastLayerEdgesSolved(startState)) {
    return [];
  }
  const aufs = [[], ["U"], ["U'"], ["U2"]];
  let best = null;

  for (const firstAuf of aufs) {
    const afterFirstAuf = applyMovesToState(startState, firstAuf);
    const oneAlg = firstAuf.concat(edgePermAlg);
    const afterOne = applyMovesToState(afterFirstAuf, edgePermAlg);
    for (const finalAuf of aufs) {
      const oneAlgCandidate = oneAlg.concat(finalAuf);
      const afterOneFinal = applyMovesToState(afterOne, finalAuf);
      if (isBeginnerLastLayerEdgesSolved(afterOneFinal)) {
        if (best === null || oneAlgCandidate.length < best.length) {
          best = oneAlgCandidate;
        }
      }
    }

    for (const secondAuf of aufs) {
      const afterSecondAuf = applyMovesToState(afterOne, secondAuf);
      const afterTwo = applyMovesToState(afterSecondAuf, edgePermAlg);
      for (const finalAuf of aufs) {
        const twoAlgCandidate = firstAuf.concat(edgePermAlg, secondAuf, edgePermAlg, finalAuf);
        const afterTwoFinal = applyMovesToState(afterTwo, finalAuf);
        if (isBeginnerLastLayerEdgesSolved(afterTwoFinal)) {
          if (best === null || twoAlgCandidate.length < best.length) {
            best = twoAlgCandidate;
          }
        }
      }
    }
  }

  return best;
}

function orientTopCornersBeginner(startState, cornerTwistAlg) {
  let working = cloneState(startState);
  const moves = [];
  let guard = 0;
  while (!areTopCornersOriented(working) && guard < 24) {
    guard += 1;
    if (getStickerMapAtState(working, [1, 1, 1]).U === "U") {
      const alignMoves = findAufThatMovesUnorientedCornerToFru(working);
      if (alignMoves === null) break;
      working = applyMovesToState(working, alignMoves);
      moves.push(...alignMoves);
    }
    const fru = getStickerMapAtState(working, [1, 1, 1]);
    const twists = fru.R === "U" ? 2 : fru.F === "U" ? 4 : 0;
    if (!twists) break;
    for (let i = 0; i < twists; i++) {
      working = applyMovesToState(working, cornerTwistAlg);
      moves.push(...cornerTwistAlg);
    }
  }
  if (!areTopCornersOriented(working)) return null;

  const finalAuf = findSolvedAuf(working);
  if (finalAuf) {
    moves.push(...finalAuf);
    working = applyMovesToState(working, finalAuf);
  }

  return areTopCornersOriented(working) ? moves : null;
}

function getPositionedTopCornerFrames(currentState) {
  const topCorners = [
    [1, 1, 1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, 1, 1]
  ];
  return topCorners
    .filter((coords) => isCorrectPieceAt(currentState, coords))
    .map((coords) => getSlotFrameForBottomCorner([coords[0], -1, coords[2]]));
}

function permuteTopCornersBeginner(startState, cornerPermAlg) {
  let working = cloneState(startState);
  const moves = [];
  let guard = 0;
  const defaultFrame = getSlotFrameForBottomCorner([1, -1, 1]);

  while (!isBeginnerLastLayerCornerPermutationSolved(working) && guard < 6) {
    guard += 1;
    const positionedFrames = getPositionedTopCornerFrames(working);
    const frame = positionedFrames[0] || defaultFrame;
    const next = applyMovesToState(working, applyRelativeAlgorithmTokens(frame, cornerPermAlg));
    moves.push(...applyRelativeAlgorithmTokens(frame, cornerPermAlg));
    working = next;
  }

  return isBeginnerLastLayerCornerPermutationSolved(working) ? moves : null;
}

function findAufThatMovesUnorientedCornerToFru(currentState) {
  const aufs = [[], ["U"], ["U'"], ["U2"]];
  for (const moves of aufs) {
    const next = applyMovesToState(currentState, moves);
    if (getStickerMapAtState(next, [1, 1, 1]).U !== "U") return moves;
  }
  return null;
}

function findSolvedAuf(currentState) {
  const aufs = [[], ["U"], ["U'"], ["U2"]];
  for (const moves of aufs) {
    if (isSolved(applyMovesToState(currentState, moves))) return moves;
  }
  return null;
}

function computeBeginnerMethodSolution(startState, scope = "FULL", reportProgress = () => {}) {
  const searchContext = {
    nodes: 0,
    startedAt: Date.now(),
    maxNodes: BEGINNER_SEARCH_LIMITS.maxNodes,
    maxMs: BEGINNER_SEARCH_LIMITS.maxMs,
    aborted: false
  };
  const yellowCrossAlg = parseAlgorithm("F R U R' U' F'");
  const edgePermAlg = parseAlgorithm("U R U R' U R U2 R'");
  const cornerPermAlg = parseAlgorithm("U R U' L' U R' U' L");
  const cornerTwistAlg = parseAlgorithm("R' D' R D");
  const whiteCrossTargets = [[0, -1, 1], [1, -1, 0], [0, -1, -1], [-1, -1, 0]];
  const whiteCornerTargets = [[1, -1, 1], [1, -1, -1], [-1, -1, -1], [-1, -1, 1]];
  const middleEdgeTargets = [[0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0]];
  const correctedMiddleEdgeTargets = [[1, 0, 1], [1, 0, -1], [-1, 0, -1], [-1, 0, 1]];

  let working = cloneState(startState);
  const solution = [];
  const breakdown = [];

  reportProgress("Computing white cross...");
  const crossSolve = solveWhiteCross(working, whiteCrossTargets, reportProgress);
  if (crossSolve === null) return null;
  working = applyMovesToState(working, crossSolve);
  solution.push(...crossSolve);
  breakdown.push({ label: "White Cross", moves: crossSolve.length });

  if (scope === "WHITE_CROSS") {
    return { solution, breakdown };
  }

  if (scope === "CFOP_F2L") {
    reportProgress("Computing CFOP F2L...");
    const f2lResult = solveCfopF2L(working, whiteCrossTargets, reportProgress);
    if (f2lResult === null) return null;
    working = applyMovesToState(working, f2lResult.moves);
    solution.push(...f2lResult.moves);
    breakdown[0] = { label: "CFOP Cross", moves: crossSolve.length };
    breakdown.push(...f2lResult.breakdown);
    return { solution, breakdown };
  }

  reportProgress("Computing white corners...");
  const cornerSolve = solveWhiteCorners(working, whiteCornerTargets, whiteCrossTargets, reportProgress);
  if (cornerSolve === null) return null;
  working = applyMovesToState(working, cornerSolve);
  solution.push(...cornerSolve);
  breakdown.push({ label: "White Corners", moves: cornerSolve.length });

  if (scope === "WHITE_CORNERS") {
    return { solution, breakdown };
  }

  reportProgress("Computing middle layer edges...");
  const middleResult = solveMiddleLayerEdges(working, correctedMiddleEdgeTargets, whiteCrossTargets.concat(whiteCornerTargets), reportProgress);
  if (middleResult === null) return null;
  working = applyMovesToState(working, middleResult.moves);
  solution.push(...middleResult.moves);
  breakdown.push(...middleResult.breakdown);

  if (scope === "MIDDLE_LAYER") {
    return { solution, breakdown };
  }

  const crossMoves = findMacroSequence(working, isYellowCrossSolved, () => buildAufAlgorithmOptions([yellowCrossAlg]), 4);
  if (crossMoves === null) return null;
  working = applyMovesToState(working, crossMoves);
  solution.push(...crossMoves);
  breakdown.push({ label: "Yellow Cross", moves: crossMoves.length });

  if (scope === "YELLOW_CROSS") {
    return { solution, breakdown };
  }

  const edgeMoves = solveLastLayerEdgesBeginner(working, edgePermAlg);
  if (edgeMoves === null) return null;
  working = applyMovesToState(working, edgeMoves);
  if (!isBeginnerLastLayerEdgesSolved(working)) return null;
  solution.push(...edgeMoves);
  breakdown.push({ label: "Last Layer Edges", moves: edgeMoves.length });

  if (scope === "LAST_LAYER_EDGES") {
    return { solution, breakdown };
  }

  const cornerPermMoves = permuteTopCornersBeginner(working, cornerPermAlg);
  if (cornerPermMoves === null) return null;
  working = applyMovesToState(working, cornerPermMoves);
  if (!isBeginnerLastLayerCornerPermutationSolved(working)) return null;
  solution.push(...cornerPermMoves);
  breakdown.push({ label: "Last Layer Corners (Permutation)", moves: cornerPermMoves.length });

  if (scope === "LAST_LAYER_CORNERS_PERMUTATION") {
    return { solution, breakdown };
  }

  const cornerOrientMoves = orientTopCornersBeginner(working, cornerTwistAlg);
  if (cornerOrientMoves === null) return null;
  working = applyMovesToState(working, cornerOrientMoves);
  solution.push(...cornerOrientMoves);
  breakdown.push({ label: "Last Layer Corners (Orientation)", moves: cornerOrientMoves.length });

  if (scope === "LAST_LAYER_CORNERS_ORIENTATION") {
    return { solution, breakdown };
  }

  return isSolved(working) ? { solution, breakdown } : null;
}

function solveCfopF2L(startState, crossTargets, reportProgress = () => {}) {
  const remainingPairs = [
    { corner: [1, -1, 1], edge: [1, 0, 1], frame: getSlotFrameForMiddleEdge([1, 0, 1]), label: "F2L Pair 1" },
    { corner: [1, -1, -1], edge: [1, 0, -1], frame: getSlotFrameForMiddleEdge([1, 0, -1]), label: "F2L Pair 2" },
    { corner: [-1, -1, -1], edge: [-1, 0, -1], frame: getSlotFrameForMiddleEdge([-1, 0, -1]), label: "F2L Pair 3" },
    { corner: [-1, -1, 1], edge: [-1, 0, 1], frame: getSlotFrameForMiddleEdge([-1, 0, 1]), label: "F2L Pair 4" }
  ];
  let working = cloneState(startState);
  const moves = [];
  const breakdown = [];
  const preserved = crossTargets.slice();

  while (remainingPairs.length > 0) {
    let bestShortIndex = -1;
    let bestShortResult = null;
    let bestShortPair = null;
    let bestAnyIndex = -1;
    let bestAnyResult = null;
    let bestAnyPair = null;

    for (let index = 0; index < remainingPairs.length; index++) {
      const pair = remainingPairs[index];
      reportProgress(`Evaluating ${pair.label.toLowerCase()}...`);
      if (
        isPieceSolvedAt(working, pair.corner) &&
        isPieceSolvedAt(working, pair.edge) &&
        arePositionsSolved(working, preserved)
      ) {
        bestShortIndex = index;
        bestShortResult = { moves: [], source: "solved" };
        bestShortPair = pair;
        break;
      }

      const pairResult = solveSingleCfopPair(
        working,
        pair,
        preserved,
        (detail) => reportProgress(`Evaluating ${pair.label.toLowerCase()}: ${detail}...`)
      );
      if (pairResult === null) {
        continue;
      }
      if (bestAnyResult === null || compareCfopPairResults(pairResult, bestAnyResult) < 0) {
        bestAnyIndex = index;
        bestAnyResult = pairResult;
        bestAnyPair = pair;
      }
      if (pairResult.moves.length <= CFOP_F2L_SOFT_MAX) {
        if (bestShortResult === null || compareCfopPairResults(pairResult, bestShortResult) < 0) {
          bestShortIndex = index;
          bestShortResult = pairResult;
          bestShortPair = pair;
        }
      }
    }

    const chosenIndex = bestShortResult !== null ? bestShortIndex : bestAnyIndex;
    const chosenResult = bestShortResult !== null ? bestShortResult : bestAnyResult;
    const chosenPair = bestShortResult !== null ? bestShortPair : bestAnyPair;

    if (chosenIndex === -1 || !chosenPair || chosenResult === null) {
      throw new Error("No solvable F2L pair was found from the current state.");
    }

    reportProgress(`Building ${chosenPair.label.toLowerCase()}...`);
    working = applyMovesToState(working, chosenResult.moves);
    moves.push(...chosenResult.moves);
    preserved.push(chosenPair.corner, chosenPair.edge);
      breakdown.push({
        label: chosenPair.label,
        moves: chosenResult.moves.length,
        source: chosenResult.source,
        detail: chosenResult.detail || ""
      });
    remainingPairs.splice(chosenIndex, 1);
  }

  return { moves, breakdown };
}

function solveSingleCfopPair(startState, pair, preservedTargets, reportProgress = () => {}) {
  const currentSignature = computeCfopPairSignature(startState, pair);
  const currentCornerCoords = findPieceByIdentity(startState, getSolvedPieceIdentity(pair.corner));
  const currentEdgeCoords = findPieceByIdentity(startState, getSolvedPieceIdentity(pair.edge));
  const prepDetail =
    `${pair.label.toLowerCase()} prep signature=${currentSignature} ` +
    `corner=${currentCornerCoords ? currentCornerCoords.join(",") : "missing"} ` +
    `edge=${currentEdgeCoords ? currentEdgeCoords.join(",") : "missing"}`;

  if (
    isPieceSolvedAt(startState, pair.corner) &&
    isPieceSolvedAt(startState, pair.edge) &&
    arePositionsSolved(startState, preservedTargets)
  ) {
    return { moves: [], source: "solved", detail: "" };
  }

  const algorithmMoves = tryCfopPairAlgorithms(startState, pair, preservedTargets);
  if (algorithmMoves) {
    return { moves: algorithmMoves, source: "alg", detail: "" };
  }

  const prepAndAlgorithmMoves = tryCfopPairPrepAndAlgorithms(startState, pair, preservedTargets);
  if (prepAndAlgorithmMoves) {
    return { moves: prepAndAlgorithmMoves, source: "prep", detail: prepDetail };
  }

  const wrongSlotMoves = tryCfopWrongSlotPairAlgorithms(startState, pair, preservedTargets);
  if (wrongSlotMoves) {
    return { moves: wrongSlotMoves, source: "prep", detail: prepDetail };
  }

  const trappedCornerMoves = tryCfopTrappedCornerAlgorithms(startState, pair, preservedTargets);
  if (trappedCornerMoves) {
    return { moves: trappedCornerMoves, source: "prep", detail: prepDetail };
  }

  const knownRecoveryMoves = tryCfopKnownRecoveryAlgorithms(startState, pair, preservedTargets);
  if (knownRecoveryMoves) {
    return { moves: knownRecoveryMoves, source: "prep", detail: prepDetail };
  }

  for (let depth = 0; depth <= CFOP_F2L_HARD_MAX; depth++) {
    const phaseLabel = depth <= CFOP_F2L_PREFERRED_MAX ? "preferred" : "extended";
    reportProgress(`${pair.label.toLowerCase()} (${phaseLabel} depth ${depth}/${CFOP_F2L_HARD_MAX})`);
    const visited = new Map();
    const result = depthLimitedCfopPairSearch(
      startState,
      pair,
      preservedTargets,
      depth,
      [],
      "",
      "",
      visited
    );
    if (result) {
      return { moves: result, source: "search", detail: "" };
    }
  }

  reportProgress(`${pair.label.toLowerCase()} fallback`);
  let working = cloneState(startState);
  const fallbackMoves = [];
  const fallbackSignature = computeCfopPairSignature(startState, pair);
  const fallbackCornerCoords = findPieceByIdentity(startState, getSolvedPieceIdentity(pair.corner));
  const fallbackEdgeCoords = findPieceByIdentity(startState, getSolvedPieceIdentity(pair.edge));
  const fallbackDetail =
    `${pair.label.toLowerCase()} fallback signature=${fallbackSignature} corner=${fallbackCornerCoords ? fallbackCornerCoords.join(",") : "missing"} edge=${fallbackEdgeCoords ? fallbackEdgeCoords.join(",") : "missing"}`;
  reportProgress(fallbackDetail);

  const cornerMoves = solveSingleWhiteCornerWithSolverPort(
    working,
    pair.corner,
    preservedTargets,
    () => {}
  );
  if (cornerMoves === null) {
    return null;
  }
  working = applyMovesToState(working, cornerMoves);
  fallbackMoves.push(...cornerMoves);

  const edgeMoves = solveSingleMiddleLayerEdge(
    working,
    pair.edge,
    preservedTargets.concat([pair.corner]),
    () => {}
  );
  if (edgeMoves === null) {
    return null;
  }
  fallbackMoves.push(...edgeMoves);

  return { moves: fallbackMoves, source: "fallback", detail: fallbackDetail };
}

function tryCfopPairPrepAndAlgorithms(currentState, pair, preservedTargets) {
  const prepMacros = buildCfopPrepMacros(pair.frame);
  let bestMoves = null;
  const initialSignature = computeCfopPairSignature(currentState, pair);

  for (const prep of prepMacros) {
    const prepped = applyMovesToState(currentState, prep);
    if (!arePositionsSolved(prepped, preservedTargets)) continue;
    const algMoves = tryCfopPairAlgorithms(prepped, pair, preservedTargets);
    if (!algMoves) continue;
    const candidate = prep.concat(algMoves);
    if (candidate.length > CFOP_F2L_HARD_MAX) continue;
    if (bestMoves === null || candidate.length < bestMoves.length) {
      bestMoves = candidate;
    }
  }

  if (bestMoves) {
    if (!CFOP_F2L_LEARNED_ALGORITHMS_BY_SIGNATURE.has(initialSignature)) {
      CFOP_F2L_LEARNED_ALGORITHMS_BY_SIGNATURE.set(initialSignature, []);
    }
    const learned = CFOP_F2L_LEARNED_ALGORITHMS_BY_SIGNATURE.get(initialSignature);
    const key = bestMoves.join(" ");
    if (!learned.some((moves) => moves.join(" ") === key)) {
      learned.push(bestMoves.slice());
      learned.sort((a, b) => a.length - b.length);
      if (learned.length > 6) {
        learned.length = 6;
      }
    }
  }

  return bestMoves;
}

function buildCfopPrepMacros(frame) {
  const tokens = [
    [],
    parseAlgorithm("R U R'"),
    parseAlgorithm("R U' R'"),
    parseAlgorithm("R U2 R'"),
    parseAlgorithm("F' U F"),
    parseAlgorithm("F' U' F"),
    parseAlgorithm("F' U2 F"),
    parseAlgorithm("L' U L"),
    parseAlgorithm("L' U' L"),
    parseAlgorithm("L' U2 L"),
    parseAlgorithm("B U B'"),
    parseAlgorithm("B U' B'"),
    parseAlgorithm("B U2 B'")
  ];
  return tokens.map((moves) => applyRelativeAlgorithmTokens(frame, moves));
}

function tryCfopWrongSlotPairAlgorithms(currentState, pair, preservedTargets) {
  const wrongSlotInfo = getConnectedWrongSlotInfo(currentState, pair);
  if (!wrongSlotInfo) {
    return null;
  }
  const occupiedFrame = getSlotFrameForMiddleEdge(wrongSlotInfo.edgeSlot);
  const relocationAlgs = [
    "R U' R'",
    "R U2 R'",
    "F' U F",
    "F' U2 F",
    "R U' R' U' R U R'",
    "F' U F U F' U' F",
    "R U' R' U' R U R' U2 R U' R'",
    "U R U' R' U' R U R' U2 R U' R'",
    "U' R U' R' U' R U R' U2 R U' R'",
    "U2 R U' R' U' R U R' U2 R U' R'"
  ];
  let best = null;

  for (const baseAlgorithm of relocationAlgs) {
    for (const frame of [occupiedFrame, pair.frame]) {
      const localized = applyRelativeAlgorithmTokens(frame, parseAlgorithm(baseAlgorithm));
      if (localized.length > CFOP_F2L_HARD_MAX) continue;
      const afterRelocation = applyMovesToState(currentState, localized);
      if (!arePositionsSolved(afterRelocation, preservedTargets)) continue;

      const solvedDirectly =
        isPieceSolvedAt(afterRelocation, pair.corner) &&
        isPieceSolvedAt(afterRelocation, pair.edge);
      if (solvedDirectly) {
        if (best === null || localized.length < best.length) {
          best = localized;
        }
        continue;
      }

      const rematch = tryCfopPairAlgorithms(afterRelocation, pair, preservedTargets);
      if (!rematch) continue;
      const candidate = localized.concat(rematch);
      if (candidate.length > CFOP_F2L_HARD_MAX) continue;
      const next = applyMovesToState(currentState, candidate);
      if (!arePositionsSolved(next, preservedTargets)) continue;
      if (!isPieceSolvedAt(next, pair.corner) || !isPieceSolvedAt(next, pair.edge)) continue;
      if (best === null || candidate.length < best.length) {
        best = candidate;
      }
    }
  }
  return best;
}

function tryCfopTrappedCornerAlgorithms(currentState, pair, preservedTargets) {
  const trappedInfo = getTrappedWrongSlotCornerInfo(currentState, pair);
  if (!trappedInfo) {
    return null;
  }
  const occupiedFrame = getSlotFrameForBottomCorner(trappedInfo.cornerCoords);
  const ejectionAlgs = [
    "R U R'",
    "R U2 R'",
    "F' U' F",
    "F' U2 F",
    "R U' R'",
    "F' U F"
  ];
  let best = null;

  for (const baseAlgorithm of ejectionAlgs) {
    const localized = applyRelativeAlgorithmTokens(occupiedFrame, parseAlgorithm(baseAlgorithm));
    const afterEject = applyMovesToState(currentState, localized);
    if (!arePositionsSolved(afterEject, preservedTargets)) continue;

    const rematch =
      tryCfopPairAlgorithms(afterEject, pair, preservedTargets) ||
      tryCfopPairPrepAndAlgorithms(afterEject, pair, preservedTargets);
    if (!rematch) continue;

    const candidate = localized.concat(rematch);
    if (candidate.length > CFOP_F2L_HARD_MAX) continue;
    const next = applyMovesToState(currentState, candidate);
    if (!arePositionsSolved(next, preservedTargets)) continue;
    if (!isPieceSolvedAt(next, pair.corner) || !isPieceSolvedAt(next, pair.edge)) continue;
    if (best === null || candidate.length < best.length) {
      best = candidate;
    }
  }

  return best;
}

function tryCfopKnownRecoveryAlgorithms(currentState, pair, preservedTargets) {
  const signature = computeCfopPairSignature(currentState, pair);
  if (!CFOP_F2L_KNOWN_RECOVERY_SIGNATURES.has(signature)) {
    return null;
  }

  const actualEdgeCoords = findPieceByIdentity(currentState, getSolvedPieceIdentity(pair.edge));
  const edgeRecoveryFrames = [];
  if (actualEdgeCoords && actualEdgeCoords[1] === 0) {
    try {
      edgeRecoveryFrames.push(getSlotFrameForMiddleEdge(actualEdgeCoords));
    } catch (error) {}
  }

  const frames = [
    pair.frame,
    ...edgeRecoveryFrames,
    getSlotFrameForMiddleEdge([1, 0, 1]),
    getSlotFrameForMiddleEdge([1, 0, -1]),
    getSlotFrameForMiddleEdge([-1, 0, -1]),
    getSlotFrameForMiddleEdge([-1, 0, 1])
  ];
  const recoveryAlgs = [
    "R U R'",
    "R U' R'",
    "R U2 R'",
    "F' U F",
    "F' U' F",
    "F' U2 F",
    "U R U' R'",
    "U' R U R'",
    "U2 R U' R'",
    "U F' U' F",
    "U' F' U F",
    "R U R' U'",
    "F' U' F U",
    "R U' R' U R U R'",
    "F' U F U' F' U' F",
    "U R U' R' U' F' U F",
    "U' L' U L U F U' F'"
  ];
  const edgeEjectOptions = edgeRecoveryFrames.flatMap((frame) => buildMiddleEdgeEjectOptions(frame));

  let best = null;
  const seen = new Set();
  for (const frame of frames) {
    for (const baseAlgorithm of recoveryAlgs) {
      const localized = applyRelativeAlgorithmTokens(frame, parseAlgorithm(baseAlgorithm));
      const localizedKey = localized.join(" ");
      if (seen.has(localizedKey)) continue;
      seen.add(localizedKey);
      if (localized.length > CFOP_F2L_RECOVERY_MAX) continue;
      const afterRecovery = applyMovesToState(currentState, localized);
      if (!arePositionsSolved(afterRecovery, preservedTargets)) continue;

      const directSolved =
        isPieceSolvedAt(afterRecovery, pair.corner) &&
        isPieceSolvedAt(afterRecovery, pair.edge);
      if (directSolved) {
        if (best === null || localized.length < best.length) {
          best = localized;
        }
        continue;
      }

      const rematch =
        tryCfopPairAlgorithms(afterRecovery, pair, preservedTargets) ||
        tryCfopPairPrepAndAlgorithms(afterRecovery, pair, preservedTargets) ||
        tryCfopWrongSlotPairAlgorithms(afterRecovery, pair, preservedTargets) ||
        tryCfopTrappedCornerAlgorithms(afterRecovery, pair, preservedTargets);
      if (!rematch) continue;

      const candidate = localized.concat(rematch);
      if (candidate.length > CFOP_F2L_RECOVERY_MAX) continue;
      const next = applyMovesToState(currentState, candidate);
      if (!arePositionsSolved(next, preservedTargets)) continue;
      if (!isPieceSolvedAt(next, pair.corner) || !isPieceSolvedAt(next, pair.edge)) continue;
      if (best === null || candidate.length < best.length) {
        best = candidate;
      }
    }
  }

  for (const localized of edgeEjectOptions) {
    const localizedKey = localized.join(" ");
    if (seen.has(localizedKey)) continue;
    seen.add(localizedKey);
    if (localized.length > CFOP_F2L_RECOVERY_MAX) continue;
    const afterRecovery = applyMovesToState(currentState, localized);
    if (!arePositionsSolved(afterRecovery, preservedTargets)) continue;

    const rematch =
      tryCfopPairAlgorithms(afterRecovery, pair, preservedTargets) ||
      tryCfopPairPrepAndAlgorithms(afterRecovery, pair, preservedTargets) ||
      tryCfopWrongSlotPairAlgorithms(afterRecovery, pair, preservedTargets) ||
      tryCfopTrappedCornerAlgorithms(afterRecovery, pair, preservedTargets);
    if (!rematch) continue;

    const candidate = localized.concat(rematch);
    if (candidate.length > CFOP_F2L_RECOVERY_MAX) continue;
    const next = applyMovesToState(currentState, candidate);
    if (!arePositionsSolved(next, preservedTargets)) continue;
    if (!isPieceSolvedAt(next, pair.corner) || !isPieceSolvedAt(next, pair.edge)) continue;
    if (best === null || candidate.length < best.length) {
      best = candidate;
    }
  }

  return best;
}

function getConnectedWrongSlotInfo(currentState, pair) {
  const frame = pair.frame;
  const cornerIdentity = getSolvedPieceIdentity(pair.corner);
  const edgeIdentity = getSolvedPieceIdentity(pair.edge);
  const cornerCoords = findPieceByIdentity(currentState, cornerIdentity);
  const edgeCoords = findPieceByIdentity(currentState, edgeIdentity);
  if (!cornerCoords || !edgeCoords) return null;
  const cornerRel = getRelativeCoords(cornerCoords, frame);
  const edgeRel = getRelativeCoords(edgeCoords, frame);
  const sameSlot =
    cornerRel[0] === edgeRel[0] &&
    cornerRel[2] === edgeRel[2] &&
    cornerRel[1] === -1 &&
    edgeRel[1] === 0;
  const wrongSlot = !(cornerRel[0] === 1 && cornerRel[2] === 1);
  if (!(sameSlot && wrongSlot)) {
    return null;
  }
  return {
    cornerCoords,
    edgeCoords,
    cornerRel,
    edgeRel,
    edgeSlot: edgeCoords
  };
}

function getTrappedWrongSlotCornerInfo(currentState, pair) {
  const cornerIdentity = getSolvedPieceIdentity(pair.corner);
  const edgeIdentity = getSolvedPieceIdentity(pair.edge);
  const cornerCoords = findPieceByIdentity(currentState, cornerIdentity);
  const edgeCoords = findPieceByIdentity(currentState, edgeIdentity);
  if (!cornerCoords || !edgeCoords) return null;
  if (cornerCoords[1] !== -1 || edgeCoords[1] !== 1) return null;
  if (isPieceSolvedAt(currentState, pair.corner) || isPieceSolvedAt(currentState, pair.edge)) return null;
  if (cornerCoords[0] === pair.corner[0] && cornerCoords[2] === pair.corner[2]) return null;
  return {
    cornerCoords,
    edgeCoords
  };
}

function tryCfopPairAlgorithms(currentState, pair, preservedTargets) {
  ensureCfopF2lCaseLibrary();
  const prefixAufs = [[], ["U"], ["U'"], ["U2"]];
  let bestMoves = null;

  for (const auf of prefixAufs) {
    const aufState = applyMovesToState(currentState, auf);
    const signature = computeCfopPairSignature(aufState, pair);
    const learnedAlgorithms = CFOP_F2L_LEARNED_ALGORITHMS_BY_SIGNATURE.get(signature) || [];
    for (const learned of learnedAlgorithms) {
      const candidate = auf.concat(learned);
      if (candidate.length > CFOP_F2L_HARD_MAX) continue;
      const next = applyMovesToState(currentState, candidate);
      if (!arePositionsSolved(next, preservedTargets)) continue;
      if (!isPieceSolvedAt(next, pair.corner) || !isPieceSolvedAt(next, pair.edge)) continue;
      if (bestMoves === null || candidate.length < bestMoves.length) {
        bestMoves = candidate;
      }
    }
    let matchingCases = CFOP_F2L_STANDARD_CASES_BY_SIGNATURE.get(signature) || [];
    if (matchingCases.length === 0) {
      ensureCfopF2lAdvancedCaseLibrary();
      matchingCases = CFOP_F2L_ADVANCED_CASES_BY_SIGNATURE.get(signature) || [];
    }
    for (const entry of matchingCases) {
      for (const algorithm of entry.algorithms) {
        const localized = applyRelativeAlgorithmTokens(pair.frame, parseAlgorithm(algorithm));
        const candidate = auf.concat(localized);
        if (candidate.length > CFOP_F2L_HARD_MAX) continue;
        const next = applyMovesToState(currentState, candidate);
        if (!arePositionsSolved(next, preservedTargets)) continue;
        if (!isPieceSolvedAt(next, pair.corner) || !isPieceSolvedAt(next, pair.edge)) continue;
        if (bestMoves === null || candidate.length < bestMoves.length) {
          bestMoves = candidate;
        }
      }
    }
  }

  return bestMoves;
}

function getCfopPairSourcePriority(source) {
  return (
    source === "solved" ? 0 :
    source === "alg" ? 1 :
    source === "prep" ? 2 :
    source === "search" ? 3 :
    4
  );
}

function compareCfopPairResults(a, b) {
  const sourceDelta = getCfopPairSourcePriority(a.source) - getCfopPairSourcePriority(b.source);
  if (sourceDelta !== 0 && Math.abs(a.moves.length - b.moves.length) <= 2) {
    return sourceDelta;
  }
  return a.moves.length - b.moves.length;
}

function depthLimitedCfopPairSearch(currentState, pair, preservedTargets, depthRemaining, path, lastFace, lastAxis, visited) {
  if (
    isPieceSolvedAt(currentState, pair.corner) &&
    isPieceSolvedAt(currentState, pair.edge) &&
    arePositionsSolved(currentState, preservedTargets)
  ) {
    return path.slice();
  }
  if (depthRemaining === 0) {
    return null;
  }

  const stateKey = `${getCfopPairSearchKey(currentState, pair, preservedTargets)}|${depthRemaining}`;
  if (visited.has(stateKey) && visited.get(stateKey) >= depthRemaining) {
    return null;
  }
  visited.set(stateKey, depthRemaining);

  for (const move of getCandidateMovesForCfopPair(pair.frame)) {
    const face = move[0];
    const axis = MOVE_AXIS[face];
    if (face === lastFace) continue;
    if (lastAxis && axis === lastAxis && FACE_SEARCH_ORDER[face] < FACE_SEARCH_ORDER[lastFace]) continue;
    const nextState = applyMoveToState(currentState, move);
    if (!arePositionsSolved(nextState, preservedTargets)) continue;
    path.push(move);
    const result = depthLimitedCfopPairSearch(
      nextState,
      pair,
      preservedTargets,
      depthRemaining - 1,
      path,
      face,
      axis,
      visited
    );
    path.pop();
    if (result) {
      return result;
    }
  }

  return null;
}

function getCandidateMovesForCfopPair(frame) {
  const tokens = [
    "U", "U'", "U2",
    "R", "R'", "R2",
    "F", "F'", "F2",
    "L", "L'", "L2",
    "B", "B'", "B2"
  ];
  return tokens.map((token) => `${frame[token[0]]}${token.slice(1)}`);
}

function getCfopPairSearchKey(currentState, pair, preservedTargets) {
  const targets = [pair.corner, pair.edge, ...preservedTargets];
  return targets.map((coords) => {
    const identity = getSolvedPieceIdentity(coords);
    const located = findPieceByIdentity(currentState, identity);
    const orientation = located ? serializeStickerMap(getStickerMapAtState(currentState, located)) : "missing";
    return `${identity}:${located ? located.join(",") : "?"}:${orientation}`;
  }).join("|");
}

function solveMiddleLayerEdges(startState, targets, preservedTargets, reportProgress = () => {}) {
  let working = cloneState(startState);
  const moves = [];
  const breakdown = [];
  const solvedTargets = preservedTargets.slice();
  for (const target of targets) {
    const index = breakdown.length + 1;
    reportProgress(`Computing middle layer edge ${index}...`);
    if (isPieceSolvedAt(working, target) && arePositionsSolved(working, solvedTargets)) {
      solvedTargets.push(target);
      breakdown.push({ label: `Middle Edge ${index}`, moves: 0 });
      continue;
    }
    const targetMoves = solveSingleMiddleLayerEdge(
      working,
      target,
      solvedTargets,
      (detail) => reportProgress(`Computing middle layer edge ${index}: ${detail}...`)
    );
    if (targetMoves === null) {
      throw new Error(`Middle edge ${index} could not be inserted.`);
    }
    working = applyMovesToState(working, targetMoves);
    moves.push(...targetMoves);
    solvedTargets.push(target);
    breakdown.push({ label: `Middle Edge ${index}`, moves: targetMoves.length });
  }
  return { moves, breakdown };
}

function solveSingleMiddleLayerEdge(startState, target, preservedTargets, reportProgress = () => {}) {
  const targetIdentity = getSolvedPieceIdentity(target);
  let working = cloneState(startState);
  const moves = [];
  const allFrames = [
    getSlotFrameForMiddleEdge([1, 0, 1]),
    getSlotFrameForMiddleEdge([1, 0, -1]),
    getSlotFrameForMiddleEdge([-1, 0, -1]),
    getSlotFrameForMiddleEdge([-1, 0, 1])
  ];
  let guard = 0;

  while (guard < 10) {
    guard += 1;
    reportProgress(`pass ${guard}`);
    if (isPieceSolvedAt(working, target) && arePositionsSolved(working, preservedTargets)) {
      return moves;
    }

    const located = findPieceByIdentity(working, targetIdentity);
    if (!located) return null;

    if (located[1] === 0) {
      reportProgress("ejecting wrong middle edge");
      const ejectOptions = allFrames.flatMap((frame) => buildMiddleEdgeEjectOptions(frame));
      let ejected = false;
      for (const option of ejectOptions) {
        const next = applyMovesToState(working, option);
        if (!arePositionsSolved(next, preservedTargets)) continue;
        const relocated = findPieceByIdentity(next, targetIdentity);
        if (!relocated || relocated[1] !== 1) continue;
        working = next;
        moves.push(...option);
        ejected = true;
        break;
      }
      if (!ejected) {
        throw new Error("No valid eject sequence preserved the solved pieces.");
      }
      continue;
    }

    if (located[1] !== 1) {
      throw new Error(`Target edge is on unsupported layer y=${located[1]}.`);
    }

    reportProgress("trying insert options");
    const insertOptions = findMiddleEdgeInsertionOptionsForTarget(working, target, allFrames, preservedTargets);
    if (insertOptions) {
      moves.push(...insertOptions);
      return moves;
    }

    throw new Error("No valid beginner insertion solved the target edge.");
  }

  throw new Error("Exceeded middle-edge pass limit.");
}

function getSlotFrameForMiddleEdge(coords) {
  const key = coords.join(",");
  const frames = {
    "1,0,1": { F: "F", R: "R" },
    "1,0,-1": { F: "R", R: "B" },
    "-1,0,-1": { F: "B", R: "L" },
    "-1,0,1": { F: "L", R: "F" }
  };
  const slot = frames[key];
  if (!slot) {
    throw new Error(`Unsupported middle edge slot: ${key}`);
  }
  return {
    U: "U",
    D: "D",
    F: slot.F,
    B: oppositeFace(slot.F),
    R: slot.R,
    L: oppositeFace(slot.R)
  };
}

function buildMiddleEdgeInsertionOptions(targetFrame) {
  const rightInsert = parseAlgorithm("U R U' R' U' F' U F");
  return [applyRelativeAlgorithmTokens(targetFrame, rightInsert)];
}

function buildMiddleEdgeEjectOptions(targetFrame) {
  const rightInsert = parseAlgorithm("U R U' R' U' F' U F");
  const leftInsert = parseAlgorithm("U' L' U L U F U' F'");
  return [
    applyRelativeAlgorithmTokens(targetFrame, rightInsert),
    applyRelativeAlgorithmTokens(targetFrame, leftInsert)
  ];
}

function findMiddleEdgeInsertionOptionsForTarget(currentState, target, allFrames, preservedTargets) {
  const aufs = [[], ["U"], ["U'"], ["U2"]];
  const insertMacros = allFrames.flatMap((frame) => buildMiddleEdgeEjectOptions(frame));
  for (const auf of aufs) {
    for (const macro of insertMacros) {
      const option = auf.concat(macro);
      const next = applyMovesToState(currentState, option);
      if (!arePositionsSolved(next, preservedTargets)) continue;
      if (!isPieceSolvedAt(next, target)) continue;
      return option;
    }
  }
  return null;
}

function applyRelativeAlgorithmTokens(orientation, tokens) {
  return tokens.map((token) => `${orientation[token[0]]}${token.slice(1)}`);
}

function solveWhiteCross(startState, targets, reportProgress = () => {}) {
  if (arePositionsSolved(startState, targets)) return [];
  for (let depth = 0; depth <= WHITE_CROSS_HARD_MAX; depth++) {
    const phaseLabel = depth <= WHITE_CROSS_PREFERRED_MAX ? "preferred" : "extended";
    reportProgress(`Computing white cross (${phaseLabel} depth ${depth}/${WHITE_CROSS_HARD_MAX})...`);
    const visited = new Map();
    const result = depthLimitedWhiteCrossSearch(startState, targets, depth, [], "", "", visited);
    if (result) {
      return result;
    }
  }
  return null;
}

function depthLimitedWhiteCrossSearch(currentState, targets, depthRemaining, path, lastFace, lastAxis, visited) {
  if (arePositionsSolved(currentState, targets)) {
    return path.slice();
  }
  if (depthRemaining === 0) {
    return null;
  }

  const unsolved = targets.filter((coords) => !isPieceSolvedAt(currentState, coords)).length;
  if (Math.ceil(unsolved / 2) > depthRemaining) {
    return null;
  }

  const stateKey = `${getWhiteCrossStateKey(currentState, targets)}|${depthRemaining}`;
  if (visited.has(stateKey) && visited.get(stateKey) >= depthRemaining) {
    return null;
  }
  visited.set(stateKey, depthRemaining);

  for (const move of SEARCH_MOVES) {
    const face = move[0];
    const axis = MOVE_AXIS[face];
    if (face === lastFace) continue;
    if (lastAxis && axis === lastAxis && FACE_SEARCH_ORDER[face] < FACE_SEARCH_ORDER[lastFace]) continue;
    const nextState = applyMoveToState(currentState, move);
    path.push(move);
    const result = depthLimitedWhiteCrossSearch(nextState, targets, depthRemaining - 1, path, face, axis, visited);
    path.pop();
    if (result) {
      return result;
    }
  }

  return null;
}

function getWhiteCrossStateKey(currentState, targets) {
  return targets.map((coords) => {
    const identity = getSolvedPieceIdentity(coords);
    const located = findPieceByIdentity(currentState, identity);
    const orientation = located ? serializeStickerMap(getStickerMapAtState(currentState, located)) : "missing";
    return `${identity}:${located ? located.join(",") : "?"}:${orientation}`;
  }).join("|");
}

function solveWhiteCorners(startState, targets, preservedTargets, reportProgress = () => {}) {
  let working = cloneState(startState);
  const moves = [];
  const solvedTargets = preservedTargets.slice();
  for (const target of targets) {
    reportProgress(`Computing white corner ${solvedTargets.length - preservedTargets.length + 1}...`);
    if (isPieceSolvedAt(working, target) && arePositionsSolved(working, solvedTargets)) {
      solvedTargets.push(target);
      continue;
    }
    const targetMoves = solveSingleWhiteCornerWithSolverPort(
      working,
      target,
      solvedTargets,
      (detail) => reportProgress(`Computing white corner ${solvedTargets.length - preservedTargets.length + 1}: ${detail}...`)
    );
    if (targetMoves === null) return null;
    working = applyMovesToState(working, targetMoves);
    moves.push(...targetMoves);
    solvedTargets.push(target);
  }
  return moves;
}

function solveSingleWhiteCornerWithSolverPort(startState, target, preservedTargets, reportProgress = () => {}) {
  const targetFrame = getSlotFrameForBottomCorner(target);
  const targetIdentity = [targetFrame.F, targetFrame.R, "D"].sort().join("");
  if (isPieceSolvedAt(startState, target) && arePositionsSolved(startState, preservedTargets)) {
    return [];
  }

  reportProgress("planning shortest corner route");
  const plan = findBestWhiteCornerPlan(startState, target, targetIdentity, targetFrame, preservedTargets);
  if (!plan) {
    reportProgress("falling back to standard corner routine");
    return solveSingleWhiteCornerIterative(startState, target, preservedTargets, reportProgress);
  }
  return plan;
}

function solveSingleWhiteCornerIterative(startState, target, preservedTargets, reportProgress = () => {}) {
  const targetFrame = getSlotFrameForBottomCorner(target);
  const targetIdentity = [targetFrame.F, targetFrame.R, "D"].sort().join("");
  let working = cloneState(startState);
  const moves = [];
  let guard = 0;

  while (guard < 12) {
    guard += 1;
    reportProgress(`pass ${guard}`);
    if (isPieceSolvedAt(working, target) && arePositionsSolved(working, preservedTargets)) {
      return moves;
    }

    const located = findPieceByIdentity(working, targetIdentity);
    if (!located) return null;

    if (located[1] === -1) {
      reportProgress("ejecting from bottom layer");
      const ejectFrame = getSlotFrameForBottomCorner(located);
      working = executeRelativeAlgorithm(working, moves, ejectFrame, "R U R'");
      if (!arePositionsSolved(working, preservedTargets)) return null;
      continue;
    }

    reportProgress("aligning over slot");
    let topPiece = getRelativePiece(working, located, targetFrame);
    let alignGuard = 0;
    while ((topPiece.pos.x !== 1 || topPiece.pos.y !== 1 || topPiece.pos.z !== 1) && alignGuard < 4) {
      working = applyMoveToState(working, "U");
      moves.push("U");
      alignGuard += 1;
      const relLocated = findPieceByIdentity(working, targetIdentity);
      if (!relLocated) return null;
      topPiece = getRelativePiece(working, relLocated, targetFrame);
    }
    if (topPiece.pos.x !== 1 || topPiece.pos.y !== 1 || topPiece.pos.z !== 1) return null;

    reportProgress("inserting");
    if (topPiece.colors[1] === "D") {
      working = executeRelativeAlgorithm(working, moves, targetFrame, "R U2 R' U' R U R'");
    } else if (topPiece.colors[0] === "D") {
      working = executeRelativeAlgorithm(working, moves, targetFrame, "R U R'");
    } else if (topPiece.colors[2] === "D") {
      working = executeRelativeAlgorithm(working, moves, targetFrame, "F' U' F");
    } else {
      return null;
    }

    if (!arePositionsSolved(working, preservedTargets)) return null;
    if (isPieceSolvedAt(working, target)) return moves;
  }

  return null;
}

function buildWhiteCrossOptionsForTarget(target) {
  const targetFace = target[2] === 1 ? "F" : target[0] === 1 ? "R" : target[2] === -1 ? "B" : "L";
  const sideFaces = [targetFace, "F", "R", "B", "L"];
  const uniqueFaces = Array.from(new Set(sideFaces));
  const options = [[], ["U"], ["U'"], ["U2"], ["D"], ["D'"], ["D2"]];
  for (const face of uniqueFaces) {
    options.push([face], [`${face}'`], [`${face}2`]);
    options.push([face, "U", `${face}'`]);
    options.push([face, "U'", `${face}'`]);
    options.push([`${face}'`, "U", face]);
    options.push([`${face}'`, "U'", face]);
    options.push([face, "D", `${face}'`]);
    options.push([face, "D'", `${face}'`]);
    options.push([`${face}'`, "D", face]);
    options.push([`${face}'`, "D'", face]);
  }
  return options;
}

function solveSingleWhiteCornerProcedurally(startState, target, preservedTargets) {
  const targetIdentity = getSolvedPieceIdentity(target);
  let working = cloneState(startState);
  const moves = [];
  let guard = 0;

  while (guard < 16) {
    guard += 1;
    if (isPieceSolvedAt(working, target) && arePositionsSolved(working, preservedTargets)) {
      return moves;
    }

    const located = findPieceByIdentity(working, targetIdentity);
    if (!located) return null;

    if (located[1] === -1) {
      const eject = buildWhiteCornerEjectSequence(target);
      const next = applyMovesToState(working, eject);
      if (!arePositionsSolved(next, preservedTargets)) return null;
      working = next;
      moves.push(...eject);
      continue;
    }

    const align = findWhiteCornerUAlignment(working, targetIdentity, target, preservedTargets);
    if (align === null) return null;
    if (align.length > 0) {
      working = applyMovesToState(working, align);
      moves.push(...align);
    }

    const preparedLocation = findPieceByIdentity(working, targetIdentity);
    if (!preparedLocation) return null;
    if (preparedLocation[1] !== 1) return null;

    const insertion = buildWhiteCornerInsertionSequence(target, getStickerMapAtState(working, preparedLocation));
    const next = applyMovesToState(working, insertion);
    if (!arePositionsSolved(next, preservedTargets)) return null;
    working = next;
    moves.push(...insertion);
  }

  return null;
}

function buildWhiteCornerEjectSequence(target) {
  const rightFace = target[0] === 1 ? "R" : "L";
  return [rightFace, "U", `${rightFace}'`];
}

function findBestWhiteCornerPlan(startState, target, targetIdentity, targetFrame, preservedTargets) {
  const located = findPieceByIdentity(startState, targetIdentity);
  if (!located) return null;

  if (located[1] === 1) {
    return findBestWhiteCornerTopInsertion(startState, target, targetIdentity, targetFrame, preservedTargets);
  }

  if (located[1] === -1) {
    const ejectFrame = getSlotFrameForBottomCorner(located);
    const ejectOptions = [
      applyRelativeAlgorithmTokens(ejectFrame, parseAlgorithm("R U R'")),
      applyRelativeAlgorithmTokens(ejectFrame, parseAlgorithm("F' U' F"))
    ];
    let best = null;
    for (const eject of ejectOptions) {
      const afterEject = applyMovesToState(startState, eject);
      if (!arePositionsSolved(afterEject, preservedTargets)) continue;
      const topPlan = findBestWhiteCornerTopInsertion(afterEject, target, targetIdentity, targetFrame, preservedTargets);
      if (!topPlan) continue;
      const candidate = eject.concat(topPlan);
      if (best === null || candidate.length < best.length) {
        best = candidate;
      }
    }
    return best;
  }

  return null;
}

function findBestWhiteCornerTopInsertion(currentState, target, targetIdentity, targetFrame, preservedTargets) {
  const aufs = [[], ["U"], ["U'"], ["U2"]];
  let best = null;

  for (const auf of aufs) {
    const afterAuf = applyMovesToState(currentState, auf);
    if (!arePositionsSolved(afterAuf, preservedTargets)) continue;
    const preparedLocation = findPieceByIdentity(afterAuf, targetIdentity);
    if (!preparedLocation || preparedLocation[1] !== 1) continue;
    const topPiece = getRelativePiece(afterAuf, preparedLocation, targetFrame);
    if (topPiece.pos.x !== 1 || topPiece.pos.y !== 1 || topPiece.pos.z !== 1) continue;

    const insertOptions = buildWhiteCornerInsertionOptions(target, getStickerMapAtState(afterAuf, preparedLocation));
    for (const insertion of insertOptions) {
      const candidate = auf.concat(insertion);
      const next = applyMovesToState(currentState, candidate);
      if (!arePositionsSolved(next, preservedTargets)) continue;
      if (!isPieceSolvedAt(next, target)) continue;
      if (best === null || candidate.length < best.length) {
        best = candidate;
      }
    }
  }

  return best;
}

function findWhiteCornerUAlignment(currentState, targetIdentity, target, preservedTargets) {
  const aufs = [[], ["U"], ["U'"], ["U2"]];
  for (const auf of aufs) {
    const next = applyMovesToState(currentState, auf);
    const located = findPieceByIdentity(next, targetIdentity);
    if (!located || located[1] !== 1) continue;
    if (located[0] === target[0] && located[2] === target[2] && arePositionsSolved(next, preservedTargets)) {
      return auf;
    }
  }
  return null;
}

function buildWhiteCornerInsertionSequence(target, stickers) {
  return buildWhiteCornerInsertionOptions(target, stickers)[0];
}

function buildWhiteCornerInsertionOptions(target, stickers) {
  const rightFace = target[0] === 1 ? "R" : "L";
  const frontFace = target[2] === 1 ? "F" : "B";
  const options = [];

  if (stickers.U === "D") {
    options.push([rightFace, "U", `${rightFace}'`, "U2", rightFace, "U", `${rightFace}'`]);
  }

  if (stickers[rightFace] === "D") {
    options.push([rightFace, "U", `${rightFace}'`]);
  }

  if (stickers[frontFace] === "D") {
    options.push([`${frontFace}'`, "U'", frontFace]);
  }

  if (options.length === 0) {
    options.push([rightFace, "U", `${rightFace}'`]);
  }

  return options.sort((a, b) => a.length - b.length);
}

function findMacroSequenceForTarget(startState, target, preservedTargets, options, maxDepth) {
  if (isPieceSolvedAt(startState, target) && arePositionsSolved(startState, preservedTargets)) return [];
  const startKey = `${getBeginnerSearchKey(startState, target, preservedTargets)}|0`;
  const queue = [{ state: cloneState(startState), moves: [], depth: 0, lastOption: -1 }];
  const visited = new Map([[startKey, 0]]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.depth >= maxDepth) continue;
    for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
      if (optionIndex === current.lastOption) continue;
      const nextMoves = options[optionIndex];
      const nextState = applyMovesToState(current.state, nextMoves);
      if (!arePositionsSolved(nextState, preservedTargets)) continue;
      const nextPath = current.moves.concat(nextMoves);
      if (isPieceSolvedAt(nextState, target)) {
        return nextPath;
      }
      const key = `${getBeginnerSearchKey(nextState, target, preservedTargets)}|${current.depth + 1}`;
      if (visited.has(key) && visited.get(key) <= current.depth + 1) continue;
      visited.set(key, current.depth + 1);
      queue.push({ state: nextState, moves: nextPath, depth: current.depth + 1, lastOption: optionIndex });
    }
  }
  return null;
}
