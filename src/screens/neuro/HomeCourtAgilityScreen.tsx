import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Camera, SwitchCamera, Play, Square, RotateCcw, 
  Volume2, VolumeX, Sparkles, Activity, Award, CheckCircle2,
  Zap, Target, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

type DrillMode = 'RANDOM_FLASH' | 'SEQUENCE_MEMORY' | 'TIME_TRIAL_30';

interface TargetZone {
  id: number;
  label: string;
  quadrant: 'FL' | 'FR' | 'BL' | 'BR'; // Front-Left, Front-Right, Back-Left, Back-Right
  color: string;
  glowColor: string;
  xPercent: number; // 0-100% in viewport
  yPercent: number;
  active: boolean;
}

const INITIAL_ZONES: TargetZone[] = [
  { id: 1, label: '1. Delantero Izq', quadrant: 'FL', color: '#06B6D4', glowColor: 'rgba(6,182,212,0.6)', xPercent: 25, yPercent: 30, active: false },
  { id: 2, label: '2. Delantero Der', quadrant: 'FR', color: '#10B981', glowColor: 'rgba(16,185,129,0.6)', xPercent: 75, yPercent: 30, active: false },
  { id: 3, label: '3. Trasero Izq', quadrant: 'BL', color: '#F59E0B', glowColor: 'rgba(245,158,11,0.6)', xPercent: 25, yPercent: 70, active: false },
  { id: 4, label: '4. Trasero Der', quadrant: 'BR', color: '#A855F7', glowColor: 'rgba(168,85,247,0.6)', xPercent: 75, yPercent: 70, active: false },
];

