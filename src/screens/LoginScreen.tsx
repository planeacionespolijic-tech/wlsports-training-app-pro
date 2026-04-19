import React, { useState } from 'react';
import { LogIn, Activity, AlertCircle, Mail, Lock, Key, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loginWithEmail, resetPassword } from '../firebase';

interface LoginScreenProps {
  onLogin: () => void;
  onLoginAnonymous: () => void;
  externalError?: string | null;
}

export const LoginScreen = ({ onLogin, onLoginAnonymous, externalError }: LoginScreenProps) => {
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleLogin = async (loginFn: () => Promise<any>) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      await loginFn();
    } catch (err: any) {
      const message = err.message || "Ocurrió un error al iniciar sesión.";
      if (err.code === 'auth/unauthorized-domain') {
        setError(
          <>
            Dominio no autorizado para inicio de sesión con Google.
            <br />
            Debes agregar este dominio en la consola de Firebase.
          </>
        );
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError("El inicio de sesión fue cancelado.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (!isForgotPassword && !password)) {
      setError("Por favor completa todos los campos.");
      return;
    }
    
    if (isForgotPassword) {
      try {
        setIsLoading(true);
        setError(null);
        await resetPassword(email);
        setSuccess("Te enviamos un correo para restablecer tu contraseña");
        setIsForgotPassword(false);
      } catch (err: any) {
        setError(err.message || "Error al enviar el correo de recuperación.");
      } finally {
        setIsLoading(false);
      }
    } else {
      handleLogin(() => loginWithEmail(email, password));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden py-12">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      
      <div className="z-10 w-full max-w-md px-8 flex flex-col items-center">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
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

        {/* Auth Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="w-full bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] mb-6 backdrop-blur-xl"
        >
          <h2 className="text-xl font-bold mb-6 text-center text-zinc-100 uppercase tracking-widest">
            {isForgotPassword ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
          </h2>

          {(error || externalError) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-sm"
            >
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>{error || externalError}</div>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-start gap-3 text-green-400 text-sm"
            >
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
              <div>{success}</div>
            </motion.div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                disabled={isLoading}
                required
              />
            </div>
            {!isForgotPassword && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                  disabled={isLoading}
                  required
                />
              </div>
            )}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#C4A030] transition-all transform active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  {isForgotPassword ? <Key size={18} /> : <LogIn size={18} />}
                  {isForgotPassword ? 'Enviar Enlace' : 'Entrar'}
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button 
              onClick={() => { setIsForgotPassword(!isForgotPassword); setError(null); setSuccess(null); }}
              className="text-[10px] text-zinc-500 hover:text-[#D4AF37] font-bold uppercase tracking-widest transition-colors"
            >
              {isForgotPassword ? 'Volver al inicio de sesión' : '¿Olvidaste tu contraseña?'}
            </button>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="w-full flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-zinc-800" />
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">O</span>
          <div className="h-[1px] flex-1 bg-zinc-800" />
        </div>

        {/* Social Buttons */}
        <div className="w-full grid grid-cols-2 gap-4 mb-4">
          <button 
            onClick={() => handleLogin(onLogin as any)}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            Google
          </button>

          <button 
            onClick={() => handleLogin(onLoginAnonymous as any)}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 bg-zinc-900 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest border border-zinc-800 hover:bg-zinc-800 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <LogIn size={16} className="text-[#D4AF37]" />
            Invitado
          </button>
        </div>

        <button 
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('guest', 'true');
            window.history.replaceState({}, '', url);
            handleLogin(onLoginAnonymous as any);
          }}
          disabled={isLoading}
          className="w-full bg-zinc-800/50 text-[#D4AF37] py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-[#D4AF37]/20 hover:bg-zinc-800 transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mb-6"
        >
          <Zap size={18} />
          Acceso Directo
        </button>
        
        <p className="text-center text-zinc-600 text-[10px] mt-8 uppercase tracking-widest font-bold">
          Plataforma Profesional de Entrenamiento
        </p>
      </div>

      {/* Footer Quote */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 text-center w-full px-8"
      >
        <p className="text-[10px] italic font-serif text-zinc-400">
          "La disciplina es el puente entre las metas y los logros."
        </p>
      </motion.div>
    </div>
  );
};
