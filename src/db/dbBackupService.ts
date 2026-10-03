import * as SQLite from 'expo-sqlite';
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
 * 指定された DB ファイルの整合性を quick_check で検証する
 */
export const verifyDBFileIntegrity = async (filePath: string): Promise<boolean> => {
  const tempDbName = `_temp_chk_${Date.now()}.db`;
  const tempDbPath = `${FileSystem.documentDirectory}SQLite/${tempDbName}`;
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists || fileInfo.size === 0) return false;

    const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
    const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
    }

    await FileSystem.copyAsync({ from: filePath, to: tempDbPath });
    const tempDb = await SQLite.openDatabaseAsync(tempDbName);
    try {
      const check = await tempDb.getFirstAsync<{ quick_check?: string; integrity_check?: string }>(
        'PRAGMA quick_check;'
      );
      const status = check?.quick_check || check?.integrity_check || '';
      return status.toLowerCase() === 'ok';
    } finally {
      await tempDb.closeAsync();
    }
  } catch (err) {
    console.warn(`[DB_BACKUP] Error verifying integrity of ${filePath}:`, err);
    return false;
  } finally {
    await FileSystem.deleteAsync(tempDbPath, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${tempDbPath}-wal`, { idempotent: true }).catch(() => {});
    await FileSystem.deleteAsync(`${tempDbPath}-shm`, { idempotent: true }).catch(() => {});
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

    // 原本DBの健全性チェック（破損DBでバックアップを上書き汚染させないガード）
    try {
      const conn = getDB();
      if (conn) {
        const check = await conn.getFirstAsync<{ quick_check?: string; integrity_check?: string }>(
          'PRAGMA quick_check;'
        );
        const status = check?.quick_check || check?.integrity_check || '';
        if (status.toLowerCase() !== 'ok') {
          console.warn('[DB_BACKUP] Aborted daily backup: current DB is malformed! Existing healthy backups preserved.');
          return false;
        }
      }
    } catch (checkErr) {
      console.warn('[DB_BACKUP] Quick check before daily backup failed, skipping:', checkErr);
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

// バックアップ制御用のメモリ内状態
let lastBackupTimestamp = 0;
let pendingDataSaveTimer: ReturnType<typeof setTimeout> | null = null;
let hasUnsavedChanges = false;
let pendingReason: string = 'data_save';

const BACKGROUND_THROTTLE_MS = 5 * 60 * 1000; // 5分スロットル

/**
 * 強制的に即時バックアップを作成する（OTA適用前、重要イベント後などに使用）
 * 1. WAL チェックポイントを強制実行（TRUNCATE）し、未コミット・未書き込みログをすべてDB本体へフラッシュ
 * 2. 最新バックアップ（gymtracker_backup_latest.db）へ上書き保存
 * 3. 追跡用バックアップ（gymtracker_backup_{reason}_{timestamp}.db）へ保存（最大3世代保持）
 */
export const createInstantBackup = async (reason: string = 'instant'): Promise<boolean> => {
  try {
    await ensureBackupDir();

    // 1. WAL checkpoint (Flush WAL changes into main DB file)
    try {
      const conn = getDB();
      if (conn) {
        await conn.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
      }
    } catch (walErr) {
      console.warn(`[DB_BACKUP] WAL checkpoint warning before ${reason} backup:`, walErr);
    }

    // 2. 原本DBの存在確認
    const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
    if (!dbInfo.exists || dbInfo.size === 0) {
      console.warn(`[DB_BACKUP] Main database file not found or empty (${DB_PATH}).`);
      return false;
    }

    // 原本DBの健全性チェック（破損DBでバックアップを上書き汚染させないガード）
    try {
      const conn = getDB();
      if (conn) {
        const check = await conn.getFirstAsync<{ quick_check?: string; integrity_check?: string }>(
          'PRAGMA quick_check;'
        );
        const status = check?.quick_check || check?.integrity_check || '';
        if (status.toLowerCase() !== 'ok') {
          console.warn(`[DB_BACKUP] Aborted instant backup (${reason}): current DB is malformed! Existing healthy backups preserved.`);
          return false;
        }
      }
    } catch (checkErr) {
      console.warn(`[DB_BACKUP] Quick check before instant backup (${reason}) failed, skipping:`, checkErr);
      return false;
    }

    // 3. 最新バックアップファイルへの上書きコピー
    await FileSystem.copyAsync({ from: DB_PATH, to: LATEST_BACKUP_PATH });

    // 4. 追跡・世代管理用バックアップの作成
    const timestamp = Date.now();
    const targetedBackupPath = `${BACKUP_DIR}gymtracker_backup_${reason}_${timestamp}.db`;
    await FileSystem.copyAsync({ from: DB_PATH, to: targetedBackupPath });

    // 5. 同一reasonのバックアップが3世代を超えた場合は古いものをクリーンアップ
    try {
      const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
      const matchedFiles = files
        .filter((f) => f.startsWith(`gymtracker_backup_${reason}_`) && f.endsWith('.db'))
        .sort();

      if (matchedFiles.length > 3) {
        const filesToDelete = matchedFiles.slice(0, matchedFiles.length - 3);
        for (const file of filesToDelete) {
          await FileSystem.deleteAsync(`${BACKUP_DIR}${file}`, { idempotent: true });
        }
      }
    } catch (cleanErr) {
      console.warn('[DB_BACKUP] Warning cleaning old instant backups:', cleanErr);
    }

    lastBackupTimestamp = Date.now();
    console.log(`[DB_BACKUP] Instant backup (${reason}) created successfully at: ${targetedBackupPath}`);
    return true;
  } catch (e) {
    console.warn(`[DB_BACKUP] Failed to create instant backup (${reason}):`, e);
    return false;
  }
};

/**
 * データ保存時用：非同期デバウンス付きバックアップトリガー
 * 連続した保存操作（食事の複数追加など）を考慮し、指定ミリ秒後に1回だけバックアップを実行する。
 */
export const triggerDebouncedDataBackup = (reason: string = 'data_save', delayMs: number = 20000): void => {
  hasUnsavedChanges = true;
  pendingReason = reason;

  if (pendingDataSaveTimer) {
    clearTimeout(pendingDataSaveTimer);
  }

  pendingDataSaveTimer = setTimeout(async () => {
    pendingDataSaveTimer = null;
    try {
      const ok = await createInstantBackup(pendingReason);
      if (ok) {
        hasUnsavedChanges = false;
      }
    } catch (err) {
      console.warn(`[DB_BACKUP] Debounced backup failed (${pendingReason}):`, err);
    }
  }, delayMs);
};

/**
 * バックグラウンド移行時用：自動バックアップトリガー
 * 1. データ変更の保留タイマーがある場合は直ちに回収して即時バックアップを実行
 * 2. それ以外の場合でも、前回バックアップから5分以上経過していればバックアップを実行（5分スロットル）
 */
export const triggerBackgroundBackup = async (): Promise<boolean> => {
  try {
    const now = Date.now();

    // 1. 未退避の変更がある場合は、保留タイマーをキャンセルして即座に退避
    if (hasUnsavedChanges) {
      if (pendingDataSaveTimer) {
        clearTimeout(pendingDataSaveTimer);
        pendingDataSaveTimer = null;
      }
      const reason = `bg_${pendingReason}`;
      const ok = await createInstantBackup(reason);
      if (ok) {
        hasUnsavedChanges = false;
      }
      return ok;
    }

    // 2. 直近のバックアップから5分以内ならスキップ（スロットル）
    if (now - lastBackupTimestamp < BACKGROUND_THROTTLE_MS) {
      return true;
    }

    // 3. 定期バックグラウンドバックアップ実行
    return await createInstantBackup('background');
  } catch (err) {
    console.warn('[DB_BACKUP] Failed to execute background backup:', err);
    return false;
  }
};

/**
 * backups フォルダ内の全バックアップファイルを走査し、
 * quick_check が正常な最も新しいバックアップから復元する
 */
export const restoreFromHealthyBackup = async (): Promise<boolean> => {
  try {
    await ensureBackupDir();
    const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);

    // バックアップ候補の収集（quarantine と temp は除外）
    const dbFiles = files.filter(
      (f) => f.endsWith('.db') && !f.includes('quarantine') && !f.startsWith('_temp_')
    );

    if (dbFiles.length === 0) {
      console.warn('[DB_BACKUP] No candidate backup files found in backup directory.');
      return false;
    }

    // 優先順位付け:
    // 1. 日次バックアップ (gymtracker_backup_20*.db) 降順 (最新の日付優先)
    // 2. バックグラウンド/即時バックアップ (gymtracker_backup_background_*.db / instant_*.db) 降順
    // 3. latest (gymtracker_backup_latest.db)
    const dailyBackups = dbFiles.filter((f) => f.startsWith('gymtracker_backup_20')).sort().reverse();
    const bgBackups = dbFiles
      .filter((f) => f.startsWith('gymtracker_backup_background_') || f.startsWith('gymtracker_backup_instant_'))
      .sort()
      .reverse();
    const otherBackups = dbFiles.filter((f) => !dailyBackups.includes(f) && !bgBackups.includes(f));

    const candidates = [...dailyBackups, ...bgBackups, ...otherBackups];

    console.log(`[DB_BACKUP] Searching for healthy backup among ${candidates.length} candidates:`, candidates);

    for (const filename of candidates) {
      const fullPath = `${BACKUP_DIR}${filename}`;
      const isHealthy = await verifyDBFileIntegrity(fullPath);
      if (isHealthy) {
        console.log(`[DB_BACKUP] Found healthy backup file: ${filename}! Restoring...`);

        const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
        const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
        }

        // 壊れた原本を上書き
        await FileSystem.copyAsync({ from: fullPath, to: DB_PATH });

        // 旧WAL/SHMの削除
        await FileSystem.deleteAsync(`${DB_PATH}-wal`, { idempotent: true }).catch(() => {});
        await FileSystem.deleteAsync(`${DB_PATH}-shm`, { idempotent: true }).catch(() => {});

        console.log(`[DB_BACKUP] Successfully restored from healthy backup: ${filename}!`);
        return true;
      } else {
        console.warn(`[DB_BACKUP] Candidate ${filename} is corrupted. Trying next candidate...`);
      }
    }

    console.warn('[DB_BACKUP] No healthy backup files found among all candidates.');
    return false;
  } catch (err) {
    console.error('[DB_BACKUP] Error searching for healthy backup:', err);
    return false;
  }
};

/**
 * 直近の最新バックアップから DB ファイルを復元する（健全性チェック付き）
 */
export const restoreFromLatestBackup = async (): Promise<boolean> => {
  try {
    // まず最新バックアップ自体の健全性をチェック
    const latestInfo = await FileSystem.getInfoAsync(LATEST_BACKUP_PATH);
    if (latestInfo.exists && latestInfo.size > 0) {
      const isLatestHealthy = await verifyDBFileIntegrity(LATEST_BACKUP_PATH);
      if (isLatestHealthy) {
        const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
        const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
        }

        await FileSystem.copyAsync({ from: LATEST_BACKUP_PATH, to: DB_PATH });
        await FileSystem.deleteAsync(`${DB_PATH}-wal`, { idempotent: true }).catch(() => {});
        await FileSystem.deleteAsync(`${DB_PATH}-shm`, { idempotent: true }).catch(() => {});

        console.log('[DB_BACKUP] Restored database from latest backup successfully.');
        return true;
      } else {
        console.warn('[DB_BACKUP] Latest backup file is malformed! Searching older healthy backups...');
      }
    }

    // latest が破損している場合は他の健全なバックアップから自動探索復元
    return await restoreFromHealthyBackup();
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

