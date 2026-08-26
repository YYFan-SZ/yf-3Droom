import * as THREE from "three";
import gsap from "gsap";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import "./style.css";

const canvas = document.querySelector("#room-canvas");
const progressLabel = document.querySelector("#loading-progress");
const progressFill = document.querySelector("#loading-progress-fill");
const lampSwitch = document.querySelector("#lamp-switch");
const musicControl = document.querySelector("#music-control");
const musicPlayer = document.querySelector("#music-player");
const musicTrackTitle = document.querySelector("#music-track-title");
const musicPrevious = document.querySelector("#music-previous");
const musicPlayPause = document.querySelector("#music-play-pause");
const musicNext = document.querySelector("#music-next");
const lightingControl = document.querySelector("#lighting-control");
const returnPanoramaButton = document.querySelector("#return-panorama");
const contactCard = document.querySelector("#contact-card");
const contactCardClose = document.querySelector("#contact-card-close");
const photoViewer = document.querySelector("#photo-viewer");
const photoViewerImage = document.querySelector("#photo-viewer-image");
const photoViewerCaption = document.querySelector("#photo-viewer-caption");
const photoViewerClose = document.querySelector("#photo-viewer-close");
const photoViewerPrevious = document.querySelector("#photo-viewer-previous");
const photoViewerNext = document.querySelector("#photo-viewer-next");
const profileCardViewer = document.querySelector("#profile-card-viewer");
const profileCardViewerCanvas = document.querySelector("#profile-card-viewer-canvas");
const profileCardViewerClose = document.querySelector("#profile-card-viewer-close");
const receiptSaveButton = document.querySelector("#receipt-save");
const receiptAgainButton = document.querySelector("#receipt-again");
const receiptActions = document.querySelector("#receipt-actions");
const explorationProgress = document.querySelector("#exploration-progress");
const explorationProgressLabel = document.querySelector("#exploration-progress-label");
const explorationProgressCount = document.querySelector("#exploration-progress-count");
const explorationProgressFill = document.querySelector("#exploration-progress-fill");
const explorationProgressTrack = explorationProgress?.querySelector('[role="progressbar"]');
const weatherStatus = document.querySelector("#weather-status");
const weatherStatusLabel = document.querySelector("#weather-status-label");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const loadingStartedAt = performance.now();
const minimumLoadingDuration = 3000;

// The loading screen now represents the assets that must be ready for the
// first complete room view. The weights roughly follow the source file sizes,
// so one small photo does not move the progress bar as much as a large GLB.
const criticalAssetProgress = new Map([
  ["room", { weight: 73.3, progress: 0 }],
  ["photoWall", { weight: 0.8, progress: 0 }],
  ["teaTableLamp", { weight: 15.0, progress: 0 }],
  ["wallRosie", { weight: 24.8, progress: 0 }],
  ["rosieDoll", { weight: 22.6, progress: 0 }],
  ["profileCard", { weight: 12.1, progress: 0 }],
]);

if (lampSwitch) {
  lampSwitch.hidden = true;
  lampSwitch.disabled = true;
}

let roomModel = null;
let deskLampLight = null;
let deskLampTarget = null;
let lampOn = false;
const lampBulbMaterials = [];
const starGlows = [];
const starPointLights = [];
const starLightMaterials = [];
const teaTableLampMaterials = [];
const sofaNightMaterials = [];
let teaTableLampLight = null;
let teaTableLampManualOn = false;
let roomIsNight = false;
let currentPhotoIndex = -1;
let activePhotoViewerItems = null;
let currentMusicTrack = 0;
let recordMusicDisc = null;
const recordMusicNotes = [];
const roomInteractionEntries = [];
let hoveredRoomInteraction = null;
let profileCardObject = null;
let profilePreviewRenderer = null;
let profilePreviewScene = null;
let profilePreviewCamera = null;
let computerFocusActive = false;
const computerFocusReturnPosition = new THREE.Vector3();
const computerFocusReturnTarget = new THREE.Vector3();
let computerFocusReturnFov = 29;
let receiptPaperGroup = null;
let receiptPaperSheet = null;
let receiptPaperExtended = false;
let receiptPaperAnimating = false;
let receiptTicketCanvas = null;
let receiptCurrentMessage = "";
let receiptPrinterObject = null;
let receiptFocusActive = false;
const receiptFocusReturnPosition = new THREE.Vector3();
const receiptFocusReturnTarget = new THREE.Vector3();
let receiptFocusReturnFov = 29;
let profileCardFocusActive = false;
const profileCardFocusReturnPosition = new THREE.Vector3();
const profileCardFocusReturnTarget = new THREE.Vector3();
let profileCardFocusReturnFov = 29;
const discoveredInteractions = new Set();
const explorationInteractionTotal = 8;
let starCelebrationActive = false;
let windowWeatherIndex = 0;
let windowWeatherTexture = null;
const windowGlassMeshes = [];
let weatherStatusTimer = 0;

const RECEIPT_MESSAGES = [
  "所以我说，就让他去\n我知道潮落之后一定有潮起",
  "你当时相信的那些事情\n会在如今变成美丽风景",
  "没发生什么好事？\n那就先吃点好吃的。",
  "有些事现在不做，\n一辈子都不会做了",
  "慢一点也没关系，\n你一直在往前走。",
];

const MUSIC_TRACKS = [
  { title: "ROSÉ · number one girl", url: "/music/rose-number-one-girl.mp3" },
  { title: "ROSÉ · On The Ground", url: "/music/rose-on-the-ground.mp3" },
  { title: "五月天 · 顽固", url: "/music/mayday-stubborn.mp3" },
]; 
const roomAudio = new Audio();
roomAudio.preload = "metadata";
roomAudio.volume = 0.58;

const PHOTO_WALL_ITEMS = [
  ["/photos/photo-placeholder.svg", "照片占位 · 把你的故事放在这里"],
  ["/photos/photo-placeholder.svg", "照片占位 · 旅行与日常"],
  ["/photos/photo-placeholder.svg", "照片占位 · 一段值得记录的时光"],
  ["/photos/photo-placeholder.svg", "照片占位 · 喜欢的风景"],
  ["/photos/photo-placeholder.svg", "照片占位 · 城市漫步"],
  ["/photos/photo-placeholder.svg", "照片占位 · 山海之间"],
  ["/photos/photo-placeholder.svg", "照片占位 · 现场与热爱"],
  ["/photos/photo-placeholder.svg", "照片占位 · 旅途片段"],
  ["/photos/photo-placeholder.svg", "照片占位 · 快闪记忆"],
  ["/photos/photo-placeholder.svg", "照片占位 · 生活照片一"],
  ["/photos/photo-placeholder.svg", "照片占位 · 生活照片二"],
  ["/photos/photo-placeholder.svg", "照片占位 · 生活照片三"],
  ["/photos/photo-placeholder.svg", "照片占位 · 喜欢的语录"],
  ["/photos/photo-placeholder.svg", "照片占位 · 抬头看天空"],
  ["/photos/photo-placeholder.svg", "照片占位 · 高中时的乐趣"],
  ["/photos/photo-placeholder.svg", "照片占位 · 季节与树影"],
  ["/photos/photo-placeholder.svg", "照片占位 · 海边的一天"],
  ["/photos/photo-placeholder.svg", "照片占位 · 演出与快闪"],
  ["/photos/photo-placeholder.svg", "照片占位 · 城市游记"],
];

const FOOD_GALLERY_ITEMS = [
  ["/food-gallery/food-placeholder.svg", "美食占位 · 把好吃的放在这里"],
  ["/food-gallery/food-placeholder.svg", "美食占位 · 火锅时刻"],
  ["/food-gallery/food-placeholder.svg", "美食占位 · 下午茶"],
  ["/food-gallery/food-placeholder.svg", "美食占位 · 探店记录"],
  ["/food-gallery/food-placeholder.svg", "美食占位 · 探店记录 2"],
  ["/food-gallery/food-placeholder.svg", "美食占位 · 探店记录 3"],
  ["/food-gallery/food-placeholder.svg", "美食占位 · 美食公开课"],
  ["/food-gallery/food-placeholder.svg", "美食占位 · 异国风味"],
  ["/food-gallery/food-placeholder.svg", "美食占位 · 探店记录 4"],
];

const WINDOW_WEATHER_STATES = [
  { key: "day", label: "白天阳光", hemisphere: 2.35, sun: 4.1, fill: 19, warm: 13, exposure: 1.08, roomShade: 1, starEmissive: 1.5, starPoint: 1.0, glow: 1.0, colors: [0xffead3, 0xb9b8ec, 0xffcda7] },
  { key: "sunset", label: "黄昏", hemisphere: 1.35, sun: 2.5, fill: 9.5, warm: 20, exposure: 0.98, roomShade: 0.78, starEmissive: 1.9, starPoint: 1.35, glow: 1.30, colors: [0xff9b69, 0xb99bd8, 0xff8a58] },
  { key: "night", label: "夜晚星空", hemisphere: 0.34, sun: 0.16, fill: 1.25, warm: 1.8, exposure: 0.78, roomShade: 0.30, starEmissive: 3.35, starPoint: 3.8, glow: 1.85, colors: [0xaebeff, 0x7784c7, 0xf2a864] },
  { key: "rain", label: "雨天玻璃", hemisphere: 0.78, sun: 0.42, fill: 6.5, warm: 4.5, exposure: 0.86, roomShade: 0.56, starEmissive: 1.35, starPoint: 0.82, glow: 0.78, colors: [0xb9ccdc, 0x8ca9c3, 0xd1a99a] },
];

function markInteractionDiscovered(key) {
  if (discoveredInteractions.has(key)) return;
  discoveredInteractions.add(key);
  const count = Math.min(discoveredInteractions.size, explorationInteractionTotal);
  if (explorationProgressCount) explorationProgressCount.textContent = String(count);
  if (explorationProgressFill) explorationProgressFill.style.width = `${(count / explorationInteractionTotal) * 100}%`;
  explorationProgressTrack?.setAttribute("aria-valuenow", String(count));
  if (count === explorationInteractionTotal) {
    starCelebrationActive = true;
    explorationProgress?.classList.add("is-complete");
    if (explorationProgressLabel) explorationProgressLabel.textContent = "已解锁所有隐藏惊喜！";
    document.body.classList.add("is-exploration-complete");
  }
}

function updateReturnPanoramaButton() {
  returnPanoramaButton?.removeAttribute("aria-hidden");
}

function setLoadingProgress(value) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  progressLabel.textContent = `${safeValue}%`;
  progressFill.style.width = `${safeValue}%`;
}

function updateCriticalAssetProgress(key, progress) {
  const entry = criticalAssetProgress.get(key);
  if (!entry) return;
  entry.progress = THREE.MathUtils.clamp(progress, 0, 1);
  let loadedWeight = 0;
  let totalWeight = 0;
  criticalAssetProgress.forEach((asset) => {
    loadedWeight += asset.weight * asset.progress;
    totalWeight += asset.weight;
  });
  // Keep 100% reserved for the first fully rendered frame.
  setLoadingProgress(Math.min(99, (loadedWeight / totalWeight) * 100));
}

function trackCriticalAssetDownload(key, event) {
  if (event.total) updateCriticalAssetProgress(key, event.loaded / event.total);
}

function setMusicPlayerOpen(open) {
  musicPlayer?.classList.toggle("is-open", open);
  musicPlayer?.setAttribute("aria-hidden", String(!open));
}

function updateMusicPlaybackUI(playing) {
  musicControl?.classList.toggle("is-playing", playing);
  musicControl?.setAttribute("aria-pressed", String(playing));
  musicControl?.setAttribute("aria-label", playing ? "暂停音乐" : "播放音乐");
  if (musicControl) musicControl.title = playing ? "暂停音乐" : "播放音乐";
  if (musicPlayPause) {
    musicPlayPause.classList.toggle("is-playing", playing);
    musicPlayPause.setAttribute("aria-label", playing ? "暂停" : "播放");
    musicPlayPause.title = playing ? "暂停" : "播放";
  }
  recordMusicNotes.forEach((note, index) => {
    if (playing) note.visible = true;
    gsap.to(note.material, {
      opacity: playing ? 0.88 - index * 0.07 : 0,
      duration: playing ? 0.42 : 0.30,
      delay: playing ? index * 0.045 : 0,
      ease: "power2.out",
      onComplete: () => {
        if (!playing) note.visible = false;
      },
    });
  });
}

function loadMusicTrack(index, autoplay = false) {
  currentMusicTrack = (index + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
  const track = MUSIC_TRACKS[currentMusicTrack];
  musicTrackTitle.textContent = track.title;
  roomAudio.src = track.url;
  roomAudio.load();
  if (autoplay) {
    roomAudio.play().catch((error) => console.error("Music playback failed", error));
  } else {
    updateMusicPlaybackUI(false);
  }
}

function playCurrentMusic() {
  setMusicPlayerOpen(true);
  if (!roomAudio.src) loadMusicTrack(currentMusicTrack, false);
  roomAudio.play().catch((error) => console.error("Music playback failed", error));
}

function toggleMusicPlayback() {
  if (roomAudio.paused) playCurrentMusic();
  else roomAudio.pause();
}

function changeMusicTrack(direction) {
  const shouldContinuePlaying = !roomAudio.paused;
  loadMusicTrack(currentMusicTrack + direction, shouldContinuePlaying);
  setMusicPlayerOpen(true);
}

musicControl?.addEventListener("click", toggleMusicPlayback);
musicPlayPause?.addEventListener("click", toggleMusicPlayback);
musicPrevious?.addEventListener("click", () => changeMusicTrack(-1));
musicNext?.addEventListener("click", () => changeMusicTrack(1));
roomAudio.addEventListener("play", () => updateMusicPlaybackUI(true));
roomAudio.addEventListener("pause", () => updateMusicPlaybackUI(false));
roomAudio.addEventListener("ended", () => loadMusicTrack(currentMusicTrack + 1, true));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(29, innerWidth / innerHeight, 0.1, 120);
const panoramaCameraTarget = new THREE.Vector3(0, 2.25, -0.70);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });

renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

function createGlowTexture() {
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const context = glowCanvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, "rgba(255, 249, 202, 1)");
  gradient.addColorStop(0.18, "rgba(255, 216, 112, .85)");
  gradient.addColorStop(0.48, "rgba(255, 178, 77, .3)");
  gradient.addColorStop(1, "rgba(255, 166, 62, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(glowCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function chooseReceiptMessage() {
  const available = RECEIPT_MESSAGES.filter((message) => message !== receiptCurrentMessage);
  receiptCurrentMessage = available[Math.floor(Math.random() * available.length)] ?? RECEIPT_MESSAGES[0];
  return receiptCurrentMessage;
}

