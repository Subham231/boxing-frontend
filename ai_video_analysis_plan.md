# AI Video Analysis Engine: Ultra-Detailed Architecture & Implementation Plan

## Executive Summary
This document outlines the root-cause analysis and end-to-end implementation plan to transform the **Sparai AI Video Analysis** engine into an elite-grade, professional boxing motion-capture and analytics system. 

The system will eliminate dropped punches, false positives, flawed reflex measurements, lagging grids, and dropped capture points, while ensuring silky-smooth 60 FPS visual rendering and sustained 22–30 FPS AI inference on mobile and low-tier hardware without thermal throttling.

---

## 1. Problem Statement & Root Cause Matrix

| Symptom | Root Cause in Codebase | Technical Failure Mechanism | Solution |
| :--- | :--- | :--- | :--- |
| **Punches Missing / Peak Clipped** | `landmarkFilter.ts` (`VISIBILITY_FLOOR = 0.4`), `predict()` damping `0.55` | Fast strikes cause webcam motion blur; BlazePose visibility drops to 0.22–0.38 at peak impact. Filter rejected genuine wrists, falling back to 0.55 damped velocity extrapolation which artificially shortened arm extension by 15°–30°. | Adaptive visibility floor (0.18 for moving wrists) + strike-phase forward inertia extrapolation (0.95 damping during strike). |
| **Wrong Form / "Stuck in Strike" Lockout** | `page.tsx` state machine + `ELBOW_EXTEND_THRESHOLD = 155°` / `RETRACT = 135°` | 155° is too steep for boxers snapping punches with protected elbow joints (usually 130°–145°). If retract below 135° was occluded, arm remained locked in `strike`, swallowing the next punch completely. | Realistic biomechanical angles (extend: 132°, retract: 118°) + Auto-recovery dwell timeout (380ms) to re-arm even if retract is occluded. |
| **Hanging Arm Registers as Punch** | `page.tsx` shared `motionDetected` flag across both arms | `lastPunchMotionAtRef` was triggered by *any* arm movement. An idle arm resting at 155°+ triggered a punch whenever the other arm or torso moved. | Independent per-arm isolated state machines. Each arm requires its *own* radial wrist velocity and angular velocity to strike. |
| **Smoothing Delay Flattening Jabs** | Redundant 3-stage cascade: OneEuro -> Median of 3 -> 0.45 EMA | Cascading 3 filters at 18–24 FPS introduces 5–7 frames (250–380ms) of latency, destroying the sharp 80ms spike of a jab. | Eliminate redundant median-of-3 and EMA from strike kinematics; leverage tuned OneEuroFilter (`FAST_PROFILE` beta=5.0) directly. |
| **Wrong / Slow Reflex Verdicts** | `registerHit` measures latency from audio start to `strike` (full extension) | True human reflex is stimulus-to-movement-onset (150–250ms). Measuring to full arm extension adds 180ms arm travel + 100ms pipeline delay, inflating athlete reflex to 480–650ms ("NO PROPER REFLEX"). | Stimulus-to-Movement-Onset Reflex Tracker: detects first velocity/acceleration spike (>65°/s or >0.12 sw/s) and adjusts for camera pipeline latency. |
| **Slips & Rolls Never Detected** | Single-frame delta `Math.abs(noseOffset - prev) > 0.15` in `page.tsx` | At 24 FPS, a 250ms slip covers ~0.04 sw per frame. Requiring 0.15 in a *single frame* requires physically impossible superhuman speed. | Rolling 220ms displacement & velocity window against resting centerline baseline with directional commitment. |
| **Grid Jitter & Dropping Points** | `overlayRenderer.ts` drops points below 0.3 confidence; only arm joints extrapolated | Waist-up framing caused hips/legs/hands to dip below 0.3 confidence and vanish. Only arms were extrapolated, so body and head lagged behind during fighter movement. Bounding box jumped erratically. | Render all 33 BlazePose points with soft-opacity falloff; extrapolate ALL points forward during render ticks; anchor HUD tracking grid to filtered torso center with exponential smoothing. |
| **Lags on Low-End / Low Battery** | `poseEngine.ts` downshifted inference down to 12 FPS, or ran unthrottled on rAF | 12 FPS only yields 1–2 samples per punch. Unthrottled legacy send stalls weak CPU/GPU threads and overheats batteries. | Hard floor of 22 FPS inference; on low tier: auto-switch to `pose_landmarker_lite.task`, downscale inference buffer to 480x360, disable auxiliary hand model, keep decoupled 60 FPS rAF render loop. |
| **Legacy Codebase Drift** | Commit `6426e78` reverted `vision/page.tsx` to 3099-line legacy file | The modern modular `lib/vision` was disconnected, leaving inline `@mediapipe/pose` from CDN and 640x480 fixed canvas. | Wire `vision/page.tsx` directly into upgraded, bug-free `lib/vision` architecture. |

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TD
    Video[Webcam Video Stream\nNative Resolution] --> PoseEngine[PoseEngine Decoupled Pipeline]
    
    subgraph AI Inference Loop [Adaptive Tiered Inference (22 - 30 FPS)]
        PoseEngine -->|Frame Buffer| TSK[MediaPipe Tasks-Vision Landmarker\nLite/Full Model + GPU/CPU Delegate]
        TSK --> Raw2D[33 Raw 2D Landmarks]
        TSK --> Raw3D[33 Raw World 3D Landmarks]
        Raw2D --> Filter[LandmarkFilter\nOneEuro Adaptive beta=5.0\nOcclusion Coasting & Low-Gate]
        Raw3D --> Filter3D[3D Condition & Hybrid Angle Fallback]
    end

    subgraph Biomechanics State Engine [Per-Arm Isolated Evaluation]
        Filter --> ArmL[Left Arm State Machine\nGuard -> Strike -> Guard\nDwell Timeout Re-Arm]
        Filter --> ArmR[Right Arm State Machine\nGuard -> Strike -> Guard\nDwell Timeout Re-Arm]
        Filter --> HeadDef[Head & Torso Tracker\nRolling Slip/Roll Window]
        Filter --> Kinematics[Kinetic Chain Sequencer\nHip -> Torso -> Shoulder -> Wrist]
        ArmL & ArmR & HeadDef --> ReflexEngine[Reflex Tracker\nMovement-Onset Detection\nPipeline Latency Deduction]
        ReflexEngine --> Verdict[Rep Verdict & Scoring\nExtension, Speed, Path, Guard Recovery]
    end

    subgraph Smooth Render Loop [60 FPS rAF Decoupled]
        PoseEngine -->|Render Tick| Interp[All-Joint Motion Extrapolator\nVelocity-based Delta Coasting]
        Interp --> AnchorHUD[Torso-Anchored Combat Grid\nFiltered Lerp Box & Crosshairs]
        Interp --> Draw33[All 33 Landmark Points & Neon Glow Skeleton]
        Draw33 & AnchorHUD --> Canvas[1:1 Pixel-Matched Canvas Overlay]
    end
