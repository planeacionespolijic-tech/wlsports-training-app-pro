import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, CheckCircle2, FastForward, SkipBack, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CircuitExecutionScreenProps {
  // Can be passed via props or location state
  circuit?: any;
  workoutName?: string;
}

type Phase = 'PREPARE' | 'WORK' | 'REST' | 'ROUND_REST' | 'FINISHED';

export const CircuitExecutionScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Resolve circuit from state
  const circuit = location.state?.circuit;
  const workoutName = location.state?.workoutName || 'Circuito';

  if (!circuit) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <p className="text-zinc-500 mb-6 font-bold uppercase tracking-widest text-xs">Error: No se encontró la configuración del circuito</p>
        <button onClick={() => navigate(-1)} className="bg-[#D4AF37] text-black px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Volver</button>
      </div>
    );
  }

  // Execution State
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('PREPARE');
  const [timeLeft, setTimeLeft] = useState(10); 
  const [currentRound, setCurrentRound] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentExercise = useMemo(() => circuit.items[currentIndex], [circuit.items, currentIndex]);
  const nextExercise = useMemo(() => circuit.items[currentIndex + 1] || (currentRound < circuit.rounds ? circuit.items[0] : null), [circuit.items, currentIndex, currentRound]);

  const playBeep = (frequency = 440, duration = 0.1) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.error('Audio not supported', e);
    }
  };

  const speak = (text: string) => {
    if (!soundEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Initial welcome
    if (isActive && phase === 'PREPARE' && timeLeft === 10) {
      speak(`Iniciamos circuito: ${workoutName}. Primer ejercicio: ${currentExercise.name}. Prepárate.`);
    }
  }, [isActive, phase === 'PREPARE']);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        const nextTime = timeLeft - 1;
        setTimeLeft(nextTime);
        
        if (nextTime <= 3 && nextTime > 0) {
          playBeep(440, 0.05); 
          speak(String(nextTime));
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
      setTimeLeft(currentExercise.time);
      playBeep(880, 0.4);
      speak(`¡Vamos! ${currentExercise.name}`);
    } else if (phase === 'WORK') {
      const isLastInRound = currentIndex === circuit.items.length - 1;
      
      if (isLastInRound) {
        if (currentRound < circuit.rounds) {
          setPhase('ROUND_REST');
          setTimeLeft(circuit.restBetweenRounds || 60);
          playBeep(440, 0.4);
          speak(`Ronda ${currentRound} completada. Descanso largo. Próximo: ${circuit.items[0].name}`);
        } else {
          setPhase('FINISHED');
          setIsActive(false);
          playBeep(1200, 1.0);
          speak(`¡Circuito finalizado! Excelente trabajo.`);
        }
      } else {
        setPhase('REST');
        setTimeLeft(circuit.restBetweenExercises || 15);
        playBeep(440, 0.4);
        speak(`Descanso. Prepárate para: ${nextExercise?.name}`);
      }
    } else if (phase === 'REST') {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setPhase('WORK');
      setTimeLeft(circuit.items[nextIdx].time);
      playBeep(880, 0.4);
      speak(`¡Ya! ${circuit.items[nextIdx].name}`);
    } else if (phase === 'ROUND_REST') {
      setCurrentRound(prev => prev + 1);
      setCurrentIndex(0);
      setPhase('WORK');
      setTimeLeft(circuit.items[0].time);
      playBeep(880, 0.4);
      speak(`¡Empezamos ronda ${currentRound + 1}! ${circuit.items[0].name}`);
    }
  };

  const getPhaseData = () => {
    switch (phase) {
      case 'PREPARE': return { color: '#F59E0B', label: 'PREPARACIÓN', gradient: 'from-amber-500/20' };
      case 'WORK': return { color: '#10B981', label: 'TRABAJO', gradient: 'from-emerald-500/20' };
      case 'REST': return { color: '#EF4444', label: 'DESCANSO', gradient: 'from-red-500/20' };
      case 'ROUND_REST': return { color: '#3B82F6', label: 'DESCANSO RONDA', gradient: 'from-blue-500/20' };
      case 'FINISHED': return { color: '#D4AF37', label: '¡FINALIZADO!', gradient: 'from-[#D4AF37]/20' };
      default: return { color: '#27272a', label: '', gradient: '' };
    }
  };

  const { color, label, gradient } = getPhaseData();

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans">
      <div className={`absolute inset-0 bg-gradient-to-b ${gradient} to-black transition-colors duration-700`} />
      
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full blur-[120px] opacity-20" style={{ backgroundColor: color }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full blur-[120px] opacity-20" style={{ backgroundColor: color }} />

      <header className="relative p-6 flex items-center justify-between z-10">
        <button 
          onClick={() => {
            if (isActive) {
               if(window.confirm('¿Deseas detener el circuito?')) navigate(-1);
            } else {
               navigate(-1);
            }
          }}
          className="w-12 h-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all font-black text-xs"
        >
          SALIR
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">{workoutName}</p>
          <div className="flex gap-4">
             <div className="text-right">
               <p className="text-[8px] font-black text-zinc-500 uppercase">Ronda</p>
               <p className="text-sm font-black text-white">{currentRound} de {circuit.rounds}</p>
             </div>
             <div className="text-right">
               <p className="text-[8px] font-black text-zinc-500 uppercase">Ejercicio</p>
               <p className="text-sm font-black text-white">{currentIndex + 1} de {circuit.items.length}</p>
             </div>
          </div>
        </div>
      </header>

      <main className="relative flex-1 flex flex-col items-center justify-center p-8 text-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div 
              className="px-6 py-2 rounded-full border text-[10px] font-black tracking-[0.3em] uppercase mb-8"
              style={{ borderColor: `${color}44`, color: color, backgroundColor: `${color}11` }}
            >
              {label}
            </div>

            <div className="space-y-2 mb-12">
               <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white">
                 {phase === 'ROUND_REST' ? 'Descanso Largo' : currentExercise.name}
               </h2>
               {nextExercise && (phase === 'REST' || phase === 'PREPARE' || phase === 'ROUND_REST') && (
                 <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
                   PRÓXIMO: {nextExercise.name}
                 </p>
               )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative mb-12">
          <motion.div 
            key={timeLeft}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-[12rem] md:text-[18rem] font-black leading-none tracking-tighter drop-shadow-[0_0_60px_rgba(255,255,255,0.1)] ${timeLeft <= 3 ? 'text-red-500 scale-110' : 'text-white'}`}
          >
            {timeLeft}
          </motion.div>
        </div>

        {phase === 'FINISHED' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <CheckCircle2 size={120} className="text-[#D4AF37]" strokeWidth={1} />
            <p className="text-[#D4AF37] font-black uppercase tracking-[0.3em]">Sesión Completada</p>
          </motion.div>
        )}
      </main>

      <footer className="relative p-12 flex flex-col items-center gap-8 z-10">
        <div className="flex items-center gap-8">
           <button 
             onClick={() => {
                const prevIdx = currentIndex - 1;
                if (prevIdx >= 0) {
                  setCurrentIndex(prevIdx);
                  setTimeLeft(circuit.items[prevIdx].time);
                  setPhase('WORK');
                }
             }}
             disabled={currentIndex === 0 || phase === 'FINISHED'}
             className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white disabled:opacity-20"
           >
             <SkipBack size={24} />
           </button>

           <button 
             onClick={() => setIsActive(!isActive)}
             className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-2xl ${isActive ? 'bg-zinc-800 text-white' : 'bg-white text-black'}`}
           >
             {isActive ? <Pause size={40} fill="currentColor" /> : <Play size={40} fill="currentColor" className="ml-1" />}
           </button>

           <button 
             onClick={() => {
                const nextIdx = currentIndex + 1;
                if (nextIdx < circuit.items.length) {
                  setCurrentIndex(nextIdx);
                  setTimeLeft(circuit.items[nextIdx].time);
                  setPhase('WORK');
                }
             }}
             disabled={currentIndex === circuit.items.length - 1 || phase === 'FINISHED'}
             className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white disabled:opacity-20"
           >
             <FastForward size={24} />
           </button>
        </div>

        <div className="flex gap-4">
           <button 
             onClick={() => setSoundEnabled(!soundEnabled)}
             className={`p-4 rounded-2xl border transition-all ${soundEnabled ? 'bg-white/10 border-white/10 text-white' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}
           >
             {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
           </button>
           <button 
             onClick={() => {
                setIsActive(false);
                setPhase('PREPARE');
                setTimeLeft(10);
                setCurrentRound(1);
                setCurrentIndex(0);
                window.speechSynthesis.cancel();
             }}
             className="p-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-500"
           >
             <RotateCcw size={20} />
           </button>
        </div>
      </footer>
    </div>
  );
};
