# SparAI Build and Edit Guide

Last updated: 2026-08-27
Live application: https://sparai.in

This document records the features currently built in the active application, the files that own them, deployment requirements, and the code that must not be changed casually. Read this before editing the app.

## 1. Active Application

The deployable application is the `frontend/` Next.js app and the root `supabase/` migrations.

The `sparai-patched-src/` directory is an archived comparison/patched copy. Changes made there do not change the active app unless deliberately copied into `frontend/` or `supabase/`.

Main stack:

- Next.js 14 App Router
- React 18 and TypeScript
- Tailwind CSS and Framer Motion
- Firebase Phone Auth for OTP login
- Supabase PostgreSQL for profiles, subscriptions, usage, sparring, and leaderboards
- Razorpay for subscriptions
- MediaPipe Pose loaded in the browser for camera analysis
- Vercel deployment at `sparai.in`

## 2. What Has Been Built

### Authentication and onboarding

- Phone-number OTP authentication through Firebase.
- Supabase profile creation/fetching after Firebase verification.
- Separate signup and login behavior.
- `/login` is a dedicated login page and does not merge signup onboarding data into an existing profile.
- Signup phone lookup before continuing, with an existing-account message and login action.
- Signup checks the phone again before OTP confirmation to reduce account-overwrite races.
- Authenticated users visiting onboarding are redirected to `/dashboard`.
- A persistent Firebase session is used immediately during hydration to avoid false login redirects.
- Stale profile session tokens are recovered without sending an authenticated user back to login.

Owners:

- `frontend/src/app/onboarding/page.tsx`
- `frontend/src/app/onboarding/components/Welcome.tsx`
- `frontend/src/app/onboarding/components/Problem.tsx`
- `frontend/src/app/onboarding/components/OtpVerification.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/lib/firebase-auth.ts`
- `frontend/src/lib/useFirebaseUser.ts`
- `frontend/src/app/(app)/layout.tsx`

### Camera AI vision

- Main AI vision route: `/vision`.
- Onboarding freestyle camera analysis.
- MediaPipe Pose skeleton rendering over the local camera.
- Calibration requires the fighter to be visible and hold position.
- Punch detection uses a guarded `guard -> strike -> guard` state machine.
- Punch detection uses elbow extension plus measured motion from elbow angular velocity or wrist travel.
- A 350 ms recent-motion memory compensates for MediaPipe smoothing separating motion from extension across frames.
- A punch cannot duplicate while the arm remains extended; retraction is required before another count.
- Vision sessions are logged to local browser history for Analytics.
- The requested warning protecting the state machine is present in both active vision implementations.

Owners:

- `frontend/src/app/(app)/vision/page.tsx`
- `frontend/src/app/onboarding/components/FreestyleAnalysis.tsx`
- `frontend/src/lib/session-log.ts`
- `frontend/public/models/pose_landmarker_lite.task`
- `frontend/public/wasm/`

Important: the active vision routes currently use classic MediaPipe Pose from jsDelivr. The local Tasks Vision model assets exist, but switching engines is a separate migration and must be tested on all camera routes together.

### Daily Grind and vision task

- A separate daily `AI Vision Analysis` task is included in the generated workout.
- Selecting that task opens `/vision` instead of the normal exercise timer.
- Vision completion is stored in `vision_progress_<date>`.
- Normal exercises remain stored in `workout_progress_<date>`.
- Legacy completion marker `99` is ignored when loading old workout progress so earlier vision runs do not falsely complete an exercise.

Owners:

- `frontend/src/lib/workout-data.ts`
- `frontend/src/types/index.ts`
- `frontend/src/app/(app)/training/page.tsx`
- `frontend/src/app/(app)/dashboard/page.tsx`
- `frontend/src/app/(app)/vision/page.tsx`

### Live sparring

- `/spar` rules/status entry page.
- `/spar/lobby` authenticated matchmaking and leaderboard.
- `/spar/match?id=<matchId>` live match page.
- Each fighter sends local camera and microphone through WebRTC.
- Supabase Realtime broadcast is used for SDP, ICE, and peer-left signaling.
- The match page runs local MediaPipe Pose punch detection and keeps `HIT / EXECUTE` as a fallback control.
- Early ICE candidates are buffered until remote SDP is available.
- Realtime subscription has a timeout and visible failure message.
- Duplicate join/retry requests attempt to resume the existing match rather than consume another credit.
- Server-side result validation and winner selection remain authoritative.

Owners:

- `frontend/src/app/(app)/spar/page.tsx`
- `frontend/src/app/(app)/spar/lobby/page.tsx`
- `frontend/src/app/(app)/spar/match/SparMatchClient.tsx`
- `frontend/src/app/api/spar/queue/join/route.ts`
- `frontend/src/app/api/spar/queue/status/route.ts`
- `frontend/src/app/api/spar/match/[matchId]/ready/route.ts`
- `frontend/src/app/api/spar/match/[matchId]/submit-result/route.ts`
- `frontend/src/lib/server/spar.ts`

Required database migration:

