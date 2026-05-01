import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Dice5, Timer, Zap, Plus, Save, Loader2, Trophy, Flame, Medal, X, Search, Dumbbell, ChevronRight, Shield, ChevronDown, ChevronUp, Play, Star } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, getDoc, doc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { TabataScreen } from './TabataScreen';
import { ReactionScreen } from './ReactionScreen';
import { useAuth } from '../context/AuthContext';
import { LEVELS, getLevelFromXP } from '../constants';
import { SEED_EXERCISES } from '../lib/exerciseSeed';
import { generateChallenge, ChallengeCard, ALL_CHALLENGES } from '../services/intelligenceService';

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
  const [challenge, setChallenge] = useState<ChallengeCard | null>(null);
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [bonusAttributes, setBonusAttributes] = useState<string[]>([]);
  
  // Game Logic States
  const [m4Winner, setM4Winner] = useState<'pupil' | 'coach' | null>(null);
  const [m5Points, setM5Points] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  const currentXPTotal = userData?.xp || 0;
  const currentLevelInfo = getLevelFromXP(currentXPTotal);
  const isAscensionSession = currentXPTotal >= currentLevelInfo.maxXP - 50; 
  
  const [environment, setEnvironment] = useState<'gym' | 'field'>('field');

  // States for tools
  const [showTabata, setShowTabata] = useState(false);
  const [showReaction, setShowReaction] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<string[]>([]);
  const [newExName, setNewExName] = useState('');
  const [newExSeries, setNewExSeries] = useState(3);
  const [newExReps, setNewExReps] = useState('');
  const [newExRest, setNewExRest] = useState(60);
  const [newExLoad, setNewExLoad] = useState('');
  const [newExRpe, setNewExRpe] = useState('');
  const [extraExercises, setExtraExercises] = useState<any[]>([]);

  // Exercise Bank Integration
  const [bankExercises, setBankExercises] = useState<any[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [loadingGlobalRoutines, setLoadingGlobalRoutines] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [routineSearch, setRoutineSearch] = useState('');
  const [showBankPicker, setShowBankPicker] = useState<'manual' | 'bank' | 'routines'>('manual');
  const [globalRoutines, setGlobalRoutines] = useState<any[]>([]);

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

  // Fetch Bank Exercises and Global Routines when Modal opens
  useEffect(() => {
    if (showAdd) {
      const fetchData = async () => {
        // Determine the relevant trainer/owner ID to fetch content
        const targetTrainerId = userData?.role === 'coach' ? userId : (userData?.trainerId || userId);
        
        if (!targetTrainerId) return;

        setLoadingBank(true);
        setLoadingGlobalRoutines(true);
        try {
          // Fetch Bank Exercises
          const bankQ = query(collection(db, 'exerciseBank'), where('trainerId', '==', targetTrainerId));
          const bankSnap = await getDocs(bankQ);
          setBankExercises(bankSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          // Fetch Global Routines (Workouts)
          const routinesQ = query(collection(db, 'workouts'), where('trainerId', '==', targetTrainerId));
          const routinesSnap = await getDocs(routinesQ);
          setGlobalRoutines(routinesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
          console.error("Error fetching data", err);
        } finally {
          setLoadingBank(false);
          setLoadingGlobalRoutines(false);
        }
      };
      fetchData();
    }
  }, [showAdd, userId, userData]);

  // Extract blocks safely
  const workoutBlocks = React.useMemo(() => {
    if (!currentWorkout) return [];
    if (currentWorkout.blocks && Array.isArray(currentWorkout.blocks)) {
      return currentWorkout.blocks;
    }
    // If it's an old workout with just a flat exercises array, create a virtual block
    if (currentWorkout.exercises && Array.isArray(currentWorkout.exercises)) {
      return [{
        id: 'default',
        name: 'Ejercicios',
        exercises: currentWorkout.exercises
      }];
    }
    return [];
  }, [currentWorkout]);

  // Extract all exercises for progress tracking
  const allExercises = React.useMemo(() => {
    const fromBlocks = workoutBlocks.flatMap((b: any) => [
      ...(b.exercises || []),
      ...(b.circuit?.items || [])
    ]);
    return [...fromBlocks, ...extraExercises];
  }, [workoutBlocks, extraExercises]);

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

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks(prev => 
      prev.includes(blockId) 
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    );
  };

  const handleRollChallenge = async () => {
    setIsGeneratingChallenge(true);
    try {
      const card = await generateChallenge(userId);
      setChallenge(card);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingChallenge(false);
    }
  };

  const handleAddManualExercise = (exerciseToUse?: any) => {
    const nameToUse = exerciseToUse ? exerciseToUse.name : newExName.trim();
    if (!nameToUse) return;

    const newEx = {
      id: exerciseToUse ? `bank-${exerciseToUse.id}-${Date.now()}` : `manual-${Date.now()}`,
      name: nameToUse,
      series: exerciseToUse ? (exerciseToUse.series || 3) : newExSeries,
      reps: exerciseToUse ? (exerciseToUse.reps || '') : newExReps,
      rest: exerciseToUse ? (exerciseToUse.rest || 60) : newExRest,
      load: exerciseToUse ? (exerciseToUse.load || '') : newExLoad,
      rpe: exerciseToUse ? (exerciseToUse.rpe || '') : newExRpe,
      isManual: true,
      fromBank: !!exerciseToUse
    };

    setExtraExercises(prev => [...prev, newEx]);
    setNewExName('');
    setNewExSeries(3);
    setNewExReps('');
    setNewExRest(60);
    setNewExLoad('');
    setNewExRpe('');
    setShowAdd(false);
    setShowBankPicker('manual');
  };

  const handleImportRoutine = (routine: any) => {
    if (!routine || !routine.blocks) return;

    const importedExercises: any[] = [];
    routine.blocks.forEach((block: any, bIdx: number) => {
      const exercises = [
        ...(block.exercises || []),
        ...(block.circuit?.items || [])
      ];

      exercises.forEach((ex: any, eIdx: number) => {
        importedExercises.push({
          ...ex,
          id: `imported-${routine.id}-${bIdx}-${eIdx}-${Date.now()}`,
          isManual: true,
          fromRoutine: routine.name
        });
      });
    });

    setExtraExercises(prev => [...prev, ...importedExercises]);
    setShowAdd(false);
    setShowBankPicker('manual');
    alert(`¡Rutina "${routine.name}" importada!`);
  };

  const handleFinish = async (approvedAscension: boolean = false) => {
    if (!currentWorkout) return;
    setSaving(true);
    try {
      // XP Calculation based on request
      let xpGained = 50; // Base Asistencia
      if (m4Winner === 'pupil') xpGained += 100;
      xpGained += m5Points;
      
      // Bonus from exercises
      xpGained += completedExercises.length * 5;

      await addDoc(collection(db, 'sessions'), {
        athleteId: userId,
        trainerId: trainerId || null,
        date: serverTimestamp(),
        exercisesCompleted: completedExercises.length,
        xpGained: xpGained,
        m4Winner,
        m5Points,
        isAscensionSession,
        approvedAscension,
        challenge: challenge ? {
          title: challenge.title,
          userBuff: challenge.userBuff,
          coachHandicap: challenge.coachHandicap
        } : null,
        workoutName: currentWorkout.name || 'Entrenamiento'
      });

      // Update actual user profile XP, Streak and Attributes
      if (userId) {
        const userRef = doc(db, 'users', userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const currentTotalXp = (data.xp || 0) + xpGained;
          const oldLevel = getLevelFromXP(data.xp || 0);
          const newLevel = getLevelFromXP(currentTotalXp);
          
          let alertMsg = `¡Sesión guardada! +${xpGained} XP | Atributos mejorados.`;

          if (approvedAscension) {
             alertMsg = `🏆 ¡FELICIDADES! Has ascendido al nivel ${newLevel.name}.`;
          } else if (isAscensionSession) {
             alertMsg = `Sesión de Examen completada. Sigue practicando para el ascenso.`;
          } else if (newLevel.name !== oldLevel.name && !isAscensionSession) {
             alertMsg = `🔥 ¡Nuevo nivel disponible! Alcanzaste el XP para ${newLevel.name}. Tu próxima sesión será de EXAMEN.`;
          }
          
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

          // Attributes Logic (NUEVO MÓDULO DE GESTIÓN DE ATRIBUTOS)
          let currentAttributes = data.attributes || { TEC: 10, FIS: 10, NEU: 10, AGI: 10, ACT: 10 };
          // Migration if old format exists
          if (currentAttributes.tecnica && !currentAttributes.TEC) {
            currentAttributes = {
              TEC: currentAttributes.tecnica || 10,
              FIS: currentAttributes.fuerza || 10,
              NEU: 10,
              AGI: currentAttributes.ritmo || 10,
              ACT: currentAttributes.mentalidad || 10
            };
          }
          
          let newAttributes = { ...currentAttributes };
          const levelCap = newLevel.attributeCap || 100;

          completedExercises.forEach(exId => {
            const exercise = allExercises.find(e => e.id === exId);
            if (!exercise) return;

            // Logic based on moments (referencing 1-20, 21-35, 36-50 logic)
            if (exercise.moment === 'M1' || exercise.moment === 'M2') {
              newAttributes.NEU = (newAttributes.NEU || 0) + 0.2;
              newAttributes.AGI = (newAttributes.AGI || 0) + 0.2;
            } else if (exercise.moment === 'M3') {
              const isForce = exercise.name.toLowerCase().includes('fuerza') || 
                              exercise.name.toLowerCase().includes('potencia') || 
                              exercise.name.toLowerCase().includes('peso') || 
                              exercise.name.toLowerCase().includes('salto');
              if (isForce) {
                newAttributes.FIS = (newAttributes.FIS || 0) + 0.5;
              } else {
                newAttributes.TEC = (newAttributes.TEC || 0) + 0.5;
              }
            }
          });

          if (m4Winner === 'pupil') {
            newAttributes.ACT = (newAttributes.ACT || 0) + 1.0;
          }

          // Apply Bonus from Coach Selection (Existing feature)
          bonusAttributes.forEach(attr => {
            if (attr === 'tecnica') newAttributes.TEC = (newAttributes.TEC || 0) + 1;
            if (attr === 'fuerza') newAttributes.FIS = (newAttributes.FIS || 0) + 1;
            if (attr === 'ritmo') newAttributes.AGI = (newAttributes.AGI || 0) + 1;
            if (attr === 'mentalidad') newAttributes.ACT = (newAttributes.ACT || 0) + 1;
          });

          // Apply Level Cap and Round to 1 decimal
          const keys = ['TEC', 'FIS', 'NEU', 'AGI', 'ACT'];
          keys.forEach(key => {
            newAttributes[key] = Math.min(levelCap, Math.round((newAttributes[key] || 10) * 10) / 10);
          });

          await updateDoc(userRef, {
            xp: increment(xpGained),
            points: increment(xpGained),
            levelName: newLevel.name,
            levelMinXP: newLevel.minXP,
            streak: currentStreak,
            lastSessionDate: serverTimestamp(),
            attributes: newAttributes
          });

          alert(alertMsg);
        }
      }

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
                  onClick={() => setShowBankPicker('manual')}
                  className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${showBankPicker === 'manual' ? 'bg-zinc-800 text-[#D4AF37]' : 'text-zinc-600'}`}
                >
                  Manual
                </button>
                <button 
                  onClick={() => setShowBankPicker('bank')}
                  className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${showBankPicker === 'bank' ? 'bg-zinc-800 text-[#D4AF37]' : 'text-zinc-600'}`}
                >
                  Biblioteca
                </button>
                <button 
                  onClick={() => setShowBankPicker('routines')}
                  className={`flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all ${showBankPicker === 'routines' ? 'bg-zinc-800 text-[#D4AF37]' : 'text-zinc-600'}`}
                >
                  Rutinas
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-6">
              {showBankPicker === 'manual' ? (
                <div className="space-y-6">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Añadir Ejercicio Personalizado</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Nombre</label>
                      <input 
                        autoFocus
                        value={newExName}
                        onChange={(e) => setNewExName(e.target.value)}
                        placeholder="Ej: Sprint final, Plancha..."
                        className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white focus:border-[#D4AF37] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Series</label>
                        <input 
                          type="number"
                          value={newExSeries ?? 3}
                          onChange={(e) => setNewExSeries(parseInt(e.target.value) || 0)}
                          className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white text-center focus:border-[#D4AF37] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Reps</label>
                        <input 
                          type="text"
                          value={newExReps || ''}
                          onChange={(e) => setNewExReps(e.target.value)}
                          placeholder="8-12"
                          className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white text-center focus:border-[#D4AF37] outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Descanso (s)</label>
                        <input 
                          type="number"
                          value={newExRest ?? 60}
                          onChange={(e) => setNewExRest(parseInt(e.target.value) || 0)}
                          className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white text-center focus:border-[#D4AF37] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Carga</label>
                        <input 
                          type="text"
                          value={newExLoad || ''}
                          onChange={(e) => setNewExLoad(e.target.value)}
                          placeholder="Kg"
                          className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white text-center focus:border-[#D4AF37] outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">RPE / %</label>
                        <input 
                          type="text"
                          value={newExRpe || ''}
                          onChange={(e) => setNewExRpe(e.target.value)}
                          placeholder="1-10"
                          className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-white text-center focus:border-[#D4AF37] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleAddManualExercise()}
                    className="w-full bg-[#D4AF37] text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Añadir a la sesión
                  </button>
                </div>
              ) : showBankPicker === 'bank' ? (
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
              ) : (
                <div className="space-y-4">
                  <div className="sticky top-0 bg-zinc-900 pb-2 z-10">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                      <input 
                        placeholder="Buscar rutinas..."
                        value={routineSearch}
                        onChange={(e) => setRoutineSearch(e.target.value)}
                        className="w-full bg-black border border-zinc-800 py-3 pl-10 pr-4 rounded-xl text-xs outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  {loadingGlobalRoutines ? (
                    <div className="flex justify-center p-8">
                      <Loader2 size={24} className="text-[#D4AF37] animate-spin" />
                    </div>
                  ) : globalRoutines.filter(r => r.name.toLowerCase().includes(routineSearch.toLowerCase())).length === 0 ? (
                    <p className="text-center text-xs text-zinc-600 py-8">No se encontraron rutinas</p>
                  ) : (
                    <div className="space-y-2">
                      {globalRoutines
                        .filter(r => r.name.toLowerCase().includes(routineSearch.toLowerCase()))
                        .map(routine => (
                          <button
                            key={routine.id}
                            onClick={() => handleImportRoutine(routine)}
                            className="w-full flex flex-col p-4 bg-black/50 border border-zinc-800 rounded-xl hover:border-[#D4AF37]/40 transition-all text-left group"
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">{routine.name}</span>
                              <ChevronRight size={14} className="text-zinc-700 group-hover:text-[#D4AF37]" />
                            </div>
                            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                              {routine.blocks?.length || 0} Bloques
                            </p>
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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black">{userData?.displayName || 'Deportista'}</h1>
              {isAscensionSession && (
                <div className="flex flex-col gap-2">
                  <span className="bg-amber-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 w-fit">
                    <Shield size={10} /> SESIÓN DE EXAMEN
                  </span>
                  <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    <button 
                      onClick={() => setEnvironment('field')}
                      className={`px-3 py-1 text-[8px] font-black uppercase rounded ${environment === 'field' ? 'bg-emerald-500 text-black' : 'text-zinc-600'}`}
                    >
                      Campo
                    </button>
                    <button 
                      onClick={() => setEnvironment('gym')}
                      className={`px-3 py-1 text-[8px] font-black uppercase rounded ${environment === 'gym' ? 'bg-rose-500 text-black' : 'text-zinc-600'}`}
                    >
                      Gimnasio
                    </button>
                  </div>
                </div>
              )}
            </div>
            {userData ? (
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest flex items-center gap-1">
                    <Trophy size={10} /> {getLevelFromXP(userData.xp || 0).name} | {userData.xp || 0} XP
                  </p>
                  {userData.streak > 0 && (
                    <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest flex items-center gap-1">
                      <Flame size={12} /> {userData.streak} Días
                    </p>
                  )}
                </div>
                {/* Level Progress Bar */}
                {(() => {
                  const currentXP = userData.xp || 0;
                  const currentLevel = getLevelFromXP(currentXP);
                  const currentIndex = LEVELS.findIndex(l => l.name === currentLevel.name);
                  const nextLevel = LEVELS[currentIndex + 1];
                  if (!nextLevel) return null;
                  
                  const progress = Math.min(100, Math.max(0, 
                    ((currentXP - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100
                  ));
                  
                  return (
                    <div className="w-32 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#D4AF37] transition-all duration-500" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Modo Sesión</p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-32 space-y-8 overflow-y-auto w-full max-w-2xl mx-auto">
        
        {userData?.attributes && (
          <section className="bg-zinc-900 border border-zinc-800 p-5 rounded-[2.5rem] shadow-xl">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Medal size={14}/> Ficha Técnica Actual
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {[
                { key: 'TEC', label: 'TEC', icon: '⚽', oldKey: 'tecnica' },
                { key: 'FIS', label: 'FIS', icon: '💪', oldKey: 'fuerza' },
                { key: 'NEU', label: 'NEU', icon: '🧠', oldKey: 'neuro' },
                { key: 'AGI', label: 'AGI', icon: '🤸', oldKey: 'ritmo' },
                { key: 'ACT', label: 'ACT', icon: '🔥', oldKey: 'mentalidad' }
              ].map(attr => (
                 <div key={attr.key} className="flex flex-col items-center gap-1 p-2 bg-black rounded-2xl border border-zinc-800/50">
                    <span className="text-lg">{attr.icon}</span>
                    <span className="text-[7px] font-black text-zinc-600 uppercase tracking-tighter">{attr.label}</span>
                    <span className="text-xs font-black text-[#D4AF37]">
                      {userData.attributes[attr.key] || userData.attributes[attr.oldKey] || 10}
                    </span>
                 </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. GAME MASTER DE DESAFÍOS (TARJETAS) */}
        <section className="space-y-4">
          <div className="flex gap-3">
            <button 
              onClick={handleRollChallenge}
              disabled={isGeneratingChallenge}
              className="flex-1 bg-gradient-to-r from-rose-600 to-amber-600 text-white p-6 rounded-[2.5rem] flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl border-b-4 border-black/20"
            >
              {isGeneratingChallenge ? (
                <Loader2 className="animate-spin" size={28} />
              ) : (
                <>
                  <Dice5 size={32} className="animate-bounce" />
                  <div className="text-left text-zinc-950">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Game Master</p>
                    <p className="font-black text-xl italic uppercase tracking-tighter">Desafío Aleatorio</p>
                  </div>
                </>
              )}
            </button>
            <button 
              onClick={() => setShowAllCards(true)}
              className="px-6 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all hover:border-zinc-700"
            >
              <Trophy size={24} className="text-amber-500" />
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none">Ver Todas</span>
            </button>
          </div>

          <AnimatePresence>
            {showAllCards && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full max-w-lg bg-zinc-900 rounded-[2.5rem] border border-zinc-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
                >
                  <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black italic uppercase text-amber-500">Biblioteca de Desafíos</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Expansión de Gamificación 51-100</p>
                    </div>
                    <button onClick={() => setShowAllCards(false)} className="p-2 bg-black rounded-full border border-zinc-800 text-zinc-500 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {[
                      { id: 'nerf', label: '🔴 NERF (Hándicap Coach)', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
                      { id: 'buff', label: '🟢 BUFF (Ventaja Alumno)', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                      { id: 'duelo', label: '⚔️ DUELOS TÉCNICOS', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                      { id: 'torneo', label: '🏆 RETOS DE TORNEO', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
                    ].map(cat => (
                      <div key={cat.id} className="space-y-3">
                        <h4 className={`text-[10px] font-black uppercase tracking-widest ${cat.color} ml-2`}>{cat.label}</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {ALL_CHALLENGES.filter(c => c.category === cat.id && c.id && c.id >= 51).map(card => (
                            <button 
                              key={card.id}
                              onClick={() => {
                                setChallenge(card);
                                setShowAllCards(false);
                              }}
                              className={`text-left p-4 rounded-2xl border ${cat.bg} ${cat.border} hover:scale-[1.02] active:scale-[0.98] transition-all group`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className={`text-[10px] font-black uppercase ${cat.color} opacity-60`}>Card #{card.id}</span>
                                <Plus size={14} className={`${cat.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                              </div>
                              <p className="font-black uppercase text-sm mb-1 text-white">{card.title}</p>
                              <p className="text-xs text-zinc-400 font-medium italic">"{card.description}"</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-8 bg-black/40 border-t border-zinc-800">
                    <p className="text-[10px] text-zinc-600 text-center uppercase font-black tracking-tighter">Selecciona una tarjeta para activarla manualmente en el duelo</p>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {challenge && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                className="bg-zinc-900 border-2 border-amber-500/50 p-1 rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="bg-gradient-to-b from-amber-500/20 to-transparent p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em]">🔥 ¡DUELO DE TITANES ACTIVADO! 🔥</h3>
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest bg-black px-3 py-1 rounded-full">🃏 Tarjeta de Reto</p>
                      <p className="text-3xl font-black italic uppercase tracking-tighter text-white">{challenge.title}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-black/60 rounded-3xl border border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">📝 Dinámica</p>
                    <p className="text-sm text-zinc-300 font-medium leading-relaxed italic">"{challenge.description}"</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500 text-black rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                        <Trophy size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">🟢 Para el Alumno</p>
                        <p className="text-sm font-bold text-white">{challenge.userBuff || 'Duelo Estándar'}</p>
                      </div>
                    </div>

                    <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-3xl flex items-center gap-4">
                      <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                        <Shield size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">🔴 Para el Coach</p>
                        <p className="text-sm font-bold text-white">{challenge.coachHandicap || 'Duelo Estándar'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/50 text-center">
                    <p className="text-[11px] font-black uppercase tracking-widest text-amber-500 mb-1">🏆 Penitencia Sugerida</p>
                    <p className="text-xs text-zinc-400">El perdedor <span className="text-white font-bold">{challenge.suggestedPenalty || 'hace 10 flexiones'}</span>.</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={handleRollChallenge}
                      className="flex-1 py-4 bg-zinc-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                    >
                      Aleatorio
                    </button>
                    <button 
                      onClick={() => setChallenge(null)}
                      className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
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

        {/* 4. LISTA DE EJERCICIOS AGRUPADOS */}
        <section className="space-y-8">
          {workoutBlocks.length === 0 && extraExercises.length === 0 ? (
            <div className="bg-zinc-900 border border-dashed border-zinc-800 p-8 rounded-3xl text-center">
              <p className="text-zinc-500 text-sm">No hay ejercicios asignados.</p>
            </div>
          ) : (
            <>
              {workoutBlocks.map((block: any, bIdx: number) => {
                const blockId = block.id || `block-${bIdx}`;
                const isExpanded = expandedBlocks.includes(blockId);

                // Circuit Specialized Rendering
                if (block.type === 'circuit' && block.circuit) {
                  const circuit = block.circuit;
                  return (
                    <div key={blockId} className="space-y-4">
                      <div 
                        className="w-full flex items-center justify-between px-1"
                      >
                        <div 
                          onClick={() => toggleBlock(blockId)}
                          className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity py-1"
                        >
                          <span className="w-6 h-6 bg-orange-500 text-black rounded-lg flex items-center justify-center text-[10px] font-black">{bIdx + 1}</span>
                          <div className="flex flex-col">
                            <h2 className="text-xs font-black text-orange-500 uppercase tracking-[0.15em]">{block.name} • CIRCUITO</h2>
                            {isAscensionSession && block.name.toUpperCase().includes('M4') && (
                              <p className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full mt-0.5 w-fit">
                                REQUISITO {environment === 'field' ? '(CAMPO)' : '(GYM)'}: {environment === 'field' ? currentLevelInfo.requirement : 'Reto de Fuerza/Estabilidad (Ej: Flexiones)'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/ejecucion-circuito', { state: { circuit: block.circuit, workoutName: block.name } });
                            }}
                            className="bg-orange-500 text-black p-2 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg"
                          >
                            <Play size={16} fill="black" />
                          </button>
                          <button 
                            onClick={() => toggleBlock(blockId)}
                            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={16} className="text-zinc-600" /> : <ChevronDown size={16} className="text-zinc-600" />}
                          </button>
                        </div>
                      </div>

                      <motion.div 
                        initial={false}
                        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden mb-3 shadow-xl">
                          {/* Round Info Header */}
                          <div className="bg-orange-500/5 border-b border-zinc-800 p-5 grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-tight mb-1">Rondas</span>
                              <span className="text-lg font-black text-orange-500">{circuit.rounds}</span>
                            </div>
                            <div className="text-center border-x border-zinc-800 px-2">
                              <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-tight mb-1">Desc. Ej.</span>
                              <span className="text-sm font-bold text-white">{circuit.restBetweenExercises}s</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-tight mb-1">Desc. Rnd.</span>
                              <span className="text-sm font-bold text-white">{circuit.restBetweenRounds}s</span>
                            </div>
                          </div>

                          <div className="p-3 space-y-2">
                            {circuit.items?.map((item: any, idx: number) => {
                              const itemId = item.id || `${blockId}-item-${idx}`;
                              const isItemCompleted = completedExercises.includes(itemId);

                              return (
                                <button
                                  key={itemId}
                                  onClick={() => handleToggle(itemId)}
                                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                    isItemCompleted 
                                      ? 'bg-emerald-500/10 border-emerald-500/30 opacity-70' 
                                      : 'bg-black/40 border-zinc-800 hover:bg-black/60'
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${
                                    isItemCompleted ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'
                                  }`}>
                                    {idx + 1}
                                  </div>

                                  <div className="flex-1 text-left">
                                    <h4 className={`text-sm font-bold ${isItemCompleted ? 'text-emerald-500 line-through' : 'text-zinc-100'}`}>
                                      {item.name}
                                    </h4>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                                      {item.time > 0 && (
                                        <div className="flex flex-col">
                                          <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Tiempo</span>
                                          <span className="text-[10px] font-bold text-orange-500 tracking-tight">{item.time}s</span>
                                        </div>
                                      )}
                                      {item.reps && (
                                        <div className="flex flex-col">
                                          <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Reps</span>
                                          <span className="text-[10px] font-bold text-zinc-400 tracking-tight">{item.reps}</span>
                                        </div>
                                      )}
                                      {item.load && (
                                        <div className="flex flex-col">
                                          <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Carga</span>
                                          <span className="text-[10px] font-bold text-[#D4AF37] tracking-tight">{item.load}</span>
                                        </div>
                                      )}
                                      {item.rpe > 0 && (
                                        <div className="flex flex-col">
                                          <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">RPE</span>
                                          <span className="text-[10px] font-bold text-zinc-400 tracking-tight">{item.rpe}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {isItemCompleted && (
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                }

                // Normal Block Rendering (Original)
                const blockExercises = [
                  ...(block.exercises || [])
                ];
                
                if (blockExercises.length === 0 && !block.circuit) return null;

                return (
                  <div key={blockId} className="space-y-4">
                    <button 
                      onClick={() => toggleBlock(blockId)}
                      className="w-full flex items-center justify-between px-1 hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-[#D4AF37] text-black rounded-lg flex items-center justify-center text-[10px] font-black">{bIdx + 1}</span>
                        <div className="flex flex-col text-left">
                          <h2 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.15em]">{block.name}</h2>
                          {isAscensionSession && block.name.toUpperCase().includes('M4') && (
                            <p className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full mt-0.5 w-fit">
                              REQUISITO {environment === 'field' ? '(CAMPO)' : '(GYM)'}: {environment === 'field' ? currentLevelInfo.requirement : 'Reto de Fuerza/Estabilidad (Ej: Flexiones)'}
                            </p>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-zinc-600" /> : <ChevronDown size={16} className="text-zinc-600" />}
                    </button>
                    
                    <motion.div 
                      initial={false}
                      animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-2">
                        {blockExercises.map((ex: any, idx: number) => {
                          const exId = ex.id || `${blockId}-ex-${idx}`;
                          const isCompleted = completedExercises.includes(exId);
                          
                          return (
                            <button
                              key={exId}
                              onClick={() => handleToggle(exId)}
                              className={`w-full text-left p-5 rounded-2xl border transition-all active:scale-[0.98] ${
                                isCompleted 
                                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                                  : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className={`font-bold text-base mb-2 ${isCompleted ? 'text-emerald-500 line-through opacity-70' : 'text-white'}`}>
                                    {ex.name || 'Ejercicio'}
                                  </h3>
                                  
                                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-y-2 gap-x-4 mb-3">
                                    {ex.series && (
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Series</span>
                                        <span className="text-xs font-bold text-zinc-300">{ex.series}</span>
                                      </div>
                                    )}
                                    {ex.reps && (
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Reps</span>
                                        <span className="text-xs font-bold text-zinc-300">{ex.reps}</span>
                                      </div>
                                    )}
                                    {(ex.timePerSeries > 0 || ex.time > 0) && (
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Tiempo</span>
                                        <span className="text-xs font-bold text-zinc-300">{ex.timePerSeries || ex.time}s</span>
                                      </div>
                                    )}
                                    {ex.load && (
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-[#D4AF37]">Carga</span>
                                        <span className="text-xs font-bold text-zinc-300">{ex.load}</span>
                                      </div>
                                    )}
                                    {ex.rpe > 0 && (
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-orange-500">RPE/%</span>
                                        <span className="text-xs font-bold text-zinc-300">{ex.rpe}</span>
                                      </div>
                                    )}
                                    {(ex.restBetweenSeries || ex.rest) && (
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Descanso</span>
                                        <span className="text-xs font-bold text-zinc-300">{ex.restBetweenSeries || ex.rest}s</span>
                                      </div>
                                    )}
                                  </div>

                                  {(ex.description || ex.notes) && (
                                    <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/50">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Zap size={10} className="text-[#D4AF37]" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Instrucciones</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-400 italic leading-relaxed">
                                        {ex.description || ex.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className={`p-2 rounded-full mt-1 shrink-0 ${
                                  isCompleted ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-black border border-zinc-800 text-zinc-800'
                                }`}>
                                  <CheckCircle2 size={24} />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </div>
                );
              })}

              {extraExercises.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-1">
                    <span className="w-6 h-6 bg-zinc-800 text-zinc-500 rounded-lg flex items-center justify-center text-[10px] font-black">+</span>
                    <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.15em]">Extras de Sesión</h2>
                  </div>
                  <div className="space-y-3">
                    {extraExercises.map((ex, idx) => {
                      const isCompleted = completedExercises.includes(ex.id);
                      return (
                        <button
                          key={ex.id}
                          onClick={() => handleToggle(ex.id)}
                          className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all active:scale-[0.98] ${
                            isCompleted ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900 border-zinc-800'
                          }`}
                        >
                          <div className="flex-1 text-left pr-4">
                            <h3 className={`font-bold text-sm ${isCompleted ? 'text-emerald-500' : 'text-white'}`}>
                              {ex.name}
                            </h3>
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600 italic">Añadido manualmente</span>
                          </div>
                          <div className={`p-2 rounded-full ${
                            isCompleted ? 'bg-emerald-500 text-black' : 'bg-black border border-zinc-800 text-zinc-800'
                          }`}>
                            <CheckCircle2 size={24} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* 5. EVALUACIÓN Y CIERRE (M4/M5) */}
        <section className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] shadow-xl">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" /> Registro de Duelo y Retos
            </h2>
            
            <div className="space-y-8">
              {/* MOMENTO 4: DUELO */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">M4: Duelo Coach vs Alumno</p>
                  {isAscensionSession && (
                    <span className="text-[8px] text-amber-500 font-bold uppercase ring-1 ring-amber-500/50 px-2 py-0.5 rounded-full">Examen obligatorio</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setM4Winner('pupil')}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                      m4Winner === 'pupil' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-black border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Star size={20} />
                    <span className="text-[10px] font-black uppercase">Ganó Alumno</span>
                    <span className="text-[8px] font-bold">+100 XP</span>
                  </button>
                  <button 
                    onClick={() => setM4Winner('coach')}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                      m4Winner === 'coach' ? 'bg-rose-500/20 border-rose-500 text-rose-500' : 'bg-black border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Shield size={20} />
                    <span className="text-[10px] font-black uppercase">Ganó Coach</span>
                    <span className="text-[8px] font-bold">+0 XP</span>
                  </button>
                </div>
              </div>

              {/* MOMENTO 5: RETO PUNTUABLE */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">M5: Reto de Torneo (Pts Ranking)</p>
                <div className="flex items-center gap-4 bg-black p-4 rounded-2xl border border-zinc-800">
                  <div className="flex-1">
                    <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Puntos Obtenidos (81-100)</p>
                    <input 
                      type="number" 
                      value={m5Points}
                      onChange={(e) => setM5Points(parseInt(e.target.value) || 0)}
                      className="bg-transparent text-xl font-black text-white w-full outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-black">
                    XP
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-[2.5rem]">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Evaluación de Atributos</h2>
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
          </div>
        </section>

      </main>

      {/* 6. FINALIZAR SESIÓN (Fixed bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
        <button
          onClick={() => setShowSummary(true)}
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

      {/* SUMMARY MODAL */}
      <AnimatePresence>
        {showSummary && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-zinc-900 rounded-[2.5rem] border border-zinc-800 shadow-2xl p-8"
            >
              <div className="text-center mb-8">
                <Trophy size={48} className="mx-auto text-amber-500 mb-4" />
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Resumen de Sesión</h3>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Cálculo de Recompensas</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-zinc-800">
                  <span className="text-[10px] font-black uppercase text-zinc-500">Base Asistencia</span>
                  <span className="text-sm font-black text-white">+50 XP</span>
                </div>
                {m4Winner === 'pupil' && (
                  <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <span className="text-[10px] font-black uppercase text-emerald-500">Victoria M4</span>
                    <span className="text-sm font-black text-emerald-500">+100 XP</span>
                  </div>
                )}
                {m5Points > 0 && (
                  <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <span className="text-[10px] font-black uppercase text-blue-400">Puntos M5</span>
                    <span className="text-sm font-black text-white">+{m5Points} XP</span>
                  </div>
                )}
                <div className="flex justify-between items-center p-4 bg-zinc-800/50 rounded-2xl">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Total Ganado</span>
                  <span className="text-xl font-black text-[#D4AF37]">+{50 + (m4Winner === 'pupil' ? 100 : 0) + m5Points + (completedExercises.length * 5)} XP</span>
                </div>
              </div>

              {isAscensionSession ? (
                <div className="space-y-3">
                  <p className="text-center text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 italic">⚠️ ¿Aprobaste el Requisito de Ascenso?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleFinish(true)}
                      className="p-5 bg-amber-500 text-black rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg"
                    >
                      SÍ, APROBÉ
                    </button>
                    <button 
                      onClick={() => handleFinish(false)}
                      className="p-5 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]"
                    >
                      AÚN NO
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => handleFinish(false)}
                  className="w-full bg-[#D4AF37] text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-lg"
                >
                  Guardar y Cerrar
                </button>
              )}
              
              <button 
                onClick={() => setShowSummary(false)}
                className="w-full mt-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
              >
                Volver
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
