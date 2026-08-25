export type LearningStage = 'Beginner' | 'Learning' | 'Practicing' | 'Confident' | 'Mastered';

export const STAGES: LearningStage[] = ['Beginner', 'Learning', 'Practicing', 'Confident', 'Mastered'];

export interface TechniqueChecklist {
  understand: boolean;
  practice: boolean;
  drill: boolean;
  timing: boolean;
}

export interface PracticeLogEntry {
  date: string; // YYYY-MM-DD
  reps: number;
  minutes: number;
}

export interface TechniqueProgress {
  stage: LearningStage;
  favorite: boolean;
  notes: string;
  checklist: TechniqueChecklist;
  practiceLog: PracticeLogEntry[];
  quizPassed: boolean;
  lastViewed?: string; // ISO timestamp
}

const PROGRESS_KEY_PREFIX = 'guru_progress_';
const RECENT_KEY = 'guru_recent_v1';
const RECENT_LIMIT = 8;

const DEFAULT_PROGRESS: TechniqueProgress = {
  stage: 'Beginner',
  favorite: false,
  notes: '',
  checklist: { understand: false, practice: false, drill: false, timing: false },
  practiceLog: [],
  quizPassed: false,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadTechniqueProgress(id: string): TechniqueProgress {
  if (typeof window === 'undefined') return { ...DEFAULT_PROGRESS };
  try {
    const raw = localStorage.getItem(PROGRESS_KEY_PREFIX + id);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROGRESS, ...parsed, checklist: { ...DEFAULT_PROGRESS.checklist, ...(parsed.checklist || {}) } };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveTechniqueProgress(id: string, progress: TechniqueProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_KEY_PREFIX + id, JSON.stringify(progress));
  } catch {
    // ignore quota errors
  }
}

export function markRecentlyViewed(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[];
    const next = [id, ...raw.filter((x) => x !== id)].slice(0, RECENT_LIMIT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function loadRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function logPractice(id: string, reps: number, minutes: number): TechniqueProgress {
  const progress = loadTechniqueProgress(id);
  const date = todayKey();
  const existingToday = progress.practiceLog.find((e) => e.date === date);
  let nextLog: PracticeLogEntry[];
  if (existingToday) {
    nextLog = progress.practiceLog.map((e) => (e.date === date ? { ...e, reps: e.reps + reps, minutes: e.minutes + minutes } : e));
  } else {
    nextLog = [...progress.practiceLog, { date, reps, minutes }];
  }
  const next: TechniqueProgress = { ...progress, practiceLog: nextLog.slice(-90) };
  saveTechniqueProgress(id, next);
  return next;
}

export function practiceTotals(progress: TechniqueProgress) {
  const today = todayKey();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoKey = weekAgo.toISOString().slice(0, 10);

  let todayReps = 0, todayMinutes = 0, weekReps = 0, weekMinutes = 0, totalReps = 0, totalMinutes = 0;
  progress.practiceLog.forEach((e) => {
    totalReps += e.reps;
    totalMinutes += e.minutes;
    if (e.date === today) {
      todayReps += e.reps;
      todayMinutes += e.minutes;
    }
    if (e.date >= weekAgoKey) {
      weekReps += e.reps;
      weekMinutes += e.minutes;
    }
  });
  return { todayReps, todayMinutes, weekReps, weekMinutes, totalReps, totalMinutes };
}

export function allProgressIds(): string[] {
  if (typeof window === 'undefined') return [];
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(PROGRESS_KEY_PREFIX))
    .map((k) => k.slice(PROGRESS_KEY_PREFIX.length));
}

export function loadAllProgress(): Record<string, TechniqueProgress> {
  const ids = allProgressIds();
  const out: Record<string, TechniqueProgress> = {};
  ids.forEach((id) => (out[id] = loadTechniqueProgress(id)));
  return out;
}

// Learning streak: consecutive days (including today) with at least one
// practice log entry across ANY technique.
export function computeLearningStreak(): number {
  const all = loadAllProgress();
  const activeDates = new Set<string>();
  Object.values(all).forEach((p) => p.practiceLog.forEach((e) => activeDates.add(e.date)));

  if (!activeDates.size) return 0;

  let streak = 0;
  const cursor = new Date();
  // If today has no activity yet, streak counts backward from yesterday
  // (still "alive" until the day fully ends).
  if (!activeDates.has(todayKey())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (activeDates.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export interface Achievement {
  id: string;
  icon: 'book' | 'swords' | 'brain' | 'flame' | 'trophy';
  label: string;
  earned: boolean;
}

export function computeAchievements(totalTechniques: number): Achievement[] {
  const all = loadAllProgress();
  const values = Object.values(all);
  const masteredCount = values.filter((p) => p.stage === 'Mastered').length;
  const anyCompleted = values.some((p) => p.checklist.understand && p.checklist.practice && p.checklist.drill && p.checklist.timing);
  const jabProgress = all['jab'];
  const jabMastered = jabProgress?.stage === 'Mastered';
  const streak = computeLearningStreak();
  const quizPassCount = values.filter((p) => p.quizPassed).length;

  return [
    { id: 'first_lesson', icon: 'book', label: 'First Lesson Completed', earned: anyCompleted },
    { id: 'jab_master', icon: 'swords', label: 'Jab Master', earned: jabMastered },
    { id: 'tactical_learner', icon: 'brain', label: 'Tactical Learner', earned: quizPassCount >= 3 },
    { id: 'streak_7', icon: 'flame', label: '7-Day Learning Streak', earned: streak >= 7 },
    { id: 'technique_expert', icon: 'trophy', label: 'Technique Expert', earned: masteredCount >= Math.ceil(totalTechniques * 0.5) },
  ];
}
