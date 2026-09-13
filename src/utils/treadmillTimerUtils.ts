/**
 * トレッドミル・カウントダウンタイマーおよび走行時間計算ユーティリティ
 */

/**
 * 目標秒数とタイマー開始からの経過秒数に基づき、残り秒数を計算します。
 * @param targetSeconds 目標秒数
 * @param elapsedSinceStart タイマー開始からの経過秒数
 * @returns 残り秒数（0以上の整数）
 */
export function calculateRemainingSeconds(targetSeconds: number, elapsedSinceStart: number): number {
  if (targetSeconds <= 0) return 0;
  const elapsed = Math.max(0, Math.floor(elapsedSinceStart));
  return Math.max(0, targetSeconds - elapsed);
}

/**
 * 目標秒数と残り秒数から、実際に走行した実績秒数を計算します。
 * @param targetSeconds 目標秒数
 * @param remainingSeconds 残り秒数
 * @returns 実績走行秒数（0以上、targetSeconds以下の整数）
 */
export function calculateActualWorkSeconds(targetSeconds: number, remainingSeconds: number): number {
  if (targetSeconds <= 0) return 0;
  const rem = Math.max(0, Math.floor(remainingSeconds));
  return Math.min(targetSeconds, Math.max(0, targetSeconds - rem));
}

/**
 * 秒数を MM:SS 形式の文字列にフォーマットします（最大 99:59）。
 * @param seconds 秒数
 * @returns "MM:SS" 形式の文字列
 */
export function formatTimerDisplay(seconds: number): string {
  const safeSecs = Math.max(0, Math.floor(seconds));
  if (safeSecs >= 5999) {
    return '99:59';
  }
  const m = Math.floor(safeSecs / 60);
  const s = safeSecs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
