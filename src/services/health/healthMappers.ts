import type {
  ActiveCaloriesBurnedRecord,
  BodyFatRecord,
  ExerciseSessionRecord,
  HealthConnectRecord,
  HeightRecord,
  HydrationRecord,
  LeanBodyMassRecord,
  Metadata,
  NutritionRecord,
  WeightRecord,
} from 'react-native-health-connect';
import type { MealLog } from '../../db/types';
import type { BodyCompositionLog } from '../../types/bodyComposition';
import { TRENOTE_PACKAGE_NAME } from './healthTypes';

// Health Connect SDK 定数（Jest 実行時にネイティブモジュールへ依存しないよう数値定数を定義）
export const HC_EXERCISE_TYPE_RUNNING_TREADMILL = 57;
export const HC_EXERCISE_TYPE_STRENGTH_TRAINING = 70;

export const HC_MEAL_TYPE_UNKNOWN = 0;
export const HC_MEAL_TYPE_BREAKFAST = 1;
export const HC_MEAL_TYPE_LUNCH = 2;
export const HC_MEAL_TYPE_DINNER = 3;
export const HC_MEAL_TYPE_SNACK = 4;

export const HC_SLEEP_STAGE_AWAKE = 1;
export const HC_SLEEP_STAGE_SLEEPING = 2;
export const HC_SLEEP_STAGE_OUT_OF_BED = 3;
export const HC_SLEEP_STAGE_LIGHT = 4;
export const HC_SLEEP_STAGE_DEEP = 5;
export const HC_SLEEP_STAGE_REM = 6;

export const HC_DEVICE_TYPE_PHONE = 2;
export const HC_RECORDING_METHOD_ACTIVELY_RECORDED = 1;
export const HC_RECORDING_METHOD_MANUAL_ENTRY = 3;

export interface WorkoutWriteInput {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string | null;
  calories?: number | null;
  exerciseNames?: string[];
  totalSets?: number;
  isTreadmillOnly?: boolean;
}

export interface HydrationWriteInput {
  amount: number;
  timestamp: number;
  date?: string;
}

/**
 * ローカルタイムゾーンで YYYY-MM-DD を返す
 */
export function formatLocalDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * ローカルタイムゾーンで YYYY/MM/DD を返す
 */
export function formatLocalDateSlash(date: Date = new Date()): string {
  return formatLocalDateISO(date).replace(/-/g, '/');
}

/**
 * '/' または '-' 区切りの日付文字列を YYYY-MM-DD に正規化する
 */
export function normalizeDateToISO(dateStr: string): string {
  const trimmed = String(dateStr || '').trim();
  const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return formatLocalDateISO(parsed);
  }
  return formatLocalDateISO();
}

/**
 * YYYY-MM-DD を YYYY/MM/DD に変換する
 */
export function normalizeDateToSlash(dateStr: string): string {
  return normalizeDateToISO(dateStr).replace(/-/g, '/');
}

function parseISODateParts(isoDate: string): { year: number; month: number; day: number } | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * 開始時刻と終了時刻が必ず startTime < endTime を満たす区間 ISO 文字列を返す
 */
export function ensureValidInterval(
  startMs: number,
  endMs?: number,
  minDurationMs: number = 60_000
): { startTime: string; endTime: string } {
  const safeStart = Number.isFinite(startMs) && startMs > 0 ? startMs : Date.now();
  const safeDuration = Number.isFinite(minDurationMs) && minDurationMs > 0 ? minDurationMs : 60_000;
  const safeEnd =
    typeof endMs === 'number' && Number.isFinite(endMs) && endMs > safeStart
      ? endMs
      : safeStart + safeDuration;

  return {
    startTime: new Date(safeStart).toISOString(),
    endTime: new Date(safeEnd).toISOString(),
  };
}

/**
 * 食事ログの日付・時刻・種別からローカル基準の開始・終了時刻 (+1分) を生成する
 */
export function buildMealTimeInterval(
  meal: Pick<MealLog, 'date' | 'meal_time' | 'meal_type' | 'created_at'>
): { startTime: string; endTime: string } {
  const isoDate = normalizeDateToISO(meal.date);
  const parts = parseISODateParts(isoDate);

  if (parts && typeof meal.meal_time === 'string') {
    const timeMatch = meal.meal_time.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hh = Number(timeMatch[1]);
      const mm = Number(timeMatch[2]);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        const localStart = new Date(parts.year, parts.month - 1, parts.day, hh, mm, 0, 0).getTime();
        return ensureValidInterval(localStart, localStart + 60_000);
      }
    }
  }

  if (typeof meal.created_at === 'number' && Number.isFinite(meal.created_at) && meal.created_at > 0) {
    const createdDate = new Date(meal.created_at);
    if (!parts || formatLocalDateISO(createdDate) === isoDate) {
      return ensureValidInterval(meal.created_at, meal.created_at + 60_000);
    }
  }

  const defaultHourMap: Record<string, number> = {
    breakfast: 8,
    lunch: 12,
    dinner: 19,
    snack: 15,
  };
  const hour = defaultHourMap[String(meal.meal_type || '').toLowerCase()] ?? 12;

  if (parts) {
    const fallbackStart = new Date(parts.year, parts.month - 1, parts.day, hour, 0, 0, 0).getTime();
    return ensureValidInterval(fallbackStart, fallbackStart + 60_000);
  }

  return ensureValidInterval(Date.now());
}

