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
    minWristSpeed: 0.18,
    /** Minimum elbow angular velocity (deg/s) to count as a strike. */
    minAngularVelocity: 95,
    /** Time window (ms) over which velocity/angle peaks are considered. */
    windowMs: 350,
    /** Minimum ms between two punches on the same arm. */
    cooldownMs: 200,
    /** Maximum ms an arm can linger in strike before auto-recovering to guard. */
    maxStrikeDwellMs: 380,
    /** Angular velocity (deg/s) threshold that marks movement initiation for true reflex timing. */
    reflexOnsetAngularVel: 60,
    /** Wrist speed (sw/s) threshold that marks movement initiation for true reflex timing. */
    reflexOnsetWristSpeed: 0.12,
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
} as const;

export type VisionConfig = typeof VISION_CONFIG;
