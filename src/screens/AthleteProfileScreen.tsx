import { ArrowLeft, Activity, Heart, Dumbbell, History, FileText, Mail, TrendingUp, Zap, Video, Brain, CalendarClock, Baby, Trophy, Camera, Loader2, Edit2, Medal, Shield, X, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CoachAthleteDashboard } from '../components/CoachAthleteDashboard';
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { uploadProfilePhoto } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { LEVELS, getLevelFromXP } from '../constants';
import { ValoracionScreen } from './ValoracionScreen';
import { DiagnosisScreen } from './DiagnosisScreen';
import { ReportsScreen } from './ReportsScreen';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { logAuditEvent, AuditAction } from '../services/auditService';

export const AthleteProfileScreen = ({ userId, athlete: propAthlete, isAdmin: isTrainerProp, onNavigate }: any) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user, isTrainer: authIsTrainer } = useAuth();
  
  const isTrainer = isTrainerProp !== undefined ? isTrainerProp : authIsTrainer;
  const athleteId = userId || id || '';
  const trainerId = user?.uid || '';

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'physical' | 'intelligence' | 'reports'>('overview');
  
  const [athlete, setAthlete] = useState<any>(propAthlete || location.state || { id: athleteId, displayName: 'Cargando...', photoURL: null, type: 'adult' });
  const [loading, setLoading] = useState(!propAthlete && !location.state);
  
  const [uploading, setUploading] = useState(false);
  const [currentPhotoURL, setCurrentPhotoURL] = useState(athlete?.photoURL || null);
  const [showProgressionInfo, setShowProgressionInfo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isChild = athlete?.type === 'child';

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    const fetchAthlete = async () => {
      if (!athleteId || propAthlete) return;
      try {
        const docRef = doc(db, 'users', athleteId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as any;
          setAthlete(data);
          setCurrentPhotoURL(data.photoURL);
        }
      } catch (error) {
        console.error("Error fetching athlete", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAthlete();
  }, [athleteId, propAthlete]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isTrainer) return;

    setUploading(true);
    try {
      const downloadURL = await uploadProfilePhoto(athlete.id, file);
      setCurrentPhotoURL(downloadURL);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${athlete.id}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAthlete = async () => {
    if (!isTrainer) return;
    
    setIsDeleting(true);
    try {
      const restoreUntil = new Date();
      restoreUntil.setDate(restoreUntil.getDate() + 60);

      await updateDoc(doc(db, 'users', athleteId), {
        status: 'deleted',
        deletedAt: serverTimestamp(),
        restoreUntil: Timestamp.fromDate(restoreUntil)
      });

      await logAuditEvent(
        AuditAction.DELETE_USER,
        trainerId,
        'trainer',
        athleteId,
        athlete.displayName,
        'Eliminado (soft delete) desde el perfil'
      );

      setFeedback({ message: 'Atleta eliminado correctamente', type: 'success' });
      setTimeout(() => navigate('/deportistas'), 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${athleteId}`);
      setFeedback({ message: 'Error al eliminar el atleta', type: 'error' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  const menuItems = [
    { id: 'evaluacion360', title: 'Evaluación Inicial 360°', icon: Shield, desc: 'Escáner inicial integral de rendimiento', type: 'both' },
    { id: 'valoracion', title: 'Valoración Física', icon: Activity, desc: 'Métricas antropométricas y tests', type: 'both', subTab: 'physical' },
    { id: 'diagnostico', title: 'Diagnóstico e Inteligencia', icon: Brain, desc: 'Análisis IA y enfoque sugerido', type: 'adult', subTab: 'intelligence' },
    { id: 'informes', title: 'Informes de Progreso', icon: FileText, desc: 'Reportes de rendimiento', type: 'both', subTab: 'reports' },
    { id: 'planificacion', title: 'Planificación', icon: CalendarClock, desc: 'Planes y progresiones', type: 'adult' },
    { id: 'seguimiento', title: 'Seguimiento', icon: TrendingUp, desc: 'Gráficas de progreso', type: 'both' },
    { id: 'tests', title: 'Biblioteca de Pruebas', icon: Zap, desc: 'Escaneo de rendimiento y tests', type: 'both' },
    { id: 'videoAnalysis', title: 'Análisis de Video', icon: Video, desc: 'Análisis de movimiento', type: 'both' },
    { id: 'kidsModule', title: 'Módulo Niños', icon: Baby, desc: 'Desarrollo motriz y niveles', type: 'child' },
    { id: 'zonas', title: 'Zonas Cardíacas', icon: Heart, desc: 'Cálculo de FC por Karvonen', type: 'adult' },
    { id: 'entrenamientos', title: 'Entrenamientos', icon: Dumbbell, desc: 'Rutinas personalizadas', type: 'both' },
    { id: 'retos', title: 'Retos y Logros', icon: Trophy, desc: 'Logros y desafíos activos', type: 'child' },
    { id: 'historial', title: 'Historial', icon: History, desc: 'Registro de sesiones', type: 'both' },
  ].filter(item => item.type === 'both' || item.type === (isChild ? 'child' : 'adult'));

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '??';
  };

  const themeColor = isChild ? '#3B82F6' : '#D4AF37';

  if (activeSubTab === 'physical') {
    return <ValoracionScreen userId={athleteId} isAdmin={isTrainer} onBack={() => setActiveSubTab('overview')} />;
  }
  if (activeSubTab === 'intelligence') {
    return <DiagnosisScreen userId={athleteId} isAdmin={isTrainer} onBack={() => setActiveSubTab('overview')} />;
  }
  if (activeSubTab === 'reports') {
    return <ReportsScreen userId={athleteId} onBack={() => setActiveSubTab('overview')} trainerId={isTrainer ? user?.uid : null} />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Perfil del {isChild ? 'Niño' : 'Deportista'}</h1>
        </div>
        
        {isTrainer && (
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"
            title="Eliminar Atleta"
          >
            <Trash2 size={20} />
          </button>
        )}
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
            {feedback.type === 'success' ? <Shield size={18} /> : <AlertTriangle size={18} />}
            <span className="font-bold text-sm">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col items-center mb-10">
          <div className="relative group">
            {currentPhotoURL ? (
              <img 
                src={currentPhotoURL} 
                alt={athlete.displayName} 
                className="w-32 h-32 rounded-full border-4 mb-4 object-cover shadow-2xl transition-transform group-hover:scale-[1.02]"
                style={{ borderColor: themeColor }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                className="w-32 h-32 rounded-full border-4 mb-4 flex items-center justify-center text-3xl font-black bg-zinc-900"
                style={{ borderColor: themeColor, color: themeColor }}
              >
                {getInitials(athlete.displayName)}
              </div>
            )}
            
            {isTrainer && (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-4 right-0 p-2 bg-zinc-900 border border-zinc-800 rounded-full shadow-lg hover:bg-zinc-800 transition-all active:scale-90 disabled:opacity-50"
                  title={currentPhotoURL ? "Cambiar foto" : "Subir foto"}
                >
                  {uploading ? (
                    <Loader2 className="text-white animate-spin" size={18} />
                  ) : (
                    currentPhotoURL ? <Edit2 className="text-white" size={18} /> : <Camera className="text-white" size={18} />
                  )}
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden"
                  accept="image/*"
                />
              </>
            )}
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-black shadow-lg" style={{ backgroundColor: isChild ? '#3B82F6' : '#10B981' }} />
          </div>
          <h2 className="text-3xl font-black tracking-tighter mb-1">{athlete.displayName}</h2>
          <div className="flex items-center gap-2 text-zinc-500 text-sm mt-1">
            <Mail size={14} />
            <span>{athlete.email || 'Sin correo'}</span>
          </div>
          
          {loading ? (
            <div className="mt-4"><Loader2 className="animate-spin text-zinc-500" size={24} /></div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className={`${isChild ? 'bg-blue-500/10 border-blue-500/20' : 'bg-[#D4AF37]/10 border-[#D4AF37]/20'} px-4 py-2 rounded-full flex items-center gap-2`}>
                <Trophy size={16} className={isChild ? 'text-blue-500' : 'text-[#D4AF37]'} />
                <span className={`text-xs font-bold uppercase tracking-widest ${isChild ? 'text-blue-500' : 'text-[#D4AF37]'}`}>
                  {getLevelFromXP(athlete.xp || 0).name} • {athlete.xp || 0} XP
                </span>
              </div>
              
              {/* Level Progress Bar */}
              {(() => {
                const currentXP = athlete.xp || 0;
                const currentLevel = getLevelFromXP(currentXP);
                const currentIndex = LEVELS.findIndex(l => l.name === currentLevel.name);
                const nextLevel = LEVELS[currentIndex + 1];
                if (!nextLevel) return null;
                
                const progress = Math.min(100, Math.max(0, 
                  ((currentXP - currentLevel.minXP) / (nextLevel.minXP - currentLevel.minXP)) * 100
                ));
                
                return (
                  <div className="w-48 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      className="h-full transition-all duration-1000" 
                      style={{ 
                        width: `${progress}%`,
                        backgroundColor: isChild ? '#3B82F6' : '#D4AF37'
                      }} 
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Ficha Técnica (UNIFICADA) */}
        {(() => {
          const attributes = athlete.attributes || {};
          const themeColor = isChild ? '#3B82F6' : '#D4AF37';
          
          return (
            <section className="bg-zinc-900/50 border-2 border-zinc-800 p-6 rounded-[2.5rem] shadow-2xl mb-10 max-w-md mx-auto relative overflow-hidden group">
              <button 
                onClick={() => setShowProgressionInfo(true)}
                className="absolute top-4 right-4 z-20 p-2 bg-zinc-800/80 rounded-full text-amber-500 hover:bg-amber-500 hover:text-black transition-all"
              >
                <Zap size={16} />
              </button>
  
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Shield size={80} style={{ color: themeColor }} />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <div className="bg-black/50 px-3 py-1 rounded-full border border-zinc-800">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: themeColor }}>
                      [{getLevelFromXP(athlete.xp || 0).name}]
                    </span>
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tighter">{athlete.displayName}</h3>
                </div>
  
                <div className="grid grid-cols-5 gap-2 mb-6 uppercase">
                  {[
                    { key: 'TEC', label: 'TEC', icon: '⚽', oldKey: 'tecnica' },
                    { key: 'FIS', label: 'FIS', icon: '💪', oldKey: 'fuerza' },
                    { key: 'NEU', label: 'NEU', icon: '🧠', oldKey: 'neuro' },
                    { key: 'AGI', label: 'AGI', icon: '🤸', oldKey: 'ritmo' },
                    { key: 'ACT', label: 'ACT', icon: '🔥', oldKey: 'mentalidad' }
                  ].map(attr => (
                    <div key={attr.key} className="flex flex-col items-center gap-1">
                      <span className="text-xl">{attr.icon}</span>
                      <span className="text-[8px] font-black text-zinc-500 uppercase">{attr.label}</span>
                      <span className="text-sm font-black" style={{ color: themeColor }}>
                        {attributes[attr.key] || attributes[attr.oldKey] || 10}
                      </span>
                    </div>
                  ))}
                </div>
  
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  {(() => {
                    const mapping = [
                      { key: 'TEC', old: 'tecnica', label: 'Técnica' },
                      { key: 'FIS', old: 'fuerza', label: 'Físico' },
                      { key: 'NEU', old: 'neuro', label: 'Neuro' },
                      { key: 'AGI', old: 'ritmo', label: 'Agilidad' },
                      { key: 'ACT', old: 'mentalidad', label: 'Actitud' }
                    ];
                    
                    const values = mapping.map(m => ({ 
                      label: m.label, 
                      val: attributes[m.key] || attributes[m.old] || 10 
                    }));
                    
                    const maxAttr = [...values].sort((a, b) => b.val - a.val)[0];
                    const minAttr = [...values].sort((a, b) => a.val - b.val)[0];
  
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Atributo Destacado</span>
                          <span className="text-xs font-black text-emerald-500 uppercase italic">🚀 {maxAttr.label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Área de Mejora</span>
                          <span className="text-xs font-black text-amber-500 uppercase italic">🎯 {minAttr.label}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </section>
          );
        })()}

        {isTrainer && (
          <div className="mb-10">
            <CoachAthleteDashboard 
              athleteId={athlete.id} 
              athleteName={athlete.displayName} 
              athleteType={athlete.type} 
            />
          </div>
        )}

        <div className="space-y-3 max-w-md mx-auto">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] mb-4 ml-1">
            {isChild ? 'Aventura de Entrenamiento' : 'Gestión de Rendimiento'}
          </p>
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                if (item.subTab) {
                  setActiveSubTab(item.subTab as any);
                } else if (onNavigate) {
                  onNavigate(item.id, { athleteId: athlete.id, athlete });
                } else {
                  navigate(`/${item.id}`, { state: { athleteId: athlete.id, athlete } });
                }
              }}
              className="w-full bg-zinc-900/50 hover:bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4 transition-all group active:scale-[0.98]"
            >
              <div className="p-3 bg-black rounded-xl group-hover:text-white transition-colors" style={{ color: themeColor }}>
                <item.icon size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-sm">{item.title}</h3>
                <p className="text-[10px] text-zinc-600">{item.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      <footer className="p-8 text-center opacity-30">
        <p className="text-[10px] uppercase tracking-widest">WL Sports Elite Coaching</p>
      </footer>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAthlete}
        title="Eliminar Atleta"
        message={`¿Estás seguro de que deseas eliminar permanentemente a ${athlete.displayName}? Esta acción lo marcará como inactivo y se eliminará definitivamente en 60 días.`}
        variant="danger"
        confirmText={isDeleting ? "Eliminando..." : "Eliminar Permanentemente"}
      />
      <AnimatePresence>
        {showProgressionInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-zinc-900 rounded-[2.5rem] border border-zinc-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black italic uppercase text-amber-500">Sistema de Maestría</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Escalas de Nivel y Atributos</p>
                </div>
                <button 
                  onClick={() => setShowProgressionInfo(false)} 
                  className="p-2 bg-black rounded-full border border-zinc-800 text-zinc-500 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                {/* ESCALA DE NIVELES */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[.3em] text-zinc-500 mb-6">1. Escala de Niveles</h4>
                  <div className="space-y-4">
                    {LEVELS.map((level, idx) => (
                      <div key={idx} className="flex gap-4 p-4 bg-black/40 rounded-2xl border border-zinc-800 shadow-lg">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-amber-500 text-xs">
                          L{idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-black italic uppercase text-sm">{level.name}</p>
                            <span className="text-[9px] font-black text-zinc-500 uppercase">{level.minXP}-{level.maxXP} XP</span>
                          </div>
                          <p className="text-[10px] text-zinc-400 font-medium leading-tight">CAP: {level.attributeCap} PTS • {level.focus}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LOGICA DE ATRIBUTOS */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[.3em] text-zinc-500 mb-6">2. Lógica de Atributos</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-5 bg-black/40 rounded-3xl border border-emerald-500/10">
                      <p className="text-xs font-black uppercase text-emerald-500 mb-2">Neuro & Agilidad (NEU/AGI)</p>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">Se obtienen en los Bloques M1/M2 (Activación). +0.2 por ejercicio completado.</p>
                    </div>
                    <div className="p-5 bg-black/40 rounded-3xl border border-blue-500/10">
                      <p className="text-xs font-black uppercase text-blue-500 mb-2">Técnica (TEC)</p>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">Se obtiene en el Bloque M3 Técnico. +0.5 por ejercicio completado.</p>
                    </div>
                    <div className="p-5 bg-black/40 rounded-3xl border border-rose-500/10">
                      <p className="text-xs font-black uppercase text-rose-500 mb-2">Físico (FIS)</p>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">Se obtiene en el Bloque M3 de Fuerza/Potencia. +0.5 por ejercicio completado.</p>
                    </div>
                    <div className="p-5 bg-black/40 rounded-3xl border border-amber-500/10">
                      <p className="text-xs font-black uppercase text-amber-500 mb-2">Actitud (ACT)</p>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">Se obtiene ganando el Desafío M4 (Torneo). +1.0 por victoria sobre el Coach.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/5 p-6 rounded-3xl border border-amber-500/20">
                   <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-2">
                     <Shield size={12} /> Restricción de Progresión
                   </p>
                   <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                     Tus atributos no pueden superar el <span className="text-white font-bold">Tope de Nivel (CAP)</span> actual hasta que apruebes la Sesión de Ascenso.
                   </p>
                </div>
              </div>

              <div className="p-8 bg-black/40 border-t border-zinc-800">
                <button 
                  onClick={() => setShowProgressionInfo(false)}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[.3em] transition-all"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
