export type VoiceEvent =
  | 'JAB'
  | 'CROSS'
  | 'HOOK'
  | 'UPPERCUT'
  | 'SLIP LEFT'
  | 'SLIP RIGHT'
  | 'ROLL UNDER'
  | 'FIGHT'
  | 'GET READY'
  | 'SET COMPLETE'
  | 'WORKOUT COMPLETE'
  | 'REVIEW YOUR NEXT EXERCISE WHEN READY'
  | '5 SECONDS'
  | '10 SECONDS'
  | '15 SECONDS'
  | '20 SECONDS'
  | '30 SECONDS'
  | '45 SECONDS'
  | '60 SECONDS'
  | '90 SECONDS'
  | '120 SECONDS';

export const ACTIVE_VOICE_PACK = 'sparai';

const PACKS: Record<string, Partial<Record<VoiceEvent, string>>> = {
  sparai: {
    JAB: 'jab.mp3',
    CROSS: 'cross.mp3',
    HOOK: 'hook.mp3',
    UPPERCUT: 'Uppercut.mp3',
    'SLIP LEFT': 'slipleft.mp3',
    'SLIP RIGHT': 'slipright.mp3',
    'ROLL UNDER': 'rollunder.mp3',
    FIGHT: 'fight.mp3',
    'GET READY': 'getready.mp3',
    'SET COMPLETE': 'setcomplete.mp3',
    'WORKOUT COMPLETE': 'workoutcompletewelldone.mp3',
    'REVIEW YOUR NEXT EXERCISE WHEN READY': 'reviewyournextexersisewhenready.mp3',
    '5 SECONDS': '5seconds.mp3',
    '10 SECONDS': '10seconds.mp3',
    '15 SECONDS': '15seconds.mp3',
    '20 SECONDS': '20seconds.mp3',
    '30 SECONDS': '30seconds.mp3',
    '45 SECONDS': '45seconds.mp3',
    '60 SECONDS': '60seconds.mp3',
    '90 SECONDS': '90seconds.mp3',
    '120 SECONDS': '120seconds.mp3',
  },
};

const VOICE_EVENT_ALIASES: Record<string, VoiceEvent> = {
  'CALIBRATION COMPLETE. BEGINNING DRILL': 'GET READY',
  'FREESTYLE ROUND. THROW WHEN READY': 'GET READY',
  'SESSION COMPLETE. COMPILING YOUR PERFORMANCE REPORT': 'WORKOUT COMPLETE',
  'PREPARE STANCE': 'GET READY',
};

const audioCache = new Map<string, HTMLAudioElement>();

export function voiceEventForText(text: string): VoiceEvent | null {
  const normalized = text.trim().toUpperCase().replace(/\s+/g, ' ');
  const directAlias = VOICE_EVENT_ALIASES[normalized.replace(/[.!]+$/, '')];
  if (directAlias) return directAlias;
  if (normalized.startsWith('GET READY')) return 'GET READY';
  if (normalized.startsWith('SET COMPLETE')) return 'SET COMPLETE';
  if (normalized.startsWith('WORKOUT COMPLETE')) return 'WORKOUT COMPLETE';
  if (normalized.startsWith('REVIEW YOUR NEXT EXERCISE')) return 'REVIEW YOUR NEXT EXERCISE WHEN READY';
  if (normalized === 'UPPER CUT') return 'UPPERCUT';
  if (normalized === 'TEN SECONDS') return '10 SECONDS';
  return (normalized in PACKS[ACTIVE_VOICE_PACK]) ? normalized as VoiceEvent : null;
}

function clipUrl(event: VoiceEvent): string | null {
  const filename = PACKS[ACTIVE_VOICE_PACK][event];
  return filename ? `/voice-packs/${ACTIVE_VOICE_PACK}/${encodeURIComponent(filename)}` : null;
}

export function preloadVoicePack(): void {
  if (typeof window === 'undefined') return;
  Object.entries(PACKS[ACTIVE_VOICE_PACK]).forEach(([event, filename]) => {
    const url = `/voice-packs/${ACTIVE_VOICE_PACK}/${encodeURIComponent(filename)}`;
    if (audioCache.has(event)) return;
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioCache.set(event, audio);
    audio.load();
  });
}

export function getMissingVoiceEvents(): VoiceEvent[] {
  return (Object.keys(PACKS[ACTIVE_VOICE_PACK]) as VoiceEvent[]).filter((event) => !clipUrl(event));
}

export function playVoiceEvent(
  text: string,
  fallback: () => void,
  onStart?: () => void,
  onEnd?: () => void,
): void {
  if (typeof window === 'undefined') {
    fallback();
    return;
  }
  preloadVoicePack();
  const event = voiceEventForText(text);
  const audio = event ? audioCache.get(event) : undefined;
  if (!audio) {
    fallback();
    return;
  }
  audio.pause();
  audio.currentTime = 0;
  audio.onplaying = () => onStart?.();
  audio.onended = () => onEnd?.();
  audio.onerror = () => {
    fallback();
  };
  audio.play().catch(() => {
    fallback();
  });
}