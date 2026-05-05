import { User } from 'firebase/auth';
import { Timestamp, FieldValue } from 'firebase/firestore';

export type UserRole = 'trainer' | 'client' | 'superadmin';
export type UserStatus = 'active' | 'blocked' | 'deleted';

export interface UserAttributes {
  TEC: number;
  FIS: number;
  NEU: number;
  AGI: number;
  ACT: number;
  // Compatibilidad con versiones anteriores
  ritmo?: number;
  tecnica?: number;
  fuerza?: number;
  mentalidad?: number;
}

export interface InitialEvaluation {
  createdAt: Timestamp | Date | FieldValue;
  profile: {
    name: string;
    age: number;
    sport: string;
    position: string;
    laterality: string;
    inspiration: string;
  };
  health: {
    injuries: string;
    illnesses: string;
    medication: string;
    restrictions: string;
  };
  habits: {
    sleepHours: number;
    stressLevel: string;
    sittingHours: number;
    nutritionQuality: string;
    hydration: string;
  };
  environment: {
    surfaceType: string;
    footwear: string;
    material: string;
    weeklyFrequency: number;
  };
  goals: {
    goal90Days: string;
    priority: string;
    motivation: string;
  };
  flags: string[];
  status: 'Verde' | 'Amarillo' | 'Rojo';
  strategy: {
    m1: string;
    m2: string;
    m3: string;
  };
  commitment: string;
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
  initialEvaluation?: InitialEvaluation;
}

export interface Exercise {
  id: string;
  name: string;
  isManual?: boolean;
  fromBank?: boolean;
  series: number;
  reps?: string | number;
  timePerSeries?: number | string;
  loadType?: 'autocarga' | 'externa';
  loadValue?: string | number;
  restBetweenSeries?: string;
  restBetweenExercises?: string;
  notes?: string;
  moment?: 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
  totalTime?: number | string;
  // Deprecated but kept for safety during migration
  load?: string;
  rpe?: number | string;
  weight?: string | number;
  rest?: string;
}

export interface TrainingBlock {
  id: string;
  name: string;
  type: string;
  moment?: 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
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
  objective?: string;
  date?: string;
  sessionNumber?: number;
  trainerId: string;
  athleteId?: string;
  blocks: TrainingBlock[];
  createdAt?: Timestamp | Date | FieldValue | null;
  totalTime?: number | string;
  updatedAt?: Timestamp | Date | FieldValue | null;
  isGlobal?: boolean;
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
