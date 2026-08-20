'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Swords, Flag } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

type SparCommand = { command: string; kind: 'punch' | 'defense'; callAtMs: number };
type MatchInfo = {
  matchId: string;
  opponentUid: string;
  commandSequence: SparCommand[];
  signalingChannel: string;
  isPaidMatch: boolean;
  role: 'offer' | 'answer';
};

type CmdResult = {
  index: number;
  command: string;
  kind: 'punch' | 'defense';
  hit: boolean;
  reactionMs: number | null;
  trackingConfidence?: number;
};

export default function SparMatchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('id') || '';

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);
  const matchStartRef = useRef<number>(0);
  const currentCmdRef = useRef<{ index: number; at: number; cmd: SparCommand } | null>(null);
  const resultsRef = useRef<CmdResult[]>([]);
  const spokenRef = useRef<Set<number>>(new Set());
  const submittedRef = useRef(false);

  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [phase, setPhase] = useState<'setup' | 'live' | 'submitting' | 'done'>('setup');
  const [currentCommand, setCurrentCommand] = useState<string>('');
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState('Connecting…');

  const authHeaders = useCallback(async () => {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Not logged in');
    return { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' };
  }, []);

  const speak = (text: string) => {
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  const cleanup = useCallback(() => {
    try { channelRef.current?.unsubscribe(); } catch { /* ignore */ }
    channelRef.current = null;
    try { pcRef.current?.close(); } catch { /* ignore */ }
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    if (!matchId) {
      setError('Missing match id.');
      return;
    }
    try {
      const raw = sessionStorage.getItem('spar_match');
      if (raw) {
        const parsed = JSON.parse(raw) as MatchInfo;
        if (parsed.matchId === matchId) {
          setMatch(parsed);
          return;
        }
      }
    } catch { /* ignore */ }

    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch('/api/spar/queue/status', { headers });
        const data = await res.json();
        if (data.status === 'matched' && data.matchId === matchId) {
          setMatch(data);
          sessionStorage.setItem('spar_match', JSON.stringify(data));
        } else {
          setError('Match session expired. Return to lobby.');
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load match.');
      }
    })();
  }, [matchId, authHeaders]);

  const submitResults = useCallback(async () => {
    if (!match || submittedRef.current) return;
    submittedRef.current = true;
    setPhase('submitting');
    setStatusLine('Submitting results…');
    try {
      const headers = await authHeaders();
      const perCommand = [...resultsRef.current].sort((a, b) => a.index - b.index);
      const hitList = perCommand.filter((r) => r.hit && r.reactionMs != null);
      const avgReactionMs =
        hitList.length > 0
          ? Math.round(hitList.reduce((s, r) => s + (r.reactionMs || 0), 0) / hitList.length)
          : null;
      const breakdown = {
        commandsResponded: perCommand.length,
        hits: perCommand.filter((r) => r.hit).length,
        misses: perCommand.filter((r) => !r.hit).length,
        avgReactionMs,
        score: 0,
        perCommand,
      };
      const res = await fetch(`/api/spar/match/${match.matchId}/submit-result`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ breakdown }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');

      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const rRes = await fetch(`/api/spar/match/${match.matchId}/result`, { headers });
        const rData = await rRes.json();
        if (rData.status === 'completed') {
          sessionStorage.setItem('spar_result', JSON.stringify(rData));
          cleanup();
          router.replace(`/spar/results?id=${match.matchId}`);
          return;
        }
      }
      setError('Timed out waiting for opponent.');
      setPhase('done');
    } catch (e: any) {
      setError(e.message || 'Could not submit results.');
      setPhase('done');
    }
  }, [match, authHeaders, cleanup, router]);

  useEffect(() => {
    if (!match || !supabase) return;
    const client = supabase;
    let cancelled = false;

    const run = async () => {
      try {
        const headers = await authHeaders();
        const readyRes = await fetch(`/api/spar/match/${match.matchId}/ready`, {
          method: 'POST',
          headers,
        });
        const readyData = await readyRes.json();
        const iceServers = readyData.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          await localVideoRef.current.play().catch(() => {});
        }

        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = ev.streams[0];
            remoteVideoRef.current.play().catch(() => {});
          }
          setStatusLine('Opponent connected');
        };

        const channel = client.channel(match.signalingChannel, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice',
              payload: { candidate: ev.candidate.toJSON(), from: match.role },
            });
          }
        };

        channel.on('broadcast', { event: 'ice' }, async ({ payload }) => {
          if (!payload?.candidate || payload.from === match.role) return;
          try {
            await pc.addIceCandidate(payload.candidate);
          } catch { /* ignore */ }
        });

        channel.on('broadcast', { event: 'sdp' }, async ({ payload }) => {
          if (!payload?.sdp || payload.from === match.role) return;
          try {
            await pc.setRemoteDescription(payload.sdp);
            if (payload.sdp.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({
                type: 'broadcast',
                event: 'sdp',
                payload: { sdp: pc.localDescription, from: match.role },
              });
            }
          } catch (e) {
            console.warn('SDP error', e);
          }
        });

        await new Promise<void>((resolve) => {
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') resolve();
          });
        });

        await new Promise((r) => setTimeout(r, 800));

        if (match.role === 'offer') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: 'broadcast',
            event: 'sdp',
            payload: { sdp: pc.localDescription, from: match.role },
          });
        }

        setStatusLine('Match starting…');
        setPhase('live');
        matchStartRef.current = Date.now();
        speak('Fight');
      } catch (e: any) {
        setError(e.message || 'Camera / connection failed.');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [match, authHeaders]);

  useEffect(() => {
    if (phase !== 'live' || !match) return;
    const seq = match.commandSequence || [];
    const interval = setInterval(() => {
      const elapsed = Date.now() - matchStartRef.current;
      for (let i = 0; i < seq.length; i++) {
        const cmd = seq[i];
        if (elapsed >= cmd.callAtMs && !spokenRef.current.has(i)) {
          if (currentCmdRef.current) {
            const prev = currentCmdRef.current;
            if (!resultsRef.current.some((r) => r.index === prev.index)) {
              resultsRef.current.push({
                index: prev.index,
                command: prev.cmd.command,
                kind: prev.cmd.kind,
                hit: false,
                reactionMs: null,
              });
              setMisses((m) => m + 1);
            }
          }
          spokenRef.current.add(i);
          currentCmdRef.current = { index: i, at: Date.now(), cmd };
          setCurrentCommand(cmd.command);
          speak(cmd.command);
        }
      }

      const last = seq[seq.length - 1];
      if (last && elapsed > last.callAtMs + 2800) {
        clearInterval(interval);
        if (currentCmdRef.current) {
          const prev = currentCmdRef.current;
          if (!resultsRef.current.some((r) => r.index === prev.index)) {
            resultsRef.current.push({
              index: prev.index,
              command: prev.cmd.command,
              kind: prev.cmd.kind,
              hit: false,
              reactionMs: null,
            });
            setMisses((m) => m + 1);
          }
          currentCmdRef.current = null;
        }
        submitResults();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [phase, match, submitResults]);

  const registerHit = () => {
    const cur = currentCmdRef.current;
    if (!cur || phase !== 'live') return;
    if (resultsRef.current.some((r) => r.index === cur.index)) return;
    const reactionMs = Date.now() - cur.at;
    resultsRef.current.push({
      index: cur.index,
      command: cur.cmd.command,
      kind: cur.cmd.kind,
      hit: true,
      reactionMs,
      trackingConfidence: 0.85,
    });
    setHits((h) => h + 1);
    setCurrentCommand(`${cur.cmd.command} ✓`);
    currentCmdRef.current = null;
  };

  const forfeit = async () => {
    if (!match) return;
    try {
      const headers = await authHeaders();
      await fetch(`/api/spar/match/${match.matchId}/forfeit`, { method: 'POST', headers });
      cleanup();
      router.replace('/spar');
    } catch {
      router.replace('/spar');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 pb-24 font-sans">
      <header className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push('/spar')}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1 justify-center">
            <Swords className="w-3 h-3" /> LIVE SPAR
          </div>
          <div className="text-[10px] text-white/40 font-bold uppercase">{statusLine}</div>
        </div>
        <button
          onClick={forfeit}
          className="w-10 h-10 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-400"
          title="Forfeit"
        >
          <Flag className="w-4 h-4" />
        </button>
      </header>

      {error && (
        <GlassCard className="p-4 mb-4 border-red-500/30 text-[11px] text-red-400 font-semibold">{error}</GlassCard>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-white/10">
          <video ref={localVideoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <span className="absolute bottom-2 left-2 text-[8px] font-black uppercase bg-black/60 px-2 py-0.5 rounded">You</span>
        </div>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-primary/20">
          <video ref={remoteVideoRef} playsInline className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 text-[8px] font-black uppercase bg-black/60 px-2 py-0.5 rounded">Opponent</span>
        </div>
      </div>

      <GlassCard className="p-5 border-primary/30 bg-primary/[0.05] mb-4 text-center">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Coach Call</div>
        <div className="text-3xl font-black italic uppercase text-primary tracking-tight min-h-[2.5rem]">
          {phase === 'setup' ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : currentCommand || '…'}
        </div>
      </GlassCard>

      {phase === 'live' && (
        <NeonButton className="w-full h-16 text-base" onClick={registerHit}>
          HIT / EXECUTE
        </NeonButton>
      )}

      {phase === 'submitting' && (
        <div className="flex items-center justify-center gap-2 text-primary font-black text-xs uppercase tracking-widest py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Waiting for opponent…
        </div>
      )}
    </div>
  );
}
