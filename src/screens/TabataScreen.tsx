import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Settings, CheckCircle2, Timer, Layers, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TabataScreenProps {
  onBack: () => void;
  userId: string;
}

type Phase = 'PREPARE' | 'WORK' | 'REST' | 'BLOCK_REST' | 'FINISHED';

export const TabataScreen = ({ onBack, userId }: TabataScreenProps) => {
  // Configuration
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [blocks, setBlocks] = useState(1);
  const [blockRest, setBlockRest] = useState(60);
  
  // Execution State
  const [isActive, setIsActive] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [phase, setPhase] = useState<Phase>('PREPARE');
  const [timeLeft, setTimeLeft] = useState(10); // 10s preparation
  const [currentRound, setCurrentRound] = useState(1);
  const [currentBlock, setCurrentBlock] = useState(1);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const playBeep = (frequency = 440, duration = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.error('Audio not supported', e);
    }
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
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const togglePause = () => {
    setIsActive(!isActive);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
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
      playBeep(880, 0.3); // High beep for work
    } else if (phase === 'WORK') {
      if (currentRound < rounds) {
        setPhase('REST');
        setTimeLeft(restTime);
        playBeep(440, 0.3); // Low beep for rest
      } else {
        // End of rounds in current block
        if (currentBlock < blocks) {
          setPhase('BLOCK_REST');
          setTimeLeft(blockRest);
          playBeep(440, 0.5);
        } else {
          setPhase('FINISHED');
          setIsActive(false);
          playBeep(1200, 0.8);
        }
      }
    } else if (phase === 'REST') {
      setPhase('WORK');
      setCurrentRound((prev) => prev + 1);
      setTimeLeft(workTime);
      playBeep(880, 0.3);
    } else if (phase === 'BLOCK_REST') {
      setPhase('WORK');
      setCurrentBlock((prev) => prev + 1);
      setCurrentRound(1);
      setTimeLeft(workTime);
      playBeep(880, 0.3);
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'PREPARE': return '#F59E0B'; // Amber
      case 'WORK': return '#10B981'; // Green
      case 'REST': return '#EF4444'; // Red
      case 'BLOCK_REST': return '#3B82F6'; // Blue
      case 'FINISHED': return '#D4AF37'; // Gold
      default: return '#27272a';
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'PREPARE': return 'PREPARACIÓN';
      case 'WORK': return 'TRABAJO';
      case 'REST': return 'DESCANSO';
      case 'BLOCK_REST': return 'DESCANSO BLOQUE';
      case 'FINISHED': return '¡COMPLETADO!';
      default: return '';
    }
  };

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <header className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Configuración Tabata</h1>
        </header>

        <main className="flex-1 p-6 space-y-8 overflow-y-auto">
          <div className="grid grid-cols-1 gap-6">
            <ConfigItem 
              label="Tiempo de Trabajo" 
              value={workTime} 
              onChange={setWorkTime} 
              icon={<Timer className="text-emerald-500" />} 
              unit="seg"
            />
            <ConfigItem 
              label="Tiempo de Descanso" 
              value={restTime} 
              onChange={setRestTime} 
              icon={<Timer className="text-red-500" />} 
              unit="seg"
            />
            <ConfigItem 
              label="Rondas" 
              value={rounds} 
              onChange={setRounds} 
              icon={<Repeat className="text-amber-500" />} 
              min={1}
            />
            <ConfigItem 
              label="Bloques" 
              value={blocks} 
              onChange={setBlocks} 
              icon={<Layers className="text-blue-500" />} 
              min={1}
            />
            {blocks > 1 && (
              <ConfigItem 
                label="Descanso entre Bloques" 
                value={blockRest} 
                onChange={setBlockRest} 
                icon={<Timer className="text-blue-400" />} 
                unit="seg"
              />
            )}
          </div>

          <div className="pt-8">
            <button 
              onClick={startTimer}
              className="w-full bg-[#D4AF37] text-black font-black py-5 rounded-3xl flex items-center justify-center gap-3 text-xl shadow-2xl shadow-[#D4AF37]/20 active:scale-95 transition-transform"
            >
              <Play fill="black" size={24} />
              INICIAR ENTRENAMIENTO
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col transition-colors duration-500"
      style={{ backgroundColor: getPhaseColor() }}
    >
      <header className="p-6 flex items-center justify-between">
        <button 
          onClick={resetTimer}
          className="p-3 bg-black/20 rounded-full text-white hover:bg-black/40 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col items-end">
          <span className="text-xs font-black text-black/60 uppercase tracking-widest">
            Bloque {currentBlock}/{blocks}
          </span>
          <span className="text-xs font-black text-black/60 uppercase tracking-widest">
            Ronda {currentRound}/{rounds}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="mb-4"
          >
            <h2 className="text-4xl md:text-6xl font-black text-black tracking-tighter">
              {getPhaseLabel()}
            </h2>
          </motion.div>
        </AnimatePresence>

        <motion.div 
          key={timeLeft}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-[12rem] md:text-[20rem] font-black text-white leading-none tracking-tighter drop-shadow-2xl"
        >
          {timeLeft}
        </motion.div>

        {phase === 'FINISHED' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-8"
          >
            <CheckCircle2 size={120} className="text-white" />
          </motion.div>
        )}
      </main>

      <footer className="p-12 flex items-center justify-center gap-8">
        {phase !== 'FINISHED' && (
          <>
            <button 
              onClick={togglePause}
              className="w-20 h-20 bg-black/20 rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-all active:scale-90"
            >
              {isActive ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
            </button>
            <button 
              onClick={resetTimer}
              className="w-20 h-20 bg-black/20 rounded-full flex items-center justify-center text-white hover:bg-black/40 transition-all active:scale-90"
            >
              <RotateCcw size={32} />
            </button>
          </>
        )}
        {phase === 'FINISHED' && (
          <button 
            onClick={resetTimer}
            className="px-12 py-5 bg-black text-white font-black rounded-3xl text-xl active:scale-95 transition-transform"
          >
            VOLVER A CONFIGURAR
          </button>
        )}
      </footer>
    </motion.div>
  );
};

interface ConfigItemProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  icon: React.ReactNode;
  unit?: string;
  min?: number;
}

const ConfigItem = ({ label, value, onChange, icon, unit = '', min = 5 }: ConfigItemProps) => {
  return (
    <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-black rounded-2xl">
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-black text-white">{value}{unit}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onChange(Math.max(min, value - (unit === 'seg' ? 5 : 1)))}
          className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl font-bold hover:bg-zinc-700 active:scale-90 transition-all"
        >
          -
        </button>
        <button 
          onClick={() => onChange(value + (unit === 'seg' ? 5 : 1))}
          className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl font-bold hover:bg-zinc-700 active:scale-90 transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
};
