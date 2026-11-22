export interface ExerciseChartSummaryRow {
  workout_id: number;
  start_time: string;
  volume: number;
  sets_count: number;
  max_1rm: number;
  total_secs: number;
}

export interface ExerciseHistoryEntry {
  workout_id: number;
  start_time: string;
  sets: {
    set_number: number;
    reps: number | null;
    weight: number | null;
    rpe: number | null;
    rest_seconds?: number | null;
    work_seconds?: number | null;
    speed?: number | null;
    incline?: number | null;
    side?: string | null;
    variation?: string | null;
    stance?: string | null;
  }[];
}

export interface ExerciseDetailCacheEntry {
  exercise: any;
  personalRecords: Record<string, Record<number, number>>;
  initialHistory: ExerciseHistoryEntry[];
  totalHistoryCount: number;
  availableStances?: string[];
  chartSummaryByStance?: Record<string, ExerciseChartSummaryRow[]>;
  updatedAt: number;
}

const MAX_CACHE_SIZE = 20;
const cache = new Map<number, ExerciseDetailCacheEntry>();

/**
 * 指定した種目IDのキャッシュを取得し、LRU順位を最新へ更新する。
 */
export const getExerciseDetailCache = (exerciseId: number): ExerciseDetailCacheEntry | undefined => {
  const entry = cache.get(exerciseId);
  if (!entry) return undefined;
  cache.delete(exerciseId);
  cache.set(exerciseId, entry);
  return entry;
};

/**
 * 種目詳細キャッシュを登録（上限超過時は最古エントリを破棄）。
 */
export const setExerciseDetailCache = (exerciseId: number, entry: ExerciseDetailCacheEntry): void => {
  if (cache.has(exerciseId)) {
    cache.delete(exerciseId);
  }
  cache.set(exerciseId, entry);

  while (cache.size > MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
};

/**
 * 既存キャッシュが存在する場合のみ部分的にマージ更新する。
 */
export const patchExerciseDetailCache = (
  exerciseId: number,
  patch: Partial<ExerciseDetailCacheEntry>
): void => {
  const existing = cache.get(exerciseId);
  if (!existing) return;

  const mergedChartSummaryByStance =
    patch.chartSummaryByStance !== undefined
      ? {
          ...(existing.chartSummaryByStance || {}),
          ...patch.chartSummaryByStance,
        }
      : existing.chartSummaryByStance;

  const updated: ExerciseDetailCacheEntry = {
    ...existing,
    ...patch,
    chartSummaryByStance: mergedChartSummaryByStance,
    updatedAt: patch.updatedAt ?? Date.now(),
  };

  cache.delete(exerciseId);
  cache.set(exerciseId, updated);
};

/**
 * キャッシュを無効化する（exerciseId 省略時は全削除）。
 */
export const invalidateExerciseDetailCache = (exerciseId?: number): void => {
  if (exerciseId !== undefined) {
    cache.delete(exerciseId);
    return;
  }
  cache.clear();
};
