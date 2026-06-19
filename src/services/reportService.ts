import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

export interface AthleteReport {
  athleteId: string;
  period: string;
  totalSessions: number;
  averageRpe: number;
  topExercises: { name: string; count: number }[];
  consistencyScore: number;
  intelligenceSummary: string;
}

export const generateAIPrompt = async (userId: string, athleteName: string, athlete?: any): Promise<string> => {
  try {
    const historyQ = query(
      collection(db, 'history'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const historySnap = await getDocs(historyQ);
    const history = historySnap.docs.map(doc => doc.data());

    const totalSessions = history.length;
    const totalRpe = history.reduce((acc, s) => acc + (s.workoutDetails?.rpe || 5), 0);
    const averageRpe = totalSessions > 0 ? (totalRpe / totalSessions).toFixed(1) : 'N/A';

    const exerciseCounts: { [key: string]: number } = {};
    history.forEach(s => {
      s.workoutDetails?.exercises?.forEach((ex: any) => {
        exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + 1;
      });
    });

    const topExercises = Object.entries(exerciseCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(ex => `- ${ex.name} (${ex.count} veces)`)
      .join('\n');

    const attributes = athlete?.attributes;
    const attributesText = attributes ? `
- Técnica (TEC): ${attributes.TEC || attributes.tecnica || 10}/100
- Físico (FIS): ${attributes.FIS || attributes.fuerza || 10}/100
- Neuro (NEU): ${attributes.NEU || attributes.neuro || 10}/100
- Agilidad (AGI): ${attributes.AGI || attributes.ritmo || 10}/100
- Actitud (ACT): ${attributes.ACT || attributes.mentalidad || 10}/100
` : 'No hay datos de atributos específicos.';

    const xp = athlete?.xp || 0;

    const prompt = `# WLSPORTS MASTER TEMPLATE V1.0

## PLANTILLA OFICIAL DE INFORMES DE EVOLUCIÓN

TAREA CRÍTICA
Debes redactar y estructurar el texto para un informe de evolución basado EXACTAMENTE en la estructura visual, distribución, jerarquía, estilo gráfico, proporciones y calidad premium del informe WLSPORTS de referencia.

NO rediseñar, NO reinterpretar, NO reorganizar secciones, NO inventar nuevas distribuciones.
La plantilla es FIJA. Únicamente debes actualizar los textos con los datos específicos del atleta.
El resultado debe parecer generado por la misma empresa, misma temporada y mismo sistema visual. Actúa de una manera ultra premium, motivadora y experta en alto rendimiento deportivo.

DATOS ESPECÍFICOS DEL ATLETA RECOPILADOS EL ÚLTIMO MES:
- Nombre: ${athleteName}
- Sesiones completadas (asistencia): ${totalSessions}
- RPE Promedio (Percepción del esfuerzo): ${averageRpe}
- Experiencia Actual (XP): ${xp}
- Capacidades entrenadas:
${topExercises || 'Datos no disponibles'}

PERFIL DE RENDIMIENTO (0-100):
${attributesText}

Por favor, genera el contenido de cada una de estas secciones requeridas en el diseño visual de forma creativa, profesional y elocuente.

━━━━━━━━━━━━━━━━━━━━━━
ESTRUCTURA OBLIGATORIA (NO MODIFICAR EL ORDEN)

1. CINTA SUPERIOR
INFORME DE PROGRESO MENSUAL
WLSPORTS HIGH PERFORMANCE ACADEMY
Periodo del informe: Últimos 30 días

2. PERFIL DEL ATLETA
Atleta: ${athleteName}
(Completar categoría, posición ficticia u obvia, XP acumulada: ${xp}, Asistencia: ${totalSessions} sesiones)

3. ASCENSO WLSPORTS
Usa la escala de niveles para definir su nivel anterior, nivel actual, XP, y próximo desafío.
(Escalas Oficiales: Canterano 0-500 XP, Promesas 501-1500 XP, Profesional 1501-4000 XP, Leyenda 4001-8000 XP, Embajador 8001+ XP)
Calcula el nivel en base a la XP reportada (${xp}).

4. ADN WLSPORTS
Título: ADN WLSPORTS
Mostrar: 👀 ESCANEAR | 🧠 DECIDIR | ⚽ EJECUTAR (Explica brevemente su metodología aplicada a ${athleteName})

5. MOMENTO DEL MES
Descripción personalizada destacando la asimilación de los conceptos: escaneo, control orientado, toma de decisiones y perfil corporal.

6. PERFIL DE RENDIMIENTO
Crea el contenido de las Barras premium con los atributos mencionados: Técnica, Escaneo, Inteligencia de Juego, Fuerza, Agilidad, Mentalidad (usa la data enviada o haz suposiciones en base a un perfil de alto nivel, de 0 a 100).

7. EVOLUCIÓN INTEGRAL DEL CICLO
Resumen analítico para el Radar hexagonal premium relacionando los 6 atributos: Técnica, Escaneo, Inteligencia, Fuerza, Agilidad, Mentalidad.

8. CAPACIDADES ENTRENADAS
Lista visual de los fundamentos entrenados (Control orientado, Escaneo previo, Perfil corporal, etc. adaptado a sus sesiones si es posible: ${topExercises ? 'incorporando los ejercicios listados' : '...'}).

9. PRÓXIMA MISIÓN
Panel estilo videojuego con los objetivos (checklist) del siguiente mes/ciclo para ${athleteName}.

10. RUTA DE DESARROLLO WLSPORTS
Muestra la ruta marcando explícitamente y de manera destacada el nivel de XP proyectado actual.
Ruta: ⭐ CANTERANO, ⭐⭐ PROMESAS, ⭐⭐⭐ PROFESIONAL, ⭐⭐⭐⭐ LEYENDA, ⭐⭐⭐⭐⭐ EMBAJADOR.

11. INSIGNIA DE ETAPA SUPERADA
Medalla premium dorada y mensaje personalizado de etapa o mes finalizado de manera motivacional y épica.

12. FRASE FINAL
"La inteligencia del juego comienza antes de tocar el balón."
WLSPORTS
👀 ESCANEAR → 🧠 DECIDIR → ⚽ EJECUTAR
━━━━━━━━━━━━━━━━━━━━━━

Recuerda: Escribe esto enfocado en entregar la "Data en crudo" e indicaciones de "Copys" muy estructurados que se copiarían directamente al software de diseño para generar el informe.`;

    return prompt;
  } catch (error) {
    console.error("Error generating prompt:", error);
    return "Error al recopilar los datos. Por favor, inténtalo de nuevo.";
  }
};

export const generateAthleteReport = async (userId: string): Promise<AthleteReport | null> => {
  try {
    const historyQ = query(
      collection(db, 'history'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const historySnap = await getDocs(historyQ);
    const history = historySnap.docs.map(doc => doc.data());

    if (history.length === 0) return null;

    const totalSessions = history.length;
    const totalRpe = history.reduce((acc, s) => acc + (s.workoutDetails?.rpe || 5), 0);
    const averageRpe = totalRpe / totalSessions;

    const exerciseCounts: { [key: string]: number } = {};
    history.forEach(s => {
      s.workoutDetails?.exercises?.forEach((ex: any) => {
        exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + 1;
      });
    });

    const topExercises = Object.entries(exerciseCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Simple consistency score (sessions in last 30 days / 12 expected)
    const consistencyScore = Math.min(100, (totalSessions / 12) * 100);

    let intelligenceSummary = "El atleta mantiene una carga estable.";
    if (averageRpe > 8) intelligenceSummary = "El atleta está trabajando a intensidades muy altas. Vigilar recuperación.";
    if (consistencyScore < 50) intelligenceSummary = "La consistencia es baja. Se recomienda ajustar el horario.";

    return {
      athleteId: userId,
      period: 'Últimos 30 días',
      totalSessions,
      averageRpe,
      topExercises,
      consistencyScore,
      intelligenceSummary
    };
  } catch (error) {
    console.error("Report Generation Error:", error);
    return null;
  }
};
