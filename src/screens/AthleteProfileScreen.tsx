import { ArrowLeft, Activity, Heart, Dumbbell, History, FileText, Mail, TrendingUp, Zap, Video, Brain, CalendarClock, Baby, Trophy, Camera, Loader2, Edit2, Medal, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { CoachAthleteDashboard } from '../components/CoachAthleteDashboard';
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { uploadProfilePhoto } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { LEVELS, getLevelFromXP } from '../constants';
import { ValoracionScreen } from './ValoracionScreen';
import { DiagnosisScreen } from './DiagnosisScreen';
import { ReportsScreen } from './ReportsScreen';

export const AthleteProfileScreen = ({ userId, athlete: propAthlete, isAdmin: isTrainerProp, onNavigate }: any) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { user, isTrainer: authIsTrainer } = useAuth();
  
  const isTrainer = isTrainerProp !== undefined ? isTrainerProp : authIsTrainer;
  const athleteId = userId || id || '';

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'physical' | 'intelligence' | 'reports'>('overview');
  
  const [athlete, setAthlete] = useState<any>(propAthlete || location.state || { id: athleteId, displayName: 'Cargando...', photoURL: null, type: 'adult' });
  const [loading, setLoading] = useState(!propAthlete && !location.state);
  
  const [uploading, setUploading] = useState(false);
  const [currentPhotoURL, setCurrentPhotoURL] = useState(athlete?.photoURL || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isChild = athlete?.type === 'child';

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
      <header className="p-4 border-b border-zinc-800 flex items-center gap-4 sticky top-0 bg-black z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Perfil del {isChild ? 'Niño' : 'Deportista'}</h1>
      </header>

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

        {/* Atributos Section */}
        {athlete.attributes && (
          <section className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-[2rem] shadow-xl mb-10 max-w-md mx-auto">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Medal size={14} style={{ color: themeColor }} /> Atributos de Rendimiento
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
              {['ritmo', 'tecnica', 'fuerza', 'mentalidad'].map(attr => (
                <div key={attr} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <span>{attr}</span>
                    <span className="text-zinc-200">{athlete.attributes[attr] || 50}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-1000" 
                      style={{ 
                        width: `${athlete.attributes[attr] || 50}%`,
                        backgroundColor: themeColor
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
    </div>
  );
};
