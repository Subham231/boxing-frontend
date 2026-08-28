# HanuOTP Custom Auth — Dark-Launch Integration Plan

**Status:** Phase 1 built. The following files now exist in the repo and
are fully functional, but **nothing calls them yet** — `PhoneLoginGate.tsx`,
`firebase-auth.ts`, and every live route are untouched. Firebase Phone Auth
stays the only active auth path until you say "turn it on" (phase 2, §7).

```
supabase/reflex-schema-v20.sql                        (new tables + RPCs — run this in Supabase SQL Editor)
frontend/.env.hanu-auth.example                        (env vars to set — HANUOTP_API_KEY, AUTH_HMAC_SECRET)
frontend/src/lib/server/hanuotp.ts                     (calls the HanuOTP API)
frontend/src/lib/server/hanu-auth.ts                    (hashing, uid/session generation, cookie config)
frontend/src/app/api/hanu-auth/send-otp/route.ts
frontend/src/app/api/hanu-auth/verify-otp/route.ts
frontend/src/app/api/hanu-auth/session/route.ts
frontend/src/app/api/hanu-auth/logout/route.ts
```

Next step is §6 (testing) below — run the migration, then hit these routes
yourself via curl/Postman before we touch anything user-facing.

**Goal:** Build a complete, parallel phone-OTP + session system using
HanuOTP for SMS delivery, fully testable end-to-end by you alone, with a
single flag flip as the eventual cutover — and instant rollback if anything
goes wrong.

---

## 1. Why this is safe to build without risk to the live app

Everything new lives in **new files, new tables, new routes** — nothing
existing is edited in phase 1:

- New Supabase tables (separate from `reflex_profiles`, `reflex_scores`, etc.)
- New Next.js route handlers under a clearly separate path (`/api/hanu-auth/*`)
- New server-only lib file for the HanuOTP call
- Zero changes to `PhoneLoginGate.tsx`, `firebase-auth.ts`, `firebase.ts`,
  or any existing `/api/reflex/*` route
- Zero UI entry point — reachable only by you, directly, via curl/Postman or
  one unlinked internal test page

Because `reflex_profiles` and every downstream table (subscriptions,
referrals, planner, streaks, leaderboards) key off a plain `uid` **text**
column — not a Firebase-specific type — a HanuOTP-authenticated user can get
a synthetic uid (e.g. `ho_<uuid>`) and every existing table/relation works
unmodified. This directly satisfies point #18 from your reference doc
("existing database relationships stay intact").

---

## 2. New Supabase schema (new migration file, e.g. `supabase/hanu-auth-schema.sql`)

Three tables, mirroring your reference doc but adapted to match the
row-locking pattern already proven in `check_and_increment_otp_attempt`:

```sql
-- OTP records: hashed OTP, 5-min expiry, single-use, capped attempts
create table hanu_otp_verifications (
  id uuid primary key default gen_random_uuid(),
  phone_hash text not null,
  otp_hash text not null,
  purpose text not null default 'login',      -- 'login' | 'signup'
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  ip_hash text
);
create index on hanu_otp_verifications (phone_hash, created_at desc);

-- Daily send limit + resend cooldown, same atomic pattern as
-- check_and_increment_otp_attempt (SELECT ... FOR UPDATE)
create table hanu_otp_daily_limits (
  phone_hash text not null,
  attempt_date date not null,
  send_count int not null default 0,
  last_sent_at timestamptz,
  primary key (phone_hash, attempt_date)
);

-- Login sessions: hashed token only, never plaintext
create table hanu_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  uid text not null,                          -- matches reflex_profiles.uid
  session_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on hanu_auth_sessions (uid);
```

Two Postgres RPCs (security definer, atomic via row lock — same shape as
your existing rate-limit function so there's one pattern to reason about
in this codebase, not two):

- `hanu_check_and_send_otp(p_phone_hash, p_max_per_day=3, p_cooldown_seconds=60)`
  → locks the day's row, rejects if `send_count >= 3` or `last_sent_at` was
  under 60s ago, otherwise increments and returns `{allowed, remaining}`.
- `hanu_verify_otp(p_phone_hash, p_otp_hash)`
  → locks the latest unused, unexpired row for that phone, checks
  `attempts < 5`, compares hash, marks `used_at = now()` on success or
  increments `attempts` on failure. `expires_at > now()` is checked in the
  query itself, so even if cleanup hasn't run yet, an expired row can never
  verify.

A `pg_cron` job (if enabled on your Supabase plan) deletes rows older than,
say, 24h from `hanu_otp_verifications` every 10 minutes — pure housekeeping,
not a security control (the security control is the `expires_at` check in
the RPC itself).

