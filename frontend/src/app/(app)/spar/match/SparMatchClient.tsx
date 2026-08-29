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
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const [phase, setPhase] = useState<'setup' | 'countdown' | 'live' | 'submitting' | 'done'>('setup');
  const [countdownNum, setCountdownNum] = useState<number | null>(null);
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
          u.volume = 1.0;
          u.rate = 1.0;
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

  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setStatusLine('Get ready in stance…');
    let count = 3;
    setCountdownNum(count);
    speak('3');

    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
        speak(String(count));
      } else {
        clearInterval(timer);
        setCountdownNum(0);
        speak('Fight!');
        setTimeout(() => {
          setPhase('live');
          matchStartRef.current = Date.now();
          setCountdownNum(null);
          setStatusLine('Sparring active!');
        }, 600);
      }
    }, 1000);
  }, []);

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
      const readyData = await readyRes.json().catch(() => ({}));

      const defaultStunServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ];

      const cleanIceServers = (readyData.iceServers && Array.isArray(readyData.iceServers))
        ? readyData.iceServers
            .map((server: any) => {
              if (!server) return null;
              const rawUrls = server.urls || server.url;
              const urlsArr = Array.isArray(rawUrls) ? rawUrls : typeof rawUrls === 'string' ? [rawUrls] : [];
              const validUrls = urlsArr.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
              if (validUrls.length === 0) return null;

              const hasTurn = validUrls.some((u: string) => {
                const lower = u.toLowerCase();
                return lower.startsWith('turn:') || lower.startsWith('turns:');
              });

              if (hasTurn) {
                const hasUser = typeof server.username === 'string' && server.username.trim().length > 0;
                const hasCred = typeof server.credential === 'string' && server.credential.trim().length > 0;
                if (!hasUser || !hasCred) {
                  const stunOnly = validUrls.filter((u: string) => {
                    const lower = u.toLowerCase();
                    return !lower.startsWith('turn:') && !lower.startsWith('turns:');
                  });
                  if (stunOnly.length > 0) return { urls: stunOnly };
                  return null;
                }
              }
              return {
                urls: validUrls,
                ...(server.username ? { username: String(server.username).trim() } : {}),
                ...(server.credential ? { credential: String(server.credential).trim() } : {}),
              };
            })
            .filter(Boolean)
        : defaultStunServers;

      const finalIceServers = cleanIceServers.length > 0 ? cleanIceServers : defaultStunServers;

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
      } catch (audioErr: any) {
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

      let pc: RTCPeerConnection;
      try {
        pc = new RTCPeerConnection({ iceServers: finalIceServers });
      } catch (pcErr) {
        console.warn('[WebRTC] Custom iceServers construction failed, using fallback STUN:', pcErr);
        pc = new RTCPeerConnection({ iceServers: defaultStunServers });
      }
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

      startCountdown();
    } catch (e: any) {
      setError(e.message || 'Camera / connection failed.');
    }
  }, [match, authHeaders, handleOpponentExit, startCountdown]);

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

          // Draw real-time AI vision skeleton overlay
          const canvas = canvasRef.current;
          const video = localVideoRef.current;
          if (canvas && video) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
              }
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              const w = canvas.width;
              const h = canvas.height;

              // Draw skeleton connection lines
              const connections = [
                [11, 12], // shoulders
                [11, 13], [13, 15], // left arm
                [12, 14], [14, 16], // right arm
                [11, 23], [12, 24], [23, 24], // torso
              ];

              ctx.strokeStyle = '#E2FF3B';
              ctx.lineWidth = 3;
              ctx.shadowColor = 'rgba(226,255,59,0.8)';
              ctx.shadowBlur = 8;

              for (const [i, j] of connections) {
                const ptA = landmarks[i];
                const ptB = landmarks[j];
                if (ptA && ptB && (ptA.visibility ?? 1) > 0.3 && (ptB.visibility ?? 1) > 0.3) {
                  ctx.beginPath();
                  ctx.moveTo((1 - ptA.x) * w, ptA.y * h); // flipped x for mirrored video
                  ctx.lineTo((1 - ptB.x) * w, ptB.y * h);
                  ctx.stroke();
                }
              }

              // Draw keypoint joint nodes
              const keypoints = [11, 12, 13, 14, 15, 16, 0];
              for (const idx of keypoints) {
                const pt = landmarks[idx];
                if (pt && (pt.visibility ?? 1) > 0.3) {
                  ctx.fillStyle = idx === 15 || idx === 16 ? '#F97316' : '#E2FF3B';
                  ctx.beginPath();
                  ctx.arc((1 - pt.x) * w, pt.y * h, idx === 15 || idx === 16 ? 8 : 5, 0, 2 * Math.PI);
                  ctx.fill();
                }
              }
            }
          }

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
    const BASIC_PUNCHES: SparCommand[] = [
      { command: 'JAB', kind: 'punch', callAtMs: 3500 },
      { command: 'CROSS', kind: 'punch', callAtMs: 6500 },
      { command: 'LEAD HOOK', kind: 'punch', callAtMs: 9500 },
      { command: 'REAR HOOK', kind: 'punch', callAtMs: 12500 },
      { command: 'LEAD UPPERCUT', kind: 'punch', callAtMs: 15500 },
      { command: 'REAR UPPERCUT', kind: 'punch', callAtMs: 18500 },
      { command: 'BODY HOOK', kind: 'punch', callAtMs: 21500 },
      { command: 'JAB', kind: 'punch', callAtMs: 24500 },
      { command: 'CROSS', kind: 'punch', callAtMs: 27500 },
      { command: 'LEAD HOOK', kind: 'punch', callAtMs: 30500 },
      { command: 'REAR UPPERCUT', kind: 'punch', callAtMs: 33500 },
      { command: 'BODY HOOK', kind: 'punch', callAtMs: 36500 },
    ];
    const seq: SparCommand[] =
      match.commandSequence && Array.isArray(match.commandSequence) && match.commandSequence.length > 0
        ? (match.commandSequence as SparCommand[])
        : BASIC_PUNCHES;

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
    <div className="min-h-[100dvh] bg-[#0A0A0A] text-white p-4 pb-8 font-sans relative">
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

      {phase === 'countdown' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md">
          <div className="text-8xl font-black italic text-primary animate-pulse drop-shadow-[0_0_30px_rgba(226,255,59,0.9)]">
            {countdownNum === 0 ? 'FIGHT!' : countdownNum}
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-white/70 mt-4">
            Get ready in stance · Hands up
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3 relative">
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-white/10">
          <video ref={localVideoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10" />
          <span className="absolute bottom-2 left-2 text-[8px] font-black uppercase bg-black/60 px-2 py-0.5 rounded z-20">You</span>
          <span className="absolute top-2 left-2 text-[7px] font-black uppercase bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30 z-20">AI VISION ACTIVE</span>

          {/* Boxing Target Stance Alignment Grid */}
          <div className="pointer-events-none absolute inset-0 border border-primary/20 rounded-2xl flex flex-col items-center justify-between p-3 opacity-60">
            <div className="w-16 h-16 rounded-full border border-dashed border-primary/40 mt-4 flex items-center justify-center">
              <span className="text-[7px] font-black uppercase text-primary/60">HEAD</span>
            </div>
            <div className="w-28 h-20 border border-dashed border-primary/30 rounded-xl mb-4 flex items-center justify-center">
              <span className="text-[7px] font-black uppercase text-primary/60">STANCE</span>
            </div>
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-primary" />
          </div>
        </div>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black border border-primary/20">
          <video ref={remoteVideoRef} playsInline className="w-full h-full object-cover" />
          <span className="absolute bottom-2 left-2 text-[8px] font-black uppercase bg-black/60 px-2 py-0.5 rounded z-10">Opponent</span>
          <div className="pointer-events-none absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-primary/40" />
          <div className="pointer-events-none absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-primary/40" />
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
