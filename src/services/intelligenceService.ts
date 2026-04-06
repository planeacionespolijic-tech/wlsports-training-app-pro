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
    let status: AnalysisResult['status'] = 'Progresando';
    let riskLevel: AnalysisResult['riskLevel'] = 'Bajo';

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

    // 6. Análisis de Estancamiento (Tests)
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
        recommendations.push('Rendimiento mesetario. Es momento de introducir variabilidad en los ejercicios.');
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
