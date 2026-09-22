import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, RotateCcw, Zap, ArrowUp, ArrowDown, 
  ArrowLeft as ArrowLeftIcon, ArrowRight, ArrowUpLeft, ArrowUpRight, 
  ArrowDownLeft, ArrowDownRight, Palette, Move, Hash, Timer, Target, 
  Volume2, VolumeX, Footprints, MousePointerClick, Trophy, Award, 
  CheckCircle, BarChart2, FastForward, Smartphone, Sparkles, Save, 
  AlertCircle, ChevronRight, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ReactionScreenProps {
  onBack?: () => void;
  userId?: string;
}

export type InteractionMode = 'CONE_RUN' | 'SELECT_COLOR' | 'FLASH_REACTION';
export type StimulusType = 'COLOR' | 'DIRECTION' | 'NUMBER';
export type StimulusValue = string | number;

export interface Stimulus {
  type: StimulusType;
  value: StimulusValue;
  id: number;
}

export interface RepetitionResult {
  rep: number;
  stimulus: Stimulus;
  timeMs: number;
  isBest?: boolean;
}

export const COLOR_PALETTE = [
  { hex: '#EF4444', name: 'ROJO', lightText: true },
  { hex: '#3B82F6', name: 'AZUL', lightText: true },
  { hex: '#10B981', name: 'VERDE', lightText: true },
  { hex: '#F59E0B', name: 'AMARILLO', lightText: false },
  { hex: '#F97316', name: 'NARANJA', lightText: true },
  { hex: '#8B5CF6', name: 'MORADO', lightText: true },
];

