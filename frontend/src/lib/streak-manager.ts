import { StreakData } from '@/types';
import { supabase } from './supabase';

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
        if (!supabase) return;

        try {
            const onboardingRaw = localStorage.getItem('boxing_onboarding_data');
            const onboardingData = onboardingRaw ? JSON.parse(onboardingRaw) : {};
            const name = (onboardingData.ring_name || onboardingData.ringName || 'FIGHTER').toUpperCase();

            // Ensure local streak data is up-to-date before syncing
            const localStreak = this.checkAndGetStreak();

            if (localStreak <= 0) {
                // If local streak is 0, also ensure Supabase is reset
                const { error: deleteError } = await supabase
                    .from('leaderboard_streaks')
                    .delete()
                    .eq('name', name);

                if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 means "No rows found" which is fine
                    throw deleteError;
                }
                console.log("Supabase streak cleared for:", name);
                return;
            }

            const { data: existingStreak, error: fetchError } = await supabase
                .from('leaderboard_streaks')
                .select('current_streak, longest_streak, last_activity')
                .eq('name', name)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // No rows found is okay
                throw fetchError;
            }

            let newCurrentStreak = localStreak;
            let newLongestStreak = existingStreak?.longest_streak || 0;
            const lastActivity = existingStreak?.last_activity ? new Date(existingStreak.last_activity) : null;
            const today = new Date();
            const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD

            if (lastActivity) {
                const lastActivityISO = lastActivity.toISOString().split('T')[0];
                const diffTime = Math.abs(today.getTime() - lastActivity.getTime());
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1 && localStreak > 0 && lastActivityISO === new Date(today.getTime() - (1000 * 60 * 60 * 24)).toISOString().split('T')[0]) {
                    // Streak continued
                    // newCurrentStreak is already localStreak
                    newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
                } else if (diffDays > 1) {
                    // Streak broken in Supabase, reset to 1 if local is active
                    newCurrentStreak = localStreak; // Should be 1 if local just started or 0 if reset
                    // Longest streak remains the same or gets updated if localStreak was higher before reset
                } else if (diffDays === 0) {
                    // Same day, don't increment, just ensure consistency
                    newCurrentStreak = existingStreak?.current_streak || localStreak;
                }
            } else {
                // First time syncing for this user
                newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
            }

            const { error } = await supabase
                .from('leaderboard_streaks')
                .upsert({
                    name: name,
                    current_streak: newCurrentStreak,
                    longest_streak: newLongestStreak,
                    display_val: newCurrentStreak.toString(),
                    last_activity: todayISO // Only update last_activity to today if a session is completed
                }, {
                    onConflict: 'name'
                });

            if (error) throw error;
            console.log("Streak synced with Supabase:", newCurrentStreak, "Longest:", newLongestStreak);
        } catch (e) {
            console.error("Supabase Streak Sync Error:", e);
        }
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
