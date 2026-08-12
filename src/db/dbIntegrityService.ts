import * as SQLite from 'expo-sqlite';
import { restoreFromLatestBackup } from './dbBackupService';

export type DBCheckResult = 'ok' | 'repaired' | 'restored' | 'failed';

/**
 * アプリ起動時に DB の整合性を超高速検証し、
 * 破損があれば WAL チェックポイント修復、それでもダメならバックアップ復元を実行する。
 * 【最重要】整合性チェックに使用する仮コネクションは try...finally で絶対に closeAsync してロックを解除する。
 */
export const checkAndRepairDB = async (): Promise<DBCheckResult> => {
  let tempDb: SQLite.SQLiteDatabase | null = null;
  try {
    // 1. 一時的に DB を開く（デフォルト共有接続）
    tempDb = await SQLite.openDatabaseAsync('gymtracker.db');

    // 2. 超高速インテグリティーチェック (quick_check)
    const checkResult = await tempDb.getFirstAsync<{ quick_check?: string; integrity_check?: string }>(
      'PRAGMA quick_check'
    );

    const statusStr = checkResult?.quick_check || checkResult?.integrity_check || '';
    if (statusStr.toLowerCase() === 'ok') {
      console.log('[DB_INTEGRITY] Quick check passed: OK');
      return 'ok';
    }

    console.warn(`[DB_INTEGRITY] Quick check detected issue: ${statusStr}. Attempting WAL checkpoint recovery...`);

    // 3. 異常検知時：WALログの強制チェックポイント＆全統合を試みる
    await tempDb.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
    const reCheck = await tempDb.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
    if (reCheck?.integrity_check?.toLowerCase() === 'ok') {
      console.log('[DB_INTEGRITY] WAL checkpoint repair succeeded!');
      return 'repaired';
    }
  } catch (e) {
    console.warn('[DB_INTEGRITY] Error during DB integrity check:', e);
  } finally {
    // 【最重要】仮コネクションを100%確実にクローズしてファイルロックを解除する
    if (tempDb) {
      try {
        await tempDb.closeAsync();
        console.log('[DB_INTEGRITY] Temporary DB connection safely closed.');
      } catch (closeErr) {
        console.warn('[DB_INTEGRITY] Warning closing temp DB connection:', closeErr);
      }
    }
  }

  // 4. WAL統合修復でも直らなかった場合：バックアップからのコピー復元を実行
  console.warn('[DB_INTEGRITY] Attempting to restore database from latest daily backup...');
  const restored = await restoreFromLatestBackup();
  if (restored) {
    return 'restored';
  }

  return 'failed';
};
