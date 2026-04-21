import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Settings, CheckCircle2, Timer, Layers, Repeat, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TabataScreenProps {
  onBack?: () => void;
  userId?: string;
}

type Phase = 'PREPARE' | 'WORK' | 'REST' | 'BLOCK_REST' | 'FINISHED';

export const TabataScreen = ({ onBack, userId }: TabataScreenProps) => {
  const navigate = useNavigate();
  
  // Configuration
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [blocks, setBlocks] = useState(1);
  const [blockRest, setBlockRest] = useState(60);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Execution State
  const [isActive, setIsActive] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [phase, setPhase] = useState<Phase>('PREPARE');
  const [timeLeft, setTimeLeft] = useState(10); 
  const [currentRound, setCurrentRound] = useState(1);
  const [currentBlock, setCurrentBlock] = useState(1);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const playBeep = (frequency = 440, duration = 0.1) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'square'; // More technical sound
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.error('Audio not supported', e);
    }
  };

  const speak = (text: string) => {
    if (!soundEnabled) return;
    // Cancel any previous speech to avoid overlapping in fast countdowns
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.3;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const startTimer = () => {
    setIsConfiguring(false);
    setIsActive(true);
    setPhase('PREPARE');
    setTimeLeft(10);
    setCurrentRound(1);
    setCurrentBlock(1);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsConfiguring(true);
    setPhase('PREPARE');
    window.speechSynthesis.cancel();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const togglePause = () => {
    setIsActive(!isActive);
    if (isActive) window.speechSynthesis.cancel();
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        const nextTime = timeLeft - 1;
        setTimeLeft(nextTime);
        
        if (nextTime <= 5 && nextTime > 0) {
          speak(String(nextTime));
          playBeep(440, 0.05); 
        } else if (nextTime === 0) {
          // Transitions handle their own big beeps, but we can clear speech
          window.speechSynthesis.cancel();
        }
      }, 1000);
    } else if (timeLeft === 0) {
      handlePhaseTransition();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handlePhaseTransition = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (phase === 'PREPARE') {
      setPhase('WORK');
      setTimeLeft(workTime);
      playBeep(880, 0.4); 
    } else if (phase === 'WORK') {
      if (currentRound < rounds) {
        setPhase('REST');
        setTimeLeft(restTime);
        playBeep(440, 0.4); 
      } else {
        if (currentBlock < blocks) {
          setPhase('BLOCK_REST');
          setTimeLeft(blockRest);
          playBeep(440, 0.6);
        } else {
          setPhase('FINISHED');
          setIsActive(false);
          playBeep(1200, 1.0);
        }
      }
    } else if (phase === 'REST') {
      setPhase('WORK');
      setCurrentRound((prev) => prev + 1);
      setTimeLeft(workTime);
      playBeep(880, 0.4);
    } else if (phase === 'BLOCK_REST') {
      setPhase('WORK');
      setCurrentBlock((prev) => prev + 1);
      setCurrentRound(1);
      setTimeLeft(workTime);
      playBeep(880, 0.4);
    }
  };

  const getPhaseData = () => {
    switch (phase) {
      case 'PREPARE': return { color: '#F59E0B', label: 'PREPARACIÓN', gradient: 'from-amber-500/20' };
      case 'WORK': return { color: '#10B981', label: 'TRABAJO', gradient: 'from-emerald-500/20' };
      case 'REST': return { color: '#EF4444', label: 'DESCANSO', gradient: 'from-red-500/20' };
      case 'BLOCK_REST': return { color: '#3B82F6', label: 'DESCANSO LARGO', gradient: 'from-blue-500/20' };
      case 'FINISHED': return { color: '#D4AF37', label: '¡LOGRADO!', gradient: 'from-[#D4AF37]/20' };
      default: return { color: '#27272a', label: '', gradient: '' };
    }
  };

  const { color, label, gradient } = getPhaseData();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  if (isConfiguring) {
    return (
      <div className="h-full bg-black text-white flex flex-col font-sans">
        <header className="p-6 border-b border-zinc-900 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-black uppercase tracking-tighter">Tabata Pro</h1>
          </div>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-2xl transition-all ${soundEnabled ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-zinc-900 text-zinc-600'}`}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-y-auto pb-12">
          <div className="bg-zinc-900/40 rounded-[2.5rem] p-6 border border-zinc-800/50 backdrop-blur-sm">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 text-center">Configura tu entrenamiento</p>
            <div className="grid grid-cols-1 gap-4">
              <ConfigItem 
                label="Tiempo de Trabajo" 
                value={workTime} 
                onChange={setWorkTime} 
                icon={<Timer size={18} className="text-emerald-500" />} 
                unit="s"
                color="emerald"
              />
              <ConfigItem 
                label="Tiempo de Descanso" 
                value={restTime} 
                onChange={setRestTime} 
                icon={<Timer size={18} className="text-red-500" />} 
                unit="s"
                color="red"
              />
              <div className="grid grid-cols-2 gap-4">
                <ConfigItem 
                  label="Rondas" 
                  value={rounds} 
                  onChange={setRounds} 
                  icon={<Repeat size={18} className="text-amber-500" />} 
                  min={1}
                  color="amber"
                />
                <ConfigItem 
                  label="Bloques" 
                  value={blocks} 
                  onChange={setBlocks} 
                  icon={<Layers size={18} className="text-blue-500" />} 
                  min={1}
                  color="blue"
                />
              </div>
              {blocks > 1 && (
                <ConfigItem 
                  label="Descanso Bloque" 
                  value={blockRest} 
                  onChange={setBlockRest} 
                  icon={<Timer size={18} className="text-blue-400" />} 
                  unit="s"
                  color="blue"
                />
              )}
            </div>
          </div>

          <div className="bg-zinc-900/20 p-6 rounded-3xl border border-dashed border-zinc-800 flex justify-between items-center">
            <div className="text-left">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tiempo Estimado</p>
              <p className="text-xl font-mono text-zinc-300">
                {Math.floor(((workTime + restTime) * rounds * blocks + (blocks > 1 ? blockRest * (blocks - 1) : 0)) / 60)}m {((workTime + restTime) * rounds * blocks + (blocks > 1 ? blockRest * (blocks - 1) : 0)) % 60}s
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Total Series</p>
              <p className="text-xl font-mono text-zinc-300">{rounds * blocks}</p>
            </div>
          </div>
        </main>

        <footer className="p-8">
          <button 
            onClick={startTimer}
            className="w-full bg-white text-black font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 text-lg shadow-2xl active:scale-95 transition-all uppercase tracking-widest"
          >
            <Play fill="black" size={20} />
            Empezar Ahora
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className={`absolute inset-0 bg-gradient-to-b ${gradient} to-black transition-colors duration-700`} />
      
      {/* Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full blur-[120px] opacity-20" style={{ backgroundColor: color }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full blur-[120px] opacity-20" style={{ backgroundColor: color }} />

      <header className="relative p-8 flex items-center justify-between z-10">
        <button 
          onClick={resetTimer}
          className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right space-y-1">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Bloque {currentBlock}/{blocks}</p>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Ronda {currentRound}/{rounds}</p>
        </div>
      </header>

      <main className="relative flex-1 flex flex-col items-center justify-center p-8 text-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="mb-8"
          >
            <div 
              className="px-6 py-2 rounded-full border text-xs font-black tracking-[0.3em] uppercase mb-4"
              style={{ borderColor: `${color}44`, color: color, backgroundColor: `${color}11` }}
            >
              {label}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative group">
          {/* Circular Progress (Simplified CSS) */}
          <div className="absolute inset-[-40px] border-8 border-white/5 rounded-full" />
          
          <motion.div 
            key={timeLeft}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[10rem] md:text-[15rem] font-mono font-black text-white leading-none tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          >
            {timeLeft < 10 ? `0${timeLeft}` : timeLeft}
          </motion.div>

          {phase === 'FINISHED' && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <CheckCircle2 size={160} className="text-[#D4AF37]" strokeWidth={1} />
            </motion.div>
          )}
        </div>
      </main>

      <footer className="relative p-12 flex items-center justify-center gap-6 z-10">
        {phase !== 'FINISHED' ? (
          <>
            <button 
              onClick={togglePause}
              className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-xl shadow-white/10"
            >
              {isActive ? <Pause size={32} fill="black" /> : <Play size={32} fill="black" className="ml-1" />}
            </button>
            <button 
              onClick={resetTimer}
              className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-all"
            >
              <RotateCcw size={24} />
            </button>
          </>
        ) : (
          <button 
            onClick={resetTimer}
            className="px-12 py-6 bg-white text-black font-black rounded-3xl text-lg active:scale-95 transition-all uppercase tracking-widest shadow-xl"
          >
            Nueva Sesión
          </button>
        )}
      </footer>
    </div>
  );
};

interface ConfigItemProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  icon: React.ReactNode;
  unit?: string;
  min?: number;
  color: string;
}

const ConfigItem = ({ label, value, onChange, icon, unit = '', min = 1, color }: ConfigItemProps) => {
  return (
    <div className="bg-black/40 p-4 rounded-[1.5rem] border border-zinc-800 flex items-center justify-between group hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-white">{value}</span>
            <span className="text-xs font-bold text-zinc-600">{unit}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-2xl">
        <button 
          onClick={() => onChange(Math.max(min, value - (unit === 's' ? 5 : 1)))}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all active:scale-75"
        >
          -
        </button>
        <button 
          onClick={() => onChange(value + (unit === 's' ? 5 : 1))}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all active:scale-75"
        >
          +
        </button>
      </div>
    </div>
  );
};
