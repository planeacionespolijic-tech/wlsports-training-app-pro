import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Settings, Zap, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight, Palette, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReactionScreenProps {
  onBack: () => void;
  userId: string;
}

type StimulusType = 'COLOR' | 'DIRECTION';
type StimulusValue = string; // Color hex or Direction key

interface Stimulus {
  type: StimulusType;
  value: StimulusValue;
  id: number;
}

export const ReactionScreen = ({ onBack, userId }: ReactionScreenProps) => {
  // Configuration
  const [visibleTime, setVisibleTime] = useState(1.0); // seconds
  const [intervalTime, setIntervalTime] = useState(2.0); // seconds
  const [reps, setReps] = useState(10);
  const [isRandom, setIsRandom] = useState(true);
  const [selectedColors, setSelectedColors] = useState<string[]>(['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#F97316']);
  const [selectedDirections, setSelectedDirections] = useState<string[]>(['UP', 'DOWN', 'LEFT', 'RIGHT']);
  const [mode, setMode] = useState<'COLORS' | 'DIRECTIONS' | 'BOTH'>('COLORS');

  // Execution State
  const [isActive, setIsActive] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [currentRep, setCurrentRep] = useState(0);
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null);
  const [isStimulusVisible, setIsStimulusVisible] = useState(false);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

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

  const colors = [
    { name: 'Azul', hex: '#3B82F6' },
    { name: 'Rojo', hex: '#EF4444' },
    { name: 'Verde', hex: '#10B981' },
    { name: 'Amarillo', hex: '#F59E0B' },
    { name: 'Naranja', hex: '#F97316' },
  ];

  const directions = [
    { key: 'UP', icon: ArrowUp, label: 'Arriba' },
    { key: 'DOWN', icon: ArrowDown, label: 'Abajo' },
    { key: 'LEFT', icon: ArrowLeftIcon, label: 'Izquierda' },
    { key: 'RIGHT', icon: ArrowRight, label: 'Derecha' },
    { key: 'UP_LEFT', icon: ArrowUpLeft, label: 'Diag. Arriba Izq.' },
    { key: 'UP_RIGHT', icon: ArrowUpRight, label: 'Diag. Arriba Der.' },
    { key: 'DOWN_LEFT', icon: ArrowDownLeft, label: 'Diag. Abajo Izq.' },
    { key: 'DOWN_RIGHT', icon: ArrowDownRight, label: 'Diag. Abajo Der.' },
  ];

  const generateNextStimulus = useCallback(() => {
    const availableTypes: StimulusType[] = [];
    if (mode === 'COLORS' || mode === 'BOTH') availableTypes.push('COLOR');
    if (mode === 'DIRECTIONS' || mode === 'BOTH') availableTypes.push('DIRECTION');

    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    let value = '';

    if (type === 'COLOR') {
      value = selectedColors[Math.floor(Math.random() * selectedColors.length)];
    } else {
      value = selectedDirections[Math.floor(Math.random() * selectedDirections.length)];
    }

    return { type, value, id: Date.now() };
  }, [mode, selectedColors, selectedDirections]);

  const startTraining = () => {
    setIsConfiguring(false);
    setIsActive(true);
    setCurrentRep(0);
    setReactionTimes([]);
    setIsFinished(false);
    scheduleNextStimulus(intervalTime * 1000);
  };

  const scheduleNextStimulus = (delay: number) => {
    timerRef.current = setTimeout(() => {
      const nextStim = generateNextStimulus();
      setCurrentStimulus(nextStim);
      setIsStimulusVisible(true);
      playBeep(660, 0.1); // Beep when stimulus appears
      setStartTime(Date.now());
      setCurrentRep((prev) => prev + 1);

      // Hide stimulus after visibleTime
      setTimeout(() => {
        setIsStimulusVisible(false);
        setStartTime(null);
        
        if (currentRep + 1 < reps) {
          scheduleNextStimulus(intervalTime * 1000);
        } else {
          setTimeout(() => {
            setIsFinished(true);
            setIsActive(false);
          }, intervalTime * 1000);
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
    }
  };

  const reset = () => {
    setIsActive(false);
    setIsConfiguring(true);
    setIsFinished(false);
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
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full h-full rounded-full shadow-2xl"
          style={{ backgroundColor: currentStimulus.value }}
        />
      );
    } else {
      const dir = directions.find(d => d.key === currentStimulus.value);
      const Icon = dir?.icon || ArrowUp;
      return (
        <motion.div 
          initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          className="w-full h-full flex items-center justify-center text-white"
        >
          <Icon size={300} strokeWidth={3} />
        </motion.div>
      );
    }
  };

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <header className="p-4 border-b border-zinc-800 flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Reacción Visual</h1>
        </header>

        <main className="flex-1 p-6 space-y-8 overflow-y-auto">
          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Modo de Estímulo</h2>
            <div className="grid grid-cols-3 gap-2">
              {['COLORS', 'DIRECTIONS', 'BOTH'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m as any)}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${mode === m ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
                >
                  {m === 'COLORS' ? 'Colores' : m === 'DIRECTIONS' ? 'Flechas' : 'Mixto'}
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ConfigItem label="Tiempo Visible" value={visibleTime} onChange={setVisibleTime} step={0.1} unit="s" />
            <ConfigItem label="Intervalo" value={intervalTime} onChange={setIntervalTime} step={0.1} unit="s" />
            <ConfigItem label="Repeticiones" value={reps} onChange={setReps} step={1} min={1} />
          </div>

          {(mode === 'COLORS' || mode === 'BOTH') && (
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Palette size={14} /> Colores Activos
              </h2>
              <div className="flex flex-wrap gap-3">
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
                    className={`w-12 h-12 rounded-full border-4 transition-all ${selectedColors.includes(c.hex) ? 'scale-110 border-white' : 'border-transparent opacity-40'}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </section>
          )}

          {(mode === 'DIRECTIONS' || mode === 'BOTH') && (
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Move size={14} /> Direcciones Activas
              </h2>
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
                    className={`aspect-square rounded-xl border flex items-center justify-center transition-all ${selectedDirections.includes(d.key) ? 'bg-zinc-800 border-[#D4AF37] text-[#D4AF37]' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                  >
                    <d.icon size={24} />
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="pt-8">
            <button 
              onClick={startTraining}
              className="w-full bg-[#D4AF37] text-black font-black py-5 rounded-3xl flex items-center justify-center gap-3 text-xl shadow-2xl shadow-[#D4AF37]/20 active:scale-95 transition-transform"
            >
              <Play fill="black" size={24} />
              INICIAR SESIÓN
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (isFinished) {
    const avgReaction = reactionTimes.length > 0 
      ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(0)
      : 'N/A';

    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
        <Zap size={64} className="text-[#D4AF37] mb-6" />
        <h2 className="text-4xl font-black mb-2 tracking-tighter">SESIÓN FINALIZADA</h2>
        <p className="text-zinc-500 uppercase tracking-widest text-xs mb-12">Resumen de Rendimiento</p>
        
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-12">
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Reacciones</p>
            <p className="text-3xl font-black text-white">{reactionTimes.length}/{reps}</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Promedio</p>
            <p className="text-3xl font-black text-[#D4AF37]">{avgReaction}ms</p>
          </div>
        </div>

        <button 
          onClick={reset}
          className="w-full max-w-md bg-white text-black font-black py-5 rounded-3xl text-xl active:scale-95 transition-transform"
        >
          NUEVA SESIÓN
        </button>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-black flex flex-col cursor-pointer select-none"
      onClick={handleReaction}
    >
      <header className="p-6 flex items-center justify-between z-10">
        <button 
          onClick={reset}
          className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-right">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Progreso</p>
          <p className="text-xl font-black text-white">{currentRep}/{reps}</p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-12 relative">
        <AnimatePresence mode="wait">
          {isStimulusVisible && (
            <motion.div
              key={currentStimulus?.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="w-full max-w-lg aspect-square"
            >
              {renderStimulus()}
            </motion.div>
          )}
        </AnimatePresence>

        {!isStimulusVisible && !isFinished && (
          <div className="text-zinc-800 flex flex-col items-center gap-4">
            <Zap size={48} className="animate-pulse" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Esperando estímulo...</p>
          </div>
        )}
      </main>

      <footer className="p-12 text-center z-10">
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Toca la pantalla al ver el estímulo</p>
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
}

const ConfigItem = ({ label, value, onChange, step = 1, unit = '', min = 0.1 }: ConfigItemProps) => {
  return (
    <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-white">{value.toFixed(step < 1 ? 1 : 0)}{unit}</p>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-xl font-bold hover:bg-zinc-700 active:scale-90 transition-all"
        >
          -
        </button>
        <button 
          onClick={() => onChange(value + step)}
          className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-xl font-bold hover:bg-zinc-700 active:scale-90 transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
};
