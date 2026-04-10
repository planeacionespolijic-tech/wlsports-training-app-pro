import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Activity, Dumbbell, History, FileText, TrendingUp, 
  Trophy, Zap, Timer, Video, Plus, Search, Loader2, 
  ChevronRight, Calendar, MessageSquare, Bell, CheckCircle2, X, Play, ExternalLink, LogOut as LogOutIcon, RefreshCw, ArrowLeft,
  LayoutDashboard, Award
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, getDoc, doc, updateDoc, addDoc, serverTimestamp, increment, getDocs, startAfter } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface TrainerDashboardProps {
  user: any;
  onNavigate: (screen: string, data?: any) => void;
  onLogout: () => void;
  onBack?: () => void;
}

export const TrainerDashboard = ({ user, onNavigate, onLogout, onBack }: TrainerDashboardProps) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'athletes' | 'challenges' | 'tools'>('dashboard');
  const [athletes, setAthletes] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAthletes = useCallback(async () => {
    // This is now handled by onSnapshot in useEffect
    // Keeping the function signature if needed for manual refresh button
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('trainerId', '==', user.uid),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (a.displayName || '').localeCompare(b.displayName || ''));
      setAthletes(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to athletes (onSnapshot)
    const athletesQuery = query(
      collection(db, 'users'),
      where('trainerId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribeAthletes = onSnapshot(athletesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (a.displayName || '').localeCompare(b.displayName || ''));
      setAthletes(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    // Activity recent (getDocs - one time)
    const fetchActivity = async () => {
      try {
        const q = query(
          collection(db, 'history'),
          where('trainerId', '==', user.uid),
          limit(20)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a: any, b: any) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setRecentActivity(data);
      } catch (e) {
        console.error('Error fetching activity:', e);
      }
    };
    fetchActivity();

    // Listen to pending submissions (onSnapshot - filtered by trainerId)
    const submissionsQuery = query(
      collection(db, 'challengeSubmissions'),
      where('trainerId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      subs.sort((a: any, b: any) => {
        const dateA = a.timestamp?.toDate?.() || new Date(0);
        const dateB = b.timestamp?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setPendingSubmissions(subs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'challengeSubmissions');
    });

    return () => {
      unsubscribeAthletes();
      unsubscribeSubmissions();
    };
  }, [user?.uid]);

  const trainerSubmissions = pendingSubmissions;

  const handleValidateSubmission = async (submission: any, approved: boolean) => {
    try {
      const challengeDoc = await getDoc(doc(db, 'challenges', submission.challengeId));
      if (!challengeDoc.exists()) return;
      const challenge = challengeDoc.data();

      await updateDoc(doc(db, 'challengeSubmissions', submission.id), {
        status: approved ? 'approved' : 'rejected',
        validatedAt: serverTimestamp()
      });

      if (approved) {
        // Award points
        await updateDoc(doc(db, 'users', submission.userId), {
          points: increment(challenge.score),
          xp: increment(challenge.score * 2),
          trustScore: increment(0.2) // Higher trust for manual validation
        });

        await addDoc(collection(db, 'gamificationLogs'), {
          userId: submission.userId,
          type: 'points',
          value: challenge.score,
          reason: `Reto validado por entrenador: ${challenge.title}`,
          createdAt: serverTimestamp()
        });
      } else {
        // Decrease trust score slightly on rejection if it was a false claim
        await updateDoc(doc(db, 'users', submission.userId), {
          trustScore: increment(-0.1)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'challengeSubmissions');
    }
  };

  const filteredAthletes = athletes.filter(a => 
    a.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: 'Atletas', value: athletes.length, icon: Users, color: 'text-blue-500' },
    { label: 'Sesiones Hoy', value: 0, icon: Calendar, color: 'text-green-500' },
    { label: 'Retos Activos', value: 0, icon: Trophy, color: 'text-yellow-500' },
    { label: 'Evaluaciones', value: 0, icon: Activity, color: 'text-purple-500' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 pb-24">
            {/* Pending Validations */}
            {trainerSubmissions.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-black text-orange-500 uppercase tracking-[0.2em]">Validaciones Pendientes</h2>
                  <span className="bg-orange-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                    {trainerSubmissions.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {trainerSubmissions.map((sub) => {
                    const athlete = athletes.find(a => a.id === sub.userId);
                    return (
                      <div key={sub.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img 
                              src={athlete?.photoURL || `https://ui-avatars.com/api/?name=${athlete?.displayName}&background=333&color=fff`} 
                              className="w-8 h-8 rounded-full border border-zinc-800"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="text-sm font-bold">{athlete?.displayName}</p>
                              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Envió evidencia</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-zinc-500">{sub.timestamp?.toDate().toLocaleString()}</p>
                          </div>
                        </div>

                        {sub.videoUrl && (
                          <a 
                            href={sub.videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-black rounded-xl border border-zinc-800 text-xs text-[#D4AF37] hover:bg-zinc-900 transition-colors"
                          >
                            <Play size={14} fill="currentColor" />
                            Ver Evidencia de Video
                            <ExternalLink size={12} className="ml-auto" />
                          </a>
                        )}

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleValidateSubmission(sub, true)}
                            className="flex-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            Aprobar
                          </button>
                          <button 
                            onClick={() => handleValidateSubmission(sub, false)}
                            className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Recent Activity */}
            <section>
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Actividad Reciente</h2>
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                      <CheckCircle size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">
                        <span className="text-[#D4AF37]">{log.userName || 'Atleta'}</span> completó <span className="text-white">{log.workoutName}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{log.createdAt?.toDate().toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className="text-center text-zinc-600 text-xs italic py-4">Sin actividad reciente</p>
                )}
              </div>
            </section>
          </div>
        );
      case 'athletes':
        return (
          <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Mis Atletas</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                  <input 
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs outline-none focus:border-[#D4AF37] transition-all w-32 focus:w-48"
                  />
                </div>
                <button 
                  onClick={() => onNavigate('deportistas')}
                  className="bg-[#D4AF37] text-black p-1.5 rounded-full hover:scale-110 transition-transform"
                  title="Gestionar Atletas"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="text-[#D4AF37] animate-spin" size={24} />
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredAthletes.map((athlete) => (
                  <button 
                    key={athlete.id}
                    onClick={() => onNavigate('athlete-profile', athlete)}
                    className="w-full flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800 rounded-2xl hover:bg-zinc-900 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <img 
                        src={athlete.photoURL || `https://ui-avatars.com/api/?name=${athlete.displayName}&background=333&color=fff`} 
                        alt={athlete.displayName} 
                        className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-left">
                        <h3 className="font-bold text-sm">{athlete.displayName}</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Nivel {athlete.level || 1}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-700 group-hover:text-[#D4AF37] transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case 'challenges':
        return (
          <div className="space-y-6 pb-24">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Retos y Competencias</h2>
            <div className="grid gap-4">
              {[
                { id: 'retos', title: 'Retos por Niveles', icon: Trophy, desc: 'Contenido práctico por niveles', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                { id: 'torneos', title: 'Torneos', icon: Award, desc: 'Gestión de ligas y competencias', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { id: 'progresion', title: 'Progresión', icon: TrendingUp, desc: 'XP, Niveles y Logros', color: 'text-purple-500', bg: 'bg-purple-500/10' },
              ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => onNavigate(item.id as any)}
                  className="w-full flex items-center gap-4 p-5 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-[#D4AF37]/50 transition-all text-left"
                >
                  <div className={`p-4 rounded-2xl ${item.bg} ${item.color}`}>
                    <item.icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    <p className="text-xs text-zinc-500">{item.desc}</p>
                  </div>
                  <ChevronRight size={20} className="ml-auto text-zinc-700" />
                </button>
              ))}
            </div>
          </div>
        );
      case 'tools':
        return (
          <div className="space-y-6 pb-24">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Herramientas de Entrenamiento</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'tabata', title: 'Tabata Timer', icon: Timer, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                { id: 'reaccion', title: 'Reacción Visual', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { id: 'videoAnalysis', title: 'Análisis Video', icon: Video, color: 'text-red-500', bg: 'bg-red-500/10' },
                { id: 'entrenamientos', title: 'Rutinas Globales', icon: Dumbbell, color: 'text-green-500', bg: 'bg-green-500/10' },
                { id: 'exercise-bank', title: 'Banco Ejercicios', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              ].map((tool) => (
                <button 
                  key={tool.id}
                  onClick={() => onNavigate(tool.id)}
                  className="flex flex-col items-center justify-center p-6 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-[#D4AF37]/50 transition-all group"
                >
                  <div className={`p-4 rounded-2xl mb-3 transition-transform group-hover:scale-110 ${tool.bg} ${tool.color}`}>
                    <tool.icon size={28} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest">{tool.title}</span>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-6 pt-10 border-b border-zinc-900 bg-black/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400">
                <ArrowLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight">Panel <span className="text-[#D4AF37]">Entrenador</span></h1>
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mt-1">Gestión de Alto Rendimiento</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchAthletes()}
              disabled={loading}
              className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={onLogout}
              className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-red-500 transition-colors"
            >
              <LogOutIcon size={20} />
            </button>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=D4AF37&color=000`} 
              alt={user.displayName} 
              className="w-10 h-10 rounded-full border border-zinc-800 object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon size={14} className={stat.color} />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">{stat.label}</span>
              </div>
              <p className="text-xl font-black">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-900 p-4 pb-8 flex justify-around items-center z-50">
        {[
          { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
          { id: 'athletes', label: 'Atletas', icon: Users },
          { id: 'challenges', label: 'Retos', icon: Trophy },
          { id: 'tools', label: 'Herramientas', icon: Zap },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === tab.id ? 'text-[#D4AF37] scale-110' : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <tab.icon size={24} strokeWidth={activeTab === tab.id ? 3 : 2} />
            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const CheckCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const LogOut = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
