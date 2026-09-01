import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Trophy, Copy, CheckCircle2, FileText, Award, UserSquare } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getLevelFromXP, LEVELS } from '../constants';

interface ReportesWLSportsScreenProps {
  userId: string;
  athlete: any;
  onBack: () => void;
  trainerId?: string | null;
}

export const ReportesWLSportsScreen: React.FC<ReportesWLSportsScreenProps> = ({ userId, athlete, onBack, trainerId }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [trainingPlans, setTrainingPlans] = useState<any[]>([]);
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
      
      const plansQ = query(collection(db, 'trainingPlans'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const plansSnap = await getDocs(plansQ);
      setTrainingPlans(plansSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
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
        nationality: cleanUndefined(athlete.nationality || athlete.initialEvaluation?.profile?.nationality || athlete.profile?.nationality, 'text'),
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
    let stagePlansList: any[] = [];
    
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
      stagePlansList = trainingPlans.filter(p => {
        const d = getRealDate(p);
        return d && d >= stageStart;
      });
    } else {
      stagePlansList = [...trainingPlans];
    }

    // Remove duplicates
    stageSessionsList = stageSessionsList.filter((s, index, self) => index === self.findIndex((t) => t.id === s.id));
    stageWorkoutsList = stageWorkoutsList.filter((w, index, self) => index === self.findIndex((t) => t.id === w.id));
    stagePlansList = stagePlansList.filter((p, index, self) => index === self.findIndex((t) => t.id === p.id));

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
        nationality: cleanUndefined(athlete.nationality || athlete.initialEvaluation?.profile?.nationality || athlete.profile?.nationality, 'text'),
        category: cleanUndefined(athlete.category || athlete.initialEvaluation?.profile?.category || athlete.profile?.category, 'text'),
        position: cleanUndefined(athlete.position || athlete.initialEvaluation?.profile?.position || athlete.profile?.position, 'text'),
        sport: cleanUndefined(athlete.sport || athlete.deporte || athlete.initialEvaluation?.profile?.sport || athlete.profile?.sport, 'text'),
        profile: cleanUndefined(athlete.dominantSide || athlete.perfil || athlete.initialEvaluation?.profile?.laterality || athlete.profile?.laterality, 'text'),
      },
      previousLevel: (() => {
        const idx = LEVELS.findIndex(l => l.name.toUpperCase() === selectedLevel.toUpperCase());
        return idx > 0 ? LEVELS[idx - 1].name : "Ninguno";
      })(), 
      newLevel: selectedLevel,
      unlockedDate: new Date().toLocaleDateString('es-ES'),
      endingXP: cleanUndefined(athlete.xp, 'text'),
      stageDuration: hasStageStart && stageStart ? `${Math.max(1, Math.round((new Date().getTime() - stageStart.getTime()) / (1000 * 3600 * 24)))} días` : 'No registrado',
      sessions: hasStageStart ? stageSessionsList.length : 'No registrado',
      compliance: hasStageStart ? stageCompliance : 'No registrado',
      xpEarned: hasStageStart ? stageXpEarned : 'No registrado',
      medals: (athlete.medals || []).length > 0 ? (athlete.medals || []).length : 'No registrado',
      challengesCompleted: (athlete.challengesCompleted || []).length > 0 ? (athlete.challengesCompleted || []).length : 'No registrado',
      levelObjectiveGen: cleanUndefined(athlete.levelObjectiveGen, 'text'),
      levelObjectiveSpec: cleanUndefined(athlete.levelObjectiveSpec, 'text'),
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
      levelDescription: 'No registrada',
      plans: stagePlansList.map(p => ({
        title: p.title || 'Plan sin título',
        generalObjective: p.generalObjective || p.objective || 'Sin objetivo general',
        specificObjectives: p.specificObjectives || 'No registrado',
        startDate: p.startDate || 'No registrada',
        endDate: p.endDate || 'No registrada',
      }))
    };
    setReviewData(data);
    setReviewText(JSON.stringify(data, null, 2));
    setStep('review');
  };

  const handleGenerateTarjeta = () => {
    const currentLevelName = getLevelFromXP(athlete.xp || 0).name;
    const currentLevelIdx = LEVELS.findIndex(l => l.name.toUpperCase() === currentLevelName.toUpperCase());
    const previousLevelName = currentLevelIdx > 0 ? LEVELS[currentLevelIdx - 1].name : "Ninguno";

    const data = {
      title: `Tarjeta WLSPORTS - ${athlete.displayName || 'Atleta'}`,
      type: 'tarjeta',
      athlete: {
        name: cleanUndefined(athlete.displayName, 'text'),
        age: cleanUndefined(athlete.age || athlete.initialEvaluation?.profile?.age || athlete.profile?.age, 'text'),
        nationality: cleanUndefined(athlete.nationality || athlete.initialEvaluation?.profile?.nationality || athlete.profile?.nationality, 'text'),
        category: cleanUndefined(athlete.category || athlete.initialEvaluation?.profile?.category || athlete.profile?.category, 'text'),
        position: cleanUndefined(athlete.position || athlete.initialEvaluation?.profile?.position || athlete.profile?.position, 'text'),
        sport: cleanUndefined(athlete.sport || athlete.deporte || athlete.initialEvaluation?.profile?.sport || athlete.profile?.sport, 'text'),
        profile: cleanUndefined(athlete.dominantSide || athlete.perfil || athlete.initialEvaluation?.profile?.laterality || athlete.profile?.laterality, 'text'),
      },
      currentLevel: cleanUndefined(currentLevelName, 'text'),
      previousLevel: cleanUndefined(previousLevelName, 'text'),
      currentXP: cleanUndefined(athlete.xp || 0, 'text'),
      overallRating: cleanUndefined(athlete.ovr, 'visual'),
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
      prompt += `==============================================\nPROMPT VISUAL WLSPORTS — REPORTE DE ASCENSO DE NIVEL\n==============================================\n\n`;
      prompt += `Diseñar un reporte visual, épico, premium y limpio con los siguientes elementos OBLIGATORIOS:\n`;
      prompt += `- FOTO DEL ATLETA (Solicitar imagen antes de diseñar si es necesario)\n`;
      prompt += `- LOGO WLSPORTS\n\n`;

      prompt += `DATOS PRINCIPALES:\n`;
      prompt += `ATLETA: ${parsedData.athlete.name}\n`;
      prompt += `ASCENSO: ${parsedData.previousLevel} ➔ ${parsedData.newLevel}\n`;
      prompt += `FECHA DE DESBLOQUEO: ${parsedData.unlockedDate}\n`;
      prompt += `XP ALCANZADA: ${parsedData.endingXP} XP\n\n`;
      
      prompt += `DATOS DE LA ETAPA (Si algún dato es "No registrado", OMITIRLO visualmente del reporte, no dejar el espacio vacío ni inventarlo):\n`;
      if (parsedData.stageDuration !== 'No registrado') prompt += `- Duración de la etapa: ${parsedData.stageDuration}\n`;
      if (parsedData.sessions !== 'No registrado') prompt += `- Sesiones realizadas: ${parsedData.sessions}\n`;
      if (parsedData.compliance !== 'No registrado') prompt += `- Cumplimiento: ${parsedData.compliance}${typeof parsedData.compliance === 'number' ? '%' : ''}\n`;
      if (parsedData.xpEarned !== 'No registrado') prompt += `- XP obtenida durante la etapa: ${parsedData.xpEarned}\n`;
      if (parsedData.medals !== 'No registrado') prompt += `- Medallas obtenidas: ${parsedData.medals}\n`;
      if (parsedData.challengesCompleted !== 'No registrado') prompt += `- Desafíos completados: ${parsedData.challengesCompleted}\n`;
      prompt += `\n`;
      
      prompt += `ATRIBUTOS Y VALORES ACTUALES:\n`;
      prompt += `⚽ TEC: ${athlete.attributes?.TEC || athlete.attributes?.tecnica || 10}\n`;
      prompt += `💪 FIS: ${athlete.attributes?.FIS || athlete.attributes?.fuerza || 10}\n`;
      prompt += `🧠 NEU: ${athlete.attributes?.NEU || athlete.attributes?.neuro || 10}\n`;
      prompt += `🤸 AGI: ${athlete.attributes?.AGI || athlete.attributes?.ritmo || 10}\n`;
      prompt += `🔥 ACT: ${athlete.attributes?.ACT || athlete.attributes?.mentalidad || 10}\n\n`;
      
      const hasMedals = parsedData.medals !== 'No registrado' && parsedData.medals > 0;
      const hasChallenges = parsedData.challengesCompleted !== 'No registrado' && parsedData.challengesCompleted > 0;
      const hasAchievements = parsedData.stageAchievements && parsedData.stageAchievements !== 'Pendiente de evaluación' && parsedData.stageAchievements !== 'No registrado';
      
      if (hasMedals || hasChallenges || hasAchievements) {
        prompt += `LOGROS DESBLOQUEADOS (Crear una sección visual atractiva para esto):\n`;
        if (hasMedals) prompt += `- Medallas obtenidas: ${parsedData.medals}\n`;
        if (hasChallenges) prompt += `- Desafíos completados: ${parsedData.challengesCompleted}\n`;
        if (hasAchievements) prompt += `- Logros adicionales:\n${parsedData.stageAchievements}\n`;
        prompt += `\n`;
      }
      
      if (parsedData.levelObjectiveGen && parsedData.levelObjectiveGen !== 'No registrado' && parsedData.levelObjectiveGen.trim() !== '') {
        prompt += `OBJETIVO DE NIVEL (GENERAL):\n"${parsedData.levelObjectiveGen}"\n\n`;
      }
      if (parsedData.levelObjectiveSpec && parsedData.levelObjectiveSpec !== 'No registrado' && parsedData.levelObjectiveSpec.trim() !== '') {
        prompt += `OBJETIVOS ESPECÍFICOS:\n${parsedData.levelObjectiveSpec}\n\n`;
      }

      if (parsedData.plans && parsedData.plans.length > 0) {
        prompt += `PLANES DE ENTRENAMIENTO TRABAJADOS (MACROCICLOS/MESOCICLOS):\n`;
        parsedData.plans.forEach((p: any) => {
          prompt += `- ${p.title}\n`;
          if (p.generalObjective && p.generalObjective !== 'Sin objetivo general') {
            prompt += `  Objetivo: ${p.generalObjective}\n`;
          }
        });
        prompt += `\n`;
      }

      prompt += `MENSAJE MOTIVACIONAL:\n`;
      const messages = [
        "El esfuerzo de hoy es el triunfo de mañana. ¡Felicidades por subir de nivel!",
        "Has demostrado consistencia y disciplina. Sigue elevando tus estándares.",
        "Un nuevo nivel desbloqueado, nuevas metas por alcanzar. ¡Adelante!",
        "Tu compromiso habla por sí solo. Celebra este paso y ve por más."
      ];
      prompt += `"${messages[Math.floor(Math.random() * messages.length)]}"\n\n`;
      
      prompt += `INSTRUCCIONES VISUALES:\n`;
      prompt += `- ESTÉTICA: Épica, celebratoria, premium, deportiva y profesional. Destacar visualmente el Ascenso (Nivel anterior -> Nuevo nivel).\n`;
      prompt += `- FOTOGRAFÍAS Y LOGO: Asegurar jerarquía para el logo WLSPORTS y la foto del atleta.\n`;
      prompt += `- OMITIR SI NO EXISTEN: Si un dato de la etapa no está disponible o es 0/vacío, omítelo completamente. No dejes espacios vacíos ni muestres 'No registrado'.\n`;

    } else if (parsedData.type === 'tarjeta') {
      prompt += `==============================================\nPROMPT MAESTRO DEFINITIVO — TARJETA DEPORTIVA WLSPORTS\n==============================================\n\n`;
      prompt += `Crea una TARJETA DEPORTIVA COLECCIONABLE PREMIUM WLSPORTS utilizando EXCLUSIVAMENTE los datos proporcionados por el sistema y los archivos reales proporcionados por el usuario.\n\n`;
      
      prompt += `============================================================\n1. ESTRUCTURA VISUAL (ESTILO EA SPORTS / FIFA ULTIMATE TEAM)\n============================================================\n\n`;
      prompt += `DISEÑO OBLIGATORIO:\n`;
      prompt += `- FOTOGRAFÍA: Centrada y prominente. Estilo recorte (sin fondo, tipo EA SPORTS / FIFA). El atleta es el absoluto héroe visual de la tarjeta.\n`;
      prompt += `- LOGO, XP y BANDERA: Deben estar perfectamente ALINEADOS entre sí (ej. en una columna en la esquina superior). El Logo WLSports debe ser pequeño; justo debajo el XP ACTUAL en tamaño sutil, y debajo la BANDERA de nacionalidad correspondiente a "${parsedData.athlete.nationality}".\n`;
      prompt += `- NOMBRE DEL ATLETA: Ubicado aproximadamente en la zona central, en una única línea, con tipografía fuerte y destacada.\n`;
      prompt += `- ESCALA DE MAESTRÍA (ASCENSO): Justo debajo del nombre. Texto a incluir: "ASCENSO: ${parsedData.previousLevel} ➔ ${parsedData.currentLevel}".\n`;
      prompt += `  -> MUY IMPORTANTE: El NUEVO NIVEL (${parsedData.currentLevel}) debe tener un EFECTO VISUAL ESPECIAL (ej. brillo, resplandor, destello dorado, neón o glow en las letras) para que resalte épicamente sobre el nivel anterior.\n`;
      prompt += `- ATRIBUTOS: Ubicados en la zona inferior de la tarjeta, organizados visualmente (ej. en columnas o cuadrícula tipo Ultimate Team).\n`;
      prompt += `- DATOS DEL DEPORTISTA: En texto decididamente más pequeño, la Edad, Deporte, Categoría, Perfil y Posición DEBEN ir en UNA SOLA LÍNEA (separados por un punto o pleca, ej: 25 AÑOS • FÚTBOL • ELITE • DIESTRO • DELANTERO) ubicados estratégicamente como información secundaria en la base o centro de la tarjeta.\n\n`;

      prompt += `============================================================\n2. REGLAS ESTRICTAS DE CONTENIDO\n============================================================\n\n`;
      prompt += `PROHIBIDO INCLUIR:\n`;
      prompt += `- NO incluir códigos ID (como WLSPORTS ID).\n`;
      prompt += `- NO incluir ningún tipo de mensaje motivacional.\n`;
      prompt += `- NO incluir mensajes del coach.\n`;
      prompt += `- NO inventar estadísticas, porcentajes, atributos o cualquier otro dato.\n\n`;

      prompt += `============================================================\n3. DATOS DEL ATLETA A INCLUIR\n============================================================\n\n`;
      prompt += `NOMBRE: ${parsedData.athlete.name}\n`;
      prompt += `EDAD: ${parsedData.athlete.age}\n`;
      prompt += `BANDERA (SIN TEXTO): Muestra SOLO el gráfico/emoji de la bandera de ${parsedData.athlete.nationality} (omite por completo escribir el nombre del país).\n`;
      prompt += `DEPORTE: ${parsedData.athlete.sport}\n`;
      prompt += `CATEGORÍA: ${parsedData.athlete.category}\n`;
      prompt += `POSICIÓN: ${parsedData.athlete.position}\n`;
      prompt += `XP ACTUAL: ${parsedData.currentXP}\n`;
      prompt += `RATING GENERAL (OVR): ${parsedData.overallRating} (mostrar solo si no es "—")\n\n`;
      
      
      let perfilNeutral = parsedData.athlete.profile;
      if (perfilNeutral?.toLowerCase() === 'derecha' || perfilNeutral?.toLowerCase() === 'derecho') {
        perfilNeutral = 'Derecho(a) / Diestro(a)';
      } else if (perfilNeutral?.toLowerCase() === 'izquierda' || perfilNeutral?.toLowerCase() === 'izquierdo') {
        perfilNeutral = 'Izquierdo(a) / Zurdo(a)';
      } else if (perfilNeutral?.toLowerCase() === 'mixta' || perfilNeutral?.toLowerCase() === 'mixto' || perfilNeutral?.toLowerCase() === 'ambidiestro') {
        perfilNeutral = 'Ambidiestro(a)';
      }

      prompt += `PERFIL / LATERALIDAD: ${perfilNeutral}\n`;
      prompt += `- INSTRUCCIÓN: Adapta el término gramatical al género del atleta (ej: usa "Zurdo", "Izquierdo" o "Derecho" si es hombre; "Zurda", "Izquierda" o "Derecha" si es mujer).\n\n`;

      prompt += `============================================================\n4. ATRIBUTOS (ZONA INFERIOR)\n============================================================\n\n`;
      prompt += `⚽ TEC (Técnica): ${parsedData.attributes.TEC}\n`;
      prompt += `💪 FIS (Físico): ${parsedData.attributes.FIS}\n`;
      prompt += `🧠 NEU (Neurocognitivo): ${parsedData.attributes.NEU}\n`;
      prompt += `🤸 AGI (Agilidad): ${parsedData.attributes.AGI}\n`;
      prompt += `🔥 ACT (Actitud): ${parsedData.attributes.ACT}\n\n`;
      prompt += `SI EL ATRIBUTO ES "—": omitir visualmente o mostrar de manera neutra. NO convertir a 0%.\n\n`;

      prompt += `============================================================\n5. IDENTIDAD VISUAL WLSPORTS\n============================================================\n\n`;
      prompt += `MARCA: WLSPORTS\n`;
      prompt += `PALETA OFICIAL: NEGRO, GRAFITO, DORADO METÁLICO, VERDE NEÓN, BLANCO\n`;
      prompt += `ESTÉTICA: Deportiva, exactamente con los mismos colores y estilo de EA SPORTS / FIFA Ultimate Team. Coleccionable. Contraste elevado.\n`;
      prompt += `FORMATO DE SALIDA (IMPRESCINDIBLE): Proporción de aspecto ESTRICTAMENTE 5:8 (Vertical).\n`;
      prompt += `MARGEN DE IMPRESIÓN (IMPRESCINDIBLE): Asegúrate de dejar un margen negro sólido de 5 milímetros (o el equivalente proporcional) en TODOS los bordes (arriba, abajo, izquierda, derecha) completamente libre de textos, logos, y sin que la cara del atleta toque los bordes. Esto es para que al recortar el carnet físico no se dañe el diseño.\n`;
      prompt += `DATOS A SOLICITAR: Fotografía (SOLICITAR FOTOGRAFÍA AL USUARIO), Logo (SOLICITAR LOGO AL USUARIO), y OVR (SOLICITAR EL NIVEL DE OVR AL USUARIO antes de generar la imagen si no se especificó o si quiere cambiarlo).\n`;    }

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
