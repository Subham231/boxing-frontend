// ---------------------------------------------------------------------------
// Pose engine
//
// One place that owns: model loading, the inference loop, adaptive
// performance, and graceful degradation. vision/page.tsx previously did all
// of this inline — twice, since the fallback-camera path contained a
// near-identical copy of the init + detect loop, and the two copies could
// (and did) drift apart.
//
// What changed vs the old inline implementation:
//
//   * Uses @mediapipe/tasks-vision's PoseLandmarker instead of the legacy
//     @mediapipe/pose Solutions API. Same 33-point BlazePose topology, so
//     every downstream measurement is unaffected, but it additionally
//     exposes WORLD landmarks (metric 3D) and supports a GPU delegate.
//   * Self-hosts wasm + model from /public instead of a CDN, so a session
//     can start on a flaky connection and the app isn't broken by a CDN
//     outage. Falls back to CDN, then to the legacy API, before giving up.
//   * Decouples inference rate from render rate. Rendering stays at the
//     camera's full frame rate; inference is capped per device tier. This
//     is the single biggest battery/thermal win available.
//   * Measures its own inference cost and downshifts tier automatically if
//     the device can't sustain the target — so one build runs acceptably
//     from a budget Android up to a desktop.
//   * Optionally runs HandLandmarker alongside, which is what makes wrist
//     alignment and guard-return measurable at all.
// ---------------------------------------------------------------------------

import {
  DeviceTier,
  PoseModelVariant,
  TierProfile,
  detectDeviceTier,
  downshift,
  profileFor,
} from './deviceTier';


// ---------------------------------------------------------------------------
// Minimal structural types for the dynamically-imported MediaPipe surface.
//
// The tasks-vision bundle is loaded at RUNTIME from a CDN (see
// TASKS_VISION_CDN), so its real types aren't available to the compiler at
// the import site. Rather than fall back to `any` everywhere — which would
// silently swallow a renamed method or a wrong argument shape — only the
// members actually called are declared here. A typo in one of these is
// still a compile error.
// ---------------------------------------------------------------------------

interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

interface PoseDetectResult {
  landmarks?: NormalizedLandmark[][];
  worldLandmarks?: NormalizedLandmark[][];
}

interface HandCategory {
  categoryName?: string;
  score?: number;
}

interface HandDetectResult {
  landmarks?: NormalizedLandmark[][];
  handedness?: HandCategory[][];
}

interface VisionTask {
  close?: () => void;
}

interface PoseLandmarkerTask extends VisionTask {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => PoseDetectResult;
}

interface HandLandmarkerTask extends VisionTask {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => HandDetectResult;
}

/** Opaque handle returned by FilesetResolver.forVisionTasks. */
type VisionFileset = unknown;

interface TasksVisionModule {
  FilesetResolver?: {
    forVisionTasks: (wasmPath: string) => Promise<VisionFileset>;
  };
  PoseLandmarker?: {
    createFromOptions: (
      fileset: VisionFileset,
      options: Record<string, unknown>
    ) => Promise<PoseLandmarkerTask>;
  };
  HandLandmarker?: {
    createFromOptions: (
      fileset: VisionFileset,
      options: Record<string, unknown>
    ) => Promise<HandLandmarkerTask>;
  };
}

/** Legacy @mediapipe/pose Solutions API — the degraded fallback path. */
interface LegacyPoseResults {
  poseLandmarks?: NormalizedLandmark[];
  poseWorldLandmarks?: NormalizedLandmark[];
}

