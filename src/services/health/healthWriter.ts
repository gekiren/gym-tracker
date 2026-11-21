import { Platform } from 'react-native';
import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  deleteRecordsByUuids,
  SdkAvailabilityStatus,
  type HealthConnectRecord,
} from 'react-native-health-connect';
import { getSettings, saveSetting } from '../../db/database';
import { getWorkoutsWithStats, loadFullWorkoutData } from '../../db/repositories/workoutRepository';
import { getAllBodyLogs } from '../../db/repositories/bodyRepository';
import { getAllMealLogs } from '../../db/repositories/nutritionRepository';
import { getWaterLogs } from '../../db/repositories/lifelogRepository';
import type { MealLog } from '../../db/types';
import type { BodyCompositionLog } from '../../types/bodyComposition';
import { isTreadmillExercise } from '../../utils/exerciseUtils';
import {
  DEFAULT_HEALTH_SYNC_SETTINGS,
  READ_PERMISSIONS,
  WRITE_PERMISSIONS,
  type HealthPermissionSummary,
  type HealthSyncSettings,
  type HealthWriteSummary,
} from './healthTypes';
import {
  buildBodyCompositionRecords,
  buildHydrationRecord,
  buildNutritionRecord,
  buildWorkoutRecords,
  formatLocalDateISO,
  formatLocalDateSlash,
  groupRecordsByType,
  normalizeDateToISO,
  type HydrationWriteInput,
  type WorkoutWriteInput,
} from './healthMappers';

const BOOLEAN_SETTING_KEYS: Record<
  keyof Pick<
    HealthSyncSettings,
    | 'autoSyncOnLaunch'
    | 'autoSyncPeriodic'
    | 'autoWriteEnabled'
    | 'writeWorkouts'
    | 'writeBody'
    | 'writeNutrition'
    | 'writeHydration'
    | 'importBodyOnSync'
    | 'importHydrationOnSync'
  >,
  string
> = {
  autoSyncOnLaunch: 'health_sync_on_launch',
  autoSyncPeriodic: 'health_sync_periodic',
  autoWriteEnabled: 'health_auto_write_enabled',
  writeWorkouts: 'health_write_workouts',
  writeBody: 'health_write_body',
  writeNutrition: 'health_write_nutrition',
  writeHydration: 'health_write_hydration',
  importBodyOnSync: 'health_import_body_on_sync',
  importHydrationOnSync: 'health_import_hydration_on_sync',
};

const DELETE_SETTING_CATEGORY: Record<
  'ExerciseSession' | 'ActiveCaloriesBurned' | 'Nutrition' | 'Hydration',
  keyof Pick<HealthSyncSettings, 'writeWorkouts' | 'writeNutrition' | 'writeHydration'>
> = {
  ExerciseSession: 'writeWorkouts',
  ActiveCaloriesBurned: 'writeWorkouts',
  Nutrition: 'writeNutrition',
  Hydration: 'writeHydration',
};

/**
 * Health Connect SDK が利用可能か確認する
 */
export const isHealthDataAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    const isInitialized = await initialize();
    if (!isInitialized) return false;
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch (error) {
    console.warn('Failed to check Health Connect availability:', error);
    return false;
  }
};

/**
 * 許可済み権限の集計サマリーを取得する
 */
export const getHealthPermissionSummary = async (): Promise<HealthPermissionSummary> => {
  const empty: HealthPermissionSummary = {
    readGranted: 0,
    readTotal: READ_PERMISSIONS.length,
    writeGranted: 0,
    writeTotal: WRITE_PERMISSIONS.length,
    grantedSet: new Set<string>(),
    hasAnyRead: false,
    hasAnyWrite: false,
  };

  if (Platform.OS !== 'android') return empty;

  try {
    const available = await isHealthDataAvailable();
    if (!available) return empty;

    const granted = await getGrantedPermissions();
    const grantedSet = new Set<string>();
    for (const p of granted) {
      if ('recordType' in p && 'accessType' in p) {
        grantedSet.add(`${p.recordType}:${p.accessType}`);
      }
    }

    const readGranted = READ_PERMISSIONS.filter((p) =>
      grantedSet.has(`${p.recordType}:${p.accessType}`)
    ).length;
    const writeGranted = WRITE_PERMISSIONS.filter((p) =>
      grantedSet.has(`${p.recordType}:${p.accessType}`)
    ).length;

    return {
      readGranted,
      readTotal: READ_PERMISSIONS.length,
      writeGranted,
      writeTotal: WRITE_PERMISSIONS.length,
      grantedSet,
      hasAnyRead: readGranted > 0,
      hasAnyWrite: writeGranted > 0,
    };
  } catch (error) {
    console.warn('Failed to summarize Health Connect permissions:', error);
    return empty;
  }
};

