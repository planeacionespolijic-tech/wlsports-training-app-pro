import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dumbbell, History, FileText, TrendingUp, 
  Trophy, Zap, Timer, Video, Loader2, 
  ChevronRight, Calendar, Bell, LogOut,
  Star, Target, Award, ShieldCheck, RefreshCw, ArrowLeft,
  Flame, Users
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDocs, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';

interface ClientDashboardProps {
  user: any;
  onNavigate: (screen: string, data?: any) => void;
  onLogout: () => void;
  onBack?: () => void;
}

export const ClientDashboard = ({ user, onNavigate, onLogout, onBack }: ClientDashboardProps) => {
  const [userData, setUserData] = useState<any>(null);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'retos' | 'progreso' | 'ranking'>('dashboard');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!user?.uid) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch user profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }

      // Fetch recent history
      const historyQuery = query(
        collection(db, 'history'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const historySnap = await getDocs(historyQuery);
      setRecentHistory(historySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch active challenges
      const challengesQuery = query(
        collection(db, 'challenges'),
        where('status', '==', 'active'),
        limit(10)
      );
      const challengesSnap = await getDocs(challengesQuery);
      setActiveChallenges(challengesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Ranking (Top 10)
      const rankingQuery = query(
        collection(db, 'users'),
        where('role', '==', 'client'),
        orderBy('points', 'desc'),
        limit(10)
      );
      const rankingSnap = await getDocs(rankingQuery);
      setRanking(rankingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch Achievements (Mock for now or from a collection)
      setAchievements([
        { id: '1', title: 'Primer Reto', icon: Award, color: 'text-blue-500' },
        { id: '2', title: 'Constancia', icon: Flame, color: 'text-orange-500' },
        { id: '3', title: 'Elite', icon: ShieldCheck, color: 'text-emerald-500' },
      ]);

    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'multiple');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchData();
    
    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });

    return () => unsubscribeUser();
  }, [fetchData, user?.uid]);

  const themeColor = userData?.type === 'child' ? '#3B82F6' : '#D4AF37';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 pb-24">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                <Zap size={20} className="mx-auto mb-2 text-blue-500" fill="currentColor" />
                <p className="text-lg font-black">{userData?.points || 0}</p>
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Puntos</p>
              </div>
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                <Trophy size={20} className="mx-auto mb-2 text-yellow-500" fill="currentColor" />
                <p className="text-lg font-black">{userData?.level || 1}</p>
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Nivel</p>
              </div>
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center">
                <ShieldCheck size={20} className="mx-auto mb-2 text-emerald-500" fill="currentColor" />
                <p className="text-lg font-black">{userData?.trustScore?.toFixed(1) || '5.0'}</p>
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Confianza</p>
              </div>
            </div>

            {/* Active Challenges Preview */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Retos Disponibles</h2>
                <button onClick={() => setActiveTab('retos')} className="text-[10px] font-bold text-[#D4AF37] uppercase">Ver todos</button>
              </div>
              <div className="space-y-3">
                {activeChallenges.slice(0, 2).map((challenge) => (
                  <div key={challenge.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
                      <Award size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold">{challenge.title}</h3>
                      <p className="text-[10px] text-zinc-500">{challenge.score} PTS</p>
                    </div>
                    <button 
                      onClick={() => onNavigate('retos', challenge)}
                      className="p-2 bg-zinc-800 rounded-xl text-[#D4AF37]"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Activity */}
            <section>
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Actividad Reciente</h2>
              <div className="space-y-3">
                {recentHistory.map((log) => (
                  <div key={log.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                        <History size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{log.workoutName}</p>
                        <p className="text-[10px] text-zinc-500">{log.createdAt?.toDate().toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-[#D4AF37]">{log.rpe || 0} RPE</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        );
      case 'retos':
        return (
          <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black">Retos y Torneos</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => onNavigate('retos')}
                className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col items-center gap-3 hover:border-[#D4AF37]/50 transition-all"
              >
                <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500">
                  <Trophy size={32} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Retos</span>
              </button>
              <button 
                onClick={() => onNavigate('torneos')}
                className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col items-center gap-3 hover:border-[#D4AF37]/50 transition-all"
              >
                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                  <Award size={32} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Torneos</span>
              </button>
            </div>

            <div className="space-y-4 mt-8">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Retos Destacados</h3>
              <div className="grid grid-cols-1 gap-4">
                {activeChallenges.slice(0, 3).map((challenge) => (
                  <div key={challenge.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold">{challenge.title}</h3>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{challenge.description}</p>
                      </div>
                      <div className="bg-yellow-500/10 px-3 py-1 rounded-full text-yellow-500 text-[10px] font-black">
                        Lvl {challenge.level}
                      </div>
                    </div>
                    <a 
                      href={challenge.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-zinc-800 py-3 rounded-xl text-xs font-bold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                      Ver Reto
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'progreso':
        return (
          <div className="space-y-8 pb-24">
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37]">
                  <TrendingUp size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black">Nivel {userData?.level || 1}</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">{userData?.xp || 0} / 1000 XP para el siguiente nivel</p>
                </div>
              </div>
              <div className="h-3 bg-black rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((userData?.xp || 0) / 1000) * 100, 100)}%` }}
                  className="h-full bg-[#D4AF37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                />
              </div>
            </div>

            <section>
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Logros Desbloqueados</h2>
              <div className="grid grid-cols-3 gap-4">
                {achievements.map((ach) => (
                  <div key={ach.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 text-center group hover:border-[#D4AF37]/50 transition-all">
                    <div className={`w-12 h-12 mx-auto mb-3 bg-black rounded-xl flex items-center justify-center ${ach.color}`}>
                      <ach.icon size={24} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">{ach.title}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Historial Completo</h2>
              <button 
                onClick={() => onNavigate('historial')}
                className="w-full bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between text-zinc-400 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <History size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">Ver historial de entrenamientos</span>
                </div>
                <ChevronRight size={20} />
              </button>
            </section>
          </div>
        );
      case 'ranking':
        return (
          <div className="space-y-6 pb-24">
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 text-center">
              <Trophy size={48} className="mx-auto text-yellow-500 mb-4" />
              <h2 className="text-2xl font-black">Ranking Global</h2>
              <p className="text-xs text-zinc-500 mt-1">Compite con otros atletas y sube de nivel</p>
            </div>

            <div className="space-y-2">
              {ranking.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`p-4 rounded-2xl flex items-center gap-4 transition-all ${
                    player.id === user.uid ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50' : 'bg-zinc-900/50 border border-zinc-800'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-zinc-300 text-black' :
                    index === 2 ? 'bg-orange-400 text-black' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    {index + 1}
                  </div>
                  <img 
                    src={player.photoURL || `https://ui-avatars.com/api/?name=${player.displayName}&background=random`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{player.displayName}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Nivel {player.level || 1}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#D4AF37]">{player.points || 0} PTS</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-8 pt-12 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
                <ArrowLeft size={24} />
              </button>
            )}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=${themeColor.replace('#', '')}&color=000`} 
                  alt={user.displayName} 
                  className="w-16 h-16 rounded-3xl object-cover border-2"
                  style={{ borderColor: themeColor }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-2 -right-2 bg-black border border-zinc-800 px-2 py-1 rounded-xl flex items-center gap-1">
                  <Star size={12} style={{ color: themeColor }} fill={themeColor} />
                  <span className="text-xs font-black" style={{ color: themeColor }}>{userData?.level || 1}</span>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">{user.displayName?.split(' ')[0]}</h1>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Atleta Elite</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-3 bg-zinc-900 rounded-2xl text-zinc-600 hover:text-white transition-colors"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={onLogout}
              className="p-3 bg-zinc-900 rounded-2xl text-zinc-600 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-zinc-900 p-4 flex justify-around items-center z-50">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`p-2 transition-colors ${activeTab === 'dashboard' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}
        >
          <TrendingUp size={24} />
        </button>
        <button 
          onClick={() => setActiveTab('retos')} 
          className={`p-2 transition-colors ${activeTab === 'retos' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}
        >
          <Trophy size={24} />
        </button>
        <button 
          onClick={() => setActiveTab('progreso')} 
          className={`p-2 transition-colors ${activeTab === 'progreso' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}
        >
          <Award size={24} />
        </button>
        <button 
          onClick={() => setActiveTab('ranking')} 
          className={`p-2 transition-colors ${activeTab === 'ranking' ? 'text-[#D4AF37]' : 'text-zinc-500'}`}
        >
          <Users size={24} />
        </button>
      </nav>
    </div>
  );
};
