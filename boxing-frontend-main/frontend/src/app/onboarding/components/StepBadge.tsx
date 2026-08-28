'use client';

import React from 'react';
import { useOnboarding } from '@/context/OnboardingContext';

const StepBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currentStep, totalSteps } = useOnboarding();

  return (
    <div className={`text-[10px] font-black tracking-[3px] text-primary uppercase mb-3 ${className}`.trim()}>
      {String(currentStep).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
    </div>
  );
};

export default StepBadge;