/**
 * Health Connect の SleepSession.stages を SleepStageType 定数に基づいて集計する
 */
export function aggregateSleepStages(
  stages?: { startTime: string; endTime: string; stage: number }[]
): {
  deepSleepMinutes: number;
  lightSleepMinutes: number;
  remSleepMinutes: number;
  awakeMinutes: number;
} {
  let deepSleepMinutes = 0;
  let lightSleepMinutes = 0;
  let remSleepMinutes = 0;
  let awakeMinutes = 0;

  if (!Array.isArray(stages)) {
    return { deepSleepMinutes, lightSleepMinutes, remSleepMinutes, awakeMinutes };
  }

  for (const stage of stages) {
    const st = new Date(stage.startTime).getTime();
    const et = new Date(stage.endTime).getTime();
    if (!Number.isFinite(st) || !Number.isFinite(et) || et <= st) continue;
    const mins = Math.round((et - st) / 60_000);
    if (mins <= 0) continue;

    switch (stage.stage) {
      case HC_SLEEP_STAGE_DEEP:
        deepSleepMinutes += mins;
        break;
      case HC_SLEEP_STAGE_LIGHT:
        lightSleepMinutes += mins;
        break;
      case HC_SLEEP_STAGE_REM:
        remSleepMinutes += mins;
        break;
      case HC_SLEEP_STAGE_AWAKE:
      case HC_SLEEP_STAGE_OUT_OF_BED:
        awakeMinutes += mins;
        break;
      case HC_SLEEP_STAGE_SLEEPING:
      default:
        // SLEEPING (2) は分類不明の睡眠のため lightSleepMinutes には混入させない
        break;
    }
  }

  return { deepSleepMinutes, lightSleepMinutes, remSleepMinutes, awakeMinutes };
}

/**
 * TreNoteの食塩相当量 (g) を Health Connect のナトリウム (g) へ変換し 0〜100g にクランプする
 */
export function convertSaltToSodiumGrams(saltGrams: number): number {
  if (typeof saltGrams !== 'number' || !Number.isFinite(saltGrams) || saltGrams <= 0) {
    return 0;
  }
  const sodium = Number((saltGrams / 2.54).toFixed(3));
  return Math.min(100, Math.max(0, sodium));
}

/**
 * 正の有限数値のみを抽出し上限でクランプする
 */
export function clampPositive(val: number | null | undefined, max: number): number | undefined {
  if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) {
    return undefined;
  }
  return Math.min(max, val);
}

/**
 * Health Connect レコードの metadata から dataOrigin パッケージ名を取り出す
 */
export function extractDataOriginPackage(metadata: any): string | null {
  if (!metadata) return null;
  const origin = metadata.dataOrigin;
  if (typeof origin === 'string' && origin.trim().length > 0) {
    return origin.trim();
  }
  if (origin && typeof origin === 'object' && typeof origin.packageName === 'string') {
    return origin.packageName.trim();
  }
  return null;
}

/**
 * TreNote 自身が書き込んだレコードかどうかを判定する
 */
export function isOwnHealthConnectRecord(
  metadata: any,
  ownPackage: string = TRENOTE_PACKAGE_NAME
): boolean {
  const pkg = extractDataOriginPackage(metadata);
  return pkg === ownPackage;
}

export function getWorkoutClientIds(workoutId: number): {
  sessionClientId: string;
  caloriesClientId: string;
} {
  return {
    sessionClientId: `trenote_workout_${workoutId}`,
    caloriesClientId: `trenote_workout_cal_${workoutId}`,
  };
}

export function getMealClientId(mealId: number): string {
  return `trenote_meal_${mealId}`;
}

export function getWaterClientId(timestamp: number): string {
  return `trenote_water_${timestamp}`;
}

function buildMetadata(
  clientRecordId: string,
  recordingMethod: number,
  version: number = Date.now()
): Metadata {
  return {
    clientRecordId,
    clientRecordVersion: version,
    recordingMethod,
    device: {
      type: HC_DEVICE_TYPE_PHONE,
    },
  };
}

