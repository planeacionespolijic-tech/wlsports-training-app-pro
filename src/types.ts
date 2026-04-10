export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'trainer' | 'client';
  createdBy?: string;
  trainerId?: string;
  type: 'adult' | 'child';
  level: number;
  xp: number;
  points: number;
  achievements: string[];
  streak: number;
  goals?: string;
  lastLogin: any;
}

export interface Exercise {
  id: string;
  name: string;
  series: number;
  reps?: string;
  timePerSeries?: number; // in seconds
  load?: string;
  rpe?: number;
  totalTime: number; // series * timePerSeries
}

export interface CircuitItem {
  id: string;
  name: string;
  time?: number; // in seconds
  reps?: string;
  order: number;
}

export interface CircuitConfig {
  rounds: number;
  restBetweenExercises: number;
  restBetweenRounds: number;
  items: CircuitItem[];
}

export interface TrainingBlock {
  id: string;
  name: string;
  type: 'normal' | 'circuit';
  exercises: Exercise[];
  circuit?: CircuitConfig;
  totalTime: number; // sum of exercise totalTime or circuit totalTime
}

export interface Workout {
  id?: string;
  name: string;
  duration: string; // This can be the calculated total time string
  totalTime: number; // sum of block totalTime
  blocks: TrainingBlock[];
  userId: string;
  createdAt?: any;
}
