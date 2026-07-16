import type { PlannerProfile, PlannerUserData } from '@/types';

export const PLANNER_PROFILE_KEY = 'planner_profile_v1';

const EXPERIENCE_TO_LEVEL: Record<string, string> = {
    Amateur: 'Novice',
    Intermediate: 'Intermediate',
    Advanced: 'Advanced',
    Professional: 'Pro',
};

const BOXING_EXPERIENCE_MAP: Record<string, string> = {
    Amateur: 'Novice',
    Intermediate: 'Intermediate',
    Advanced: 'Contender',
    Professional: 'Contender',
};

const INTENSITY_TO_NUMBER: Record<string, number> = {
    Light: 1,
    Moderate: 2,
    High: 3,
    Elite: 4,
};

function readLegacyOnboardingData(): Record<string, any> {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
    } catch {
        return {};
    }
}

// Loads the saved Planner Profile, if one exists. On a user's very first
// visit to the Planner (before a dedicated profile has ever been saved) this
// migrates in whatever fitness data the legacy main-onboarding flow may have
// collected, purely so returning users don't lose data during the cutover —
// it's a one-time read, never a write, and never used again once a real
// Planner Profile has been saved.
export function loadPlannerProfile(): PlannerProfile {
    if (typeof window === 'undefined') return {};

    try {
        const raw = localStorage.getItem(PLANNER_PROFILE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
    } catch {
        // fall through to legacy migration
    }

    const legacy = readLegacyOnboardingData();
    if (!legacy || !Object.keys(legacy).length) return {};

    return {
        age: legacy.user_metrics?.age,
        height: legacy.user_metrics?.height,
        weight: legacy.user_metrics?.weight,
        goals: legacy.goals || (legacy.primary_goal ? [legacy.primary_goal] : []),
        daysPerWeek: legacy.daysPerWeek || legacy.frequency,
        minutesPerSession: legacy.available_time,
        equipment: legacy.constraints?.equipment || [],
        injuries: legacy.constraints?.injuries ? [legacy.constraints.injuries] : [],
        preferredStyle: legacy.combatFocus,
        peakWindow: legacy.planner_config?.peak_window,
        preferredTime: legacy.planner_config?.preferred_time,
    };
}

// The Planner Profile is the single source of truth for workout generation.
// Saving it also mirrors the handful of fields other, non-planner parts of
// the app still read directly off `boxing_onboarding_data` (dashboard-level
// display, the local bodyweight-split engine) so nothing else in the app
// breaks — but the Planner generator itself only ever reads from here.
export function savePlannerProfile(profile: PlannerProfile): PlannerProfile {
    const stamped: PlannerProfile = { ...profile, lastUpdated: Date.now() };
    if (typeof window === 'undefined') return stamped;

    try {
        localStorage.setItem(PLANNER_PROFILE_KEY, JSON.stringify(stamped));

        const existing = readLegacyOnboardingData();
        const merged = {
            ...existing,
            user_metrics: {
                ...(existing.user_metrics || {}),
                age: stamped.age ?? existing.user_metrics?.age,
                height: stamped.height ?? existing.user_metrics?.height,
                weight: stamped.weight ?? existing.user_metrics?.weight,
            },
            goals: stamped.goals || existing.goals,
            primary_goal: stamped.goals?.[0] || existing.primary_goal,
            experience_level: stamped.boxingProfile ? EXPERIENCE_TO_LEVEL[stamped.boxingProfile] : existing.experience_level,
            available_time: stamped.minutesPerSession ?? existing.available_time,
            daysPerWeek: stamped.daysPerWeek ?? existing.daysPerWeek,
            frequency: stamped.daysPerWeek ?? existing.frequency,
            constraints: {
                equipment: stamped.equipment ?? existing.constraints?.equipment,
                injuries: (stamped.injuries || []).join(', ') || existing.constraints?.injuries,
            },
            combatFocus: stamped.preferredStyle || existing.combatFocus,
            planner_config: {
                peak_window: stamped.peakWindow || existing.planner_config?.peak_window,
                preferred_time: stamped.preferredTime || existing.planner_config?.preferred_time,
            },
        };
        localStorage.setItem('boxing_onboarding_data', JSON.stringify(merged));
    } catch (e) {
        console.error('Failed to save planner profile:', e);
    }

    return stamped;
}

// Maps a Planner Profile into the shape the plan generator (fetchPlan /
// buildWeeklyPlan) expects. The generator reads exclusively from this
// mapping — never straight off the main onboarding data.
export function plannerProfileToUserData(profile: PlannerProfile): PlannerUserData {
    return {
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        experience_level: profile.boxingProfile ? EXPERIENCE_TO_LEVEL[profile.boxingProfile] : 'Intermediate',
        primary_goal: profile.goals?.[0] || 'All-Rounder',
        goals: profile.goals || [],
        available_time: profile.minutesPerSession || 30,
        daysPerWeek: profile.daysPerWeek || 3,
        frequency: profile.daysPerWeek || 3,
        selectedWeekdays: profile.trainingDays && profile.trainingDays.length ? profile.trainingDays : undefined,
        constraints: {
            equipment: profile.equipment || [],
            injuries: (profile.injuries || []).filter((i) => i && i !== 'None').join(', '),
        },
        combatFocus: profile.preferredStyle || 'stamina',
        intensity: profile.intensityPreference ? INTENSITY_TO_NUMBER[profile.intensityPreference] : 2,
        fitnessBaseline: {
            boxingExperience: profile.boxingProfile ? BOXING_EXPERIENCE_MAP[profile.boxingProfile] : 'Novice',
        },
        planner_config: {
            peak_window: profile.peakWindow || 'MORNING',
            preferred_time: profile.preferredTime || '07:30',
        },
    };
}
