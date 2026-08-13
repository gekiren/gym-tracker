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

// Diagnostic sync logs in memory
const syncDiagnosticsLogs: string[] = [];

export const addSyncDiagnosticLog = (msg: string) => {
  const time = new Date().toLocaleTimeString('ja-JP');
  syncDiagnosticsLogs.unshift(`[${time}] ${msg}`);
  if (syncDiagnosticsLogs.length > 50) {
    syncDiagnosticsLogs.pop();
  }
};

export const getSyncDiagnosticsLogs = (): string[] => {
  return [...syncDiagnosticsLogs];
};

/**
 * Synchronizes widget time punches (from 'widget_time_punches' setting) to SQLite 'time_logs' table,
 * and reloads water/time data in useLifelogStore.
 * Returns true if new widget punches or water logs were updated.
 */
export const syncWidgetPunches = async (currentDate?: string): Promise<boolean> => {
  const db = getDB();
  let updated = false;

  try {
    const punchesRow = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'widget_time_punches'"
    );
    if (punchesRow && punchesRow.value) {
      const punches = JSON.parse(punchesRow.value) as Array<{
        start: string;
        end: string;
        date: string;
        status: 'open' | 'closed';
      }>;

      const closedPunches = punches.filter(p => p.status === 'closed');
      const openPunches = punches.filter(p => p.status === 'open');

      if (closedPunches.length > 0) {
        for (const punch of closedPunches) {
          const punchDate = punch.date.replace(/-/g, '/');
          const startTime = punch.start || '';
          const endTime = punch.end || '';
          const exists = await db.getFirstAsync<{ id: number }>(
            "SELECT id FROM time_logs WHERE date = ? AND start_time = ? AND end_time = ?",
            [punchDate, startTime, endTime]
          );

          if (!exists) {
            let duration = 0;
            if (startTime && endTime) {
              const startMins = timeToMins(startTime);
              let endMins = timeToMins(endTime);
              if (endMins < startMins) endMins += 1440;
              duration = endMins - startMins;
            }

            await db.runAsync(
              'INSERT INTO time_logs (activity_name, start_time, end_time, date, duration_minutes) VALUES (?, ?, ?, ?, ?)',
              ['', startTime, endTime, punchDate, duration]
            );
          }
        }

        // Save remaining open punches
        await db.runAsync(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('widget_time_punches', ?)",
          [JSON.stringify(openPunches)]
        );

        updated = true;
      }
    }

    const targetDate = currentDate || useLifelogStore.getState().currentDate;
    if (targetDate) {
      await useLifelogStore.getState().loadTimeData(targetDate);
      await useLifelogStore.getState().loadWaterData(targetDate);
    }
  } catch (e) {
    console.error('Failed to sync widget punches:', e);
  }

  return updated;
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
        if (parsed && typeof parsed.widgetQuickAddAmount !== 'number') {
          // Check if we have individual key, else default 200
          const widgetAmountRow = await db.getFirstAsync<{ value: string }>(
            "SELECT value FROM settings WHERE key = 'widget_quick_add_amount'"
          );
          parsed.widgetQuickAddAmount = widgetAmountRow ? parseInt(widgetAmountRow.value, 10) : 200;
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
      const widgetAmountRow = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'widget_quick_add_amount'"
      );
      const widgetQuickAddAmount = widgetAmountRow ? parseInt(widgetAmountRow.value, 10) : 200;
      data['hydration_settings_v1'] = { goal, presets: [200, 300, 500], caffeineLimit, widgetQuickAddAmount };
    }

    // 2. Time logs, templates, tags
    // --- Widget punches integration (Directly save to SQLite first) ---
    await syncWidgetPunches();

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

      const existingCountRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM water_logs');
      const existingCount = existingCountRow?.count || 0;
      if (existingCount > 0 && (!logs || logs.length === 0)) {
        addSyncDiagnosticLog('[Safety Guard] Skipped empty water_logs wipe due to existing DB records');
        return null;
      }

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
      if (settings && typeof settings.widgetQuickAddAmount === 'number') {
        await db.runAsync(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('widget_quick_add_amount', ?)",
          [String(settings.widgetQuickAddAmount)]
        );
      }
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

      const existingCountRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM time_logs');
      const existingCount = existingCountRow?.count || 0;
      if (existingCount > 0 && (!logs || logs.length === 0)) {
        addSyncDiagnosticLog('[Safety Guard] Skipped empty time_logs wipe due to existing DB records');
        return null;
      }

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
      addSyncDiagnosticLog(`Received habit-items from WebView. Count: ${items.length}`);

      const existingRows = await db.getAllAsync<{ id: number; name: string; created_at: number }>(
        'SELECT id, name, created_at FROM habit_items'
      );

      if (existingRows.length > 0 && (!items || items.length === 0)) {
        addSyncDiagnosticLog('[Safety Guard] Skipped empty habit-items wipe due to existing DB records');
        return null;
      }

      // Helper to check if a SQLite row matches any incoming WebView item
      const isRowMatchingItem = (row: { id: number; name: string; created_at: number }, item: { id: string; name: string; createdAt: number }) => {
        return (
          String(row.id) === item.id ||
          (item.createdAt && row.created_at === item.createdAt) ||
          (item.name && row.name === item.name)
        );
      };

      // 1. Delete items from SQLite ONLY if they do NOT match any incoming item (safe deletion)
      for (const row of existingRows) {
        const matched = items.some((item) => isRowMatchingItem(row, item));
        if (!matched) {
          await db.runAsync('DELETE FROM habit_items WHERE id = ?', [row.id]);
          await db.runAsync('DELETE FROM habit_logs WHERE habit_item_id = ?', [row.id]);
        }
      }

      // 2. Insert or update items safely with sort_order
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        // Find matching existing row (by ID, createdAt, or name)
        const matchedRow = existingRows.find((row) => isRowMatchingItem(row, item));

        if (matchedRow) {
          // Update existing record using its SQLite ID and update sort_order
          await db.runAsync(
            'UPDATE habit_items SET name = ?, color = ?, sort_order = ? WHERE id = ?',
            [item.name, item.color, index, matchedRow.id]
          );
        } else {
          // Insert new item with sort_order
          const numericId = parseInt(item.id, 10);
          if (!isNaN(numericId) && numericId > 0) {
            await db.runAsync(
              'INSERT INTO habit_items (id, name, color, created_at, sort_order) VALUES (?, ?, ?, ?, ?)',
              [numericId, item.name, item.color, item.createdAt || Date.now(), index]
            );
          } else {
            await db.runAsync(
              'INSERT INTO habit_items (name, color, created_at, sort_order) VALUES (?, ?, ?, ?)',
              [item.name, item.color, item.createdAt || Date.now(), index]
            );
          }
        }
      }

      await useLifelogStore.getState().loadHabitItems();
      await useLifelogStore.getState().loadHabits(currentDate);

      // Return latest formatted habit items with SQLite IDs to update WebView localStorage
      const updatedRows = await db.getAllAsync<{ id: number; name: string; color: string; created_at: number }>(
        'SELECT * FROM habit_items ORDER BY sort_order ASC, created_at ASC'
      );
      const formattedUpdated = updatedRows.map((row) => ({
        id: String(row.id),
        name: row.name,
        color: row.color,
        createdAt: row.created_at,
      }));
      addSyncDiagnosticLog(`Updated habit-items in SQLite. Total items: ${updatedRows.length}`);
      return JSON.stringify(formattedUpdated);
    } 
    
    else if (key === 'habit-logs') {
      const logs = JSON.parse(value) as Array<{ itemId: string; timestamp: number }>;
      addSyncDiagnosticLog(`Received habit-logs from WebView. Incoming count: ${logs.length}`);

      const existingCountRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM habit_logs');
      const existingCount = existingCountRow?.count || 0;
      if (existingCount > 0 && (!logs || logs.length === 0)) {
        addSyncDiagnosticLog('[Safety Guard] Skipped empty habit-logs wipe due to existing DB records');
        return null;
      }

      // 1. Fetch current valid habit items in SQLite for flexible ID mapping
      const validItems = await db.getAllAsync<{ id: number; name: string; created_at: number }>(
        'SELECT id, name, created_at FROM habit_items'
      );

      // Map any incoming itemId format (SQLite ID, createdAt timestamp, or item name) to actual SQLite item.id
      const itemIdToSqliteIdMap = new Map<string, number>();
      for (const item of validItems) {
        itemIdToSqliteIdMap.set(String(item.id), item.id);
        if (item.created_at) {
          itemIdToSqliteIdMap.set(String(item.created_at), item.id);
        }
        if (item.name) {
          itemIdToSqliteIdMap.set(item.name, item.id);
        }
      }

      // 2. Resolve logs to SQLite habit_item_ids and deduplicate (same resolved habitItemId & timestamp)
      const seen = new Set<string>();
      const resolvedLogs: Array<{ habitItemId: number; timestamp: number }> = [];

      for (const log of logs) {
        let sqliteItemId = itemIdToSqliteIdMap.get(log.itemId);
        if (sqliteItemId === undefined) {
          const num = parseInt(log.itemId, 10);
          if (!isNaN(num) && itemIdToSqliteIdMap.has(String(num))) {
            sqliteItemId = num;
          }
        }

        if (sqliteItemId !== undefined) {
          const dedupeKey = `${sqliteItemId}_${log.timestamp}`;
          if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            resolvedLogs.push({ habitItemId: sqliteItemId, timestamp: log.timestamp });
          }
        }
      }

      await db.runAsync('DELETE FROM habit_logs');
      for (const log of resolvedLogs) {
        const dateStr = formatDate(parseTimestampToDate(log.timestamp));
        await db.runAsync(
          'INSERT INTO habit_logs (habit_item_id, timestamp, date) VALUES (?, ?, ?)',
          [log.habitItemId, log.timestamp, dateStr]
        );
      }

      await useLifelogStore.getState().loadHabits(currentDate);
      addSyncDiagnosticLog(`Resolved habit-logs into SQLite. Saved: ${resolvedLogs.length}/${logs.length}`);
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
    addSyncDiagnosticLog(`[Sync Error] key=${key}: ${String(e)}`);
  }

  return null;
};
