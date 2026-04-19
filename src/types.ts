import { User } from 'firebase/auth';
import { Timestamp, FieldValue } from 'firebase/firestore';

export type UserRole = 'trainer' | 'client' | 'superadmin';
export type UserStatus = 'active' | 'blocked' | 'deleted';

export interface UserAttributes {
  ritmo: number;
  tecnica: number;
  fuerza: number;
  mentalidad: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  lastLogin: Timestamp | Date | FieldValue | null;
  role: UserRole;
  isAnonymous: boolean;
  status: UserStatus;
  trainerId?: string | null;
  xp?: number;
  points?: number;
  level?: number;
  streak?: number;
  lastSessionDate?: Timestamp | Date | FieldValue | null;
  attributes?: UserAttributes;
  type?: 'adult' | 'child';
  trustScore?: number;
}

export interface Exercise {
  id: string;
  name: string;
  isManual?: boolean;
  fromBank?: boolean;
  series?: number | string;
  timePerSeries?: number | string;
  load?: string;
  rpe?: number | string;
  totalTime?: number | string;
  sets?: string | number;
  reps?: string;
  weight?: string | number;
  rest?: string;
  notes?: string;
}

export interface TrainingBlock {
  id: string;
  name?: string;
  type: string;
  totalTime?: number | string;
  exercises: Exercise[];
}

export interface WorkoutBlock {
  id: string;
  type: string;
  exercises: Exercise[];
}

export interface Workout {
  id: string;
  name: string;
  description?: string;
  trainerId: string;
  athleteId?: string;
  exercises?: Exercise[];
  blocks?: (WorkoutBlock | TrainingBlock)[];
  createdAt?: Timestamp | Date | FieldValue | null;
  totalTime?: number | string;
  duration?: string;
  updatedAt?: Timestamp | Date | FieldValue | null;
}

export interface Athlete {
  id: string;
  uid?: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  status?: UserStatus;
  trainerId?: string;
  level?: number;
  points?: number;
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<any>;
  loginAnonymously: () => Promise<any>;
  logout: () => Promise<void>;
  isTrainer: boolean;
}
