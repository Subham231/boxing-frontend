'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Swords, Flag, Mic, MicOff, Settings, Volume2, VolumeX } from 'lucide-react';
import { firebaseAuth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { playVoiceEvent, preloadVoicePack, unlockVoicePack, stopVoicePack } from '@/lib/voice-pack';

type SparCommand = { command: string; kind: 'punch' | 'defense'; callAtMs: number };
const PUNCH_EXTEND_DEG = 155;
const PUNCH_RETRACT_DEG = 135;
const MIN_PUNCH_ANGULAR_VELOCITY = 180;
const MIN_PUNCH_WRIST_SPEED = 0.35;
const MOTION_MEMORY_MS = 350;
const FULL_WRIST_SPEED_FOR_FULL_POWER = 3.2; // normalized units/sec for a "full power" registered punch
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
  power?: number; // 0-100, from peak normalized wrist speed during this command's window
  form?: number; // 0-100, from how fully the elbow extended past the strike threshold
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
  const peakWristSpeedForCmdRef = useRef(0); // peak normalized wrist speed since the current command was called — used as "power"
  const elbowAtLastStrikeRef = useRef(0); // smoothed elbow angle at the instant a strike was registered — used as "form"

  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [phase, setPhase] = useState<'setup' | 'live' | 'submitting' | 'done'>('setup');
  const [currentCommand, setCurrentCommand] = useState<string>('');
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState('Connecting…');
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [opponentLeftReason, setOpponentLeftReason] = useState('Opponent left the match.');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const voiceEnabledRef = useRef(true);

  const totalCalls = hits + misses;
  const accuracyPct = totalCalls ? Math.round((hits / totalCalls) * 100) : 0;
  const formatClock = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const authHeaders = useCallback(async () => {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Not logged in');
    return { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' };
  }, []);

  // The coach uses the sparai voice pack only. Missing clips stay silent.
  // Always stop whatever's currently playing first — this is the single
  // voice output for the whole match; nothing should ever layer on top of
  // it (see stopVoicePack's doc comment for why this matters).
  const speak = (text: string) => {
    if (!voiceEnabledRef.current) return;
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    stopVoicePack();
    playVoiceEvent(text, () => { /* voice pack only */ });
  };

  useEffect(() => {
    preloadVoicePack();
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const unlock = () => unlockVoicePack();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

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

    // Give the fighter a moment to read why the match ended, then send them
    // back to the sparring hub automatically instead of stranding them here.
    window.setTimeout(() => {
      router.replace('/spar');
    }, 2500);
  }, [authHeaders, cleanup, match, router]);

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
        avgPower: hitList.length ? Math.round(hitList.reduce((s, r) => s + (r.power || 0), 0) / hitList.length) : null,
        avgForm: hitList.length ? Math.round(hitList.reduce((s, r) => s + (r.form || 0), 0) / hitList.length) : null,
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
    let connected = false;

    // DO NOT TOUCH — see the matching notice in next.config.mjs. This screen
    // requests camera + mic in ONE getUserMedia call, so it lives or dies by
    // the site-wide Permissions-Policy header (camera + microphone must both
    // be "(self)") and by running on a secure (HTTPS) origin. The two guard
    // checks below exist specifically so that if either of those is ever
    // broken again, the user sees an accurate reason instead of the
    // misleading generic "access was denied" message.
    const friendlyMediaError = (e: any): string => {
      const name = e?.name || '';
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return 'No camera or microphone was found on this device. Connect one and try again.';
      }
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return 'Camera and microphone access was denied. Allow permissions in your browser settings and try again.';
      }
      if (name === 'SecurityError') {
        return 'Your browser blocked camera/microphone access on this page (Permissions-Policy or insecure connection). This is a site configuration issue, not something you can fix — please report it.';
      }
      if (name === 'NotReadableError' || name === 'TrackStartError') {
        return 'Your camera or microphone is already in use by another app. Close it and try again.';
      }
      if (name === 'OverconstrainedError') {
        return "Your camera doesn't support the required video settings.";
      }
      return e?.message || 'Camera / connection failed.';
    };

    // If we can't get a live match going within a reasonable window (media
    // permission stuck, opponent never connects, etc.), stop waiting forever
    // — fail gracefully, let the opponent know, and send this fighter home.
    const failAndExit = (message: string, status: string) => {
      if (cancelled) return;
      setError(message);
      setStatusLine(status);
      setPhase('done');
      if (!exitHandledRef.current) {
        // Broadcast while the ref is still false so cleanup() actually
        // notifies the opponent, then mark it handled to stop duplicate exits.
        cleanup();
        exitHandledRef.current = true;
      }
      window.setTimeout(() => router.replace('/spar'), 3000);
    };

    const overallTimeout = window.setTimeout(() => {
      if (!connected) failAndExit('Connection timed out. Your opponent may have lost signal.', 'Connection timed out');
    }, 20000);

    const run = async () => {
      try {
        const headers = await authHeaders();
        const readyRes = await fetch(`/api/spar/match/${match.matchId}/ready`, {
          method: 'POST',
          headers,
        });
        const readyData = await readyRes.json();
        const iceServers = readyData.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];
        const matchStartedAtMs: number =
          typeof readyData.matchStartedAtMs === 'number' ? readyData.matchStartedAtMs : Date.now();

        // Fail fast with an accurate message instead of letting the browser
        // throw an opaque error deep inside getUserMedia. Both of these are
        // environment/config problems (insecure origin, or the
        // Permissions-Policy header — see notice above), never something the
        // player can fix by re-clicking "allow".
        if (typeof window !== 'undefined' && window.isSecureContext === false) {
          throw Object.assign(new Error(), { name: 'SecurityError' });
        }
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error(), { name: 'SecurityError' });
        }

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
          const remoteStream = ev.streams?.[0];
          if (remoteStream && remoteVideoRef.current) {
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
          try { await pc.addIceCandidate(candidate); } catch { /* ignore stale candidates */ }
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
          const timeout = window.setTimeout(() => reject(new Error('Spar connection timed out.')), 10000);
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
        connected = true;
        window.clearTimeout(overallTimeout);
        matchStartRef.current = matchStartedAtMs;
        speak('Fight');
      } catch (e: any) {
        window.clearTimeout(overallTimeout);
        failAndExit(friendlyMediaError(e), 'Connection failed');
      }
    };

    run();
    return () => {
      cancelled = true;
      window.clearTimeout(overallTimeout);
    };
  }, [match, authHeaders, handleOpponentExit, cleanup, router]);

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
            if (wristSpeedRef.current > peakWristSpeedForCmdRef.current) {
              peakWristSpeedForCmdRef.current = wristSpeedRef.current;
            }
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
            elbowAtLastStrikeRef.current = smoothed;
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
    const seq = match.commandSequence || [];
    const interval = setInterval(() => {
      const elapsed = Date.now() - matchStartRef.current;
      setElapsedMs(elapsed);

      // Find every command whose call time has passed and hasn't been
      // spoken yet. If the tick was delayed (pose-tracking jank, a
      // backgrounded tab, a GC pause) more than one can be "due" in the
      // same tick — only the MOST RECENT of those is actually spoken;
      // any earlier ones that were skipped are silently logged as misses.
      // This is the fix for two different commands' audio overlapping:
      // previously every due-and-unspoken command in the array was spoken
      // in the same tick, which fired two different clips concurrently.
      let dueIndex = -1;
      for (let i = 0; i < seq.length; i++) {
        if (elapsed >= seq[i].callAtMs && !spokenRef.current.has(i)) {
          dueIndex = i;
        }
      }

      if (dueIndex !== -1) {
        for (let i = 0; i <= dueIndex; i++) {
          if (spokenRef.current.has(i)) continue;
          spokenRef.current.add(i);
          if (i !== dueIndex) {
            // Skipped command — never spoken, logged as a miss so scoring
            // still accounts for it.
            if (!resultsRef.current.some((r) => r.index === i)) {
              resultsRef.current.push({
                index: i,
                command: seq[i].command,
                kind: seq[i].kind,
                hit: false,
                reactionMs: null,
              });
              setMisses((m) => m + 1);
            }
          }
        }

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

        const cmd = seq[dueIndex];
        currentCmdRef.current = { index: dueIndex, at: Date.now(), cmd };
        peakWristSpeedForCmdRef.current = 0;
        setCurrentCommand(cmd.command);
        speak(cmd.command);
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
    const power = Math.round(Math.min(100, (peakWristSpeedForCmdRef.current / FULL_WRIST_SPEED_FOR_FULL_POWER) * 100));
    const form = Math.round(
      Math.min(100, Math.max(0, ((elbowAtLastStrikeRef.current - PUNCH_EXTEND_DEG) / (180 - PUNCH_EXTEND_DEG)) * 100))
    );
    resultsRef.current.push({
      index: cur.index,
      command: cur.cmd.command,
      kind: cur.cmd.kind,
      hit: true,
      reactionMs,
      trackingConfidence: 0.85,
      power,
      form,
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

  const toggleMicrophone = () => {
    const next = !micEnabled;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
  };

  const commandMeta = [
    { label: 'JAB', match: 'JAB', tag: 'Speed' },
    { label: 'CROSS', match: 'CROSS', tag: 'Right hand' },
    { label: 'SLIP R', match: 'SLIP RIGHT', tag: 'Defense' },
    { label: 'L-HOOK', match: 'HOOK', tag: 'Power' },
  ];
  const activeIndex = commandMeta.findIndex((c) => currentCommand.toUpperCase().includes(c.match));
  const commandWasHit = currentCommand.includes('✓');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#050706] text-white font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(33,55,43,0.22),transparent_58%)]" />
      <div className="absolute inset-0 z-10 pointer-events-none opacity-20 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:44px_44px]" />

      <main className="relative z-20 mx-auto h-full w-full max-w-[760px] flex flex-col px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(0.8rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between shrink-0 gap-2">
          <button onClick={() => router.push('/spar')} aria-label="Back to spar lobby" className="w-10 h-10 shrink-0 rounded-full border border-white/15 bg-black/50 flex items-center justify-center text-white/70 transition hover:bg-black/70">
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-1 flex-col items-center gap-1 min-w-0">
            <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-black/65 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(226,255,59,0.9)]" />
              </span>
              <span className="text-[10px] font-black tracking-widest text-primary uppercase">Live Spar</span>
              <span className="text-white/25">|</span>
              <span className="text-[10px] font-mono font-bold text-white/85">
                {phase === 'live' ? 'RD 1' : phase === 'submitting' ? 'Ending' : 'RD 1'} &bull; {formatClock(elapsedMs)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-widest text-white/45 truncate">
              <span className={`h-1.5 w-1.5 rounded-full ${phase === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="truncate">{phase === 'live' ? 'HD Live' : statusLine}</span>
            </div>
          </div>

          <button onClick={forfeit} aria-label="Surrender" className="w-10 h-10 shrink-0 rounded-full border border-red-500/50 bg-red-500/10 flex items-center justify-center text-red-400 transition hover:bg-red-500/20">
            <Flag className="w-4 h-4" />
          </button>
        </header>

        <div className="mt-3 grid grid-cols-2 gap-2 shrink-0">
          <div className="rounded-xl border border-white/10 bg-black/65 px-3 py-2">
            <span className="block text-[7px] font-black uppercase tracking-widest text-white/45">Landed</span>
            <span className="text-xl font-black text-primary leading-none">
              {hits}<span className="text-[10px] text-white/35"> / {totalCalls}</span>
            </span>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${totalCalls ? Math.min(100, (hits / totalCalls) * 100) : 0}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/65 px-3 py-2">
            <span className="block text-[7px] font-black uppercase tracking-widest text-white/45">Accuracy</span>
            <span className="text-xl font-black text-amber-400 leading-none">
              {accuracyPct}<span className="text-[10px] text-amber-400/60">%</span>
            </span>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${accuracyPct}%` }} />
            </div>
          </div>
        </div>

        <section className="relative mt-2 flex-1 min-h-0 overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_0_45px_rgba(0,0,0,0.7)]">
          <video ref={remoteVideoRef} playsInline className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/65 pointer-events-none" />

          {phase === 'live' && !opponentLeft && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-24 w-24 rounded-full border border-primary/25" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-primary/80 shadow-[0_0_10px_rgba(226,255,59,0.7)]" />
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-white/70">
            <Swords className="h-2.5 w-2.5" /> Opponent
          </div>

          <div className="absolute bottom-3 right-3 h-[31%] w-[31%] min-h-[120px] min-w-[96px] overflow-hidden rounded-2xl border-2 border-primary bg-black shadow-[0_0_22px_rgba(226,255,59,0.28)]">
            <video ref={localVideoRef} playsInline muted className="h-full w-full object-cover scale-x-[-1]" />
            <div className="absolute inset-x-0 top-0 flex items-center gap-1 bg-gradient-to-b from-black/75 to-transparent px-2 pb-3 pt-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[7px] font-black uppercase tracking-widest text-primary">You</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-5 text-[7px] font-black uppercase tracking-widest text-white/60">HD Live</div>
            <div className={`absolute right-1.5 top-1.5 rounded-full p-1 ${micEnabled ? 'bg-black/65 text-white/70' : 'bg-red-500/80 text-white'}`}>
              <span className="sr-only">Microphone {micEnabled ? 'on' : 'off'}</span>
              {micEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
            </div>
          </div>

          {error && !opponentLeft && <div className="absolute left-3 right-3 top-14 rounded-xl border border-red-500/40 bg-black/80 p-3 text-[10px] font-semibold text-red-300">{error}<span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-red-300/60">Returning to sparring…</span></div>}
          {opponentLeft && <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-2xl border border-orange-400/40 bg-black/90 p-4 text-center text-[11px] font-semibold text-orange-200">{opponentLeftReason}<span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-orange-200/60">Returning to sparring…</span><button onClick={() => router.push('/spar')} className="mt-3 block w-full rounded-xl bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black">Exit now</button></div>}
        </section>

        <section className="mt-2 shrink-0 rounded-2xl border border-amber-400/45 bg-black/85 p-3 shadow-[0_0_20px_rgba(245,158,11,0.08)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-400"><Swords className="h-3 w-3" /> AI Coach Commands</span>
            <span className="rounded border border-white/15 px-2 py-1 text-[7px] font-mono uppercase tracking-widest text-white/55">{phase === 'submitting' ? 'Uploading' : 'Live sequence'}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {commandMeta.map((command, index) => {
              const isActive = index === activeIndex;
              const isHit = isActive && commandWasHit;
              return (
                <div
                  key={command.label}
                  className={`rounded-lg border px-1 py-2 text-center transition-colors ${
                    isHit
                      ? 'border-emerald-400/70 bg-emerald-400/10 text-emerald-300'
                      : isActive
                      ? 'border-amber-400 bg-amber-400/15 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.25)]'
                      : 'border-white/10 bg-white/[0.03] text-white/45'
                  }`}
                >
                  <span className="block text-[7px] font-mono">0{index + 1}{isActive && !isHit ? ' · NOW' : ''}</span>
                  <span className="text-[9px] font-black uppercase">{command.label}</span>
                  <span className="block text-[6px] uppercase">{isHit ? '✓ Hit' : command.tag}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[8px] font-semibold text-white/60">
            <span className="text-primary">✦</span>
            {phase === 'setup' ? 'Connecting to your opponent…' : currentCommand ? `Execute ${currentCommand.replace('✓', '').trim()} now` : 'Stay light, keep your guard high.'}
          </div>
        </section>

        <footer className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#171a19] p-2 shrink-0">
          <button onClick={forfeit} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#ff3b3b] text-[11px] font-black uppercase tracking-widest text-white shadow-[0_4px_16px_rgba(255,59,59,0.25)] transition hover:brightness-110"><Flag className="h-4 w-4" /> Surrender</button>
          <button onClick={toggleMicrophone} aria-label={micEnabled ? 'Mute microphone' : 'Unmute microphone'} className={`flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 transition ${micEnabled ? 'bg-white/[0.06] text-white/75 hover:bg-white/[0.1]' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>{micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>
          <button onClick={() => setShowSettings((open) => !open)} aria-label="Open spar settings" className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white/75 transition hover:bg-white/[0.1]"><Settings className="h-4 w-4" /></button>
        </footer>
        {showSettings && <div className="absolute bottom-20 right-3 z-30 rounded-xl border border-white/15 bg-[#161a18] p-3 text-[9px] font-black uppercase tracking-widest text-white/70 shadow-2xl"><button onClick={() => { const next = !voiceEnabledRef.current; voiceEnabledRef.current = next; setVoiceEnabled(next); if (!next) window.speechSynthesis?.cancel(); }} className="flex items-center gap-2">{voiceEnabled ? <Volume2 className="h-3.5 w-3.5 text-primary" /> : <VolumeX className="h-3.5 w-3.5 text-red-400" />} Coach voice {voiceEnabled ? 'on' : 'off'}</button></div>}
      </main>
    </div>
  );
}