function createReceiptTexture(message = chooseReceiptMessage()) {
  const ticketCanvas = document.createElement("canvas");
  ticketCanvas.width = 1024;
  ticketCanvas.height = 1536;
  receiptTicketCanvas = ticketCanvas;
  const context = ticketCanvas.getContext("2d");
  context.fillStyle = "#f8f4eb";
  context.fillRect(0, 0, ticketCanvas.width, ticketCanvas.height);

  // Fine warm fibres keep the paper from looking like a flat white card.
  let seed = 37;
  for (let index = 0; index < 1650; index += 1) {
    seed = (seed * 16807) % 2147483647;
    const x = seed % ticketCanvas.width;
    seed = (seed * 16807) % 2147483647;
    const y = seed % ticketCanvas.height;
    const alpha = 0.018 + (seed % 11) / 1200;
    context.fillStyle = `rgba(132,112,91,${alpha})`;
    context.fillRect(x, y, 1 + (seed % 3), 1);
  }

  const ink = "#27242a";
  const lavenderInk = "#b89bc8";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = ink;
  context.font = "600 58px 'Courier New', monospace";
  context.fillText("PRINT A LITTLE JOY", 512, 150);
  context.fillStyle = lavenderInk;
  context.font = "700 82px Georgia, serif";
  context.fillText("✦", 512, 262);
  context.fillStyle = ink;
  context.font = "500 31px 'Courier New', monospace";
  context.fillText("A LITTLE NOTE FOR YOU", 512, 338);

  context.font = "500 50px 'Microsoft YaHei', sans-serif";
  const messageLines = message.split("\n");
  const messageStartY = messageLines.length > 1 ? 474 : 516;
  messageLines.forEach((line, index) => context.fillText(line, 512, messageStartY + index * 78));

  context.strokeStyle = lavenderInk;
  context.lineWidth = 5;
  context.setLineDash([20, 18]);
  context.beginPath();
  context.moveTo(102, 690);
  context.lineTo(922, 690);
  context.stroke();
  context.setLineDash([]);

  context.textAlign = "left";
  context.fillStyle = ink;
  context.font = "500 38px 'Courier New', monospace";
  context.fillText("JOY NO. 01", 112, 772);
  context.textAlign = "right";
  context.strokeStyle = lavenderInk;
  context.lineWidth = 7;
  context.font = "600 74px Georgia, serif";
  context.strokeText("♡", 896, 770);

  context.textAlign = "center";
  context.fillStyle = ink;
  context.font = "500 31px 'Courier New', monospace";
  context.fillText("KEEP THIS LITTLE MOMENT", 512, 862);

  let barcodeX = 170;
  let barcodeSeed = 19;
  context.fillStyle = ink;
  while (barcodeX < 854) {
    barcodeSeed = (barcodeSeed * 29 + 17) % 97;
    const barWidth = 4 + (barcodeSeed % 5) * 2;
    context.fillRect(barcodeX, 918, barWidth, 138);
    barcodeX += barWidth + 5 + (barcodeSeed % 4);
  }

  context.font = "500 34px 'Courier New', monospace";
  context.fillText("THANK YOU FOR BEING HERE", 512, 1125);
  context.fillStyle = lavenderInk;
  context.font = "600 44px Georgia, serif";
  context.fillText("☁", 208, 1218);
  context.fillStyle = ink;
  context.font = "500 29px 'Courier New', monospace";
  context.fillText("from my little 3D world", 570, 1218);

  const texture = new THREE.CanvasTexture(ticketCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function createReceiptPaper(room, receiptPrinter) {
  if (!receiptPrinter) return;
  room.updateMatrixWorld(true);
  receiptPrinter.updateMatrixWorld(true);
  const printerBounds = new THREE.Box3().setFromObject(receiptPrinter);
  const printerCenter = printerBounds.getCenter(new THREE.Vector3());
  const printerSize = printerBounds.getSize(new THREE.Vector3());
  const paperWidth = Math.min(1.02, Math.max(0.76, printerSize.z * 0.68));
  const paperHeight = 1.52;
  const slotY = printerCenter.y - printerSize.y * 0.02;
  const frontX = printerBounds.max.x;

  receiptPaperGroup = new THREE.Group();
  receiptPaperGroup.name = "ReceiptPaper_Group";
  // Keep the paper just outside the printer face so it visually grows from
  // the slot instead of floating in front of the machine.
  receiptPaperGroup.position.set(frontX + 0.014, slotY - 0.008, printerCenter.z);
  receiptPaperGroup.rotation.y = Math.PI / 2;

  const paperShape = new THREE.Shape();
  paperShape.moveTo(-paperWidth / 2, 0);
  paperShape.lineTo(paperWidth / 2, 0);
  paperShape.lineTo(paperWidth / 2, -paperHeight + 0.025);
  const teeth = 15;
  for (let index = 0; index <= teeth; index += 1) {
    const ratio = index / teeth;
    const x = paperWidth / 2 - ratio * paperWidth;
    const y = -paperHeight + (index % 2 ? -0.028 : 0.028);
    paperShape.lineTo(x, y);
  }
  paperShape.lineTo(-paperWidth / 2, 0);
  paperShape.closePath();

  const paperGeometry = new THREE.ShapeGeometry(paperShape);
  const positions = paperGeometry.getAttribute("position");
  const uvs = paperGeometry.getAttribute("uv");
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    uvs.setXY(index, (x + paperWidth / 2) / paperWidth, (y + paperHeight) / paperHeight);
  }
  uvs.needsUpdate = true;

  const paperMaterial = new THREE.MeshStandardMaterial({
    map: createReceiptTexture(),
    color: 0xfffbf2,
    roughness: 0.93,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  receiptPaperSheet = new THREE.Mesh(paperGeometry, paperMaterial);
  receiptPaperSheet.name = "ReceiptPaper_Sheet";
  receiptPaperSheet.castShadow = true;
  receiptPaperSheet.receiveShadow = true;
  receiptPaperSheet.scale.y = 0.012;
  receiptPaperSheet.visible = false;
  receiptPaperGroup.add(receiptPaperSheet);
  room.add(receiptPaperGroup);
}

function updateReceiptSaveButton() {
  const visible = receiptFocusActive && receiptPaperExtended;
  receiptActions?.classList.toggle("is-visible", visible);
  receiptActions?.setAttribute("aria-hidden", String(!visible));
}

function saveReceiptImage() {
  if (!receiptTicketCanvas) return;
  receiptTicketCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "3D-room-receipt.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

function toggleReceiptPaper() {
  if (!receiptPaperSheet || receiptPaperAnimating) return;
  receiptPaperAnimating = true;
  const nextExtended = !receiptPaperExtended;
  const duration = reducedMotion ? 0 : (nextExtended ? 1.75 : 0.78);
  receiptPaperSheet.visible = true;
  if (duration === 0) {
    receiptPaperSheet.scale.y = nextExtended ? 1 : 0.012;
    receiptPaperSheet.visible = nextExtended;
    receiptPaperExtended = nextExtended;
    receiptPaperAnimating = false;
    updateReceiptSaveButton();
    return;
  }

  gsap.to(receiptPaperSheet.scale, {
    y: nextExtended ? 1 : 0.012,
    duration,
    ease: nextExtended ? "steps(12)" : "power2.in",
    onComplete: () => {
      receiptPaperExtended = nextExtended;
      receiptPaperSheet.visible = nextExtended;
      receiptPaperAnimating = false;
      updateReceiptSaveButton();
      if (nextExtended) {
        gsap.fromTo(receiptPaperGroup.rotation, { z: -0.012 }, { z: 0.012, duration: 0.55, yoyo: true, repeat: 1, ease: "sine.inOut" });
      }
    },
  });
}

receiptSaveButton?.addEventListener("click", saveReceiptImage);

function refreshReceiptTexture() {
  if (!receiptPaperSheet) return;
  const previousTexture = receiptPaperSheet.material.map;
  receiptPaperSheet.material.map = createReceiptTexture(chooseReceiptMessage());
  receiptPaperSheet.material.needsUpdate = true;
  previousTexture?.dispose();
}

function printAnotherReceipt() {
  if (!receiptPaperSheet || receiptPaperAnimating || !receiptPaperExtended) return;
  const duration = reducedMotion ? 0 : 0.62;
  receiptPaperAnimating = true;
  if (duration === 0) {
    receiptPaperSheet.visible = false;
    receiptPaperSheet.scale.y = 0.012;
    receiptPaperExtended = false;
    refreshReceiptTexture();
    receiptPaperAnimating = false;
    toggleReceiptPaper();
    return;
  }
  gsap.to(receiptPaperSheet.scale, {
    y: 0.012,
    duration,
    ease: "power2.in",
    onComplete: () => {
      receiptPaperSheet.visible = false;
      receiptPaperExtended = false;
      refreshReceiptTexture();
      receiptPaperAnimating = false;
      toggleReceiptPaper();
    },
  });
}

receiptAgainButton?.addEventListener("click", printAnotherReceipt);

function makeWallFacingPlane(geometry, material) {
  const plane = new THREE.Mesh(geometry, material);
  const wallBasis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 0, 0),
  );
  plane.setRotationFromMatrix(wallBasis);
  return plane;
}

function createStarShape(radius = 0.16) {
  const shape = new THREE.Shape();
  for (let point = 0; point < 10; point += 1) {
    const angle = Math.PI / 2 + point * Math.PI / 5;
    const pointRadius = point % 2 === 0 ? radius : radius * 0.45;
    const x = Math.cos(angle) * pointRadius;
    const y = Math.sin(angle) * pointRadius;
    if (point === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createHeartShape(size = 0.12) {
  const heart = new THREE.Shape();
  heart.moveTo(0, -size * 0.72);
  heart.bezierCurveTo(-size * 0.18, -size * 0.48, -size, size * 0.10, -size * 0.48, size * 0.62);
  heart.bezierCurveTo(-size * 0.18, size * 0.92, 0, size * 0.66, 0, size * 0.43);
  heart.bezierCurveTo(0, size * 0.66, size * 0.18, size * 0.92, size * 0.48, size * 0.62);
  heart.bezierCurveTo(size, size * 0.10, size * 0.18, -size * 0.48, 0, -size * 0.72);
  return heart;
}

function createComputerWelcomeTexture() {
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 1280;
  screenCanvas.height = 720;
  const context = screenCanvas.getContext("2d");

  const guideItems = [
    ["01", "黑胶唱片机", "播放音乐"],
    ["02", "照片墙", "翻看生活相册"],
    ["03", "茶几甜点", "查看美食记录"],
    ["04", "联系邮箱", "查看联系方式"],
    ["05", "小票机", "打印并保存小票"],
    ["06", "卡套", "近距离查看"],
    ["07", "窗帘", "切换四种天气"],
    ["08", "电脑屏幕", "拉近或返回"],
  ];

  const background = context.createLinearGradient(60, 30, 1220, 690);
  background.addColorStop(0, "#c9bfdf");
  background.addColorStop(0.48, "#e7dfee");
  background.addColorStop(1, "#f1d9cf");
  context.fillStyle = background;
  context.fillRect(0, 0, 1280, 720);

  const ambientBlobs = [
    [110, 640, 250, "rgba(255,246,229,.40)"],
    [1160, 80, 260, "rgba(190,207,235,.42)"],
    [1020, 690, 290, "rgba(236,189,211,.24)"],
  ];
  ambientBlobs.forEach(([x, y, radius, color]) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  });

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(255,255,255,.24)";
  context.fillRect(0, 0, 1280, 54);
  context.fillStyle = "rgba(77,59,89,.64)";
  context.font = "700 17px 'Segoe UI', sans-serif";
  context.fillText("MY 3D ROOM", 42, 28);
  context.textAlign = "right";
  context.fillText("EXPLORE  /  08", 1238, 28);

  context.textAlign = "left";
  context.fillStyle = "#8f75a0";
  context.font = "750 18px 'Segoe UI', sans-serif";
  context.fillText("ROOM GUIDE", 64, 105);
  context.fillStyle = "#51405c";
  context.font = "750 58px 'Microsoft YaHei', sans-serif";
  context.fillText("房间", 62, 168);
  context.fillText("探索指南", 62, 235);
  context.fillStyle = "#806e88";
  context.font = "500 23px 'Microsoft YaHei', sans-serif";
  context.fillText("点击物件，", 65, 303);
  context.fillText("发现我的生活碎片。", 65, 339);

  context.strokeStyle = "rgba(101,78,115,.17)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(384, 84);
  context.lineTo(384, 646);
  context.stroke();

  context.fillStyle = "rgba(255,252,249,.42)";
  context.beginPath();
  context.roundRect(62, 440, 278, 122, 25);
  context.fill();
  context.fillStyle = "#9d83aa";
  context.font = "750 15px 'Segoe UI', sans-serif";
  context.fillText("HOW TO MOVE", 86, 472);
  context.fillStyle = "#6f5b78";
  context.font = "600 19px 'Microsoft YaHei', sans-serif";
  context.fillText("拖动旋转  ·  滚轮缩放", 86, 511);
  context.fillText("点击物件，触发互动", 86, 540);

  guideItems.forEach(([number, title, action], index) => {
    const column = index < 4 ? 0 : 1;
    const row = index % 4;
    const x = 432 + column * 410;
    const y = 120 + row * 134;

    context.textAlign = "left";
    context.fillStyle = column === 0 ? "#9c7eae" : "#b67f93";
    context.font = "750 17px 'Segoe UI', sans-serif";
    context.fillText(number, x, y);

    context.fillStyle = "#5d4b67";
    context.font = "700 27px 'Microsoft YaHei', sans-serif";
    context.fillText(title, x + 46, y);
    context.fillStyle = "#927f9a";
    context.font = "500 19px 'Microsoft YaHei', sans-serif";
    context.fillText(action, x + 46, y + 36);
    context.strokeStyle = "rgba(101,78,115,.14)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y + 68);
    context.lineTo(x + 350, y + 68);
    context.stroke();
  });

  context.textAlign = "right";
  context.fillStyle = "rgba(91,70,103,.58)";
  context.font = "600 16px 'Microsoft YaHei', sans-serif";
  context.fillText("每个角落，都藏着一点生活。", 1216, 676);

  const texture = new THREE.CanvasTexture(screenCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function styleComputerWelcomeScreen(room) {
  const screen = room.getObjectByName("Computer_Monitor_Screen");
  if (!screen?.isMesh) return;
  screen.material = new THREE.MeshBasicMaterial({ color: 0xe8e2ef, toneMapped: false });
  screen.material.needsUpdate = true;

  // The imported screen mesh has no reliable image UVs. A dedicated front
  // plane guarantees the canvas text is readable instead of sampling one
  // blank strip from the texture.
  screen.geometry.computeBoundingBox();
  const screenBounds = screen.geometry.boundingBox;
  const screenSize = screenBounds.getSize(new THREE.Vector3());
  const screenCenter = screenBounds.getCenter(new THREE.Vector3());
  const textureAspect = 16 / 9;
  const maximumWidth = screenSize.x * 0.90;
  const maximumHeight = screenSize.y * 0.84;
  let displayWidth = maximumWidth;
  let displayHeight = displayWidth / textureAspect;
  if (displayHeight > maximumHeight) {
    displayHeight = maximumHeight;
    displayWidth = displayHeight * textureAspect;
  }

  const display = new THREE.Mesh(
    new THREE.PlaneGeometry(displayWidth, displayHeight),
    new THREE.MeshBasicMaterial({
      map: createComputerWelcomeTexture(),
      color: 0xffffff,
      toneMapped: false,
    }),
  );
  display.name = "Computer_Monitor_Welcome_Display";
  display.position.set(screenCenter.x, screenCenter.y, screenBounds.max.z + 0.006);
  screen.add(display);
}

function createFlowerShape(radius = 0.13, petals = 7) {
  const flower = new THREE.Shape();
  const points = petals * 12;
  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const pointRadius = radius * (0.76 + Math.cos(angle * petals) * 0.24);
    const x = Math.cos(angle) * pointRadius;
    const y = Math.sin(angle) * pointRadius;
    if (index === 0) flower.moveTo(x, y);
    else flower.lineTo(x, y);
  }
  flower.closePath();
  return flower;
}

function createStarOutlineShape(outerRadius = 0.30, innerRadius = 0.20) {
  const outline = createStarShape(outerRadius);
  const hole = new THREE.Path();
  for (let point = 9; point >= 0; point -= 1) {
    const angle = Math.PI / 2 + point * Math.PI / 5;
    const pointRadius = point % 2 === 0 ? innerRadius : innerRadius * 0.45;
    const x = Math.cos(angle) * pointRadius;
    const y = Math.sin(angle) * pointRadius;
    if (point === 9) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  outline.holes.push(hole);
  return outline;
}

function registerRoomInteraction(targetOrTargets, effect = "bounce", options = {}) {
  const targets = (Array.isArray(targetOrTargets) ? targetOrTargets : [targetOrTargets])
    .filter(Boolean)
    .filter((target) => !target.userData.roomInteractionEntry);
  if (!targets.length) return null;

  const entry = {
    effect,
    options,
    states: targets.map((object) => ({
      object,
      position: object.position.clone(),
      rotation: object.rotation.clone(),
      scale: object.scale.clone(),
    })),
  };

  targets.forEach((target) => {
    target.traverse((object) => {
      object.userData.roomInteractionEntry = entry;
    });
  });
  roomInteractionEntries.push(entry);
  return entry;
}

function findInteractionEntry(object) {
  let current = object;
  while (current) {
    if (current.userData.roomInteractionEntry) return current.userData.roomInteractionEntry;
    current = current.parent;
  }
  return null;
}

function setInteractionHover(entry, active) {
  if (!entry || reducedMotion) return;
  const scaleFactor = active ? (entry.options.hoverScale ?? 1.035) : 1;
  entry.states.forEach((state) => {
    const { object, position, rotation, scale } = state;
    gsap.killTweensOf(object.scale);
    gsap.killTweensOf(object.rotation);
    gsap.to(object.scale, {
      x: scale.x * scaleFactor,
      y: scale.y * scaleFactor,
      z: scale.z * scaleFactor,
      duration: active ? 0.22 : 0.34,
      ease: active ? "back.out(1.7)" : "power2.out",
      overwrite: "auto",
    });
    if (entry.effect === "sway" || entry.effect === "plant" || entry.effect === "swing") {
      gsap.to(object.rotation, {
        z: rotation.z + (active ? (entry.options.hoverTilt ?? 0.045) : 0),
        duration: active ? 0.24 : 0.38,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
    if (!active) {
      gsap.to(object.position, { x: position.x, y: position.y, z: position.z, duration: 0.34, ease: "power2.out", overwrite: "auto" });
      gsap.to(object.rotation, { x: rotation.x, y: rotation.y, z: rotation.z, duration: 0.38, ease: "power2.out", overwrite: "auto" });
    }
  });
}

function animateKeyboardKeys(root) {
  const keys = [];
  root.traverse((object) => {
    if (object.isMesh && /(Key|White|Black)/i.test(object.name)) keys.push(object);
  });
  keys.slice(0, 28).forEach((key, index) => {
    const baseY = key.userData.interactionBaseY ?? key.position.y;
    key.userData.interactionBaseY = baseY;
    gsap.timeline({ delay: (index % 14) * 0.018 })
      .to(key.position, { y: baseY - 0.035, duration: 0.07, ease: "power1.in" })
      .to(key.position, { y: baseY, duration: 0.13, ease: "back.out(2)" });
  });
}

function playRoomInteraction(entry) {
  if (!entry || reducedMotion) return;
  if (entry.effect === "keys") {
    entry.states.forEach(({ object }) => animateKeyboardKeys(object));
    return;
  }

  entry.states.forEach((state, index) => {
    const { object, position, rotation, scale } = state;
    gsap.killTweensOf(object.position);
    gsap.killTweensOf(object.rotation);
    gsap.killTweensOf(object.scale);
    const timeline = gsap.timeline({ delay: index * 0.018, defaults: { overwrite: "auto" } });

    if (entry.effect === "swing") {
      const swingAmount = entry.options.swingAmount ?? 0.14;
      timeline
        .to(object.rotation, { z: rotation.z + swingAmount, duration: 0.18, ease: "power2.out" })
        .to(object.rotation, { z: rotation.z - swingAmount * 0.78, duration: 0.22, ease: "power2.inOut" })
        .to(object.rotation, { z: rotation.z + swingAmount * 0.42, duration: 0.18, ease: "power2.inOut" })
        .to(object.rotation, { z: rotation.z, duration: 0.34, ease: "elastic.out(1, .38)" });
    } else if (entry.effect === "wiggle" || entry.effect === "plant" || entry.effect === "sway") {
      const wiggleAmount = entry.options.wiggleAmount ?? 0.09;
      timeline
        .to(object.rotation, { z: rotation.z - wiggleAmount, duration: 0.11, ease: "power1.out" })
        .to(object.rotation, { z: rotation.z + wiggleAmount * 0.92, duration: 0.14, ease: "power1.inOut" })
        .to(object.rotation, { z: rotation.z - wiggleAmount * 0.42, duration: 0.12, ease: "power1.inOut" })
        .to(object.rotation, { z: rotation.z, duration: 0.28, ease: "elastic.out(1, .38)" });
    } else if (entry.effect === "turn") {
      const turnAmount = entry.options.turnAmount ?? 0.22;
      timeline
        .to(object.position, { y: position.y + 0.045, duration: 0.12, ease: "power2.out" })
        .to(object.rotation, { y: rotation.y + turnAmount, duration: 0.82, ease: "power2.inOut" }, "<")
        .to(object.position, { y: position.y, duration: 0.18, ease: "bounce.out" }, "-=0.16")
        .set(object.rotation, { y: rotation.y });
    } else if (entry.effect === "shake") {
      timeline
        .to(object.position, { x: position.x - 0.07, duration: 0.08 })
        .to(object.position, { x: position.x + 0.07, duration: 0.10 })
        .to(object.position, { x: position.x, duration: 0.15, ease: "back.out(2)" });
    } else if (entry.effect === "pulse") {
      timeline
        .to(object.scale, { x: scale.x * 1.10, y: scale.y * 1.10, z: scale.z * 1.10, duration: 0.16, ease: "back.out(2)" })
        .to(object.scale, { x: scale.x, y: scale.y, z: scale.z, duration: 0.28, ease: "elastic.out(1, .45)" });
    } else {
      const jump = entry.options.jump ?? 0.14;
      const bounceScale = entry.options.bounceScale ?? 1.035;
      timeline
        .to(object.scale, { x: scale.x * 1.08, y: scale.y * 0.92, z: scale.z * 1.08, duration: 0.10, ease: "power2.in" })
        .to(object.position, { y: position.y + jump, duration: 0.20, ease: "power3.out" })
        .to(object.scale, { x: scale.x * bounceScale, y: scale.y * bounceScale, z: scale.z * bounceScale, duration: 0.18, ease: "back.out(2)" }, "<")
        .to(object.position, { y: position.y, duration: 0.30, ease: "bounce.out" })
        .to(object.scale, { x: scale.x, y: scale.y, z: scale.z, duration: 0.24, ease: "elastic.out(1, .42)" }, "<");
    }
  });
}

function collectNamedObjects(root, prefixes) {
  const matches = [];
  root.traverse((object) => {
    if (prefixes.some((prefix) => object.name.startsWith(prefix))) matches.push(object);
  });
  return matches;
}

function registerRoomInteractions(room) {
  const namedEffects = [
    ["Cabinet_Blink_Bear_Root", "bounce", { jump: 0.30, bounceScale: 1.075 }],
    ["Cabinet_Bow_Duck_Root", "wiggle", { wiggleAmount: 0.20, hoverScale: 1.04 }],
    ["Cabinet_Blink_Bunny_Root", "bounce", { jump: 0.32, bounceScale: 1.075 }],
    ["Cabinet_Bunny_Blink_Root", "sway", { wiggleAmount: 0.18, hoverScale: 1.04 }],
    ["DaBu_Root", "wiggle", { hoverScale: 1.04, wiggleAmount: 0.19 }],
    ["Sill_Rabbit_Root", "bounce", { jump: 0.28, bounceScale: 1.07 }],
    ["Sill_Carrot_Root", "wiggle", { wiggleAmount: 0.20, hoverScale: 1.05 }],
    ["Desk_Right_Plant_Root", "plant"],
    ["Chair_Group_Scale", "turn", { hoverScale: 1.025, turnAmount: Math.PI * 2 }],
    ["Keyboard_Group_Scale", "keys", { hoverScale: 1.015 }],
    ["Record_Player_Group_Scale", "pulse", { hoverScale: 1.02 }],
    ["Curtain_Group_Scale", "sway", { hoverScale: 1.012, hoverTilt: 0.018 }],
    ["Contact_Mailbox_Group_Scale", "bounce", { jump: 0.09 }],
    ["Contact_Mailbox_Root", "bounce", { jump: 0.09 }],
    ["Wall_Receipt_Printer_Root", "shake", { hoverScale: 1.025 }],
    ["WallCalendar_BunnyAugust", "pulse", { hoverScale: 1.025 }],
    ["WallPocketOrganizer_Lavender", "sway", { hoverScale: 1.025, hoverTilt: 0.025 }],
    ["CreamArchedWallMirror", "pulse", { hoverScale: 1.018 }],
    ["TeaTable_OpalOrbLamp", "pulse", { hoverScale: 1.06 }],
    ["Lavender_Gingham_Sofa_Root", "pulse", { hoverScale: 1.018 }],
  ];
  namedEffects.forEach(([name, effect, options]) => registerRoomInteraction(room.getObjectByName(name), effect, options));

  registerRoomInteraction(collectNamedObjects(room, ["Computer_Monitor_"]), "pulse", { hoverScale: 1.018 });
  registerRoomInteraction(collectNamedObjects(room, ["Computer_Keyboard_"]), "keys", { hoverScale: 1.018 });
  registerRoomInteraction(collectNamedObjects(room, ["Computer_Mouse", "Computer_Mouse_Pad"]), "shake", { hoverScale: 1.035 });
  registerRoomInteraction(collectNamedObjects(room, ["Shelf_Alarm_"]), "wiggle", { hoverScale: 1.035 });
  registerRoomInteraction(collectNamedObjects(room, ["Shelf_Succulent_"]), "plant", { hoverScale: 1.04 });
  registerRoomInteraction(collectNamedObjects(room, ["Shelf_Leafy_"]), "plant", { hoverScale: 1.04 });
  registerRoomInteraction(collectNamedObjects(room, ["Cake_"]), "bounce", { jump: 0.07, hoverScale: 1.04 });
  registerRoomInteraction(collectNamedObjects(room, ["Macaron_"]), "wiggle", { hoverScale: 1.04 });
  registerRoomInteraction(collectNamedObjects(room, ["Milk_Tea_"]), "sway", { hoverScale: 1.035, hoverTilt: 0.03 });
  registerRoomInteraction(collectNamedObjects(room, ["Left_Cabinet_Book_"]), "bounce", { jump: 0.06, hoverScale: 1.025 });

  room.traverse((object) => {
    if (/^PhotoWall_Photo_/.test(object.name)) registerRoomInteraction(object, "pulse", { hoverScale: 1.06 });
    if (/^PhotoWall_(Note|Sticker)_/.test(object.name)) registerRoomInteraction(object, "wiggle", { hoverScale: 1.08 });
    if (/^StarLight_Star_|^StarLights_BackStar_/.test(object.name)) registerRoomInteraction(object, "pulse", { hoverScale: 1.16 });
  });
}

function createPhotoWall(room) {
  const wallGroup = new THREE.Group();
  wallGroup.name = "RealPhotoWallAndStarLights";
  // The room model comes from Blender (Z-up). Convert these carefully placed
  // Blender-style wall coordinates to Three.js' Y-up coordinates as one unit.
  wallGroup.rotation.x = -Math.PI / 2;

  const wireMaterial = new THREE.MeshStandardMaterial({ color: 0xb18365, roughness: 0.7, metalness: 0.08 });
  const topWirePoints = [
    new THREE.Vector3(-8.70, -8.34, 6.31),
    new THREE.Vector3(-8.70, -6.32, 5.75),
    new THREE.Vector3(-8.70, -4.30, 6.29),
    new THREE.Vector3(-8.70, -2.27, 5.72),
    new THREE.Vector3(-8.70, -0.24, 6.27),
    new THREE.Vector3(-8.70, 1.77, 5.76),
    new THREE.Vector3(-8.70, 3.78, 6.22),
  ];
  const topWireCurve = new THREE.CatmullRomCurve3(topWirePoints);
  const topWire = new THREE.Mesh(new THREE.TubeGeometry(topWireCurve, 90, 0.024, 8, false), wireMaterial);
  topWire.name = "StarLight_WarmWire";
  topWire.castShadow = true;
  wallGroup.add(topWire);

  const glowTexture = createGlowTexture();
  const starMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd77c,
    emissive: 0xffad42,
    emissiveIntensity: 1.55,
    roughness: 0.28,
    metalness: 0.06,
  });
  starLightMaterials.push(starMaterial);
  const socketMaterial = new THREE.MeshStandardMaterial({ color: 0xb98258, roughness: 0.64, metalness: 0.12 });
  const starGeometry = new THREE.ExtrudeGeometry(createStarShape(), { depth: 0.045, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.018, bevelThickness: 0.014 });
  const starBasis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(1, 0, 0),
  );

  for (let index = 0; index < 14; index += 1) {
    const position = topWireCurve.getPoint(index / 13);
    const starZ = position.z - 0.18;

    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.066, 0.13, 14), socketMaterial);
    socket.rotation.z = Math.PI / 2;
    socket.position.set(-8.64, position.y, position.z - 0.055);
    socket.castShadow = true;
    wallGroup.add(socket);

    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.name = `StarLight_Star_${index + 1}`;
    star.setRotationFromMatrix(starBasis);
    star.rotation.x += index % 2 ? 0.08 : -0.06;
    star.position.set(-8.59, position.y, starZ);
    star.castShadow = true;
    wallGroup.add(star);

    const glowMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0xffc45f, transparent: true, opacity: 0.34, depthWrite: false, blending: THREE.AdditiveBlending });
    const glow = new THREE.Sprite(glowMaterial);
    glow.position.set(-8.48, position.y, starZ);
    glow.scale.set(0.62, 0.62, 0.62);
    glow.userData.baseOpacity = 0.26 + (index % 3) * 0.025;
    glow.userData.phase = index * 0.71;
    starGlows.push(glow);
    wallGroup.add(glow);

    if (index === 3 || index === 7 || index === 11) {
      const starLight = new THREE.PointLight(0xffbd66, 1.05, 3.0, 2);
      starLight.position.set(-8.18, position.y, starZ - 0.03);
      starLight.userData.dayIntensity = 1.05;
      starPointLights.push(starLight);
      wallGroup.add(starLight);
    }
  }

  const featureStarGeometry = new THREE.ExtrudeGeometry(createStarOutlineShape(0.34, 0.22), { depth: 0.05, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.015, bevelThickness: 0.012 });
  const featureStarMaterial = new THREE.MeshStandardMaterial({ color: 0xffcf68, emissive: 0xff9f2d, emissiveIntensity: 1.45, roughness: 0.3, metalness: 0.05 });
  starLightMaterials.push(featureStarMaterial);
  const featureStar = new THREE.Mesh(featureStarGeometry, featureStarMaterial);
  featureStar.name = "StarLight_Star_Feature";
  featureStar.setRotationFromMatrix(starBasis);
  featureStar.position.set(-8.56, -2.10, 5.91);
  featureStar.castShadow = true;
  wallGroup.add(featureStar);
  const featureGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xffbd58, transparent: true, opacity: 0.72, depthWrite: false, blending: THREE.AdditiveBlending }));
  featureGlow.position.set(-8.43, -2.10, 5.91);
  featureGlow.scale.set(0.92, 0.92, 0.92);
  featureGlow.userData.baseOpacity = 0.22;
  featureGlow.userData.phase = 2.4;
  starGlows.push(featureGlow);
  wallGroup.add(featureGlow);

  const cardMaterials = [
    0xfff8f0,
    0xf7e2e9,
    0xe8def2,
    0xf7edcf,
    0xdcebe6,
    0xe0eaf2,
  ].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.76, metalness: 0.0 }));
  const cardEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0xe8dcd7, roughness: 0.82, metalness: 0.0 });
  const tapeMaterials = [0xeeb8c8, 0xc8b8e2, 0xe8c789, 0xaccfc2].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, transparent: true, opacity: 0.9 }));
  const stickerMaterials = [0xf2a9bd, 0xf3cd70, 0x9dcdbd, 0xb9a6df].map((color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  const photoLoader = new THREE.TextureLoader();
  const photoReadyPromises = [];
  let settledPhotoCount = 0;
  const settlePhoto = () => {
    settledPhotoCount += 1;
    updateCriticalAssetProgress("photoWall", settledPhotoCount / PHOTO_WALL_ITEMS.length);
  };
  const photoLayouts = [
    { y: -5.10, z: 5.35, width: 0.56 }, { y: -4.98, z: 4.45, width: 0.40 },
    { y: -4.25, z: 5.18, width: 0.54 }, { y: -4.16, z: 4.30, width: 0.43 },
    { y: -3.48, z: 5.40, width: 0.58 }, { y: -3.43, z: 4.43, width: 0.42 },
    { y: -2.68, z: 5.19, width: 0.57 }, { y: -2.68, z: 4.28, width: 0.41 },
    { y: -1.93, z: 5.41, width: 0.43 }, { y: -1.93, z: 4.42, width: 0.43 },
    { y: -1.18, z: 5.16, width: 0.42 }, { y: -1.18, z: 4.20, width: 0.44 },
    { y: -0.43, z: 5.39, width: 0.43 }, { y: -0.43, z: 4.36, width: 0.43 },
    { y: 0.32, z: 5.14, width: 0.38 }, { y: 0.32, z: 4.15, width: 0.42 },
    { y: 1.07, z: 5.39, width: 0.42 }, { y: 1.10, z: 4.49, width: 0.58 },
    { y: 1.76, z: 5.02, width: 0.41 },
  ];
  photoLayouts.forEach((layout) => {
    layout.y = (layout.y + 1.68) * 1.08 - 1.68;
  });
  const photoAspects = [
    1080 / 810, 810 / 1440, 1706 / 1280, 1280 / 1707, 1706 / 1279, 1080 / 1441,
    1702 / 1276, 1080 / 1440, 1280 / 1707, 1280 / 1707, 1280 / 1707, 1080 / 1319,
    1322 / 1762, 1280 / 1707, 960 / 1708, 1280 / 1964, 1280 / 1707, 1707 / 1280,
    1080 / 1440,
  ];
  const tilts = [-0.035, 0.028, -0.018, 0.04, 0.015, -0.032, 0.026, -0.02, 0.036, -0.024, 0.016, -0.03, 0.026, -0.018, 0.034, -0.026, 0.015, -0.022, 0.028];

  PHOTO_WALL_ITEMS.forEach(([url, title], index) => {
    const thumbnailUrl = url.includes("placeholder") ? url : url.replace("/photos/", "/photos/thumbs/");
    const layout = photoLayouts[index];
    const photoWidth = layout.width;
    const photoHeight = photoWidth / photoAspects[index];
    const cardWidth = photoWidth + 0.085;
    const cardHeight = photoHeight + 0.15;
    const photoGroup = new THREE.Group();
    photoGroup.name = `PhotoWall_Photo_${String(index + 1).padStart(2, "0")}`;
    photoGroup.position.set(-8.76, layout.y, layout.z);
    photoGroup.rotation.x = tilts[index];
    photoGroup.userData.photoUrl = url;
    photoGroup.userData.photoTitle = title;

    const backingMaterial = cardMaterials[index % cardMaterials.length];
    const backing = new THREE.Mesh(new THREE.BoxGeometry(0.035, cardWidth, cardHeight), backingMaterial);
    backing.castShadow = true;
    backing.receiveShadow = true;
    photoGroup.add(backing);

    const tapeWidth = Math.min(0.28, cardWidth * 0.34);
    const firstTape = new THREE.Mesh(new THREE.BoxGeometry(0.025, tapeWidth, 0.085), tapeMaterials[index % tapeMaterials.length]);
    firstTape.position.set(0.064, (index % 2 ? -1 : 1) * cardWidth * 0.31, cardHeight * 0.43);
    firstTape.rotation.x = index % 2 ? 0.13 : -0.13;
    photoGroup.add(firstTape);

    if (index % 3 === 0 || index % 3 === 2) {
      const secondTape = new THREE.Mesh(new THREE.BoxGeometry(0.025, tapeWidth * 0.78, 0.072), tapeMaterials[(index + 2) % tapeMaterials.length]);
      secondTape.position.set(0.065, (index % 2 ? 1 : -1) * cardWidth * 0.33, -cardHeight * 0.43);
      secondTape.rotation.x = index % 2 ? -0.10 : 0.10;
      photoGroup.add(secondTape);
    } else {
      const stickerGeometry = index % 2 ? new THREE.CircleGeometry(0.068, 28) : new THREE.ShapeGeometry(createStarShape(0.075));
      const sticker = makeWallFacingPlane(stickerGeometry, stickerMaterials[index % stickerMaterials.length]);
      sticker.position.set(0.067, -cardWidth * 0.39, -cardHeight * 0.37);
      photoGroup.add(sticker);
    }

    photoReadyPromises.push(new Promise((resolve) => {
      photoLoader.load(
        thumbnailUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          const photoMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.FrontSide });
          const photo = makeWallFacingPlane(new THREE.PlaneGeometry(photoWidth, photoHeight), photoMaterial);
          photo.position.set(0.023, 0, 0.032);
          photo.castShadow = true;
          photoGroup.add(photo);
          settlePhoto();
          resolve();
        },
        undefined,
        (error) => {
          console.error(`Photo wall thumbnail failed to load: ${thumbnailUrl}`, error);
          settlePhoto();
          resolve();
        },
      );
    }));

    if (index % 2 === 0) {
      const captionBar = new THREE.Mesh(
        new RoundedBoxGeometry(0.022, Math.min(0.22, cardWidth * 0.38), 0.025, 2, 0.008),
        new THREE.MeshStandardMaterial({ color: index % 4 ? 0xd8b8cd : 0xc9b7df, roughness: 0.78, metalness: 0 }),
      );
      captionBar.position.set(0.067, 0, -cardHeight / 2 + 0.036);
      photoGroup.add(captionBar);
    }

    wallGroup.add(photoGroup);
  });

  const noteSpecs = [
    { y: -5.58, z: 4.84, width: 0.27, height: 0.27, shape: "circle", background: "#f2c4cf", foreground: "#9f6379", lines: ["♥"] },
    { y: -4.64, z: 4.92, width: 0.25, height: 0.25, shape: "circle", background: "#efd7a8", foreground: "#a36c50", lines: ["HI"] },
    { y: -3.86, z: 4.82, width: 0.25, height: 0.30, shape: "card", background: "#bcdacb", foreground: "#527d70", lines: ["20", "26"] },
    { y: -3.05, z: 4.76, width: 0.27, height: 0.27, shape: "circle", background: "#c9c0e5", foreground: "#745f96", lines: ["♡"] },
    { y: -2.28, z: 5.72, width: 0.24, height: 0.24, shape: "circle", background: "#f1c8a8", foreground: "#986a52", lines: ["♡"] },
    { y: -1.56, z: 4.87, width: 0.29, height: 0.28, shape: "card", background: "#b9d6e8", foreground: "#57778a", lines: ["LIFE"] },
    { y: -0.80, z: 4.78, width: 0.25, height: 0.25, shape: "circle", background: "#edc2d8", foreground: "#94627c", lines: ["♥"] },
    { y: -0.05, z: 5.76, width: 0.25, height: 0.25, shape: "circle", background: "#d8e6c9", foreground: "#667f57", lines: ["GO"] },
    { y: 0.70, z: 4.82, width: 0.26, height: 0.30, shape: "card", background: "#f0d3a4", foreground: "#986943", lines: ["2026"] },
    { y: 1.76, z: 4.30, width: 0.28, height: 0.28, shape: "circle", background: "#cbdced", foreground: "#5d7891", lines: ["✦"] },
  ];
  noteSpecs.forEach((spec) => {
    spec.y = (spec.y + 1.68) * 1.08 - 1.68;
  });

  noteSpecs.forEach((spec, index) => {
    const noteCanvas = document.createElement("canvas");
    noteCanvas.width = 256;
    noteCanvas.height = 320;
    const context = noteCanvas.getContext("2d");
    context.fillStyle = spec.background;
    context.fillRect(7, 7, 242, 306);
    if (spec.shape === "card") {
      context.strokeStyle = "rgba(255,255,255,.58)";
      context.lineWidth = 3;
      context.strokeRect(12, 12, 232, 296);
    }
    context.fillStyle = spec.foreground;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = spec.lines.length > 1 ? "700 46px sans-serif" : "700 54px sans-serif";
    spec.lines.forEach((line, lineIndex) => {
      const totalHeight = spec.lines.length * 56;
      context.fillText(line, 128, 160 - totalHeight / 2 + 28 + lineIndex * 56);
    });
    for (let dot = 0; dot < 4; dot += 1) {
      context.beginPath();
      context.arc(35 + dot * 62, 286, 5, 0, Math.PI * 2);
      context.fill();
    }
    const texture = new THREE.CanvasTexture(noteCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
    let noteGeometry;
    if (spec.shape === "circle") noteGeometry = new THREE.CircleGeometry(spec.width / 2, 40);
    else if (spec.shape === "flower") noteGeometry = new THREE.ShapeGeometry(createFlowerShape(spec.width / 2, index % 2 ? 6 : 7));
    else noteGeometry = new THREE.PlaneGeometry(spec.width, spec.height);
    const note = makeWallFacingPlane(noteGeometry, material);
    note.name = `PhotoWall_Note_${index + 1}`;
    note.position.set(-8.715, spec.y, spec.z);
    note.rotation.x += index % 2 ? 0.035 : -0.025;
    note.castShadow = false;
    wallGroup.add(note);

    if (spec.shape === "card") {
      const noteTape = new THREE.Mesh(new THREE.BoxGeometry(0.018, spec.width * 0.28, 0.052), tapeMaterials[(index + 1) % tapeMaterials.length]);
      noteTape.position.set(-8.67, spec.y, spec.z + spec.height * 0.46);
      noteTape.rotation.x = index % 2 ? 0.08 : -0.08;
      wallGroup.add(noteTape);
    } else {
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.026, 18, 12), stickerMaterials[(index + 1) % stickerMaterials.length]);
      pin.position.set(-8.64, spec.y, spec.z);
      wallGroup.add(pin);
    }
  });

  const looseStickerSpecs = [
    { y: -5.70, z: 4.02, shape: "heart", size: 0.10, color: 0xef9fb9 },
    { y: -4.72, z: 5.80, shape: "heart", size: 0.10, color: 0xe5bf83 },
    { y: -3.82, z: 3.82, shape: "dot", size: 0.075, color: 0xa8cdbd },
    { y: -2.94, z: 4.78, shape: "heart", size: 0.075, color: 0xc2addb },
    { y: -0.82, z: 4.86, shape: "dot", size: 0.085, color: 0xd8adc0 },
    { y: 0.05, z: 5.80, shape: "dot", size: 0.07, color: 0x9fc9db },
    { y: 0.82, z: 3.82, shape: "heart", size: 0.085, color: 0xe6bc72 },
    { y: 1.92, z: 5.68, shape: "heart", size: 0.10, color: 0xb7a9c4 },
  ];
  looseStickerSpecs.forEach((spec) => {
    spec.y = (spec.y + 1.68) * 1.08 - 1.68;
  });

  looseStickerSpecs.forEach((spec, index) => {
    let geometry;
    if (spec.shape === "heart") geometry = new THREE.ShapeGeometry(createHeartShape(spec.size));
    else if (spec.shape === "flower") geometry = new THREE.ShapeGeometry(createFlowerShape(spec.size, 6));
    else geometry = new THREE.CircleGeometry(spec.size, 28);
    const sticker = makeWallFacingPlane(
      geometry,
      new THREE.MeshBasicMaterial({ color: spec.color, toneMapped: false, side: THREE.DoubleSide }),
    );
    sticker.name = `PhotoWall_Sticker_${index + 1}`;
    sticker.position.set(-8.70, spec.y, spec.z);
    sticker.rotation.x += index % 2 ? 0.12 : -0.08;
    sticker.castShadow = false;
    wallGroup.add(sticker);
  });

  room.add(wallGroup);

  // Let the fairy lights turn the corner, like the reference: only a short,
  // airy continuation appears across the upper part of the back wall.
  const backWallLights = new THREE.Group();
  backWallLights.name = "StarLights_BackWall_Continuation";
  const backCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.48, 6.22, -3.76),
    new THREE.Vector3(-7.18, 5.92, -3.76),
    new THREE.Vector3(-5.84, 6.16, -3.76),
    new THREE.Vector3(-4.46, 5.88, -3.76),
  ]);
  const backWire = new THREE.Mesh(new THREE.TubeGeometry(backCurve, 50, 0.024, 8, false), wireMaterial);
  backWire.castShadow = true;
  backWallLights.add(backWire);

  for (let index = 0; index < 4; index += 1) {
    const position = backCurve.getPoint(index / 3);
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.name = `StarLights_BackStar_${index + 1}`;
    star.position.set(position.x, position.y - 0.18, -3.69);
    star.rotation.z = index % 2 ? 0.08 : -0.06;
    star.castShadow = true;
    backWallLights.add(star);

    const glowMaterial = new THREE.SpriteMaterial({ map: glowTexture, color: 0xffc45f, transparent: true, opacity: 0.30, depthWrite: false, blending: THREE.AdditiveBlending });
    const glow = new THREE.Sprite(glowMaterial);
    glow.position.set(position.x, position.y - 0.18, -3.58);
    glow.scale.set(0.64, 0.64, 0.64);
    glow.userData.baseOpacity = 0.24 + index * 0.015;
    glow.userData.phase = 5.2 + index * 0.8;
    starGlows.push(glow);
    backWallLights.add(glow);
  }
  const cornerLight = new THREE.PointLight(0xffbd66, 1.0, 3.4, 2);
  cornerLight.position.set(-7.0, 5.95, -3.35);
  cornerLight.userData.dayIntensity = 1.0;
  starPointLights.push(cornerLight);
  backWallLights.add(cornerLight);
  room.add(backWallLights);

  const cornerConnectorCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.70, 6.22, -3.78),
    new THREE.Vector3(-8.61, 6.24, -3.75),
    new THREE.Vector3(-8.48, 6.22, -3.76),
  ]);
  const cornerConnector = new THREE.Mesh(new THREE.TubeGeometry(cornerConnectorCurve, 18, 0.024, 8, false), wireMaterial);
  cornerConnector.name = "StarLights_ConnectedCorner";
  cornerConnector.castShadow = true;
  room.add(cornerConnector);

  return Promise.all(photoReadyPromises);
}

