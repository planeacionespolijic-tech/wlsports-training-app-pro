import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Users, UserPlus, Activity, TrendingUp, Search, Loader2, Mail, Shield, Ban, Trash2, RotateCcw, AlertTriangle, CheckCircle2, CheckCircle, ClipboardList, Filter, Calendar, RefreshCw, ChevronDown } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, where, setDoc, doc, getDocs, serverTimestamp, updateDoc, Timestamp, limit, startAfter } from 'firebase/firestore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { motion, AnimatePresence } from 'motion/react';
import { logAuditEvent, AuditAction } from '../services/auditService';
import { fetchPaginated, PaginatedResult } from '../services/dataService';

interface SuperAdminDashboardProps {
  onBack: () => void;
  user: any;
  role: string;
}

export const SuperAdminDashboard = ({ onBack, user, role }: SuperAdminDashboardProps) => {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [view, setView] = useState<'trainers' | 'athletes' | 'audit' | 'metrics'>('trainers');
  const [showAddTrainer, setShowAddTrainer] = useState(false);
  const [newTrainer, setNewTrainer] = useState({ email: '', displayName: '' });
  const [stats, setStats] = useState({ totalTrainers: 0, totalClients: 0, totalSessions: 0, activeUsers: 0 });
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filters, setFilters] = useState({ action: '', performedBy: '', date: '' });
  
  const [athletesLastVisible, setAthletesLastVisible] = useState<any>(null);
  const [athletesHasMore, setAthletesHasMore] = useState(false);
  const [auditLastVisible, setAuditLastVisible] = useState<any>(null);
  const [auditHasMore, setAuditHasMore] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning';
    confirmText: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
    confirmText: 'Confirmar'
  });

  const fetchData = useCallback(async (isRefresh = false) => {
    setLoading(true);
    try {
      // Fetch Trainers (usually a smaller list, so we fetch all for now or limit to 50)
      const trainersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'trainer'),
        orderBy('lastLogin', 'desc'),
        limit(50)
      );
      const trainersSnap = await getDocs(trainersQuery);
      const trainersData = await Promise.all(trainersSnap.docs.map(async (trainerDoc) => {
        const trainer = { id: trainerDoc.id, ...trainerDoc.data() };
        const clientsQuery = query(collection(db, 'users'), where('trainerId', '==', trainer.id));
        const clientsSnapshot = await getDocs(clientsQuery);
        return { ...trainer, clientCount: clientsSnapshot.size };
      }));
      setTrainers(trainersData);

      // Initial Athletes fetch
      const athletesResult = await fetchPaginated<any>(
        'users',
        [where('role', '==', 'client'), orderBy('lastLogin', 'desc')],
        10
      );
      setAthletes(athletesResult.data);
      setAthletesLastVisible(athletesResult.lastVisible);
      setAthletesHasMore(athletesResult.hasMore);

      // Initial Audit Logs fetch
      const auditResult = await fetchPaginated<any>(
        'auditLogs',
        [orderBy('timestamp', 'desc')],
        10
      );
      setAuditLogs(auditResult.data);
      setAuditLastVisible(auditResult.lastVisible);
      setAuditHasMore(auditResult.hasMore);

      // Fetch Stats
      const historySnap = await getDocs(query(collection(db, 'history'), limit(1))); // Just to check if it exists or use a counter
      // In a real Spark plan, we should use a counter document for totalSessions
      // For now, we'll just set some placeholders or fetch a limited count
      setStats({
        totalTrainers: trainersSnap.size,
        totalClients: athletesResult.data.length, // This is just the first page, should be from a counter
        totalSessions: 0, // Placeholder
        activeUsers: trainersSnap.size + athletesResult.data.length
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'multiple');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreAthletes = async () => {
    if (!athletesHasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchPaginated<any>(
        'users',
        [where('role', '==', 'client'), orderBy('lastLogin', 'desc')],
        10,
        athletesLastVisible
      );
      setAthletes(prev => [...prev, ...result.data]);
      setAthletesLastVisible(result.lastVisible);
      setAthletesHasMore(result.hasMore);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMoreAudit = async () => {
    if (!auditHasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchPaginated<any>(
        'auditLogs',
        [orderBy('timestamp', 'desc')],
        10,
        auditLastVisible
      );
      setAuditLogs(prev => [...prev, ...result.data]);
      setAuditLastVisible(result.lastVisible);
      setAuditHasMore(result.hasMore);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'auditLogs');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrainer.email || !newTrainer.displayName) return;

    try {
      const emailId = newTrainer.email.trim().toLowerCase();
      await setDoc(doc(db, 'users', emailId), {
        email: newTrainer.email.trim().toLowerCase(),
        displayName: newTrainer.displayName,
        role: 'trainer',
        status: 'active',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });

      setNewTrainer({ email: '', displayName: '' });
      setShowAddTrainer(false);

      // Audit Log
      await logAuditEvent(
        AuditAction.CREATE_USER,
        user.uid,
        role,
        emailId,
        newTrainer.displayName,
        'Nuevo entrenador creado por superadmin (ID basado en email)'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const handleToggleBlockUser = (userToToggle: any) => {
    const isBlocked = userToToggle.status === 'blocked';
    
    setModalConfig({
      isOpen: true,
      title: isBlocked ? 'Desbloquear Usuario' : 'Bloquear Usuario',
      message: isBlocked 
        ? `¿Estás seguro de que deseas desbloquear a ${userToToggle.displayName}? Podrá volver a acceder a la aplicación.`
        : `¿Estás seguro de que deseas bloquear a ${userToToggle.displayName}? No podrá iniciar sesión hasta que sea desbloqueado.`,
      variant: isBlocked ? 'warning' : 'danger',
      confirmText: isBlocked ? 'Desbloquear' : 'Bloquear',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', userToToggle.id), {
            status: isBlocked ? 'active' : 'blocked'
          });

          // Audit Log
          await logAuditEvent(
            isBlocked ? AuditAction.UNBLOCK_USER : AuditAction.BLOCK_USER,
            user.uid,
            role,
            userToToggle.id,
            userToToggle.displayName,
            isBlocked ? 'Usuario desbloqueado' : 'Usuario bloqueado por superadmin'
          );

          setFeedback({ 
            message: `Usuario ${isBlocked ? 'desbloqueado' : 'bloqueado'} correctamente`, 
            type: 'success' 
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${userToToggle.id}`);
          setFeedback({ message: 'Error al actualizar el estado del usuario', type: 'error' });
        } finally {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteUser = (userToDelete: any) => {
    setModalConfig({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: `Esta acción eliminará a ${userToDelete.displayName}. Se mantendrá un respaldo por 60 días antes de la eliminación definitiva. ¿Deseas continuar?`,
      variant: 'danger',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          const restoreUntil = new Date();
          restoreUntil.setDate(restoreUntil.getDate() + 60);

          await updateDoc(doc(db, 'users', userToDelete.id), {
            status: 'deleted',
            deletedAt: serverTimestamp(),
            restoreUntil: Timestamp.fromDate(restoreUntil)
          });

          // Audit Log
          await logAuditEvent(
            AuditAction.DELETE_USER,
            user.uid,
            role,
            userToDelete.id,
            userToDelete.displayName,
            'Eliminado (soft delete) desde panel superadmin'
          );

          setFeedback({ message: 'Usuario eliminado correctamente', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${userToDelete.id}`);
          setFeedback({ message: 'Error al eliminar el usuario', type: 'error' });
        } finally {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleRestoreUser = (userToRestore: any) => {
    setModalConfig({
      isOpen: true,
      title: 'Restaurar Usuario',
      message: `¿Deseas restaurar el perfil de ${userToRestore.displayName}? El usuario volverá a estar activo en la plataforma.`,
      variant: 'warning',
      confirmText: 'Restaurar',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', userToRestore.id), {
            status: 'active',
            deletedAt: null,
            restoreUntil: null
          });

          // Audit Log
          await logAuditEvent(
            AuditAction.RESTORE_USER,
            user.uid,
            role,
            userToRestore.id,
            userToRestore.displayName,
            'Usuario restaurado desde papelera'
          );

          setFeedback({ message: 'Usuario restaurado correctamente', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${userToRestore.id}`);
          setFeedback({ message: 'Error al restaurar el usuario', type: 'error' });
        } finally {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const activeTrainers = trainers.filter(t => t.status !== 'deleted');
  const deletedTrainers = trainers.filter(t => t.status === 'deleted');
  const activeAthletes = athletes.filter(a => a.status !== 'deleted');
  const deletedAthletes = athletes.filter(a => a.status === 'deleted');

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Panel SuperAdmin</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchData(true)}
            disabled={loading}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-[#D4AF37]"
            title="Refrescar datos"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setShowAddTrainer(true)}
            className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#B8962E] transition-colors"
          >
            <UserPlus size={18} />
            Nuevo Entrenador
          </button>
        </div>
      </header>

      {/* Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              feedback.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span className="font-bold text-sm">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button 
            onClick={() => setView('trainers')}
            className={`p-4 rounded-3xl border transition-all text-left ${view === 'trainers' ? 'bg-[#D4AF37]/10 border-[#D4AF37]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
          >
            <div className="flex items-center gap-3 mb-2 text-zinc-500">
              <Shield size={16} className={view === 'trainers' ? 'text-[#D4AF37]' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Entrenadores</span>
            </div>
            <p className="text-2xl font-black">{stats.totalTrainers}</p>
          </button>
          <button 
            onClick={() => setView('athletes')}
            className={`p-4 rounded-3xl border transition-all text-left ${view === 'athletes' ? 'bg-[#D4AF37]/10 border-[#D4AF37]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
          >
            <div className="flex items-center gap-3 mb-2 text-zinc-500">
              <Users size={16} className={view === 'athletes' ? 'text-[#D4AF37]' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Deportistas</span>
            </div>
            <p className="text-2xl font-black">{stats.totalClients}</p>
          </button>
          <button 
            onClick={() => setView('metrics')}
            className={`p-4 rounded-3xl border transition-all text-left ${view === 'metrics' ? 'bg-[#D4AF37]/10 border-[#D4AF37]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
          >
            <div className="flex items-center gap-3 mb-2 text-zinc-500">
              <Activity size={16} className={view === 'metrics' ? 'text-[#D4AF37]' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Sesiones</span>
            </div>
            <p className="text-2xl font-black">{stats.totalSessions}</p>
          </button>
          <button 
            onClick={() => setView('audit')}
            className={`p-4 rounded-3xl border transition-all text-left ${view === 'audit' ? 'bg-[#D4AF37]/10 border-[#D4AF37]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
          >
            <div className="flex items-center gap-3 mb-2 text-zinc-500">
              <ClipboardList size={16} className={view === 'audit' ? 'text-[#D4AF37]' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Auditoría</span>
            </div>
            <p className="text-2xl font-black">{auditLogs.length}</p>
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {view === 'audit' ? (
              <>
                <ClipboardList size={20} className="text-[#D4AF37]" />
                Registro de Auditoría
              </>
            ) : view === 'metrics' ? (
              <>
                <TrendingUp size={20} className="text-[#D4AF37]" />
                Métricas de Uso
              </>
            ) : (
              <>
                <Activity size={20} className="text-[#D4AF37]" />
                Gestión de {view === 'trainers' ? 'Entrenadores' : 'Deportistas'}
              </>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
          </div>
        ) : view === 'metrics' ? (
          <div className="space-y-8">
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6">Uso por Entrenador</h3>
              <div className="space-y-4">
                {trainers.sort((a, b) => b.clientCount - a.clientCount).map(trainer => (
                  <div key={trainer.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold">{trainer.displayName}</span>
                        <span className="text-zinc-500">{trainer.clientCount} atletas</span>
                      </div>
                      <div className="h-2 bg-black rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#D4AF37] rounded-full"
                          style={{ width: `${(trainer.clientCount / (stats.totalClients || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Usuarios Activos</h3>
                <p className="text-4xl font-black text-white">{stats.totalTrainers + stats.totalClients}</p>
                <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">Total registrados en sistema</p>
              </div>
              <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Eficiencia</h3>
                <p className="text-4xl font-black text-[#D4AF37]">
                  {stats.totalTrainers > 0 ? (stats.totalClients / stats.totalTrainers).toFixed(1) : 0}
                </p>
                <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">Atletas por entrenador promedio</p>
              </div>
            </div>
          </div>
        ) : view === 'audit' ? (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1">Acción</label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                  <select 
                    value={filters.action}
                    onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs focus:border-[#D4AF37] outline-none"
                  >
                    <option value="">Todas las acciones</option>
                    {Object.values(AuditAction).map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1">Ejecutado por</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                  <input 
                    type="text"
                    value={filters.performedBy}
                    onChange={(e) => setFilters({ ...filters, performedBy: e.target.value })}
                    placeholder="Nombre del entrenador..."
                    className="w-full bg-black border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs focus:border-[#D4AF37] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 ml-1">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                  <input 
                    type="date"
                    value={filters.date}
                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs focus:border-[#D4AF37] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Logs List */}
            <div className="space-y-3">
              {auditLogs
                .filter(log => {
                  if (filters.action && log.action !== filters.action) return false;
                  if (filters.performedBy && !log.performedByRole.toLowerCase().includes(filters.performedBy.toLowerCase())) return false; // Simple check
                  if (filters.date) {
                    const logDate = log.timestamp?.toDate().toISOString().split('T')[0];
                    if (logDate !== filters.date) return false;
                  }
                  return true;
                })
                .map((log) => (
                  <div key={log.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          log.action.includes('BLOCK') ? 'bg-red-500/10 text-red-500' :
                          log.action.includes('DELETE') ? 'bg-orange-500/10 text-orange-500' :
                          log.action.includes('CREATE') ? 'bg-green-500/10 text-green-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-zinc-500 text-[10px] uppercase tracking-widest">
                          {log.timestamp?.toDate().toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-600 font-bold uppercase">
                        ID: {log.id.substring(0, 8)}
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-bold text-[#D4AF37]">{log.performedByRole === 'superadmin' ? 'SuperAdmin' : 'Entrenador'}</span>
                          <span className="text-zinc-400 mx-2">afectó a</span>
                          <span className="font-bold text-white">{log.targetUserName}</span>
                        </p>
                        {log.details && (
                          <p className="text-xs text-zinc-500 mt-1 italic">"{log.details}"</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-600 uppercase">Target UID</p>
                        <p className="text-[10px] font-mono text-zinc-500">{log.targetUserId.substring(0, 12)}...</p>
                      </div>
                    </div>
                  </div>
                ))}
              
              {auditHasMore && (
                <button 
                  onClick={loadMoreAudit}
                  disabled={loadingMore}
                  className="w-full py-4 flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 hover:text-[#D4AF37] transition-colors"
                >
                  {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <><ChevronDown size={16} /> Cargar más registros</>}
                </button>
              )}

              {auditLogs.length === 0 && (
                <div className="text-center py-20 text-zinc-600 italic">
                  No hay registros de auditoría aún
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active List */}
            <div className="space-y-4">
              {(view === 'trainers' ? activeTrainers : activeAthletes).map((item) => (
                <div 
                  key={item.id}
                  className={`bg-zinc-900 p-5 rounded-2xl border ${item.status === 'blocked' ? 'border-red-500/30' : 'border-zinc-800'} flex items-center justify-between group hover:border-[#D4AF37]/30 transition-all`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${item.status === 'blocked' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-[#D4AF37]'}`}>
                      {item.displayName?.[0] || (view === 'trainers' ? 'T' : 'A')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{item.displayName}</h3>
                        {item.status === 'blocked' && (
                          <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Bloqueado</span>
                        )}
                      </div>
                      <p className="text-zinc-500 text-xs">{item.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      {view === 'trainers' ? (
                        <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1 justify-end">
                          <Users size={14} />
                          <span>{item.clientCount} clientes</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1 justify-end">
                          <Shield size={14} />
                          <span>{trainers.find(t => t.id === item.trainerId)?.displayName || 'Sin Entrenador'}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-[#D4AF37]">
                        <TrendingUp size={12} />
                        Activo
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleBlockUser(item)}
                        className={`p-2 rounded-xl transition-all ${item.status === 'blocked' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} hover:scale-110`}
                        title={item.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                      >
                        {item.status === 'blocked' ? <CheckCircle2 size={18} /> : <Ban size={18} />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(item)}
                        className="p-2 bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all hover:scale-110"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {view === 'athletes' && athletesHasMore && (
                <button 
                  onClick={loadMoreAthletes}
                  disabled={loadingMore}
                  className="w-full py-4 flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 hover:text-[#D4AF37] transition-colors"
                >
                  {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <><ChevronDown size={16} /> Cargar más deportistas</>}
                </button>
              )}
            </div>

            {/* Deleted List (Backup) */}
            {(view === 'trainers' ? deletedTrainers : deletedAthletes).length > 0 && (
              <div className="pt-8 border-t border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <RotateCcw size={16} />
                  Papelera (Respaldo 60 días)
                </h3>
                <div className="space-y-4">
                  {(view === 'trainers' ? deletedTrainers : deletedAthletes).map((item) => (
                    <div 
                      key={item.id}
                      className="bg-zinc-900/50 p-5 rounded-2xl border border-dashed border-zinc-800 flex items-center justify-between opacity-70"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-600 font-black">
                          {item.displayName?.[0] || (view === 'trainers' ? 'T' : 'A')}
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-400">{item.displayName}</h3>
                          <p className="text-zinc-600 text-xs">Eliminado el {item.deletedAt?.toDate().toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-red-500/70 uppercase">Expira en:</p>
                          <p className="text-xs text-zinc-500">
                            {Math.ceil((item.restoreUntil?.toDate().getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestoreUser(item)}
                          className="bg-[#D4AF37]/10 text-[#D4AF37] px-4 py-2 rounded-xl font-bold text-xs hover:bg-[#D4AF37] hover:text-black transition-all"
                        >
                          Restaurar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
        confirmText={modalConfig.confirmText}
      />

      {/* Add Trainer Modal */}
      {showAddTrainer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-800 p-8 shadow-2xl">
            <h2 className="text-2xl font-black mb-6">Nuevo Entrenador</h2>
            <form onSubmit={handleAddTrainer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre Completo</label>
                <input 
                  type="text"
                  value={newTrainer.displayName}
                  onChange={(e) => setNewTrainer({ ...newTrainer, displayName: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:border-[#D4AF37] outline-none transition-colors"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Email</label>
                <input 
                  type="email"
                  value={newTrainer.email}
                  onChange={(e) => setNewTrainer({ ...newTrainer, email: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:border-[#D4AF37] outline-none transition-colors"
                  placeholder="entrenador@ejemplo.com"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddTrainer(false)}
                  className="flex-1 py-4 rounded-xl font-bold text-zinc-400 hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-[#D4AF37] text-black py-4 rounded-xl font-bold hover:bg-[#B8962E] transition-colors"
                >
                  Crear Acceso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
