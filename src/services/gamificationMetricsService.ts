import { withDBQueue } from '../db/connection';
import { createEmptyMetrics, normalizeDateKey } from '../constants/gamificationConstants';
import { GamificationMetrics } from '../types/gamification';

function parseYmdUtcMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

/**
 * ワークアウト日付群から最長連続週数（7日以内の間隔で継続）を算出する
 */
export function computeMaxStreakWeeksFromDates(dateKeys: Iterable<string>): number {
  const sorted = Array.from(new Set(dateKeys)).filter(Boolean).sort();
  if (sorted.length === 0) return 0;

  let maxWeeks = 1;
  let segmentStartMs = parseYmdUtcMs(sorted[0]);
  let prevMs = segmentStartMs;

  for (let i = 1; i < sorted.length; i++) {
    const currMs = parseYmdUtcMs(sorted[i]);
    const diffDays = Math.round((currMs - prevMs) / 86400000);
    if (diffDays <= 7) {
      const spanDays = Math.round((currMs - segmentStartMs) / 86400000);
      const weeks = Math.floor(spanDays / 7) + 1;
      if (weeks > maxWeeks) maxWeeks = weeks;
    } else {
      segmentStartMs = currMs;
    }
    prevMs = currMs;
  }

  return maxWeeks;
}

/**
 * ルーティン履歴（routine_tracker_data JSON文字列）から実施日セットを抽出する
 */
export function extractRoutineDateSet(rawJson: string | null | undefined): Set<string> {
  const dates = new Set<string>();
  if (!rawJson) return dates;

  try {
    let parsed: any = JSON.parse(rawJson);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    if (!Array.isArray(parsed)) return dates;

    for (const routine of parsed) {
      if (routine && Array.isArray(routine.history)) {
        for (const h of routine.history) {
          if (h && h.timestamp !== undefined && h.timestamp !== null) {
            dates.add(normalizeDateKey(h.timestamp));
          } else if (h && h.date) {
            dates.add(normalizeDateKey(h.date));
          }
        }
      }
    }
  } catch (e) {
    console.warn('[GamificationMetrics] Failed to parse routine_tracker_data:', e);
  }
  return dates;
}

/**
 * 過去のワークアウト記録からPR更新回数を推定する（レトロアクティブ移行用）
 */
export async function inferHistoricalPrUpdateCount(): Promise<number> {
  try {
    const result = await withDBQueue(async (conn) => {
      const rows = await conn.getAllAsync<{
        workout_id: number;
        start_time: string;
        exercise_id: number;
        weight: number | null;
        reps: number | null;
      }>(`
        SELECT w.id as workout_id, w.start_time, we.exercise_id, ws.weight, ws.reps
        FROM workout_sets ws
        JOIN workout_exercises we ON ws.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        WHERE ws.is_completed = 1
        ORDER BY w.start_time ASC, w.id ASC, we.id ASC, ws.set_number ASC
      `);

      if (!rows || rows.length === 0) return 0;

      // ワークアウト単位 -> 種目単位にまとめる（SQLの順序を保持）
      const workoutsOrdered: {
        workoutId: number;
        exercises: Map<number, { max1RM: number; volume: number }>;
      }[] = [];
      const workoutMap = new Map<
        number,
        { workoutId: number; exercises: Map<number, { max1RM: number; volume: number }> }
      >();

      for (const r of rows) {
        let wEntry = workoutMap.get(r.workout_id);
        if (!wEntry) {
          wEntry = { workoutId: r.workout_id, exercises: new Map() };
          workoutMap.set(r.workout_id, wEntry);
          workoutsOrdered.push(wEntry);
        }

        const w = r.weight ?? 0;
        const rep = r.reps ?? 0;
        const rm = rep > 0 ? (rep === 1 ? w : Math.round(w * (1 + rep / 30))) : 0;
        const vol = w * rep;

        const prevEx = wEntry.exercises.get(r.exercise_id) || { max1RM: 0, volume: 0 };
        wEntry.exercises.set(r.exercise_id, {
          max1RM: Math.max(prevEx.max1RM, rm),
          volume: prevEx.volume + vol,
        });
      }

      const best1RM = new Map<number, number>();
      const bestVolume = new Map<number, number>();
      let prWorkouts = 0;

      for (const wEntry of workoutsOrdered) {
        let hadPrInWorkout = false;
        for (const [exId, stats] of wEntry.exercises.entries()) {
          const hasHistory = best1RM.has(exId) || bestVolume.has(exId);
          const prev1RM = best1RM.get(exId) ?? 0;
          const prevVol = bestVolume.get(exId) ?? 0;

          if (hasHistory) {
            if (stats.max1RM > prev1RM || stats.volume > prevVol) {
              hadPrInWorkout = true;
            }
          }

          if (stats.max1RM > prev1RM) best1RM.set(exId, stats.max1RM);
          if (stats.volume > prevVol) bestVolume.set(exId, stats.volume);
        }

        if (hadPrInWorkout) {
          prWorkouts++;
        }
      }

      return prWorkouts;
    });
    return result ?? 0;
  } catch (e) {
    console.warn('[GamificationMetrics] Failed to infer historical PR count:', e);
    return 0;
  }
}