function createWallBallRack(room) {
  const rack = new THREE.Group();
  rack.name = "FiveColorBallWallRack";

  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0xdca56c,
    roughness: 0.56,
    metalness: 0.02,
  });
  const woodEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0xb97849,
    roughness: 0.58,
    metalness: 0.03,
  });
  const hookMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9a56b,
    roughness: 0.32,
    metalness: 0.5,
  });
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(4.55, 0.40, 0.18),
    [woodMaterial, woodEdgeMaterial, woodEdgeMaterial, woodEdgeMaterial, woodMaterial, woodMaterial],
  );
  board.position.set(-6.20, 5.14, -3.55);
  board.castShadow = true;
  board.receiveShadow = true;
  rack.add(board);

  const upperTrim = new THREE.Mesh(new THREE.BoxGeometry(4.72, 0.08, 0.21), woodEdgeMaterial);
  upperTrim.position.set(-6.20, 5.38, -3.44);
  upperTrim.castShadow = true;
  rack.add(upperTrim);

  const ballSpecs = [
    ["/models/hanging-ball-pink.glb", -8.00],
    ["/models/hanging-ball-red.glb", -7.10],
    ["/models/hanging-ball-yellow.glb", -6.20],
    ["/models/hanging-ball-blue.glb", -5.30],
    ["/models/hanging-ball-green.glb", -4.40],
  ];

  ballSpecs.forEach(([url, x], index) => {
    const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.10, 24), hookMaterial);
    mount.rotation.x = Math.PI / 2;
    mount.position.set(x, 5.13, -3.38);
    mount.castShadow = true;
    rack.add(mount);

    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.048, 0.34, 16), hookMaterial);
    peg.rotation.x = Math.PI / 2;
    peg.position.set(x, 5.05, -3.17);
    peg.castShadow = true;
    rack.add(peg);

    const hookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 5.05, -2.99),
      new THREE.Vector3(x, 5.01, -2.91),
      new THREE.Vector3(x, 4.97, -2.91),
      new THREE.Vector3(x, 4.95, -2.98),
    ]);
    const hook = new THREE.Mesh(new THREE.TubeGeometry(hookCurve, 22, 0.03, 10, false), hookMaterial);
    hook.castShadow = true;
    rack.add(hook);

    loader.load(
      `${url}?revision=20260823-corrected-ball-rack`,
      (gltf) => {
        const ball = gltf.scene;
        ball.name = `WallRack_ColorBall_${index + 1}`;
        ball.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            if (!material) return;
            material.color?.setHex(0xffffff);
            material.envMapIntensity = 0.5;
            material.metalness = 0;
            material.roughness = 0.56;
            material.toneMapped = false;
            if (material.map) {
              material.map.colorSpace = THREE.SRGBColorSpace;
              material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
              material.map.needsUpdate = true;
            }
            material.needsUpdate = true;
          });
        });

        // The source assets already face forward. Keeping their original
        // orientation preserves every facial detail instead of showing an edge.
        ball.rotation.y = 0;
        ball.updateMatrixWorld(true);
        const rawBounds = new THREE.Box3().setFromObject(ball);
        const rawSize = rawBounds.getSize(new THREE.Vector3());
        // All five source models share the same normalized height. Scaling by
        // that common height keeps the balls, chains and facial details at one
        // consistent visual size instead of letting their different widths
        // create five slightly different total heights.
        const targetHeight = 1.76;
        const uniformScale = targetHeight / Math.max(rawSize.y, 0.001);
        ball.scale.setScalar(uniformScale);
        ball.updateMatrixWorld(true);

        const scaledBounds = new THREE.Box3().setFromObject(ball);
        const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
        ball.position.set(
          x - scaledCenter.x,
          4.05 - scaledCenter.y,
          -2.98 - scaledCenter.z,
        );
        rack.add(ball);
        registerRoomInteraction(ball, "swing", {
          hoverScale: 1.05,
          hoverTilt: index % 2 ? 0.075 : -0.075,
          swingAmount: 0.30,
        });
      },
      undefined,
      (error) => console.error(`Color ball failed to load: ${url}`, error),
    );
  });

  room.add(rack);
}