---

## 3. New server-only files (Next.js, matching your existing `lib/server/` layout)

- **`frontend/src/lib/server/hanuotp.ts`** — the only place that ever calls
  the HanuOTP endpoint. Server-only file (never imported from a `'use
  client'` component, same rule as `supabase-admin.ts`). Responsibilities:
  - Read `HANUOTP_API_KEY` from `process.env` — **never** `NEXT_PUBLIC_*`.
    The base URL itself is also overridable via `HANUOTP_BASE_URL`
    (defaults to the real endpoint) so phase-1 testing can point at a
    mock/staging server without touching code.
  - Generate the 6-digit OTP with Node's `crypto.randomInt`, not `Math.random()`.
  - Call the HanuOTP GET endpoint server-to-server, with a 10s timeout.
  - Every phone number elsewhere in this app is E.164 (`+919876543210`).
    HanuOTP's sample only shows a placeholder (`number=mobile_number`) with
    no format spec, so the client strips the leading `+` before sending
    (`919876543210`) — the common convention for Indian SMS gateways.
    **Confirm this against a real send during phase-1 testing**; if wrong,
    it's a one-line fix in `formatPhoneForHanuOtp`.
  - **Open item to verify during testing:** the doc doesn't specify HanuOTP's
    success/failure response body format. First test call should log the
    raw response so we can write a real "did it actually send" check
    instead of assuming HTTP 200 == delivered. Until that's confirmed, treat
    any non-2xx as failure and do NOT activate the OTP row.
  - Never log the OTP or the phone number in plaintext in production —
    only `phone_hash`.

- **`frontend/src/lib/server/hanu-auth.ts`** — OTP hashing (HMAC with a new
  `AUTH_HMAC_SECRET` env var, separate from any Firebase secret), phone
  hashing, session token generation (`crypto.randomBytes(32)`) and hashing,
  cookie helpers (`HttpOnly`, `Secure`, `SameSite=Lax`, 30-day `Max-Age`).

## 4. New API routes (all under `/api/hanu-auth/`, deliberately not
`/api/auth/` — keeps it unmistakable in code review that this is the
shadow system, not the live one)

| Route | Behavior |
|---|---|
| `POST /api/hanu-auth/send-otp` | validate phone → `hanu_check_and_send_otp` RPC → generate+hash OTP → call HanuOTP → only commit the OTP row as active if HanuOTP call succeeds |
| `POST /api/hanu-auth/verify-otp` | hash submitted OTP → `hanu_verify_otp` RPC → on success, find-or-create a `reflex_profiles` row (uid = existing uid if phone matches, else new `ho_<uuid>`) → create `hanu_auth_sessions` row → set the session cookie |
| `GET /api/hanu-auth/session` | read cookie → hash → look up `hanu_auth_sessions` → check `expires_at`/`revoked_at` → return `{authenticated, uid}` |
| `POST /api/hanu-auth/logout` | hash cookie token → set `revoked_at = now()` → clear cookie |

These routes exist and are fully callable, but **nothing in the app calls
them yet.** They're dead code from the live app's perspective until phase 2.

---

## 5. Env vars to add (all server-only, none prefixed `NEXT_PUBLIC_`)

```
HANUOTP_API_KEY=<rotate the one shared in chat before real use>
AUTH_HMAC_SECRET=<new random 32+ byte secret, separate from Firebase>
AUTH_PROVIDER=firebase        # default; flips to "hanuotp" at cutover
```

`AUTH_PROVIDER` is read only by phase-2 code (see §7) — in phase 1 it does
nothing and can even be omitted.

---

## 6. Testing plan (phase 1 — before any UI wiring)

All of this happens without touching a single real user:

