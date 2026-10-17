// ---------------------------------------------------------------------------
// Overlay rendering for the pose skeleton + body-anchored grid.
//
// Pure drawing helpers — no React. Display only: the analysis never reads
// anything from here.
//
// Responsibilities:
//   1. Canvas backing store matched to the on-screen box x devicePixelRatio
//      (crisp lines; capped so low-end GPUs aren't asked to fill a huge layer)
//   2. Exact video->canvas mapping that mirrors CSS `object-cover`, so a point
//      lands on the same body part in the video whatever the screen shape
//   3. All 33 BlazePose landmarks, always: confident ones solid, uncertain ones
//      dim, unseen/coasting ones as ghost rings — nothing silently vanishes
//   4. A torso-anchored tactical grid whose POSITION follows the body with no
//      extra smoothing (smoothing position is what made it trail the fighter);
//      only its SIZE is smoothed, with a time constant so it is frame-rate
//      independent
//   5. A cheap path for the power saver (no glow pass, fewer pixels)
// ---------------------------------------------------------------------------

import { DisplayTracker, type DisplayPoint } from './displayTracker';
import { VISION_CONFIG } from './visionConfig';

const NOSE = 0;
const L_SHOULDER = 11, R_SHOULDER = 12;
const L_WRIST = 15, R_WRIST = 16;
const L_HIP = 23, R_HIP = 24;