function createCalendarTexture() {
  const calendarCanvas = document.createElement("canvas");
  calendarCanvas.width = 768;
  calendarCanvas.height = 860;
  const context = calendarCanvas.getContext("2d");

  context.fillStyle = "#fffaf5";
  context.fillRect(0, 0, calendarCanvas.width, calendarCanvas.height);
  const paperGlow = context.createLinearGradient(0, 0, 768, 860);
  paperGlow.addColorStop(0, "rgba(255,255,255,.82)");
  paperGlow.addColorStop(1, "rgba(242,224,235,.42)");
  context.fillStyle = paperGlow;
  context.fillRect(18, 18, 732, 824);

  context.fillStyle = "#8c6f92";
  context.textAlign = "center";
  context.font = "700 58px 'Microsoft YaHei', sans-serif";
  context.fillText("八月", 384, 98);
  context.fillStyle = "#c08ba4";
  context.font = "600 26px sans-serif";
  context.fillText("2026 · AUGUST", 384, 140);

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const gridLeft = 66;
  const gridTop = 206;
  const cellWidth = 91;
  const cellHeight = 92;
  context.font = "700 25px 'Microsoft YaHei', sans-serif";
  weekDays.forEach((day, index) => {
    context.fillStyle = index === 0 || index === 6 ? "#d18ca9" : "#8f8197";
    context.fillText(day, gridLeft + index * cellWidth + cellWidth / 2, 184);
  });

  context.lineWidth = 2;
  context.strokeStyle = "rgba(176,147,180,.25)";
  for (let row = 0; row <= 5; row += 1) {
    context.beginPath();
    context.moveTo(gridLeft, gridTop + row * cellHeight);
    context.lineTo(gridLeft + cellWidth * 7, gridTop + row * cellHeight);
    context.stroke();
  }
  for (let column = 0; column <= 7; column += 1) {
    context.beginPath();
    context.moveTo(gridLeft + column * cellWidth, gridTop);
    context.lineTo(gridLeft + column * cellWidth, gridTop + cellHeight * 5);
    context.stroke();
  }

  context.font = "600 25px sans-serif";
  const firstWeekday = 6;
  for (let day = 1; day <= 31; day += 1) {
    const slot = firstWeekday + day - 1;
    const column = slot % 7;
    const row = Math.floor(slot / 7);
    const x = gridLeft + column * cellWidth + cellWidth / 2;
    const y = gridTop + row * cellHeight + 56;
    if (day === 24) {
      context.fillStyle = "rgba(235,158,185,.34)";
      context.beginPath();
      context.arc(x, y - 8, 27, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = column === 0 || column === 6 ? "#c783a0" : "#746678";
    context.fillText(String(day), x, y);
  }

  context.fillStyle = "#d696ad";
  context.font = "700 28px sans-serif";
  context.fillText("♡  TODAY IS A GOOD DAY  ♡", 384, 790);

  const texture = new THREE.CanvasTexture(calendarCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function createWallCalendarAndPocket(room) {
  const lavenderFabric = new THREE.MeshStandardMaterial({ color: 0xb9abbf, roughness: 0.91, metalness: 0 });
  const lavenderEdge = new THREE.MeshStandardMaterial({ color: 0x8e7e94, roughness: 0.76, metalness: 0 });
  const cream = new THREE.MeshPhysicalMaterial({ color: 0xfff6ed, roughness: 0.30, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.28 });
  const blush = new THREE.MeshStandardMaterial({ color: 0xe9a9bd, roughness: 0.68, metalness: 0 });
  const warmMetal = new THREE.MeshStandardMaterial({ color: 0xc69b70, roughness: 0.32, metalness: 0.58 });

  const calendar = new THREE.Group();
  calendar.name = "WallCalendar_BunnyAugust";
  calendar.position.set(-8.54, 4.55, 6.25);
  calendar.rotation.y = Math.PI / 2;
  calendar.scale.setScalar(0.66);

  const calendarBoard = new THREE.Mesh(new RoundedBoxGeometry(1.34, 1.62, 0.12, 5, 0.10), lavenderFabric);
  calendarBoard.castShadow = true;
  calendarBoard.receiveShadow = true;
  calendar.add(calendarBoard);

  const paper = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 1.20),
    new THREE.MeshStandardMaterial({ map: createCalendarTexture(), roughness: 0.82, metalness: 0 }),
  );
  paper.position.set(0, -0.10, 0.071);
  calendar.add(paper);

  [-0.38, 0, 0.38].forEach((x) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 10, 28), warmMetal);
    ring.position.set(x, 0.71, 0.10);
    ring.castShadow = true;
    calendar.add(ring);
  });

  const bunnyHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 20), cream);
  bunnyHead.scale.set(1.05, 0.92, 0.72);
  bunnyHead.position.set(0.05, 0.88, 0.10);
  bunnyHead.castShadow = true;
  calendar.add(bunnyHead);
  [-0.075, 0.075].forEach((x) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 22, 16), cream);
    ear.scale.set(0.65, 1.8, 0.55);
    ear.position.set(0.05 + x, 1.08, 0.09);
    ear.castShadow = true;
    calendar.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), lavenderEdge);
    eye.position.set(0.05 + x * 0.58, 0.90, 0.225);
    calendar.add(eye);
  });
  const bunnyNose = new THREE.Mesh(new THREE.SphereGeometry(0.019, 12, 10), blush);
  bunnyNose.position.set(0.05, 0.85, 0.232);
  calendar.add(bunnyNose);

  const miniFlower = new THREE.Mesh(
    new THREE.ShapeGeometry(createHeartShape(0.105)),
    new THREE.MeshBasicMaterial({ color: 0xeea6bd, toneMapped: false, side: THREE.DoubleSide }),
  );
  miniFlower.position.set(0.48, 0.70, 0.142);
  calendar.add(miniFlower);
  room.add(calendar);

  const organizer = new THREE.Group();
  organizer.name = "WallPocketOrganizer_Lavender";
  organizer.position.set(-6.64, 1.78, -3.66);

  const organizerBack = new THREE.Mesh(new RoundedBoxGeometry(1.24, 1.46, 0.09, 5, 0.11), lavenderFabric);
  organizerBack.castShadow = true;
  organizerBack.receiveShadow = true;
  organizer.add(organizerBack);

  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.26, 0.69, 0.04),
    new THREE.Vector3(-0.22, 0.94, 0.05),
    new THREE.Vector3(0, 1.04, 0.05),
    new THREE.Vector3(0.22, 0.94, 0.05),
    new THREE.Vector3(0.26, 0.69, 0.04),
  ]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 42, 0.025, 10, false), lavenderEdge);
  handle.castShadow = true;
  organizer.add(handle);

  const pocket = new THREE.Mesh(new RoundedBoxGeometry(1.04, 0.70, 0.24, 6, 0.12), lavenderFabric);
  pocket.position.set(0, -0.34, 0.12);
  pocket.castShadow = true;
  organizer.add(pocket);

  const pocketLip = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.065, 0.27, 4, 0.024), lavenderEdge);
  pocketLip.position.set(0, 0.01, 0.15);
  organizer.add(pocketLip);

  [-0.43, 0.43].forEach((x) => {
    const stitch = new THREE.Mesh(new RoundedBoxGeometry(0.018, 0.54, 0.012, 2, 0.006), cream);
    stitch.position.set(x, -0.34, 0.252);
    organizer.add(stitch);
  });

  const notebook = new THREE.Mesh(new RoundedBoxGeometry(0.43, 0.60, 0.08, 4, 0.045), cream);
  notebook.position.set(-0.23, 0.19, 0.12);
  notebook.rotation.z = -0.05;
  notebook.castShadow = true;
  organizer.add(notebook);
  const notebookLabel = new THREE.Mesh(new THREE.ShapeGeometry(createHeartShape(0.075)), blush);
  notebookLabel.position.set(-0.23, 0.19, 0.168);
  organizer.add(notebookLabel);

  const penColors = [0xe7a3bd, 0x9cbcd7, 0xe7c16f];
  penColors.forEach((color, index) => {
    const pen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.66 - index * 0.035, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.04 }),
    );
    pen.position.set(0.14 + index * 0.12, 0.22 + index * 0.018, 0.16);
    pen.rotation.z = -0.04 + index * 0.08;
    pen.castShadow = true;
    organizer.add(pen);
    const penTop = new THREE.Mesh(new THREE.SphereGeometry(0.047, 16, 12), index === 0 ? blush : cream);
    penTop.position.set(0.14 + index * 0.12, 0.57 - index * 0.018, 0.16);
    organizer.add(penTop);
  });

  const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.065, 18, 14), cream);
  bowCenter.position.set(0, -0.40, 0.265);
  organizer.add(bowCenter);
  [-1, 1].forEach((side) => {
    const bowWing = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), cream);
    bowWing.scale.set(1.25, 0.72, 0.38);
    bowWing.position.set(side * 0.12, -0.40, 0.263);
    bowWing.rotation.z = side * 0.26;
    organizer.add(bowWing);
  });

  room.add(organizer);
}

