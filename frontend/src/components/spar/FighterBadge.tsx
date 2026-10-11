'use client';

import React from 'react';

export interface FighterCardData {
  name: string;
  avatarUrl: string | null;
  rank: { level: number; name: string; color: string; badgeImg: string };
  streak: number;
  plan: { active: boolean; label: string };
}

export function FighterAvatar({
  card,
  size = 96,
  ring,
}: {
  card: Pick<FighterCardData, 'name' | 'avatarUrl'>;
  size?: number;
  ring: string;
}) {
  return (
    <div
      className="relative shrink-0 rounded-full p-[3px]"
      style={{ width: size, height: size, background: `conic-gradient(${ring}, transparent 40%, ${ring})`, boxShadow: `0 0 28px ${ring}55` }}
    >
      <div className="h-full w-full overflow-hidden rounded-full bg-[#101311] flex items-center justify-center">
        {card.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="font-black text-white/80" style={{ fontSize: size * 0.42 }}>
            {(card.name || 'F').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

/** Streak rank badge + streak days + plan tier — the only profile facts shown to an opponent. */
export function FighterMeta({ card, align = 'center' }: { card: FighterCardData; align?: 'center' | 'left' | 'right' }) {
  const justify = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${justify}`}>
      <span
        className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
        style={{ borderColor: `${card.rank.color}88`, color: card.rank.color, background: `${card.rank.color}14` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.rank.badgeImg} alt="" className="h-3.5 w-3.5 object-contain" />
        {card.rank.name}
      </span>
      <span className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white/70">
        🔥 {card.streak}d
      </span>
      <span
        className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
          card.plan.active
            ? 'border-primary/60 bg-primary/10 text-primary'
            : 'border-white/15 bg-white/[0.04] text-white/45'
        }`}
      >
        {card.plan.label}
      </span>
    </div>
  );
}
