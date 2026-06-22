// @ts-nocheck
import { STORAGE_KEYS } from "../lib/storage";

export function createRuntimeControls({
  state,
  cubeView,
  modeButtons,
  newCaseBtn,
  resetBtn,
  revealBtn,
  crossRevealBtn,
  solveBtn,
  undoBtn,
  showScrambleBtn,
  loadScrambleBtn,
  savePracticeScrambleBtn,
  loadPracticeScrambleBtn,
  toCrossBtn,
  toWhiteBtn,
  toMiddleBtn,
  toYellowCrossBtn,
  toLastLayerEdgesBtn,
  toCornerOrientationBtn,
  toCornerPermutationBtn,
  beginnerFullSolveBtn,
  cfopCrossBtn,
  cfopF2LBtn,
  cfopOllBtn,
  cfopPllBtn,
  cfopNewF2LBtn,
  cfopNewOllBtn,
  cfopNewPllBtn,
  cfopFullSolveBtn,
  solveMethodEl,
  solveScopeEl,
  quizModeEl,
  quizAnswerEl,
  quizCheckBtn,
  quizClearBtn,
  customScrambleInputEl,
  zoomSliderEl,
  zoomValueEl,
  zoomResetBtn,
  speedSliderEl,
  speedValueEl,
  speedResetBtn,
  resetCaseStatsBtn,
  resetSessionStatsBtn,
  filterAllBtn,
  filterNoneBtn,
  onKeyDown,
  practiceController,
  isCrossTrainingActive,
  setCfopStageFloor,
  updateSolveMethod,
  updateSolveScope,
  updateQuizMode,
  checkQuizAnswer,
  clearQuizAnswer,
  updateUi,
  resetCurrentCaseStats,
  resetSessionStats,
  setAllCurrentFilters,
  solveCubeAnimated,
  undoLastMove,
  replayCurrentScramble,
  solveToWhiteCross,
  solveToWhiteFace,
  solveToMiddleLayer,
  solveToYellowCross,
  solveToLastLayerEdges,
  solveToCornerOrientation,
  solveToCornerPermutation,
  solveBeginnerFullCube,
  solveToCfopCross,
  solveToCfopF2L,
  solveToCfopOll,
  solveToCfopPll,
  startNewF2LPractice,
  startNewOllPractice,
  startNewPllPractice,
  solveCfopFullCube
}) {
  function attachEvents() {
    window.addEventListener("resize", () => cubeView.resize());
    window.addEventListener("keydown", onKeyDown);

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => practiceController.setMode(button.dataset.mode));
    });

    newCaseBtn.addEventListener("click", () => {
      if (isCrossTrainingActive()) {
        state.mode = "CROSS";
        modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === "CROSS"));
        practiceController.resetCrossTrainingMode(true);
      } else if (state.mode === "FREE") {
        practiceController.resetFreeMode(true, false);
      } else {
        setCfopStageFloor(0);
        practiceController.chooseRandomCase();
      }
    });

    resetBtn.addEventListener("click", () => practiceController.resetCurrentCase());
    revealBtn.addEventListener("click", practiceController.revealAlgorithm);
    crossRevealBtn?.addEventListener("click", practiceController.revealAlgorithm);
    solveBtn?.addEventListener("click", solveCubeAnimated);
    undoBtn.addEventListener("click", undoLastMove);
    showScrambleBtn.addEventListener("click", replayCurrentScramble);
    loadScrambleBtn?.addEventListener("click", practiceController.loadCustomScramble);
    savePracticeScrambleBtn?.addEventListener("click", practiceController.savePracticeScramble);
    loadPracticeScrambleBtn?.addEventListener("click", practiceController.loadSavedPracticeScramble);
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
        practiceController.loadCustomScramble();
      }
    });
    customScrambleInputEl?.addEventListener("input", () => updateUi());
    zoomSliderEl.addEventListener("input", updateZoomFromSlider);
    zoomResetBtn.addEventListener("click", resetZoomToDefault);
    speedSliderEl.addEventListener("input", updateAnimationSpeed);
    speedResetBtn.addEventListener("click", resetSpeedToDefault);
    resetCaseStatsBtn.addEventListener("click", resetCurrentCaseStats);
    resetSessionStatsBtn.addEventListener("click", resetSessionStats);
    filterAllBtn.addEventListener("click", () => setAllCurrentFilters(true));
    filterNoneBtn.addEventListener("click", () => setAllCurrentFilters(false));
  }

  function updateZoomFromSlider() {
    const sliderValue = Number(zoomSliderEl.value);
    const normalized = (sliderValue - 50) / 50;
    cubeView.setZoomNormalized(normalized);
    zoomValueEl.textContent = normalized === 0 ? "0" : normalized.toFixed(2);
  }

  function updateAnimationSpeed() {
    const ms = Number(speedSliderEl.value || 180);
    cubeView.setAnimationDuration(ms);
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

  return {
    attachEvents,
    updateZoomFromSlider,
    updateAnimationSpeed,
    resetSpeedToDefault,
    resetZoomToDefault
  };
}
