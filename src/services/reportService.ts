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
