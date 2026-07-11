import { supabase } from './supabase';

export const LeaderboardManager = {
    RING_NAME_KEY: 'boxing_ring_name',

    getRingName(): string {
        if (typeof window === 'undefined') return 'Anonymous Fighter';
        try {
            const onboardingData = JSON.parse(localStorage.getItem('boxing_onboarding_data') || '{}');
            return (onboardingData.ring_name || onboardingData.ringName || localStorage.getItem(this.RING_NAME_KEY) || 'Anonymous Fighter').trim();
        } catch (e) {
            return localStorage.getItem(this.RING_NAME_KEY) || 'Anonymous Fighter';
        }
    },

    setRingName(name: string) {
        if (typeof window === 'undefined') return;
        localStorage.setItem(this.RING_NAME_KEY, name);
    },

    async updateReflexScore(avgReflexMs: number): Promise<boolean> {
        if (!supabase) {
            console.warn('Supabase client not available for reflex score upload');
            return false;
        }

        try {
            const displayVal = `${Math.round(avgReflexMs)}ms`;
            const ringName = this.getRingName();
            
            const { error } = await supabase
                .from('leaderboard_reflex')
                .upsert(
                    {
                        name: ringName,
                        score: avgReflexMs,
                        display_val: displayVal,
                        last_updated: new Date().toISOString()
                    },
                    { onConflict: 'name' }
                );

            if (error) {
                console.error('Error updating reflex leaderboard:', error);
                return false;
            }

            console.log('✔ Reflex score synced:', ringName, displayVal);
            return true;
        } catch (err) {
            console.error('Reflex score sync failed:', err);
            return false;
        }
    },

    async updateComboScore(avgComboScore: number): Promise<boolean> {
        if (!supabase) {
            console.warn('Supabase client not available for combo score upload');
            return false;
        }

        try {
            const displayVal = `${Math.round(avgComboScore)} pts`;
            const ringName = this.getRingName();
            
            const { error } = await supabase
                .from('leaderboard_combo')
                .upsert(
                    {
                        name: ringName,
                        score: avgComboScore,
                        display_val: displayVal,
                        last_updated: new Date().toISOString()
                    },
                    { onConflict: 'name' }
                );

            if (error) {
                console.error('Error updating combo leaderboard:', error);
                return false;
            }

            console.log('✔ Combo score synced:', ringName, displayVal);
            return true;
        } catch (err) {
            console.error('Combo score sync failed:', err);
            return false;
        }
    },

    async updateStreakScore(streakDays: number): Promise<boolean> {
        if (!supabase) {
            console.warn('Supabase client not available for streak score upload');
            return false;
        }

        try {
            const displayVal = `${streakDays} days`;
            const ringName = this.getRingName();
            
            const { error } = await supabase
                .from('leaderboard_streaks')
                .upsert(
                    {
                        name: ringName,
                        score: streakDays,
                        display_val: displayVal,
                        last_updated: new Date().toISOString()
                    },
                    { onConflict: 'name' }
                );

            if (error) {
                console.error('Error updating streak leaderboard:', error);
                return false;
            }

            console.log('✔ Streak score synced:', ringName, displayVal);
            return true;
        } catch (err) {
            console.error('Streak score sync failed:', err);
            return false;
        }
    },

    async getLeaderboard(tableName: string, isAscending = false, limit = 100): Promise<any[]> {
        if (!supabase) {
            console.warn('Supabase client not available');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .order('score', { ascending: isAscending })
                .limit(limit);

            if (error) {
                console.error(`Error fetching ${tableName}:`, error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error(`Failed to fetch ${tableName}:`, err);
            return [];
        }
    },

    async getUserRank(tableName: string, isAscending = false): Promise<any | null> {
        if (!supabase) {
            console.warn('Supabase client not available');
            return null;
        }

        try {
            const ringName = this.getRingName();
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .order('score', { ascending: isAscending });

            if (error || !data) {
                console.error(`Error fetching user rank for ${tableName}:`, error);
                return null;
            }

            const userIndex = data.findIndex(entry => entry.name.toUpperCase() === ringName.toUpperCase());
            if (userIndex === -1) return null;

            return {
                rank: userIndex + 1,
                totalPlayers: data.length,
                ...data[userIndex]
            };
        } catch (err) {
            console.error(`Failed to get user rank for ${tableName}:`, err);
            return null;
        }
    }
};