/**
 * ヘルスコネクト同期設定を取得する
 */
export const getHealthSyncSettings = async (): Promise<HealthSyncSettings> => {
  try {
    const settings = await getSettings();
    const intervalRaw = settings['health_sync_interval_mins'];
    const lastSyncRaw = settings['health_last_sync_timestamp'];
    const parsedInterval = intervalRaw ? parseInt(intervalRaw, 10) : 60;
    const parsedLastSync = lastSyncRaw ? parseInt(lastSyncRaw, 10) : 0;

    return {
      autoSyncOnLaunch: settings['health_sync_on_launch'] !== '0',
      autoSyncPeriodic: settings['health_sync_periodic'] !== '0',
      periodicIntervalMinutes: !isNaN(parsedInterval) && parsedInterval > 0 ? parsedInterval : 60,
      lastSyncTimestamp: !isNaN(parsedLastSync) && parsedLastSync >= 0 ? parsedLastSync : 0,
      autoWriteEnabled: settings['health_auto_write_enabled'] === '1',
      writeWorkouts: settings['health_write_workouts'] !== '0',
      writeBody: settings['health_write_body'] !== '0',
      writeNutrition: settings['health_write_nutrition'] !== '0',
      writeHydration: settings['health_write_hydration'] !== '0',
      importBodyOnSync: settings['health_import_body_on_sync'] !== '0',
      importHydrationOnSync: settings['health_import_hydration_on_sync'] !== '0',
    };
  } catch (error) {
    console.warn('Failed to load health sync settings:', error);
    return { ...DEFAULT_HEALTH_SYNC_SETTINGS };
  }
};

/**
 * ヘルスコネクト同期設定を保存する
 */
export const saveHealthSyncSettings = async (
  settings: Partial<HealthSyncSettings>
): Promise<void> => {
  try {
    for (const [prop, dbKey] of Object.entries(BOOLEAN_SETTING_KEYS)) {
      const val = settings[prop as keyof typeof BOOLEAN_SETTING_KEYS];
      if (val !== undefined) {
        await saveSetting(dbKey, val ? '1' : '0');
      }
    }
    if (settings.periodicIntervalMinutes !== undefined) {
      await saveSetting('health_sync_interval_mins', String(settings.periodicIntervalMinutes));
    }
    if (settings.lastSyncTimestamp !== undefined) {
      await saveSetting('health_last_sync_timestamp', String(settings.lastSyncTimestamp));
    }
  } catch (error) {
    console.warn('Failed to save health sync settings:', error);
  }
};

async function getWriteContext(
  categoryToggleKey?: keyof Pick<
    HealthSyncSettings,
    'writeWorkouts' | 'writeBody' | 'writeNutrition' | 'writeHydration'
  >,
  force: boolean = false
): Promise<{ ok: true; grantedSet: Set<string> } | { ok: false }> {
  if (Platform.OS !== 'android') return { ok: false };

  if (!force) {
    const syncSettings = await getHealthSyncSettings();
    if (!syncSettings.autoWriteEnabled) return { ok: false };
    if (categoryToggleKey && !syncSettings[categoryToggleKey]) return { ok: false };
  }

  const summary = await getHealthPermissionSummary();
  if (!summary.hasAnyWrite) return { ok: false };

  return { ok: true, grantedSet: summary.grantedSet };
}

async function insertAllowedRecords(
  records: HealthConnectRecord[],
  grantedSet: Set<string>,
  chunkSize: number = 50
): Promise<number> {
  const allowed = records.filter((r) => grantedSet.has(`${r.recordType}:write`));
  if (allowed.length === 0) return 0;

  let insertedCount = 0;
  for (const typeGroup of groupRecordsByType(allowed)) {
    for (let i = 0; i < typeGroup.length; i += chunkSize) {
      const chunk = typeGroup.slice(i, i + chunkSize);
      await insertRecords(chunk);
      insertedCount += chunk.length;
    }
  }
  return insertedCount;
}

/**
 * ワークアウト1件を Health Connect へ書き込む
 */
export const writeWorkoutToHealthConnect = async (
  input: WorkoutWriteInput,
  options?: { force?: boolean }
): Promise<boolean> => {
  try {
    const ctx = await getWriteContext('writeWorkouts', options?.force);
    if (!ctx.ok) return false;

    const records = buildWorkoutRecords(input);
    const written = await insertAllowedRecords(records, ctx.grantedSet);
    return written > 0;
  } catch (error) {
    console.warn('[HealthConnect] Failed to write workout:', error);
    return false;
  }
};

/**
 * 体組成ログ1件を Health Connect へ書き込む（Health Connect由来のログはスキップ）
 */
