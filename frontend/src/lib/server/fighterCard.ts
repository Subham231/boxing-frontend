// SERVER-ONLY. The ONLY profile data a spar opponent ever sees about a
// fighter: name, picture, streak rank and plan tier. Nothing else (no email,
// uid-linked stats, location, scores) is exposed here on purpose.
import { supabaseAdmin } from './supabase-admin';
import { getEntitlement } from './entitlements';
import { getRankTier } from '../rank-system';

export interface FighterCard {
  uid: string;
  name: string;
  avatarUrl: string | null;
  rank: { level: number; name: string; color: string; badgeImg: string };
  streak: number;
  plan: { active: boolean; label: string };
}

export async function getFighterCard(uid: string): Promise<FighterCard> {
  let name = 'FIGHTER';
  let avatarUrl: string | null = null;
  let streak = 0;
  let rankLevel = 0;

  if (supabaseAdmin) {
    const [{ data: profile }, { data: streakRow }] = await Promise.all([
      supabaseAdmin.from('reflex_profiles').select('display_name, avatar_url').eq('uid', uid).maybeSingle(),
      supabaseAdmin.from('user_streaks').select('current_streak, rank_level').eq('uid', uid).maybeSingle(),
    ]);
    if (profile?.display_name) name = String(profile.display_name).toUpperCase().slice(0, 18);
    avatarUrl = profile?.avatar_url || null;
    streak = Number(streakRow?.current_streak) || 0;
    rankLevel = Number(streakRow?.rank_level) || 0;
  }

  let planLabel = 'FREE';
  let active = false;
  try {
    const ent = await getEntitlement(uid);
    active = ent.active;
    if (ent.active) {
      planLabel = ent.isElite
        ? 'ELITE'
        : (ent.planName || 'PRO').replace(/^SparAI\s*/i, '').replace(/^14-Day\s*/i, '').toUpperCase();
    }
  } catch {
    /* default to FREE */
  }

  const tier = getRankTier(rankLevel);
  return {
    uid,
    name,
    avatarUrl,
    rank: { level: tier.level, name: tier.name, color: tier.color, badgeImg: tier.badgeImg },
    streak,
    plan: { active, label: planLabel },
  };
}
