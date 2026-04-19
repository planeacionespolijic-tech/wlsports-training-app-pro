import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Dice5, Timer, Zap, Plus, Save, Loader2, Trophy, Flame, Medal, X, Search, Dumbbell, ChevronRight } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, getDoc, doc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { TabataScreen } from './TabataScreen';
import { ReactionScreen } from './ReactionScreen';
import { useAuth } from '../context/AuthContext';

const MODIFIERS = [
  "Gol vale doble",
  "Solo pierna no dominante",
  "Tiempo límite 1 minuto",
  "Máximo 3 toques",
  "Finalización obligatoria"
];

export const SessionExecutionScreen = () => {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, isTrainer: authIsTrainer } = useAuth();
  
  // Resolve context and state
  const workout = location.state?.workout || location.state;
  const userId = location.state?.athleteId || user?.uid || '';
  const trainerId = (authIsTrainer ? user?.uid : userProfile?.trainerId) || null;
  const isAdmin = authIsTrainer;

  const [loading, setLoading] = useState(!workout && !!workoutId);
  const [currentWorkout, setCurrentWorkout] = useState(workout);
  const [saving, setSaving] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [modifier, setModifier] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [bonusAttributes, setBonusAttributes] = useState<string[]>([]);

  // States for tools
  const [showTabata, setShowTabata] = useState(false);
  const [showReaction, setShowReaction] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [extraExercises, setExtraExercises] = useState<any[]>([]);

  // Exercise Bank Integration
  const [bankExercises, setBankExercises] = useState<any[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);

  useEffect(() => {
    if (!currentWorkout && workoutId) {
      const fetchWorkout = async () => {
        try {
          const wDoc = await getDoc(doc(db, 'workouts', workoutId));
          if (wDoc.exists()) {
            setCurrentWorkout({ id: wDoc.id, ...wDoc.data() });
          }
        } catch (err) {
          console.error("Error fetching workout:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchWorkout();
    }
  }, [workoutId, currentWorkout]);

  // Fetch Bank Exercises when Modal opens
  useEffect(() => {
    if (showAdd && trainerId) {
      const fetchBank = async () => {
        setLoadingBank(true);
        try {
          const q = query(collection(db, 'exerciseBank'), where('trainerId', '==', trainerId));
          const snap = await getDocs(q);
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setBankExercises(data);
        } catch (err) {
          console.error("Error fetching bank", err);
        } finally {
          setLoadingBank(false);
        }
      };
      fetchBank();
    }
  }, [showAdd, trainerId]);

  // Extract exercises safely from varying structures
  const allExercises = React.useMemo(() => {
    const base = (() => {
      if (!currentWorkout) return [];
      if (currentWorkout.exercises && Array.isArray(currentWorkout.exercises)) {
        return currentWorkout.exercises;
      }
      if (currentWorkout.blocks && Array.isArray(currentWorkout.blocks)) {
        return currentWorkout.blocks.flatMap((b: any) => b.exercises || []);
      }
      return [];
    })();
    return [...base, ...extraExercises];
  }, [currentWorkout, extraExercises]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (userId) {
          const uDoc = await getDoc(doc(db, 'users', userId));
          if (uDoc.exists()) {
            const data = uDoc.data();
            if (!data.attributes) {
              data.attributes = { ritmo: 50, tecnica: 50, fuerza: 50, mentalidad: 50 };
            }
            setUserData(data);
          }
        }
      } catch (err) {
        console.error("Error fetching user data", err);
      }
    };
    fetchUser();
  }, [userId]);

  const handleToggle = (exId: string) => {
    setCompletedExercises(prev => 
      prev.includes(exId) 
        ? prev.filter(id => id !== exId)
        : [...prev, exId]
    );
  };

  const handleRollModifier = () => {
    const random = Math.floor(Math.random() * MODIFIERS.length);
    setModifier(MODIFIERS[random]);
  };

  const handleAddManualExercise = (exerciseToUse?: any) => {
    const nameToUse = exerciseToUse ? exerciseToUse.name : newExName.trim();
    if (!nameToUse) return;

    const newEx = {
      id: exerciseToUse ? `bank-${exerciseToUse.id}-${Date.now()}` : `manual-${Date.now()}`,
      name: nameToUse,
      isManual: true,
      fromBank: !!exerciseToUse
    };

    setExtraExercises(prev => [...prev, newEx]);
    setNewExName('');
    setShowAdd(false);
    setShowBankPicker(false);
  };

  const handleFinish = async () => {
    if (!currentWorkout) return;
    setSaving(true);
    try {
      const xpGained = completedExercises.length * 10;
      
      await addDoc(collection(db, 'sessions'), {
        athleteId: userId,
        trainerId: trainerId || null,
        date: serverTimestamp(),
        exercisesCompleted: completedExercises.length,
        xpGained: xpGained,
        modifier: modifier,
        workoutName: currentWorkout.name || 'Entrenamiento'
      });

      // Update actual user profile XP, Streak and Attributes
      if (userId) {
        const userRef = doc(db, 'users', userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const currentXp = (data.xp || 0) + xpGained;
          const newLevel = Math.floor(currentXp / 1000) + 1;
          
          // Streak Logic
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          let currentStreak = data.streak || 0;
          let lastSessionDate = data.lastSessionDate?.toDate() || null;

          if (!lastSessionDate) {
             currentStreak = 1;
          } else {
             const lastDay = new Date(lastSessionDate.getFullYear(), lastSessionDate.getMonth(), lastSessionDate.getDate());
             if (lastDay.getTime() === yesterday.getTime()) {
                currentStreak += 1;
             } else if (lastDay.getTime() !== today.getTime()) {
                currentStreak = 1;
             }
          }

          // Attributes Logic
          let currentAttributes = data.attributes || { ritmo: 50, tecnica: 50, fuerza: 50, mentalidad: 50 };
          let newAttributes = { ...currentAttributes };
          ['ritmo', 'tecnica', 'fuerza', 'mentalidad'].forEach(attr => {
             let gain = 1;
             if (bonusAttributes.includes(attr)) gain += 1;
             newAttributes[attr] = Math.min(99, (newAttributes[attr] || 50) + gain);
          });

          await updateDoc(userRef, {
            xp: increment(xpGained),
            points: increment(xpGained),
            level: newLevel,
            streak: currentStreak,
            lastSessionDate: serverTimestamp(),
            attributes: newAttributes
          });
        }
      }

      alert(`¡Sesión guardada! +${xpGained} XP | Atributos mejorados.`);
      navigate(-1);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    } finally {
      setSaving(false);
    }
  };

  const filteredBank = bankExercises.filter(ex => 
    ex.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="text-[#D4AF37] animate-spin mb-4" size={48} />
        <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Preparando sesión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans relative">
      {/* MODAL PARA AÑADIR EJERCICIO */}
      {showAdd && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm bg-zinc-900 rounded-[2rem] border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-8 border-b border-zinc-800">
              <button 
                onClick={() => setShowAdd(false)}
                className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white"
              >
                <X size={20} />
              </button>
              <h3 className="text-xl font-black italic uppercase mb-2">Añadir Ejercicio</h3>
              <div className="flex bg-black rounded-xl p-1 gap-1">
                <button 
                  onClick={() => setShowBankPicker(false)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!showBankPicker ? 'bg-zinc-800 text-[#D4AF37]' : 'text-zinc-600'}`}
                >
                  Manual
                </button>
                <button 
                  onClick={() => setShowBankPicker(true)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${showBankPicker ? 'bg-zinc-800 text-[#D4AF37]' : 'text-zinc-600'}`}
                >
                  Biblioteca
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-6">
              {!showBankPicker ? (
                <div className="space-y-6">
                  <p className="text-xs text-zinc-500">¿Quieres añadir algo rápido que no está en el plan?</p>
                  <input 
                    autoFocus
                    value={newExName}
                    onChange={(e) => setNewExName(e.target.value)}
                    placeholder="Ej: Sprint final, Plancha..."
                    className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white focus:border-[#D4AF37] outline-none"
                  />
                  <button 
                    onClick={() => handleAddManualExercise()}
                    className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-xl uppercase tracking-widest text-xs"
                  >
                    Añadir a la sesión
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="sticky top-0 bg-zinc-900 pb-2 z-10">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                      <input 
                        placeholder="Buscar en biblioteca..."
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        className="w-full bg-black border border-zinc-800 py-3 pl-10 pr-4 rounded-xl text-xs outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  {loadingBank ? (
                    <div className="flex justify-center p-8">
                      <Loader2 size={24} className="text-[#D4AF37] animate-spin" />
                    </div>
                  ) : filteredBank.length === 0 ? (
                    <p className="text-center text-xs text-zinc-600 py-8">No se encontraron resultados</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredBank.map(ex => (
                        <button
                          key={ex.id}
                          onClick={() => handleAddManualExercise(ex)}
                          className="w-full flex items-center justify-between p-4 bg-black/50 border border-zinc-800 rounded-xl hover:border-[#D4AF37]/40 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-[#D4AF37]">
                              <Dumbbell size={14} />
                            </div>
                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{ex.name}</span>
                          </div>
                          <ChevronRight size={14} className="text-zinc-700 group-hover:text-[#D4AF37]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* 1. HEADER */}
      <header className="p-4 border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-black hover:bg-zinc-800 rounded-full transition-colors border border-zinc-800">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black">{userData?.displayName || 'Deportista'}</h1>
            {userData ? (
              <div className="flex flex-col gap-0.5 mt-0.5">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest flex items-center gap-1">
                    <Trophy size={10} /> {userData.level ? `Nivel ${userData.level}` : 'Nivel 1'}
                  </p>
                  {userData.streak > 0 && (
                    <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest flex items-center gap-1">
                      <Flame size={12} /> {userData.streak} Días
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Modo Sesión</p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-32 space-y-8 overflow-y-auto w-full max-w-2xl mx-auto">
        
        {userData?.attributes && (
          <section className="bg-zinc-900 border border-zinc-800 p-5 rounded-[2rem] shadow-xl">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Medal size={14}/> Perfil de Atributos
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {['ritmo', 'tecnica', 'fuerza', 'mentalidad'].map(attr => (
                 <div key={attr} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-wider text-zinc-400">
                       <span>{attr}</span>
                       <span className="text-[#D4AF37] text-xs">{userData.attributes[attr] || 50}</span>
                    </div>
                    <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-[#D4AF37]/50 to-[#D4AF37]" style={{ width: `${userData.attributes[attr] || 50}%` }} />
                    </div>
                 </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. MODIFICADOR (GAMIFICACIÓN) */}
        <section className="space-y-4">
          <button 
            onClick={handleRollModifier}
            className="w-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 p-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <Dice5 size={28} />
            <span className="font-black text-lg uppercase tracking-wider">Modo Desafío</span>
          </button>

          <AnimatePresence>
            {modifier && (
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="bg-indigo-600 text-white p-5 rounded-2xl text-center shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-indigo-400"
              >
                <p className="text-[10px] uppercase font-black tracking-widest text-indigo-200 mb-1">Modificador Activo</p>
                <p className="text-xl font-black">{modifier}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 3. ACCIONES RÁPIDAS (MOVED UP FOR BETTER ACCESSIBILITY) */}
        <section className="grid grid-cols-3 gap-3">
          <button 
            onClick={() => setShowAdd(true)}
            className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-2xl active:scale-95 transition-transform hover:border-zinc-700"
          >
            <Plus size={24} className="text-[#D4AF37] mb-2" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Añadir</span>
          </button>
          <button 
            onClick={() => setShowTabata(true)}
            className="flex flex-col items-center justify-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl active:scale-95 transition-transform hover:bg-orange-500/20"
          >
            <Timer size={24} className="text-orange-500 mb-2" />
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Tabata</span>
          </button>
          <button 
            onClick={() => setShowReaction(true)}
            className="flex flex-col items-center justify-center p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl active:scale-95 transition-transform hover:bg-purple-500/20"
          >
            <Zap size={24} className="text-purple-500 mb-2" />
            <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Reacción</span>
          </button>
        </section>

        {/* 4. LISTA DE EJERCICIOS */}
        <section className="space-y-3">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mx-1 mb-2">Ejercicios a Completar</h2>
          {allExercises.length === 0 ? (
            <div className="bg-zinc-900 border border-dashed border-zinc-800 p-8 rounded-3xl text-center">
              <p className="text-zinc-500 text-sm">No hay ejercicios asignados en este entrenamiento.</p>
            </div>
          ) : (
            allExercises.map((ex: any, idx: number) => {
              const exId = ex.id || `ex-${idx}`;
              const isCompleted = completedExercises.includes(exId);
              
              return (
                <button
                  key={exId}
                  onClick={() => handleToggle(exId)}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all active:scale-[0.98] ${
                    isCompleted 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex-1 text-left pr-4">
                    <h3 className={`font-bold text-lg ${isCompleted ? 'text-emerald-500' : 'text-white'}`}>
                      {ex.name || 'Ejercicio sin nombre'}
                    </h3>
                    {ex.fromBank && <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Desde Biblioteca</span>}
                  </div>
                  <div className={`p-3 rounded-full ${
                    isCompleted ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-black border border-zinc-700 text-zinc-600'
                  }`}>
                    <CheckCircle2 size={28} />
                  </div>
                </button>
              );
            })
          )}
        </section>

        {/* 5. EVALUACIÓN RÁPIDA (BONO ATRIBUTOS) */}
        <section className="bg-zinc-900 border border-zinc-800 p-5 rounded-[2rem]">
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Evaluación (Puntos Extra)</h2>
          <div className="grid grid-cols-2 gap-2">
            {['ritmo', 'tecnica', 'fuerza', 'mentalidad'].map(attr => (
              <button 
                key={attr}
                onClick={() => setBonusAttributes(prev => prev.includes(attr) ? prev.filter(a => a !== attr) : [...prev, attr])}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] font-black transition-all active:scale-95 ${
                  bonusAttributes.includes(attr) 
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' 
                    : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                + {attr}
              </button>
            ))}
          </div>
        </section>

      </main>

      {/* 5. FINALIZAR SESIÓN (Fixed bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
        <button
          onClick={handleFinish}
          disabled={saving || allExercises.length === 0}
          className="w-full max-w-2xl mx-auto flex items-center justify-center gap-3 bg-[#D4AF37] text-black py-5 rounded-2xl font-black text-lg uppercase tracking-widest shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={28} />
          ) : (
            <>
              <Save size={24} />
              Finalizar Sesión
            </>
          )}
        </button>
      </div>

      {/* OVERLAYS FOR TOOLS (Ensuring they are at the end for correct layering) */}
      <AnimatePresence>
        {showTabata && (
          <motion.div 
            key="tabata-overlay"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-black pointer-events-auto"
          >
            <TabataScreen onBack={() => setShowTabata(false)} userId={userId as string} />
          </motion.div>
        )}

        {showReaction && (
          <motion.div 
            key="reaction-overlay"
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-black pointer-events-auto"
          >
            <ReactionScreen onBack={() => setShowReaction(false)} userId={userId as string} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