function createTeaTableOrbLamp(room) {
  const tableTop = room.getObjectByName("Tea_Table_Top");
  if (!tableTop) return;

  room.updateMatrixWorld(true);
  const tableBounds = new THREE.Box3().setFromObject(tableTop);
  const tableCenter = tableBounds.getCenter(new THREE.Vector3());
  const tableSize = tableBounds.getSize(new THREE.Vector3());
  const lamp = new THREE.Group();
  lamp.name = "TeaTable_OpalOrbLamp";
  // Keep the lamp on the front-left empty quarter of the table, outside the
  // cake / macarons / milk-tea triangle instead of planting it in the middle.
  lamp.position.set(
    tableCenter.x - tableSize.x * 0.24,
    tableBounds.max.y + 0.025,
    tableCenter.z + tableSize.z * 0.22,
  );

  const brass = new THREE.MeshStandardMaterial({ color: 0xc49a62, roughness: 0.26, metalness: 0.66 });
  const creamBase = new THREE.MeshPhysicalMaterial({
    color: 0xf2dfd6,
    roughness: 0.24,
    metalness: 0,
    clearcoat: 0.78,
    clearcoatRoughness: 0.20,
  });
  const opalGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffead8,
    emissive: 0xffb66b,
    emissiveIntensity: 0.10,
    roughness: 0.18,
    metalness: 0,
    transmission: 0.66,
    transparent: true,
    opacity: 0.90,
    thickness: 0.24,
    ior: 1.42,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
  });
  const innerGlow = new THREE.MeshStandardMaterial({
    color: 0xffd99b,
    emissive: 0xffa34f,
    emissiveIntensity: 0.08,
    roughness: 0.26,
    transparent: true,
    opacity: 0.72,
  });
  teaTableLampMaterials.push(opalGlass, innerGlow);

  const baseShadow = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.245, 0.055, 48), brass);
  baseShadow.position.y = 0.028;
  baseShadow.castShadow = true;
  lamp.add(baseShadow);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.105, 48), creamBase);
  base.position.y = 0.09;
  base.castShadow = true;
  base.receiveShadow = true;
  lamp.add(base);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.082, 0.40, 32), brass);
  pedestal.position.y = 0.325;
  pedestal.castShadow = true;
  lamp.add(pedestal);

  const lowerCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.075, 0.07, 32), brass);
  lowerCollar.position.y = 0.535;
  lowerCollar.castShadow = true;
  lamp.add(lowerCollar);

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.255, 48, 32), opalGlass);
  orb.scale.y = 1.04;
  orb.position.y = 0.78;
  orb.castShadow = true;
  lamp.add(orb);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.135, 32, 24), innerGlow);
  core.position.y = 0.78;
  lamp.add(core);

  const orbSeat = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.014, 10, 44), brass);
  orbSeat.rotation.x = Math.PI / 2;
  orbSeat.position.y = 0.56;
  orbSeat.castShadow = true;
  lamp.add(orbSeat);

  teaTableLampLight = new THREE.PointLight(0xffb765, 0, 2.35, 2);
  teaTableLampLight.position.set(0, 0.80, 0);
  lamp.add(teaTableLampLight);

  room.add(lamp);
}

function createImportedTeaTableLamp(room) {
  const tableTop = room.getObjectByName("Tea_Table_Top");
  if (!tableTop) {
    updateCriticalAssetProgress("teaTableLamp", 1);
    return Promise.resolve();
  }
  room.updateMatrixWorld(true);
  const tableBounds = new THREE.Box3().setFromObject(tableTop);
  const tableCenter = tableBounds.getCenter(new THREE.Vector3());
  const tableSize = tableBounds.getSize(new THREE.Vector3());

  const lamp = new THREE.Group();
  lamp.name = "TeaTable_OpalOrbLamp";
  lamp.position.set(
    tableCenter.x - tableSize.x * 0.26,
    tableBounds.max.y + 0.02,
    tableCenter.z + tableSize.z * 0.10,
  );
  lamp.rotation.y = -0.30;

  const warmGlow = new THREE.MeshStandardMaterial({
    color: 0xffdfaa,
    emissive: 0xffa04c,
    emissiveIntensity: 0.08,
    roughness: 0.30,
    transparent: true,
    opacity: 0.78,
  });
  teaTableLampMaterials.push(warmGlow);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 24, 18), warmGlow);
  bulb.name = "Imported_Tea_Lamp_Warm_Bulb";
  bulb.position.y = 0.72;
  lamp.add(bulb);

  teaTableLampLight = new THREE.PointLight(0xffb765, 0, 2.35, 2);
  teaTableLampLight.position.set(0, 0.72, 0);
  lamp.add(teaTableLampLight);
  room.add(lamp);

  return loadCriticalGLTF(
    "teaTableLamp",
    "/models/tea-table-lamp.glb?revision=20260825-replacement",
    (gltf) => {
      const lampModel = gltf.scene;
      lampModel.name = "Imported_Tea_Table_Lamp_Model";
      prepareDecorModel(lampModel, true);
      lampModel.updateMatrixWorld(true);
      const rawBounds = new THREE.Box3().setFromObject(lampModel);
      const rawSize = rawBounds.getSize(new THREE.Vector3());
      lampModel.scale.setScalar(1.08 / Math.max(rawSize.y, 0.001));
      lampModel.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(lampModel);
      const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
      lampModel.position.set(-scaledCenter.x, -scaledBounds.min.y, -scaledCenter.z);
      lamp.add(lampModel);
    },
    "Tea table lamp failed to load",
  );
}

function createMusicNoteTexture(symbol, color) {
  const noteCanvas = document.createElement("canvas");
  noteCanvas.width = 160;
  noteCanvas.height = 160;
  const context = noteCanvas.getContext("2d");
  context.shadowColor = color;
  context.shadowBlur = 16;
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 104px Georgia, serif";
  context.fillText(symbol, 80, 82);
  const texture = new THREE.CanvasTexture(noteCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createRecordPlayerMusicEffects(room) {
  const recordPlayer = room.getObjectByName("Record_Player_Group_Scale");
  if (!recordPlayer) return;
  room.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(recordPlayer);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());

  const disc = new THREE.Group();
  disc.name = "Record_Player_Music_Disc";
  disc.userData.recordPlayerMusicControl = true;
  disc.position.set(
    center.x - size.x * 0.018,
    bounds.min.y + size.y * 0.905,
    center.z + size.z * 0.02,
  );

  const vinylMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x17131c,
    roughness: 0.28,
    metalness: 0.10,
    clearcoat: 0.64,
    clearcoatRoughness: 0.22,
  });
  const vinyl = new THREE.Mesh(
    new THREE.CylinderGeometry(size.x * 0.25, size.x * 0.25, 0.036, 72),
    vinylMaterial,
  );
  vinyl.castShadow = true;
  vinyl.userData.recordPlayerMusicControl = true;
  disc.add(vinyl);

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(size.x * 0.072, size.x * 0.072, 0.037, 48),
    new THREE.MeshStandardMaterial({ color: 0xd8a8c6, roughness: 0.52, metalness: 0 }),
  );
  label.position.y = 0.018;
  label.userData.recordPlayerMusicControl = true;
  disc.add(label);

  [0.13, 0.18, 0.225].forEach((ratio) => {
    const groove = new THREE.Mesh(
      new THREE.TorusGeometry(size.x * ratio, 0.004, 6, 72),
      new THREE.MeshStandardMaterial({ color: 0x635669, roughness: 0.34, metalness: 0.18 }),
    );
    groove.rotation.x = Math.PI / 2;
    groove.position.y = 0.037;
    groove.userData.recordPlayerMusicControl = true;
    disc.add(groove);
  });

  const rotationMarker = new THREE.Mesh(
    new RoundedBoxGeometry(size.x * 0.13, 0.010, 0.025, 2, 0.006),
    new THREE.MeshBasicMaterial({ color: 0xf4d895, toneMapped: false }),
  );
  rotationMarker.position.set(size.x * 0.13, 0.043, 0);
  rotationMarker.userData.recordPlayerMusicControl = true;
  disc.add(rotationMarker);

  room.add(disc);
  recordMusicDisc = disc;

  const noteSpecs = [
    ["♪", "#e9a9c3", -0.42, 0.56, 0.02],
    ["♫", "#d7b36c", -0.10, 0.88, -0.05],
    ["♪", "#a995cf", 0.24, 0.66, 0.04],
    ["♫", "#8fc5bd", 0.52, 1.04, -0.02],
  ];
  noteSpecs.forEach(([symbol, color, x, y, z], index) => {
    const material = new THREE.SpriteMaterial({
      map: createMusicNoteTexture(symbol, color),
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const note = new THREE.Sprite(material);
    note.name = `Record_Player_Music_Note_${index + 1}`;
    note.position.set(center.x + x, disc.position.y + y, center.z + z);
    note.scale.set(0.38, 0.38, 0.38);
    note.userData.baseY = note.position.y;
    note.userData.baseScale = 0.38;
    note.userData.phase = index * 1.38;
    note.userData.recordPlayerMusicControl = true;
    note.renderOrder = 4;
    note.visible = false;
    room.add(note);
    recordMusicNotes.push(note);
  });
}

function createWallRosie(room) {
  return loadCriticalGLTF(
    "wallRosie",
    "/models/meshy-ai-rosie.glb?revision=20260824-wall-rosie",
    (gltf) => {
      const rosie = gltf.scene;
      rosie.name = "Wall_Rosie_Decoration";
      rosie.rotation.y = Math.PI / 2;
      rosie.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = false;
        child.receiveShadow = true;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (!material) return;
          material.metalness = 0;
          material.roughness = Math.max(material.roughness ?? 0.55, 0.46);
          material.envMapIntensity = 0.42;
          if (material.map) {
            material.map.colorSpace = THREE.SRGBColorSpace;
            material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
            material.map.needsUpdate = true;
          }
          material.needsUpdate = true;
        });
      });

      rosie.updateMatrixWorld(true);
      const rawBounds = new THREE.Box3().setFromObject(rosie);
      const rawSize = rawBounds.getSize(new THREE.Vector3());
      rosie.scale.setScalar(1.20 / Math.max(rawSize.y, 0.001));
      rosie.updateMatrixWorld(true);

      const scaledBounds = new THREE.Box3().setFromObject(rosie);
      const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
      // Left wall is x ≈ -8.6. Align Rosie's back to the wall and place her
      // immediately to the receipt printer's right without adding a shelf.
      rosie.position.set(
        -8.54 - scaledBounds.min.x,
        3.02 - scaledCenter.y,
        6.40 - scaledCenter.z,
      );
      room.add(rosie);
      registerRoomInteraction(rosie, "wiggle", { hoverScale: 1.045, wiggleAmount: 0.14 });
    },
    "Rosie wall model failed to load",
  );
}

function prepareDecorModel(root, castShadow = false) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = castShadow;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material) return;
      material.metalness = 0;
      material.roughness = Math.max(material.roughness ?? 0.55, 0.48);
      material.envMapIntensity = 0.38;
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        material.map.needsUpdate = true;
      }
      material.needsUpdate = true;
    });
  });
}

function createWallRosieDoll(room) {
  return loadCriticalGLTF(
    "rosieDoll",
    "/models/rosie-doll.glb?revision=20260825-wall-layout",
    (gltf) => {
      const doll = gltf.scene;
      doll.name = "Wall_Rosie_Doll";
      doll.rotation.y = Math.PI / 2;
      prepareDecorModel(doll, false);
      doll.updateMatrixWorld(true);
      const rawBounds = new THREE.Box3().setFromObject(doll);
      const rawSize = rawBounds.getSize(new THREE.Vector3());
      doll.scale.setScalar(0.90 / Math.max(rawSize.y, 0.001));
      doll.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(doll);
      const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
      doll.position.set(
        -8.54 - scaledBounds.min.x,
        2.82 - scaledCenter.y,
        5.10 - scaledCenter.z,
      );
      room.add(doll);
      registerRoomInteraction(doll, "pulse", { hoverScale: 1.05 });
    },
    "Rosie doll failed to load",
  );
}

