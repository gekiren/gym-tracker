import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDB } from './connection';

const DB_NAME = 'gymtracker.db';
const BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;
const DB_PATH = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
const LATEST_BACKUP_PATH = `${BACKUP_DIR}gymtracker_backup_latest.db`;

/**
 * バックアップ用ディレクトリを確保する
 */
const ensureBackupDir = async (): Promise<void> => {
  const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
};

/**
 * 定期（1日1回）自動バックアップを作成（最新3世代ローテーション）
 */
export const createDailyBackup = async (): Promise<boolean> => {
  try {
    const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
    if (!dbInfo.exists || dbInfo.size === 0) {
      return false;
    }

    await ensureBackupDir();

    const latestInfo = await FileSystem.getInfoAsync(LATEST_BACKUP_PATH);
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // 前回バックアップから24時間以内の場合はスキップ
    if (latestInfo.exists && now - (latestInfo.modificationTime || 0) * 1000 < ONE_DAY_MS) {
      return true;
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const datedBackupPath = `${BACKUP_DIR}gymtracker_backup_${todayStr}.db`;

    // 1. 最新バックアップファイルへの上書きコピー
    await FileSystem.copyAsync({ from: DB_PATH, to: LATEST_BACKUP_PATH });
    // 2. 日付付きバックアップの作成
    await FileSystem.copyAsync({ from: DB_PATH, to: datedBackupPath });

    // 3. 3世代を超える古いバックアップファイルのクリーンアップ
    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
    const datedFiles = files
      .filter((f) => f.startsWith('gymtracker_backup_20') && f.endsWith('.db'))
      .sort();

    if (datedFiles.length > 3) {
      const filesToDelete = datedFiles.slice(0, datedFiles.length - 3);
      for (const file of filesToDelete) {
        await FileSystem.deleteAsync(`${BACKUP_DIR}${file}`, { idempotent: true });
      }
    }

    console.log('[DB_BACKUP] Daily backup created successfully.');
    return true;
  } catch (e) {
    console.warn('[DB_BACKUP] Failed to create daily backup:', e);
    return false;
  }
};

/**
 * 直近の最新バックアップから DB ファイルを復元する
 */
export const restoreFromLatestBackup = async (): Promise<boolean> => {
  try {
    const latestInfo = await FileSystem.getInfoAsync(LATEST_BACKUP_PATH);
    if (!latestInfo.exists || latestInfo.size === 0) {
      console.warn('[DB_BACKUP] No valid backup file found to restore.');
      return false;
    }

    // SQLite ディレクトリの確保
    const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
    const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
    }

    // バックアップから原本へコピー復元（壊れた原本を上書き）
    await FileSystem.copyAsync({ from: LATEST_BACKUP_PATH, to: DB_PATH });

    // 関連する WAL / SHM ファイルがあれば削除（旧ログとの矛盾を防ぐ）
    await FileSystem.deleteAsync(`${DB_PATH}-wal`, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${DB_PATH}-shm`, { idempotent: true }).catch(() => {});

    console.log('[DB_BACKUP] Restored database from latest backup successfully.');
    return true;
  } catch (e) {
    console.error('[DB_BACKUP] Failed to restore database from backup:', e);
    return false;
  }
};

/**
 * データベースのバックアップファイル(.db)を出力・共有ダイアログで開く
 */
export const exportDatabaseBackup = async (options?: {
  dialogTitle?: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. WAL checkpoint (Flush WAL changes into main DB file)
    // 失敗しても例外を潰して処理を継続させる（一時的なDBロック等でバックアップ自体が失敗するのを防止）
    try {
      const conn = getDB();
      if (conn) {
        await conn.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
      }
    } catch (walErr) {
      console.warn('[DB_BACKUP] WAL checkpoint failed before export (proceeding anyway):', walErr);
    }

    // 2. データベース存在確認
    const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
    if (!dbInfo.exists) {
      return { success: false, error: 'Database file not found.' };
    }

    // 3. 一時ファイルパスの構築
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const dateStr = `${year}${month}${date}_${hours}${minutes}${seconds}`;

    const cacheDir = FileSystem.cacheDirectory || `${FileSystem.documentDirectory}Caches/`;
    const backupUri = `${cacheDir}trenote_backup_${dateStr}.db`;

    // 古い同名ファイルが存在すれば事前削除
    await FileSystem.deleteAsync(backupUri, { idempotent: true }).catch(() => {});

    // 4. コピー実行
    await FileSystem.copyAsync({
      from: DB_PATH,
      to: backupUri,
    });

    // 5. 共有モーダルの呼び出し
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(backupUri, {
        mimeType: 'application/octet-stream',
        dialogTitle: options?.dialogTitle || 'バックアップデータの保存',
        UTI: 'public.database',
      });
      return { success: true };
    } else {
      return { success: false, error: 'Sharing is not available on this device.' };
    }
  } catch (error: any) {
    console.error('[DB_BACKUP] Export failed:', error);
    const msg = error?.message || String(error);
    return { success: false, error: msg };
  }
};

