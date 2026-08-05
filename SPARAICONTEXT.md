# Sparai — Project Context for AI Agents

Read this before making changes. It covers what the app is, how it's built, what exists
today, and what's still open. Repo: `Subham231/boxing-frontend` (GitHub).
Live: https://sparai.in (deployed on Vercel).

---

## 1. What Sparai Is

Sparai is an **AI-powered boxing coach** web app (mobile-first, works in any browser).
A user signs in with just a phone number (no password), completes onboarding, and gets:

- A personalized training program based on their goals/experience/equipment
- AI video analysis of their punches (pose detection → technique score + feedback)
- Reaction-time ("reflex") mini-games with weekly rankings
- A weekly tactical training planner
- Skill lessons ("Guru")
- Progress analytics and a fighter leaderboard
- A paid subscription tier for unlimited usage

It is **not** a native app — it's a Next.js web app, marketed as "the future of boxing
training," positioned as a coach that's available 24/7, not a replacement for a human coach.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Animation | Framer Motion |
| Icons | lucide-react |
| Auth | **Firebase Phone Auth** (OTP via SMS) — this is the *only* auth method |
| Database | **Supabase** (Postgres) — stores profiles, training data, subscriptions, leaderboard |
| Payments | **Razorpay** (subscription billing) |
| Hosting | **Vercel** (nameservers for `sparai.in` point to `ns1/ns2.vercel-dns.com`) |
| Domain registrar | Hostinger (DNS is *not* managed there anymore — it's delegated to Vercel) |

Important architectural note: **Firebase is auth-only**, Supabase is the actual database.
A Firebase UID is the primary key (`uid`) used to look up/create rows in Supabase's
`reflex_profiles` table (and related tables).

---

## 3. Repo Structure (key paths)

```
frontend/src/
  app/
    page.tsx                          → public homepage (marketing landing page)
    layout.tsx                        → root layout, fonts, metadata, PWA manifest
    onboarding/                       → phone verification + profile setup flow
      components/
        Welcome.tsx                   → entry screen (Login / Sign Up buttons)
        OtpVerification.tsx           → phone input + OTP verification (Firebase)
        AdminPanel.tsx                → dev/admin debug panel
    (app)/                            → the actual logged-in app (route group)
      dashboard/  analytics/  guru/  leaderboard/  planner/
      privacy/  ranks/  reflex/  settings/  subscription/  training/  vision/
    legal/
      privacy/  terms/  refund/  contact/  security/       → all real, linked pages
    api/
      admin/                          → dev/admin bypass endpoints
      reflex/ensure-profile/          → creates/fetches a user's Supabase profile row
      reflex/check-phone/             → phone lookup
      reflex/claim-referral/          → 5-referral → 14-day free trial logic
      subscription/                   → create-order, verify-payment, status (Razorpay)
  components/
    home/
      HomeContent.tsx                 → the actual homepage content (big file)
      HomeCta.tsx                     → shared Sign In / Go to Dashboard button
    ui/
      GlassCard.tsx, NeonButton.tsx   → shared design-system primitives
  lib/
    firebase.ts, firebase-auth.ts     → Firebase client setup + auth helpers
    profile-client.ts                 → client-side Supabase profile fetch/cache
    useFirebaseUser.ts                → React hook for current Firebase auth user
supabase/
  reflex-schema.sql, reflex-schema-v6.sql, reflex-schema-v8.sql  → DB migrations (see §6)
```

---

## 4. Auth Flow (current, as of the latest commit)

1. User lands on `/onboarding` → `Welcome.tsx` (Login / Sign Up buttons)
2. Enters phone number in `OtpVerification.tsx`
3. Firebase Phone Auth sends a real OTP via SMS (invisible reCAPTCHA)
4. User enters the code → Firebase confirms → returns a Firebase UID
5. App calls `POST /api/reflex/ensure-profile` with that UID → creates/fetches the
   Supabase `reflex_profiles` row
6. User proceeds through onboarding (goals, experience, equipment) → profile saved to Supabase
7. Subsequent visits: if `boxing_onboarding_done` is in localStorage **and** a Firebase
   session exists, `/` auto-redirects straight to `/dashboard`

**Known history (already fixed, but worth knowing about):**
- There used to be a hardcoded `ADMIN_PHONE` / `TEST_PHONE` bypass in `OtpVerification.tsx`
  that skipped real OTP verification entirely for two specific numbers. This has been
  patched (commit `d73fd2e`, July 2026) — those numbers now still require entering a
  fixed test OTP rather than skipping verification outright. **If you're asked to touch
  auth code, check whether this bypass concept still exists and whether it should be
  removed entirely for production** — a hardcoded bypass phone/OTP combo in a public repo
  is a real security consideration.
- There was a duplicate-phone-number bug: `ensure-profile` only checked by Firebase UID,
  not by phone, so the same real phone number could end up as two different rows if a
  user reached Supabase via two different auth paths. This was patched by adding a
  **unique index on `phone`** (see `supabase/reflex-schema-v8.sql`) and updating
  `ensure-profile` to check phone as well as UID.

---

## 5. Public Homepage (`/`) — Current State

`app/page.tsx` renders `components/home/HomeContent.tsx`. This was rebuilt (over several
iterations) specifically to satisfy **Google OAuth consent screen verification**
requirements, which flagged:
- "Your home page does not explain the purpose of your app" → fixed with real content
- "App name doesn't match OAuth consent screen" → app name is now consistently "Sparai"
  everywhere (nav, metadata, footer) to match the OAuth Branding config
- "Home page URL not registered to you" → fixed via Search Console domain verification
  (TXT record added through Vercel's DNS records UI, since `sparai.in`'s nameservers
  point to Vercel, not Hostinger)

Current homepage sections, top to bottom:
1. Nav (logo + Privacy/Terms/Security links — legal links live **only** on this page)
2. Hero — "The future of boxing training starts here" + Start Training / See How It Works CTAs
3. Why Sparai Exists (coaching-gap narrative)
4. Boxing Journey timeline (Day 1 → Week 1 → Month 1 → Champion, clickable)
5. Without vs. With Sparai comparison
6. Phone-mockup dashboard preview (static demo data, clearly labeled as a preview —
   **not** live/authenticated data)
7. Your Personal AI Coach (animated feedback-message bubbles)
8. Feature deep-dive tabs (one tab per app module, static demo stats)
9. Feature-by-feature showcase rows
10. Built for Every Fighter (Beginner/Intermediate/Professional/Fitness/Kickboxing/Boxing tabs)
11. How the AI Analysis Works (6-step pipeline)
12. Data transparency section (what data is collected and why — required for OAuth review)
13. "How Sparai Works" condensed 4-step list
14. Why Consistency Wins (streak visual)
15. Real Progress stats — **deliberately uses only verifiable product facts** (e.g. "33
    body landmarks tracked," "6 core modules," "4 subscription tiers"), not invented
    usage/growth numbers, since there's no real usage data to back claims like "5,000+
    sessions." **Do not add fabricated user-count/growth stats here without real data.**
16. Why People Stay (reasons, not attributed testimonials — same honesty reasoning)
17. Subscription Plans — pricing is pulled to match `app/(app)/subscription/page.tsx`
    exactly (₹629 Monthly / ₹699 Monthly Pro / ₹1,629 3-Month / ₹6,629 Yearly)
18. Referral trial callout (5 referrals → 14 days free — real mechanic, see
    `claim_referral` SQL function)
19. Security & Data section (names Firebase, Supabase, Razorpay explicitly)
20. FAQ accordion
21. Final CTA ("Every champion starts somewhere")
22. Footer (Privacy / Terms / Security / Refund / Contact links, copyright)

A sticky mobile-only bottom CTA bar is also present (`HomeCta`, fixed position, safe-area
padded for iOS).

**Metadata** (`app/page.tsx`): includes SEO title/description/keywords, canonical URL,
Open Graph + Twitter card tags, and two JSON-LD blocks (`Organization` +
`SoftwareApplication` schema).

---

## 6. Database (Supabase)

Multiple schema files exist in `/supabase/` — apply them in order:
`reflex-schema.sql` → `reflex-schema-v6.sql` → `reflex-schema-v8.sql` (later files are
incremental migrations, not full replacements — check each file's header comments before
running).

Key table: `reflex_profiles`
- `uid` (Firebase UID) — primary key
- `phone` — **now has a unique index** (added in v8) to prevent duplicate accounts per number
- Referral fields: `referral_code`, `referral_count`, one-time 5-referral → 14-day-premium
  reward logic lives in a `claim_referral()` Postgres function

---

## 7. Subscription / Payments

Real plan data (must stay in sync between `/subscription` page and any marketing copy):

| Plan | Price | Limits |
|---|---|---|
| Monthly | ₹629/mo | 1 AI analysis/day, 1 planner gen/week |
| Monthly Pro | ₹699/mo | 2 AI analyses/day, 2 planner gens/week |
| 3 Months | ₹1,629 | 3 AI analyses/day, 3 planner gens/week |
| Yearly (Elite) | ₹6,629/yr | Unlimited AI analyses + planner, premium Guru skills, Elite badge |

Payment processing via Razorpay (`app/api/subscription/create-order`,
`/verify-payment`, `/status`). There's also a `dev-skip` endpoint gated behind
`NEXT_PUBLIC_ENABLE_DEV_SKIP` — **should not be enabled in production**.

---

## 8. Known Open Items / Things Not Yet Done

- **Support email inconsistency**: Contact page (`/legal/contact`) lists a personal Gmail
  (`sk.ish24@gmail.com`) as the support contact, not a `support@sparai.in` address. If a
  proper mailbox gets set up on the domain, update `/legal/contact` and the JSON-LD
  `Organization.contactPoint.email` in `app/page.tsx` to match.
- **No `og:image` / logo asset**: `frontend/public/logo.jpg` now exists (added recently)
  but Open Graph metadata in `app/page.tsx` doesn't reference an image yet — wire it in
  if/when a proper 1200×630 social preview image exists.
- **Google OAuth verification**: was in progress as of early August 2026 — homepage
  content, app name matching, and domain ownership issues were addressed and
  resubmitted for review. Re-check Google Cloud Console → OAuth consent screen →
  Verification Center for current status before assuming it's fully approved.
- **Admin/test phone bypass**: still exists in `OtpVerification.tsx` in some form
  (`ADMIN_PHONE` / `TEST_PHONE` constants) — evaluate whether this should be removed
  entirely before a wider production launch, or kept strictly behind a dev-only flag.
- **No automated tests observed** in the repo — verify with `find . -iname "*.test.*"`
  before assuming coverage exists.

---

## 9. Ground Rules for Any Agent Working On This Repo

- **Don't fabricate stats, testimonials, or user counts.** The team has explicitly chosen
  honest, verifiable copy over inflated marketing claims (see §5, item 15) — keep that
  standard for any new copy.
- **Don't touch `/dashboard` or other authenticated-app routes when asked to change the
  public homepage** — `/` must stay a real, crawlable, non-gated page with no live
  personal data (the phone-mockup preview is static/labeled demo data on purpose).
- **Pricing/plan copy anywhere in the app or marketing must match
  `app/(app)/subscription/page.tsx` exactly** — that file is the source of truth.
- Before editing Supabase schema, check which `.sql` file is the latest migration —
  don't assume `reflex-schema.sql` alone reflects the current schema.
- This is a live, deployed production app (`sparai.in`) — changes to auth, payments, or
  the database should be treated as high-stakes, not experimental.
