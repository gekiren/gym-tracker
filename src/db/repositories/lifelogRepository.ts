import { getDB } from '../connection';
import { WaterLog, TimeLog, HabitItem, HabitLog, WorkoutRow, WorkoutExerciseRow, WorkoutSetRow } from '../types';

// 1. 水分管理 (Water Logs)
export const getWaterLogs = async (date: string): Promise<WaterLog[]> => {
  const conn = getDB();
  return await conn.getAllAsync<WaterLog>(
    'SELECT * FROM water_logs WHERE date = ? ORDER BY timestamp ASC',
    [date]
  );
};

export const addWaterLog = async (amount: number, timestamp: number, date: string, caffeine: number = 0): Promise<number> => {
  const conn = getDB();
  const res = await conn.runAsync(
    'INSERT INTO water_logs (amount, timestamp, date, caffeine) VALUES (?, ?, ?, ?)',
    [amount, timestamp, date, caffeine]
  );
  return res.lastInsertRowId;
};

export const deleteWaterLog = async (id: number): Promise<void> => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM water_logs WHERE id = ?', [id]);
};

export const getWaterGoal = async (): Promise<number> => {
  const conn = getDB();
  try {
    const row = await conn.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'water_goal'"
    );
    return row ? parseInt(row.value, 10) : 2000;
  } catch (e) {
    console.warn('Failed to get water_goal setting', e);
    return 2000;
  }
};

export const setWaterGoal = async (goal: number): Promise<void> => {
  const conn = getDB();
  await conn.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('water_goal', ?)",
    [String(goal)]
  );
};

export const getCaffeineLimit = async (): Promise<number> => {
  const conn = getDB();
  try {
    const row = await conn.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'caffeine_limit'"
    );
    return row ? parseInt(row.value, 10) : 400;
  } catch (e) {
    console.warn('Failed to get caffeine_limit setting', e);
    return 400;
  }
};

export const setCaffeineLimit = async (limit: number): Promise<void> => {
  const conn = getDB();
  await conn.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('caffeine_limit', ?)",
    [String(limit)]
  );
};

export const getSettingValue = async (key: string): Promise<string | null> => {
  const conn = getDB();
  try {
    const row = await conn.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return row ? row.value : null;
  } catch (e) {
    console.warn(`Failed to get setting ${key}`, e);
    return null;
  }
};

// 2. 時間管理 (Time Logs)
export const getTimeLogs = async (date: string): Promise<TimeLog[]> => {
  const conn = getDB();
  return await conn.getAllAsync<TimeLog>(
    'SELECT * FROM time_logs WHERE date = ? ORDER BY start_time ASC',
    [date]
  );
};

export const addTimeLog = async (
  activityName: string,
  startTime: string,
  endTime: string,
  date: string,
  durationMinutes: number
): Promise<number> => {
  const conn = getDB();
  const res = await conn.runAsync(
    'INSERT INTO time_logs (activity_name, start_time, end_time, date, duration_minutes) VALUES (?, ?, ?, ?, ?)',
    [activityName, startTime, endTime, date, durationMinutes]
  );
  return res.lastInsertRowId;
};

export const deleteTimeLog = async (id: number): Promise<void> => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM time_logs WHERE id = ?', [id]);
};

export const updateTimeLog = async (
  id: number,
  activityName: string,
  startTime: string,
  endTime: string,
  date: string,
  durationMinutes: number
): Promise<void> => {
  const conn = getDB();
  await conn.runAsync(
    'UPDATE time_logs SET activity_name = ?, start_time = ?, end_time = ?, date = ?, duration_minutes = ? WHERE id = ?',
    [activityName, startTime, endTime, date, durationMinutes, id]
  );
};

// 3. 習慣項目マスタ (Habit Items)
export const getHabitItems = async (): Promise<HabitItem[]> => {
  const conn = getDB();
  return await conn.getAllAsync<HabitItem>(
    'SELECT * FROM habit_items ORDER BY sort_order ASC, created_at ASC'
  );
};

export const addHabitItem = async (name: string, color: string, targetCount: number = 0): Promise<number> => {
  const conn = getDB();
  const now = Date.now();
  const res = await conn.runAsync(
    'INSERT INTO habit_items (name, color, created_at, sort_order, target_count) VALUES (?, ?, ?, 0, ?)',
    [name, color, now, targetCount]
  );
  return res.lastInsertRowId;
};

