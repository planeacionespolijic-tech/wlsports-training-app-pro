import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';

export interface AnalysisResult {
  status: 'Progresando' | 'Estancado' | 'Sobreentrenado' | 'Recuperación';
  riskLevel: 'Bajo' | 'Medio' | 'Alto';
  recommendations: string[];
  metrics: {
    chronicLoad: number;
    acuteLoad: number;
    ratio: number;
  };
}

export interface BiometricAnalysis {
  label: string;
  state: string;
  sessionImpact: string;
  tone: 'gamified' | 'professional' | 'wellness';
}

export interface ChallengeCard {
  title: string;
  description: string;
  userBuff: string;
  coachHandicap: string;
  suggestedPenalty: string;
}

/**
 * SISTEMA GAME MASTER DE DESAFÍOS
 */
export const generateChallenge = async (userId: string): Promise<ChallengeCard> => {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    const userData = userSnap?.data();
    const birthDate = userData?.birthDate ? new Date(userData.birthDate) : new Date();
    const age = new Date().getFullYear() - birthDate.getFullYear();
    const profile = userData?.profile || 'bienestar';

    const challenges = [
      { title: 'El Travesaño', description: 'Golpear el poste o travesaño desde la distancia acordada.' },
      { title: 'Bowling Humano', description: 'Derribar 5 conos con el balón rodando en el menor tiempo.' },
      { title: 'Slalom Ciego', description: 'Completar circuito de conos siguiendo solo la voz del compañero.' },
      { title: 'Reacción de Colores', description: 'Tocar el cono del color indicado en menos de 1 seg.' },
      { title: 'Puntería Láser', description: 'Meter el balón en un objetivo pequeño o aro.' },
      { title: 'Duelo de Toques', description: 'Mantener el balón en el aire sin usar las manos.' },
    ];

    const coachHandicaps = [
      { name: 'Pata de palo', desc: 'Solo puedes usar tu pierna no hábil.' },
      { name: 'El Pirata', desc: 'Debes cerrar un ojo durante todo el reto.' },
      { name: 'Ancla de plomo', desc: 'Debes tener una mano tocando tu espalda siempre.' },
      { name: 'Estatua de sal', desc: 'No puedes mover los pies del sitio una vez empiece el gesto.' },
      { name: 'Mano en espalda', desc: 'Ambas manos entrelazadas detrás de la espalda.' },
    ];

    const userBuffs = [
      { name: 'Doble vida', desc: 'Tienes 2 intentos por cada 1 del coach.' },
      { name: 'Arco gigante', desc: 'Tu objetivo es notablemente más grande.' },
      { name: 'Punto de oro', desc: 'Tu acierto vale triple en el marcador.' },
      { name: 'Zona VIP', desc: 'Puedes realizar el reto desde 3 metros más cerca.' },
      { name: 'Escudo de tiempo', desc: 'Tienes 10 segundos extra de margen.' },
    ];

    const penalties = [
      'hace 10 saltos de rana',
      'recoge todo el material del campo',
      'invita el hidratante al final de la sesión',
      'hace un baile gracioso de 15 segundos',
      'hace 5 burpees explosivos',
      'carga los balones hasta el depósito'
    ];

    const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

    const challenge = random(challenges);
    let userBuff = "Duelo Puro (Sin Ventajas)";
    let coachHandicap = "Duelo Puro (Sin Hándicap)";

    // Lógica de Equilibrado
    if (age >= 6 && age <= 11) {
      // Máxima ventaja
      const b = random(userBuffs);
      const h = random(coachHandicaps);
      userBuff = `${b.name}: ${b.desc}`;
      coachHandicap = `${h.name}: ${h.desc}`;
    } else if (profile !== 'pro') {
      // Ventaja media (Solo hándicap coach)
      const h = random(coachHandicaps);
      coachHandicap = `${h.name}: ${h.desc}`;
    }

    return {
      title: challenge.title,
      description: challenge.description,
      userBuff,
      coachHandicap,
      suggestedPenalty: random(penalties),
    };
  } catch (error) {
    console.error("Challenge gen error:", error);
    return {
      title: "Duelo de Titanes",
      description: "Supera al coach en una prueba de habilidad técnica.",
      userBuff: "Duelo Estándar",
      coachHandicap: "Duelo Estándar",
      suggestedPenalty: "10 saltos/flexiones"
    };
  }
};

