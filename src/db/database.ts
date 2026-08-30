import * as SQLite from 'expo-sqlite';
import { PRESET_EXERCISES, PRESET_ROUTINES } from './constants';
import { setDB, setDBPromise, getDBPromise, getDB, closeDB } from './connection';
import { runMigrations } from './migrations';
import { generateUUID } from '../utils/uuid';

// Export all types and constants for 100% backwards compatibility
export * from './types';
export * from './constants';
export * from './connection';

// Export repositories for 100% backwards compatibility
export * from './repositories/exerciseRepository';
export * from './repositories/workoutRepository';
export * from './repositories/routineRepository';
export * from './repositories/settingsRepository';
export * from './repositories/lifelogRepository';
export * from './repositories/nutritionRepository';
export * from './repositories/bodyRepository';
export * from './dbIntegrityService';
export * from './dbBackupService';

import { checkAndRepairDB } from './dbIntegrityService';
import { createDailyBackup } from './dbBackupService';

export const initDB = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    return getDB();
  } catch (_) {
    // If getDB() throws because db is null, proceed to initialize
  }

  const existingPromise = getDBPromise();
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    const dbInstance = await _initDBInternal();
    // 起動完了後にバックグラウンドで日次自動バックアップを作成
    createDailyBackup().catch((err) => console.warn('[DB_BACKUP] Background backup failed:', err));
    return dbInstance;
  })();

  setDBPromise(promise);
  return promise;
};

