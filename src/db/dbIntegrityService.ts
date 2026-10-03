import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { restoreFromHealthyBackup } from './dbBackupService';

export type DBCheckResult = 'ok' | 'repaired' | 'rescued' | 'restored' | 'failed';

const DB_NAME = 'gymtracker.db';
const SQLITE_DIR = `${FileSystem.documentDirectory}SQLite/`;
const DB_PATH = `${SQLITE_DIR}${DB_NAME}`;
const BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;

/**
 * 破損したDBからテーブル単位でデータを救出し、新品のDBファイルへ再構築する
 */
export const attemptTableRescue = async (): Promise<boolean> => {
  const rescueDbName = `_rescue_${Date.now()}.db`;
  const rescueDbPath = `${SQLITE_DIR}${rescueDbName}`;
  const corruptedDbName = `_corrupt_src_${Date.now()}.db`;
  const corruptedDbPath = `${SQLITE_DIR}${corruptedDbName}`;

  let oldDb: SQLite.SQLiteDatabase | null = null;
  let newDb: SQLite.SQLiteDatabase | null = null;

  try {
    const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
    if (!dbInfo.exists || dbInfo.size === 0) {
      return false;
    }

    // 破損原本を作業用ファイルへコピーして開く（原本の直接破損・ロックを防ぐ）
    await FileSystem.copyAsync({ from: DB_PATH, to: corruptedDbPath });
    oldDb = await SQLite.openDatabaseAsync(corruptedDbName);

    // 新規救出DBを開く
    newDb = await SQLite.openDatabaseAsync(rescueDbName);

    // 1. sqlite_master からテーブル定義を取得して newDb で作成
    const tables = await oldDb.getAllAsync<{ name: string; sql: string }>(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL;"
    );

    for (const table of tables) {
      try {
        await newDb.execAsync(table.sql);
      } catch (tableCreateErr) {
        console.warn(`[DB_INTEGRITY] Failed to create table ${table.name} in rescue DB:`, tableCreateErr);
      }
    }

    // 2. テーブルごとにデータを可能な限り救出・コピー
    for (const table of tables) {
      const tableName = table.name;
      try {
        const rows = await oldDb.getAllAsync<any>(`SELECT * FROM ${tableName};`);
        if (rows && rows.length > 0) {
          for (const row of rows) {
            const cols = Object.keys(row);
            const placeholders = cols.map(() => '?').join(', ');
            const vals = cols.map((c) => row[c]);
            const insertSql = `INSERT OR REPLACE INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders});`;
            await newDb.runAsync(insertSql, vals);
          }
          console.log(`[DB_INTEGRITY] Rescued ${rows.length} rows from table '${tableName}'`);
        }
      } catch (rowErr) {
        console.warn(`[DB_INTEGRITY] Warning: Partial failure reading table '${tableName}':`, rowErr);
      }
    }

    // 3. インデックスの再構築（sqlite_master から取得）
    try {
      const indexes = await oldDb.getAllAsync<{ name: string; sql: string }>(
        "SELECT name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL;"
      );
      for (const idx of indexes) {
        try {
          await newDb.execAsync(idx.sql);
        } catch (idxErr) {
          console.warn(`[DB_INTEGRITY] Warning creating index ${idx.name}:`, idxErr);
        }
      }
    } catch (idxMasterErr) {
      console.warn('[DB_INTEGRITY] Warning fetching indexes from master:', idxMasterErr);
    }

    // 4. 新規救出DBの整合性を検証
    const quickCheck = await newDb.getFirstAsync<{ quick_check?: string; integrity_check?: string }>(
      'PRAGMA quick_check;'
    );
    const status = quickCheck?.quick_check || quickCheck?.integrity_check || '';
    if (status.toLowerCase() !== 'ok') {
      console.warn('[DB_INTEGRITY] Rescue DB failed quick_check:', status);
      return false;
    }

    // 5. 救出成功：コネクションを閉じてファイルを置き換える
    await newDb.closeAsync();
    newDb = null;
    await oldDb.closeAsync();
    oldDb = null;

    // 原本を quarantine へ退避
    const quarantinePath = `${BACKUP_DIR}gymtracker_quarantine_${Date.now()}.db`;
    await FileSystem.copyAsync({ from: DB_PATH, to: quarantinePath }).catch(() => {});

    // 原本を救出DBで置き換え
    await FileSystem.copyAsync({ from: rescueDbPath, to: DB_PATH });
    await FileSystem.deleteAsync(`${DB_PATH}-wal`, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${DB_PATH}-shm`, { idempotent: true }).catch(() => {});

    console.log('[DB_INTEGRITY] Successfully rebuilt and replaced database from rescued tables!');
    return true;
  } catch (err) {
    console.error('[DB_INTEGRITY] Table rescue attempt failed:', err);
    return false;
  } finally {
    if (newDb) {
      await newDb.closeAsync().catch(() => {});
    }
    if (oldDb) {
      await oldDb.closeAsync().catch(() => {});
    }
    await FileSystem.deleteAsync(corruptedDbPath, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${corruptedDbPath}-wal`, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${corruptedDbPath}-shm`, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(rescueDbPath, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${rescueDbPath}-wal`, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${rescueDbPath}-shm`, { idempotent: true }).catch(() => {});
  }
};

/**
 * アプリ起動時に DB の整合性を検証し、多段階で自己修復・救出・復元を実行する。
 * 【最重要】データ欠損ゼロを最優先とし、REINDEX -> テーブル救出 -> バックアップ復元 -> 新規初期化の順で試行。
 */
export const checkAndRepairDB = async (db: SQLite.SQLiteDatabase): Promise<DBCheckResult> => {
  try {
    // 0. 超高速インテグリティーチェック (quick_check)
    const checkResult = await db.getFirstAsync<{ quick_check?: string; integrity_check?: string }>(
      'PRAGMA quick_check'
    );

    const statusStr = checkResult?.quick_check || checkResult?.integrity_check || '';
    if (statusStr.toLowerCase() === 'ok') {
      console.log('[DB_INTEGRITY] Quick check passed: OK');
      return 'ok';
    }

    console.warn(`[DB_INTEGRITY] Quick check detected issue: ${statusStr}. Starting multi-stage recovery...`);

    // 1. 【段階1】REINDEX 修復（超高速・データ損失ゼロ）
    // Rowid out of order などのインデックス破損であれば REINDEX で即時復旧する
    try {
      console.log('[DB_INTEGRITY] [Stage 1] Attempting REINDEX to rebuild corrupted indexes...');
      await db.execAsync('REINDEX;');
      const reCheck = await db.getFirstAsync<{ quick_check?: string; integrity_check?: string }>('PRAGMA quick_check;');
      const reindexStatus = reCheck?.quick_check || reCheck?.integrity_check || '';
      if (reindexStatus.toLowerCase() === 'ok') {
        console.log('[DB_INTEGRITY] [Stage 1] REINDEX repair succeeded! DB is 100% healthy with zero data loss.');
        return 'repaired';
      }
      console.warn(`[DB_INTEGRITY] [Stage 1] REINDEX did not resolve issue: ${reindexStatus}`);
    } catch (reindexErr) {
      console.warn('[DB_INTEGRITY] [Stage 1] REINDEX threw error:', reindexErr);
    }

    // WAL ログの強制チェックポイントも併せて試みる
    try {
      await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
      const walReCheck = await db.getFirstAsync<{ quick_check?: string }>('PRAGMA quick_check;');
      if (walReCheck?.quick_check?.toLowerCase() === 'ok') {
        console.log('[DB_INTEGRITY] WAL checkpoint repair succeeded!');
        return 'repaired';
      }
    } catch (walErr) {
      console.warn('[DB_INTEGRITY] WAL checkpoint error:', walErr);
    }
  } catch (e) {
    console.warn('[DB_INTEGRITY] Error during initial DB integrity check:', e);
  }

  // REINDEX/WAL で修復できなかった場合、既存コネクションを必ずクローズしてファイル操作へ移行
  try {
    await db.closeAsync();
  } catch (closeErr) {
    console.warn('[DB_INTEGRITY] Warning closing DB connection for deeper repair:', closeErr);
  }

  // 2. 【段階2】テーブル別データ救出＆新DB再構築 (rescueAndRebuildDB)
  console.warn('[DB_INTEGRITY] [Stage 2] Attempting table-by-table rescue and rebuild...');
  const rescued = await attemptTableRescue();
  if (rescued) {
    console.log('[DB_INTEGRITY] [Stage 2] Table rescue succeeded!');
    return 'rescued';
  }

  // 3. 【段階3】過去の健全なバックアップからの自動復元
  console.warn('[DB_INTEGRITY] [Stage 3] Attempting to restore from latest healthy backup...');
  const restored = await restoreFromHealthyBackup();
  if (restored) {
    console.log('[DB_INTEGRITY] [Stage 3] Healthy backup restore succeeded!');
    return 'restored';
  }

  // 4. 【段階4】フェイルセーフ（最終防衛：破損DBをquarantine退避し、新規安全初期化）
  console.error('[DB_INTEGRITY] [Stage 4] All recovery methods exhausted. Quarantining corrupted DB for safety...');
  try {
    const quarantinePath = `${BACKUP_DIR}gymtracker_quarantine_failsafe_${Date.now()}.db`;
    await FileSystem.copyAsync({ from: DB_PATH, to: quarantinePath }).catch(() => {});
    await FileSystem.deleteAsync(DB_PATH, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${DB_PATH}-wal`, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${DB_PATH}-shm`, { idempotent: true }).catch(() => {});
  } catch (cleanErr) {
    console.warn('[DB_INTEGRITY] Warning cleaning corrupted DB files:', cleanErr);
  }

  return 'failed';
};
