import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { getDB, saveSetting, getSettingValue } from '../db/database';
import { Alert } from 'react-native';

export interface RescueResult {
  rescued: boolean;
  workoutCount: number;
  setCount: number;
  mealCount: number;
  totalCalories: number;
  waterCount: number;
  sourceFile?: string;
  message: string;
}

export interface MealRecord {
  id?: number;
  date: string;
  meal_type: string;
  meal_time: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
  fiber: number;
  photo_url?: string | null;
  memo?: string | null;
  created_at?: number;
}

/**
 * 2026年9月13日の失われたワークアウトおよび全食事データを網羅的フォレンジックスキャンし完全復元する (v3)
 */
export const rescueSeptember13Data = async (): Promise<RescueResult> => {
  console.log('[RESCUE_20260913] Starting comprehensive forensic rescue (v3) for 2026-09-13 data...');

  try {
    const isDone = await getSettingValue('rescue_20260913_v3_done');
    if (isDone === 'true') {
      console.log('[RESCUE_20260913] Rescue v3 already completed. Skipping.');
      return {
        rescued: false,
        workoutCount: 0,
        setCount: 0,
        mealCount: 0,
        totalCalories: 0,
        waterCount: 0,
        message: 'Already rescued (v3)',
      };
    }
  } catch (e) {
    console.warn('[RESCUE_20260913] Could not read rescue flag, proceeding anyway:', e);
  }

  const mainDb = getDB();

  // 1. 事前データチェック（メインDB）
  let shouldInsertWorkout = false;
  let existingMeals: MealRecord[] = [];

  try {
    const existingWorkout = await mainDb.getFirstAsync<{ id: number }>(
      "SELECT id FROM workouts WHERE start_time LIKE '2026-09-13%' OR id = 67"
    );
    if (!existingWorkout) {
      shouldInsertWorkout = true;
    } else {
      console.log('[RESCUE_20260913] Workout for 2026-09-13 already exists with id:', existingWorkout.id);
    }

    existingMeals = await mainDb.getAllAsync<MealRecord>(
      "SELECT * FROM meal_logs WHERE date LIKE '%2026-09-13%' OR date LIKE '%2026/09/13%' ORDER BY id ASC"
    );
    console.log('[RESCUE_20260913] Existing meals in mainDb for 2026-09-13:', existingMeals.length);
  } catch (checkErr) {
    console.warn('[RESCUE_20260913] Error during pre-check:', checkErr);
  }

  // 2. バックアップファイルの網羅的フォレンジックスキャン
  const backupDir = `${FileSystem.documentDirectory}backups/`;
  const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
  const tempDbName = 'temp_forensic_inspect.db';
  const tempDbPath = `${sqliteDir}${tempDbName}`;

  const forensicSummary: Record<string, any> = {
    scannedBackups: [],
    foundSep13Meals: [],
    mainDbExistingMeals: existingMeals,
    favorites: [],
    recentMealsFromMain: [],
  };

  const candidateMealsMap = new Map<string, MealRecord>();

  // 既知の夕食2件（天下一品・オクラ）を初期候補として登録
  const defaultDinner1: MealRecord = {
    date: '2026-09-13',
    meal_type: 'dinner',
    meal_time: '18:12',
    name: 'サンヨー食品 天下一品 ラーメン',
    calories: 375,
    protein: 14.8,
    fat: 9.4,
    carbs: 57.9,
    sodium: 5.4,
    fiber: 0,
    created_at: 1789300376000,
  };
  const defaultDinner2: MealRecord = {
    date: '2026-09-13',
    meal_type: 'dinner',
    meal_time: '18:26',
    name: '旨塩で食べる！蒸し鶏オクラ',
    calories: 126,
    protein: 7.5,
    fat: 8.0,
    carbs: 7.9,
    sodium: 1.6,
    fiber: 0,
    created_at: 1789301201000,
  };
  candidateMealsMap.set(`${defaultDinner1.meal_time}_${defaultDinner1.name}`, defaultDinner1);
  candidateMealsMap.set(`${defaultDinner2.meal_time}_${defaultDinner2.name}`, defaultDinner2);

  try {
    const dirInfo = await FileSystem.getInfoAsync(backupDir);
    if (dirInfo.exists) {
      const allFiles = await FileSystem.readDirectoryAsync(backupDir);
      const dbFiles = allFiles.filter((f) => f.endsWith('.db'));
      console.log('[RESCUE_20260913] Found backup DB files:', dbFiles);

      for (const dbFile of dbFiles) {
        const srcPath = `${backupDir}${dbFile}`;
        let inspectDb: SQLite.SQLiteDatabase | null = null;
        try {
          await FileSystem.deleteAsync(tempDbPath, { idempotent: true }).catch(() => {});
          await FileSystem.copyAsync({ from: srcPath, to: tempDbPath });
          inspectDb = await SQLite.openDatabaseAsync(tempDbName);

          // 9月13日の食事データを無条件検索
          const sep13Meals = await inspectDb.getAllAsync<MealRecord>(
            "SELECT * FROM meal_logs WHERE date LIKE '%2026-09-13%' OR date LIKE '%2026/09/13%' ORDER BY id ASC"
          );

          // 直近の食事データ検索
          const recentMeals = await inspectDb.getAllAsync<MealRecord>(
            'SELECT * FROM meal_logs ORDER BY id DESC LIMIT 15'
          );

          // お気に入り検索
          let favs: any[] = [];
          try {
            favs = await inspectDb.getAllAsync('SELECT * FROM meal_favorites');
          } catch (_) {}

          forensicSummary.scannedBackups.push({
            file: dbFile,
            sep13MealCount: sep13Meals.length,
            sep13Meals,
            recentMealCount: recentMeals.length,
            recentMeals,
            favoriteCount: favs.length,
          });

          for (const m of sep13Meals) {
            const key = `${m.meal_time || ''}_${m.name}`;
            if (!candidateMealsMap.has(key)) {
              candidateMealsMap.set(key, m);
              forensicSummary.foundSep13Meals.push({ source: dbFile, meal: m });
            }
          }
        } catch (inspectErr) {
          console.warn(`[RESCUE_20260913] Error inspecting ${dbFile}:`, inspectErr);
        } finally {
          if (inspectDb) {
            try {
              await inspectDb.closeAsync();
            } catch (_) {}
          }
          await FileSystem.deleteAsync(tempDbPath, { idempotent: true }).catch(() => {});
        }
      }
    }
  } catch (fsErr) {
    console.warn('[RESCUE_20260913] FileSystem scan error:', fsErr);
  }

  // メインDBのお気に入り・履歴も取得してフォレンジックに同梱
  try {
    forensicSummary.favorites = await mainDb.getAllAsync('SELECT * FROM meal_favorites');
  } catch (_) {}
  try {
    forensicSummary.recentMealsFromMain = await mainDb.getAllAsync(
      'SELECT * FROM meal_logs ORDER BY id DESC LIMIT 20'
    );
  } catch (_) {}

  console.log('[MEAL_FORENSICS_RESULT]', JSON.stringify(forensicSummary, null, 2));

  // 3. 挿入対象の食事レコードを確定（既存レコードとの差分抽出）
  const existingKeys = new Set(
    existingMeals.map((m) => `${m.meal_time || ''}_${m.name}`)
  );

  const mealsToInsert: MealRecord[] = [];
  for (const [key, meal] of candidateMealsMap.entries()) {
    if (!existingKeys.has(key)) {
      mealsToInsert.push(meal);
    }
  }

  console.log(`[RESCUE_20260913] Candidate meals: ${candidateMealsMap.size}, Existing: ${existingMeals.length}, To insert: ${mealsToInsert.length}`);

  // 4. 種目IDの事前解決（ワークアウト挿入が必要な場合のみ）
  let deadliftId = 1, bRowId = 1, pullUpId = 1, treadmillId = 1;
  if (shouldInsertWorkout) {
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

    deadliftId = await getOrCreateExerciseId('デッドリフト', '背中', 'バーベル');
    bRowId = await getOrCreateExerciseId('ベントオーバーロウ', '背中', 'バーベル');
    pullUpId = await getOrCreateExerciseId('懸垂', '背中', '自重');
    treadmillId = await getOrCreateExerciseId('トレッドミル', '有酸素', 'マシン');
  }

  // ID採番用（トランザクション外で取得）
  const maxWeRow = await mainDb.getFirstAsync<{ max_id: number }>('SELECT COALESCE(MAX(id), 0) as max_id FROM workout_exercises');
  let currentWeId = (maxWeRow?.max_id ?? 0);

  const maxSetRow = await mainDb.getFirstAsync<{ max_id: number }>('SELECT COALESCE(MAX(id), 0) as max_id FROM workout_sets');
  let currentSetId = (maxSetRow?.max_id ?? 0);

  const maxMealRow = await mainDb.getFirstAsync<{ max_id: number }>('SELECT COALESCE(MAX(id), 0) as max_id FROM meal_logs');
  let currentMealId = (maxMealRow?.max_id ?? 0);

  let insertedWorkouts = 0;
  let insertedSets = 0;
  let insertedMeals = 0;

  // 5. トランザクション内で同期的・逐次的にrunAsyncを実行（デッドロック皆無）
  if (shouldInsertWorkout || mealsToInsert.length > 0) {
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

      // 食事データの挿入
      for (const m of mealsToInsert) {
        currentMealId += 1;
        const targetId = m.id && m.id > currentMealId ? m.id : currentMealId;
        await mainDb.runAsync(
          'INSERT OR REPLACE INTO meal_logs (id, date, meal_type, meal_time, name, calories, protein, fat, carbs, sodium, fiber, photo_url, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            targetId,
            m.date || '2026-09-13',
            m.meal_type || 'other',
            m.meal_time || '',
            m.name,
            m.calories || 0,
            m.protein || 0,
            m.fat || 0,
            m.carbs || 0,
            m.sodium || 0,
            m.fiber || 0,
            m.photo_url || null,
            m.memo || null,
            m.created_at || Date.now(),
          ]
        );
        insertedMeals += 1;
      }
    });
  }

  // 6. daily_record_map の更新
  try {
    const rawMap = await getSettingValue('daily_record_map');
    let mapObj: Record<string, string[]> = rawMap ? JSON.parse(rawMap) : {};

    const dates = ['2026/09/13', '2026-09-13'];
    for (const d of dates) {
      const currentItems = new Set(mapObj[d] || []);
      currentItems.add('workout');
      currentItems.add('nutrition');
      mapObj[d] = Array.from(currentItems);
    }

    await saveSetting('daily_record_map', JSON.stringify(mapObj));
  } catch (mapErr) {
    console.warn('[RESCUE_20260913] Failed to update daily_record_map:', mapErr);
  }

  // 7. 完了フラグの保存
  await saveSetting('rescue_20260913_v3_done', 'true');
  await saveSetting('rescue_20260913_v2_done', 'true');
  await saveSetting('rescue_20260913_done', 'true');

  // 全食事の集計（既存 + 新規挿入）
  const totalMealsNow = await mainDb.getAllAsync<MealRecord>(
    "SELECT * FROM meal_logs WHERE date LIKE '%2026-09-13%' OR date LIKE '%2026/09/13%'"
  );
  const totalCal = totalMealsNow.reduce((sum, m) => sum + (m.calories || 0), 0);

  console.log(`[RESCUE_20260913] Finished! Total 2026-09-13 meals in DB: ${totalMealsNow.length}, Total Calories: ${totalCal} kcal`);

  Alert.alert(
    '食事データ復旧完了',
    `9月13日の食事記録を復元しました。\n・登録済み食事: ${totalMealsNow.length}件\n・合計カロリー: ${Math.round(totalCal)} kcal\n（新規復元: ${insertedMeals}件）`
  );

  return {
    rescued: true,
    workoutCount: insertedWorkouts,
    setCount: insertedSets,
    mealCount: totalMealsNow.length,
    totalCalories: totalCal,
    waterCount: 0,
    sourceFile: 'forensic_v3',
    message: 'Success',
  };
};
