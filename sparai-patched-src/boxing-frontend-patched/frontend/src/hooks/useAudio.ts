'use client';

import { useEffect, useRef } from 'react';

const SOUNDS = {
  slash: 'https://assets.mixkit.co/sfx/preview/mixkit-fast-rocket-whoosh-1714.mp3',
  click: 'https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-31.mp3',
  success: 'https://assets.mixkit.co/sfx/preview/mixkit-interface-hint-notification-911.mp3',
  punch: 'https://assets.mixkit.co/sfx/preview/mixkit-boxer-punch-impact-2122.mp3',
  error: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
};

export function useAudio() {
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Object.entries(SOUNDS).forEach(([key, url]) => {
        const audio = new Audio(url);
        audio.volume = 0.4;
        audio.load();
        audioRefs.current[key] = audio;
      });
    }
  }, []);

  const play = (effect: keyof typeof SOUNDS) => {
    const audio = audioRefs.current[effect];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
    }
  };

  return { play };
}
