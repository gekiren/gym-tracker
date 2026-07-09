import { getDB, getCaffeineLimit, setCaffeineLimit } from '../db/database';
import { useLifelogStore } from '../store/lifelogStore';

// Helper to format date as YYYY/MM/DD in local timezone
const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
};

// Helper to parse timestamp safely across JS engines (handling number and ISO strings)
const parseTimestampToDate = (ts: string | number): Date => {
  if (typeof ts === 'number') {
    return new Date(ts);
  }
  const num = Number(ts);
  if (!isNaN(num)) {
    return new Date(num);
  }
  const parsed = new Date(ts);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date(); // Fallback to current date
};

// Helper to convert HH:MM to minutes
const timeToMins = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Loads all lifelog data from SQLite database and formats it for WebView localStorage injection.
 */
export const getInitialDataForWebView = async (): Promise<Record<string, any>> => {
  const db = getDB();
  const data: Record<string, any> = {};

  try {
    // 1. Water logs & settings
    const waterLogsRows = await db.getAllAsync<{ amount: number; timestamp: number; date: string; caffeine: number | null }>(
      'SELECT amount, timestamp, date, caffeine FROM water_logs ORDER BY timestamp ASC'
    );
    data['hydration_data_v1'] = JSON.stringify(waterLogsRows.map((row) => ({
      id: row.timestamp,
      timestamp: row.timestamp,
      amount: row.amount,
      caffeine: row.caffeine || 0,
      date: row.date,
    })));

    const waterSettingsRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'hydration_settings_v1'"
    );
    if (waterSettingsRow) {
      try {
        const parsed = JSON.parse(waterSettingsRow.value);
        if (parsed && typeof parsed.caffeineLimit !== 'number') {
          const caffeineLimit = await getCaffeineLimit();
          parsed.caffeineLimit = caffeineLimit;
        }
        data['hydration_settings_v1'] = parsed;
      } catch {
        data['hydration_settings_v1'] = null;
      }
    } else {
      const waterGoalRow = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'water_goal'"
      );
      const goal = waterGoalRow ? parseInt(waterGoalRow.value, 10) : 2000;
      const caffeineLimit = await getCaffeineLimit();
      data['hydration_settings_v1'] = { goal, presets: [200, 300, 500], caffeineLimit };
    }

    // 2. Time logs, templates, tags
    const timeLogsRows = await db.getAllAsync<{
      id: number;
      activity_name: string;
      start_time: string;
      end_time: string;
      date: string;
      duration_minutes: number;
    }>('SELECT * FROM time_logs ORDER BY start_time ASC');

    const timeLogsMap: Record<string, any> = {};
    timeLogsRows.forEach((row) => {
      const key = `${row.date}_${row.start_time}_${row.end_time}`;
      if (!timeLogsMap[key]) {
        timeLogsMap[key] = {
          id: row.id,
          date: row.date,
          start: row.start_time,
          end: row.end_time,
          rows: [],
        };
      }
      timeLogsMap[key].rows.push(row);
    });

    data['zikankanri_logs'] = Object.values(timeLogsMap).map((group: any) => {
      const totalDuration = group.rows.reduce((sum: number, r: any) => sum + r.duration_minutes, 0);
      const items = group.rows.map((r: any) => {
        const percent = totalDuration > 0 ? Math.round((r.duration_minutes / totalDuration) * 100) : 100;
        return {
          name: r.activity_name,
          percent,
        };
      });
      return {
        id: group.id,
        date: group.date,
        start: group.start,
        end: group.end,
        items,
      };
    });

    const templatesRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'zikankanri_templates'"
    );
    data['zikankanri_templates'] = templatesRow ? JSON.parse(templatesRow.value) : null;

    const tagsRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'zikankanri_tags'"
    );
    data['zikankanri_tags'] = tagsRow ? JSON.parse(tagsRow.value) : null;

    const continuousModeRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'zikankanri_continuous_mode'"
    );
    data['zikankanri_continuous_mode'] = continuousModeRow ? continuousModeRow.value : null;

    // 3. Habit items and logs
    const habitItemsRows = await db.getAllAsync<{ id: number; name: string; color: string; created_at: number }>(
      'SELECT * FROM habit_items ORDER BY sort_order ASC, created_at ASC'
    );
    data['habit-items'] = habitItemsRows.map((row) => ({
      id: String(row.id),
      name: row.name,
      color: row.color,
      createdAt: row.created_at,
    }));

    const habitLogsRows = await db.getAllAsync<{ habit_item_id: number; timestamp: number }>(
      'SELECT * FROM habit_logs'
    );
    data['habit-logs'] = habitLogsRows.map((row) => ({
      itemId: String(row.habit_item_id),
      timestamp: row.timestamp,
    }));

    // 4. Routine tracker data
    const routineRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'routine_tracker_data'"
    );
    data['routine_tracker_data'] = routineRow ? JSON.parse(routineRow.value) : null;

  } catch (e) {
    console.error('Failed to prepare initial data for WebView:', e);
  }

  return data;
};

/**
 * Handles localStorage set notifications from WebViews and updates SQLite database & Zustand store.
 * Returns updated data string if key changes require injecting mapped values back (e.g., auto-incremented item IDs).
 */
