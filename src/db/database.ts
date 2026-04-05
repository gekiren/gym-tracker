import * as SQLite from 'expo-sqlite';

// Initialize the database connection
let db: SQLite.SQLiteDatabase | null = null;

export const initDB = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('gymtracker.db');

  // Create tables if they don't exist
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group TEXT,
      equipment TEXT
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
      FOREIGN KEY(workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
    );
  `);

  // Seed initial basic exercises if none exist
  const countResult = await db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM exercises');
  if (countResult && countResult.count === 0) {
    console.log('Seeding initial exercises...');
    const exercises = [
      { name: 'ベンチプレス (Barbell)', group: '胸', equip: 'バーベル' },
      { name: 'スクワット (Barbell)', group: '脚', equip: 'バーベル' },
      { name: 'デッドリフト (Barbell)', group: '背中', equip: 'バーベル' },
      { name: 'オーバーヘッドプレス (Dumbbell)', group: '肩', equip: 'ダンベル' },
      { name: '懸垂 (Pull-up)', group: '背中', equip: '自重' },
      { name: 'アームカール (Dumbbell)', group: '腕', equip: 'ダンベル' }
    ];
    for (const ex of exercises) {
      await db.runAsync(
        'INSERT INTO exercises (name, muscle_group, equipment) VALUES (?, ?, ?)',
        [ex.name, ex.group, ex.equip]
      );
    }
  }

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
      'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order) VALUES (?, ?, ?)',
      [workoutId, ex.exercise_id, order++]
    );
    const weId = waResult.lastInsertRowId;

    // Save sets
    for (const set of ex.sets) {
      if (set.weight != null || set.reps != null) { // only save valid sets
        await conn.runAsync(
          'INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight, rpe, is_completed) VALUES (?, ?, ?, ?, ?, ?)',
          [weId, set.set_number, set.reps, set.weight, set.rpe, set.is_completed ? 1 : 0]
        );
      }
    }
  }
};
