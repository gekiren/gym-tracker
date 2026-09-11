/**
 * 種目に関する判定ユーティリティ関数
 */

/**
 * 種目がトレッドミル（ランニングマシン）かどうかを判定する
 */
export const isTreadmillExercise = (name?: string | null): boolean => {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === 'トレッドミル' ||
    n === 'treadmill' ||
    n.includes('トレッドミル') ||
    n.includes('treadmill')
  );
};