interface LegacyPose {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (cb: (results: LegacyPoseResults) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
  close?: () => void;
}

export type EngineBackend = 'tasks-vision' | 'legacy';

export interface EngineFrame {
  /** Normalized image-space landmarks (x,y in 0..1). 33 points. */
  landmarks: RawPoint[];
  /**
   * Metric 3D landmarks, origin at the hip midpoint, in approximate
   * meters. Only available on the tasks-vision backend — empty array on
   * legacy. This is what makes true 3D joint angles possible.
   */
  worldLandmarks: RawPoint[];
  /** Up to 2 hands, 21 points each. Empty when hand tracking is off. */
  hands: HandFrame[];
  /** performance.now() at the time this frame was produced. */
  timestampMs: number;
  /** Wall-clock cost of this inference, milliseconds. */
  inferenceMs: number;
}

export interface RawPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface HandFrame {
  landmarks: RawPoint[];
  /** 'Left' | 'Right' as reported by the model (image-space, so mirrored). */
  handedness: string;
  score: number;
}

export interface EngineStatus {
  backend: EngineBackend;
  tier: DeviceTier;
  model: PoseModelVariant;
  handsEnabled: boolean;
  /** Rolling mean inference cost, ms. */
  avgInferenceMs: number;
  /** Achieved inference rate, Hz. */
  inferenceFps: number;
  /** Rendering/camera loop rate, Hz. */
  renderFps: number;
  delegate: 'GPU' | 'CPU';
}

export interface PoseEngineOptions {
  /** Called once per completed inference. */
  onFrame: (frame: EngineFrame) => void;
  /** Called on every rAF tick, before/independent of inference. */
  onRenderTick?: () => void;
  /** Called whenever tier/backend/perf status changes materially. */
  onStatus?: (status: EngineStatus) => void;
  /** Force a tier instead of auto-detecting (used by settings/diagnostics). */
  forceTier?: DeviceTier;
  /** Hard-disable hand tracking regardless of tier. */
  disableHands?: boolean;
}

const TASKS_VISION_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs';

/**
 * Model asset resolution. Lite is self-hosted (it already ships in
 * /public/models). Full and Heavy fall back to Google's CDN unless they've
 * also been placed in /public/models — see the README note in this
 * directory. A 404 on any of these downgrades to lite rather than failing.
 */
const MODEL_SOURCES: Record<PoseModelVariant, string[]> = {
  lite: [
    '/models/pose_landmarker_lite.task',
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  ],
  full: [
    '/models/pose_landmarker_full.task',
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  ],
  heavy: [
    '/models/pose_landmarker_heavy.task',
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
  ],
};

const HAND_MODEL_SOURCES = [
  '/models/hand_landmarker.task',
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
];

const WASM_SOURCES = ['/wasm', 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'];

/** Rolling window used for the adaptive perf decision. */
const PERF_WINDOW = 45;
/**
 * If mean inference cost exceeds this share of the target frame budget, the
 * device can't sustain the current tier. 0.85 leaves headroom for the
 * render loop and the rest of the app to still hit frame deadlines.
 */
const PERF_BUDGET_RATIO = 0.85;
/** Don't react to perf until this many frames have been measured. */
const PERF_MIN_SAMPLES = 30;
/** Don't downshift more than once per this interval. */
const PERF_COOLDOWN_MS = 4000;

export class PoseEngine {
  private opts: PoseEngineOptions;
  private profile: TierProfile;

  private backend: EngineBackend = 'tasks-vision';
  private delegate: 'GPU' | 'CPU' = 'GPU';

  private poseLandmarker: PoseLandmarkerTask | null = null;
  private handLandmarker: HandLandmarkerTask | null = null;
  private legacyPose: LegacyPose | null = null;
  private visionFileset: VisionFileset | null = null;

  private video: HTMLVideoElement | null = null;
  private rafId: number | null = null;
  private running = false;
  private paused = false;
  private inflight = false;
  private disposed = false;

  private lastInferenceAt = 0;
  private lastVideoTime = -1;

  private inferenceTimes: number[] = [];
  private lastDownshiftAt = 0;

  // Rate counters
  private renderFrames = 0;
  private inferenceFrames = 0;
  private rateWindowStart = 0;
  private renderFps = 0;
  private achievedInferenceFps = 0;

  /** Buffer reused for legacy-backend results, which arrive via callback. */
  private legacyPending: { resolve: () => void } | null = null;
  private legacyLatest: EngineFrame | null = null;

  constructor(options: PoseEngineOptions) {
    this.opts = options;
    this.profile = options.forceTier
      ? profileFor(options.forceTier, 'forced by caller')
      : detectDeviceTier();
    if (options.disableHands) this.profile = { ...this.profile, enableHands: false };
  }

  get status(): EngineStatus {
    const avg = this.inferenceTimes.length
      ? this.inferenceTimes.reduce((a, b) => a + b, 0) / this.inferenceTimes.length
      : 0;
    return {
      backend: this.backend,
      tier: this.profile.tier,
      model: this.profile.model,
      handsEnabled: this.profile.enableHands && !!this.handLandmarker,
      avgInferenceMs: Math.round(avg * 10) / 10,
      inferenceFps: this.achievedInferenceFps,
      renderFps: this.renderFps,
      delegate: this.delegate,
    };
  }

  get tierProfile(): TierProfile {
    return this.profile;
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  /**
   * Load models. Resolves true if ANY backend came up. Tries, in order:
   * tasks-vision + GPU, tasks-vision + CPU, legacy Solutions API. Each
   * fallback is a real degradation path, not a retry of the same thing.
   */
  async initialize(): Promise<boolean> {
    if (this.disposed) return false;

    const viaTasks = await this.initTasksVision();
    if (viaTasks) {
      this.backend = 'tasks-vision';
      this.emitStatus();
      return true;
    }

    console.warn('[poseEngine] tasks-vision unavailable, falling back to legacy Solutions API');
    const viaLegacy = await this.initLegacy();
    if (viaLegacy) {
      this.backend = 'legacy';
      this.emitStatus();
      return true;
    }

    return false;
  }

  private async initTasksVision(): Promise<boolean> {
    let visionModule: TasksVisionModule | null = null;
    try {
      // Dynamic import of a remote ESM bundle. Kept as a runtime import
      // rather than a static one so a CDN failure degrades to the legacy
      // path instead of breaking the page build/bundle.
      visionModule = (await import(/* webpackIgnore: true */ TASKS_VISION_CDN)) as TasksVisionModule;
    } catch (err) {
      console.warn('[poseEngine] failed to load tasks-vision bundle:', err);
      return false;
    }

    const { FilesetResolver, PoseLandmarker, HandLandmarker } = visionModule ?? {};
    if (!FilesetResolver || !PoseLandmarker) return false;

    // Resolve the wasm fileset, preferring the self-hosted copy.
    for (const wasmPath of WASM_SOURCES) {
      try {
        this.visionFileset = await FilesetResolver.forVisionTasks(wasmPath);
        break;
      } catch (err) {
        console.warn(`[poseEngine] wasm fileset failed at ${wasmPath}:`, err);
      }
    }
    if (!this.visionFileset) return false;

    // Try the requested model, then progressively lighter ones. A missing
    // full/heavy asset must not break the session.
    const variants: PoseModelVariant[] =
      this.profile.model === 'heavy'
        ? ['heavy', 'full', 'lite']
        : this.profile.model === 'full'
        ? ['full', 'lite']
        : ['lite'];

    for (const variant of variants) {
      for (const modelPath of MODEL_SOURCES[variant]) {
        for (const delegate of ['GPU', 'CPU'] as const) {
          try {
            this.poseLandmarker = await PoseLandmarker.createFromOptions(this.visionFileset, {
              baseOptions: { modelAssetPath: modelPath, delegate },
              runningMode: 'VIDEO',
              numPoses: 1,
              minPoseDetectionConfidence: 0.5,
              minPosePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
              outputSegmentationMasks: false,
            });
            this.delegate = delegate;
            if (variant !== this.profile.model) {
              console.warn(
                `[poseEngine] ${this.profile.model} model unavailable, using ${variant}`
              );
              this.profile = { ...this.profile, model: variant };
            }
            break;
          } catch (err) {
            // GPU delegate creation genuinely fails on some drivers;
            // CPU is the meaningful retry, not noise.
            console.warn(`[poseEngine] ${variant}/${delegate} init failed:`, err);
          }
        }
        if (this.poseLandmarker) break;
      }
      if (this.poseLandmarker) break;
    }

    if (!this.poseLandmarker) return false;

    // Hands are optional and must never block pose coming up.
    if (this.profile.enableHands && HandLandmarker) {
      for (const modelPath of HAND_MODEL_SOURCES) {
        try {
          this.handLandmarker = await HandLandmarker.createFromOptions(this.visionFileset, {
            baseOptions: { modelAssetPath: modelPath, delegate: this.delegate },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          break;
        } catch (err) {
          console.warn('[poseEngine] hand landmarker init failed:', err);
        }
      }
    }

    return true;
  }

  private async initLegacy(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Load the legacy global script if it isn't already present.
    if (!(window as unknown as { Pose?: unknown }).Pose) {
      const ok = await new Promise<boolean>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
      });
      if (!ok) return false;
    }

    const PoseCtor = (window as unknown as { Pose?: new (cfg: { locateFile: (f: string) => string }) => LegacyPose }).Pose;
    if (!PoseCtor) return false;

    try {
      const pose = new PoseCtor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });
      pose.setOptions({
        // Legacy is the degraded path by definition — keep it cheap.
        modelComplexity: this.profile.tier === 'low' ? 0 : 1,
        // Built-in smoothing stays OFF: this app runs its own One Euro
        // filter, and stacking two temporal filters adds latency twice.
        smoothLandmarks: false,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      pose.onResults((results: LegacyPoseResults) => this.onLegacyResults(results));
      this.legacyPose = pose;
      this.delegate = 'CPU';
      return true;
    } catch (err) {
      console.warn('[poseEngine] legacy pose init failed:', err);
      return false;
    }
  }

  private onLegacyResults(results: LegacyPoseResults) {
    const now = performance.now();
    this.legacyLatest = {
      landmarks: results?.poseLandmarks ?? [],
      // The legacy API exposes poseWorldLandmarks under this name; it is
      // present on recent builds but not guaranteed, hence the fallback.
      worldLandmarks: results?.poseWorldLandmarks ?? [],
      hands: [],
      timestampMs: now,
      inferenceMs: this.lastInferenceAt ? now - this.lastInferenceAt : 0,
    };
    const pending = this.legacyPending;
    this.legacyPending = null;
    pending?.resolve();
  }

  // -------------------------------------------------------------------------
  // Loop
  // -------------------------------------------------------------------------

  start(video: HTMLVideoElement): void {
    if (this.running || this.disposed) return;
    this.video = video;
    this.running = true;
    this.rateWindowStart = performance.now();
    this.renderFrames = 0;
    this.inferenceFrames = 0;
    this.loop();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  private loop = (): void => {
    if (!this.running || this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const now = performance.now();
    this.renderFrames++;

    // Render tick fires every frame regardless of inference — this is the
    // decoupling that keeps the overlay smooth while inference runs slower.
    try {
      this.opts.onRenderTick?.();
    } catch (err) {
      console.warn('[poseEngine] render tick threw:', err);
    }

    // Rate accounting, once per second.
    if (now - this.rateWindowStart >= 1000) {
      const elapsed = (now - this.rateWindowStart) / 1000;
      this.renderFps = Math.round(this.renderFrames / elapsed);
      this.achievedInferenceFps = Math.round(this.inferenceFrames / elapsed);
      this.renderFrames = 0;
      this.inferenceFrames = 0;
      this.rateWindowStart = now;
      this.emitStatus();
    }

    if (this.paused || this.inflight) return;

    const minInterval = 1000 / this.profile.inferenceFps;
    if (now - this.lastInferenceAt < minInterval) return;

    const video = this.video;
    if (!video || video.readyState < 2) return;

    // Skip re-running inference on a frame we've already processed. The
    // camera may deliver at 30fps while rAF runs at 60 — without this we'd
    // pay full inference cost to produce a duplicate result.
    if (video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;

    this.lastInferenceAt = now;
    void this.infer(video, now);
  };

  private async infer(video: HTMLVideoElement, now: number): Promise<void> {
    this.inflight = true;
    const started = performance.now();

    try {
      if (this.backend === 'tasks-vision' && this.poseLandmarker) {
        // detectForVideo requires a strictly increasing timestamp.
        const result = this.poseLandmarker.detectForVideo(video, now);
        const landmarks: RawPoint[] = result?.landmarks?.[0] ?? [];
        const worldLandmarks: RawPoint[] = result?.worldLandmarks?.[0] ?? [];

        let hands: HandFrame[] = [];
        if (this.handLandmarker) {
          try {
            const handResult = this.handLandmarker.detectForVideo(video, now);
            const handLists: RawPoint[][] = handResult?.landmarks ?? [];
            hands = handLists.map((lms, i) => ({
              landmarks: lms,
              handedness: handResult?.handedness?.[i]?.[0]?.categoryName ?? '',
              score: handResult?.handedness?.[i]?.[0]?.score ?? 0,
            }));
          } catch (err) {
            // A hand-tracking failure must never take pose down with it.
            console.warn('[poseEngine] hand inference failed:', err);
          }
        }

        const inferenceMs = performance.now() - started;
        this.recordInference(inferenceMs);
        this.opts.onFrame({
          landmarks,
          worldLandmarks,
          hands,
          timestampMs: now,
          inferenceMs,
        });
      } else if (this.legacyPose) {
        await new Promise<void>((resolve) => {
          this.legacyPending = { resolve };
          this.legacyPose
            ?.send({ image: video })
            .catch((err: unknown) => {
              console.warn('[poseEngine] legacy send failed:', err);
              this.legacyPending = null;
              resolve();
            });
          // Don't let a swallowed callback wedge the loop permanently.
          setTimeout(() => {
            if (this.legacyPending?.resolve === resolve) {
              this.legacyPending = null;
              resolve();
            }
          }, 500);
        });

        const inferenceMs = performance.now() - started;
        this.recordInference(inferenceMs);
        if (this.legacyLatest) {
          this.opts.onFrame({ ...this.legacyLatest, inferenceMs, timestampMs: now });
          this.legacyLatest = null;
        }
      }
    } catch (err) {
      console.warn('[poseEngine] inference failed:', err);
    } finally {
      this.inflight = false;
      this.inferenceFrames++;
    }
  }

  // -------------------------------------------------------------------------
  // Adaptive performance
  // -------------------------------------------------------------------------

  private recordInference(ms: number): void {
    this.inferenceTimes.push(ms);
    if (this.inferenceTimes.length > PERF_WINDOW) this.inferenceTimes.shift();
    this.maybeAdapt();
  }

  /**
   * If the device can't hold the current tier's budget, drop a tier. This
   * is what lets one build run on a budget Android without either
   * hardcoding the weakest settings for everyone or shipping a stuttering
   * experience to weak devices.
   *
   * Deliberately one-directional: we downshift but never auto-upshift
   * mid-session. Oscillating between models during a round would reload
   * the model (a multi-hundred-ms stall) repeatedly and change the
   * measurement characteristics partway through a session, which would
   * corrupt exactly the rep-to-rep consistency metrics the analysis
   * depends on.
   */
  private maybeAdapt(): void {
    if (this.inferenceTimes.length < PERF_MIN_SAMPLES) return;
    const now = performance.now();
    if (now - this.lastDownshiftAt < PERF_COOLDOWN_MS) return;

    const avg = this.inferenceTimes.reduce((a, b) => a + b, 0) / this.inferenceTimes.length;
    const budget = (1000 / this.profile.inferenceFps) * PERF_BUDGET_RATIO;
    if (avg <= budget) return;

    // First relief valve: drop hand tracking, which is roughly half the
    // per-frame cost and the least critical signal.
    if (this.handLandmarker) {
      console.warn(
        `[poseEngine] inference ${avg.toFixed(1)}ms over ${budget.toFixed(1)}ms budget — disabling hand tracking`
      );
      try {
        this.handLandmarker.close?.();
      } catch {
        /* best effort */
      }
      this.handLandmarker = null;
      this.profile = { ...this.profile, enableHands: false };
      this.inferenceTimes = [];
      this.lastDownshiftAt = now;
      this.emitStatus();
      return;
    }

    // Second: drop the inference rate before dropping model quality —
    // fewer good landmarks beats more bad ones for biomechanics.
    if (this.profile.inferenceFps > 15) {
      const next = Math.max(15, Math.round(this.profile.inferenceFps * 0.75));
      console.warn(`[poseEngine] reducing inference rate ${this.profile.inferenceFps} -> ${next}fps`);
      this.profile = { ...this.profile, inferenceFps: next };
      this.inferenceTimes = [];
      this.lastDownshiftAt = now;
      this.emitStatus();
      return;
    }

    // Last: swap to a lighter model. Requires a reload, so it's the final
    // resort.
    const nextTier = downshift(this.profile.tier);
    if (nextTier) {
      console.warn(`[poseEngine] downshifting tier ${this.profile.tier} -> ${nextTier}`);
      this.lastDownshiftAt = now;
      this.inferenceTimes = [];
      void this.reloadAtTier(nextTier);
    }
  }

  private async reloadAtTier(tier: DeviceTier): Promise<void> {
    const next = profileFor(tier, 'runtime performance downshift');
    // Preserve the already-reduced inference rate rather than resetting it
    // back up to the new tier's nominal value.
    this.profile = { ...next, inferenceFps: Math.min(next.inferenceFps, this.profile.inferenceFps) };

    try {
      this.poseLandmarker?.close?.();
    } catch {
      /* best effort */
    }
    this.poseLandmarker = null;

    const ok = await this.initTasksVision();
    if (!ok) {
      console.warn('[poseEngine] reload after downshift failed; attempting legacy backend');
      const legacyOk = await this.initLegacy();
      this.backend = legacyOk ? 'legacy' : this.backend;
    }
    this.emitStatus();
  }

  private emitStatus(): void {
    try {
      this.opts.onStatus?.(this.status);
    } catch (err) {
      console.warn('[poseEngine] status callback threw:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Teardown
  // -------------------------------------------------------------------------

  dispose(): void {
    this.disposed = true;
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const closable of [this.poseLandmarker, this.handLandmarker, this.legacyPose]) {
      try {
        closable?.close?.();
      } catch {
        /* best effort */
      }
    }
    this.poseLandmarker = null;
    this.handLandmarker = null;
    this.legacyPose = null;
    this.visionFileset = null;
    this.video = null;
    this.legacyPending = null;
    this.legacyLatest = null;
  }
}