/**
 * SQLite各テーブルからゲーミフィケーション判定用のメトリクスを非同期集計する
 * （トランザクション内でSELECTを実行せず、単独クエリで安全に集計する）
 */
export async function collectGamificationMetrics(
  weightUnit: string,
  storedPrUpdateCount: number
): Promise<GamificationMetrics> {
  const metrics = createEmptyMetrics();
  metrics.prUpdateCount = Math.max(0, storedPrUpdateCount || 0);

  const result = await withDBQueue(async (conn) => {
    const workoutDates = new Set<string>();
    const waterDates = new Set<string>();
    const nutritionDates = new Set<string>();
    const bodyDates = new Set<string>();
    const habitDates = new Set<string>();
    let routineDates = new Set<string>();
    const zikanDates = new Set<string>();

    // 1. ワークアウト一覧・日付・継続週数
    try {
      const workoutRows = await conn.getAllAsync<{ start_time: string }>(
        'SELECT start_time FROM workouts'
      );
      metrics.workoutCount = workoutRows.length;
      for (const row of workoutRows) {
        if (row.start_time) {
          workoutDates.add(normalizeDateKey(row.start_time));
        }
      }
      metrics.streakWeeks = computeMaxStreakWeeksFromDates(workoutDates);
    } catch (e) {
      console.warn('[GamificationMetrics] workouts query failed:', e);
    }

    // 2. 累計挙上ボリューム（kg換算）
    try {
      const volRow = await conn.getFirstAsync<{ vol: number | null }>(
        'SELECT COALESCE(SUM(COALESCE(weight, 0) * COALESCE(reps, 0)), 0) as vol FROM workout_sets WHERE is_completed = 1'
      );
      const rawVol = volRow?.vol ?? 0;
      metrics.totalVolumeKg =
        weightUnit === 'lbs' ? Math.round(rawVol * 0.453592) : Math.round(rawVol);
    } catch (e) {
      console.warn('[GamificationMetrics] totalVolume query failed:', e);
    }

    // 3. 実施したユニーク種目数
    try {
      const exRow = await conn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(DISTINCT exercise_id) as count FROM workout_exercises'
      );
      metrics.uniqueExerciseCount = exRow?.count ?? 0;
    } catch (e) {
      console.warn('[GamificationMetrics] uniqueExerciseCount query failed:', e);
    }

    // 4. 水分ログ日数
    try {
      const rows = await conn.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM water_logs');
      for (const r of rows) {
        if (r.date) waterDates.add(normalizeDateKey(r.date));
      }
      metrics.waterDays = waterDates.size;
    } catch (e) {
      console.warn('[GamificationMetrics] water_logs query failed:', e);
    }

    // 5. 栄養・食事ログ日数
    try {
      const rows = await conn.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM meal_logs');
      for (const r of rows) {
        if (r.date) nutritionDates.add(normalizeDateKey(r.date));
      }
      metrics.nutritionDays = nutritionDates.size;
    } catch (e) {
      console.warn('[GamificationMetrics] meal_logs query failed:', e);
    }

    // 6. 体組成ログ日数
    try {
      const rows = await conn.getAllAsync<{ date: string }>(
        'SELECT DISTINCT date FROM body_composition_logs'
      );
      for (const r of rows) {
        if (r.date) bodyDates.add(normalizeDateKey(r.date));
      }
      metrics.bodyDays = bodyDates.size;
    } catch (e) {
      console.warn('[GamificationMetrics] body_composition_logs query failed:', e);
    }

    // 7. 習慣ログ総数＆日数
    try {
      const countRow = await conn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM habit_logs'
      );
      metrics.habitLogCount = countRow?.count ?? 0;

      const dateRows = await conn.getAllAsync<{ date: string }>(
        'SELECT DISTINCT date FROM habit_logs'
      );
      for (const r of dateRows) {
        if (r.date) habitDates.add(normalizeDateKey(r.date));
      }
    } catch (e) {
      console.warn('[GamificationMetrics] habit_logs query failed:', e);
    }

    // 8. 24時間管理ログ日数
    try {
      const rows = await conn.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM time_logs');
      for (const r of rows) {
        if (r.date) zikanDates.add(normalizeDateKey(r.date));
      }
      metrics.zikanDays = zikanDates.size;
    } catch (e) {
      console.warn('[GamificationMetrics] time_logs query failed:', e);
    }

    // 9. ルーティン完了日数
    try {
      const routineRow = await conn.getFirstAsync<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'routine_tracker_data'"
      );
      routineDates = extractRoutineDateSet(routineRow?.value);
      metrics.routineDays = routineDates.size;
    } catch (e) {
      console.warn('[GamificationMetrics] routine_tracker_data query failed:', e);
    }

    // 10. 横断集計（累計記録日数・利用機能数・パーフェクトデイ）
    const featureSets = [
      workoutDates,
      waterDates,
      nutritionDates,
      bodyDates,
      habitDates,
      routineDates,
      zikanDates,
    ];

    const allDates = new Set<string>();
    for (const s of featureSets) {
      for (const d of s) {
        allDates.add(d);
      }
    }
    metrics.totalActiveDays = allDates.size;

    let usedFeatures = 0;
    if (metrics.workoutCount > 0 || workoutDates.size > 0) usedFeatures++;
    if (waterDates.size > 0) usedFeatures++;
    if (nutritionDates.size > 0) usedFeatures++;
    if (bodyDates.size > 0) usedFeatures++;
    if (metrics.habitLogCount > 0 || habitDates.size > 0) usedFeatures++;
    if (routineDates.size > 0) usedFeatures++;
    if (zikanDates.size > 0) usedFeatures++;
    metrics.usedFeatureCount = usedFeatures;

    const lifelogSets = [waterDates, nutritionDates, bodyDates, habitDates, routineDates, zikanDates];
    let perfectDays = 0;
    for (const wDate of workoutDates) {
      let otherCount = 0;
      for (const s of lifelogSets) {
        if (s.has(wDate)) otherCount++;
      }
      if (otherCount >= 2) {
        perfectDays++;
      }
    }
    metrics.perfectDayCount = perfectDays;

    return metrics;
  });
  return result ?? metrics;
}

/**
 * 習慣ログが記録されたユニーク日数（レトロアクティブXP計算用）
 */
export async function getDistinctHabitDaysCount(): Promise<number> {
  try {
    const result = await withDBQueue(async (conn) => {
      const row = await conn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(DISTINCT date) as count FROM habit_logs'
      );
      return row?.count ?? 0;
    });
    return result ?? 0;
  } catch {
    return 0;
  }
}