function createProfileCardTexture() {
  const cardCanvas = document.createElement("canvas");
  cardCanvas.width = 768;
  cardCanvas.height = 500;
  const context = cardCanvas.getContext("2d");
  context.clearRect(0, 0, cardCanvas.width, cardCanvas.height);
  // Only draw the ink. The original card-holder material remains visible, so
  // the details read as printing on the model instead of a paper laid over it.
  context.shadowColor = "rgba(255,248,244,.68)";
  context.shadowBlur = 6;
  context.shadowOffsetY = 1;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.fillStyle = "#9a7ba7";
  context.font = "800 28px 'Segoe UI', sans-serif";
  context.fillText("MY PROFILE CARD  ✦", 384, 62);

  context.fillStyle = "#614b6b";
  context.font = "800 76px 'Segoe UI', sans-serif";
  context.fillText("ZhengYifan", 384, 150);

  context.strokeStyle = "rgba(166,132,180,.48)";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(164, 214);
  context.lineTo(604, 214);
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = "#7b6685";
  context.font = "700 27px 'Microsoft YaHei', sans-serif";
  context.fillText("AGE / 年龄", 224, 302);
  context.fillText("CITY / 城市", 544, 302);
  context.fillStyle = "#5f4a69";
  context.font = "800 45px 'Microsoft YaHei', sans-serif";
  context.fillText("20", 224, 352);
  context.fillText("深圳", 544, 352);

  context.fillStyle = "#b889a4";
  context.font = "700 38px Georgia, serif";
  context.fillText("♡", 384, 442);

  const texture = new THREE.CanvasTexture(cardCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function createProfileCardHolder(room) {
  return loadCriticalGLTF(
    "profileCard",
    "/models/profile-card-holder.glb?revision=20260825-profile-card",
    (gltf) => {
      const holderModel = gltf.scene;
      holderModel.name = "Profile_Card_Holder_Model";
      prepareDecorModel(holderModel, true);
      holderModel.updateMatrixWorld(true);
      const rawBounds = new THREE.Box3().setFromObject(holderModel);
      const rawSize = rawBounds.getSize(new THREE.Vector3());
      holderModel.scale.setScalar(1.12 / Math.max(rawSize.y, 0.001));
      holderModel.updateMatrixWorld(true);

      const scaledBounds = new THREE.Box3().setFromObject(holderModel);
      const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
      const scaledSize = scaledBounds.getSize(new THREE.Vector3());
      const profile = new THREE.Group();
      profile.name = "Profile_Card_Holder";
      // Back wall front face is z≈-3.96; sink the holder back a few millimetres
      // so it reads as a wall-mounted object rather than hovering in front.
      profile.position.set(0.52, 4.48, -3.97);
      holderModel.position.set(-scaledCenter.x, -scaledCenter.y, -scaledBounds.min.z);
      profile.add(holderModel);

      const informationCard = new THREE.Mesh(
        new THREE.PlaneGeometry(scaledSize.x * 0.60, scaledSize.y * 0.30),
        new THREE.MeshBasicMaterial({
          map: createProfileCardTexture(),
          toneMapped: false,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      );
      informationCard.name = "Profile_Card_Text";
      // The centre card is recessed well behind the fluffy outer frame. Put the
      // transparent ink on that real recessed surface, not at the frame's max Z.
      informationCard.position.set(0, -scaledSize.y * 0.235, scaledSize.z * 0.60);
      profile.add(informationCard);
      room.add(profile);
      profileCardObject = profile;
      registerRoomInteraction(profile, "pulse", { hoverScale: 1.035 });
    },
    "Profile card holder failed to load",
  );
}

function createArchShape(width, height, inset = 0) {
  const halfWidth = width / 2 - inset;
  const bottom = -height / 2 + inset;
  const shoulder = height / 2 - width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, bottom);
  shape.lineTo(halfWidth, bottom);
  shape.lineTo(halfWidth, shoulder);
  shape.absarc(0, shoulder, halfWidth, 0, Math.PI, false);
  shape.lineTo(-halfWidth, bottom);
  shape.closePath();
  return shape;
}

function createCornerShelfAndMirror(room) {
  const corner = new THREE.Group();
  corner.name = "RoundedCornerShelfAndArchedMirror";

  const wood = new THREE.MeshStandardMaterial({ color: 0xd8a064, roughness: 0.52, metalness: 0.02 });
  const woodEdge = new THREE.MeshStandardMaterial({ color: 0xb87848, roughness: 0.56, metalness: 0.03 });
  const cabinetBack = new THREE.MeshStandardMaterial({ color: 0xf1ded5, roughness: 0.82, metalness: 0 });
  const basketMaterial = new THREE.MeshStandardMaterial({ color: 0xc58b54, roughness: 0.88, metalness: 0 });
  const basketDark = new THREE.MeshStandardMaterial({ color: 0xa96e40, roughness: 0.86, metalness: 0 });
  const lavender = new THREE.MeshStandardMaterial({ color: 0xcab2d8, roughness: 0.72, metalness: 0 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf6e7df, roughness: 0.72, metalness: 0 });

  const shelf = new THREE.Group();
  shelf.name = "CornerShelf_LightWood";
  shelf.position.set(-8.28, 0.12, -2.72);
  shelf.rotation.y = Math.PI / 2;
  shelf.scale.set(0.82, 0.80, 0.82);

  const back = new THREE.Mesh(new RoundedBoxGeometry(1.92, 2.42, 0.08, 4, 0.05), cabinetBack);
  back.position.set(0, 1.34, -0.34);
  back.receiveShadow = true;
  shelf.add(back);

  [-0.96, 0.96].forEach((x) => {
    const side = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.58, 0.76, 4, 0.06), wood);
    side.position.set(x, 1.34, 0);
    side.castShadow = true;
    side.receiveShadow = true;
    shelf.add(side);
  });

  [0.08, 0.86, 1.63, 2.58].forEach((y, index) => {
    const slab = new THREE.Mesh(new RoundedBoxGeometry(index === 3 ? 2.10 : 2.02, index === 3 ? 0.18 : 0.14, 0.78, 4, 0.055), index === 3 ? woodEdge : wood);
    slab.position.set(0, y, 0);
    slab.castShadow = true;
    slab.receiveShadow = true;
    shelf.add(slab);
  });

  [-0.48, 0.48].forEach((x, basketIndex) => {
    const basket = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.54, 0.58, 5, 0.10), basketMaterial);
    basket.position.set(x, 0.47, 0.04);
    basket.castShadow = true;
    basket.receiveShadow = true;
    shelf.add(basket);

    for (let strip = -2; strip <= 2; strip += 1) {
      const verticalReed = new THREE.Mesh(new RoundedBoxGeometry(0.025, 0.45, 0.025, 2, 0.008), basketDark);
      verticalReed.position.set(x + strip * 0.13, 0.47, 0.345);
      shelf.add(verticalReed);
    }
    for (let strip = -1; strip <= 1; strip += 1) {
      const horizontalReed = new THREE.Mesh(new RoundedBoxGeometry(0.73, 0.022, 0.026, 2, 0.007), basketDark);
      horizontalReed.position.set(x, 0.47 + strip * 0.14, 0.35);
      shelf.add(horizontalReed);
    }

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.016, 8, 24, Math.PI), basketDark);
    handle.position.set(x, 0.57, 0.37);
    handle.rotation.z = Math.PI;
    shelf.add(handle);
  });

  const bookColors = [0xc8aed8, 0xf0c6cf, 0xb9d6cb, 0xe9c789, 0xb9cde1, 0xd7b29e];
  bookColors.forEach((color, index) => {
    const height = 0.52;
    const book = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, height, 0.46, 3, 0.022),
      new THREE.MeshStandardMaterial({ color, roughness: 0.74, metalness: 0 }),
    );
    book.position.set(-0.72 + index * 0.17, 0.96 + height / 2, 0.04);
    book.castShadow = true;
    shelf.add(book);
  });

  const bookendBase = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.055, 0.50, 3, 0.018), woodEdge);
  bookendBase.position.set(0.47, 1.01, 0.04);
  shelf.add(bookendBase);
  const bookendBack = new THREE.Mesh(new RoundedBoxGeometry(0.055, 0.48, 0.50, 3, 0.018), woodEdge);
  bookendBack.position.set(0.60, 1.22, 0.04);
  bookendBack.castShadow = true;
  shelf.add(bookendBack);

  const firstShelfBox = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.48, 0.52, 5, 0.09), lavender);
  firstShelfBox.position.set(-0.47, 1.94, 0.03);
  firstShelfBox.castShadow = true;
  shelf.add(firstShelfBox);
  const firstShelfLid = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.07, 0.55, 4, 0.03), cream);
  firstShelfLid.position.set(-0.47, 2.21, 0.03);
  firstShelfLid.castShadow = true;
  shelf.add(firstShelfLid);
  const boxRibbon = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.44, 0.025, 3, 0.018), new THREE.MeshStandardMaterial({ color: 0xf0c0cf, roughness: 0.70 }));
  boxRibbon.position.set(-0.47, 1.94, 0.302);
  shelf.add(boxRibbon);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe8dff2,
    roughness: 0.10,
    metalness: 0,
    transmission: 0.62,
    transparent: true,
    opacity: 0.72,
    thickness: 0.08,
    ior: 1.42,
    clearcoat: 0.9,
  });
  const driedStemMaterial = new THREE.MeshStandardMaterial({ color: 0x7f9b6f, roughness: 0.78, metalness: 0 });
  const driedFlowerMaterials = [0xd9a8bb, 0xe6c98a, 0xb9a7d5].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0 }));
  const glassVase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.42, 28, 1, true), glassMaterial);
  glassVase.position.set(0.40, 1.86, 0.05);
  glassVase.castShadow = true;
  shelf.add(glassVase);
  [-0.10, -0.04, 0.04, 0.11].forEach((offset, index) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.52 + index * 0.035, 10), driedStemMaterial);
    stem.position.set(0.40 + offset * 0.45, 2.21 + index * 0.01, 0.04);
    stem.rotation.z = offset * 1.7;
    shelf.add(stem);
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), driedFlowerMaterials[index % driedFlowerMaterials.length]);
    flower.scale.set(1.0, 0.65, 1.0);
    flower.position.set(0.40 + offset, 2.47 + index * 0.015, 0.04);
    flower.castShadow = true;
    shelf.add(flower);
  });

  const cameraBody = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.34, 0.24, 4, 0.07), cream);
  cameraBody.position.set(-0.34, 2.85, 0.04);
  cameraBody.castShadow = true;
  shelf.add(cameraBody);
  const cameraLens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.12, 28), woodEdge);
  cameraLens.rotation.x = Math.PI / 2;
  cameraLens.position.set(-0.34, 2.85, 0.21);
  cameraLens.castShadow = true;
  shelf.add(cameraLens);
  const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.075, 28), new THREE.MeshPhysicalMaterial({ color: 0x8fa5b2, roughness: 0.16, metalness: 0.55, clearcoat: 0.8 }));
  lensGlass.position.set(-0.34, 2.85, 0.275);
  shelf.add(lensGlass);
  const shutterButton = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.035, 18), woodEdge);
  shutterButton.position.set(-0.20, 3.04, 0.04);
  shelf.add(shutterButton);
  const cameraStrapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.58, 2.91, 0.03),
    new THREE.Vector3(-0.72, 2.76, 0.09),
    new THREE.Vector3(-0.54, 2.65, 0.14),
    new THREE.Vector3(-0.18, 2.67, 0.15),
    new THREE.Vector3(-0.10, 2.86, 0.06),
  ]);
  const cameraStrap = new THREE.Mesh(new THREE.TubeGeometry(cameraStrapCurve, 34, 0.018, 8, false), new THREE.MeshStandardMaterial({ color: 0x9d694d, roughness: 0.78, metalness: 0 }));
  cameraStrap.castShadow = true;
  shelf.add(cameraStrap);
  const photoAlbum = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.075, 0.44, 4, 0.03), new THREE.MeshStandardMaterial({ color: 0xefc1cf, roughness: 0.76 }));
  photoAlbum.position.set(0.45, 2.72, 0.01);
  photoAlbum.rotation.y = -0.08;
  photoAlbum.castShadow = true;
  shelf.add(photoAlbum);

  corner.add(shelf);

  const mirror = new THREE.Group();
  mirror.name = "CreamArchedWallMirror";
  mirror.position.set(-8.62, 4.73, 7.72);
  mirror.rotation.y = Math.PI / 2;
  mirror.scale.setScalar(0.70);

  const mirrorWidth = 1.26;
  const mirrorHeight = 1.86;
  const frameShape = createArchShape(mirrorWidth, mirrorHeight);
  frameShape.holes.push(createArchShape(mirrorWidth, mirrorHeight, 0.09));
  const frameGeometry = new THREE.ExtrudeGeometry(frameShape, {
    depth: 0.10,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xf1d9d2, roughness: 0.48, metalness: 0.03 });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.z = -0.05;
  frame.castShadow = true;
  mirror.add(frame);

  const mirrorSurface = new Reflector(new THREE.ShapeGeometry(createArchShape(mirrorWidth, mirrorHeight, 0.105)), {
    clipBias: 0.004,
    textureWidth: Math.min(1024, Math.floor(innerWidth * devicePixelRatio)),
    textureHeight: Math.min(1024, Math.floor(innerHeight * devicePixelRatio)),
    color: 0xcfd8e4,
    multisample: 4,
  });
  mirrorSurface.position.z = 0.045;
  mirror.add(mirrorSurface);

  const mirrorLedge = new THREE.Mesh(new RoundedBoxGeometry(1.48, 0.11, 0.42, 4, 0.045), woodEdge);
  mirrorLedge.position.set(0, -mirrorHeight / 2 - 0.17, 0.15);
  mirrorLedge.castShadow = true;
  mirror.add(mirrorLedge);

  const perfumeGlass = new THREE.Mesh(new RoundedBoxGeometry(0.20, 0.29, 0.14, 4, 0.035), glassMaterial);
  perfumeGlass.position.set(-0.43, -0.88, 0.24);
  perfumeGlass.castShadow = true;
  mirror.add(perfumeGlass);
  const perfumeCap = new THREE.Mesh(new RoundedBoxGeometry(0.10, 0.07, 0.10, 3, 0.02), lavender);
  perfumeCap.position.set(-0.43, -0.69, 0.24);
  mirror.add(perfumeCap);
  const perfumeLabel = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.09, 0.015, 2, 0.01), cream);
  perfumeLabel.position.set(-0.43, -0.89, 0.32);
  mirror.add(perfumeLabel);

  const miniVase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.25, 24, 1, true), glassMaterial);
  miniVase.position.set(0.03, -0.90, 0.23);
  mirror.add(miniVase);
  [-0.05, 0.01, 0.06].forEach((offset, index) => {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.28 + index * 0.03, 8), driedStemMaterial);
    stem.position.set(0.03 + offset * 0.3, -0.65 + index * 0.015, 0.23);
    stem.rotation.z = offset * 2.4;
    mirror.add(stem);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), driedFlowerMaterials[index]);
    bloom.scale.set(1, 0.7, 1);
    bloom.position.set(0.03 + offset, -0.49 + index * 0.025, 0.23);
    mirror.add(bloom);
  });

  const jewelryTray = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.035, 28), cream);
  jewelryTray.position.set(0.46, -1.01, 0.23);
  mirror.add(jewelryTray);
  const jewelryRing = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.010, 8, 22), new THREE.MeshStandardMaterial({ color: 0xd5a85b, roughness: 0.30, metalness: 0.68 }));
  jewelryRing.position.set(0.46, -0.97, 0.24);
  jewelryRing.rotation.x = Math.PI / 2;
  mirror.add(jewelryRing);

  room.add(mirror);
  room.add(corner);
}

function prepareSofaNightMaterials(room) {
  const sofa = room.getObjectByName("Lavender_Gingham_Sofa_Root");
  if (!sofa) return;
  sofaNightMaterials.length = 0;
  sofa.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const clonedMaterials = sourceMaterials.map((sourceMaterial) => sourceMaterial.clone());
    child.material = Array.isArray(child.material) ? clonedMaterials : clonedMaterials[0];
    clonedMaterials.forEach((material) => {
      // This asset stores the whole gingham texture in the emissive channel,
      // with a black base color. Move that texture back to the normal base
      // channel so the sofa responds to room lighting instead of glowing.
      if (material.emissiveMap) {
        material.map = material.emissiveMap;
        material.emissiveMap = null;
        material.emissive?.setHex(0x000000);
        material.emissiveIntensity = 0;
        material.color?.setHex(0xd6c4de);
      }
      material.metalness = 0;
      material.roughness = 0.88;
      material.envMapIntensity = 0.08;
      material.toneMapped = true;
      material.needsUpdate = true;
      if (!material.color) return;
      sofaNightMaterials.push({
        material,
        dayColor: material.color.clone(),
        dayEnvMapIntensity: material.envMapIntensity ?? 0,
      });
    });
  });
}

const hemisphere = new THREE.HemisphereLight(0xfffbf7, 0x8b7596, 2.35);
scene.add(hemisphere);

