import * as SQLite from 'expo-sqlite';

// Initialize the database connection
let db: SQLite.SQLiteDatabase | null = null;

export const initDB = async () => {
  if (db) return db;
  const _db = await SQLite.openDatabaseAsync('gymtracker.db');

  // Create tables if they don't exist
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group TEXT,
      equipment TEXT,
      is_unilateral INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      notes TEXT
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

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favorite_exercises (
      exercise_id INTEGER PRIMARY KEY,
      FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );
  `);

  // Migration: Add notes to workout_exercises if missing
  try {
    const tableInfo = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(workout_exercises)`);
    if (!tableInfo.find(c => c.name === 'notes')) {
      await _db.execAsync(`ALTER TABLE workout_exercises ADD COLUMN notes TEXT`);
    }
  } catch (e) {
    console.warn('Migration: Failed to add notes column', e);
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
  } catch (e) {
    console.warn('Migration: Failed to add time columns to workout_sets', e);
  }

  // Migration: Add is_unilateral to exercises if missing
  try {
    const tableInfoEx = await _db.getAllAsync<{ name: string }>(`PRAGMA table_info(exercises)`);
    if (!tableInfoEx.find(c => c.name === 'is_unilateral')) {
      await _db.execAsync(`ALTER TABLE exercises ADD COLUMN is_unilateral INTEGER DEFAULT 0;`);
    }
  } catch (e) {
    console.warn('Migration: Failed to add is_unilateral to exercises', e);
  }

  // Seed exercises if missing
  const exercises = [
    // Chest
    { name: 'ベンチプレス', group: '胸', equip: 'バーベル' },
    { name: 'インクラインベンチプレス', group: '胸', equip: 'バーベル' },
    { name: 'デクラインベンチプレス', group: '胸', equip: 'バーベル' },
    { name: 'ダンベルプレス', group: '胸', equip: 'ダンベル' },
    { name: 'インクラインダンベルプレス', group: '胸', equip: 'ダンベル' },
    { name: 'デクラインダンベルプレス', group: '胸', equip: 'ダンベル' },
    { name: 'ダンベルフライ', group: '胸', equip: 'ダンベル' },
    { name: 'インクラインダンベルフライ', group: '胸', equip: 'ダンベル' },
    { name: 'ケーブルクロスオーバー', group: '胸', equip: 'ケーブル' },
    { name: 'ペックデックフライ', group: '胸', equip: 'マシン' },
    { name: 'チェストプレス', group: '胸', equip: 'マシン' },
    { name: 'スミスマシン ベンチプレス', group: '胸', equip: 'スミスマシン' },
    { name: 'スミスマシン インクラインプレス', group: '胸', equip: 'スミスマシン' },
    { name: 'プッシュアップ (腕立て伏せ)', group: '胸', equip: '自重' },
    { name: '加重プッシュアップ', group: '胸', equip: 'ウエイト' },
    { name: 'ディップス', group: '胸', equip: '自重' },
    { name: '加重ディップス', group: '胸', equip: 'ウエイト' },
    
    // Back
    { name: 'デッドリフト', group: '背中', equip: 'バーベル' },
    { name: 'ルーマニアンデッドリフト', group: '背中', equip: 'バーベル' },
    { name: 'ハーフデッドリフト', group: '背中', equip: 'バーベル' },
    { name: '懸垂 (チンニング)', group: '背中', equip: '自重' },
    { name: '加重懸垂', group: '背中', equip: 'ウエイト' },
    { name: 'ラットプルダウン', group: '背中', equip: 'ケーブル' },
    { name: 'リバースグリップ ラットプルダウン', group: '背中', equip: 'ケーブル' },
    { name: 'ベントオーバーロウ', group: '背中', equip: 'バーベル' },
    { name: 'ペンレイロウ', group: '背中', equip: 'バーベル' },
    { name: 'ワンアームダンベルロウ', group: '背中', equip: 'ダンベル' },
    { name: 'シーテッドロウ', group: '背中', equip: 'ケーブル' },
    { name: 'Tバーロウ', group: '背中', equip: 'マシン' },
    { name: 'シュラッグ', group: '背中', equip: 'バーベル' },
    { name: 'ダンベルシュラッグ', group: '背中', equip: 'ダンベル' },
    { name: 'プルオーバー', group: '背中', equip: 'ダンベル' },
    { name: 'ストレートアームプルダウン', group: '背中', equip: 'ケーブル' },
    { name: 'バックエクステンション', group: '背中', equip: '自重' },
    
    // Shoulders
    { name: 'オーバーヘッドプレス (ミリタリープレス)', group: '肩', equip: 'バーベル' },
    { name: 'ダンベルショルダープレス', group: '肩', equip: 'ダンベル' },
    { name: 'アーノルドプレス', group: '肩', equip: 'ダンベル' },
    { name: 'スミスマシン ショルダープレス', group: '肩', equip: 'スミスマシン' },
    { name: 'マシンショルダープレス', group: '肩', equip: 'マシン' },
    { name: 'サイドレイズ', group: '肩', equip: 'ダンベル' },
    { name: 'ケーブルサイドレイズ', group: '肩', equip: 'ケーブル' },
    { name: 'フロントレイズ', group: '肩', equip: 'ダンベル' },
    { name: 'ケーブルフロントレイズ', group: '肩', equip: 'ケーブル' },
    { name: 'リアデルトフライ', group: '肩', equip: 'マシン' },
    { name: 'ダンベルリアレイズ', group: '肩', equip: 'ダンベル' },
    { name: 'フェイスプル', group: '肩', equip: 'ケーブル' },
    { name: 'アップライトロウ', group: '肩', equip: 'バーベル' },
    { name: 'ケーブルアップライトロウ', group: '肩', equip: 'ケーブル' },

    // Arms
    { name: 'バーベルカール', group: '腕', equip: 'バーベル' },
    { name: 'EZバーカール', group: '腕', equip: 'EZバー' },
    { name: 'ダンベルカール', group: '腕', equip: 'ダンベル' },
    { name: 'インクラインダンベルカール', group: '腕', equip: 'ダンベル' },
    { name: 'ハンマーカール', group: '腕', equip: 'ダンベル' },
    { name: 'プリーチャーカール', group: '腕', equip: 'EZバー' },
    { name: 'ケーブルカール', group: '腕', equip: 'ケーブル' },
    { name: 'コンセントレーションカール', group: '腕', equip: 'ダンベル' },
    { name: 'リバースカール', group: '腕', equip: 'EZバー' },
    { name: 'ナローグリップ ベンチプレス', group: '腕', equip: 'バーベル' },
    { name: 'トライセップスエクステンション', group: '腕', equip: 'EZバー' },
    { name: 'ダンベル トライセップスエクステンション', group: '腕', equip: 'ダンベル' },
    { name: 'ケーブルプッシュダウン', group: '腕', equip: 'ケーブル' },
    { name: 'スカルクラッシャー', group: '腕', equip: 'EZバー' },
    { name: 'キックバック', group: '腕', equip: 'ダンベル' },
    { name: 'リストカール', group: '腕', equip: 'ダンベル' },

    // Legs
    { name: 'スクワット', group: '脚', equip: 'バーベル' },
    { name: 'フロントスクワット', group: '脚', equip: 'バーベル' },
    { name: 'ゴブレットスクワット', group: '脚', equip: 'ダンベル' },
    { name: 'スミスマシン スクワット', group: '脚', equip: 'スミスマシン' },
    { name: 'レッグプレス', group: '脚', equip: 'マシン' },
    { name: 'ハックスクワット', group: '脚', equip: 'マシン' },
    { name: 'ブルガリアンスプリットスクワット', group: '脚', equip: 'ダンベル' },
    { name: 'ランジ', group: '脚', equip: 'ダンベル' },
    { name: 'ウォーキングランジ', group: '脚', equip: 'ダンベル' },
    { name: 'レッグエクステンション', group: '脚', equip: 'マシン' },
    { name: 'レッグカール', group: '脚', equip: 'マシン' },
    { name: 'シーテッドレッグカール', group: '脚', equip: 'マシン' },
    { name: 'スタンディングカーフレイズ', group: '脚', equip: 'マシン' },
    { name: 'シーテッドカーフレイズ', group: '脚', equip: 'マシン' },
    { name: 'ヒップスラスト', group: '脚', equip: 'バーベル' },
    { name: 'マシンアブダクター (外転)', group: '脚', equip: 'マシン' },
    { name: 'マシンアダクター (内転)', group: '脚', equip: 'マシン' },
    { name: 'グッドモーニング', group: '脚', equip: 'バーベル' },

    // Core
    { name: 'クランチ', group: '腹筋', equip: '自重' },
    { name: 'シットアップ', group: '腹筋', equip: '自重' },
    { name: 'プランク', group: '腹筋', equip: '自重' },
    { name: 'レッグレイズ', group: '腹筋', equip: '自重' },
    { name: 'ハンギングレッグレイズ', group: '腹筋', equip: '自重' },
    { name: 'アブローラー', group: '腹筋', equip: 'その他' },
    { name: 'ケーブルクランチ', group: '腹筋', equip: 'ケーブル' },
    { name: 'ロシアンツイスト', group: '腹筋', equip: 'ウエイト' },
    { name: 'マウンテンクライマー', group: '腹筋', equip: '自重' },
    { name: 'アブドミナルマシン', group: '腹筋', equip: 'マシン' }
  ];

  const seedFlag = await _db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = "initial_seeding_done"');

  if (!seedFlag) {
    const existing = await _db.getAllAsync<{ name: string }>('SELECT name FROM exercises');
    const existingNames = new Set(existing.map(e => e.name));

    if (existingNames.size < exercises.length) {
      await _db.withTransactionAsync(async () => {
        for (const ex of exercises) {
          if (!existingNames.has(ex.name)) {
            await _db.runAsync(
              'INSERT INTO exercises (name, muscle_group, equipment) VALUES (?, ?, ?)',
              [ex.name, ex.group, ex.equip]
            );
          }
        }
      });
    }

    // Seed default routines
    const routineCountRow = await _db.getFirstAsync<{count: number}>('SELECT count(*) as count FROM routines');
    if (routineCountRow && routineCountRow.count === 0) {
      const defaultRoutines = [
        {
          title: 'Push Day (押す日)',
          description: 'ベンチプレス, オーバーヘッドプレス, トライセップス...',
          exerciseNames: ['ベンチプレス', 'オーバーヘッドプレス (ミリタリープレス)', 'プッシュアップ (腕立て伏せ)', 'トライセップスエクステンション']
        },
        {
          title: 'Pull Day (引く日)',
          description: '懸垂, バーベルロウ, バイセップス...',
          exerciseNames: ['デッドリフト', '懸垂 (チンニング)', 'ラットプルダウン', 'バーベルカール']
        }
      ];

      await _db.withTransactionAsync(async () => {
        for (const r of defaultRoutines) {
          const res = await _db.runAsync('INSERT INTO routines (title, description) VALUES (?, ?)', [r.title, r.description]);
          const rid = res.lastInsertRowId;
          let order = 0;
          for (const ename of r.exerciseNames) {
            const row = await _db.getFirstAsync<{id: number}>('SELECT id FROM exercises WHERE name = ?', [ename]);
            if (row) {
              await _db.runAsync('INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES (?, ?, ?)', [rid, row.id, order++]);
            }
          }
        }
      });
    }

    // Seed default settings
    const settingsCountRow = await _db.getFirstAsync<{count: number}>('SELECT count(*) as count FROM settings');
    if (settingsCountRow && settingsCountRow.count === 0) {
      await _db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['default_rest_timer', '90']);
      await _db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['auto_rest_timer', '1']);
    }

    await _db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['initial_seeding_done', 'true']);
  }

  db = _db;
  return db;
};
export const getDB = () => {
  if (!db) throw new Error('Database not initialized! Call initDB() first.');
  return db;
};

