import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Brain, Play, RotateCcw, Volume2, VolumeX, 
  Sparkles, CheckCircle2, XCircle, TrendingUp, Info, Activity,
  ChevronRight, Award, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

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

  // === Configuration Parameters ===
  const [numTargets, setNumTargets] = useState<number>(3); // Standard scientific baseline is 3 targets
  const [trackingDurationSec, setTrackingDurationSec] = useState<number>(6); // 6 seconds tracking
  const [totalTrials, setTotalTrials] = useState<number>(10);
  const [dualTask, setDualTask] = useState<string>('VISUAL_ONLY');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // === Session State ===
  const [phase, setPhase] = useState<Phase>('CONFIG');
  const [currentTrial, setCurrentTrial] = useState<number>(1);
  const [currentSpeedMultiplier, setCurrentSpeedMultiplier] = useState<number>(1.0);
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
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize or resume AudioContext
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
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
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
        // High harmonic chord
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
      // Audio fallback silent
    }
  }, [soundEnabled, getAudioContext]);

  // Setup 8 initial spheres in 3D volume
  const initializeSpheres = useCallback((targetCount: number) => {
    const totalSpheres = 8;
    const spheres: Sphere3D[] = [];

    // Choose random unique indices for targets
    const targetIndices = new Set<number>();
    while (targetIndices.size < targetCount) {
      targetIndices.add(Math.floor(Math.random() * totalSpheres));
    }

    const baseRadius = 26;
    for (let i = 0; i < totalSpheres; i++) {
      // Random coordinates in virtual 3D box
      // Virtual box limits: X in [-280, 280], Y in [-180, 180], Z in [350, 750]
      const x = (Math.random() - 0.5) * 440;
      const y = (Math.random() - 0.5) * 280;
      const z = 400 + Math.random() * 300;

      // Random speed vector
      const speed = 2.2 * currentSpeedMultiplier;
      const angleXY = Math.random() * Math.PI * 2;
      const angleZ = (Math.random() - 0.5) * Math.PI;

      const vx = Math.cos(angleXY) * Math.cos(angleZ) * speed;
      const vy = Math.sin(angleXY) * Math.cos(angleZ) * speed;
      const vz = Math.sin(angleZ) * speed * 0.8;

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
  }, [currentSpeedMultiplier]);

  // Render loop using 3D Perspective Projection
  const render3DArena = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const focalLength = 480; // Virtual camera focal length

    // Clear background
    ctx.fillStyle = '#060709';
    ctx.fillRect(0, 0, width, height);

    // Draw 3D Wireframe Boundary Box
    // Virtual cube coordinates: X[-280, 280], Y[-180, 180], Z[320, 720]
    const boxCorners = [
      // Front face (Z = 320)
      { x: -280, y: -180, z: 320 },
      { x: 280, y: -180, z: 320 },
      { x: 280, y: 180, z: 320 },
      { x: -280, y: 180, z: 320 },
      // Back face (Z = 720)
      { x: -280, y: -180, z: 720 },
      { x: 280, y: -180, z: 720 },
      { x: 280, y: 180, z: 720 },
      { x: -280, y: 180, z: 720 }
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
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(projCorners[4].x, projCorners[4].y);
    ctx.lineTo(projCorners[5].x, projCorners[5].y);
    ctx.lineTo(projCorners[6].x, projCorners[6].y);
    ctx.lineTo(projCorners[7].x, projCorners[7].y);
    ctx.closePath();
    ctx.stroke();

    // Connecting depth lines (front to back)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(projCorners[i].x, projCorners[i].y);
      ctx.lineTo(projCorners[i + 4].x, projCorners[i + 4].y);
      ctx.stroke();
    }

    // Front face
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(projCorners[0].x, projCorners[0].y);
    ctx.lineTo(projCorners[1].x, projCorners[1].y);
    ctx.lineTo(projCorners[2].x, projCorners[2].y);
    ctx.lineTo(projCorners[3].x, projCorners[3].y);
    ctx.closePath();
    ctx.stroke();

    // Update and draw spheres (Z-sorted for correct depth layering)
    const spheres = spheresRef.current;

    // Physics step if in TRACKING phase
    if (phase === 'TRACKING') {
      const boundX = 260;
      const boundY = 160;
      const minZ = 340;
      const maxZ = 680;

      spheres.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        s.z += s.vz;

        // Bounce on X
        if (s.x > boundX) { s.x = boundX; s.vx = -Math.abs(s.vx); }
        else if (s.x < -boundX) { s.x = -boundX; s.vx = Math.abs(s.vx); }

        // Bounce on Y
        if (s.y > boundY) { s.y = boundY; s.vy = -Math.abs(s.vy); }
        else if (s.y < -boundY) { s.y = -boundY; s.vy = Math.abs(s.vy); }

        // Bounce on Z
        if (s.z > maxZ) { s.z = maxZ; s.vz = -Math.abs(s.vz); }
        else if (s.z < minZ) { s.z = minZ; s.vz = Math.abs(s.vz); }
      });
    }

    // Sort by Z descending (farthest rendered first)
    const sortedSpheres = [...spheres].sort((a, b) => b.z - a.z);

    sortedSpheres.forEach(s => {
      const proj = project(s);
      const r = s.radius * proj.scale;

      // Depth lighting ratio (1.0 close, 0.4 far)
      const depthRatio = Math.max(0.35, Math.min(1.0, (750 - s.z) / 400));

      // Shading colors
      let mainColor = '#71717A'; // Zinc neutral
      let glowColor = 'transparent';

      if (phase === 'MEMORIZE' && s.isTarget) {
        // Glowing gold for targets
        mainColor = '#D4AF37';
        glowColor = 'rgba(212, 175, 55, 0.45)';
      } else if (phase === 'SELECT' && s.selected) {
        // Cyan for selected
        mainColor = '#06B6D4';
        glowColor = 'rgba(6, 182, 212, 0.5)';
      } else if (phase === 'FEEDBACK') {
        if (s.isTarget && s.selected) {
          mainColor = '#10B981'; // Green: Hit!
          glowColor = 'rgba(16, 185, 129, 0.6)';
        } else if (s.isTarget && !s.selected) {
          mainColor = '#F59E0B'; // Amber: Missed target
          glowColor = 'rgba(245, 158, 11, 0.5)';
        } else if (!s.isTarget && s.selected) {
          mainColor = '#EF4444'; // Red: False selection
          glowColor = 'rgba(239, 68, 68, 0.6)';
        }
      }

      // Outer glow if active
      if (glowColor !== 'transparent') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.filter = 'blur(8px)';
        ctx.fill();
        ctx.restore();
      }

      // 3D Sphere Radial Gradient (Specular Highlight)
      ctx.save();
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
        // Metallic Neutral Sphere with Depth Fog
        const lightValue = Math.round(200 * depthRatio);
        const shadowValue = Math.round(50 * depthRatio);
        grad.addColorStop(0, `rgb(${lightValue + 40}, ${lightValue + 40}, ${lightValue + 40})`);
        grad.addColorStop(0.5, `rgb(${lightValue}, ${lightValue}, ${lightValue})`);
        grad.addColorStop(1, `rgb(${shadowValue}, ${shadowValue}, ${shadowValue})`);
      }

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * depthRatio})`;
      ctx.stroke();

      // Number badge in SELECT or FEEDBACK phase
      if (phase === 'SELECT' || phase === 'FEEDBACK') {
        ctx.fillStyle = s.selected ? '#000000' : '#FFFFFF';
        ctx.font = `bold ${Math.round(r * 0.9)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.id.toString(), proj.x, proj.y);
      }

      ctx.restore();
    });

    // Request next animation frame
    animationFrameRef.current = requestAnimationFrame(render3DArena);
  }, [phase]);

  // Handle Canvas Click to select spheres during SELECT phase
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'SELECT') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const focalLength = 480;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Check hit test against spheres (closest first)
    const sorted = [...spheresRef.current].sort((a, b) => a.z - b.z);
    for (const sphere of sorted) {
      const scale = focalLength / sphere.z;
      const projX = centerX + sphere.x * scale;
      const projY = centerY + sphere.y * scale;
      const r = sphere.radius * scale;

      const dist = Math.hypot(clickX - projX, clickY - projY);
      if (dist <= r * 1.3) {
        // Toggle selection
        sphere.selected = !sphere.selected;
        playChime('select');
        break;
      }
    }
  };

  // Start trial flow
  const runTrial = useCallback(() => {
    initializeSpheres(numTargets);
    setPhase('MEMORIZE');
    setPhaseCountdown(2);
    playChime('target_highlight');

    // 2s Memorize Targets -> Tracking
    phaseTimerRef.current = setTimeout(() => {
      setPhase('TRACKING');
      setPhaseCountdown(trackingDurationSec);
      playChime('start_track');

      // Countdown ticker
      let remaining = trackingDurationSec;
      const interval = setInterval(() => {
        remaining -= 1;
        setPhaseCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      // Tracking duration finishes -> Select phase
      phaseTimerRef.current = setTimeout(() => {
        setPhase('SELECT');
      }, trackingDurationSec * 1000);
    }, 2000);
  }, [initializeSpheres, numTargets, trackingDurationSec, playChime]);

  // Confirm selection in SELECT phase
  const handleConfirmSelection = () => {
    if (phase !== 'SELECT') return;

    const spheres = spheresRef.current;
    const targets = spheres.filter(s => s.isTarget);
    const selected = spheres.filter(s => s.selected);

    // Strict accuracy: All targets must be selected and no false positives
    const correctCount = targets.filter(t => t.selected).length;
    const isAllCorrect = correctCount === targets.length && selected.length === targets.length;

    if (isAllCorrect) {
      playChime('success');
    } else {
      playChime('error');
    }

    setPhase('FEEDBACK');

    // Record result
    setTrialResults(prev => [
      ...prev,
      {
        trial: currentTrial,
        speed: currentSpeedMultiplier,
        correct: isAllCorrect,
        targetsCount: targets.length,
        selectedCount: selected.length
      }
    ]);

    // Adaptive staircase: 1-up, 1-down
    if (isAllCorrect) {
      setCurrentSpeedMultiplier(prev => Number((prev * 1.12).toFixed(2)));
    } else {
      setCurrentSpeedMultiplier(prev => Math.max(0.6, Number((prev * 0.88).toFixed(2))));
    }

    // Auto proceed to next trial or summary after 2.5s feedback
    phaseTimerRef.current = setTimeout(() => {
      if (currentTrial >= totalTrials) {
        setPhase('SUMMARY');
      } else {
        setCurrentTrial(prev => prev + 1);
        runTrial();
      }
    }, 2500);
  };

  // Launch Session
  const handleStartSession = () => {
    setCurrentTrial(1);
    setCurrentSpeedMultiplier(1.0);
    setTrialResults([]);
    setSaveSuccess(false);
    runTrial();
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

  // Animation frame setup
  useEffect(() => {
    if (phase !== 'CONFIG' && phase !== 'SUMMARY') {
      animationFrameRef.current = requestAnimationFrame(render3DArena);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, [phase, render3DArena]);

  // Calculate summary metrics
  const correctTrialsCount = trialResults.filter(r => r.correct).length;
  const overallAccuracy = trialResults.length > 0 
    ? Math.round((correctTrialsCount / trialResults.length) * 100) 
    : 0;
  const finalSpeedThreshold = trialResults.length > 0 
    ? trialResults[trialResults.length - 1].speed 
    : 1.0;
  const peakSpeedMultiplier = trialResults.length > 0 
    ? Math.max(...trialResults.map(r => r.speed)) 
    : 1.0;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black">
      {/* TOP BAR */}
      <header className="p-4 sm:p-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (phase !== 'CONFIG' && phase !== 'SUMMARY') {
                setPhase('CONFIG');
              } else {
                navigate('/neuro');
              }
            }}
            className="p-2.5 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/20 flex items-center gap-1">
                <Brain size={12} /> NeuroTracker 3D-MOT
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white">Seguimiento 3D de Múltiples Objetos</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors border border-zinc-800"
            title="Audio"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {phase !== 'CONFIG' && phase !== 'SUMMARY' && (
            <div className="bg-zinc-900 border border-zinc-800 px-3.5 py-1 rounded-xl text-right">
              <p className="text-[9px] font-mono uppercase text-zinc-500">Repetición</p>
              <p className="text-sm font-mono font-bold text-[#D4AF37]">{currentTrial} / {totalTrials}</p>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* VIEW 1: CONFIGURATION */}
        {phase === 'CONFIG' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl border border-[#D4AF37]/20">
                <Sparkles size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Protocolo Científico de Ancho de Banda</h2>
                <p className="text-xs text-zinc-400">Metodología 3D-MOT utilizada por clubes de élite (Manchester United, NFL, NHL).</p>
              </div>
            </div>

            {/* Scientific explanation pill */}
            <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl mb-6 flex items-start gap-3">
              <Info size={18} className="text-[#D4AF37] shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-300 leading-relaxed">
                El atleta observa 8 esferas en un volumen tridimensional. Se iluminan las esferas objetivo, luego se camuflan y se mueven en 3D a velocidad variable. Al detenerse, debe identificarlas. Si aciertas, la velocidad aumenta automáticamente.
              </p>
            </div>

            {/* PARAMETERS */}
            <div className="space-y-5">
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
                      onClick={() => setNumTargets(n)}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${
                        numTargets === n
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800'
                      }`}
                    >
                      {n} {n === 3 ? '(Estándar)' : n === 4 ? '(Élite)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tracking duration */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Duración del Movimiento 3D
                  </label>
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">{trackingDurationSec} Segundos</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[4, 6, 8].map(sec => (
                    <button
                      key={sec}
                      onClick={() => setTrackingDurationSec(sec)}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${
                        trackingDurationSec === sec
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800'
                      }`}
                    >
                      {sec} segundos
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Trials */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Repeticiones de la Sesión
                  </label>
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">{totalTrials} Trials</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 15].map(reps => (
                    <button
                      key={reps}
                      onClick={() => setTotalTrials(reps)}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${
                        totalTrials === reps
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800'
                      }`}
                    >
                      {reps} repeticiones
                    </button>
                  ))}
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
                  className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
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
              className="mt-8 w-full py-4 bg-[#D4AF37] hover:bg-[#e6c158] text-black font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,175,55,0.35)] transition-all active:scale-[0.99]"
            >
              <Play size={18} fill="currentColor" /> Iniciar Sesión NeuroTracker
            </button>
          </motion.div>
        )}

        {/* VIEW 2: 3D INTERACTIVE ARENA */}
        {(phase === 'MEMORIZE' || phase === 'TRACKING' || phase === 'SELECT' || phase === 'FEEDBACK') && (
          <div className="w-full max-w-4xl flex flex-col items-center">
            {/* Status Header HUD */}
            <div className="w-full flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  phase === 'MEMORIZE' ? 'bg-[#D4AF37] animate-ping' :
                  phase === 'TRACKING' ? 'bg-cyan-400 animate-pulse' :
                  phase === 'SELECT' ? 'bg-emerald-400 animate-bounce' : 'bg-purple-400'
                }`} />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  {phase === 'MEMORIZE' && `Fase 1: Memoriza los ${numTargets} objetivos dorados`}
                  {phase === 'TRACKING' && `Fase 2: Rastreando en 3D (${phaseCountdown}s restantes)`}
                  {phase === 'SELECT' && `Fase 3: Toca los ${numTargets} objetivos`}
                  {phase === 'FEEDBACK' && `Fase 4: Análisis de acierto`}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl">
                <Activity size={14} className="text-[#D4AF37]" />
                <span className="text-xs font-mono font-bold text-white">Velocidad: {currentSpeedMultiplier}x</span>
              </div>
            </div>

            {/* CANVAS 3D BOX */}
            <div className="relative w-full aspect-[16/10] max-h-[65vh] rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl bg-[#060709]">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                onClick={handleCanvasClick}
                className={`w-full h-full object-contain ${phase === 'SELECT' ? 'cursor-pointer' : 'cursor-default'}`}
              />

              {/* Instructions Overlay in Select Phase */}
              {phase === 'SELECT' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-cyan-500/40 px-6 py-2 rounded-2xl flex items-center gap-2 shadow-2xl pointer-events-none">
                  <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider animate-pulse">
                    👉 Toca las esferas que seguiste ({spheresRef.current.filter(s => s.selected).length}/{numTargets} seleccionadas)
                  </span>
                </div>
              )}
            </div>

            {/* BOTTOM CONTROLS FOR SELECTION */}
            {phase === 'SELECT' && (
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={handleConfirmSelection}
                  disabled={spheresRef.current.filter(s => s.selected).length === 0}
                  className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all active:scale-95"
                >
                  <CheckCircle2 size={16} /> Confirmar Selección
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
            className="max-w-xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
              <Award size={36} />
            </div>

            <h2 className="text-2xl font-black text-white">Sesión NeuroTracker Completada</h2>
            <p className="text-xs text-zinc-400 mt-1">Evaluación de capacidad atencional y ancho de banda 3D.</p>

            {/* METRICS GRID */}
            <div className="grid grid-cols-3 gap-3 my-6">
              <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Umbral Final</p>
                <p className="text-2xl font-mono font-black text-[#D4AF37]">{finalSpeedThreshold}x</p>
                <span className="text-[9px] text-zinc-400">Speed Threshold</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Precisión</p>
                <p className="text-2xl font-mono font-black text-emerald-400">{overallAccuracy}%</p>
                <span className="text-[9px] text-zinc-400">{correctTrialsCount}/{totalTrials} Aciertos</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Pico Máximo</p>
                <p className="text-2xl font-mono font-black text-cyan-400">{peakSpeedMultiplier}x</p>
                <span className="text-[9px] text-zinc-400">Velocidad Top</span>
              </div>
            </div>

            {/* ATHLETIC CATEGORY BADGE */}
            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-3 rounded-2xl mb-6">
              <p className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">
                Nivel Atencional:{' '}
                {finalSpeedThreshold >= 1.5 ? '🏆 Élite Internacional' :
                 finalSpeedThreshold >= 1.2 ? '⭐ Profesional Competitivo' :
                 finalSpeedThreshold >= 0.9 ? '📈 Avanzado / Alto Rendimiento' : '🌱 Formación Base'}
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleStartSession}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 border border-zinc-700 transition-colors"
              >
                <RotateCcw size={16} /> Repetir Sesión
              </button>

              <button
                onClick={handleSaveToFirestore}
                disabled={isSaving || saveSuccess}
                className={`flex-1 py-3 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all ${
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