export const handleWebViewMessage = async (
  key: string,
  value: string,
  currentDate: string
): Promise<string | null> => {
  const db = getDB();

  try {
    if (key === 'hydration_data_v1') {
      console.log(`[SyncService] Received hydration_data_v1. Value length: ${value.length}`);
      const logs = JSON.parse(value) as Array<{ id: number; timestamp: number; amount: number; date: string; caffeine?: number }>;
      console.log(`[SyncService] Parsed logs count: ${logs.length}. Logs:`, JSON.stringify(logs));

      await db.withTransactionAsync(async () => {
        console.log('[SyncService] Starting transaction to delete and insert water logs');
        await db.runAsync('DELETE FROM water_logs');
        for (const log of logs) {
          const dateStr = log.date || formatDate(parseTimestampToDate(log.timestamp));
          console.log(`[SyncService] Inserting log: amount=${log.amount}, timestamp=${log.id}, date=${dateStr}`);
          await db.runAsync(
            'INSERT INTO water_logs (amount, timestamp, date, caffeine) VALUES (?, ?, ?, ?)',
            [log.amount, log.id, dateStr, log.caffeine || 0]
          );
        }
        console.log('[SyncService] Transaction queries completed successfully');
      });

      console.log(`[SyncService] Transaction committed. Reloading water data for date: ${currentDate}`);
      await useLifelogStore.getState().loadWaterData(currentDate);
      console.log('[SyncService] Water data reloaded in lifelogStore');
    } 
    
    else if (key === 'hydration_settings_v1') {
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('hydration_settings_v1', ?)",
        [value]
      );

      const settings = JSON.parse(value);
      if (settings && typeof settings.goal === 'number') {
        await db.runAsync(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('water_goal', ?)",
          [String(settings.goal)]
        );
        await useLifelogStore.getState().updateWaterGoal(settings.goal);
      }
      if (settings && typeof settings.caffeineLimit === 'number') {
        await db.runAsync(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('caffeine_limit', ?)",
          [String(settings.caffeineLimit)]
        );
        await useLifelogStore.getState().updateCaffeineLimit(settings.caffeineLimit);
      }
    } 
    
    else if (key === 'zikankanri_logs') {
      const logs = JSON.parse(value) as Array<{
        id: number;
        date: string;
        start: string;
        end: string;
        items: Array<{ name: string; percent: number }>;
      }>;

      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM time_logs');
        for (const log of logs) {
          const startMins = timeToMins(log.start);
          let endMins = timeToMins(log.end);
          if (endMins < startMins) endMins += 1440;
          const totalDuration = endMins - startMins;

          for (const item of log.items) {
            const duration = Math.round(totalDuration * (item.percent / 100));
            await db.runAsync(
              'INSERT INTO time_logs (activity_name, start_time, end_time, date, duration_minutes) VALUES (?, ?, ?, ?, ?)',
              [item.name, log.start, log.end, log.date, duration]
            );
          }
        }
      });

      await useLifelogStore.getState().loadTimeData(currentDate);
    } 
    
    else if (key === 'zikankanri_templates') {
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('zikankanri_templates', ?)",
        [value]
      );
    } 
    
    else if (key === 'zikankanri_tags') {
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('zikankanri_tags', ?)",
        [value]
      );
    } 
    
    else if (key === 'zikankanri_continuous_mode') {
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('zikankanri_continuous_mode', ?)",
        [value]
      );
    } 
    
    else if (key === 'habit-items') {
      const items = JSON.parse(value) as Array<{ id: string; name: string; color: string; createdAt: number }>;
      let hasNewItems = false;

      const existingItems = await db.getAllAsync<{ id: number }>('SELECT id FROM habit_items');
      const existingIds = new Set(existingItems.map((item) => String(item.id)));
      const webViewIds = new Set(items.map((item) => item.id));

      await db.withTransactionAsync(async () => {
        // 1. Delete removed items
        for (const id of existingIds) {
          if (!webViewIds.has(id)) {
            await db.runAsync('DELETE FROM habit_items WHERE id = ?', [parseInt(id, 10)]);
          }
        }

        // 2. Insert or update items
        for (const item of items) {
          const isTempId = item.id.length > 6;
          if (isTempId || !existingIds.has(item.id)) {
            await db.runAsync(
              'INSERT INTO habit_items (name, color, created_at, sort_order) VALUES (?, ?, ?, 0)',
              [item.name, item.color, item.createdAt]
            );
            hasNewItems = true;
          } else {
            await db.runAsync(
              'UPDATE habit_items SET name = ?, color = ? WHERE id = ?',
              [item.name, item.color, parseInt(item.id, 10)]
            );
          }
        }
      });

      await useLifelogStore.getState().loadHabitItems();
      await useLifelogStore.getState().loadHabits(currentDate);

      // If new items were added, we return the list updated with their new SQLite IDs
      if (hasNewItems) {
        const updatedItems = await db.getAllAsync<{ id: number; name: string; color: string; created_at: number }>(
          'SELECT * FROM habit_items'
        );
        const mapped = updatedItems.map((row) => ({
          id: String(row.id),
          name: row.name,
          color: row.color,
          createdAt: row.created_at,
        }));
        return JSON.stringify(mapped);
      }
    } 
    
    else if (key === 'habit-logs') {
      const logs = JSON.parse(value) as Array<{ itemId: string; timestamp: number }>;

      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM habit_logs');
        for (const log of logs) {
          const dateStr = formatDate(parseTimestampToDate(log.timestamp));
          const habitItemId = parseInt(log.itemId, 10);
          if (!isNaN(habitItemId)) {
            await db.runAsync(
              'INSERT INTO habit_logs (habit_item_id, timestamp, date) VALUES (?, ?, ?)',
              [habitItemId, log.timestamp, dateStr]
            );
          }
        }
      });

      await useLifelogStore.getState().loadHabits(currentDate);
    } 
    
    else if (key === 'routine_tracker_data') {
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('routine_tracker_data', ?)",
        [value]
      );
      await useLifelogStore.getState().loadRoutineData();
    }
  } catch (e) {
    console.error(`Failed to handle WebView update for key ${key}:`, e);
  }

  return null;
};
