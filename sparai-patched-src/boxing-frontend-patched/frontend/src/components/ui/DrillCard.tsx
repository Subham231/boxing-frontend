import React from 'react';
import { CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

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

interface DrillCardProps {
  drill: Drill;
  isCompleted?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  index?: number;
}

export function DrillCard({
  drill,
  isCompleted = false,
  isActive = false,
  onClick,
  index,
}: DrillCardProps) {
  const isTimer = drill.type === 'timer';
  const displayLimit = isTimer
    ? `${drill.duration ? Math.ceil(drill.duration / 60) : 3} MIN`
    : drill.reps || `${drill.sets || 3} SETS`;

  return (
    <div
      onClick={onClick}
      className={twMerge(
        "relative flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-300",
        onClick ? "cursor-pointer select-none" : "",
        isActive
          ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(226,255,59,0.1)]"
          : isCompleted
            ? "bg-white/5 border-emerald-500/30 opacity-75"
            : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {index !== undefined && (
          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-bold text-white/50">
            {index + 1}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-white text-base leading-snug truncate">{drill.name}</h4>
            {drill.isPlanner && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest bg-cyan-500/20 text-cyan-400 uppercase">
                AI PLANNER
              </span>
            )}
            {drill.focus && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest bg-white/10 text-white/60 uppercase">
                {drill.focus}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1 leading-normal line-clamp-2">
            {drill.instruction}
          </p>
          {drill.impact && (
            <p className="text-[10px] text-primary mt-1 font-semibold">
              Impact: {drill.impact}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <span className="text-xs font-black tracking-widest text-white/95 block">
            {displayLimit}
          </span>
          {drill.sets && isTimer && (
            <span className="text-[9px] text-text-muted uppercase tracking-wider block">
              {drill.sets} ROUND{drill.sets !== 1 ? 'S' : ''}
            </span>
          )}
        </div>

        <div className={twMerge(
          "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300",
          isCompleted
            ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
            : isActive
              ? "bg-primary border-primary text-black"
              : "bg-white/5 border-white/10 text-white/60"
        )}>
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isTimer ? (
            <Clock className="w-4 h-4" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  );
}