1. Run the new SQL migration on a Supabase **branch/staging** if you have
   one, or directly on prod tables (they're inert until routes are called).
2. Call `POST /api/hanu-auth/send-otp` with your own phone via curl/Postman.
   Confirm: SMS arrives, `hanu_otp_verifications` row created correctly,
   `hanu_otp_daily_limits` incremented.
3. Deliberately trigger every edge case:
   - 4th send in a day → rejected
   - Resend within 60s → rejected
   - Wrong OTP 5 times → row invalidated, 6th attempt fails even with the
     right code
   - Wait 6 minutes → correct OTP now rejected as expired
   - Two rapid concurrent send requests (e.g. two curl calls fired
     together) → confirm the count never exceeds 3 (this is the race
     condition your doc calls out in point #25 — the `FOR UPDATE` lock is
     what prevents it, worth explicitly testing under concurrency)
4. Call `POST /api/hanu-auth/verify-otp` with the right code → confirm
   session cookie is set, `hanu_auth_sessions` row created, and a
   `reflex_profiles` row exists/updates correctly.
5. Call `GET /api/hanu-auth/session` → confirm it correctly reflects
   logged-in state, survives a simulated refresh, and returns
   `authenticated: false` after logout or after manually expiring the row.
6. Optional: one unlinked page like `frontend/src/app/internal/hanu-auth-test/page.tsx`
   (not in any nav, not linked from onboarding) so you can click through the
   phone → OTP → session flow in a real browser instead of only curl.

Only once all of this passes do we move to phase 2.

---

## 7. Phase 2 — the actual cutover (only when you say go)

This is the only part that touches existing files, and it's designed to be
a **single reversible switch**, not a rewrite:

- `PhoneLoginGate.tsx` gets a small branch: if `AUTH_PROVIDER === 'hanuotp'`,
  call `/api/hanu-auth/send-otp` + `/api/hanu-auth/verify-otp` instead of
  `sendOtp`/`confirmOtp` from `firebase-auth.ts`. The Firebase code path
  stays in the file untouched — dead but present — so rollback is just
  flipping `AUTH_PROVIDER` back to `firebase` and redeploying, no code
  changes needed.
- Every route that currently does `verifyFirebaseIdToken(idToken)` (e.g.
  `ensure-profile`, `save-profile-details`, `sync-rank`, etc.) needs a
  matching "verify via `hanu_auth_sessions` cookie instead of Firebase
  token" branch. This is the biggest real chunk of phase-2 work and should
  be done route-by-route with tests, not in one big sweep.
- We keep both systems running in parallel for some period so existing
  Firebase users aren't forced to re-auth, then decide together whether/how
  to eventually retire Firebase entirely.

---

## 8. Security checklist (all from your reference doc, mapped to concrete
mechanisms above)

- ✅ 6-digit OTP via `crypto.randomInt` — never `Math.random()`
- ✅ 5-minute expiry enforced at query time regardless of cleanup job status
- ✅ Single-use via `used_at`
- ✅ Max 5 verify attempts before invalidation
- ✅ Max 3 sends/day, atomic via row lock (reusing your proven pattern)
- ✅ 60s resend cooldown
- ✅ OTP stored only as HMAC hash
- ✅ Session token stored only as HMAC hash, delivered via HttpOnly+Secure+SameSite cookie
- ✅ No frontend-supplied `userId` ever trusted — every protected route
  resolves uid from the session/cookie server-side
- ✅ `HANUOTP_API_KEY` and `AUTH_HMAC_SECRET` are server-only, never reach
  the client bundle
- ⚠️ Rotate the HanuOTP key before going live with it — it's now in a chat
  transcript
- ⚠️ Open item: confirm HanuOTP's actual success/failure response
  contract during phase-1 testing (not yet documented in what you shared)

---

## What's needed from you before you can actually test phase 1

1. **Run `supabase/reflex-schema-v20.sql`** in the Supabase SQL Editor
   (against prod is fine — it's additive-only, three new tables, nothing
   existing is touched). If `pg_cron` isn't enabled on your plan, leave the
   commented-out cleanup block at the bottom alone; expiry is enforced at
   query time regardless, so this is pure housekeeping.
2. **Set the new server-only env vars** — see
   `frontend/.env.hanu-auth.example` for the exact names/comments (never
   prefixed `NEXT_PUBLIC_`):
   - `HANUOTP_API_KEY` — use a **rotated** key, not the one shared earlier in
     this chat.
   - `AUTH_HMAC_SECRET` — any new random 32+ byte string, separate from any
     Firebase secret. This signs both the OTP hash and the session hash.
   - `HANUOTP_BASE_URL` — optional, only if you want to point at a
     mock/staging endpoint during testing; defaults to the real HanuOTP URL.
3. Then test per §6 above — send-otp, verify-otp, session, logout, plus the
   deliberate edge cases (4th send in a day, resend within 60s, 5 wrong
   attempts, expired code, concurrent sends).
4. Once you've seen a real HanuOTP response body, tell me what it looks
   like — `frontend/src/lib/server/hanuotp.ts` currently only checks the
   HTTP status; I'll tighten it to also check the body once we know its
   actual success/failure shape.

Nothing in phase 2 (§7 — wiring this into `PhoneLoginGate.tsx` and swapping
`verifyFirebaseIdToken` checks elsewhere) happens until you've tested this
and tell me to proceed.