export const saveWorkout = async (title: string, startTime: string, endTime: string, notes: string | null, exercises: any[]) => {
  const conn = getDB();
  const wResult = await conn.runAsync(
    'INSERT INTO workouts (title, start_time, end_time, notes) VALUES (?, ?, ?, ?)',
    [title, startTime, endTime, notes]
  );
  
  const workoutId = wResult.lastInsertRowId;
  let order = 0;

  for (const ex of exercises) {
    // Save mapping
    const waResult = await conn.runAsync(
      'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order, notes) VALUES (?, ?, ?, ?)',
      [workoutId, ex.exercise_id, order++, ex.notes || null]
    );
    const weId = waResult.lastInsertRowId;

    // Save sets
    for (const set of ex.sets) {
      if (set.weight != null || set.reps != null) { // only save valid sets
        await conn.runAsync(
          'INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight, rpe, is_completed, rest_seconds, work_seconds, side) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [weId, set.set_number, set.reps, set.weight, set.rpe, set.is_completed ? 1 : 0, set.rest_seconds || null, set.work_seconds || null, set.side || null]
        );
      }
    }
  }
};

export const getExercises = async () => {
  const conn = getDB();
  return await conn.getAllAsync('SELECT * FROM exercises ORDER BY name');
};

export const getExerciseById = async (id: number) => {
  const conn = getDB();
  return await conn.getFirstAsync('SELECT * FROM exercises WHERE id = ?', [id]);
};

