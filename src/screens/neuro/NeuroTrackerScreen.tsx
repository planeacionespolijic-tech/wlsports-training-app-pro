import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Brain, Play, RotateCcw, Volume2, VolumeX, 
  Sparkles, CheckCircle2, XCircle, TrendingUp, Info, Activity,
  ChevronRight, Award, Zap, Maximize2, Minimize2, Settings2, FastForward,
  Plus, Minus, Clock, RotateCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useFullscreen } from '../../hooks/useFullscreen';

interface Sphere3D {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  isTarget: boolean;
  selected: boolean;
}

type Phase = 'CONFIG' | 'MEMORIZE' | 'TRACKING' | 'SELECT' | 'FEEDBACK' | 'SUMMARY';

export const NeuroTrackerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  // === Configuration Parameters ===
  const [numTargets, setNumTargets] = useState<number>(3); // 1 to 4 targets
  const [initialSpeed, setInitialSpeed] = useState<number>(1.5); // 0.8x, 1.2x, 1.5x, 2.0x, 2.5x
  const [trackingDurationSec, setTrackingDurationSec] = useState<number>(6); // 4, 6, 8, 10, 12, 15s
  const [totalTrials, setTotalTrials] = useState<number>(10);
  const [dualTask, setDualTask] = useState<string>('VISUAL_ONLY');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [sphereSize, setSphereSize] = useState<'STANDARD' | 'LARGE' | 'COMPACT'>('LARGE'); // Larger for mobile

  // === Session State ===
  const [phase, setPhase] = useState<Phase>('CONFIG');
  const [currentTrial, setCurrentTrial] = useState<number>(1);
  const [currentSpeedMultiplier, setCurrentSpeedMultiplier] = useState<number>(1.5);
  const [selectedSphereIds, setSelectedSphereIds] = useState<number[]>([]);
  const [trialResults, setTrialResults] = useState<{
    trial: number;
    speed: number;
    correct: boolean;
    targetsCount: number;
    selectedCount: number;
  }[]>([]);
  const [phaseCountdown, setPhaseCountdown] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // === 3D Arena Engine Refs ===
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spheresRef = useRef<Sphere3D[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const phaseTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const phaseRef = useRef<Phase>('CONFIG');

  // Sync ref with phase state
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Audio Context initializer
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  const playChime = useCallback((type: 'target_highlight' | 'start_track' | 'success' | 'error' | 'select') => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      if (type === 'target_highlight') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'start_track') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'select') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'success') {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.06);
          osc.stop(ctx.currentTime + i * 0.06 + 0.35);
        });
      } else if (type === 'error') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio fallback
    }
  }, [soundEnabled, getAudioContext]);

  // Setup 8 initial spheres in 3D volume
  const initializeSpheres = useCallback((targetCount: number, speedMult: number) => {
    const totalSpheres = 8;
    const spheres: Sphere3D[] = [];

    // Choose random unique indices for targets
    const targetIndices = new Set<number>();
    while (targetIndices.size < targetCount) {
      targetIndices.add(Math.floor(Math.random() * totalSpheres));
    }

    // Adapt sphere radius for mobile visibility
    const baseRadius = sphereSize === 'LARGE' ? 32 : sphereSize === 'STANDARD' ? 26 : 22;
    // Enhanced speed calculation: base 3.2 x multiplier
    const speed = 3.2 * speedMult;

    for (let i = 0; i < totalSpheres; i++) {
      const x = (Math.random() - 0.5) * 440;
      const y = (Math.random() - 0.5) * 280;
      const z = 380 + Math.random() * 320;

      const angleXY = Math.random() * Math.PI * 2;
      const angleZ = (Math.random() - 0.5) * Math.PI;

      const vx = Math.cos(angleXY) * Math.cos(angleZ) * speed;
      const vy = Math.sin(angleXY) * Math.cos(angleZ) * speed;
      const vz = Math.sin(angleZ) * speed * 0.85;

      spheres.push({
        id: i + 1,
        x,
        y,
        z,
        vx,
        vy,
        vz,
        radius: baseRadius,
        isTarget: targetIndices.has(i),
        selected: false
      });
    }

    spheresRef.current = spheres;
    setSelectedSphereIds([]);
  }, [sphereSize]);

  // Render loop using 3D Perspective Projection
  const render3DArena = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      animationFrameRef.current = requestAnimationFrame(render3DArena);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(render3DArena);
      return;
    }

    const currentP = phaseRef.current;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const focalLength = 480;

    // Clear background
    ctx.fillStyle = '#060709';
    ctx.fillRect(0, 0, width, height);

    // Draw 3D Wireframe Boundary Box
    const boxCorners = [
      { x: -290, y: -190, z: 320 },
      { x: 290, y: -190, z: 320 },
      { x: 290, y: 190, z: 320 },
      { x: -290, y: 190, z: 320 },
      { x: -290, y: -190, z: 720 },
      { x: 290, y: -190, z: 720 },
      { x: 290, y: 190, z: 720 },
      { x: -290, y: 190, z: 720 }
    ];

    const project = (pt: { x: number; y: number; z: number }) => {
      const scale = focalLength / pt.z;
      return {
        x: centerX + pt.x * scale,
        y: centerY + pt.y * scale,
        scale
      };
    };

    const projCorners = boxCorners.map(project);

    // Draw back face grid
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(projCorners[4].x, projCorners[4].y);
    ctx.lineTo(projCorners[5].x, projCorners[5].y);
    ctx.lineTo(projCorners[6].x, projCorners[6].y);
    ctx.lineTo(projCorners[7].x, projCorners[7].y);
    ctx.closePath();
    ctx.stroke();

    // Connecting depth lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(projCorners[i].x, projCorners[i].y);
      ctx.lineTo(projCorners[i + 4].x, projCorners[i + 4].y);
      ctx.stroke();
    }

    // Front face
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(projCorners[0].x, projCorners[0].y);
    ctx.lineTo(projCorners[1].x, projCorners[1].y);
    ctx.lineTo(projCorners[2].x, projCorners[2].y);
    ctx.lineTo(projCorners[3].x, projCorners[3].y);
    ctx.closePath();
    ctx.stroke();

    const spheres = spheresRef.current;

    // Physics step during TRACKING phase
    if (currentP === 'TRACKING') {
      const boundX = 270;
      const boundY = 170;
      const minZ = 340;
      const maxZ = 690;

      spheres.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        s.z += s.vz;

        if (s.x > boundX) { s.x = boundX; s.vx = -Math.abs(s.vx); }
        else if (s.x < -boundX) { s.x = -boundX; s.vx = Math.abs(s.vx); }

        if (s.y > boundY) { s.y = boundY; s.vy = -Math.abs(s.vy); }
        else if (s.y < -boundY) { s.y = -boundY; s.vy = Math.abs(s.vy); }

        if (s.z > maxZ) { s.z = maxZ; s.vz = -Math.abs(s.vz); }
        else if (s.z < minZ) { s.z = minZ; s.vz = Math.abs(s.vz); }
      });
    }

    // Sort by Z descending
    const sortedSpheres = [...spheres].sort((a, b) => b.z - a.z);

    sortedSpheres.forEach(s => {
      const proj = project(s);
      const r = s.radius * proj.scale;
      const depthRatio = Math.max(0.3, Math.min(1.0, (750 - s.z) / 420));

      ctx.save();

      let mainColor = '#71717a';
      let haloColor = 'rgba(255,255,255,0.1)';

      if (currentP === 'MEMORIZE') {
        if (s.isTarget) {
          mainColor = '#D4AF37';
          haloColor = 'rgba(212, 175, 55, 0.7)';
        }
      } else if (currentP === 'TRACKING') {
        mainColor = '#94a3b8';
      } else if (currentP === 'SELECT') {
        if (s.selected) {
          mainColor = '#06B6D4';
          haloColor = 'rgba(6, 182, 212, 0.7)';
        } else {
          mainColor = '#cbd5e1';
        }
      } else if (currentP === 'FEEDBACK') {
        if (s.isTarget && s.selected) {
          mainColor = '#10B981';
          haloColor = 'rgba(16, 185, 129, 0.8)';
        } else if (s.isTarget && !s.selected) {
          mainColor = '#D4AF37';
          haloColor = 'rgba(212, 175, 55, 0.8)';
        } else if (!s.isTarget && s.selected) {
          mainColor = '#EF4444';
          haloColor = 'rgba(239, 68, 68, 0.8)';
        } else {
          mainColor = '#475569';
        }
      }

      // Glow halo
      if (haloColor) {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = haloColor;
        ctx.fill();
      }

      // Sphere gradient 3D body
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);

      const grad = ctx.createRadialGradient(
        proj.x - r * 0.35,
        proj.y - r * 0.35,
        r * 0.1,
        proj.x,
        proj.y,
        r
      );

      if (mainColor === '#D4AF37') {
        grad.addColorStop(0, '#FFF5C0');
        grad.addColorStop(0.3, '#E6C158');
        grad.addColorStop(0.8, '#9E7D1A');
        grad.addColorStop(1, '#4A3B0A');
      } else if (mainColor === '#10B981') {
        grad.addColorStop(0, '#A7F3D0');
        grad.addColorStop(0.4, '#10B981');
        grad.addColorStop(1, '#064E3B');
      } else if (mainColor === '#EF4444') {
        grad.addColorStop(0, '#FECACA');
        grad.addColorStop(0.4, '#EF4444');
        grad.addColorStop(1, '#7F1D1D');
      } else if (mainColor === '#06B6D4') {
        grad.addColorStop(0, '#CFFAFE');
        grad.addColorStop(0.4, '#06B6D4');
        grad.addColorStop(1, '#164E63');
      } else {
        const lightValue = Math.round(200 * depthRatio);
        const shadowValue = Math.round(50 * depthRatio);
        grad.addColorStop(0, `rgb(${lightValue + 40}, ${lightValue + 40}, ${lightValue + 40})`);
        grad.addColorStop(0.5, `rgb(${lightValue}, ${lightValue}, ${lightValue})`);
        grad.addColorStop(1, `rgb(${shadowValue}, ${shadowValue}, ${shadowValue})`);
      }

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * depthRatio})`;
      ctx.stroke();

      // Number badge in SELECT or FEEDBACK
      if (currentP === 'SELECT' || currentP === 'FEEDBACK') {
        ctx.fillStyle = s.selected ? '#000000' : '#FFFFFF';
        ctx.font = `bold ${Math.round(r * 0.95)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.id.toString(), proj.x, proj.y);
      }

      ctx.restore();
    });

    animationFrameRef.current = requestAnimationFrame(render3DArena);
  }, []);

  // Toggle sphere selection by numeric ID (used by both Canvas click and numeric keypad)
  const toggleSphereById = useCallback((id: number) => {
    if (phaseRef.current !== 'SELECT') return;

    const sphere = spheresRef.current.find(s => s.id === id);
    if (!sphere) return;

    sphere.selected = !sphere.selected;
    playChime('select');

    // Update React state so buttons and UI reflect selection immediately without waiting
    setSelectedSphereIds(spheresRef.current.filter(s => s.selected).map(s => s.id));
  }, [playChime]);

  // Handle Canvas Click or Tap to select spheres
  const handleCanvasInteraction = (clientX: number, clientY: number) => {
    if (phaseRef.current !== 'SELECT') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (clientY - rect.top) * (canvas.height / rect.height);

    const focalLength = 480;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const sorted = [...spheresRef.current].sort((a, b) => a.z - b.z);
    for (const sphere of sorted) {
      const scale = focalLength / sphere.z;
      const projX = centerX + sphere.x * scale;
      const projY = centerY + sphere.y * scale;
      const r = sphere.radius * scale;

      // Touch target on mobile (generous 1.8x radius for effortless tapping)
      const dist = Math.hypot(clickX - projX, clickY - projY);
      if (dist <= r * 1.8) {
        toggleSphereById(sphere.id);
        break;
      }
    }
  };

  // Run single trial
  const runTrialWithSpeed = useCallback((speedVal: number) => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);

    initializeSpheres(numTargets, speedVal);
    setPhase('MEMORIZE');
    phaseRef.current = 'MEMORIZE';
    setPhaseCountdown(2);
    playChime('target_highlight');

    // Countdown during memorize (2s -> 1s -> 0s)
    let memorizeRemaining = 2;
    countdownIntervalRef.current = setInterval(() => {
      memorizeRemaining -= 1;
      setPhaseCountdown(memorizeRemaining);
      if (memorizeRemaining <= 0) {
        clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    // 2s Memorize Targets -> Tracking
    phaseTimerRef.current = setTimeout(() => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setPhase('TRACKING');
      phaseRef.current = 'TRACKING';
      setPhaseCountdown(trackingDurationSec);
      playChime('start_track');

      let remaining = trackingDurationSec;
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        setPhaseCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current);
        }
      }, 1000);

      phaseTimerRef.current = setTimeout(() => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setPhase('SELECT');
        phaseRef.current = 'SELECT';
      }, trackingDurationSec * 1000);
    }, 2000);
  }, [initializeSpheres, numTargets, trackingDurationSec, playChime]);

  // Confirm selection in SELECT phase
  const handleConfirmSelection = () => {
    if (phaseRef.current !== 'SELECT') return;

    const spheres = spheresRef.current;
    const targets = spheres.filter(s => s.isTarget);
    const selected = spheres.filter(s => s.selected);

    const correctCount = targets.filter(t => t.selected).length;
    const isAllCorrect = correctCount === targets.length && selected.length === targets.length;

    if (isAllCorrect) {
      playChime('success');
    } else {
      playChime('error');
    }

    setPhase('FEEDBACK');
    phaseRef.current = 'FEEDBACK';

    const nextResults = [
      ...trialResults,
      {
        trial: currentTrial,
        speed: currentSpeedMultiplier,
        correct: isAllCorrect,
        targetsCount: targets.length,
        selectedCount: selected.length
      }
    ];
    setTrialResults(nextResults);

    // Adaptive staircase
    const nextSpeed = isAllCorrect
      ? Number((currentSpeedMultiplier * 1.15).toFixed(2))
      : Math.max(0.6, Number((currentSpeedMultiplier * 0.88).toFixed(2)));

    setCurrentSpeedMultiplier(nextSpeed);

    // Auto proceed to next trial or summary promptly (1.2s instead of 2.0s)
    phaseTimerRef.current = setTimeout(() => {
      if (currentTrial >= totalTrials) {
        setPhase('SUMMARY');
        phaseRef.current = 'SUMMARY';
      } else {
        const nextTrialNum = currentTrial + 1;
        setCurrentTrial(nextTrialNum);
        runTrialWithSpeed(nextSpeed);
      }
    }, 1200);
  };

  // Launch Session
  const handleStartSession = () => {
    setCurrentTrial(1);
    setCurrentSpeedMultiplier(initialSpeed);
    setTrialResults([]);
    setSaveSuccess(false);
    runTrialWithSpeed(initialSpeed);
  };

  // Save Results to Firestore
  const handleSaveToFirestore = async () => {
    if (!user?.uid || trialResults.length === 0 || isSaving) return;
    setIsSaving(true);

    try {
      const correctTrials = trialResults.filter(r => r.correct).length;
      const accuracy = Math.round((correctTrials / trialResults.length) * 100);
      const avgSpeed = Number((trialResults.reduce((acc, r) => acc + r.speed, 0) / trialResults.length).toFixed(2));
      const peakSpeed = Math.max(...trialResults.map(r => r.speed));

      await addDoc(collection(db, 'reactionTests'), {
        userId: user.uid,
        type: 'NEUROTRACKER_3D_MOT',
        title: 'NeuroTracker 3D-MOT (Capacidad Atencional)',
        date: new Date().toISOString(),
        repetitions: trialResults.length,
        average: avgSpeed,
        best: peakSpeed,
        accuracy,
        numTargets,
        initialSpeed,
        dualTask,
        trialHistory: trialResults,
        createdAt: new Date().toISOString()
      });

      setSaveSuccess(true);
    } catch (err) {
      console.error('Error saving NeuroTracker result:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Animation frame setup: only runs when in active drill
  useEffect(() => {
    if (phase !== 'CONFIG' && phase !== 'SUMMARY') {
      animationFrameRef.current = requestAnimationFrame(render3DArena);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [phase, render3DArena]);

  // Clean unmount on exit
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const correctTrialsCount = trialResults.filter(r => r.correct).length;
  const overallAccuracy = trialResults.length > 0 
    ? Math.round((correctTrialsCount / trialResults.length) * 100) 
    : 0;
  const finalSpeedThreshold = trialResults.length > 0 
    ? trialResults[trialResults.length - 1].speed 
    : initialSpeed;
  const peakSpeedMultiplier = trialResults.length > 0 
    ? Math.max(...trialResults.map(r => r.speed)) 
    : initialSpeed;

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black ${
        isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto' : ''
      }`}
    >
      {/* TOP STATUS BAR */}
      <header className="p-3 sm:p-5 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button 
            onClick={() => {
              if (phase !== 'CONFIG' && phase !== 'SUMMARY') {
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
                setPhase('CONFIG');
                phaseRef.current = 'CONFIG';
              } else {
                navigate('/neuro');
              }
            }}
            className="p-2 sm:p-2.5 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/20 flex items-center gap-1">
                <Brain size={12} /> NeuroTracker 3D-MOT
              </span>
            </div>
            <h1 className="text-sm sm:text-lg font-black text-white leading-tight">Seguimiento 3D de Múltiples Objetos</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all ${
              isFullscreen 
                ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20' 
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title={isFullscreen ? 'Salir de Pantalla Completa' : 'Ver en Pantalla Completa'}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-2 sm:p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors border border-zinc-800"
            title="Audio"
          >
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          {phase !== 'CONFIG' && phase !== 'SUMMARY' && (
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl text-right">
              <p className="text-[8px] sm:text-[9px] font-mono uppercase text-zinc-500">Repetición</p>
              <p className="text-xs sm:text-sm font-mono font-bold text-[#D4AF37]">{currentTrial} / {totalTrials}</p>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden">
        {/* VIEW 1: CONFIGURATION */}
        {phase === 'CONFIG' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl w-full bg-zinc-900/95 border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-md my-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 sm:p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl border border-[#D4AF37]/20">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">Configuración del NeuroTracker</h2>
                  <p className="text-xs text-zinc-400">Ajusta la velocidad inicial, tamaño y objetivos para móvil.</p>
                </div>
              </div>

              {/* Quick Fullscreen Prompt */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs border border-zinc-700 font-bold"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isFullscreen ? 'Modo Normal' : 'Pantalla Completa'}</span>
              </button>
            </div>

            {/* Scientific explanation pill */}
            <div className="bg-black/60 border border-zinc-800 p-3.5 rounded-2xl mb-5 flex items-start gap-2.5">
              <Info size={16} className="text-[#D4AF37] shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 leading-relaxed">
                <p className="font-bold text-white mb-1">¿Cómo funciona la metodología oficial 3D-MOT?</p>
                <ol className="list-decimal pl-4 space-y-0.5 text-zinc-400">
                  <li><strong className="text-[#D4AF37]">Fase 1 (2 seg):</strong> Las bolas se quedan quietas e iluminadas en <strong className="text-[#D4AF37]">dorado</strong> para que las memorices.</li>
                  <li><strong className="text-cyan-400">Fase 2 (5 seg):</strong> Las bolas vuelven a su color normal y <strong className="text-white">se mueven a toda velocidad</strong>. Síguelas visualmente.</li>
                  <li><strong className="text-emerald-400">Fase 3:</strong> Se detienen con números. Toca con el dedo las que memorizaste.</li>
                </ol>
              </div>
            </div>

            {/* PARAMETERS */}
            <div className="space-y-4 sm:space-y-5">
              {/* INITIAL SPEED PRESET */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FastForward size={14} className="text-[#D4AF37]" />
                    Velocidad Inicial del Movimiento
                  </label>
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">{initialSpeed}x</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {[
                    { label: '0.8x', val: 0.8, desc: 'Lento' },
                    { label: '1.2x', val: 1.2, desc: 'Medio' },
                    { label: '1.5x', val: 1.5, desc: 'Ágil' },
                    { label: '2.0x', val: 2.0, desc: 'Rápido' },
                    { label: '2.5x', val: 2.5, desc: 'Extremo' }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setInitialSpeed(item.val)}
                      className={`py-2 rounded-xl text-center font-bold text-xs transition-all border flex flex-col items-center justify-center ${
                        initialSpeed === item.val
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 font-black'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="text-xs">{item.label}</span>
                      <span className="text-[9px] opacity-75">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of targets */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Esferas Objetivo a Rastrear
                  </label>
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">{numTargets} Objetivos ({numTargets}/8)</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNumTargets(n)}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${
                        numTargets === n
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800'
                      }`}
                    >
                      {n} {n === 1 ? '(Fácil)' : n === 3 ? '(Estándar)' : n === 4 ? '(Élite)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sphere Size for Mobile Screen Visibility */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Tamaño de Esferas (Optimización Móvil)
                  </label>
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">
                    {sphereSize === 'LARGE' ? 'Grande (Móvil Recomendado)' : sphereSize === 'STANDARD' ? 'Estándar' : 'Compacto'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'STANDARD', label: 'Estándar' },
                    { key: 'LARGE', label: 'Grande (Móvil)' },
                    { key: 'COMPACT', label: 'Compacto' }
                  ].map(s => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSphereSize(s.key as any)}
                      className={`py-2 rounded-xl font-bold text-xs transition-all border ${
                        sphereSize === s.key
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tracking duration & Rounds Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. CUSTOM TRACKING DURATION */}
                <div className="bg-black/50 border border-zinc-800/80 p-3.5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-[#D4AF37]" />
                      Duración Rastreando
                    </label>
                    <span className="text-xs font-mono font-black text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-lg border border-[#D4AF37]/30">
                      {trackingDurationSec} Segundos
                    </span>
                  </div>

                  {/* Stepper + Direct Slider */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTrackingDurationSec(prev => Math.max(2, prev - 1))}
                      className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white flex items-center justify-center font-bold border border-zinc-700 shrink-0"
                      title="Restar 1 segundo"
                    >
                      <Minus size={16} />
                    </button>

                    <input
                      type="range"
                      min={2}
                      max={60}
                      step={1}
                      value={trackingDurationSec}
                      onChange={e => setTrackingDurationSec(Number(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                    />

                    <button
                      type="button"
                      onClick={() => setTrackingDurationSec(prev => Math.min(60, prev + 1))}
                      className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white flex items-center justify-center font-bold border border-zinc-700 shrink-0"
                      title="Sumar 1 segundo"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Quick Preset Pills */}
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">
                      Atajos rápidos:
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                      {[3, 5, 8, 10, 15, 20, 30, 45].map(sec => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setTrackingDurationSec(sec)}
                          className={`py-1.5 rounded-lg font-bold text-xs transition-all border text-center ${
                            trackingDurationSec === sec
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-black shadow-sm'
                              : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. CUSTOM ROUNDS / TRIALS */}
                <div className="bg-black/50 border border-zinc-800/80 p-3.5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                      <RotateCw size={14} className="text-[#D4AF37]" />
                      Cantidad de Rounds
                    </label>
                    <span className="text-xs font-mono font-black text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-0.5 rounded-lg border border-[#D4AF37]/30">
                      {totalTrials} Rounds
                    </span>
                  </div>

                  {/* Stepper + Direct Slider */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTotalTrials(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white flex items-center justify-center font-bold border border-zinc-700 shrink-0"
                      title="Restar 1 round"
                    >
                      <Minus size={16} />
                    </button>

                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={totalTrials}
                      onChange={e => setTotalTrials(Number(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                    />

                    <button
                      type="button"
                      onClick={() => setTotalTrials(prev => Math.min(30, prev + 1))}
                      className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white flex items-center justify-center font-bold border border-zinc-700 shrink-0"
                      title="Sumar 1 round"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Quick Preset Pills */}
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">
                      Atajos rápidos:
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                      {[3, 5, 8, 10, 15, 20].map(reps => (
                        <button
                          key={reps}
                          type="button"
                          onClick={() => setTotalTrials(reps)}
                          className={`py-1.5 rounded-lg font-bold text-xs transition-all border text-center ${
                            totalTrials === reps
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-black shadow-sm'
                              : 'bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                          }`}
                        >
                          {reps} Rds
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Dual Task Mode */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Tarea Dual Deportiva (Opcional)
                </label>
                <select
                  value={dualTask}
                  onChange={e => setDualTask(e.target.value)}
                  className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="VISUAL_ONLY">Fase 1: Cognitivo Puro (Frente a Pantalla)</option>
                  <option value="BALL_JUGGLING">Fase 2: Dominio de Balón (Toques con los pies)</option>
                  <option value="BASKET_DRIBBLE">Fase 2: Bote de Balón Continuo (Básquet)</option>
                  <option value="BOSU_BALANCE">Fase 3: Equilibrio Inestable (Bosu / Unipodal)</option>
                  <option value="SKIPPING">Fase 3: Coordinación en Escalera / Skipping</option>
                </select>
              </div>
            </div>

            {/* START BUTTON */}
            <button
              onClick={handleStartSession}
              className="mt-6 w-full py-4 bg-[#D4AF37] hover:bg-[#e6c158] text-black font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,175,55,0.35)] transition-all active:scale-[0.99]"
            >
              <Play size={18} fill="currentColor" /> Iniciar Sesión ({initialSpeed}x inicial)
            </button>
          </motion.div>
        )}

        {/* VIEW 2: 3D INTERACTIVE ARENA */}
        {(phase === 'MEMORIZE' || phase === 'TRACKING' || phase === 'SELECT' || phase === 'FEEDBACK') && (
          <div className="w-full max-w-4xl flex flex-col items-center flex-1 justify-center">
            {/* Status Header HUD */}
            <div className="w-full flex items-center justify-between mb-2.5 px-2">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  phase === 'MEMORIZE' ? 'bg-[#D4AF37] animate-ping' :
                  phase === 'TRACKING' ? 'bg-cyan-400 animate-pulse' :
                  phase === 'SELECT' ? 'bg-emerald-400 animate-bounce' : 'bg-purple-400'
                }`} />
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-200">
                  {phase === 'MEMORIZE' && `Fase 1: Memoriza los ${numTargets} dorados (${phaseCountdown}s)`}
                  {phase === 'TRACKING' && `Fase 2: Rastreando en movimiento (${phaseCountdown}s)`}
                  {phase === 'SELECT' && `Fase 3: Toca los ${numTargets} objetivos memorizados`}
                  {phase === 'FEEDBACK' && `Fase 4: Análisis de acierto`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl">
                  <Activity size={14} className="text-[#D4AF37]" />
                  <span className="text-xs font-mono font-bold text-white">{currentSpeedMultiplier}x</span>
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                  title="Pantalla Completa"
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            {/* CANVAS 3D BOX */}
            <div className={`relative w-full rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl bg-[#060709] flex items-center justify-center ${
              isFullscreen 
                ? 'h-[74vh] max-h-[78vh]' 
                : 'aspect-[16/10] sm:aspect-[16/9] max-h-[68vh]'
            }`}>
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                onClick={e => handleCanvasInteraction(e.clientX, e.clientY)}
                onTouchStart={e => {
                  if (e.touches && e.touches.length > 0) {
                    handleCanvasInteraction(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                className={`w-full h-full object-contain touch-none select-none ${phase === 'SELECT' ? 'cursor-pointer' : 'cursor-default'}`}
              />

              {/* Banner: Memorize Phase (Explains why balls are still) */}
              {phase === 'MEMORIZE' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-[#D4AF37] px-5 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-2xl pointer-events-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-ping" />
                  <span className="text-[#D4AF37] font-black text-xs uppercase tracking-wider">
                    👀 MEMORIZA LAS {numTargets} DORADAS ({phaseCountdown}s)... ¡EN SEGUIDA SE MOVERÁN!
                  </span>
                </div>
              )}

              {/* Banner: Tracking Phase */}
              {phase === 'TRACKING' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-cyan-500/60 px-5 py-2 rounded-2xl flex items-center gap-2.5 shadow-2xl pointer-events-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    ⚡ ¡SIGUE LAS ESFERAS CON LA MIRADA! ({phaseCountdown}s)
                  </span>
                </div>
              )}

              {/* Banner: Instructions Overlay in Select Phase */}
              {phase === 'SELECT' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-emerald-500/60 px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-2xl pointer-events-none">
                  <span className="text-emerald-400 font-black text-xs uppercase tracking-wider animate-pulse">
                    👉 Toca en pantalla o usa el teclado inferior ({selectedSphereIds.length}/{numTargets})
                  </span>
                </div>
              )}
            </div>

            {/* BOTTOM CONTROLS FOR SELECTION */}
            {phase === 'SELECT' && (
              <div className="mt-3 sm:mt-4 flex flex-col items-center gap-2.5 w-full max-w-md">
                {/* Numeric quick-tap keypad for easy selection on mobile */}
                <div className="w-full bg-zinc-950/80 border border-zinc-800 p-2 rounded-2xl">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider px-2 mb-1.5">
                    <span>Teclado de Números (1 al 8):</span>
                    <span className="text-emerald-400 font-mono">
                      {selectedSphereIds.length} de {numTargets} Seleccionadas
                    </span>
                  </div>
                  <div className="grid grid-cols-8 gap-1 sm:gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(id => {
                      const isSel = selectedSphereIds.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleSphereById(id)}
                          className={`py-2 sm:py-2.5 rounded-xl font-mono font-black text-xs sm:text-sm transition-all border active:scale-90 ${
                            isSel
                              ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          {id}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Instant Confirm Button */}
                <button
                  onClick={handleConfirmSelection}
                  disabled={selectedSphereIds.length === 0}
                  className={`w-full py-3.5 font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    selectedSphereIds.length >= numTargets
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.45)] animate-pulse'
                      : selectedSphereIds.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-600/30'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                  }`}
                >
                  <CheckCircle2 size={18} /> Confirmar Selección ({selectedSphereIds.length}/{numTargets})
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: SUMMARY & FIRESTORE SAVE */}
        {phase === 'SUMMARY' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center my-auto"
          >
            <div className="w-16 h-16 rounded-3xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
              <Award size={36} />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">Sesión NeuroTracker Completada</h2>
            <p className="text-xs text-zinc-400 mt-1">Evaluación de capacidad atencional y ancho de banda 3D.</p>

            {/* METRICS GRID */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 my-6">
              <div className="bg-black/60 border border-zinc-800 p-3.5 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Umbral Final</p>
                <p className="text-xl sm:text-2xl font-mono font-black text-[#D4AF37]">{finalSpeedThreshold}x</p>
                <span className="text-[9px] text-zinc-400">Speed Threshold</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-3.5 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Precisión</p>
                <p className="text-xl sm:text-2xl font-mono font-black text-emerald-400">{overallAccuracy}%</p>
                <span className="text-[9px] text-zinc-400">{correctTrialsCount}/{totalTrials} Aciertos</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-3.5 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Pico Máximo</p>
                <p className="text-xl sm:text-2xl font-mono font-black text-cyan-400">{peakSpeedMultiplier}x</p>
                <span className="text-[9px] text-zinc-400">Velocidad Top</span>
              </div>
            </div>

            {/* ATHLETIC CATEGORY BADGE */}
            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-3 rounded-2xl mb-6">
              <p className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">
                Nivel Atencional:{' '}
                {finalSpeedThreshold >= 2.0 ? '🏆 Élite Internacional' :
                 finalSpeedThreshold >= 1.5 ? '⭐ Profesional Competitivo' :
                 finalSpeedThreshold >= 1.1 ? '📈 Avanzado / Alto Rendimiento' : '🌱 Formación Base'}
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleStartSession}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 border border-zinc-700 transition-colors"
              >
                <RotateCcw size={16} /> Repetir Sesión
              </button>

              <button
                onClick={handleSaveToFirestore}
                disabled={isSaving || saveSuccess}
                className={`flex-1 py-3.5 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all ${
                  saveSuccess 
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                    : 'bg-[#D4AF37] hover:bg-[#e6c158] text-black shadow-lg shadow-[#D4AF37]/20'
                }`}
              >
                {isSaving ? 'Guardando...' : saveSuccess ? '✓ Guardado en Historial' : 'Guardar en Firestore'}
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};
