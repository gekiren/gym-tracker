import { getDB, saveSetting, getSettingValue } from '../db/database';
import { Alert } from 'react-native';

export interface RescueResult {
  rescued: boolean;
  workoutCount: number;
  setCount: number;
  mealCount: number;
  waterCount: number;
  sourceFile?: string;
  message: string;
}

/**
 * 2026年9月13日の失われたワークアウトおよび食事データを直接安全にメインDBへ再注入・完全復元する
 */
export const rescueSeptember13Data = async (): Promise<RescueResult> => {
  console.log('[RESCUE_20260913] Starting deterministic rescue for 2026-09-13 data...');

  try {
    const isDone = await getSettingValue('rescue_20260913_v2_done');
    if (isDone === 'true') {
      console.log('[RESCUE_20260913] Rescue v2 already completed in previous run. Skipping.');
      return { rescued: false, workoutCount: 0, setCount: 0, mealCount: 0, waterCount: 0, message: 'Already rescued' };
    }
  } catch (e) {
    console.warn('[RESCUE_20260913] Could not read rescue flag, proceeding anyway:', e);
  }

  const mainDb = getDB();

  // 1. 事前データチェック（※SQLiteデッドロック防止のため、すべてのSELECTクエリはトランザクション外で実行）
  let shouldInsertWorkout = false;
  let shouldInsertMeals = false;

  try {
    const existingWorkout = await mainDb.getFirstAsync<{ id: number }>(
      "SELECT id FROM workouts WHERE start_time LIKE '2026-09-13%' OR id = 67"
    );
    if (!existingWorkout) {
      shouldInsertWorkout = true;
    } else {
      console.log('[RESCUE_20260913] Workout for 2026-09-13 already exists with id:', existingWorkout.id);
    }

    const existingMeals = await mainDb.getAllAsync<{ id: number }>(
      "SELECT id FROM meal_logs WHERE date LIKE '%2026-09-13%' OR date LIKE '%2026/09/13%'"
    );
    if (!existingMeals || existingMeals.length === 0) {
      shouldInsertMeals = true;
    } else {
      console.log('[RESCUE_20260913] Meals for 2026-09-13 already exist, count:', existingMeals.length);
    }
  } catch (checkErr) {
    console.warn('[RESCUE_20260913] Error during pre-check, proceeding safely:', checkErr);
  }

  if (!shouldInsertWorkout && !shouldInsertMeals) {
    console.log('[RESCUE_20260913] All target data already present.');
    await saveSetting('rescue_20260913_v2_done', 'true');
    await saveSetting('rescue_20260913_done', 'true');
    return { rescued: false, workoutCount: 0, setCount: 0, mealCount: 0, waterCount: 0, message: 'Data already exists' };
  }

  // 2. 種目IDの事前解決（トランザクション外で解決・必要時作成）
  const getOrCreateExerciseId = async (name: string, defaultGroup: string, defaultEquip: string): Promise<number> => {
    try {
      const row = await mainDb.getFirstAsync<{ id: number }>(
        'SELECT id FROM exercises WHERE name = ? OR name LIKE ?',
        [name, `%${name}%`]
      );
      if (row?.id) return row.id;

      const res = await mainDb.runAsync(
        'INSERT INTO exercises (name, target_muscle_group, equipment) VALUES (?, ?, ?)',
        [name, defaultGroup, defaultEquip]
      );
      return res.lastInsertRowId;
    } catch (e) {
      console.warn(`[RESCUE_20260913] Error getting/creating exercise for ${name}:`, e);
      return 1;
    }
  };

  const deadliftId = await getOrCreateExerciseId('デッドリフト', '背中', 'バーベル');
  const bRowId = await getOrCreateExerciseId('ベントオーバーロウ', '背中', 'バーベル');
  const pullUpId = await getOrCreateExerciseId('懸垂', '背中', '自重');
  const treadmillId = await getOrCreateExerciseId('トレッドミル', '有酸素', 'マシン');

  // ID採番用
  const maxWeRow = await mainDb.getFirstAsync<{ max_id: number }>('SELECT COALESCE(MAX(id), 0) as max_id FROM workout_exercises');
  let currentWeId = (maxWeRow?.max_id ?? 0);

  const maxSetRow = await mainDb.getFirstAsync<{ max_id: number }>('SELECT COALESCE(MAX(id), 0) as max_id FROM workout_sets');
  let currentSetId = (maxSetRow?.max_id ?? 0);

  const maxMealRow = await mainDb.getFirstAsync<{ max_id: number }>('SELECT COALESCE(MAX(id), 0) as max_id FROM meal_logs');
  let currentMealId = (maxMealRow?.max_id ?? 0);

  let insertedWorkouts = 0;
  let insertedSets = 0;
  let insertedMeals = 0;

  // 3. トランザクション内で同期的・逐次的にrunAsyncを実行（デッドロック皆無）
  await mainDb.withTransactionAsync(async () => {
    if (shouldInsertWorkout) {
      const workoutId = 67;
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workouts (id, title, start_time, end_time, notes, calories) VALUES (?, ?, ?, ?, ?, ?)',
        [workoutId, 'フリーワークアウト', '2026-09-13T04:43:15.701Z', '2026-09-13T05:15:00.000Z', null, 0]
      );
      insertedWorkouts = 1;

      // ── 種目1: デッドリフト (8 sets) ──
      currentWeId += 1;
      const weDeadliftId = currentWeId;
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workout_exercises (id, workout_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)',
        [weDeadliftId, workoutId, deadliftId, 0]
      );

      const deadliftSets = [
        { set_number: 1, reps: 1, weight: 90.0, rpe: null, stance: 'ナロー', work_seconds: 0, rest_seconds: 90 },
        { set_number: 2, reps: 3, weight: 110.0, rpe: null, stance: 'ナロー', work_seconds: 0, rest_seconds: 90 },
        { set_number: 3, reps: 1, weight: 120.0, rpe: null, stance: 'ナロー', work_seconds: 58, rest_seconds: 90 },
        { set_number: 4, reps: 2, weight: 127.5, rpe: 9.0, stance: 'ナロー', work_seconds: 134, rest_seconds: 90 },
        { set_number: 5, reps: 1, weight: 127.5, rpe: 9.0, stance: 'ナロー', work_seconds: 64, rest_seconds: 180 },
        { set_number: 6, reps: 1, weight: 120.0, rpe: 9.0, stance: 'ナロー', work_seconds: 163, rest_seconds: 90 },
        { set_number: 7, reps: 6, weight: 90.0, rpe: 8.0, stance: 'ナロー', work_seconds: 140, rest_seconds: 90 },
        { set_number: 8, reps: 7, weight: 90.0, rpe: 8.0, stance: 'ワイド', work_seconds: 108, rest_seconds: 90 },
      ];

      for (const s of deadliftSets) {
        currentSetId += 1;
        await mainDb.runAsync(
          'INSERT OR REPLACE INTO workout_sets (id, workout_exercise_id, set_number, reps, weight, rpe, is_completed, rest_seconds, work_seconds, speed, incline, side, variation, stance) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, null, null, null, null, ?)',
          [currentSetId, weDeadliftId, s.set_number, s.reps, s.weight, s.rpe, s.rest_seconds, s.work_seconds, s.stance]
        );
        insertedSets += 1;
      }

      // ── 種目2: ベントオーバーロウ (1 set) ──
      currentWeId += 1;
      const weRowId = currentWeId;
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workout_exercises (id, workout_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)',
        [weRowId, workoutId, bRowId, 1]
      );

      currentSetId += 1;
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workout_sets (id, workout_exercise_id, set_number, reps, weight, rpe, is_completed, rest_seconds, work_seconds, speed, incline, side, variation, stance) VALUES (?, ?, 1, 3, 60.0, null, 1, 90, 168, null, null, null, null, null)',
        [currentSetId, weRowId]
      );
      insertedSets += 1;

      // ── 種目3: 懸垂 (1 set) ──
      currentWeId += 1;
      const wePullUpId = currentWeId;
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workout_exercises (id, workout_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)',
        [wePullUpId, workoutId, pullUpId, 2]
      );

      currentSetId += 1;
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workout_sets (id, workout_exercise_id, set_number, reps, weight, rpe, is_completed, rest_seconds, work_seconds, speed, incline, side, variation, stance) VALUES (?, ?, 1, 3, null, null, 1, 90, 8, null, null, null, null, ?)',
        [currentSetId, wePullUpId, '順手']
      );
      insertedSets += 1;

      // ── 種目4: トレッドミル (1 set) ──
      currentWeId += 1;
      const weTreadmillId = currentWeId;
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workout_exercises (id, workout_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)',
        [weTreadmillId, workoutId, treadmillId, 3]
      );

      currentSetId += 1;
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workout_sets (id, workout_exercise_id, set_number, reps, weight, rpe, is_completed, rest_seconds, work_seconds, speed, incline, side, variation, stance) VALUES (?, ?, 1, null, null, null, 1, 465, 120, null, null, null, null, null)',
        [currentSetId, weTreadmillId]
      );
      insertedSets += 1;
    }

    if (shouldInsertMeals) {
      // 食事1: 天下一品 ラーメン (18:12)
      currentMealId += 1;
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO meal_logs (id, date, meal_type, meal_time, name, calories, protein, fat, carbs, sodium, fiber, photo_url, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null, ?)',
        [currentMealId, '2026-09-13', 'dinner', '18:12', 'サンヨー食品 天下一品 ラーメン', 375, 14.8, 9.4, 57.9, 5.4, 0, 1789300376000]
      );
      insertedMeals += 1;

      // 食事2: 旨塩で食べる！蒸し鶏オクラ (18:26)
      currentMealId += 1;
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO meal_logs (id, date, meal_type, meal_time, name, calories, protein, fat, carbs, sodium, fiber, photo_url, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null, ?)',
        [currentMealId, '2026-09-13', 'dinner', '18:26', '旨塩で食べる！蒸し鶏オクラ', 126, 7.5, 8.0, 7.9, 1.6, 0, 1789301201000]
      );
      insertedMeals += 1;
    }
  });

  // 4. daily_record_map の更新
  try {
    const rawMap = await getSettingValue('daily_record_map');
    let mapObj: Record<string, string[]> = rawMap ? JSON.parse(rawMap) : {};
    
    const dates = ['2026/09/13', '2026-09-13'];
    for (const d of dates) {
      const currentItems = new Set(mapObj[d] || []);
      if (insertedWorkouts > 0 || !shouldInsertWorkout) currentItems.add('workout');
      if (insertedMeals > 0 || !shouldInsertMeals) currentItems.add('nutrition');
      mapObj[d] = Array.from(currentItems);
    }
    
    await saveSetting('daily_record_map', JSON.stringify(mapObj));
  } catch (mapErr) {
    console.warn('[RESCUE_20260913] Failed to update daily_record_map:', mapErr);
  }

  // 5. 完了フラグの保存
  await saveSetting('rescue_20260913_v2_done', 'true');
  await saveSetting('rescue_20260913_done', 'true');

  console.log(`[RESCUE_20260913] Successfully restored: workouts=${insertedWorkouts}, sets=${insertedSets}, meals=${insertedMeals}`);

  Alert.alert(
    'データ復旧完了',
    `本日（9月13日）のデータを完全復旧しました。\n・ワークアウト: ${insertedWorkouts}件 (${insertedSets}セット)\n・食事記録: ${insertedMeals}件 (501 kcal)`
  );

  return {
    rescued: true,
    workoutCount: insertedWorkouts,
    setCount: insertedSets,
    mealCount: insertedMeals,
    waterCount: 0,
    sourceFile: 'deterministic_dataset',
    message: 'Success'
  };
};