export const deleteHabitItem = async (id: number): Promise<void> => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM habit_items WHERE id = ?', [id]);
};

export const updateHabitItem = async (id: number, name: string, color: string, targetCount: number = 0): Promise<void> => {
  const conn = getDB();
  await conn.runAsync(
    'UPDATE habit_items SET name = ?, color = ?, target_count = ? WHERE id = ?',
    [name, color, targetCount, id]
  );
};

// 4. 習慣実行履歴 (Habit Logs)
export const getHabitLogs = async (date: string): Promise<HabitLog[]> => {
  const conn = getDB();
  return await conn.getAllAsync<HabitLog>(
    'SELECT * FROM habit_logs WHERE date = ?',
    [date]
  );
};

export const addHabitLog = async (habitItemId: number, timestamp: number, date: string): Promise<number> => {
  const conn = getDB();
  const res = await conn.runAsync(
    'INSERT INTO habit_logs (habit_item_id, timestamp, date) VALUES (?, ?, ?)',
    [habitItemId, timestamp, date]
  );
  return res.lastInsertRowId;
};

export const deleteHabitLog = async (id: number): Promise<void> => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM habit_logs WHERE id = ?', [id]);
};

export const deleteLastHabitLog = async (habitItemId: number, date: string): Promise<void> => {
  const conn = getDB();
  await conn.runAsync(
    'DELETE FROM habit_logs WHERE id = (SELECT id FROM habit_logs WHERE habit_item_id = ? AND date = ? ORDER BY timestamp DESC LIMIT 1)',
    [habitItemId, date]
  );
};

export const getAllWaterLogs = async (): Promise<WaterLog[]> => {
  const conn = getDB();
  return await conn.getAllAsync<WaterLog>(
    'SELECT * FROM water_logs ORDER BY date ASC, timestamp ASC'
  );
};

export const getAllTimeLogs = async (): Promise<TimeLog[]> => {
  const conn = getDB();
  return await conn.getAllAsync<TimeLog>(
    'SELECT * FROM time_logs ORDER BY date ASC, start_time ASC'
  );
};

export const getAllHabitLogs = async (): Promise<HabitLog[]> => {
  const conn = getDB();
  return await conn.getAllAsync<HabitLog>(
    'SELECT * FROM habit_logs ORDER BY date ASC, timestamp ASC'
  );
};

export const getWorkoutsForDate = async (dateStr: string) => {
  const db = getDB();
  const dateISO = dateStr.replace(/\//g, '-');
  
  const workouts = await db.getAllAsync<WorkoutRow>(
    "SELECT * FROM workouts WHERE date(start_time, 'localtime') = ? ORDER BY start_time ASC",
    [dateISO]
  );
  
  const workoutsWithDetails = [];
  for (const w of workouts) {
    const exercisesRows = await db.getAllAsync<WorkoutExerciseRow>(
      'SELECT we.id as workout_exercise_id, e.id as exercise_id, e.name as exercise_name, we.notes FROM workout_exercises we JOIN exercises e ON we.exercise_id = e.id WHERE we.workout_id = ? ORDER BY we.sort_order',
      [w.id]
    );
    
    const exercisesData = [];
    for (const ex of exercisesRows) {
      const setsRows = await db.getAllAsync<WorkoutSetRow>(
        'SELECT id, set_number, weight, reps, rpe, rest_seconds, work_seconds, side, variation, stance, is_completed FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number ASC, id ASC',
        [ex.workout_exercise_id]
      );
      exercisesData.push({
        workout_exercise_id: ex.workout_exercise_id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        notes: ex.notes,
        sets: setsRows.map(s => ({
          ...s,
          is_completed: s.is_completed === 1 || s.is_completed === true
        }))
      });
    }
    
    workoutsWithDetails.push({
      id: w.id,
      title: w.title,
      start_time: w.start_time,
      end_time: w.end_time,
      notes: w.notes,
      calories: w.calories,
      exercises: exercisesData
    });
  }
  
  return workoutsWithDetails;
};
