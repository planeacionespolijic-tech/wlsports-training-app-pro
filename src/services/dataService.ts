import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  startAfter, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';

export interface PaginatedResult<T> {
  data: T[];
  lastVisible: any;
  hasMore: boolean;
}

/**
 * Generic paginated fetcher for Firestore collections
 */
export async function fetchPaginated<T>(
  collectionPath: string,
  constraints: any[] = [],
  pageSize: number = 10,
  lastDoc: any = null
): Promise<PaginatedResult<T>> {
  try {
    let q = query(
      collection(db, collectionPath),
      ...constraints,
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    
    return {
      data,
      lastVisible: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === pageSize
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    return { data: [], lastVisible: null, hasMore: false };
  }
}

/**
 * 🔥 Optimized central service to update user summary and stats
 * Reduces costs and improves performance by using increment()
 */
export async function updateUserSummary(
  userId: string,
  data: {
    sessionsCompleted?: number;
    totalVolume?: number;
    totalTime?: number;
    xp?: number;
    lastWorkout?: string;
    lastWorkoutDate?: string;
    points?: number;
    level?: number;
  }
) {
  try {
    const userRef = doc(db, 'users', userId);

    const updateData: any = {
      lastActivity: serverTimestamp()
    };

    if (data.sessionsCompleted) {
      updateData.sessionsCompleted = increment(data.sessionsCompleted);
    }

    if (data.totalVolume) {
      updateData.totalVolume = increment(data.totalVolume);
    }

    if (data.totalTime) {
      updateData.totalTime = increment(data.totalTime);
    }

    if (data.xp) {
      updateData.xp = increment(data.xp);
    }

    // Add other fields if present
    if (data.lastWorkout) updateData.lastWorkout = data.lastWorkout;
    if (data.lastWorkoutDate) updateData.lastWorkoutDate = data.lastWorkoutDate;
    if (data.points !== undefined) updateData.points = data.points;
    if (data.level !== undefined) updateData.level = data.level;

    await updateDoc(userRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

/**
 * Get a user summary document (now from users collection)
 */
export async function getUserSummary(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return null;
  }
}

/**
 * Calculate Acute:Chronic Workload Ratio (ACWR)
 * This is a simplified version for rule-based logic
 */
export function calculateAcuteChronicRatio(history: any[]) {
  if (history.length < 28) return 1.0; // Need at least 28 days for a true chronic load
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const acuteLoad = history
    .filter(h => new Date(h.createdAt).getTime() > sevenDaysAgo.getTime())
    .reduce((acc, h) => acc + (h.totalTime || 0), 0) / 7;
    
  const chronicLoad = history
    .reduce((acc, h) => acc + (h.totalTime || 0), 0) / 28;
    
  if (chronicLoad === 0) return 1.0;
  return acuteLoad / chronicLoad;
}

/**
 * Get load recommendation based on ACWR
 */
export function getLoadRecommendation(ratio: number) {
  if (ratio < 0.8) return { status: 'low', message: 'Carga baja. Puedes aumentar la intensidad.', color: 'text-blue-500' };
  if (ratio <= 1.3) return { status: 'optimal', message: 'Carga óptima. Mantén el ritmo.', color: 'text-green-500' };
  if (ratio <= 1.5) return { status: 'high', message: 'Carga alta. Monitorea fatiga.', color: 'text-yellow-500' };
  return { status: 'overload', message: 'Riesgo de lesión. Considera descanso o descarga.', color: 'text-red-500' };
}
