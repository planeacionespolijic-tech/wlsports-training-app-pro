import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Settings, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ReactionModuleProps {
  onClose: () => void;
  userId?: string;
}

type StimulusType = 'COLOR' | 'DIRECTION';

interface Stimulus {
  type: StimulusType;
  value: string;
}

const COLORS = [
  { id: 'blue', value: 'bg-blue-600', label: 'Azul' },
  { id: 'red', value: 'bg-red-600', label: 'Rojo' },
  { id: 'green', value: 'bg-green-600', label: 'Verde' },
  { id: 'yellow', value: 'bg-yellow-400', label: 'Amarillo' },
  { id: 'orange', value: 'bg-orange-500', label: 'Naranja' },
];

const DIRECTIONS = [
  { id: 'up', icon: ArrowUp, label: 'Arriba' },
  { id: 'down', icon: ArrowDown, label: 'Abajo' },
  { id: 'left', icon: ArrowLeft, label: 'Izquierda' },
  { id: 'right', icon: ArrowRight, label: 'Derecha' },
  { id: 'up-left', icon: ArrowUpLeft, label: 'Diagonal Arriba-Izquierda' },
  { id: 'up-right', icon: ArrowUpRight, label: 'Diagonal Arriba-Derecha' },
  { id: 'down-left', icon: ArrowDownLeft, label: 'Diagonal Abajo-Izquierda' },
  { id: 'down-right', icon: ArrowDownRight, label: 'Diagonal Abajo-Derecha' },
];

