import { serverTimestamp, FieldValue } from 'firebase/firestore';

export interface EvaluationFormData {
  profile: {
    name: string;
    age: string;
    sport: string;
    position: string;
    laterality: string;
    inspiration: string;
  };
  health: {
    medicalHistory: string;
    injuries: string;
    medication: string;
    illnesses: string;
    restrictions: string;
  };
  habits: {
    sleepHours: string;
    stressLevel: string;
    lifestyle: string;
    sittingHours: string;
    nutritionQuality: string;
    hydration: string;
  };
  environment: {
    surfaceType: string;
    footwear: string;
    material: string;
    weeklyFrequency: string;
  };
  goals: {
    goal90Days: string;
    priority: string;
    motivation: string;
    longTermGoals: string;
  };
  commitment: string;
}

export interface EvaluationResult {
  createdAt: FieldValue;
  profile: EvaluationFormData['profile'];
  health: EvaluationFormData['health'];
  habits: EvaluationFormData['habits'];
  environment: EvaluationFormData['environment'];
  goals: EvaluationFormData['goals'];
  flags: string[];
  status: 'Verde' | 'Amarillo' | 'Rojo';
  strategy: {
    m1: string;
    m2: string;
    m3: string;
  };
  commitment: string;
}

export const calculateArmorStatus = (flags: string[]): 'Verde' | 'Amarillo' | 'Rojo' => {
  if (flags.length <= 1) return 'Verde';
  if (flags.length <= 3) return 'Amarillo';
  return 'Rojo';
};

export const generateEvaluationResult = (formData: EvaluationFormData): Omit<EvaluationResult, 'createdAt'> => {
  const flags: string[] = [];
  
  // Rule Engine
  if (Number(formData.habits.sittingHours) > 6) flags.push("Rigidez de cadera");
  if (formData.health.medication || formData.health.illnesses) flags.push("Intensidad controlada");
  if (Number(formData.environment.weeklyFrequency) > 3) flags.push("Fatiga acumulada");
  
  const surface = (formData.environment.surfaceType || '').toLowerCase();
  if (surface.includes('cemento') || surface.includes('duro')) {
    flags.push("Impacto elevado");
  }
  
  if (formData.profile.laterality !== 'Mixta') flags.push("Trabajo unilateral prioritario");

  const status = calculateArmorStatus(flags);

  // Strategy Logic
  const m1 = flags.includes("Rigidez de cadera") 
    ? "Enfoque prioritario en liberación miofascial y movilidad de cadera (psoas, glúteo)."
    : flags.includes("Impacto elevado")
      ? "Foco en estabilidad de tobillo y fortalecimiento de sóleo para reducir impacto óseo."
      : "Movilidad articular global y activación neuromuscular preventiva.";

  const m2 = flags.includes("Trabajo unilateral prioritario")
    ? "Énfasis en fuerza unilateral para equilibrar asimetrías detectadas."
    : flags.includes("Intensidad controlada")
      ? "Entrenamiento de fuerza técnica, controlando volumen y evitando fatiga extrema."
      : "Fortalecimiento de zona media y estabilidad lumbo-pélvica (Core Stability).";

  const m3 = flags.includes("Fatiga acumulada")
    ? "Programación con descargas frecuentes para optimizar la supercompensación."
    : "Incremento progresivo de la carga basada en la percepción del esfuerzo (RPE).";

  return {
    profile: formData.profile,
    health: formData.health,
    habits: formData.habits,
    environment: formData.environment,
    goals: formData.goals,
    flags,
    status,
    strategy: { m1, m2, m3 },
    commitment: formData.commitment
  };
};
