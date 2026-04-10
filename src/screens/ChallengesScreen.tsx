import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Trophy, Star, Zap, Loader2, CheckCircle2, 
  Target, Flame, Plus, Users, Swords, Award, 
  Calendar, ChevronRight, Filter, Search, X
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, where, onSnapshot, orderBy, 
  doc, updateDoc, increment, addDoc, serverTimestamp, 
  getDocs, arrayUnion, getDoc 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface Challenge {
  id: string;
  title: string;
  description?: string;
  level: number;
  videoUrl: string;
  xpReward?: number;
  createdAt: any;
}

interface ChallengesScreenProps {
  onBack: () => void;
  userId: string;
  role?: string;
  userProfile?: any;
}

export const ChallengesScreen = ({ onBack, userId, role, userProfile }: ChallengesScreenProps) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState<Challenge | null>(null);
  const [submitVideoUrl, setSubmitVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [newChallenge, setNewChallenge] = useState<Partial<Challenge>>({
    title: '',
    description: '',
    level: 1,
    videoUrl: '',
    xpReward: 0
  });

  const isTrainer = role === 'trainer';

  useEffect(() => {
    const q = query(collection(db, 'challenges'), orderBy('level', 'asc'), orderBy('createdAt', 'desc'));
    const unsubscribeChallenges = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Challenge[];
      setChallenges(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'challenges'));

    let unsubscribeSubmissions = () => {};
    if (userId && role === 'client') {
      const sq = query(
        collection(db, 'challengeSubmissions'),
        where('userId', '==', userId)
      );
      unsubscribeSubmissions = onSnapshot(sq, (snapshot) => {
        setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubscribeChallenges();
      unsubscribeSubmissions();
    };
  }, [userId, role]);

  const handleSubmitChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSubmitModal || !submitVideoUrl || !userProfile?.trainerId) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'challengeSubmissions'), {
        challengeId: showSubmitModal.id,
        userId: userId,
        trainerId: userProfile.trainerId,
        videoUrl: submitVideoUrl,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setShowSubmitModal(null);
      setSubmitVideoUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'challengeSubmissions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChallenge.title || !newChallenge.level || !newChallenge.videoUrl) return;

    try {
      await addDoc(collection(db, 'challenges'), {
        ...newChallenge,
        createdAt: serverTimestamp()
      });
      setShowCreateModal(false);
      setNewChallenge({ title: '', description: '', level: 1, videoUrl: '', xpReward: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'challenges');
    }
  };

  const groupedChallenges = challenges.reduce((acc, challenge) => {
    const level = challenge.level || 1;
    if (!acc[level]) acc[level] = [];
    acc[level].push(challenge);
    return acc;
  }, {} as Record<number, Challenge[]>);

  const levels = Object.keys(groupedChallenges).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Retos por Niveles</h1>
        </div>
        {isTrainer && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-[#D4AF37] text-black p-2 rounded-xl hover:scale-110 transition-all active:scale-95"
          >
            <Plus size={20} />
          </button>
        )}
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-12">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
            </div>
          ) : levels.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-12 rounded-3xl text-center">
              <Trophy className="mx-auto text-zinc-800 mb-4" size={48} />
              <p className="text-zinc-600 italic text-sm">No hay retos disponibles aún.</p>
            </div>
          ) : (
            levels.map(level => (
              <div key={level} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-zinc-800"></div>
                  <h2 className="text-[#D4AF37] font-black text-sm uppercase tracking-[0.2em]">Nivel {level}</h2>
                  <div className="h-px flex-1 bg-zinc-800"></div>
                </div>
                
                <div className="grid gap-4">
                  {groupedChallenges[level].map(challenge => (
                    <motion.div 
                      key={challenge.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[#D4AF37]/30 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-bold text-lg group-hover:text-[#D4AF37] transition-colors">{challenge.title}</h3>
                        {challenge.description && (
                          <p className="text-zinc-500 text-sm mt-1">{challenge.description}</p>
                        )}
                        {challenge.xpReward && (
                          <div className="flex items-center gap-1 mt-2 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest">
                            <Zap size={10} fill="currentColor" />
                            <span>{challenge.xpReward} XP</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a 
                          href={challenge.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                          Ver Reto
                          <ChevronRight size={16} />
                        </a>

                        {!isTrainer && (
                          (() => {
                            const submission = submissions.find(s => s.challengeId === challenge.id);
                            if (submission?.status === 'approved') {
                              return (
                                <div className="bg-emerald-500/10 text-emerald-500 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-emerald-500/20">
                                  <CheckCircle2 size={16} />
                                  Completado
                                </div>
                              );
                            }
                            if (submission?.status === 'pending') {
                              return (
                                <div className="bg-orange-500/10 text-orange-500 px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-orange-500/20">
                                  <Loader2 size={16} className="animate-spin" />
                                  Pendiente
                                </div>
                              );
                            }
                            return (
                              <button 
                                onClick={() => setShowSubmitModal(challenge)}
                                className="bg-[#D4AF37] hover:bg-[#B8962E] text-black px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                              >
                                Enviar Evidencia
                                <Plus size={16} />
                              </button>
                            );
                          })()
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Submit Evidence Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-800 p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black">Enviar Evidencia</h2>
                  <p className="text-zinc-500 text-xs mt-1">{showSubmitModal.title}</p>
                </div>
                <button onClick={() => setShowSubmitModal(null)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmitChallenge} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">URL del Video (Evidencia)</label>
                  <input 
                    type="url"
                    required
                    value={submitVideoUrl}
                    onChange={(e) => setSubmitVideoUrl(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37] transition-all"
                    placeholder="https://youtube.com/shorts/..."
                  />
                  <p className="text-[10px] text-zinc-600 mt-2 italic">Sube tu video a YouTube (Público u Oculto) y pega el link aquí.</p>
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#B8962E] transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Enviar para Revisión'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 w-full max-w-lg rounded-3xl border border-zinc-800 p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">Nuevo Reto</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>

              <form onSubmit={handleCreateChallenge} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Título</label>
                  <input 
                    type="text"
                    required
                    value={newChallenge.title}
                    onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37] transition-all"
                    placeholder="Ej: Control de balón"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Nivel</label>
                    <input 
                      type="number"
                      required
                      min="1"
                      value={newChallenge.level}
                      onChange={(e) => setNewChallenge({ ...newChallenge, level: parseInt(e.target.value) })}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">XP Reward</label>
                    <input 
                      type="number"
                      value={newChallenge.xpReward}
                      onChange={(e) => setNewChallenge({ ...newChallenge, xpReward: parseInt(e.target.value) })}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">URL del Video</label>
                  <input 
                    type="url"
                    required
                    value={newChallenge.videoUrl}
                    onChange={(e) => setNewChallenge({ ...newChallenge, videoUrl: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37] transition-all"
                    placeholder="https://youtube.com/..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Descripción (Opcional)</label>
                  <textarea 
                    value={newChallenge.description}
                    onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37] transition-all h-24 resize-none"
                    placeholder="Instrucciones breves..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-2xl mt-4 hover:bg-[#B8962E] transition-all active:scale-95"
                >
                  Crear Reto
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
