import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Dumbbell, History, FileText, TrendingUp, 
  Trophy, Zap, Timer, Video, Loader2, 
  ChevronRight, Calendar, Bell, LogOut,
  Star, Target, Award, ShieldCheck, RefreshCw, ArrowLeft,
  Flame, Users, Shield, X, Trash2, Heart
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LEVELS, getLevelFromXP } from '../constants';
import { analyzeProgress, AnalysisResult } from '../services/intelligenceService';

export const ClientDashboard = ({ onNavigate }: any) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'retos' | 'progreso' | 'ranking'>('dashboard');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

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
        orderBy('createdAt', 'desc'),
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

      // Fetch intelligence analysis
      const analysisData = await analyzeProgress(user.uid);
      setAnalysis(analysisData);

    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'multiple');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (!name.includes('v4')) {
            await caches.delete(name);
          }
        }
      }
    } catch {
      // ignore
    }
    await fetchData(true);
    window.location.reload();
  };

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

  const handleDeleteActivity = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'history', id));
      setRecentHistory(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'history');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-4 sm:space-y-6 pb-24">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800 text-center shadow-lg">
                <Zap size={22} className="mx-auto mb-1 text-blue-500" fill="currentColor" />
                <p className="text-xl sm:text-2xl font-black">{userData?.points || 0}</p>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Puntos</p>
              </div>
              <div className="bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800 text-center shadow-lg">
                <Trophy size={22} className="mx-auto mb-1 text-yellow-500" fill="currentColor" />
                <p className="text-xl sm:text-2xl font-black">{userData?.level || 1}</p>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nivel</p>
              </div>
              <div className="bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800 text-center shadow-lg">
                <ShieldCheck size={22} className="mx-auto mb-1 text-emerald-500" fill="currentColor" />
                <p className="text-xl sm:text-2xl font-black">{userData?.trustScore?.toFixed(1) || '5.0'}</p>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Confianza</p>
              </div>
            </div>

            {/* Initial Evaluation Call to Action */}
            {!userData?.initialEvaluation && !localStorage.getItem('dismiss_eval_cta') && (
              <section 
                className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 p-4 sm:p-6 rounded-2xl sm:rounded-3xl relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer" 
                onClick={() => onNavigate ? onNavigate('evaluacion360') : navigate(`/evaluacion360`)}
              >
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    localStorage.setItem('dismiss_eval_cta', 'true');
                    fetchData(); // Trigger re-render
                  }}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-2 hover:bg-black/20 rounded-lg text-[#D4AF37] opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
                <div className="relative z-10">
                  <div className="bg-black/20 w-10 h-10 rounded-xl flex items-center justify-center text-[#D4AF37] mb-3 sm:mb-4">
                    <Shield size={20} />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#D4AF37] mb-1">Evaluación Inicial 360°</h3>
                  <p className="text-xs text-zinc-400 font-medium">Realiza tu escáner inicial integral para un entrenamiento personalizado.</p>
                </div>
                <Shield size={120} className="absolute -right-8 -bottom-8 opacity-5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
              </section>
            )}

            {/* Heart Rate Zone Quick Reference */}
            {userData?.hrZones && (
              <section className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="p-2 bg-red-500/10 rounded-xl text-red-500">
                      <Heart size={18} fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-tight">Mi Intensidad Hoy</h3>
                      <p className="text-[11px] text-zinc-500 font-bold">ZONAS DE ENTRENAMIENTO</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onNavigate ? onNavigate('zonas') : navigate('/zonas')}
                    className="text-xs font-black text-[#D4AF37] uppercase bg-[#D4AF37]/10 px-3 py-1.5 rounded-full"
                  >
                    Ajustar
                  </button>
                </div>
                
                <div className="flex gap-1.5 sm:gap-2">
                  {userData.hrZones.map((zone: any, i: number) => {
                    const isTarget = analysis?.status === 'Recuperación' ? i < 2 : (analysis?.status === 'Progresando' ? i === 3 : i === 2);
                    return (
                      <div 
                        key={i} 
                        className={`flex-1 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${isTarget ? 'ring-2 ring-white scale-105 opacity-100' : 'opacity-30 grayscale-[50%]'}`}
                        title={`${zone.name}: ${zone.min}-${zone.max} BPM`}
                      >
                        <div className={`w-full h-1.5 ${zone.color} rounded-t-xl mb-1`} />
                        <span className="text-[10px] font-black leading-none">Z{i+1}</span>
                        <span className="text-[10px] sm:text-xs font-bold text-zinc-400 mt-0.5">{zone.min}</span>
                      </div>
                    );
                  })}
                </div>
                {analysis?.status && (
                  <p className="mt-3 text-xs text-center text-zinc-400 font-medium">
                    Hoy el sistema sugiere mantenerte en <span className="text-white font-bold">{analysis.status === 'Recuperación' ? 'Zona 1-2' : analysis.status === 'Progresando' ? 'Zona 4' : 'Zona 3'}</span> para optimizar tu carga.
                  </p>
                )}
              </section>
            )}

            {/* Active Challenges Preview */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs sm:text-sm font-black text-zinc-400 uppercase tracking-wider">Retos Disponibles</h2>
                <button onClick={() => setActiveTab('retos')} className="text-xs font-bold text-[#D4AF37] uppercase">Ver todos</button>
              </div>
              <div className="space-y-2.5">
                {activeChallenges.slice(0, 2).map((challenge) => (
                  <div key={challenge.id} className="p-3.5 sm:p-4 bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl flex items-center gap-3.5">
                    <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 flex-shrink-0">
                      <Award size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate">{challenge.title}</h3>
                      <p className="text-xs text-zinc-400">{challenge.score} PTS</p>
                    </div>
                    <button 
                      onClick={() => navigate('/retos', { state: challenge })}
                      className="p-2 bg-zinc-800 rounded-xl text-[#D4AF37]"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xs sm:text-sm font-black text-zinc-400 uppercase tracking-wider mb-3">Actividad Reciente</h2>
              <div className="space-y-2.5">
                {recentHistory.map((log) => (
                  <div key={log.id} className="p-3.5 sm:p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl sm:rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 flex-shrink-0">
                        <History size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{log.workoutName}</p>
                        <p className="text-xs text-zinc-400">{log.createdAt?.toDate().toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-black text-[#D4AF37]">{log.rpe || 0} RPE</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteActivity(log.id)}
                        className="p-2 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all border border-zinc-800 rounded-lg hover:bg-black"
                        title="Eliminar registro"
                      >
                        <Trash2 size={14} />
                      </button>
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
                onClick={() => navigate('/retos')}
                className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col items-center gap-3 hover:border-[#D4AF37]/50 transition-all"
              >
                <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500">
                  <Trophy size={32} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Retos</span>
              </button>
              <button 
                onClick={() => navigate('/torneos')}
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
        const currentXP = userData?.xp || 0;
        const currentLevel = getLevelFromXP(currentXP);
        const currentIndex = LEVELS.findIndex(l => l.name === currentLevel.name);
        const nextLevel = LEVELS[currentIndex + 1];
        
        let progress = 0;
        let xpForNext = nextLevel ? nextLevel.minXP : currentLevel.minXP;
        let xpStart = currentLevel.minXP;
        
        if (nextLevel) {
          progress = ((currentXP - xpStart) / (nextLevel.minXP - xpStart)) * 100;
        } else {
          progress = 100;
        }

        return (
          <div className="space-y-8 pb-24">
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37]">
                  <TrendingUp size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black">{currentLevel.name}</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                    {nextLevel ? `${currentXP} / ${nextLevel.minXP} XP para el siguiente nivel` : '¡Nivel máximo alcanzado!'}
                  </p>
                </div>
              </div>
              <div className="h-3 bg-black rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
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
                onClick={() => navigate('/historial')}
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
      <header className="p-4 sm:p-6 pt-safe bg-zinc-900/70 border-b border-zinc-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              {user && (
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=${themeColor.replace('#', '')}&color=000`} 
                  alt={user.displayName || ''} 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2"
                  style={{ borderColor: themeColor }}
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute -bottom-1 -right-1 bg-black border border-zinc-800 px-1.5 py-0.5 rounded-lg flex items-center gap-1 shadow-lg">
                <Star size={10} style={{ color: themeColor }} fill={themeColor} />
                <span className="text-[9px] font-black" style={{ color: themeColor }}>
                  {getLevelFromXP(userData?.xp || 0).name}
                </span>
              </div>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight">{user?.displayName?.split(' ')[0] || 'Atleta'}</h1>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Atleta Elite</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleForceRefresh()}
              disabled={refreshing}
              className="p-2.5 sm:p-3 bg-zinc-900 rounded-2xl text-zinc-400 hover:text-white transition-colors"
              title="Actualizar Interfaz"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={() => logout()}
              className="p-2.5 sm:p-3 bg-zinc-900 rounded-2xl text-zinc-400 hover:text-red-500 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-3.5 sm:p-6 max-w-2xl mx-auto w-full">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-zinc-900 px-3 py-2 pb-safe flex justify-around items-center z-50">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${activeTab === 'dashboard' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-400'}`}
        >
          <TrendingUp size={20} />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Inicio</span>
        </button>
        <button 
          onClick={() => setActiveTab('retos')} 
          className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${activeTab === 'retos' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-400'}`}
        >
          <Trophy size={20} />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Retos</span>
        </button>
        <button 
          onClick={() => setActiveTab('progreso')} 
          className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${activeTab === 'progreso' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-400'}`}
        >
          <Award size={20} />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Progreso</span>
        </button>
        <button 
          onClick={() => setActiveTab('ranking')} 
          className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${activeTab === 'ranking' ? 'text-[#D4AF37]' : 'text-zinc-500 hover:text-zinc-400'}`}
        >
          <Users size={20} />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">Ranking</span>
        </button>
      </nav>
    </div>
  );
};
