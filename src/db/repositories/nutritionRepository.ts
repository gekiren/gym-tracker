import { getDB, initDB, withDBQueue, triggerDebouncedDataBackup } from '../database';
import {
  MealLog,
  MealFavorite,
  MealPreset,
  MealPresetItem,
  MealPresetWithItems,
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
  const dateSlash = date.replace(/-/g, '/');
  const dateHyphen = date.replace(/\//g, '-');
  return await withDBQueue(async (conn) => {
    return await conn.getAllAsync<MealLog>(
      'SELECT * FROM meal_logs WHERE date = ? OR date = ? ORDER BY created_at ASC',
      [dateSlash, dateHyphen]
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

export const getMealLogsLast24Hours = async (): Promise<MealLog[]> => {
  await getSafeDB();
  const sinceTimestamp = Date.now() - 24 * 60 * 60 * 1000;
  return await withDBQueue(async (conn) => {
    return await conn.getAllAsync<MealLog>(
      'SELECT * FROM meal_logs WHERE created_at >= ? ORDER BY created_at ASC',
      [sinceTimestamp]
    );
  });
};

export const addMealLog = async (
  log: Omit<MealLog, 'id'>
): Promise<number> => {
  await getSafeDB();
  const rowId = await withDBQueue(async (conn) => {
    const res = await conn.runAsync(
      `INSERT INTO meal_logs
        (date, meal_type, meal_time, name, calories, protein, fat, carbs, sodium, fiber, photo_url, memo, created_at, preset_log_group_id, preset_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        log.preset_log_group_id ?? null,
        log.preset_name ?? null,
      ]
    );
    return res.lastInsertRowId;
  });
  // 食事追加後の非同期バックアップ（20秒デバウンス）
  triggerDebouncedDataBackup('meal_save', 20000);
  return rowId;
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
  if (log.preset_log_group_id !== undefined) { fields.push('preset_log_group_id = ?'); values.push(log.preset_log_group_id ?? null); }
  if (log.preset_name !== undefined) { fields.push('preset_name = ?'); values.push(log.preset_name ?? null); }

  if (fields.length === 0) return;
  values.push(id);

  await withDBQueue(async (conn) => {
    await conn.runAsync(
      `UPDATE meal_logs SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  });
  // 食事更新後の非同期バックアップ（20秒デバウンス）
  triggerDebouncedDataBackup('meal_save', 20000);
};

export const deleteMealLog = async (id: number): Promise<void> => {
  await getSafeDB();
  await withDBQueue(async (conn) => {
    await conn.runAsync('DELETE FROM meal_logs WHERE id = ?', [id]);
  });
  // 食事削除後の非同期バックアップ（20秒デバウンス）
  triggerDebouncedDataBackup('meal_save', 20000);
};

export const deleteMealLogsByGroupId = async (groupId: string): Promise<void> => {
  await getSafeDB();
  await withDBQueue(async (conn) => {
    await conn.runAsync('DELETE FROM meal_logs WHERE preset_log_group_id = ?', [groupId]);
  });
  // 食事削除後の非同期バックアップ（20秒デバウンス）
  triggerDebouncedDataBackup('meal_save', 20000);
};

// ─── お気に入り (meal_favorites) ───────────────────────

export const getFavorites = async (): Promise<MealFavorite[]> => {
  await getSafeDB();
  return await withDBQueue(async (conn) => {
    return await conn.getAllAsync<MealFavorite>(
      'SELECT * FROM meal_favorites ORDER BY sort_order ASC, created_at DESC'
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
        (name, meal_type, calories, protein, fat, carbs, sodium, fiber, memo, created_at, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        fav.sort_order ?? 0,
      ]
    );
    return res.lastInsertRowId;
  });
};

export const updateFavorite = async (
  id: number,
  fav: Partial<Omit<MealFavorite, 'id'>>
): Promise<void> => {
  await getSafeDB();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (fav.name !== undefined) { fields.push('name = ?'); values.push(fav.name); }
  if (fav.meal_type !== undefined) { fields.push('meal_type = ?'); values.push(fav.meal_type ?? null); }
  if (fav.calories !== undefined) { fields.push('calories = ?'); values.push(fav.calories); }
  if (fav.protein !== undefined) { fields.push('protein = ?'); values.push(fav.protein); }
  if (fav.fat !== undefined) { fields.push('fat = ?'); values.push(fav.fat); }
  if (fav.carbs !== undefined) { fields.push('carbs = ?'); values.push(fav.carbs); }
  if (fav.sodium !== undefined) { fields.push('sodium = ?'); values.push(fav.sodium); }
  if (fav.fiber !== undefined) { fields.push('fiber = ?'); values.push(fav.fiber); }
  if (fav.memo !== undefined) { fields.push('memo = ?'); values.push(fav.memo ?? null); }
  if (fav.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(fav.sort_order); }

  if (fields.length === 0) return;
  values.push(id);

  await withDBQueue(async (conn) => {
    await conn.runAsync(
      `UPDATE meal_favorites SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  });
};

export const updateFavoriteOrders = async (
  orders: { id: number; sort_order: number }[]
): Promise<void> => {
  await getSafeDB();
  await withDBQueue(async (conn) => {
    for (const item of orders) {
      await conn.runAsync(
        'UPDATE meal_favorites SET sort_order = ? WHERE id = ?',
        [item.sort_order, item.id]
      );
    }
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
  gender: 'male',
  age: 30,
  height: 170,
  weight: 65,
  activity_level: 'moderate',
  goal_type: 'maintain',
  ai_url: 'https://chatgpt.com',
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

// ─── 献立プリセット (meal_presets & meal_preset_items) ────

export const getMealPresets = async (): Promise<MealPresetWithItems[]> => {
  await getSafeDB();
  return await withDBQueue(async (conn) => {
    const presets = await conn.getAllAsync<MealPreset>(
      'SELECT * FROM meal_presets ORDER BY sort_order ASC, created_at DESC'
    );
    if (!presets || presets.length === 0) return [];

    const items = await conn.getAllAsync<MealPresetItem>(
      'SELECT * FROM meal_preset_items ORDER BY sort_order ASC, id ASC'
    );

    const itemsByPresetId = new Map<number, MealPresetItem[]>();
    for (const item of (items || [])) {
      if (!itemsByPresetId.has(item.preset_id)) {
        itemsByPresetId.set(item.preset_id, []);
      }
      itemsByPresetId.get(item.preset_id)!.push(item);
    }

    return presets.map((p) => ({
      ...p,
      items: itemsByPresetId.get(p.id) || [],
    }));
  });
};

export const addMealPreset = async (
  preset: Omit<MealPreset, 'id'>,
  items: Omit<MealPresetItem, 'id' | 'preset_id'>[]
): Promise<number> => {
  await getSafeDB();
  const presetId = await withDBQueue(async (conn) => {
    const res = await conn.runAsync(
      `INSERT INTO meal_presets (name, meal_type, meal_time, scheduled_days, memo, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        preset.name,
        preset.meal_type ?? null,
        preset.meal_time ?? null,
        preset.scheduled_days ?? null,
        preset.memo ?? null,
        preset.sort_order ?? 0,
        preset.created_at || Date.now(),
      ]
    );
    const newId = res.lastInsertRowId;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await conn.runAsync(
        `INSERT INTO meal_preset_items
         (preset_id, name, calories, protein, fat, carbs, sodium, fiber, memo, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          item.name,
          item.calories || 0,
          item.protein || 0,
          item.fat || 0,
          item.carbs || 0,
          item.sodium || 0,
          item.fiber || 0,
          item.memo ?? null,
          item.sort_order ?? i,
        ]
      );
    }
    return newId;
  });
  triggerDebouncedDataBackup('meal_save', 20000);
  return presetId;
};

export const updateMealPreset = async (
  id: number,
  preset: Partial<Omit<MealPreset, 'id'>>,
  items?: Omit<MealPresetItem, 'id' | 'preset_id'>[]
): Promise<void> => {
  await getSafeDB();
  await withDBQueue(async (conn) => {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (preset.name !== undefined) { fields.push('name = ?'); values.push(preset.name); }
    if (preset.meal_type !== undefined) { fields.push('meal_type = ?'); values.push(preset.meal_type ?? null); }
    if (preset.meal_time !== undefined) { fields.push('meal_time = ?'); values.push(preset.meal_time ?? null); }
    if (preset.scheduled_days !== undefined) { fields.push('scheduled_days = ?'); values.push(preset.scheduled_days ?? null); }
    if (preset.memo !== undefined) { fields.push('memo = ?'); values.push(preset.memo ?? null); }
    if (preset.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(preset.sort_order); }

    if (fields.length > 0) {
      values.push(id);
      await conn.runAsync(
        `UPDATE meal_presets SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    if (items !== undefined) {
      await conn.runAsync('DELETE FROM meal_preset_items WHERE preset_id = ?', [id]);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await conn.runAsync(
          `INSERT INTO meal_preset_items
           (preset_id, name, calories, protein, fat, carbs, sodium, fiber, memo, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            item.name,
            item.calories || 0,
            item.protein || 0,
            item.fat || 0,
            item.carbs || 0,
            item.sodium || 0,
            item.fiber || 0,
            item.memo ?? null,
            item.sort_order ?? i,
          ]
        );
      }
    }
  });
  triggerDebouncedDataBackup('meal_save', 20000);
};

export const deleteMealPreset = async (id: number): Promise<void> => {
  await getSafeDB();
  await withDBQueue(async (conn) => {
    await conn.runAsync('DELETE FROM meal_preset_items WHERE preset_id = ?', [id]);
    await conn.runAsync('DELETE FROM meal_presets WHERE id = ?', [id]);
  });
  triggerDebouncedDataBackup('meal_save', 20000);
};

export const updateMealPresetOrders = async (
  orders: { id: number; sort_order: number }[]
): Promise<void> => {
  await getSafeDB();
  await withDBQueue(async (conn) => {
    for (const item of orders) {
      await conn.runAsync(
        'UPDATE meal_presets SET sort_order = ? WHERE id = ?',
        [item.sort_order, item.id]
      );
    }
  });
};

export const applyMealPresetToDate = async (
  presetId: number,
  date: string,
  options?: {
    multiplier?: number;
    meal_time?: string;
    meal_type?: string;
    selectedItemIds?: number[];
  }
): Promise<string> => {
  await getSafeDB();
  const mult = options?.multiplier ?? 1.0;
  const nowMs = Date.now();
  const groupId = `preset_${presetId}_${nowMs}`;

  // トランザクション外でプリフェッチ（SQLiteデッドロック防止）
  const preset = await withDBQueue(async (conn) => {
    return await conn.getFirstAsync<MealPreset>(
      'SELECT * FROM meal_presets WHERE id = ?',
      [presetId]
    );
  });

  if (!preset) {
    throw new Error(`MealPreset with id ${presetId} not found`);
  }

  const allItems = await withDBQueue(async (conn) => {
    return await conn.getAllAsync<MealPresetItem>(
      'SELECT * FROM meal_preset_items WHERE preset_id = ? ORDER BY sort_order ASC, id ASC',
      [presetId]
    );
  });

  if (!allItems || allItems.length === 0) {
    return groupId;
  }

  const items = options?.selectedItemIds
    ? allItems.filter((i) => options.selectedItemIds!.includes(i.id))
    : allItems;

  if (items.length === 0) {
    return groupId;
  }

  const finalMealType = options?.meal_type || preset.meal_type || 'breakfast';
  const finalMealTime = options?.meal_time || preset.meal_time || '12:00';

  await withDBQueue(async (conn) => {
    for (const item of items) {
      const cal = mult === 1 ? item.calories : Math.round(item.calories * mult);
      const p = mult === 1 ? item.protein : parseFloat((item.protein * mult).toFixed(1));
      const f = mult === 1 ? item.fat : parseFloat((item.fat * mult).toFixed(1));
      const c = mult === 1 ? item.carbs : parseFloat((item.carbs * mult).toFixed(1));
      const na = mult === 1 ? item.sodium : parseFloat((item.sodium * mult).toFixed(1));
      const fib = mult === 1 ? item.fiber : parseFloat((item.fiber * mult).toFixed(1));

      await conn.runAsync(
        `INSERT INTO meal_logs
          (date, meal_type, meal_time, name, calories, protein, fat, carbs, sodium, fiber, memo, created_at, preset_log_group_id, preset_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          date,
          finalMealType,
          finalMealTime,
          item.name,
          cal,
          p,
          f,
          c,
          na,
          fib,
          item.memo ?? null,
          nowMs,
          groupId,
          preset.name,
        ]
      );
    }
  });

  triggerDebouncedDataBackup('meal_save', 20000);
  return groupId;
};

