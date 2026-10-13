// ---------------------------------------------------------------------------
// Overlay rendering for the pose skeleton + body-anchored grid.
//
// Pure drawing helpers — no React, no refs.
// Responsibilities:
//   1. 1:1 canvas backing store synchronization to video dimensions
//   2. Full 33-point BlazePose skeleton rendering with neon glow + crisp stroke
//   3. All-joint forward motion extrapolation to eliminate rendering lag
//   4. Rock-solid torso-anchored tactical HUD grid ("AI TRACKER // LOCK")
//      that smoothly sticks to the fighter without flickering or jumping
//   5. Graceful low-confidence falloff (soft ghosting instead of vanishing)
// ---------------------------------------------------------------------------

import type { FilteredLandmark } from './landmarkFilter';
import { VISION_CONFIG } from './visionConfig';

const NOSE = 0;
const L_SHOULDER = 11, R_SHOULDER = 12;
const L_ELBOW = 13, R_ELBOW = 14;
const L_WRIST = 15, R_WRIST = 16;
const L_HIP = 23, R_HIP = 24;

/** Elbows, wrists and hand points: fast-moving striking joints. */
const ARM_JOINTS = new Set([13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);

/** Full 33-point BlazePose anatomical connections. */
const CONNECTIONS: [number, number][] = [
  // Face & Head
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Shoulders & Torso
  [11, 12],
  [11, 23], [12, 24], [23, 24],
  // Left Arm & Hand
  [11, 13], [13, 15],
  [15, 17], [15, 19], [15, 21], [17, 19],
  // Right Arm & Hand
  [12, 14], [14, 16],
  [16, 18], [16, 20], [16, 22], [18, 20],
  // Left Leg & Foot
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right Leg & Foot
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

/** A point ready to draw: extrapolated, confidence-scored. */
export interface DrawPoint {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  confidence: number;
}

export interface OverlayOptions {
  /** Which arms are currently mid-strike (highlights the wrist reticle). */
  striking: { L: boolean; R: boolean };
  /** Canvas is CSS-mirrored, so text must be counter-flipped to stay readable. */
  mirrored: boolean;
  /** Overall opacity 0-1; used to fade a held pose after tracking loss. */
  alpha: number;
  /** Optional debug HUD lines drawn top-left (as the viewer sees it). */
  debugLines?: string[];
}

/** Internal state for smoothing the body-anchored bounding box so it stays glued. */
interface SmoothedBox {
  cx: number;
  cy: number;
  w: number;
  h: number;
  initialized: boolean;
}

const smoothedBox: SmoothedBox = {
  cx: 0.5,
  cy: 0.5,
  w: 0.5,
  h: 0.7,
  initialized: false,
};

/** Reset bounding box smoothing (e.g. on new session or camera switch). */
export function resetOverlaySmoothing(): void {
  smoothedBox.initialized = false;
}

/**
 * Make the canvas backing store match the video's intrinsic size.
 */
export function syncCanvasToVideo(canvas: HTMLCanvasElement, video: HTMLVideoElement | null): boolean {
  const vw = video?.videoWidth || 0;
  const vh = video?.videoHeight || 0;
  const targetW = vw > 0 ? vw : canvas.width || 640;
  const targetH = vh > 0 ? vh : canvas.height || 480;
  if (canvas.width === targetW && canvas.height === targetH) return false;
  canvas.width = targetW;
  canvas.height = targetH;
  return true;
}

/**
 * Turn conditioned landmarks into drawable points.
 * Extrapolates ALL landmarks forward according to their velocity to hide
 * inference latency and keep the skeleton glued to the user at 60 FPS.
 */
export function buildDrawablePose(
  landmarks: readonly FilteredLandmark[],
  ageMs: number
): (DrawPoint | null)[] {
  const floor = VISION_CONFIG.overlay.drawConfidenceFloor; // 0.12
  const leadSec = Math.max(0, Math.min(ageMs, VISION_CONFIG.tracking.maxExtrapolateMs)) / 1000;
  const out: (DrawPoint | null)[] = new Array(landmarks.length);

  for (let i = 0; i < landmarks.length; i++) {
    const p = landmarks[i];
    if (!p || p.stale || p.confidence < floor) {
      out[i] = null;
      continue;
    }

    let x = p.x;
    let y = p.y;

    // Extrapolate all joints forward using their velocity to sync with live frame.
    // Arm joints get full lead, torso/head joints get smooth damped lead.
    if (!p.predicted) {
      const jointLead = ARM_JOINTS.has(i) ? leadSec : leadSec * 0.75;
      x += p.vx * jointLead;
      y += p.vy * jointLead;
    }

    out[i] = {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
      confidence: p.confidence,
    };
  }
  return out;
}

/** fillText that stays readable when the canvas itself is CSS-mirrored. */
function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  mirrored: boolean
): void {
  if (!mirrored) {
    ctx.fillText(text, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  pose: readonly (DrawPoint | null)[],
  w: number,
  h: number,
  opts: OverlayOptions
): void {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opts.alpha));

  // 1. Rock-Solid Torso-Anchored HUD Grid ("AI TRACKER // LOCK")
  const lS = pose[L_SHOULDER];
  const rS = pose[R_SHOULDER];
  const lH = pose[L_HIP];
  const rH = pose[R_HIP];

  if (lS && rS && lS.confidence > 0.22 && rS.confidence > 0.22) {
    const sDistNorm = Math.hypot(rS.x - lS.x, rS.y - lS.y) || 0.2;
    const sMidX = (lS.x + rS.x) / 2;
    const sMidY = (lS.y + rS.y) / 2;

    let targetCx = sMidX;
    let targetCy = sMidY + sDistNorm * 0.55;
    let targetW = Math.max(0.28, sDistNorm * 2.3);
    let targetH = Math.max(0.38, sDistNorm * 3.4);

    if (lH && rH && lH.confidence > 0.18 && rH.confidence > 0.18) {
      const hMidX = (lH.x + rH.x) / 2;
      const hMidY = (lH.y + rH.y) / 2;
      targetCx = (sMidX + hMidX) / 2;
      targetCy = (sMidY + hMidY) / 2;
      const torsoHeight = Math.hypot(hMidX - sMidX, hMidY - sMidY) || sDistNorm * 1.3;
      targetH = Math.max(0.42, torsoHeight * 2.4);
    }

    // Exponential smoothing so the combat grid STAYS GLUED to the fighter without snapping
    if (!smoothedBox.initialized) {
      smoothedBox.cx = targetCx;
      smoothedBox.cy = targetCy;
      smoothedBox.w = targetW;
      smoothedBox.h = targetH;
      smoothedBox.initialized = true;
    } else {
      const alpha = 0.22;
      smoothedBox.cx += (targetCx - smoothedBox.cx) * alpha;
      smoothedBox.cy += (targetCy - smoothedBox.cy) * alpha;
      smoothedBox.w += (targetW - smoothedBox.w) * alpha;
      smoothedBox.h += (targetH - smoothedBox.h) * alpha;
    }

    const boxW = smoothedBox.w * w;
    const boxH = smoothedBox.h * h;
    const gx1 = Math.max(6, smoothedBox.cx * w - boxW / 2);
    const gx2 = Math.min(w - 6, smoothedBox.cx * w + boxW / 2);
    const gy1 = Math.max(6, smoothedBox.cy * h - boxH / 2);
    const gy2 = Math.min(h - 6, smoothedBox.cy * h + boxH / 2);
    const gw = gx2 - gx1;
    const gh = gy2 - gy1;

    // Faint tactical interior grid lines
    ctx.beginPath();
    for (let r = 1; r < 4; r++) {
      const y = gy1 + (gh * r) / 4;
      ctx.moveTo(gx1, y);
      ctx.lineTo(gx2, y);
    }
    for (let c = 1; c < 3; c++) {
      const x = gx1 + (gw * c) / 3;
      ctx.moveTo(x, gy1);
      ctx.lineTo(x, gy2);
    }
    ctx.rect(gx1, gy1, gw, gh);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Sharp corner brackets & center target reticle
    ctx.beginPath();
    const b = Math.min(24, gw * 0.16, gh * 0.16);
    // Top-left
    ctx.moveTo(gx1, gy1 + b); ctx.lineTo(gx1, gy1); ctx.lineTo(gx1 + b, gy1);
    // Top-right
    ctx.moveTo(gx2 - b, gy1); ctx.lineTo(gx2, gy1); ctx.lineTo(gx2, gy1 + b);
    // Bottom-left
    ctx.moveTo(gx1, gy2 - b); ctx.lineTo(gx1, gy2); ctx.lineTo(gx1 + b, gy2);
    // Bottom-right
    ctx.moveTo(gx2 - b, gy2); ctx.lineTo(gx2, gy2); ctx.lineTo(gx2, gy2 - b);

    // Torso center crosshairs
    const cx = (gx1 + gx2) / 2;
    const cy = gy1 + gh * 0.40;
    ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10);
    ctx.strokeStyle = 'rgba(226, 255, 59, 0.65)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Lock badge
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 9px monospace';
    drawText(ctx, 'AI TRACKER // LOCK', gx1 + 8, Math.max(16, gy1 - 6), opts.mirrored);
  }

  // 2. Full 33-point Skeleton Bones
  // Pass A: Outer Neon Cyan Glow
  ctx.beginPath();
  for (const [i, j] of CONNECTIONS) {
    const a = pose[i], c = pose[j];
    if (!a || !c) continue;
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(c.x * w, c.y * h);
  }
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.32)';
  ctx.stroke();

  // Pass B: Inner Crisp Neon Line
  ctx.beginPath();
  for (const [i, j] of CONNECTIONS) {
    const a = pose[i], c = pose[j];
    if (!a || !c) continue;
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(c.x * w, c.y * h);
  }
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = '#22d3ee';
  ctx.stroke();

  // 3. All 33 Landmark Dots
  for (let i = 0; i < pose.length; i++) {
    const p = pose[i];
    if (!p) continue;
    const isWrist = i === L_WRIST || i === R_WRIST;
    const isHead = i === NOSE;
    const r = isWrist ? 4.2 : isHead ? 3.8 : ARM_JOINTS.has(i) ? 3.2 : 2.6;
    const alpha = p.confidence >= 0.35 ? 1.0 : Math.max(0.35, p.confidence / 0.35);

    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fillStyle = isWrist ? '#e2ff3b' : `rgba(103, 232, 249, ${alpha})`;
    ctx.fill();
  }

  // 4. Tactical Wrist Reticles (Strike vs Guard indicator)
  const drawReticle = (idx: number, key: 'L' | 'R') => {
    const p = pose[idx];
    if (!p) return;
    const px = p.x * w, py = p.y * h;
    const on = opts.striking[key];
    const rad = on ? 14 : 9.5;

    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.moveTo(px - rad - 4, py); ctx.lineTo(px + rad + 4, py);
    ctx.moveTo(px, py - rad - 4); ctx.lineTo(px, py + rad + 4);
    ctx.strokeStyle = on ? '#e2ff3b' : 'rgba(34, 211, 238, 0.75)';
    ctx.lineWidth = on ? 2.2 : 1.3;
    ctx.stroke();

    ctx.fillStyle = on ? '#e2ff3b' : 'rgba(34, 211, 238, 0.85)';
    ctx.font = 'bold 8px monospace';
    drawText(ctx, on ? `${key}-STRIKE` : `${key}-GUARD`, px + rad + 5, py + 3, opts.mirrored);
  };
  drawReticle(L_WRIST, 'L');
  drawReticle(R_WRIST, 'R');

  // 5. Debug HUD
  if (opts.debugLines && opts.debugLines.length > 0) {
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = 'rgba(226, 255, 59, 0.95)';
    const x = opts.mirrored ? w - 8 : 8;
    opts.debugLines.forEach((line, k) => drawText(ctx, line, x, 18 + k * 15, opts.mirrored));
  }

  ctx.restore();
}
