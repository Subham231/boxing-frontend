import { API_BASE_URL } from './api';
import type {
    GeminiGenerateContentResponse,
    GeminiTextPart,
    PlannerDay,
    PlannerProtocolBlock,
    PlannerUserData,
    WeeklyPlan,
} from '@/types';

export const GEMINI_MODEL = 'gemini-2.0-flash';

export const DAY_TYPES = [
    { key: 'push', label: 'PUSH DAY' },
    { key: 'pull', label: 'PULL DAY' },
    { key: 'leg', label: 'LEG DAY' },
    { key: 'endurance', label: 'ENDURANCE DAY' },
    { key: 'strength', label: 'STRENGTH DAY' },
    { key: 'push', label: 'PUSH DAY' },
    { key: 'recovery', label: 'ACTIVE RECOVERY' },
];

export const EXERCISES: Record<string, string[]> = {
    push: [
        'Standard Push-Ups',
        'Wide Push-Ups',
        'Diamond Push-Ups',
        'Pike Push-Ups',
        'Chair Dips',
        'Shoulder Tap Plank',
        'Decline Push-Ups (feet elevated)',
        'Explosive Push-Ups',
    ],
    pull: [
        'Inverted Rows (table)',
        'Doorframe Rows',
        'Superman Hold',
        'Reverse Snow Angels',
        'Prone Y-Raises',
        'Isometric Chin Hold',
        'Bandless Face Pulls',
        'Wall Walkouts',
    ],
    leg: [
        'Bodyweight Squats',
        'Walking Lunges',
        'Bulgarian Split Squats',
        'Glute Bridges',
        'Calf Raises',
        'Jump Squats',
        'Wall Sit',
        'Single-Leg RDL (bodyweight)',
    ],
    endurance: [
        'Burpees',
        'Mountain Climbers',
        'High Knees',
        'Jumping Jacks',
        'Shadow Boxing Rounds',
        'Skater Hops',
        'Fast Feet Drill',
        'Sprawl to Stand',
    ],
    strength: [
        'Plyometric Push-Ups',
        'Tempo Squats (3-1-1)',
        'Single-Leg Squats',
        'Plank to Push-Up',
        'Bear Crawl',
        'Crab Walk',
        'Hollow Body Hold',
        'Side Plank Reach-Through',
    ],
    recovery: [
        'Cat-Cow Flow',
        'World\'s Greatest Stretch',
        'Hip Circles',
        'Arm Swings',
        'Deep Squat Hold',
        'Child\'s Pose',
        'Leg Swings',
        'Thoracic Rotations',
    ],
};

export const PROTOCOL_BLOCKS = [
    { title: 'WARM-UP', duration: '5 MIN', offsetMin: 0 },
    { title: 'PRIMARY BLOCK', duration: '12 MIN', offsetMin: 8 },
    { title: 'SECONDARY BLOCK', duration: '10 MIN', offsetMin: 22 },
    { title: 'CONDITIONING', duration: '8 MIN', offsetMin: 34 },
    { title: 'COOLDOWN', duration: '5 MIN', offsetMin: 44 },
];

export const EXERCISES_PER_BLOCK = 2;
export const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function padTime(h: number, m: number): string {
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

export function parsePreferredTime(timeStr: string) {
    const raw = String(timeStr || '07:30').trim();
    const match = raw.match(/(\d{1,2}):(\d{2})/);
    let h = match ? parseInt(match[1], 10) : 7;
    let m = match ? parseInt(match[2], 10) : 30;
    if (/pm/i.test(raw) && h < 12) h += 12;
    if (/am/i.test(raw) && h === 12) h = 0;
    return { h: h % 24, m: m % 60 };
}

export function addMinutes(timeStr: string, minutes: number): string {
    const { h, m } = parsePreferredTime(timeStr);
    let total = h * 60 + m + minutes;
    while (total < 0) total += 24 * 60;
    total = total % (24 * 60);
    return padTime(Math.floor(total / 60), total % 60);
}

export function getPreferredTime(userData: PlannerUserData): string {
    return userData?.planner_config?.preferred_time || userData?.plannerConfig?.preferredTime || '07:30';
}

export function applyUserSchedule(plan: WeeklyPlan, userData: PlannerUserData): WeeklyPlan {
    if (!plan?.days?.length) return plan;
    const preferred = getPreferredTime(userData);

    plan.days.forEach((day, i) => {
        const dt = DAY_TYPES[i] || DAY_TYPES[0];
        const dayLabel = day.day_type || dt.label;
        const schedule = buildProtocolsForDay(dt.key, dayLabel, preferred);
        const protocols = Array.isArray(day.protocol) ? day.protocol : [];

        day.protocol = protocols.map((p, j) => ({
            ...p,
            time: schedule[j]?.time || addMinutes(preferred, PROTOCOL_BLOCKS[j]?.offsetMin || 0),
        }));

        plan.planner_schedule = {
            preferred_time: preferred,
            preferred_time_display: addMinutes(preferred, 0),
            peak_window: userData?.planner_config?.peak_window || userData?.plannerConfig?.peakWindow || 'MORNING',
        };
    });

    return plan;
}

export function pickExercises(dayKey: string, blockIndex: number, count: number): string[] {
    const pool = EXERCISES[dayKey] || EXERCISES.push;
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
        out.push(pool[(blockIndex * 3 + i) % pool.length]);
    }
    return out;
}

