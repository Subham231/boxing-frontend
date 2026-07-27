'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, ShieldCheck, ArrowLeft, Search, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { GlassCard } from '@/components/ui/GlassCard';

interface ProfileResult {
  uid: string;
  phone: string;
  display_name?: string;
  plan?: string;
  plan_expires_at?: string;
  subscription_until?: string;
  daily_analysis_count?: number;
  weekly_planner_count?: number;
  is_elite?: boolean;
}

const PLANS = [
  { id: 'monthly', name: 'Monthly', days: 30 },
  { id: 'monthly_pro', name: 'Monthly Pro', days: 30 },
  { id: 'three_month', name: '3 Months', days: 90 },
  { id: 'yearly', name: 'Yearly', days: 365, elite: true },
];

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const router = useRouter();
  const [searchUid, setSearchUid] = useState('');
  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [dailyLimit, setDailyLimit] = useState('-1');
  const [weeklyLimit, setWeeklyLimit] = useState('-1');
  const [granting, setGranting] = useState(false);
  const [grantResult, setGrantResult] = useState<string | null>(null);

  const ADMIN_OTP = '999999';

  const handleSearch = async () => {
    if (!searchUid.trim()) return;
    setSearching(true);
    setSearchError(null);
    setProfile(null);
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/lookup?uid=${encodeURIComponent(searchUid.trim())}`, {
        headers: { Authorization: `Bearer ${ADMIN_OTP}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not found');
      setProfile(data.profile);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleGrant = async () => {
    if (!profile) return;
    setGranting(true);
    setGrantResult(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_OTP}` },
        body: JSON.stringify({
          targetUid: profile.uid,
          plan: selectedPlan,
          dailyAnalysisLimit: parseInt(dailyLimit),
          weeklyPlannerLimit: parseInt(weeklyLimit),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grant failed');
      setGrantResult(`✅ Granted ${selectedPlan} — expires ${new Date(data.expiresAt).toLocaleDateString()}`);
      // Refresh profile
      handleSearch();
    } catch (e) {
      setGrantResult(`❌ ${e instanceof Error ? e.message : 'Grant failed'}`);
    } finally {
      setGranting(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { signOutFirebase } = await import('@/lib/firebase-auth');
      await signOutFirebase();
    } catch {}
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white p-6 pb-16 font-sans">
      <header className="flex items-center gap-4 mb-6">
        <button onClick={onClose} className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60 hover:text-white transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[10px] font-black text-primary tracking-widest uppercase block">SPARAI PROTOCOL</span>
          <h1 className="text-2xl font-black italic uppercase leading-none text-white tracking-wide">ADMIN PANEL</h1>
        </div>
        <button onClick={handleLogout} className="ml-auto px-4 h-10 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider">
          LOGOUT
        </button>
      </header>

      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        {/* Search Section */}
        <GlassCard className="p-5 border-white/5 bg-black/40">
          <h2 className="text-xs font-black uppercase text-white tracking-wider mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" /> FIND FIGHTER
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              placeholder="Enter Firebase UID..."
              className="flex-1 h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-xs font-bold text-white outline-none focus:border-primary/50"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={searching} className="px-5 h-12 bg-primary text-black font-black uppercase tracking-wider text-[10px] rounded-2xl flex items-center justify-center gap-1.5">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SEARCH'}
            </button>
          </div>
          {searchError && <p className="text-[10px] font-bold text-red-400 mt-2">{searchError}</p>}
        </GlassCard>

        {/* Profile Result */}
        {profile && (
          <GlassCard className="p-5 border-white/5 bg-black/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-white">{profile.display_name || 'Unknown'}</h3>
                <span className="text-[9px] font-bold text-white/40 block">{profile.uid}</span>
                <span className="text-[9px] font-bold text-white/40 block">{profile.phone}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
              <span className="text-white/40">Plan:</span>
              <span className="text-white uppercase">{profile.plan || 'FREE'}</span>
              <span className="text-white/40">Expires:</span>
              <span className="text-white">{profile.plan_expires_at ? new Date(profile.plan_expires_at).toLocaleDateString() : '—'}</span>
              <span className="text-white/40">Daily Used:</span>
              <span className="text-white">{profile.daily_analysis_count ?? 0}</span>
              <span className="text-white/40">Elite:</span>
              <span className="text-white">{profile.is_elite ? '✅' : '—'}</span>
            </div>
          </GlassCard>
        )}

        {/* Grant Controls */}
        {profile && (
          <GlassCard className="p-5 border-primary/20 bg-black/40">
            <h2 className="text-xs font-black uppercase text-primary tracking-wider mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4" /> GRANT SUBSCRIPTION
            </h2>

            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[9px] font-bold text-white/40 uppercase block mb-1.5">Plan</span>
                <div className="flex flex-wrap gap-2">
                  {PLANS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                        selectedPlan === p.id
                          ? 'bg-primary text-black'
                          : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      {p.name} {p.elite && '👑'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">Daily Analysis Limit</span>
                  <input
                    type="text"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs font-bold text-white outline-none focus:border-primary/50"
                    placeholder="-1 = unlimited"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">Weekly Planner Limit</span>
                  <input
                    type="text"
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(e.target.value)}
                    className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-xs font-bold text-white outline-none focus:border-primary/50"
                    placeholder="-1 = unlimited"
                  />
                </div>
              </div>

              <button
                onClick={handleGrant}
                disabled={granting}
                className="w-full h-12 bg-primary text-black font-black uppercase tracking-wider text-[10px] rounded-2xl flex items-center justify-center gap-2 mt-2"
              >
                {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                APPLY PLAN
              </button>

              {grantResult && (
                <p className={`text-[10px] font-bold text-center ${grantResult.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                  {grantResult}
                </p>
              )}
            </div>
          </GlassCard>
        )}

        <p className="text-[8px] text-white/20 text-center font-semibold">
          Admin OTP: 999999 · Changes apply immediately on next page load.
        </p>
      </div>
    </div>
  );
};
