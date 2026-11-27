export const DEFAULT_WARMUP_THRESHOLD_PERCENT = 60;

/**
 * 種目個別設定とグローバル設定からウォームアップ自動判定の閾値(%)を解決する。
 * 0 の場合は自動判定OFF。
 */
export const resolveWarmupThreshold = (
  exerciseThreshold?: number | null,
  globalThreshold: number = DEFAULT_WARMUP_THRESHOLD_PERCENT
): number => {
  if (exerciseThreshold !== null && exerciseThreshold !== undefined && !Number.isNaN(exerciseThreshold)) {
    return Math.max(0, exerciseThreshold);
  }
  return Math.max(0, globalThreshold);
};

/**
 * 過去全期間最大1RMの一定%以下の重量かどうかを判定する。
 */
export const isAutoWarmupWeight = (
  weight: number | null | undefined,
  max1RM: number | null | undefined,
  thresholdPercent: number
): boolean => {
  if (
    weight === null ||
    weight === undefined ||
    !Number.isFinite(weight) ||
    weight <= 0 ||
    max1RM === null ||
    max1RM === undefined ||
    !Number.isFinite(max1RM) ||
    max1RM <= 0 ||
    !Number.isFinite(thresholdPercent) ||
    thresholdPercent <= 0
  ) {
    return false;
  }
  return weight <= max1RM * (thresholdPercent / 100);
};

export interface WarmupLabelSetLike {
  is_warmup?: boolean | number;
  side?: string | null;
}

/**
 * セット番号欄の表示ラベルを算出する。
 * - warmupEnabled === true かつ is_warmup のセットは 'W'
 * - 本番セットは 1, 2, 3... の連番（片側種目の場合は L / R それぞれで連番）
 */
export const getDisplaySetLabel = (
  sets: ReadonlyArray<WarmupLabelSetLike>,
  index: number,
  warmupEnabled: boolean
): string => {
  const target = sets[index];
  if (!target) return String(index + 1);

  if (warmupEnabled && Boolean(target.is_warmup)) {
    return 'W';
  }

  const targetSide = target.side;
  const isUnilateralSide = targetSide === 'L' || targetSide === 'R';
  let workingNumber = 0;

  for (let i = 0; i <= index; i++) {
    const s = sets[i];
    if (!s) continue;
    if (warmupEnabled && Boolean(s.is_warmup)) continue;
    if (isUnilateralSide && s.side !== targetSide) continue;
    workingNumber++;
  }

  return String(Math.max(1, workingNumber));
};
