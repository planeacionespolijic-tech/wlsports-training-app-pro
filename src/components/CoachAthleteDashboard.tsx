import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock, Zap, BarChart3, MessageSquare } from 'lucide-react';
import { analyzeProgress, AnalysisResult } from '../services/intelligenceService';
import { subscribeToLiveSession, LiveSessionState } from '../services/liveSessionService';
import { motion, AnimatePresence } from 'motion/react';

interface CoachAthleteDashboardProps {
  athleteId: string;
  athleteName: string;
  athleteType: 'adult' | 'child';
}

export const CoachAthleteDashboard = ({ athleteId, athleteName, athleteType }: CoachAthleteDashboardProps) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSessionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) return;

    const fetchData = async () => {
      const result = await analyzeProgress(athleteId);
      setAnalysis(result);
      setLoading(false);
    };

    fetchData();

    // Subscribe to live session updates
    const unsubscribe = subscribeToLiveSession(athleteId, (state) => {
      setLiveSession(state);
    });

    return () => unsubscribe();
  }, [athleteId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Session Alert */}
      <AnimatePresence>
        {liveSession && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#D4AF37]/10 border border-[#D4AF37] p-4 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="text-[#D4AF37] animate-pulse" size={24} />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#D4AF37]">Sesión en Vivo: {liveSession.workoutName}</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                  {liveSession.completedExercises.length} ejercicios completados
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-[#D4AF37]">ACTIVA</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intelligence Analysis Card */}
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-[#D4AF37]" size={20} />
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Análisis de Inteligencia</h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
            analysis?.status === 'Progresando' ? 'bg-emerald-500/10 text-emerald-500' :
            analysis?.status === 'Sobreentrenado' ? 'bg-red-500/10 text-red-500' :
            'bg-amber-500/10 text-amber-500'
          }`}>
            {analysis?.status || 'Sin Datos'}
          </span>
        </div>

        {analysis && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50 text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Ratio ACWR</p>
              <p className={`text-xl font-black ${
                analysis.metrics.ratio > 1.5 ? 'text-red-500' : 
                analysis.metrics.ratio < 0.8 ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {analysis.metrics.ratio.toFixed(2)}
              </p>
            </div>
            <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50 text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Carga Aguda</p>
              <p className="text-xl font-black text-white">{analysis.metrics.acuteLoad}</p>
            </div>
            <div className="bg-black/40 p-3 rounded-2xl border border-zinc-800/50 text-center">
              <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Riesgo</p>
              <p className={`text-xl font-black ${
                analysis.riskLevel === 'Alto' ? 'text-red-500' : 
                analysis.riskLevel === 'Medio' ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {analysis.riskLevel}
              </p>
            </div>
          </div>
        )}

        {analysis?.recommendations && analysis.recommendations.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <MessageSquare size={14} />
              Recomendaciones del Sistema
            </h3>
            <div className="space-y-2">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3 bg-black/20 p-3 rounded-xl border border-zinc-800/30">
                  <AlertTriangle size={16} className="text-[#D4AF37] shrink-0" />
                  <p className="text-xs text-zinc-400 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800">
          <BarChart3 className="text-zinc-500 mb-3" size={20} />
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Progreso Total</h3>
          <p className="text-2xl font-black text-white">+12% <span className="text-[10px] text-emerald-500 font-bold ml-1">↑</span></p>
        </div>
        <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800">
          <Clock className="text-zinc-500 mb-3" size={20} />
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Consistencia</h3>
          <p className="text-2xl font-black text-white">94%</p>
        </div>
      </div>
    </div>
  );
};