export const ReactionScreen = ({ onBack, userId }: ReactionScreenProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // === Dynamic Configuration ===
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('CONE_RUN');
  const [reps, setReps] = useState(10);
  const [mode, setMode] = useState<'COLORS' | 'DIRECTIONS' | 'NUMBERS' | 'MIXED'>('COLORS');
  
  // Specific timings
  const [recoveryTime, setRecoveryTime] = useState(3.0); // Rest/return time for CONE_RUN
  const [visibleTime, setVisibleTime] = useState(1.0); // For FLASH_REACTION
  const [intervalTime, setIntervalTime] = useState(1.5); // For FLASH_REACTION
  const [showLiveClock, setShowLiveClock] = useState(true);
  
  // Active elements
  const [selectedColors, setSelectedColors] = useState<string[]>(['#EF4444', '#3B82F6', '#10B981', '#F59E0B']);
  const [selectedDirections, setSelectedDirections] = useState<string[]>(['UP', 'DOWN', 'LEFT', 'RIGHT']);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([1, 2, 3, 4, 5]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // === Execution State ===
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [currentRep, setCurrentRep] = useState(0);
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null);
  const [isStimulusVisible, setIsStimulusVisible] = useState(false);
  
  // Repetition phase: 'stimulus' (athlete running or selecting) | 'feedback' (showing the recorded time)
  const [repPhase, setRepPhase] = useState<'waiting' | 'stimulus' | 'feedback'>('waiting');
  const [lastRepResult, setLastRepResult] = useState<RepetitionResult | null>(null);
  const [recoveryCountdown, setRecoveryCountdown] = useState(0);

  // Live Timer
  const [liveElapsedMs, setLiveElapsedMs] = useState(0);
  const [wrongSelectionShake, setWrongSelectionShake] = useState<string | null>(null);

  // Results History
  const [repsHistory, setRepsHistory] = useState<RepetitionResult[]>([]);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveClockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Directions definition
  const directions = [
    { key: 'UP', icon: ArrowUp, label: 'Arriba' },
    { key: 'DOWN', icon: ArrowDown, label: 'Abajo' },
    { key: 'LEFT', icon: ArrowLeftIcon, label: 'Izquierda' },
    { key: 'RIGHT', icon: ArrowRight, label: 'Derecha' },
    { key: 'UP_LEFT', icon: ArrowUpLeft, label: 'Diagonal Izq' },
    { key: 'UP_RIGHT', icon: ArrowUpRight, label: 'Diagonal Der' },
    { key: 'DOWN_LEFT', icon: ArrowDownLeft, label: 'Abajo Izq' },
    { key: 'DOWN_RIGHT', icon: ArrowDownRight, label: 'Abajo Der' },
  ];

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Speech Helper
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !soundEnabled) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.35;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Ignore speech synthesis failures
    }
  }, [voiceEnabled, soundEnabled]);

  // Audio Beep Helper
  const playBeep = useCallback((frequency = 660, duration = 0.08, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio not supported in this context
    }
  }, [soundEnabled]);

  const getColorName = (hex: string) => {
    const item = COLOR_PALETTE.find(c => c.hex.toLowerCase() === hex.toLowerCase());
    return item ? item.name : 'COLOR';
  };

  // Generate Next Stimulus
  const generateNextStimulus = useCallback((): Stimulus => {
    // If SELECT_COLOR mode is active, force COLOR stimulus so user can touch colors
    if (interactionMode === 'SELECT_COLOR') {
      const val = selectedColors[Math.floor(Math.random() * selectedColors.length)];
      return { type: 'COLOR', value: val, id: Date.now() };
    }

    const availableTypes: StimulusType[] = [];
    if (mode === 'COLORS' || mode === 'MIXED') availableTypes.push('COLOR');
    if (mode === 'DIRECTIONS' || mode === 'MIXED') availableTypes.push('DIRECTION');
    if (mode === 'NUMBERS' || mode === 'MIXED') availableTypes.push('NUMBER');

    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)] || 'COLOR';
    let value: StimulusValue = '';

    if (type === 'COLOR') {
      value = selectedColors[Math.floor(Math.random() * selectedColors.length)];
    } else if (type === 'DIRECTION') {
      value = selectedDirections[Math.floor(Math.random() * selectedDirections.length)];
    } else {
      value = selectedNumbers[Math.floor(Math.random() * selectedNumbers.length)];
    }

    return { type, value, id: Date.now() };
  }, [interactionMode, mode, selectedColors, selectedDirections, selectedNumbers]);

  // Clean up all intervals and timeouts
  const clearAllTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current);
    if (liveClockIntervalRef.current) clearInterval(liveClockIntervalRef.current);
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Finish Session
  const finishSession = () => {
    clearAllTimers();
    setIsStimulusVisible(false);
    setRepPhase('waiting');
    setIsActive(false);
    setIsFinished(true);
    playBeep(880, 0.2, 'triangle');
    speak('Sesión terminada. Excelente trabajo.');
  };

  // Trigger Next Stimulus
  const triggerStimulus = (repNumber: number) => {
    clearAllTimers();
    setLiveElapsedMs(0);
    setLastRepResult(null);

    const nextStim = generateNextStimulus();
    setCurrentStimulus(nextStim);
    setCurrentRep(repNumber);
    setIsStimulusVisible(true);
    setRepPhase('stimulus');

    // Beep and Voice
    playBeep(880, 0.08, 'sine');
    if (nextStim.type === 'COLOR') {
      const colorName = getColorName(nextStim.value as string);
      speak(`Platillo ${colorName}`);
    } else if (nextStim.type === 'DIRECTION') {
      const dirObj = directions.find(d => d.key === nextStim.value);
      speak(dirObj ? dirObj.label : 'Dirección');
    } else {
      speak(`Número ${nextStim.value}`);
    }

    const start = Date.now();
    startTimeRef.current = start;

    // Live clock ticker
    liveClockIntervalRef.current = setInterval(() => {
      setLiveElapsedMs(Date.now() - start);
    }, 30);

    // If FLASH_REACTION, auto expire if not touched within visibleTime
    if (interactionMode === 'FLASH_REACTION') {
      timerRef.current = setTimeout(() => {
        // Did not touch in time
        handleFlashTimeout(repNumber);
      }, visibleTime * 1000);
    }
  };

  // Start Recovery Countdown (Inter-rep interval)
  const startRecoveryPhase = (nextRepNum: number) => {
    setRepPhase('feedback');
    if (liveClockIntervalRef.current) clearInterval(liveClockIntervalRef.current);

    const waitSeconds = interactionMode === 'CONE_RUN' 
      ? recoveryTime 
      : interactionMode === 'SELECT_COLOR' 
        ? 1.5 
        : intervalTime;

    let remaining = Math.round(waitSeconds);
    setRecoveryCountdown(remaining);

    recoveryIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setRecoveryCountdown(remaining);
      if (remaining <= 0) {
        if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current);
        if (nextRepNum <= reps) {
          triggerStimulus(nextRepNum);
        } else {
          finishSession();
        }
      }
    }, 1000);
  };

  // Skip Recovery Countdown Immediately (Button "Siguiente Ya")
  const handleSkipRecovery = () => {
    if (recoveryIntervalRef.current) clearInterval(recoveryIntervalRef.current);
    const nextRepNum = currentRep + 1;
    if (nextRepNum <= reps) {
      triggerStimulus(nextRepNum);
    } else {
      finishSession();
    }
  };

  // Handle Successful Touch/Selection
  const handleTouchSuccess = () => {
    if (repPhase !== 'stimulus' || !startTimeRef.current || !currentStimulus) return;

    if (liveClockIntervalRef.current) clearInterval(liveClockIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    const elapsed = Date.now() - startTimeRef.current;
    const isBest = reactionTimes.length === 0 || elapsed < Math.min(...reactionTimes);

    const result: RepetitionResult = {
      rep: currentRep,
      stimulus: currentStimulus,
      timeMs: elapsed,
      isBest
    };

    setLastRepResult(result);
    setRepsHistory(prev => [...prev, result]);
    setReactionTimes(prev => [...prev, elapsed]);
    setIsStimulusVisible(false);

    // Audio & Voice Feedback
    playBeep(1046, 0.12, 'sine');
    const secondsText = (elapsed / 1000).toFixed(2);
    if (isBest && currentRep > 1) {
      speak(`${secondsText} segundos. Nuevo récord.`);
    } else {
      speak(`${secondsText} segundos.`);
    }

    // Start recovery and plan next rep
    const nextRep = currentRep + 1;
    if (nextRep <= reps) {
      startRecoveryPhase(nextRep);
    } else {
      // Last rep done, show brief feedback then finish
      setRepPhase('feedback');
      setTimeout(() => {
        finishSession();
      }, 2200);
    }
  };

  // Handle Incorrect Color Selection in SELECT_COLOR mode
  const handleWrongColor = (hex: string) => {
    if (repPhase !== 'stimulus') return;
    setWrongSelectionShake(hex);
    playBeep(260, 0.15, 'sawtooth');
    setTimeout(() => {
      setWrongSelectionShake(null);
    }, 400);
  };

  // Flash Timeout (Athlete didn't touch in time)
  const handleFlashTimeout = (repNum: number) => {
    if (liveClockIntervalRef.current) clearInterval(liveClockIntervalRef.current);
    setIsStimulusVisible(false);
    playBeep(330, 0.1, 'sawtooth');

    const nextRep = repNum + 1;
    if (nextRep <= reps) {
      startRecoveryPhase(nextRep);
    } else {
      finishSession();
    }
  };

  // Start Training Session
  const startTraining = () => {
    setIsConfiguring(false);
    setIsActive(true);
    setIsFinished(false);
    setRepPhase('waiting');
    setCurrentRep(0);
    setRepsHistory([]);
    setReactionTimes([]);
    setLastRepResult(null);
    setIsSaved(false);

    // 3 Second Countdown
    let cd = 3;
    setCountdown(cd);
    playBeep(520, 0.08);
    speak('Tres');

    const cdInterval = setInterval(() => {
      cd -= 1;
      if (cd > 0) {
        setCountdown(cd);
        playBeep(520, 0.08);
        speak(cd === 2 ? 'Dos' : 'Uno');
      } else {
        clearInterval(cdInterval);
        setCountdown(0);
        playBeep(880, 0.15);
        speak('¡Ya!');
        setTimeout(() => {
          triggerStimulus(1);
        }, 300);
      }
    }, 1000);
  };

  // Reset to configuration
  const reset = () => {
    clearAllTimers();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsActive(false);
    setIsConfiguring(true);
    setIsFinished(false);
    setCountdown(0);
    setRepPhase('waiting');
    setLastRepResult(null);
  };

  // Save Results to Firestore
  const handleSaveToHistory = async () => {
    if (reactionTimes.length === 0 || isSaving || isSaved) return;
    setIsSaving(true);
    try {
      const avg = Number((reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(0));
      const best = Math.min(...reactionTimes);
      const worst = Math.max(...reactionTimes);

      await addDoc(collection(db, 'reactionTests'), {
        userId: userId || user?.uid || 'anonymous',
        date: new Date().toISOString(),
        mode: interactionMode,
        stimulusCategory: mode,
        repetitions: reps,
        averageMs: avg,
        bestMs: best,
        worstMs: worst,
        reactionTimes,
        details: repsHistory.map(r => ({
          rep: r.rep,
          timeMs: r.timeMs,
          stimulusType: r.stimulus.type,
          stimulusValue: String(r.stimulus.value),
        })),
        createdAt: serverTimestamp(),
      });
      setIsSaved(true);
      playBeep(1200, 0.15);
    } catch (e) {
      console.error('Error saving reaction results:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  // Render current stimulus
  const renderStimulusVisual = () => {
    if (!currentStimulus) return null;

    if (currentStimulus.type === 'COLOR') {
      const colorHex = currentStimulus.value as string;
      const colorName = getColorName(colorHex);
      return (
        <div className="flex flex-col items-center gap-4">
          <motion.div 
            initial={{ scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="w-48 h-48 sm:w-64 sm:h-64 rounded-full shadow-[0_0_90px_rgba(255,255,255,0.2)] border-4 border-white/80 flex items-center justify-center relative overflow-hidden"
            style={{ backgroundColor: colorHex }}
          >
            <div className="w-16 h-16 rounded-full border-2 border-white/40 bg-white/20 animate-pulse" />
          </motion.div>
          <div className="bg-zinc-900/90 border border-zinc-700 px-6 py-2.5 rounded-2xl shadow-xl">
            <span className="text-xl sm:text-2xl font-black tracking-widest uppercase text-white">
              PLATILLO {colorName}
            </span>
          </div>
        </div>
      );
    } else if (currentStimulus.type === 'DIRECTION') {
      const dirObj = directions.find(d => d.key === currentStimulus.value);
      const Icon = dirObj?.icon || ArrowUp;
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-3xl bg-zinc-900 border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-[0_0_80px_rgba(212,175,55,0.2)]">
            <Icon size={160} strokeWidth={3} />
          </div>
          <span className="text-xl font-black uppercase text-white tracking-wider">
            {dirObj?.label || 'Dirección'}
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-3xl bg-zinc-900 border-2 border-white/20 flex items-center justify-center text-white shadow-2xl">
            <span className="text-9xl sm:text-[11rem] font-black italic tracking-tighter">
              {currentStimulus.value}
            </span>
          </div>
          <span className="text-xl font-black uppercase text-zinc-400 tracking-widest">
            Número {currentStimulus.value}
          </span>
        </div>
      );
    }
  };

  // =========================================================================
  // SCREEN 1: CONFIGURATION
  // =========================================================================
  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none">
        <header className="p-4 sm:p-6 border-b border-zinc-900 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack} 
              className="p-2.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 active:scale-95"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                Neuro Reacción & Platillos <Zap size={18} className="text-[#D4AF37]" />
              </h1>
              <p className="text-xs text-zinc-500 font-medium">Entrenamiento cognitivo-motor y velocidad</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 ${
                voiceEnabled 
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
                  : 'bg-zinc-900 text-zinc-600 border-zinc-800'
              }`}
              title="Activar o desactivar voz del color y tiempo"
            >
              <Volume2 size={16} />
              <span className="hidden sm:inline">Voz: {voiceEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-xl border transition-all ${
                soundEnabled 
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30' 
                  : 'bg-zinc-900 text-zinc-600 border-zinc-800'
              }`}
              title="Sonidos de beep"
            >
              {soundEnabled ? <Zap size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full pb-28 overflow-y-auto">
          {/* OPTION SELECTOR: HOW TO TRAIN (USER'S KEY REQUEST) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#D4AF37] flex items-center gap-1.5">
                <Target size={14} /> Modalidad de Dinámica
              </span>
              <span className="text-xs text-zinc-500 font-medium">¿Cómo entrenará el alumno?</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Cone Run & Touch Screen */}
              <button
                type="button"
                onClick={() => setInteractionMode('CONE_RUN')}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  interactionMode === 'CONE_RUN'
                    ? 'bg-zinc-900 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)] ring-1 ring-[#D4AF37]'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2.5 rounded-xl ${interactionMode === 'CONE_RUN' ? 'bg-[#D4AF37] text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Footprints size={20} />
                    </div>
                    {interactionMode === 'CONE_RUN' && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full">
                        Activa
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black uppercase text-white mb-1">
                    Ida y Vuelta a Platillo
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Sale el color, el alumno corre al platillo, vuelve y <strong>toca la pantalla para ver el tiempo</strong> que demoró.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800/80 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <Clock size={12} /> Mide sprint & retorno al tocar
                </div>
              </button>

              {/* Option 2: Select Color on Screen */}
              <button
                type="button"
                onClick={() => {
                  setInteractionMode('SELECT_COLOR');
                  setMode('COLORS'); // Color mode is optimal for selecting colors
                }}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  interactionMode === 'SELECT_COLOR'
                    ? 'bg-zinc-900 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2.5 rounded-xl ${interactionMode === 'SELECT_COLOR' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                      <MousePointerClick size={20} />
                    </div>
                    {interactionMode === 'SELECT_COLOR' && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                        Activa
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black uppercase text-white mb-1">
                    Seleccionar Color
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Aparecen botones en pantalla. El alumno debe <strong>pulsar el color correspondiente</strong> lo más rápido posible.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800/80 text-[10px] text-purple-400 font-bold flex items-center gap-1">
                  <Target size={12} /> Discriminación táctil en vivo
                </div>
              </button>

              {/* Option 3: Flash Visual Reflex */}
              <button
                type="button"
                onClick={() => setInteractionMode('FLASH_REACTION')}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  interactionMode === 'FLASH_REACTION'
                    ? 'bg-zinc-900 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-1 ring-blue-500'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2.5 rounded-xl ${interactionMode === 'FLASH_REACTION' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Zap size={20} />
                    </div>
                    {interactionMode === 'FLASH_REACTION' && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                        Activa
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black uppercase text-white mb-1">
                    Reflejo Flash In Situ
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Estímulo fugaz de corta duración para medir velocidad pura de reacción visual ante la pantalla.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800/80 text-[10px] text-blue-400 font-bold flex items-center gap-1">
                  <Zap size={12} /> Reflejo ocular inmediato
                </div>
              </button>
            </div>
          </section>

          {/* PARAMETERS ADAPTED TO THE SELECTED MODE */}
          <section className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800/80 space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
              <Timer size={15} className="text-[#D4AF37]" /> Parámetros de la Sesión
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ConfigItem 
                label="Repeticiones de la Serie" 
                value={reps} 
                onChange={setReps} 
                step={5} 
                min={3} 
                unit="reps" 
                icon={<Zap size={18} className="text-amber-500" />} 
              />

              {interactionMode === 'CONE_RUN' && (
                <ConfigItem 
                  label="Pausa / Retorno al Centro" 
                  value={recoveryTime} 
                  onChange={setRecoveryTime} 
                  step={0.5} 
                  min={1.0} 
                  unit="s" 
                  icon={<Footprints size={18} className="text-emerald-500" />} 
                />
              )}

              {interactionMode === 'FLASH_REACTION' && (
                <>
                  <ConfigItem 
                    label="Tiempo Visible del Estímulo" 
                    value={visibleTime} 
                    onChange={setVisibleTime} 
                    step={0.1} 
                    min={0.3} 
                    unit="s" 
                    icon={<Timer size={18} className="text-emerald-500" />} 
                  />
                  <ConfigItem 
                    label="Intervalo de Descanso" 
                    value={intervalTime} 
                    onChange={setIntervalTime} 
                    step={0.2} 
                    min={0.5} 
                    unit="s" 
                    icon={<Target size={18} className="text-red-500" />} 
                  />
                </>
              )}

              {/* Toggle Live Clock display */}
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white mb-0.5">Cronómetro en Vivo</p>
                  <p className="text-[10px] text-zinc-500">Muestra los segundos corriendo en pantalla</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLiveClock(!showLiveClock)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    showLiveClock 
                      ? 'bg-[#D4AF37] text-black shadow-md' 
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {showLiveClock ? 'Visible' : 'Oculto'}
                </button>
              </div>
            </div>
          </section>

          {/* STIMULUS CONTENT CATEGORY */}
          {interactionMode !== 'SELECT_COLOR' && (
            <section className="space-y-3">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Tipo de Estímulo
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'COLORS', label: 'Platillos / Colores', icon: Palette },
                  { id: 'DIRECTIONS', label: 'Direcciones / Flechas', icon: Move },
                  { id: 'NUMBERS', label: 'Números', icon: Hash },
                  { id: 'MIXED', label: 'Mixto Cognitivo', icon: Zap },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as any)}
                    className={`flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl border transition-all gap-1.5 ${
                      mode === m.id 
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37] font-bold shadow-lg shadow-[#D4AF37]/10' 
                        : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <m.icon size={18} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-center">{m.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ACTIVE COLORS (PLATILLOS) */}
          {(mode === 'COLORS' || mode === 'MIXED' || interactionMode === 'SELECT_COLOR') && (
            <section className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                  Colores de Platillos Activos ({selectedColors.length})
                </h2>
                <span className="text-[10px] text-zinc-500">Toca para activar o desactivar</span>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {COLOR_PALETTE.map((c) => {
                  const isSelected = selectedColors.includes(c.hex);
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          if (selectedColors.length > 2) {
                            setSelectedColors(prev => prev.filter(h => h !== c.hex));
                          }
                        } else {
                          setSelectedColors(prev => [...prev, c.hex]);
                        }
                      }}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                        isSelected 
                          ? 'border-white bg-zinc-800/90 scale-102 shadow-lg ring-2 ring-white/20' 
                          : 'border-zinc-800 bg-zinc-950/60 opacity-35 hover:opacity-70'
                      }`}
                    >
                      <div 
                        className="w-10 h-10 rounded-full shadow-md border-2 border-white/40" 
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[10px] font-black uppercase tracking-wider text-white">
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ACTIVE DIRECTIONS */}
          {(mode === 'DIRECTIONS' || mode === 'MIXED') && interactionMode !== 'SELECT_COLOR' && (
            <section className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/60 space-y-3">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Direcciones Activas ({selectedDirections.length})
              </h2>
              <div className="grid grid-cols-4 gap-2.5">
                {directions.map((d) => {
                  const isSelected = selectedDirections.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      onClick={() => {
                        if (isSelected) {
                          if (selectedDirections.length > 2) {
                            setSelectedDirections(prev => prev.filter(k => k !== d.key));
                          }
                        } else {
                          setSelectedDirections(prev => [...prev, d.key]);
                        }
                      }}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        isSelected 
                          ? 'bg-zinc-800 border-[#D4AF37] text-[#D4AF37]' 
                          : 'bg-black border-zinc-800 text-zinc-600'
                      }`}
                    >
                      <d.icon size={22} />
                      <span className="text-[9px] font-bold">{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ACTIVE NUMBERS */}
          {(mode === 'NUMBERS' || mode === 'MIXED') && interactionMode !== 'SELECT_COLOR' && (
            <section className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/60 space-y-3">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Números Activos ({selectedNumbers.length})
              </h2>
              <div className="grid grid-cols-5 gap-2">
                {numbers.map((n) => {
                  const isSelected = selectedNumbers.includes(n);
                  return (
                    <button
                      key={n}
                      onClick={() => {
                        if (isSelected) {
                          if (selectedNumbers.length > 2) {
                            setSelectedNumbers(prev => prev.filter(val => val !== n));
                          }
                        } else {
                          setSelectedNumbers(prev => [...prev, n]);
                        }
                      }}
                      className={`aspect-square rounded-2xl border flex items-center justify-center text-lg font-black transition-all ${
                        isSelected 
                          ? 'bg-zinc-800 border-[#D4AF37] text-[#D4AF37]' 
                          : 'bg-black border-zinc-800 text-zinc-600'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </main>

        {/* BOTTOM ACTION BAR */}
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent border-t border-zinc-900 z-30">
          <div className="max-w-3xl mx-auto">
            <button 
              type="button"
              onClick={startTraining}
              className="w-full bg-[#D4AF37] hover:bg-[#c49f30] active:scale-98 text-black font-black py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-3 text-base sm:text-lg shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all uppercase tracking-[0.15em]"
            >
              <Play fill="black" size={22} />
              Iniciar Entrenamiento ({reps} Repeticiones)
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 2: FINAL RESULTS & PERFORMANCE REPORT
  // =========================================================================
  if (isFinished) {
    const avgReaction = reactionTimes.length > 0 
      ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(0)
      : '0';
    const bestReaction = reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0;
    const worstReaction = reactionTimes.length > 0 ? Math.max(...reactionTimes) : 0;
    const totalTimeSec = (reactionTimes.reduce((a, b) => a + b, 0) / 1000).toFixed(1);

    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center font-sans overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#D4AF3715_0%,transparent_70%)] pointer-events-none" />
        
        <div className="relative z-10 space-y-6 w-full max-w-lg my-auto py-8">
          <div className="space-y-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-3xl flex items-center justify-center mx-auto text-[#D4AF37] shadow-xl">
              <Trophy size={38} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase text-white">
              Sesión Completada
            </h2>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.25em]">
              {interactionMode === 'CONE_RUN' ? 'Carrera a Platillos (Ida y Vuelta)' : interactionMode === 'SELECT_COLOR' ? 'Selección de Color Táctil' : 'Reflejo Flash'}
            </p>
          </div>
          
          {/* Top Score Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Récord (Mejor)</p>
              <p className="text-xl sm:text-2xl font-black text-[#D4AF37]">
                {(bestReaction / 1000).toFixed(2)}<span className="text-xs">s</span>
              </p>
            </div>

            <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Promedio</p>
              <p className="text-xl sm:text-2xl font-black text-white">
                {(Number(avgReaction) / 1000).toFixed(2)}<span className="text-xs">s</span>
              </p>
            </div>

            <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Más Lento</p>
              <p className="text-xl sm:text-2xl font-black text-zinc-400">
                {(worstReaction / 1000).toFixed(2)}<span className="text-xs">s</span>
              </p>
            </div>

            <div className="bg-zinc-900/70 p-3.5 rounded-2xl border border-zinc-800 text-center">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Tiempo Total</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400">
                {totalTimeSec}<span className="text-xs">s</span>
              </p>
            </div>
          </div>

          {/* Visual Breakdown of Repetitions */}
          <div className="bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800/80 text-left space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <BarChart2 size={15} className="text-[#D4AF37]" /> Desglose por Repetición
              </h3>
              <span className="text-[10px] text-zinc-500">
                {repsHistory.length} de {reps} completadas
              </span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {repsHistory.map((r) => {
                const isBest = r.timeMs === bestReaction;
                const colorHex = r.stimulus.type === 'COLOR' ? (r.stimulus.value as string) : undefined;
                const name = colorHex ? getColorName(colorHex) : String(r.stimulus.value);

                return (
                  <div 
                    key={r.rep} 
                    className={`px-3 py-2 rounded-xl flex items-center justify-between text-xs border ${
                      isBest 
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-white font-bold' 
                        : 'bg-zinc-950/70 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-500 text-[11px]">#{r.rep}</span>
                      {colorHex && (
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-white/30" 
                          style={{ backgroundColor: colorHex }} 
                        />
                      )}
                      <span className="font-bold">{name}</span>
                      {isBest && (
                        <span className="bg-[#D4AF37] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase">
                          Récord
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-black text-sm text-white">{(r.timeMs / 1000).toFixed(2)}s</span>
                      <span className="text-[10px] text-zinc-500">({r.timeMs}ms)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button 
              type="button"
              onClick={handleSaveToHistory}
              disabled={isSaving || isSaved}
              className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                isSaved 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 cursor-default' 
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 active:scale-98'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle size={16} /> ¡Sesión Guardada en Historial!
                </>
              ) : isSaving ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Save size={16} /> Guardar Sesión en Registro Neuro
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={startTraining}
                className="bg-[#D4AF37] hover:bg-[#c49f30] active:scale-98 text-black font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={15} /> Repetir Serie
              </button>

              <button 
                type="button"
                onClick={reset}
                className="bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider"
              >
                Configuración
              </button>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="text-xs text-zinc-500 hover:text-zinc-300 py-1 transition-colors"
            >
              Volver al Centro Neuro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SCREEN 3: ACTIVE WORKOUT HUD (TRAINING EXECUTION)
  // =========================================================================
  return (
    <div 
      className="fixed inset-0 bg-black flex flex-col cursor-pointer select-none overflow-hidden z-50"
      onClick={() => {
        // Tapping anywhere on screen records reaction for CONE_RUN or FLASH_REACTION
        if (interactionMode !== 'SELECT_COLOR' && repPhase === 'stimulus') {
          handleTouchSuccess();
        }
      }}
    >
      {/* Top Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between z-20 pointer-events-auto">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            reset();
          }}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl flex items-center gap-1.5 text-xs font-bold text-white transition-all active:scale-95"
          title="Salir / Pausar"
        >
          <ArrowLeft size={16} />
          <span>Detener</span>
        </button>

        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">
              Progreso
            </p>
            <p className="text-xl sm:text-2xl font-mono font-black text-white leading-none">
              {currentRep}<span className="text-sm opacity-30">/{reps}</span>
            </p>
          </div>

          {reactionTimes.length > 0 && (
            <div className="border-l border-zinc-800 pl-3 hidden sm:block">
              <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest leading-none mb-1">
                Mejor
              </p>
              <p className="text-xl font-mono font-black text-[#D4AF37] leading-none">
                {(Math.min(...reactionTimes) / 1000).toFixed(2)}s
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 relative z-10">
        <AnimatePresence mode="wait">
          {/* Initial Countdown (3, 2, 1) */}
          {countdown > 0 ? (
            <motion.div
              key="countdown"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <span className="text-[10rem] sm:text-[14rem] font-mono font-black text-[#D4AF37] leading-none drop-shadow-[0_0_80px_rgba(212,175,55,0.4)]">
                {countdown}
              </span>
              <p className="text-sm sm:text-base font-black text-zinc-400 uppercase tracking-[0.3em] animate-pulse">
                ¡Prepárate en la posición de salida!
              </p>
            </motion.div>
          ) : repPhase === 'feedback' && lastRepResult ? (
            /* =======================================================
               REPETITION FEEDBACK HUD (IMMEDIATE TIME DISPLAY)
               ======================================================= */
            <motion.div
              key="rep-feedback"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-zinc-900/90 border-2 border-zinc-700 rounded-3xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gold glow if best rep */}
              {lastRepResult.isBest && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.25)_0%,transparent_70%)] pointer-events-none" />
              )}

              <div className="relative z-10 space-y-4">
                {lastRepResult.isBest ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-full text-[#D4AF37] text-xs font-black uppercase tracking-wider animate-bounce">
                    <Trophy size={14} /> ¡Nuevo Récord de la Serie!
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle size={14} /> Repetición #{lastRepResult.rep} Registrada
                  </div>
                )}

                <div>
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">
                    Tiempo que tardó:
                  </p>
                  <p className="text-5xl sm:text-7xl font-mono font-black text-white tracking-tight">
                    {(lastRepResult.timeMs / 1000).toFixed(2)}
                    <span className="text-2xl text-[#D4AF37] ml-1">s</span>
                  </p>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5">
                    ({lastRepResult.timeMs} milisegundos)
                  </p>
                </div>

                {/* Stimulus recap tag */}
                {lastRepResult.stimulus.type === 'COLOR' && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/60 rounded-xl border border-zinc-800">
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-white/40" 
                      style={{ backgroundColor: lastRepResult.stimulus.value as string }} 
                    />
                    <span className="text-xs font-bold text-zinc-300">
                      Platillo {getColorName(lastRepResult.stimulus.value as string)}
                    </span>
                  </div>
                )}

                {/* Recovery countdown bar */}
                <div className="pt-2 border-t border-zinc-800 space-y-2">
                  <p className="text-xs text-zinc-400 font-medium flex items-center justify-center gap-1.5">
                    <Footprints size={14} className="text-[#D4AF37]" />
                    <span>Regresa al centro • Siguiente en:</span>
                    <span className="font-mono font-black text-[#D4AF37] text-sm">
                      {recoveryCountdown}s
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={handleSkipRecovery}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Siguiente Ahora</span>
                    <FastForward size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : repPhase === 'stimulus' && currentStimulus ? (
            /* =======================================================
               ACTIVE STIMULUS DISPLAY
               ======================================================= */
            <div className="w-full max-w-lg flex flex-col items-center justify-center gap-6">
              {/* Big Stimulus Visual */}
              {renderStimulusVisual()}

              {/* Live Clock Display (If enabled) */}
              {showLiveClock && (
                <div className="flex items-center gap-2 bg-zinc-950/80 px-4 py-2 rounded-2xl border border-zinc-800/80 font-mono">
                  <Clock size={16} className="text-[#D4AF37] animate-spin" />
                  <span className="text-2xl sm:text-3xl font-black text-white">
                    {(liveElapsedMs / 1000).toFixed(2)}s
                  </span>
                </div>
              )}

              {/* SPECIFIC INTERACTION INSTRUCTIONS / BUTTONS */}
              {interactionMode === 'SELECT_COLOR' ? (
                /* Interactive color targets on screen */
                <div 
                  className="w-full space-y-3 pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs font-black text-center text-zinc-400 uppercase tracking-widest">
                    👉 Toca el color correspondiente en pantalla:
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedColors.map((hex) => {
                      const name = getColorName(hex);
                      const isTarget = currentStimulus.type === 'COLOR' && (currentStimulus.value as string).toLowerCase() === hex.toLowerCase();
                      const isShaking = wrongSelectionShake === hex;

                      return (
                        <button
                          key={hex}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isTarget) {
                              handleTouchSuccess();
                            } else {
                              handleWrongColor(hex);
                            }
                          }}
                          className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
                            isShaking 
                              ? 'animate-bounce border-red-500 bg-red-950/50' 
                              : 'border-white/30 hover:border-white bg-zinc-900/90 shadow-xl'
                          }`}
                        >
                          <div 
                            className="w-12 h-12 rounded-full shadow-lg border-2 border-white/60" 
                            style={{ backgroundColor: hex }} 
                          />
                          <span className="text-xs font-black uppercase text-white tracking-wider">
                            {name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : interactionMode === 'CONE_RUN' ? (
                /* Cone Run Screen Touch Target banner */
                <div className="text-center space-y-2 mt-2">
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4AF37]/20 border border-[#D4AF37]/50 rounded-2xl text-[#D4AF37] font-black text-sm uppercase tracking-wider animate-pulse shadow-lg">
                    <Smartphone size={18} />
                    <span>¡Ve al platillo y toca la pantalla al volver!</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-medium">
                    Pulsa en cualquier parte de la pantalla para registrar el tiempo
                  </p>
                </div>
              ) : (
                /* Flash Reflex prompt */
                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest animate-pulse">
                  ¡Toca la pantalla ahora!
                </p>
              )}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="w-3 h-3 bg-[#D4AF37] rounded-full animate-ping" />
              <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.4em] animate-pulse">
                Atento a la señal...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Footer Info */}
      <footer className="p-4 sm:p-6 text-center z-20 border-t border-zinc-900 bg-black/80 backdrop-blur-md">
        <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.25em]">
          {interactionMode === 'CONE_RUN' 
            ? '🏃‍♂️ Carrera al Platillo • Toca al volver para ver tu tiempo' 
            : interactionMode === 'SELECT_COLOR'
              ? '🎯 Selección de Color • Pulsa el platillo correspondiente'
              : '⚡ Reflejo Flash • Velocidad de reacción ocular'}
        </p>
      </footer>
    </div>
  );
};

interface ConfigItemProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  step?: number;
  unit?: string;
  min?: number;
  icon?: React.ReactNode;
}

const ConfigItem = ({ label, value, onChange, step = 1, unit = '', min = 0.1, icon }: ConfigItemProps) => {
  return (
    <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider leading-none mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-mono font-black text-white">{value.toFixed(step < 1 ? 1 : 0)}</span>
            <span className="text-xs font-bold text-zinc-500">{unit}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl">
        <button 
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all active:scale-75 text-sm font-black"
        >
          -
        </button>
        <button 
          type="button"
          onClick={() => onChange(value + step)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all active:scale-75 text-sm font-black"
        >
          +
        </button>
      </div>
    </div>
  );
};