- `supabase/reflex-schema-v19.sql` serializes matchmaking with a shared PostgreSQL advisory lock and returns an existing active match on retry.
- Apply it after `reflex-schema-v18.sql` in the Supabase SQL Editor.
- The workspace cannot apply this migration to the hosted Supabase project automatically.
- If the migration is missing in production, the join API returns an actionable migration error instead of silently leaving the user searching.

### Voice coaching

- Vision command text is normalized into natural speech.
- Examples: `JAB` becomes “jab”; `1-2-3 COMBO` becomes “one two three combo”.
- Voice profiles use different preferred voice selection, pitch, and rate.
- Browser voice availability differs by operating system. If only one voice is installed, pitch/rate still differentiate profiles but the underlying voice may be the same.

Owner:

- `frontend/src/app/(app)/vision/page.tsx`

### Profile, legal, and subscription information

- Profile settings include Terms, Privacy, Security, Refund, and Contact links.
- Subscription card reads the authenticated plan name and exact expiry from `/api/subscription/status`.
- No active plan shows `NO ACTIVE PLAN` and a `BUY A PLAN` action.
- Support email is `spar.ai.support@gmail.com`.
- Headquarters is displayed as `Greater Noida, India`.
- Public structured metadata uses the same support email.

Owners:

- `frontend/src/app/(app)/settings/page.tsx`
- `frontend/src/app/api/subscription/status/route.ts`
- `frontend/src/app/legal/contact/page.tsx`
- `frontend/src/app/legal/privacy/page.tsx`
- `frontend/src/app/legal/security/page.tsx`
- `frontend/src/app/legal/refund/page.tsx`
- `frontend/src/app/legal/terms/page.tsx`
- `frontend/src/app/page.tsx`

### Local weekly AI recap

- Weekly recap no longer depends on an external AI endpoint.
- It reads local workout progress and local vision session history.
- It summarizes active days, drills, vision sessions, punches, and average vision score.
- Speech synthesis reads the generated local recap.

Owner:

- `frontend/src/app/(app)/settings/page.tsx`

## 3. Do Not Touch Casually

### Punch state machines

Do not replace the punch detector with a single-frame elbow-angle check. A straight arm at rest can measure close to 180 degrees and lock the detector in `strike`, preventing future punches from counting.

Protect these invariants:

1. Detector state starts in `guard` for every new session.
2. A strike requires measured movement, not extension angle alone.
3. An extended arm cannot produce duplicate punches.
4. Retraction is required before re-arming.
5. Tracking loss and cleanup must reset/stop the detector safely.
6. Camera/model failure must not fabricate hits.

Relevant warnings are intentionally present near the state machine in:

- `frontend/src/app/(app)/vision/page.tsx`
- `frontend/src/app/onboarding/components/FreestyleAnalysis.tsx`

### Authentication and profile writes

Do not use the signup `OtpVerification` component as the login flow. Signup and login have different data-safety requirements.

- Signup may save onboarding fields only for a confirmed new account.
- Login must verify the existing account and redirect to `/dashboard` without overwriting onboarding fields.
- Do not remove the phone existence checks without replacing them with an equally strong server-side account distinction.
- Do not treat a stale Supabase session token as proof that Firebase authentication is invalid.

### Subscription limits

Do not trust subscription state from localStorage or client-provided plan values. Server routes must continue to use `getEntitlement()` and fresh Supabase data.

Do not hardcode renewal or expiry dates in profile UI. Use `expiresAt` from `/api/subscription/status`; if it is null, show no expiry date and direct the user to buy a plan.

### Daily progress keys

Do not put vision completion back into `workout_progress_<date>`. Vision uses `vision_progress_<date>` and normal drills use `workout_progress_<date>`.

Do not reuse exercise index `99` as a hidden completion marker.

### Spar matchmaking and WebRTC

Do not change the match ID, participant role, command sequence, or signaling channel independently on the client. These values must come from the matchmaking response and be identical for both participants.

Do not remove:

- duplicate-match resume behavior;
- the Supabase matchmaking migration requirement;
- ICE buffering before remote SDP;
- signaling timeout handling;
- cleanup of Realtime channels, peer connections, cameras, microphones, and pose loops.

A TURN server may be required for users behind restrictive NAT/firewalls. Configure `TURN_SERVER_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL` in the server environment when STUN alone cannot connect two fighters.

## 4. Safe Areas to Edit

Generally safe with normal review:

- Copy, labels, descriptions, and visual classes in page/component JSX.
- Legal page wording, provided the support email, location, pricing, and policy claims remain accurate.
- Workout exercise names/instructions in `frontend/src/lib/workout-data.ts`, provided every drill keeps `type: 'timer'` or `type: 'reps'`.
- Dashboard/profile presentation that consumes existing state.
- Static homepage content that does not claim invented usage statistics.
- Voice labels and natural-language speech mappings in the vision page.

Require focused testing before merge:

