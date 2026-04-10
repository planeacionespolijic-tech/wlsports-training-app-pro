import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Trophy, Users, Plus, X, Loader2, 
  ChevronRight, Award, Calendar, Star, Trash2,
  Medal, TrendingUp, UserPlus
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, onSnapshot, orderBy, 
  doc, addDoc, serverTimestamp, getDocs, 
  updateDoc, deleteDoc, where
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface Tournament {
  id: string;
  title: string;
  players: string[]; // Array of player names or IDs
  createdAt: any;
}

interface MatchDay {
  id: string;
  tournamentId: string;
  dateName: string;
  results: {
    playerId: string;
    playerName: string;
    outcome: 'win' | 'draw' | 'loss';
    points: number;
  }[];
  createdAt: any;
}

interface Bonus {
  id: string;
  tournamentId: string;
  playerId: string;
  playerName: string;
  points: number;
  reason: string;
  createdAt: any;
}

interface TournamentsScreenProps {
  onBack: () => void;
  userId: string;
  role?: string;
}

export const TournamentsScreen = ({ onBack, userId, role }: TournamentsScreenProps) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [matchDays, setMatchDays] = useState<MatchDay[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showAddBonusModal, setShowAddBonusModal] = useState(false);
  const [showEditPlayersModal, setShowEditPlayersModal] = useState(false);

  const [newTournament, setNewTournament] = useState({ title: '', players: [] as string[] });
  const [newPlayerName, setNewPlayerName] = useState('');
  
  const [newMatchDay, setNewMatchDay] = useState({
    dateName: '',
    results: [] as { playerId: string; playerName: string; outcome: 'win' | 'draw' | 'loss'; points: number }[]
  });

  const [newBonus, setNewBonus] = useState({
    playerId: '',
    playerName: '',
    points: 0,
    reason: ''
  });

  const isTrainer = role === 'trainer';

  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTournaments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedTournament) return;

    const qMatches = query(
      collection(db, 'tournamentMatches'), 
      where('tournamentId', '==', selectedTournament.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeMatches = onSnapshot(qMatches, (snapshot) => {
      setMatchDays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchDay)));
    });

    const qBonuses = query(
      collection(db, 'tournamentBonuses'),
      where('tournamentId', '==', selectedTournament.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeBonuses = onSnapshot(qBonuses, (snapshot) => {
      setBonuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bonus)));
    });

    return () => {
      unsubscribeMatches();
      unsubscribeBonuses();
    };
  }, [selectedTournament]);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournament.title || newTournament.players.length === 0) return;
    try {
      await addDoc(collection(db, 'tournaments'), {
        ...newTournament,
        createdAt: serverTimestamp()
      });
      setShowCreateModal(false);
      setNewTournament({ title: '', players: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tournaments');
    }
  };

  const handleAddMatchDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !newMatchDay.dateName) return;
    try {
      await addDoc(collection(db, 'tournamentMatches'), {
        tournamentId: selectedTournament.id,
        dateName: newMatchDay.dateName,
        results: newMatchDay.results,
        createdAt: serverTimestamp()
      });
      setShowAddMatchModal(false);
      setNewMatchDay({ dateName: '', results: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tournamentMatches');
    }
  };

  const handleAddBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !newBonus.playerId || !newBonus.points) return;
    try {
      await addDoc(collection(db, 'tournamentBonuses'), {
        tournamentId: selectedTournament.id,
        ...newBonus,
        createdAt: serverTimestamp()
      });
      setShowAddBonusModal(false);
      setNewBonus({ playerId: '', playerName: '', points: 0, reason: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tournamentBonuses');
    }
  };

  const handleUpdatePlayers = async () => {
    if (!selectedTournament) return;
    try {
      await updateDoc(doc(db, 'tournaments', selectedTournament.id), {
        players: selectedTournament.players
      });
      setShowEditPlayersModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tournaments');
    }
  };

  const calculateStandings = () => {
    if (!selectedTournament) return [];
    const standings: Record<string, { name: string; points: number; wins: number; draws: number; losses: number }> = {};
    
    selectedTournament.players.forEach(p => {
      standings[p] = { name: p, points: 0, wins: 0, draws: 0, losses: 0 };
    });

    matchDays.forEach(md => {
      md.results.forEach(r => {
        if (standings[r.playerName]) {
          standings[r.playerName].points += r.points;
          if (r.outcome === 'win') standings[r.playerName].wins++;
          else if (r.outcome === 'draw') standings[r.playerName].draws++;
          else if (r.outcome === 'loss') standings[r.playerName].losses++;
        }
      });
    });

    bonuses.forEach(b => {
      if (standings[b.playerName]) {
        standings[b.playerName].points += b.points;
      }
    });

    return Object.values(standings).sort((a, b) => b.points - a.points);
  };

  if (selectedTournament) {
    const standings = calculateStandings();
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedTournament(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">{selectedTournament.title}</h1>
              <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">Panel de Torneo</p>
            </div>
          </div>
          {isTrainer && (
            <div className="flex gap-2">
              <button onClick={() => setShowEditPlayersModal(true)} className="p-2 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white"><Users size={20} /></button>
              <button onClick={() => setShowAddMatchModal(true)} className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2">
                <Plus size={16} /> Nueva Fecha
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Standings Table */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Medal className="text-[#D4AF37]" size={24} />
                    <h2 className="font-black uppercase tracking-widest text-sm">Tabla de Posiciones</h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">
                        <th className="px-6 py-4">Pos</th>
                        <th className="px-6 py-4">Jugador</th>
                        <th className="px-6 py-4 text-center">G</th>
                        <th className="px-6 py-4 text-center">E</th>
                        <th className="px-6 py-4 text-center">P</th>
                        <th className="px-6 py-4 text-right">PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {standings.map((player, idx) => (
                        <tr key={player.name} className="group hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                              idx === 0 ? 'bg-[#D4AF37] text-black' : 
                              idx === 1 ? 'bg-zinc-300 text-black' :
                              idx === 2 ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold">{player.name}</td>
                          <td className="px-6 py-4 text-center text-zinc-400">{player.wins}</td>
                          <td className="px-6 py-4 text-center text-zinc-400">{player.draws}</td>
                          <td className="px-6 py-4 text-center text-zinc-400">{player.losses}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-[#D4AF37] font-black text-lg">{player.points}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Match Days History */}
              <div className="space-y-4">
                <h3 className="font-black uppercase tracking-widest text-xs text-zinc-500 flex items-center gap-2">
                  <Calendar size={14} /> Historial de Fechas
                </h3>
                <div className="grid gap-4">
                  {matchDays.map(md => (
                    <div key={md.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm">{md.dateName}</h4>
                        <span className="text-[10px] text-zinc-500">{new Date(md.createdAt?.toDate()).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {md.results.map((r, i) => (
                          <div key={i} className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 ${
                            r.outcome === 'win' ? 'bg-emerald-500/10 text-emerald-500' :
                            r.outcome === 'draw' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {r.playerName}: {r.outcome === 'win' ? 'Victoria' : r.outcome === 'draw' ? 'Empate' : 'Derrota'}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar: Bonuses */}
            <div className="space-y-6">
              <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Star className="text-yellow-500" size={20} />
                    <h2 className="font-black uppercase tracking-widest text-xs">Bonos y Logros</h2>
                  </div>
                  {isTrainer && (
                    <button onClick={() => setShowAddBonusModal(true)} className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
                      <Plus size={16} />
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {bonuses.length === 0 ? (
                    <p className="text-zinc-600 text-xs italic text-center py-4">No hay bonos otorgados.</p>
                  ) : (
                    bonuses.map(b => (
                      <div key={b.id} className="bg-black/30 p-3 rounded-xl border border-zinc-800/50">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-xs">{b.playerName}</span>
                          <span className="text-[#D4AF37] font-black text-xs">+{b.points}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic">"{b.reason}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Modals for Tournament Details */}
        <AnimatePresence>
          {showAddMatchModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 w-full max-w-2xl rounded-3xl border border-zinc-800 p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black">Nueva Fecha</h2>
                  <button onClick={() => setShowAddMatchModal(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                </div>
                <form onSubmit={handleAddMatchDay} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre de la Fecha</label>
                    <input type="text" required value={newMatchDay.dateName} onChange={(e) => setNewMatchDay({ ...newMatchDay, dateName: e.target.value })} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37]" placeholder="Ej: Fecha 1 - Fútbol Tenis" />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Resultados por Jugador</label>
                    {selectedTournament.players.map(player => {
                      const result = newMatchDay.results.find(r => r.playerName === player);
                      return (
                        <div key={player} className="flex items-center justify-between bg-black/50 p-4 rounded-xl border border-zinc-800">
                          <span className="font-bold text-sm">{player}</span>
                          <div className="flex gap-2">
                            {[
                              { label: 'G', val: 'win', pts: 3, color: 'bg-emerald-500' },
                              { label: 'E', val: 'draw', pts: 1, color: 'bg-blue-500' },
                              { label: 'P', val: 'loss', pts: 0, color: 'bg-red-500' }
                            ].map(opt => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => {
                                  const filtered = newMatchDay.results.filter(r => r.playerName !== player);
                                  setNewMatchDay({
                                    ...newMatchDay,
                                    results: [...filtered, { playerId: player, playerName: player, outcome: opt.val as any, points: opt.pts }]
                                  });
                                }}
                                className={`w-10 h-10 rounded-lg font-black text-xs transition-all ${
                                  result?.outcome === opt.val ? `${opt.color} text-white scale-110 shadow-lg` : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button type="submit" className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-2xl">Guardar Fecha</button>
                </form>
              </motion.div>
            </div>
          )}

          {showAddBonusModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-800 p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black">Otorgar Bono</h2>
                  <button onClick={() => setShowAddBonusModal(null)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                </div>
                <form onSubmit={handleAddBonus} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Jugador</label>
                    <select required value={newBonus.playerName} onChange={(e) => setNewBonus({ ...newBonus, playerId: e.target.value, playerName: e.target.value })} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37]">
                      <option value="">Seleccionar jugador...</option>
                      {selectedTournament.players.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Puntos</label>
                    <input type="number" required value={newBonus.points} onChange={(e) => setNewBonus({ ...newBonus, points: parseInt(e.target.value) })} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Razón</label>
                    <input type="text" required value={newBonus.reason} onChange={(e) => setNewBonus({ ...newBonus, reason: e.target.value })} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37]" placeholder="Ej: Mejor actitud" />
                  </div>
                  <button type="submit" className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-2xl">Otorgar Bono</button>
                </form>
              </motion.div>
            </div>
          )}

          {showEditPlayersModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-800 p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black">Gestionar Jugadores</h2>
                  <button onClick={() => setShowEditPlayersModal(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} className="flex-1 bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37]" placeholder="Nombre del jugador..." />
                    <button onClick={() => { if (newPlayerName) { setSelectedTournament({ ...selectedTournament, players: [...selectedTournament.players, newPlayerName] }); setNewPlayerName(''); } }} className="bg-[#D4AF37] text-black p-4 rounded-xl"><Plus size={20} /></button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {selectedTournament.players.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-black/50 p-3 rounded-xl border border-zinc-800">
                        <span className="text-sm font-bold">{p}</span>
                        <button onClick={() => setSelectedTournament({ ...selectedTournament, players: selectedTournament.players.filter((_, idx) => idx !== i) })} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleUpdatePlayers} className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-2xl">Guardar Cambios</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Torneos</h1>
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
        <div className="max-w-4xl mx-auto space-y-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-12 rounded-3xl text-center">
              <Award className="mx-auto text-zinc-800 mb-4" size={48} />
              <p className="text-zinc-600 italic text-sm">No hay torneos activos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tournaments.map(tournament => (
                <motion.div 
                  key={tournament.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedTournament(tournament)}
                  className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 hover:border-[#D4AF37]/50 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-[#D4AF37]/10 p-3 rounded-2xl">
                      <Trophy className="text-[#D4AF37]" size={24} />
                    </div>
                    <ChevronRight className="text-zinc-700 group-hover:text-[#D4AF37] transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{tournament.title}</h3>
                  <div className="flex items-center gap-4 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{tournament.players.length} Jugadores</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{new Date(tournament.createdAt?.toDate()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Tournament Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 w-full max-w-lg rounded-3xl border border-zinc-800 p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">Nuevo Torneo</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateTournament} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Título del Torneo</label>
                  <input type="text" required value={newTournament.title} onChange={(e) => setNewTournament({ ...newTournament, title: e.target.value })} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37]" placeholder="Ej: Copa Verano 2024" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Agregar Jugadores</label>
                  <div className="flex gap-2 mb-4">
                    <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} className="flex-1 bg-black border border-zinc-800 rounded-xl p-4 text-sm outline-none focus:border-[#D4AF37]" placeholder="Nombre del jugador..." />
                    <button type="button" onClick={() => { if (newPlayerName) { setNewTournament({ ...newTournament, players: [...newTournament.players, newPlayerName] }); setNewPlayerName(''); } }} className="bg-[#D4AF37] text-black p-4 rounded-xl"><Plus size={20} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2">
                    {newTournament.players.map((p, i) => (
                      <div key={i} className="bg-zinc-800 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold">
                        {p}
                        <button type="button" onClick={() => setNewTournament({ ...newTournament, players: newTournament.players.filter((_, idx) => idx !== i) })} className="text-zinc-500 hover:text-red-500"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-2xl">Crear Torneo</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
