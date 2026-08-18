export type Gender = 'male' | 'female';

export type BodyDataSource = 'manual' | 'health_connect' | 'navy_calc';

export interface BodyCompositionLog {
  id?: number;
  date: string; // YYYY-MM-DD
  weight: number | null; // kg
  body_fat_rate: number | null; // % (0-100)
  muscle_mass: number | null; // kg
  lbm: number | null; // 除脂肪体重 (kg)
  height: number | null; // cm
  neck: number | null; // 首回り (cm)
  waist: number | null; // ウエスト (cm)
  hip: number | null; // ヒップ (cm, 女性用)
  wrist: number | null; // 手首囲 (cm)
  ankle: number | null; // 足首囲 (cm)
  gender: Gender;
  source: BodyDataSource;
  memo: string | null;
  created_at: number;
}

export interface NavyBodyFatInput {
  gender: Gender;
  height: number; // cm
  neck: number; // cm
  waist: number; // cm
  hip?: number; // cm (女性必須)
  weight?: number; // kg (LBM計算用)
}

export interface NavyBodyFatResult {
  bodyFatRate: number; // %
  density: number; // 身体密度
  lbm: number | null; // 除脂肪体重 (kg)
  fatMass: number | null; // 脂肪量 (kg)
  bmi: number | null;
  ffmi: number | null; // 除脂肪筋肉量指数
  category: 'essential' | 'athletes' | 'fitness' | 'average' | 'obese';
  categoryLabel: string;
}

export interface CaseyLimitInput {
  height: number; // cm
  wrist: number; // cm (手首最小囲)
  ankle: number; // cm (足首最小囲)
  targetBodyFatRate?: number; // 目標体脂肪率 % (デフォルト 10%)
}

export interface CaseyLimitResult {
  maxBodyWeight: number; // 最大限界体重 (kg)
  maxLbm: number; // 最大限界除脂肪体重 (kg)
  targetBodyFatRate: number; // %
  realisticWeight95: number; // 現実的上限目標 (95%限界, kg)
  realisticLbm95: number; // 現実的除脂肪上限 (95%限界, kg)
  limitFfmi: number; // 限界FFMI
  maxChest?: number; // 最大胸囲 (cm)
  maxBiceps?: number; // 最大上腕囲 (cm)
  maxForearm?: number; // 最大前腕囲 (cm)
  maxThigh?: number; // 最大大腿囲 (cm)
  maxCalf?: number; // 最大下腿囲 (cm)
  maxNeck?: number; // 最大首囲 (cm)
}

export interface MusclePotentialAnalysis {
  currentWeight: number; // kg
  currentBodyFatRate: number; // %
  currentLbm: number; // kg
  currentFfmi: number;
  maxLbm: number; // kg (Casey Butt Model)
  maxWeightAtTargetFat: number; // kg
  reachPercentage: number; // % (currentLbm / maxLbm * 100)
  remainingMuscleGainKg: number; // kg (maxLbm - currentLbm)
  naturalStatusCategory: 'novice' | 'intermediate' | 'advanced' | 'elite' | 'near_genetic_limit' | 'exceeds_natural';
  naturalStatusLabel: string;
  advice: string;
}
