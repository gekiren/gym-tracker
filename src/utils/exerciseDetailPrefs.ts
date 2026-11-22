export type ExerciseChartMetric = 'volume' | '1rm' | 'sets' | 'avg_volume_per_set' | 'density';
export type ExerciseChartScale = 'day' | 'week' | 'month';

export interface ExerciseChartPreference {
  metric?: ExerciseChartMetric;
  scale?: ExerciseChartScale;
  stance?: string;
}

export type ExerciseChartPreferencesMap = Record<string, ExerciseChartPreference>;
export type ExercisePrCollapsedStancesMap = Record<string, Record<string, boolean>>;

export const VALID_EXERCISE_CHART_METRICS: readonly ExerciseChartMetric[] = [
  'volume',
  '1rm',
  'sets',
  'avg_volume_per_set',
  'density',
];

export const VALID_EXERCISE_CHART_SCALES: readonly ExerciseChartScale[] = ['day', 'week', 'month'];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const isValidExerciseChartMetric = (value: unknown): value is ExerciseChartMetric =>
  typeof value === 'string' && (VALID_EXERCISE_CHART_METRICS as readonly string[]).includes(value);

export const isValidExerciseChartScale = (value: unknown): value is ExerciseChartScale =>
  typeof value === 'string' && (VALID_EXERCISE_CHART_SCALES as readonly string[]).includes(value);

export const parseExerciseChartMetric = (raw?: string): ExerciseChartMetric | undefined =>
  isValidExerciseChartMetric(raw) ? raw : undefined;

export const parseExerciseChartScale = (raw?: string): ExerciseChartScale | undefined =>
  isValidExerciseChartScale(raw) ? raw : undefined;

export const parseExerciseChartPreferences = (raw?: string): ExerciseChartPreferencesMap => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};

    const result: ExerciseChartPreferencesMap = {};
    for (const [exId, entry] of Object.entries(parsed)) {
      if (!isPlainObject(entry)) continue;

      const pref: ExerciseChartPreference = {};
      if (isValidExerciseChartMetric(entry.metric)) {
        pref.metric = entry.metric;
      }
      if (isValidExerciseChartScale(entry.scale)) {
        pref.scale = entry.scale;
      }
      if (typeof entry.stance === 'string' && entry.stance.length > 0) {
        pref.stance = entry.stance;
      }

      if (Object.keys(pref).length > 0) {
        result[exId] = pref;
      }
    }
    return result;
  } catch {
    return {};
  }
};

export const parseExercisePrCollapsedStances = (raw?: string): ExercisePrCollapsedStancesMap => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return {};

    const result: ExercisePrCollapsedStancesMap = {};
    for (const [exId, stanceMap] of Object.entries(parsed)) {
      if (!isPlainObject(stanceMap)) continue;

      const cleaned: Record<string, boolean> = {};
      for (const [variation, val] of Object.entries(stanceMap)) {
        if (typeof val === 'boolean') {
          cleaned[variation] = val;
        }
      }

      if (Object.keys(cleaned).length > 0) {
        result[exId] = cleaned;
      }
    }
    return result;
  } catch {
    return {};
  }
};

export const resolveExerciseChartPreference = (
  exerciseId: number,
  prefs: ExerciseChartPreferencesMap,
  fallbackMetric: ExerciseChartMetric,
  fallbackScale: ExerciseChartScale
): { metric: ExerciseChartMetric; scale: ExerciseChartScale; stance: string } => {
  const pref = prefs[String(exerciseId)];
  return {
    metric: pref?.metric ?? fallbackMetric,
    scale: pref?.scale ?? fallbackScale,
    stance: pref?.stance ?? 'all',
  };
};

export const resolveEffectiveChartStance = (
  savedStance: string,
  availableStances: string[],
  isLoadingChart: boolean,
  showStanceSelector: boolean
): string => {
  if (savedStance === 'all') return 'all';
  if (isLoadingChart) return savedStance;
  if (!showStanceSelector) return 'all';
  if (availableStances.includes(savedStance)) return savedStance;
  return 'all';
};
