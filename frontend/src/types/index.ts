export interface OnboardingConstraints {
  equipment?: string[];
  injuries?: string;
}

export interface OnboardingData {
  ringName: string;
  phone: string;
  age: number;
  height: number;
  weight: number;
  goals: string[];
  promiseWord: string;
  hasCompletedOnboarding: boolean;
  primary_goal: string;
  experience_level: string;
  available_time: number;
  constraints: OnboardingConstraints;
  stance: string;
  trigger: string;
  intensity: number;
  frequency: number;
}

export interface Drill {
  name: string;
  instruction: string;
  focus?: string;
  type: 'timer' | 'reps';
  reps?: string;
  duration?: number;
  sets?: number;
  isPlanner?: boolean;
  impact?: string;
}

export interface Workout {
  title: string;
  focus: string;
  drills: Drill[];
}

export interface PlannerConfig {
  peak_window?: string;
  preferred_time?: string;
  peakWindow?: string;
  preferredTime?: string;
}

export interface PlannerProtocolBlock {
  time: string;
  duration: string;
  title: string;
  impact: string;
  day_type?: string;
  exercises: string[];
  instruction?: string;
  deployed_at?: number;
  isPlanner?: boolean;
  fullyComplete?: boolean;
}

export interface PlannerDay {
  day_name: string;
  date: string;
  day_type: string;
  intensity: number;
  protocol: PlannerProtocolBlock[];
  recovery: string;
}

export interface PlannerSchedule {
  preferred_time: string;
  preferred_time_display: string;
  peak_window: string;
}

export interface WeeklyPlan {
  title?: string;
  week_range: string;
  intensity_score: number;
  days: PlannerDay[];
  planner_schedule?: PlannerSchedule;
  generated_by?: string;
  generated_at?: string;
  version?: string;
}

export interface PlannerUserData extends Partial<OnboardingData> {
  primaryGoal?: string;
  experienceLevel?: string;
  availableTime?: number;
  planner_config?: PlannerConfig;
  plannerConfig?: PlannerConfig;
  gear?: string[];
}

export interface GeminiTextPart {
  text?: string;
}

export interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiTextPart[];
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}

export interface ProtocolSessionDrill extends Drill {
  restAfter?: number;
}

export interface StoredCompletedPlannerDrill {
  name: string;
  completed_at?: number;
  impact?: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  display_val: string;
  last_updated?: string;
  rank?: number;
  totalPlayers?: number;
}

export interface SupabaseLeaderboardRow {
  id?: string | number;
  name?: string;
  player_name?: string;
  score: number;
  display_val?: string;
  display_score?: string | number;
  last_updated?: string;
  created_at?: string;
}

export interface Technique {
  id: string;
  name: string;
  difficulty?: 'Basic' | 'Intermediate' | 'Advanced';
  category: 'stance' | 'punch' | 'kick' | 'defense' | 'footwork' | string;
  description: string;
  steps: string[];
  tips: string[];
  mediaUrl?: string;
  masteryScore?: number;
}

export interface StreakData {
  currentStreak: number;
  lastCompletedDate: string | null;
}
