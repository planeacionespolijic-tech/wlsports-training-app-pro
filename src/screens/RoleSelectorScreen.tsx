import React from 'react';
import { Shield, Users, User, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RoleSelectorScreen = () => {
  const navigate = useNavigate();
  const { user, userProfile, logout } = useAuth();
  
  const currentRole = userProfile?.role || 'client';

  const roles = [
    { 
      id: 'trainer', 
      title: 'Entrenador', 
      description: 'Gestión de atletas y entrenamientos', 
      icon: Users, 
      color: 'text-[#D4AF37]', 
      bg: 'bg-[#D4AF37]/10',
      allowed: currentRole === 'trainer' || currentRole === 'superadmin'
    },
    { 
      id: 'client', 
      title: 'Alumno / Padre', 
      description: 'Progreso, retos y evidencias', 
      icon: User, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      allowed: true 
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-black tracking-tighter mb-2">
          WL<span className="text-[#D4AF37]">SPORTS</span>
        </h1>
        <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-medium">
          Selecciona tu panel de acceso
        </p>
      </header>

      <div className="grid gap-4 w-full max-w-md">
        {roles.map((role, i) => (
          <motion.button
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => role.allowed && navigate(role.id === 'trainer' ? '/trainer-dashboard' : '/client-dashboard')}
            disabled={!role.allowed}
            className={`flex items-center gap-6 p-6 rounded-3xl border transition-all text-left relative overflow-hidden group ${
              role.allowed 
                ? 'bg-zinc-900 border-zinc-800 hover:border-[#D4AF37]/50 active:scale-95' 
                : 'bg-zinc-900/30 border-zinc-900 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`p-4 rounded-2xl ${role.bg} ${role.color} group-hover:scale-110 transition-transform`}>
              <role.icon size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black">{role.title}</h3>
              <p className="text-zinc-500 text-xs mt-1">{role.description}</p>
            </div>
            {!role.allowed && (
              <div className="absolute top-4 right-4">
                <Shield size={12} className="text-zinc-700" />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <footer className="mt-12 flex flex-col items-center gap-6">
        {user && (
          <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=D4AF37&color=000`} 
              alt={user.displayName || ''} 
              className="w-8 h-8 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="text-left">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Sesión activa</p>
              <p className="text-xs font-bold text-white">{user.displayName}</p>
            </div>
            <button 
              onClick={() => logout()}
              className="ml-4 p-2 text-zinc-500 hover:text-red-500 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
        <p className="text-zinc-800 text-[10px] uppercase tracking-widest">
          © 2026 WL Sports Systems
        </p>
      </footer>
    </div>
  );
};
