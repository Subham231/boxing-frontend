# Pose / hand model assets

`poseEngine.ts` resolves each model from this directory first and falls back
to Google's CDN if it isn't present. Self-hosting is preferred: it removes a
third-party runtime dependency, works on a flaky connection, and keeps the
session start fast.

Currently self-hosted:

- `pose_landmarker_lite.task`  (already committed)

Recommended to add (the engine falls back to the CDN, then to a lighter
model, if any are missing — it degrades rather than breaking):

```bash
cd public/models

# Pose - full (mid-tier devices) and heavy (high-tier)
curl -LO https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task
curl -LO https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task

# Hands - required for wrist-alignment scoring
curl -LO https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
```

Which model loads is chosen per device by `deviceTier.ts` and can be
downgraded at runtime by the engine's adaptive path if the device can't
sustain the frame budget.

The wasm runtime in `public/wasm/` is pinned to `@mediapipe/tasks-vision`
**0.10.8**. If you bump that dependency in `package.json`, re-download the
matching wasm files — a mismatch between the JS glue and the `.wasm` binary
fails at runtime, not at build time.
