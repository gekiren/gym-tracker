import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// SQLite Error 3850 デッドロック防止用 Mutex キュー
let lockQueue: Promise<any> = Promise.resolve();

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
    if (!db) {
      throw new Error('Database not initialized. Call initDB() first.');
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
