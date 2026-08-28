import { StreakData } from '@/types';

const STORAGE_KEY = 'boxing_streak_data';

export const StreakManager = {
    getStreakData(): StreakData {
        const defaultData: StreakData = { currentStreak: 0, lastCompletedDate: null };
        if (typeof window === 'undefined') return defaultData;
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : defaultData;
        } catch (e) {
            console.error('Failed to get streak data:', e);
            return defaultData;
        }
    },

    saveStreakData(data: StreakData) {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save streak data:', e);
        }
    },

    checkAndGetStreak(): number {
        const data = this.getStreakData();
        if (!data.lastCompletedDate) return 0;

        const today = new Date();
        const lastDate = new Date(data.lastCompletedDate);

        const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const lastDateZero = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

        const diffTime = Math.abs(todayZero.getTime() - lastDateZero.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            data.currentStreak = 0;
            data.lastCompletedDate = null; // Clear last completed date to signify a break
            this.saveStreakData(data); // Persist the reset
            return 0;
        }

        return data.currentStreak;
    },

    completeSession(): number {
        // First, check the current streak to see if it needs to be reset due to a missed day
        // This call will update localStorage if a streak break is detected
        this.checkAndGetStreak();

        // Re-fetch the data after checkAndGetStreak might have updated it
        let data = this.getStreakData();
        let { currentStreak, lastCompletedDate } = data;

        const today = new Date().toDateString(); // e.g., "Sun Jul 23 2026"

        if (lastCompletedDate === today) {
            console.log("Session already completed today. Streak maintained but not incremented.");
            return currentStreak;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (lastCompletedDate === yesterdayStr) {
            currentStreak += 1;
        } else {
            // If the last completed date was not yesterday, it means:
            // 1. It's the first session ever (lastCompletedDate is null) -> start new streak
            // 2. A streak break was detected by checkAndGetStreak() -> start new streak
            currentStreak = 1;
        }

        lastCompletedDate = today;
        this.saveStreakData({ currentStreak, lastCompletedDate });
        return currentStreak;
    },

    async syncWithSupabase() {
        // No-op: kept only so existing call sites don't need to change.
        // The real streak table (`user_streaks`) is uid-keyed and is written
        // server-side by /api/reflex/complete-session using the service-role
        // key. This client-side path used to write to a name-keyed
        // `leaderboard_streaks` table that no longer exists in the schema
        // (see supabase/reflex-schema-v3.sql), which is what was producing
        // the "Supabase Streak Sync Error" / 404s on every dashboard load.
        return;
    },

    getRank(score: number) {
        if (score >= 31) return { name: 'MASTER', color: '#E2FF3B', class: 'rank-master', icon: 'Flame' };
        if (score >= 22) return { name: 'DIAMOND', color: '#B9F2FF', class: 'rank-diamond', icon: 'Gem' };
        if (score >= 15) return { name: 'PLATINUM', color: '#E5E4E2', class: 'rank-platinum', icon: 'Award' };
        if (score >= 8) return { name: 'GOLD', color: '#FFD700', class: 'rank-gold', icon: 'Medal' };
        if (score >= 4) return { name: 'SILVER', color: '#C0C0C0', class: 'rank-silver', icon: 'Shield' };
        if (score >= 1) return { name: 'BRONZE', color: '#CD7F32', class: 'rank-bronze', icon: 'Shield' };
        return { name: 'ROOKIE', color: '#444', class: 'rank-rookie', icon: 'User' };
    }
};