function mapMealTypeToHealthConnect(mealType?: string | null): number {
  switch (String(mealType || '').toLowerCase()) {
    case 'breakfast':
      return HC_MEAL_TYPE_BREAKFAST;
    case 'lunch':
      return HC_MEAL_TYPE_LUNCH;
    case 'dinner':
      return HC_MEAL_TYPE_DINNER;
    case 'snack':
      return HC_MEAL_TYPE_SNACK;
    default:
      return HC_MEAL_TYPE_UNKNOWN;
  }
}

/**
 * ワークアウトデータを ExerciseSessionRecord (+ ActiveCaloriesBurnedRecord) へ変換する
 */
export function buildWorkoutRecords(
  input: WorkoutWriteInput,
  version: number = Date.now()
): HealthConnectRecord[] {
  const startMs = new Date(input.startTime).getTime();
  const endMs = new Date(input.endTime).getTime();
  const { startTime, endTime } = ensureValidInterval(startMs, endMs);
  const { sessionClientId, caloriesClientId } = getWorkoutClientIds(input.id);

  const noteLines: string[] = [];
  if (input.exerciseNames && input.exerciseNames.length > 0) {
    const setsLabel = input.totalSets && input.totalSets > 0 ? ` (${input.totalSets} sets)` : '';
    noteLines.push(`種目: ${input.exerciseNames.join(', ')}${setsLabel}`);
  }
  if (input.notes && input.notes.trim().length > 0) {
    noteLines.push(input.notes.trim());
  }

  // react-native-health-connect v4.1.3 の ReactExerciseSessionRecord.kt における
  // laps/segments 読み取りキー不整合 ("samples") を回避するため、laps/segments は渡さない
  const sessionRecord: ExerciseSessionRecord = {
    recordType: 'ExerciseSession',
    startTime,
    endTime,
    exerciseType: input.isTreadmillOnly
      ? HC_EXERCISE_TYPE_RUNNING_TREADMILL
      : HC_EXERCISE_TYPE_STRENGTH_TRAINING,
    title: input.title?.trim() || 'TreNote ワークアウト',
    ...(noteLines.length > 0 ? { notes: noteLines.join('\n') } : {}),
    metadata: buildMetadata(sessionClientId, HC_RECORDING_METHOD_ACTIVELY_RECORDED, version),
  };

  const records: HealthConnectRecord[] = [sessionRecord];

  const validCalories = clampPositive(input.calories, 10_000);
  if (validCalories !== undefined) {
    const calRecord: ActiveCaloriesBurnedRecord = {
      recordType: 'ActiveCaloriesBurned',
      startTime,
      endTime,
      energy: {
        value: Math.round(validCalories),
        unit: 'kilocalories',
      },
      metadata: buildMetadata(caloriesClientId, HC_RECORDING_METHOD_ACTIVELY_RECORDED, version),
    };
    records.push(calRecord);
  }

  return records;
}

/**
 * 体組成ログを Weight / BodyFat / Height / LeanBodyMass レコード配列へ変換する
 */
export function buildBodyCompositionRecords(
  log: Partial<BodyCompositionLog> & { date: string },
  version: number = Date.now()
): HealthConnectRecord[] {
  if (log.source === 'health_connect') {
    return [];
  }

  const isoDate = normalizeDateToISO(log.date);
  const parts = parseISODateParts(isoDate);

  let recordMs: number;
  if (
    typeof log.created_at === 'number' &&
    Number.isFinite(log.created_at) &&
    log.created_at > 0 &&
    formatLocalDateISO(new Date(log.created_at)) === isoDate
  ) {
    recordMs = log.created_at;
  } else if (parts) {
    recordMs = new Date(parts.year, parts.month - 1, parts.day, 8, 0, 0, 0).getTime();
  } else {
    recordMs = Date.now();
  }

  const timeIso = new Date(recordMs).toISOString();
  const records: HealthConnectRecord[] = [];

  if (typeof log.weight === 'number' && Number.isFinite(log.weight) && log.weight >= 1 && log.weight <= 500) {
    const weightRecord: WeightRecord = {
      recordType: 'Weight',
      time: timeIso,
      weight: {
        value: Number(log.weight.toFixed(2)),
        unit: 'kilograms',
      },
      metadata: buildMetadata(`trenote_body_${isoDate}_weight`, HC_RECORDING_METHOD_MANUAL_ENTRY, version),
    };
    records.push(weightRecord);
  }

  if (
    typeof log.body_fat_rate === 'number' &&
    Number.isFinite(log.body_fat_rate) &&
    log.body_fat_rate >= 1 &&
    log.body_fat_rate <= 99
  ) {
    const bodyFatRecord: BodyFatRecord = {
      recordType: 'BodyFat',
      time: timeIso,
      percentage: Number(log.body_fat_rate.toFixed(1)),
      metadata: buildMetadata(`trenote_body_${isoDate}_bodyfat`, HC_RECORDING_METHOD_MANUAL_ENTRY, version),
    };
    records.push(bodyFatRecord);
  }

  if (typeof log.height === 'number' && Number.isFinite(log.height) && log.height >= 50 && log.height <= 250) {
    const heightRecord: HeightRecord = {
      recordType: 'Height',
      time: timeIso,
      height: {
        value: Number((log.height / 100).toFixed(3)),
        unit: 'meters',
      },
      metadata: buildMetadata(`trenote_body_${isoDate}_height`, HC_RECORDING_METHOD_MANUAL_ENTRY, version),
    };
    records.push(heightRecord);
  }

  if (typeof log.lbm === 'number' && Number.isFinite(log.lbm) && log.lbm >= 1 && log.lbm <= 300) {
    const lbmRecord: LeanBodyMassRecord = {
      recordType: 'LeanBodyMass',
      time: timeIso,
      mass: {
        value: Number(log.lbm.toFixed(2)),
        unit: 'kilograms',
      },
      metadata: buildMetadata(`trenote_body_${isoDate}_lbm`, HC_RECORDING_METHOD_MANUAL_ENTRY, version),
    };
    records.push(lbmRecord);
  }

  return records;
}

