export interface BaseTest {
  id: string;
  name: string;
  category: 'Potencia' | 'Fuerza' | 'Resistencia' | 'Movilidad' | 'Equilibrio' | 'Velocidad' | 'Recuperación' | 'Funcionalidad' | 'Técnica Fútbol';
  unit: string;
  description: string;
  objective: string;
  profiles: ('deportista' | 'bienestar' | 'longevidad')[];
  ageRange?: [number, number];
  suggestedRange?: string;
  proTip?: string;
  protocol?: string;
}

export const TESTS_LIBRARY: BaseTest[] = [
  // POTENCIA
  { 
    id: 'cmj', 
    name: 'Salto CMJ', 
    category: 'Potencia', 
    unit: 'cm', 
    objective: 'Medir potencia explosiva de tren inferior.',
    description: 'Countermovement Jump (Salto con contramovimiento) sin ayuda de brazos.',
    profiles: ['deportista', 'bienestar'],
    ageRange: [12, 50],
    suggestedRange: '30-55 cm'
  },
  { 
    id: 'salto_longitudinal', 
    name: 'Salto Longitudinal', 
    category: 'Potencia', 
    unit: 'cm', 
    objective: 'Evaluar potencia horizontal.',
    description: 'Salto hacia adelante desde posición estática.',
    profiles: ['deportista'],
    ageRange: [6, 18],
    suggestedRange: '180-250 cm'
  },
  { 
    id: 'lanzamiento_medicinal', 
    name: 'Lanzamiento Balón Medicinal', 
    category: 'Potencia', 
    unit: 'metros', 
    objective: 'Evaluar potencia de tren superior.',
    description: 'Lanzamiento de balón medicinal (3-5kg) desde el pecho.',
    profiles: ['deportista'],
    ageRange: [12, 45],
    suggestedRange: '4.5 - 7.5 m'
  },
  { 
    id: 'sprint_10m', 
    name: 'Sprint 10m', 
    category: 'Potencia', 
    unit: 'seg', 
    objective: 'Medir aceleración explosiva.',
    description: 'Tiempo en recorrer 10 metros desde salida estática.',
    profiles: ['deportista'],
    ageRange: [10, 40],
    suggestedRange: '1.65 - 1.95 seg'
  },

  // FUERZA
  { 
    id: '1rm_sentadilla', 
    name: '1RM Estimado Sentadilla', 
    category: 'Fuerza', 
    unit: 'kg', 
    objective: 'Estimar fuerza máxima en tren inferior.',
    description: 'Cálculo de 1RM basado en repeticiones submáximas.',
    profiles: ['deportista', 'bienestar'],
    ageRange: [15, 60],
    suggestedRange: '1.2x - 1.8x Peso Corp'
  },
  { 
    id: 'push_up_test', 
    name: 'Push-Up Test (1 min)', 
    category: 'Fuerza', 
    unit: 'reps', 
    objective: 'Evaluar resistencia a la fuerza de tren superior.',
    description: 'Máximo número de flexiones de brazo en 60 segundos.',
    profiles: ['deportista', 'bienestar'],
    ageRange: [12, 60],
    suggestedRange: '25-45 reps'
  },
  { 
    id: 'dominadas_max', 
    name: 'Máximo de Dominadas', 
    category: 'Fuerza', 
    unit: 'reps', 
    objective: 'Evaluar fuerza relativa de tracción.',
    description: 'Máximo número de dominadas estrictas.',
    profiles: ['deportista'],
    ageRange: [14, 50],
    suggestedRange: '8-15 reps'
  },
  { 
    id: 'sentadilla_controlada', 
    name: 'Sentadilla Máxima Controlada', 
    category: 'Fuerza', 
    unit: 'kg', 
    objective: 'Evaluar fuerza máxima absoluta.',
    description: 'Carga máxima movida con técnica perfecta.',
    profiles: ['deportista'],
    ageRange: [16, 50],
    suggestedRange: 'Técnica 5/5 mandatory'
  },

  // RESISTENCIA
  { 
    id: 'yoyo_test', 
    name: 'Yo-Yo Test', 
    category: 'Resistencia', 
    unit: 'nivel', 
    objective: 'Medir capacidad aeróbica intermitente.',
    description: 'Intermittent Recovery Test Level 1.',
    profiles: ['deportista'],
    ageRange: [12, 45],
    suggestedRange: 'Nivel 16-19 (Fútbol)'
  },
  { 
    id: 'cooper_test', 
    name: 'Test de Cooper', 
    category: 'Resistencia', 
    unit: 'metros', 
    objective: 'Evaluar VO2 Máx estimado.',
    description: 'Distancia máxima recorrida en 12 minutos.',
    profiles: ['deportista', 'bienestar'],
    ageRange: [12, 60]
  },
  { 
    id: 'course_navette', 
    name: 'Course Navette (Beep Test)', 
    category: 'Resistencia', 
    unit: 'palier', 
    objective: 'Medir potencia aeróbica máxima.',
    description: 'Carrera de ida y vuelta de 20m al ritmo de una señal sonora.',
    profiles: ['deportista'],
    ageRange: [8, 45],
    suggestedRange: '10-13 Palier'
  },
  { 
    id: 'burpee_recovery_test', 
    name: 'Burpee Recuperación', 
    category: 'Resistencia', 
    unit: 'reps/3min', 
    objective: 'Evaluar resistencia muscular y cardiovascular.',
    description: 'Máximos burpees en 3 minutos.',
    profiles: ['bienestar', 'deportista'],
    ageRange: [15, 50],
    suggestedRange: '45-65 reps'
  },

  // MOVILIDAD
  { 
    id: 'sit_reach', 
    name: 'Sit and Reach', 
    category: 'Movilidad', 
    unit: 'cm', 
    objective: 'Medir flexibilidad isquiosural y lumbar.',
    description: 'Alcanzar con las manos lo más lejos posible sentado.',
    profiles: ['deportista', 'bienestar', 'longevidad'],
    ageRange: [6, 80]
  },
  { 
    id: 'dorsiflexion_ankel', 
    name: 'Dorsiflexión de Tobillo', 
    category: 'Movilidad', 
    unit: 'cm', 
    objective: 'Medir rango de movimiento del tobillo.',
    description: 'Distancia máxima rodilla-pared con talón apoyado.',
    profiles: ['deportista', 'bienestar'],
    ageRange: [10, 70],
    suggestedRange: '8 - 12 cm'
  },
  { 
    id: 'movilidad_toracica', 
    name: 'Movilidad Torácica', 
    category: 'Movilidad', 
    unit: 'grados', 
    objective: 'Evaluar rotación de columna torácica.',
    description: 'Rango de giro de hombros manteniendo cadera fija.',
    profiles: ['deportista', 'longevidad'],
    ageRange: [12, 85],
    suggestedRange: '45° - 60°'
  },
  { 
    id: 'overhead_squat_test', 
    name: 'Overhead Squat', 
    category: 'Movilidad', 
    unit: 'puntos', 
    objective: 'Evaluación funcional global de movilidad.',
    description: 'Sentadilla profunda con brazos arriba.',
    profiles: ['deportista', 'bienestar'],
    ageRange: [12, 60],
    suggestedRange: 'Score 3 (FMS scale)'
  },

  // EQUILIBRIO / CONTROL
  { 
    id: 'equilibrio_unipodal', 
    name: 'Equilibrio Unipodal', 
    category: 'Equilibrio', 
    unit: 'seg', 
    objective: 'Evaluar estabilidad estática.',
    description: 'Mantenerse sobre un pie el mayor tiempo posible.',
    profiles: ['longevidad', 'bienestar', 'deportista'],
    ageRange: [10, 99]
  },
  { 
    id: 'y_balance_test', 
    name: 'Y-Balance Test', 
    category: 'Equilibrio', 
    unit: 'cm', 
    objective: 'Medir estabilidad dinámica unipodal.',
    description: 'Alcanzar en 3 direcciones con un pie en apoyo.',
    profiles: ['deportista'],
    ageRange: [12, 45],
    suggestedRange: '90 - 110 cm'
  },
  { 
    id: 'tug_longevity', 
    name: 'TUG (Timed Up and Go)', 
    category: 'Equilibrio', 
    unit: 'seg', 
    objective: 'Evaluar movilidad funcional y riesgo de caídas.',
    description: 'Levantarse, caminar 3m, volver y sentarse.',
    profiles: ['longevidad'],
    ageRange: [50, 99],
    suggestedRange: '< 10 seg'
  },
  { 
    id: 'star_excursion', 
    name: 'Star Excursion Balance', 
    category: 'Equilibrio', 
    unit: 'cm', 
    objective: 'Evaluar control propioceptivo.',
    description: 'Alcanzar en 8 direcciones sobre un pie.',
    profiles: ['deportista'],
    ageRange: [14, 40],
    suggestedRange: '> 90% pierna'
  },

  // VELOCIDAD / AGILIDAD
  { 
    id: 'test_5105', 
    name: 'Agilidad 5-10-5', 
    category: 'Velocidad', 
    unit: 'seg', 
    objective: 'Medir agilidad lateral y cambio de dirección.',
    description: 'Recorrido lateral Pro-Agility Shuttle.',
    profiles: ['deportista'],
    ageRange: [12, 45],
    suggestedRange: '< 5.2 seg'
  },
  { 
    id: 'illinois_test', 
    name: 'Test de Illinois', 
    category: 'Velocidad', 
    unit: 'seg', 
    objective: 'Evaluación compleja de agilidad.',
    description: 'Recorrido sinuoso 10m x 5m con giros.',
    profiles: ['deportista'],
    ageRange: [12, 40],
    suggestedRange: '< 16.5 seg'
  },
  { 
    id: 'reaccion_visual_ms', 
    name: 'Reacción Visual', 
    category: 'Velocidad', 
    unit: 'ms', 
    objective: 'Medir tiempo de respuesta cognitiva.',
    description: 'Reacción a estímulo visual dinámico.',
    profiles: ['deportista'],
    ageRange: [8, 50],
    suggestedRange: '< 250 ms'
  },
  { 
    id: 'escalera_coordinativa', 
    name: 'Escalera de Coordinación', 
    category: 'Velocidad', 
    unit: 'seg', 
    objective: 'Evaluar frecuencia de pies y coordinación.',
    description: 'Tiempo en completar patrón específico en escalera.',
    profiles: ['deportista'],
    ageRange: [6, 30]
  },

  // FUNCIONALIDAD / SALUD
  { 
    id: 'sit_to_stand_30s', 
    name: 'Sit to Stand (30s)', 
    category: 'Funcionalidad', 
    unit: 'reps', 
    objective: 'Evaluar fuerza funcional e independencia.',
    description: 'Sentarse y levantarse de una silla la mayor cantidad de veces posible.',
    profiles: ['longevidad'],
    ageRange: [50, 99]
  },
  { 
    id: 'plancha_core', 
    name: 'Plancha Frontal (Core)', 
    category: 'Funcionalidad', 
    unit: 'seg', 
    objective: 'Evaluar estabilidad central.',
    description: 'Mantener postura de plancha el mayor tiempo posible.',
    profiles: ['bienestar', 'deportista', 'longevidad'],
    ageRange: [10, 80],
    suggestedRange: '> 90 seg'
  },
  { 
    id: 'marcha_6min', 
    name: 'Marcha de 6 Minutos', 
    category: 'Funcionalidad', 
    unit: 'metros', 
    objective: 'Evaluar tolerancia al ejercicio aeróbico.',
    description: 'Caminar la mayor distancia posible en 6 min.',
    profiles: ['longevidad', 'bienestar'],
    ageRange: [50, 99],
    suggestedRange: '400 - 650 m'
  },
  { 
    id: 'indice_recuperacion', 
    name: 'Índice de Recuperación', 
    category: 'Funcionalidad', 
    unit: 'bpm', 
    objective: 'Medir salud cardiovascular post-esfuerzo.',
    description: 'Diferencia de FC al finalizar y 1 min después.',
    profiles: ['bienestar', 'deportista'],
    ageRange: [15, 75],
    suggestedRange: '> 30 bpm'
  },

  // RECUPERACIÓN
  { 
    id: 'hr_recovery_60s', 
    name: 'HR Recovery (60s)', 
    category: 'Recuperación', 
    unit: 'bpm', 
    objective: 'Medir eficiencia del sistema parasimpático.',
    description: 'Caída de FC tras 1 min de cese de actividad física.',
    profiles: ['deportista'],
    ageRange: [15, 60],
    suggestedRange: '> 25 bpm'
  },
  { 
    id: 'escala_rpe', 
    name: 'Escala RPE Borg', 
    category: 'Recuperación', 
    unit: '6-20', 
    objective: 'Percepción subjetiva del esfuerzo.',
    description: 'Nivel de esfuerzo percibido tras la sesión.',
    profiles: ['deportista', 'bienestar'],
    ageRange: [10, 85],
    suggestedRange: '12-14 (Esfuerzo moderado)'
  },
  { 
    id: 'fatiga_subjetiva', 
    name: 'Test Subjetivo Fatiga', 
    category: 'Recuperación', 
    unit: '1-10', 
    objective: 'Evaluar carga interna percibida.',
    description: 'Sensación de cansancio general al despertar.',
    profiles: ['deportista'],
    ageRange: [12, 50],
    suggestedRange: '1-3 (Baja fatiga)'
  },
  { 
    id: 'calidad_sueno_test', 
    name: 'Calidad del Sueño', 
    category: 'Recuperación', 
    unit: '1-10', 
    objective: 'Evaluar factor clave de recuperación biológica.',
    description: 'Puntuación subjetiva de descanso reparador.',
    profiles: ['deportista', 'bienestar'],
    ageRange: [10, 80]
  },

  // TÉCNICA FÚTBOL
  { 
    id: 'fb_toques_continuos', 
    name: 'Toques Continuos (Dominio)', 
    category: 'Técnica Fútbol', 
    unit: 'toques', 
    objective: 'Evaluar dominio aéreo y sensibilidad.',
    description: 'Hacer "veintiunas" sin que el balón caiga.',
    profiles: ['deportista'],
    ageRange: [6, 40],
    suggestedRange: '> 50 (Nivel Medio)',
    proTip: 'Observar la superficie de contacto (empeine/muslo) y la relajación del tobillo.',
    protocol: 'El jugador inicia con el balón en los pies. Se cuenta cada contacto válido.'
  },
  { 
    id: 'fb_dominio_bilateral', 
    name: 'Dominio Bilateral', 
    category: 'Técnica Fútbol', 
    unit: 'puntos', 
    objective: 'Evaluar equilibrio técnico entre perfiles.',
    description: 'Secuencia obligatoria de toques (izq, der) alternados.',
    profiles: ['deportista'],
    ageRange: [8, 35],
    suggestedRange: '10/10 (Excelente)',
    proTip: 'Analizar si hay excesiva compensación corporal al usar la pierna no hábil.',
    protocol: 'Alternar obligatoriamente Izquierda-Derecha-Izquierda...'
  },
  { 
    id: 'fb_recepcion_orientada', 
    name: 'Recepción Orientada', 
    category: 'Técnica Fútbol', 
    unit: '1-5', 
    objective: 'Evaluar primer toque dinámico y tiempo de estabilización.',
    description: 'Recibir balón y orientar salida hacia objetivo marcado.',
    profiles: ['deportista'],
    ageRange: [10, 35],
    suggestedRange: 'Calidad 4/5',
    proTip: 'Cronometrar el tiempo desde el contacto hasta el siguiente pase/conducción.',
    protocol: 'Pase fuerte desde 10m. El jugador debe orientar hacia un cono a 3m.'
  },
  { 
    id: 'fb_precision_pase', 
    name: 'Precisión de Pase', 
    category: 'Técnica Fútbol', 
    unit: '%', 
    objective: 'Evaluar precisión de pase corto/medio bajo intención táctica.',
    description: 'Pases a mini-arcos o conos a 10 y 15 metros.',
    profiles: ['deportista'],
    ageRange: [8, 40],
    suggestedRange: '> 80% éxito',
    proTip: 'Evaluar la tensión del balón; un pase preciso pero lento es ineficaz en juego real.',
    protocol: '10 pases pie derecho, 10 pases pie izquierdo.'
  },
  { 
    id: 'fb_slalom_cronometrado', 
    name: 'Conducción en Slalom', 
    category: 'Técnica Fútbol', 
    unit: 'seg', 
    objective: 'Medir relación toque/paso y velocidad en cambio de dirección.',
    description: 'Zig-zag entre conos (2m distancia) ida y vuelta.',
    profiles: ['deportista'],
    ageRange: [8, 40],
    suggestedRange: '< 10 seg',
    proTip: 'El balón no debe alejarse más de 50cm del pie en ningún momento.',
    protocol: 'Distancia total 10m. 5 conos intermedios.'
  },
  { 
    id: 'fb_remate_arco', 
    name: 'Finalización (Eficacia)', 
    category: 'Técnica Fútbol', 
    unit: 'goles/10', 
    objective: 'Evaluar ratio Goles/Remates y biomecánica de golpeo.',
    description: '10 remates a zonas puntuables de la portería.',
    profiles: ['deportista'],
    ageRange: [10, 40],
    suggestedRange: '> 7/10 aciertos',
    proTip: 'Observar la posición del pie de apoyo y el armado de la pierna ejecutora.',
    protocol: 'Pelota quieta al borde del área. 5 remates con cada pierna.'
  },
  { 
    id: 'fb_scanning_test', 
    name: 'Scanning y Decisión', 
    category: 'Técnica Fútbol', 
    unit: '1-5', 
    objective: 'Evaluar escaneo previo (Scanning) y tiempo de decisión.',
    description: 'Reaccionar con pase tras identificar estímulo visual a su espalda.',
    profiles: ['deportista'],
    ageRange: [12, 40],
    suggestedRange: 'Score 4/5',
    proTip: 'Contar cuántas veces levanta la cabeza el jugador antes de recibir el balón.',
    protocol: 'El jugador recibe, pero antes de tocar debe decir el color del cono que levanta el coach atrás.'
  }
];
