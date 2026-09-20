// ---------------------------------------------------------------------------
// Device capability tiering
//
// The app previously hardcoded the Lite pose model + "infer on every rAF
// frame" for every device. That is simultaneously too slow for a low-end
// phone (inference can't keep up with the frame loop, so the queue backs up
// and the skeleton lags badly) and a waste of a desktop GPU (which could
// afford the Full/Heavy model and produce materially better landmarks).
//
// This module picks a tier ONCE at startup from cheap, synchronous signals,
// then lets the engine refine it at runtime from measured inference cost
// (see poseEngine's adaptive downshift). Nothing here blocks startup.
// ---------------------------------------------------------------------------

export type DeviceTier = 'low' | 'mid' | 'high';

export type PoseModelVariant = 'lite' | 'full' | 'heavy';

export interface TierProfile {
  tier: DeviceTier;
  /** Which pose model asset to load. */
  model: PoseModelVariant;
  /** Target inference rate. Rendering stays at full camera rate regardless. */
  inferenceFps: number;
  /** Whether to also run hand tracking (roughly doubles per-frame cost). */
  enableHands: boolean;
  /** Camera capture resolution request. */
  captureWidth: number;
  captureHeight: number;
  /** Human-readable reason, surfaced in diagnostics. */
  reason: string;
}

/**
 * Browser APIs this module probes that aren't in the baseline DOM lib:
 * `navigator.gpu` (WebGPU) and `navigator.deviceMemory` (Device Memory API,
 * Chromium-only). Declared narrowly rather than casting to `any` so a typo
 * in a property name is still a compile error.
 */
interface NavigatorCapabilities {
  gpu?: unknown;
  deviceMemory?: number;
}

/** WebGL extension used to read the unmasked GPU renderer string. */
interface DebugRendererInfo {
  UNMASKED_RENDERER_WEBGL: number;
}

export interface GpuInfo {
  hasWebGL2: boolean;
  hasWebGPU: boolean;
  renderer: string;
}

/**
 * Probe GPU capability. Wrapped in try/catch throughout because
 * WEBGL_debug_renderer_info is blocked entirely in some privacy
 * configurations, and creating a WebGL context can throw on locked-down
 * or headless environments.
 */
export function probeGpu(): GpuInfo {
  const result: GpuInfo = { hasWebGL2: false, hasWebGPU: false, renderer: '' };
  if (typeof window === 'undefined' || typeof document === 'undefined') return result;

  const nav = navigator as Navigator & NavigatorCapabilities;
  result.hasWebGPU = typeof nav.gpu !== 'undefined';

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (gl) {
      result.hasWebGL2 = true;
      try {
        const ext = gl.getExtension('WEBGL_debug_renderer_info') as DebugRendererInfo | null;
        if (ext) {
          result.renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
        }
      } catch {
        /* renderer string is a nice-to-have, never required */
      }
      // Release the probe context promptly rather than waiting for GC —
      // browsers cap simultaneous WebGL contexts and the real pipeline
      // needs one.
      try {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        /* best effort */
      }
    }
  } catch {
    /* no WebGL at all — stays false, tier drops to 'low' below */
  }

  return result;
}

/**
 * Heuristics deliberately biased toward UNDER-estimating the device.
 * Shipping a too-heavy model to a weak phone produces visible lag and a
 * ruined session; shipping a slightly-too-light model produces slightly
 * noisier landmarks that the filtering layer largely absorbs. The runtime
 * upshift path (see poseEngine) recovers the difference on capable
 * hardware within a few seconds, so the cost of guessing low is small.
 */
export function detectDeviceTier(): TierProfile {
  if (typeof navigator === 'undefined') {
    return profileFor('mid', 'server-side render default');
  }

  const cores = navigator.hardwareConcurrency || 2;
  const nav = navigator as Navigator & NavigatorCapabilities;
  const memoryGb = nav.deviceMemory;
  const gpu = probeGpu();
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  // No WebGL2 at all means CPU/WASM inference only — always low tier.
  if (!gpu.hasWebGL2) {
    return profileFor('low', 'no WebGL2 available (CPU inference only)');
  }

  // Known-weak integrated/mobile GPU strings. Matching is best-effort; a
  // miss just falls through to the core/memory heuristics below.
  if (/Mali-4|Mali-T[0-9]{3}|Adreno \(TM\) [1-4][0-9]{2}|PowerVR SGX|Videocore/i.test(gpu.renderer)) {
    return profileFor('low', `low-power GPU detected (${gpu.renderer})`);
  }

  if (memoryGb !== undefined && memoryGb <= 2) {
    return profileFor('low', `device reports ${memoryGb}GB RAM`);
  }

  if (cores <= 4) {
    return profileFor(isMobile ? 'low' : 'mid', `${cores} logical cores`);
  }

  if (isMobile) {
    // A modern phone with 6+ cores handles the Full model, but heavy is
    // consistently a thermal-throttling risk on sustained camera use —
    // a boxing round is exactly the sustained load that triggers it.
    return profileFor('mid', `mobile device, ${cores} cores`);
  }

  if (cores >= 8 && (memoryGb === undefined || memoryGb >= 8)) {
    return profileFor('high', `desktop-class, ${cores} cores`);
  }

  return profileFor('mid', `${cores} cores, desktop`);
}

export function profileFor(tier: DeviceTier, reason: string): TierProfile {
  switch (tier) {
    case 'low':
      return {
        tier,
        model: 'lite',
        inferenceFps: 18,
        enableHands: false,
        captureWidth: 480,
        captureHeight: 360,
        reason,
      };
    case 'high':
      return {
        tier,
        model: 'heavy',
        inferenceFps: 30,
        enableHands: true,
        captureWidth: 960,
        captureHeight: 720,
        reason,
      };
    case 'mid':
    default:
      return {
        tier: 'mid',
        model: 'full',
        inferenceFps: 24,
        enableHands: true,
        captureWidth: 640,
        captureHeight: 480,
        reason,
      };
  }
}

/** Step a tier down one level; returns null if already at the bottom. */
export function downshift(tier: DeviceTier): DeviceTier | null {
  if (tier === 'high') return 'mid';
  if (tier === 'mid') return 'low';
  return null;
}
