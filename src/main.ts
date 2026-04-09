// @ts-nocheck
import * as THREE from "three";

const beginnerSolverWorker = new Worker(new URL("./beginnerSolver.worker.ts", import.meta.url), { type: "module" });
let beginnerSolverRequestId = 0;
const beginnerSolverPending = new Map();

beginnerSolverWorker.addEventListener("message", (event) => {
  const pending = beginnerSolverPending.get(event.data.id);
  if (!pending) return;
  if (event.data.type === "progress") {
    pending.onProgress?.(event.data.message || "");
    return;
  }
  if (event.data.type === "error") {
    beginnerSolverPending.delete(event.data.id);
    pending.resolve({ solution: null, breakdown: null, error: event.data.error || "Unknown beginner solver error." });
    return;
  }
  beginnerSolverPending.delete(event.data.id);
  pending.resolve({ solution: event.data.solution || null, breakdown: event.data.breakdown || null, error: null });
});

(() => {
      const FACE_ORDER = ["U", "D", "F", "B", "R", "L"];
      const OPPOSITE_FACE = {
        U: "D",
        D: "U",
        F: "B",
        B: "F",
        R: "L",
        L: "R"
      };
      const FACE_COLORS = {
        U: "#FFD500",
        D: "#FFFFFF",
        F: "#B90000",
        B: "#FF5900",
        R: "#009B48",
        L: "#0045AD"
      };
      const HIDDEN_COLOR = "#111111";
      const MATERIAL_INDEX_TO_FACE = ["R", "L", "U", "D", "F", "B"];
      const MOVE_BINDINGS = {
        u: "U",
        i: "U'",
        r: "R",
        e: "R'",
        l: "L",
        o: "L'",
        f: "F",
        v: "F'",
        b: "B",
        n: "B'",
        d: "D",
        s: "D'",
        m: "M",
        ",": "M'",
        k: "U2",
        j: "D2",
        h: "R2",
        g: "L2"
      };

      const OLL_CASES = [
        { name: "OLL 1", algorithm: "R U2 R' R' F R F' U2 R' F R F'" },
        { name: "OLL 2", algorithm: "r U r' U2 r U2 R' U2 R U' r'" },
        { name: "OLL 3", algorithm: "r' R2 U R' U r U2 r' U M'" },
        { name: "OLL 4", algorithm: "M U' r U2 r' U' R U' R' M'" },
        { name: "OLL 5", algorithm: "l' U2 L U L' U l" },
        { name: "OLL 6", algorithm: "r U2 R' U' R U' r'" },
        { name: "OLL 7", algorithm: "r U R' U R U2 r'" },
        { name: "OLL 8", algorithm: "l' U' L U' L' U2 l" },
        { name: "OLL 9", algorithm: "R U R' U' R' F R2 U R' U' F'" },
        { name: "OLL 10", algorithm: "R U R' U R' F R F' R U2 R'" },
        { name: "OLL 11", algorithm: "r U R' U R' F R F' R U2 r'" },
        { name: "OLL 12", algorithm: "M' R' U' R U' R' U2 R U' R r'" },
        { name: "OLL 13", algorithm: "F U R U' R2 F' R U R U' R'" },
        { name: "OLL 14", algorithm: "R' F R U R' F' R F U' F'" },
        { name: "OLL 15", algorithm: "l' U' l L' U' L U l' U l" },
        { name: "OLL 16", algorithm: "r U r' R U R' U' r U' r'" },
        { name: "OLL 17", algorithm: "F R' F' R2 r' U R U' R' U' M'" },
        { name: "OLL 18", algorithm: "r U R' U R U2 r' r' U' R U' R' U2 r" },
        { name: "OLL 19", algorithm: "r' R U R U R' U' M' R' F R F'" },
        { name: "OLL 20", algorithm: "r U R' U' M2 U R U' R' U' M'" },
        { name: "OLL 21", algorithm: "R U2 R' U' R U R' U' R U' R'" },
        { name: "OLL 22", algorithm: "R U2 (R2 U' R2 U' R2) U2 R" },
        { name: "OLL 23", algorithm: "R2 D' R U2 R' D R U2 R" },
        { name: "OLL 24", algorithm: "r U R' U' r' F R F'" },
        { name: "OLL 25", algorithm: "F' r U R' U' r' F R" },
        { name: "OLL 26", algorithm: "(R U2 R') U' R U' R'" },
        { name: "OLL 27", algorithm: "R U R' U R U2 R'" },
        { name: "OLL 28", algorithm: "r U R' U' r' R U R U' R'" },
        { name: "OLL 29", algorithm: "R U R' U' R U' R' F' U' F R U R'" },
        { name: "OLL 30", algorithm: "F R' F R2 U' R' U' R U R' F2" },
        { name: "OLL 31", algorithm: "R' U' F U R U' R' F' R" },
        { name: "OLL 32", algorithm: "L U F' U' L' U L F L'" },
        { name: "OLL 33", algorithm: "R U R' U' R' F R F'" },
        { name: "OLL 34", algorithm: "R U R2 U' R' F R U R U' F'" },
        { name: "OLL 35", algorithm: "R U2 R' R' F R F' R U2 R'" },
        { name: "OLL 36", algorithm: "L' U' L U' L' U L U L F' L' F" },
        { name: "OLL 37", algorithm: "F R' F' R U R U' R'" },
        { name: "OLL 38", algorithm: "R U R' U R U' R' U' R' F R F'" },
        { name: "OLL 39", algorithm: "L F' L' U' L U F U' L'" },
        { name: "OLL 40", algorithm: "R' F R U R' U' F' U R" },
        { name: "OLL 41", algorithm: "R U R' U R U2 R' F R U R' U' F'" },
        { name: "OLL 42", algorithm: "R' U' R U' R' U2 R F R U R' U' F'" },
        { name: "OLL 43", algorithm: "F' U' L' U L F" },
        { name: "OLL 44", algorithm: "F U R U' R' F'" },
        { name: "OLL 45", algorithm: "F R U R' U' F'" },
        { name: "OLL 46", algorithm: "R' U' R' F R F' U R" },
        { name: "OLL 47", algorithm: "R' U' R' F R F' R' F R F' U R" },
        { name: "OLL 48", algorithm: "F R U R' U' R U R' U' F'" },
        { name: "OLL 49", algorithm: "r U' r2 U r2 U r2 U' r" },
        { name: "OLL 50", algorithm: "r' U r2 U' r2 U' r2 U r'" },
        { name: "OLL 51", algorithm: "F U R U' R' U R U' R' F'" },
        { name: "OLL 52", algorithm: "R U R' U R U' B U' B' R'" },
        { name: "OLL 53", algorithm: "l' U2 L U L' U' L U L' U l" },
        { name: "OLL 54", algorithm: "(r U2 R' U') R U R' U' R U' r'" },
        { name: "OLL 55", algorithm: "R' F R U R U' R2 F' R2 U' R' U R U R'" },
        { name: "OLL 56", algorithm: "(r' U' r) U' R' U R U' R' U R r' U r" },
        { name: "OLL 57", algorithm: "R U R' U' M' U R U' r'" }
      ];

      const PLL_CASES = [
        { name: "H Perm", algorithm: "M2 U M2 U2 M2 U M2" },
        { name: "Z Perm", algorithm: "M' U M2 U M2 U M' U2 M2" },
        { name: "Ua Perm", algorithm: "M2 U M U2 M' U M2" },
        { name: "Ub Perm", algorithm: "M2 U' M U2 M' U' M2" },
        { name: "Aa Perm", algorithm: "x L2 D2 L' U' L D2 L' U L'" },
        { name: "Ab Perm", algorithm: "x' L2 D2 L U L' D2 L U' L" },
        { name: "E Perm", algorithm: "x' L' U L D' L' U' L D L' U' L D' L' U L D" },
        { name: "F Perm", algorithm: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
        { name: "Ja Perm", algorithm: "x R2 F R F' R U2 r' U r U2" },
        { name: "Jb Perm", algorithm: "R U R' F' R U R' U' R' F R2 U' R'", setupAuf: "U" },
        { name: "Ra Perm", algorithm: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
        { name: "Rb Perm", algorithm: "R2 F R U R U' R' F' R U2 R' U2 R" },
        { name: "T Perm", algorithm: "R U R' U' R' F R2 U' R' U' (R U R') F'" },
        { name: "Y Perm", algorithm: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
        { name: "V Perm", algorithm: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
        { name: "Na Perm", algorithm: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
        { name: "Nb Perm", algorithm: "R' (U R U' R') F' U' F R U R' F R' F' R U' R" },
        { name: "Ga Perm", algorithm: "R2 U R' U R' U' R U' R2 (U' D) R' U R D'" },
        { name: "Gb Perm", algorithm: "R' U' R (U D') R2 U R' U R U' R U' R2 D" },
        { name: "Gc Perm", algorithm: "R2 U' R U' R U R' U R2 (U D') R U' R' D" },
        { name: "Gd Perm", algorithm: "R U R' (U' D) R2 U' R U' R' U R' U R2 D'" }
      ];

      const faceletMap = new Map();
      const reverseFaceletMap = new Map();
      const cubieFaceMap = new Map();
      const FACE_NORMALS = {
        U: new THREE.Vector3(0, 1, 0),
        D: new THREE.Vector3(0, -1, 0),
        F: new THREE.Vector3(0, 0, 1),
        B: new THREE.Vector3(0, 0, -1),
        R: new THREE.Vector3(1, 0, 0),
        L: new THREE.Vector3(-1, 0, 0)
      };
      const SEARCH_MOVES = [
        "U", "U'", "U2",
        "R", "R'", "R2",
        "F", "F'", "F2",
        "D", "D'", "D2",
        "L", "L'", "L2",
        "B", "B'", "B2"
      ];
      const MOVE_AXIS = {
        U: "y",
        D: "y",
        R: "x",
        L: "x",
        F: "z",
        B: "z"
      };
      const FACE_SEARCH_ORDER = {
        U: 0,
        D: 1,
        R: 2,
        L: 3,
        F: 4,
        B: 5
      };
      const FACE_COLOR_NAMES = {
        U: "Yellow",
        D: "White",
        F: "Red",
        B: "Orange",
        R: "Green",
        L: "Blue"
      };
      const BEGINNER_SEARCH_LIMITS = {
        maxNodes: 120000,
        maxMs: 800
      };
      const SCRAMBLE_REPLAY_DELAY_MS = 1000;
      const ISOMETRIC_PITCH = 0.8;
      const DEFAULT_ORBIT_PITCH = -ISOMETRIC_PITCH;
      const DEFAULT_ORBIT_RADIUS = 12.4;
      const DEFAULT_ORBIT_YAW = 3 * Math.PI / 4;
      const ZOOM_RADIUS_DELTA = 3.2;
      const STORAGE_KEYS = {
        filters: "rubiks-trainer-filters-v1",
        stats: "rubiks-trainer-stats-v1",
        speed: "rubiks-trainer-speed-v1",
        solveMethod: "rubiks-trainer-solve-method-v1",
        solveScope: "rubiks-trainer-solve-scope-v1",
        practiceScramble: "rubiks-trainer-practice-scramble-v1"
      };
      buildFaceletMaps();

      const state = {
        mode: "OLL",
        currentCase: null,
        currentSetupAlgorithm: "",
        currentCrossSolution: "",
        currentCrossOptimalMoves: 0,
        cfopStageFloor: 0,
        editorSelectedFace: "U",
        editorCurrentFace: "U",
        revealed: false,
        moveCount: 0,
        timerStart: 0,
        elapsedMs: 0,
        timerRunning: false,
        solved: false,
        setupHistory: [],
        userHistory: [],
        selectedCases: loadSelectedCases(),
        caseStats: loadCaseStats(),
        sessionStats: createEmptySessionStats(),
        solveMethod: loadSolveMethod(),
        solveScope: loadSolveScope(),
        beginnerSolving: false,
        beginnerBreakdown: null,
        quizMode: "OFF",
        beginnerLessonKey: "WHITE_CROSS"
      };

      const solverCache = {
        beginner: new Map(),
        cfopOll: new Map(),
        cfopPll: new Map()
      };

      let cube = createSolvedState();
      let colorEditorState = createSolvedState();
      const cubies = [];

      const viewport = document.getElementById("viewport");
      const caseNameEl = document.getElementById("caseName");
      const algorithmEl = document.getElementById("algorithm");
      const moveCountEl = document.getElementById("moveCount");
      const timerEl = document.getElementById("timer");
      const statusTextEl = document.getElementById("statusText");
      const beginnerTeacherPanelEl = document.getElementById("beginnerTeacherPanel");
      const beginnerTeacherEl = document.getElementById("beginnerTeacher");
      const moveFlashEl = document.getElementById("moveFlash");
      const statusFlashEl = document.getElementById("statusFlash");
      const cubeNetEl = document.getElementById("cubeNet");
      const cubeNetCtx = cubeNetEl.getContext("2d");
      const hiddenFacesEl = document.getElementById("hiddenFaces");
      const zoomSliderEl = document.getElementById("zoomSlider");
      const zoomValueEl = document.getElementById("zoomValue");
      const zoomResetBtn = document.getElementById("zoomResetBtn");
      const speedSliderEl = document.getElementById("speedSlider");
      const speedValueEl = document.getElementById("speedValue");
      const speedResetBtn = document.getElementById("speedResetBtn");
      const newCaseBtn = document.getElementById("newCaseBtn");
      const resetBtn = document.getElementById("resetBtn");
      const revealBtn = document.getElementById("revealBtn");
      const solveBtn = document.getElementById("solveBtn");
      const undoBtn = document.getElementById("undoBtn");
      const showScrambleBtn = document.getElementById("showScrambleBtn");
      const toCrossBtn = document.getElementById("toCrossBtn");
      const toWhiteBtn = document.getElementById("toWhiteBtn");
      const toMiddleBtn = document.getElementById("toMiddleBtn");
      const toYellowCrossBtn = document.getElementById("toYellowCrossBtn");
      const toLastLayerEdgesBtn = document.getElementById("toLastLayerEdgesBtn");
      const toCornerOrientationBtn = document.getElementById("toCornerOrientationBtn");
      const toCornerPermutationBtn = document.getElementById("toCornerPermutationBtn");
      const beginnerFullSolveBtn = document.getElementById("beginnerFullSolveBtn");
      const cfopCrossBtn = document.getElementById("cfopCrossBtn");
      const cfopF2LBtn = document.getElementById("cfopF2LBtn");
      const cfopOllBtn = document.getElementById("cfopOllBtn");
      const cfopPllBtn = document.getElementById("cfopPllBtn");
      const cfopNewF2LBtn = document.getElementById("cfopNewF2LBtn");
      const cfopNewOllBtn = document.getElementById("cfopNewOllBtn");
      const cfopNewPllBtn = document.getElementById("cfopNewPllBtn");
      const cfopFullSolveBtn = document.getElementById("cfopFullSolveBtn");
      const solveMethodEl = document.getElementById("solveMethod");
      const solveScopeEl = document.getElementById("solveScope");
      const beginnerStepsGroupEl = document.getElementById("beginnerStepsGroup");
      const cfopStepsGroupEl = document.getElementById("cfopStepsGroup");
      const algorithmQuizGroupEl = document.getElementById("algorithmQuizGroup");
      const quizModeEl = document.getElementById("quizMode");
      const quizAnswerEl = document.getElementById("quizAnswer");
      const quizCheckBtn = document.getElementById("quizCheckBtn");
      const quizClearBtn = document.getElementById("quizClearBtn");
      const quizFeedbackEl = document.getElementById("quizFeedback");
      const setupLabelEl = document.getElementById("setupLabel");
      const setupTextEl = document.getElementById("setupText");
      const frontFaceTextEl = document.getElementById("frontFaceText");
      const crossSolutionTextEl = document.getElementById("crossSolutionText");
      const crossRevealRowEl = document.getElementById("crossRevealRow");
      const crossRevealBtn = document.getElementById("crossRevealBtn");
      const customScrambleLabelEl = document.getElementById("customScrambleLabel");
      const customScrambleControlsEl = document.getElementById("customScrambleControls");
      const customScrambleInputEl = document.getElementById("customScrambleInput");
      const loadScrambleBtn = document.getElementById("loadScrambleBtn");
      const scanCubeBtn = document.getElementById("scanCubeBtn");
      const savePracticeScrambleBtn = document.getElementById("savePracticeScrambleBtn");
      const loadPracticeScrambleBtn = document.getElementById("loadPracticeScrambleBtn");
      const colorEditorNetEl = document.getElementById("colorEditorNet");
      const colorEditorNetCtx = colorEditorNetEl?.getContext("2d");
      const colorEditorExpanderEl = document.getElementById("colorEditorExpander");
      const colorEditorToggleEl = document.getElementById("colorEditorToggle");
      const colorEditorBackdropEl = document.getElementById("colorEditorBackdrop");
      const colorEditorModalEl = document.getElementById("colorEditorModal");
      const colorEditorSheetEl = colorEditorExpanderEl?.querySelector(".color-editor-sheet");
      const colorEditorFaceNameEl = document.getElementById("colorEditorFaceName");
      const colorEditorOrientationEl = document.getElementById("colorEditorOrientation");
      const colorEditorPrevFaceBtn = document.getElementById("colorEditorPrevFace");
      const colorEditorNextFaceBtn = document.getElementById("colorEditorNextFace");
      const cubeScannerBackdropEl = document.getElementById("cubeScannerBackdrop");
      const cubeScannerModalEl = document.getElementById("cubeScannerModal");
      const cubeScannerPromptEl = document.getElementById("cubeScannerPrompt");
      const cubeScannerProgressEl = document.getElementById("cubeScannerProgress");
      const cubeScannerStatusEl = document.getElementById("cubeScannerStatus");
      const cubeScannerOrientationEl = document.getElementById("cubeScannerOrientation");
      const cubeScannerQualityEl = document.getElementById("cubeScannerQuality");
      const cubeScannerVideoEl = document.getElementById("cubeScannerVideo");
      const cubeScannerOverlayEl = document.getElementById("cubeScannerOverlay");
      const cubeScannerOverlayCtx = cubeScannerOverlayEl?.getContext("2d");
      const cubeScannerPreviewNetEl = document.getElementById("cubeScannerPreviewNet");
      const cubeScannerPreviewNetCtx = cubeScannerPreviewNetEl?.getContext("2d");
      const scannerReviewEl = document.getElementById("scannerReview");
      const scannerFaceEditorNetEl = document.getElementById("scannerFaceEditorNet");
      const scannerFaceEditorNetCtx = scannerFaceEditorNetEl?.getContext("2d");
      const scannerUseFaceBtn = document.getElementById("scannerUseFaceBtn");
      const scannerRescanBtn = document.getElementById("scannerRescanBtn");
      const startScannerBtn = document.getElementById("startScannerBtn");
      const captureScannerBtn = document.getElementById("captureScannerBtn");
      const closeScannerBtn = document.getElementById("closeScannerBtn");
      const scannerColorButtons = ["U", "D", "F", "B", "R", "L"].map((face) => ({
        face,
        button: document.getElementById(`scannerColor${face}`)
      }));
      const resetEditorBtn = document.getElementById("resetEditorBtn");
      const loadEditorStateBtn = document.getElementById("loadEditorStateBtn");
      const editorColorButtons = ["U", "D", "F", "B", "R", "L"].map((face) => ({
        face,
        button: document.getElementById(`editorColor${face}`)
      }));
      const stepMovesEl = document.getElementById("stepMoves");
      const caseStatsEl = document.getElementById("caseStats");
      const resetCaseStatsBtn = document.getElementById("resetCaseStatsBtn");
      const sessionStatsEl = document.getElementById("sessionStats");
      const resetSessionStatsBtn = document.getElementById("resetSessionStatsBtn");
      const caseStatsSectionEl = caseStatsEl?.closest(".drawer");
      const sessionStatsSectionEl = sessionStatsEl?.closest(".drawer");
      const keysSectionEl = document.querySelector("details.drawer:nth-of-type(3)");
      const filterSectionEl = document.getElementById("filterSection");
      const filterListEl = document.getElementById("filterList");
      const filterAllBtn = document.getElementById("filterAllBtn");
      const filterNoneBtn = document.getElementById("filterNoneBtn");
      const modeButtons = Array.from(document.querySelectorAll(".mode-btn"));
      const cfopStepButtons = [cfopCrossBtn, cfopF2LBtn, cfopOllBtn, cfopPllBtn].filter(Boolean);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0f);

      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      viewport.appendChild(renderer.domElement);

      const hiddenCamera = new THREE.PerspectiveCamera(42, 220 / 165, 0.1, 100);
      const hiddenRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      hiddenRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      hiddenRenderer.outputEncoding = THREE.sRGBEncoding;
      hiddenRenderer.setClearColor(0x000000, 0);
      hiddenFacesEl.appendChild(hiddenRenderer.domElement);

      const ambient = new THREE.AmbientLight(0xffffff, 0.72);
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0xffffff, 0.82);
      keyLight.position.set(5, 6, 7);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.2);
      fillLight.position.set(-6, -3, 4);
      scene.add(fillLight);

      const cubeGroup = new THREE.Group();
      scene.add(cubeGroup);

      const orbit = {
        radius: DEFAULT_ORBIT_RADIUS,
        yaw: DEFAULT_ORBIT_YAW,
        pitch: DEFAULT_ORBIT_PITCH
      };

      const pointer = {
        active: false,
        x: 0,
        y: 0
      };

      const animationState = {
        queue: [],
        active: null,
        durationMs: 180
      };

      const cameraAnimation = {
        active: null,
        durationMs: 180
      };
      let scrambleReplayTimeout = 0;
      let crossTrainingRequestId = 0;
      const COLOR_EDITOR_FACE_ORDER = ["U", "F", "R", "D", "B", "L"];
      const cubeScanner = {
          active: false,
          stream: null,
          raf: 0,
          faceOrder: ["U", "F", "R", "D", "B", "L"],
          index: 0,
          captured: createSolvedState(),
          lastDetailed: null,
          history: [],
          pendingFace: null,
          pendingDetected: null,
          selectedFace: "U",
          stableSignature: "",
          stableFrames: 0,
          quad: null,
          dragCornerIndex: -1
        };

      const SCANNER_ADJACENT_FACE_MAP = {
        U: new Set(["F", "R", "B", "L"]),
        D: new Set(["F", "R", "B", "L"]),
        F: new Set(["U", "D", "R", "L"]),
        B: new Set(["U", "D", "R", "L"]),
        R: new Set(["U", "D", "F", "B"]),
        L: new Set(["U", "D", "F", "B"])
      };

      try {
        const storedSpeed = Number(localStorage.getItem(STORAGE_KEYS.speed));
        if (storedSpeed >= 40 && storedSpeed <= 800) {
          speedSliderEl.value = String(storedSpeed);
        }
      } catch (error) {}

      initCubies();
      attachEvents();
      updateZoomFromSlider();
      updateAnimationSpeed();
      resize();
      setMode("FREE");
      requestAnimationFrame(renderLoop);

      function buildFaceletMaps() {
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

      function faceletToEntry(face, index) {
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

      function reverseKey(position, normal) {
        return `${position.join(",")}|${normal.join(",")}`;
      }

      function normalizeAngle(angle) {
        return Math.atan2(Math.sin(angle), Math.cos(angle));
      }

      function nearestAngleOnGrid(angle, start, step) {
        return start + Math.round((angle - start) / step) * step;
      }

      function getNearestSnappedOrbit() {
        return {
          yaw: nearestAngleOnGrid(orbit.yaw, DEFAULT_ORBIT_YAW, Math.PI / 2),
          pitch: nearestAngleOnGrid(orbit.pitch, DEFAULT_ORBIT_PITCH, Math.PI / 2)
        };
      }

      function faceFromVector(vector) {
        let bestFace = "F";
        let bestDot = -Infinity;
        for (const face of FACE_ORDER) {
          const dot = FACE_NORMALS[face].dot(vector);
          if (dot > bestDot) {
            bestDot = dot;
            bestFace = face;
          }
        }
        return bestFace;
      }

      function scoreFace(face, vector) {
        return FACE_NORMALS[face].dot(vector);
      }

      function pickBestFace(faces, vector, exclude = []) {
        let bestFace = null;
        let bestScore = -Infinity;
        for (const face of faces) {
          if (exclude.includes(face)) continue;
          const score = scoreFace(face, vector);
          if (score > bestScore) {
            bestScore = score;
            bestFace = face;
          }
        }
        return bestFace;
      }

      function createSolvedState() {
        return {
          U: Array(9).fill("U"),
          D: Array(9).fill("D"),
          F: Array(9).fill("F"),
          B: Array(9).fill("B"),
          R: Array(9).fill("R"),
          L: Array(9).fill("L")
        };
      }

      function cloneState(source) {
        const next = {};
        for (const face of FACE_ORDER) {
          next[face] = source[face].slice();
        }
        return next;
      }

      function getCasesForMode(mode) {
        return mode === "PLL" ? PLL_CASES : mode === "OLL" ? OLL_CASES : [];
      }

      function isScramblePracticeMode(mode = state.mode) {
        return mode === "FREE" || mode === "CROSS";
      }

      function isCurrentGoalSolved() {
        return state.mode === "CROSS" ? isWhiteCrossSolvedState(cube) : isSolved(cube);
      }

      function loadSelectedCases() {
        const fallback = {
          OLL: OLL_CASES.map((item) => item.name),
          PLL: PLL_CASES.map((item) => item.name)
        };
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.filters);
          if (!raw) return fallback;
          const parsed = JSON.parse(raw);
          return {
            OLL: Array.isArray(parsed.OLL) ? parsed.OLL : fallback.OLL,
            PLL: Array.isArray(parsed.PLL) ? parsed.PLL : fallback.PLL
          };
        } catch (error) {
          return fallback;
        }
      }

      function saveSelectedCases() {
        try {
          localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(state.selectedCases));
        } catch (error) {}
      }

      function loadCaseStats() {
        try {
          return JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || "{}");
        } catch (error) {
          return {};
        }
      }

      function loadSolveMethod() {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.solveMethod);
          return saved === "BEGINNER" ? "BEGINNER" : "CFOP";
        } catch (error) {
          return "CFOP";
        }
      }

      function loadSolveScope() {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.solveScope);
          return [
            "WHITE_CROSS",
            "WHITE_CORNERS",
            "MIDDLE_LAYER",
            "YELLOW_CROSS",
            "LAST_LAYER_EDGES",
            "LAST_LAYER_CORNERS_ORIENTATION",
            "LAST_LAYER_CORNERS_PERMUTATION"
          ].includes(saved) ? saved : "FULL";
        } catch (error) {
          return "FULL";
        }
      }

      function createEmptySessionStats() {
        return {
          solves: 0,
          times: [],
          bestMs: Infinity,
          quizAttempts: 0,
          quizCorrect: 0,
          bestCfopCross: Infinity,
          bestCfopF2L: Infinity,
          bestCfopOll: Infinity,
          bestCfopPll: Infinity
        };
      }

      function saveCaseStats() {
        try {
          localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(state.caseStats));
        } catch (error) {}
      }

      function updateSolveMethod() {
        state.solveMethod = solveMethodEl.value === "BEGINNER" ? "BEGINNER" : "CFOP";
        try {
          localStorage.setItem(STORAGE_KEYS.solveMethod, state.solveMethod);
        } catch (error) {}
        if (state.solveMethod === "BEGINNER") {
          state.beginnerLessonKey = inferBeginnerLessonKey();
        }
        updateUi();
      }

      function updateSolveScope() {
        state.solveScope = [
          "WHITE_CROSS",
          "WHITE_CORNERS",
          "MIDDLE_LAYER",
          "YELLOW_CROSS",
          "LAST_LAYER_EDGES",
          "LAST_LAYER_CORNERS_ORIENTATION",
          "LAST_LAYER_CORNERS_PERMUTATION"
        ].includes(solveScopeEl.value) ? solveScopeEl.value : "FULL";
        try {
          localStorage.setItem(STORAGE_KEYS.solveScope, state.solveScope);
        } catch (error) {}
        state.beginnerLessonKey = inferBeginnerLessonKey();
        updateUi();
      }

      function persistSolveScope() {
        solveScopeEl.value = state.solveScope;
        try {
          localStorage.setItem(STORAGE_KEYS.solveScope, state.solveScope);
        } catch (error) {}
      }

      function getCaseStatsKey() {
        return state.currentCase && !isScramblePracticeMode() ? `${state.mode}:${state.currentCase.name}` : null;
      }

      function getCurrentCaseStats() {
        const key = getCaseStatsKey();
        return key ? state.caseStats[key] || null : null;
      }

      function initCubies() {
        const geometry = new THREE.BoxGeometry(0.96, 0.96, 0.96);
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
              const materials = MATERIAL_INDEX_TO_FACE.map(() => new THREE.MeshLambertMaterial({ color: HIDDEN_COLOR }));
              const mesh = new THREE.Mesh(geometry, materials);
              const basePosition = new THREE.Vector3(x * 1.05, y * 1.05, z * 1.05);
              mesh.position.copy(basePosition);
              cubeGroup.add(mesh);
              cubies.push({ key: `${x},${y},${z}`, coords: { x, y, z }, basePosition, mesh });
            }
          }
        }
        syncCubeMaterials();
      }

      function attachEvents() {
        window.addEventListener("resize", resize);
        window.addEventListener("keydown", onKeyDown);

        renderer.domElement.addEventListener("pointerdown", (event) => {
          pointer.active = true;
          pointer.x = event.clientX;
          pointer.y = event.clientY;
          renderer.domElement.classList.add("dragging");
          renderer.domElement.setPointerCapture(event.pointerId);
        });

        renderer.domElement.addEventListener("pointermove", (event) => {
          if (!pointer.active) return;
          stopCameraAnimation();
          const dx = event.clientX - pointer.x;
          const dy = event.clientY - pointer.y;
          pointer.x = event.clientX;
          pointer.y = event.clientY;
          orbit.yaw -= dx * 0.01;
          orbit.pitch -= dy * 0.01;
          clampOrbit();
        });

        renderer.domElement.addEventListener("pointerup", (event) => {
          pointer.active = false;
          renderer.domElement.classList.remove("dragging");
          renderer.domElement.releasePointerCapture(event.pointerId);
          snapCameraToNearestDiscreteOrientation(true);
        });

        renderer.domElement.addEventListener("pointerleave", () => {
          if (pointer.active) {
            snapCameraToNearestDiscreteOrientation(true);
          }
          pointer.active = false;
          renderer.domElement.classList.remove("dragging");
        });

        modeButtons.forEach((button) => {
          button.addEventListener("click", () => setMode(button.dataset.mode));
        });

        newCaseBtn.addEventListener("click", () => {
          if (state.mode === "FREE") {
            resetFreeMode(true, false);
          } else if (state.mode === "CROSS") {
            resetCrossTrainingMode(true);
          } else {
            setCfopStageFloor(0);
            chooseRandomCase();
          }
        });

        resetBtn.addEventListener("click", () => resetCurrentCase());
        revealBtn.addEventListener("click", revealAlgorithm);
        crossRevealBtn?.addEventListener("click", revealAlgorithm);
        solveBtn?.addEventListener("click", solveCubeAnimated);
        undoBtn.addEventListener("click", undoLastMove);
        showScrambleBtn.addEventListener("click", replayCurrentScramble);
        loadScrambleBtn?.addEventListener("click", loadCustomScramble);
        savePracticeScrambleBtn?.addEventListener("click", savePracticeScramble);
        loadPracticeScrambleBtn?.addEventListener("click", loadSavedPracticeScramble);
        scanCubeBtn?.addEventListener("click", openCubeScanner);
        resetEditorBtn?.addEventListener("click", resetColorEditor);
        loadEditorStateBtn?.addEventListener("click", loadEditorState);
        editorColorButtons.forEach(({ face, button }) => {
          button?.addEventListener("click", () => {
            state.editorSelectedFace = face;
            updateUi();
          });
        });
        colorEditorPrevFaceBtn?.addEventListener("click", () => {
          const currentIndex = COLOR_EDITOR_FACE_ORDER.indexOf(state.editorCurrentFace);
          const nextIndex = (currentIndex - 1 + COLOR_EDITOR_FACE_ORDER.length) % COLOR_EDITOR_FACE_ORDER.length;
          state.editorCurrentFace = COLOR_EDITOR_FACE_ORDER[nextIndex];
          updateUi();
        });
        colorEditorNextFaceBtn?.addEventListener("click", () => {
          const currentIndex = COLOR_EDITOR_FACE_ORDER.indexOf(state.editorCurrentFace);
          const nextIndex = (currentIndex + 1) % COLOR_EDITOR_FACE_ORDER.length;
          state.editorCurrentFace = COLOR_EDITOR_FACE_ORDER[nextIndex];
          updateUi();
        });
        toCrossBtn.addEventListener("click", solveToWhiteCross);
        toWhiteBtn.addEventListener("click", solveToWhiteFace);
        toMiddleBtn.addEventListener("click", solveToMiddleLayer);
        toYellowCrossBtn.addEventListener("click", solveToYellowCross);
        toLastLayerEdgesBtn.addEventListener("click", solveToLastLayerEdges);
        toCornerOrientationBtn.addEventListener("click", solveToCornerOrientation);
        toCornerPermutationBtn.addEventListener("click", solveToCornerPermutation);
        beginnerFullSolveBtn.addEventListener("click", solveBeginnerFullCube);
        cfopCrossBtn.addEventListener("click", () => {
          setCfopStageFloor(0);
          solveToCfopCross();
        });
        cfopF2LBtn.addEventListener("click", () => {
          setCfopStageFloor(1);
          solveToCfopF2L();
        });
        cfopOllBtn.addEventListener("click", () => {
          setCfopStageFloor(2);
          solveToCfopOll();
        });
        cfopPllBtn.addEventListener("click", () => {
          setCfopStageFloor(3);
          solveToCfopPll();
        });
        cfopNewF2LBtn.addEventListener("click", () => {
          setCfopStageFloor(1);
          startNewF2LPractice();
        });
        cfopNewOllBtn.addEventListener("click", () => {
          setCfopStageFloor(2);
          startNewOllPractice();
        });
        cfopNewPllBtn.addEventListener("click", () => {
          setCfopStageFloor(3);
          startNewPllPractice();
        });
        cfopFullSolveBtn.addEventListener("click", () => {
          setCfopStageFloor(3);
          solveCfopFullCube();
        });
        solveMethodEl.addEventListener("change", updateSolveMethod);
        solveScopeEl.addEventListener("change", updateSolveScope);
        quizModeEl.addEventListener("change", updateQuizMode);
        quizCheckBtn.addEventListener("click", checkQuizAnswer);
        quizClearBtn.addEventListener("click", clearQuizAnswer);
        quizAnswerEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            checkQuizAnswer();
          }
        });
        customScrambleInputEl?.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            loadCustomScramble();
          }
        });
        customScrambleInputEl?.addEventListener("input", () => updateUi());
        colorEditorNetEl?.addEventListener("click", onColorEditorClick);
        const originalColorEditorParent = colorEditorSheetEl?.parentElement || null;
        const closeColorEditor = (loadOnClose = false) => {
          if (!colorEditorExpanderEl?.open) return;
          colorEditorExpanderEl.open = false;
          if (colorEditorToggleEl) {
            colorEditorToggleEl.textContent = "Open Color Editor";
          }
          if (colorEditorBackdropEl) {
            colorEditorBackdropEl.style.display = "none";
          }
          if (colorEditorSheetEl && originalColorEditorParent && colorEditorModalEl) {
            originalColorEditorParent.appendChild(colorEditorSheetEl);
            colorEditorModalEl.style.display = "none";
          }
          drawColorEditorNet();
          updateUi();
          if (loadOnClose) {
            loadEditorState();
          }
        };
        colorEditorExpanderEl?.addEventListener("toggle", () => {
          if (colorEditorToggleEl) {
            colorEditorToggleEl.textContent = colorEditorExpanderEl.open ? "Minimize Color Editor" : "Open Color Editor";
          }
          if (colorEditorBackdropEl) {
            colorEditorBackdropEl.style.display = colorEditorExpanderEl.open ? "block" : "none";
          }
          if (colorEditorSheetEl && originalColorEditorParent && colorEditorModalEl) {
            if (colorEditorExpanderEl.open) {
              colorEditorModalEl.appendChild(colorEditorSheetEl);
              colorEditorModalEl.style.display = "block";
            } else {
              originalColorEditorParent.appendChild(colorEditorSheetEl);
              colorEditorModalEl.style.display = "none";
            }
          }
          drawColorEditorNet();
          updateUi();
        });
        colorEditorBackdropEl?.addEventListener("click", () => {
          closeColorEditor(false);
        });
        startScannerBtn?.addEventListener("click", startCubeScannerCamera);
        captureScannerBtn?.addEventListener("click", () => captureCurrentScannerFace());
        scannerUseFaceBtn?.addEventListener("click", acceptCurrentScannerFace);
        scannerRescanBtn?.addEventListener("click", clearPendingScannerFace);
        scannerFaceEditorNetEl?.addEventListener("click", onScannerFaceEditorClick);
        scannerColorButtons.forEach(({ face, button }) => {
          button?.addEventListener("click", () => {
            cubeScanner.selectedFace = face;
            updateScannerReviewUi();
          });
        });
        closeScannerBtn?.addEventListener("click", () => closeCubeScanner(false));
        cubeScannerBackdropEl?.addEventListener("click", () => closeCubeScanner(false));
        document.addEventListener("keydown", (event) => {
          if (event.key !== "Escape" || !colorEditorExpanderEl?.open) return;
          event.preventDefault();
          closeColorEditor(true);
        });
        document.addEventListener("keydown", (event) => {
          if (event.key !== "Escape" || !cubeScanner.active) return;
          event.preventDefault();
          closeCubeScanner(false);
        });
        zoomSliderEl.addEventListener("input", updateZoomFromSlider);
        zoomResetBtn.addEventListener("click", resetZoomToDefault);
        speedSliderEl.addEventListener("input", updateAnimationSpeed);
        speedResetBtn.addEventListener("click", resetSpeedToDefault);
        resetCaseStatsBtn.addEventListener("click", resetCurrentCaseStats);
        resetSessionStatsBtn.addEventListener("click", resetSessionStats);
        filterAllBtn.addEventListener("click", () => setAllCurrentFilters(true));
        filterNoneBtn.addEventListener("click", () => setAllCurrentFilters(false));
      }

      function resize() {
        const width = viewport.clientWidth;
        const height = viewport.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        hiddenCamera.aspect = hiddenFacesEl.clientWidth / hiddenFacesEl.clientHeight;
        hiddenCamera.updateProjectionMatrix();
        hiddenRenderer.setSize(hiddenFacesEl.clientWidth, hiddenFacesEl.clientHeight, false);
      }

      function clampOrbit() {
        orbit.yaw = normalizeAngle(orbit.yaw);
        orbit.pitch = normalizeAngle(orbit.pitch);
      }

      function updateZoomFromSlider() {
        const sliderValue = Number(zoomSliderEl.value);
        const normalized = (sliderValue - 50) / 50;
        orbit.radius = DEFAULT_ORBIT_RADIUS + normalized * ZOOM_RADIUS_DELTA;
        zoomValueEl.textContent = normalized === 0 ? "0" : normalized.toFixed(2);
      }

      function updateAnimationSpeed() {
        const ms = Number(speedSliderEl.value || 180);
        animationState.durationMs = ms;
        cameraAnimation.durationMs = ms;
        speedValueEl.textContent = `${ms}ms`;
        try {
          localStorage.setItem(STORAGE_KEYS.speed, String(ms));
        } catch (error) {}
      }

      function resetSpeedToDefault() {
        speedSliderEl.value = "180";
        updateAnimationSpeed();
      }

      function resetZoomToDefault() {
        zoomSliderEl.value = "50";
        updateZoomFromSlider();
      }

      function resetCameraOrientation() {
        stopCameraAnimation();
        orbit.yaw = DEFAULT_ORBIT_YAW;
        orbit.pitch = DEFAULT_ORBIT_PITCH;
        updateCamera();
      }

      function stopCameraAnimation() {
        cameraAnimation.active = null;
      }

      function animateCameraStep(deltaYaw, deltaPitch) {
        stopCameraAnimation();
        cameraAnimation.active = {
          fromYaw: orbit.yaw,
          fromPitch: orbit.pitch,
          toYaw: orbit.yaw + deltaYaw,
          toPitch: orbit.pitch + deltaPitch,
          startedAt: performance.now()
        };
      }

      function animateCameraToOrientation(targetYaw, targetPitch) {
        stopCameraAnimation();
        cameraAnimation.active = {
          fromYaw: orbit.yaw,
          fromPitch: orbit.pitch,
          toYaw: targetYaw,
          toPitch: targetPitch,
          startedAt: performance.now()
        };
      }

      function updateCameraAnimation(now) {
        if (!cameraAnimation.active) return;
        const active = cameraAnimation.active;
        const rawT = Math.min(1, (now - active.startedAt) / cameraAnimation.durationMs);
        const easedT = 1 - Math.pow(1 - rawT, 3);
        orbit.yaw = active.fromYaw + (active.toYaw - active.fromYaw) * easedT;
        orbit.pitch = active.fromPitch + (active.toPitch - active.fromPitch) * easedT;
        clampOrbit();
        if (rawT >= 1) {
          orbit.yaw = active.toYaw;
          orbit.pitch = active.toPitch;
          cameraAnimation.active = null;
        }
      }

      function updateCamera() {
        const orientation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(orbit.pitch, orbit.yaw, 0, "YXZ")
        );
        const basePosition = new THREE.Vector3(0, 0, orbit.radius).applyQuaternion(orientation);
        const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);
        camera.position.copy(basePosition);
        camera.up.copy(upVector);
        camera.lookAt(0, 0, 0);

        const hiddenOrientation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(-orbit.pitch, orbit.yaw + Math.PI, 0, "YXZ")
        );
        const hiddenPosition = new THREE.Vector3(0, 0, orbit.radius).applyQuaternion(hiddenOrientation);
        const hiddenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(hiddenOrientation);
        hiddenCamera.position.copy(hiddenPosition);
        hiddenCamera.up.copy(hiddenUp);
        hiddenCamera.lookAt(0, 0, 0);
      }

      function renderLoop(now) {
        updateMoveAnimation(now);
        updateCameraAnimation(now);
        updateCamera();
        updateTimerDisplay();
        renderer.render(scene, camera);
        hiddenRenderer.render(scene, hiddenCamera);
        requestAnimationFrame(renderLoop);
      }

      function setMode(mode) {
        state.mode = mode;
        state.cfopStageFloor = 0;
        modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === mode));
        renderFilterList();
        if (mode === "FREE") {
          resetFreeMode(true, false);
          statusTextEl.textContent = "FREE mode: New Case generates a scramble, and Reset restores that scramble.";
        } else if (mode === "CROSS") {
          resetCrossTrainingMode(true);
          statusTextEl.textContent = "CROSS mode: solve the white cross only. Timer stops when the cross is solved.";
        } else {
          chooseRandomCase();
        }
      }

      function resetFreeMode(generateNew = true, animateScramble = false) {
        clearMoveAnimations();
        resetCameraOrientation();
        state.currentCase = { name: "FREE SCRAMBLE", algorithm: "Hidden" };
        if (generateNew || !parseAlgorithm(state.currentSetupAlgorithm).length) {
          state.currentSetupAlgorithm = generateScramble(24);
        }
        state.revealed = true;
        cube = createSolvedState();
        state.setupHistory = parseAlgorithm(state.currentSetupAlgorithm);
        if (animateScramble) {
          resetStats();
          syncCubeMaterials();
          updateUi();
          replayCurrentScramble();
          return;
        }
        applyAlgorithm(state.currentSetupAlgorithm, false);
        resetStats();
        syncCubeMaterials();
        updateUi();
        statusTextEl.textContent = "Scrambled cube ready. Solve it or press New Case for another scramble.";
      }

      async function computeCrossTrainingSolution() {
        const requestId = ++crossTrainingRequestId;
        setCurrentCfopCrossSolution([]);
        state.currentCrossOptimalMoves = 0;
        state.beginnerBreakdown = null;
        updateUi();
        const result = await requestBeginnerMethodSolution(cloneState(cube), "WHITE_CROSS", () => {});
        if (requestId !== crossTrainingRequestId || state.mode !== "CROSS") {
          return;
        }
        const solution = result?.solution || [];
        setCurrentCfopCrossSolution(solution);
        state.currentCrossOptimalMoves = solution.length;
        state.beginnerBreakdown = solution.length > 0 ? [{ label: "Optimal Cross", moves: solution.length }] : null;
        updateUi();
      }

      function resetCrossTrainingMode(generateNew = true) {
        clearMoveAnimations();
        resetCameraOrientation();
        state.currentCase = { name: "CROSS TRAINING", algorithm: "White cross only" };
        if (generateNew || !parseAlgorithm(state.currentSetupAlgorithm).length) {
          state.currentSetupAlgorithm = generateScramble(24);
        }
        state.revealed = false;
        cube = createSolvedState();
        applyAlgorithm(state.currentSetupAlgorithm, false);
        resetStats();
        state.setupHistory = parseAlgorithm(state.currentSetupAlgorithm);
        syncCubeMaterials();
        updateUi();
        statusTextEl.textContent = "Cross scramble ready. Solve the white cross in as few moves as you can.";
        void computeCrossTrainingSolution();
      }

      function chooseRandomCase() {
        clearMoveAnimations();
        resetCameraOrientation();
        const pool = getCasesForMode(state.mode).filter((item) => state.selectedCases[state.mode].includes(item.name));
        if (pool.length === 0) {
          state.currentCase = null;
          resetStats();
          updateUi();
          statusTextEl.textContent = `No ${state.mode} cases selected. Use the case filter to enable some.`;
          return;
        }
        state.currentCase = pool[Math.floor(Math.random() * pool.length)];
        const baseSetup = invertAlgorithm(state.currentCase.algorithm);
        state.currentSetupAlgorithm = [baseSetup, state.currentCase.setupAuf || ""].filter(Boolean).join(" ");
        state.revealed = false;
        cube = createSolvedState();
        applyAlgorithm(state.currentSetupAlgorithm, false);
        resetStats();
        state.setupHistory = parseAlgorithm(state.currentSetupAlgorithm);
        syncCubeMaterials();
        updateUi();
        statusTextEl.textContent = `Solve ${state.currentCase.name}. Timer starts on your first move.`;
      }

      function resetCurrentCase() {
        clearMoveAnimations();
        resetCameraOrientation();
        if (state.mode === "FREE") {
          resetFreeMode(false, false);
          return;
        }
        if (state.mode === "CROSS") {
          resetCrossTrainingMode(false);
          return;
        }
        cube = createSolvedState();
        applyAlgorithm(state.currentSetupAlgorithm, false);
        state.revealed = false;
        resetStats();
        state.setupHistory = parseAlgorithm(state.currentSetupAlgorithm);
        syncCubeMaterials();
        updateUi();
        statusTextEl.textContent = `Reset to ${state.currentCase.name}.`;
      }

      function revealAlgorithm() {
        state.revealed = true;
        updateUi();
      }

      function loadCustomScramble() {
        const raw = String(customScrambleInputEl?.value || "").trim();
        const moves = parseAlgorithm(raw);
        if (!moves.length) {
          statusTextEl.textContent = "Enter a valid scramble before loading it.";
          updateUi();
          return;
        }

        clearMoveAnimations();
        resetCameraOrientation();
        state.currentSetupAlgorithm = moves.join(" ");
        state.revealed = true;
        cube = createSolvedState();
        applyAlgorithm(state.currentSetupAlgorithm, false);
        resetStats();
        state.setupHistory = moves.slice();
        syncCubeMaterials();

        if (state.mode === "CROSS") {
          state.currentCase = { name: "CROSS TRAINING", algorithm: "White cross only" };
          state.revealed = false;
          statusTextEl.textContent = "Custom cross scramble loaded.";
          updateUi();
          void computeCrossTrainingSolution();
          return;
        }

        if (state.mode === "FREE") {
          state.currentCase = { name: "FREE SCRAMBLE", algorithm: "Hidden" };
          statusTextEl.textContent = "Custom scramble loaded.";
          updateUi();
          return;
        }

        statusTextEl.textContent = "Custom scrambles are available in FREE and CROSS modes.";
        updateUi();
      }

      function savePracticeScramble() {
        const scramble = String(state.currentSetupAlgorithm || "").trim();
        if (!scramble) {
          statusTextEl.textContent = "There is no scramble to save yet.";
          updateUi();
          return;
        }
        try {
          localStorage.setItem(STORAGE_KEYS.practiceScramble, scramble);
          statusTextEl.textContent = `Saved scramble for practice.`;
        } catch (error) {
          statusTextEl.textContent = "Could not save the scramble in this browser.";
        }
        updateUi();
      }

      function loadSavedPracticeScramble() {
        let scramble = "";
        try {
          scramble = String(localStorage.getItem(STORAGE_KEYS.practiceScramble) || "").trim();
        } catch (error) {}
        const moves = parseAlgorithm(scramble);
        if (!moves.length) {
          statusTextEl.textContent = "No saved scramble found yet.";
          updateUi();
          return;
        }
        if (customScrambleInputEl) {
          customScrambleInputEl.value = scramble;
        }
        loadCustomScramble();
      }

      function resetColorEditor() {
        colorEditorState = createSolvedState();
        state.editorCurrentFace = "U";
        state.editorSelectedFace = "U";
        updateUi();
      }

      function getColorEditorOrientationHint(face) {
        const hint = getScannerOrientationHint(face);
        return `Top: ${hint.top}.`;
      }

      function openCubeScanner() {
        cubeScanner.active = true;
        cubeScanner.index = 0;
        cubeScanner.captured = createSolvedState();
        cubeScanner.lastDetailed = null;
        cubeScanner.history = [];
        cubeScanner.pendingFace = null;
        cubeScanner.pendingDetected = null;
        cubeScanner.selectedFace = "U";
        cubeScanner.stableSignature = "";
        cubeScanner.stableFrames = 0;
        if (cubeScannerBackdropEl) cubeScannerBackdropEl.style.display = "block";
        if (cubeScannerModalEl) cubeScannerModalEl.style.display = "block";
        const videoShell = cubeScannerVideoEl?.parentElement;
        if (videoShell) videoShell.classList.remove("ready");
        renderCubeScannerProgress();
        updateCubeScannerPrompt();
        drawCubeScannerPreviewNet();
        updateScannerReviewUi();
        if (cubeScannerStatusEl) {
          cubeScannerStatusEl.textContent = "Starting camera. Hold one face flat inside the 3x3 guide, then press Capture Face.";
        }
        void startCubeScannerCamera();
      }

      function closeCubeScanner(loadOnClose) {
        cubeScanner.active = false;
        if (cubeScanner.raf) {
          cancelAnimationFrame(cubeScanner.raf);
          cubeScanner.raf = 0;
        }
        if (cubeScanner.stream) {
          cubeScanner.stream.getTracks().forEach((track) => track.stop());
          cubeScanner.stream = null;
        }
        cubeScanner.lastDetailed = null;
        cubeScanner.history = [];
        cubeScanner.pendingFace = null;
        cubeScanner.pendingDetected = null;
        cubeScanner.stableSignature = "";
        cubeScanner.stableFrames = 0;
        if (cubeScannerVideoEl) {
          cubeScannerVideoEl.srcObject = null;
        }
        const videoShell = cubeScannerVideoEl?.parentElement;
        if (videoShell) videoShell.classList.remove("ready");
        if (cubeScannerBackdropEl) cubeScannerBackdropEl.style.display = "none";
        if (cubeScannerModalEl) cubeScannerModalEl.style.display = "none";
        updateScannerReviewUi();
        if (loadOnClose) {
          colorEditorState = cloneState(cubeScanner.captured);
          drawColorEditorNet();
          state.editorCurrentFace = "U";
          state.editorSelectedFace = "U";
          if (colorEditorExpanderEl && !colorEditorExpanderEl.open) {
            colorEditorExpanderEl.open = true;
          }
          loadEditorState();
        }
      }

      async function startCubeScannerCamera() {
        if (!cubeScanner.active) {
          openCubeScanner();
        }
        try {
          if (cubeScanner.stream) return;
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
          cubeScanner.stream = stream;
          if (cubeScannerVideoEl) {
            cubeScannerVideoEl.srcObject = stream;
            await cubeScannerVideoEl.play();
            cubeScannerVideoEl.parentElement?.classList.add("ready");
          }
          if (cubeScannerStatusEl) {
            cubeScannerStatusEl.textContent = "Camera ready. Center the requested face in the guide, then press Capture Face.";
          }
          renderCubeScannerOverlay();
        } catch (error) {
          cubeScannerVideoEl?.parentElement?.classList.remove("ready");
          if (cubeScannerStatusEl) {
            cubeScannerStatusEl.textContent = "Could not access the camera. Check permission settings and try again.";
          }
        }
      }

      function renderCubeScannerProgress() {
        if (!cubeScannerProgressEl) return;
        cubeScannerProgressEl.innerHTML = cubeScanner.faceOrder.map((face, index) => {
          const className = index < cubeScanner.index
            ? "scanner-face-pill done"
            : index === cubeScanner.index
              ? "scanner-face-pill active"
              : "scanner-face-pill";
          return `<div class="${className}">${FACE_COLOR_NAMES[face]}</div>`;
        }).join("");
      }

      function updateCubeScannerPrompt() {
        const face = cubeScanner.faceOrder[cubeScanner.index];
        if (!face || !cubeScannerPromptEl) return;
        cubeScannerPromptEl.innerHTML = `Show the <span class="scanner-stage">${FACE_COLOR_NAMES[face]}</span> face centered in the guide, with the stickers facing the camera and the top row level.`;
        updateCubeScannerOrientation(face);
        renderCubeScannerProgress();
      }

      function getScannerOrientationHint(face) {
        switch (face) {
          case "U":
            return {
              top: "Orange",
              bottom: "Red",
              left: "Blue",
              right: "Green",
              extra: "Keep the Red face along the bottom edge of the Yellow face."
            };
          case "D":
            return {
              top: "Red",
              bottom: "Orange",
              left: "Blue",
              right: "Green",
              extra: "Keep the Red face along the top edge of the White face."
            };
          case "F":
            return {
              top: "Yellow",
              bottom: "White",
              left: "Blue",
              right: "Green",
              extra: "This is the Red face."
            };
          case "R":
            return {
              top: "Yellow",
              bottom: "White",
              left: "Red",
              right: "Orange",
              extra: "This is the Green face."
            };
          case "B":
            return {
              top: "Yellow",
              bottom: "White",
              left: "Green",
              right: "Blue",
              extra: "This is the Orange face."
            };
          case "L":
            return {
              top: "Yellow",
              bottom: "White",
              left: "Orange",
              right: "Red",
              extra: "This is the Blue face."
            };
          default:
            return {
              top: "Yellow",
              bottom: "White",
              left: "Blue",
              right: "Green",
              extra: "Keep the face flat and the top row level."
            };
        }
      }

      function getAllowedScannerColors(face) {
        switch (face) {
          case "U":
            return new Set(["U", "F", "R", "B", "L"]);
          case "D":
            return new Set(["D", "F", "R", "B", "L"]);
          case "F":
            return new Set(["F", "U", "D", "R", "L"]);
          case "B":
            return new Set(["B", "U", "D", "R", "L"]);
          case "R":
            return new Set(["R", "U", "D", "F", "B"]);
          case "L":
            return new Set(["L", "U", "D", "F", "B"]);
          default:
            return new Set(FACE_ORDER);
        }
      }

      function updateCubeScannerOrientation(face) {
        if (!cubeScannerOrientationEl) return;
        const hint = getScannerOrientationHint(face);
        cubeScannerOrientationEl.innerHTML = `Top: <strong>${hint.top}</strong>.`;
      }

      function getScannerGuideMetrics() {
          if (!cubeScannerOverlayEl) return null;
          const width = cubeScannerOverlayEl.width;
          const height = cubeScannerOverlayEl.height;
          const size = Math.min(width, height) * 0.52;
          const tile = size / 3;
          const startX = (width - size) / 2;
          const startY = (height - size) / 2;
          return { width, height, size, tile, startX, startY };
        }

      function getDefaultScannerQuad() {
        const metrics = getScannerGuideMetrics();
        if (!metrics) return null;
        const { startX, startY, size } = metrics;
        return [
          { x: startX, y: startY },
          { x: startX + size, y: startY },
          { x: startX + size, y: startY + size },
          { x: startX, y: startY + size }
        ];
      }

      function ensureScannerQuad() {
        if (!cubeScanner.quad) {
          cubeScanner.quad = getDefaultScannerQuad();
        }
        return cubeScanner.quad;
      }

      function bilerpQuadPoint(quad, u, v) {
        const topX = quad[0].x + (quad[1].x - quad[0].x) * u;
        const topY = quad[0].y + (quad[1].y - quad[0].y) * u;
        const bottomX = quad[3].x + (quad[2].x - quad[3].x) * u;
        const bottomY = quad[3].y + (quad[2].y - quad[3].y) * u;
        return {
          x: topX + (bottomX - topX) * v,
          y: topY + (bottomY - topY) * v
        };
      }

      function getScannerOverlayPoint(event) {
        if (!cubeScannerOverlayEl) return null;
        const rect = cubeScannerOverlayEl.getBoundingClientRect();
        const scaleX = cubeScannerOverlayEl.width / rect.width;
        const scaleY = cubeScannerOverlayEl.height / rect.height;
        return {
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY
        };
      }

      function renderCubeScannerOverlay() {
        if (!cubeScanner.active || !cubeScannerOverlayCtx || !cubeScannerOverlayEl) return;
        const ctx = cubeScannerOverlayCtx;
        const metrics = getScannerGuideMetrics();
        if (!metrics) return;
        const { width, height, tile, startX, startY, size } = metrics;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fillRect(0, 0, width, height);
        ctx.clearRect(startX - 12, startY - 12, size + 24, size + 24);

        ctx.strokeStyle = "rgba(255,255,255,0.86)";
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, size, size);

        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(startX + i * tile, startY);
          ctx.lineTo(startX + i * tile, startY + size);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(startX, startY + i * tile);
          ctx.lineTo(startX + size, startY + i * tile);
          ctx.stroke();
        }

        ctx.strokeStyle = "rgba(0, 200, 150, 0.9)";
        ctx.lineWidth = 3;
        ctx.strokeRect(startX + tile + 4, startY + tile + 4, tile - 8, tile - 8);

          if (cubeScannerVideoEl?.videoWidth) {
            const detailed = sampleScannerFaceDetailed();
            cubeScanner.lastDetailed = detailed;
            updateCubeScannerQuality(detailed);
            drawCubeScannerPreviewNet();
          } else if (cubeScannerQualityEl) {
            cubeScanner.lastDetailed = null;
            cubeScanner.stableSignature = "";
            cubeScanner.stableFrames = 0;
            cubeScannerQualityEl.textContent = "Waiting for camera feed.";
            cubeScannerQualityEl.className = "scanner-quality";
            drawCubeScannerPreviewNet();
            updateScannerReviewUi();
          }

        cubeScanner.raf = requestAnimationFrame(renderCubeScannerOverlay);
      }

      function captureCurrentScannerFace(precomputedDetailed = null) {
        if (!cubeScannerVideoEl || !cubeScannerVideoEl.videoWidth) {
          if (cubeScannerStatusEl) {
            cubeScannerStatusEl.textContent = "Start the camera before capturing a face.";
          }
          return;
        }

        const face = cubeScanner.faceOrder[cubeScanner.index];
        const detailed = precomputedDetailed
          ? precomputedDetailed
          : (cubeScanner.lastDetailed || sampleScannerFaceDetailed());
        const captured = detailed ? mirrorScannerFaceDetailed(detailed).face : null;
        const verification = verifyScannerCapture(face, detailed);
        if (!captured) {
          if (cubeScannerStatusEl) {
            cubeScannerStatusEl.textContent = "Could not read that face. Try again with steadier lighting and alignment.";
          }
          return;
        }

        cubeScanner.pendingFace = face;
        cubeScanner.pendingDetected = captured.slice();
        cubeScanner.selectedFace = captured[0] || face;
        updateScannerReviewUi();
        if (cubeScannerStatusEl) {
          cubeScannerStatusEl.textContent = verification.ok
            ? `${FACE_COLOR_NAMES[face]} face captured. Review it, edit if needed, then click Use Face.`
            : `${FACE_COLOR_NAMES[face]} face captured with a warning. Fix any wrong stickers, then click Use Face or Rescan Face.`;
        }
      }

      function clearPendingScannerFace() {
        cubeScanner.pendingFace = null;
        cubeScanner.pendingDetected = null;
        updateScannerReviewUi();
        drawCubeScannerPreviewNet();
        const face = cubeScanner.faceOrder[cubeScanner.index];
        if (cubeScannerStatusEl && face) {
          cubeScannerStatusEl.textContent = `Rescan the ${FACE_COLOR_NAMES[face]} face and press Capture Face when the live preview looks right.`;
        }
      }

      function acceptCurrentScannerFace() {
        const face = cubeScanner.pendingFace;
        const captured = cubeScanner.pendingDetected;
        if (!face || !captured) return;

        const normalized = captured.slice();
        normalized[4] = face;
        cubeScanner.captured[face] = normalized;
        cubeScanner.index += 1;
        cubeScanner.lastDetailed = null;
        cubeScanner.history = [];
        cubeScanner.pendingFace = null;
        cubeScanner.pendingDetected = null;
        cubeScanner.stableSignature = "";
        cubeScanner.stableFrames = 0;
        drawCubeScannerPreviewNet();
        updateScannerReviewUi();

        if (cubeScanner.index >= cubeScanner.faceOrder.length) {
          if (cubeScannerStatusEl) {
            cubeScannerStatusEl.textContent = "All six faces captured. Loading cube state.";
          }
          closeCubeScanner(true);
          return;
        }

        updateCubeScannerPrompt();
        if (cubeScannerStatusEl) {
          const nextFace = cubeScanner.faceOrder[cubeScanner.index];
          cubeScannerStatusEl.textContent = `${FACE_COLOR_NAMES[face]} face saved. Now show the ${FACE_COLOR_NAMES[nextFace]} face.`;
        }
      }

      function sampleScannerFace() {
        const detailed = sampleScannerFaceDetailed();
        return detailed ? detailed.face : null;
      }

      function smoothScannerDetailed(detailed) {
        if (!detailed) {
          cubeScanner.history = [];
          return null;
        }
        cubeScanner.history.push(detailed);
        if (cubeScanner.history.length > 6) {
          cubeScanner.history.shift();
        }
        const smoothedFace = [];
        const smoothedConfidences = [];
        for (let index = 0; index < 9; index++) {
          const votes = new Map();
          let totalConfidence = 0;
          for (let historyIndex = 0; historyIndex < cubeScanner.history.length; historyIndex++) {
            const past = cubeScanner.history[historyIndex];
            const ageWeight = 1 + historyIndex * 0.2;
            const face = past.face[index];
            const confidence = (past.confidences[index] || 0) * ageWeight;
            votes.set(face, (votes.get(face) || 0) + confidence);
            totalConfidence += confidence;
          }
          let bestFace = detailed.face[index];
          let bestVote = -1;
          for (const [face, vote] of votes.entries()) {
            if (vote > bestVote) {
              bestFace = face;
              bestVote = vote;
            }
          }
          smoothedFace.push(bestFace);
          smoothedConfidences.push(totalConfidence / Math.max(cubeScanner.history.length, 1));
        }
        return { face: smoothedFace, confidences: smoothedConfidences };
      }

      function mirrorScannerFaceDetailed(detailed) {
        const indexMap = [2, 1, 0, 5, 4, 3, 8, 7, 6];
        return {
          face: indexMap.map((index) => detailed.face[index]),
          confidences: indexMap.map((index) => detailed.confidences[index])
        };
      }

      function sampleScannerFaceDetailed() {
        if (!cubeScannerVideoEl || !cubeScannerOverlayEl) return null;
        const metrics = getScannerGuideMetrics();
        if (!metrics) return null;
        const offscreen = document.createElement("canvas");
        offscreen.width = cubeScannerOverlayEl.width;
        offscreen.height = cubeScannerOverlayEl.height;
        const offCtx = offscreen.getContext("2d");
        if (!offCtx) return null;

        offCtx.save();
        offCtx.translate(offscreen.width, 0);
        offCtx.scale(-1, 1);
        offCtx.drawImage(cubeScannerVideoEl, 0, 0, offscreen.width, offscreen.height);
        offCtx.restore();

        const { tile, startX, startY } = metrics;
          const face = [];
          const confidences = [];
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              const perspectiveX = (col - 1) * tile * 0.05;
              const perspectiveY = (row - 1) * tile * 0.08;
              const centerX = startX + col * tile + tile * 0.5 + perspectiveX;
              const centerY = startY + row * tile + tile * 0.5 + perspectiveY;
              const sampleSize = Math.max(7, Math.round(tile * 0.11));
              const offsetScale = tile * 0.09;
              const offsets = [
                [0, 0],
                [-1, 0], [1, 0],
                [0, -1], [0, 1]
              ];
              const votes = new Map();
              let confidenceSum = 0;
              for (const [mx, my] of offsets) {
                const dx = mx * offsetScale;
              const dy = my * offsetScale;
              const sampleX = Math.round(centerX + dx - sampleSize / 2);
                const sampleY = Math.round(centerY + dy - sampleSize / 2);
                const imageData = offCtx.getImageData(sampleX, sampleY, sampleSize, sampleSize).data;
                const classified = classifySampledColor(imageData);
                const weight = mx === 0 && my === 0 ? 3 : 1;
                confidenceSum += classified.confidence * weight;
                votes.set(classified.face, (votes.get(classified.face) || 0) + classified.confidence * weight);
              }
            let bestFace = "U";
            let bestVote = -1;
            for (const [voteFace, voteScore] of votes.entries()) {
              if (voteScore > bestVote) {
                bestFace = voteFace;
                bestVote = voteScore;
              }
              }
              face.push(bestFace);
              confidences.push(confidenceSum / (offsets.length + 2));
            }
          }
        return smoothScannerDetailed({ face, confidences });
      }

      function updateCubeScannerAutoCapture(detailed) {
        const face = cubeScanner.faceOrder[cubeScanner.index];
        if (!detailed || !face) {
          cubeScanner.stableSignature = "";
          cubeScanner.stableFrames = 0;
          return;
        }
        const verification = verifyScannerCapture(face, detailed);
        if (!verification.ok) {
          cubeScanner.stableSignature = "";
          cubeScanner.stableFrames = 0;
          return;
        }
        const minConfidence = Math.min(...detailed.confidences);
        const avgConfidence = detailed.confidences.reduce((sum, value) => sum + value, 0) / Math.max(detailed.confidences.length, 1);
        const edgeAndCornerConfident = detailed.confidences.filter((value, index) => index !== 4 && value >= 0.04).length;
        if (minConfidence < 0.015 || avgConfidence < 0.05 || edgeAndCornerConfident < 6) {
          cubeScanner.stableSignature = "";
          cubeScanner.stableFrames = 0;
          return;
        }
        const signature = `${face}:${detailed.face.join("")}`;
        if (cubeScanner.stableSignature === signature) {
          cubeScanner.stableFrames += 1;
        } else {
          cubeScanner.stableSignature = signature;
          cubeScanner.stableFrames = 1;
        }
        if (cubeScanner.stableFrames >= 16) {
          captureCurrentScannerFace(detailed);
        }
      }

      function updateCubeScannerQuality(detailed) {
        if (!cubeScannerQualityEl) return;
        const face = cubeScanner.faceOrder[cubeScanner.index];
        if (!detailed || !face) {
          cubeScannerQualityEl.textContent = "Hold the face flat and centered in the square guide.";
          cubeScannerQualityEl.className = "scanner-quality";
          return;
        }

        const avgConfidence = detailed.confidences.reduce((sum, value) => sum + value, 0) / Math.max(detailed.confidences.length, 1);
        const centerFace = detailed.face[4];
        const centerOk = centerFace === face;
        const detectedName = FACE_COLOR_NAMES[centerFace] || String(centerFace || "unknown");
        const impossibleCount = countImpossibleScannerColors(face, detailed.face);

        if (impossibleCount >= 8) {
          cubeScannerQualityEl.textContent = `The guide still looks mostly like background or the wrong face. Fill the full ${FACE_COLOR_NAMES[face]} face into the 3x3 box.`;
          cubeScannerQualityEl.className = "scanner-quality warn";
          return;
        }

        if (centerOk && avgConfidence >= 0.03 && impossibleCount < 8) {
          cubeScannerQualityEl.textContent = "Good scan window. Center color matches and the sticker read looks stable.";
          cubeScannerQualityEl.className = "scanner-quality good";
          return;
        }

        if (!centerOk) {
          cubeScannerQualityEl.textContent = `Center sticker looks like ${detectedName} instead of ${FACE_COLOR_NAMES[face]}. Recenter that face.`;
          cubeScannerQualityEl.className = "scanner-quality warn";
          return;
        }

        if (avgConfidence < 0.025) {
          cubeScannerQualityEl.textContent = "Scan looks noisy. Move closer, reduce glare, and keep the face flatter to the camera.";
          cubeScannerQualityEl.className = "scanner-quality warn";
          return;
        }

        cubeScannerQualityEl.textContent = "Almost there. Keep the top row level and fill more of the square guide before capturing.";
        cubeScannerQualityEl.className = "scanner-quality";
      }

      function verifyScannerCapture(face, detailed) {
        if (!detailed) {
          return { ok: false, message: "Could not read that face. Try again with steadier lighting and alignment." };
        }
        const avgConfidence = detailed.confidences.reduce((sum, value) => sum + value, 0) / Math.max(detailed.confidences.length, 1);
        const centerFace = detailed.face[4];
        const impossibleCount = countImpossibleScannerColors(face, detailed.face);
        if (centerFace !== face) {
          const detectedName = FACE_COLOR_NAMES[centerFace] || String(centerFace || "unknown");
          return {
            ok: false,
            message: `Center sticker looks like ${detectedName} instead of ${FACE_COLOR_NAMES[face]}. Reorient the cube and try again.`
          };
        }
        if (impossibleCount >= 8) {
          return {
            ok: false,
            message: `The guide still looks like a partial face. Fill the full 3x3 ${FACE_COLOR_NAMES[face]} face before capturing.`
          };
        }
        if (avgConfidence < 0.004) {
          return {
            ok: false,
            message: "Scan quality is too low to trust. Move closer, reduce glare, and keep the face flat in the guide."
          };
        }
        return {
          ok: true,
          message: `${FACE_COLOR_NAMES[face]} face captured and verified.`
        };
      }

      function countImpossibleScannerColors(face, stickers) {
        const adjacent = SCANNER_ADJACENT_FACE_MAP[face] || new Set();
        let impossible = 0;
        for (const sticker of stickers) {
          if (sticker === face) continue;
          if (adjacent.has(sticker)) continue;
          impossible += 1;
        }
        return impossible;
      }

      function classifySampledColor(imageData) {
          const pixels = [];
          for (let i = 0; i < imageData.length; i += 4) {
            const alpha = imageData[i + 3];
            if (alpha < 200) continue;
            const pr = imageData[i];
            const pg = imageData[i + 1];
            const pb = imageData[i + 2];
            const lum = pr * 0.2126 + pg * 0.7152 + pb * 0.0722;
            pixels.push({ r: pr, g: pg, b: pb, lum });
          }
          if (!pixels.length) return { face: "U", confidence: 0 };
          pixels.sort((a, b) => a.lum - b.lum);
          const trim = Math.floor(pixels.length * 0.18);
          const kept = pixels.slice(trim, Math.max(trim + 1, pixels.length - trim));
          let totalR = 0;
          let totalG = 0;
          let totalB = 0;
          for (const pixel of kept) {
            totalR += pixel.r;
            totalG += pixel.g;
            totalB += pixel.b;
          }
          const r = totalR / kept.length;
          const g = totalG / kept.length;
          const b = totalB / kept.length;
          const { h, s, v } = rgbToHsv(r, g, b);
          const maxChannel = Math.max(r, g, b);
          const minChannel = Math.min(r, g, b);
          const channelSpread = maxChannel - minChannel;

          const sum = Math.max(r + g + b, 1);
          const nr = r / sum;
          const ng = g / sum;
          const nb = b / sum;

          const hueTargets = {
            U: 50,
            F: 0,
            B: 24,
            R: 138,
            L: 219
          };

          let bestFace = "U";
          let bestDistance = Number.POSITIVE_INFINITY;
          let secondDistance = Number.POSITIVE_INFINITY;
          for (const [face, hex] of Object.entries(FACE_COLORS)) {
            const [tr, tg, tb] = hexToRgb(hex);
            const tsum = Math.max(tr + tg + tb, 1);
            const tnr = tr / tsum;
            const tng = tg / tsum;
            const tnb = tb / tsum;
            const normalizedDistance = Math.sqrt(
              (nr - tnr) * (nr - tnr) +
              (ng - tng) * (ng - tng) +
              (nb - tnb) * (nb - tnb)
            );
            const rawDistance = Math.sqrt(
              (r - tr) * (r - tr) +
              (g - tg) * (g - tg) +
              (b - tb) * (b - tb)
            ) / 255;
            let distance = normalizedDistance * 0.75 + rawDistance * 0.45;

            if (face === "D") {
              distance += s * 1.9;
              distance += Math.max(0, 0.74 - v) * 0.75;
              distance += (channelSpread / 255) * 0.5;
              if (h >= 150 && h <= 250 && s > 0.09) {
                distance += 0.3;
              }
            } else {
              const hueDistance = circularHueDistance(h, hueTargets[face]) / 180;
              distance += hueDistance * 0.75;
              if (s < 0.12) {
                distance += 0.24;
              }
              if (face === "U" && (h < 35 || h > 82)) distance += 0.3;
              if (face === "F" && !(h <= 14 || h >= 344)) distance += 0.38;
              if (face === "B" && (h < 10 || h > 42)) distance += 0.26;
              if (face === "R" && (h < 78 || h > 168)) distance += 0.24;
              if (face === "L" && (h < 170 || h > 270)) distance += 0.32;
            }

            // White stickers often pick up blue reflection. If the sample is bright and
            // weakly saturated, strongly prefer white over blue.
            if (face === "L" && s < 0.2 && v > 0.7) {
              distance += 0.35;
            }
            if (face === "D" && s < 0.2 && v > 0.7) {
              distance -= 0.12;
            }

            if (distance < bestDistance) {
              secondDistance = bestDistance;
              bestDistance = distance;
              bestFace = face;
            } else if (distance < secondDistance) {
              secondDistance = distance;
            }
          }

          const separation = secondDistance === Number.POSITIVE_INFINITY
            ? 1
            : Math.max(0, secondDistance - bestDistance);
          const confidence = Math.max(0.03, Math.min(1, separation * 4.5 + (s * 0.22) + (v * 0.08)));
          return { face: bestFace, confidence };
        }

      function circularHueDistance(a, b) {
        const diff = Math.abs(a - b);
        return Math.min(diff, 360 - diff);
      }

      function rgbToHsv(r, g, b) {
        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;
        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const delta = max - min;
        let h = 0;

        if (delta !== 0) {
          if (max === rn) {
            h = 60 * (((gn - bn) / delta) % 6);
          } else if (max === gn) {
            h = 60 * (((bn - rn) / delta) + 2);
          } else {
            h = 60 * (((rn - gn) / delta) + 4);
          }
        }

        if (h < 0) h += 360;
        const s = max === 0 ? 0 : delta / max;
        const v = max;
        return { h, s, v };
      }

      function drawCubeScannerPreviewNet() {
          if (!cubeScannerPreviewNetEl || !cubeScannerPreviewNetCtx) return;
          const ctx = cubeScannerPreviewNetCtx;
          const canvas = cubeScannerPreviewNetEl;
          const tile = 18;
          const gap = 3;
          const radius = 4;
          const faceSpan = tile * 3 + gap * 2;
          const layout = {
            U: [1, 0],
            L: [0, 1],
            F: [1, 1],
            R: [2, 1],
            B: [3, 1],
            D: [1, 2]
          };
          const totalWidth = faceSpan * 4;
          const totalHeight = faceSpan * 3;
          const offsetX = Math.floor((canvas.width - totalWidth) / 2);
          const liveTile = 24;
          const liveGap = 4;
          const liveFaceSpan = liveTile * 3 + liveGap * 2;
          const liveStartX = Math.floor((canvas.width - liveFaceSpan) / 2);
          const liveStartY = 26;
          const netOffsetY = 132;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "rgba(10, 10, 15, 0.18)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = "rgba(154, 163, 178, 0.95)";
          ctx.font = "600 12px monospace";
          ctx.textAlign = "center";
          ctx.fillText("Live detected face", canvas.width / 2, 14);

          const liveFace = cubeScanner.lastDetailed?.face || [];
          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              const index = row * 3 + col;
              const sticker = liveFace[index] || "D";
              const x = liveStartX + col * (liveTile + liveGap);
              const y = liveStartY + row * (liveTile + liveGap);
              ctx.fillStyle = FACE_COLORS[sticker];
              ctx.beginPath();
              ctx.roundRect(x, y, liveTile, liveTile, 5);
              ctx.fill();
              ctx.strokeStyle = index === 4
                ? "rgba(255,255,255,0.96)"
                : "rgba(17,17,17,0.78)";
              ctx.lineWidth = index === 4 ? 2.3 : 1.1;
              ctx.stroke();
            }
          }

          ctx.fillStyle = "rgba(154, 163, 178, 0.95)";
          ctx.fillText("Captured faces", canvas.width / 2, 120);

          for (const face of FACE_ORDER) {
            const [gridX, gridY] = layout[face];
            const startX = offsetX + gridX * faceSpan;
            const startY = netOffsetY + gridY * faceSpan;
            for (let row = 0; row < 3; row++) {
              for (let col = 0; col < 3; col++) {
                const index = row * 3 + col;
              const sticker = cubeScanner.captured[face][index];
              const x = startX + col * (tile + gap);
              const y = startY + row * (tile + gap);
              ctx.fillStyle = FACE_COLORS[sticker];
              ctx.beginPath();
              ctx.roundRect(x, y, tile, tile, radius);
              ctx.fill();
              ctx.strokeStyle = index === 4
                ? "rgba(255,255,255,0.92)"
                : "rgba(17,17,17,0.78)";
              ctx.lineWidth = index === 4 ? 2.5 : 1.2;
              ctx.stroke();
            }
          }
        }
      }

      function updateScannerReviewUi() {
        const hasPending = !!cubeScanner.pendingFace && Array.isArray(cubeScanner.pendingDetected);
        if (scannerReviewEl) {
          scannerReviewEl.classList.toggle("hidden", !hasPending);
        }
        scannerColorButtons.forEach(({ face, button }) => {
          button?.classList.toggle("active", cubeScanner.selectedFace === face);
        });
        drawScannerFaceEditorNet();
      }

      function drawScannerFaceEditorNet() {
        if (!scannerFaceEditorNetEl || !scannerFaceEditorNetCtx) return;
        const ctx = scannerFaceEditorNetCtx;
        const face = cubeScanner.pendingFace;
        const stickers = cubeScanner.pendingDetected;
        ctx.clearRect(0, 0, scannerFaceEditorNetEl.width, scannerFaceEditorNetEl.height);
        if (!face || !stickers) return;

        const tile = 58;
        const gap = 6;
        const radius = 9;
        const faceSpan = tile * 3 + gap * 2;
        const startX = Math.floor((scannerFaceEditorNetEl.width - faceSpan) / 2);
        const startY = Math.floor((scannerFaceEditorNetEl.height - faceSpan) / 2);

        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const index = row * 3 + col;
            const x = startX + col * (tile + gap);
            const y = startY + row * (tile + gap);
            const sticker = index === 4 ? face : stickers[index];
            ctx.fillStyle = FACE_COLORS[sticker];
            ctx.beginPath();
            ctx.roundRect(x, y, tile, tile, radius);
            ctx.fill();
            ctx.strokeStyle = index === 4
              ? "rgba(255,255,255,0.96)"
              : "rgba(17,17,17,0.75)";
            ctx.lineWidth = index === 4 ? 3 : 1.3;
            ctx.stroke();
          }
        }
      }

      function getScannerFaceEditorStickerAtPoint(x, y) {
        if (!scannerFaceEditorNetEl || !cubeScanner.pendingFace || !cubeScanner.pendingDetected) return null;
        const tile = 58;
        const gap = 6;
        const faceSpan = tile * 3 + gap * 2;
        const startX = Math.floor((scannerFaceEditorNetEl.width - faceSpan) / 2);
        const startY = Math.floor((scannerFaceEditorNetEl.height - faceSpan) / 2);
        if (x < startX || y < startY || x > startX + faceSpan || y > startY + faceSpan) return null;
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const stickerX = startX + col * (tile + gap);
            const stickerY = startY + row * (tile + gap);
            if (x >= stickerX && x <= stickerX + tile && y >= stickerY && y <= stickerY + tile) {
              return row * 3 + col;
            }
          }
        }
        return null;
      }

      function onScannerFaceEditorClick(event) {
        if (!scannerFaceEditorNetEl || !cubeScanner.pendingFace || !cubeScanner.pendingDetected) return;
        const rect = scannerFaceEditorNetEl.getBoundingClientRect();
        const scaleX = scannerFaceEditorNetEl.width / rect.width;
        const scaleY = scannerFaceEditorNetEl.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        const index = getScannerFaceEditorStickerAtPoint(x, y);
        if (index === null || index === 4) return;
        cubeScanner.pendingDetected[index] = cubeScanner.selectedFace;
        drawScannerFaceEditorNet();
      }

      function hexToRgb(hex) {
        const normalized = hex.replace("#", "");
        const value = parseInt(normalized, 16);
        return [
          (value >> 16) & 255,
          (value >> 8) & 255,
          value & 255
        ];
      }

      function loadEditorState() {
        clearMoveAnimations();
        resetCameraOrientation();
        state.currentSetupAlgorithm = "";
        state.setupHistory = [];
        state.userHistory = [];
        for (const face of FACE_ORDER) {
          colorEditorState[face][4] = face;
        }
        cube = cloneState(colorEditorState);
        resetStats();
        syncCubeMaterials();

        if (state.mode === "CROSS") {
          state.currentCase = { name: "CROSS TRAINING", algorithm: "White cross only" };
          state.revealed = false;
          statusTextEl.textContent = "Custom cube state loaded for cross training.";
          updateUi();
          void computeCrossTrainingSolution();
          return;
        }

        if (state.mode === "FREE") {
          state.currentCase = { name: "FREE CUSTOM STATE", algorithm: "Manual color entry" };
          state.revealed = true;
          statusTextEl.textContent = "Custom cube state loaded.";
          updateUi();
          return;
        }

        statusTextEl.textContent = "Color entry is available in FREE and CROSS modes.";
        updateUi();
      }

      function getNetLayoutMetrics(canvas) {
        const isEditor = canvas === colorEditorNetEl;
        const tile = isEditor ? 20 : 14;
        const gap = isEditor ? 2 : 1;
        const radius = isEditor ? 4 : 3;
        const faceSpan = tile * 3 + gap * 2;
        const netWidth = faceSpan * 4;
        const netHeight = faceSpan * 3;
        const offsetX = Math.floor((canvas.width - netWidth) / 2);
        const offsetY = Math.floor((canvas.height - netHeight) / 2);
        const layout = {
          U: [1, 0],
          L: [0, 1],
          F: [1, 1],
          R: [2, 1],
          B: [3, 1],
          D: [1, 2]
        };
        return { tile, gap, radius, faceSpan, offsetX, offsetY, layout };
      }

      function onColorEditorClick(event) {
        if (!colorEditorNetEl) return;
        const rect = colorEditorNetEl.getBoundingClientRect();
        const scaleX = colorEditorNetEl.width / rect.width;
        const scaleY = colorEditorNetEl.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        const hit = getEditorStickerAtPoint(x, y);
        if (!hit) return;
        if (hit.index === 4) return;
        colorEditorState[state.editorCurrentFace][hit.index] = state.editorSelectedFace;
        updateUi();
      }

      function getEditorStickerAtPoint(x, y) {
        if (!colorEditorNetEl) return null;
        const tile = 72;
        const gap = 6;
        const faceSpan = tile * 3 + gap * 2;
        const startX = Math.floor((colorEditorNetEl.width - faceSpan) / 2);
        const startY = Math.floor((colorEditorNetEl.height - faceSpan) / 2);
        if (x < startX || y < startY || x > startX + faceSpan || y > startY + faceSpan) return null;
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const stickerX = startX + col * (tile + gap);
            const stickerY = startY + row * (tile + gap);
            if (x >= stickerX && x <= stickerX + tile && y >= stickerY && y <= stickerY + tile) {
              return { face: state.editorCurrentFace, index: row * 3 + col };
            }
          }
        }
        return null;
      }

      function drawColorEditorNet() {
        if (!colorEditorNetEl || !colorEditorNetCtx) return;
        const ctx = colorEditorNetCtx;
        const tile = 72;
        const gap = 6;
        const radius = 10;
        const faceSpan = tile * 3 + gap * 2;
        const startX = Math.floor((colorEditorNetEl.width - faceSpan) / 2);
        const startY = Math.floor((colorEditorNetEl.height - faceSpan) / 2);
        const face = state.editorCurrentFace;

        ctx.clearRect(0, 0, colorEditorNetEl.width, colorEditorNetEl.height);
        ctx.fillStyle = "rgba(10, 10, 15, 0.18)";
        ctx.fillRect(0, 0, colorEditorNetEl.width, colorEditorNetEl.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.strokeRect(startX - 6, startY - 6, faceSpan + 12, faceSpan + 12);

        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const index = row * 3 + col;
            const x = startX + col * (tile + gap);
            const y = startY + row * (tile + gap);
            const sticker = index === 4 ? face : colorEditorState[face][index];
            ctx.fillStyle = FACE_COLORS[sticker];
            ctx.beginPath();
            ctx.roundRect(x, y, tile, tile, radius);
            ctx.fill();
            ctx.strokeStyle = index === 4
              ? "rgba(255,255,255,0.96)"
              : "rgba(17, 17, 17, 0.75)";
            ctx.lineWidth = index === 4 ? 3 : 1.2;
            ctx.stroke();
          }
        }
      }

      function setCurrentCfopCrossSolution(moves) {
        state.currentCrossSolution = Array.isArray(moves) && moves.length ? moves.join(" ") : "";
        state.currentCrossOptimalMoves = Array.isArray(moves) ? moves.length : 0;
      }

      function setCfopStageFloor(stage) {
        state.cfopStageFloor = Math.max(0, Math.min(3, Number(stage) || 0));
      }

      function resetQuizFeedback() {
        if (state.mode === "FREE") {
          quizFeedbackEl.textContent = "Quiz works in OLL and PLL modes.";
          return;
        }
        quizFeedbackEl.textContent = state.quizMode === "ON"
          ? "Enter the algorithm you think matches this case."
          : "Quiz is off.";
      }

      function resetStats() {
        state.moveCount = 0;
        state.elapsedMs = 0;
        state.timerStart = 0;
        state.timerRunning = false;
        state.solved = isCurrentGoalSolved();
        state.userHistory = [];
        state.beginnerBreakdown = null;
        state.currentCrossSolution = "";
        state.currentCrossOptimalMoves = 0;
        if (quizAnswerEl) {
          quizAnswerEl.value = "";
        }
        resetQuizFeedback();
      }

      function updateUi() {
        const scramblePracticeMode = isScramblePracticeMode();
        const crossMode = state.mode === "CROSS";
        caseNameEl.textContent = state.currentCase ? state.currentCase.name : "No Case";
        algorithmEl.textContent = state.mode === "CROSS"
          ? "White cross only"
          : state.mode === "FREE" || !state.currentCase
            ? "Free practice"
            : state.currentCase.algorithm;
        algorithmEl.classList.toggle("blurred", !state.revealed && !scramblePracticeMode);
        moveCountEl.textContent = String(state.moveCount);
        timerEl.textContent = formatTime(state.elapsedMs);
        timerEl.classList.toggle("running", state.timerRunning);
        solveMethodEl.value = state.solveMethod;
        if (solveScopeEl) {
          solveScopeEl.value = state.solveScope;
        }
        beginnerStepsGroupEl.style.display = state.solveMethod === "BEGINNER" ? "" : "none";
        cfopStepsGroupEl.style.display = state.solveMethod === "CFOP" ? "" : "none";
        beginnerTeacherPanelEl.style.display = state.solveMethod === "BEGINNER" ? "" : "none";
        algorithmQuizGroupEl.style.display = scramblePracticeMode ? "none" : "";
        quizModeEl.value = state.quizMode;
        quizAnswerEl.disabled = state.quizMode !== "ON" || scramblePracticeMode;
        quizCheckBtn.disabled = state.quizMode !== "ON" || scramblePracticeMode;
        quizClearBtn.disabled = scramblePracticeMode;
        setupLabelEl.textContent = scramblePracticeMode ? "Scramble" : "Setup";
        setupTextEl.textContent = state.currentSetupAlgorithm || "None";
        frontFaceTextEl.textContent = FACE_COLOR_NAMES.F;
        crossSolutionTextEl.textContent = state.mode === "CROSS"
          ? state.currentCrossOptimalMoves
            ? state.revealed && state.currentCrossSolution
              ? `${state.currentCrossOptimalMoves} moves: ${state.currentCrossSolution}`
              : `${state.currentCrossOptimalMoves} moves (Reveal to view algorithm)`
            : "Computing optimal cross..."
          : state.currentCrossSolution || "Not computed yet.";
        crossRevealRowEl.style.display = crossMode ? "" : "none";
        customScrambleLabelEl.style.display = scramblePracticeMode ? "" : "none";
        customScrambleControlsEl.style.display = scramblePracticeMode ? "" : "none";
        editorColorButtons.forEach(({ face, button }) => button?.classList.toggle("active", state.editorSelectedFace === face));
        if (colorEditorFaceNameEl) {
          colorEditorFaceNameEl.textContent = `${FACE_COLOR_NAMES[state.editorCurrentFace]} Face`;
        }
        if (colorEditorOrientationEl) {
          colorEditorOrientationEl.textContent = getColorEditorOrientationHint(state.editorCurrentFace);
        }
        stepMovesEl.innerHTML = formatBeginnerBreakdown(state.beginnerBreakdown);
        beginnerTeacherEl.innerHTML = formatBeginnerLesson(state.beginnerLessonKey || inferBeginnerLessonKey());
        statusTextEl.classList.toggle("solved", state.solved);
        if (state.solved && state.moveCount > 0) {
          statusTextEl.textContent = state.mode === "CROSS"
            ? `Cross solved in ${formatTime(state.elapsedMs)} with ${state.moveCount} moves.${state.currentCrossOptimalMoves ? ` Optimal was ${state.currentCrossOptimalMoves}.` : ""}`
            : `Solved in ${formatTime(state.elapsedMs)} with ${state.moveCount} moves.`;
        } else if (!state.solved) {
          statusTextEl.classList.remove("solved");
        }
        filterSectionEl.style.display = scramblePracticeMode ? "none" : "";
        if (solveBtn) {
          solveBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        }
        undoBtn.disabled = animationState.active || state.userHistory.length === 0;
        revealBtn.style.display = crossMode ? "none" : "";
        if (crossRevealBtn) {
          crossRevealBtn.disabled = animationState.active || state.beginnerSolving || !state.currentCrossOptimalMoves || state.revealed;
        }
        showScrambleBtn.disabled = animationState.active || state.beginnerSolving || !!scrambleReplayTimeout || !parseAlgorithm(state.currentSetupAlgorithm || "").length;
        if (loadScrambleBtn) {
          loadScrambleBtn.disabled = animationState.active || state.beginnerSolving || !String(customScrambleInputEl?.value || "").trim();
        }
        if (loadEditorStateBtn) {
          loadEditorStateBtn.disabled = animationState.active || state.beginnerSolving;
        }
        toCrossBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        toWhiteBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        toMiddleBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        toYellowCrossBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        toLastLayerEdgesBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        toCornerOrientationBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        toCornerPermutationBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        beginnerFullSolveBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        cfopCrossBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        cfopF2LBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        cfopOllBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        cfopPllBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        cfopNewF2LBtn.disabled = animationState.active || state.beginnerSolving;
        cfopNewOllBtn.disabled = animationState.active || state.beginnerSolving;
        cfopNewPllBtn.disabled = animationState.active || state.beginnerSolving;
        cfopFullSolveBtn.disabled = animationState.active || state.solved || state.beginnerSolving;
        resetCaseStatsBtn.disabled = scramblePracticeMode || !state.currentCase;
        updateCaseStatsUi();
        updateSessionStatsUi();
        updateCfopStepStyles();
        drawColorEditorNet();
      }

      function updateCfopStepStyles() {
        const crossSolved = isWhiteCrossSolvedState(cube);
        const f2lSolved = areFirstTwoLayersSolved(cube);
        const ollSolved = isOllSolvedState(cube);
        const pllSolved = isSolved(cube);
        const actualStage = pllSolved
          ? 4
          : !crossSolved
            ? 0
            : !f2lSolved
              ? 1
              : !ollSolved
                ? 2
                : 3;
        const displayStage = pllSolved ? 4 : Math.max(actualStage, state.cfopStageFloor);
        const statuses = cfopStepButtons.map((_, index) => {
          if (displayStage >= 4) return "complete";
          if (index < displayStage) return "complete";
          if (index === displayStage) return "active";
          return "upcoming";
        });

        cfopStepButtons.forEach((button, index) => {
          button.classList.remove("cfop-step-complete", "cfop-step-active", "cfop-step-upcoming");
          button.classList.add(`cfop-step-${statuses[index]}`);
        });
      }

      function renderFilterList() {
        filterListEl.innerHTML = "";
        if (isScramblePracticeMode()) return;
        for (const item of getCasesForMode(state.mode)) {
          const label = document.createElement("label");
          label.className = "filter-item";
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = state.selectedCases[state.mode].includes(item.name);
          input.addEventListener("change", () => toggleCaseFilter(item.name, input.checked));
          const span = document.createElement("span");
          span.textContent = item.name;
          label.appendChild(input);
          label.appendChild(span);
          filterListEl.appendChild(label);
        }
      }

      function toggleCaseFilter(name, enabled) {
        const current = new Set(state.selectedCases[state.mode]);
        if (enabled) current.add(name); else current.delete(name);
        state.selectedCases[state.mode] = Array.from(current);
        saveSelectedCases();
      }

      function setAllCurrentFilters(enabled) {
        if (isScramblePracticeMode()) return;
        state.selectedCases[state.mode] = enabled ? getCasesForMode(state.mode).map((item) => item.name) : [];
        saveSelectedCases();
        renderFilterList();
      }

      function updateCaseStatsUi() {
        if (state.mode === "FREE" || !state.currentCase) {
          caseStatsEl.textContent = "";
          caseStatsSectionEl?.classList.add("hidden-empty");
          return;
        }
        const stats = getCurrentCaseStats();
        if (!stats || !stats.solves) {
          caseStatsEl.textContent = "";
          caseStatsSectionEl?.classList.add("hidden-empty");
          return;
        }
        caseStatsSectionEl?.classList.remove("hidden-empty");
        const average = stats.totalMs / stats.solves;
        const recent = (stats.recent || []).map((ms) => formatTime(ms)).join(", ");
        caseStatsEl.textContent = `Solves: ${stats.solves} | Best: ${formatTime(stats.bestMs)} | Avg: ${formatTime(average)}${recent ? ` | Recent: ${recent}` : ""}`;
      }

      function formatSessionMetric(value) {
        return Number.isFinite(value) ? formatTime(value) : "-";
      }

      function averageOfLast(values, count) {
        if (!values || values.length < count) return null;
        const slice = values.slice(-count);
        return slice.reduce((sum, item) => sum + item, 0) / count;
      }

      function updateSessionStatsUi() {
        const stats = state.sessionStats;
        if (!stats.solves && !stats.quizAttempts) {
          sessionStatsEl.textContent = "";
          sessionStatsSectionEl?.classList.add("hidden-empty");
          return;
        }
        sessionStatsSectionEl?.classList.remove("hidden-empty");
        const ao5 = averageOfLast(stats.times, 5);
        const ao12 = averageOfLast(stats.times, 12);
        const accuracy = stats.quizAttempts
          ? `${Math.round((stats.quizCorrect / stats.quizAttempts) * 100)}%`
          : "-";
        sessionStatsEl.textContent =
          `Solves: ${stats.solves} | Best: ${formatSessionMetric(stats.bestMs)} | Ao5: ${formatSessionMetric(ao5)} | Ao12: ${formatSessionMetric(ao12)} | Quiz: ${stats.quizCorrect}/${stats.quizAttempts} (${accuracy}) | Best CFOP Cross: ${formatSessionMetric(stats.bestCfopCross)} | Best F2L: ${formatSessionMetric(stats.bestCfopF2L)} | Best OLL: ${formatSessionMetric(stats.bestCfopOll)} | Best PLL: ${formatSessionMetric(stats.bestCfopPll)}`;
      }

      function recordCurrentCaseSolve() {
        if (isScramblePracticeMode() || !state.currentCase) return;
        const key = getCaseStatsKey();
        const existing = state.caseStats[key] || { solves: 0, bestMs: Infinity, totalMs: 0, recent: [] };
        existing.solves += 1;
        existing.bestMs = Math.min(existing.bestMs, state.elapsedMs);
        existing.totalMs += state.elapsedMs;
        existing.recent = [...(existing.recent || []), state.elapsedMs].slice(-5);
        state.caseStats[key] = existing;
        saveCaseStats();
        state.sessionStats.solves += 1;
        state.sessionStats.bestMs = Math.min(state.sessionStats.bestMs, state.elapsedMs);
        state.sessionStats.times = [...state.sessionStats.times, state.elapsedMs].slice(-50);
      }

      function resetCurrentCaseStats() {
        const key = getCaseStatsKey();
        if (!key) return;
        delete state.caseStats[key];
        saveCaseStats();
        updateCaseStatsUi();
      }

      function resetSessionStats() {
        state.sessionStats = createEmptySessionStats();
        updateSessionStatsUi();
      }

      function updateSessionStepStat(label, moves) {
        if (!Number.isFinite(moves) || moves <= 0) return;
        const ms = moves * 1000;
        if (label === "CFOP Cross") {
          state.sessionStats.bestCfopCross = Math.min(state.sessionStats.bestCfopCross, ms);
        } else if (label.startsWith("F2L Pair")) {
          const total = (state.beginnerBreakdown || [])
            .filter((item) => item.label.startsWith("F2L Pair"))
            .reduce((sum, item) => sum + Number(item.moves || 0), 0);
          if (total > 0) {
            state.sessionStats.bestCfopF2L = Math.min(state.sessionStats.bestCfopF2L, total * 1000);
          }
        } else if (label === "CFOP OLL") {
          state.sessionStats.bestCfopOll = Math.min(state.sessionStats.bestCfopOll, ms);
        } else if (label === "CFOP PLL") {
          state.sessionStats.bestCfopPll = Math.min(state.sessionStats.bestCfopPll, ms);
        }
      }

      function updateTimerDisplay() {
        if (state.timerRunning) {
          state.elapsedMs = performance.now() - state.timerStart;
          timerEl.textContent = formatTime(state.elapsedMs);
        }
        timerEl.classList.toggle("running", state.timerRunning);
      }

      function formatTime(ms) {
        return (ms / 1000).toFixed(2);
      }

      function onKeyDown(event) {
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          const snapped = getNearestSnappedOrbit();
          let targetYaw = snapped.yaw;
          let targetPitch = snapped.pitch;
          if (event.key === "ArrowLeft") targetYaw += Math.PI / 2;
          if (event.key === "ArrowRight") targetYaw -= Math.PI / 2;
          if (event.key === "ArrowUp") targetPitch += Math.PI / 2;
          if (event.key === "ArrowDown") targetPitch -= Math.PI / 2;
          animateCameraToOrientation(targetYaw, targetPitch);
          return;
        }

        const move = MOVE_BINDINGS[event.key.toLowerCase()];
        if (!move) return;
        event.preventDefault();
        performMove(move, true);
      }

      function performMove(move, fromUser) {
        if (!isMoveSupported(move)) return;
        const job = fromUser ? resolveUserMove(move) : createMoveJob(move, move);
        if (!job) return;
        animationState.queue.push({ ...job, fromUser });
        if (!animationState.active) {
          startNextAnimatedMove();
        }
      }

      function showFlash(element, text) {
        element.textContent = text;
        element.classList.remove("flash-visible");
        void element.offsetWidth;
        element.classList.add("flash-visible");
      }

      function startNextAnimatedMove() {
        if (animationState.active || animationState.queue.length === 0) return;

        const job = animationState.queue.shift();
        const layers = job.layers;
        const axis = layers[0].axis;
        const pivot = new THREE.Group();
        const affected = cubies.filter((cubie) => layers.some((layer) => cubie.coords[axis] === layer.layer));
        cubeGroup.add(pivot);

        for (const cubie of affected) {
          pivot.attach(cubie.mesh);
        }

        if (job.fromUser && !state.timerRunning && !state.solved) {
          state.timerRunning = true;
          state.timerStart = performance.now() - state.elapsedMs;
        }

        if (job.fromUser) {
          state.moveCount += 1;
          showFlash(moveFlashEl, job.displayMove);
        }

        animationState.active = {
          job,
          layers,
          axis,
          pivot,
          affected,
          startedAt: performance.now(),
          currentAngle: 0,
          targetAngle: layers[0].rotation * (Math.PI / 2) * job.quarterTurns
        };

        updateUi();
      }

      function updateMoveAnimation(now) {
        if (!animationState.active) return;

        const active = animationState.active;
        const elapsed = now - active.startedAt;
        const rawT = Math.min(1, elapsed / animationState.durationMs);
        const easedT = 1 - Math.pow(1 - rawT, 3);
        const angle = active.targetAngle * easedT;
        const delta = angle - active.currentAngle;
        active.currentAngle = angle;

        if (delta !== 0) {
          if (active.axis === "x") active.pivot.rotateX(delta);
          if (active.axis === "y") active.pivot.rotateY(delta);
          if (active.axis === "z") active.pivot.rotateZ(delta);
        }

        if (rawT < 1) return;

        for (const cubie of active.affected) {
          cubeGroup.attach(cubie.mesh);
        }
        cubeGroup.remove(active.pivot);
        animationState.active = null;
        resetCubieTransforms();
        finalizeMove(active.job);
        startNextAnimatedMove();
      }

      function finalizeMove(job) {
        applyJobImmediate(job);
        if (job.fromUser) {
          state.userHistory.push(job.move);
        }
        syncCubeMaterials();

        const goalSolved = state.mode === "CROSS" ? isWhiteCrossSolvedState(cube) : isSolved(cube);
        if (goalSolved) {
          if (state.mode === "CROSS" && !job.fromUser) {
            state.solved = false;
          } else {
            state.solved = true;
            if (state.timerRunning) {
              state.elapsedMs = performance.now() - state.timerStart;
              state.timerRunning = false;
            }
            if (job.fromUser) {
              if (state.mode !== "CROSS") {
                recordCurrentCaseSolve();
              } else {
                state.beginnerBreakdown = [
                  ...(state.currentCrossOptimalMoves ? [{ label: "Optimal Cross", moves: state.currentCrossOptimalMoves }] : []),
                  { label: "Your Cross", moves: state.moveCount }
                ];
              }
            }
            showFlash(statusFlashEl, state.mode === "CROSS" ? "Cross Solved" : "Solved");
          }
        } else {
          state.solved = false;
        }

        updateUi();
      }

      async function solveCubeAnimated() {
        const applied = [...state.setupHistory, ...state.userHistory];
        if (animationState.active || state.solved || state.beginnerSolving) return;
        let solution = [];
        let statusMessage = "";
        let beginnerError = null;
        let beginnerBreakdown = null;

        if (state.solveMethod === "BEGINNER") {
          state.beginnerSolving = true;
          statusTextEl.textContent = "Computing beginner solution...";
          updateUi();
          const beginnerResult = await requestBeginnerMethodSolution(cube, state.solveScope, (message) => {
            if (state.beginnerSolving && message) {
              statusTextEl.textContent = message;
            }
          });
          solution = beginnerResult?.solution || [];
          beginnerBreakdown = beginnerResult?.breakdown || null;
          beginnerError = beginnerResult?.error || null;
          state.beginnerSolving = false;
          if (solution && solution.length > 0) {
            state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, beginnerBreakdown);
            statusMessage = state.solveScope === "WHITE_CROSS"
              ? "Playing back the beginner white-cross sequence."
              : state.solveScope === "WHITE_CORNERS"
                ? "Playing back the beginner white-corners sequence."
                : state.solveScope === "MIDDLE_LAYER"
                  ? "Playing back the beginner middle-edge sequence."
                  : state.solveScope === "YELLOW_CROSS"
                    ? "Playing back the beginner yellow-cross sequence."
                    : state.solveScope === "LAST_LAYER_EDGES"
                      ? "Playing back the beginner last-layer-edge sequence."
                      : state.solveScope === "LAST_LAYER_CORNERS_PERMUTATION"
                        ? "Playing back the beginner corner-permutation sequence."
                        : state.solveScope === "LAST_LAYER_CORNERS_ORIENTATION"
                          ? "Playing back the beginner corner-orientation sequence."
                : "Playing back the beginner solve sequence.";
          } else if (applied.length > 0) {
            state.beginnerBreakdown = null;
            solution = applied.slice().reverse().map(invertMove);
            statusMessage = beginnerError
              ? `Beginner solver error: ${beginnerError}. Replaying the recorded undo sequence instead.`
              : "Beginner solver could not finish. Replaying the recorded undo sequence instead.";
          }
        } else if (applied.length > 0) {
          state.beginnerBreakdown = null;
          solution = applied.slice().reverse().map(invertMove);
          statusMessage = "Playing back the CFOP solve sequence.";
        }

        if (!solution || solution.length === 0) return;
        state.setupHistory = [];
        state.userHistory = [];
        for (const move of solution) {
          performMove(move, false);
        }
        statusTextEl.textContent = statusMessage;
      }

      function replayCurrentScramble() {
        if (animationState.active || state.beginnerSolving) return;
        const moves = parseAlgorithm(state.currentSetupAlgorithm || "");
        if (!moves.length) {
          statusTextEl.textContent = "No scramble or setup is available to replay.";
          updateUi();
          return;
        }

        clearMoveAnimations();
        resetCameraOrientation();
        cube = createSolvedState();
        state.setupHistory = moves.slice();
        state.userHistory = [];
        state.moveCount = 0;
        state.elapsedMs = 0;
        state.timerStart = 0;
        state.timerRunning = false;
        state.solved = false;
        state.beginnerBreakdown = null;
        if (quizAnswerEl) {
          quizAnswerEl.value = "";
        }
        resetQuizFeedback();
        syncCubeMaterials();
        updateUi();
        statusTextEl.textContent = state.mode === "FREE"
          ? "Scramble starts in 1 second. Rotate the view if needed."
          : "Setup starts in 1 second. Rotate the view if needed.";
        scrambleReplayTimeout = window.setTimeout(() => {
          scrambleReplayTimeout = 0;
          for (const move of moves) {
            performMove(move, false);
          }
          statusTextEl.textContent = state.mode === "FREE"
            ? "Playing scramble animation."
            : "Playing setup animation.";
          updateUi();
        }, SCRAMBLE_REPLAY_DELAY_MS);
        updateUi();
      }

      async function solveToWhiteCross() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.beginnerLessonKey = "WHITE_CROSS";
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing white cross...";
        updateUi();
        const beginnerResult = await requestBeginnerMethodSolution(cube, "WHITE_CROSS", (message) => {
          if (state.beginnerSolving && message) {
            statusTextEl.textContent = message;
          }
        });
        state.beginnerSolving = false;
        const solution = beginnerResult?.solution || [];
        if (!solution.length) {
          state.beginnerBreakdown = null;
          statusTextEl.textContent = beginnerResult?.error
            ? `White cross error: ${beginnerResult.error}`
            : "Could not build the white cross.";
          updateUi();
          return;
        }
        state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, beginnerResult?.breakdown || null);

        state.setupHistory = [];
        state.userHistory = [];
        for (const move of solution) {
          performMove(move, false);
        }
        state.solveMethod = "BEGINNER";
        solveMethodEl.value = state.solveMethod;
        state.solveScope = "WHITE_CORNERS";
        state.beginnerLessonKey = "WHITE_CORNERS";
        persistSolveScope();
        updateUi();
        statusTextEl.textContent = "White cross built. Scope switched to White Corners.";
      }

      async function solveToCfopCross() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing CFOP cross...";
        updateUi();
        const beginnerResult = await requestBeginnerMethodSolution(cube, "WHITE_CROSS", (message) => {
          if (state.beginnerSolving && message) {
            statusTextEl.textContent = message.replace(/white cross/i, "CFOP cross");
          }
        });
        state.beginnerSolving = false;
        const solution = beginnerResult?.solution || [];
        if (!solution.length) {
          if (isWhiteCrossSolvedState(cube)) {
            setCurrentCfopCrossSolution([]);
            statusTextEl.textContent = "CFOP cross is already solved.";
            updateUi();
            return;
          }
          statusTextEl.textContent = beginnerResult?.error
            ? `CFOP cross error: ${beginnerResult.error}`
            : "Could not build the CFOP cross.";
          updateUi();
          return;
        }
        setCurrentCfopCrossSolution(solution);
        state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, [
          { label: "CFOP Cross", moves: solution.length }
        ]);
        state.setupHistory = [];
        state.userHistory = [];
        for (const move of solution) {
          performMove(move, false);
        }
        state.solveMethod = "CFOP";
        solveMethodEl.value = state.solveMethod;
        updateUi();
        statusTextEl.textContent = "CFOP cross built.";
      }

      async function startNewF2LPractice() {
        if (animationState.active || state.beginnerSolving) return;
        clearMoveAnimations();
        resetCameraOrientation();
        state.mode = "FREE";
        modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === "FREE"));
        renderFilterList();
        state.currentCase = { name: "F2L START", algorithm: "Hidden" };
        state.currentSetupAlgorithm = generateScramble(24);
        state.revealed = true;
        cube = createSolvedState();
        applyAlgorithm(state.currentSetupAlgorithm, false);
        resetStats();
        state.setupHistory = parseAlgorithm(state.currentSetupAlgorithm);
        syncCubeMaterials();
        updateUi();
        await solveToCfopCross();
        if (!state.beginnerSolving && isWhiteCrossSolvedState(cube)) {
          state.currentCase = { name: "F2L START", algorithm: "White cross solved" };
          updateUi();
          statusTextEl.textContent = "New F2L start ready with white cross solved.";
        }
      }

      function setFreePracticeState(name, moves, subtitle, breakdown = null) {
        clearMoveAnimations();
        resetCameraOrientation();
        state.mode = "FREE";
        modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === "FREE"));
        renderFilterList();
        state.currentCase = { name, algorithm: subtitle || "Hidden" };
        state.currentSetupAlgorithm = moves.join(" ");
        state.revealed = true;
        cube = createSolvedState();
        applyAlgorithm(state.currentSetupAlgorithm, false);
        resetStats();
        state.beginnerBreakdown = breakdown;
        state.setupHistory = parseAlgorithm(state.currentSetupAlgorithm);
        syncCubeMaterials();
        updateUi();
      }

      async function buildCfopStartMoves(targetStage) {
        const scramble = parseAlgorithm(generateScramble(24));
        let working = createSolvedState();
        working = applyMovesToState(working, scramble);
        const allMoves = scramble.slice();
        let breakdown = null;

        const crossResult = await requestBeginnerMethodSolution(working, "WHITE_CROSS", () => {});
        if (!crossResult?.solution) return null;
        setCurrentCfopCrossSolution(crossResult.solution);
        allMoves.push(...crossResult.solution);
        working = applyMovesToState(working, crossResult.solution);
        breakdown = mergeBeginnerBreakdown(breakdown, [{ label: "CFOP Cross", moves: crossResult.solution.length }]);

        if (targetStage === "F2L") {
          return { moves: allMoves, breakdown, name: "F2L START", subtitle: "White cross solved" };
        }

        const f2lResult = await requestBeginnerMethodSolution(working, "CFOP_F2L", () => {});
        if (!f2lResult?.solution) return null;
        allMoves.push(...f2lResult.solution);
        working = applyMovesToState(working, f2lResult.solution);
        breakdown = mergeBeginnerBreakdown(
          breakdown,
          (f2lResult.breakdown || [])
            .map((item) => item.label === "White Cross" ? { ...item, label: "CFOP Cross" } : item)
            .filter((item) => item.label !== "CFOP Cross" || item.moves > 0)
        );

        if (targetStage === "OLL") {
          return { moves: allMoves, breakdown, name: "OLL START", subtitle: "Cross and F2L solved" };
        }

        const ollResult = findCfopOllSolution(working);
        if (!ollResult) return null;
        allMoves.push(...ollResult.moves);
        breakdown = mergeBeginnerBreakdown(breakdown, [{ label: "CFOP OLL", moves: ollResult.moves.length }]);
        return { moves: allMoves, breakdown, name: "PLL START", subtitle: "Cross, F2L, and OLL solved" };
      }

      async function startNewOllPractice() {
        if (animationState.active || state.beginnerSolving) return;
        state.beginnerSolving = true;
        statusTextEl.textContent = "Preparing new OLL start...";
        updateUi();
        const prep = await buildCfopStartMoves("OLL");
        state.beginnerSolving = false;
        if (!prep) {
          statusTextEl.textContent = "Could not prepare a new OLL start.";
          updateUi();
          return;
        }
        setFreePracticeState(prep.name, prep.moves, prep.subtitle, prep.breakdown);
        state.solveMethod = "CFOP";
        solveMethodEl.value = state.solveMethod;
        updateUi();
        statusTextEl.textContent = "New OLL start ready with cross and F2L solved.";
      }

      async function startNewPllPractice() {
        if (animationState.active || state.beginnerSolving) return;
        state.beginnerSolving = true;
        statusTextEl.textContent = "Preparing new PLL start...";
        updateUi();
        const prep = await buildCfopStartMoves("PLL");
        state.beginnerSolving = false;
        if (!prep) {
          statusTextEl.textContent = "Could not prepare a new PLL start.";
          updateUi();
          return;
        }
        setFreePracticeState(prep.name, prep.moves, prep.subtitle, prep.breakdown);
        state.solveMethod = "CFOP";
        solveMethodEl.value = state.solveMethod;
        updateUi();
        statusTextEl.textContent = "New PLL start ready with cross, F2L, and OLL solved.";
      }

      async function solveToCfopF2L() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        const hadCross = isWhiteCrossSolvedState(cube);
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing CFOP F2L...";
        updateUi();
        const beginnerResult = await requestBeginnerMethodSolution(cube, "CFOP_F2L", (message) => {
          if (!state.beginnerSolving || !message) return;
          statusTextEl.textContent = message
            .replace(/white cross/gi, "CFOP cross")
            .replace(/f2l pair/gi, "F2L pair");
        });
        state.beginnerSolving = false;
        const solution = beginnerResult?.solution || [];
        const breakdown = beginnerResult?.breakdown || [];
        if (!solution.length) {
          statusTextEl.textContent = beginnerResult?.error
            ? `CFOP F2L error: ${beginnerResult.error}`
            : "Could not build CFOP F2L.";
          updateUi();
          return;
        }

        const crossMoves = Number(
          breakdown.find((item) => item.label === "CFOP Cross" || item.label === "White Cross")?.moves || 0
        );
        const f2lMoves = breakdown
          .filter((item) => item.label !== "CFOP Cross" && item.label !== "White Cross")
          .reduce((sum, item) => sum + Number(item.moves || 0), 0);
        const cfopBreakdown = breakdown.map((item) =>
          item.label === "White Cross" ? { label: "CFOP Cross", moves: item.moves } : item
        );
        if (hadCross && crossMoves === 0) {
          state.beginnerBreakdown = mergeBeginnerBreakdown(
            state.beginnerBreakdown,
            cfopBreakdown.filter((item) => item.label !== "CFOP Cross")
          );
        } else {
          state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, cfopBreakdown);
        }
        for (const item of cfopBreakdown) {
          updateSessionStepStat(item.label, Number(item.moves || 0));
        }

        state.setupHistory = [];
        state.userHistory = [];
        for (const move of solution) {
          performMove(move, false);
        }
        state.solveMethod = "CFOP";
        solveMethodEl.value = state.solveMethod;
        updateUi();
        statusTextEl.textContent = hadCross && crossMoves === 0
          ? "CFOP F2L built."
          : "CFOP cross and F2L built.";
      }

      async function solveToCfopOll() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing CFOP OLL...";
        updateUi();
        let working = cloneState(cube);
        let allMoves = [];
        let breakdown = [];

        const f2lResult = await requestBeginnerMethodSolution(working, "CFOP_F2L", () => {});
        if (!f2lResult?.solution) {
          state.beginnerSolving = false;
          statusTextEl.textContent = "CFOP OLL error: could not build cross and F2L.";
          updateUi();
          return;
        }
        if (f2lResult.solution.length > 0) {
          allMoves.push(...f2lResult.solution);
          working = applyMovesToState(working, f2lResult.solution);
          breakdown = mergeBeginnerBreakdown(
            breakdown,
            (f2lResult.breakdown || [])
              .map((item) => item.label === "White Cross" ? { ...item, label: "CFOP Cross" } : item)
              .filter((item) => item.label !== "CFOP Cross" || item.moves > 0)
          );
          for (const item of f2lResult.breakdown || []) {
            const label = item.label === "White Cross" ? "CFOP Cross" : item.label;
            if (label === "CFOP Cross" || String(label || "").startsWith("F2L Pair")) {
              updateSessionStepStat(label, Number(item.moves || 0));
            }
          }
        }

        const result = findCfopOllSolution(working);
        state.beginnerSolving = false;
        if (!result) {
          statusTextEl.textContent = "CFOP OLL error: no matching OLL algorithm found.";
          updateUi();
          return;
        }
        if (result.moves.length > 0) {
          allMoves.push(...result.moves);
          breakdown.push({ label: "CFOP OLL", moves: result.moves.length });
          updateSessionStepStat("CFOP OLL", result.moves.length);
        }
        state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, breakdown);
        state.setupHistory = [];
        state.userHistory = [];
        for (const move of allMoves) {
          performMove(move, false);
        }
        state.solveMethod = "CFOP";
        solveMethodEl.value = state.solveMethod;
        updateUi();
        const builtF2L = breakdown.some((item) => item.label === "CFOP Cross" || String(item.label || "").startsWith("F2L Pair"));
        statusTextEl.textContent = result.moves.length > 0
          ? `CFOP ${builtF2L ? "Cross + F2L + " : ""}OLL built${result.caseName ? ` using ${result.caseName}` : ""}.`
          : `CFOP ${builtF2L ? "Cross + F2L built. OLL was already solved." : "OLL is already solved."}`;
      }

      async function solveToCfopPll() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing CFOP PLL...";
        updateUi();
        let working = cloneState(cube);
        let allMoves = [];
        let breakdown = [];

        const f2lResult = await requestBeginnerMethodSolution(working, "CFOP_F2L", () => {});
        if (!f2lResult?.solution) {
          state.beginnerSolving = false;
          statusTextEl.textContent = "CFOP PLL error: could not build cross and F2L.";
          updateUi();
          return;
        }
        if (f2lResult.solution.length > 0) {
          allMoves.push(...f2lResult.solution);
          working = applyMovesToState(working, f2lResult.solution);
          breakdown = mergeBeginnerBreakdown(
            breakdown,
            (f2lResult.breakdown || [])
              .map((item) => item.label === "White Cross" ? { ...item, label: "CFOP Cross" } : item)
              .filter((item) => item.label !== "CFOP Cross" || item.moves > 0)
          );
          for (const item of f2lResult.breakdown || []) {
            const label = item.label === "White Cross" ? "CFOP Cross" : item.label;
            if (label === "CFOP Cross" || String(label || "").startsWith("F2L Pair")) {
              updateSessionStepStat(label, Number(item.moves || 0));
            }
          }
        }

        if (!isCfopOllSolved(working)) {
          const ollResult = findCfopOllSolution(working);
          if (!ollResult) {
            state.beginnerSolving = false;
            statusTextEl.textContent = "CFOP PLL error: could not build OLL.";
            updateUi();
            return;
          }
          if (ollResult.moves.length > 0) {
            allMoves.push(...ollResult.moves);
            working = applyMovesToState(working, ollResult.moves);
            breakdown.push({ label: "CFOP OLL", moves: ollResult.moves.length });
            updateSessionStepStat("CFOP OLL", ollResult.moves.length);
          }
        }

        const result = findCfopPllSolution(working);
        state.beginnerSolving = false;
        if (!result) {
          statusTextEl.textContent = "CFOP PLL error: no matching PLL algorithm found.";
          updateUi();
          return;
        }
        if (result.moves.length > 0) {
          allMoves.push(...result.moves);
          breakdown.push({ label: "CFOP PLL", moves: result.moves.length });
        }
        state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, breakdown);
        if (result.moves.length > 0) {
          updateSessionStepStat("CFOP PLL", result.moves.length);
        }
        state.setupHistory = [];
        state.userHistory = [];
        for (const move of allMoves) {
          performMove(move, false);
        }
        state.solveMethod = "CFOP";
        solveMethodEl.value = state.solveMethod;
        updateUi();
        const builtF2L = breakdown.some((item) => item.label === "CFOP Cross" || String(item.label || "").startsWith("F2L Pair"));
        const usedOll = breakdown.some((item) => item.label === "CFOP OLL");
        statusTextEl.textContent = isSolved(cube)
          ? `CFOP ${usedOll ? "OLL + " : ""}PLL solved the cube${result.caseName ? ` with ${result.caseName}` : ""}.`
          : `CFOP ${builtF2L ? "Cross + F2L + " : ""}${usedOll ? "OLL + " : ""}PLL built${result.caseName ? ` using ${result.caseName}` : ""}.`;
      }

      async function solveBeginnerFullCube() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.solveMethod = "BEGINNER";
        solveMethodEl.value = state.solveMethod;
        state.solveScope = "FULL";
        if (solveScopeEl) {
          solveScopeEl.value = state.solveScope;
        }
        await solveCubeAnimated();
      }

      async function solveCfopFullCube() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.solveMethod = "CFOP";
        solveMethodEl.value = state.solveMethod;
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing CFOP full solve...";
        updateUi();

        const fullMoves = [];
        let working = cloneState(cube);
        let breakdown = state.beginnerBreakdown;

        const crossResult = await requestBeginnerMethodSolution(working, "WHITE_CROSS", () => {});
        if (!crossResult?.solution) {
          state.beginnerSolving = false;
          statusTextEl.textContent = "CFOP full solve error: could not build cross.";
          updateUi();
          return;
        }
        setCurrentCfopCrossSolution(crossResult.solution);
        if (crossResult.solution.length > 0) {
          fullMoves.push(...crossResult.solution);
          working = applyMovesToState(working, crossResult.solution);
          breakdown = mergeBeginnerBreakdown(breakdown, [{ label: "CFOP Cross", moves: crossResult.solution.length }]);
          updateSessionStepStat("CFOP Cross", crossResult.solution.length);
        }

        const f2lResult = await requestBeginnerMethodSolution(working, "CFOP_F2L", () => {});
        if (!f2lResult?.solution) {
          state.beginnerSolving = false;
          statusTextEl.textContent = "CFOP full solve error: could not build F2L.";
          updateUi();
          return;
        }
        if (f2lResult.solution.length > 0) {
          fullMoves.push(...f2lResult.solution);
          working = applyMovesToState(working, f2lResult.solution);
          breakdown = mergeBeginnerBreakdown(
            breakdown,
            (f2lResult.breakdown || [])
              .map((item) => item.label === "White Cross" ? { ...item, label: "CFOP Cross" } : item)
              .filter((item) => item.label !== "CFOP Cross" || item.moves > 0)
          );
          for (const item of f2lResult.breakdown || []) {
            if (item.label && item.label.startsWith("F2L Pair")) {
              updateSessionStepStat(item.label, Number(item.moves || 0));
            }
          }
        }

        const ollResult = findCfopOllSolution(working);
        if (!ollResult) {
          const fallbackLastLayer = await solveBeginnerLastLayerFromState(working, "YELLOW_CROSS");
          if (!fallbackLastLayer.moves) {
            state.beginnerSolving = false;
            statusTextEl.textContent = `CFOP full solve error: ${fallbackLastLayer.error}`;
            updateUi();
            return;
          }
          if (fallbackLastLayer.moves.length > 0) {
            fullMoves.push(...fallbackLastLayer.moves);
            working = fallbackLastLayer.working;
            breakdown = mergeBeginnerBreakdown(breakdown, fallbackLastLayer.breakdown);
          }
          state.beginnerSolving = false;
          if (!fullMoves.length) {
            statusTextEl.textContent = "Cube is already solved.";
            updateUi();
            return;
          }
          state.beginnerBreakdown = breakdown;
          state.setupHistory = [];
          state.userHistory = [];
          for (const move of fullMoves) {
            performMove(move, false);
          }
          updateUi();
          statusTextEl.textContent = "CFOP cross + F2L built. Beginner last layer fallback finished the solve.";
          return;
        }
        if (ollResult.moves.length > 0) {
          fullMoves.push(...ollResult.moves);
          working = applyMovesToState(working, ollResult.moves);
          breakdown = mergeBeginnerBreakdown(breakdown, [{ label: "CFOP OLL", moves: ollResult.moves.length }]);
          updateSessionStepStat("CFOP OLL", ollResult.moves.length);
        }

        const pllResult = findCfopPllSolution(working);
        if (!pllResult) {
          const fallbackLastLayer = await solveBeginnerLastLayerFromState(working, "LAST_LAYER_EDGES");
          if (!fallbackLastLayer.moves) {
            state.beginnerSolving = false;
            statusTextEl.textContent = `CFOP full solve error: ${fallbackLastLayer.error}`;
            updateUi();
            return;
          }
          if (fallbackLastLayer.moves.length > 0) {
            fullMoves.push(...fallbackLastLayer.moves);
            working = fallbackLastLayer.working;
            breakdown = mergeBeginnerBreakdown(breakdown, fallbackLastLayer.breakdown);
          }
          state.beginnerSolving = false;
          if (!fullMoves.length) {
            statusTextEl.textContent = "Cube is already solved.";
            updateUi();
            return;
          }
          state.beginnerBreakdown = breakdown;
          state.setupHistory = [];
          state.userHistory = [];
          for (const move of fullMoves) {
            performMove(move, false);
          }
          updateUi();
          statusTextEl.textContent = "CFOP cross + F2L + OLL built. Beginner PLL fallback finished the solve.";
          return;
        }
        if (pllResult.moves.length > 0) {
          fullMoves.push(...pllResult.moves);
          breakdown = mergeBeginnerBreakdown(breakdown, [{ label: "CFOP PLL", moves: pllResult.moves.length }]);
          updateSessionStepStat("CFOP PLL", pllResult.moves.length);
        }

        state.beginnerSolving = false;
        if (!fullMoves.length) {
          statusTextEl.textContent = "Cube is already solved.";
          updateUi();
          return;
        }
        state.beginnerBreakdown = breakdown;
        state.setupHistory = [];
        state.userHistory = [];
        for (const move of fullMoves) {
          performMove(move, false);
        }
        statusTextEl.textContent = "Playing back the CFOP full solve sequence.";
      }


      async function solveToMiddleLayer() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.beginnerLessonKey = "MIDDLE_LAYER";
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing middle layer...";
        updateUi();
        const beginnerResult = await requestBeginnerMethodSolution(cube, "MIDDLE_LAYER", (message) => {
          if (state.beginnerSolving && message) {
            statusTextEl.textContent = message;
          }
        });
        state.beginnerSolving = false;
        const solution = beginnerResult?.solution || [];
        if (!solution.length) {
          state.beginnerBreakdown = null;
          statusTextEl.textContent = beginnerResult?.error
            ? `Middle layer error: ${beginnerResult.error}`
            : "Could not build through the middle layer.";
          updateUi();
          return;
        }
        state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, beginnerResult?.breakdown || null);

        state.setupHistory = [];
        state.userHistory = [];
        for (const move of solution) {
          performMove(move, false);
        }
        state.solveMethod = "BEGINNER";
        solveMethodEl.value = state.solveMethod;
        state.solveScope = "YELLOW_CROSS";
        state.beginnerLessonKey = "YELLOW_CROSS";
        persistSolveScope();
        updateUi();
        statusTextEl.textContent = "Middle layer built. Scope switched to Yellow Cross.";
      }

      async function solveToWhiteFace() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.beginnerLessonKey = "WHITE_CORNERS";
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing white face...";
        updateUi();
        const beginnerResult = await requestBeginnerMethodSolution(cube, "WHITE_CORNERS", (message) => {
          if (state.beginnerSolving && message) {
            statusTextEl.textContent = message;
          }
        });
        state.beginnerSolving = false;
        const solution = beginnerResult?.solution || [];
        if (!solution.length) {
          state.beginnerBreakdown = null;
          statusTextEl.textContent = beginnerResult?.error
            ? `White face error: ${beginnerResult.error}`
            : "Could not build the white face.";
          updateUi();
          return;
        }
        state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, beginnerResult?.breakdown || null);

        state.setupHistory = [];
        state.userHistory = [];
        for (const move of solution) {
          performMove(move, false);
        }
        state.solveMethod = "BEGINNER";
        solveMethodEl.value = state.solveMethod;
        state.solveScope = "MIDDLE_LAYER";
        state.beginnerLessonKey = "MIDDLE_LAYER";
        persistSolveScope();
        updateUi();
        statusTextEl.textContent = "White face built. Scope switched to Middle Edges.";
      }

      async function solveToYellowCross() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.beginnerLessonKey = "YELLOW_CROSS";
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing yellow cross...";
        updateUi();
        const beginnerResult = await requestBeginnerMethodSolution(cube, "YELLOW_CROSS", (message) => {
          if (state.beginnerSolving && message) {
            statusTextEl.textContent = message;
          }
        });
        state.beginnerSolving = false;
        const solution = beginnerResult?.solution || [];
        if (!solution.length) {
          state.beginnerBreakdown = null;
          statusTextEl.textContent = beginnerResult?.error
            ? `Yellow cross error: ${beginnerResult.error}`
            : "Could not build the yellow cross.";
          updateUi();
          return;
        }
        state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, beginnerResult?.breakdown || null);

        state.setupHistory = [];
        state.userHistory = [];
        for (const move of solution) {
          performMove(move, false);
        }
        state.solveMethod = "BEGINNER";
        solveMethodEl.value = state.solveMethod;
        state.solveScope = "LAST_LAYER_EDGES";
        state.beginnerLessonKey = "LAST_LAYER_EDGES";
        persistSolveScope();
        updateUi();
        statusTextEl.textContent = "Yellow cross built. Scope switched to Last Layer Edges.";
      }

      async function solveToLastLayerEdges() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.beginnerLessonKey = "LAST_LAYER_EDGES";
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing last layer edges...";
        updateUi();
        const beginnerResult = await requestBeginnerMethodSolution(cube, "LAST_LAYER_EDGES", (message) => {
          if (state.beginnerSolving && message) {
            statusTextEl.textContent = message;
          }
        });
        state.beginnerSolving = false;
        const solution = beginnerResult?.solution || [];
        if (!solution.length) {
          state.beginnerBreakdown = null;
          statusTextEl.textContent = beginnerResult?.error
            ? `Last layer edges error: ${beginnerResult.error}`
            : "Could not solve the last layer edges.";
          updateUi();
          return;
        }
        state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, beginnerResult?.breakdown || null);
        state.setupHistory = [];
        state.userHistory = [];
        for (const move of solution) {
          performMove(move, false);
        }
        state.solveMethod = "BEGINNER";
        solveMethodEl.value = state.solveMethod;
        state.solveScope = "LAST_LAYER_CORNERS_PERMUTATION";
        state.beginnerLessonKey = "LAST_LAYER_CORNERS_PERMUTATION";
        persistSolveScope();
        updateUi();
        statusTextEl.textContent = "Last layer edges solved. Scope switched to Corner Permutation.";
      }

      async function solveToCornerOrientation() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.beginnerLessonKey = "LAST_LAYER_CORNERS_ORIENTATION";
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing corner orientation...";
        updateUi();
        const beginnerResult = await requestBeginnerMethodSolution(cube, "LAST_LAYER_CORNERS_ORIENTATION", (message) => {
          if (state.beginnerSolving && message) {
            statusTextEl.textContent = message;
          }
        });
        state.beginnerSolving = false;
        const solution = beginnerResult?.solution || [];
        if (!solution.length) {
          state.beginnerBreakdown = null;
          statusTextEl.textContent = beginnerResult?.error
            ? `Corner orientation error: ${beginnerResult.error}`
            : "Could not orient the last layer corners.";
          updateUi();
          return;
        }
        state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, beginnerResult?.breakdown || null);
        state.setupHistory = [];
        state.userHistory = [];
        for (const move of solution) {
          performMove(move, false);
        }
        state.solveMethod = "BEGINNER";
        solveMethodEl.value = state.solveMethod;
        state.solveScope = "FULL";
        state.beginnerLessonKey = "FULL";
        persistSolveScope();
        updateUi();
        statusTextEl.textContent = "Corner orientation finished. Scope switched to Full Cube.";
      }

      async function solveToCornerPermutation() {
        if (animationState.active || state.solved || state.beginnerSolving) return;
        state.beginnerLessonKey = "LAST_LAYER_CORNERS_PERMUTATION";
        state.beginnerSolving = true;
        statusTextEl.textContent = "Computing corner permutation...";
        updateUi();
        const beginnerResult = await requestBeginnerMethodSolution(cube, "LAST_LAYER_CORNERS_PERMUTATION", (message) => {
          if (state.beginnerSolving && message) {
            statusTextEl.textContent = message;
          }
        });
        state.beginnerSolving = false;
        const solution = beginnerResult?.solution || [];
        if (!solution.length) {
          state.beginnerBreakdown = null;
          statusTextEl.textContent = beginnerResult?.error
            ? `Corner permutation error: ${beginnerResult.error}`
            : "Could not permute the last layer corners.";
          updateUi();
          return;
        }
        state.beginnerBreakdown = mergeBeginnerBreakdown(state.beginnerBreakdown, beginnerResult?.breakdown || null);
        state.setupHistory = [];
        state.userHistory = [];
        for (const move of solution) {
          performMove(move, false);
        }
        state.solveMethod = "BEGINNER";
        solveMethodEl.value = state.solveMethod;
        state.solveScope = "LAST_LAYER_CORNERS_ORIENTATION";
        state.beginnerLessonKey = "LAST_LAYER_CORNERS_ORIENTATION";
        persistSolveScope();
        updateUi();
        statusTextEl.textContent = "Corner permutation finished. Scope switched to Corner Orientation.";
      }

      async function solveBeginnerLastLayerFromState(currentState, startScope) {
        const stageOrder = [
          "YELLOW_CROSS",
          "LAST_LAYER_EDGES",
          "LAST_LAYER_CORNERS_PERMUTATION",
          "LAST_LAYER_CORNERS_ORIENTATION"
        ];
        const startIndex = Math.max(0, stageOrder.indexOf(startScope));
        let working = cloneState(currentState);
        const moves = [];
        let breakdown = [];

        for (let i = startIndex; i < stageOrder.length; i++) {
          const scope = stageOrder[i];
          const result = await requestBeginnerMethodSolution(working, scope, () => {});
          if (!result?.solution) {
            return {
              moves: null,
              breakdown,
              error: result?.error || `Could not complete ${scope}.`
            };
          }
          if (result.solution.length > 0) {
            moves.push(...result.solution);
            working = applyMovesToState(working, result.solution);
          }
          breakdown = mergeBeginnerBreakdown(breakdown, result.breakdown || null);
        }

        return { moves, breakdown, working, error: "" };
      }

      function requestBeginnerMethodSolution(currentState, scope, onProgress) {
        const cacheKey = `${scope}|${serializeState(currentState)}`;
        const cached = solverCache.beginner.get(cacheKey);
        if (cached) {
          return Promise.resolve({
            solution: cached.solution.slice(),
            breakdown: cached.breakdown ? cached.breakdown.map((item) => ({ ...item })) : null,
            error: cached.error || ""
          });
        }
        return new Promise((resolve) => {
          const id = ++beginnerSolverRequestId;
          beginnerSolverPending.set(id, {
            resolve: (result) => {
              solverCache.beginner.set(cacheKey, {
                solution: Array.isArray(result?.solution) ? result.solution.slice() : null,
                breakdown: Array.isArray(result?.breakdown) ? result.breakdown.map((item) => ({ ...item })) : null,
                error: result?.error || ""
              });
              resolve(result);
            },
            onProgress
          });
          beginnerSolverWorker.postMessage({ id, cube: cloneState(currentState), scope });
        });
      }

      function formatBeginnerBreakdown(breakdown) {
        if (!breakdown || breakdown.length === 0) {
          return "No beginner solve breakdown yet.";
        }
        const totalMoves = breakdown.reduce((sum, item) => sum + (item.moves || 0), 0);
        const rows = breakdown
          .map((item) => `${item.label}: ${item.moves} move${item.moves === 1 ? "" : "s"}`)
          .join("<br>");
        return `<strong>Total: ${totalMoves} move${totalMoves === 1 ? "" : "s"}</strong><br>${rows}`;
      }

      function inferBeginnerLessonKey() {
        if (state.solveScope === "WHITE_CROSS") return "WHITE_CROSS";
        if (state.solveScope === "WHITE_CORNERS") return "WHITE_CORNERS";
        if (state.solveScope === "MIDDLE_LAYER") return "MIDDLE_LAYER";
        if (state.solveScope === "YELLOW_CROSS") return "YELLOW_CROSS";
        if (state.solveScope === "LAST_LAYER_EDGES") return "LAST_LAYER_EDGES";
        if (state.solveScope === "LAST_LAYER_CORNERS_PERMUTATION") return "LAST_LAYER_CORNERS_PERMUTATION";
        if (state.solveScope === "LAST_LAYER_CORNERS_ORIENTATION") return "LAST_LAYER_CORNERS_ORIENTATION";
        return "FULL";
      }

      function getBeginnerLesson(stepKey) {
        const lessons = {
          WHITE_CROSS: {
            title: "1. White Cross",
            goal: "Build a white cross on the bottom and make sure each side color matches its center.",
            lookFor: "Find the four white edge pieces. A cross edge is only correct when the white sticker is on bottom and the other color lines up with the matching center.",
            method: "Bring a white edge into the top layer, line up its side color with the matching center, then insert it down into the cross without breaking pieces you already solved.",
            algorithm: "No single fixed algorithm. This step is recognition plus piece-by-piece insertion.",
            next: "When the white cross is finished, insert the white corners to complete the first layer."
          },
          WHITE_CORNERS: {
            title: "2. White Face",
            goal: "Insert all four white corners so the full white face and the entire first layer are solved.",
            lookFor: "Match the corner’s two side colors to the two centers around its destination slot. White can face up, right, or front when the corner is on top.",
            method: "Put the corner above its target slot. If white faces right, use the right trigger. If white faces front, use the front trigger. If white faces up, repeat the insertion until it twists correctly.",
            algorithm: "Core beginner triggers: `R U R'` and `F' U' F`.",
            next: "After the white face is solved, insert the non-yellow edges into the middle layer."
          },
          MIDDLE_LAYER: {
            title: "3. Middle Layer",
            goal: "Solve the four middle-layer edges without breaking the solved first layer.",
            lookFor: "Use only edges that do not contain yellow. Match the top edge’s front color with the front center, then determine whether it belongs on the left or right.",
            method: "For a right insert, move the target edge above its slot and use the right algorithm. For a left insert, mirror the process. If a wrong edge is trapped in the middle layer, eject it first and then solve it normally.",
            algorithm: "Right insert: `U R U' R' U' F' U F`.\nLeft insert: `U' L' U L U F U' F'`.",
            next: "Once the first two layers are solved, begin orienting the last layer with the yellow cross."
          },
          YELLOW_CROSS: {
            title: "4. Yellow Cross",
            goal: "Orient the last-layer edges so all four yellow edge stickers face upward.",
            lookFor: "Recognize whether the top shows a dot, an L, or a line. Hold the cube so the shape is in the standard beginner orientation before doing the algorithm.",
            method: "Apply the yellow-cross algorithm until the top edges all show yellow. Use it once for some cases and more than once for harder patterns.",
            algorithm: "`F R U R' U' F'`.",
            next: "When the yellow cross is oriented, move those top edges into their correct positions."
          },
          LAST_LAYER_EDGES: {
            title: "5. Last Layer Edges",
            goal: "Move the yellow cross edges into the correct spots relative to the side centers.",
            lookFor: "Ignore corners. Check whether the four top edges match the side-center colors. You may need one or two applications of the edge-positioning algorithm.",
            method: "Choose the best U-face alignment, perform the edge-positioning algorithm, then realign and repeat if necessary until all four top edges match their centers.",
            algorithm: "`U R U R' U R U2 R'`.",
            next: "After the top edges are positioned, place the last-layer corners into their correct locations."
          },
          LAST_LAYER_CORNERS_PERMUTATION: {
            title: "6. Corner Permutation",
            goal: "Put the four last-layer corners into the correct locations, even if they are twisted wrong.",
            lookFor: "A corner is correctly positioned if its three colors belong in that slot, regardless of orientation. Find one good corner and use it as your anchor.",
            method: "Keep a correctly positioned corner in the reference spot and repeat the corner-permutation algorithm until all four corners belong in the right places.",
            algorithm: "`U R U' L' U R' U' L`.",
            next: "Once the corners are in the right locations, twist them one by one to finish the cube."
          },
          LAST_LAYER_CORNERS_ORIENTATION: {
            title: "7. Corner Orientation",
            goal: "Twist each last-layer corner so yellow faces up and the cube is solved.",
            lookFor: "Work on one corner at a time. Keep the target corner in the working position and repeat the twisting algorithm until yellow faces up, then turn U to the next unsolved corner.",
            method: "Do not stop when the cube looks scrambled during the algorithm. Keep repeating on the same corner until it is solved, then move to the next corner.",
            algorithm: "`R' D' R D` repeated on the current corner, then `U` to the next corner.",
            next: "When the final corner is twisted, the beginner solve is complete."
          },
          FULL: {
            title: "Beginner Full Solve",
            goal: "Learn the full beginner method in order: first layer, middle layer, then last layer.",
            lookFor: "Each stage depends on the previous one. The idea is to stabilize the cube layer by layer instead of solving everything at once.",
            method: "Use the step buttons in order if you want to practice slowly, or press Full Solve and read the lesson panel as the app demonstrates each stage.",
            algorithm: "This is a full workflow, not a single algorithm.",
            next: "Practice one stage at a time until you can recognize each case without the teacher panel."
          }
        };
        return lessons[stepKey] || lessons.FULL;
      }

      function formatBeginnerLesson(stepKey) {
        const lesson = getBeginnerLesson(stepKey);
        return [
          `<strong>${lesson.title}</strong>`,
          `<strong>Goal:</strong> ${lesson.goal}`,
          `<strong>Look For:</strong> ${lesson.lookFor}`,
          `<strong>Method:</strong> ${lesson.method.replace(/\n/g, "<br>")}`,
          `<strong>Algorithm:</strong> ${lesson.algorithm.replace(/\n/g, "<br>")}`,
          `<strong>Next:</strong> ${lesson.next}`
        ].join("<br><br>");
      }

      function mergeBeginnerBreakdown(existing, incoming) {
        if (!incoming || incoming.length === 0) {
          return existing || null;
        }
        const merged = new Map();
        for (const item of existing || []) {
          merged.set(item.label, { ...item });
        }
        for (const item of incoming) {
          if (merged.has(item.label)) {
            merged.set(item.label, { ...item, moves: item.moves > 0 ? item.moves : merged.get(item.label).moves });
          } else {
            merged.set(item.label, { ...item });
          }
        }
        return Array.from(merged.values());
      }

      function isWhiteCrossSolvedState(currentState) {
        return arePositionsSolved(currentState, [
          [0, -1, 1],
          [1, -1, 0],
          [0, -1, -1],
          [-1, -1, 0]
        ]);
      }

      function isOllSolvedState(currentState) {
        return currentState.U.every((sticker) => sticker === "U");
      }

      function isCfopOllSolved(currentState) {
        return currentState.U.every((value) => value === "U");
      }

      function findCfopOllSolution(currentState) {
        const cacheKey = serializeState(currentState);
        const cached = solverCache.cfopOll.get(cacheKey);
        if (cached) {
          return {
            moves: cached.moves.slice(),
            caseName: cached.caseName
          };
        }
        if (isCfopOllSolved(currentState)) {
          return { moves: [], caseName: "OLL solved" };
        }
        const aufs = [[], ["U"], ["U'"], ["U2"]];
        const rotations = [[], ["y"], ["y'"], ["y2"]];
        let best = null;
        for (const rotation of rotations) {
          const undoRotation = rotation.slice().reverse().map(invertMove);
          for (const auf of aufs) {
            for (const item of OLL_CASES) {
              const candidate = rotation.concat(auf, parseAlgorithm(item.algorithm), undoRotation);
              const next = applyMovesToState(currentState, candidate);
              if (!isCfopOllSolved(next)) continue;
              if (!areFirstTwoLayersSolved(next)) continue;
              if (!best || candidate.length < best.moves.length) {
                best = { moves: candidate, caseName: item.name };
              }
            }
          }
        }
        if (best) {
          solverCache.cfopOll.set(cacheKey, { moves: best.moves.slice(), caseName: best.caseName });
        }
        return best;
      }

      function findCfopPllSolution(currentState) {
        const cacheKey = serializeState(currentState);
        const cached = solverCache.cfopPll.get(cacheKey);
        if (cached) {
          return {
            moves: cached.moves.slice(),
            caseName: cached.caseName
          };
        }
        if (isSolved(currentState)) {
          return { moves: [], caseName: "PLL solved" };
        }
        const aufs = [[], ["U"], ["U'"], ["U2"]];
        const rotations = [[], ["y"], ["y'"], ["y2"]];
        const endRotations = [[], ["y"], ["y'"], ["y2"]];
        let best = null;
        for (const rotation of rotations) {
          for (const preAuf of aufs) {
            for (const item of PLL_CASES) {
              const algorithm = parseAlgorithm(item.algorithm);
              for (const postAuf of aufs) {
                for (const endRotation of endRotations) {
                  const candidate = rotation.concat(preAuf, algorithm, postAuf, endRotation);
                  const next = applyMovesToState(currentState, candidate);
                  if (!isSolved(next)) continue;
                  if (!best || candidate.length < best.moves.length) {
                    best = { moves: candidate, caseName: item.name };
                  }
                }
              }
            }
          }
        }
        if (best) {
          solverCache.cfopPll.set(cacheKey, { moves: best.moves.slice(), caseName: best.caseName });
        }
        return best;
      }

      function updateQuizMode() {
        state.quizMode = quizModeEl.value === "ON" ? "ON" : "OFF";
        resetQuizFeedback();
        updateUi();
      }

      function clearQuizAnswer() {
        quizAnswerEl.value = "";
        resetQuizFeedback();
      }

      function checkQuizAnswer() {
        if (state.mode === "FREE" || state.quizMode !== "ON" || !state.currentCase) return;
        const answer = normalizeAlgorithmString(quizAnswerEl.value);
        const expected = normalizeAlgorithmString(state.currentCase.algorithm || "");
        if (!answer) {
          quizFeedbackEl.textContent = "Enter an algorithm first.";
          return;
        }
        const equivalent = doesQuizAlgorithmSolveCurrentCase(answer);
        const isCorrect = answer === expected || equivalent;
        state.sessionStats.quizAttempts += 1;
        if (isCorrect) {
          state.sessionStats.quizCorrect += 1;
        }
        updateSessionStatsUi();
        quizFeedbackEl.textContent = isCorrect
          ? (answer === expected ? "Correct." : "Correct. Equivalent algorithm accepted.")
          : `Not quite. Expected: ${state.currentCase.algorithm}`;
      }

      function normalizeAlgorithmString(algorithm) {
        return parseAlgorithm(String(algorithm || "")).join(" ");
      }

      function doesQuizAlgorithmSolveCurrentCase(normalizedAlgorithm) {
        const moves = parseAlgorithm(normalizedAlgorithm);
        if (!moves.length) return false;
        const aufs = [[], ["U"], ["U'"], ["U2"]];
        if (state.mode === "OLL") {
          return aufs.some((pre) => aufs.some((post) => {
            const next = applyMovesToState(applyMovesToState(applyMovesToState(cloneState(cube), pre), moves), post);
            return isCfopOllSolved(next);
          }));
        }
        if (state.mode === "PLL") {
          return aufs.some((pre) => aufs.some((post) => {
            const next = applyMovesToState(applyMovesToState(applyMovesToState(cloneState(cube), pre), moves), post);
            return isSolved(next);
          }));
        }
        return false;
      }

      function undoLastMove() {
        if (animationState.active || state.userHistory.length === 0) return;
        const move = state.userHistory.pop();
        state.moveCount = Math.max(0, state.moveCount - 1);
        performMove(invertMove(move), false);
        updateUi();
      }

      function computeBeginnerMethodSolution(startState) {
        const searchContext = {
          nodes: 0,
          startedAt: performance.now(),
          maxNodes: BEGINNER_SEARCH_LIMITS.maxNodes,
          maxMs: BEGINNER_SEARCH_LIMITS.maxMs,
          aborted: false
        };
        const crossLineAlg = parseAlgorithm("F R U R' U' F'");
        const crossLAlg = parseAlgorithm("F U R U' R' F'");
        const edgePermAlg = parseAlgorithm("U R U R' U R U2 R'");
        const cornerPermAlg = parseAlgorithm("U R U' L' U R' U' L");
        const cornerTwistAlg = parseAlgorithm("R' D' R D");
        const whiteCrossTargets = [
          [0, -1, 1],
          [1, -1, 0],
          [0, -1, -1],
          [-1, -1, 0]
        ];
        const whiteCornerTargets = [
          [1, -1, 1],
          [1, -1, -1],
          [-1, -1, -1],
          [-1, -1, 1]
        ];
        const middleEdgeTargets = [
          [0, 0, 1],
          [1, 0, 0],
          [0, 0, -1],
          [-1, 0, 0]
        ];

        let working = cloneState(startState);
        const solution = [];

        const crossSolve = solveStageTargetsOneByOne(working, whiteCrossTargets, 7, searchContext);
        if (crossSolve === null) return null;
        working = applyMovesToState(working, crossSolve);
        solution.push(...crossSolve);

        const cornerSolve = solveStageTargetsOneByOne(working, whiteCornerTargets, 9, searchContext);
        if (cornerSolve === null) return null;
        working = applyMovesToState(working, cornerSolve);
        solution.push(...cornerSolve);

        const middleSolve = solveStageTargetsOneByOne(working, middleEdgeTargets, 10, searchContext);
        if (middleSolve === null) return null;
        working = applyMovesToState(working, middleSolve);
        solution.push(...middleSolve);

        const crossMoves = findMacroSequence(
          working,
          isYellowCrossSolved,
          () => buildAufAlgorithmOptions([crossLineAlg, crossLAlg]),
          3
        );
        if (crossMoves === null) return null;
        working = applyMovesToState(working, crossMoves);
        solution.push(...crossMoves);

        const edgeMoves = findMacroSequence(
          working,
          areTopEdgesSolved,
          () => buildAufAlgorithmOptions([edgePermAlg]),
          3
        );
        if (edgeMoves === null) return null;
        working = applyMovesToState(working, edgeMoves);
        solution.push(...edgeMoves);

        const cornerPermMoves = findMacroSequence(
          working,
          areTopCornersPositioned,
          () => buildAufAlgorithmOptions([cornerPermAlg]),
          3
        );
        if (cornerPermMoves === null) return null;
        working = applyMovesToState(working, cornerPermMoves);
        solution.push(...cornerPermMoves);

        const cornerOrientMoves = orientTopCornersBeginner(working, cornerTwistAlg);
        if (cornerOrientMoves === null) return null;
        working = applyMovesToState(working, cornerOrientMoves);
        solution.push(...cornerOrientMoves);

        if (!isSolved(working)) return null;
        return solution;
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

          const targetMoves = findMovesForTargetWithPreservation(
            working,
            target,
            solvedTargets,
            maxDepthPerTarget,
            searchContext
          );
          if (targetMoves === null) {
            return null;
          }
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
          const result = depthLimitedTargetSearch(
            startState,
            target,
            preservedTargets,
            depth,
            [],
            "",
            "",
            visited,
            searchContext
          );
          if (result) return result;
          if (searchContext.aborted) return null;
        }

        return null;
      }

      function depthLimitedTargetSearch(currentState, target, preservedTargets, depthRemaining, path, lastFace, lastAxis, visited, searchContext) {
        if (isPieceSolvedAt(currentState, target) && arePositionsSolved(currentState, preservedTargets)) {
          return path.slice();
        }
        if (depthRemaining === 0) {
          return null;
        }
        if (shouldAbortBeginnerSearch(searchContext)) {
          return null;
        }

        const stateKey = `${getBeginnerSearchKey(currentState, target, preservedTargets)}|${depthRemaining}`;
        if (visited.has(stateKey)) {
          return null;
        }
        visited.set(stateKey, true);

        for (const move of SEARCH_MOVES) {
          const face = move[0];
          const axis = MOVE_AXIS[face];
          if (face === lastFace) continue;
          if (lastAxis && axis === lastAxis && FACE_SEARCH_ORDER[face] < FACE_SEARCH_ORDER[lastFace]) continue;

          const nextState = applyMoveToState(currentState, move);
          path.push(move);
          const result = depthLimitedTargetSearch(
            nextState,
            target,
            preservedTargets,
            depthRemaining - 1,
            path,
            face,
            axis,
            visited,
            searchContext
          );
          path.pop();
          if (result) return result;
          if (searchContext.aborted) return null;
        }

        return null;
      }

      function shouldAbortBeginnerSearch(searchContext) {
        if (!searchContext) return false;
        searchContext.nodes += 1;
        if (searchContext.nodes > searchContext.maxNodes) {
          searchContext.aborted = true;
          return true;
        }
        if (searchContext.nodes % 128 === 0 && performance.now() - searchContext.startedAt > searchContext.maxMs) {
          searchContext.aborted = true;
          return true;
        }
        return false;
      }

      function arePositionsSolved(currentState, targets) {
        return targets.every((coords) => isPieceSolvedAt(currentState, coords));
      }

      function getBeginnerSearchKey(currentState, target, preservedTargets) {
        const allTargets = [target, ...preservedTargets];
        return allTargets
          .map((coords) => {
            const identity = getSolvedPieceIdentity(coords);
            const located = findPieceByIdentity(currentState, identity);
            const orientation = located ? serializeStickerMap(getStickerMapAtState(currentState, located)) : "missing";
            return `${coords.join(",")}=${located ? located.join(",") : "?"}:${orientation}`;
          })
          .join("|");
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
          if (stickerIdentity === identity) {
            return coords;
          }
        }
        return null;
      }

      function serializeStickerMap(stickers) {
        return Object.entries(stickers)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([face, sticker]) => `${face}${sticker}`)
          .join("");
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
            if (goalFn(nextState)) {
              return nextPath;
            }
            const key = serializeState(nextState);
            const nextDepth = current.depth + 1;
            if (visited.has(key) && visited.get(key) <= nextDepth) continue;
            visited.set(key, nextDepth);
            queue.push({ state: nextState, moves: nextPath, depth: nextDepth, lastOption: optionIndex });
          }
        }

        return null;
      }

      function orientTopCornersBeginner(startState, cornerTwistAlg) {
        let working = cloneState(startState);
        const moves = [];
        let guard = 0;

        while (!isSolved(working) && guard < 20) {
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

        const finalAuf = findSolvedAuf(working);
        if (finalAuf === null) {
          return isSolved(working) ? moves : null;
        }
        return moves.concat(finalAuf);
      }

      function findAufThatMovesUnorientedCornerToFru(currentState) {
        const aufs = [[], ["U"], ["U'"], ["U2"]];
        for (const moves of aufs) {
          const next = applyMovesToState(currentState, moves);
          if (getStickerMapAtState(next, [1, 1, 1]).U !== "U") {
            return moves;
          }
        }
        return null;
      }

      function findSolvedAuf(currentState) {
        const aufs = [[], ["U"], ["U'"], ["U2"]];
        for (const moves of aufs) {
          if (isSolved(applyMovesToState(currentState, moves))) {
            return moves;
          }
        }
        return null;
      }

      function areFirstTwoLayersSolved(currentState) {
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 0; y++) {
            for (let z = -1; z <= 1; z++) {
              if (x === 0 && y === 0 && z === 0) continue;
              if (!isPieceSolvedAt(currentState, [x, y, z])) return false;
            }
          }
        }
        return true;
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

      function isPieceSolvedAt(currentState, coords) {
        const stickers = getStickerMapAtState(currentState, coords);
        return Object.entries(stickers).every(([face, sticker]) => sticker === face);
      }

      function isCorrectPieceAt(currentState, coords) {
        const stickers = Object.values(getStickerMapAtState(currentState, coords)).slice().sort().join("");
        const faces = Object.keys(getStickerMapAtState(currentState, coords)).slice().sort().join("");
        return stickers === faces;
      }

      function getStickerMapAtState(currentState, coords) {
        const faces = cubieFaceMap.get(coords.join(","));
        const stickers = {};
        for (const [faceName, facelet] of Object.entries(faces)) {
          stickers[faceName] = currentState[facelet.face][facelet.index];
        }
        return stickers;
      }

      function applyMovesToState(currentState, moves) {
        let next = cloneState(currentState);
        for (const move of moves) {
          next = applyMoveToState(next, move);
        }
        return next;
      }

      function applyMoveToState(currentState, move) {
        let next = cloneState(currentState);
        const job = createMoveJob(move, move);
        for (let step = 0; step < job.quarterTurns; step++) {
          for (const layer of job.layers) {
            next = rotateLayerOnState(next, layer.axis, layer.layer, layer.rotation);
          }
        }
        return next;
      }

      function rotateLayerOnState(currentState, axis, layer, rotation) {
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

      function serializeState(currentState) {
        return FACE_ORDER.map((face) => currentState[face].join("")).join("|");
      }

      function clearMoveAnimations() {
        if (scrambleReplayTimeout) {
          window.clearTimeout(scrambleReplayTimeout);
          scrambleReplayTimeout = 0;
        }
        animationState.queue.length = 0;

        if (animationState.active) {
          for (const cubie of animationState.active.affected) {
            cubeGroup.attach(cubie.mesh);
          }
          cubeGroup.remove(animationState.active.pivot);
          animationState.active = null;
        }

        resetCubieTransforms();
      }

      function resetCubieTransforms() {
        for (const cubie of cubies) {
          cubie.mesh.position.copy(cubie.basePosition);
          cubie.mesh.rotation.set(0, 0, 0);
        }
      }

      function snapCameraToNearestDiscreteOrientation(animate = false) {
        const orientation = getNearestSnappedOrbit();
        if (animate) {
          animateCameraToOrientation(orientation.yaw, orientation.pitch);
        } else {
          stopCameraAnimation();
          orbit.yaw = orientation.yaw;
          orbit.pitch = orientation.pitch;
          updateCamera();
        }
        return orientation;
      }

      function getNearestDiscreteCameraOrientation() {
        const snapped = getNearestSnappedOrbit();
        const orientation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(snapped.pitch, snapped.yaw, 0, "YXZ")
        );
        const cameraPosition = new THREE.Vector3(0, 0, orbit.radius).applyQuaternion(orientation);
        const frontVector = new THREE.Vector3(0, 0, 1).applyQuaternion(orientation);
        const rightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(orientation);
        const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);
        const visibleFaces = FACE_ORDER.filter((face) => scoreFace(face, cameraPosition) > 0);
        const upFace = pickBestFace(visibleFaces, upVector);
        const rightFace = pickBestFace(visibleFaces, rightVector, [upFace]);
        const frontFace = pickBestFace(visibleFaces, frontVector, [upFace, rightFace]);

        return {
          yaw: snapped.yaw,
          pitch: snapped.pitch,
          frontFace,
          rightFace,
          upFace,
          frontVector,
          rightVector,
          upVector
        };
      }

      function resolveUserMove(move) {
        const suffix = move.slice(1);
        const orientation = getNearestDiscreteCameraOrientation();
        const quarterTurns = getQuarterTurns(move);

        if (move[0] === "M") {
          const rightMove = createMoveJob("R", `${orientation.rightFace}`);
          const sign = suffix === "'" ? -1 : 1;
          const baseRotation = -rightMove.layers[0].rotation;
          return {
            displayMove: move,
            move,
            layers: [{ axis: rightMove.layers[0].axis, layer: 0, rotation: baseRotation * sign }],
            quarterTurns
          };
        }

        const mappedFace = getViewFaceMapping(orientation)[move[0]];
        if (!mappedFace) return null;
        return createMoveJob(move, `${mappedFace}${suffix}`);
      }

      function getViewFaceMapping(orientation = getNearestDiscreteCameraOrientation()) {
        return {
          F: orientation.frontFace,
          B: OPPOSITE_FACE[orientation.frontFace],
          R: orientation.rightFace,
          L: OPPOSITE_FACE[orientation.rightFace],
          U: orientation.upFace,
          D: OPPOSITE_FACE[orientation.upFace]
        };
      }

      function isMoveSupported(move) {
        const base = move[0];
        return ["U", "D", "R", "L", "F", "B", "M", "x", "y", "r", "l"].includes(base);
      }

      function applyAlgorithm(algorithm, fromUser) {
        const tokens = parseAlgorithm(algorithm);
        for (const token of tokens) {
          if (fromUser) {
            performMove(token, true);
          } else {
            applyMoveImmediate(token);
          }
        }
        if (!fromUser) syncCubeMaterials();
      }

      function parseAlgorithm(algorithm) {
        return algorithm
          .trim()
          .split(/\s+/)
          .map((token) => token.replace(/[()]/g, "").replace(/1/g, "").replace(/3/g, "'"))
          .map((token) => token.replace(/2'$/g, "2"))
          .filter(Boolean);
      }

      function generateScramble(length) {
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

      function invertAlgorithm(algorithm) {
        const tokens = parseAlgorithm(algorithm).reverse();
        return tokens.map(invertMove).join(" ");
      }

      function invertMove(move) {
        if (move.endsWith("2")) return move;
        return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
      }

      function applyMoveImmediate(move) {
        applyJobImmediate(createMoveJob(move, move));
      }

      function applyJobImmediate(job) {
        const layers = job.layers;
        const quarterTurns = job.quarterTurns;
        for (let step = 0; step < quarterTurns; step++) {
          for (const layer of layers) {
            rotateLayer(layer.axis, layer.layer, layer.rotation);
          }
        }
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

      function rotateLayer(axis, layer, rotation) {
        const next = createSolvedState();
        for (const face of FACE_ORDER) {
          next[face] = cube[face].slice();
        }

        for (const face of FACE_ORDER) {
          for (let index = 0; index < 9; index++) {
            const key = `${face}:${index}`;
            const entry = faceletMap.get(key);
            if (entry.position[axisIndex(axis)] !== layer) continue;

            const rotatedPosition = rotateVector(entry.position, axis, rotation);
            const rotatedNormal = rotateVector(entry.normal, axis, rotation);
            const target = reverseFaceletMap.get(reverseKey(rotatedPosition, rotatedNormal));
            next[target.face][target.index] = cube[face][index];
          }
        }

        cube = next;
      }

      function axisIndex(axis) {
        return axis === "x" ? 0 : axis === "y" ? 1 : 2;
      }

      function rotateVector(vector, axis, rotation) {
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

      function isSolved(current) {
        return FACE_ORDER.every((face) => current[face].every((value) => value === current[face][0]));
      }

      function drawCubeNet() {
        const ctx = cubeNetCtx;
        const tile = 14;
        const gap = 1;
        const radius = 3;
        const faceSpan = tile * 3 + gap * 2;
        const netWidth = faceSpan * 4;
        const netHeight = faceSpan * 3;
        const offsetX = Math.floor((cubeNetEl.width - netWidth) / 2);
        const offsetY = Math.floor((cubeNetEl.height - netHeight) / 2);

        ctx.clearRect(0, 0, cubeNetEl.width, cubeNetEl.height);
        ctx.fillStyle = "rgba(10, 10, 15, 0.18)";
        ctx.fillRect(0, 0, cubeNetEl.width, cubeNetEl.height);

        const layout = {
          U: [1, 0],
          L: [0, 1],
          F: [1, 1],
          R: [2, 1],
          B: [3, 1],
          D: [1, 2]
        };

        for (const face of FACE_ORDER) {
          const [gridX, gridY] = layout[face];
          const startX = offsetX + gridX * faceSpan;
          const startY = offsetY + gridY * faceSpan;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          ctx.lineWidth = 1;
          ctx.strokeRect(startX - 2, startY - 2, faceSpan + 3, faceSpan + 3);

          for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
              const index = row * 3 + col;
              ctx.fillStyle = FACE_COLORS[cube[face][index]];
              const x = startX + col * (tile + gap);
              const y = startY + row * (tile + gap);
              ctx.beginPath();
              ctx.roundRect(x, y, tile, tile, radius);
              ctx.fill();
              ctx.strokeStyle = "rgba(17, 17, 17, 0.75)";
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }

      function syncCubeMaterials() {
        for (const cubie of cubies) {
          const faces = cubieFaceMap.get(cubie.key);
          MATERIAL_INDEX_TO_FACE.forEach((faceName, materialIndex) => {
            const material = cubie.mesh.material[materialIndex];
            const facelet = faces[faceName];
            if (!facelet) {
              material.color.set(HIDDEN_COLOR);
            } else {
              const sticker = cube[facelet.face][facelet.index];
              material.color.set(FACE_COLORS[sticker] || HIDDEN_COLOR);
            }
          });
        }
        drawCubeNet();
      }
      updateUi();
    })();

