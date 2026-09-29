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
    minWristSpeed: 0.22,
    /** Minimum elbow angular velocity (deg/s) to count as a strike. */
    minAngularVelocity: 110,
    /** Time window (ms) over which velocity/angle peaks are considered. */
    windowMs: 350,
    /** Minimum ms between two punches on the same arm. */
    cooldownMs: 250,
    /** A hook keeps the elbow bent below this angle (deg). */
    hookMaxElbowDeg: 138,
    /** Minimum lateral wrist travel (shoulder-widths) to call a hook. */
    hookMinLateral: 0.28,
    /** Minimum upward wrist travel (shoulder-widths) to call an uppercut. */
    uppercutMinVertical: 0.1,
  },

  // ── Grading tolerance bands ───────────────────────────────────────────────
  grading: {
    /** Extension at/above this is full credit. */
    fullCreditDeg: 140,
    /** Extension between partialCreditDeg and fullCreditDeg is partial credit. */
    partialCreditDeg: 110,
    /** Score awarded at the bottom of the partial band (0-100). */
    partialFloorScore: 55,
    /** Reactions slower than this (ms, prompted drills only) are called late. */
    lateReactionMs: 800,
    /** A rep with mean landmark confidence below this is "unverified". */
    verifiedConfidenceFloor: 0.38,
    /** Weights for the overall verdict (sum does not need to be 1). */
    weights: { extension: 0.4, speed: 0.25, trajectory: 0.15, recovery: 0.2 },
  },

  // ── Tracking / frame loss ─────────────────────────────────────────────────
  tracking: {
    /** Arm joints are used for angles above this confidence. */
    armConfidenceFloor: 0.3,
    /** How long (ms) a missing landmark is extrapolated before confidence is 0. */
    maxPredictionMs: 280,
    /** How long (ms) the last good pose is held on screen after tracking loss. */
    holdPoseMs: 400,
    /** How far ahead (ms) the overlay extrapolates to hide inference latency. */
    overlayLeadMs: 45,
    /** Cap on how far (ms) any extrapolation may reach. */
    maxExtrapolateMs: 120,
  },

  // ── Overlay drawing ───────────────────────────────────────────────────────
  overlay: {
    /** Landmarks below this confidence are not drawn. */
    drawConfidenceFloor: 0.3,
  },
} as const;

export type VisionConfig = typeof VISION_CONFIG;
