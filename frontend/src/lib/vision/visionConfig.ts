// ---------------------------------------------------------------------------
// Vision analysis tuning — every threshold that decides "was that a punch" and
// "was it a good one" lives here.
//
// These are STARTING VALUES to tune on real footage (use `?debug=1` on the
// vision page to see live numbers), not measured constants.
// ---------------------------------------------------------------------------

export const VISION_CONFIG = {
  // ── Punch detection (live) ────────────────────────────────────────────────
  detection: {
    /** Elbow angle (deg) at/above which an arm counts as extended. */
    elbowExtendDeg: 132,
    /** Elbow angle (deg) below which an extended arm counts as retracted. */
    elbowRetractDeg: 118,
    /** Minimum wrist speed in shoulder-widths per second to count as a strike. */
    minWristSpeed: 0.14,
    /** Minimum elbow angular velocity (deg/s) to count as a strike. */
    minAngularVelocity: 75,
    /** Time window (ms) over which velocity/angle peaks are considered. */
    windowMs: 350,
    /** Minimum ms between two punches on the same arm. */
    cooldownMs: 200,
    /** Maximum ms an arm can linger in strike before auto-recovering to guard. */
    maxStrikeDwellMs: 380,
    /** Angular velocity (deg/s) threshold that marks movement initiation for true reflex timing. */
    reflexOnsetAngularVel: 50,
    /** Wrist speed (sw/s) threshold that marks movement initiation for true reflex timing. */
    reflexOnsetWristSpeed: 0.10,
    /** A hook keeps the elbow bent below this angle (deg). */
    hookMaxElbowDeg: 138,
    /** Minimum lateral wrist travel (shoulder-widths) to call a hook. */
    hookMinLateral: 0.26,
    /** Minimum upward wrist travel (shoulder-widths) to call an uppercut. */
    uppercutMinVertical: 0.1,
    /** Minimum lateral head displacement (shoulder-widths) over rolling window to call a slip. */
    slipMinLateral: 0.28,
    /** Minimum downward head displacement (shoulder-widths) over rolling window to call a roll. */
    rollMinVertical: 0.22,
  },

  // ── Grading tolerance bands ───────────────────────────────────────────────
  grading: {
    /** Extension at/above this is full credit. */
    fullCreditDeg: 138,
    /** Extension between partialCreditDeg and fullCreditDeg is partial credit. */
    partialCreditDeg: 105,
    /** Score awarded at the bottom of the partial band (0-100). */
    partialFloorScore: 55,
    /** Reactions slower than this (ms, prompted drills only) are called late. */
    lateReactionMs: 750,
    /** A rep with mean landmark confidence below this is "unverified". */
    verifiedConfidenceFloor: 0.30,
    /** Weights for the overall verdict (sum does not need to be 1). */
    weights: { extension: 0.4, speed: 0.25, trajectory: 0.15, recovery: 0.2 },
  },

  // ── Tracking / frame loss ─────────────────────────────────────────────────
  tracking: {
    /** Arm joints are used for angles above this confidence. */
    armConfidenceFloor: 0.18,
    /** Lower visibility threshold for fast-moving limbs undergoing motion blur. */
    fastVisibilityFloor: 0.16,
    /** General visibility threshold for steady landmarks. */
    generalVisibilityFloor: 0.22,
    /** How long (ms) a missing landmark is extrapolated before confidence is 0. */
    maxPredictionMs: 350,
    /** How long (ms) the last good pose is held on screen after tracking loss. */
    holdPoseMs: 400,
    /** How far ahead (ms) the overlay extrapolates to hide inference latency. */
    overlayLeadMs: 40,
    /** Cap on how far (ms) any extrapolation may reach. */
    maxExtrapolateMs: 100,
  },

  // ── Pose engine: startup speed and mid-session resilience ────────────────
  engine: {
    /**
     * Heaviest model the engine will start with. 'heavy' is ~3x the download
     * and GPU-compile time of 'full' and is the model most likely to be
     * throttled mid-round.
     */
    maxModel: 'full',
    /** Absolute minimum inference rate (Hz) to never miss fast punches. */
    minInferenceFps: 20,
    /** Give up on a single asset (script, wasm, model) after this long (ms). */
    assetTimeoutMs: 12000,
    /** No completed inference for this long (ms) while running = stalled. */
    stallMs: 2500,
  },

  // ── Overlay drawing ───────────────────────────────────────────────────────
  overlay: {
    /** Landmarks below this confidence are drawn as faint ghosts, never totally dropped. */
    drawConfidenceFloor: 0.12,
  },

  // ── Display path (skeleton + grid) ────────────────────────────────────────
  // DISPLAY ONLY. Nothing here is read by the analysis pipeline: the analysis
  // keeps using the heavily-smoothed LandmarkFilter stream, while the overlay
  // uses its own low-latency tracker (see displayTracker.ts). Tuned in a
  // simulation for: grid lag ~15-60ms (was 135-230ms), wrist overshoot ~5-6%
  // of frame width (was 10-15%), rest jitter < 1px on the torso.
  display: {
    /** Torso, legs, head: calm at rest, responsive when moving. */
    body: { gMin: 0.35, gMax: 0.95, vRef: 0.4, tauMs: 80, visFloor: 0.25, easeMs: 45, easeMix: 0.3 },
    /** Elbows, wrists, hand points: almost no smoothing, short bounded prediction. */
    arm: { gMin: 0.85, gMax: 1.0, vRef: 1.0, tauMs: 40, visFloor: 0.6, easeMs: 20, easeMix: 0.2 },
    /** Visibility at/above which a measurement gets its full gain. */
    visFullAt: 0.4,
    /** Longest forward prediction (ms) when drawing between/after inferences. */
    maxLeadMs: 120,
    /** Velocity clamp (frame-heights / s) so a bad sample can't fling a joint. */
    maxSpeed: 8,
    /** Innovation speed above which a sample is treated as a limb swap/glitch. */
    outlierSpeed: 9,
    /** Consecutive outliers after which the tracker re-anchors instead of rejecting. */
    reacquireAfterRejects: 3,
    /** Point ages (ms): <= liveMs is live, <= predictedMs predicted, else ghost. */
    liveMs: 130,
    predictedMs: 350,
    /**
     * Each class also has easeMs: when a new inference lands, the correction
     * between where the joint was being drawn and where it should now be is
     * spread over ~easeMs instead of applied in one frame (no visible snap).
     * easeMix is the fraction of that correction that is eased (the rest is
     * shown at once, so fresh data is never hidden). Arms use a short, light
     * one so fists stay responsive.
     */
    /** Time constant (ms) of the pop-free blend when a joint is re-acquired. */
    easeOutMs: 80,
    /** Time constant (ms) for the grid SIZE only; its position is never smoothed. */
    gridSizeTauMs: 150,
    /** Canvas backing-store limits: crisp on phones without a huge fill cost. */
    dprCap: 2,
    dprCapSaver: 1,
    maxCanvasPixels: 1_000_000,
    maxCanvasPixelsSaver: 450_000,
    /** Power saver: battery at/below this level and not charging (or Save-Data). */
    saverBatteryLevel: 0.2,
    /** Overlay repaint interval (ms) while the power saver is active (~30fps). */
    saverDrawIntervalMs: 33,
  },
} as const;

export type VisionConfig = typeof VISION_CONFIG;
