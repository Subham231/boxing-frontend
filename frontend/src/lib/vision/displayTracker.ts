// ---------------------------------------------------------------------------
// Display tracker — the low-latency position source for the skeleton + grid.
//
// WHY THIS EXISTS
//   The analysis pipeline (LandmarkFilter) deliberately smooths hard: that is
//   right for angles and velocities, but it costs ~85ms of lag on shoulders
//   and hips — exactly the points the grid is anchored to. One signal cannot
//   serve both jobs, so the overlay gets its own path, fed from the RAW model
//   output. The analysis never reads anything from this file and this file
//   never writes into the analysis state.
//
// HOW IT WORKS (all joints, all 33, every frame)
//   1. A per-joint alpha-beta tracker (position + velocity). Its gain rises
//      with joint speed, so a still body is calm and a fast fist is not held
//      back (a fixed gain made wrists worse in testing).
//   2. At draw time the position is predicted forward by the time since the
//      measurement, using an exponentially-decaying velocity. That integral is
//      bounded (v * tau), so a punch reversal can't make the joint rubber-band
//      the way constant-velocity extrapolation does.
//   3. Joints are never dropped: a joint the model stops reporting coasts,
//      then holds as a "ghost". A joint that comes back is eased in instead of
//      popping.
//
// Everything is time-based (dt in ms), so behaviour does not depend on the
// inference rate or the display refresh rate.
// ---------------------------------------------------------------------------

import { VISION_CONFIG } from './visionConfig';

