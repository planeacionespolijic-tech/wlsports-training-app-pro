import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, RotateCcw, Zap, ArrowUp, ArrowDown, 
  ArrowLeft as ArrowLeftIcon, ArrowRight, ArrowUpLeft, ArrowUpRight, 
  ArrowDownLeft, ArrowDownRight, Palette, Move, Hash, Timer, Target, Volume2, VolumeX 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReactionScreenProps {
  onBack?: () => void;
  userId?: string;
}

type StimulusType = 'COLOR' | 'DIRECTION' | 'NUMBER';
type StimulusValue = string | number;

interface Stimulus {
  type: StimulusType;
  value: StimulusValue;
  id: number;
}

export const ReactionScreen = ({ onBack, userId }: ReactionScreenProps) => {
  const navigate = useNavigate();
  // Configuration
  const [visibleTime, setVisibleTime] = useState(0.8);
  const [intervalTime, setIntervalTime] = useState(1.5);
  const [reps, setReps] = useState(10);
  const [mode, setMode] = useState<'COLORS' | 'DIRECTIONS' | 'NUMBERS' | 'MIXED'>('COLORS');
  const [selectedColors, setSelectedColors] = useState<string[]>(['#3B82F6', '#EF4444', '#10B981', '#F59E0B']);
  const [selectedDirections, setSelectedDirections] = useState<string[]>(['UP', 'DOWN', 'LEFT', 'RIGHT']);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([1, 2, 3, 4, 5]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Execution State
  const [isActive, setIsActive] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [currentRep, setCurrentRep] = useState(0);
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null);
  const [isStimulusVisible, setIsStimulusVisible] = useState(false);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const speak = (text: string) => {
    if (!soundEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.3;
    window.speechSynthesis.speak(utterance);
  };

  const playBeep = (frequency = 660, duration = 0.1) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.error('Audio not supported', e);
    }
  };

  const colors = [
    { hex: '#3B82F6' }, { hex: '#EF4444' }, { hex: '#10B981' }, 
    { hex: '#F59E0B' }, { hex: '#F97316' }, { hex: '#8B5CF6' }
  ];

  const directions = [
    { key: 'UP', icon: ArrowUp }, { key: 'DOWN', icon: ArrowDown },
    { key: 'LEFT', icon: ArrowLeftIcon }, { key: 'RIGHT', icon: ArrowRight },
    { key: 'UP_LEFT', icon: ArrowUpLeft }, { key: 'UP_RIGHT', icon: ArrowUpRight },
    { key: 'DOWN_LEFT', icon: ArrowDownLeft }, { key: 'DOWN_RIGHT', icon: ArrowDownRight },
  ];

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const generateNextStimulus = useCallback(() => {
    const availableTypes: StimulusType[] = [];
    if (mode === 'COLORS' || mode === 'MIXED') availableTypes.push('COLOR');
    if (mode === 'DIRECTIONS' || mode === 'MIXED') availableTypes.push('DIRECTION');
    if (mode === 'NUMBERS' || mode === 'MIXED') availableTypes.push('NUMBER');

    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    let value: StimulusValue = '';

    if (type === 'COLOR') {
      value = selectedColors[Math.floor(Math.random() * selectedColors.length)];
    } else if (type === 'DIRECTION') {
      value = selectedDirections[Math.floor(Math.random() * selectedDirections.length)];
    } else {
      value = selectedNumbers[Math.floor(Math.random() * selectedNumbers.length)];
    }

    return { type, value, id: Date.now() };
  }, [mode, selectedColors, selectedDirections, selectedNumbers]);

  const startTraining = () => {
    setIsConfiguring(false);
    setIsActive(true);
    setCurrentRep(0);
    setReactionTimes([]);
    setIsFinished(false);
    setCountdown(5);
    speak("5");
    
    const cdInterval = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        if (next > 0) {
          speak(String(next));
          return next;
        }
        clearInterval(cdInterval);
        scheduleNextStimulus(500);
        return 0;
      });
    }, 1000);
  };

  const scheduleNextStimulus = (delay: number) => {
    timerRef.current = setTimeout(() => {
      const nextStim = generateNextStimulus();
      setCurrentStimulus(nextStim);
      setIsStimulusVisible(true);
      playBeep(880, 0.05); 
      setStartTime(Date.now());
      setCurrentRep((prev) => prev + 1);

      setTimeout(() => {
        setIsStimulusVisible(false);
        setStartTime(null);
        
        if (currentRep + 1 < reps) {
          scheduleNextStimulus(intervalTime * 1000);
        } else {
          setTimeout(() => {
            setIsFinished(true);
            setIsActive(false);
          }, 1000);
        }
      }, visibleTime * 1000);
    }, delay);
  };

  const handleReaction = () => {
    if (isStimulusVisible && startTime) {
      const reactionTime = Date.now() - startTime;
      setReactionTimes((prev) => [...prev, reactionTime]);
      setIsStimulusVisible(false);
      setStartTime(null);
      playBeep(440, 0.05);
    }
  };

  const reset = () => {
    setIsActive(false);
    setIsConfiguring(true);
    setIsFinished(false);
    setCountdown(0);
    window.speechSynthesis.cancel();
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const renderStimulus = () => {
    if (!currentStimulus || !isStimulusVisible) return null;

    if (currentStimulus.type === 'COLOR') {
      return (
        <motion.div 
          className="w-full aspect-square rounded-full shadow-[0_0_80px_rgba(255,255,255,0.1)]"
          style={{ backgroundColor: currentStimulus.value as string }}
        />
      );
    } else if (currentStimulus.type === 'DIRECTION') {
      const dir = directions.find(d => d.key === currentStimulus.value);
      const Icon = dir?.icon || ArrowUp;
      return (
        <div className="w-full aspect-square flex items-center justify-center text-white">
          <Icon size={280} strokeWidth={3} />
        </div>
      );
    } else {
      return (
        <div className="w-full aspect-square flex items-center justify-center text-white">
          <span className="text-[20rem] font-black italic tracking-tighter drop-shadow-2xl">
            {currentStimulus.value}
          </span>
        </div>
      );
    }
  };

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  if (isConfiguring) {
    return (
      <div className="h-full bg-black text-white flex flex-col font-sans">
        <header className="p-6 border-b border-zinc-900 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-black uppercase tracking-tighter">Neuro Reacción</h1>
          </div>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-2xl transition-all ${soundEnabled ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-zinc-900 text-zinc-600'}`}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </header>

        <main className="flex-1 p-6 space-y-8 overflow-y-auto pb-12">
          <section className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Selecciona el modo</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'COLORS', label: 'Colores', icon: Palette },
                { id: 'DIRECTIONS', label: 'Flechas', icon: Move },
                { id: 'NUMBERS', label: 'Números', icon: Hash },
                { id: 'MIXED', label: 'Mixto', icon: Zap },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`flex flex-col items-center justify-center py-4 rounded-3xl border transition-all gap-2 ${mode === m.id ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-zinc-900/50 text-zinc-500 border-zinc-800'}`}
                >
                  <m.icon size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{m.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4">
            <ConfigItem label="Tiempo Visible" value={visibleTime} onChange={setVisibleTime} step={0.1} unit="s" icon={<Timer size={18} className="text-emerald-500" />} />
            <ConfigItem label="Intervalo" value={intervalTime} onChange={setIntervalTime} step={0.1} unit="s" icon={<Target size={18} className="text-red-500" />} />
            <ConfigItem label="Repeticiones" value={reps} onChange={setReps} step={5} min={5} icon={<Zap size={18} className="text-amber-500" />} />
          </div>

          {(mode === 'COLORS' || mode === 'MIXED') && (
            <section className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-zinc-800/50 space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Colores Activos</h2>
              <div className="flex flex-wrap gap-4 justify-center">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      if (selectedColors.includes(c.hex)) {
                        if (selectedColors.length > 1) setSelectedColors(prev => prev.filter(h => h !== c.hex));
                      } else {
                        setSelectedColors(prev => [...prev, c.hex]);
                      }
                    }}
                    className={`w-12 h-12 rounded-2xl border-2 transition-all ${selectedColors.includes(c.hex) ? 'scale-110 border-white ring-4 ring-white/10' : 'border-transparent opacity-20'}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </section>
          )}

          {(mode === 'DIRECTIONS' || mode === 'MIXED') && (
            <section className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-zinc-800/50 space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Direcciones Activas</h2>
              <div className="grid grid-cols-4 gap-3">
                {directions.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => {
                      if (selectedDirections.includes(d.key)) {
                        if (selectedDirections.length > 1) setSelectedDirections(prev => prev.filter(k => k !== d.key));
                      } else {
                        setSelectedDirections(prev => [...prev, d.key]);
                      }
                    }}
                    className={`aspect-square rounded-2xl border flex items-center justify-center transition-all ${selectedDirections.includes(d.key) ? 'bg-zinc-800 border-[#D4AF37] text-[#D4AF37] shadow-lg shadow-[#D4AF37]/5' : 'bg-black border-zinc-800 text-zinc-600'}`}
                  >
                    <d.icon size={20} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {(mode === 'NUMBERS' || mode === 'MIXED') && (
            <section className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-zinc-800/50 space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Números Activos</h2>
              <div className="grid grid-cols-5 gap-3">
                {numbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      if (selectedNumbers.includes(n)) {
                        if (selectedNumbers.length > 1) setSelectedNumbers(prev => prev.filter(val => val !== n));
                      } else {
                        setSelectedNumbers(prev => [...prev, n]);
                      }
                    }}
                    className={`aspect-square rounded-2xl border flex items-center justify-center font-black transition-all ${selectedNumbers.includes(n) ? 'bg-zinc-800 border-[#D4AF37] text-[#D4AF37]' : 'bg-black border-zinc-800 text-zinc-600'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>

        <footer className="p-8">
          <button 
            onClick={startTraining}
            className="w-full bg-[#D4AF37] text-black font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 text-lg shadow-2xl active:scale-95 transition-all uppercase tracking-[0.2em]"
          >
            <Play fill="black" size={20} />
            Empezar Sesión
          </button>
        </footer>
      </div>
    );
  }

  if (isFinished) {
    const avgReaction = reactionTimes.length > 0 
      ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(0)
      : '---';

    return (
      <div className="h-full bg-black text-white flex flex-col items-center justify-center p-8 text-center font-sans overflow-hidden">
        {/* Result Background Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#D4AF3715_0%,transparent_60%)]" />
        
        <div className="relative z-10 space-y-12 w-full max-w-sm">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-[#D4AF37]/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-[#D4AF37]">
              <Target size={40} />
            </div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase">Sesión Terminada</h2>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.4em]">Análisis de Rendimiento</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-sm flex justify-between items-center px-12">
              <div className="text-left">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Reacciones</p>
                <p className="text-4xl font-black text-white">{reactionTimes.length}/{reps}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Promedio</p>
                <p className="text-4xl font-black text-[#D4AF37]">{avgReaction}<span className="text-sm">ms</span></p>
              </div>
            </div>
          </div>

          <button 
            onClick={reset}
            className="w-full bg-white text-black font-black py-6 rounded-[2rem] text-lg active:scale-95 transition-all shadow-2xl uppercase tracking-[0.2em]"
          >
            Volver a Jugar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full bg-black flex flex-col cursor-pointer select-none overflow-hidden relative"
      onClick={handleReaction}
    >
      <header className="relative p-8 flex items-center justify-between z-20">
        <button 
          onClick={reset}
          className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Progreso</p>
          <p className="text-3xl font-mono font-black text-white">{currentRep}<span className="text-sm opacity-20">/{reps}</span></p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8 relative z-10">
        <AnimatePresence mode="wait">
          {countdown > 0 ? (
            <motion.div
              key="countdown"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <span className="text-[12rem] font-mono font-black text-[#D4AF37] leading-none">
                {countdown}
              </span>
              <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.4em]">Preparado...</p>
            </motion.div>
          ) : isStimulusVisible ? (
            <motion.div
              key={currentStimulus?.id}
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 1.2, opacity: 0, filter: 'blur(10px)' }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-xs md:max-w-md"
            >
              {renderStimulus()}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full animate-ping" />
              <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.5em] animate-pulse">Atento...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative p-12 text-center z-20">
        <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em]">Toca la pantalla al reaccionar</p>
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
    <div className="bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-white">{value.toFixed(step < 1 ? 1 : 0)}</span>
            <span className="text-xs font-bold text-zinc-600">{unit}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 bg-black p-1 rounded-2xl">
        <button 
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-800 hover:text-white transition-all active:scale-75"
        >
          -
        </button>
        <button 
          onClick={() => onChange(value + step)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-800 hover:text-white transition-all active:scale-75"
        >
          +
        </button>
      </div>
    </div>
  );
};