export const writeBodyLogToHealthConnect = async (
  log: Partial<BodyCompositionLog> & { date: string },
  options?: { force?: boolean }
): Promise<boolean> => {
  if (log.source === 'health_connect') return false;
  try {
    const ctx = await getWriteContext('writeBody', options?.force);
    if (!ctx.ok) return false;

    const records = buildBodyCompositionRecords(log);
    if (records.length === 0) return false;
    const written = await insertAllowedRecords(records, ctx.grantedSet);
    return written > 0;
  } catch (error) {
    console.warn('[HealthConnect] Failed to write body log:', error);
    return false;
  }
};

/**
 * 食事ログ1件を Health Connect へ書き込む
 */
export const writeMealLogToHealthConnect = async (
  meal: MealLog,
  options?: { force?: boolean }
): Promise<boolean> => {
  try {
    const ctx = await getWriteContext('writeNutrition', options?.force);
    if (!ctx.ok) return false;

    const record = buildNutritionRecord(meal);
    if (!record) return false;
    const written = await insertAllowedRecords([record], ctx.grantedSet);
    return written > 0;
  } catch (error) {
    console.warn('[HealthConnect] Failed to write meal log:', error);
    return false;
  }
};

/**
 * 複数の食事ログを一括で Health Connect へ書き込む
 */
export const writeMealLogsBatchToHealthConnect = async (
  meals: MealLog[],
  options?: { force?: boolean }
): Promise<number> => {
  if (!meals || meals.length === 0) return 0;
  try {
    const ctx = await getWriteContext('writeNutrition', options?.force);
    if (!ctx.ok) return 0;

    const records = meals
      .map((m) => buildNutritionRecord(m))
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (records.length === 0) return 0;

    return await insertAllowedRecords(records, ctx.grantedSet);
  } catch (error) {
    console.warn('[HealthConnect] Failed to batch write meal logs:', error);
    return 0;
  }
};

/**
 * 水分摂取ログ1件を Health Connect へ書き込む
 */
export const writeWaterLogToHealthConnect = async (
  log: HydrationWriteInput,
  options?: { force?: boolean }
): Promise<boolean> => {
  try {
    const ctx = await getWriteContext('writeHydration', options?.force);
    if (!ctx.ok) return false;

    const record = buildHydrationRecord(log);
    if (!record) return false;
    const written = await insertAllowedRecords([record], ctx.grantedSet);
    return written > 0;
  } catch (error) {
    console.warn('[HealthConnect] Failed to write hydration log:', error);
    return false;
  }
};

/**
 * clientRecordId 指定で Health Connect 側の自アプリ記録を削除する
 */
export const deleteHealthConnectRecordsByClientIds = async (
  recordType: 'ExerciseSession' | 'ActiveCaloriesBurned' | 'Nutrition' | 'Hydration',
  clientRecordIds: string[],
  options?: { force?: boolean }
): Promise<boolean> => {
  const validIds = clientRecordIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (validIds.length === 0) return false;

  try {
    const toggleKey = DELETE_SETTING_CATEGORY[recordType];
    const ctx = await getWriteContext(toggleKey, options?.force);
    if (!ctx.ok) return false;
    if (!ctx.grantedSet.has(`${recordType}:write`)) return false;

    await deleteRecordsByUuids(recordType, [], validIds);
    return true;
  } catch (error) {
    console.warn(`[HealthConnect] Failed to delete ${recordType} records:`, error);
    return false;
  }
};

/**
 * 直近 N 日間のローカル記録を Health Connect へ冪等に一括書き込みする
 */
