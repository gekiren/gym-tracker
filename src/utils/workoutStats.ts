export interface WorkoutExercise {
  id: string;
  exercise_id?: number;
  name: string;
  notes?: string;
  equipment?: string;
  muscle_group?: string;
  default_stance?: string | null;
  default_variation?: string | null;
  sets: {
    id: string;
    weight: number | null;
    reps: number | null;
    is_completed: boolean;
    work_seconds?: number | null;
    rest_seconds?: number | null;
    side?: string | null;
    stance?: string | null;
    variation?: string | null;
    rpe?: number | null;
  }[];
}

export interface PastSet {
  exercise_id: number;
  weight: number | null;
  reps: number | null;
  workout_id: number;
}

export interface DBWorkout {
  id?: number;
  start_time: string;
}

export interface AchievementItem {
  name: string;
  oldVal: number;
  newVal: number;
}

/**
 * 1RMの計算
 */
export const calculateRM = (weight: number | null, reps: number | null): number | null => {
  if (weight === null || reps === null || reps < 1) return null;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + (reps / 30)));
};

/**
 * 消費カロリーの計算
 */
export const computeCalories = (
  exercises: WorkoutExercise[],
  bodyWeight: number,
  weightUnit: string
): number => {
  let totalWorkSecs = 0;
  let totalRestSecs = 0;
  exercises.forEach(ex => {
    ex.sets.forEach(s => {
      if (s.is_completed) {
        totalWorkSecs += s.work_seconds || 0;
        totalRestSecs += s.rest_seconds || 0;
      }
    });
  });

  const bw = bodyWeight || 70;
  const bwKg = weightUnit === 'lbs' ? bw * 0.453592 : bw;
  const cal = ((totalWorkSecs / 3600) * 6.0 * bwKg) + ((totalRestSecs / 3600) * 1.5 * bwKg);
  return Math.round(cal);
};

/**
 * アチーブメント (1RM & Volume更新) の算出
 */
export const computeAchievements = (
  exercises: WorkoutExercise[],
  pastSets: PastSet[],
  bodyWeight: number
): { updated1RMs: AchievementItem[]; updatedVolumes: AchievementItem[] } => {
  const updated1RMs: AchievementItem[] = [];
  const updatedVolumes: AchievementItem[] = [];

  exercises.forEach(ex => {
    const completedSets = ex.sets.filter(s => s.is_completed);
    if (completedSets.length === 0) return;

    // 現在の最大1RM
    let currentMax1RM = 0;
    completedSets.forEach(s => {
      const w = s.weight ?? 0;
      const r = s.reps ?? 0;
      if (r > 0) {
        const rm = r === 1 ? w : Math.round(w * (1 + r / 30));
        if (rm > currentMax1RM) currentMax1RM = rm;
      }
    });

    // 現在のボリューム
    const exBw = (ex.equipment === '自重' && bodyWeight) ? bodyWeight : 0;
    const currentVolume = completedSets.reduce((sum, s) => sum + ((s.weight ?? 0) + exBw) * (s.reps ?? 0), 0);

    // 過去の該当エクササイズのセットデータ
    const exercisePastSets = pastSets.filter(s => s.exercise_id === ex.exercise_id);

    if (exercisePastSets.length > 0) {
      // 過去の最大1RM
      let pastMax1RM = 0;
      exercisePastSets.forEach(s => {
        const w = s.weight ?? 0;
        const r = s.reps ?? 0;
        if (r > 0) {
          const rm = r === 1 ? w : Math.round(w * (1 + r / 30));
          if (rm > pastMax1RM) pastMax1RM = rm;
        }
      });

      if (currentMax1RM > pastMax1RM) {
        updated1RMs.push({ name: ex.name, oldVal: pastMax1RM, newVal: currentMax1RM });
      }

      // 過去の最大ボリューム
      const volumeMap: Record<number, number> = {};
      exercisePastSets.forEach(s => {
        const setVol = ((s.weight ?? 0) + exBw) * (s.reps ?? 0);
        volumeMap[s.workout_id] = (volumeMap[s.workout_id] || 0) + setVol;
      });
      const pastMaxVolume = Math.max(...Object.values(volumeMap), 0);

      if (currentVolume > pastMaxVolume) {
        updatedVolumes.push({ name: ex.name, oldVal: pastMaxVolume, newVal: currentVolume });
      }
    }
  });

  return { updated1RMs, updatedVolumes };
};

/**
 * 継続日数・継続週数（Streak）の算出
 */
export const computeStreaks = (
  dbWorkouts: DBWorkout[]
): { streakDays: number; streakWeeks: number } => {
  const getLocalDateString = (dateOrStr: Date | string) => {
    const d = new Date(dateOrStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  const localDates = new Set<string>();
  const todayStr = getLocalDateString(new Date());
  localDates.add(todayStr);
  dbWorkouts.forEach(w => {
    localDates.add(getLocalDateString(w.start_time));
  });

  const sortedDatesStr = Array.from(localDates).sort((a, b) => b.localeCompare(a));

  // 1) Streak Days
  let streakDays = 1;
  let currentDate = new Date(todayStr + 'T00:00:00');
  while (true) {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    if (localDates.has(yesterdayStr)) {
      streakDays++;
      currentDate = yesterday;
    } else {
      break;
    }
  }

  // 2) Streak Weeks
  const datesParsed = sortedDatesStr.map(dStr => new Date(dStr + 'T00:00:00')).sort((a, b) => b.getTime() - a.getTime());
  let continuousEarliestDate = datesParsed[0];
  for (let i = 1; i < datesParsed.length; i++) {
    const prevDate = datesParsed[i - 1];
    const currDate = datesParsed[i];
    const diffTime = prevDate.getTime() - currDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) {
      continuousEarliestDate = currDate;
    } else {
      break;
    }
  }
  const totalSpanTime = datesParsed[0].getTime() - continuousEarliestDate.getTime();
  const totalSpanDays = Math.round(totalSpanTime / (1000 * 60 * 60 * 24));
  const streakWeeks = Math.floor(totalSpanDays / 7) + 1;

  return { streakDays, streakWeeks };
};