export const ReactionModule = ({ onClose, userId }: ReactionModuleProps) => {
  // Configuration
  const [selectedColors, setSelectedColors] = useState<string[]>(['blue', 'red', 'green']);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);
  const [stimulusDuration, setStimulusDuration] = useState(1.5);
  const [intervalDuration, setIntervalDuration] = useState(1);
  const [repetitions, setRepetitions] = useState(10);
  const [randomMode, setRandomMode] = useState(true);
  const [showSettings, setShowSettings] = useState(true);

  // Execution State
  const [isActive, setIsActive] = useState(false);
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null);
  const [currentRep, setCurrentRep] = useState(0);
  const [isStimulusVisible, setIsStimulusVisible] = useState(false);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const saveResults = async () => {
    if (!userId || reactionTimes.length === 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'reactionTests'), {
        userId,
        date: new Date().toISOString(),
        repetitions,
        average: Number((reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(0)),
        best: Math.min(...reactionTimes),
        reactionTimes,
        createdAt: serverTimestamp(),
      });
      alert('Resultados guardados correctamente');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reactionTests');
    } finally {
      setSaving(false);
    }
  };

  const startTraining = () => {
    if (selectedColors.length === 0 && selectedDirections.length === 0) {
      alert('Selecciona al menos un color o dirección');
      return;
    }
    setShowSettings(false);
    setIsActive(true);
    setCurrentRep(0);
    setReactionTimes([]);
    nextStimulus();
  };

  const handleReaction = () => {
    if (isStimulusVisible && startTime > 0) {
      const reactionTime = Date.now() - startTime;
      setReactionTimes(prev => [...prev, reactionTime]);
      setIsStimulusVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      nextStimulus();
    }
  };

  const nextStimulus = () => {
    if (currentRep >= repetitions) {
      setIsActive(false);
      setCurrentStimulus(null);
      return;
    }

    // Interval before stimulus
    setIsStimulusVisible(false);
    timerRef.current = setTimeout(() => {
      // Pick stimulus
      const pool: Stimulus[] = [
        ...selectedColors.map(c => ({ type: 'COLOR' as StimulusType, value: c })),
        ...selectedDirections.map(d => ({ type: 'DIRECTION' as StimulusType, value: d })),
      ];

      const picked = randomMode 
        ? pool[Math.floor(Math.random() * pool.length)]
        : pool[currentRep % pool.length];

      setCurrentStimulus(picked);
      setIsStimulusVisible(true);
      setStartTime(Date.now());
      setCurrentRep(prev => prev + 1);

      // Stimulus duration (if user doesn't react)
      timerRef.current = setTimeout(() => {
        setIsStimulusVisible(false);
        setStartTime(0);
        nextStimulus();
      }, stimulusDuration * 1000);

    }, intervalDuration * 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const toggleColor = (id: string) => {
    setSelectedColors(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleDirection = (id: string) => {
    setSelectedDirections(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const resetTraining = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsActive(false);
    setCurrentStimulus(null);
    setShowSettings(true);
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col transition-colors duration-300 ${isStimulusVisible && currentStimulus?.type === 'COLOR' ? COLORS.find(c => c.id === currentStimulus.value)?.value : 'bg-zinc-950'}`}>
      <header className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <X size={28} />
          </button>
          <h2 className="text-xl font-black uppercase tracking-widest text-white">Estímulos Visuales</h2>
        </div>
        {!isActive && !showSettings && (
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <Settings size={24} />
          </button>
        )}
      </header>

      <main 
        onClick={handleReaction}
        className="flex-1 flex flex-col items-center justify-center p-8 relative cursor-pointer"
      >
        <AnimatePresence mode="wait">
          {showSettings ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-black/40 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 space-y-8 overflow-y-auto max-h-[80vh]"
            >
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Colores</h3>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => toggleColor(c.id)}
                      className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${selectedColors.includes(c.id) ? `${c.value} text-white scale-105 shadow-lg` : 'bg-white/5 text-white/40 border border-white/5'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Direcciones</h3>
                <div className="grid grid-cols-4 gap-3">
                  {DIRECTIONS.map(d => (
                    <button 
                      key={d.id}
                      onClick={() => toggleDirection(d.id)}
                      className={`p-4 rounded-2xl flex items-center justify-center transition-all ${selectedDirections.includes(d.id) ? 'bg-white text-black scale-105 shadow-lg' : 'bg-white/5 text-white/40 border border-white/5'}`}
                    >
                      <d.icon size={24} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Duración Estímulo (s)</label>
                  <input type="number" step="0.1" value={stimulusDuration} onChange={e => setStimulusDuration(Number(e.target.value))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-xl font-black text-white outline-none focus:border-white/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Intervalo (s)</label>
                  <input type="number" step="0.1" value={intervalDuration} onChange={e => setIntervalDuration(Number(e.target.value))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-xl font-black text-white outline-none focus:border-white/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/60">Repeticiones</label>
                  <input type="number" value={repetitions} onChange={e => setRepetitions(Number(e.target.value))} className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-xl font-black text-white outline-none focus:border-white/40" />
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Aleatorio</span>
                  <button 
                    onClick={() => setRandomMode(!randomMode)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${randomMode ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${randomMode ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <button 
                onClick={startTraining}
                className="w-full bg-white text-black py-6 rounded-3xl font-black text-xl uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Comenzar
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key={currentRep}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full h-full flex items-center justify-center"
            >
              {isStimulusVisible && currentStimulus && (
                <div className="text-white">
                  {currentStimulus.type === 'DIRECTION' && (
                    <div className="scale-[10]">
                      {React.createElement(DIRECTIONS.find(d => d.id === currentStimulus.value)?.icon || ArrowUp)}
                    </div>
                  )}
                </div>
              )}
              {!isStimulusVisible && isActive && (
                <div className="text-white/20 text-4xl font-black uppercase tracking-[0.5em]">
                  Prepárate...
                </div>
              )}
              {!isActive && currentRep >= repetitions && (
                <div className="text-center space-y-8 bg-black/40 backdrop-blur-xl p-12 rounded-[40px] border border-white/10">
                  <h1 className="text-4xl font-black uppercase tracking-widest text-white">¡COMPLETADO!</h1>
                  
                  <div className="grid grid-cols-2 gap-8 py-4">
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Promedio</p>
                      <p className="text-4xl font-black text-emerald-500">
                        {reactionTimes.length > 0 
                          ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(0)
                          : '0'}
                        <span className="text-xs ml-1">ms</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Mejor</p>
                      <p className="text-4xl font-black text-blue-500">
                        {reactionTimes.length > 0 ? Math.min(...reactionTimes) : '0'}
                        <span className="text-xs ml-1">ms</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); resetTraining(); }}
                      className="w-full bg-white text-black py-6 rounded-3xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                    >
                      Reiniciar
                    </button>
                    {userId && reactionTimes.length > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); saveResults(); }}
                        disabled={saving}
                        className="w-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Guardar Resultados
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {!showSettings && isActive && (
        <footer className="p-12 flex justify-center gap-6 bg-black/20 backdrop-blur-sm">
          <button 
            onClick={resetTraining}
            className="p-6 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white"
          >
            <RotateCcw size={32} />
          </button>
        </footer>
      )}
    </div>
  );
};
