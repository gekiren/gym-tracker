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
