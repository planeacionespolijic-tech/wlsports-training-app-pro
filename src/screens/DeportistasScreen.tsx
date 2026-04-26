import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Loader2, Trash2, AlertTriangle, Ban, CheckCircle2, CheckCircle, Dumbbell, History } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, orderBy, where, setDoc, doc, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { motion, AnimatePresence } from 'motion/react';
import { logAuditEvent, AuditAction } from '../services/auditService';
import { useAuth } from '../context/AuthContext';

export const DeportistasScreen = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  
  const userId = user?.uid || '';
  const role = userProfile?.role || 'client';

  const [deportistas, setDeportistas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAthlete, setNewAthlete] = useState({ email: '', password: '', displayName: '', type: 'adult' as 'adult' | 'child' });
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
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

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if (!userId) return;

    let q;
    if (role === 'trainer') {
      q = query(
        collection(db, 'users'),
        where('trainerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else if (role === 'superadmin') {
      q = query(
        collection(db, 'users'),
        where('role', '==', 'client'),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Clients shouldn't really see this, but for safety
      q = query(
        collection(db, 'users'),
        where('role', '==', 'client'),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter((item: any) => item.status !== 'deleted');
      setDeportistas(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [userId, role]);

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '??';
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Credenciales WL SPORTS\nEmail: ${createdCredentials.email}\nContraseña: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text);
    setFeedback({ message: 'Credenciales copiadas al portapapeles', type: 'success' });
  };

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAthlete.email || !newAthlete.displayName || !newAthlete.password) return;

    setIsCreating(true);
    try {
      const { createAthleteAccount } = await import('../firebase');
      const authUser = await createAthleteAccount(newAthlete.email, newAthlete.password, newAthlete.displayName);
      
      await setDoc(doc(db, 'users', authUser.uid), {
        uid: authUser.uid,
        email: newAthlete.email,
        displayName: newAthlete.displayName,
        type: newAthlete.type,
        role: 'client',
        status: 'active',
        trainerId: userId,
        xp: 0,
        level: 1,
        points: 0,
        streak: 0,
        attributes: { ritmo: 50, tecnica: 50, fuerza: 50, mentalidad: 50 },
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      setCreatedCredentials({ email: newAthlete.email, password: newAthlete.password });
      setNewAthlete({ email: '', password: '', displayName: '', type: 'adult' });
      setShowAddModal(false);
      setFeedback({ message: 'Atleta creado correctamente', type: 'success' });

    } catch (error: any) {
      setFeedback({ message: error.message || 'Error al crear el atleta', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleBlockAthlete = (e: React.MouseEvent, athlete: any) => {
    e.stopPropagation();
    
    if (role === 'trainer' && athlete.trainerId !== userId) {
      setFeedback({ message: 'No tienes permisos para bloquear este usuario', type: 'error' });
      return;
    }

    const isBlocked = athlete.status === 'blocked';
    
    setModalConfig({
      isOpen: true,
      title: isBlocked ? 'Desbloquear Usuario' : 'Bloquear Usuario',
      message: isBlocked 
        ? `¿Estás seguro de que deseas desbloquear a ${athlete.displayName}? Podrá volver a acceder a la aplicación.`
        : `¿Estás seguro de que deseas bloquear a ${athlete.displayName}? No podrá iniciar sesión hasta que sea desbloqueado.`,
      variant: isBlocked ? 'warning' : 'danger',
      confirmText: isBlocked ? 'Desbloquear' : 'Bloquear',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'users', athlete.id), {
            status: isBlocked ? 'active' : 'blocked'
          });

          await logAuditEvent(
            isBlocked ? AuditAction.UNBLOCK_USER : AuditAction.BLOCK_USER,
            userId,
            role,
            athlete.id,
            athlete.displayName,
            isBlocked ? 'Usuario desbloqueado' : 'Usuario bloqueado por entrenador'
          );

          setFeedback({ 
            message: `Usuario ${isBlocked ? 'desbloqueado' : 'bloqueado'} correctamente`, 
            type: 'success' 
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${athlete.id}`);
          setFeedback({ message: 'Error al actualizar el estado del usuario', type: 'error' });
        } finally {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteAthlete = (e: React.MouseEvent, athlete: any) => {
    e.stopPropagation();
    
    if (role === 'trainer' && athlete.trainerId !== userId) {
      setFeedback({ message: 'No tienes permisos para eliminar este usuario', type: 'error' });
      return;
    }

    setModalConfig({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: `Esta acción eliminará permanentemente a ${athlete.displayName}. Se mantendrá un respaldo por 60 días antes de la eliminación definitiva. ¿Deseas continuar?`,
      variant: 'danger',
      confirmText: 'Eliminar Permanentemente',
      onConfirm: async () => {
        try {
          const restoreUntil = new Date();
          restoreUntil.setDate(restoreUntil.getDate() + 60);

          await updateDoc(doc(db, 'users', athlete.id), {
            status: 'deleted',
            deletedAt: serverTimestamp(),
            restoreUntil: Timestamp.fromDate(restoreUntil)
          });

          await logAuditEvent(
            AuditAction.DELETE_USER,
            userId,
            role,
            athlete.id,
            athlete.displayName,
            'Eliminado (soft delete) desde panel de deportistas'
          );

          setFeedback({ message: 'Usuario eliminado correctamente', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${athlete.id}`);
          setFeedback({ message: 'Error al eliminar el usuario', type: 'error' });
        } finally {
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Mis Atletas</h1>
        </div>
        {(role === 'trainer' || role === 'superadmin') && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2"
          >
            <User size={16} />
            Nuevo Atleta
          </button>
        )}
      </header>

      {/* Success Credentials Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-zinc-900 w-full max-w-sm rounded-[2.5rem] border border-zinc-800 p-8 text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-green-500" size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2">Atleta Creado</h2>
            <p className="text-zinc-500 text-sm mb-8">Credenciales de acceso para el deportista:</p>
            
            <div className="bg-black border border-zinc-800 rounded-2xl p-6 mb-8 text-left space-y-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Email / Usuario</p>
                <p className="text-[#D4AF37] font-mono text-sm break-all">{createdCredentials.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Contraseña</p>
                <p className="text-white font-mono text-sm">{createdCredentials.password}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={handleCopyCredentials}
                className="w-full bg-[#D4AF37] text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                Copiar Credenciales
              </button>
              <button 
                onClick={() => setCreatedCredentials(null)}
                className="w-full bg-zinc-800 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

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

      <main className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="text-[#D4AF37] animate-spin" size={32} />
          </div>
        ) : (
          <div className="space-y-4">
            {deportistas.length === 0 ? (
              <div className="text-center py-20 text-zinc-600 italic">
                No hay deportistas registrados aún
              </div>
            ) : (
              deportistas.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => navigate(`/atleta/${item.id}`, { state: item })}
                  className="w-full text-left p-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center gap-4 hover:border-[#D4AF37]/50 transition-all cursor-pointer active:scale-[0.98] group"
                >
                  {item.photoURL ? (
                    <img 
                      src={item.photoURL} 
                      alt={item.displayName} 
                      className="w-14 h-14 rounded-full object-cover border-2 border-zinc-800 shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="w-14 h-14 rounded-full border-2 border-zinc-800 flex items-center justify-center text-sm font-black bg-black"
                      style={{ color: '#D4AF37' }}
                    >
                      {getInitials(item.displayName)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg leading-tight">{item.displayName || 'Sin nombre'}</h3>
                      {item.status === 'blocked' && (
                        <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Bloqueado</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 text-xs mt-1">
                      <Mail size={12} />
                      <span className="truncate max-w-[150px]">{item.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.role === 'trainer' || item.role === 'superadmin' ? 'bg-[#D4AF37] text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                      {item.role === 'client' ? 'Atleta' : item.role}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/atleta/${item.id}/entrenamientos`, { state: item });
                        }}
                        className="p-2 text-zinc-600 hover:text-[#D4AF37] hover:bg-zinc-800 rounded-lg transition-all"
                        title="Entrenamientos"
                      >
                        <Dumbbell size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/atleta/${item.id}/historial`, { state: item });
                        }}
                        className="p-2 text-zinc-600 hover:text-[#D4AF37] hover:bg-zinc-800 rounded-lg transition-all"
                        title="Historial"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={(e) => handleToggleBlockAthlete(e, item)}
                        className={`p-2 rounded-lg transition-all ${item.status === 'blocked' ? 'text-green-500 hover:bg-green-500/10' : 'text-zinc-600 hover:text-red-500 hover:bg-red-500/10'}`}
                        title={item.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                      >
                        {item.status === 'blocked' ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                      </button>
                      <button
                        onClick={(e) => handleDeleteAthlete(e, item)}
                        className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Eliminar deportista"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
        confirmText={modalConfig.confirmText}
      />

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-800 p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-black mb-6">Nuevo Atleta</h2>
            <form onSubmit={handleAddAthlete} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre Completo</label>
                <input 
                  type="text"
                  value={newAthlete.displayName}
                  onChange={(e) => setNewAthlete({ ...newAthlete, displayName: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:border-[#D4AF37] outline-none transition-colors"
                  placeholder="Ej: Carlos Ruiz"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Correo Electrónico</label>
                <input 
                  type="email"
                  value={newAthlete.email}
                  onChange={(e) => setNewAthlete({ ...newAthlete, email: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:border-[#D4AF37] outline-none transition-colors"
                  placeholder="email@atleta.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Contraseña</label>
                <input 
                  type="password"
                  value={newAthlete.password}
                  onChange={(e) => setNewAthlete({ ...newAthlete, password: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white focus:border-[#D4AF37] outline-none transition-colors"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Tipo de Perfil</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewAthlete({ ...newAthlete, type: 'adult' })}
                    className={`p-4 rounded-xl border font-bold transition-all ${newAthlete.type === 'adult' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-zinc-800 text-zinc-500'}`}
                  >
                    Adulto
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAthlete({ ...newAthlete, type: 'child' })}
                    className={`p-4 rounded-xl border font-bold transition-all ${newAthlete.type === 'child' ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-zinc-800 text-zinc-500'}`}
                  >
                    Niño
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 rounded-xl font-bold text-zinc-400 hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 bg-[#D4AF37] text-black py-4 rounded-xl font-bold hover:bg-[#B8962E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Perfil'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
