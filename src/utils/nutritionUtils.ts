import { MealLog } from '../db/types';

/**
 * 栄養管理用ユーティリティ関数
 */

export type MealTypeKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * 現在時刻（または指定日時）に基づいてデフォルトの食事区分を判定して返却する
 * 
 * - 04:00 〜 10:59: 'breakfast' (朝食)
 * - 11:00 〜 14:59: 'lunch' (昼食)
 * - 15:00 〜 16:59: 'snack' (間食)
 * - 17:00 〜 23:59: 'dinner' (夕食)
 * - 00:00 〜 03:59: 'snack' (間食・夜食)
 */
export function getDefaultMealType(date: Date = new Date()): MealTypeKey {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) {
    return 'breakfast';
  }
  if (hour >= 11 && hour < 15) {
    return 'lunch';
  }
  if (hour >= 15 && hour < 17) {
    return 'snack';
  }
  if (hour >= 17 && hour < 24) {
    return 'dinner';
  }
  // 00:00 〜 03:59 は夜食/間食扱い
  return 'snack';
}

/**
 * 現在時刻（または指定日時）を HH:mm 形式の文字列で取得する
 */
export function getCurrentTimeStr(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * 食事ログの記録日時（Date オブジェクト）を取得する
 * 
 * - log.date (YYYY-MM-DD または YYYY/MM/DD) と log.meal_time (HH:mm) が存在する場合は、その指定された日時を優先
 * - meal_time が未設定、またはパース不能な場合は created_at（ミリ秒）から生成
 * - それも無効な場合は現在時刻をフォールバックとして使用
 */
export function getMealDateTime(log: MealLog): Date {
  if (log.date) {
    const normalizedDate = log.date.replace(/\//g, '-');
    const parts = normalizedDate.split('-').map((p) => parseInt(p, 10));
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts;
      let hours = 12;
      let minutes = 0;
      let hasValidMealTime = false;

      if (log.meal_time) {
        const match = log.meal_time.match(/^(\d{1,2}):(\d{2})$/);
        if (match) {
          hours = parseInt(match[1], 10);
          minutes = parseInt(match[2], 10);
          hasValidMealTime = true;
        }
      }

      if (hasValidMealTime) {
        const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
        if (!isNaN(d.getTime())) {
          return d;
        }
      } else if (log.created_at) {
        const d = new Date(log.created_at);
        if (!isNaN(d.getTime())) {
          return d;
        }
      } else {
        const d = new Date(year, month - 1, day, 12, 0, 0, 0);
        if (!isNaN(d.getTime())) {
          return d;
        }
      }
    }
  }

  if (log.created_at) {
    const d = new Date(log.created_at);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  return new Date();
}

/**
 * 複数の食事ログの中から、記録日時（食事時間）が最も新しい食事ログを特定する
 * 
 * @param logs 食事ログの配列
 * @param beforeTime 指定したタイムスタンプ（ミリ秒）以前のログに限定したい場合に指定（例: 現在時刻 Date.now()）
 */
export function getLatestMealLog(logs: MealLog[], beforeTime?: number): MealLog | null {
  if (!logs || logs.length === 0) return null;

  let targetLogs = logs;
  if (beforeTime !== undefined) {
    const filtered = logs.filter((log) => getMealDateTime(log).getTime() <= beforeTime);
    if (filtered.length > 0) {
      targetLogs = filtered;
    }
  }

  let latestLog = targetLogs[0];
  let latestTime = getMealDateTime(latestLog).getTime();

  for (let i = 1; i < targetLogs.length; i++) {
    const currentTime = getMealDateTime(targetLogs[i]).getTime();
    if (currentTime > latestTime) {
      latestTime = currentTime;
      latestLog = targetLogs[i];
    }
  }

  return latestLog;
}

/**
 * 食事ログ一覧を記録日時（食事時間）順（昇順：朝→昼→夕）にソートする
 */
export function sortMealLogsByTime(logs: MealLog[]): MealLog[] {
  if (!logs || logs.length <= 1) return logs || [];

  return [...logs].sort((a, b) => {
    const timeA = getMealDateTime(a).getTime();
    const timeB = getMealDateTime(b).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return (a.created_at || 0) - (b.created_at || 0);
  });
}
