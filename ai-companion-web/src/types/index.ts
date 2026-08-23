export interface WorkoutRecord {
  id: string;
  exercise_name: string;
  weight_kg?: number;
  reps?: number;
  sets?: number;
  notes?: string;
  timestamp: number;
}

export interface WaterRecord {
  id: string;
  amount_ml: number;
  has_caffeine?: boolean;
  timestamp: number;
}

export interface MealRecord {
  id: string;
  meal_name: string;
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories?: number;
  protein?: number;
  timestamp: number;
}

export interface DailyNoteRecord {
  id: string;
  condition?: string;
  summary: string;
  timestamp: number;
}

export interface ExtractedData {
  workouts: WorkoutRecord[];
  waters: WaterRecord[];
  meals: MealRecord[];
  dailyNotes: DailyNoteRecord[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
}

export interface InitialContext {
  lastWorkout?: string | null;
  currentWaterMl?: number;
  waterGoalMl?: number;
  bodyWeight?: number | null;
  theme?: 'dark' | 'pureBlack';
  date?: string;
}
