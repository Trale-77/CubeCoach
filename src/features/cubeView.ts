// @ts-nocheck
import * as THREE from "three";
import { FACE_ORDER, FACE_COLORS, OPPOSITE_FACE, cubieFaceMap } from "../lib/cube-core";

const HIDDEN_COLOR = "#111111";
const MATERIAL_INDEX_TO_FACE = ["R", "L", "U", "D", "F", "B"];
const DEFAULT_ORBIT_PITCH = -0.8;
const DEFAULT_ORBIT_RADIUS = 12.4;
const DEFAULT_ORBIT_YAW = 3 * Math.PI / 4;
const ZOOM_RADIUS_DELTA = 3.2;

const FACE_NORMALS = {
  U: new THREE.Vector3(0, 1, 0),
  D: new THREE.Vector3(0, -1, 0),
  F: new THREE.Vector3(0, 0, 1),
  B: new THREE.Vector3(0, 0, -1),
  R: new THREE.Vector3(1, 0, 0),
  L: new THREE.Vector3(-1, 0, 0)
};

export function createCubeViewController({
  viewportEl,
  hiddenFacesEl,
  cubeNetEl,
  onFrame,
  onMoveStart,
  onMoveComplete
}) {
  const cubeNetCtx = cubeNetEl.getContext("2d");
  const cubies = [];

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  viewportEl.appendChild(renderer.domElement);

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

  initCubies();
  attachPointerEvents();
  resize();
  requestAnimationFrame(renderLoop);

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
  }

  function attachPointerEvents() {
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
  }

  function renderLoop(now) {
    updateMoveAnimation(now);
    updateCameraAnimation(now);
    updateCamera();
    onFrame?.(now);
    renderer.render(scene, camera);
    hiddenRenderer.render(scene, hiddenCamera);
    requestAnimationFrame(renderLoop);
  }

  function resize() {
    const width = viewportEl.clientWidth;
    const height = viewportEl.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    hiddenCamera.aspect = hiddenFacesEl.clientWidth / hiddenFacesEl.clientHeight;
    hiddenCamera.updateProjectionMatrix();
    hiddenRenderer.setSize(hiddenFacesEl.clientWidth, hiddenFacesEl.clientHeight, false);
  }

  function normalizeAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  function nearestAngleOnGrid(angle, start, step) {
    return start + Math.round((angle - start) / step) * step;
  }

  function clampOrbit() {
    orbit.yaw = normalizeAngle(orbit.yaw);
    orbit.pitch = normalizeAngle(orbit.pitch);
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

  function stopCameraAnimation() {
    cameraAnimation.active = null;
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

  function getNearestSnappedOrbit() {
    return {
      yaw: nearestAngleOnGrid(orbit.yaw, DEFAULT_ORBIT_YAW, Math.PI / 2),
      pitch: nearestAngleOnGrid(orbit.pitch, DEFAULT_ORBIT_PITCH, Math.PI / 2)
    };
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

  function queueMove(job, fromUser = false) {
    animationState.queue.push({ ...job, fromUser });
    if (!animationState.active) {
      startNextAnimatedMove();
    }
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

    onMoveStart?.(job);
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
    onMoveComplete?.(active.job);
    startNextAnimatedMove();
  }

  function clearMoveAnimations() {
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

  function syncCubeMaterials(cube) {
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
    drawCubeNet(cube);
  }

  function drawCubeNet(cube) {
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

  return {
    animateCameraToOrientation,
    clearMoveAnimations,
    getNearestDiscreteCameraOrientation,
    getNearestSnappedOrbit,
    getViewFaceMapping,
    hasActiveMove: () => !!animationState.active,
    queueMove,
    resetCameraOrientation: () => {
      stopCameraAnimation();
      orbit.yaw = DEFAULT_ORBIT_YAW;
      orbit.pitch = DEFAULT_ORBIT_PITCH;
      updateCamera();
    },
    resize,
    setAnimationDuration: (ms) => {
      animationState.durationMs = ms;
      cameraAnimation.durationMs = ms;
    },
    setZoomNormalized: (normalized) => {
      orbit.radius = DEFAULT_ORBIT_RADIUS + normalized * ZOOM_RADIUS_DELTA;
    },
    snapCameraToNearestDiscreteOrientation,
    syncCubeMaterials
  };
}
