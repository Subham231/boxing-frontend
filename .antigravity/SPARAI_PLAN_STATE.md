# SparAI — Planning State Tracker

> **Document Status**: Complete Architecture & Planning State  
> **Last Updated**: 2026-09-07T12:51:30+05:30  
> **Current Phase**: **Phase 0 — Complete Web Application Audit & Architectural Planning**  
> **Next Action**: **STOP & Present Full Plan for User Review & Explicit Approval**  

---

## 1. Planning Status Summary

| Attribute | State | Notes |
| :--- | :--- | :--- |
| **Audit Status** | **100% COMPLETE** | All pages, components, hooks, utilities, server routes, and SQL schemas audited. |
| **Implementation Plan** | **100% COMPLETE** | 10 comprehensive architectural master documents generated in `mobile-rebuild-plan/`. |
| **Code Modifications** | **0% (NONE)** | Existing web codebase preserved in untouched state. |
| **Flutter Development** | **NOT STARTED** | Halted per planning instructions until user grants formal approval. |

---

## 2. Completed Analysis Workstream

1. **Full Web Application Audit**:
   - Analyzed all 28 onboarding steps and state machine in `OnboardingContext.tsx`.
   - Analyzed 2,460 lines of `vision/page.tsx` pose tracking, smoothing formulas, and kinetic chain metrics.
   - Audited deterministic Mulberry32 planner engine in `planner.ts`.
   - Audited Daily Grind workout loader in `workout-data.ts`.
   - Cataloged all 14 Guru combat skills in `techniques-data.ts` and `skills.txt`.
   - Audited Reflex Enhancer and Combo Flash games in `reflex/page.tsx`.
   - Audited 4-channel leaderboards and RLS policies across `reflex-schema-*.sql`.
   - Audited Razorpay subscriptions, webhook idempotency, and server entitlement checks.
   - Identified critical security flaws in referral rewards, mock payments, and combo score submission.
2. **Architecture Blueprinting**:
   - Designed Flutter + Kotlin (CameraX) + Swift (AVFoundation) + Google MediaPipe Tasks hybrid architecture.
   - Designed Firebase Phone Auth to Supabase JWT federated identity bridge.
   - Designed 3-phase strike state machine eliminating false positives.
   - Designed clean architecture mobile directory structure (`lib/`, `android/`, `ios/`).
   - Mapped all web source files to mobile modules in `WEB_TO_MOBILE_MAP.md`.
   - Authored 22-phase operational development checklist in `IMPLEMENTATION_CHECKLIST.md`.

---

## 3. Files Audited

### Frontend Core
- `frontend/src/app/page.tsx`
- `frontend/src/app/layout.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/onboarding/page.tsx`
- `frontend/src/context/OnboardingContext.tsx`
- All 28 files in `frontend/src/app/onboarding/components/`
- `frontend/src/app/(app)/dashboard/page.tsx`
- `frontend/src/app/(app)/vision/page.tsx`
- `frontend/src/app/(app)/training/page.tsx`
- `frontend/src/app/(app)/training/session/page.tsx`
- `frontend/src/app/(app)/planner/page.tsx`
- `frontend/src/app/(app)/guru/page.tsx`
- `frontend/src/app/(app)/guru/[technique]/page.tsx`
- `frontend/src/app/(app)/reflex/page.tsx`
- `frontend/src/app/(app)/leaderboard/page.tsx`
- `frontend/src/app/(app)/ranks/page.tsx`
- `frontend/src/app/(app)/subscription/page.tsx`
- `frontend/src/app/(app)/settings/page.tsx`
- `frontend/src/app/(app)/analytics/page.tsx`
- `frontend/src/app/(app)/spar/*` (lobby, match, results, watch-ad)
- All 35+ routes in `frontend/src/app/api/*`
- All libraries in `frontend/src/lib/*` and `frontend/src/lib/server/*`

### Backend & Database
- `backend/src/server.ts`
- `backend/src/routes/payments.ts`
- `backend/src/middleware/auth.ts`
- All 22 SQL schema migrations in `supabase/` (`reflex-schema.sql` to `reflex-schema-v20.sql`, `001_subscriptions.sql`)
- `SPARAICONTEXT.md`
- `skills.txt`

---

## 4. Architectural Decisions Made

1. **Flutter + Native Camera/MediaPipe**: Selected for 60 FPS Impeller rendering, single-codebase UI efficiency, and direct access to native GPU/Neural Engine inference.
2. **Firebase Phone Auth for Identity**: Preserved as the sole authentication mechanism per user command, bridged to Supabase via token exchange.
3. **Google MediaPipe Tasks On-Device**: High-performance offline 33-point pose landmark extraction eliminating web CDN script fragility.
4. **State-Machine Biomechanics Engine**: Enforced `GUARD -> STRIKE -> GUARD` state machine with $20^\circ$ hysteresis, $\ge 70\text{ms}$ guard dwell, and dual velocity gates.
5. **Riverpod 2.0 with Code Generation**: Standardized reactive state management.
6. **Isar Embedded Database**: Zero-copy local persistence for offline workouts, telemetry logs, and technique checklists.
7. **Server-Authoritative Quotas & Streaks**: 100% server authority on daily quotas and streak advancement.
8. **Native Razorpay Checkout**: Native UPI Intent flow eliminating webview redirects.

---

## 5. Open Questions & Items Requiring User Approval

1. **Subscription Pricing Alignment**:
   - In code (`entitlements.ts`), Pro is ₹729 and Yearly is ₹6,290.
   - In marketing copy and prompt, Pro is ₹699 and Yearly is ₹6,629.
   - *Recommendation*: Use the user prompt pricing (₹699 Pro, ₹6,629 Yearly).
2. **Referral Duration**:
   - In web code, `claim-referral` and `apply-referral` set 30 days, while marketing copy and prompt specify 14 days.
   - *Recommendation*: Enforce strictly 14 days of Premium tier per 5 verified referrals.
3. **Empty Project Provisioning**:
   - The user specified that once this master plan is approved, a new empty project will be provided to the implementation agent.

---

## 6. Next Step

**HALT & WAIT FOR USER APPROVAL.** Present the full architectural audit and blueprints to the user.
