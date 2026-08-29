'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Swords, Flag } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

type SparCommand = { command: string; kind: 'punch' | 'defense'; callAtMs: number };
const PUNCH_EXTEND_DEG = 155;
const PUNCH_RETRACT_DEG = 135;
const MIN_PUNCH_ANGULAR_VELOCITY = 180;
const MIN_PUNCH_WRIST_SPEED = 0.35;
const MOTION_MEMORY_MS = 350;
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
  const exitHandledRef = useRef(false);
  const poseRef = useRef<any>(null);
  const poseRafRef = useRef<number | null>(null);
  const registerHitRef = useRef<(() => void) | null>(null);
  const smoothElbowRef = useRef(0);
  const previousElbowRef = useRef(0);
  const previousPoseTimeRef = useRef<number | null>(null);
  const previousWristRef = useRef<{ x: number; y: number } | null>(null);
  const wristSpeedRef = useRef(0);
  const elbowStateRef = useRef<'guard' | 'strike'>('guard');
  const guardEnteredAtRef = useRef(0);
  const lastPunchMotionAtRef = useRef(0);

  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [phase, setPhase] = useState<'setup' | 'live' | 'submitting' | 'done'>('setup');
  const [currentCommand, setCurrentCommand] = useState<string>('');
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState('Connecting…');
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [opponentLeftReason, setOpponentLeftReason] = useState('Opponent left the match.');

  const [permissionNeeded, setPermissionNeeded] = useState(false);

  const authHeaders = useCallback(async () => {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Not logged in');
    return { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' };
  }, []);

  const speak = (text: string) => {
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      setTimeout(() => {
        try {
          const u = new SpeechSynthesisUtterance(text);
          u.volume = 1.0; // Maximum volume for loud & clear coach voice
          u.rate = 1.0;   // Energetic clear rate
          u.pitch = 1.0;
          const voices = synth.getVoices();
          const preferredVoice = voices.find(
            (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.default),
          );
          if (preferredVoice) u.voice = preferredVoice;
          synth.speak(u);
        } catch {
          /* ignore */
        }
      }, 30);
    } catch {
      /* ignore */
    }
  };

  const cleanup = useCallback(() => {
    try {
      if (channelRef.current && matchId && !exitHandledRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer-left',
          payload: { matchId, from: match?.role || 'unknown' },
        });
      }
    } catch { /* ignore */ }
    try { channelRef.current?.unsubscribe(); } catch { /* ignore */ }
    channelRef.current = null;
    try { pcRef.current?.close(); } catch { /* ignore */ }
    pcRef.current = null;
    if (poseRafRef.current !== null) cancelAnimationFrame(poseRafRef.current);
    poseRafRef.current = null;
    try { poseRef.current?.close(); } catch { /* ignore */ }
    poseRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, [match?.role, matchId]);

  const handleOpponentExit = useCallback(async (reason: string) => {
    if (!match || exitHandledRef.current) return;
    exitHandledRef.current = true;
    setOpponentLeft(true);
    setOpponentLeftReason(reason);
    setStatusLine('Opponent left');
    setPhase('done');

    try {
      const headers = await authHeaders();
      await fetch(`/api/spar/match/${match.matchId}/exit`, { method: 'POST', headers });
    } catch {
      /* ignore */
    }

    cleanup();
  }, [authHeaders, cleanup, match]);

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

  const setupMediaAndConnect = useCallback(async () => {
    if (!match || !supabase) return;
    const client = supabase;
    setError(null);
    setPermissionNeeded(false);
    setStatusLine('Connecting to devices…');

    try {
      const headers = await authHeaders();
      const readyRes = await fetch(`/api/spar/match/${match.matchId}/ready`, {
        method: 'POST',
        headers,
      });
      const rawIceServers =
        readyData.iceServers && readyData.iceServers.length > 0
          ? readyData.iceServers
          : [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
            ];

      const iceServers = rawIceServers.filter((server: any) => {
        const urlsStr = Array.isArray(server.urls) ? server.urls.join(' ') : server.urls || '';
        if (urlsStr.includes('turn:') || urlsStr.includes('turns:')) {
          return Boolean(server.username && server.credential);
        }
        return true;
      });

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
      } catch (audioErr: any) {
        // Fallback to camera-only if microphone is denied or unavailable on device
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
        } catch (videoErr: any) {
          setPermissionNeeded(true);
          throw new Error(
            videoErr.name === 'NotAllowedError' || videoErr.name === 'PermissionDeniedError'
              ? 'Camera permission denied. Please tap "GRANT CAMERA ACCESS" below to allow your camera.'
              : 'Could not access device camera. Please check browser permissions.',
          );
        }
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play().catch(() => {});
      }

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream!));

      pc.onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          handleOpponentExit('Connection lost. Your opponent left the match.');
        }
        if (pc.connectionState === 'connected') {
          setStatusLine('Opponent connected');
          setOpponentLeft(false);
        }
      };

      pc.ontrack = (ev) => {
        const remoteStream = ev.streams?.[0] || new MediaStream([ev.track]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(() => {});
          setStatusLine('Opponent connected');
          setOpponentLeft(false);
        }
      };

      const channel = client.channel(match.signalingChannel, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;
      const pendingIceCandidates: RTCIceCandidateInit[] = [];

      const addIceCandidate = async (candidate: RTCIceCandidateInit) => {
        if (!pc.remoteDescription) {
          pendingIceCandidates.push(candidate);
          return;
        }
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          /* ignore stale candidates */
        }
      };

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
        await addIceCandidate(payload.candidate);
      });

      channel.on('broadcast', { event: 'sdp' }, async ({ payload }) => {
        if (!payload?.sdp || payload.from === match.role) return;
        try {
          await pc.setRemoteDescription(payload.sdp);
          while (pendingIceCandidates.length) {
            const candidate = pendingIceCandidates.shift();
            if (candidate) await addIceCandidate(candidate);
          }
          if (payload.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: 'broadcast',
              event: 'sdp',
              payload: { sdp: pc.localDescription, from: match.role },
            });
          }
        } catch {
          /* ignore */
        }
      });

      channel.on('broadcast', { event: 'peer-left' }, ({ payload }) => {
        if (!payload || payload.matchId !== match.matchId) return;
        handleOpponentExit('Your opponent left the match.');
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Spar connection timed out.')), 12000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            window.clearTimeout(timeout);
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            window.clearTimeout(timeout);
            reject(new Error('Could not connect to the spar signaling service.'));
          }
        });
      });

      await new Promise((r) => setTimeout(r, 600));

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
  }, [match, authHeaders, handleOpponentExit]);

  useEffect(() => {
    setupMediaAndConnect();
  }, [setupMediaAndConnect]);

  useEffect(() => {
    if (phase !== 'live' || !match || typeof window === 'undefined') return;
    let cancelled = false;

    const startPunchTracking = async () => {
      try {
        if (!(window as any).Pose) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
            script.crossOrigin = 'anonymous';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Camera punch tracking unavailable.'));
            document.head.appendChild(script);
          });
        }
        if (cancelled || !(window as any).Pose) return;

        const pose = new (window as any).Pose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });
        pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        pose.onResults((results: any) => {
          const landmarks = results.poseLandmarks;
          if (!landmarks || landmarks.length < 17 || phase !== 'live') return;
          const leftShoulder = landmarks[11], rightShoulder = landmarks[12];
          const leftElbow = landmarks[13], rightElbow = landmarks[14];
          const leftWrist = landmarks[15], rightWrist = landmarks[16];
          if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftWrist || !rightWrist) return;

          const angle = (a: any, b: any, c: any) => {
            const abx = a.x - b.x, aby = a.y - b.y;
            const cbx = c.x - b.x, cby = c.y - b.y;
            const denominator = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
            if (!denominator) return 0;
            return Math.acos(Math.min(1, Math.max(-1, (abx * cbx + aby * cby) / denominator))) * 180 / Math.PI;
          };

          const leftAngle = angle(leftShoulder, leftElbow, leftWrist);
          const rightAngle = angle(rightShoulder, rightElbow, rightWrist);
          const rawAngle = Math.max(leftAngle, rightAngle);
          const now = performance.now();
          const previousTime = previousPoseTimeRef.current;
          const seconds = previousTime === null ? 0.033 : Math.max(0.001, (now - previousTime) / 1000);
          const smoothed = smoothElbowRef.current === 0 ? rawAngle : smoothElbowRef.current + 0.45 * (rawAngle - smoothElbowRef.current);
          const angularVelocity = previousTime === null ? 0 : Math.abs(smoothed - previousElbowRef.current) / seconds;
          const wrist = leftAngle >= rightAngle ? leftWrist : rightWrist;
          const shoulderWidth = Math.max(0.001, Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y));
          if (previousWristRef.current && previousTime !== null) {
            wristSpeedRef.current = Math.hypot(wrist.x - previousWristRef.current.x, wrist.y - previousWristRef.current.y) / shoulderWidth / seconds;
          }
          previousWristRef.current = { x: wrist.x, y: wrist.y };
          previousPoseTimeRef.current = now;
          previousElbowRef.current = smoothed;
          smoothElbowRef.current = smoothed;

          const current = currentCmdRef.current;
          const motionDetected = angularVelocity >= MIN_PUNCH_ANGULAR_VELOCITY || wristSpeedRef.current >= MIN_PUNCH_WRIST_SPEED;
          if (motionDetected) lastPunchMotionAtRef.current = now;
          const rearmed = now - guardEnteredAtRef.current >= 70;
          const recentMotion = now - lastPunchMotionAtRef.current <= MOTION_MEMORY_MS;
          if (elbowStateRef.current === 'guard' && rearmed && smoothed > PUNCH_EXTEND_DEG && recentMotion) {
            elbowStateRef.current = 'strike';
            if (current?.cmd.kind === 'punch' && !resultsRef.current.some((result) => result.index === current.index)) {
              registerHitRef.current?.();
            }
          } else if (elbowStateRef.current === 'strike' && smoothed < PUNCH_RETRACT_DEG) {
            elbowStateRef.current = 'guard';
            guardEnteredAtRef.current = now;
          }
        });
        poseRef.current = pose;

        const loop = async () => {
          const video = localVideoRef.current;
          if (video && video.readyState >= 2 && poseRef.current) {
            try { await poseRef.current.send({ image: video }); } catch { /* retry next frame */ }
          }
          if (!cancelled && poseRef.current) poseRafRef.current = requestAnimationFrame(loop);
        };
        poseRafRef.current = requestAnimationFrame(loop);
      } catch (trackingError: any) {
        if (!cancelled) setStatusLine(trackingError.message || 'Manual controls active');
      }
    };

    startPunchTracking();
    return () => {
      cancelled = true;
      if (poseRafRef.current !== null) cancelAnimationFrame(poseRafRef.current);
      poseRafRef.current = null;
      try { poseRef.current?.close(); } catch { /* ignore */ }
      poseRef.current = null;
    };
  }, [match, phase]);

  useEffect(() => {
    if (phase !== 'live' || !match) return;
    const fallbackSeq: SparCommand[] = [
      { command: 'JAB', kind: 'punch', callAtMs: 3500 },
      { command: 'CROSS', kind: 'punch', callAtMs: 6500 },
      { command: '1-2 COMBO', kind: 'punch', callAtMs: 9500 },
      { command: 'LEAD HOOK', kind: 'punch', callAtMs: 12500 },
      { command: 'REAR HOOK', kind: 'punch', callAtMs: 15500 },
      { command: 'BODY HOOK', kind: 'punch', callAtMs: 18500 },
      { command: 'LEAD UPPERCUT', kind: 'punch', callAtMs: 21500 },
      { command: '1-2-3 COMBO', kind: 'punch', callAtMs: 24500 },
      { command: 'OVERHAND RIGHT', kind: 'punch', callAtMs: 27500 },
      { command: 'DOUBLE JAB', kind: 'punch', callAtMs: 30500 },
      { command: 'BODY-HEAD COMBO', kind: 'punch', callAtMs: 33500 },
      { command: 'REAR UPPERCUT', kind: 'punch', callAtMs: 36500 },
    ];
    const seq: SparCommand[] =
      match.commandSequence && Array.isArray(match.commandSequence) && match.commandSequence.length > 0
        ? (match.commandSequence as SparCommand[])
        : fallbackSeq;

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

  registerHitRef.current = registerHit;

  const forfeit = async () => {
    if (!match) return;
    if (!window.confirm('Forfeit this spar? Your opponent will be awarded the win.')) return;
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
    <div className="min-h-[100dvh] bg-[#0A0A0A] text-white p-4 pb-8 font-sans">
      <header className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push('/spar')}
          className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/60"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1 justify-center">
            <Swords className="w-3 h-3" /> LIVE SPARRING
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

      {opponentLeft && (
        <GlassCard className="p-4 mb-4 border-orange-500/30 bg-orange-500/10 text-[11px] text-orange-200 font-semibold">
          {opponentLeftReason}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => router.push('/spar')}
              className="flex-1 rounded-xl bg-primary text-black px-3 py-2 font-black uppercase tracking-widest text-[10px]"
            >
              Exit to lobby
            </button>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-white/10">
          <video ref={localVideoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <span className="absolute bottom-2 left-2 text-[8px] font-black uppercase bg-black/60 px-2 py-0.5 rounded">You</span>
        </div>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-primary/20">
          <video ref={remoteVideoRef} playsInline className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 text-[8px] font-black uppercase bg-black/60 px-2 py-0.5 rounded">Opponent</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-widest text-white/40">HITS</div>
          <div className="mt-0.5 text-xl font-black text-primary">{hits}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-widest text-white/40">MISSES</div>
          <div className="mt-0.5 text-xl font-black text-red-300">{misses}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
          <div className="text-[8px] font-black uppercase tracking-widest text-white/40">TOTAL</div>
          <div className="mt-0.5 text-xl font-black text-white">{hits + misses}</div>
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
          CAMERA AUTO-DETECT <span className="text-[9px] opacity-60">MANUAL FALLBACK</span>
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
