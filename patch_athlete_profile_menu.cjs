const fs = require('fs');
let code = fs.readFileSync('src/screens/AthleteProfileScreen.tsx', 'utf8');

const targetMenu = `    { id: 'evaluacion360', title: 'Evaluación Inicial 360°', icon: Shield, desc: 'Escáner inicial integral de rendimiento', type: 'both' },
    { id: 'valoracion', title: 'Valoración Física', icon: Activity, desc: 'Métricas antropométricas y tests', type: 'both', subTab: 'physical' },
    { id: 'diagnostico', title: 'Diagnóstico e Inteligencia', icon: Brain, desc: 'Análisis IA y enfoque sugerido', type: 'adult', subTab: 'intelligence' },
    { id: 'informes', title: 'Informes de Progreso', icon: FileText, desc: 'Reportes de rendimiento', type: 'both', subTab: 'reports' },
    { id: 'planificacion', title: 'Planificación', icon: CalendarClock, desc: 'Planes y progresiones', type: 'adult' },
    { id: 'seguimiento', title: 'Seguimiento', icon: TrendingUp, desc: 'Gráficas de progreso', type: 'both' },
    { id: 'tests', title: 'Biblioteca de Pruebas', icon: Zap, desc: 'Escaneo de rendimiento y tests', type: 'both' },
    { id: 'videoAnalysis', title: 'Análisis de Video', icon: Video, desc: 'Análisis de movimiento', type: 'both' },
    { id: 'kidsModule', title: 'Módulo Niños', icon: Baby, desc: 'Desarrollo motriz y niveles', type: 'child' },
    { id: 'zonas', title: 'Zonas Cardíacas', icon: Heart, desc: 'Cálculo de FC por Karvonen', type: 'adult' },
    { id: 'entrenamientos', title: 'Entrenamientos', icon: Dumbbell, desc: 'Rutinas personalizadas', type: 'both' },
    { id: 'retos', title: 'Retos y Logros', icon: Trophy, desc: 'Logros y desafíos activos', type: 'child' },
    { id: 'historial', title: 'Historial', icon: History, desc: 'Registro de sesiones', type: 'both' },
  ].filter(item => item.type === 'both' || item.type === (isChild ? 'child' : 'adult'));`;

const newMenu = `    { id: 'evaluacion360', title: 'Evaluación Inicial 360°', icon: Shield, desc: 'Escáner inicial integral de rendimiento', type: 'both' },
    { id: 'entrenamientos', title: 'Plan de Trabajo Individual', icon: CalendarClock, desc: 'Planes, Sesiones y Progreso', type: 'both' },
    { id: 'valoracion', title: 'Valoración Física', icon: Activity, desc: 'Métricas antropométricas y tests', type: 'both', subTab: 'physical' },
    { id: 'diagnostico', title: 'Diagnóstico e Inteligencia', icon: Brain, desc: 'Análisis IA y enfoque sugerido', type: 'adult', subTab: 'intelligence' },
    { id: 'informes', title: 'Informes de Progreso', icon: FileText, desc: 'Reportes de rendimiento', type: 'both', subTab: 'reports' },
    { id: 'seguimiento', title: 'Seguimiento', icon: TrendingUp, desc: 'Gráficas de progreso', type: 'both' },
    { id: 'tests', title: 'Biblioteca de Pruebas', icon: Zap, desc: 'Escaneo de rendimiento y tests', type: 'both' },
    { id: 'videoAnalysis', title: 'Análisis de Video', icon: Video, desc: 'Análisis de movimiento', type: 'both' },
    { id: 'kidsModule', title: 'Módulo Niños', icon: Baby, desc: 'Desarrollo motriz y niveles', type: 'child' },
    { id: 'zonas', title: 'Zonas Cardíacas', icon: Heart, desc: 'Cálculo de FC por Karvonen', type: 'adult' },
    { id: 'retos', title: 'Retos y Logros', icon: Trophy, desc: 'Logros y desafíos activos', type: 'child' },
    { id: 'historial', title: 'Historial', icon: History, desc: 'Registro de sesiones', type: 'both' },
  ].filter(item => item.type === 'both' || item.type === (isChild ? 'child' : 'adult'));`;

code = code.replace(targetMenu, newMenu);
fs.writeFileSync('src/screens/AthleteProfileScreen.tsx', code);
console.log('patched athlete profile menu');
