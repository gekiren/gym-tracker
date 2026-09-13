import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
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
 * 端末内のバックアップディレクトリを網羅的に走査し、
 * 9月13日のワークアウトおよびライフログデータを抽出してメインDBへ復元する
 */
export const rescueSeptember13Data = async (): Promise<RescueResult> => {
  console.log('[RESCUE_20260913] Starting rescue process for 2026-09-13 data...');

  try {
    const isDone = await getSettingValue('rescue_20260913_done');
    if (isDone === 'true') {
      console.log('[RESCUE_20260913] Rescue already completed in previous run. Skipping.');
      return { rescued: false, workoutCount: 0, setCount: 0, mealCount: 0, waterCount: 0, message: 'Already rescued' };
    }
  } catch (e) {
    console.warn('[RESCUE_20260913] Could not read rescue flag, proceeding anyway:', e);
  }

  const backupDir = `${FileSystem.documentDirectory}backups/`;
  const dirInfo = await FileSystem.getInfoAsync(backupDir);
  if (!dirInfo.exists) {
    console.warn('[RESCUE_20260913] Backup directory does not exist:', backupDir);
    return { rescued: false, workoutCount: 0, setCount: 0, mealCount: 0, waterCount: 0, message: 'No backup directory' };
  }

  let files: string[] = [];
  try {
    files = await FileSystem.readDirectoryAsync(backupDir);
    console.log('[RESCUE_20260913] Found files in backups dir:', files);
  } catch (e) {
    console.error('[RESCUE_20260913] Failed to read backup directory:', e);
    return { rescued: false, workoutCount: 0, setCount: 0, mealCount: 0, waterCount: 0, message: 'Failed to read dir' };
  }

  const dbFiles = files.filter(f => f.endsWith('.db'));
  if (dbFiles.length === 0) {
    console.warn('[RESCUE_20260913] No .db backup files found.');
    return { rescued: false, workoutCount: 0, setCount: 0, mealCount: 0, waterCount: 0, message: 'No db files' };
  }

  const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
  const tempDbName = 'rescue_inspect.db';
  const tempDbPath = `${sqliteDir}${tempDbName}`;

  let bestSourceFile = '';
  let foundWorkouts: any[] = [];
  let foundExercises: any[] = [];
  let foundSets: any[] = [];
  let foundMeals: any[] = [];
  let foundWater: any[] = [];

  // 各バックアップファイルを順次検査
  for (const dbFile of dbFiles) {
    const srcPath = `${backupDir}${dbFile}`;
    console.log(`[RESCUE_20260913] Inspecting backup candidate: ${dbFile}`);

    let inspectDb: SQLite.SQLiteDatabase | null = null;
    try {
      // 既存のテンポラリDBを削除してコピー
      await FileSystem.deleteAsync(tempDbPath, { idempotent: true }).catch(() => {});
      await FileSystem.copyAsync({ from: srcPath, to: tempDbPath });

      inspectDb = await SQLite.openDatabaseAsync(tempDbName);

      // 9月13日のワークアウトを検索（id=67 または start_time が 2026-09-13）
      const workouts = await inspectDb.getAllAsync<any>(
        "SELECT * FROM workouts WHERE id = 67 OR start_time LIKE '2026-09-13%' ORDER BY id DESC"
      );

      console.log(`[RESCUE_20260913] ${dbFile} has ${workouts.length} target workouts`);

      if (workouts.length > foundWorkouts.length) {
        // より多くのターゲットデータを持つバックアップを採用
        foundWorkouts = workouts;
        bestSourceFile = dbFile;

        // 紐づく exercise と set を取得
        const workoutIds = workouts.map(w => w.id);
        const placeholders = workoutIds.map(() => '?').join(',');

        foundExercises = await inspectDb.getAllAsync<any>(
          `SELECT * FROM workout_exercises WHERE workout_id IN (${placeholders}) ORDER BY id ASC`,
          workoutIds
        );

        if (foundExercises.length > 0) {
          const weIds = foundExercises.map(we => we.id);
          const wePlaceholders = weIds.map(() => '?').join(',');
          foundSets = await inspectDb.getAllAsync<any>(
            `SELECT * FROM workout_sets WHERE workout_exercise_id IN (${wePlaceholders}) ORDER BY id ASC`,
            weIds
          );
        } else {
          foundSets = [];
        }

        // 食事データも取得
        try {
          foundMeals = await inspectDb.getAllAsync<any>(
            "SELECT * FROM meal_logs WHERE date LIKE '%2026-09-13%' OR date LIKE '%2026/09/13%' ORDER BY id ASC"
          );
        } catch (_) {}

        // 水分データも取得
        try {
          foundWater = await inspectDb.getAllAsync<any>(
            "SELECT * FROM water_logs WHERE date LIKE '%2026-09-13%' OR date LIKE '%2026/09/13%' ORDER BY id ASC"
          );
        } catch (_) {}
      }
    } catch (err) {
      console.warn(`[RESCUE_20260913] Error inspecting ${dbFile}:`, err);
    } finally {
      if (inspectDb) {
        try {
          await inspectDb.closeAsync();
        } catch (_) {}
      }
      await FileSystem.deleteAsync(tempDbPath, { idempotent: true }).catch(() => {});
    }
  }

  if (foundWorkouts.length === 0 && foundMeals.length === 0 && foundWater.length === 0) {
    console.log('[RESCUE_20260913] No 2026-09-13 records found in any backup files.');
    // 救出完了フラグを立てて再検索ループを防ぐ
    await saveSetting('rescue_20260913_done', 'true');
    return {
      rescued: false,
      workoutCount: 0,
      setCount: 0,
      mealCount: 0,
      waterCount: 0,
      message: 'No Sep 13 records found in backups'
    };
  }

  // メインDBへマージ
  console.log(`[RESCUE_20260913] Found data in ${bestSourceFile}: workouts=${foundWorkouts.length}, exercises=${foundExercises.length}, sets=${foundSets.length}, meals=${foundMeals.length}, water=${foundWater.length}`);

  const mainDb = getDB();

  await mainDb.withTransactionAsync(async () => {
    // 1. Workouts
    for (const w of foundWorkouts) {
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workouts (id, title, start_time, end_time, notes, calories) VALUES (?, ?, ?, ?, ?, ?)',
        [w.id, w.title, w.start_time, w.end_time, w.notes, w.calories]
      );
    }

    // 2. Workout Exercises
    for (const we of foundExercises) {
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workout_exercises (id, workout_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)',
        [we.id, we.workout_id, we.exercise_id, we.sort_order]
      );
    }

    // 3. Workout Sets
    for (const s of foundSets) {
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO workout_sets (id, workout_exercise_id, set_number, reps, weight, rpe, is_completed, rest_seconds, work_seconds, speed, incline, side, variation, stance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          s.id,
          s.workout_exercise_id,
          s.set_number,
          s.reps,
          s.weight,
          s.rpe,
          s.is_completed,
          s.rest_seconds,
          s.work_seconds,
          s.speed,
          s.incline,
          s.side,
          s.variation,
          s.stance
        ]
      );
    }

    // 4. Meals
    for (const m of foundMeals) {
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO meal_logs (id, date, meal_type, meal_time, name, calories, protein, fat, carbs, sodium, fiber, photo_url, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [m.id, m.date, m.meal_type, m.meal_time, m.name, m.calories, m.protein, m.fat, m.carbs, m.sodium, m.fiber, m.photo_url, m.memo, m.created_at]
      );
    }

    // 5. Water
    for (const wt of foundWater) {
      await mainDb.runAsync(
        'INSERT OR REPLACE INTO water_logs (id, amount, timestamp, date, caffeine) VALUES (?, ?, ?, ?, ?)',
        [wt.id, wt.amount, wt.timestamp, wt.date, wt.caffeine]
      );
    }
  });

  // daily_record_map を更新
  try {
    const rawMap = await getSettingValue('daily_record_map');
    let mapObj: Record<string, string[]> = rawMap ? JSON.parse(rawMap) : {};
    if (foundWorkouts.length > 0) {
      mapObj['2026/09/13'] = Array.from(new Set([...(mapObj['2026/09/13'] || []), 'workout']));
    }
    if (foundMeals.length > 0) {
      mapObj['2026-09-13'] = Array.from(new Set([...(mapObj['2026-09-13'] || []), 'nutrition']));
    }
    await saveSetting('daily_record_map', JSON.stringify(mapObj));
  } catch (mapErr) {
    console.warn('[RESCUE_20260913] Failed to update daily_record_map:', mapErr);
  }

  // 救出成功フラグを保存
  await saveSetting('rescue_20260913_done', 'true');

  console.log('[RESCUE_20260913] Successfully restored 2026-09-13 data into main database!');

  Alert.alert(
    'データ復旧完了',
    `本日（9月13日）のデータをバックアップから復旧しました。\n・ワークアウト: ${foundWorkouts.length}件 (${foundSets.length}セット)\n・食事記録: ${foundMeals.length}件\n・水分補給: ${foundWater.length}件`
  );

  return {
    rescued: true,
    workoutCount: foundWorkouts.length,
    setCount: foundSets.length,
    mealCount: foundMeals.length,
    waterCount: foundWater.length,
    sourceFile: bestSourceFile,
    message: 'Success'
  };
};
