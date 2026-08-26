import * as SQLite from 'expo-sqlite';

export const DATABASE_VERSION = 9;

export interface Migration {
  version: number;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
}

const safeAddColumn = async (
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string
) => {
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    if (!tableInfo.find((c) => c.name === column)) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
    }
  } catch (e) {
    console.warn(`Migration: Failed to add column ${column} to ${table}`, e);
  }
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await safeAddColumn(db, 'workout_exercises', 'notes', 'TEXT');
      await safeAddColumn(db, 'workouts', 'calories', 'REAL');
      await safeAddColumn(db, 'workouts', 'avg_heart_rate', 'INTEGER');
      await safeAddColumn(db, 'workouts', 'max_heart_rate', 'INTEGER');
      await safeAddColumn(db, 'workouts', 'calories_burned', 'INTEGER');
      await safeAddColumn(db, 'workout_sets', 'rest_seconds', 'INTEGER');
      await safeAddColumn(db, 'workout_sets', 'work_seconds', 'INTEGER');
      await safeAddColumn(db, 'workout_sets', 'side', 'TEXT');
      await safeAddColumn(db, 'workout_sets', 'variation', 'TEXT');
      await safeAddColumn(db, 'workout_sets', 'stance', 'TEXT');
    },
  },
  {
    version: 2,
    up: async (db) => {
      await safeAddColumn(db, 'routine_sets', 'stance', 'TEXT');
      await safeAddColumn(db, 'exercises', 'default_stance', 'TEXT');
      await safeAddColumn(db, 'exercises', 'is_unilateral', 'INTEGER DEFAULT 0');
      await safeAddColumn(db, 'exercises', 'default_variation', 'TEXT');
      await safeAddColumn(db, 'water_logs', 'caffeine', 'INTEGER DEFAULT 0');
      await safeAddColumn(db, 'routines', 'sort_order', 'INTEGER DEFAULT 0');
    },
  },
  {
    version: 3,
    up: async (db) => {
      await db.runAsync(
        'UPDATE workout_sets SET stance = variation WHERE stance IS NULL AND variation IS NOT NULL'
      );
      await db.runAsync(
        'UPDATE routine_sets SET stance = variation WHERE stance IS NULL AND variation IS NOT NULL'
      );
      await db.runAsync(
        'UPDATE exercises SET default_stance = default_variation WHERE default_stance IS NULL AND default_variation IS NOT NULL'
      );
    },
  },
  {
    version: 4,
    up: async (db) => {
      // 運動種目名・ルーティングタイトルの名寄せ・クリーンアップ処理
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
        await db.runAsync('UPDATE exercises SET name = ? WHERE name = ?', [r.to, r.from]);
      }
      await db.runAsync('DELETE FROM exercises WHERE name = ?', ['懸垂 (Pull-up)']);
      await db.runAsync(
        'UPDATE routines SET title = "Push Day", description = "Bench Press, Overhead Press, Push-Up..." WHERE title = "Push Day (押す日)"'
      );
      await db.runAsync(
        'UPDATE routines SET title = "Pull Day", description = "Deadlift, Pull-Up, Lat Pulldown..." WHERE title = "Pull Day (引く日)"'
      );
      await db.runAsync('DELETE FROM exercises WHERE name IN (?, ?, ?, ?)', [
        '加重懸垂',
        '加重プッシュアップ',
        '加重ディップス',
        'リバースグリップ ラットプルダウン',
      ]);

      const unilateralExercises = [
        'ワンアームダンベルロウ',
        'コンセントレーションカール',
        'キックバック',
        'ブルガリアンスプリットスクワット',
        'ランジ',
        'ウォーキングランジ',
      ];
      await db.runAsync(
        `UPDATE exercises SET is_unilateral = 1 WHERE name IN (${unilateralExercises.map(() => '?').join(',')})`,
        unilateralExercises
      );

      const aerobicEx = [
        { name: 'エアロバイク', group: '有酸素', equip: 'マシン' },
        { name: 'トレッドミル', group: '有酸素', equip: 'マシン' },
        { name: 'ランニング', group: '有酸素', equip: '自重' },
        { name: 'ウォーキング', group: '有酸素', equip: '自重' },
        { name: 'ローイングマシン', group: '有酸素', equip: 'マシン' },
        { name: 'クロストレーナー', group: '有酸素', equip: 'マシン' },
        { name: '縄跳び', group: '有酸素', equip: '自重' },
      ];
      for (const ex of aerobicEx) {
        const existing = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM exercises WHERE name = ?',
          [ex.name]
        );
        if (!existing) {
          await db.runAsync(
            'INSERT INTO exercises (name, muscle_group, equipment, is_unilateral) VALUES (?, ?, ?, 0)',
            [ex.name, ex.group, ex.equip]
          );
        }
      }
    },
  },
  {
    version: 5,
    up: async (db) => {
      // 栄養管理テーブル追加
      await db.execAsync(`
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
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS autophagy_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          enabled INTEGER DEFAULT 1,
          target_hours REAL DEFAULT 16,
          start_time TEXT,
          notified INTEGER DEFAULT 0,
          auto_sync_with_last_meal INTEGER DEFAULT 1
        );
      `);
    },
  },
  {
    version: 6,
    up: async (db) => {
      await safeAddColumn(db, 'exercises', 'weight_step', 'REAL DEFAULT 2.5');
    },
  },
  {
    version: 7,
    up: async (db) => {
      await safeAddColumn(db, 'meal_favorites', 'sort_order', 'INTEGER DEFAULT 0');
    },
  },
  {
    version: 8,
    up: async (db) => {
      await db.execAsync(`
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
    },
  },
  {
    version: 9,
    up: async (db) => {
      await safeAddColumn(db, 'habit_items', 'target_count', 'INTEGER DEFAULT 0');
    },
  },
];

export const runMigrations = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return; // 既に最新バージョンの場合は即座にスキップ
  }

  for (const m of MIGRATIONS) {
    if (m.version > currentVersion) {
      await m.up(db);
      await db.execAsync(`PRAGMA user_version = ${m.version};`);
      currentVersion = m.version;
    }
  }
};
