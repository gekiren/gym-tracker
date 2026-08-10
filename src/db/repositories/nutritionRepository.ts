import { getDB, initDB, withDBQueue } from '../database';
import {
  MealLog,
  MealFavorite,
  NutritionGoals,
  AutophagyConfig,
} from '../types';

// DBが未初期化の場合でも安全にinitDB()を実行してインスタンスを取得するヘルパー
const getSafeDB = async () => {
  try {
    return getDB();
  } catch {
    return await initDB();
  }
};

// ─── 食事ログ (meal_logs) ───────────────────────────────

export const getMealLogsByDate = async (date: string): Promise<MealLog[]> => {
  await getSafeDB();
  return await withDBQueue(async (conn) => {
    return await conn.getAllAsync<MealLog>(
      'SELECT * FROM meal_logs WHERE date = ? ORDER BY created_at ASC',
      [date]
    );
  });
};

export const getAllMealLogs = async (): Promise<MealLog[]> => {
  await getSafeDB();
  return await withDBQueue(async (conn) => {
    return await conn.getAllAsync<MealLog>(
      'SELECT * FROM meal_logs ORDER BY date DESC, created_at DESC'
    );
  });
};

export const addMealLog = async (
  log: Omit<MealLog, 'id'>
): Promise<number> => {
  await getSafeDB();
  return await withDBQueue(async (conn) => {
    const res = await conn.runAsync(
      `INSERT INTO meal_logs
        (date, meal_type, meal_time, name, calories, protein, fat, carbs, sodium, fiber, photo_url, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.date,
        log.meal_type ?? null,
        log.meal_time ?? null,
        log.name,
        log.calories,
        log.protein,
        log.fat,
        log.carbs,
        log.sodium,
        log.fiber,
        log.photo_url ?? null,
        log.memo ?? null,
        log.created_at,
      ]
    );
    return res.lastInsertRowId;
  });
};

export const updateMealLog = async (
  id: number,
  log: Partial<Omit<MealLog, 'id'>>
): Promise<void> => {
  await getSafeDB();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (log.date !== undefined) { fields.push('date = ?'); values.push(log.date); }
  if (log.meal_type !== undefined) { fields.push('meal_type = ?'); values.push(log.meal_type ?? null); }
  if (log.meal_time !== undefined) { fields.push('meal_time = ?'); values.push(log.meal_time ?? null); }
  if (log.name !== undefined) { fields.push('name = ?'); values.push(log.name); }
  if (log.calories !== undefined) { fields.push('calories = ?'); values.push(log.calories); }
  if (log.protein !== undefined) { fields.push('protein = ?'); values.push(log.protein); }
  if (log.fat !== undefined) { fields.push('fat = ?'); values.push(log.fat); }
  if (log.carbs !== undefined) { fields.push('carbs = ?'); values.push(log.carbs); }
  if (log.sodium !== undefined) { fields.push('sodium = ?'); values.push(log.sodium); }
  if (log.fiber !== undefined) { fields.push('fiber = ?'); values.push(log.fiber); }
  if (log.photo_url !== undefined) { fields.push('photo_url = ?'); values.push(log.photo_url ?? null); }
  if (log.memo !== undefined) { fields.push('memo = ?'); values.push(log.memo ?? null); }

  if (fields.length === 0) return;
  values.push(id);

  await withDBQueue(async (conn) => {
    await conn.runAsync(
      `UPDATE meal_logs SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  });
};

export const deleteMealLog = async (id: number): Promise<void> => {
  await getSafeDB();
  await withDBQueue(async (conn) => {
    await conn.runAsync('DELETE FROM meal_logs WHERE id = ?', [id]);
  });
};

// ─── お気に入り (meal_favorites) ───────────────────────

export const getFavorites = async (): Promise<MealFavorite[]> => {
  await getSafeDB();
  return await withDBQueue(async (conn) => {
    return await conn.getAllAsync<MealFavorite>(
      'SELECT * FROM meal_favorites ORDER BY created_at DESC'
    );
  });
};

export const addFavorite = async (
  fav: Omit<MealFavorite, 'id'>
): Promise<number> => {
  await getSafeDB();
  return await withDBQueue(async (conn) => {
    const res = await conn.runAsync(
      `INSERT INTO meal_favorites
        (name, meal_type, calories, protein, fat, carbs, sodium, fiber, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fav.name,
        fav.meal_type ?? null,
        fav.calories,
        fav.protein,
        fav.fat,
        fav.carbs,
        fav.sodium,
        fav.fiber,
        fav.memo ?? null,
        fav.created_at,
      ]
    );
    return res.lastInsertRowId;
  });
};

export const deleteFavorite = async (id: number): Promise<void> => {
  await getSafeDB();
  await withDBQueue(async (conn) => {
    await conn.runAsync('DELETE FROM meal_favorites WHERE id = ?', [id]);
  });
};

// ─── 栄養目標 (settings) ────────────────────────────────

const NUTRITION_GOALS_KEY = 'nutrition_goals_v1';

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 60,
  fat: 55,
  carbs: 250,
  sodium: 7.5,
  fiber: 20,
};

export const getNutritionGoals = async (): Promise<NutritionGoals> => {
  await getSafeDB();
  return await withDBQueue(async (conn) => {
    try {
      const row = await conn.getFirstAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        [NUTRITION_GOALS_KEY]
      );
      if (row?.value) {
        return { ...DEFAULT_GOALS, ...JSON.parse(row.value) };
      }
    } catch (e) {
      console.warn('getNutritionGoals: failed to parse', e);
    }
    return DEFAULT_GOALS;
  });
};

export const saveNutritionGoals = async (goals: NutritionGoals): Promise<void> => {
  await getSafeDB();
  await withDBQueue(async (conn) => {
    await conn.runAsync(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [NUTRITION_GOALS_KEY, JSON.stringify(goals)]
    );
  });
};

// ─── オートファジー設定 (autophagy_config) ──────────────

const DEFAULT_AUTOPHAGY: AutophagyConfig = {
  enabled: true,
  target_hours: 16,
  start_time: undefined,
  notified: false,
  auto_sync_with_last_meal: true,
};

export const getAutophagyConfig = async (): Promise<AutophagyConfig> => {
  await getSafeDB();
  return await withDBQueue(async (conn) => {
    const row = await conn.getFirstAsync<{
      id: number;
      enabled: number;
      target_hours: number;
      start_time: string | null;
      notified: number;
      auto_sync_with_last_meal: number;
    }>('SELECT * FROM autophagy_config ORDER BY id DESC LIMIT 1');

    if (!row) return DEFAULT_AUTOPHAGY;

    return {
      id: row.id,
      enabled: row.enabled === 1,
      target_hours: row.target_hours,
      start_time: row.start_time ?? undefined,
      notified: row.notified === 1,
      auto_sync_with_last_meal: row.auto_sync_with_last_meal === 1,
    };
  });
};

export const saveAutophagyConfig = async (
  config: AutophagyConfig
): Promise<void> => {
  await getSafeDB();
  await withDBQueue(async (conn) => {
    // 既存行を確認
    const existing = await conn.getFirstAsync<{ id: number }>(
      'SELECT id FROM autophagy_config LIMIT 1'
    );

    if (existing) {
      await conn.runAsync(
        `UPDATE autophagy_config
         SET enabled = ?, target_hours = ?, start_time = ?, notified = ?, auto_sync_with_last_meal = ?
         WHERE id = ?`,
        [
          config.enabled ? 1 : 0,
          config.target_hours,
          config.start_time ?? null,
          config.notified ? 1 : 0,
          config.auto_sync_with_last_meal ? 1 : 0,
          existing.id,
        ]
      );
    } else {
      await conn.runAsync(
        `INSERT INTO autophagy_config
          (enabled, target_hours, start_time, notified, auto_sync_with_last_meal)
         VALUES (?, ?, ?, ?, ?)`,
        [
          config.enabled ? 1 : 0,
          config.target_hours,
          config.start_time ?? null,
          config.notified ? 1 : 0,
          config.auto_sync_with_last_meal ? 1 : 0,
        ]
      );
    }
  });
};
