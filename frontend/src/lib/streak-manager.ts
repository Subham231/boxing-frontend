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

    completeSession(): number {
        const data = this.getStreakData();
        const today = new Date().toDateString(); // e.g., "Sun Mar 01 2026"

        if (data.lastCompletedDate === today) {
            console.log("Session already completed today. Streak maintained but not incremented.");
            return data.currentStreak;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        if (data.lastCompletedDate === yesterdayStr) {
            data.currentStreak += 1;
        } else {
            data.currentStreak = 1;
        }

        data.lastCompletedDate = today;
        this.saveStreakData(data);
        return data.currentStreak;
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
            return 0;
        }

        return data.currentStreak;
    },

    async syncWithSupabase() {
        if (!supabase) return;

        try {
            const onboardingData = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
            const name = (onboardingData.ring_name || onboardingData.ringName || 'FIGHTER').toUpperCase();
            const streak = this.checkAndGetStreak();

            if (streak <= 0) return;

            const { error } = await supabase
                .from('leaderboard_streaks')
                .upsert({
                    name: name,
                    score: streak,
                    display_val: streak.toString(),
                    last_updated: new Date().toISOString()
                }, {
                    onConflict: 'name'
                });

            if (error) throw error;
            console.log("Streak synced with Supabase:", streak);
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
