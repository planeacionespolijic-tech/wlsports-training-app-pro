import { ArrowLeft, Activity, Heart, Dumbbell, History, FileText, Mail, Calendar, TrendingUp, ClipboardList, Zap, Video, Brain, CalendarClock, Baby, Trophy, Camera, Loader2, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { CoachAthleteDashboard } from '../components/CoachAthleteDashboard';
import { useState, useRef, ChangeEvent } from 'react';
import { handleFirestoreError, OperationType } from '../firebase';
import { uploadProfilePhoto } from '../services/storageService';

interface AthleteProfileScreenProps {
  athlete: any;
  onBack: () => void;
  onNavigate: (screen: string) => void;
  isAdmin: boolean;
}

export const AthleteProfileScreen = ({ athlete, onBack, onNavigate, isAdmin }: AthleteProfileScreenProps) => {
  const [uploading, setUploading] = useState(false);
  const [currentPhotoURL, setCurrentPhotoURL] = useState(athlete.photoURL);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isChild = athlete.type === 'child';

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

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
    { id: 'anamnesis', title: 'Anamnesis', icon: ClipboardList, desc: 'Historial médico y deportivo', type: 'both' },
    { id: 'valoracion', title: 'Valoración Física', icon: Activity, desc: 'Métricas antropométricas y tests', type: 'both' },
    { id: 'diagnostico', title: 'Diagnóstico', icon: Brain, desc: 'Análisis y enfoque sugerido', type: 'adult' },
    { id: 'planificacion', title: 'Planificación', icon: CalendarClock, desc: 'Planes y progresiones', type: 'adult' },
    { id: 'seguimiento', title: 'Seguimiento', icon: TrendingUp, desc: 'Gráficas de progreso', type: 'both' },
    { id: 'tests', title: 'Pruebas Periódicas', icon: Zap, desc: 'Tests físicos y técnicos', type: 'both' },
    { id: 'videoAnalysis', title: 'Análisis de Video', icon: Video, desc: 'Análisis de movimiento', type: 'both' },
    { id: 'kidsModule', title: 'Módulo Niños', icon: Baby, desc: 'Desarrollo motriz y niveles', type: 'child' },
    { id: 'zonas', title: 'Zonas Cardíacas', icon: Heart, desc: 'Cálculo de FC por Karvonen', type: 'adult' },
    { id: 'entrenamientos', title: 'Entrenamientos', icon: Dumbbell, desc: 'Rutinas personalizadas', type: 'both' },
    { id: 'retos', title: 'Retos y Logros', icon: Trophy, desc: 'Logros y desafíos activos', type: 'child' },
    { id: 'historial', title: 'Historial', icon: History, desc: 'Registro de sesiones', type: 'both' },
    { id: 'informes', title: 'Informes', icon: FileText, desc: 'Reportes de rendimiento', type: 'both' },
  ].filter(item => item.type === 'both' || item.type === (isChild ? 'child' : 'adult'));

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '??';
  };

  const themeColor = isChild ? '#3B82F6' : '#D4AF37'; // Blue for kids, Gold for adults

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800 flex items-center gap-4 sticky top-0 bg-black z-10">
        <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
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
            
            {isAdmin && (
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
          
          {isChild && (
            <div className="mt-4 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full flex items-center gap-2">
              <Trophy size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Nivel {athlete.level || 1} • {athlete.points || 0} Puntos</span>
            </div>
          )}
        </div>

        {/* Coach Intelligence Dashboard */}
        {isAdmin && (
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
              onClick={() => onNavigate(item.id)}
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
