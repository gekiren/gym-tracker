// ワークアウトセットの型定義
export interface WorkoutSet {
  id?: number | string;
  set_number: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  is_completed?: boolean | number;
  rest_seconds?: number | null;
  work_seconds?: number | null;
  side?: string | null;
  variation?: string | null;
  stance?: string | null;
}

// ワークアウトエクササイズの型定義
export interface WorkoutExercise {
  exercise_id: number;
  notes?: string | null;
  sets: WorkoutSet[];
}

// ルーティンセットの型定義
export interface RoutineSet {
  set_number: number;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  side?: string | null;
  variation?: string | null;
  stance?: string | null;
}

// ルーティンエクササイズの型定義
export interface RoutineExercise {
  id: number;
  name: string;
  sets: RoutineSet[];
}

// DB レコード（workoutsテーブル）の型定義
export interface WorkoutRow {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  calories: number | null;
  avg_heart_rate?: number | null;
  max_heart_rate?: number | null;
  calories_burned?: number | null;
}

// DB レコード（workout_exercisesテーブル等結合）の型定義
export interface WorkoutExerciseRow {
  workout_exercise_id: number;
  exercise_id: number;
  exercise_name: string;
  notes: string | null;
}

// DB レコード（workout_setsテーブル）の型定義
export interface WorkoutSetRow {
  id: number;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  rest_seconds: number | null;
  work_seconds: number | null;
  side: string | null;
  variation: string | null;
  stance: string | null;
  is_completed: number | boolean;
}

export interface WaterLog {
  id: number;
  amount: number;
  timestamp: number;
  date: string;
  caffeine?: number;
}

export interface TimeLog {
  id: number;
  activity_name: string;
  start_time: string;
  end_time: string;
  date: string;
  duration_minutes: number;
}

export interface HabitItem {
  id: number;
  name: string;
  color: string;
  created_at: number;
  sort_order: number;
}

export interface HabitLog {
  id: number;
  habit_item_id: number;
  timestamp: number;
  date: string;
}

export interface PresetRoutine {
  title: string;
  description: string;
  exerciseNames: string[];
}

export interface WorkoutWithStats extends WorkoutRow {
  exercise_count: number;
  total_sets?: number;
  volume: number | null;
}

export interface FullWorkoutExerciseSet {
  id: number;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  rest_seconds: number | null;
  work_seconds: number | null;
  side: string | null;
  variation: string | null;
  stance: string | null;
  is_completed: boolean;
}

export interface FullWorkoutExercise {
  workout_exercise_id: number;
  exercise_id: number;
  exercise_name: string;
  notes: string | null;
  sets: FullWorkoutExerciseSet[];
}

export interface FullWorkoutData {
  id: number;
  title: string;
  start_time: string;
  end_time: string | null;
  notes: string | null;
  calories: number | null;
  exercises: FullWorkoutExercise[];
}

// ===== 栄養管理 (Nutrition) =====

export interface MealLog {
  id: number;
  date: string;
  meal_type?: string;
  meal_time?: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
  fiber: number;
  photo_url?: string;
  memo?: string;
  created_at: number;
}

export interface MealFavorite {
  id: number;
  name: string;
  meal_type?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
  fiber: number;
  memo?: string;
  created_at: number;
  sort_order?: number;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
  fiber: number;
  gender?: 'male' | 'female';
  age?: number;
  height?: number;
  weight?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
  goal_type?: 'cut' | 'maintain' | 'bulk';
  setting_mode?: 'cal_pfc' | 'pfc_p' | 'cal_p_weight_f' | 'manual';
  pfc_ratio?: { p: number; f: number; c: number };
  fat_per_weight?: number;
}

export interface AutophagyConfig {
  id?: number;
  enabled: boolean;
  target_hours: number;
  start_time?: string;
  notified: boolean;
  auto_sync_with_last_meal: boolean;
}