export const HomeCourtAgilityScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // === Drill Settings ===
  const [drillMode, setDrillMode] = useState<DrillMode>('RANDOM_FLASH');
  const [totalRepsTarget, setTotalRepsTarget] = useState<number>(20);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // === State of Execution ===
  const [isConfiguring, setIsConfiguring] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Active target zone
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  const [zones, setZones] = useState<TargetZone[]>(INITIAL_ZONES);
  const [touchLog, setTouchLog] = useState<{
    rep: number;
    zoneId: number;
    reactionMs: number;
  }[]>([]);
  const [lastTouchReactionMs, setLastTouchReactionMs] = useState<number | null>(null);
  const [liveEnergyByZone, setLiveEnergyByZone] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });

  // Sequence mode state
  const [targetSequence, setTargetSequence] = useState<number[]>([]);
  const [sequenceStepIndex, setSequenceStepIndex] = useState<number>(0);

  // Persistence
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const canvasProcRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const targetStartTimeRef = useRef<number>(0);
  const cooldownRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Web Audio Synth
  const playAgilitySound = useCallback((type: 'hit' | 'start' | 'alert') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch {
      // Ignore
    }
  }, [soundEnabled]);

  // Camera Management
  const startCamera = useCallback(async () => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera failed in HomeCourt Agility:', err);
    }
  }, [cameraFacing]);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  // Pick Next Zone
  const pickNextZone = useCallback((currentId: number | null) => {
    if (drillMode === 'RANDOM_FLASH') {
      const remaining = [1, 2, 3, 4].filter(id => id !== currentId);
      const nextId = remaining[Math.floor(Math.random() * remaining.length)];
      setActiveZoneId(nextId);
      targetStartTimeRef.current = performance.now();
      playAgilitySound('alert');
    }
  }, [drillMode, playAgilitySound]);

  // Trigger hit on zone
  const registerZoneHit = useCallback((zoneId: number) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;

    const reactionTime = Math.round(performance.now() - targetStartTimeRef.current);
    setLastTouchReactionMs(reactionTime);
    playAgilitySound('hit');

    setTouchLog(prev => {
      const nextList = [
        ...prev,
        {
          rep: prev.length + 1,
          zoneId,
          reactionMs: reactionTime
        }
      ];

      // End condition check
      if (drillMode !== 'TIME_TRIAL_30' && nextList.length >= totalRepsTarget) {
        setTimeout(() => {
          setIsActive(false);
          setIsFinished(true);
          stopCamera();
        }, 500);
      }

      return nextList;
    });

    // Short cooldown before activating next cone (400ms)
    setTimeout(() => {
      cooldownRef.current = false;
      pickNextZone(zoneId);
    }, 450);
  }, [drillMode, totalRepsTarget, pickNextZone, playAgilitySound, stopCamera]);

  // Motion Detection Processing Loop
  const startMotionLoop = useCallback(() => {
    const processFrame = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        if (!canvasProcRef.current) {
          canvasProcRef.current = document.createElement('canvas');
          canvasProcRef.current.width = 160;
          canvasProcRef.current.height = 120;
        }
        const canvas = canvasProcRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, 160, 120);
          const currentData = ctx.getImageData(0, 0, 160, 120).data;

          if (prevFrameRef.current && prevFrameRef.current.length === currentData.length) {
            const prevData = prevFrameRef.current;

            // Quadrant energy buckets
            // FL (X: 0-80, Y: 0-60)   | FR (X: 80-160, Y: 0-60)
            // BL (X: 0-80, Y: 60-120) | BR (X: 80-160, Y: 60-120)
            let diffCountFL = 0;
            let diffCountFR = 0;
            let diffCountBL = 0;
            let diffCountBR = 0;

            const threshold = 28;
            for (let i = 0; i < currentData.length; i += 4) {
              const diff = (
                Math.abs(currentData[i] - prevData[i]) +
                Math.abs(currentData[i + 1] - prevData[i + 1]) +
                Math.abs(currentData[i + 2] - prevData[i + 2])
              ) / 3;

              if (diff > threshold) {
                const pixelIdx = i / 4;
                const px = pixelIdx % 160;
                const py = Math.floor(pixelIdx / 160);

                if (py < 60) {
                  if (px < 80) diffCountFL++;
                  else diffCountFR++;
                } else {
                  if (px < 80) diffCountBL++;
                  else diffCountBR++;
                }
              }
            }

            const totalQuadPixels = 80 * 60;
            const energyFL = Math.min(100, Math.round((diffCountFL / totalQuadPixels) * 100 * 5));
            const energyFR = Math.min(100, Math.round((diffCountFR / totalQuadPixels) * 100 * 5));
            const energyBL = Math.min(100, Math.round((diffCountBL / totalQuadPixels) * 100 * 5));
            const energyBR = Math.min(100, Math.round((diffCountBR / totalQuadPixels) * 100 * 5));

            setLiveEnergyByZone({
              1: energyFL,
              2: energyFR,
              3: energyBL,
              4: energyBR
            });

            // Check if active cone was triggered by motion
            const triggerThreshold = 22; // 22% energy in quadrant
            if (activeZoneId !== null && !cooldownRef.current) {
              if (activeZoneId === 1 && energyFL > triggerThreshold) registerZoneHit(1);
              else if (activeZoneId === 2 && energyFR > triggerThreshold) registerZoneHit(2);
              else if (activeZoneId === 3 && energyBL > triggerThreshold) registerZoneHit(3);
              else if (activeZoneId === 4 && energyBR > triggerThreshold) registerZoneHit(4);
            }
          }

          prevFrameRef.current = new Uint8ClampedArray(currentData);
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [activeZoneId, registerZoneHit]);

  // Start Drill Execution
  const handleStartDrill = () => {
    setIsConfiguring(false);
    setCountdown(3);
    setTouchLog([]);
    setLastTouchReactionMs(null);
    setElapsedSec(0);
    setSaveSuccess(false);

    startCamera();

    const countTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countTimer);
          setIsActive(true);
          playAgilitySound('start');
          pickNextZone(null);
          startMotionLoop();

          timerIntervalRef.current = setInterval(() => {
            setElapsedSec(sec => {
              const next = sec + 1;
              if (drillMode === 'TIME_TRIAL_30' && next >= 30) {
                clearInterval(timerIntervalRef.current);
                setIsActive(false);
                setIsFinished(true);
                stopCamera();
              }
              return next;
            });
          }, 1000);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Stop Drill
  const handleStopDrill = () => {
    clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsActive(false);
    setIsFinished(true);
    stopCamera();
  };

  // Save to Firestore
  const handleSaveToFirestore = async () => {
    if (!user?.uid || touchLog.length === 0 || isSaving) return;
    setIsSaving(true);

    try {
      const avgReaction = Math.round(touchLog.reduce((acc, t) => acc + t.reactionMs, 0) / touchLog.length);
      const bestReaction = Math.min(...touchLog.map(t => t.reactionMs));
      const touchesPerMinute = elapsedSec > 0 ? Math.round((touchLog.length / elapsedSec) * 60) : 0;

      await addDoc(collection(db, 'reactionTests'), {
        userId: user.uid,
        type: 'HOMECOURT_AGILITY_AR',
        title: 'HomeCourt Agility AR (Matriz de Conos Virtuales)',
        drillMode,
        repetitions: touchLog.length,
        average: avgReaction,
        best: bestReaction,
        touchesPerMinute,
        durationSec: elapsedSec,
        touchHistory: touchLog,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      setSaveSuccess(true);
    } catch (err) {
      console.error('Error saving HomeCourt Agility results:', err);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopCamera();
    };
  }, [stopCamera]);

  // Summary Metrics
  const avgReactionTime = touchLog.length > 0
    ? Math.round(touchLog.reduce((acc, t) => acc + t.reactionMs, 0) / touchLog.length)
    : 0;
  const bestReactionTime = touchLog.length > 0
    ? Math.min(...touchLog.map(t => t.reactionMs))
    : 0;
  const touchesPerMinute = elapsedSec > 0 
    ? Math.round((touchLog.length / elapsedSec) * 60) 
    : 0;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black">
      {/* TOP HEADER */}
      <header className="p-4 sm:p-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (isActive) handleStopDrill();
              navigate('/neuro');
            }}
            className="p-2.5 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/20 flex items-center gap-1">
                <Target size={12} /> HomeCourt Agility AR
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white">Conos y Platillos Virtuales con Cámara IA</h1>
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

          {isActive && (
            <div className="flex items-center gap-2">
              <div className="bg-zinc-900 border border-zinc-800 px-3.5 py-1 rounded-xl text-right">
                <p className="text-[9px] font-mono uppercase text-zinc-500">Toques</p>
                <p className="text-sm font-mono font-bold text-emerald-400">{touchLog.length}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 px-3.5 py-1 rounded-xl text-right">
                <p className="text-[9px] font-mono uppercase text-zinc-500">Tiempo</p>
                <p className="text-sm font-mono font-bold text-[#D4AF37]">{elapsedSec}s</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* VIEW 1: CONFIGURATION */}
        {isConfiguring && (
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
                <h2 className="text-xl font-black text-white">Agilidad AR sin Conos Físicos</h2>
                <p className="text-xs text-zinc-400">La cámara proyecta 4 dianas interactivas en tu suelo. Muévete y toca el cono activo con tus pies.</p>
              </div>
            </div>

            {/* Drill Mode Selection */}
            <div className="mb-6">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 block">
                Modalidad del Ejercicio
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDrillMode('RANDOM_FLASH')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    drillMode === 'RANDOM_FLASH'
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                      : 'bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={18} className={drillMode === 'RANDOM_FLASH' ? 'text-[#D4AF37]' : 'text-zinc-400'} />
                    <span className="text-sm font-bold text-white">Relámpago Aleatorio</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Un cono se ilumina al azar. Pisa su cuadrante a máxima velocidad para disparar el siguiente.
                  </p>
                </button>

                <button
                  onClick={() => setDrillMode('TIME_TRIAL_30')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    drillMode === 'TIME_TRIAL_30'
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                      : 'bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Activity size={18} className={drillMode === 'TIME_TRIAL_30' ? 'text-[#D4AF37]' : 'text-zinc-400'} />
                    <span className="text-sm font-bold text-white">Test 30 Segundos</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Récord de toques por minuto (PPM) a máxima intensidad en medio minuto continuo.
                  </p>
                </button>
              </div>
            </div>

            {/* Repetitions target if random flash */}
            {drillMode === 'RANDOM_FLASH' && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Cantidad de Toques de Cono
                  </label>
                  <span className="text-xs font-mono font-bold text-[#D4AF37]">{totalRepsTarget} Conos</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 20, 30].map(reps => (
                    <button
                      key={reps}
                      onClick={() => setTotalRepsTarget(reps)}
                      className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${
                        totalRepsTarget === reps
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800'
                      }`}
                    >
                      {reps} toques
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Camera Setup Instructions */}
            <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl mb-6">
              <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-1">
                📍 Cómo posicionar tu teléfono
              </p>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Apoya el teléfono a 1.5 - 2 metros de distancia, apuntando hacia tus pies y el suelo. En pantalla verás 4 platillos de colores. Para marcar punto, desplázate y pisa el platillo iluminado.
              </p>
            </div>

            {/* START BUTTON */}
            <button
              onClick={handleStartDrill}
              className="w-full py-4 bg-[#D4AF37] hover:bg-[#e6c158] text-black font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,175,55,0.35)] transition-all active:scale-[0.99]"
            >
              <Play size={18} fill="currentColor" /> Iniciar Matriz de Agilidad AR
            </button>
          </motion.div>
        )}

        {/* VIEW 2: ACTIVE AR ARENA */}
        {(!isConfiguring && !isFinished) && (
          <div className="w-full max-w-4xl flex flex-col items-center">
            {/* Live AR Viewport */}
            <div className="relative w-full aspect-[16/10] max-h-[68vh] rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl bg-black flex items-center justify-center">
              {/* Camera Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
              />

              {/* Countdown overlay */}
              {countdown > 0 && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                  <span className="text-9xl font-mono font-black text-[#D4AF37] animate-pulse">
                    {countdown}
                  </span>
                </div>
              )}

              {/* AR Virtual Cones Matrix (4 Discs on floor) */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2 p-6 z-20">
                {INITIAL_ZONES.map(cone => {
                  const isThisActive = activeZoneId === cone.id;
                  const currentEnergy = liveEnergyByZone[cone.id] || 0;

                  return (
                    <div 
                      key={cone.id}
                      className="flex flex-col items-center justify-center relative p-2"
                    >
                      {/* Virtual AR Cone / Disc Graphic */}
                      <motion.div
                        animate={{
                          scale: isThisActive ? [1, 1.15, 1] : 1,
                          rotate: isThisActive ? 360 : 0
                        }}
                        transition={{
                          repeat: isThisActive ? Infinity : 0,
                          duration: 1.2
                        }}
                        className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 flex flex-col items-center justify-center shadow-2xl transition-all duration-200 ${
                          isThisActive
                            ? 'border-white bg-gradient-to-tr from-[#D4AF37] to-amber-300 text-black shadow-[0_0_50px_rgba(212,175,55,0.9)] ring-8 ring-[#D4AF37]/40'
                            : 'border-white/30 bg-black/50 text-white/80'
                        }`}
                      >
                        <span className="text-2xl sm:text-3xl font-mono font-black">
                          {cone.id}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                          {cone.quadrant}
                        </span>

                        {/* Motion energy bar inside cone */}
                        <div className="w-12 h-1.5 bg-black/40 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-400 transition-all duration-75"
                            style={{ width: `${currentEnergy}%` }}
                          />
                        </div>
                      </motion.div>

                      {isThisActive && (
                        <div className="mt-2 bg-black/80 border border-[#D4AF37] text-[#D4AF37] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider animate-bounce shadow-lg">
                          ¡PISA AQUÍ!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Last reaction badge */}
              {lastTouchReactionMs && (
                <motion.div
                  key={lastTouchReactionMs}
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-6 py-2 rounded-2xl font-mono font-black text-lg shadow-[0_0_35px_rgba(16,185,129,0.8)] z-30 pointer-events-none"
                >
                  ⚡ {lastTouchReactionMs} ms
                </motion.div>
              )}

              {/* Flip camera control */}
              <button
                onClick={() => {
                  setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
                  setTimeout(startCamera, 100);
                }}
                className="absolute top-4 right-4 p-2.5 bg-black/70 hover:bg-black text-white rounded-xl border border-white/20 transition-all z-30"
                title="Cambiar cámara"
              >
                <SwitchCamera size={18} />
              </button>
            </div>

            {/* STOP BUTTON */}
            <div className="mt-4">
              <button
                onClick={handleStopDrill}
                className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all"
              >
                <Square size={16} fill="currentColor" /> Detener Ejercicio
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: SUMMARY & FIRESTORE SAVE */}
        {isFinished && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
              <Award size={36} />
            </div>

            <h2 className="text-2xl font-black text-white">Sesión de Agilidad AR Completada</h2>
            <p className="text-xs text-zinc-400 mt-1">Detección de desplazamientos y reflejos con conos virtuales.</p>

            {/* METRICS */}
            <div className="grid grid-cols-3 gap-3 my-6">
              <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Toques Totales</p>
                <p className="text-2xl font-mono font-black text-emerald-400">{touchLog.length}</p>
                <span className="text-[9px] text-zinc-400">{elapsedSec}s duración</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Reacción Promedio</p>
                <p className="text-2xl font-mono font-black text-[#D4AF37]">{avgReactionTime} ms</p>
                <span className="text-[9px] text-zinc-400">Mejor: {bestReactionTime} ms</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Ritmo Motor</p>
                <p className="text-2xl font-mono font-black text-cyan-400">{touchesPerMinute}</p>
                <span className="text-[9px] text-zinc-400">Toques / Minuto</span>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setIsFinished(false);
                  setIsConfiguring(true);
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 border border-zinc-700 transition-colors"
              >
                <RotateCcw size={16} /> Configurar de Nuevo
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
