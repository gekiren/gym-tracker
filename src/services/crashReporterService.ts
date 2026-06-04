import * as FileSystem from 'expo-file-system/legacy';
import { saveSetting } from '../db/database';
import { useWorkoutStore } from '../store/workoutStore';

// クラッシュログの保存先パス
const CRASH_LOG_PATH = (FileSystem.documentDirectory || '') + 'crash_log.json';

export interface CrashLog {
  message: string;
  stack?: string;
  timestamp: string;
  isFatal: boolean;
}

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
 * クラッシュレポートを外部解析ツールへ送信する（モック実装）
 */
export const sendCrashReport = async (log: CrashLog): Promise<boolean> => {
  console.log('[CrashReporter] Sending crash report to analytics server...', log);
  
  // 送信中のローディング感を出すために1.5秒待機
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // --- 将来の Sentry / Firebase Crashlytics 等の SDK 導入用ガイド ---
  //
  // 1. Sentry (sentry-expo / @sentry/react-native) の場合:
  //    import * as Sentry from '@sentry/react-native';
  //    Sentry.captureException(new Error(log.message), {
  //      extra: {
  //        stack: log.stack,
  //        timestamp: log.timestamp,
  //        isFatal: log.isFatal
  //      }
  //    });
  //
  // 2. Firebase Crashlytics (@react-native-firebase/crashlytics) の場合:
  //    import crashlytics from '@react-native-firebase/crashlytics';
  //    crashlytics().setAttribute('timestamp', log.timestamp);
  //    crashlytics().setAttribute('isFatal', String(log.isFatal));
  //    crashlytics().recordError(new Error(log.message));
  //
  // ---------------------------------------------------------------

  console.log('[CrashReporter] Crash report sent successfully.');
  return true;
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
    
    // 2. 本来のエラーハンドラを呼び出し、アプリを終了/開発用エラー画面を表示
    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
  console.log('[CrashReporter] Global error handler registered.');
};