export const getExerciseHistory = async (exerciseId: number) => {
  const conn = getDB();
  const rows = await conn.getAllAsync<{
    workout_id: number;
    start_time: string;
    set_number: number;
    reps: number | null;
    weight: number | null;
    rpe: number | null;
    rest_seconds: number | null;
    work_seconds: number | null;
    side: string | null;
  }>(`
    SELECT w.id as workout_id, w.start_time, ws.set_number, ws.reps, ws.weight, ws.rpe, ws.rest_seconds, ws.work_seconds, ws.side
    FROM workout_sets ws
    JOIN workout_exercises we ON ws.workout_exercise_id = we.id
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.exercise_id = ? AND ws.is_completed = 1
    ORDER BY w.start_time DESC, ws.set_number ASC
  `, [exerciseId]);

  // Group by workout
  const historyMap = new Map<number, { workout_id: number, start_time: string, sets: any[] }>();
  
  for (const row of rows) {
    if (!historyMap.has(row.workout_id)) {
      historyMap.set(row.workout_id, {
        workout_id: row.workout_id,
        start_time: row.start_time,
        sets: []
      });
    }
    historyMap.get(row.workout_id)!.sets.push({
      set_number: row.set_number,
      reps: row.reps,
      weight: row.weight,
      rpe: row.rpe,
      rest_seconds: row.rest_seconds,
      work_seconds: row.work_seconds,
      side: row.side
    });
  }

  return Array.from(historyMap.values());
};

