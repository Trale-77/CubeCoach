// @ts-nocheck
import {
  FACE_COLOR_NAMES,
  FACE_COLORS,
  createSolvedState,
  cloneState
} from "../lib/cube-core";
import { getScannerOrientationHint } from "./scanner";

export function createColorEditorController({
  onChange,
  onApply
}) {
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
  const resetEditorBtn = document.getElementById("resetEditorBtn");
  const loadEditorStateBtn = document.getElementById("loadEditorStateBtn");
  const editorColorButtons = ["U", "D", "F", "B", "R", "L"].map((face) => ({
    face,
    button: document.getElementById(`editorColor${face}`)
  }));

  const FACE_ORDER = ["U", "F", "R", "D", "B", "L"];
  let currentFace = "U";
  let selectedFace = "U";
  let editorState = createSolvedState();

  function notifyChange() {
    onChange?.();
  }

  function reset() {
    editorState = createSolvedState();
    currentFace = "U";
    selectedFace = "U";
    notifyChange();
  }

  function loadCapturedState(capturedState) {
    editorState = cloneState(capturedState);
    currentFace = "U";
    selectedFace = "U";
    if (colorEditorExpanderEl && !colorEditorExpanderEl.open) {
      colorEditorExpanderEl.open = true;
    }
    notifyChange();
  }

  function getOrientationHint(face) {
    const hint = getScannerOrientationHint(face);
    return `Top: ${hint.top}.`;
  }

  function getEditedState() {
    const next = cloneState(editorState);
    for (const face of Object.keys(next)) {
      next[face][4] = face;
    }
    return next;
  }

  function apply() {
    onApply?.(getEditedState());
  }

  function onColorEditorClick(event) {
    if (!colorEditorNetEl) return;
    const rect = colorEditorNetEl.getBoundingClientRect();
    const scaleX = colorEditorNetEl.width / rect.width;
    const scaleY = colorEditorNetEl.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const hit = getEditorStickerAtPoint(x, y);
    if (!hit || hit.index === 4) return;
    editorState[currentFace][hit.index] = selectedFace;
    notifyChange();
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
          return { face: currentFace, index: row * 3 + col };
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

    ctx.clearRect(0, 0, colorEditorNetEl.width, colorEditorNetEl.height);
    ctx.fillStyle = "rgba(10, 10, 15, 0.18)";
    ctx.fillRect(0, 0, colorEditorNetEl.width, colorEditorNetEl.height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(startX - 4, startY - 4, faceSpan + 8, faceSpan + 8);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col;
        const x = startX + col * (tile + gap);
        const y = startY + row * (tile + gap);
        const sticker = index === 4 ? currentFace : editorState[currentFace][index];
        ctx.fillStyle = FACE_COLORS[sticker];
        ctx.beginPath();
        ctx.roundRect(x, y, tile, tile, radius);
        ctx.fill();
        ctx.strokeStyle = index === 4 ? "rgba(255,255,255,0.95)" : "rgba(17,17,17,0.72)";
        ctx.lineWidth = index === 4 ? 3 : 1.5;
        ctx.stroke();
      }
    }
  }

  function closeColorEditor(loadOnClose = false) {
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
    notifyChange();
    if (loadOnClose) {
      apply();
    }
  }

  const originalColorEditorParent = colorEditorSheetEl?.parentElement || null;

  function syncUi({ disabled = false } = {}) {
    editorColorButtons.forEach(({ face, button }) => button?.classList.toggle("active", selectedFace === face));
    if (colorEditorFaceNameEl) {
      colorEditorFaceNameEl.textContent = `${FACE_COLOR_NAMES[currentFace]} Face`;
    }
    if (colorEditorOrientationEl) {
      colorEditorOrientationEl.textContent = getOrientationHint(currentFace);
    }
    if (loadEditorStateBtn) {
      loadEditorStateBtn.disabled = disabled;
    }
    drawColorEditorNet();
  }

  resetEditorBtn?.addEventListener("click", reset);
  loadEditorStateBtn?.addEventListener("click", apply);
  editorColorButtons.forEach(({ face, button }) => {
    button?.addEventListener("click", () => {
      selectedFace = face;
      notifyChange();
    });
  });
  colorEditorPrevFaceBtn?.addEventListener("click", () => {
    const currentIndex = FACE_ORDER.indexOf(currentFace);
    currentFace = FACE_ORDER[(currentIndex - 1 + FACE_ORDER.length) % FACE_ORDER.length];
    notifyChange();
  });
  colorEditorNextFaceBtn?.addEventListener("click", () => {
    const currentIndex = FACE_ORDER.indexOf(currentFace);
    currentFace = FACE_ORDER[(currentIndex + 1) % FACE_ORDER.length];
    notifyChange();
  });
  colorEditorNetEl?.addEventListener("click", onColorEditorClick);
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
    notifyChange();
  });
  colorEditorBackdropEl?.addEventListener("click", () => closeColorEditor(false));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !colorEditorExpanderEl?.open) return;
    event.preventDefault();
    closeColorEditor(true);
  });

  return {
    loadCapturedState,
    getEditedState,
    syncUi
  };
}
