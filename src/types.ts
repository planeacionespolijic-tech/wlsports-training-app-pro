import { Timestamp } from 'firebase/firestore';

export type UserRole = 'trainer' | 'client' | 'superadmin';
export type UserStatus = 'active' | 'blocked' | 'deleted';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  status: UserStatus;
  isAnonymous: boolean;
  lastLogin: Timestamp | any; // serverTimestamp() result
  trainerId?: string | null;
  createdBy?: string;
  xp?: number;
  points?: number;
  level?: number;
}

export interface Exercise {
  id?: string;
  name: string;
  description?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  trainerId?: string;
  createdAt?: Timestamp | any;
  [key: string]: any;
}

export interface TrainingBlock {
  id: string;
  name: string;
  exercises: Exercise[];
  [key: string]: any;
}

export interface Workout {
  id: string;
  name: string;
  userId: string;
  trainerId: string | null;
  exercises?: any[];
  blocks?: any[];
  createdAt: Timestamp | any;
}

export interface Athlete extends UserProfile {
  id: string; // Often matches uid
}
