// @ts-nocheck
export const STORAGE_KEYS = {
  filters: "rubiks-trainer-filters-v1",
  stats: "rubiks-trainer-stats-v1",
  speed: "rubiks-trainer-speed-v1",
  solveMethod: "rubiks-trainer-solve-method-v1",
  solveScope: "rubiks-trainer-solve-scope-v1",
  practiceScramble: "rubiks-trainer-practice-scramble-v1"
};

export const VALID_SOLVE_SCOPES = [
  "WHITE_CROSS",
  "WHITE_CORNERS",
  "MIDDLE_LAYER",
  "YELLOW_CROSS",
  "LAST_LAYER_EDGES",
  "LAST_LAYER_CORNERS_ORIENTATION",
  "LAST_LAYER_CORNERS_PERMUTATION"
];

export function loadSelectedCases(ollCases, pllCases) {
  const fallback = {
    OLL: ollCases.map((item) => item.name),
    PLL: pllCases.map((item) => item.name)
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

export function saveSelectedCases(selectedCases) {
  try {
    localStorage.setItem(STORAGE_KEYS.filters, JSON.stringify(selectedCases));
  } catch (error) {}
}

export function loadCaseStats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || "{}");
  } catch (error) {
    return {};
  }
}

export function saveCaseStats(caseStats) {
  try {
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(caseStats));
  } catch (error) {}
}

export function loadSolveMethod() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.solveMethod);
    return saved === "BEGINNER" ? "BEGINNER" : "CFOP";
  } catch (error) {
    return "CFOP";
  }
}

export function saveSolveMethod(solveMethod) {
  try {
    localStorage.setItem(STORAGE_KEYS.solveMethod, solveMethod);
  } catch (error) {}
}

export function loadSolveScope() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.solveScope);
    return VALID_SOLVE_SCOPES.includes(saved) ? saved : "FULL";
  } catch (error) {
    return "FULL";
  }
}

export function normalizeSolveScope(value) {
  return VALID_SOLVE_SCOPES.includes(value) ? value : "FULL";
}

export function saveSolveScope(solveScope) {
  try {
    localStorage.setItem(STORAGE_KEYS.solveScope, solveScope);
  } catch (error) {}
}
