import { useState, useEffect } from 'react';
import { Users, Activity, Heart, Dumbbell, History, FileText, LucideIcon, LogOut, TrendingUp, Trophy, Zap, Timer, Video, ShieldAlert } from 'lucide-react';
import { MenuButton } from '../widgets/MenuButton';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface HomeScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  user: User;
  onLogout: () => void;
  athlete?: any;
  role: 'superadmin' | 'trainer' | 'client';
}

interface MenuItem {
  id: string;
  title: string;
  icon: LucideIcon;
  roles?: ('superadmin' | 'trainer' | 'client')[];
}

export const HomeScreen = ({ onNavigate, user, onLogout, athlete, role }: HomeScreenProps) => {
  const [userData, setUserData] = useState<any>(null);
  const isAdmin = role === 'superadmin' || role === 'trainer';
  const targetAthlete = athlete || { id: user.uid, displayName: user.displayName, photoURL: user.photoURL };
  const isChild = userData?.type === 'child';

  useEffect(() => {
    if (!targetAthlete?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'users', targetAthlete.id), (doc) => {
      if (doc.exists()) {
        setUserData(doc.data());
      }
    });
    return () => unsubscribe();
  }, [targetAthlete.id]);

  const menuItems: MenuItem[] = [
    { id: 'superadmin-dashboard', title: 'Panel SuperAdmin', icon: ShieldAlert, roles: ['superadmin'] },
    { id: 'trainer-dashboard', title: 'Panel Entrenador', icon: Users, roles: ['trainer', 'superadmin'] },
    { id: 'client-dashboard', title: 'Panel Alumno / Padre', icon: Activity, roles: ['client', 'trainer', 'superadmin'] },
  ];

  const filteredItems = menuItems.filter(item => {
    if (item.roles && !item.roles.includes(role)) return false;
    return true;
  });

  const themeColor = isChild ? '#3B82F6' : '#D4AF37';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-8 pt-12 text-center relative">
        <button 
          onClick={onLogout}
          className="absolute top-8 right-8 text-zinc-600 hover:text-red-500 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={20} />
        </button>
        <div className="mb-4 flex flex-col items-center">
          <div className="relative">
            <img 
              src={userData?.photoURL || targetAthlete.photoURL || `https://ui-avatars.com/api/?name=${targetAthlete.displayName}&background=${themeColor.replace('#', '')}&color=000`} 
              alt={targetAthlete.displayName || 'User'} 
              className="w-16 h-16 rounded-full border-2 mb-2 object-cover"
              style={{ borderColor: themeColor }}
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 bg-black border border-zinc-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Trophy size={10} style={{ color: themeColor }} />
              <span className="text-[8px] font-black" style={{ color: themeColor }}>{userData?.level || 1}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
              {isAdmin && athlete ? `Gestionando a ${targetAthlete.displayName?.split(' ')[0]}` : `Hola, ${targetAthlete.displayName?.split(' ')[0]}`}
            </p>
            <div className="h-3 w-[1px] bg-zinc-800" />
            <div className="flex items-center gap-1">
              <Zap size={10} className="text-blue-500" />
              <span className="text-[10px] font-black text-blue-500 uppercase">{userData?.points || 0} PTS</span>
            </div>
          </div>
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-white mb-2">
          WL<span style={{ color: themeColor }}>SPORTS</span>
        </h1>
        <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-medium">
          {isChild ? 'Aventura de Entrenamiento' : 'Elite Performance Tracking'}
        </p>
      </header>

      <main className="flex-1 p-6">
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {filteredItems.map((item) => (
            <MenuButton
              key={item.id}
              title={item.title}
              icon={item.icon}
              onTap={() => onNavigate(item.id)}
            />
          ))}
        </div>
      </main>

      <footer className="p-8 text-center">
        <div className="w-12 h-1 bg-[#D4AF37] mx-auto mb-4 rounded-full opacity-50" />
        <p className="text-zinc-700 text-[10px] uppercase tracking-widest">
          © 2026 WL Sports Systems
        </p>
      </footer>
    </div>
  );
};