/**
 * 食事ログを NutritionRecord へ変換する（栄養値がすべて0の場合は null）
 */
export function buildNutritionRecord(
  meal: MealLog,
  version: number = Date.now()
): NutritionRecord | null {
  const energyKcal = clampPositive(meal.calories, 100_000);
  const proteinG = clampPositive(meal.protein, 100_000);
  const fatG = clampPositive(meal.fat, 100_000);
  const carbsG = clampPositive(meal.carbs, 100_000);
  const fiberG = clampPositive(meal.fiber, 100_000);
  const sodiumG = convertSaltToSodiumGrams(meal.sodium);

  if (
    energyKcal === undefined &&
    proteinG === undefined &&
    fatG === undefined &&
    carbsG === undefined &&
    fiberG === undefined &&
    sodiumG <= 0
  ) {
    return null;
  }

  const { startTime, endTime } = buildMealTimeInterval(meal);

  const record: NutritionRecord = {
    recordType: 'Nutrition',
    startTime,
    endTime,
    name: meal.name?.trim() || '食事',
    mealType: mapMealTypeToHealthConnect(meal.meal_type),
    ...(energyKcal !== undefined ? { energy: { value: Number(energyKcal.toFixed(1)), unit: 'kilocalories' } } : {}),
    ...(proteinG !== undefined ? { protein: { value: Number(proteinG.toFixed(1)), unit: 'grams' } } : {}),
    ...(fatG !== undefined ? { totalFat: { value: Number(fatG.toFixed(1)), unit: 'grams' } } : {}),
    ...(carbsG !== undefined ? { totalCarbohydrate: { value: Number(carbsG.toFixed(1)), unit: 'grams' } } : {}),
    ...(fiberG !== undefined ? { dietaryFiber: { value: Number(fiberG.toFixed(1)), unit: 'grams' } } : {}),
    ...(sodiumG > 0 ? { sodium: { value: sodiumG, unit: 'grams' } } : {}),
    metadata: buildMetadata(getMealClientId(meal.id), HC_RECORDING_METHOD_MANUAL_ENTRY, version),
  };

  return record;
}

/**
 * 水分摂取ログを HydrationRecord へ変換する
 */
export function buildHydrationRecord(
  log: HydrationWriteInput,
  version: number = Date.now()
): HydrationRecord | null {
  if (typeof log.amount !== 'number' || !Number.isFinite(log.amount) || log.amount < 1) {
    return null;
  }
  const safeAmount = Math.min(10_000, Math.round(log.amount));
  const safeTs =
    typeof log.timestamp === 'number' && Number.isFinite(log.timestamp) && log.timestamp > 0
      ? log.timestamp
      : Date.now();

  const { startTime, endTime } = ensureValidInterval(safeTs, safeTs + 60_000);

  return {
    recordType: 'Hydration',
    startTime,
    endTime,
    volume: {
      value: safeAmount,
      unit: 'milliliters',
    },
    metadata: buildMetadata(getWaterClientId(safeTs), HC_RECORDING_METHOD_MANUAL_ENTRY, version),
  };
}

/**
 * Health Connect の insertRecords 制約（同一呼び出し内は単一 recordType のみ）に合わせ、
 * レコード配列を recordType ごとの配列へ分割する
 */
export function groupRecordsByType(records: HealthConnectRecord[]): HealthConnectRecord[][] {
  const grouped = new Map<string, HealthConnectRecord[]>();
  for (const record of records) {
    const bucket = grouped.get(record.recordType);
    if (bucket) {
      bucket.push(record);
    } else {
      grouped.set(record.recordType, [record]);
    }
  }
  return Array.from(grouped.values());
}
