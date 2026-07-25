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
/**
 * Hermes 互換の安全な Date パース関数
 */
const parseDateSafe = (dateOrStr: Date | string | null | undefined): Date => {
  if (!dateOrStr) return new Date();
  if (dateOrStr instanceof Date) return isNaN(dateOrStr.getTime()) ? new Date() : dateOrStr;

  const str = String(dateOrStr).trim();

  // YYYY-MM-DD 形式
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // YYYY/MM/DD 形式
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
    const [y, m, d] = str.split('/').map(Number);
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // フォールバック: ISO文字列から数値抽出
  const match = str.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2}))?/);
  if (match) {
    const [, y, m, d, hh, mm, ss] = match;
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      hh ? Number(hh) : 0,
      mm ? Number(mm) : 0,
      ss ? Number(ss) : 0
    );
  }

  return new Date();
};

const getLocalDateStringSafe = (dateOrStr: Date | string | null | undefined): string => {
  const d = parseDateSafe(dateOrStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

/**
 * 継続日数・継続週数（Streak）の算出
 */
export const computeStreaks = (
  dbWorkouts: DBWorkout[]
): { streakDays: number; streakWeeks: number } => {
  try {
    const localDates = new Set<string>();
    const todayStr = getLocalDateStringSafe(new Date());
    localDates.add(todayStr);

    if (Array.isArray(dbWorkouts)) {
      dbWorkouts.forEach(w => {
        if (w && w.start_time) {
          localDates.add(getLocalDateStringSafe(w.start_time));
        }
      });
    }

    const sortedDatesStr = Array.from(localDates).sort((a, b) => b.localeCompare(a));

    // 1) Streak Days
    let streakDays = 1;
    let currentDate = parseDateSafe(todayStr);
    while (true) {
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateStringSafe(yesterday);
      if (localDates.has(yesterdayStr)) {
        streakDays++;
        currentDate = yesterday;
      } else {
        break;
      }
    }

    // 2) Streak Weeks
    const datesParsed = sortedDatesStr
      .map(dStr => parseDateSafe(dStr))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());

    if (datesParsed.length === 0) {
      return { streakDays: 1, streakWeeks: 1 };
    }

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
    const streakWeeks = Math.max(1, Math.floor(totalSpanDays / 7) + 1);

    return { streakDays, streakWeeks };
  } catch (e) {
    console.warn('Failed to compute streaks safely', e);
    return { streakDays: 1, streakWeeks: 1 };
  }
};

/**
 * 過去1週間（含む今日）のワークアウト実施回数を算出
 */
export const computeWeeklyWorkoutCount = (
  dbWorkouts: DBWorkout[],
  currentWorkoutStartTime: string
): number => {
  try {
    const currentLocalDateStr = getLocalDateStringSafe(currentWorkoutStartTime);
    const baseDate = parseDateSafe(currentLocalDateStr);

    // 今日からさかのぼって6日前まで（合計7日間）のローカル日付のセットを作成
    const last7DaysSet = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      last7DaysSet.add(getLocalDateStringSafe(d));
    }

    let count = 0;
    // 今回完了したワークアウトも含めてカウント
    const allWorkouts = [
      { start_time: currentWorkoutStartTime },
      ...(Array.isArray(dbWorkouts) ? dbWorkouts : [])
    ];

    allWorkouts.forEach(w => {
      if (w && w.start_time) {
        const wDateStr = getLocalDateStringSafe(w.start_time);
        if (last7DaysSet.has(wDateStr)) {
          count++;
        }
      }
    });

    return count;
  } catch (e) {
    console.warn('Failed to compute weekly workout count safely', e);
    return 1;
  }
};