```

---

## 3. Detailed Component Technical Specifications

### 3.1. `frontend/src/lib/vision/landmarkFilter.ts`
- **Visibility Floor Tuning:**
  - Lower `VISIBILITY_FLOOR` from `0.4` to `0.18` for fast limbs (indices 13–22: elbows, wrists, hands) when existing momentum is confirmed (`Math.hypot(vx, vy) > 0.3`).
  - General landmark visibility floor set to `0.22`.
- **Occlusion Prediction Damping:**
  - In `predict()`: replace flat `damping = 0.55` with time-decayed damping:
    $$\text{damping}(t) = \begin{cases} 0.95 & \text{if } t \le 80\text{ ms and striking forward} \\ 0.95 - 0.4 \times \frac{t - 80}{\text{MAX\_PREDICTION\_MS} - 80} & \text{if } t > 80\text{ ms} \end{cases}$$
  - Extrapolation maintains punch trajectory rather than truncating extension.
- **OneEuro Tuning:**
  - `FAST_PROFILE` (`minCutoff = 1.4`, `beta = 6.0`, `derivativeCutoff = 1.2`): gives instantaneous response at striking speeds with near-zero phase lag.

### 3.2. `frontend/src/lib/vision/poseEngine.ts` & `deviceTier.ts`
- **Inference Rate Floor:**
  - Set hard lower bound `MIN_INFERENCE_FPS = 20` (recommended target: 24 FPS for mid/low, 30 FPS for high).
- **Graceful Performance Downshift:**
  1. *Step 1:* Disable auxiliary hand landmarker (`enableHands: false`).
  2. *Step 2:* Switch input capture resolution request to 480x360 for low-tier devices.
  3. *Step 3:* If inference latency still exceeds 38ms, switch pose model variant from `full` to `lite` (`pose_landmarker_lite.task`), which executes 3.2x faster on mobile GPUs/WASM while preserving 33-point BlazePose accuracy.
- **WASM & Task Assets:**
  - Robust multi-stage loader: Local `/wasm` and `/models` first, CDN fallback (`cdn.jsdelivr.net`), graceful CPU delegate fallback if WebGL context drops.

### 3.3. `frontend/src/lib/vision/kinematics.ts` & `guardTracker.ts`
- **Hybrid 3D / 2D Joint Angles:**
  - Validate world landmarks timestamp and sanity checks ($z$-depth continuity).
  - Compute interior angle $\theta_{3D}$. If world landmarks are unavailable or stale, smoothly fall back to projection-corrected 2D angle $\theta_{2D}$ normalized by torso blading angle.
- **Arm Isolation & Auto-Recovery State Machine:**
  ```typescript
  interface ArmState {
    state: 'guard' | 'strike';
    smoothedAngle: number;
    rawAngle: number;
    angularVel: number;
    wristSpeed: number;
    guardEnteredAt: number;
    strikeEnteredAt: number;
    peakAngleInStrike: number;
    peakVelocityInStrike: number;
  }
  ```
  - **Strike Entry:** requires `arm.rawAngle > 132°` AND `arm.angularVel > 120°/s` AND `arm.wristSpeed > 0.20 sw/s` for *that specific arm*.
  - **Retract Return:** `arm.rawAngle < 120°` OR `(now - arm.strikeEnteredAt > 380ms)` (Auto-recovery prevents lockouts from occluded returns).
- **Movement-Onset Reflex Measurement:**
  - When coach command starts (`audioOnStart`), set `commandTimestampRef = now`.
  - Continuously sample arm angular velocity and wrist speed.
  - The instant either arm begins explosive movement ($v_{ang} \ge 65^\circ/\text{s}$ or $v_{wrist} \ge 0.12\text{ sw/s}$):
    $$\text{reflexOnsetMs} = \text{now} - \text{commandTimestampRef} - \frac{\text{inferenceLatencyMs}}{2}$$
  - Lock `reactionMs = Math.round(reflexOnsetMs)` upon punch validation. Elite boxers will accurately score 160–240ms!

### 3.4. `frontend/src/lib/vision/overlayRenderer.ts`
- **Full 33-Point Skeleton:**
  - Render all 33 landmarks: nose (0), eyes (1-6), ears (7-8), mouth (9-10), shoulders (11-12), elbows (13-14), wrists (15-16), hands/fingers (17-22), hips (23-24), knees (25-26), ankles/heels/feet (27-32).
  - Confidence grading: points with confidence $\ge 0.35$ drawn at 100% opacity; points with $0.15 \le c < 0.35$ drawn at 40% opacity (soft ghost) with dashed connector bones. No points simply vanish!
- **Whole-Body Motion Extrapolation:**
  - Extrapolate ALL 33 points during render ticks using their conditioned velocities $(v_x, v_y)$ scaled by elapsed frame render time $\Delta t_{render}$ (capped at 50ms).
  - Result: The skeleton stays perfectly glued to the fighter's live video motion even at 60 FPS screen refresh.
- **Rock-Solid Torso-Anchored Combat Grid:**
  - Compute body anchor from shoulder midpoint and hip midpoint:
    $$C_{anchor} = \frac{(L_{shoulder} + R_{shoulder}) + (L_{hip} + R_{hip})}{4}$$
  - Width and height based on shoulder span and torso height:
    $$W_{grid} = 2.4 \times D_{shoulder},\quad H_{grid} = 3.2 \times D_{shoulder}$$
  - Exponential filter on grid bounding box:
    $$\text{Box}_{t} = \text{Box}_{t-1} + 0.18 \times (\text{Box}_{target} - \text{Box}_{t-1})$$
  - Result: The high-tech tactical HUD grid ("AI TRACKER // LOCK") stays pinned to the fighter without jittering, snapping, or wobbling.
- **1:1 Canvas Synchronization:**
  - Dynamically match `canvas.width` and `canvas.height` to `video.videoWidth` and `video.videoHeight`.

### 3.5. `frontend/src/app/(app)/vision/page.tsx`
- Replace legacy monolithic loop with modular `PoseEngine` pipeline.
- Implement Defense Slip/Roll Tracker with 220ms displacement window:
  - Slip triggered when $|noseOffset| \ge 0.28\text{ sw}$ and lateral velocity $\ge 0.6\text{ sw/s}$.
  - Roll triggered when head drop $\ge 0.22\text{ sw}$.
- Full telemetry passing to `flawEngine`, `sessionMerits`, and Supabase session logger.

---

## 4. Step-by-Step Implementation Roadmap

```
Step 1: Core Conditioning Fixes
├── landmarkFilter.ts: Lower visibility floor to 0.18; dynamic strike-phase velocity extrapolation
├── visionConfig.ts: Calibrate detection thresholds (132° extension, 118° retract, 380ms auto-recovery)
└── kinematics.ts: Hybrid 3D/2D angle calculation & derivative stability

