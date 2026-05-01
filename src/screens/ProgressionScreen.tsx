import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, TrendingUp, Trophy, Star, ShieldCheck, 
  Flame, Loader2, Award, Zap, Target, Timer, ChevronRight, Lock
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { LEVELS, getLevelFromXP } from '../constants';

interface AthleteStats {
  id: string;
  displayName: string;
  photoURL: string;
  points: number;
  xp: number;
  level: number;
  streak: number;
  trustScore?: number;
}

interface ProgressionScreenProps {
  onBack: () => void;
  userId: string;
  role?: string;
  userProfile?: any;
}

export const ProgressionScreen = ({ onBack, userId, role, userProfile }: ProgressionScreenProps) => {
  const [ranking, setRanking] = useState<AthleteStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'leaderboard' | 'elite-path'>('elite-path');

  const isTrainer = role === 'trainer' || role === 'superadmin';
  const currentXP = userProfile?.xp || 0;
  const currentLevel = getLevelFromXP(currentXP);

  useEffect(() => {
    if (!isTrainer) {
      setLoading(false);
      return;
    }

    try {
      let q = query(
        collection(db, 'users'),
        where('trainerId', '==', userId),
        where('status', '==', 'active')
      );

      if (userProfile?.role === 'superadmin') {
        q = query(
          collection(db, 'users'),
          where('role', '==', 'client'),
          where('status', '==', 'active')
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const athletes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AthleteStats[];

        // Sort locally by points/xp for leaderboard
        const sortedAthletes = athletes.sort((a, b) => (b.points || 0) - (a.points || 0));
        setRanking(sortedAthletes);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }, [userId, isTrainer, userProfile]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center gap-4 sticky top-0 bg-black z-10">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Carrera Deportiva</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">XP, Niveles y Progresión</p>
        </div>
      </header>

      <div className="flex p-2 bg-zinc-900 mx-6 mt-4 rounded-2xl border border-zinc-800">
        <button 
          onClick={() => setView('elite-path')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'elite-path' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500'}`}
        >
          Mi Camino a la Élite
        </button>
        <button 
          onClick={() => setView('leaderboard')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'leaderboard' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500'}`}
        >
          Ranking Global
        </button>
      </div>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {view === 'elite-path' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter">Escalera de Maestría</h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Estado actual: {currentLevel.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#D4AF37]">{currentXP}</p>
                  <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Puntos de Experiencia</p>
                </div>
              </div>

              <div className="grid gap-4">
                {LEVELS.map((level, idx) => {
                  const isLocked = currentXP < level.minXP;
                  const isCurrent = currentLevel.name === level.name;
                  const isCompleted = currentXP >= level.maxXP && idx < LEVELS.length - 1;

                  return (
                    <motion.div 
                      key={level.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`relative overflow-hidden p-6 rounded-[2rem] border transition-all ${
                        isCurrent ? 'bg-gradient-to-br from-[#D4AF37]/20 to-black border-[#D4AF37] shadow-[0_0_30px_-10px_#D4AF37]' :
                        isLocked ? 'bg-zinc-900/30 border-zinc-900 opacity-60' :
                        'bg-zinc-900 border-zinc-800'
                      }`}
                    >
                      {isLocked && <Lock className="absolute top-6 right-6 text-zinc-700" size={24} />}
                      {isCompleted && <ShieldCheck className="absolute top-6 right-6 text-emerald-500" size={24} />}
                      {isCurrent && <Zap className="absolute top-6 right-6 text-[#D4AF37] animate-pulse" size={24} />}

                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            isCurrent ? 'bg-[#D4AF37] text-black' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            Nivel {idx + 1}
                          </span>
                          <span className="text-zinc-600 text-[10px] font-bold">|</span>
                          <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">{level.minXP}-{level.maxXP} XP</span>
                        </div>
                        
                        <h3 className={`text-xl font-black italic uppercase tracking-tight mb-4 ${isCurrent ? 'text-white' : 'text-zinc-400'}`}>
                          {level.name}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                              <Target size={10} /> Enfoque
                            </p>
                            <p className="text-xs font-medium text-zinc-300 leading-tight">{level.focus}</p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                              <Trophy size={10} /> Requisito de Ascenso
                            </p>
                            <p className="text-xs font-bold text-amber-500 leading-tight">{level.requirement}</p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                              <Timer size={10} /> Tiempo Est.
                            </p>
                            <p className="text-xs font-medium text-zinc-300">{level.estTime}</p>
                          </div>
                        </div>

                        {isCurrent && idx < LEVELS.length - 1 && (
                          <div className="mt-6 pt-6 border-t border-[#D4AF37]/20">
                            <div className="flex justify-between items-end mb-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Progreso al siguiente nivel</p>
                              <p className="text-[10px] font-black text-[#D4AF37]">{Math.floor(((currentXP - level.minXP) / (LEVELS[idx+1].minXP - level.minXP)) * 100)}%</p>
                            </div>
                            <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-zinc-800">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, ((currentXP - level.minXP) / (LEVELS[idx+1].minXP - level.minXP)) * 100)}%` }}
                                className="h-full bg-[#D4AF37]"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-purple-500/20 text-purple-500 rounded-2xl flex items-center justify-center">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight">Sistema de Gamificación</h2>
                      <p className="text-xs text-zinc-400">Escalafón de Élite</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 mt-4 leading-relaxed">
                    Suma puntos por asistencia, duelos ganados y retos completados. ¡Domina el ranking y asciende en la escalera de maestría!
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Ranking de Atletas</h3>
                  <div className="flex items-center gap-1 text-[#D4AF37]">
                    <Trophy size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Top Jugadores</span>
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
                  </div>
                ) : ranking.length === 0 ? (
                  <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-10 rounded-3xl text-center">
                    <Trophy className="mx-auto text-zinc-700 mb-4" size={40} />
                    <p className="text-zinc-500 text-sm">Aún no hay atletas activos para clasificar.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {ranking.map((athlete, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={athlete.id}
                        className={`flex flex-col sm:flex-row items-center justify-between p-5 bg-zinc-900 border transition-all rounded-2xl ${athlete.id === userId ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-zinc-800'}`}
                      >
                        <div className="flex items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0">
                          <div className="w-8 flex justify-center text-center">
                            {index === 0 ? <Trophy className="text-[#D4AF37]" size={24} /> :
                            index === 1 ? <Trophy className="text-zinc-300" size={24} /> :
                            index === 2 ? <Trophy className="text-orange-500" size={24} /> :
                            <span className="text-xl font-black text-zinc-600">#{index + 1}</span>}
                          </div>
                          <img 
                            src={athlete.photoURL || `https://ui-avatars.com/api/?name=${athlete.displayName}&background=333&color=fff`} 
                            alt={athlete.displayName} 
                            className="w-12 h-12 rounded-full border border-zinc-700" 
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h3 className="font-bold text-sm text-white">{athlete.displayName}</h3>
                            <div className="flex gap-2 items-center mt-1">
                              <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                <Award size={10} className="text-[#D4AF37]" /> {getLevelFromXP(athlete.xp || 0).name}
                              </span>
                              {athlete.streak > 2 && (
                                <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                                  <Flame size={10} /> Racha {athlete.streak}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 w-full sm:w-auto justify-end">
                          <div className="text-center">
                            <p className="text-xl font-black text-blue-400">{athlete.points || 0}</p>
                            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Puntos</p>
                          </div>
                          <div className="h-8 w-[1px] bg-zinc-800 hidden sm:block"></div>
                          <div className="text-center">
                            <p className="text-lg font-black text-purple-400">{athlete.xp || 0}</p>
                            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Total XP</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
