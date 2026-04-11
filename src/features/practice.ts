// @ts-nocheck
import { createSolvedState, parseAlgorithm, generateScramble, invertAlgorithm } from "../lib/cube-core";
import { STORAGE_KEYS } from "../lib/storage";

export function createPracticeController({
  state,
  modeButtons,
  customScrambleInputEl,
  statusTextEl,
  getCasesForMode,
  clearMoveAnimations,
  resetCameraOrientation,
  renderFilterList,
  resetStats,
  syncCubeMaterials,
  updateUi,
  applyAlgorithm,
  computeCrossTrainingSolution,
  setCubeState,
  setCrossSolution
}) {
  const CROSS_SCRAMBLE_LENGTH = 12;

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
    setCubeState(createSolvedState());
    state.setupHistory = parseAlgorithm(state.currentSetupAlgorithm);
    if (animateScramble) {
      resetStats();
      syncCubeMaterials();
      updateUi();
      return { replay: true };
    }
    applyAlgorithm(state.currentSetupAlgorithm, false);
    resetStats();
    syncCubeMaterials();
    updateUi();
    statusTextEl.textContent = "Scrambled cube ready. Solve it or press New Case for another scramble.";
    return { replay: false };
  }

  function resetCrossTrainingMode(generateNew = true) {
    clearMoveAnimations();
    resetCameraOrientation();
    if (generateNew || !parseAlgorithm(state.currentSetupAlgorithm).length) {
      const previousScramble = state.currentSetupAlgorithm;
      let nextScramble = generateScramble(CROSS_SCRAMBLE_LENGTH);
      let attempts = 0;
      while (nextScramble === previousScramble && attempts < 8) {
        nextScramble = generateScramble(CROSS_SCRAMBLE_LENGTH);
        attempts += 1;
      }
      state.currentSetupAlgorithm = nextScramble;
    }
    state.currentCase = { name: "CROSS TRAINING", algorithm: state.currentSetupAlgorithm };
    state.revealed = false;
    setCubeState(createSolvedState());
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
    setCubeState(createSolvedState());
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
    setCubeState(createSolvedState());
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
    setCubeState(createSolvedState());
    applyAlgorithm(state.currentSetupAlgorithm, false);
    resetStats();
    state.setupHistory = moves.slice();
    syncCubeMaterials();

    if (state.mode === "CROSS") {
      state.currentCase = { name: "CROSS TRAINING", algorithm: state.currentSetupAlgorithm };
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
      statusTextEl.textContent = "Saved scramble for practice.";
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

  return {
    setMode,
    resetFreeMode,
    resetCrossTrainingMode,
    chooseRandomCase,
    resetCurrentCase,
    revealAlgorithm,
    loadCustomScramble,
    savePracticeScramble,
    loadSavedPracticeScramble
  };
}
