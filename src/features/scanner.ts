// @ts-nocheck
import {
  FACE_ORDER,
  FACE_COLOR_NAMES,
  FACE_COLORS,
  createSolvedState,
  cloneState
} from "../lib/cube-core";

export function getScannerOrientationHint(face) {
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

export function createCubeScannerController({ onLoadCapturedState }) {
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
  const scanCubeBtn = document.getElementById("scanCubeBtn");
  const scannerColorButtons = ["U", "D", "F", "B", "R", "L"].map((face) => ({
    face,
    button: document.getElementById(`scannerColor${face}`)
  }));

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
    stableFrames: 0
  };

  const SCANNER_ADJACENT_FACE_MAP = {
    U: new Set(["F", "R", "B", "L"]),
    D: new Set(["F", "R", "B", "L"]),
    F: new Set(["U", "D", "R", "L"]),
    B: new Set(["U", "D", "R", "L"]),
    R: new Set(["U", "D", "F", "B"]),
    L: new Set(["U", "D", "F", "B"])
  };

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

  function updateCubeScannerOrientation(face) {
    if (!cubeScannerOrientationEl) return;
    const hint = getScannerOrientationHint(face);
    cubeScannerOrientationEl.innerHTML = `Top: <strong>${hint.top}</strong>.`;
  }

  function updateCubeScannerPrompt() {
    const face = cubeScanner.faceOrder[cubeScanner.index];
    if (!face || !cubeScannerPromptEl) return;
    cubeScannerPromptEl.innerHTML = `Show the <span class="scanner-stage">${FACE_COLOR_NAMES[face]}</span> face centered in the guide, with the stickers facing the camera and the top row level.`;
    updateCubeScannerOrientation(face);
    renderCubeScannerProgress();
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
      onLoadCapturedState?.(cloneState(cubeScanner.captured));
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
        const offsets = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
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

    const hueTargets = { U: 50, F: 0, B: 24, R: 138, L: 219 };

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
        if (h >= 150 && h <= 250 && s > 0.09) distance += 0.3;
      } else {
        const hueDistance = circularHueDistance(h, hueTargets[face]) / 180;
        distance += hueDistance * 0.75;
        if (s < 0.12) distance += 0.24;
        if (face === "U" && (h < 35 || h > 82)) distance += 0.3;
        if (face === "F" && !(h <= 14 || h >= 344)) distance += 0.38;
        if (face === "B" && (h < 10 || h > 42)) distance += 0.26;
        if (face === "R" && (h < 78 || h > 168)) distance += 0.24;
        if (face === "L" && (h < 170 || h > 270)) distance += 0.32;
      }

      if (face === "L" && s < 0.2 && v > 0.7) distance += 0.35;
      if (face === "D" && s < 0.2 && v > 0.7) distance -= 0.12;

      if (distance < bestDistance) {
        secondDistance = bestDistance;
        bestDistance = distance;
        bestFace = face;
      } else if (distance < secondDistance) {
        secondDistance = distance;
      }
    }

    const separation = secondDistance === Number.POSITIVE_INFINITY ? 1 : Math.max(0, secondDistance - bestDistance);
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
        ctx.strokeStyle = index === 4 ? "rgba(255,255,255,0.96)" : "rgba(17,17,17,0.78)";
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
          ctx.strokeStyle = index === 4 ? "rgba(255,255,255,0.92)" : "rgba(17,17,17,0.78)";
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
        ctx.strokeStyle = index === 4 ? "rgba(255,255,255,0.96)" : "rgba(17,17,17,0.75)";
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
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  function attachEvents() {
    scanCubeBtn?.addEventListener("click", openCubeScanner);
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
      if (event.key !== "Escape" || !cubeScanner.active) return;
      event.preventDefault();
      closeCubeScanner(false);
    });
  }

  attachEvents();

  return {
    openCubeScanner,
    closeCubeScanner,
    isActive: () => cubeScanner.active
  };
}
