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
      is_unilateral INTEGER DEFAULT 0,
      default_variation TEXT
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
  } catch (e) {
    console.warn('Migration: Failed to add calories column', e);
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
  } catch (e) {
    console.warn('Migration: Failed to add time/side/variation columns to workout_sets', e);
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

  // Migration: Rename exercises to remove parenthetical suffixes
  try {
    const renames = [
      { from: '\u30d7\u30c3\u30b7\u30e5\u30a2\u30c3\u30d7 (\u8155\u7acb\u3066\u4f0f\u305b)', to: '\u30d7\u30c3\u30b7\u30e5\u30a2\u30c3\u30d7' },
      { from: '\u61f8\u5782 (\u30c1\u30f3\u30cb\u30f3\u30b0)', to: '\u61f8\u5782' },
      { from: '\u30aa\u30fc\u30d0\u30fc\u30d8\u30c3\u30c9\u30d7\u30ec\u30b9 (\u30df\u30ea\u30bf\u30ea\u30fc\u30d7\u30ec\u30b9)', to: '\u30aa\u30fc\u30d0\u30fc\u30d8\u30c3\u30c9\u30d7\u30ec\u30b9' },
      { from: '\u30de\u30b7\u30f3\u30a2\u30d6\u30c0\u30af\u30bf\u30fc (\u5916\u8ee2)', to: '\u30de\u30b7\u30f3\u30a2\u30d6\u30c0\u30af\u30bf\u30fc' },
      { from: '\u30de\u30b7\u30f3\u30a2\u30c0\u30af\u30bf\u30fc (\u5185\u8ee2)', to: '\u30de\u30b7\u30f3\u30a2\u30c0\u30af\u30bf\u30fc' },
      { from: '\u30a2\u30fc\u30e0\u30ab\u30fc\u30eb\uff08\u30c0\u30f3\u30d9\u30eb\uff09', to: '\u30a2\u30fc\u30e0\u30ab\u30fc\u30eb' },
      { from: '\u30a2\u30fc\u30e0\u30ab\u30fc\u30eb (\u30c0\u30f3\u30d9\u30eb)', to: '\u30a2\u30fc\u30e0\u30ab\u30fc\u30eb' },
      { from: '\u30a2\u30fc\u30e0\u30ab\u30fc\u30eb(Dumbbell)', to: '\u30a2\u30fc\u30e0\u30ab\u30fc\u30eb' },
      { from: '\u30a2\u30fc\u30e0\u30ab\u30fc\u30eb (Dumbbell)', to: '\u30a2\u30fc\u30e0\u30ab\u30fc\u30eb' },
      // (Barbell) suffix patterns
      { from: '\u30d9\u30f3\u30c1\u30d7\u30ec\u30b9 (Barbell)', to: '\u30d9\u30f3\u30c1\u30d7\u30ec\u30b9' },
      { from: '\u30c7\u30c3\u30c9\u30ea\u30d5\u30c8 (Barbell)', to: '\u30c7\u30c3\u30c9\u30ea\u30d5\u30c8' },
      { from: '\u30b9\u30af\u30ef\u30c3\u30c8 (Barbell)', to: '\u30b9\u30af\u30ef\u30c3\u30c8' },
      { from: '\u30b7\u30e5\u30e9\u30c3\u30b0 (Barbell)', to: '\u30b7\u30e5\u30e9\u30c3\u30b0' },
      { from: '\u30d2\u30c3\u30d7\u30b9\u30e9\u30b9\u30c8 (Barbell)', to: '\u30d2\u30c3\u30d7\u30b9\u30e9\u30b9\u30c8' },
      { from: '\u30d9\u30f3\u30c8\u30aa\u30fc\u30d0\u30fc\u30ed\u30a6 (Barbell)', to: '\u30d9\u30f3\u30c8\u30aa\u30fc\u30d0\u30fc\u30ed\u30a6' },
      { from: '\u30d5\u30ed\u30f3\u30c8\u30b9\u30af\u30ef\u30c3\u30c8 (Barbell)', to: '\u30d5\u30ed\u30f3\u30c8\u30b9\u30af\u30ef\u30c3\u30c8' },
      { from: '\u30aa\u30fc\u30d0\u30fc\u30d8\u30c3\u30c9\u30d7\u30ec\u30b9 (Barbell)', to: '\u30aa\u30fc\u30d0\u30fc\u30d8\u30c3\u30c9\u30d7\u30ec\u30b9' },
      { from: '\u30a4\u30f3\u30af\u30e9\u30a4\u30f3\u30d9\u30f3\u30c1\u30d7\u30ec\u30b9 (Barbell)', to: '\u30a4\u30f3\u30af\u30e9\u30a4\u30f3\u30d9\u30f3\u30c1\u30d7\u30ec\u30b9' },
      { from: '\u30c7\u30af\u30e9\u30a4\u30f3\u30d9\u30f3\u30c1\u30d7\u30ec\u30b9 (Barbell)', to: '\u30c7\u30af\u30e9\u30a4\u30f3\u30d9\u30f3\u30c1\u30d7\u30ec\u30b9' },
      // (Dumbbell) suffix patterns
      { from: '\u30c0\u30f3\u30d9\u30eb\u30d7\u30ec\u30b9 (Dumbbell)', to: '\u30c0\u30f3\u30d9\u30eb\u30d7\u30ec\u30b9' },
      { from: '\u30c0\u30f3\u30d9\u30eb\u30d5\u30e9\u30a4 (Dumbbell)', to: '\u30c0\u30f3\u30d9\u30eb\u30d5\u30e9\u30a4' },
      { from: '\u30c0\u30f3\u30d9\u30eb\u30b7\u30e5\u30e9\u30c3\u30b0 (Dumbbell)', to: '\u30c0\u30f3\u30d9\u30eb\u30b7\u30e5\u30e9\u30c3\u30b0' },
      { from: '\u30c0\u30f3\u30d9\u30eb\u30ab\u30fc\u30eb (Dumbbell)', to: '\u30c0\u30f3\u30d9\u30eb\u30ab\u30fc\u30eb' },
      { from: '\u30aa\u30fc\u30d0\u30fc\u30d8\u30c3\u30c9\u30d7\u30ec\u30b9 (Dumbbell)', to: '\u30aa\u30fc\u30d0\u30fc\u30d8\u30c3\u30c9\u30d7\u30ec\u30b9' },
      // (Pull-up) - delete handled separately
    ];
    for (const r of renames) {
      await _db.runAsync('UPDATE exercises SET name = ? WHERE name = ?', [r.to, r.from]);
    }
    // Delete 懸垂 (Pull-up) as duplicate of 懸垂
    await _db.runAsync('DELETE FROM exercises WHERE name = ?', ['懸垂 (Pull-up)']);

    // Migration: Rename default routines
    await _db.runAsync('UPDATE routines SET title = "Push Day", description = "Bench Press, Overhead Press, Push-Up..." WHERE title = "Push Day (押す日)"');
    await _db.runAsync('UPDATE routines SET title = "Pull Day", description = "Deadlift, Pull-Up, Lat Pulldown..." WHERE title = "Pull Day (引く日)"');
    // Migration: Remove weighted bodyweight exercises and reverse grip lat pulldown as requested
    await _db.runAsync('DELETE FROM exercises WHERE name IN (?, ?, ?, ?)', ['加重懸垂', '加重プッシュアップ', '加重ディップス', 'リバースグリップ ラットプルダウン']);
    
    // Migration: Set is_unilateral = 1 for specific exercises
    const unilateralExercises = ['ワンアームダンベルロウ', 'コンセントレーションカール', 'キックバック', 'ブルガリアンスプリットスクワット', 'ランジ', 'ウォーキングランジ'];
    await _db.runAsync(`UPDATE exercises SET is_unilateral = 1 WHERE name IN (${unilateralExercises.map(() => '?').join(',')})`, unilateralExercises);

    // Migration: Add new aerobic exercises if they do not exist
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
    { name: 'プッシュアップ', group: '胸', equip: '自重' },
    { name: 'ディップス', group: '胸', equip: '自重' },
    
    // Back
    { name: 'デッドリフト', group: '背中', equip: 'バーベル' },
    { name: 'ルーマニアンデッドリフト', group: '背中', equip: 'バーベル' },
    { name: 'ハーフデッドリフト', group: '背中', equip: 'バーベル' },
    { name: '懸垂', group: '背中', equip: '自重' },
    { name: 'ラットプルダウン', group: '背中', equip: 'ケーブル' },
    { name: 'ベントオーバーロウ', group: '背中', equip: 'バーベル' },
    { name: 'ペンレイロウ', group: '背中', equip: 'バーベル' },
    { name: 'ワンアームダンベルロウ', group: '背中', equip: 'ダンベル', is_unilateral: 1 },
    { name: 'シーテッドロウ', group: '背中', equip: 'ケーブル' },
    { name: 'Tバーロウ', group: '背中', equip: 'マシン' },
    { name: 'シュラッグ', group: '背中', equip: 'バーベル' },
    { name: 'ダンベルシュラッグ', group: '背中', equip: 'ダンベル' },
    { name: 'プルオーバー', group: '背中', equip: 'ダンベル' },
    { name: 'ストレートアームプルダウン', group: '背中', equip: 'ケーブル' },
    { name: 'バックエクステンション', group: '背中', equip: '自重' },
    
    // Shoulders
    { name: 'オーバーヘッドプレス', group: '肩', equip: 'バーベル' },
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
    { name: 'コンセントレーションカール', group: '腕', equip: 'ダンベル', is_unilateral: 1 },
    { name: 'リバースカール', group: '腕', equip: 'EZバー' },
    { name: 'ナローグリップ ベンチプレス', group: '腕', equip: 'バーベル' },
    { name: 'トライセップスエクステンション', group: '腕', equip: 'EZバー' },
    { name: 'ダンベル トライセップスエクステンション', group: '腕', equip: 'ダンベル' },
    { name: 'ケーブルプッシュダウン', group: '腕', equip: 'ケーブル' },
    { name: 'スカルクラッシャー', group: '腕', equip: 'EZバー' },
    { name: 'キックバック', group: '腕', equip: 'ダンベル', is_unilateral: 1 },
    { name: 'リストカール', group: '腕', equip: 'ダンベル' },

    // Legs
    { name: 'スクワット', group: '脚', equip: 'バーベル' },
    { name: 'フロントスクワット', group: '脚', equip: 'バーベル' },
    { name: 'ゴブレットスクワット', group: '脚', equip: 'ダンベル' },
    { name: 'スミスマシン スクワット', group: '脚', equip: 'スミスマシン' },
    { name: 'レッグプレス', group: '脚', equip: 'マシン' },
    { name: 'ハックスクワット', group: '脚', equip: 'マシン' },
    { name: 'ブルガリアンスプリットスクワット', group: '脚', equip: 'ダンベル', is_unilateral: 1 },
    { name: 'ランジ', group: '脚', equip: 'ダンベル', is_unilateral: 1 },
    { name: 'ウォーキングランジ', group: '脚', equip: 'ダンベル', is_unilateral: 1 },
    { name: 'レッグエクステンション', group: '脚', equip: 'マシン' },
    { name: 'レッグカール', group: '脚', equip: 'マシン' },
    { name: 'シーテッドレッグカール', group: '脚', equip: 'マシン' },
    { name: 'スタンディングカーフレイズ', group: '脚', equip: 'マシン' },
    { name: 'シーテッドカーフレイズ', group: '脚', equip: 'マシン' },
    { name: 'ヒップスラスト', group: '脚', equip: 'バーベル' },
    { name: 'マシンアブダクター', group: '脚', equip: 'マシン' },
    { name: 'マシンアダクター', group: '脚', equip: 'マシン' },
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
    { name: 'アブドミナルマシン', group: '腹筋', equip: 'マシン' },

    // Aerobic
    { name: 'エアロバイク', group: '有酸素', equip: 'マシン' },
    { name: 'トレッドミル', group: '有酸素', equip: 'マシン' },
    { name: 'ランニング', group: '有酸素', equip: '自重' },
    { name: 'ウォーキング', group: '有酸素', equip: '自重' },
    { name: 'ローイングマシン', group: '有酸素', equip: 'マシン' },
    { name: 'クロストレーナー', group: '有酸素', equip: 'マシン' },
    { name: '縄跳び', group: '有酸素', equip: '自重' }
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
              'INSERT INTO exercises (name, muscle_group, equipment, is_unilateral) VALUES (?, ?, ?, ?)',
              [ex.name, ex.group, ex.equip, ex.is_unilateral ? 1 : 0]
            );
          }
        }
      });
    }

    // Seed default routines (Updated to Lite User friendly menus)
    const routineCountRow = await _db.getFirstAsync<{count: number}>('SELECT count(*) as count FROM routines');
    
    // If empty or only contains the old 2 default routines (Push/Pull Day), upgrade them to the new 4 Lite Routines
    const oldRoutines = await _db.getAllAsync<{ title: string }>('SELECT title FROM routines');
    const isOldDefaultOnly = oldRoutines.length === 0 || 
      (oldRoutines.length <= 2 && oldRoutines.every(r => r.title === 'Push Day' || r.title === 'Pull Day'));

    if (routineCountRow && (routineCountRow.count === 0 || isOldDefaultOnly)) {
      // Clear old default routines if they exist
      await _db.runAsync('DELETE FROM routines WHERE title IN ("Push Day", "Pull Day")');
      
      const defaultRoutines = [
        {
          title: '全身の日 (Full Body)',
          description: 'マシンと自重を組み合わせた、全身をバランス良く鍛える初心者向けメニュー（約45分〜1時間）',
          exerciseNames: ['チェストプレス', 'ラットプルダウン', 'レッグプレス', 'プランク']
        },
        {
          title: '上半身の日 (Upper Body)',
          description: 'マシンとダンベルで上半身の主要な筋肉を効果的に刺激するメニュー（約45分〜1時間）',
          exerciseNames: ['チェストプレス', 'シーテッドロウ', 'ダンベルショルダープレス', 'ダンベルカール']
        },
        {
          title: '下半身の日 (Lower Body)',
          description: '安全なマシンを中心に、太ももとお尻を完璧に鍛え上げるメニュー（約45分〜1時間）',
          exerciseNames: ['レッグプレス', 'レッグエクステンション', 'レッグカール', 'マシンアブダクター']
        },
        {
          title: '自重の日 (Bodyweight)',
          description: '器具を一切使わず、自宅や旅行先でも畳1畳分で行える自重メニュー（約30分〜45分）',
          exerciseNames: ['プッシュアップ', 'バックエクステンション', 'クランチ', 'プランク']
        }
      ];

      // Fetch all exercises beforehand to create a name->id mapping memory cache,
      // fully eliminating async nested SELECT queries inside SQLite transactions
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

              // Determine beginner friendly default weight/reps for each set
              const isPlank = ename === 'プランク';
              const isDumbbell = ename.includes('ダンベル');
              const isExtensionCurl = ename === 'レッグエクステンション' || ename === 'レッグカール' || ename === 'マシンアブダクター';
              const isSeatedRow = ename === 'シーテッドロウ';
              
              let weight = 20;
              let reps = 10;

              if (isPlank) {
                reps = 1; // 1 hold
                weight = 0;
              } else if (ename === 'プッシュアップ' || ename === 'バックエクステンション' || ename === 'クランチ') {
                reps = ename === 'バックエクステンション' ? 12 : (ename === 'クランチ' ? 15 : 10);
                weight = 0;
              } else if (isDumbbell) {
                weight = 5; // 5kg for dumbbells
              } else if (isExtensionCurl || isSeatedRow) {
                weight = 15; // 15kg for lighter machines (leg extension/curl/abductor/seated row)
              } else if (ename === 'レッグプレス') {
                weight = 40; // 40kg for leg press
              } else if (ename === 'ラットプルダウン') {
                weight = 25; // 25kg for lat pulldown
              }

              // Insert exactly 3 sets for each exercise
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

    // Seed default settings
    const settingsCountRow = await _db.getFirstAsync<{count: number}>('SELECT count(*) as count FROM settings');
    if (settingsCountRow && settingsCountRow.count === 0) {
      await _db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['default_rest_timer', '90']);
      await _db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['auto_rest_timer', '1']);
    }

    await _db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['initial_seeding_done', 'true']);
  }

  // Ensure Campaign & Referral keys exist in settings for future monetization
  try {
    const allRows = await _db.getAllAsync<{ key: string }>('SELECT key FROM settings');
    const existingKeys = new Set(allRows.map(row => row.key));

    // Standard plain-JS UUID v4 generator to avoid native dependency issues
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const settingsToInsert: { key: string; value: string }[] = [];

    if (!existingKeys.has('user_uuid')) {
      const newUuid = generateUUID();
      const nowISO = new Date().toISOString();
      const campaignDeadline = new Date('2026-08-31T23:59:59.999Z').getTime();
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

  db = _db;
  return db;
};
export const getDB = () => {
  if (!db) throw new Error('Database not initialized! Call initDB() first.');
  return db;
};

export const saveWorkout = async (title: string, startTime: string, endTime: string, notes: string | null, exercises: any[], calories: number | null = null) => {
  const conn = getDB();
  const wResult = await conn.runAsync(
    'INSERT INTO workouts (title, start_time, end_time, notes, calories) VALUES (?, ?, ?, ?, ?)',
    [title, startTime, endTime, notes, calories]
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
          'INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight, rpe, is_completed, rest_seconds, work_seconds, side, variation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [weId, set.set_number, set.reps, set.weight, set.rpe, set.is_completed ? 1 : 0, set.rest_seconds || null, set.work_seconds || null, set.side || null, set.variation || null]
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
    variation: string | null;
  }>(`
    SELECT w.id as workout_id, w.start_time, ws.set_number, ws.reps, ws.weight, ws.rpe, ws.rest_seconds, ws.work_seconds, ws.side, ws.variation
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
      side: row.side,
      variation: row.variation
    });
  }

  return Array.from(historyMap.values());
};

export const addCustomExercise = async (name: string, group: string, equip: string, isUnilateral: boolean = false, defaultVariation: string | null = null) => {
  const conn = getDB();
  const res = await conn.runAsync(
    'INSERT INTO exercises (name, muscle_group, equipment, is_unilateral, default_variation) VALUES (?, ?, ?, ?, ?)',
    [name, group, equip, isUnilateral ? 1 : 0, defaultVariation]
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
    SELECT set_number, weight, reps, rpe, rest_seconds, work_seconds, side, variation
    FROM workout_sets 
    WHERE workout_exercise_id = ?
    ORDER BY set_number ASC, id ASC
  `, [recentEx.id]);

  return sets as any[];
};

export const getPersonalRecords = async (exerciseId: number) => {
  const conn = getDB();
  const rows = await conn.getAllAsync<{ reps: number, max_weight: number, variation: string | null }>(`
    SELECT ws.reps, MAX(ws.weight) as max_weight, ws.variation
    FROM workout_sets ws
    JOIN workout_exercises we ON ws.workout_exercise_id = we.id
    WHERE we.exercise_id = ? AND ws.is_completed = 1 AND ws.reps IS NOT NULL AND ws.weight IS NOT NULL
    GROUP BY ws.variation, ws.reps
    ORDER BY ws.variation ASC, ws.reps ASC
  `, [exerciseId]);
  
  const prMap: Record<string, Record<number, number>> = {};
  for (const row of rows) {
    if (row.reps > 0) {
      const varKey = row.variation || 'default';
      if (!prMap[varKey]) {
        prMap[varKey] = {};
      }
      prMap[varKey][row.reps] = row.max_weight;
    }
  }
  return prMap;
};

export const getRoutines = async () => {
  const conn = getDB();
  const routines = await conn.getAllAsync<{id: number, title: string, description: string, sort_order?: number}>('SELECT * FROM routines ORDER BY sort_order ASC, id ASC');
  
  const result = [];
  for (const r of routines) {
    const exercises = await conn.getAllAsync<{id: number, name: string, muscle_group: string, equipment: string, is_unilateral: number, routine_exercise_id: number}>(`
      SELECT e.id, e.name, e.muscle_group, e.equipment, e.is_unilateral, re.id as routine_exercise_id
      FROM routine_exercises re
      JOIN exercises e ON re.exercise_id = e.id
      WHERE re.routine_id = ?
      ORDER BY re.sort_order ASC
    `, [r.id]);
    
    const exercisesWithSets = [];
    for (const ex of exercises) {
      const sets = await conn.getAllAsync(`
        SELECT set_number, reps, weight, rpe, side, variation
        FROM routine_sets
        WHERE routine_exercise_id = ?
        ORDER BY set_number ASC, id ASC
      `, [ex.routine_exercise_id]);
      exercisesWithSets.push({ ...ex, sets });
    }
    
    result.push({ ...r, exercises: exercisesWithSets });
  }
  return result;
};

export const addRoutine = async (title: string, description: string, exercises: { id: number, name: string, sets: any[] }[]) => {
  const conn = getDB();
  const res = await conn.runAsync('INSERT INTO routines (title, description) VALUES (?, ?)', [title, description]);
  const routineId = res.lastInsertRowId;
  
  let order = 0;
  for (const ex of exercises) {
    const rxRes = await conn.runAsync(
      'INSERT INTO routine_exercises (routine_id, exercise_id, sort_order) VALUES (?, ?, ?)', 
      [routineId, ex.id, order++]
    );
    const routineExerciseId = rxRes.lastInsertRowId;
    
    for (const s of ex.sets) {
      await conn.runAsync(
        'INSERT INTO routine_sets (routine_exercise_id, set_number, reps, weight, rpe, side, variation) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [routineExerciseId, s.set_number, s.reps, s.weight, s.rpe, s.side || null, s.variation || null]
      );
    }
  }
};

export const deleteRoutine = async (id: number) => {
  const conn = getDB();
  await conn.runAsync('DELETE FROM routines WHERE id = ?', [id]);
};

export const updateRoutineOrders = async (orders: { id: number, sort_order: number }[]) => {
  const conn = getDB();
  await conn.withTransactionAsync(async () => {
    for (const item of orders) {
      await conn.runAsync('UPDATE routines SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
    }
  });
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

  db = null;
  await initDB();
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
    const sets = await db.getAllAsync('SELECT id, set_number, weight, reps, rpe, rest_seconds, work_seconds, side, variation FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number ASC, id ASC', [ex.workout_exercise_id]) as any[];
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
    calories: workoutRow.calories,
    exercises: exercisesData
  };
};

export const updateWorkoutSet = async (setId: number, weight: number | null, reps: number | null, rpe: number | null, variation?: string | null) => {
  const conn = getDB();
  if (variation !== undefined) {
    await conn.runAsync('UPDATE workout_sets SET weight = ?, reps = ?, rpe = ?, variation = ? WHERE id = ?', [weight, reps, rpe, variation, setId]);
  } else {
    await conn.runAsync('UPDATE workout_sets SET weight = ?, reps = ?, rpe = ? WHERE id = ?', [weight, reps, rpe, setId]);
  }
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

export const updateExerciseDefaultVariation = async (exerciseId: number, variation: string | null) => {
  const conn = getDB();
  await conn.runAsync('UPDATE exercises SET default_variation = ? WHERE id = ?', [variation, exerciseId]);
};

export const getAITokensBalance = async (): Promise<number> => {
  const conn = getDB();
  const balanceRow = await conn.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = "ai_tokens_balance"');
  const lastResetRow = await conn.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = "ai_tokens_last_reset"');

  let balance = balanceRow ? parseInt(balanceRow.value, 10) : 20;
  if (balance > 20) {
    balance = 20; // Hard cap at 20 monthly tokens
  }
  const lastReset = lastResetRow ? lastResetRow.value : new Date().toISOString();

  // Check if 30 days have passed
  const lastResetDate = new Date(lastReset);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastResetDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 30) {
    balance = 20;
    const nowISO = now.toISOString();
    await conn.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES ("ai_tokens_balance", "20")');
    await conn.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES ("ai_tokens_last_reset", ?)', [nowISO]);
  }

  return balance;
};

export const consumeAIToken = async (): Promise<void> => {
  const balance = await getAITokensBalance();
  const newBalance = Math.max(0, balance - 1);
  const conn = getDB();
  await conn.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES ("ai_tokens_balance", ?)', [newBalance.toString()]);
};

export const getRecentWorkoutSummaryForAI = async (limit: number = 5): Promise<string> => {
  const conn = getDB();
  const workouts = await conn.getAllAsync<{ id: number; title: string; start_time: string; end_time: string; notes: string | null }>(`
    SELECT id, title, start_time, end_time, notes
    FROM workouts
    ORDER BY start_time DESC
    LIMIT ?
  `, [limit]);

  if (workouts.length === 0) {
    return "過去のワークアウト履歴はありません。";
  }

  let summary = "";
  for (const w of workouts) {
    const dateStr = w.start_time.split('T')[0];
    const duration = w.end_time 
      ? `${Math.round((new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 60000)}分`
      : '時間未記録';
    summary += `\n■ 日時: ${dateStr} (${duration}) | タイトル: ${w.title}\n`;
    if (w.notes) {
      summary += `   全体メモ: "${w.notes}"\n`;
    }

    const exercises = await conn.getAllAsync<{ workout_exercise_id: number; exercise_name: string; notes: string | null }>(`
      SELECT we.id as workout_exercise_id, e.name as exercise_name, we.notes
      FROM workout_exercises we
      JOIN exercises e ON we.exercise_id = e.id
      WHERE we.workout_id = ?
      ORDER BY we.sort_order ASC
    `, [w.id]);

    for (const ex of exercises) {
      summary += `   - ${ex.exercise_name}`;
      if (ex.notes) summary += ` (種目メモ: "${ex.notes}")`;
      summary += `: `;

      const sets = await conn.getAllAsync<{ set_number: number; weight: number | null; reps: number | null; rpe: number | null; side: string | null; variation: string | null }>(`
        SELECT set_number, weight, reps, rpe, side, variation
        FROM workout_sets
        WHERE workout_exercise_id = ?
        ORDER BY set_number ASC
      `, [ex.workout_exercise_id]);

      const setSummaries = sets.map(s => {
        let sDesc = `${s.weight ?? 0}kg x ${s.reps ?? 0}回`;
        if (s.side) sDesc = `[${s.side === 'L' ? '左' : '右'}] ` + sDesc;
        if (s.variation) sDesc += ` (${s.variation})`;
        if (s.rpe) sDesc += ` (RPE: ${s.rpe})`;
        return sDesc;
      });

      summary += setSummaries.join(', ') + '\n';
    }
  }

  return summary;
};