/** Elbows, wrists and hand points: fast-moving striking joints. */
const ARM_JOINTS = new Set([13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
/** Joints worth an edge marker when they leave the visible area. */
const EDGE_MARKED = new Set([0, 11, 12, 13, 14, 15, 16]);

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

/** Confidence bands that decide how a point/bone is styled. */
const SOLID_CONF = 0.35;
const GHOST_CONF = 0.15;

export interface OverlayOptions {
  /** Which arms are currently mid-strike (highlights the wrist reticle). */
  striking: { L: boolean; R: boolean };
  /** Canvas is CSS-mirrored, so text must be counter-flipped to stay readable. */
  mirrored: boolean;
  /** Overall opacity 0-1; used to fade a held pose after tracking loss. */
  alpha: number;
  /** Current time (ms, performance.now domain) — drives the grid size smoothing. */
  nowMs: number;
  /** Power saver: skip the glow pass. */
  saver?: boolean;
  /** Optional debug HUD lines drawn top-left (as the viewer sees it). */
  debugLines?: string[];
}

/** Video-normalized -> canvas-pixel mapping that mirrors CSS object-cover. */
interface CoverMap {
  w: number; // canvas width (px)
  h: number; // canvas height (px)
  vw: number; // video intrinsic width
  vh: number; // video intrinsic height
  scale: number;
  offX: number;
  offY: number;
  /** canvas px per CSS px — keeps line widths/fonts visually constant. */
  ui: number;
}

/** Everything the renderer remembers between frames (one per page, not global). */
export class OverlayState {
  readonly map: CoverMap = { w: 640, h: 480, vw: 640, vh: 480, scale: 1, offX: 0, offY: 0, ui: 1 };
  readonly sx = new Float32Array(33);
  readonly sy = new Float32Array(33);
  grid = { w: 0, h: 0, cx: 0, cy: 0, init: false };
  lastDrawAt = 0;

  reset(): void {
    this.grid.init = false;
    this.lastDrawAt = 0;
  }
}

/**
 * Display rig = the low-latency tracker + the renderer's memory. One instance
 * lives in the page. `reset()` is the soft reset (new drill, camera keeps
 * running: the skeleton must not blank); `hardReset()` is for camera
 * start/stop.
 */
export class DisplayRig {
  readonly tracker = new DisplayTracker();
  readonly overlay = new OverlayState();

  reset(): void {
    this.overlay.reset();
  }

  hardReset(): void {
    this.tracker.reset();
    this.overlay.reset();
  }
}

/**
 * Size the canvas backing store to its on-screen box x devicePixelRatio,
 * bounded by a pixel budget. Returns true if the size changed.
 * Falls back to the video's intrinsic size before layout exists.
 */
export function syncCanvasToVideo(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement | null,
  saver = false
): boolean {
  const cfg = VISION_CONFIG.display;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;

  let targetW: number;
  let targetH: number;
  if (cssW > 0 && cssH > 0) {
    let dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, saver ? cfg.dprCapSaver : cfg.dprCap);
    const budget = saver ? cfg.maxCanvasPixelsSaver : cfg.maxCanvasPixels;
    const px = cssW * dpr * cssH * dpr;
    if (px > budget) dpr *= Math.sqrt(budget / px);
    targetW = Math.max(2, Math.round(cssW * dpr));
    targetH = Math.max(2, Math.round(cssH * dpr));
  } else {
    const vw = video?.videoWidth || 0;
    const vh = video?.videoHeight || 0;
    targetW = vw > 0 ? vw : canvas.width || 640;
    targetH = vh > 0 ? vh : canvas.height || 480;
  }
  if (canvas.width === targetW && canvas.height === targetH) return false;
  canvas.width = targetW;
  canvas.height = targetH;
  return true;
}

/** Recompute the object-cover mapping for the current canvas + video sizes. */
export function updateCoverMap(state: OverlayState, canvas: HTMLCanvasElement, video: HTMLVideoElement | null): void {
  const m = state.map;
  m.w = canvas.width;
  m.h = canvas.height;
  m.vw = video?.videoWidth || m.w;
  m.vh = video?.videoHeight || m.h;
  m.scale = Math.max(m.w / m.vw, m.h / m.vh);
  m.offX = (m.w - m.vw * m.scale) / 2;
  m.offY = (m.h - m.vh * m.scale) / 2;
  m.ui = canvas.clientWidth > 0 ? m.w / canvas.clientWidth : 1;
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
  pose: readonly (DisplayPoint | null)[],
  state: OverlayState,
  opts: OverlayOptions
): void {
  const m = state.map;
  const W = m.w;
  const H = m.h;
  const ui = m.ui;
  const sx = state.sx;
  const sy = state.sy;

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opts.alpha));

  // Screen-space position of every point, once.
  const vwS = m.vw * m.scale;
  const vhS = m.vh * m.scale;
  for (let i = 0; i < 33; i++) {
    const p = pose[i];
    if (!p) continue;
    sx[i] = p.x * vwS + m.offX;
    sy[i] = p.y * vhS + m.offY;
  }

  // dt for the grid's size smoothing (time-based => frame-rate independent).
  const dtMs = state.lastDrawAt > 0 ? Math.min(100, Math.max(1, opts.nowMs - state.lastDrawAt)) : 16;
  state.lastDrawAt = opts.nowMs;

  // 1. Torso-anchored grid ---------------------------------------------------
  const lS = pose[L_SHOULDER];
  const rS = pose[R_SHOULDER];
  const lH = pose[L_HIP];
  const rH = pose[R_HIP];
  const g = state.grid;
  const shouldersOk = !!lS && !!rS && lS.confidence > 0.22 && rS.confidence > 0.22;

  if (shouldersOk) {
    const sDist = Math.hypot(sx[R_SHOULDER] - sx[L_SHOULDER], sy[R_SHOULDER] - sy[L_SHOULDER]) || vwS * 0.2;
    const sMidX = (sx[L_SHOULDER] + sx[R_SHOULDER]) / 2;
    const sMidY = (sy[L_SHOULDER] + sy[R_SHOULDER]) / 2;

    let targetCx = sMidX;
    let targetCy = sMidY + sDist * 0.55;
    let targetW = Math.max(0.28 * vwS, sDist * 2.3);
    let targetH = Math.max(0.38 * vhS, sDist * 3.4);

    if (lH && rH && lH.confidence > 0.18 && rH.confidence > 0.18) {
      const hMidX = (sx[L_HIP] + sx[R_HIP]) / 2;
      const hMidY = (sy[L_HIP] + sy[R_HIP]) / 2;
      targetCx = (sMidX + hMidX) / 2;
      targetCy = (sMidY + hMidY) / 2;
      const torsoH = Math.hypot(hMidX - sMidX, hMidY - sMidY) || sDist * 1.3;
      targetH = Math.max(0.42 * vhS, torsoH * 2.4);
    }

    // POSITION: straight from the tracked body, no smoothing — smoothing it is
    // exactly what made the grid trail the fighter. SIZE: smoothed with a time
    // constant so it doesn't breathe with landmark jitter.
    g.cx = targetCx;
    g.cy = targetCy;
    if (!g.init) {
      g.w = targetW;
      g.h = targetH;
      g.init = true;
    } else {
      const a = 1 - Math.exp(-dtMs / VISION_CONFIG.display.gridSizeTauMs);
      g.w += (targetW - g.w) * a;
      g.h += (targetH - g.h) * a;
    }
  }

  if (g.init) {
    // If the shoulders are momentarily unreliable, keep the last box but dim it.
    if (!shouldersOk) ctx.globalAlpha *= 0.35;

    const margin = 6 * ui;
    const gx1 = Math.max(margin, g.cx - g.w / 2);
    const gx2 = Math.min(W - margin, g.cx + g.w / 2);
    const gy1 = Math.max(margin, g.cy - g.h / 2);
    const gy2 = Math.min(H - margin, g.cy + g.h / 2);
    const gw = gx2 - gx1;
    const gh = gy2 - gy1;

    if (gw > 8 && gh > 8) {
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
      ctx.lineWidth = ui;
      ctx.stroke();

      // Sharp corner brackets & center target reticle
      ctx.beginPath();
      const b = Math.min(24 * ui, gw * 0.16, gh * 0.16);
      ctx.moveTo(gx1, gy1 + b); ctx.lineTo(gx1, gy1); ctx.lineTo(gx1 + b, gy1);
      ctx.moveTo(gx2 - b, gy1); ctx.lineTo(gx2, gy1); ctx.lineTo(gx2, gy1 + b);
      ctx.moveTo(gx1, gy2 - b); ctx.lineTo(gx1, gy2); ctx.lineTo(gx1 + b, gy2);
      ctx.moveTo(gx2 - b, gy2); ctx.lineTo(gx2, gy2); ctx.lineTo(gx2, gy2 - b);

      const cx = (gx1 + gx2) / 2;
      const cy = gy1 + gh * 0.4;
      const cr = 10 * ui;
      ctx.moveTo(cx - cr, cy); ctx.lineTo(cx + cr, cy);
      ctx.moveTo(cx, cy - cr); ctx.lineTo(cx, cy + cr);
      ctx.strokeStyle = 'rgba(226, 255, 59, 0.65)';
      ctx.lineWidth = 1.8 * ui;
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.font = `bold ${9 * ui}px monospace`;
      drawText(ctx, 'AI TRACKER // LOCK', gx1 + 8 * ui, Math.max(16 * ui, gy1 - 6 * ui), opts.mirrored);
    }
    if (!shouldersOk) ctx.globalAlpha = Math.max(0, Math.min(1, opts.alpha));
  }

  // 2. Skeleton bones: confident bones solid, uncertain ones faint ------------
  const bone = (ghost: boolean) => {
    ctx.beginPath();
    for (let k = 0; k < CONNECTIONS.length; k++) {
      const i = CONNECTIONS[k][0];
      const j = CONNECTIONS[k][1];
      const a = pose[i];
      const c = pose[j];
      if (!a || !c) continue;
      const isGhost = a.confidence < GHOST_CONF || c.confidence < GHOST_CONF;
      if (isGhost !== ghost) continue;
      ctx.moveTo(sx[i], sy[i]);
      ctx.lineTo(sx[j], sy[j]);
    }
  };

  if (!opts.saver) {
    bone(false); // outer neon glow
    ctx.lineWidth = 4.5 * ui;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.32)';
    ctx.stroke();
  }
  bone(false); // crisp line
  ctx.lineWidth = 1.8 * ui;
  ctx.strokeStyle = '#22d3ee';
  ctx.stroke();

  bone(true); // ghost bones: present, but clearly "not measured"
  ctx.lineWidth = 1.2 * ui;
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.22)';
  ctx.stroke();

  // 3. All 33 landmark dots ----------------------------------------------------
  for (let i = 0; i < 33; i++) {
    const p = pose[i];
    if (!p) continue;
    const x = sx[i];
    const y = sy[i];
    const isWrist = i === L_WRIST || i === R_WRIST;
    const r = (isWrist ? 4.2 : i === NOSE ? 3.8 : ARM_JOINTS.has(i) ? 3.2 : 2.6) * ui;

    // Outside the visible (cropped) area: mark the edge instead of vanishing.
    if (x < 0 || x > W || y < 0 || y > H) {
      if (EDGE_MARKED.has(i) && p.confidence >= GHOST_CONF) {
        const ex = Math.min(W - 8 * ui, Math.max(8 * ui, x));
        const ey = Math.min(H - 8 * ui, Math.max(8 * ui, y));
        ctx.beginPath();
        ctx.moveTo(ex, ey - 6 * ui); ctx.lineTo(ex + 6 * ui, ey); ctx.lineTo(ex, ey + 6 * ui); ctx.lineTo(ex - 6 * ui, ey);
        ctx.closePath();
        ctx.strokeStyle = isWrist ? '#e2ff3b' : 'rgba(103, 232, 249, 0.85)';
        ctx.lineWidth = 1.6 * ui;
        ctx.stroke();
      }
      continue;
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (p.confidence < GHOST_CONF || p.state === 'ghost') {
      // Not currently measured: hollow ring.
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.45)';
      ctx.lineWidth = 1.2 * ui;
      ctx.stroke();
    } else {
      const a = p.confidence >= SOLID_CONF ? 1 : Math.max(0.35, p.confidence / SOLID_CONF);
      ctx.fillStyle = isWrist ? '#e2ff3b' : `rgba(103, 232, 249, ${a})`;
      ctx.fill();
    }
  }

  // 4. Wrist reticles (strike vs guard) ---------------------------------------
  const drawReticle = (idx: number, key: 'L' | 'R') => {
    const p = pose[idx];
    if (!p) return;
    const px = Math.min(W - 10 * ui, Math.max(10 * ui, sx[idx]));
    const py = Math.min(H - 10 * ui, Math.max(10 * ui, sy[idx]));
    const on = opts.striking[key];
    const rad = (on ? 14 : 9.5) * ui;

    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.moveTo(px - rad - 4 * ui, py); ctx.lineTo(px + rad + 4 * ui, py);
    ctx.moveTo(px, py - rad - 4 * ui); ctx.lineTo(px, py + rad + 4 * ui);
    ctx.strokeStyle = on ? '#e2ff3b' : 'rgba(34, 211, 238, 0.75)';
    ctx.lineWidth = (on ? 2.2 : 1.3) * ui;
    ctx.stroke();

    ctx.fillStyle = on ? '#e2ff3b' : 'rgba(34, 211, 238, 0.85)';
    ctx.font = `bold ${8 * ui}px monospace`;
    drawText(ctx, on ? `${key}-STRIKE` : `${key}-GUARD`, px + rad + 5 * ui, py + 3 * ui, opts.mirrored);
  };
  drawReticle(L_WRIST, 'L');
  drawReticle(R_WRIST, 'R');

  // 5. Debug HUD ----------------------------------------------------------------
  if (opts.debugLines && opts.debugLines.length > 0) {
    ctx.font = `bold ${11 * ui}px monospace`;
    ctx.fillStyle = 'rgba(226, 255, 59, 0.95)';
    const x = opts.mirrored ? W - 8 * ui : 8 * ui;
    opts.debugLines.forEach((line, k) => drawText(ctx, line, x, (18 + k * 15) * ui, opts.mirrored));
  }

  ctx.restore();
}