export const addCustomExercise = async (name: string, group: string, equip: string, isUnilateral: boolean = false) => {
  const conn = getDB();
  const res = await conn.runAsync(
    'INSERT INTO exercises (name, muscle_group, equipment, is_unilateral) VALUES (?, ?, ?, ?)',
    [name, group, equip, isUnilateral ? 1 : 0]
  );
  return res.lastInsertRowId;
};

export const getPreviousWorkoutSets = async (exerciseId: number) => {
  const conn = getDB();
  // Find the most recent workout_exercise_id for this exercise where sets exist
  const recentEx = await conn.getFirstAsync<{ id: number }>(`
    SELECT we.id 
    FROM workout_exercises we
    JOIN workouts w ON we.workout_id = w.id
    WHERE we.exercise_id = ?
    ORDER BY w.start_time DESC
    LIMIT 1
  `, [exerciseId]);

  if (!recentEx) return [];

  // Fetch the sets for that specific execution
  const sets = await conn.getAllAsync(`
    SELECT set_number, weight, reps, rpe, rest_seconds, work_seconds, side
    FROM workout_sets 
    WHERE workout_exercise_id = ?
    ORDER BY set_number ASC, id ASC
  `, [recentEx.id]);

  return sets as any[];
};

export const getPersonalRecords = async (exerciseId: number) => {
  const conn = getDB();
  const rows = await conn.getAllAsync<{ reps: number, max_weight: number }>(`
    SELECT ws.reps, MAX(ws.weight) as max_weight
    FROM workout_sets ws
    JOIN workout_exercises we ON ws.workout_exercise_id = we.id
    WHERE we.exercise_id = ? AND ws.is_completed = 1 AND ws.reps IS NOT NULL AND ws.weight IS NOT NULL
    GROUP BY ws.reps
    ORDER BY ws.reps ASC
  `, [exerciseId]);
  
  const prMap: Record<number, number> = {};
  for (const row of rows) {
    if (row.reps > 0) {
      prMap[row.reps] = row.max_weight;
    }
  }
  return prMap;
};

