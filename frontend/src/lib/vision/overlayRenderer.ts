// ---------------------------------------------------------------------------
// Overlay rendering for the pose skeleton + body-anchored grid.
//
// Pure drawing helpers — no React, no refs. The page owns state and passes in
// what to draw. Keeping this separate makes three earlier bugs fixable in one
// place:
//   1. canvas resolution drifting away from the video (grid "not sticking")
//   2. stale / frozen-ghost joints being drawn (arms "not following")
//   3. inference-rate stepping (skeleton trailing fast punches)
// ---------------------------------------------------------------------------

import type { FilteredLandmark } from './landmarkFilter';
import { VISION_CONFIG } from './visionConfig';

const L_SHOULDER = 11, R_SHOULDER = 12;
const L_WRIST = 15, R_WRIST = 16;
const NOSE = 0;

/** Elbows, wrists and hand points: the fast-moving joints worth extrapolating. */
const ARM_JOINTS = new Set([13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);

const CONNECTIONS: [number, number][] = [
  [0, 2], [2, 7], [0, 5], [5, 8], [9, 10], [0, 11], [0, 12],
  [11, 12],
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [11, 24], [12, 23],
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

/** A point ready to draw: already extrapolated and confidence-gated. */
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

/**
 * Make the canvas backing store match the video's intrinsic size.
 *
 * The canvas and video are both stretched to the same CSS box with the same
 * object-fit, so if their intrinsic aspect ratios match, normalized landmark
 * coordinates land on the same pixels. Returns true when a resize happened.
 * Cheap enough to call every frame: it only writes when the size changed
 * (writing canvas.width always clears the canvas and reallocates).
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
 *
 *  - Stale points (gone longer than the prediction window) are dropped: they
 *    are frozen ghosts, not the person's arm.
 *  - Low-confidence points are dropped.
 *  - Measured (not already predicted) arm joints are pushed forward by their
 *    last velocity for `ageMs`, hiding inference latency so the skeleton
 *    doesn't trail a fast punch.
 */
export function buildDrawablePose(
  landmarks: readonly FilteredLandmark[],
  ageMs: number
): (DrawPoint | null)[] {
  const floor = VISION_CONFIG.overlay.drawConfidenceFloor;
  const lead = Math.max(0, Math.min(ageMs, VISION_CONFIG.tracking.maxExtrapolateMs)) / 1000;
  const out: (DrawPoint | null)[] = new Array(landmarks.length);
  for (let i = 0; i < landmarks.length; i++) {
    const p = landmarks[i];
    if (!p || p.stale || p.confidence < floor) {
      out[i] = null;
      continue;
    }
    let x = p.x;
    let y = p.y;
    if (!p.predicted && ARM_JOINTS.has(i)) {
      x += p.vx * lead;
      y += p.vy * lead;
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

  // 1. Body-anchored bounding envelope from points that are really there.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let count = 0;
  for (let i = 0; i < pose.length; i++) {
    const p = pose[i];
    if (!p) continue;
    count++;
    const px = p.x * w, py = p.y * h;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  const lS = pose[L_SHOULDER], rS = pose[R_SHOULDER];
  if (count >= 4 && lS && rS) {
    const shoulderDist = Math.hypot((rS.x - lS.x) * w, (rS.y - lS.y) * h) || 120;
    // Waist-up framing: extend the envelope down past the hips.
    if (maxY - minY < shoulderDist * 1.7) {
      maxY = Math.min(h - 6, minY + shoulderDist * 2.2);
    }
    const padX = Math.max(22, (maxX - minX) * 0.08);
    const padY = Math.max(22, (maxY - minY) * 0.06);
    const gx1 = Math.max(6, minX - padX);
    const gx2 = Math.min(w - 6, maxX + padX);
    const gy1 = Math.max(6, minY - padY);
    const gy2 = Math.min(h - 6, maxY + padY);
    const gw = gx2 - gx1;
    const gh = gy2 - gy1;

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
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    const b = Math.min(22, gw * 0.15, gh * 0.15);
    ctx.moveTo(gx1, gy1 + b); ctx.lineTo(gx1, gy1); ctx.lineTo(gx1 + b, gy1);
    ctx.moveTo(gx2 - b, gy1); ctx.lineTo(gx2, gy1); ctx.lineTo(gx2, gy1 + b);
    ctx.moveTo(gx1, gy2 - b); ctx.lineTo(gx1, gy2); ctx.lineTo(gx1 + b, gy2);
    // Bottom-right bracket: the old code ended at (gx2 - b, gy2), drawing a
    // line back on itself instead of turning up the right edge.
    ctx.moveTo(gx2 - b, gy2); ctx.lineTo(gx2, gy2); ctx.lineTo(gx2, gy2 - b);
    const cx = (gx1 + gx2) / 2;
    const cy = gy1 + gh * 0.42;
    ctx.moveTo(cx - 9, cy); ctx.lineTo(cx + 9, cy);
    ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 9);
    ctx.strokeStyle = 'rgba(226, 255, 59, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
    ctx.font = 'bold 8px monospace';
    drawText(ctx, 'AI TRACKER // LOCK', gx1 + 6, Math.max(14, gy1 - 6), opts.mirrored);
  }

  // 2. Skeleton: soft glow pass, then crisp pass.
  const strokeBones = (width: number, style: string) => {
    ctx.beginPath();
    for (const [i, j] of CONNECTIONS) {
      const a = pose[i], c = pose[j];
      if (!a || !c) continue;
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(c.x * w, c.y * h);
    }
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.stroke();
  };
  strokeBones(4.5, 'rgba(6, 182, 212, 0.28)');
  strokeBones(1.8, '#22d3ee');

  // 3. Joints. Arms are drawn larger so following them is obvious.
  ctx.beginPath();
  for (let i = 0; i < pose.length; i++) {
    const p = pose[i];
    if (!p) continue;
    const r = i === L_WRIST || i === R_WRIST || i === NOSE ? 3.8 : ARM_JOINTS.has(i) ? 3.2 : 2.5;
    ctx.moveTo(p.x * w + r, p.y * h);
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = '#67e8f9';
  ctx.fill();

  // 4. Wrist reticles.
  const reticle = (idx: number, key: 'L' | 'R') => {
    const p = pose[idx];
    if (!p) return;
    const px = p.x * w, py = p.y * h;
    const on = opts.striking[key];
    const rad = on ? 13 : 9;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.moveTo(px - rad - 3, py); ctx.lineTo(px + rad + 3, py);
    ctx.moveTo(px, py - rad - 3); ctx.lineTo(px, py + rad + 3);
    ctx.strokeStyle = on ? '#e2ff3b' : 'rgba(34, 211, 238, 0.7)';
    ctx.lineWidth = on ? 2 : 1.2;
    ctx.stroke();
    ctx.fillStyle = on ? '#e2ff3b' : 'rgba(34, 211, 238, 0.75)';
    ctx.font = 'bold 7px monospace';
    drawText(ctx, on ? `${key}-STRIKE` : `${key}-GUARD`, px + rad + 4, py + 3, opts.mirrored);
  };
  reticle(L_WRIST, 'L');
  reticle(R_WRIST, 'R');

  // 5. Debug HUD (top-left as the viewer sees it).
  if (opts.debugLines && opts.debugLines.length > 0) {
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = 'rgba(226, 255, 59, 0.95)';
    const x = opts.mirrored ? w - 8 : 8;
    opts.debugLines.forEach((line, k) => drawText(ctx, line, x, 16 + k * 14, opts.mirrored));
  }

  ctx.restore();
}
