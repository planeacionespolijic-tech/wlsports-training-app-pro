import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Eye, EyeOff, Play, Square, RotateCcw, Volume2, 
  VolumeX, Camera, SwitchCamera, Sparkles, Activity, Award, CheckCircle2,
  Info, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';

type StrobeMode = 'CAMERA_MIRROR' | 'BALL_ANTICIPATION';

interface StrobeLevel {
  level: number;
  label: string;
  visibleMs: number;
  occludedMs: number;
  visionPercentage: number;
  desc: string;
}

const STROBE_PRESETS: StrobeLevel[] = [
  { level: 1, label: 'Nivel 1 (Iniciación)', visibleMs: 150, occludedMs: 100, visionPercentage: 60, desc: '60% de información visual. Adaptación al parpadeo.' },
  { level: 2, label: 'Nivel 2 (Intermedio)', visibleMs: 120, occludedMs: 150, visionPercentage: 44, desc: '44% de información visual. Bote y cambios de dirección.' },
  { level: 3, label: 'Nivel 3 (Avanzado)', visibleMs: 100, occludedMs: 200, visionPercentage: 33, desc: '33% de información visual. Exige memoria propioceptiva.' },
  { level: 4, label: 'Nivel 4 (Profesional)', visibleMs: 90, occludedMs: 300, visionPercentage: 23, desc: '23% de información visual. Estilo gafas Senaptec élite.' },
  { level: 5, label: 'Nivel 5 (Élite Mundial)', visibleMs: 70, occludedMs: 420, visionPercentage: 14, desc: '14% de visión. El cerebro predice trayectorias a ciegas.' },
];

