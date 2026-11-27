import { SetRecord } from '../store/workoutStore';
import { isTreadmillExercise } from './exerciseUtils';
import { isAutoWarmupWeight, resolveWarmupThreshold } from './warmupUtils';

export interface AddExercisePayload {
  id: number;
  name: string;
  previousSets?: any[];
  personalRecords?: Record<string, Record<number, number>>;
  is_unilateral?: number;
  default_variation?: string | null;
  default_stance?: string | null;
  equipment?: string;
  muscle_group?: string;
  routineSets?: any[];
  weight_step?: number;
  max_1rm?: number | null;
  warmup_threshold_percent?: number | null;
}

export interface WarmupBuildConfig {
  warmupEnabled: boolean;
  globalThresholdPercent: number;
}

const normalizeStance = (val?: string | null): string | null => {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * 種目追加時の初期セット配列（SetRecord[]）を構築する純粋関数
 */
export const buildInitialSetsForExercise = (
  exercise: AddExercisePayload,
  alwaysOneSet: boolean = false,
  warmupConfig?: WarmupBuildConfig
): SetRecord[] => {
  const generateTempId = () => Math.random().toString(36).substring(7);
  const defaultStance =
    normalizeStance(exercise.default_stance) ??
    normalizeStance(exercise.default_variation);

  const isAerobicOrTreadmill =
    exercise.muscle_group === '有酸素' || isTreadmillExercise(exercise.name);
  const warmupEnabled = Boolean(warmupConfig?.warmupEnabled) && !isAerobicOrTreadmill;
  const threshold = resolveWarmupThreshold(
    exercise.warmup_threshold_percent,
    warmupConfig?.globalThresholdPercent ?? 60
  );

  const computeAutoWarmup = (weight: number | null | undefined): boolean => {
    if (!warmupEnabled) return false;
    return isAutoWarmupWeight(weight, exercise.max_1rm, threshold);
  };

  // 1. ルーティンからの追加時
  if (exercise.routineSets && exercise.routineSets.length > 0) {
    return exercise.routineSets.map((rs, idx) => {
      let prev: any = null;
      if (exercise.previousSets && exercise.previousSets.length > 0) {
        if (exercise.is_unilateral) {
          const sideSets = exercise.previousSets.filter(p => p.side === rs.side);
          const rsSideIndex = exercise.routineSets!.slice(0, idx).filter(s => s.side === rs.side).length;
          prev = sideSets[rsSideIndex] || sideSets[0];
        } else {
          prev = exercise.previousSets[idx] || exercise.previousSets[0];
        }
      }
      const routineStance = normalizeStance(rs.stance) ?? normalizeStance(rs.variation);
      const explicitRoutineWarmup = Boolean(rs.is_warmup);
      const isWarmup = warmupEnabled
        ? explicitRoutineWarmup || computeAutoWarmup(rs.weight ?? prev?.weight)
        : false;
      return {
        id: generateTempId(),
        set_number: rs.set_number || (idx + 1),
        weight: rs.weight,
        reps: rs.reps,
        rpe: rs.rpe,
        speed: rs.speed ?? null,
        incline: rs.incline ?? null,
        prev_weight: prev ? prev.weight : null,
        prev_reps: prev ? prev.reps : null,
        prev_speed: prev ? prev.speed : null,
        prev_incline: prev ? prev.incline : null,
        prev_work_seconds: prev ? (prev.work_seconds ?? null) : null,
        is_completed: false,
        is_warmup: isWarmup,
        is_warmup_manual: explicitRoutineWarmup,
        side: rs.side || null,
        variation: routineStance,
        stance: routineStance,
      };
    });
  }

  // 2. 過去の記録からの追加時
  if (exercise.previousSets && exercise.previousSets.length > 0) {
    if (alwaysOneSet) {
      if (exercise.is_unilateral) {
        const prevL = exercise.previousSets.find(p => p.side === 'L');
        const prevR = exercise.previousSets.find(p => p.side === 'R');
        return [
          {
            id: generateTempId(),
            set_number: 1,
            weight: null,
            reps: null,
            speed: null,
            incline: null,
            prev_weight: prevL ? prevL.weight : null,
            prev_reps: prevL ? prevL.reps : null,
            prev_speed: prevL ? prevL.speed : null,
            prev_incline: prevL ? prevL.incline : null,
            prev_work_seconds: prevL ? (prevL.work_seconds ?? null) : null,
            rpe: prevL ? prevL.rpe : null,
            is_completed: false,
            is_warmup: warmupEnabled ? (Boolean(prevL?.is_warmup) || computeAutoWarmup(prevL?.weight)) : false,
            is_warmup_manual: false,
            side: 'L',
            variation: defaultStance,
            stance: defaultStance,
          },
          {
            id: generateTempId(),
            set_number: 1,
            weight: null,
            reps: null,
            speed: null,
            incline: null,
            prev_weight: prevR ? prevR.weight : null,
            prev_reps: prevR ? prevR.reps : null,
            prev_speed: prevR ? prevR.speed : null,
            prev_incline: prevR ? prevR.incline : null,
            prev_work_seconds: prevR ? (prevR.work_seconds ?? null) : null,
            rpe: prevR ? prevR.rpe : null,
            is_completed: false,
            is_warmup: warmupEnabled ? (Boolean(prevR?.is_warmup) || computeAutoWarmup(prevR?.weight)) : false,
            is_warmup_manual: false,
            side: 'R',
            variation: defaultStance,
            stance: defaultStance,
          },
        ];
      } else {
        const prev = exercise.previousSets[0];
        return [{
          id: generateTempId(),
          set_number: 1,
          weight: null,
          reps: null,
          speed: null,
          incline: null,
          prev_weight: prev.weight,
          prev_reps: prev.reps,
          prev_speed: prev.speed ?? null,
          prev_incline: prev.incline ?? null,
          prev_work_seconds: prev.work_seconds ?? null,
          rpe: prev.rpe,
          is_completed: false,
          is_warmup: warmupEnabled ? (Boolean(prev.is_warmup) || computeAutoWarmup(prev.weight)) : false,
          is_warmup_manual: false,
          variation: defaultStance,
          stance: defaultStance,
        }];
      }
    } else {
      return exercise.previousSets.map((prev, idx) => ({
        id: generateTempId(),
        set_number: idx + 1,
        weight: null,
        reps: null,
        speed: null,
        incline: null,
        prev_weight: prev.weight,
        prev_reps: prev.reps,
        prev_speed: prev.speed ?? null,
        prev_incline: prev.incline ?? null,
        prev_work_seconds: prev.work_seconds ?? null,
        rpe: prev.rpe,
        is_completed: false,
        is_warmup: warmupEnabled ? (Boolean(prev.is_warmup) || computeAutoWarmup(prev.weight)) : false,
        is_warmup_manual: false,
        side: prev.side || null,
        variation: defaultStance,
        stance: defaultStance,
      }));
    }
  }

  // 3. 完全新規種目の場合
  if (exercise.is_unilateral) {
    return [
      { id: generateTempId(), set_number: 1, weight: null, reps: null, rpe: null, speed: null, incline: null, is_completed: false, is_warmup: false, is_warmup_manual: false, rest_seconds: null, work_seconds: null, side: 'L', variation: defaultStance, stance: defaultStance },
      { id: generateTempId(), set_number: 1, weight: null, reps: null, rpe: null, speed: null, incline: null, is_completed: false, is_warmup: false, is_warmup_manual: false, rest_seconds: null, work_seconds: null, side: 'R', variation: defaultStance, stance: defaultStance },
    ];
  }

  return [{
    id: generateTempId(),
    set_number: 1,
    weight: null,
    reps: null,
    rpe: null,
    speed: null,
    incline: null,
    is_completed: false,
    is_warmup: false,
    is_warmup_manual: false,
    rest_seconds: null,
    work_seconds: null,
    variation: defaultStance,
    stance: defaultStance,
  }];
};