export function buildProtocolsForDay(dayKey: string, dayLabel: string, preferredTime: string): PlannerProtocolBlock[] {
    return PROTOCOL_BLOCKS.map((block, i) => ({
        time: addMinutes(preferredTime, block.offsetMin),
        duration: block.duration,
        title: `${dayLabel}: ${block.title}`,
        impact: dayLabel,
        day_type: dayLabel,
        exercises: pickExercises(dayKey, i, EXERCISES_PER_BLOCK),
    }));
}

export function recoveryForDay(dayKey: string): string {
    const map: Record<string, string> = {
        push: 'Chest & triceps foam roll + 10 min walk',
        pull: 'Lat stretch + bandless shoulder mobility',
        leg: 'Quad & hip flexor stretch + easy walk',
        endurance: 'Box breathing + light walk cooldown',
        strength: 'Full-body stretch + parasympathetic reset',
        recovery: 'Breathwork + yoga flow + sleep hygiene',
    };
    return map[dayKey] || 'Active mobility & hydration';
}

export function buildWeeklyPlan(userData: PlannerUserData): WeeklyPlan {
    const start = new Date();
    const preferred = getPreferredTime(userData);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const week_range = `${start.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${start.getDate()} - ${end.getDate()}`;

    const days = DAY_TYPES.map((dt, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const intensity =
            dt.key === 'recovery' ? 35 : 55 + (i % 4) * 8 + (dt.key === 'strength' ? 10 : 0);

        return {
            day_name: DAY_NAMES[i],
            date: String(d.getDate()),
            day_type: dt.label,
            intensity: Math.min(intensity, 98),
            protocol: buildProtocolsForDay(dt.key, dt.label, preferred),
            recovery: recoveryForDay(dt.key),
        };
    });

    const intensity_score = Math.round(
        days.reduce((s, d) => s + d.intensity, 0) / days.length
    );

    return {
        week_range,
        intensity_score,
        days,
        planner_schedule: {
            preferred_time: preferred,
            preferred_time_display: addMinutes(preferred, 0),
            peak_window: userData?.planner_config?.peak_window || userData?.plannerConfig?.peakWindow || 'MORNING',
        },
    };
}

export function normalizePlan(plan: Partial<WeeklyPlan> | null | undefined, userData: PlannerUserData): WeeklyPlan {
    const local = buildWeeklyPlan(userData);
    if (!plan || !Array.isArray(plan.days) || plan.days.length < 7) {
        return local;
    }

    const normalized = {
        week_range: plan.week_range || local.week_range,
        intensity_score: plan.intensity_score || local.intensity_score,
        days: plan.days.slice(0, 7).map((day: Partial<PlannerDay>, i: number) => {
            const fallback = local.days[i];
            const dayType =
                day.day_type ||
                fallback.day_type ||
                DAY_TYPES[i].label;

            let protocols = Array.isArray(day.protocol) ? day.protocol : [];
            if (protocols.length < 5) {
                protocols = fallback.protocol.map((fb, j) => ({
                    ...fb,
                    ...(protocols[j] || {}),
                    time: fb.time,
                    exercises: ((protocols[j] && protocols[j].exercises) || fb.exercises || [])
                        .slice(0, EXERCISES_PER_BLOCK),
                }));
                while (protocols.length < 5) {
                    protocols.push(fallback.protocol[protocols.length]);
                }
            } else {
                protocols = protocols.slice(0, 5).map((p, j) => {
                    const fb = fallback.protocol[j] || fallback.protocol[0];
                    const exercises = (
                        Array.isArray(p.exercises) && p.exercises.length
                            ? p.exercises
                            : fb.exercises
                    )
                        .filter(Boolean)
                        .slice(0, EXERCISES_PER_BLOCK);
                    return {
                        ...fb,
                        ...p,
                        time: fb.time,
                        day_type: dayType,
                        impact: dayType,
                        title: p.title || fb.title,
                        exercises,
                    };
                });
            }
            protocols = protocols.map((p) => ({
                ...p,
                exercises: (p.exercises || []).slice(0, EXERCISES_PER_BLOCK),
            }));

            return {
                ...fallback,
                ...day,
                day_name: day.day_name || fallback.day_name,
                date: String(day.date || fallback.date),
                day_type: dayType,
                intensity: day.intensity ?? fallback.intensity,
                protocol: protocols,
                recovery: day.recovery || fallback.recovery,
            };
        }),
    };

    while (normalized.days.length < 7) {
        normalized.days.push(local.days[normalized.days.length]);
    }

    const scheduled = applyUserSchedule(normalized, userData);
    scheduled.generated_by = plan.generated_by || 'gemini';
    return scheduled;
}

