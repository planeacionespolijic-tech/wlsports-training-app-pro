import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, increment, arrayUnion, addDoc, collection, serverTimestamp, runTransaction, Timestamp } from 'firebase/firestore';

/**
 * CONFIGURACIÓN DE GAMIFICACIÓN ELITE
 */
export const GAMING_CONFIG = {
  XP_PER_SESSION: 100,
  POINTS_PER_SESSION: 50,
  XP_PER_LEVEL: 1000,
  ACHIEVEMENT_BONUS: 200,
  STREAK_GRACE_PERIOD_HOURS: 36, // Tiempo máximo entre sesiones para mantener racha
};

export interface GamificationResult {
  leveledUp: boolean;
  newLevel: number;
  newPoints: number;
  newXp: number;
  pointsEarned: number;
  currentStreak: number;
}

/**
 * Adjudica puntos y XP tras una sesión usando transacciones para integridad total.
 */
export const awardSessionPoints = async (userId: string, workoutName: string): Promise<GamificationResult | undefined> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    return await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("User not found");

      const userData = userSnap.data();
      const currentXP = userData.xp || 0;
      const currentLevel = userData.level || 1;
      const lastSessionAt = userData.lastSessionAt?.toDate() || new Date(0);
      const currentStreak = userData.streak || 0;

      // 1. Cálculo de Racha (Streak)
      const now = new Date();
      const hoursSinceLastSession = (now.getTime() - lastSessionAt.getTime()) / (1000 * 60 * 60);
      
      let newStreak = currentStreak;
      if (hoursSinceLastSession <= GAMING_CONFIG.STREAK_GRACE_PERIOD_HOURS) {
        // Si han pasado más de 12h pero menos de 36h, incrementamos racha (evita spam en el mismo día)
        if (hoursSinceLastSession > 12) newStreak += 1;
      } else {
        newStreak = 1; // Racha reiniciada
      }

      // 2. Cálculo de Nivel
      const newXP = currentXP + GAMING_CONFIG.XP_PER_SESSION;
      const newLevel = Math.floor(newXP / GAMING_CONFIG.XP_PER_LEVEL) + 1;
      const leveledUp = newLevel > currentLevel;

      // 3. Actualización de Perfil
      transaction.update(userRef, {
        xp: increment(GAMING_CONFIG.XP_PER_SESSION),
        points: increment(GAMING_CONFIG.POINTS_PER_SESSION),
        level: newLevel,
        streak: newStreak,
        lastSessionAt: serverTimestamp()
      });

      // 4. Logs de Auditoría (Gamification Logs)
      const logRef = doc(collection(db, 'gamificationLogs'));
      transaction.set(logRef, {
        userId,
        type: 'points',
        value: GAMING_CONFIG.POINTS_PER_SESSION,
        reason: `Sesión completada: ${workoutName}`,
        createdAt: serverTimestamp()
      });

      if (leveledUp) {
        const levelLogRef = doc(collection(db, 'gamificationLogs'));
        transaction.set(levelLogRef, {
          userId,
          type: 'level_up',
          value: newLevel,
          reason: `Ascenso a Nivel ${newLevel}`,
          createdAt: serverTimestamp()
        });
      }

      return { 
        leveledUp, 
        newLevel, 
        newPoints: (userData.points || 0) + GAMING_CONFIG.POINTS_PER_SESSION,
        newXp: newXP,
        pointsEarned: GAMING_CONFIG.POINTS_PER_SESSION,
        currentStreak: newStreak
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'users');
    return undefined;
  }
};

/**
 * Desbloquea logros de forma segura
 */
export const unlockAchievement = async (userId: string, achievementId: string, title: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const achievements = userData.achievements || [];
      
      if (achievements.includes(achievementId)) return;

      transaction.update(userRef, {
        achievements: arrayUnion(achievementId),
        points: increment(GAMING_CONFIG.ACHIEVEMENT_BONUS)
      });

      const logRef = doc(collection(db, 'gamificationLogs'));
      transaction.set(logRef, {
        userId,
        type: 'achievement',
        value: GAMING_CONFIG.ACHIEVEMENT_BONUS,
        reason: `Logro: ${title}`,
        createdAt: serverTimestamp()
      });
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'users');
    return false;
  }
};
