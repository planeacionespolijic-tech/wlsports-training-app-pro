import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Trophy, Copy, CheckCircle2, FileText, Award, UserSquare } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getLevelFromXP } from '../constants';

interface ReportesWLSportsScreenProps {
  userId: string;
  athlete: any;
  onBack: () => void;
  trainerId?: string | null;
}

export const ReportesWLSportsScreen: React.FC<ReportesWLSportsScreenProps> = ({ userId, athlete, onBack, trainerId }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeFlow, setActiveFlow] = useState<'none' | 'mensual' | 'nivel' | 'tarjeta'>('none');
  const [step, setStep] = useState<'config' | 'review' | 'prompt'>('config');
  
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>(athlete?.levelName || getLevelFromXP(athlete?.xp || 0).name);
  
  const [reviewData, setReviewData] = useState<any>(null);
  const [reviewText, setReviewText] = useState<string>('');
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const sessionsQ = query(collection(db, 'sessions'), where('athleteId', '==', userId), orderBy('createdAt', 'desc'));
      const sessionsSnap = await getDocs(sessionsQ);
      setSessions(sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const workoutsQ = query(collection(db, 'workouts'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const workoutsSnap = await getDocs(workoutsQ);
      setWorkouts(workoutsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const formatInputDate = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      setDateFrom(formatInputDate(firstDay));
      setDateTo(formatInputDate(lastDay));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRealDate = (item: any) => {
    if (item.date) {
      if (item.date.toDate) return item.date.toDate();
      if (typeof item.date === 'string') {
        const parts = item.date.split('-');
        if (parts.length >= 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2].split('T')[0], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return new Date(y, m, d, 12, 0, 0);
          }
        }
        const d = new Date(item.date);
        if (!isNaN(d.getTime())) return d;
      }
      if (item.date instanceof Date && !isNaN(item.date.getTime())) {
        return item.date;
      }
    }
    if (item.createdAt?.toDate) {
      return item.createdAt.toDate();
    }
    if (item.createdAt instanceof Date && !isNaN(item.createdAt.getTime())) {
      return item.createdAt;
    }
    return null;
  };

  const cleanUndefined = (val: any, type: 'text' | 'eval' | 'visual') => {
    if (val === undefined || val === null || val === '' || (typeof val === 'number' && isNaN(val))) {
      if (type === 'text') return 'No registrado';
      if (type === 'eval') return 'Pendiente de evaluación';
      if (type === 'visual') return '—';
    }
    return val;
  };

  const handleGenerateMensual = () => {
    if (!dateFrom || !dateTo) {
      alert("Debes seleccionar una fecha de inicio (DESDE) y una fecha de fin (HASTA).");
      return;
    }
    const fromDate = new Date(`${dateFrom}T00:00:00`);
    const toDate = new Date(`${dateTo}T23:59:59`);
    
    if (fromDate > toDate) {
      alert("La fecha DESDE no puede ser posterior a la fecha HASTA.");
      return;
    }

    const formatShortDate = (d) => {
      if (!d) return '';
      const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
      return `${String(d.getDate()).padStart(2, '0')} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    };
    
    const periodLabel = `${formatShortDate(fromDate)} — ${formatShortDate(toDate)}`;

    // 1. Gather all unique historical sessions and workouts
    const uniqueAllSessions = sessions.filter((s, index, self) => 
      index === self.findIndex((t) => t.id === s.id)
    );
    const uniqueAllWorkouts = workouts.filter((w, index, self) => 
      index === self.findIndex((t) => t.id === w.id)
    );

    // 2. Unify them globally to assign global session numbers chronologically
    const allUnified = [];
    uniqueAllSessions.forEach(s => {
      let d = getRealDate(s);
      if (d) {
        allUnified.push({
          id: s.id,
          dateObj: d,
          status: s.status === 'No realizada' ? 'No realizada' : 'Realizada',
          notes: s.notes || null,
          type: 'executed',
          xpGained: s.xpGained || 0
        });
      }
    });

    uniqueAllWorkouts.forEach(w => {
      let d = getRealDate(w);
      if (d) {
        const hasExecuted = allUnified.find(us => 
          us.type === 'executed' && 
          us.dateObj.getDate() === d.getDate() && 
          us.dateObj.getMonth() === d.getMonth() && 
          us.dateObj.getFullYear() === d.getFullYear()
        );
        if (!hasExecuted) {
          allUnified.push({
            id: w.id,
            dateObj: d,
            status: 'Programada',
            notes: null,
            type: 'scheduled',
            xpGained: 0
          });
        }
      }
    });

    // 3. Sort globally chronologically (oldest first)
    allUnified.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // 4. Assign global numbers (only to actual performed sessions if desired, but we can assign to all to be safe, or just performed? User said "enumera los numeros de sesiones automaticamente desde 1 la más antigua". Usually means the executed ones or both. Let's do it for all items in unified.)
    let globalCounter = 1;
    allUnified.forEach((item) => {
      item.globalIndex = globalCounter++;
    });

    // 5. Filter for the selected period
    const periodUnified = allUnified.filter(u => u.dateObj >= fromDate && u.dateObj <= toDate);

    // We maintain chronological order for the report output (oldest first)
    periodUnified.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // 6. Calculate metrics
    const xpGained = periodUnified.reduce((acc, s) => acc + s.xpGained, 0);
    const scheduled = periodUnified.length; // Contains all uncompleted (workouts) + completed/missed (sessions)
    const executedSessions = periodUnified.filter(u => u.status === 'Realizada').length;
    
    const medals = athlete?.medals?.filter((m) => {
       const date = getRealDate(m);
       if (!date) return false;
       return date >= fromDate && date <= toDate;
    }) || [];

    const formatSessionDate = (d) => {
      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      return `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
    };

    const sessionsList = periodUnified.map(s => {
       const dateStr = s.dateObj ? formatSessionDate(s.dateObj) : null;
       let statusStr = '';
       if (s.status === 'Realizada') statusStr = '✓ Realizada';
       else if (s.status === 'No realizada') statusStr = '✕ No realizada';
       else if (s.status === 'Programada') statusStr = '○ Programada';
       else statusStr = '— Estado no registrado';
       
       return {
         date: dateStr,
         status: statusStr,
         notes: cleanUndefined(s.notes, 'text'),
         globalIndex: s.globalIndex
       };
    });

    const compliance = scheduled > 0 ? Math.round((executedSessions / scheduled) * 100) : (executedSessions > 0 ? 100 : 'No registrado');

    const attributes = {
      TEC: cleanUndefined(athlete.attributes?.TEC || athlete.attributes?.tecnica || 10, 'visual'),
      FIS: cleanUndefined(athlete.attributes?.FIS || athlete.attributes?.fuerza || 10, 'visual'),
      NEU: cleanUndefined(athlete.attributes?.NEU || athlete.attributes?.neuro || 10, 'visual'),
      AGI: cleanUndefined(athlete.attributes?.AGI || athlete.attributes?.ritmo || 10, 'visual'),
      ACT: cleanUndefined(athlete.attributes?.ACT || athlete.attributes?.mentalidad || 10, 'visual')
    };

    const data = {
      title: `Reporte del Periodo`,
      type: 'mensual',
      athlete: {
        name: cleanUndefined(athlete.displayName, 'text'),
        age: cleanUndefined(athlete.age || athlete.initialEvaluation?.profile?.age || athlete.profile?.age, 'text'),
        category: cleanUndefined(athlete.category || athlete.initialEvaluation?.profile?.category || athlete.profile?.category, 'text'),
        position: cleanUndefined(athlete.position || athlete.initialEvaluation?.profile?.position || athlete.profile?.position, 'text'),
        sport: cleanUndefined(athlete.sport || athlete.deporte || athlete.initialEvaluation?.profile?.sport || athlete.profile?.sport, 'text'),
        profile: cleanUndefined(athlete.dominantSide || athlete.perfil || athlete.initialEvaluation?.profile?.laterality || athlete.profile?.laterality, 'text'),
      },
      period: periodLabel,
      currentLevel: cleanUndefined(getLevelFromXP(athlete.xp || 0).name, 'text'),
      currentXP: cleanUndefined(athlete.xp || 0, 'text'),
      xpGained: xpGained,
      compliance: compliance,
      medals: medals.length,
      sessions: sessionsList.length > 0 ? sessionsList : null,
      technicalAttributes: attributes
    };
    
    setReviewData(data);
    setReviewText(JSON.stringify(data, null, 2));
    setStep('review');
  };

  const handleGenerateNivel = () => {
    const hasStageStart = !!athlete.lastLevelUpDate;
    const stageStart = hasStageStart ? getRealDate({ date: athlete.lastLevelUpDate }) : null;
    
    let stageSessionsList: any[] = [];
    let stageMedalsList: any[] = [];
    let stageWorkoutsList: any[] = [];
    
    if (hasStageStart && stageStart) {
      stageSessionsList = sessions.filter(s => {
        const d = getRealDate(s);
        return d && d >= stageStart;
      });
      stageWorkoutsList = workouts.filter(w => {
        const d = getRealDate(w);
        return d && d >= stageStart;
      });
      stageMedalsList = (athlete.medals || []).filter((m: any) => {
        const d = getRealDate(m);
        return d && d >= stageStart;
      });
    }

    // Remove duplicates
    stageSessionsList = stageSessionsList.filter((s, index, self) => index === self.findIndex((t) => t.id === s.id));
    stageWorkoutsList = stageWorkoutsList.filter((w, index, self) => index === self.findIndex((t) => t.id === w.id));

    const stageCompliance = stageWorkoutsList.length > 0 
      ? Math.round((stageSessionsList.length / stageWorkoutsList.length) * 100) 
      : (stageSessionsList.length > 0 ? 100 : 'No registrado');
      
    const stageXpEarned = stageSessionsList.reduce((acc, s) => acc + (s.xpGained || 0), 0);

    const data = {
      title: `Reporte de Nivel - ${selectedLevel}`,
      type: 'nivel',
      athlete: {
        name: cleanUndefined(athlete.displayName, 'text'),
        age: cleanUndefined(athlete.age || athlete.initialEvaluation?.profile?.age || athlete.profile?.age, 'text'),
        category: cleanUndefined(athlete.category || athlete.initialEvaluation?.profile?.category || athlete.profile?.category, 'text'),
        position: cleanUndefined(athlete.position || athlete.initialEvaluation?.profile?.position || athlete.profile?.position, 'text'),
        sport: cleanUndefined(athlete.sport || athlete.deporte || athlete.initialEvaluation?.profile?.sport || athlete.profile?.sport, 'text'),
        profile: cleanUndefined(athlete.dominantSide || athlete.perfil || athlete.initialEvaluation?.profile?.laterality || athlete.profile?.laterality, 'text'),
      },
      previousLevel: "No registrado", 
      newLevel: selectedLevel,
      endingXP: cleanUndefined(athlete.xp, 'text'),
      stageDuration: hasStageStart && stageStart ? `${Math.max(1, Math.round((new Date().getTime() - stageStart.getTime()) / (1000 * 3600 * 24)))} días` : 'No registrado',
      sessions: hasStageStart ? stageSessionsList.length : 'No registrado',
      compliance: hasStageStart ? stageCompliance : 'No registrado',
      xpEarned: hasStageStart ? stageXpEarned : 'No registrado',
      medals: hasStageStart ? stageMedalsList.length : 'No registrado',
      challengesCompleted: 'No registrado',
      attributeEvolution: {
        TEC: (athlete.attributes?.TEC || athlete.attributes?.tecnica) ? `${athlete.attributes.TEC || athlete.attributes.tecnica}${!isNaN(Number(athlete.attributes.TEC || athlete.attributes.tecnica)) ? '%' : ''}` : '10%',
        FIS: (athlete.attributes?.FIS || athlete.attributes?.fuerza) ? `${athlete.attributes.FIS || athlete.attributes.fuerza}${!isNaN(Number(athlete.attributes.FIS || athlete.attributes.fuerza)) ? '%' : ''}` : '10%',
        NEU: (athlete.attributes?.NEU || athlete.attributes?.neuro) ? `${athlete.attributes.NEU || athlete.attributes.neuro}${!isNaN(Number(athlete.attributes.NEU || athlete.attributes.neuro)) ? '%' : ''}` : '10%',
        AGI: (athlete.attributes?.AGI || athlete.attributes?.ritmo) ? `${athlete.attributes.AGI || athlete.attributes.ritmo}${!isNaN(Number(athlete.attributes.AGI || athlete.attributes.ritmo)) ? '%' : ''}` : '10%',
        ACT: (athlete.attributes?.ACT || athlete.attributes?.mentalidad) ? `${athlete.attributes.ACT || athlete.attributes.mentalidad}${!isNaN(Number(athlete.attributes.ACT || athlete.attributes.mentalidad)) ? '%' : ''}` : '10%'
      },
      developedCapabilities: 'Pendiente de evaluación',
      stageAchievements: 'Pendiente de evaluación',
      nextChallenge: 'Pendiente de evaluación',
      levelDescription: 'No registrada'
    };
    setReviewData(data);
    setReviewText(JSON.stringify(data, null, 2));
    setStep('review');
  };

  const handleGenerateTarjeta = () => {
    const data = {
      title: `Tarjeta WLSPORTS - ${athlete.displayName || 'Atleta'}`,
      type: 'tarjeta',
      athlete: {
        name: cleanUndefined(athlete.displayName, 'text'),
        age: cleanUndefined(athlete.age || athlete.initialEvaluation?.profile?.age || athlete.profile?.age, 'text'),
        category: cleanUndefined(athlete.category || athlete.initialEvaluation?.profile?.category || athlete.profile?.category, 'text'),
        position: cleanUndefined(athlete.position || athlete.initialEvaluation?.profile?.position || athlete.profile?.position, 'text'),
        sport: cleanUndefined(athlete.sport || athlete.deporte || athlete.initialEvaluation?.profile?.sport || athlete.profile?.sport, 'text'),
        profile: cleanUndefined(athlete.dominantSide || athlete.perfil || athlete.initialEvaluation?.profile?.laterality || athlete.profile?.laterality, 'text'),
      },
      currentLevel: cleanUndefined(getLevelFromXP(athlete.xp || 0).name, 'text'),
      currentXP: cleanUndefined(athlete.xp || 0, 'text'),
      overallRating: cleanUndefined(athlete.ovr, 'visual'),
      wlSportsId: athlete.id ? `WLS-${athlete.id.substring(0,6).toUpperCase()}` : 'No registrado',
      attributes: {
        TEC: cleanUndefined(athlete.attributes?.TEC || athlete.attributes?.tecnica || 10, 'visual'),
        FIS: cleanUndefined(athlete.attributes?.FIS || athlete.attributes?.fuerza || 10, 'visual'),
        NEU: cleanUndefined(athlete.attributes?.NEU || athlete.attributes?.neuro || 10, 'visual'),
        AGI: cleanUndefined(athlete.attributes?.AGI || athlete.attributes?.ritmo || 10, 'visual'),
        ACT: cleanUndefined(athlete.attributes?.ACT || athlete.attributes?.mentalidad || 10, 'visual')
      }
    };
    setReviewData(data);
    setReviewText(JSON.stringify(data, null, 2));
    setStep('review');
  };

  const buildPrompt = () => {
    let parsedData;
    try {
      parsedData = JSON.parse(reviewText);
      setReviewData(parsedData);
    } catch (e) {
      alert("Error en el formato JSON. Por favor corrige los errores antes de aprobar.");
      return;
    }

    let prompt = `----------------------------------------------\nPROMPT VISUAL WLSPORTS\n----------------------------------------------\n\n`;
    prompt += `Crea un diseño editorial deportivo premium WLSPORTS basándote estrictamente en la siguiente información.\n\n`;
    prompt += `REGLA ESTRICTA: NO INVENTAR DATOS. Los datos mostrados a continuación son los ÚNICOS datos reales registrados. Lo que aparece como "No registrado", "Pendiente de evaluación" o "—" debe respetarse tal cual.\n\n`;

    if (parsedData.type === 'mensual') {
      const messages = [
        "Cada sesión es una nueva oportunidad para crecer.",
        "Mantén la disciplina, disfruta el proceso y sigue dando un paso adelante.",
        "Confía en tu proceso, trabaja con constancia y disfruta cada entrenamiento.",
        "La constancia se construye paso a paso. Sigue trabajando con confianza.",
        "Sigue construyendo tu mejor versión, día a día."
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      prompt += `==============================================
PROMPT MAESTRO DEFINITIVO — INFORME MENSUAL WLSPORTS
==============================================

`;
      
      prompt += `Crea un INFORME MENSUAL WLSPORTS práctico, limpio, visual, profesional y estrictamente basado en los datos reales proporcionados a continuación.

`;
      
      prompt += `============================================================
1. REGLA ABSOLUTA — LOS DATOS SON LA ÚNICA FUENTE DE VERDAD
============================================================

`;
      prompt += `Los datos escritos en este prompt son la única fuente válida.
PROHIBIDO:
- inventar datos
- completar datos faltantes
- estimar
- suponer
- deducir
- interpretar
- crear estadísticas
- crear porcentajes
- crear resultados
- crear logros
- crear fortalezas
- crear áreas de mejora
- crear desafíos
- crear evolución
- inventar sesiones
- inventar fechas
- inventar novedades
- inventar información deportiva

`;
      prompt += `La IA puede ser creativa únicamente en el diseño visual, composición, tipografía, iluminación, fondos y presentación.
La IA NO puede ser creativa con los datos del atleta.

`;
      
      prompt += `============================================================
2. DATOS FALTANTES
============================================================

`;
      prompt += `Los valores "No registrado", "No registrada", "Pendiente de evaluación", "—" deben conservar su significado. Nunca convertirlos en 0, 0%, N/A, Bajo, Débil, Sin información, Desconocido, o cualquier otro valor inventado. Cuando un dato básico del atleta no exista, preferentemente omitir el campo.

`;

      prompt += `INFORME MENSUAL WLSPORTS
`;
      prompt += `PERÍODO: ${parsedData.period}

`;

      prompt += `DATOS DEL ATLETA:
`;
      prompt += `Nombre: ${parsedData.athlete.name}
`;
      if (parsedData.athlete.age && parsedData.athlete.age !== 'No registrado') prompt += `Edad: ${parsedData.athlete.age}
`;
      if (parsedData.athlete.sport && parsedData.athlete.sport !== 'No registrado') prompt += `Deporte: ${parsedData.athlete.sport}
`;
      if (parsedData.athlete.profile && parsedData.athlete.profile !== 'No registrado') prompt += `Perfil: ${parsedData.athlete.profile}
`;
      if (parsedData.athlete.category && parsedData.athlete.category !== 'No registrado') prompt += `Categoría: ${parsedData.athlete.category}
`;
      if (parsedData.athlete.position && parsedData.athlete.position !== 'No registrado') prompt += `Posición: ${parsedData.athlete.position}
`;
      prompt += `
NIVEL ACTUAL
${parsedData.currentLevel}

`;
      prompt += `XP ACUMULADO
${parsedData.currentXP} XP

`;

      prompt += `DATOS DEL PERÍODO (Exclusivo de las fechas mostradas):
`;
      if (parsedData.xpGained !== 'No registrado' && parsedData.xpGained !== undefined && parsedData.xpGained > 0) {
        prompt += `XP GANADA EN EL PERÍODO: ${parsedData.xpGained} XP
`;
      }
      if (parsedData.compliance !== 'No registrado') {
        prompt += `CUMPLIMIENTO: ${parsedData.compliance}%
`;
      }
      if (parsedData.medals !== 'No registradas' && parsedData.medals > 0) {
        prompt += `MEDALLAS DEL PERÍODO: ${parsedData.medals}
`;
      }
      prompt += `
`;

      prompt += `SESIONES DEL PERÍODO
`;
      if (parsedData.sessions && parsedData.sessions.length > 0) {
        parsedData.sessions.forEach((s, idx) => {
          prompt += `Clase ${s.globalIndex || (idx + 1)} — ${s.date}
`;
          if (s.notes && s.notes !== 'No registrado') {
            prompt += `Novedad: ${s.notes}
`;
          }
        });
      } else {
        prompt += `No registrado
`;
      }
      prompt += `
`;
      
      prompt += `FICHA TÉCNICA
`;
      prompt += `TEC — ${parsedData.technicalAttributes.TEC}
`;
      prompt += `FIS — ${parsedData.technicalAttributes.FIS}
`;
      prompt += `NEU — ${parsedData.technicalAttributes.NEU}
`;
      prompt += `AGI — ${parsedData.technicalAttributes.AGI}
`;
      prompt += `ACT — ${parsedData.technicalAttributes.ACT}

`;
      
      prompt += `============================================================
3. FICHA TÉCNICA Y REPRESENTACIÓN
============================================================

`;
      prompt += `Si el atributo es "—", mostrar "—". No convertirlo en TEC 0 o TEC 0%. Si solamente existe un valor actual de cada atributo, mostrar únicamente ese valor. No crear valores iniciales, finales, evolución, flechas de progreso ni comparación. Representar exactamente el valor si es numérico (usando barras, radar o número limpio).

`;

      prompt += `============================================================
4. ELEMENTOS PROHIBIDOS
============================================================

`;
      prompt += `Eliminar fortalezas, áreas de mejora, desafíos, logros acumulados, evolución histórica, nivel anterior, trayectoria completa, análisis profundo del rendimiento, proyección de crecimiento o comparación histórica. Esto NO es un informe de nivel ni una tarjeta coleccionable.

`;

      prompt += `MENSAJE DEL COACH
`;
      prompt += `"${randomMessage}"

`;
      
      prompt += `============================================================
5. DISEÑO VISUAL WLSPORTS
============================================================

`;
      prompt += `PALETA: Negro, Grafito, Dorado metálico, Verde neón, Blanco.
ESTÉTICA: Deportiva, Premium, Moderna, Editorial, Juvenil, Profesional, Tecnológica, Alto contraste. Mostrar la fotografía real proporcionada sin alterar la identidad del atleta. Si hay poca información, dar protagonismo a la foto y mantener espacios negativos elegantes. No rellenar con estadísticas inventadas. El informe debe verse limpio y estructurado.
`;

    } else if (parsedData.type === 'nivel') {
      prompt += `==============================================\nPROMPT VISUAL WLSPORTS — TARJETA DE ASCENSO\n==============================================\n\n`;
      prompt += `DATOS DEL ASCENSO\n`;
      prompt += `ATLETA: ${parsedData.athlete.name}\n`;
      prompt += `NIVEL ANTERIOR: ${parsedData.previousLevel}\n`;
      prompt += `NUEVO NIVEL: ${parsedData.newLevel}\n`;
      prompt += `XP ALCANZADA: ${parsedData.endingXP}\n\n`;
      
      prompt += `RESUMEN DE LA ETAPA\n`;
      prompt += `- Duración de la etapa: ${parsedData.stageDuration}\n`;
      prompt += `- Sesiones realizadas: ${parsedData.sessions}\n`;
      prompt += `- Cumplimiento: ${parsedData.compliance}${typeof parsedData.compliance === 'number' ? '%' : ''}\n`;
      prompt += `- XP obtenida durante la etapa: ${parsedData.xpEarned}\n`;
      prompt += `- Medallas obtenidas: ${parsedData.medals}\n`;
      prompt += `- Desafíos completados: ${parsedData.challengesCompleted}\n\n`;
      
      prompt += `ATRIBUTOS ACTUALES:\n`;
      prompt += `⚽ TEC: ${athlete.attributes?.TEC || athlete.attributes?.tecnica || 10}\n`;
      prompt += `💪 FIS: ${athlete.attributes?.FIS || athlete.attributes?.fuerza || 10}\n`;
      prompt += `🧠 NEU: ${athlete.attributes?.NEU || athlete.attributes?.neuro || 10}\n`;
      prompt += `🤸 AGI: ${athlete.attributes?.AGI || athlete.attributes?.ritmo || 10}\n`;
      prompt += `🔥 ACT: ${athlete.attributes?.ACT || athlete.attributes?.mentalidad || 10}\n\n`;
      
      prompt += `EVOLUCIÓN DE ATRIBUTOS\n`;
      prompt += `⚽ TEC: ${parsedData.attributeEvolution.TEC}\n`;
      prompt += `💪 FIS: ${parsedData.attributeEvolution.FIS}\n`;
      prompt += `🧠 NEU: ${parsedData.attributeEvolution.NEU}\n`;
      prompt += `🤸 AGI: ${parsedData.attributeEvolution.AGI}\n`;
      prompt += `🔥 ACT: ${parsedData.attributeEvolution.ACT}\n\n`;
      
      if (parsedData.developedCapabilities && parsedData.developedCapabilities !== 'Pendiente de evaluación' && parsedData.developedCapabilities !== 'No registrado') {
        prompt += `CAPACIDADES DESARROLLADAS\n${parsedData.developedCapabilities}\n\n`;
      }
      
      if (parsedData.stageAchievements && parsedData.stageAchievements !== 'Pendiente de evaluación' && parsedData.stageAchievements !== 'No registrado') {
        prompt += `LOGROS\n${parsedData.stageAchievements}\n\n`;
      }
      
      if (parsedData.nextChallenge && parsedData.nextChallenge !== 'Pendiente de evaluación' && parsedData.nextChallenge !== 'No registrado') {
        prompt += `NUEVO DESAFÍO\n${parsedData.nextChallenge}\n\n`;
      }
      
      if (parsedData.levelDescription && parsedData.levelDescription !== 'No registrada') {
        prompt += `DESCRIPCIÓN DEL NIVEL\n${parsedData.levelDescription}\n\n`;
      }
      
      prompt += `INSTRUCCIONES VISUALES:\n`;
      prompt += `- ESTÉTICA: Épica, celebratoria, premium, deportiva y profesional. Destacar visualmente el nuevo nivel. Si el nivel anterior no está registrado, mostrar "No registrado" sin inventar un nivel anterior.\n`;
      prompt += `- FOTOGRAFÍAS: Antes de generar la pieza, solicitar entre 2 y 5 fotografías reales del atleta que representen su proceso.\n`;

    } else if (parsedData.type === 'tarjeta') {
      prompt += `==============================================\nPROMPT MAESTRO DEFINITIVO — TARJETA DEPORTIVA WLSPORTS\n==============================================\n\n`;
      prompt += `Crea una TARJETA DEPORTIVA COLECCIONABLE PREMIUM WLSPORTS utilizando EXCLUSIVAMENTE los datos proporcionados por el sistema y los archivos reales proporcionados por el usuario.\n\n`;
      
      prompt += `============================================================\n1. REGLA ABSOLUTA — LOS DATOS SON LA ÚNICA FUENTE DE VERDAD\n============================================================\n\n`;
      prompt += `Los datos escritos en este prompt son los ÚNICOS datos oficiales disponibles para la pieza.\nNO inventes, completes, deduzcas, estimes, supongas, calcules ni interpretes información que no esté explícitamente proporcionada.\nLa IA visual puede ser creativa ÚNICAMENTE en el diseño gráfico, composición, iluminación, tipografía, texturas y presentación visual.\nLa IA visual NO puede ser creativa con los datos del atleta.\n\n`;
      prompt += `PROHIBIDO INVENTAR:\n- Estadísticas.\n- Porcentajes.\n- Atributos.\n- OVR.\n- XP.\n- Nivel.\n- Nivel anterior.\n- Edad.\n- Categoría.\n- Posición.\n- Sesiones.\n- Resultados.\n- Medallas.\n- Logros.\n- Capacidades.\n- Desafíos.\n- Fortalezas.\n- Áreas de mejora.\n- Evoluciones.\n- Fechas.\n- Comentarios.\n- Rendimiento.\n- Progreso.\n- Cualquier otro dato deportivo.\n\n`;
      prompt += `NO interpretar información a partir de la fotografía.\nNO interpretar información a partir del ID WLSPORTS.\nNO utilizar conocimientos externos para completar información faltante.\nNO convertir información faltante en información estimada.\n\n`;
      
      prompt += `============================================================\n2. DATOS DEL ATLETA\n============================================================\n\n`;
      prompt += `NOMBRE: ${parsedData.athlete.name}\n`;
      prompt += `EDAD: ${parsedData.athlete.age}\n`;
      prompt += `DEPORTE: ${parsedData.athlete.sport}\n`;
      prompt += `PERFIL: ${parsedData.athlete.profile}\n`;
      prompt += `CATEGORÍA: ${parsedData.athlete.category}\n`;
      prompt += `POSICIÓN: ${parsedData.athlete.position}\n`;
      prompt += `NIVEL ACTUAL: ${parsedData.currentLevel}\n`;
      prompt += `XP ACTUAL: ${parsedData.currentXP}\n`;
      prompt += `RATING GENERAL (OVR): ${parsedData.overallRating}\n`;
      prompt += `ID WLSPORTS: ${parsedData.wlSportsId}\n\n`;
      prompt += `Mostrar cada dato exactamente como fue proporcionado.\nNO modificar nombres. NO cambiar números. NO redondear números. NO traducir nombres de niveles. NO cambiar mayúsculas o minúsculas de los nombres oficiales de los niveles.\n\n`;
      
      prompt += `============================================================\n3. NIVEL ANTERIOR Y NIVEL ACTUAL\n============================================================\n\n`;
      prompt += `El NIVEL ACTUAL debe mostrarse siempre que exista.\nNUNCA inventar un nivel anterior. NUNCA sustituirlo por otro nivel. NUNCA inferirlo a partir del nivel actual. NUNCA asumir cuál era el nivel anterior.\n\n`;
      
      prompt += `============================================================\n4. XP ACTUAL\n============================================================\n\n`;
      prompt += `Mostrar la XP ACTUAL exactamente como fue proporcionada.\nEjemplo:\nXP ACTUAL\n${parsedData.currentXP} XP\n\nNo calcular nada utilizando la XP. NO utilizar XP para calcular OVR, atributos, nivel anterior, progreso, porcentajes, rendimiento.\n\n`;
      
      prompt += `============================================================\n5. OVR / RATING GENERAL\n============================================================\n\n`;
      prompt += `Si OVR = "—": NO calcularlo, NO estimarlo, NO sustituirlo por el promedio de atributos, NO sustituirlo por XP, NO crear una puntuación visual equivalente. Puede mostrarse "—" de forma limpia o omitirse. Nunca presentar un OVR inventado.\n\n`;
      
      prompt += `============================================================\n6. ATRIBUTOS — REGLA CRÍTICA\n============================================================\n\n`;
      prompt += `Los atributos oficiales WLSPORTS son:\n⚽ TEC — Técnica\n💪 FIS — Físico\n🧠 NEU — Neurocognitivo\n🤸 AGI — Agilidad\n🔥 ACT — Actitud\n\n`;
      prompt += `⚽ TEC ${parsedData.attributes.TEC}\n`;
      prompt += `💪 FIS ${parsedData.attributes.FIS}\n`;
      prompt += `🧠 NEU ${parsedData.attributes.NEU}\n`;
      prompt += `🤸 AGI ${parsedData.attributes.AGI}\n`;
      prompt += `🔥 ACT ${parsedData.attributes.ACT}\n\n`;
      prompt += `SI EXISTE UN PORCENTAJE NUMÉRICO REAL: DEBE MOSTRARSE EN LA TARJETA.\nEl porcentaje debe reproducirse EXACTAMENTE. No modificarlo, no redondearlo, no calcularlo.\nLa barra, indicador o representación gráfica debe corresponder EXACTAMENTE al porcentaje proporcionado.\nSI EL ATRIBUTO ES "—": mostrar "—" o una representación visual neutra equivalente. NO mostrar 0%. NO crear una barra de 0%. NO crear un porcentaje.\n\n`;
      
      prompt += `============================================================\n7. EVOLUCIÓN DE ATRIBUTOS\n============================================================\n\n`;
      prompt += `Si únicamente existe el valor actual, mostrar únicamente el valor actual. NO crear un valor inicial. Solo utilizar gráficos de evolución cuando existan datos reales suficientes. NO inventar puntos intermedios. NO crear flechas de progreso si no existe información de evolución.\n\n`;
      
      prompt += `============================================================\n8. INFORMACIÓN FALTANTE\n============================================================\n\n`;
      prompt += `Los valores "—", "No registrado", "Pendiente de evaluación" NO significan cero.\nNO convertirlos en: 0, 0%, N/A, Sin habilidad, Bajo, Débil, Desconocido ni ningún otro valor inventado.\n\n`;
      
      prompt += `============================================================\n9. SECCIONES OPCIONALES\n============================================================\n\n`;
      prompt += `SI EXISTE INFORMACIÓN REAL: mostrarla.\nSI NO EXISTE INFORMACIÓN REAL: OMITIR COMPLETAMENTE LA SECCIÓN.\nNo rellenar espacios con "No registrado", "Pendiente de evaluación", "Sin información", "—" cuando la sección pueda omitirse sin perjudicar la comprensión de la tarjeta.\n\n`;
      
      prompt += `============================================================\n10. RESUMEN DE ETAPA\n============================================================\n\n`;
      prompt += `Si el resumen de etapa está completamente vacío y no existe ninguna información útil para mostrar: NO inventar estadísticas. NO inventar progreso. NO afirmar que el atleta mejoró. En ese caso, puede utilizarse UNA ÚNICA frase motivacional editorial, genérica y no estadística. Ejemplo permitido: "Cada nueva etapa abre una nueva oportunidad para crecer."\n\n`;
      
      prompt += `============================================================\n11. FOTOGRAFÍA DEL ATLETA\n============================================================\n\n`;
      prompt += `ANTES DE GENERAR LA TARJETA:\nSOLICITAR AL USUARIO 1 FOTOGRAFÍA REAL DEL ATLETA.\nPreferiblemente: Alta resolución. Buena iluminación. Fotografía de acción. Cuerpo completo o encuadre deportivo favorable. Rostro claramente visible.\nUTILIZAR ÚNICAMENTE LA FOTOGRAFÍA PROPORCIONADA.\nPROHIBIDO: Generar un atleta ficticio. Sustituir al atleta. Crear otro rostro. Cambiar la identidad facial. Inventar otra persona.\nNO extraer información deportiva de la fotografía. NO inferir posición, categoría, edad, nivel o habilidades.\n\n`;
      
      prompt += `============================================================\n12. LOGO WLSPORTS\n============================================================\n\n`;
      prompt += `ANTES DE GENERAR LA PIEZA: SOLICITAR AL USUARIO EL LOGO OFICIAL WLSPORTS.\nUTILIZAR EXCLUSIVAMENTE EL LOGO PROPORCIONADO.\nPROHIBIDO: Crear otro logo, redibujar el logo, reinterpretarlo, modificar el símbolo, cambiar la tipografía, cambiar sus colores, alterar sus proporciones, deformarlo.\n\n`;
      
      prompt += `============================================================\n13. IDENTIDAD VISUAL WLSPORTS\n============================================================\n\n`;
      prompt += `MARCA: WLSPORTS\nPALETA OFICIAL: NEGRO, GRAFITO, DORADO METÁLICO, VERDE NEÓN, BLANCO\nESTÉTICA: Deportiva. Premium. Moderna. Editorial. Juvenil. Profesional. Alto rendimiento. Tecnológica. Exclusiva. Coleccionable. Aspiracional. Limpia. Contraste elevado.\n\n`;
      
      prompt += `============================================================\n14. FORMATO\n============================================================\n\n`;
      prompt += `FORMATO: Tarjeta deportiva coleccionable vertical. Optimizada para compartir digitalmente, presentar a padres y atletas, e integrarse en el sistema WLSPORTS.\n\n`;
      
      prompt += `============================================================\n15. JERARQUÍA VISUAL\n============================================================\n\n`;
      prompt += `Priorizar visualmente: 1. Fotografía del atleta. 2. Nombre. 3. Nivel actual. 4. Nivel anterior, si existe. 5. Atributos actuales y sus porcentajes, si existen. 6. XP actual. 7. OVR, únicamente si existe. 8. Información adicional real. 9. ID WLSPORTS. No saturar la tarjeta.\n\n`;
      
      prompt += `============================================================\n16. DISEÑO CON POCOS DATOS\n============================================================\n\n`;
      prompt += `Si existen pocos datos: Dar protagonismo a la fotografía. Utilizar espacios negativos de manera intencional. Mantener una composición premium. Crear jerarquía visual. Omitir secciones sin información. No mostrar bloques vacíos. No rellenar espacios con estadísticas inventadas. No crear gráficos falsos. No hacer que la tarjeta parezca incompleta.\n\n`;
      
      prompt += `============================================================\n17. DISEÑO CON MUCHOS DATOS\n============================================================\n\n`;
      prompt += `Si existen suficientes datos reales: Utilizar barras de atributos, indicadores estadísticos, gráficos. Utilizar radar chart únicamente cuando existan suficientes valores numéricos reales. Utilizar módulos de evolución únicamente cuando exista información real de evolución. Nunca utilizar gráficos decorativos que puedan confundirse con estadísticas reales.\n\n`;
      
      prompt += `============================================================\n18. REPRESENTACIÓN DE PORCENTAJES\n============================================================\n\n`;
      prompt += `Los porcentajes de atributos son DATOS OFICIALES. Si la tarjeta proporciona "TEC 51%", mostrar TEC 51% y la barra debe representar 51%. Si proporciona "NEU —", mostrar NEU — y NO representar 0%. La representación visual debe ser coherente con el dato.\n\n`;
      
      prompt += `============================================================\n19. REGLAS DE TEXTO\n============================================================\n\n`;
      prompt += `Todo texto de datos debe coincidir exactamente con la información recibida. No corregir nombres de niveles, no crear frases que impliquen estadísticas, no inventar títulos deportivos ni comentarios. Los textos motivacionales solo pueden utilizarse cuando estén expresamente permitidos.\n\n`;
      
      prompt += `============================================================\n20. ERRORES TÉCNICOS PROHIBIDOS\n============================================================\n\n`;
      prompt += `VERIFICAR QUE NO APAREZCA NUNCA: undefined, null, NaN, NaN%, No registrado%, null%, undefined%, 0% cuando el dato original era "—", 0 cuando el dato original era "—". Verificar que no existan estadísticas inventadas, OVR calculado, edad inferida.\n\n`;
      
      prompt += `============================================================\n21. CONTROL DE CONSISTENCIA FINAL\n============================================================\n\n`;
      prompt += `ANTES DE ENTREGAR LA TARJETA, realizar una revisión final completa. COMPROBAR:\n□ El nombre es exactamente correcto.\n□ El nivel actual es exactamente correcto.\n□ XP actual es exactamente correcta.\n□ OVR solo aparece si existe un valor real y no fue calculado.\n□ Cada atributo muestra su porcentaje real cuando existe.\n□ Ningún atributo "—" fue convertido en 0.\n□ Las barras representan exactamente los porcentajes proporcionados.\n□ No se inventaron estadísticas, niveles, logros ni resultados.\n□ No aparece undefined, null, NaN.\n□ Las secciones sin información real fueron omitidas.\n□ La fotografía corresponde al atleta proporcionado.\n□ La identidad WLSPORTS se mantiene.\n\n`;
      
      prompt += `============================================================\n22. REGLA FINAL DE PRIORIDAD\n============================================================\n\n`;
      prompt += `SIEMPRE priorizar: 1. Exactitud de los datos. 2. Identidad real del atleta. 3. Identidad oficial WLSPORTS. 4. Legibilidad. 5. Diseño premium. NUNCA sacrificar la exactitud de los datos para llenar un espacio visual.\n\n`;
      
      prompt += `============================================================\n23. RESULTADO FINAL\n============================================================\n\n`;
      prompt += `Generar UNA tarjeta deportiva coleccionable WLSPORTS Premium, Profesional, Moderna. La creatividad está permitida únicamente en Composición, Tipografía, Iluminación, Texturas, Fondos. La creatividad NO está permitida en los datos. LOS DATOS SON INALTERABLES.\n`;
    }

        if (parsedData.type !== 'tarjeta') {
      prompt += `\n==============================================\nIDENTIDAD VISUAL WLSPORTS OBLIGATORIA\n==============================================\n`;
          prompt += `- MARCA: WLSPORTS\n`;
          prompt += `- PALETA OFICIAL: Negro, Grafito, Dorado metálico, Verde neón, Blanco.\n`;
          prompt += `- ESTÉTICA: deportiva, premium, moderna, editorial, alto rendimiento, juvenil, profesional, limpia, contrastante, tecnológica, aspiracional.\n`;
          prompt += `- LOGO: Solicitar al usuario el logo WLSPORTS antes de generar la pieza. Utilizar exclusivamente el proporcionado (NO crear, reinterpretar, redibujar, deformar ni cambiar colores).\n`;
          prompt += `- COMPORTAMIENTO POCOS DATOS: Mantener los datos reales, usar espacios elegantes, dar protagonismo a la fotografía, evitar llenar de "No registrado". Nunca rellenar con información inventada. Si el Resumen de Etapa está completamente vacío, se puede usar UNA frase motivacional genérica (ej. "Cada nueva etapa abre una nueva oportunidad para crecer.")\n`;
          prompt += `- COMPORTAMIENTO MUCHOS DATOS: Usar gráficos y radar charts solo si existen valores válidos.\n`;
          
          prompt += `\n==============================================\nREGLAS DE CONTROL DE CALIDAD Y REVISIÓN FINAL\n==============================================\n`;
          prompt += `- OBLIGATORIO: Revisa que ningún dato diga "undefined", "null", "NaN" o "No registrado%".\n`;
          prompt += `- OBLIGATORIO: No inventes ningún dato, logro, desafío, fortaleza ni estadística que no esté explícitamente en este prompt.\n`;
          prompt += `- OBLIGATORIO: Mantén la estética y colores de WLSPORTS, independientemente de la cantidad de datos.\n`;
    }

    setGeneratedPrompt(prompt);
    setStep('prompt');
  };
  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    alert('Prompt copiado al portapapeles. Pégalo en tu IA de generación (ChatGPT, Claude, Midjourney).');
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[#D4AF37] font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <BookOpen className="text-[#D4AF37]" size={24} />
        <h2 className="text-2xl font-black uppercase tracking-tight text-white">Reportes WLSPORTS</h2>
      </div>

      {activeFlow === 'none' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => setActiveFlow('mensual')}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl hover:bg-zinc-800 transition-all text-left flex flex-col gap-4 group"
          >
            <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase">Generar Reporte Mensual</h3>
              <p className="text-zinc-400 text-xs mt-1">Seguimiento periódico del proceso del atleta.</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveFlow('nivel')}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl hover:bg-zinc-800 transition-all text-left flex flex-col gap-4 group"
          >
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <Award size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase">Generar Reporte de Nivel</h3>
              <p className="text-zinc-400 text-xs mt-1">Reconocimiento y celebración del ascenso.</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveFlow('tarjeta')}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl hover:bg-zinc-800 transition-all text-left flex flex-col gap-4 group"
          >
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <UserSquare size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase">Generar Tarjeta del Atleta</h3>
              <p className="text-zinc-400 text-xs mt-1">Identidad deportiva coleccionable.</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <button 
            onClick={() => { setActiveFlow('none'); setStep('config'); }}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider mb-2"
          >
            <ArrowLeft size={16} /> Volver
          </button>

          {step === 'config' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
              <h3 className="text-xl font-black uppercase text-[#D4AF37]">
                Configurar {activeFlow === 'mensual' ? 'Reporte Mensual' : activeFlow === 'nivel' ? 'Reporte de Nivel' : 'Tarjeta de Atleta'}
              </h3>
              
              {activeFlow === 'mensual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Desde (Fecha inicial)</label>
                    <input 
                      type="date" 
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full bg-black border border-zinc-700 p-4 rounded-xl outline-none focus:border-[#D4AF37] [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Hasta (Fecha final)</label>
                    <input 
                      type="date" 
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full bg-black border border-zinc-700 p-4 rounded-xl outline-none focus:border-[#D4AF37] [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}

              {activeFlow === 'nivel' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Nivel Desbloqueado</label>
                  <input 
                    type="text" 
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full bg-black border border-zinc-700 p-4 rounded-xl outline-none focus:border-[#D4AF37]"
                  />
                </div>
              )}

              <button 
                onClick={() => {
                  if (activeFlow === 'mensual') handleGenerateMensual();
                  else if (activeFlow === 'nivel') handleGenerateNivel();
                  else handleGenerateTarjeta();
                }}
                className="w-full bg-[#D4AF37] text-black font-black uppercase py-4 rounded-xl tracking-widest hover:bg-yellow-500 transition-colors"
              >
                Generar Datos Reales
              </button>
            </div>
          )}

          {step === 'review' && reviewData && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <h3 className="text-xl font-black uppercase text-[#D4AF37]">Datos validados</h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Estos son los únicos datos reales encontrados en la plataforma WLSPORTS.</p>
                <textarea 
                  className="w-full h-[50vh] bg-black p-4 rounded-2xl font-mono text-zinc-300 text-sm border border-zinc-700 outline-none focus:border-[#D4AF37] transition-all resize-none"
                  value={reviewText}
                  readOnly
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setStep('config')}
                  className="flex-1 bg-zinc-800 text-white font-black uppercase py-4 rounded-xl tracking-widest hover:bg-zinc-700 transition-colors"
                >
                  Regresar
                </button>
                <button 
                  onClick={buildPrompt}
                  className="flex-1 bg-[#D4AF37] text-black font-black uppercase py-4 rounded-xl tracking-widest hover:bg-yellow-500 transition-colors flex justify-center items-center gap-2"
                >
                  Generar Prompt Visual <CheckCircle2 size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 'prompt' && (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
              <h3 className="text-xl font-black uppercase text-[#D4AF37]">Prompt Visual Generado</h3>
              <p className="text-xs text-zinc-400">Copia este texto y pégalo en tu IA visual.</p>
              
              <div className="bg-black border border-zinc-700 p-6 rounded-2xl relative group">
                <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap overflow-y-auto max-h-[50vh] leading-relaxed">
                  {generatedPrompt}
                </pre>
                
                <button 
                  onClick={copyPrompt}
                  className="absolute top-4 right-4 bg-[#D4AF37] text-black p-3 rounded-xl shadow-lg flex items-center gap-2 font-black text-xs uppercase hover:scale-105 active:scale-95 transition-all"
                >
                  <Copy size={16} /> Copiar Prompt
                </button>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => { setActiveFlow('none'); setStep('config'); }}
                  className="flex-1 bg-zinc-800 text-white font-black uppercase py-4 rounded-xl tracking-widest hover:bg-zinc-700 transition-colors"
                >
                  Finalizar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