const N = 33;
/** Elbows, wrists and hand points: fast striking joints. */
const ARM = new Set([13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);

export type PointState = 'live' | 'predicted' | 'ghost';

export interface DisplayPoint {
  /** Normalized video coordinates (0-1), may fall slightly outside when off-frame. */
  x: number;
  y: number;
  /** 0-1. Drives drawing style only; never fed to the analysis. */
  confidence: number;
  state: PointState;
}

/** Minimal structural type so this module doesn't depend on the engine's types. */
export interface RawLandmark {
  x: number;
  y: number;
  visibility?: number;
}

interface Joint {
  init: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Time of the last accepted measurement (ms, performance.now domain). */
  ts: number;
  vis: number;
  rejects: number;
  /** Re-acquire easing offset, decays to zero. */
  ex: number;
  ey: number;
  easeTs: number;
  /** Decay time constant (ms) of the current offset. */
  easeMs: number;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export class DisplayTracker {
  private joints: Joint[] = [];
  private out: (DisplayPoint | null)[] = new Array(N).fill(null);
  private pts: DisplayPoint[] = [];
  private lastMeasuredAtMs = 0;

  constructor() {
    for (let i = 0; i < N; i++) {
      this.joints.push({ init: false, x: 0, y: 0, vx: 0, vy: 0, ts: 0, vis: 0, rejects: 0, ex: 0, ey: 0, easeTs: 0, easeMs: VISION_CONFIG.display.easeOutMs });
      this.pts.push({ x: 0, y: 0, confidence: 0, state: 'ghost' });
    }
  }

  /** Time (ms) of the last frame that contained a person, 0 if none yet. */
  get lastMeasuredAt(): number {
    return this.lastMeasuredAtMs;
  }

  reset(): void {
    for (const j of this.joints) {
      j.init = false;
      j.vx = j.vy = 0;
      j.rejects = 0;
      j.ex = j.ey = 0;
    }
    this.lastMeasuredAtMs = 0;
  }

  /**
   * Feed one inference result. `ts` is the frame's timestamp (the same
   * performance.now-domain value the engine reports); `nowMs` is the moment
   * the result is being applied (performance.now()), used to ease the
   * correction. An empty array means the model saw nobody: joints simply keep
   * coasting/holding.
   */
  update(raw: readonly RawLandmark[] | undefined, ts: number, nowMs: number = ts): void {
    if (!raw || raw.length === 0) return;
    const cfg = VISION_CONFIG.display;
    this.lastMeasuredAtMs = ts;

    for (let i = 0; i < N; i++) {
      const m = raw[i];
      if (!m || !Number.isFinite(m.x) || !Number.isFinite(m.y)) continue;
      const vis = m.visibility ?? 1;
      const j = this.joints[i];

      if (!j.init) {
        j.init = true;
        j.x = m.x;
        j.y = m.y;
        j.vx = j.vy = 0;
        j.ts = ts;
        j.vis = vis;
        j.rejects = 0;
        j.ex = j.ey = 0;
        continue;
      }

      const gapMs = ts - j.ts;
      if (gapMs <= 0) continue; // out-of-order / duplicate timestamp
      const dt = Math.max(0.004, gapMs / 1000);

      // Where the tracker expected the joint to be right now.
      const px = j.x + j.vx * dt;
      const py = j.y + j.vy * dt;
      const rx = m.x - px;
      const ry = m.y - py;

      // Long gap (joint was coasting/ghosted): re-anchor and ease the jump away.
      if (gapMs > cfg.predictedMs) {
        this.reanchor(j, i, m.x, m.y, ts, vis);
        continue;
      }

      // Glitch / limb-swap guard: an impossible jump is rejected, but only a few
      // times in a row — after that the model is right and the tracker was wrong.
      if (Math.hypot(rx, ry) / dt > cfg.outlierSpeed) {
        j.rejects++;
        if (j.rejects >= cfg.reacquireAfterRejects) this.reanchor(j, i, m.x, m.y, ts, vis);
        continue;
      }
      j.rejects = 0;

      const c = ARM.has(i) ? cfg.arm : cfg.body;
      const beforeBase = this.basePosition(i, nowMs);
      const speed = Math.hypot(j.vx, j.vy);
      const adaptive = c.gMin + (c.gMax - c.gMin) * Math.min(1, speed / c.vRef);
      // Low visibility => trust the measurement less (stronger smoothing).
      const visFactor = clamp(vis / cfg.visFullAt, c.visFloor, 1);
      const g = Math.min(1, adaptive * visFactor);

      j.x = px + g * rx;
      j.y = py + g * ry;
      j.vx += (0.5 * g * rx) / dt;
      j.vy += (0.5 * g * ry) / dt;
      const sp = Math.hypot(j.vx, j.vy);
      if (sp > cfg.maxSpeed) {
        const k = cfg.maxSpeed / sp;
        j.vx *= k;
        j.vy *= k;
      }
      j.ts = ts;
      j.vis = vis;

      // Ease the correction: the joint was being drawn at `beforeBase` (+ any
      // offset still decaying); keep it there at `nowMs` and let the offset
      // melt away over c.easeMs, so the new measurement arrives as a glide.
      if (beforeBase) {
        const afterBase = this.basePosition(i, nowMs);
        if (afterBase) {
          const f = j.ex !== 0 || j.ey !== 0 ? Math.exp(-Math.max(0, nowMs - j.easeTs) / j.easeMs) : 0;
          // Only a fraction (easeMix) of the correction is eased; the rest is
          // shown immediately. Easing all of it would hide the fresh measurement
          // on the very next draw — which, right after inference, is the only
          // draw a slow device gets per update.
          j.ex = j.ex * f + (beforeBase.x - afterBase.x) * c.easeMix;
          j.ey = j.ey * f + (beforeBase.y - afterBase.y) * c.easeMix;
          j.easeTs = nowMs;
          j.easeMs = c.easeMs;
        }
      }
    }
  }

  private reanchor(j: Joint, i: number, x: number, y: number, ts: number, vis: number): void {
    // Where the joint was being drawn at this instant, so the jump can be eased.
    const before = this.position(i, ts);
    j.x = x;
    j.y = y;
    j.vx = j.vy = 0;
    j.ts = ts;
    j.vis = vis;
    j.rejects = 0;
    j.ex = before ? before.x - x : 0;
    j.ey = before ? before.y - y : 0;
    j.easeTs = ts;
    j.easeMs = VISION_CONFIG.display.easeOutMs;
  }

  /** Predicted position without the easing offset. */
  private basePosition(i: number, now: number): { x: number; y: number } | null {
    const j = this.joints[i];
    if (!j.init) return null;
    const cfg = VISION_CONFIG.display;
    const tau = (ARM.has(i) ? cfg.arm.tauMs : cfg.body.tauMs) / 1000;
    const lead = clamp(now - j.ts, 0, cfg.maxLeadMs) / 1000;
    // Integral of an exponentially-decaying velocity: bounded by v*tau.
    const k = tau * (1 - Math.exp(-lead / tau));
    return { x: j.x + j.vx * k, y: j.y + j.vy * k };
  }

  /** Predicted position of joint i at time `now` (ms), including the easing offset. */
  private position(i: number, now: number): { x: number; y: number } | null {
    const base = this.basePosition(i, now);
    if (!base) return null;
    const j = this.joints[i];
    let { x, y } = base;
    if (j.ex !== 0 || j.ey !== 0) {
      const f = Math.exp(-Math.max(0, now - j.easeTs) / j.easeMs);
      if (f < 0.01) {
        j.ex = j.ey = 0;
      } else {
        x += j.ex * f;
        y += j.ey * f;
      }
    }
    return { x: clamp(x, -0.5, 1.5), y: clamp(y, -0.5, 1.5) };
  }

  /**
   * Positions of all 33 joints at time `now` (ms). A slot is null only if that
   * joint has never been seen. The returned array and its point objects are
   * reused between calls — read them immediately, don't keep references.
   */
  sample(now: number): readonly (DisplayPoint | null)[] {
    const cfg = VISION_CONFIG.display;
    for (let i = 0; i < N; i++) {
      const j = this.joints[i];
      const pos = this.position(i, now);
      if (!pos) {
        this.out[i] = null;
        continue;
      }
      const age = Math.max(0, now - j.ts);
      const state: PointState = age <= cfg.liveMs ? 'live' : age <= cfg.predictedMs ? 'predicted' : 'ghost';
      // Confidence fades with age but never reaches zero: ghosts stay visible.
      const ageFade =
        state === 'live' ? 1 : state === 'predicted' ? 1 - 0.6 * ((age - cfg.liveMs) / (cfg.predictedMs - cfg.liveMs)) : 0.4;
      const p = this.pts[i];
      p.x = pos.x;
      p.y = pos.y;
      p.confidence = clamp(j.vis * ageFade, VISION_CONFIG.overlay.drawConfidenceFloor, 1);
      p.state = state;
      this.out[i] = p;
    }
    return this.out;
  }
}
