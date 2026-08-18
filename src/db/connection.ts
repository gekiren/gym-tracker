import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// SQLite Error 3850 デッドロック防止用 Mutex キュー
let lockQueue: Promise<any> = Promise.resolve();

// DB 再初期化待機の最大タイムアウト（ms）
const DB_WAIT_TIMEOUT_MS = 10_000;

export const setDB = (instance: SQLite.SQLiteDatabase | null) => {
  db = instance;
};

export const setDBPromise = (promise: Promise<SQLite.SQLiteDatabase> | null) => {
  dbPromise = promise;
};

export const getDBPromise = () => dbPromise;

export const getDB = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
};

export const withDBQueue = <T>(action: (database: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> => {
  const next = lockQueue.then(async () => {
    // db が null の場合、再初期化中の dbPromise があれば完了を待機する
    if (!db) {
      if (dbPromise) {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Database re-initialization timed out.')),
            DB_WAIT_TIMEOUT_MS
          )
        );
        await Promise.race([dbPromise, timeout]);
      }
      // 待機後も db が null なら本当に未初期化 → エラー
      if (!db) {
        throw new Error('Database not initialized. Call initDB() first.');
      }
    }
    return await action(db);
  });
  lockQueue = next.catch(() => {});
  return next;
};

export const closeDB = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
    dbPromise = null;
  }
};
