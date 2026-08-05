import * as SQLite from 'expo-sqlite';
import { PRESET_EXERCISES, PRESET_ROUTINES } from './constants';
import { setDB, setDBPromise, getDBPromise, getDB, closeDB } from './connection';

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

export const initDB = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    return getDB();
  } catch (_) {
    // If getDB() throws because db is null, proceed to initialize
  }

  const existingPromise = getDBPromise();
  if (existingPromise) return existingPromise;

  const promise = _initDBInternal();
  setDBPromise(promise);
  return promise;
};

const _initDBInternal = async (): Promise<SQLite.SQLiteDatabase> => {
  const _db = await SQLite.openDatabaseAsync('gymtracker.db', { useNewConnection: true });

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
      default_stance TEXT
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
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_item_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY(habit_item_id) REFERENCES habit_items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);
  `);

  // Migration: Ensure routine_sets exists
  try {
    await _db.execAsync(`
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
    `);
  } catch (e) {
    console.warn('Migration: Failed to ensure routine_sets table', e);
  }

  // Migration: Add notes to workout_exercises if missing
  try {
    const tableInfo = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(workout_exercises)`);
    if (!tableInfo.find(c => c.name === 'notes')) {
      await _db.execAsync(`ALTER TABLE workout_exercises ADD COLUMN notes TEXT`);
    }
  } catch (e) {
    console.warn('Migration: Failed to add notes column', e);
  }

  // Migration: Add calories to workouts if missing
  try {
    const tableInfoW = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(workouts)`);
    if (!tableInfoW.find(c => c.name === 'calories')) {
      await _db.execAsync(`ALTER TABLE workouts ADD COLUMN calories REAL`);
    }
    if (!tableInfoW.find(c => c.name === 'avg_heart_rate')) {
      await _db.execAsync(`
        ALTER TABLE workouts ADD COLUMN avg_heart_rate INTEGER;
        ALTER TABLE workouts ADD COLUMN max_heart_rate INTEGER;
        ALTER TABLE workouts ADD COLUMN calories_burned INTEGER;
      `);
    }
  } catch (e) {
    console.warn('Migration: Failed to add calories/heart_rate columns', e);
  }

  // Migration: Add rest_seconds and work_seconds to workout_sets if missing
  try {
    const tableInfoSets = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(workout_sets)`);
    if (!tableInfoSets.find(c => c.name === 'rest_seconds')) {
      await _db.execAsync(`
        ALTER TABLE workout_sets ADD COLUMN rest_seconds INTEGER;
        ALTER TABLE workout_sets ADD COLUMN work_seconds INTEGER;
      `);
    }
    if (!tableInfoSets.find(c => c.name === 'side')) {
      await _db.execAsync(`ALTER TABLE workout_sets ADD COLUMN side TEXT;`);
    }
    if (!tableInfoSets.find(c => c.name === 'variation')) {
      await _db.execAsync(`ALTER TABLE workout_sets ADD COLUMN variation TEXT;`);
    }
    if (!tableInfoSets.find(c => c.name === 'stance')) {
      await _db.execAsync(`ALTER TABLE workout_sets ADD COLUMN stance TEXT;`);
      await _db.runAsync(`UPDATE workout_sets SET stance = variation WHERE variation IS NOT NULL`);
    }
  } catch (e) {
    console.warn('Migration: Failed to add time/side/variation/stance columns to workout_sets', e);
  }

  // Migration: Add stance to routine_sets if missing
  try {
    const tableInfoRoutineSets = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(routine_sets)`);
    if (!tableInfoRoutineSets.find(c => c.name === 'stance')) {
      await _db.execAsync(`ALTER TABLE routine_sets ADD COLUMN stance TEXT;`);
      await _db.runAsync(`UPDATE routine_sets SET stance = variation WHERE variation IS NOT NULL`);
    }
  } catch (e) {
    console.warn('Migration: Failed to add stance column to routine_sets', e);
  }

  // Migration: Add default_stance to exercises if missing
  try {
    const tableInfoEx = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(exercises)`);
    if (!tableInfoEx.find(c => c.name === 'default_stance')) {
      await _db.execAsync(`ALTER TABLE exercises ADD COLUMN default_stance TEXT;`);
      await _db.runAsync(`UPDATE exercises SET default_stance = default_variation WHERE default_variation IS NOT NULL`);
    }
  } catch (e) {
    console.warn('Migration: Failed to add default_stance column to exercises', e);
  }

  // Migration: Add is_unilateral and default_variation to exercises if missing
  try {
    const tableInfoEx = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(exercises)`);
    if (!tableInfoEx.find(c => c.name === 'is_unilateral')) {
      await _db.execAsync(`ALTER TABLE exercises ADD COLUMN is_unilateral INTEGER DEFAULT 0;`);
    }
    if (!tableInfoEx.find(c => c.name === 'default_variation')) {
      await _db.execAsync(`ALTER TABLE exercises ADD COLUMN default_variation TEXT;`);
    }
  } catch (e) {
    console.warn('Migration: Failed to add columns to exercises', e);
  }

  // Migration: Add caffeine to water_logs if missing
  try {
    const tableInfoWater = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(water_logs)`);
    if (!tableInfoWater.find(c => c.name === 'caffeine')) {
      await _db.execAsync(`ALTER TABLE water_logs ADD COLUMN caffeine INTEGER DEFAULT 0`);
    }
  } catch (e) {
    console.warn('Migration: Failed to add caffeine column to water_logs', e);
  }

  // Migration: Rename exercises to remove parenthetical suffixes
  try {
    const renames = [
      { from: 'プッシュアップ (腕立て伏せ)', to: 'プッシュアップ' },
      { from: '懸垂 (チンニング)', to: '懸垂' },
      { from: 'オーバーヘッドプレス (ミリタリープレス)', to: 'オーバーヘッドプレス' },
      { from: 'マシンアブダクター (外転)', to: 'マシンアブダクター' },
      { from: 'マシンアダクター (内転)', to: 'マシンアダクター' },
      { from: 'アームカール（ダンベル）', to: 'アームカール' },
      { from: 'アームカール (ダンベル)', to: 'アームカール' },
      { from: 'アームカール(Dumbbell)', to: 'アームカール' },
      { from: 'アームカール (Dumbbell)', to: 'アームカール' },
      { from: 'ベンチプレス (Barbell)', to: 'ベンチプレス' },
      { from: 'デッドリフト (Barbell)', to: 'デッドリフト' },
      { from: 'スクワット (Barbell)', to: 'スクワット' },
      { from: 'シュラッグ (Barbell)', to: 'シュラッグ' },
      { from: 'ヒップスラスト (Barbell)', to: 'ヒップスラスト' },
      { from: 'ベントオーバーロウ (Barbell)', to: 'ベントオーバーロウ' },
      { from: 'フロントスクワット (Barbell)', to: 'フロントスクワット' },
      { from: 'オーバーヘッドプレス (Barbell)', to: 'オーバーヘッドプレス' },
      { from: 'インクラインベンチプレス (Barbell)', to: 'インクラインベンチプレス' },
      { from: 'デクラインベンチプレス (Barbell)', to: 'デクラインベンチプレス' },
      { from: 'ダンベルプレス (Dumbbell)', to: 'ダンベルプレス' },
      { from: 'ダンベルフライ (Dumbbell)', to: 'ダンベルフライ' },
      { from: 'ダンベルシュラッグ (Dumbbell)', to: 'ダンベルシュラッグ' },
      { from: 'ダンベルカール (Dumbbell)', to: 'ダンベルカール' },
      { from: 'オーバーヘッドプレス (Dumbbell)', to: 'オーバーヘッドプレス' },
    ];
    for (const r of renames) {
      await _db.runAsync('UPDATE exercises SET name = ? WHERE name = ?', [r.to, r.from]);
    }
    await _db.runAsync('DELETE FROM exercises WHERE name = ?', ['懸垂 (Pull-up)']);

    await _db.runAsync('UPDATE routines SET title = "Push Day", description = "Bench Press, Overhead Press, Push-Up..." WHERE title = "Push Day (押す日)"');
    await _db.runAsync('UPDATE routines SET title = "Pull Day", description = "Deadlift, Pull-Up, Lat Pulldown..." WHERE title = "Pull Day (引く日)"');
    await _db.runAsync('DELETE FROM exercises WHERE name IN (?, ?, ?, ?)', ['加重懸垂', '加重プッシュアップ', '加重ディップス', 'リバースグリップ ラットプルダウン']);
    
    const unilateralExercises = ['ワンアームダンベルロウ', 'コンセントレーションカール', 'キックバック', 'ブルガリアンスプリットスクワット', 'ランジ', 'ウォーキングランジ'];
    await _db.runAsync(`UPDATE exercises SET is_unilateral = 1 WHERE name IN (${unilateralExercises.map(() => '?').join(',')})`, unilateralExercises);

    const aerobicEx = [
      { name: 'エアロバイク', group: '有酸素', equip: 'マシン' },
      { name: 'トレッドミル', group: '有酸素', equip: 'マシン' },
      { name: 'ランニング', group: '有酸素', equip: '自重' },
      { name: 'ウォーキング', group: '有酸素', equip: '自重' },
      { name: 'ローイングマシン', group: '有酸素', equip: 'マシン' },
      { name: 'クロストレーナー', group: '有酸素', equip: 'マシン' },
      { name: '縄跳び', group: '有酸素', equip: '自重' }
    ];
    for (const ex of aerobicEx) {
      const existing = await _db.getFirstAsync<{ id: number }>('SELECT id FROM exercises WHERE name = ?', [ex.name]);
      if (!existing) {
        await _db.runAsync(
          'INSERT INTO exercises (name, muscle_group, equipment, is_unilateral) VALUES (?, ?, ?, 0)',
          [ex.name, ex.group, ex.equip]
        );
      }
    }
  } catch (e) {
    console.warn('Migration: Failed to rename/cleanup/seed aerobic exercises', e);
  }

  // Migration: Add sort_order to routines if missing
  try {
    const tableInfoR = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(routines)`);
    if (!tableInfoR.find(c => c.name === 'sort_order')) {
      await _db.execAsync(`ALTER TABLE routines ADD COLUMN sort_order INTEGER DEFAULT 0;`);
    }
  } catch (e) {
    console.warn('Migration: Failed to add sort_order column to routines', e);
  }

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
    }

    await _db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['initial_seeding_done', 'true']);
  }

  try {
    const allRows = await _db.getAllAsync<{ key: string }>('SELECT key FROM settings');
    const existingKeys = new Set(allRows.map(row => row.key));

    const generateUUID = () => {
      if (typeof global !== 'undefined' && global.crypto && typeof global.crypto.getRandomValues === 'function') {
        try {
          const typedArray = new Uint8Array(16);
          global.crypto.getRandomValues(typedArray);
          typedArray[6] = (typedArray[6] & 0x0f) | 0x40;
          typedArray[8] = (typedArray[8] & 0x3f) | 0x80;
          const hex = Array.from(typedArray).map(b => b.toString(16).padStart(2, '0'));
          return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
        } catch (e) {
          console.warn('Failed to generate secure UUID, falling back to Math.random', e);
        }
      }
      
      let d = Date.now();
      let d2 = 0;
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        let r = Math.random() * 16;
        if (d > 0) {
          r = (d + r) % 16 | 0;
          d = Math.floor(d / 16);
        } else {
          r = (d2 + r) % 16 | 0;
          d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    };

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
  });

  setDB(null);
  setDBPromise(null);
  await initDB();
};