export const pushRecentDataToHealthConnect = async (
  days: number = 7
): Promise<HealthWriteSummary> => {
  const summary: HealthWriteSummary = {
    workouts: 0,
    body: 0,
    nutrition: 0,
    hydration: 0,
    skipped: 0,
    errors: [],
  };

  if (Platform.OS !== 'android') {
    summary.errors.push('Android 端末でのみ Health Connect を利用できます。');
    return summary;
  }

  const ctx = await getWriteContext(undefined, true);
  if (!ctx.ok) {
    summary.errors.push('Health Connect の書き込み権限が付与されていません。');
    return summary;
  }

  const safeDays = Math.max(1, Math.min(30, Math.round(days)));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (safeDays - 1));
  cutoff.setHours(0, 0, 0, 0);
  const cutoffISO = formatLocalDateISO(cutoff);
  const cutoffMs = cutoff.getTime();
  const version = Date.now();

  // 1. ワークアウト
  try {
    if (
      ctx.grantedSet.has('ExerciseSession:write') ||
      ctx.grantedSet.has('ActiveCaloriesBurned:write')
    ) {
      const workouts = await getWorkoutsWithStats();
      const recentWorkouts = workouts.filter((w) => {
        const startMs = new Date(w.start_time).getTime();
        return Number.isFinite(startMs)
          ? startMs >= cutoffMs
          : normalizeDateToISO(w.start_time) >= cutoffISO;
      });

      const workoutRecords: HealthConnectRecord[] = [];
      let pendingWorkoutCount = 0;
      for (const w of recentWorkouts) {
        const full = await loadFullWorkoutData(w.id);
        if (!full) continue;
        const exerciseNames = full.exercises.map((e) => e.exercise_name).filter(Boolean);
        const totalSets = full.exercises.reduce((acc, e) => acc + e.sets.length, 0);
        const isTreadmillOnly =
          exerciseNames.length > 0 && exerciseNames.every((name) => isTreadmillExercise(name));

        const built = buildWorkoutRecords(
          {
            id: full.id,
            title: full.title,
            startTime: full.start_time,
            endTime: full.end_time || full.start_time,
            notes: full.notes,
            calories: full.calories,
            exerciseNames,
            totalSets,
            isTreadmillOnly,
          },
          version
        );
        const allowedForWorkout = built.filter((r) => ctx.grantedSet.has(`${r.recordType}:write`));
        if (allowedForWorkout.length > 0) {
          workoutRecords.push(...allowedForWorkout);
          pendingWorkoutCount += 1;
        } else {
          summary.skipped += 1;
        }
      }

      if (workoutRecords.length > 0) {
        await insertAllowedRecords(workoutRecords, ctx.grantedSet);
        summary.workouts = pendingWorkoutCount;
      }
    }
  } catch (err: any) {
    summary.errors.push(`ワークアウト書き込みエラー: ${err?.message || err}`);
  }

  // 2. 体組成
  try {
    const canWriteAnyBody =
      ctx.grantedSet.has('Weight:write') ||
      ctx.grantedSet.has('BodyFat:write') ||
      ctx.grantedSet.has('Height:write') ||
      ctx.grantedSet.has('LeanBodyMass:write');

    if (canWriteAnyBody) {
      const bodyLogs = await getAllBodyLogs(Math.max(safeDays * 2, 30));
      const recentBody = bodyLogs.filter(
        (b) => normalizeDateToISO(b.date) >= cutoffISO && b.source !== 'health_connect'
      );

      const bodyRecords: HealthConnectRecord[] = [];
      let pendingBodyCount = 0;
      for (const log of recentBody) {
        const built = buildBodyCompositionRecords(log, version).filter((r) =>
          ctx.grantedSet.has(`${r.recordType}:write`)
        );
        if (built.length > 0) {
          bodyRecords.push(...built);
          pendingBodyCount += 1;
        } else {
          summary.skipped += 1;
        }
      }

      if (bodyRecords.length > 0) {
        await insertAllowedRecords(bodyRecords, ctx.grantedSet);
        summary.body = pendingBodyCount;
      }
    }
  } catch (err: any) {
    summary.errors.push(`体組成書き込みエラー: ${err?.message || err}`);
  }

  // 3. 食事・栄養
  try {
    if (ctx.grantedSet.has('Nutrition:write')) {
      const allMeals = await getAllMealLogs();
      const recentMeals = allMeals.filter((m) => normalizeDateToISO(m.date) >= cutoffISO);
      const nutritionRecords: HealthConnectRecord[] = [];

      for (const meal of recentMeals) {
        const rec = buildNutritionRecord(meal, version);
        if (rec) {
          nutritionRecords.push(rec);
        } else {
          summary.skipped += 1;
        }
      }

      if (nutritionRecords.length > 0) {
        summary.nutrition = await insertAllowedRecords(nutritionRecords, ctx.grantedSet);
      }
    }
  } catch (err: any) {
    summary.errors.push(`食事・栄養書き込みエラー: ${err?.message || err}`);
  }

  // 4. 水分摂取
  try {
    if (ctx.grantedSet.has('Hydration:write')) {
      const seenTs = new Set<number>();
      const hydrationRecords: HealthConnectRecord[] = [];

      for (let i = 0; i < safeDays; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateSlash = formatLocalDateSlash(d);
        const dateISO = formatLocalDateISO(d);

        const logsSlash = await getWaterLogs(dateSlash);
        const logsISO = dateISO !== dateSlash ? await getWaterLogs(dateISO) : [];
        for (const w of [...logsSlash, ...logsISO]) {
          if (seenTs.has(w.timestamp)) continue;
          seenTs.add(w.timestamp);
          const rec = buildHydrationRecord(w, version);
          if (rec) {
            hydrationRecords.push(rec);
          } else {
            summary.skipped += 1;
          }
        }
      }

      if (hydrationRecords.length > 0) {
        summary.hydration = await insertAllowedRecords(hydrationRecords, ctx.grantedSet);
      }
    }
  } catch (err: any) {
    summary.errors.push(`水分書き込みエラー: ${err?.message || err}`);
  }

  return summary;
};