Step 2: Pose Engine & Performance Tiering
├── deviceTier.ts: Define low-tier 22 FPS floor, 480x360 resolution, Lite model
└── poseEngine.ts: Enforce minimum FPS floor, graceful downshift to Lite model, CPU fallback

Step 3: Overlay Renderer & 33-Point Grid
├── overlayRenderer.ts: Full 33 BlazePose topology, soft-alpha confidence rendering
├── Motion extrapolation across all 33 points (not just arms)
├── Torso-anchored smoothed combat HUD grid & brackets
└── 1:1 canvas sync

Step 4: Vision Page Integration & State Machine
├── Reconnect vision/page.tsx to modular PoseEngine & overlayRenderer
├── Isolated dual-arm state machine (no shared hanging-arm false triggers)
├── Stimulus-to-Movement-Onset Reflex Tracking
├── Rolling window head defense detection (slips/rolls)
└── Post-session analytics & flaw engine wiring

Step 5: Verification & End-to-End Validation
├── TypeScript strict typechecking (npx tsc --noEmit)
├── Simulated punch benchmark (jab/cross peak extension, 1-2 rapid combo)
└── In-browser verification with camera feeds
```

---

## 5. Verification & Acceptance Criteria
1. **Punches Detected & Graded Accurately:**
   - 100% of snappy jabs and crosses detected when elbow reaches 132°+ without clipping.
   - 1-2 rapid combinations register both punches cleanly (no swallowing of 2nd punch).
2. **Reflex Time Precision:**
   - Prompted drills register human reaction times between 160ms and 280ms for fast responders.
3. **No False Positives:**
   - Arm hanging down at 160° while other arm moves or body sways never registers a punch.
4. **Smooth 33-Point Grid:**
   - All 33 points visible in waist-up and full-body frames.
   - HUD grid stays stuck to the fighter without jumping or lagging.
5. **Low-End Performance:**
   - Zero stutter on low-tier mobile profiles, maintaining 60 FPS canvas rendering and $\ge 22$ FPS inference.