export function buildPlannerPrompts(userData: PlannerUserData) {
    const preferred = getPreferredTime(userData);
    const peak = userData?.planner_config?.peak_window || userData?.plannerConfig?.peakWindow || 'MORNING';
    const goal = userData?.primary_goal || userData?.primaryGoal || 'All-Rounder';

    const systemPrompt = `You are the Synthetic Combat Intelligence for an AI boxing training app.
Generate a complete 7-day weekly training roadmap as JSON.
RETURN ONLY ONE VALID JSON OBJECT. NO MARKDOWN. NO CODE FENCES. NO COMMENTS.
NO EQUIPMENT (no bags, weights, bands, machines).

JSON STRUCTURE:
{
  "week_range": "MAR 26 - APR 1",
  "intensity_score": 84,
  "days": [
    {
      "day_name": "MON",
      "date": "26",
      "day_type": "PUSH DAY",
      "intensity": 65,
      "protocol": [
        {
          "time": "7:30 AM",
          "duration": "5 MIN",
          "title": "PUSH DAY: WARM-UP",
          "impact": "PUSH DAY",
          "day_type": "PUSH DAY",
          "exercises": ["Push-Ups", "Shoulder Circles"]
        }
      ],
      "recovery": "Mobility notes"
    }
  ]
}

MANDATORY RULES:
1. Exactly 7 days (MON through SUN) starting from today's real date.
2. Weekly split: MON=PUSH DAY, TUE=PULL DAY, WED=LEG DAY, THU=ENDURANCE DAY, FRI=STRENGTH DAY, SAT=PUSH DAY, SUN=ACTIVE RECOVERY.
3. Each day has exactly 5 protocol blocks: WARM-UP, PRIMARY BLOCK, SECONDARY BLOCK, CONDITIONING, COOLDOWN.
4. Each protocol block has exactly 2 exercises (bodyweight only) matching that day's day_type.
5. User preferred session start: "${preferred}" (24h HH:mm). First block each day MUST start at this time in 12-hour format.
   Stagger later blocks at +8, +22, +34, +44 minutes from that start.
6. User peak window: "${peak}" - align session energy to this window.
7. User primary goal: "${goal}" - reflect in intensity and exercise selection.
8. Title format: "{day_type}: {BLOCK NAME}".
9. "impact" and "day_type" on each protocol must match that day's day_type label.
10. Use realistic durations (5-15 MIN per block).`;

    const currentDateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const userPrompt = `Generate the full 7-day roadmap for this athlete profile:
${JSON.stringify(userData, null, 2)}

Today is ${currentDateStr}. The "date" field on each day must be the calendar day of month (e.g. "26") starting from today.`;

    return { systemPrompt, userPrompt };
}

export function parsePlanFromGeminiText(text: string) {
    if (!text) throw new Error('Empty response from Gemini.');
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON in Gemini response.');
    return JSON.parse(jsonMatch[0]);
}

export async function generatePlanViaGeminiDirect(apiKey: string, userData: PlannerUserData) {
    if (!apiKey) throw new Error('Gemini API key is missing.');

    const { systemPrompt, userPrompt } = buildPlannerPrompts(userData);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
            generationConfig: {
                temperature: 0.75,
                responseMimeType: 'application/json',
            },
        }),
    });

    if (res.status === 429) {
        throw new Error('Neural Capacity Reached. Please wait and try again.');
    }

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json() as GeminiGenerateContentResponse;
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!parts?.length) {
        const block = data?.promptFeedback?.blockReason;
        throw new Error(block ? `Gemini blocked: ${block}` : 'No content from Gemini.');
    }
    const text = parts.map((p: GeminiTextPart) => p.text || '').join('');
    return parsePlanFromGeminiText(text);
}

export async function fetchPlan(userData: PlannerUserData): Promise<WeeklyPlan> {
    const backendUrl = `${API_BASE_URL}/api/generate-plan`;
    
    try {
        console.log('[Planner] Requesting plan from Gemini via backend:', backendUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        
        const requestBody = {
            experience: userData.experience_level || userData.experienceLevel || 'Novice',
            focus: userData.primary_goal || userData.primaryGoal || 'All-Rounder',
            equipment: userData.constraints?.equipment || userData.gear || ['shadowbox'],
            duration: userData.available_time || userData.availableTime || 30,
            frequency: userData.frequency || 5,
            user_metrics: {
                age: userData.age || 25,
                weight: userData.weight || 75,
                height: userData.height || 180
            }
        };
        
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        
        clearTimeout(timeout);

        if (response.status === 429) {
            throw new Error('Neural Capacity Reached. Please wait a moment.');
        }

        if (response.ok) {
            const resJson = await response.json();
            if (resJson.plan) {
                return normalizePlan(resJson.plan, userData);
            }
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[Planner] Backend Gemini proxy failed:', message);
    }

    // Direct client-side API fallback is opt-in because NEXT_PUBLIC_* values ship to browsers.
    const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (key) {
        console.log('[Planner] Calling Gemini API directly from client');
        const raw = await generatePlanViaGeminiDirect(key, userData);
        return normalizePlan(raw, userData);
    }

    return buildWeeklyPlan(userData);
}
