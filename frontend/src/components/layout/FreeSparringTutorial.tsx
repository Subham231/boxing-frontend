'use client';

import { useEffect, useState } from 'react';

export const TUTORIAL_STORAGE_KEY = 'sparai_free_sparring_tutorial_completed';

export function useFreeSparringTutorial(menuOpen: boolean) {
  const [tutorialStep, setTutorialStep] = useState<'idle' | 'explore' | 'sparring' | 'completed'>('idle');
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const forceTutorial = urlParams.get('tutorial') === 'true';
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';

    if (forceTutorial || !completed) {
      const timer = setTimeout(() => {
        setTutorialStep(menuOpen ? 'sparring' : 'explore');
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setTutorialStep('completed');
    }
  }, []);

  // Handle menu open & close behavior
  useEffect(() => {
    if (tutorialStep === 'completed' || tutorialStep === 'idle') return;

    if (menuOpen) {
      setHasOpenedOnce(true);
      setTutorialStep('sparring');
    } else if (hasOpenedOnce) {
      // User closed the explore menu after opening it -> turn off tutorial completely per requirement
      dismissTutorial();
    } else {
      setTutorialStep('explore');
    }
  }, [menuOpen, hasOpenedOnce]);

  const dismissTutorial = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    }
    setTutorialStep('completed');
  };

  return {
    tutorialStep,
    dismissTutorial,
  };
}
