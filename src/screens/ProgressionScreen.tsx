import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, TrendingUp, Trophy, Star, ShieldCheck, 
  Flame, Loader2, Award, Zap 
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

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

  const isTrainer = role === 'trainer' || role === 'superadmin';

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
          <h1 className="text-xl font-bold">Progresión Global</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">XP, Niveles y Logros</p>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-purple-500/20 text-purple-500 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">Sistema de Gamificación</h2>
                  <p className="text-xs text-zinc-400">Panel administrativo</p>
                </div>
              </div>
              <p className="text-sm text-zinc-500 mt-4 leading-relaxed">
                El sistema asigna automáticamente <strong className="text-white">Puntos</strong> y <strong className="text-white">Puntos de Experiencia (XP)</strong> 
                por la asistencia y finalización de los entrenamientos y retos. Cuando los atletas completan rutinas, obtienen XP para subir de 
                <strong className="text-[#D4AF37]"> Nivel</strong> y puntos canjeables o clasificatorios, fomentando una sana competencia (Leaderboard).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Ranking de Atletas (Leaderboard)</h3>
            
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
                    className="flex flex-col sm:flex-row items-center justify-between p-5 bg-zinc-900 border border-zinc-800 rounded-2xl"
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
                            <Star size={10} className="text-[#D4AF37]" /> Nivel {athlete.level || 1}
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
        </div>
      </main>
    </div>
  );
};
