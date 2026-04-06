import React from 'react';
import { LogIn, ShieldCheck, Zap, Trophy, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLogin: () => void;
  onLoginAnonymous: () => void;
}

export const LoginScreen = ({ onLogin, onLoginAnonymous }: LoginScreenProps) => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      
      <div className="z-10 w-full max-w-md px-8 flex flex-col items-center">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] mb-6 shadow-2xl">
            <Activity size={40} className="text-[#D4AF37]" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter mb-2">
            WL<span className="text-[#D4AF37]">SPORTS</span>
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-[0.4em] font-bold">
            Elite Performance Tracking
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="grid grid-cols-2 gap-4 w-full mb-12"
        >
          {[
            { icon: Trophy, label: 'Alto Rendimiento' },
            { icon: Zap, label: 'Gamificación' },
            { icon: ShieldCheck, label: 'Control Total' },
            { icon: Activity, label: 'Análisis Pro' },
          ].map((item, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 p-4 rounded-2xl flex flex-col items-center text-center">
              <item.icon size={20} className="text-zinc-400 mb-2" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{item.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Login Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="w-full"
        >
          <button 
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-4 bg-white text-black py-5 rounded-3xl font-black text-lg hover:bg-zinc-200 transition-all transform active:scale-95 shadow-xl shadow-white/5 mb-4"
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-6 h-6"
            />
            Iniciar sesión con Google
          </button>

          <button 
            onClick={onLoginAnonymous}
            className="w-full flex items-center justify-center gap-4 bg-zinc-900 text-white py-5 rounded-3xl font-black text-lg border border-zinc-800 hover:bg-zinc-800 transition-all transform active:scale-95"
          >
            <LogIn size={24} className="text-[#D4AF37]" />
            Acceso como Invitado
          </button>
          
          <p className="text-center text-zinc-600 text-[10px] mt-8 uppercase tracking-widest font-bold">
            Al ingresar aceptas nuestros términos y condiciones
          </p>
        </motion.div>
      </div>

      {/* Footer Quote */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-12 text-center w-full px-8"
      >
        <p className="text-xs italic font-serif text-zinc-400">
          "La disciplina es el puente entre las metas y los logros."
        </p>
      </motion.div>
    </div>
  );
};