const _initDBInternal = async (): Promise<SQLite.SQLiteDatabase> => {
  let _db = await SQLite.openDatabaseAsync('gymtracker.db');

  // DBの整合性チェック・修復
  const checkResult = await checkAndRepairDB(_db);
  if (checkResult === 'restored') {
    // バックアップから復元された場合は再度接続を開く
    _db = await SQLite.openDatabaseAsync('gymtracker.db');
  }

  // Create tables if they don't exist
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group TEXT,
      equipment TEXT,
      is_unilateral INTEGER DEFAULT 0,
      default_variation TEXT,
      default_stance TEXT,
      weight_step REAL DEFAULT 2.5
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      notes TEXT,
      calories REAL
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_exercise_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight REAL,
      rpe REAL,
      is_completed INTEGER DEFAULT 0,
      rest_seconds INTEGER,
      work_seconds INTEGER,
      side TEXT,
      variation TEXT,
      stance TEXT,
      FOREIGN KEY(workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_workouts_start_time ON workouts(start_time DESC);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
    CREATE INDEX IF NOT EXISTS idx_workout_sets_we_completed ON workout_sets(workout_exercise_id, is_completed);

    CREATE TABLE IF NOT EXISTS routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(routine_id) REFERENCES routines(id) ON DELETE CASCADE,
      FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS routine_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_exercise_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight REAL,
      rpe REAL,
      side TEXT,
      variation TEXT,
      stance TEXT,
      FOREIGN KEY(routine_exercise_id) REFERENCES routine_exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorite_exercises (
      exercise_id INTEGER PRIMARY KEY,
      FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS water_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      date TEXT NOT NULL,
      caffeine INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_water_logs_date ON water_logs(date);

    CREATE TABLE IF NOT EXISTS time_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      date TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_time_logs_date ON time_logs(date);

    CREATE TABLE IF NOT EXISTS habit_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0,
      target_count INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_item_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY(habit_item_id) REFERENCES habit_items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);

    CREATE TABLE IF NOT EXISTS meal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT,
      meal_time TEXT,
      name TEXT NOT NULL,
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      sodium REAL DEFAULT 0,
      fiber REAL DEFAULT 0,
      photo_url TEXT,
      memo TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON meal_logs(date);

    CREATE TABLE IF NOT EXISTS meal_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      meal_type TEXT,
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      sodium REAL DEFAULT 0,
      fiber REAL DEFAULT 0,
      memo TEXT,
      created_at INTEGER NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS autophagy_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enabled INTEGER DEFAULT 1,
      target_hours REAL DEFAULT 16,
      start_time TEXT,
      notified INTEGER DEFAULT 0,
      auto_sync_with_last_meal INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS body_composition_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      weight REAL,
      body_fat_rate REAL,
      muscle_mass REAL,
      lbm REAL,
      height REAL,
      neck REAL,
      waist REAL,
      hip REAL,
      wrist REAL,
      ankle REAL,
      gender TEXT DEFAULT 'male',
      source TEXT DEFAULT 'manual',
      memo TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_body_composition_date ON body_composition_logs(date);
  `);

  // Run schema migrations using PRAGMA user_version
  await runMigrations(_db);

  // Seed exercises if missing
  const exercises = PRESET_EXERCISES;

  const seedFlag = await _db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = "initial_seeding_done"');

  if (!seedFlag) {
    const existing = await _db.getAllAsync<{ name: string }>('SELECT name FROM exercises');
    const existingNames = new Set(existing.map(e => e.name));

    if (existingNames.size < exercises.length) {
      await _db.withTransactionAsync(async () => {
        for (const ex of exercises) {
          if (!existingNames.has(ex.name)) {
            await _db.runAsync(
              'INSERT INTO exercises (name, muscle_group, equipment, is_unilateral) VALUES (?, ?, ?, ?)',
              [ex.name, ex.group, ex.equip, ex.is_unilateral ? 1 : 0]
            );
          }
        }
      });
    }

    const routineCountRow = await _db.getFirstAsync<{count: number}>('SELECT count(*) as count FROM routines');
    const oldRoutines = await _db.getAllAsync<{ title: string }>('SELECT title FROM routines');
    const isOldDefaultOnly = oldRoutines.length === 0 || 
      (oldRoutines.length <= 2 && oldRoutines.every(r => r.title === 'Push Day' || r.title === 'Pull Day'));

    if (routineCountRow && (routineCountRow.count === 0 || isOldDefaultOnly)) {
      await _db.runAsync('DELETE FROM routines WHERE title IN ("Push Day", "Pull Day")');
      
      const defaultRoutines = PRESET_ROUTINES;
      const allExercises = await _db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM exercises');
      const exerciseMap = new Map<string, number>(allExercises.map(e => [e.name, e.id]));

      await _db.withTransactionAsync(async () => {
        for (const r of defaultRoutines) {
          const res = await _db.runAsync('INSERT INTO routines (title, description) VALUES (?, ?)', [r.title, r.description]);
          const rid = res.lastInsertRowId;
          let order = 0;
          for (const ename of r.exerciseNames) {
            const exerciseId = exerciseMap.get(ename);
            if (exerciseId !== undefined) {
              const rxRes = await _db.runAsync(
                'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES (?, ?, ?)',
                [rid, exerciseId, order++]
              );
              const reid = rxRes.lastInsertRowId;

              const isPlank = ename === 'プランク';
              const isDumbbell = ename.includes('ダンベル');
              const isExtensionCurl = ename === 'レッグエクステンション' || ename === 'レッグカール' || ename === 'マシンアブダクター';
              const isSeatedRow = ename === 'シーテッドロウ';
              
              let weight = 20;
              let reps = 10;

              if (isPlank) {
                reps = 1;
                weight = 0;
              } else if (ename === 'プッシュアップ' || ename === 'バックエクステンション' || ename === 'クランチ') {
                reps = ename === 'バックエクステンション' ? 12 : (ename === 'クランチ' ? 15 : 10);
                weight = 0;
              } else if (isDumbbell) {
                weight = 5;
              } else if (isExtensionCurl || isSeatedRow) {
                weight = 15;
              } else if (ename === 'レッグプレス') {
                weight = 40;
              } else if (ename === 'ラットプルダウン') {
                weight = 25;
              }

              for (let sn = 1; sn <= 3; sn++) {
                await _db.runAsync(
                  'INSERT INTO routine_sets (routine_exercise_id, set_number, reps, weight, rpe) VALUES (?, ?, ?, ?, ?)',
                  [reid, sn, reps, weight, null]
                );
              }
            }
          }
        }
      });
    }

    const settingsCountRow = await _db.getFirstAsync<{count: number}>('SELECT count(*) as count FROM settings');
    if (settingsCountRow && settingsCountRow.count === 0) {
      await _db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['default_rest_timer', '90']);
      await _db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['auto_rest_timer', '1']);
      await _db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['timer_notification', '1']);
    }

    await _db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['initial_seeding_done', 'true']);
  }

  try {
    const allRows = await _db.getAllAsync<{ key: string }>('SELECT key FROM settings');
    const existingKeys = new Set(allRows.map(row => row.key));

    const settingsToInsert: { key: string; value: string }[] = [];

    if (!existingKeys.has('user_uuid')) {
      const newUuid = generateUUID();
      const nowISO = new Date().toISOString();
      const campaignDeadline = new Date('2026-07-31T23:59:59.999Z').getTime();
      const isEarly = Date.now() <= campaignDeadline ? 'true' : 'false';
      const initialPremium = isEarly === 'true' ? 'perpetual' : '';

      settingsToInsert.push({ key: 'user_uuid', value: newUuid });
      settingsToInsert.push({ key: 'install_date', value: nowISO });
      settingsToInsert.push({ key: 'is_early_adopter', value: isEarly });
      if (!existingKeys.has('premium_until')) {
        settingsToInsert.push({ key: 'premium_until', value: initialPremium });
      }
    }

    const preAllocations: { [key: string]: string } = {
      my_referral_code: '',
      referred_by_code: '',
      premium_until: '',
      is_sms_verified: 'false',
      referral_active_count: '0',
      ai_tokens_balance: '20',
      ai_tokens_last_reset: new Date().toISOString(),
      has_shown_review_prompt: '0',
      keep_awake: '1',
      always_one_set: '0',
      preferred_ai_model: 'gemini',
      ai_chat_mode: 'quick',
      background_theme: 'dark',
    };

    for (const [key, defaultValue] of Object.entries(preAllocations)) {
      if (!existingKeys.has(key) && !settingsToInsert.some(item => item.key === key)) {
        settingsToInsert.push({ key, value: defaultValue });
      }
    }

    if (settingsToInsert.length > 0) {
      for (const item of settingsToInsert) {
        await _db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [item.key, item.value]);
      }
    }
  } catch (e) {
    console.warn('Migration/Campaign Init: Failed to pre-allocate settings keys', e);
  }

  setDB(_db);
  return _db;
};

export const resetDatabase = async () => {
  const conn = getDB();
  await conn.withTransactionAsync(async () => {
    await conn.runAsync('DELETE FROM workouts');
    await conn.runAsync('DELETE FROM workout_exercises');
    await conn.runAsync('DELETE FROM workout_sets');
    await conn.runAsync('DELETE FROM routines');
    await conn.runAsync('DELETE FROM routine_exercises');
    await conn.runAsync('DELETE FROM routine_sets');
    await conn.runAsync('DELETE FROM settings');
    await conn.runAsync('DELETE FROM favorite_exercises');
    await conn.runAsync('DELETE FROM exercises');
    await conn.runAsync('DELETE FROM habit_logs');
    await conn.runAsync('DELETE FROM habit_items');
    await conn.runAsync('DELETE FROM water_logs');
    await conn.runAsync('DELETE FROM time_logs');
    await conn.runAsync('DELETE FROM meal_logs');
    await conn.runAsync('DELETE FROM meal_favorites');
    await conn.runAsync('DELETE FROM autophagy_config');
    await conn.runAsync('DELETE FROM body_composition_logs');
  });

  // setDB(null) の前に再初期化 Promise をセットしておく。
  // これにより withDBQueue が db===null の間も dbPromise を参照して待機できる。
  const reinitPromise = initDB();
  setDB(null);
  setDBPromise(reinitPromise);
  await reinitPromise;
};
