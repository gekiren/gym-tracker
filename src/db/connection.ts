import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

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

export const closeDB = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
    dbPromise = null;
  }
};
