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
