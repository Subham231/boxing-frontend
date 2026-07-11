import type { PlannerProtocolBlock, ProtocolSessionDrill, WeeklyPlan } from '@/types';

const MAX_EXERCISES_PER_BLOCK = 2;
const WORK_SECONDS = 45;
const REST_SECONDS = 15;

export function progressKey(dayIdx: string, pIdx: string): string {
    return `protocol_progress_${dayIdx}_${pIdx}`;
}

export function completeKey(dayIdx: string, pIdx: string): string {
    return `protocol_complete_${dayIdx}_${pIdx}`;
}

export function drillsCacheKey(dayIdx: string, pIdx: string): string {
    return `protocol_drills_${dayIdx}_${pIdx}`;
}

export function getPlan(): WeeklyPlan | null {
    if (typeof window === 'undefined') return null;
    try {
        return JSON.parse(localStorage.getItem('active_boxing_plan_v2') || 'null');
    } catch {
        return null;
    }
}

export function getProtocolBlock(dayIdx: string, pIdx: string): PlannerProtocolBlock | null {
    const plan = getPlan();
    const day = plan?.days?.[parseInt(dayIdx, 10)];
    return day?.protocol?.[parseInt(pIdx, 10)] ?? null;
}

export function getDrillsForProtocol(dayIdx: string, pIdx: string): ProtocolSessionDrill[] {
    const protocol = getProtocolBlock(dayIdx, pIdx);
    if (!protocol) return [];

    const exercises = (protocol.exercises || []).slice(0, MAX_EXERCISES_PER_BLOCK);
    if (!exercises.length) {
        exercises.push('Bodyweight Flow');
    }

    return exercises.map((name: string, i: number) => ({
        name,
        duration: WORK_SECONDS,
        type: 'timer',
        instruction: `Set ${i + 1} of ${exercises.length}: ${name}. Bodyweight only.`,
        restAfter: i < exercises.length - 1 ? REST_SECONDS : 0,
    }));
}

export function cacheDrills(dayIdx: string, pIdx: string): ProtocolSessionDrill[] {
    const drills = getDrillsForProtocol(dayIdx, pIdx);
    if (typeof window !== 'undefined') {
        sessionStorage.setItem(drillsCacheKey(dayIdx, pIdx), JSON.stringify(drills));
    }
    return drills;
}

export function loadCachedDrills(dayIdx: string, pIdx: string): ProtocolSessionDrill[] {
    if (typeof window !== 'undefined') {
        try {
            const raw = sessionStorage.getItem(drillsCacheKey(dayIdx, pIdx));
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) return parsed;
            }
        } catch { /* ignore */ }
    }
    return cacheDrills(dayIdx, pIdx);
}

export function getCompletedIndices(dayIdx: string, pIdx: string): number[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(progressKey(dayIdx, pIdx)) || '[]');
    } catch {
        return [];
    }
}

export function getDrillCount(dayIdx: string, pIdx: string): number {
    return loadCachedDrills(dayIdx, pIdx).length;
}

export function isProtocolFullyComplete(dayIdx: string, pIdx: string): boolean {
    const total = getDrillCount(dayIdx, pIdx);
    if (!total) return false;
    const done = getCompletedIndices(dayIdx, pIdx);
    if (done.length >= total) {
        if (typeof window !== 'undefined' && localStorage.getItem(completeKey(dayIdx, pIdx)) !== '1') {
            markProtocolFullyComplete(dayIdx, pIdx);
        }
        return true;
    }
    return false;
}

export function markDrillComplete(dayIdx: string, pIdx: string, drillIndex: number): number[] {
    const key = progressKey(dayIdx, pIdx);
    const progress = getCompletedIndices(dayIdx, pIdx);
    if (!progress.includes(drillIndex)) {
        progress.push(drillIndex);
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(progress));
        }
    }
    return progress;
}

export function markProtocolFullyComplete(dayIdx: string, pIdx: string): boolean {
    const total = getDrillCount(dayIdx, pIdx);
    const progress = getCompletedIndices(dayIdx, pIdx);
    if (progress.length < total) return false;

    if (typeof window !== 'undefined') {
        localStorage.setItem(completeKey(dayIdx, pIdx), '1');

        const protocol = getProtocolBlock(dayIdx, pIdx);
        if (protocol) {
            const todayKey = new Date().toDateString();
            const storageKey = 'deployed_planner_drills_' + todayKey;
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!existing.some((d: PlannerProtocolBlock) => d.title === protocol.title && d.fullyComplete)) {
                existing.push({
                    ...protocol,
                    deployed_at: Date.now(),
                    isPlanner: true,
                    fullyComplete: true,
                });
                localStorage.setItem(storageKey, JSON.stringify(existing));
            }
        }
    }
    return true;
}

export function resetProtocolProgress(dayIdx: string, pIdx: string) {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(progressKey(dayIdx, pIdx));
        localStorage.removeItem(completeKey(dayIdx, pIdx));
        sessionStorage.removeItem(drillsCacheKey(dayIdx, pIdx));
    }
}
