import { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

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
  lastLogin: Timestamp | any;
  role: UserRole;
  isAnonymous: boolean;
  status: UserStatus;
  trainerId?: string | null;
  xp?: number;
  points?: number;
  level?: number;
  streak?: number;
  lastSessionDate?: Timestamp | any;
  attributes?: UserAttributes;
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
  blocks?: WorkoutBlock[];
  createdAt?: Timestamp | any;
}

export interface Athlete {
  id: string;
  uid?: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  status?: UserStatus;
  trainerId?: string;
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