/**
 * MÓDULO DE INTELIGENCIA BIOMÉTRICA UNIVERSAL
 */
export const analyzeBiometrics = async (
  userId: string, 
  data: { weight: number; height: number; bodyFat: number; vo2max?: number; muscleMass?: number; hrRest?: number }
): Promise<BiometricAnalysis[]> => {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return [];
    
    const userData = userSnap.data();
    const birthDate = userData.birthDate ? new Date(userData.birthDate) : new Date();
    const age = new Date().getFullYear() - birthDate.getFullYear();
    const profile = userData.profile || 'bienestar';

    // Fetch previous assessment for growth/trends
    const prevQ = query(
      collection(db, 'assessments'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(2)
    );
    const prevSnap = await getDocs(prevQ);
    const assessments = prevSnap.docs.map(d => d.data());
    const prevHeight = assessments.length > 1 ? assessments[1].height : null;

    // Fetch latest long jump for Kids RPI
    let latestLongJump = 0;
    if (age <= 13) {
      const jumpQ = query(
        collection(db, 'tests'),
        where('userId', '==', userId),
        where('name', '==', 'Salto Largo Sin Impulso'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const jumpSnap = await getDocs(jumpQ);
      if (!jumpSnap.empty) latestLongJump = jumpSnap.docs[0].data().value;
    }

    const analyses: BiometricAnalysis[] = [];

    // --- SECCIÓN A: NIÑOS (6-13 años) ---
    if (age >= 6 && age <= 13) {
      // Cálculo RPI
      if (latestLongJump > 0) {
        const rpi = (latestLongJump / data.weight).toFixed(2);
        analyses.push({
          label: `Índice de Potencia Relativa: ${rpi}`,
          state: parseFloat(rpi) > 4 ? "Motor Vikingo Activo" : "Nivel de Energía en Carga",
          sessionImpact: "Debido a tu potencia relativa, ajustaremos el momento [M3] (Plyos) para maximizar el despegue.",
          tone: 'gamified'
        });
      }

      // Alerta de Crecimiento
      if (prevHeight && (data.height - prevHeight) > 1.5) {
        analyses.push({
          label: `Crecimiento Acelerado (+${(data.height - prevHeight).toFixed(1)}cm)`,
          state: "Fase de Estiramiento Óseo",
          sessionImpact: "Debido al crecimiento rápido, ajustaremos el momento [M4] (Impacto) reduciendo saltos reactivos para proteger cartílagos.",
          tone: 'gamified'
        });
      }
    } 

    // --- SECCIÓN B: ADULTOS DEPORTISTAS (14-35 años) ---
    else if (age >= 14 && age <= 35 && profile === 'deportista') {
      if (data.vo2max) {
        analyses.push({
          label: `Consumo de Oxígeno (VO2 Máx): ${data.vo2max}`,
          state: data.vo2max > 50 ? "Alta Eficiencia Metabólica" : "Capacidad Aeróbica en Desarrollo",
          sessionImpact: `Debido a tu VO2 Máx, ajustaremos el momento [M2] (Metabólico) trabajando en el umbral de fatiga específico del deporte.`,
          tone: 'professional'
        });
      }

      const fatStatus = data.bodyFat < 12 ? "Composición de Élite" : "Mejorable para Potencia-Peso";
      analyses.push({
        label: `% Grasa Corporal: ${data.bodyFat}%`,
        state: fatStatus,
        sessionImpact: "Debido a tu composición, el momento [M3] tendrá un volumen compensatorio para optimizar la densidad de entrenamiento.",
        tone: 'professional'
      });
    }

    // --- SECCIÓN C: SALUD Y LONGEVIDAD (+36 años) ---
    else if (age >= 36) {
      const muscleStatus = (data.muscleMass || 0) > (data.weight * 0.4) ? "Protección Activa" : "Riesgo de Sarcopenia detectable";
      analyses.push({
        label: `Masa Muscular: ${data.muscleMass || 0}kg`,
        state: muscleStatus,
        sessionImpact: `Debido a tu masa muscular, el momento [M3] (Fuerza) será la prioridad absoluta para asegurar tu vitalidad funcional.`,
        tone: 'wellness'
      });

      if (data.hrRest) {
        analyses.push({
          label: `Recuperación Cardíaca (Reposo): ${data.hrRest} BPM`,
          state: data.hrRest < 70 ? "Corazón Fuerte y Eficiente" : "Necesidad de Estímulo Vagal",
          sessionImpact: "Debido a tu FC, ajustaremos el momento [M5] (Vuelta a la calma) con técnicas de respiración para bajar el cortisol.",
          tone: 'wellness'
        });
      }
    }

    return analyses;
  } catch (error) {
    console.error("Biometric analysis error:", error);
    return [];
  }
};

/**
 * MOTOR DE INTELIGENCIA DEPORTIVA ELITE
 * Analiza datos multivariables para toma de decisiones automática.
 */
export const analyzeProgress = async (userId: string): Promise<AnalysisResult | null> => {
  if (!userId) return null;
  try {
    // 1. Obtener perfil para determinar lógica (Adulto vs Niño)
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (!userSnap.exists()) return null;
    const userData = userSnap.data();
    const isChild = userData.type === 'child';

    // 2. Obtener Historial Reciente (Carga Aguda: 7 días) y Crónica (28 días)
    const historyQ = query(
      collection(db, 'history'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const historySnap = await getDocs(historyQ);
    const history = historySnap.docs.map(doc => doc.data());

    // 3. Cálculo de Carga (Volumen x RPE)
    const calculateLoad = (sessions: any[]) => {
      return sessions.reduce((acc, s) => {
        const rpe = s.workoutDetails?.rpe || 5;
        const volume = s.workoutDetails?.totalVolume || 1; // Simplificado
        return acc + (rpe * volume);
      }, 0);
    };

    const acuteLoad = calculateLoad(history.slice(0, 4)); // Últimas 4 sesiones (~1 semana)
    const chronicLoad = calculateLoad(history) / 4; // Promedio semanal de 4 semanas
    const ratio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1;

    // 4. Lógica de Recomendaciones
    let recommendations: string[] = [];
    let status = 'Progresando' as AnalysisResult['status'];
    let riskLevel: AnalysisResult['riskLevel'] = 'Bajo';

    // 4.1. Incorporar datos de la Evaluación Inicial
    if (userData.initialEvaluation?.flags) {
      const evaluationFlags = userData.initialEvaluation.flags;
      if (evaluationFlags.includes('Rigidez de cadera')) {
        recommendations.push('Basado en tu evaluación inicial: Mantén foco en movilidad de cadera.');
      }
      if (evaluationFlags.includes('Impacto elevado')) {
        recommendations.push('Basado en tu evaluación inicial: Selecciona calzado con buena amortiguación.');
      }
    }

    // 4.2. Incorporar datos de Zonas Cardíacas
    if (userData.hrZones && userData.hrZones.length > 0) {
      const z2 = userData.hrZones[1]; // Quema de Grasa
      const z4 = userData.hrZones[3]; // Anaeróbica
      
      if (ratio < 0.8) {
        status = 'Recuperación';
      }
      
      if (status === 'Recuperación') {
        recommendations.push(`Para hoy, mantente estrictamente en Zona 1 o 2 (BPM: < ${z2.max}). No busques records.`);
      } else if (status === 'Progresando' && ratio < 1.2) {
        recommendations.push(`Estado óptimo para intensidad. Intenta registrar 15min en Zona 4 (BPM: > ${z4.min}).`);
      }
      
      // Chequeo de última sesión vs zonas
      if (history.length > 0) {
        const lastSession = history[0];
        const lastHR = lastSession.workoutDetails?.avgHR || 0;
        if (lastHR > 0) {
          if (lastHR > z4.max) {
            recommendations.push('En tu última sesión superaste tu zona anaeróbica por mucho. Vigila tu fatiga central.');
          } else if (lastHR < z2.min && lastSession.workoutDetails?.rpe > 7) {
            recommendations.push('Discrepancia detectada: RPE alto pero FC baja. Podría ser fatiga acumulada.');
          }
        }
      }
    }

    // Análisis de Ratio de Carga (ACWR - Acute:Chronic Workload Ratio)
    if (ratio > 1.5) {
      status = 'Sobreentrenado';
      riskLevel = 'Alto';
      recommendations.push('¡ALERTA! Incremento de carga demasiado rápido. Riesgo de lesión elevado.');
      recommendations.push('Se recomienda reducir la intensidad un 30% en la próxima sesión.');
    } else if (ratio < 0.8) {
      status = 'Recuperación';
      recommendations.push('Carga de entrenamiento baja. Ideal para fase de recuperación o descarga.');
    }

    // 5. Lógica Específica para Niños (Enfoque Motriz)
    if (isChild) {
      const motorQ = query(
        collection(db, 'motorEvaluations'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(2)
      );
      const motorSnap = await getDocs(motorQ);
      if (motorSnap.size >= 2) {
        const current = motorSnap.docs[0].data();
        const prev = motorSnap.docs[1].data();
        if (current.coordination < prev.coordination) {
          recommendations.push('Sugerencia: Reforzar juegos de coordinación óculo-manual en el calentamiento.');
        }
      }
    }

    // 6. Análisis de Estancamiento (Tests) - Simplificado para evitar automatización invasiva
    const testsQ = query(
      collection(db, 'tests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(2)
    );
    const testsSnap = await getDocs(testsQ);
    if (testsSnap.size >= 2) {
      const current = testsSnap.docs[0].data();
      const prev = testsSnap.docs[1].data();
      if (current.value === prev.value) {
        status = 'Estancado';
        recommendations.push('Rendimiento mesetario detectado en pruebas recientes. Considera variar el estímulo.');
      }
    }

    return {
      status,
      riskLevel,
      recommendations,
      metrics: {
        acuteLoad,
        chronicLoad,
        ratio
      }
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'intelligence-analysis');
    return null;
  }
};

/**
 * SISTEMA DE PROGRESIÓN AUTOMÁTICA
 * Sugiere ajustes de carga basados en el rendimiento histórico.
 */
export const suggestProgression = async (userId: string, currentWorkout: any): Promise<any> => {
  try {
    const historyQ = query(
      collection(db, 'history'),
      where('userId', '==', userId),
      where('workoutId', '==', currentWorkout.id),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const historySnap = await getDocs(historyQ);
    const history = historySnap.docs.map(doc => doc.data());

    if (history.length < 2) return currentWorkout;

    // Si las últimas 2 sesiones el RPE fue < 6, sugerir aumento
    const avgRpe = history.reduce((acc, s) => acc + (s.workoutDetails?.rpe || 5), 0) / history.length;
    
    if (avgRpe < 6) {
      if (currentWorkout.blocks && currentWorkout.blocks.length > 0) {
        const updatedBlocks = currentWorkout.blocks.map((block: any) => {
          if (block.type === 'circuit' && block.circuit) {
            return {
              ...block,
              circuit: {
                ...block.circuit,
                rounds: block.circuit.rounds + 1,
                note: 'Aumento automático de rondas por baja intensidad'
              }
            };
          } else if (block.exercises) {
            return {
              ...block,
              exercises: block.exercises.map((ex: any) => {
                const currentReps = parseInt(ex.reps) || 0;
                if (currentReps > 0) {
                  return { ...ex, reps: (currentReps + 2).toString(), note: 'Aumento automático por baja intensidad' };
                }
                return ex;
              })
            };
          }
          return block;
        });
        return { ...currentWorkout, blocks: updatedBlocks, autoAdjusted: true };
      } else if (currentWorkout.exercises) {
        const updatedExercises = currentWorkout.exercises.map((ex: any) => {
          const currentReps = parseInt(ex.reps) || 0;
          if (currentReps > 0) {
            return { ...ex, reps: (currentReps + 2).toString(), note: 'Aumento automático por baja intensidad' };
          }
          return ex;
        });
        return { ...currentWorkout, exercises: updatedExercises, autoAdjusted: true };
      }
    }

    return currentWorkout;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'progression-suggestion');
    return currentWorkout;
  }
};
