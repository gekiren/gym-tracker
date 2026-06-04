import * as FileSystem from 'expo-file-system/legacy';
import { saveSetting } from '../db/database';
import { useWorkoutStore } from '../store/workoutStore';
import * as Sentry from '@sentry/react-native';
import { SENTRY_CONFIG } from '../config/sentryConfig';

// クラッシュログの保存先パス
const CRASH_LOG_PATH = (FileSystem.documentDirectory || '') + 'crash_log.json';

export interface CrashLog {
  message: string;
  stack?: string;
  timestamp: string;
  isFatal: boolean;
}

let isSentryInitialized = false;

/**
 * Sentry を初期化する（オプトイン同意時のみ呼び出される）
 */
export const initializeSentry = () => {
  if (isSentryInitialized) return;
  try {
    // SENTRY_CONFIG.dsn がプレースホルダーのままでないかチェック
    if (SENTRY_CONFIG.dsn && !SENTRY_CONFIG.dsn.includes('placeholder')) {
      Sentry.init({
        dsn: SENTRY_CONFIG.dsn,
        debug: SENTRY_CONFIG.debug,
      });
      isSentryInitialized = true;
      console.log('[CrashReporter] Sentry initialized successfully.');
    } else {
      console.log('[CrashReporter] Sentry DSN is placeholder. Sentry auto-reporting is disabled, mock reporting will be used.');
    }
  } catch (e) {
    console.error('[CrashReporter] Failed to initialize Sentry:', e);
  }
};

/**
 * クラッシュログファイルを保存する
 */
export const saveCrashLog = async (error: any, isFatal: boolean = true) => {
  try {
    const log: CrashLog = {
      message: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      isFatal,
    };
    await FileSystem.writeAsStringAsync(CRASH_LOG_PATH, JSON.stringify(log));
    console.log('[CrashReporter] Crash log saved locally:', log);
  } catch (e) {
    console.error('[CrashReporter] Failed to save crash log locally:', e);
  }
};

/**
 * クラッシュログファイルが存在するか確認
 */
export const checkHasCrashLog = async (): Promise<boolean> => {
  try {
    const info = await FileSystem.getInfoAsync(CRASH_LOG_PATH);
    return info.exists;
  } catch (e) {
    return false;
  }
};

/**
 * クラッシュログファイルを読み込む
 */
export const readCrashLog = async (): Promise<CrashLog | null> => {
  try {
    const info = await FileSystem.getInfoAsync(CRASH_LOG_PATH);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(CRASH_LOG_PATH);
    return JSON.parse(content);
  } catch (e) {
    console.error('[CrashReporter] Failed to read crash log:', e);
    return null;
  }
};

/**
 * クラッシュログファイルを削除
 */
export const deleteCrashLog = async (): Promise<void> => {
  try {
    const info = await FileSystem.getInfoAsync(CRASH_LOG_PATH);
    if (info.exists) {
      await FileSystem.deleteAsync(CRASH_LOG_PATH);
      console.log('[CrashReporter] Crash log file deleted.');
    }
  } catch (e) {
    console.error('[CrashReporter] Failed to delete crash log file:', e);
  }
};

/**
 * クラッシュレポートを送信する
 */
export const sendCrashReport = async (log: CrashLog): Promise<boolean> => {
  console.log('[CrashReporter] Sending crash report to Sentry/Analytics...', log);
  
  // 送信中のローディング感を出すために1.5秒待機
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    if (isSentryInitialized) {
      const errorObject = new Error(log.message);
      errorObject.stack = log.stack;
      
      Sentry.captureException(errorObject, {
        extra: {
          timestamp: log.timestamp,
          isFatal: log.isFatal
        }
      });
      console.log('[CrashReporter] Crash report sent to Sentry successfully.');
    } else {
      console.log('[CrashReporter] Sentry is not initialized. Simulated success (mock).');
    }
    return true;
  } catch (e) {
    console.error('[CrashReporter] Failed to capture exception with Sentry:', e);
    return false;
  }
};

/**
 * グローバルエラーハンドラを登録する
 */
export const registerGlobalErrorHandler = () => {
  const defaultHandler = (global as any).ErrorUtils?.getGlobalHandler();
  
  if (!(global as any).ErrorUtils) {
    console.warn('[CrashReporter] global.ErrorUtils is not available in this environment.');
    return;
  }

  (global as any).ErrorUtils.setGlobalHandler(async (error: any, isFatal?: boolean) => {
    // 1. ローカルにクラッシュログを緊急保存
    await saveCrashLog(error, isFatal ?? true);
    
    // 2. もし Sentry が初期化されている場合は、Sentry にも直接送信を試みる
    if (isSentryInitialized) {
      try {
        Sentry.captureException(error, {
          tags: { fatal: String(isFatal ?? true) }
        });
      } catch (sentryErr) {
        console.error('[CrashReporter] Sentry failed to capture exception inside handler:', sentryErr);
      }
    }
    
    // 3. 本来のエラーハンドラを呼び出し、アプリを終了/開発用エラー画面を表示
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
  console.log('[CrashReporter] Global error handler registered.');
};