export const getRoutines = async () => {
  const conn = getDB();
  const routines = await conn.getAllAsync<{id: number, title: string, description: string}>('SELECT * FROM routines ORDER BY id ASC');
  
  const result = [];
  for (const r of routines) {
    const exercises = await conn.getAllAsync(`
      SELECT e.id, e.name, e.muscle_group, e.equipment 
      FROM routine_exercises re
      JOIN exercises e ON re.exercise_id = e.id
      WHERE re.routine_id = ?
      ORDER BY re.sort_order ASC
    `, [r.id]);
    result.push({ ...r, exercises });
  }
  return result;
};

export const addRoutine = async (title: string, description: string, exerciseIds: number[]) => {
  const conn = getDB();
  const res = await conn.runAsync('INSERT INTO routines (title, description) VALUES (?, ?)', [title, description]);
  const routineId = res.lastInsertRowId;
  
  let order = 0;
  for (const exId of exerciseIds) {
    await conn.runAsync('INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES (?, ?, ?)', [routineId, exId, order++]);
  }
};

export const deleteRoutine = async (id: number) => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM routines WHERE id = ?', [id]);
};

export const getSettings = async () => {
  const conn = getDB();
  const rows = await conn.getAllAsync<{key: string, value: string}>('SELECT * FROM settings');
  const settings: Record<string, string> = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return settings;
};

export const saveSetting = async (key: string, value: string) => {
  const conn = getDB();
  await conn.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
};

export const deleteWorkout = async (id: number) => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
};

export const loadFullWorkoutData = async (workoutId: number) => {
  const db = getDB();
  const workoutRow = await db.getFirstAsync('SELECT * FROM workouts WHERE id = ?', [workoutId]) as any;
  if (!workoutRow) return null;

  const exercisesRows = await db.getAllAsync('SELECT we.id as workout_exercise_id, e.id as exercise_id, e.name as exercise_name, we.notes FROM workout_exercises we JOIN exercises e ON we.exercise_id = e.id WHERE we.workout_id = ? ORDER BY we.sort_order', [workoutId]) as any[];
  
  const exercisesData = [];
  for (const ex of exercisesRows) {
    const sets = await db.getAllAsync('SELECT id, set_number, weight, reps, rpe, rest_seconds, work_seconds, side FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number ASC, id ASC', [ex.workout_exercise_id]) as any[];
    exercisesData.push({
      workout_exercise_id: ex.workout_exercise_id,
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      notes: ex.notes,
      sets: sets
    });
  }

  return {
    id: workoutRow.id,
    title: workoutRow.title,
    start_time: workoutRow.start_time,
    end_time: workoutRow.end_time,
    notes: workoutRow.notes,
    exercises: exercisesData
  };
};

export const updateWorkoutSet = async (setId: number, weight: number | null, reps: number | null, rpe: number | null) => {
  const conn = getDB();
  await conn.runAsync('UPDATE workout_sets SET weight = ?, reps = ?, rpe = ? WHERE id = ?', [weight, reps, rpe, setId]);
};

export const deleteWorkoutSet = async (setId: number) => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM workout_sets WHERE id = ?', [setId]);
};

export const updateWorkoutTitle = async (workoutId: number, title: string) => {
  const conn = getDB();
  await conn.runAsync('UPDATE workouts SET title = ? WHERE id = ?', [title, workoutId]);
};

export const updateWorkoutOverallNotes = async (workoutId: number, notes: string | null) => {
  const conn = getDB();
  await conn.runAsync('UPDATE workouts SET notes = ? WHERE id = ?', [notes, workoutId]);
};

export const updateWorkoutExerciseNotes = async (weId: number, notes: string | null) => {
  const conn = getDB();
  await conn.runAsync('UPDATE workout_exercises SET notes = ? WHERE id = ?', [notes, weId]);
};

export const getFavoriteIds = async (): Promise<Set<number>> => {
  const conn = getDB();
  const rows = await conn.getAllAsync<{ exercise_id: number }>('SELECT exercise_id FROM favorite_exercises');
  return new Set(rows.map(r => r.exercise_id));
};

export const toggleFavorite = async (exerciseId: number, isFav: boolean): Promise<void> => {
  const conn = getDB();
  if (isFav) {
    await conn.runAsync('DELETE FROM favorite_exercises WHERE exercise_id = ?', [exerciseId]);
  } else {
    await conn.runAsync('INSERT OR IGNORE INTO favorite_exercises (exercise_id) VALUES (?)', [exerciseId]);
  }
};

export const deleteExercise = async (id: number) => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
};