const sun = new THREE.DirectionalLight(0xffead3, 4.1);
sun.position.set(-8, 12, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -10;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 45;
sun.shadow.bias = -0.00035;
sun.shadow.radius = 5;
scene.add(sun);

const fill = new THREE.PointLight(0xb9b8ec, 19, 30, 2);
fill.position.set(8, 7, 4);
scene.add(fill);

const warm = new THREE.PointLight(0xffcda7, 13, 24, 2);
warm.position.set(-6, 5, 7);
scene.add(warm);

function createWindowWeatherTexture(state) {
  const weatherCanvas = document.createElement("canvas");
  weatherCanvas.width = 768;
  weatherCanvas.height = 512;
  const context = weatherCanvas.getContext("2d");
  const palettes = {
    day: ["#9fd6f4", "#e9f5fa", "#fff0c9"],
    sunset: ["#766b9f", "#d591a8", "#ffbd78"],
    night: ["#121831", "#28345c", "#5d5682"],
    rain: ["#64788b", "#91a6b5", "#c3d0d5"],
  };
  const [top, middle, bottom] = palettes[state.key];
  const sky = context.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, top);
  sky.addColorStop(0.58, middle);
  sky.addColorStop(1, bottom);
  context.fillStyle = sky;
  context.fillRect(0, 0, 768, 512);

  if (state.key === "day" || state.key === "sunset") {
    const sunX = state.key === "day" ? 590 : 560;
    const sunY = state.key === "day" ? 112 : 350;
    const sunGlow = context.createRadialGradient(sunX, sunY, 4, sunX, sunY, 92);
    sunGlow.addColorStop(0, "rgba(255,250,218,.98)");
    sunGlow.addColorStop(0.35, state.key === "day" ? "rgba(255,231,151,.72)" : "rgba(255,153,102,.78)");
    sunGlow.addColorStop(1, "rgba(255,180,110,0)");
    context.fillStyle = sunGlow;
    context.fillRect(sunX - 100, sunY - 100, 200, 200);
    context.fillStyle = state.key === "day" ? "rgba(255,255,246,.55)" : "rgba(244,214,220,.24)";
    [[155,150,125,34],[330,218,165,42],[610,246,130,34]].forEach(([x,y,rx,ry]) => {
      context.beginPath();
      context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      context.fill();
    });
  }

  if (state.key === "night") {
    context.fillStyle = "rgba(255,247,207,.92)";
    context.beginPath();
    context.arc(598, 116, 46, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = top;
    context.beginPath();
    context.arc(618, 99, 43, 0, Math.PI * 2);
    context.fill();
    let seed = 41;
    for (let index = 0; index < 92; index += 1) {
      seed = (seed * 16807) % 2147483647;
      const x = seed % 768;
      seed = (seed * 16807) % 2147483647;
      const y = seed % 350;
      const radius = 0.8 + (seed % 4) * 0.55;
      context.fillStyle = `rgba(255,244,194,${0.45 + (seed % 40) / 100})`;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (state.key === "rain") {
    context.fillStyle = "rgba(43,61,76,.20)";
    context.fillRect(0, 0, 768, 512);
    let seed = 73;
    for (let index = 0; index < 115; index += 1) {
      seed = (seed * 48271) % 2147483647;
      const x = seed % 768;
      seed = (seed * 48271) % 2147483647;
      const y = seed % 512;
      const length = 18 + (seed % 36);
      context.strokeStyle = `rgba(229,242,248,${0.18 + (seed % 34) / 100})`;
      context.lineWidth = 1 + (seed % 3) * 0.55;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - 8, y + length);
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(weatherCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function updateWindowWeatherTexture(state) {
  windowWeatherTexture?.dispose();
  windowWeatherTexture = createWindowWeatherTexture(state);
  windowGlassMeshes.forEach((mesh) => {
    mesh.material.map = windowWeatherTexture;
    mesh.material.opacity = state.key === "rain" ? 0.88 : 0.76;
    mesh.material.needsUpdate = true;
  });
}

function setupWindowWeather(room) {
  const windowGlass = room.getObjectByName("Window_Glass");
  if (!windowGlass) return;
  windowGlassMeshes.length = 0;
  windowGlass.traverse((object) => {
    if (!object.isMesh) return;
    object.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.76,
      side: THREE.DoubleSide,
      toneMapped: false,
      depthWrite: false,
    });
    object.renderOrder = 2;
    windowGlassMeshes.push(object);
  });
  if (windowGlass.isMesh && !windowGlassMeshes.includes(windowGlass)) windowGlassMeshes.push(windowGlass);
  updateWindowWeatherTexture(WINDOW_WEATHER_STATES[windowWeatherIndex]);
}

function showWeatherStatus(label) {
  if (!weatherStatus || !weatherStatusLabel) return;
  window.clearTimeout(weatherStatusTimer);
  weatherStatusLabel.textContent = label;
  weatherStatus.classList.add("is-visible");
  weatherStatus.setAttribute("aria-hidden", "false");
  weatherStatusTimer = window.setTimeout(() => {
    weatherStatus.classList.remove("is-visible");
    weatherStatus.setAttribute("aria-hidden", "true");
  }, 1900);
}

function setWindowWeatherState(index, announce = true) {
  windowWeatherIndex = (index + WINDOW_WEATHER_STATES.length) % WINDOW_WEATHER_STATES.length;
  const state = WINDOW_WEATHER_STATES[windowWeatherIndex];
  roomIsNight = state.key === "night";
  const duration = reducedMotion ? 0 : 0.9;
  const lightTargets = [[hemisphere, state.hemisphere], [sun, state.sun], [fill, state.fill], [warm, state.warm]];
  lightTargets.forEach(([light, intensity]) => {
    if (duration === 0) light.intensity = intensity;
    else gsap.to(light, { intensity, duration, ease: "power2.inOut" });
  });

  [[sun, state.colors[0]], [fill, state.colors[1]], [warm, state.colors[2]]].forEach(([light, hex]) => {
    const target = new THREE.Color(hex);
    if (duration === 0) light.color.copy(target);
    else gsap.to(light.color, { r: target.r, g: target.g, b: target.b, duration, ease: "power2.inOut" });
  });

  starPointLights.forEach((light) => {
    const intensity = state.key === "night" ? state.starPoint : light.userData.dayIntensity * state.starPoint;
    if (duration === 0) light.intensity = intensity;
    else gsap.to(light, { intensity, duration: 0.75, ease: "power2.inOut" });
  });
  starLightMaterials.forEach((material) => {
    if (duration === 0) material.emissiveIntensity = state.starEmissive;
    else gsap.to(material, { emissiveIntensity: state.starEmissive, duration: 0.75, ease: "power2.inOut" });
  });
  starGlows.forEach((glow) => {
    if (glow.userData.dayBaseOpacity === undefined) glow.userData.dayBaseOpacity = glow.userData.baseOpacity;
    glow.userData.baseOpacity = Math.min(0.66, glow.userData.dayBaseOpacity * state.glow);
  });

  updateTeaTableLampState(duration);
  sofaNightMaterials.forEach(({ material, dayColor, dayEnvMapIntensity }) => {
    const targetColor = dayColor.clone().multiplyScalar(state.roomShade);
    const targetEnvMapIntensity = state.roomShade < 0.5 ? Math.min(dayEnvMapIntensity, 0.06) : dayEnvMapIntensity * state.roomShade;
    if (duration === 0) {
      material.color.copy(targetColor);
      if ("envMapIntensity" in material) material.envMapIntensity = targetEnvMapIntensity;
    } else {
      gsap.to(material.color, { r: targetColor.r, g: targetColor.g, b: targetColor.b, duration, ease: "power2.inOut" });
      if ("envMapIntensity" in material) gsap.to(material, { envMapIntensity: targetEnvMapIntensity, duration, ease: "power2.inOut" });
    }
  });

  if (duration === 0) renderer.toneMappingExposure = state.exposure;
  else gsap.to(renderer, { toneMappingExposure: state.exposure, duration, ease: "power2.inOut" });
  document.body.classList.toggle("is-night", roomIsNight);
  document.body.classList.toggle("weather-sunset", state.key === "sunset");
  document.body.classList.toggle("weather-rain", state.key === "rain");
  lightingControl?.classList.toggle("is-active", roomIsNight);
  lightingControl?.setAttribute("aria-pressed", String(roomIsNight));
  lightingControl?.setAttribute("aria-label", roomIsNight ? "切换为白天房间" : "切换为夜晚房间");
  if (windowGlassMeshes.length) updateWindowWeatherTexture(state);
  if (announce) showWeatherStatus(state.label);
}

function cycleWindowWeather() {
  setWindowWeatherState(windowWeatherIndex + 1, true);
}

function setRoomNightMode(nextNightMode) {
  setWindowWeatherState(nextNightMode ? 2 : 0, true);
}

function updateTeaTableLampState(duration = reducedMotion ? 0 : 0.65) {
  if (!teaTableLampLight) return;
  const shouldBeOn = roomIsNight || teaTableLampManualOn;
  const lightIntensity = shouldBeOn ? (roomIsNight ? 16 : 11.5) : 0;
  const emissiveIntensity = shouldBeOn ? (roomIsNight ? 2.5 : 2.0) : 0.08;
  if (duration === 0) teaTableLampLight.intensity = lightIntensity;
  else gsap.to(teaTableLampLight, { intensity: lightIntensity, duration, ease: "power2.inOut" });
  teaTableLampMaterials.forEach((material) => {
    if (duration === 0) material.emissiveIntensity = emissiveIntensity;
    else gsap.to(material, { emissiveIntensity, duration, ease: "power2.inOut" });
  });
}

function toggleTeaTableLamp() {
  teaTableLampManualOn = !teaTableLampManualOn;
  updateTeaTableLampState();
}

lightingControl?.addEventListener("click", () => setRoomNightMode(!roomIsNight));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.enableZoom = false;
controls.zoomSpeed = 0.85;
controls.minDistance = 8.5;
controls.maxDistance = 70;
controls.minPolarAngle = 0.72;
controls.maxPolarAngle = 1.38;
controls.minAzimuthAngle = -0.15;
controls.maxAzimuthAngle = 1.38;
controls.target.copy(panoramaCameraTarget);

function setComputerFocus(active) {
  if (!roomModel || active === computerFocusActive) return;
  const duration = reducedMotion ? 0 : (active ? 1.90 : 1.48);
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(controls.target);
  gsap.killTweensOf(camera);

  if (active) {
    const monitorBounds = new THREE.Box3();
    let hasMonitorPart = false;
    roomModel.traverse((object) => {
      const isDesktopFocusPart = object.name.startsWith("Computer_Monitor_")
        || object.name.startsWith("Computer_Keyboard_")
        || object.name.startsWith("Computer_Mouse")
        || object.name.startsWith("Computer_Mouse_Pad");
      if (!object.visible || !isDesktopFocusPart) return;
      monitorBounds.expandByObject(object);
      hasMonitorPart = true;
    });
    if (!hasMonitorPart || monitorBounds.isEmpty()) return;

    computerFocusReturnPosition.copy(camera.position);
    computerFocusReturnTarget.copy(controls.target);
    computerFocusReturnFov = camera.fov;
    computerFocusActive = true;
    updateReturnPanoramaButton();
    controls.enabled = false;
    controls.minDistance = 0.8;

    const monitorCenter = monitorBounds.getCenter(new THREE.Vector3());
    const monitorSize = monitorBounds.getSize(new THREE.Vector3());
    const focusTarget = monitorCenter.clone();
    const focusDistance = Math.max(monitorSize.x * 1.28, monitorSize.y * 2.20, 4.80);
    const focusPosition = new THREE.Vector3(
      monitorCenter.x,
      monitorCenter.y + monitorSize.y * 0.06,
      monitorBounds.max.z + focusDistance,
    );

    if (duration === 0) {
      camera.position.copy(focusPosition);
      controls.target.copy(focusTarget);
      camera.fov = 28;
      camera.updateProjectionMatrix();
      controls.enabled = true;
      controls.update();
      return;
    }
    gsap.to(camera.position, { x: focusPosition.x, y: focusPosition.y, z: focusPosition.z, duration, ease: "power3.inOut" });
    gsap.to(controls.target, {
      x: focusTarget.x,
      y: focusTarget.y,
      z: focusTarget.z,
      duration,
      ease: "power3.inOut",
      onComplete: () => {
        controls.enabled = true;
        controls.update();
      },
    });
    gsap.to(camera, {
      fov: 28,
      duration,
      ease: "power3.inOut",
      onUpdate: () => camera.updateProjectionMatrix(),
    });
    return;
  }

  computerFocusActive = false;
  updateReturnPanoramaButton();
  controls.enabled = false;
  const restoreControls = () => {
    controls.minDistance = 8.5;
    controls.enabled = true;
    controls.update();
  };
  if (duration === 0) {
    camera.position.copy(computerFocusReturnPosition);
    controls.target.copy(computerFocusReturnTarget);
    camera.fov = computerFocusReturnFov;
    camera.updateProjectionMatrix();
    restoreControls();
    return;
  }
  gsap.to(camera.position, {
    x: computerFocusReturnPosition.x,
    y: computerFocusReturnPosition.y,
    z: computerFocusReturnPosition.z,
    duration,
    ease: "power3.inOut",
  });
  gsap.to(controls.target, {
    x: computerFocusReturnTarget.x,
    y: computerFocusReturnTarget.y,
    z: computerFocusReturnTarget.z,
    duration,
    ease: "power3.inOut",
    onComplete: restoreControls,
  });
  gsap.to(camera, {
    fov: computerFocusReturnFov,
    duration,
    ease: "power3.inOut",
    onUpdate: () => camera.updateProjectionMatrix(),
  });
}

function toggleComputerFocus() {
  setComputerFocus(!computerFocusActive);
}

function setReceiptFocus(active) {
  if (!receiptPrinterObject || active === receiptFocusActive) return;
  const duration = reducedMotion ? 0 : (active ? 1.85 : 1.35);
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(controls.target);
  gsap.killTweensOf(camera);

  if (active) {
    receiptPrinterObject.updateMatrixWorld(true);
    const printerBounds = new THREE.Box3().setFromObject(receiptPrinterObject);
    const printerCenter = printerBounds.getCenter(new THREE.Vector3());
    const printerSize = printerBounds.getSize(new THREE.Vector3());
    const expectedPaperBottom = receiptPaperGroup
      ? receiptPaperGroup.position.y - 1.56
      : printerBounds.min.y - 1.40;
    const focusTop = printerBounds.max.y;
    const focusHeight = focusTop - expectedPaperBottom;
    const focusTarget = new THREE.Vector3(
      printerBounds.max.x,
      (focusTop + expectedPaperBottom) / 2,
      printerCenter.z,
    );
    const focusDistance = Math.max(focusHeight * 2.02, printerSize.z * 2.65, 5.80);
    const focusPosition = new THREE.Vector3(
      printerBounds.max.x + focusDistance,
      focusTarget.y + focusDistance * 0.20,
      focusTarget.z + focusDistance * 0.08,
    );

    receiptFocusReturnPosition.copy(camera.position);
    receiptFocusReturnTarget.copy(controls.target);
    receiptFocusReturnFov = camera.fov;
    receiptFocusActive = true;
    updateReturnPanoramaButton();
    controls.enabled = false;
    controls.minDistance = 0.8;
    controls.maxAzimuthAngle = 1.72;

    if (duration === 0) {
      camera.position.copy(focusPosition);
      controls.target.copy(focusTarget);
      camera.fov = 28;
      camera.updateProjectionMatrix();
      controls.enabled = true;
      controls.update();
      updateReceiptSaveButton();
      return;
    }
    gsap.to(camera.position, { x: focusPosition.x, y: focusPosition.y, z: focusPosition.z, duration, ease: "power3.inOut" });
    gsap.to(controls.target, {
      x: focusTarget.x,
      y: focusTarget.y,
      z: focusTarget.z,
      duration,
      ease: "power3.inOut",
      onComplete: () => {
        controls.enabled = true;
        controls.update();
        updateReceiptSaveButton();
      },
    });
    gsap.to(camera, { fov: 28, duration, ease: "power3.inOut", onUpdate: () => camera.updateProjectionMatrix() });
    return;
  }

  receiptFocusActive = false;
  updateReturnPanoramaButton();
  updateReceiptSaveButton();
  controls.enabled = false;
  const restoreControls = () => {
    controls.minDistance = 8.5;
    controls.maxAzimuthAngle = 1.38;
    controls.enabled = true;
    controls.update();
  };
  if (duration === 0) {
    camera.position.copy(receiptFocusReturnPosition);
    controls.target.copy(receiptFocusReturnTarget);
    camera.fov = receiptFocusReturnFov;
    camera.updateProjectionMatrix();
    restoreControls();
    return;
  }
  gsap.to(camera.position, {
    x: receiptFocusReturnPosition.x,
    y: receiptFocusReturnPosition.y,
    z: receiptFocusReturnPosition.z,
    duration,
    ease: "power3.inOut",
  });
  gsap.to(controls.target, {
    x: receiptFocusReturnTarget.x,
    y: receiptFocusReturnTarget.y,
    z: receiptFocusReturnTarget.z,
    duration,
    ease: "power3.inOut",
    onComplete: restoreControls,
  });
  gsap.to(camera, { fov: receiptFocusReturnFov, duration, ease: "power3.inOut", onUpdate: () => camera.updateProjectionMatrix() });
}

function handleReceiptPrinterClick() {
  if (!receiptFocusActive) {
    setReceiptFocus(true);
    return;
  }
  if (!receiptPaperAnimating) toggleReceiptPaper();
}

function returnToPanorama() {
  if (!roomModel) return;
  setContactOpen(false);
  closePhotoViewer();
  closeProfileCardViewer();
  if (computerFocusActive) setComputerFocus(false);
  if (receiptFocusActive) setReceiptFocus(false);
  if (profileCardFocusActive) setProfileCardFocus(false);

  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(controls.target);
  gsap.killTweensOf(camera);
  const mobile = innerWidth < 700;
  const panoramaPosition = new THREE.Vector3(...(mobile ? [19.5, 13.2, 24.5] : [16.8, 11.1, 21.5]));
  const panoramaFov = mobile ? 38 : 29;
  const duration = reducedMotion ? 0 : 0.85;
  controls.enabled = false;
  controls.minDistance = 8.5;
  controls.maxAzimuthAngle = 1.38;
  if (duration === 0) {
    camera.position.copy(panoramaPosition);
    controls.target.copy(panoramaCameraTarget);
    camera.fov = panoramaFov;
    camera.updateProjectionMatrix();
    controls.enabled = true;
    controls.update();
    return;
  }
  gsap.to(camera.position, {
    x: panoramaPosition.x,
    y: panoramaPosition.y,
    z: panoramaPosition.z,
    duration,
    ease: "power3.inOut",
  });
  gsap.to(controls.target, {
    x: panoramaCameraTarget.x,
    y: panoramaCameraTarget.y,
    z: panoramaCameraTarget.z,
    duration,
    ease: "power3.inOut",
    onComplete: () => {
      controls.enabled = true;
      controls.update();
    },
  });
  gsap.to(camera, { fov: panoramaFov, duration, ease: "power3.inOut", onUpdate: () => camera.updateProjectionMatrix() });
}

returnPanoramaButton?.addEventListener("click", returnToPanorama);

function setProfileCardFocus(active) {
  if (!profileCardObject || active === profileCardFocusActive) return;
  const duration = reducedMotion ? 0 : (active ? 1.45 : 1.20);
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(controls.target);
  gsap.killTweensOf(camera);

  if (active) {
    profileCardObject.updateMatrixWorld(true);
    const cardBounds = new THREE.Box3().setFromObject(profileCardObject);
    const cardCenter = cardBounds.getCenter(new THREE.Vector3());
    const cardSize = cardBounds.getSize(new THREE.Vector3());
    const focusDistance = Math.max(cardSize.y * 2.20, cardSize.x * 2.25, 2.55);
    const focusTarget = cardCenter.clone();
    const focusPosition = new THREE.Vector3(
      cardCenter.x,
      cardCenter.y + focusDistance * 0.10,
      cardBounds.max.z + focusDistance,
    );

    profileCardFocusReturnPosition.copy(camera.position);
    profileCardFocusReturnTarget.copy(controls.target);
    profileCardFocusReturnFov = camera.fov;
    profileCardFocusActive = true;
    updateReturnPanoramaButton();
    controls.enabled = false;
    controls.minDistance = 0.6;

    if (duration === 0) {
      camera.position.copy(focusPosition);
      controls.target.copy(focusTarget);
      camera.fov = 26;
      camera.updateProjectionMatrix();
      controls.enabled = true;
      controls.update();
      return;
    }
    gsap.to(camera.position, { x: focusPosition.x, y: focusPosition.y, z: focusPosition.z, duration, ease: "power3.inOut" });
    gsap.to(controls.target, {
      x: focusTarget.x,
      y: focusTarget.y,
      z: focusTarget.z,
      duration,
      ease: "power3.inOut",
      onComplete: () => {
        controls.enabled = true;
        controls.update();
      },
    });
    gsap.to(camera, { fov: 26, duration, ease: "power3.inOut", onUpdate: () => camera.updateProjectionMatrix() });
    return;
  }

  profileCardFocusActive = false;
  updateReturnPanoramaButton();
  controls.enabled = false;
  const restoreControls = () => {
    controls.minDistance = 8.5;
    controls.enabled = true;
    controls.update();
  };
  if (duration === 0) {
    camera.position.copy(profileCardFocusReturnPosition);
    controls.target.copy(profileCardFocusReturnTarget);
    camera.fov = profileCardFocusReturnFov;
    camera.updateProjectionMatrix();
    restoreControls();
    return;
  }
  gsap.to(camera.position, {
    x: profileCardFocusReturnPosition.x,
    y: profileCardFocusReturnPosition.y,
    z: profileCardFocusReturnPosition.z,
    duration,
    ease: "power3.inOut",
  });
  gsap.to(controls.target, {
    x: profileCardFocusReturnTarget.x,
    y: profileCardFocusReturnTarget.y,
    z: profileCardFocusReturnTarget.z,
    duration,
    ease: "power3.inOut",
    onComplete: restoreControls,
  });
  gsap.to(camera, { fov: profileCardFocusReturnFov, duration, ease: "power3.inOut", onUpdate: () => camera.updateProjectionMatrix() });
}

function toggleProfileCardFocus() {
  setProfileCardFocus(!profileCardFocusActive);
}

const zoomRaycaster = new THREE.Raycaster();
const zoomPointer = new THREE.Vector2();
const zoomFallbackPlane = new THREE.Plane();
const zoomAnchor = new THREE.Vector3();
const zoomPlaneNormal = new THREE.Vector3();

// Keep wheel direction predictable while zooming toward the point under the cursor.
canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    zoomPointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    zoomPointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    zoomRaycaster.setFromCamera(zoomPointer, camera);

    let anchor = null;
    if (roomModel) {
      const hits = zoomRaycaster.intersectObject(roomModel, true);
      if (hits.length) anchor = hits[0].point;
    }

    if (!anchor) {
      camera.getWorldDirection(zoomPlaneNormal);
      zoomFallbackPlane.setFromNormalAndCoplanarPoint(zoomPlaneNormal, controls.target);
      anchor = zoomRaycaster.ray.intersectPlane(zoomFallbackPlane, zoomAnchor) || controls.target;
    }

    const offset = camera.position.clone().sub(controls.target);
    const currentDistance = offset.length();
    const zoomFactor = Math.exp(Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 240) * 0.0032);
    const nextDistance = THREE.MathUtils.clamp(
      currentDistance * zoomFactor,
      controls.minDistance,
      controls.maxDistance,
    );

    const anchorShift = THREE.MathUtils.clamp(1 - nextDistance / currentDistance, -0.45, 0.45);
    controls.target.add(anchor.clone().sub(controls.target).multiplyScalar(anchorShift));
    offset.setLength(nextDistance);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  },
  { passive: false },
);

function setCameraForViewport() {
  const mobile = innerWidth < 700;
  camera.fov = mobile ? 38 : 29;
  camera.position.set(...(mobile ? [19.5, 13.2, 24.5] : [16.8, 11.1, 21.5]));
  controls.target.copy(panoramaCameraTarget);
  camera.updateProjectionMatrix();
}

setCameraForViewport();
controls.update();

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

function loadCriticalGLTF(key, url, onLoad, errorMessage) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        try {
          onLoad(gltf);
        } catch (error) {
          console.error(`${errorMessage} during scene setup`, error);
        } finally {
          updateCriticalAssetProgress(key, 1);
          resolve();
        }
      },
      (event) => trackCriticalAssetDownload(key, event),
      (error) => {
        console.error(errorMessage, error);
        // A missing optional decoration should not trap visitors forever on
        // the loading screen. Its placeholder remains and the room can open.
        updateCriticalAssetProgress(key, 1);
        resolve();
      },
    );
  });
}

// Non-critical decorations are intentionally scheduled after the room shell
// is visible. This keeps the large main room model from competing with every
// optional GLB for the first network connection and first render frame.
function scheduleRoomDecoration(task, delay = 0) {
  window.setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(task, { timeout: 1200 });
    } else {
      task();
    }
  }, delay);
}