export const StrobeVisionScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // === Mode & Settings ===
  const [mode, setMode] = useState<StrobeMode>('CAMERA_MIRROR');
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(2); // Level 3 default
  const [customVisibleMs, setCustomVisibleMs] = useState<number>(100);
  const [customOccludedMs, setCustomOccludedMs] = useState<number>(200);
  const [isCustomPreset, setIsCustomPreset] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');

  // === Session State ===
  const [isDrillActive, setIsDrillActive] = useState<boolean>(false);
  const [isOccluded, setIsOccluded] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [sessionResults, setSessionResults] = useState<{
    rep: number;
    errorMs: number;
    rating: string;
  }[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // === Ball Anticipation Drill State ===
  const [ballProgress, setBallProgress] = useState<number>(0); // 0 to 100%
  const [anticipationFeedback, setAnticipationFeedback] = useState<{
    errorMs: number;
    text: string;
    type: 'perfect' | 'good' | 'miss';
  } | null>(null);

  // === Refs ===
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const strobeTimerRef = useRef<any>(null);
  const drillIntervalRef = useRef<any>(null);
  const ballAnimFrameRef = useRef<number | null>(null);
  const ballStartTimeRef = useRef<number>(0);
  const ballDurationMsRef = useRef<number>(2400); // 2.4s transit
  const audioCtxRef = useRef<AudioContext | null>(null);

  const currentVisibleMs = isCustomPreset ? customVisibleMs : STROBE_PRESETS[selectedLevelIndex].visibleMs;
  const currentOccludedMs = isCustomPreset ? customOccludedMs : STROBE_PRESETS[selectedLevelIndex].occludedMs;

  // Web Audio Metronome click
  const playStrobeClick = useCallback((type: 'open' | 'close' | 'hit') => {
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

      if (type === 'open') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
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
      console.warn('Camera not available or blocked in strobe screen:', err);
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
  }, []);

  // Strobe Pulsing Cycle Engine
  const startStrobeCycle = useCallback(() => {
    clearTimeout(strobeTimerRef.current);

    const runCycle = () => {
      // Step 1: Open vision
      setIsOccluded(false);
      playStrobeClick('open');

      strobeTimerRef.current = setTimeout(() => {
        // Step 2: Occlude vision
        setIsOccluded(true);

        strobeTimerRef.current = setTimeout(() => {
          runCycle();
        }, currentOccludedMs);
      }, currentVisibleMs);
    };

    runCycle();
  }, [currentVisibleMs, currentOccludedMs, playStrobeClick]);

  // Ball Anticipation Run
  const launchBallTransit = useCallback(() => {
    const transitDuration = 2200 + Math.random() * 800; // 2.2s to 3.0s
    ballDurationMsRef.current = transitDuration;
    ballStartTimeRef.current = performance.now();
    setAnticipationFeedback(null);

    const step = (now: number) => {
      const elapsed = now - ballStartTimeRef.current;
      const progress = Math.min(100, (elapsed / transitDuration) * 100);
      setBallProgress(progress);

      if (progress < 100) {
        ballAnimFrameRef.current = requestAnimationFrame(step);
      } else {
        // Ball passed target without press
        setAnticipationFeedback({
          errorMs: 400,
          text: 'Demasiado tarde (Sin interceptar)',
          type: 'miss'
        });
        setTimeout(() => {
          launchBallTransit();
        }, 1500);
      }
    };

    ballAnimFrameRef.current = requestAnimationFrame(step);
  }, []);

  // Handle Athlete Intercept Tap in Anticipation Drill
  const handleInterceptTap = () => {
    if (mode !== 'BALL_ANTICIPATION' || !isDrillActive) return;

    if (ballAnimFrameRef.current) {
      cancelAnimationFrame(ballAnimFrameRef.current);
    }

    const elapsed = performance.now() - ballStartTimeRef.current;
    const targetTime = ballDurationMsRef.current;
    const diffMs = Math.round(elapsed - targetTime); // positive = late, negative = early
    const absDiff = Math.abs(diffMs);

    playStrobeClick('hit');

    let rating = 'miss';
    let label = '';
    if (absDiff <= 45) {
      rating = 'perfect';
      label = `⚡ ¡Élite Perfecto! (${diffMs > 0 ? '+' : ''}${diffMs} ms)`;
    } else if (absDiff <= 95) {
      rating = 'good';
      label = `✓ Excelente (${diffMs > 0 ? '+' : ''}${diffMs} ms)`;
    } else {
      rating = 'miss';
      label = `Desfase ${diffMs < 0 ? 'por anticipación' : 'tardío'} (${diffMs > 0 ? '+' : ''}${diffMs} ms)`;
    }

    setAnticipationFeedback({
      errorMs: absDiff,
      text: label,
      type: rating as any
    });

    setSessionResults(prev => [
      ...prev,
      {
        rep: prev.length + 1,
        errorMs: absDiff,
        rating
      }
    ]);

    // Launch next transit after 1.5s
    setTimeout(() => {
      launchBallTransit();
    }, 1500);
  };

  // Start / Stop Drill
  const handleToggleDrill = () => {
    if (isDrillActive) {
      // Stop
      clearTimeout(strobeTimerRef.current);
      clearInterval(drillIntervalRef.current);
      if (ballAnimFrameRef.current) cancelAnimationFrame(ballAnimFrameRef.current);
      setIsDrillActive(false);
      setIsOccluded(false);
      setIsFinished(true);
      stopCamera();
    } else {
      // Start
      setIsFinished(false);
      setSessionResults([]);
      setElapsedSec(0);
      setSaveSuccess(false);
      setIsDrillActive(true);

      if (mode === 'CAMERA_MIRROR') {
        startCamera();
      } else {
        launchBallTransit();
      }

      startStrobeCycle();

      drillIntervalRef.current = setInterval(() => {
        setElapsedSec(prev => prev + 1);
      }, 1000);
    }
  };

  // Save results to Firestore
  const handleSaveToFirestore = async () => {
    if (!user?.uid || isSaving) return;
    setIsSaving(true);

    try {
      const avgError = sessionResults.length > 0
        ? Math.round(sessionResults.reduce((acc, r) => acc + r.errorMs, 0) / sessionResults.length)
        : 0;

      await addDoc(collection(db, 'reactionTests'), {
        userId: user.uid,
        type: 'STROBE_VISION_OCCLUSION',
        title: 'Simulador Estroboscópico (Oclusión Visual Senaptec)',
        mode,
        durationSec: elapsedSec,
        visibleMs: currentVisibleMs,
        occludedMs: currentOccludedMs,
        level: isCustomPreset ? 'Personalizado' : STROBE_PRESETS[selectedLevelIndex].label,
        repetitions: sessionResults.length,
        average: avgError,
        best: sessionResults.length > 0 ? Math.min(...sessionResults.map(r => r.errorMs)) : 0,
        trialHistory: sessionResults,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      setSaveSuccess(true);
    } catch (err) {
      console.error('Error saving Strobe session:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Clean up
  useEffect(() => {
    return () => {
      clearTimeout(strobeTimerRef.current);
      clearInterval(drillIntervalRef.current);
      if (ballAnimFrameRef.current) cancelAnimationFrame(ballAnimFrameRef.current);
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#D4AF37] selection:text-black">
      {/* HEADER */}
      <header className="p-4 sm:p-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (isDrillActive) handleToggleDrill();
              navigate('/neuro');
            }}
            className="p-2.5 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/20 flex items-center gap-1">
                <Sparkles size={12} /> Senaptec Strobe Simulator
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white">Entrenamiento de Oclusión Estroboscópica</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors border border-zinc-800"
            title="Audio metrónomo"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {isDrillActive && (
            <div className="bg-zinc-900 border border-zinc-800 px-3.5 py-1 rounded-xl text-right">
              <p className="text-[9px] font-mono uppercase text-zinc-500">Tiempo</p>
              <p className="text-sm font-mono font-bold text-[#D4AF37]">{elapsedSec}s</p>
            </div>
          )}
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {!isDrillActive && !isFinished ? (
          /* CONFIGURATION DASHBOARD */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl border border-[#D4AF37]/20">
                <EyeOff size={28} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Metodología de Información Visual Reducida</h2>
                <p className="text-xs text-zinc-400">Emula las gafas estroboscópicas Senaptec utilizadas por Stephen Curry y futbolistas de élite.</p>
              </div>
            </div>

            {/* Scientific Explanation */}
            <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl mb-6 flex items-start gap-3">
              <Info size={18} className="text-[#D4AF37] shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-300 leading-relaxed">
                Al ocultar intermitentemente la visión, tu cerebro se ve obligado a predecir matemáticamente las trayectorias del balón con menos información. Al retirar el estímulo, el juego parece ocurrir en cámara lenta.
              </p>
            </div>

            {/* SELECT MODALITY */}
            <div className="mb-6">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 block">
                Modalidad de Entrenamiento
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('CAMERA_MIRROR')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    mode === 'CAMERA_MIRROR'
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                      : 'bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Camera size={18} className={mode === 'CAMERA_MIRROR' ? 'text-[#D4AF37]' : 'text-zinc-400'} />
                    <span className="text-sm font-bold text-white">Espejo con Cámara</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Tu propia imagen parpadea mientras dominas o botas el balón frente a la pantalla.
                  </p>
                </button>

                <button
                  onClick={() => setMode('BALL_ANTICIPATION')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    mode === 'BALL_ANTICIPATION'
                      ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                      : 'bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={18} className={mode === 'BALL_ANTICIPATION' ? 'text-[#D4AF37]' : 'text-zinc-400'} />
                    <span className="text-sm font-bold text-white">Test de Anticipación</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Intercepta el balón que viaja de forma estroboscópica en el milisegundo exacto.
                  </p>
                </button>
              </div>
            </div>

            {/* STROBE FREQUENCY PRESETS */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Nivel de Dificultad Estroboscópica
                </label>
                <span className="text-xs font-mono font-bold text-[#D4AF37]">
                  {isCustomPreset ? 'Personalizado' : `${STROBE_PRESETS[selectedLevelIndex].visionPercentage}% de Visión`}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-3">
                {STROBE_PRESETS.map((lvl, idx) => (
                  <button
                    key={lvl.level}
                    onClick={() => {
                      setIsCustomPreset(false);
                      setSelectedLevelIndex(idx);
                    }}
                    className={`py-3 rounded-2xl font-bold text-xs transition-all border flex flex-col items-center justify-center gap-1 ${
                      !isCustomPreset && selectedLevelIndex === idx
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20'
                        : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-xs font-black">L{lvl.level}</span>
                    <span className="text-[9px] opacity-80">{lvl.visionPercentage}%</span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-zinc-400 bg-black/40 p-3 rounded-xl border border-zinc-800">
                {STROBE_PRESETS[selectedLevelIndex].desc} ({STROBE_PRESETS[selectedLevelIndex].visibleMs}ms visible / {STROBE_PRESETS[selectedLevelIndex].occludedMs}ms ciego)
              </p>
            </div>

            {/* START DRILL BUTTON */}
            <button
              onClick={handleToggleDrill}
              className="w-full py-4 bg-[#D4AF37] hover:bg-[#e6c158] text-black font-black text-sm uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,175,55,0.35)] transition-all active:scale-[0.99]"
            >
              <Play size={18} fill="currentColor" /> Iniciar Entrenamiento Estroboscópico
            </button>
          </motion.div>
        ) : isDrillActive ? (
          /* ACTIVE STROBE DRILL VIEWPORT */
          <div className="w-full max-w-4xl flex flex-col items-center">
            {/* Viewport Frame */}
            <div className="relative w-full aspect-[16/10] max-h-[68vh] rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl bg-black flex items-center justify-center">
              {mode === 'CAMERA_MIRROR' ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover ${cameraFacing === 'user' ? '-scale-x-100' : ''}`}
                  />
                  {/* Flip camera button */}
                  <button
                    onClick={() => {
                      setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
                      setTimeout(startCamera, 100);
                    }}
                    className="absolute top-4 right-4 p-2.5 bg-black/70 hover:bg-black text-white rounded-xl border border-white/20 transition-all z-20"
                    title="Cambiar cámara"
                  >
                    <SwitchCamera size={18} />
                  </button>
                </>
              ) : (
                /* BALL ANTICIPATION RUNWAY */
                <div 
                  onClick={handleInterceptTap}
                  className="w-full h-full flex flex-col items-center justify-center relative cursor-pointer select-none"
                >
                  {/* Target Intercept Line */}
                  <div className="absolute top-0 bottom-0 right-1/4 w-1.5 bg-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.8)] z-10">
                    <div className="absolute top-4 -translate-x-1/2 bg-red-500 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                      Punto de Intercepción
                    </div>
                  </div>

                  {/* Traveling Ball */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-tr from-[#D4AF37] to-white shadow-[0_0_30px_rgba(212,175,55,0.7)] flex items-center justify-center z-10 transition-transform"
                    style={{
                      left: `${ballProgress * 0.75}%`
                    }}
                  >
                    <div className="w-8 h-8 rounded-full border-2 border-black/40" />
                  </div>

                  {/* Feedback overlay */}
                  {anticipationFeedback && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`absolute top-1/3 px-6 py-2 rounded-2xl font-black text-sm uppercase shadow-2xl border ${
                        anticipationFeedback.type === 'perfect'
                          ? 'bg-emerald-500 text-black border-emerald-400'
                          : anticipationFeedback.type === 'good'
                          ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                          : 'bg-red-500 text-white border-red-400'
                      }`}
                    >
                      {anticipationFeedback.text}
                    </motion.div>
                  )}
                </div>
              )}

              {/* STROBE OCCLUSION BLACKOUT CURTAIN */}
              <div 
                className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-75 z-20 ${
                  isOccluded ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* HUD Pill in bottom */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/20 px-5 py-2 rounded-2xl flex items-center gap-3 z-30 pointer-events-none">
                <span className={`w-2 h-2 rounded-full ${isOccluded ? 'bg-red-500' : 'bg-emerald-400 animate-ping'}`} />
                <span className="text-xs font-mono font-bold text-white">
                  {isOccluded ? 'OCLUSIÓN CIEGA' : 'FASE VISIBLE'} ({currentVisibleMs}ms / {currentOccludedMs}ms)
                </span>
              </div>
            </div>

            {/* ACTION CONTROLS */}
            <div className="mt-5 flex items-center gap-4">
              {mode === 'BALL_ANTICIPATION' && (
                <button
                  onClick={handleInterceptTap}
                  className="px-8 py-4 bg-[#D4AF37] hover:bg-[#e6c158] text-black font-black text-sm uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-[0_0_30px_rgba(212,175,55,0.4)] active:scale-95"
                >
                  ⚡ Interceptar Balón Ahora
                </button>
              )}

              <button
                onClick={handleToggleDrill}
                className="px-6 py-3.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all"
              >
                <Square size={16} fill="currentColor" /> Finalizar Ejercicio
              </button>
            </div>
          </div>
        ) : (
          /* RESULTS / SUMMARY VIEW */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
              <Award size={36} />
            </div>

            <h2 className="text-2xl font-black text-white">Sesión Estroboscópica Finalizada</h2>
            <p className="text-xs text-zinc-400 mt-1">Entrenamiento de resistencia atencional bajo oclusión intermitente.</p>

            {/* METRICS */}
            <div className="grid grid-cols-3 gap-3 my-6">
              <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Tiempo Total</p>
                <p className="text-2xl font-mono font-black text-[#D4AF37]">{elapsedSec}s</p>
                <span className="text-[9px] text-zinc-400">Bajo Oclusión</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Nivel Ocular</p>
                <p className="text-2xl font-mono font-black text-cyan-400">
                  {isCustomPreset ? 'Custom' : `L${STROBE_PRESETS[selectedLevelIndex].level}`}
                </p>
                <span className="text-[9px] text-zinc-400">Dificultad</span>
              </div>
              <div className="bg-black/60 border border-zinc-800 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Información</p>
                <p className="text-2xl font-mono font-black text-emerald-400">
                  {isCustomPreset ? 'Manual' : `${STROBE_PRESETS[selectedLevelIndex].visionPercentage}%`}
                </p>
                <span className="text-[9px] text-zinc-400">Luz Disponible</span>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setIsFinished(false);
                  setIsDrillActive(false);
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
