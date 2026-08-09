import { SetRecord } from '../store/workoutStore';

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
}

/**
 * 種目追加時の初期セット配列（SetRecord[]）を構築する純粋関数
 */
export const buildInitialSetsForExercise = (
  exercise: AddExercisePayload,
  alwaysOneSet: boolean = false
): SetRecord[] => {
  const generateTempId = () => Math.random().toString(36).substring(7);

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
      return {
        id: generateTempId(),
        set_number: rs.set_number || (idx + 1),
        weight: rs.weight,
        reps: rs.reps,
        rpe: rs.rpe,
        prev_weight: prev ? prev.weight : null,
        prev_reps: prev ? prev.reps : null,
        is_completed: false,
        side: rs.side || null,
        variation: rs.variation || null,
        stance: rs.stance || null,
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
            prev_weight: prevL ? prevL.weight : null,
            prev_reps: prevL ? prevL.reps : null,
            rpe: prevL ? prevL.rpe : null,
            is_completed: false,
            side: 'L',
            variation: prevL ? (prevL.variation || null) : (exercise.default_variation || null),
            stance: prevL ? (prevL.stance || null) : (exercise.default_stance || null),
          },
          {
            id: generateTempId(),
            set_number: 1,
            weight: null,
            reps: null,
            prev_weight: prevR ? prevR.weight : null,
            prev_reps: prevR ? prevR.reps : null,
            rpe: prevR ? prevR.rpe : null,
            is_completed: false,
            side: 'R',
            variation: prevR ? (prevR.variation || null) : (exercise.default_variation || null),
            stance: prevR ? (prevR.stance || null) : (exercise.default_stance || null),
          },
        ];
      } else {
        const prev = exercise.previousSets[0];
        return [{
          id: generateTempId(),
          set_number: 1,
          weight: null,
          reps: null,
          prev_weight: prev.weight,
          prev_reps: prev.reps,
          rpe: prev.rpe,
          is_completed: false,
          variation: prev.variation || exercise.default_variation || null,
          stance: prev.stance || exercise.default_stance || null,
        }];
      }
    } else {
      return exercise.previousSets.map((prev, idx) => ({
        id: generateTempId(),
        set_number: idx + 1,
        weight: null,
        reps: null,
        prev_weight: prev.weight,
        prev_reps: prev.reps,
        rpe: prev.rpe,
        is_completed: false,
        side: prev.side || null,
        variation: prev.variation || null,
        stance: prev.stance || null,
      }));
    }
  }

  // 3. 完全新規種目の場合
  if (exercise.is_unilateral) {
    return [
      { id: generateTempId(), set_number: 1, weight: null, reps: null, rpe: null, is_completed: false, rest_seconds: null, work_seconds: null, side: 'L', variation: exercise.default_variation || null, stance: exercise.default_stance || null },
      { id: generateTempId(), set_number: 1, weight: null, reps: null, rpe: null, is_completed: false, rest_seconds: null, work_seconds: null, side: 'R', variation: exercise.default_variation || null, stance: exercise.default_stance || null },
    ];
  }

  return [{
    id: generateTempId(),
    set_number: 1,
    weight: null,
    reps: null,
    rpe: null,
    is_completed: false,
    rest_seconds: null,
    work_seconds: null,
    variation: exercise.default_variation || null,
    stance: exercise.default_stance || null,
  }];
};