- Any camera, MediaPipe, WebRTC, Realtime, Firebase, Supabase, subscription, or progress-storage code.
- Any change to `frontend/src/lib/server/entitlements.ts`.
- Any SQL migration or RPC function.
- Any change to onboarding step order or persisted onboarding keys.

## 5. Environment and Deployment

Frontend development:

```powershell
cd frontend
pnpm install
pnpm dev
```

Or use the existing npm lockfile/tooling if that is how the deployment environment is configured.

Required checks:

```powershell
cd frontend
npx tsc --noEmit
npm run build
```

Database migrations:

1. Apply the base/reflex migrations in the order documented in their headers.
2. Apply `reflex-schema-v18.sql`.
3. Apply `reflex-schema-v19.sql`.
4. Verify the `try_create_spar_match` RPC exists with the v19 shared advisory lock.

Camera requirements:

- Browser camera access requires HTTPS or localhost.
- Allow camera permission.
- Keep the full upper body visible.
- Use a stable camera position, normally 6–8 feet away.
- A production WebRTC deployment may need TURN credentials.

## 6. Validation Checklist

Before shipping camera changes:

- Video element displays live camera frames.
- Skeleton landmarks update continuously.
- Calibration completes only when the fighter is visible.
- A fast extension after guard registers one punch.
- Holding the arm extended does not duplicate the punch.
- Retraction then another extension registers a second punch.
- Slow arm movement does not create false hits.
- Stopping and restarting a session does not create duplicate inference loops.
- Model/CDN failure is visible and does not fabricate results.

Before shipping auth changes:

- Existing Firebase session visiting `/onboarding` goes to `/dashboard`.
- First onboarding page login opens `/login`.
- Existing signup phone shows the account-exists message and login action.
- Login verifies OTP and does not overwrite onboarding fields.
- New signup still creates and completes a new profile.

Before shipping spar changes:

- Two authenticated users receive the same match ID.
- Player roles are opposite (`offer` and `answer`).
- Both receive the same command sequence.
- Both local cameras start.
- Remote video appears when WebRTC succeeds.
- Early ICE does not break the connection.
- Signaling failure is visible within the timeout.
- Results submit once per user and winner calculation remains server-side.

Before shipping profile/progress changes:

- Active subscription shows its actual expiry.
- No subscription shows no date and a buy-plan action.
- Contact pages show `spar.ai.support@gmail.com` and Greater Noida.
- Daily Grind starts at zero exercise completions for a new date.
- Vision appears as a separate daily task.
- Vision completion does not mark a normal exercise complete.

## 7. Known Limitations and Follow-ups

- The active camera routes use CDN-hosted classic MediaPipe Pose rather than the local Tasks Vision assets.
- Browser speech voices are supplied by the operating system; distinct voices cannot be guaranteed when the browser exposes only one voice.
- A real two-user spar test requires two authenticated sessions, two cameras, HTTPS, and usually a TURN server for difficult networks.
- The hosted Supabase migration must be applied manually; the repository migration file alone does not change production.
- No automated browser-camera test currently exists. Synthetic detector tests and manual camera checks are recommended before changing detection thresholds.

## 8. Change Protocol

For every future change:

1. Identify the owning file and persisted/API contract.
2. Make the smallest focused edit.
3. Run `npx tsc --noEmit`.
4. Run `npm run build`.
5. Run the relevant manual flow when hardware/network/auth is involved.
6. Do not modify archived `sparai-patched-src/` files unless explicitly requested.
7. Do not commit secrets, `.env` files, Firebase private keys, Supabase service-role keys, or Razorpay secrets.

## 9. Automated Launch and Notifications

- `frontend/src/lib/launch-status.ts` is the single server-time launch source.
- `frontend/src/app/api/launch-status/route.ts` returns uncached launch state.
- `frontend/src/components/ComingSoonGate.tsx` displays the countdown for authenticated users before launch.
- `frontend/src/app/(app)/layout.tsx` applies the gate to protected app routes.
- `APP_LAUNCH_AT` controls the launch time. The default is `2026-08-28T00:00:00+05:30` (`28 August 2026, 12:00 AM IST`, the start of tomorrow in India on 27 August).
- Subscription checkout, AI analysis usage, and planner usage routes reject requests before launch.
- The Coming Soon countdown refreshes server time every 30 seconds and automatically reloads at launch; no manual release action is required.
- `frontend/public/firebase-messaging-sw.js` is the browser service worker for launch notifications.
- The permission button must be clicked by the user because browsers prohibit silent notification permission prompts.
- `supabase/launch-notifications.sql` creates storage for authenticated browser push subscriptions.
- `frontend/src/app/api/notifications/subscribe/route.ts` stores a subscription after permission is granted.
- Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for Firebase Cloud Messaging token creation. Firebase Admin sends the launch notification from the scheduled route; `FIREBASE_SERVICE_ACCOUNT_KEY` and `CRON_SECRET` must be configured in Vercel.
- Apply `supabase/launch-notifications.sql` manually in the hosted Supabase project before storing subscriptions.
- `frontend/vercel.json` schedules `/api/cron/launch-notifications` at `18:30 UTC`, which is `00:00 IST`.
