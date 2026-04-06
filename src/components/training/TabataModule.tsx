import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Settings, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TabataModuleProps {
  onClose: () => void;
}

type TimerState = 'IDLE' | 'PREPARE' | 'WORK' | 'REST' | 'BLOCK_REST' | 'FINISHED';

export const TabataModule = ({ onClose }: TabataModuleProps) => {
  // Configuration
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [blocks, setBlocks] = useState(1);
  const [blockRest, setBlockRest] = useState(60);
  const [showSettings, setShowSettings] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Execution State
  const [timerState, setTimerState] = useState<TimerState>('IDLE');
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentBlock, setCurrentBlock] = useState(1);
  const [isActive, setIsActive] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (frequency: number, duration: number) => {
    if (!soundEnabled) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const startTimer = () => {
    setShowSettings(false);
    setTimerState('PREPARE');
    setTimeLeft(5);
    setIsActive(true);
    setCurrentRound(1);
    setCurrentBlock(1);
  };

  const togglePause = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimerState('IDLE');
    setTimeLeft(0);
    setShowSettings(true);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        if (timeLeft <= 3 && timeLeft > 0) {
          playSound(440, 0.1); // Low beep for countdown
        }
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // Transition logic
      if (timerState === 'PREPARE') {
        playSound(880, 0.3); // High beep for start
        setTimerState('WORK');
        setTimeLeft(workTime);
      } else if (timerState === 'WORK') {
        if (currentRound < rounds) {
          playSound(440, 0.3); // Mid beep for rest
          setTimerState('REST');
          setTimeLeft(restTime);
        } else if (currentBlock < blocks) {
          playSound(440, 0.5); // Long beep for block rest
          setTimerState('BLOCK_REST');
          setTimeLeft(blockRest);
        } else {
          playSound(1200, 1); // Victory beep
          setTimerState('FINISHED');
          setIsActive(false);
        }
      } else if (timerState === 'REST') {
        playSound(880, 0.3);
        setTimerState('WORK');
        setTimeLeft(workTime);
        setCurrentRound((prev) => prev + 1);
      } else if (timerState === 'BLOCK_REST') {
        playSound(880, 0.3);
        setTimerState('WORK');
        setTimeLeft(workTime);
        setCurrentRound(1);
        setCurrentBlock((prev) => prev + 1);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, timerState]);

  const getBgColor = () => {
    switch (timerState) {
      case 'WORK': return 'bg-emerald-600';
      case 'REST': return 'bg-rose-600';
      case 'BLOCK_REST': return 'bg-amber-600';
      case 'PREPARE': return 'bg-blue-600';
      case 'FINISHED': return 'bg-purple-600';
      default: return 'bg-zinc-950';
    }
  };

  const getStatusText = () => {
    switch (timerState) {
      case 'WORK': return '¡TRABAJA!';
      case 'REST': return 'DESCANSA';
      case 'BLOCK_REST': return 'DESCANSO BLOQUE';
      case 'PREPARE': return 'PREPÁRATE';
      case 'FINISHED': return '¡TERMINADO!';
      default: return 'TABATA';
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col transition-colors duration-500 ${getBgColor()}`}>
      <header className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={28} />
          </button>
          <h2 className="text-xl font-black uppercase tracking-widest">Tabata Pro</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
          {!isActive && timerState !== 'IDLE' && (
            <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Settings size={24} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-black/40 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Trabajo (s)</label>
                  <input type="number" value={workTime} onChange={e => setWorkTime(Number(e.target.value))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-xl font-black outline-none focus:border-white/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Descanso (s)</label>
                  <input type="number" value={restTime} onChange={e => setRestTime(Number(e.target.value))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-xl font-black outline-none focus:border-white/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Rondas</label>
                  <input type="number" value={rounds} onChange={e => setRounds(Number(e.target.value))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-xl font-black outline-none focus:border-white/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Bloques</label>
                  <input type="number" value={blocks} onChange={e => setBlocks(Number(e.target.value))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-xl font-black outline-none focus:border-white/40" />
                </div>
              </div>
              {blocks > 1 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Descanso entre Bloques (s)</label>
                  <input type="number" value={blockRest} onChange={e => setBlockRest(Number(e.target.value))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-xl font-black outline-none focus:border-white/40" />
                </div>
              )}
              <button 
                onClick={startTimer}
                className="w-full bg-white text-black py-6 rounded-3xl font-black text-xl uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Comenzar
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key={timerState}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <p className="text-2xl font-black uppercase tracking-[0.3em] opacity-80">{getStatusText()}</p>
              <h1 className="text-[12rem] font-black leading-none tracking-tighter tabular-nums">
                {timeLeft}
              </h1>
              <div className="flex items-center justify-center gap-8 text-xl font-black uppercase tracking-widest opacity-60">
                <p>Ronda {currentRound}/{rounds}</p>
                {blocks > 1 && <p>Bloque {currentBlock}/{blocks}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!showSettings && (
        <footer className="p-12 flex justify-center gap-6 bg-black/20 backdrop-blur-sm">
          <button 
            onClick={resetTimer}
            className="p-6 bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <RotateCcw size={32} />
          </button>
          <button 
            onClick={togglePause}
            className="p-8 bg-white text-black rounded-full hover:scale-110 transition-all shadow-2xl"
          >
            {isActive ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" />}
          </button>
        </footer>
      )}
    </div>
  );
};
