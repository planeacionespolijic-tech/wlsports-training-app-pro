import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, TrendingUp, Star, Zap, Lock } from 'lucide-react';
import { EvaluationResult as EvaluationResultType } from '../../services/evaluationEngine';
import { useNavigate } from 'react-router-dom';

interface EvaluationResultProps {
  result: EvaluationResultType;
  onBack: () => void;
}

export const EvaluationResult: React.FC<EvaluationResultProps> = ({ result, onBack }) => {
  const navigate = useNavigate();
  const statusColor = result.status === 'Verde' ? 'text-emerald-500' : result.status === 'Amarillo' ? 'text-yellow-500' : 'text-red-500';
  const statusBg = result.status === 'Verde' ? 'bg-emerald-500/10' : result.status === 'Amarillo' ? 'bg-yellow-500/10' : 'bg-red-500/10';

  return (
    <div className="w-full max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Result Header */}
      <div className="text-center space-y-2 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-4">
          <Shield size={14} /> Evaluación Inicial 360° Completada
        </div>
        <h1 className="text-4xl font-black tracking-tight">{result.profile.name}</h1>
        <p className="text-zinc-500 uppercase text-[10px] font-black tracking-[0.2em]">{result.profile.sport} • {result.profile.position}</p>
      </div>

      <div className={`p-8 rounded-[2.5rem] border ${result.status === 'Verde' ? 'border-emerald-500/20' : result.status === 'Amarillo' ? 'border-yellow-500/20' : 'border-red-500/20'} ${statusBg} text-center relative overflow-hidden group`}>
         <div className="relative z-10 space-y-2">
           <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Bloque 6: Diagnóstico Integral</p>
           <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Estado de Blindaje</p>
           <h2 className={`text-6xl font-black ${statusColor} tracking-tighter transition-transform group-hover:scale-105 duration-500`}>{result.status}</h2>
           <div className="flex justify-center gap-1">
             {[1, 2, 3].map(i => (
               <div key={i} className={`w-8 h-1 rounded-full ${i <= (result.status === 'Verde' ? 1 : result.status === 'Amarillo' ? 2 : 3) ? statusColor.replace('text', 'bg') : 'bg-zinc-800'}`} />
             ))}
           </div>
         </div>
         <Shield className={`absolute -right-8 -bottom-8 opacity-5 ${statusColor} group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000`} size={200} />
      </div>

      {/* Flags section */}
      {result.flags.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-2">
            <AlertCircle size={14} /> Alertas de Rendimiento
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {result.flags.map((flag: string) => (
              <div key={flag} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3 hover:bg-zinc-800/80 transition-colors">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-bold text-zinc-300">{flag}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Strategy Section */}
      <section className="space-y-4">
        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-2">
          <TrendingUp size={14} /> Estrategia Sugerida
        </h3>
        <div className="space-y-3">
          {[
            { id: 'M1', title: 'Movilidad y Prevención', desc: result.strategy.m1, icon: Star },
            { id: 'M2', title: 'Fuerza y Estabilidad', desc: result.strategy.m2, icon: Zap },
            { id: 'M3', title: 'Rendimiento y Progreso', desc: result.strategy.m3, icon: TrendingUp }
          ].map((s) => (
            <div key={s.id} className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl flex gap-4 hover:bg-zinc-800/50 transition-colors">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-[#D4AF37] border border-zinc-800 shrink-0">
                <s.icon size={20} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-1">{s.id}: {s.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Motivational Message */}
      <div className="py-8 border-y border-zinc-800 text-center italic">
        <p className="text-zinc-400 text-sm px-4 text-balance">
          "{result.profile.inspiration ? `Como ${result.profile.inspiration}, la constancia construye leyendas.` : 'La disciplina te llevará donde el talento no puede.'}"
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl text-center space-y-4">
        <div className="flex justify-center"><Lock className="text-[#D4AF37]" size={20} /></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Compromiso Sellado</p>
        <h3 className="text-lg font-black italic">"{result.commitment}"</h3>
      </div>

      <button 
        onClick={onBack}
        className="w-full bg-[#D4AF37] text-black font-black py-4 rounded-2xl shadow-xl shadow-[#D4AF37]/10 hover:shadow-[#D4AF37]/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
      >
        Volver al Perfil
      </button>
    </div>
  );
};
