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
  id?: number;
  title: string;
  description: string;
  userBuff?: string;
  coachHandicap?: string;
  suggestedPenalty?: string;
  category?: 'nerf' | 'buff' | 'duelo' | 'torneo';
}

/**
 * SISTEMA GAME MASTER DE DESAFÍOS - POOL DE TARJETAS
 */
export const ALL_CHALLENGES: ChallengeCard[] = [
  // 1-50 (Existing or placeholder for the first 50)
  { id: 1, title: 'El Travesaño', description: 'Golpear el poste o travesaño desde la distancia acordada.', category: 'duelo' },
  { id: 2, title: 'Bowling Humano', description: 'Derribar 5 conos con el balón rodando en el menor tiempo.', category: 'duelo' },
  { id: 3, title: 'Slalom Ciego', description: 'Completar circuito de conos siguiendo solo la voz del compañero.', category: 'duelo' },
  { id: 4, title: 'Reacción de Colores', description: 'Tocar el cono del color indicado en menos de 1 seg.', category: 'duelo' },
  { id: 5, title: 'Puntería Láser', description: 'Meter el balón en un objetivo pequeño o aro.', category: 'duelo' },
  { id: 6, title: 'Duelo de Toques', description: 'Mantener el balón en el aire sin usar las manos.', category: 'duelo' },

  // 51-65: TARJETAS DE NERF (Hándicap Coach)
  { id: 51, title: 'Ancla Humana', description: 'Coach con Cinturón Pro anclado a poste con tensión.', category: 'nerf' },
  { id: 52, title: 'Visión de Túnel', description: 'Tapar un ojo para perder profundidad.', category: 'nerf' },
  { id: 53, title: 'Pierna de Cristal', description: 'Prohibido usar pierna dominante.', category: 'nerf' },
  { id: 54, title: 'El Escudero', description: 'Sostener Disco de 5kg o Caja con brazos extendidos.', category: 'nerf' },
  { id: 55, title: 'Sin Salto', description: 'Prohibido despegar ambos pies del suelo (No correr/saltar).', category: 'nerf' },
  { id: 56, title: 'Mano en Espalda', description: 'Manos entrelazadas atrás durante todo el reto.', category: 'nerf' },
  { id: 57, title: 'Estatua de Sal', description: 'Al silbato, el Coach se congela 3s; el alumno sigue.', category: 'nerf' },
  { id: 58, title: 'Balón Pesado', description: 'Coach usa Kettlebell o MedBall en manos; alumno usa balón.', category: 'nerf' },
  { id: 59, title: 'Respiración Yoga', description: 'Solo inhalar/exhalar por la nariz en el duelo.', category: 'nerf' },
  { id: 60, title: 'El Pirata', description: 'Coach se desplaza saltando en un solo pie.', category: 'nerf' },
  { id: 61, title: 'Carga Extra', description: 'Coach usa morral con peso durante el circuito.', category: 'nerf' },
  { id: 62, title: 'Toque Único', description: 'El Coach solo tiene 1 toque de balón permitido.', category: 'nerf' },
  { id: 63, title: 'Silencio Total', description: 'Coach no puede hablar ni dar instrucciones.', category: 'nerf' },
  { id: 64, title: 'Vértigo', description: '3 giros sobre el eje antes de cada acción técnica.', category: 'nerf' },
  { id: 65, title: 'Exclusión', description: 'Coach no puede pisar el área central (12x8m).', category: 'nerf' },

  // 66-75: TARJETAS DE BUFF (Ventaja Alumno)
  { id: 66, title: 'Balón Teledirigido', description: 'Uso libre de Rebotadores para apoyo infinito.', category: 'buff' },
  { id: 67, title: 'Escudo de Reacción', description: 'Alumno elige el color inicial en la App de Reacción.', category: 'buff' },
  { id: 68, title: 'Replay', description: 'Repetir la peor ejecución sin penalización.', category: 'buff' },
  { id: 69, title: 'Zona VIP', description: 'Alumno remata/pasa 2 metros más cerca del objetivo.', category: 'buff' },
  { id: 70, title: 'Combo Neuro', description: 'Si acierta App de Reacción, puntos valen doble.', category: 'buff' },
  { id: 71, title: 'Cronomago', description: '+10 segundos adicionales en retos de tiempo.', category: 'buff' },
  { id: 72, title: 'Escudo de Error', description: 'El primer fallo técnico no cuenta.', category: 'buff' },
  { id: 73, title: 'El Consultor', description: 'Pedir consejo técnico al Coach antes de iniciar.', category: 'buff' },
  { id: 74, title: 'Salto Cuántico', description: 'Saltar un obstáculo del circuito a elección.', category: 'buff' },
  { id: 75, title: 'Gravedad Cero', description: 'Uso de Pelota Plástica ligera para toques.', category: 'buff' },

  // 76-85: DUELOS TÉCNICOS & RETOS
  { id: 76, title: 'Raquetas 12x8', description: 'Mantener pelota de tenis en aire con raquetas.', category: 'duelo' },
  { id: 77, title: 'Muro de Precisión', description: 'Pases 1ra intención contra pared; pierde quien falle.', category: 'duelo' },
  { id: 78, title: 'Caza-Estacas', description: 'Tocar 5 estacas en orden de la App de Reacción.', category: 'duelo' },
  { id: 79, title: 'Tenis-Fútbol Pro', description: 'Duelo sobre red con pierna no dominante (2:1).', category: 'duelo' },
  { id: 80, title: 'Slalom Ciego Pro', description: 'Alumno vendado guiado por voz del Coach.', category: 'duelo' },
  { id: 81, title: 'Intocable 2x2', description: 'Mantener posesión en cuadro reducido contra Coach.', category: 'duelo' },
  { id: 82, title: 'Caja Mágica', description: 'Meter balón en tacho o Caja de Madera a 10m.', category: 'duelo' },
  { id: 83, title: 'Duelo BOSU', description: 'Más tiempo en equilibrio haciendo pases.', category: 'duelo' },
  { id: 84, title: 'Remolque', description: 'Duelo de tracción con Cinturón Pro.', category: 'duelo' },
  { id: 85, title: 'Penal Mareado', description: '5 vueltas y remate a mini-portería.', category: 'duelo' },

  // 86-95: RETOS DE TORNEO
  { id: 86, title: 'Especialista TRX', description: 'Max repeticiones remo 45s (40 pts).', category: 'torneo' },
  { id: 87, title: 'Dominio Plástico', description: '20 toques seguidos pelota ligera (30 pts).', category: 'torneo' },
  { id: 88, title: 'Equilibrio Fitball', description: '10 pases cabeza sentado en Fitball (40 pts).', category: 'torneo' },
  { id: 89, title: 'Resistencia Pro', description: '1 min sprint contra banda elástica (50 pts).', category: 'torneo' },
  { id: 90, title: 'Diana Kettlebell', description: 'Derribar platillo sobre Pesa Rusa a 8m (60 pts).', category: 'torneo' },
  { id: 91, title: 'Muro de Haaland', description: '30 pases pared zurda/derecha sin error (50 pts).', category: 'torneo' },
  { id: 92, title: 'Salto Tigre', description: 'Tocar marca alta tras salto desde Step (30 pts).', category: 'torneo' },
  { id: 93, title: 'Neuro-Tenis', description: '15 toques pelota tenis sin manos (70 pts).', category: 'torneo' },
  { id: 94, title: 'Flash Circuit', description: 'Slalom+Valla+Gol en < 12s (100 pts).', category: 'torneo' },
  { id: 95, title: 'El Embajador', description: 'Ganar duelo al Coach sin usar BUFFS (150 pts).', category: 'torneo' },
  { id: 96, title: 'Equilibrio Flamenco', description: 'Más tiempo en un pie haciendo pases que el Coach.', category: 'duelo' },
  { id: 97, title: 'El Pase Maestro', description: 'Poner el balón en un neumático a 30m.', category: 'torneo' },
  { id: 98, title: 'Sprint con Lastre', description: 'Correr 20m con paracaídas o trineo de carga.', category: 'torneo' },
  { id: 99, title: 'Control en Altura', description: 'Bajar balón de un pase bombeado a 5m de altura.', category: 'duelo' },
  { id: 100, title: 'Gol Olímpico', description: 'Anotar desde el córner con efecto.', category: 'torneo' },
];

export const generateChallenge = async (userId: string): Promise<ChallengeCard> => {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    const userData = userSnap?.data();
    const birthDate = userData?.birthDate ? new Date(userData.birthDate) : new Date();
    const age = new Date().getFullYear() - birthDate.getFullYear();
    const profile = userData?.profile || 'bienestar';

    const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

    // We can either pick a specific challenge (76-95) or generate one (existing logic)
    // Or just pick from the whole pool if we want to include the new ones.
    const usePool = Math.random() > 0.3; // 70% chance to use the specific new pool
    
    if (usePool) {
      const challenge = random(ALL_CHALLENGES.filter(c => c.id && c.id >= 51));
      
      const penalties = [
        'hace 10 saltos de rana',
        'recoge todo el material del campo',
        'invita el hidratante al final de la sesión',
        'hace un baile gracioso de 15 segundos',
        'hace 5 burpees explosivos',
        'carga los balones hasta el depósito'
      ];

      return {
        ...challenge,
        suggestedPenalty: random(penalties),
        userBuff: challenge.category === 'buff' ? challenge.description : "Duelo Estándar",
        coachHandicap: challenge.category === 'nerf' ? challenge.description : "Duelo Estándar"
      };
    }

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
