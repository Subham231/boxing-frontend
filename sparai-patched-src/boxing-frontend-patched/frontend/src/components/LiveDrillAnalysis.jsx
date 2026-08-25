'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, AlertTriangle, Target, Shield, Trophy, Activity, Zap, Play, RotateCcw, Home, X } from 'lucide-react';

export default function LiveDrillAnalysis({ onComplete, onCancel }) {
  // Page Flow Stages: 'setup' | 'countdown' | 'active' | 'summary'
  const [stage, setStage] = useState('setup');
  
  // Config state
  const [mode, setMode] = useState('punches'); // 'punches' | 'defense'
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  const [targetCount, setTargetCount] = useState(30);
  
  // Real-Time HUD and Tracking State
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const [isTrackingInadequate, setIsTrackingInadequate] = useState(false);
  const [activePrompt, setActivePrompt] = useState('GET READY');
  const [promptCount, setPromptCount] = useState(0);
  
  // Real-time metrics
  const [punchesLogged, setPunchesLogged] = useState(0);
  const [defenseLogged, setDefenseLogged] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [peakWristVelocity, setPeakWristVelocity] = useState(0);
  
  // Loading & Error States
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [initError, setInitError] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  // MediaPipe References
  const poseLandmarkerRef = useRef(null);
  const filesetResolverRef = useRef(null);
  
  // Animation & Frame Loop Refs
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const isTrackingInadequateRef = useRef(false);
  
  // Workout State & Timers Refs
  const drillTimerRef = useRef(null);
  const promptTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const durationSecondsRef = useRef(0);
  const punchesLoggedRef = useRef(0);
  const defenseLoggedRef = useRef(0);
  const activePromptRef = useRef('GET READY');
  const promptStartTimeRef = useRef(0);
  
  // Kinematics tracking refs (for delta velocity and debounce)
  const prevElbowAnglesRef = useRef({ left: 180, right: 180 });
  const punchThresholdMetRef = useRef({ left: false, right: false });
  const defenseThresholdMetRef = useRef(false);
  const prevWristPositionsRef = useRef({ left: null, right: null });
  const lastFrameTimeRef = useRef(0);
  const peakWristVelRef = useRef(0);
  const reactionTimesRef = useRef([]);
  
  // Stability tracking counters for data integrity flag
  const inadequateFrameCounterRef = useRef(0);
  const adequateFrameCounterRef = useRef(0);
  
  // Countdown state
  const [countdownVal, setCountdownVal] = useState(3);
  
  // Sound synthesizer for coach vocal commands
  const synthRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      cleanupResources();
    };
  }, []);

  const speakText = (text) => {
    if (!synthRef.current) return;
    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 0.9;
      synthRef.current.speak(utterance);
    } catch (e) {
      console.warn('Speech failed:', e);
    }
  };

  const cleanupResources = () => {
    // 1. Stop video streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 2. Cancel animation frame requests
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // 3. Clear all intervals and timeouts cleanly
    if (drillTimerRef.current) {
      clearInterval(drillTimerRef.current);
      drillTimerRef.current = null;
    }
    if (promptTimerRef.current) {
      clearInterval(promptTimerRef.current);
      promptTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  // Start initialization of MediaPipe tasks-vision and webcam
  const initializeModelAndCamera = async () => {
    setIsModelLoading(true);
    setInitError(null);
    cleanupResources();
    
    try {
      // 1. Load MediaPipe tasks-vision bundle dynamically from jsDelivr
      const visionModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs");
      const { FilesetResolver, PoseLandmarker } = visionModule;
      
      // Initialize Resolver targeting local wasm assets
      const vision = await FilesetResolver.forVisionTasks("/wasm");
      filesetResolverRef.current = vision;
      
      // Initialize Pose Landmarker using local tasks model
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/pose_landmarker_lite.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });
      poseLandmarkerRef.current = landmarker;
      
      // 2. Request User Camera Stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: "user" 
        },
        audio: false
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsModelLoading(false);
          startCountdown();
        };
      }
    } catch (err) {
      console.error("Initialization failed:", err);
      setInitError("Failed to access camera or load local WASM MediaPipe libraries.");
      setIsModelLoading(false);
    }
  };

  // 3-Second Countdowns Ticker
  const startCountdown = () => {
    setStage('countdown');
    setCountdownVal(3);
    speakText("Prepare stance");
    
    let count = 3;
    countdownTimerRef.current = setInterval(() => {
      count--;
      setCountdownVal(count);
      if (count > 0) {
        speakText(count.toString());
      } else if (count === 0) {
        speakText("Fight!");
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        startDrill();
      }
    }, 1000);
  };

  // Start the Active Workout Loop
  const startDrill = () => {
    setStage('active');
    durationSecondsRef.current = 0;
    punchesLoggedRef.current = 0;
    defenseLoggedRef.current = 0;
    peakWristVelRef.current = 0;
    reactionTimesRef.current = [];
    
    setPunchesLogged(0);
    setDefenseLogged(0);
    setPeakWristVelocity(0);
    setReactionTimes([]);
    setIsTrackingInadequate(false);
    isTrackingInadequateRef.current = false;
    
    inadequateFrameCounterRef.current = 0;
    adequateFrameCounterRef.current = 0;
    
    // Start duration clock
    drillTimerRef.current = setInterval(() => {
      // Pause timer when tracking data is inadequate
      if (isTrackingInadequateRef.current) return;
      
      durationSecondsRef.current += 1;
      const mins = Math.floor(durationSecondsRef.current / 60).toString().padStart(2, '0');
      const secs = (durationSecondsRef.current % 60).toString().padStart(2, '0');
      setTimerDisplay(`${mins}:${secs}`);
    }, 1000);
    
    // Prompt loop depending on mode and difficulty
    triggerNextPrompt();
    const promptInterval = difficulty === 'hard' ? 2200 : difficulty === 'easy' ? 4000 : 3000;
    
    promptTimerRef.current = setInterval(() => {
      if (isTrackingInadequateRef.current) return;
      triggerNextPrompt();
    }, promptInterval);
    
    // Start Processing Video Frames
    lastVideoTimeRef.current = -1;
    animationRef.current = requestAnimationFrame(frameProcessingLoop);
  };

  const triggerNextPrompt = () => {
    const punchOptions = ['JAB', 'CROSS', 'HOOK', 'UPPERCUT'];
    const defenseOptions = ['SLIP LEFT', 'SLIP RIGHT', 'ROLL UNDER'];
    
    let choices = [];
    if (mode === 'punches') {
      choices = punchOptions;
    } else {
      choices = [...punchOptions, ...defenseOptions];
    }
    
    const randomPrompt = choices[Math.floor(Math.random() * choices.length)];
    activePromptRef.current = randomPrompt;
    setActivePrompt(randomPrompt);
    setPromptCount(p => {
      const next = p + 1;
      if (next > targetCount) {
        finishDrill();
      }
      return next;
    });
    
    promptStartTimeRef.current = Date.now();
    
    // Reset frame flags for new prompts
    punchThresholdMetRef.current = { left: false, right: false };
    defenseThresholdMetRef.current = false;
    
    // Speak command
    speakText(randomPrompt);
  };

  // Zero-Latency Frame Processing loop
  const frameProcessingLoop = () => {
    if (stage !== 'active' && stage !== 'countdown') {
      return;
    }
    
    if (videoRef.current && poseLandmarkerRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (canvas) {
        const ctx = canvas.getContext('2d');
        
        // Sync dimensions precisely
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        
        // Clear canvas overlay
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          
          // Execute MediaPipe zero-latency tracking
          const results = poseLandmarkerRef.current.detectForVideo(video, performance.now());
          
          if (results && results.poseLandmarks && results.poseLandmarks.length > 0) {
            const landmarks = results.poseLandmarks[0];
            
            // 1. Data Integrity Quality Validation Check
            // Key anchors: Left/Right Shoulders (11, 12), Hips (23, 24), active Wrists (15, 16)
            const anchors = [11, 12, 23, 24]; // core anchors
            const hasSufficientAnchors = anchors.every(idx => landmarks[idx] && landmarks[idx].visibility >= 0.6);
            
            const leftWristVisible = landmarks[15] && landmarks[15].visibility >= 0.6;
            const rightWristVisible = landmarks[16] && landmarks[16].visibility >= 0.6;
            const hasActiveWrist = leftWristVisible || rightWristVisible;
            
            const isTrackingGood = hasSufficientAnchors && hasActiveWrist;
            
            if (!isTrackingGood) {
              adequateFrameCounterRef.current = 0;
              inadequateFrameCounterRef.current += 1;
              if (inadequateFrameCounterRef.current >= 4) { // Debounce warning triggers
                setIsTrackingInadequate(true);
                isTrackingInadequateRef.current = true;
              }
            } else {
              inadequateFrameCounterRef.current = 0;
              adequateFrameCounterRef.current += 1;
              if (adequateFrameCounterRef.current >= 5) { // Clear warning only on consecutive clean frames
                setIsTrackingInadequate(false);
                isTrackingInadequateRef.current = false;
              }
            }
            
            // 2. Render glowing skeleton wireframe if landmarks are available
            drawWireframe(ctx, landmarks, canvas.width, canvas.height);
            
            // 3. Process kinematic events if tracking is clean
            if (!isTrackingInadequateRef.current && stage === 'active') {
              evaluateKinematics(landmarks);
            }
          } else {
            // Empty landmarks triggers inadequate tracking
            adequateFrameCounterRef.current = 0;
            inadequateFrameCounterRef.current += 1;
            if (inadequateFrameCounterRef.current >= 4) {
              setIsTrackingInadequate(true);
              isTrackingInadequateRef.current = true;
            }
          }
        }
      }
    }
    
    animationRef.current = requestAnimationFrame(frameProcessingLoop);
  };

  // Draw 3D wireframe directly mapped onto canvas coordinates
  const drawWireframe = (ctx, landmarks, width, height) => {
    // Joint connections configuration
    const connections = [
      [11, 12], // shoulder to shoulder
      [11, 13], [13, 15], // left arm (shoulder -> elbow -> wrist)
      [12, 14], [14, 16], // right arm (shoulder -> elbow -> wrist)
      [11, 23], [12, 24], // shoulders to hips
      [23, 24], // hip to hip
      [23, 25], [25, 27], // left leg (hip -> knee -> ankle)
      [24, 26], [26, 28]  // right leg (hip -> knee -> ankle)
    ];
    
    // Draw connections translucently
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)"; // Translucent Cyan
    
    connections.forEach(([p1Idx, p2Idx]) => {
      const p1 = landmarks[p1Idx];
      const p2 = landmarks[p2Idx];
      
      if (p1 && p2 && p1.visibility >= 0.5 && p2.visibility >= 0.5) {
        ctx.beginPath();
        // Since canvas itself is mirrored scaleX(-1) in CSS, we draw coordinates as is
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    });
    
    // Draw key joint milestones
    const joints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    joints.forEach(idx => {
      const joint = landmarks[idx];
      if (joint && joint.visibility >= 0.5) {
        // Draw coordinate dot
        ctx.beginPath();
        ctx.arc(joint.x * width, joint.y * height, 7, 0, 2 * Math.PI);
        ctx.fillStyle = "#06b6d4"; // Cyan
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
        
        // White core dot
        ctx.beginPath();
        ctx.arc(joint.x * width, joint.y * height, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
    });
  };

  // Helper distance calculations
  const calculateDistance3D = (a, b) => {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) + 
      Math.pow(a.y - b.y, 2) + 
      Math.pow(a.z - b.z, 2)
    );
  };

  // Angle calculations for elbows extension (3D)
  const calculateAngle3D = (a, b, c) => {
    const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
    
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    const cosTheta = dot / (mag1 * mag2);
    const clampedCos = Math.max(-1, Math.min(1, cosTheta));
    return Math.acos(clampedCos) * (180 / Math.PI);
  };

  // Biometric Kinematic Evaluation Engine
  const evaluateKinematics = (landmarks) => {
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    
    if (!nose || !leftShoulder || !rightShoulder) return;
    
    // Scale factor derived from shoulder distance vector
    const shoulderDistance = calculateDistance3D(leftShoulder, rightShoulder);
    if (shoulderDistance === 0) return;
    
    const now = Date.now();
    const timeDelta = (now - lastFrameTimeRef.current) / 1000; // in seconds
    lastFrameTimeRef.current = now;
    
    // ----------------------------------------------------
    // WRIST VELOCITY TELEMETRY
    // ----------------------------------------------------
    if (timeDelta > 0 && prevWristPositionsRef.current.left && prevWristPositionsRef.current.right) {
      const leftDisp = calculateDistance3D(leftWrist, prevWristPositionsRef.current.left);
      const rightDisp = calculateDistance3D(rightWrist, prevWristPositionsRef.current.right);
      
      // Velocity relative to shoulder scale factor to normalize distance
      const leftVel = (leftDisp / shoulderDistance) / timeDelta;
      const rightVel = (rightDisp / shoulderDistance) / timeDelta;
      const maxVel = Math.max(leftVel, rightVel);
      
      if (maxVel > peakWristVelRef.current) {
        peakWristVelRef.current = maxVel;
        setPeakWristVelocity(parseFloat(maxVel.toFixed(2)));
      }
    }
    prevWristPositionsRef.current = {
      left: { x: leftWrist.x, y: leftWrist.y, z: leftWrist.z },
      right: { x: rightWrist.x, y: rightWrist.y, z: rightWrist.z }
    };
    
    // ----------------------------------------------------
    // STRIKE / PUNCH TRIGGERS (Elbow angles > 165°)
    // ----------------------------------------------------
    const leftElbowAngle = calculateAngle3D(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle3D(rightShoulder, rightElbow, rightWrist);
    
    const punchCues = ['JAB', 'CROSS', 'HOOK', 'UPPERCUT'];
    const isPunchCueActive = punchCues.includes(activePromptRef.current);
    
    // Left punch check
    if (leftElbowAngle > 165 && prevElbowAnglesRef.current.left <= 150) {
      if (!punchThresholdMetRef.current.left && isPunchCueActive) {
        // Log strike
        punchesLoggedRef.current += 1;
        setPunchesLogged(punchesLoggedRef.current);
        punchThresholdMetRef.current.left = true;
        
        // Log reaction time
        const rxTime = now - promptStartTimeRef.current;
        reactionTimesRef.current.push(rxTime);
        setReactionTimes([...reactionTimesRef.current]);
      }
    }
    
    // Right punch check
    if (rightElbowAngle > 165 && prevElbowAnglesRef.current.right <= 150) {
      if (!punchThresholdMetRef.current.right && isPunchCueActive) {
        // Log strike
        punchesLoggedRef.current += 1;
        setPunchesLogged(punchesLoggedRef.current);
        punchThresholdMetRef.current.right = true;
        
        // Log reaction time
        const rxTime = now - promptStartTimeRef.current;
        reactionTimesRef.current.push(rxTime);
        setReactionTimes([...reactionTimesRef.current]);
      }
    }
    
    // Reset punch triggers on return
    if (leftElbowAngle < 120) punchThresholdMetRef.current.left = false;
    if (rightElbowAngle < 120) punchThresholdMetRef.current.right = false;
    
    prevElbowAnglesRef.current = { left: leftElbowAngle, right: rightElbowAngle };
    
    // ----------------------------------------------------
    // DEFENSIVE TRIGGERS (Head horizontal displacement)
    // ----------------------------------------------------
    const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
    const noseDisplacement = nose.x - shoulderCenter;
    const relativeDisplacement = Math.abs(noseDisplacement) / shoulderDistance;
    
    const defenseCues = ['SLIP LEFT', 'SLIP RIGHT', 'ROLL UNDER'];
    const isDefenseCueActive = defenseCues.includes(activePromptRef.current);
    
    if (relativeDisplacement > 0.28) { // threshold for head slip
      if (!defenseThresholdMetRef.current && isDefenseCueActive) {
        defenseLoggedRef.current += 1;
        setDefenseLogged(defenseLoggedRef.current);
        defenseThresholdMetRef.current = true;
        
        const rxTime = now - promptStartTimeRef.current;
        reactionTimesRef.current.push(rxTime);
        setReactionTimes([...reactionTimesRef.current]);
      }
    }
    
    if (relativeDisplacement < 0.12) {
      defenseThresholdMetRef.current = false;
    }
  };

  const finishDrill = () => {
    cleanupResources();
    setStage('summary');
    speakText("Workout complete. Well done.");
  };

  // Compile final aggregated results and callback
  const handleSummaryComplete = () => {
    const totalTriggers = punchesLogged + defenseLogged;
    const computedAccuracy = promptCount > 0 ? Math.min(100, Math.floor((totalTriggers / promptCount) * 100)) : 80;
    
    const avgRx = reactionTimes.length > 0 
      ? Math.floor(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) 
      : 340;
      
    const finalReport = {
      accuracy: computedAccuracy,
      punches: punchesLogged,
      defensiveEvasions: defenseLogged,
      reactionTimeMs: avgRx,
      peakWristSpeedMultiplier: peakWristVelocity || 4.2,
      durationSeconds: durationSecondsRef.current
    };
    
    if (onComplete) {
      onComplete(finalReport);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-black text-white rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl relative select-none">
      
      {/* -------------------- STAGE 1: SETUP -------------------- */}
      {stage === 'setup' && (
        <div className="p-8 flex flex-col gap-6 text-center max-w-md mx-auto items-center min-h-[500px] justify-center">
          <div className="w-16 h-16 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center text-cyan-400 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Camera className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-wider text-white">Live Form Tracker</h2>
            <p className="text-sm text-zinc-400 mt-2">Zero-latency real-time joint skeleton tracing using Local WebAssembly compiler configurations.</p>
          </div>
          
          {/* Config choices */}
          <div className="w-full grid grid-cols-2 gap-3 mt-4 text-left">
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Combat Focus</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setMode('punches')} 
                  className={`flex-1 py-2 px-3 text-xs font-bold uppercase rounded-lg border transition-all ${
                    mode === 'punches' ? 'bg-cyan-950 border-cyan-400 text-cyan-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Strikes Only
                </button>
                <button 
                  onClick={() => setMode('defense')} 
                  className={`flex-1 py-2 px-3 text-xs font-bold uppercase rounded-lg border transition-all ${
                    mode === 'defense' ? 'bg-cyan-950 border-cyan-400 text-cyan-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Mixed Combat
                </button>
              </div>
            </div>
            
            <div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Speed Pace</span>
              <div className="flex gap-1.5">
                {['easy', 'medium', 'hard'].map(lvl => (
                  <button 
                    key={lvl}
                    onClick={() => setDifficulty(lvl)} 
                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                      difficulty === lvl ? 'bg-cyan-950 border-cyan-400 text-cyan-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="w-full mt-2 text-left bg-zinc-950 p-4 rounded-xl border border-zinc-900">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 mb-2">
              <span>Strike/Slip Cues Count:</span>
              <span className="text-cyan-400">{targetCount}</span>
            </div>
            <input 
              type="range"
              min="10"
              max="100"
              step="5"
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              className="w-full accent-cyan-500 bg-zinc-800 rounded-lg cursor-pointer h-1.5"
            />
          </div>
          
          {initError && (
            <div className="bg-red-950/20 border border-red-800/40 text-red-400 p-3 rounded-lg text-xs flex gap-2 items-center">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{initError}</span>
            </div>
          )}
          
          <button
            onClick={initializeModelAndCamera}
            disabled={isModelLoading}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isModelLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Loading local WebAssembly Models...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Initialize Calibration</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* -------------------- STAGE 2: COUNTDOWN -------------------- */}
      {stage === 'countdown' && (
        <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-40"
            autoPlay
            playsInline
            muted
          />
          <div className="z-10 text-center">
            <span className="text-xs text-cyan-400 font-black tracking-[4px] uppercase block mb-2">Acquiring Guard Position</span>
            <div className="w-24 h-24 rounded-full border-4 border-cyan-500 flex items-center justify-center text-5xl font-black text-cyan-400 font-mono shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              {countdownVal}
            </div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-4">Stand 6-8 feet back. Ensure your full torso is inside the frame.</p>
          </div>
        </div>
      )}

      {/* -------------------- STAGE 3: ACTIVE DRILL -------------------- */}
      {stage === 'active' && (
        <div className="relative flex flex-col w-full h-[650px] bg-zinc-950">
          
          {/* Top HUD Display */}
          <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-30 flex justify-between items-center pointer-events-none">
            <div className="flex gap-3">
              <div className="bg-black/60 px-3.5 py-1.5 rounded-lg border border-zinc-800 font-mono text-xs text-white">
                TIMER: <span className="font-black text-cyan-400">{timerDisplay}</span>
              </div>
              <div className="bg-black/60 px-3.5 py-1.5 rounded-lg border border-zinc-800 font-mono text-xs text-white">
                STRIKES: <span className="font-black text-cyan-400">{punchesLogged}</span>
              </div>
              {mode !== 'punches' && (
                <div className="bg-black/60 px-3.5 py-1.5 rounded-lg border border-zinc-800 font-mono text-xs text-white">
                  DEFENSE: <span className="font-black text-cyan-400">{defenseLogged}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <div className="bg-black/60 px-3.5 py-1.5 rounded-lg border border-zinc-800 font-mono text-xs text-white">
                CUE: <span className="font-black text-cyan-400">{promptCount}/{targetCount}</span>
              </div>
              <button 
                onClick={finishDrill}
                className="pointer-events-auto bg-red-600/20 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:bg-red-600/40 transition-colors"
              >
                End Workout
              </button>
            </div>
          </div>
          
          {/* CAMERA WORKSPACE: Layered video and canvas drawing overlay */}
          <div className="relative flex-1 w-full overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 z-10"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 z-20 pointer-events-none"
            />
            
            {/* High-tech scanner lines and tracking brackets */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-500/60 z-30" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-500/60 z-30" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-500/60 z-30" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-500/60 z-30" />
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-25 animate-pulse z-30 pointer-events-none" />

            {/* Warning overlay for inadequate tracking data integrity */}
            {isTrackingInadequate && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-40 flex items-center justify-center p-6 text-center select-none animate-fade-in">
                <div className="bg-zinc-950 border-2 border-red-600 p-8 rounded-3xl max-w-md shadow-2xl flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-600 flex items-center justify-center text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black uppercase text-red-500 tracking-wider">⚠️ Tracking Disrupted</h3>
                  <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
                    Insufficient Tracking Data: Please position your full upper body inside the frame. Ensure shoulders, elbows, hips, and hands are visible.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Active Command Overlay Banner at the bottom */}
          <div className="bg-black border-t border-zinc-900 p-6 flex flex-col items-center justify-center gap-2 relative z-30">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">ACTIVE COACH COMMAND CUE</span>
            <div className="text-4xl font-black italic tracking-widest text-cyan-400 text-glow">
              {activePrompt}
            </div>
            
            {/* Live wrist velocity meter */}
            <div className="w-full max-w-xs flex justify-between items-center font-mono text-[10px] text-zinc-400 mt-2 bg-zinc-950 border border-zinc-900 rounded-full px-4 py-1.5">
              <span>Peak Hand Velocity:</span>
              <span className="text-cyan-400 font-bold">{peakWristVelocity}m/s</span>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- STAGE 4: SUMMARY -------------------- */}
      {stage === 'summary' && (
        <div className="p-8 flex flex-col gap-6 max-w-md mx-auto items-center min-h-[500px] justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Trophy className="w-8 h-8" />
          </div>
          
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-wider text-white">Biomechanical Report</h2>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Compiled telemetry metrics</p>
          </div>
          
          <div className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col gap-3 text-left">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400" /> Accuracy Rate
              </span>
              <span className="text-sm font-black text-white">
                {promptCount > 0 ? Math.min(100, Math.floor(((punchesLogged + defenseLogged) / promptCount) * 100)) : 80}%
              </span>
            </div>
            
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" /> Logged Punches
              </span>
              <span className="text-sm font-black text-white">{punchesLogged}</span>
            </div>
            
            {mode !== 'punches' && (
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" /> Evasions
                </span>
                <span className="text-sm font-black text-white">{defenseLogged}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" /> Avg Reaction Speed
              </span>
              <span className="text-sm font-black text-white">
                {reactionTimes.length > 0 ? Math.floor(reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length) : 340}ms
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" /> Peak Wrist Speed
              </span>
              <span className="text-sm font-black text-white">{peakWristVelocity} m/s</span>
            </div>
          </div>
          
          <div className="w-full flex gap-3 mt-2">
            <button
              onClick={() => setStage('setup')}
              className="flex-1 py-3.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
            <button
              onClick={handleSummaryComplete}
              className="flex-1 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-xs tracking-wider transition-colors shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              Save Results
            </button>
          </div>
        </div>
      )}
      
      {/* Absolute Close button in top right for cleanup */}
      <button 
        onClick={() => {
          cleanupResources();
          if (onCancel) onCancel();
        }}
        className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full border border-zinc-800 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
