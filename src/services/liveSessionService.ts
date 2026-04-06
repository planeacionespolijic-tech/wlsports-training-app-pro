import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';

export interface LiveSessionState {
  userId: string;
  workoutId: string;
  workoutName: string;
  completedExercises: number[];
  currentExerciseIndex: number;
  rpe: number;
  lastUpdate: any;
  status: 'active' | 'finished';
}

export const startLiveSession = async (userId: string, workout: any) => {
  const sessionRef = doc(db, 'liveSessions', userId);
  const initialState: LiveSessionState = {
    userId,
    workoutId: workout.id,
    workoutName: workout.name,
    completedExercises: [],
    currentExerciseIndex: 0,
    rpe: 5,
    lastUpdate: serverTimestamp(),
    status: 'active'
  };
  try {
    await setDoc(sessionRef, initialState);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `liveSessions/${userId}`);
  }
};

export const updateLiveSession = async (userId: string, updates: Partial<LiveSessionState>) => {
  const sessionRef = doc(db, 'liveSessions', userId);
  try {
    await setDoc(sessionRef, {
      ...updates,
      lastUpdate: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `liveSessions/${userId}`);
  }
};

export const endLiveSession = async (userId: string) => {
  const sessionRef = doc(db, 'liveSessions', userId);
  try {
    await deleteDoc(sessionRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `liveSessions/${userId}`);
  }
};

export const subscribeToLiveSession = (userId: string, callback: (state: LiveSessionState | null) => void) => {
  const sessionRef = doc(db, 'liveSessions', userId);
  return onSnapshot(sessionRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as LiveSessionState);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `liveSessions/${userId}`);
  });
};