async function prepareCriticalRoomAssets(room) {
  // Procedural pieces are added immediately behind the loading overlay. Photo
  // thumbnails and large GLBs then load in two lanes to avoid a network spike.
  const photoWallReady = createPhotoWall(room);
  createWallCalendarAndPocket(room);
  createCornerShelfAndMirror(room);
  createRecordPlayerMusicEffects(room);
  registerRoomInteractions(room);

  await Promise.all([
    photoWallReady,
    (async () => {
      await createImportedTeaTableLamp(room);
      await createWallRosieDoll(room);
    })(),
    (async () => {
      await createWallRosie(room);
      await createProfileCardHolder(room);
    })(),
  ]);

  registerRoomInteractions(room);
  room.updateMatrixWorld(true);
  // Compile shaders and draw one hidden frame before revealing the canvas, so
  // the first visible frame is already complete instead of assembling itself.
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

loader.load(
  "/models/zhengyifan-room.glb?revision=20260823-clear-left-corner-layout",
  async (gltf) => {
    const room = gltf.scene;
    roomModel = room;
    room.name = "Room3D";
    room.traverse((child) => {
      if (!child.isMesh) return;
      if (child.name.startsWith("DeskLamp_")) {
        child.visible = false;
        return;
      }
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!material) continue;
        material.envMapIntensity = 0.35;
        material.needsUpdate = true;
      }
    });

    const desktopShift = 0.55;
    const cupParts = [];
    room.traverse((object) => {
      if (object.name.startsWith("Computer_")) object.position.x += desktopShift;
      if (object.name.startsWith("Cake_")) {
        object.position.x += 0.07;
        object.position.z -= 0.12;
      }
      if (object.name.startsWith("Macaron_")) {
        object.position.x -= 0.05;
        object.position.z -= 0.11;
      }
      if (object.name.startsWith("Milk_Tea_")) {
        object.position.x -= 0.07;
        object.position.z -= 0.06;
      }
      if (object.name.startsWith("Desk_Water_")) {
        object.position.x -= 3.72;
        object.scale.multiplyScalar(1.55);
        cupParts.push(object);

        if (object.isMesh) {
          const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
          const refinedMaterials = sourceMaterials.map((sourceMaterial) => {
            const material = sourceMaterial.clone();
            material.metalness = 0;
            material.roughness = object.name.includes("Surface") ? 0.08 : 0.20;
            material.envMapIntensity = object.name.includes("Surface") ? 0.9 : 0.72;
            if (material.color && object.name.includes("Surface")) material.color.setHex(0xb9d9ed);
            else if (material.color && object.name.includes("Handle")) material.color.setHex(0xd9c4e8);
            else if (material.color && object.name.includes("Rim")) material.color.setHex(0xfff7ee);
            else if (material.color && object.name.includes("Cup")) material.color.setHex(0xf5e4f1);
            if (object.name.includes("Surface")) {
              material.transparent = true;
              material.opacity = 0.82;
            }
            material.needsUpdate = true;
            return material;
          });
          object.material = Array.isArray(object.material) ? refinedMaterials : refinedMaterials[0];
        }
      }

      if (/^Left_Cabinet_(Top|Bottom|Divider_)/.test(object.name)) {
        object.scale.x *= 1.22;
      }
    });

    room.updateMatrixWorld(true);
    if (cupParts.length) {
      const cupBounds = new THREE.Box3();
      cupParts.forEach((part) => cupBounds.expandByObject(part));
      const cupCenter = cupBounds.getCenter(new THREE.Vector3());
      const cupSize = cupBounds.getSize(new THREE.Vector3());
      const saucerRadius = Math.max(cupSize.x, cupSize.z) * 0.55;
      const saucerY = cupBounds.min.y + 0.018;
      const porcelain = new THREE.MeshPhysicalMaterial({
        color: 0xffedf3,
        roughness: 0.18,
        metalness: 0,
        clearcoat: 0.86,
        clearcoatRoughness: 0.16,
      });
      const gold = new THREE.MeshStandardMaterial({ color: 0xd8ad63, roughness: 0.26, metalness: 0.58 });
      const saucerGroup = new THREE.Group();
      saucerGroup.name = "Desk_Water_Refined_Saucer";

      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(saucerRadius * 0.82, saucerRadius, 0.055, 48), porcelain);
      saucer.position.set(cupCenter.x, saucerY, cupCenter.z);
      saucer.castShadow = true;
      saucer.receiveShadow = true;
      saucerGroup.add(saucer);

      const goldRim = new THREE.Mesh(new THREE.TorusGeometry(saucerRadius * 0.78, 0.012, 8, 48), gold);
      goldRim.rotation.x = Math.PI / 2;
      goldRim.position.set(cupCenter.x, saucerY + 0.033, cupCenter.z);
      saucerGroup.add(goldRim);

      const spoonHandle = new THREE.Mesh(new RoundedBoxGeometry(saucerRadius * 0.82, 0.022, 0.045, 3, 0.012), gold);
      spoonHandle.position.set(cupCenter.x + saucerRadius * 0.52, saucerY + 0.055, cupCenter.z + saucerRadius * 0.36);
      spoonHandle.rotation.y = -0.22;
      spoonHandle.castShadow = true;
      saucerGroup.add(spoonHandle);

      const spoonBowl = new THREE.Mesh(new THREE.SphereGeometry(0.065, 24, 16), gold);
      spoonBowl.scale.set(1.25, 0.24, 0.72);
      spoonBowl.position.set(cupCenter.x + saucerRadius * 0.94, saucerY + 0.064, cupCenter.z + saucerRadius * 0.27);
      spoonBowl.rotation.y = -0.22;
      saucerGroup.add(spoonBowl);

      const rimPart = room.getObjectByName("Desk_Water_Cup_Rim");
      if (rimPart) {
        const rimBounds = new THREE.Box3().setFromObject(rimPart);
        const rimCenter = rimBounds.getCenter(new THREE.Vector3());
        const rimSize = rimBounds.getSize(new THREE.Vector3());
        const decorativeRim = new THREE.Mesh(
          new THREE.TorusGeometry(Math.max(rimSize.x, rimSize.z) * 0.43, 0.013, 8, 48),
          gold,
        );
        decorativeRim.rotation.x = Math.PI / 2;
        decorativeRim.position.set(rimCenter.x, rimCenter.y + 0.012, rimCenter.z);
        decorativeRim.castShadow = true;
        saucerGroup.add(decorativeRim);
      }

      const cupBody = room.getObjectByName("Desk_Water_Cup");
      if (cupBody) {
        const bodyBounds = new THREE.Box3().setFromObject(cupBody);
        const bodyCenter = bodyBounds.getCenter(new THREE.Vector3());
        const heart = new THREE.Mesh(
          new THREE.ShapeGeometry(createHeartShape(Math.max(cupSize.y * 0.13, 0.075))),
          new THREE.MeshPhysicalMaterial({ color: 0xe89ab7, roughness: 0.28, clearcoat: 0.72, clearcoatRoughness: 0.18 }),
        );
        heart.position.set(bodyCenter.x, bodyCenter.y - cupSize.y * 0.03, bodyBounds.max.z + 0.012);
        heart.castShadow = true;
        saucerGroup.add(heart);
      }
      room.add(saucerGroup);
    }
    const chairGroup = room.getObjectByName("Chair_Group_Scale");
    if (chairGroup) chairGroup.position.x += desktopShift * 1.1;

    const deskGroup = room.getObjectByName("Desk_Group_Scale");
    if (deskGroup) {
      const computerCenterX = -2.85 + desktopShift * 1.1;
      const symmetricalHalfWidth = 3.10;
      deskGroup.scale.x = symmetricalHalfWidth / 3.42;
      deskGroup.position.x = computerCenterX;
    }

    const deskPlant = room.getObjectByName("Desk_Right_Plant_Root");
    if (deskPlant) {
      deskPlant.position.z = -2.72;
      deskPlant.scale.multiplyScalar(1.30);
    }

    const receiptPrinter = room.getObjectByName("Wall_Receipt_Printer_Root");
    if (receiptPrinter) {
      receiptPrinterObject = receiptPrinter;
      receiptPrinter.position.set(-8.60, 2.78, 7.70);
      receiptPrinter.rotation.y = Math.PI / 2;
      createReceiptPaper(room, receiptPrinter);
    }

    prepareSofaNightMaterials(room);
    styleComputerWelcomeScreen(room);
    setupWindowWeather(room);
    registerRoomInteractions(room);
    scene.add(room);

    updateCriticalAssetProgress("room", 1);
    try {
      await prepareCriticalRoomAssets(room);
    } catch (error) {
      // The base room is still usable if a procedural decoration fails.
      console.error("Critical room preparation failed", error);
    }

    setLoadingProgress(100);
    const revealRoom = () => {
      if (!reducedMotion) {
        room.scale.setScalar(0.92);
        room.rotation.y = -0.035;
        gsap.to(room.scale, { x: 1, y: 1, z: 1, duration: 2.15, ease: "power3.out" });
        gsap.to(room.rotation, { y: 0, duration: 2.25, ease: "power3.out" });
      }
      document.body.classList.add("is-ready");

      // The five hanging-ball GLBs are decorative and comparatively large.
      // Start them only after the complete first view is already interactive.
      scheduleRoomDecoration(() => createWallBallRack(room), 450);
    };
    if (reducedMotion) revealRoom();
    else window.setTimeout(revealRoom, Math.max(0, minimumLoadingDuration - (performance.now() - loadingStartedAt)));
  },
  (event) => trackCriticalAssetDownload("room", event),
  (error) => {
    progressLabel.textContent = "模型加载失败";
    console.error("Room model failed to load", error);
  },
);

function setLampState(nextState) {
  if (!deskLampLight) return;
  lampOn = nextState;
  const targetIntensity = lampOn ? 38 : 0;
  if (reducedMotion) {
    deskLampLight.intensity = targetIntensity;
  } else {
    gsap.to(deskLampLight, { intensity: targetIntensity, duration: 0.38, ease: "power2.out" });
  }
  for (const material of lampBulbMaterials) {
    material.emissiveIntensity = lampOn ? 3.2 : 0.03;
    material.needsUpdate = true;
  }
  if (lampSwitch) {
    lampSwitch.classList.toggle("is-on", lampOn);
    lampSwitch.setAttribute("aria-pressed", String(lampOn));
    lampSwitch.querySelector(".lamp-switch-label").textContent = `台灯：${lampOn ? "开" : "关"}`;
  }
}

function toggleLamp() {
  setLampState(!lampOn);
}

function setContactOpen(nextState) {
  contactCard.classList.toggle("is-open", nextState);
  contactCard.setAttribute("aria-hidden", String(!nextState));
}

function toggleContact() {
  setContactOpen(!contactCard.classList.contains("is-open"));
}

function renderProfileCardPreview() {
  if (!profileCardObject || !profileCardViewerCanvas) return;
  const stage = profileCardViewerCanvas.parentElement;
  const width = Math.max(280, Math.round(stage.clientWidth));
  const height = Math.max(280, Math.round(stage.clientHeight));

  if (!profilePreviewRenderer) {
    profilePreviewRenderer = new THREE.WebGLRenderer({
      canvas: profileCardViewerCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    profilePreviewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    profilePreviewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    profilePreviewRenderer.toneMappingExposure = 1.12;
    profilePreviewRenderer.shadowMap.enabled = true;
    profilePreviewRenderer.setClearColor(0x000000, 0);
  }
  profilePreviewRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  profilePreviewRenderer.setSize(width, height, false);

  profilePreviewScene = new THREE.Scene();
  const previewCopy = profileCardObject.clone(true);
  previewCopy.position.set(0, 0, 0);
  previewCopy.rotation.y = -0.10;
  previewCopy.updateMatrixWorld(true);
  const previewBounds = new THREE.Box3().setFromObject(previewCopy);
  const previewCenter = previewBounds.getCenter(new THREE.Vector3());
  const previewSize = previewBounds.getSize(new THREE.Vector3());
  previewCopy.position.sub(previewCenter);
  profilePreviewScene.add(previewCopy);

  profilePreviewScene.add(new THREE.HemisphereLight(0xfffbf4, 0x8c7899, 2.8));
  const keyLight = new THREE.DirectionalLight(0xfff1dc, 4.0);
  keyLight.position.set(3.5, 4.8, 6.2);
  profilePreviewScene.add(keyLight);
  const softFill = new THREE.PointLight(0xd6c1eb, 10, 12, 2);
  softFill.position.set(-3.2, 1.6, 4.2);
  profilePreviewScene.add(softFill);

  const largestSide = Math.max(previewSize.x, previewSize.y, previewSize.z, 0.1);
  profilePreviewCamera = new THREE.PerspectiveCamera(30, width / height, 0.01, 50);
  profilePreviewCamera.position.set(largestSide * 0.10, previewSize.y * 0.02, largestSide * 2.72);
  profilePreviewCamera.lookAt(0, 0, 0);
  profilePreviewRenderer.render(profilePreviewScene, profilePreviewCamera);
}

function openProfileCardViewer() {
  if (!profileCardObject) return;
  closePhotoViewer();
  profileCardViewer.classList.add("is-open");
  profileCardViewer.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    renderProfileCardPreview();
    profileCardViewerClose?.focus();
  });
}

function closeProfileCardViewer() {
  profileCardViewer.classList.remove("is-open");
  profileCardViewer.setAttribute("aria-hidden", "true");
}

function showPhotoAt(index) {
  const items = activePhotoViewerItems ?? PHOTO_WALL_ITEMS;
  currentPhotoIndex = (index + items.length) % items.length;
  const [url, title] = items[currentPhotoIndex];
  photoViewerImage.src = url;
  photoViewerImage.alt = title;
  photoViewerCaption.textContent = title;
}

function openPhotoViewer(url, items = PHOTO_WALL_ITEMS) {
  activePhotoViewerItems = items;
  const requestedIndex = items.findIndex(([photoUrl]) => photoUrl === url);
  showPhotoAt(requestedIndex >= 0 ? requestedIndex : 0);
  photoViewer.classList.add("is-open");
  photoViewer.setAttribute("aria-hidden", "false");
  photoViewerClose.focus();
}

function openFoodGallery() {
  openPhotoViewer(FOOD_GALLERY_ITEMS[0][0], FOOD_GALLERY_ITEMS);
}

function isTeaTableFood(object) {
  return object.name.startsWith("Cake_")
    || object.name.startsWith("Macaron_")
    || object.name.startsWith("Milk_Tea_");
}

function closePhotoViewer() {
  photoViewer.classList.remove("is-open");
  photoViewer.setAttribute("aria-hidden", "true");
}

lampSwitch?.addEventListener("click", toggleLamp);
contactCardClose.addEventListener("click", () => setContactOpen(false));
photoViewerClose.addEventListener("click", closePhotoViewer);
photoViewerPrevious.addEventListener("click", () => showPhotoAt(currentPhotoIndex - 1));
photoViewerNext.addEventListener("click", () => showPhotoAt(currentPhotoIndex + 1));
photoViewer.addEventListener("click", (event) => {
  if (event.target === photoViewer) closePhotoViewer();
});
profileCardViewerClose?.addEventListener("click", closeProfileCardViewer);
profileCardViewer?.addEventListener("click", (event) => {
  if (event.target === profileCardViewer) closeProfileCardViewer();
});
addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setContactOpen(false);
    closePhotoViewer();
    closeProfileCardViewer();
    if (computerFocusActive) setComputerFocus(false);
    if (receiptFocusActive) setReceiptFocus(false);
    if (profileCardFocusActive) setProfileCardFocus(false);
  }
  if (photoViewer.classList.contains("is-open") && event.key === "ArrowLeft") showPhotoAt(currentPhotoIndex - 1);
  if (photoViewer.classList.contains("is-open") && event.key === "ArrowRight") showPhotoAt(currentPhotoIndex + 1);
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerStart = null;

canvas.addEventListener("pointerdown", (event) => {
  pointerStart = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener("pointerup", (event) => {
  if (!pointerStart || !roomModel) return;
  const movement = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  pointerStart = null;
  if (movement > 7) return;

  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(roomModel, true);
  const interactionEntry = hits.map(({ object }) => findInteractionEntry(object)).find(Boolean);
  if (interactionEntry) playRoomInteraction(interactionEntry);
  for (const { object } of hits) {
    let current = object;
    while (current) {
      if (current.userData.photoUrl) {
        markInteractionDiscovered("photoWall");
        openPhotoViewer(current.userData.photoUrl);
        return;
      }
      if (current.name.startsWith("Computer_Monitor_")) {
        markInteractionDiscovered("computer");
        toggleComputerFocus();
        return;
      }
      if (current.name.startsWith("Wall_Receipt_Printer") || current.name.startsWith("ReceiptPaper_")) {
        markInteractionDiscovered("receiptPrinter");
        handleReceiptPrinterClick();
        return;
      }
      if (current.name.startsWith("Profile_Card_")) {
        markInteractionDiscovered("profileCard");
        toggleProfileCardFocus();
        return;
      }
      if (current.name.startsWith("Contact_Mailbox")) {
        markInteractionDiscovered("contactMailbox");
        toggleContact();
        return;
      }
      if (current.name.startsWith("Curtain")) {
        markInteractionDiscovered("curtainWeather");
        cycleWindowWeather();
        return;
      }
      if (isTeaTableFood(current)) {
        markInteractionDiscovered("foodGallery");
        openFoodGallery();
        return;
      }
      if (current.name.startsWith("TeaTable_OpalOrbLamp") || current.name.startsWith("Imported_Tea_Table_Lamp")) {
        toggleTeaTableLamp();
        return;
      }
      if (current.userData.recordPlayerMusicControl || current.name.startsWith("Record_Player")) {
        markInteractionDiscovered("recordPlayer");
        toggleMusicPlayback();
        return;
      }
      if (current.name.startsWith("DeskLamp_")) {
        toggleLamp();
        return;
      }
      current = current.parent;
    }
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!roomModel || event.buttons) return;
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(roomModel, true);
  const interactionEntry = hits.map(({ object }) => findInteractionEntry(object)).find(Boolean) ?? null;
  if (interactionEntry !== hoveredRoomInteraction) {
    setInteractionHover(hoveredRoomInteraction, false);
    hoveredRoomInteraction = interactionEntry;
    setInteractionHover(hoveredRoomInteraction, true);
  }
  let interactive = Boolean(interactionEntry);
  for (const { object } of hits) {
    let current = object;
    while (current) {
      if (
        current.userData.photoUrl
        || current.name.startsWith("Computer_Monitor_")
        || current.name.startsWith("Wall_Receipt_Printer")
        || current.name.startsWith("ReceiptPaper_")
        || current.name.startsWith("Profile_Card_")
        || current.name.startsWith("Contact_Mailbox")
        || current.name.startsWith("Curtain")
        || isTeaTableFood(current)
        || current.name.startsWith("TeaTable_OpalOrbLamp")
        || current.name.startsWith("Imported_Tea_Table_Lamp")
        || current.userData.recordPlayerMusicControl
        || current.name.startsWith("Record_Player")
        || current.name.startsWith("DeskLamp_")
      ) {
        interactive = true;
        break;
      }
      current = current.parent;
    }
    if (interactive) break;
  }
  canvas.style.cursor = interactive ? "pointer" : "grab";
});

canvas.addEventListener("pointerleave", () => {
  setInteractionHover(hoveredRoomInteraction, false);
  hoveredRoomInteraction = null;
  canvas.style.cursor = "grab";
});

const clock = new THREE.Clock();

function render() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;
  controls.update(delta);
  const sparkleSpeed = starCelebrationActive ? 5.2 : 1.45;
  const sparkleAmount = starCelebrationActive ? 0.24 : 0.075;
  starGlows.forEach((glow, index) => {
    const wave = Math.sin(elapsed * sparkleSpeed + glow.userData.phase + index * 0.16);
    glow.material.opacity = THREE.MathUtils.clamp(glow.userData.baseOpacity + wave * sparkleAmount, 0.04, 0.92);
  });
  if (starCelebrationActive) {
    const weatherState = WINDOW_WEATHER_STATES[windowWeatherIndex];
    starLightMaterials.forEach((material, index) => {
      material.emissiveIntensity = weatherState.starEmissive + 0.85 + Math.sin(elapsed * 4.6 + index * 1.2) * 0.72;
    });
    starPointLights.forEach((light, index) => {
      const baseIntensity = weatherState.key === "night" ? weatherState.starPoint : light.userData.dayIntensity * weatherState.starPoint;
      light.intensity = Math.max(0, baseIntensity + Math.sin(elapsed * 4.2 + index * 1.7) * 0.72);
    });
  }
  if (WINDOW_WEATHER_STATES[windowWeatherIndex].key === "rain" && windowWeatherTexture) {
    windowWeatherTexture.offset.y = (windowWeatherTexture.offset.y - delta * 0.11) % 1;
  }
  if (!roomAudio.paused) {
    if (recordMusicDisc) recordMusicDisc.rotation.y -= delta * 0.72;
    recordMusicNotes.forEach((note, index) => {
      const bounce = Math.sin(elapsed * (3.4 + index * 0.22) + note.userData.phase);
      const pulse = 0.92 + (bounce + 1) * 0.075;
      note.position.y = note.userData.baseY + bounce * (0.09 + index * 0.012);
      note.scale.setScalar(note.userData.baseScale * pulse);
      note.material.rotation = bounce * 0.12;
    });
  }
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  if (!computerFocusActive && !receiptFocusActive && !profileCardFocusActive) setCameraForViewport();
  else camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
});
