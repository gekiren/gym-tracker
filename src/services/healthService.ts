import { Platform } from 'react-native';
import {
  aggregateRecord,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  type Permission,
} from 'react-native-health-connect';
import { addWaterLog, getWaterLogs } from '../db/repositories/lifelogRepository';
import {
  ALL_HEALTH_PERMISSIONS,
  LEGACY_READ_PERMISSIONS,
  READ_PERMISSIONS,
  WRITE_PERMISSIONS,
  type DailyHealthData,
  type HealthExerciseSummary,
  type HealthPermissionSummary,
  type WorkoutHealthData,
} from './health/healthTypes';
import {
  aggregateSleepStages,
  formatLocalDateISO,
  isOwnHealthConnectRecord,
  normalizeDateToISO,
  normalizeDateToSlash,
} from './health/healthMappers';
import {
  getHealthPermissionSummary,
  getHealthSyncSettings,
  isHealthDataAvailable,
  saveHealthSyncSettings,
} from './health/healthWriter';

export * from './health/healthTypes';
export * from './health/healthMappers';
export * from './health/healthWriter';

/**
 * 権限の有無をチェック（1つ以上の読取権限が付与されているか）
 */
export const hasHealthPermissions = async (): Promise<boolean> => {
  const summary = await getHealthPermissionSummary();
  return summary.hasAnyRead;
};

/**
 * Health Connect 権限の取得要求（read / write / all）
 */
export const requestHealthPermissions = async (
  scope: 'all' | 'read' | 'write' = 'all'
): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  try {
    const available = await isHealthDataAvailable();
    if (!available) return false;

    const targets: Permission[] =
      scope === 'read'
        ? READ_PERMISSIONS
        : scope === 'write'
          ? WRITE_PERMISSIONS
          : ALL_HEALTH_PERMISSIONS;

    try {
      const granted = await requestPermission(targets);
      return granted.length > 0;
    } catch (innerError) {
      // 旧ネイティブバイナリ等で新規パーミッションが未宣言の場合、従来17権限のみでフォールバック
      if (scope !== 'write') {
        console.warn('Primary permission request failed, falling back to legacy permissions:', innerError);
        const fallbackGranted = await requestPermission(LEGACY_READ_PERMISSIONS);
        return fallbackGranted.length > 0;
      }
      throw innerError;
    }
  } catch (error) {
    console.warn('Failed to request health permissions:', error);
    return false;
  }
};

/**
 * Android システムの Health Connect 設定画面を開く
 */
export const openSystemHealthConnectSettings = (): void => {
  if (Platform.OS !== 'android') return;
  try {
    openHealthConnectSettings();
  } catch (error) {
    console.warn('Failed to open Health Connect settings:', error);
  }
};

async function readAggregateOrFallback<T extends number>(
  aggregateFn: () => Promise<T | null | undefined>,
  fallbackFn: () => Promise<T>
): Promise<T> {
  try {
    const aggVal = await aggregateFn();
    if (typeof aggVal === 'number' && Number.isFinite(aggVal)) {
      return aggVal;
    }
  } catch {
    // 端末やSDKバージョンにより aggregate 非対応の場合は readRecords にフォールバック
  }
  return await fallbackFn();
}

function getLatestRecordByTime<T extends { time: string }>(records: T[]): T | null {
  if (!records || records.length === 0) return null;
  return [...records].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  )[0];
}

/**
 * 今日のヘルスケアデータを取得（またはモック生成）
 */
export const fetchTodayHealthData = async (
  isMock: boolean = false
): Promise<{ data: DailyHealthData | null; error: string | null }> => {
  const todayStr = formatLocalDateISO(new Date());

  if (isMock) {
    const mockWeight = Math.floor(Math.random() * (850 - 600) + 600) / 10;
    const mockBodyFatRate = Math.floor(Math.random() * (240 - 120) + 120) / 10;
    const mockSleepTotal = Math.floor(Math.random() * (540 - 360) + 360);
    const mockDeepSleep = Math.floor(mockSleepTotal * (Math.random() * 0.1 + 0.2));
    const mockRemSleep = Math.floor(mockSleepTotal * (Math.random() * 0.1 + 0.15));
    const mockAwake = Math.floor(Math.random() * 30 + 10);
    const mockLightSleep = mockSleepTotal - mockDeepSleep - mockRemSleep - mockAwake;
    const mockLbm = Number((mockWeight * (1 - mockBodyFatRate / 100)).toFixed(1));

    return {
      data: {
        date: todayStr,
        steps: Math.floor(Math.random() * (12000 - 6000) + 6000),
        sleepDurationMinutes: mockSleepTotal,
        averageHeartRate: Math.floor(Math.random() * (78 - 62) + 62),
        bloodOxygenAverage: Math.floor(Math.random() * (99 - 96) + 96),
        stressLevel: Math.floor(Math.random() * (45 - 15) + 15),
        activityDurationMinutes: Math.floor(Math.random() * (80 - 10) + 10),
        weight: mockWeight,
        bodyFatRate: mockBodyFatRate,
        bmi: Math.floor(Math.random() * (255 - 185) + 185) / 10,
        muscleMass: Number((mockWeight * 0.7).toFixed(1)),
        basalMetabolism: Math.floor(Math.random() * (1800 - 1300) + 1300),
        bodyAge: Math.floor(Math.random() * (45 - 22) + 22),
        bodyScore: 80,
        visceralFatLevel: 7,
        skeletalMuscleMass: Number((mockWeight * 0.4).toFixed(1)),
        boneSalt: 2.8,
        moisture: Number((mockWeight * 0.55).toFixed(1)),
        moistureRate: 55,
        bodyFat: Number((mockWeight * (mockBodyFatRate / 100)).toFixed(1)),
        proteinRate: 16.5,
        impedance: 500,
        activeCaloriesBurned: Math.floor(Math.random() * (650 - 200) + 200),
        totalCaloriesBurned: Math.floor(Math.random() * (2500 - 1800) + 1800),
        distanceMeters: Math.floor(Math.random() * (8500 - 1500) + 1500),
        moderateHighIntensityDurationMinutes: Math.floor(Math.random() * (45 - 10) + 10),
        deepSleepMinutes: mockDeepSleep,
        lightSleepMinutes: mockLightSleep,
        remSleepMinutes: mockRemSleep,
        awakeMinutes: mockAwake,
        vo2Max: Math.floor(Math.random() * (52 - 38) + 38),
        skinTemperature: Math.floor(Math.random() * (370 - 355) + 355) / 10,
        heightMeters: 1.72,
        systolicBloodPressure: Math.floor(Math.random() * (130 - 110) + 110),
        diastolicBloodPressure: Math.floor(Math.random() * (85 - 70) + 70),
        bloodGlucose: 95,
        respiratoryRate: 14,
        hydrationLiters: 1.8,
        restingHeartRate: Math.floor(Math.random() * (64 - 50) + 50),
        hrvRmssd: Math.floor(Math.random() * (75 - 35) + 35),
        leanBodyMassKg: mockLbm,
        skinTemperatureDelta: 0.2,
        recentExercises: [
          {
            title: 'モック筋トレセッション',
            exerciseType: 70,
            startTime: new Date(Date.now() - 3600_000).toISOString(),
            endTime: new Date().toISOString(),
            durationMinutes: 60,
            dataOrigin: 'com.gekirennomad.trenote',
          },
        ],
      },
      error: null,
    };
  }

  if (Platform.OS !== 'android') {
    return { data: null, error: 'Android以外の端末ではHealth Connectを利用できません。' };
  }

  try {
    const available = await isHealthDataAvailable();
    if (!available) {
      return { data: null, error: 'Health Connectが利用できません。' };
    }

    const permSummary = await getHealthPermissionSummary();
    const granted = permSummary.grantedSet;
    const canRead = (recordType: string) => granted.has(`${recordType}:read`);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: startOfDay.toISOString(),
      endTime: now.toISOString(),
    };

    const past7RangeFilter = {
      operator: 'between' as const,
      startTime: past7Days.toISOString(),
      endTime: now.toISOString(),
    };

    const past30RangeFilter = {
      operator: 'between' as const,
      startTime: past30Days.toISOString(),
      endTime: now.toISOString(),
    };

    // 1. 歩数（aggregateRecord でマルチソース重複排除）
    let steps = 0;
    if (canRead('Steps')) {
      try {
        steps = await readAggregateOrFallback(
          async () => {
            const agg = await aggregateRecord({ recordType: 'Steps', timeRangeFilter });
            return typeof agg.COUNT_TOTAL === 'number' ? Math.round(agg.COUNT_TOTAL) : null;
          },
          async () => {
            const stepRes = await readRecords('Steps', { timeRangeFilter });
            return stepRes.records.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
          }
        );
      } catch {}
    }

    // 2. 心拍数 & 安静時心拍数 & HRV
    let avgHR = 0;
    if (canRead('HeartRate')) {
      try {
        avgHR = await readAggregateOrFallback(
          async () => {
            const agg = await aggregateRecord({ recordType: 'HeartRate', timeRangeFilter });
            if (agg.MEASUREMENTS_COUNT > 0 && typeof agg.BPM_AVG === 'number') {
              return Math.round(agg.BPM_AVG);
            }
            return null;
          },
          async () => {
            const hrRes = await readRecords('HeartRate', { timeRangeFilter });
            const samples = hrRes.records.flatMap((r: any) => r.samples || []);
            if (samples.length > 0) {
              return Math.round(
                samples.reduce((sum: number, s: any) => sum + (s.beatsPerMinute || 0), 0) /
                  samples.length
              );
            }
            return 0;
          }
        );
      } catch {}
    }

    let restingHeartRate = 0;
    if (canRead('RestingHeartRate')) {
      try {
        const rhrRes = await readRecords('RestingHeartRate', { timeRangeFilter: past7RangeFilter });
        const latestRhr = getLatestRecordByTime(rhrRes.records as any[]);
        if (latestRhr?.beatsPerMinute) {
          restingHeartRate = Math.round(latestRhr.beatsPerMinute);
        }
      } catch {}
    }

    let hrvRmssd = 0;
    if (canRead('HeartRateVariabilityRmssd')) {
      try {
        const hrvRes = await readRecords('HeartRateVariabilityRmssd', {
          timeRangeFilter: past7RangeFilter,
        });
        const latestHrv = getLatestRecordByTime(hrvRes.records as any[]);
        if (typeof latestHrv?.heartRateVariabilityMillis === 'number') {
          hrvRmssd = Number(latestHrv.heartRateVariabilityMillis.toFixed(1));
        }
      } catch {}
    }

    // 3. 睡眠（SleepStageType 定数準拠に修正）
    let sleepMin = 0;
    let deepSleep = 0;
    let lightSleep = 0;
    let remSleep = 0;
    let awake = 0;
    if (canRead('SleepSession')) {
      try {
        const sleepRes = await readRecords('SleepSession', { timeRangeFilter: past30RangeFilter });
        if (sleepRes.records.length > 0) {
          const latestSleep: any = [...sleepRes.records].sort(
            (a: any, b: any) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
          )[0];
          if (latestSleep) {
            const sTime = new Date(latestSleep.startTime).getTime();
            const eTime = new Date(latestSleep.endTime).getTime();
            sleepMin = Math.max(0, Math.round((eTime - sTime) / 60000));
            const stages = aggregateSleepStages(latestSleep.stages);
            deepSleep = stages.deepSleepMinutes;
            lightSleep = stages.lightSleepMinutes;
            remSleep = stages.remSleepMinutes;
            awake = stages.awakeMinutes;
          }
        }
      } catch {}
    }

    // 4. 体重・身長・体脂肪率・除脂肪体重
    let weight = 0;
    let height = 0;
    let bodyFatRate = 0;
    let leanBodyMassKg = 0;

    if (canRead('Weight')) {
      try {
        const weightRes = await readRecords('Weight', { timeRangeFilter: past30RangeFilter });
        const latestWeight = getLatestRecordByTime(weightRes.records as any[]);
        weight = latestWeight?.weight?.inKilograms || 0;
      } catch {}
    }

    if (canRead('Height')) {
      try {
        const heightRes = await readRecords('Height', { timeRangeFilter: past30RangeFilter });
        const latestHeight = getLatestRecordByTime(heightRes.records as any[]);
        height = latestHeight?.height?.inMeters || 0;
      } catch {}
    }

    if (canRead('BodyFat')) {
      try {
        const fatRes = await readRecords('BodyFat', { timeRangeFilter: past30RangeFilter });
        const latestFat = getLatestRecordByTime(fatRes.records as any[]);
        bodyFatRate = latestFat?.percentage || 0;
      } catch {}
    }

    if (canRead('LeanBodyMass')) {
      try {
        const lbmRes = await readRecords('LeanBodyMass', { timeRangeFilter: past30RangeFilter });
        const latestLbm = getLatestRecordByTime(lbmRes.records as any[]);
        leanBodyMassKg = latestLbm?.mass?.inKilograms || 0;
      } catch {}
    }

    // 5. カロリー・距離
    let activeCalories = 0;
    let totalCalories = 0;
    let distance = 0;

    if (canRead('ActiveCaloriesBurned')) {
      try {
        activeCalories = await readAggregateOrFallback(
          async () => {
            const agg = await aggregateRecord({
              recordType: 'ActiveCaloriesBurned',
              timeRangeFilter,
            });
            return agg.ACTIVE_CALORIES_TOTAL?.inKilocalories ?? null;
          },
          async () => {
            const activeRes = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
            return activeRes.records.reduce(
              (sum: number, r: any) => sum + (r.energy?.inKilocalories || 0),
              0
            );
          }
        );
      } catch {}
    }

    if (canRead('TotalCaloriesBurned')) {
      try {
        totalCalories = await readAggregateOrFallback(
          async () => {
            const agg = await aggregateRecord({
              recordType: 'TotalCaloriesBurned',
              timeRangeFilter,
            });
            return agg.ENERGY_TOTAL?.inKilocalories ?? null;
          },
          async () => {
            const totalRes = await readRecords('TotalCaloriesBurned', { timeRangeFilter });
            return totalRes.records.reduce(
              (sum: number, r: any) => sum + (r.energy?.inKilocalories || 0),
              0
            );
          }
        );
      } catch {}
    }

    if (canRead('Distance')) {
      try {
        distance = await readAggregateOrFallback(
          async () => {
            const agg = await aggregateRecord({ recordType: 'Distance', timeRangeFilter });
            return agg.DISTANCE?.inMeters ?? null;
          },
          async () => {
            const distRes = await readRecords('Distance', { timeRangeFilter });
            return distRes.records.reduce(
              (sum: number, r: any) => sum + (r.distance?.inMeters || 0),
              0
            );
          }
        );
      } catch {}
    }

    // 6. 血中酸素・体温・皮膚温・血圧・血糖・呼吸数・水分・基礎代謝・VO2 Max・運動
    let bloodOxygen = 0;
    let skinTemp = 0;
    let skinTempDelta = 0;
    let systolic = 0;
    let diastolic = 0;
    let bloodGlucose = 0;
    let respiratoryRate = 0;
    let hydration = 0;
    let basalMetabolic = 0;
    let vo2Max = 0;
    let activityMinutes = 0;
    let recentExercises: HealthExerciseSummary[] = [];

    if (canRead('OxygenSaturation')) {
      try {
        const spo2Res = await readRecords('OxygenSaturation', { timeRangeFilter });
        if (spo2Res.records.length > 0) {
          bloodOxygen =
            spo2Res.records.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) /
            spo2Res.records.length;
        }
      } catch {}
    }

    if (canRead('BodyTemperature')) {
      try {
        const tempRes = await readRecords('BodyTemperature', { timeRangeFilter });
        const latestTemp = getLatestRecordByTime(tempRes.records as any[]);
        skinTemp = latestTemp?.temperature?.inCelsius || 0;
      } catch {}
    }

    if (canRead('SkinTemperature')) {
      try {
        const skinRes = await readRecords('SkinTemperature', {
          timeRangeFilter: past7RangeFilter,
        });
        if (skinRes.records.length > 0) {
          const latestSkin: any = [...skinRes.records].sort(
            (a: any, b: any) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
          )[0];
          if (skinTemp <= 0 && latestSkin?.baseline?.inCelsius) {
            skinTemp = latestSkin.baseline.inCelsius;
          }
          if (Array.isArray(latestSkin?.deltas) && latestSkin.deltas.length > 0) {
            const latestDelta = [...latestSkin.deltas].sort(
              (a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime()
            )[0];
            if (typeof latestDelta?.delta?.inCelsius === 'number') {
              skinTempDelta = Number(latestDelta.delta.inCelsius.toFixed(2));
            }
          }
        }
      } catch {}
    }

    if (canRead('BloodPressure')) {
      try {
        const bpRes = await readRecords('BloodPressure', { timeRangeFilter: past30RangeFilter });
        const latestBp = getLatestRecordByTime(bpRes.records as any[]);
        systolic = latestBp?.systolic?.inMillimetersOfMercury || 0;
        diastolic = latestBp?.diastolic?.inMillimetersOfMercury || 0;
      } catch {}
    }

    if (canRead('BloodGlucose')) {
      try {
        const bgRes = await readRecords('BloodGlucose', { timeRangeFilter: past30RangeFilter });
        const latestBg = getLatestRecordByTime(bgRes.records as any[]);
        bloodGlucose = latestBg?.level?.inMilligramsPerDeciliter || 0;
      } catch {}
    }

    if (canRead('RespiratoryRate')) {
      try {
        const rrRes = await readRecords('RespiratoryRate', { timeRangeFilter });
        const latestRr = getLatestRecordByTime(rrRes.records as any[]);
        respiratoryRate = latestRr?.rate || 0;
      } catch {}
    }

    if (canRead('Hydration')) {
      try {
        hydration = await readAggregateOrFallback(
          async () => {
            const agg = await aggregateRecord({ recordType: 'Hydration', timeRangeFilter });
            return agg.VOLUME_TOTAL?.inLiters ?? null;
          },
          async () => {
            const hydRes = await readRecords('Hydration', { timeRangeFilter });
            return hydRes.records.reduce(
              (sum: number, r: any) => sum + (r.volume?.inLiters || 0),
              0
            );
          }
        );
      } catch {}
    }

    if (canRead('BasalMetabolicRate')) {
      try {
        const bmrRes = await readRecords('BasalMetabolicRate', {
          timeRangeFilter: past30RangeFilter,
        });
        const latestBmr = getLatestRecordByTime(bmrRes.records as any[]);
        basalMetabolic = latestBmr?.basalMetabolicRate?.inKilocaloriesPerDay || 0;
      } catch {}
    }

    if (canRead('Vo2Max')) {
      try {
        const vo2Res = await readRecords('Vo2Max', { timeRangeFilter: past30RangeFilter });
        const latestVo2 = getLatestRecordByTime(vo2Res.records as any[]);
        if (typeof latestVo2?.vo2MillilitersPerMinuteKilogram === 'number') {
          vo2Max = Number(latestVo2.vo2MillilitersPerMinuteKilogram.toFixed(1));
        }
      } catch {}
    }

    if (canRead('ExerciseSession')) {
      try {
        const ex7Res = await readRecords('ExerciseSession', { timeRangeFilter: past7RangeFilter });
        const sortedEx = [...ex7Res.records].sort(
          (a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        recentExercises = sortedEx.slice(0, 10).map((r: any) => {
          const duration = Math.max(
            0,
            Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000)
          );
          return {
            id: r.metadata?.id,
            title: r.title || undefined,
            exerciseType: typeof r.exerciseType === 'number' ? r.exerciseType : 0,
            startTime: r.startTime,
            endTime: r.endTime,
            durationMinutes: duration,
            dataOrigin:
              typeof r.metadata?.dataOrigin === 'string' ? r.metadata.dataOrigin : undefined,
          };
        });

        activityMinutes = await readAggregateOrFallback(
          async () => {
            const agg = await aggregateRecord({ recordType: 'ExerciseSession', timeRangeFilter });
            if (typeof agg.EXERCISE_DURATION_TOTAL?.inSeconds === 'number') {
              return Math.round(agg.EXERCISE_DURATION_TOTAL.inSeconds / 60);
            }
            return null;
          },
          async () => {
            return sortedEx
              .filter((r: any) => formatLocalDateISO(new Date(r.startTime)) === todayStr)
              .reduce((sum: number, r: any) => {
                const dur =
                  (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000;
                return sum + Math.max(0, Math.round(dur));
              }, 0);
          }
        );
      } catch {}
    }

    const bmi = weight > 0 && height > 0 ? Number((weight / (height * height)).toFixed(1)) : 0;
    const bodyFat =
      weight > 0 && bodyFatRate > 0 ? Number((weight * (bodyFatRate / 100)).toFixed(1)) : 0;
    const muscleMass =
      weight > 0 && bodyFatRate > 0
        ? Number((weight * (1 - bodyFatRate / 100) * 0.8).toFixed(1))
        : 0;

    return {
      data: {
        date: todayStr,
        steps: Math.round(steps),
        sleepDurationMinutes: sleepMin,
        averageHeartRate: avgHR,
        bloodOxygenAverage: Number(bloodOxygen.toFixed(1)),
        stressLevel: 0,
        activityDurationMinutes: activityMinutes,
        weight: Number(weight.toFixed(1)),
        bodyFatRate: Number(bodyFatRate.toFixed(1)),
        bmi,
        muscleMass,
        basalMetabolism: Math.round(basalMetabolic),
        bodyAge: 0,
        bodyScore: 0,
        visceralFatLevel: 0,
        skeletalMuscleMass: Number((muscleMass * 0.6).toFixed(1)),
        boneSalt: 0,
        moisture: 0,
        moistureRate: 0,
        bodyFat,
        proteinRate: 0,
        impedance: 0,
        activeCaloriesBurned: Math.round(activeCalories),
        totalCaloriesBurned: Math.round(totalCalories),
        distanceMeters: Math.round(distance),
        moderateHighIntensityDurationMinutes: Math.round(activityMinutes * 0.5),
        deepSleepMinutes: deepSleep,
        lightSleepMinutes: lightSleep,
        remSleepMinutes: remSleep,
        awakeMinutes: awake,
        vo2Max,
        skinTemperature: Number(skinTemp.toFixed(1)),
        heightMeters: Number(height.toFixed(2)),
        systolicBloodPressure: Math.round(systolic),
        diastolicBloodPressure: Math.round(diastolic),
        bloodGlucose: Math.round(bloodGlucose),
        respiratoryRate: Math.round(respiratoryRate),
        hydrationLiters: Number(hydration.toFixed(2)),
        restingHeartRate,
        hrvRmssd,
        leanBodyMassKg: Number(leanBodyMassKg.toFixed(1)),
        skinTemperatureDelta: skinTempDelta,
        recentExercises,
      },
      error: null,
    };
  } catch (e: any) {
    console.error('Error fetching from Health Connect:', e);
    return { data: null, error: `データ取得エラー: ${e.message || e}` };
  }
};

/**
 * Health Connect から他アプリ記録分の水分摂取を取り込む（自己書き込みは除外）
 */
export const importHydrationFromHealthConnect = async (dateISO?: string): Promise<number> => {
  if (Platform.OS !== 'android') return 0;

  try {
    const available = await isHealthDataAvailable();
    if (!available) return 0;

    const summary = await getHealthPermissionSummary();
    if (!summary.grantedSet.has('Hydration:read')) return 0;

    const targetISO = dateISO ? normalizeDateToISO(dateISO) : formatLocalDateISO(new Date());
    const targetSlash = normalizeDateToSlash(targetISO);
    const [yStr, mStr, dStr] = targetISO.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);
    if (!y || !m || !d) return 0;

    const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
    const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);

    const hydRes = await readRecords('Hydration', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: endOfDay.toISOString(),
      },
    });

    const externalRecords = hydRes.records.filter(
      (r: any) => !isOwnHealthConnectRecord(r.metadata)
    );
    if (externalRecords.length === 0) return 0;

    const existingSlash = await getWaterLogs(targetSlash);
    const existingISO = targetISO !== targetSlash ? await getWaterLogs(targetISO) : [];
    const trackedLogs: { timestamp: number; amount: number }[] = [
      ...existingSlash,
      ...existingISO,
    ].map((w) => ({ timestamp: w.timestamp, amount: w.amount }));

    let importedCount = 0;
    for (const rec of externalRecords as any[]) {
      const mlRaw =
        typeof rec.volume?.inMilliliters === 'number'
          ? rec.volume.inMilliliters
          : (rec.volume?.inLiters || 0) * 1000;
      const amountMl = Math.round(mlRaw);
      if (!Number.isFinite(amountMl) || amountMl <= 0) continue;

      const recMs = new Date(rec.startTime).getTime();
      if (!Number.isFinite(recMs) || recMs <= 0) continue;

      const isDuplicate = trackedLogs.some(
        (existing) =>
          existing.timestamp === recMs ||
          (Math.abs(existing.timestamp - recMs) <= 60_000 &&
            Math.round(existing.amount) === amountMl)
      );
      if (isDuplicate) continue;

      await addWaterLog(amountMl, recMs, targetSlash, 0);
      trackedLogs.push({ timestamp: recMs, amount: amountMl });
      importedCount += 1;
    }

    if (importedCount > 0) {
      try {
        const { useLifelogStore } = await import('../store/lifelogStore');
        const currentDate = useLifelogStore.getState().currentDate;
        if (!currentDate || normalizeDateToISO(currentDate) === targetISO) {
          await useLifelogStore.getState().loadWaterData(currentDate || targetSlash);
        }
      } catch (storeErr) {
        console.warn('[HealthConnect] Failed to refresh lifelogStore after hydration import:', storeErr);
      }
    }

    return importedCount;
  } catch (error) {
    console.warn('[HealthConnect] Failed to import hydration:', error);
    return 0;
  }
};

/**
 * 同期時に他アプリから入った体組成データを TreNote へ反映する（自己書き込み除外）
 */
async function importExternalBodyMetricsIfPresent(
  dateISO: string,
  grantedSet: Set<string>,
  fallbackData: DailyHealthData
): Promise<boolean> {
  const canReadAnyBody =
    grantedSet.has('Weight:read') ||
    grantedSet.has('BodyFat:read') ||
    grantedSet.has('LeanBodyMass:read');
  if (!canReadAnyBody) return false;

  const [yStr, mStr, dStr] = dateISO.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) return false;

  const startOfDay = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999);
  const todayFilter = {
    operator: 'between' as const,
    startTime: startOfDay.toISOString(),
    endTime: endOfDay.toISOString(),
  };

  let extWeight: number | undefined;
  let extBodyFat: number | undefined;
  let extLbm: number | undefined;

  if (grantedSet.has('Weight:read')) {
    try {
      const res = await readRecords('Weight', { timeRangeFilter: todayFilter });
      const ext = (res.records as any[]).filter((r) => !isOwnHealthConnectRecord(r.metadata));
      const latest = getLatestRecordByTime(ext);
      if (latest?.weight?.inKilograms > 0) {
        extWeight = Number(latest.weight.inKilograms.toFixed(1));
      }
    } catch {}
  }

  if (grantedSet.has('BodyFat:read')) {
    try {
      const res = await readRecords('BodyFat', { timeRangeFilter: todayFilter });
      const ext = (res.records as any[]).filter((r) => !isOwnHealthConnectRecord(r.metadata));
      const latest = getLatestRecordByTime(ext);
      if (latest?.percentage > 0) {
        extBodyFat = Number(latest.percentage.toFixed(1));
      }
    } catch {}
  }

  if (grantedSet.has('LeanBodyMass:read')) {
    try {
      const res = await readRecords('LeanBodyMass', { timeRangeFilter: todayFilter });
      const ext = (res.records as any[]).filter((r) => !isOwnHealthConnectRecord(r.metadata));
      const latest = getLatestRecordByTime(ext);
      if (latest?.mass?.inKilograms > 0) {
        extLbm = Number(latest.mass.inKilograms.toFixed(1));
      }
    } catch {}
  }

  if (extWeight === undefined && extBodyFat === undefined && extLbm === undefined) {
    return false;
  }

  const { getBodyLogByDate, upsertBodyLog } = await import('../db/repositories/bodyRepository');
  const existing = await getBodyLogByDate(dateISO);

  // 既に同日同値が記録済みであれば余計な更新を行わない
  if (
    existing &&
    (extWeight === undefined || existing.weight === extWeight) &&
    (extBodyFat === undefined || existing.body_fat_rate === extBodyFat) &&
    (extLbm === undefined || existing.lbm === extLbm)
  ) {
    return false;
  }

  const resolvedWeight = extWeight ?? existing?.weight ?? undefined;
  const resolvedFat = extBodyFat ?? existing?.body_fat_rate ?? undefined;
  const resolvedLbm =
    extLbm ??
    (resolvedWeight && resolvedFat
      ? Number((resolvedWeight * (1 - resolvedFat / 100)).toFixed(1))
      : existing?.lbm ?? undefined);
  const resolvedHeightCm =
    fallbackData.heightMeters > 0 ? Math.round(fallbackData.heightMeters * 100) : undefined;

  await upsertBodyLog({
    date: dateISO,
    weight: resolvedWeight,
    body_fat_rate: resolvedFat,
    lbm: resolvedLbm,
    height: resolvedHeightCm,
    source: 'health_connect',
  });

  return true;
}

/**
 * ヘルスデータを Markdown 文字列にフォーマット
 */
export const formatHealthDataToMarkdown = (data: DailyHealthData): string => {
  const lines = [
    `## 📊 ヘルスデータレポート (${data.date})`,
    `- 🚶 **歩数**: ${data.steps} 歩`,
    `- 🏃 **アクティビティ時間**: ${data.activityDurationMinutes} 分`,
    `- 📏 **移動距離**: ${data.distanceMeters.toFixed(1)} m`,
    `- 🔥 **アクティブ消費カロリー**: ${data.activeCaloriesBurned.toFixed(1)} kcal`,
    `- 💓 **平均心拍数**: ${data.averageHeartRate} bpm`,
    `- 🩸 **血中酸素レベル**: ${data.bloodOxygenAverage.toFixed(1)} %`,
  ];

  if (data.restingHeartRate && data.restingHeartRate > 0) {
    lines.push(`- 🫀 **安静時心拍数**: ${data.restingHeartRate} bpm`);
  }
  if (data.hrvRmssd && data.hrvRmssd > 0) {
    lines.push(`- 📈 **心拍変動 (HRV)**: ${data.hrvRmssd} ms`);
  }
  if (data.vo2Max > 0) {
    lines.push(`- 🫁 **VO2 Max**: ${data.vo2Max} ml/kg/min`);
  }

  lines.push(
    '',
    '### 😴 睡眠',
    `- 総睡眠: ${Math.floor(data.sleepDurationMinutes / 60)}時間 ${data.sleepDurationMinutes % 60}分`,
    `- 深い睡眠: ${data.deepSleepMinutes} 分 / 浅い睡眠: ${data.lightSleepMinutes} 分 / レム睡眠: ${data.remSleepMinutes} 分`,
    '',
    '### ⚖️ 体組成',
    `- 体重: ${data.weight.toFixed(1)} kg / BMI: ${data.bmi.toFixed(1)}`,
    `- 体脂肪率: ${data.bodyFatRate.toFixed(1)} % / 筋肉量: ${data.muscleMass.toFixed(1)} kg`
  );

  if (data.leanBodyMassKg && data.leanBodyMassKg > 0) {
    lines.push(`- 除脂肪体重 (LBM): ${data.leanBodyMassKg.toFixed(1)} kg`);
  }

  return lines.join('\n');
};

/**
 * 指定されたワークアウト時間範囲における心拍数および消費カロリーデータを取得（後方互換用）
 */
export const fetchWorkoutHealthData = async (
  startTime: Date | string,
  endTime: Date | string
): Promise<WorkoutHealthData> => {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || Platform.OS !== 'android') {
    return { avgHeartRate: null, maxHeartRate: null, caloriesBurned: null };
  }

  try {
    const available = await isHealthDataAvailable();
    if (!available) return { avgHeartRate: null, maxHeartRate: null, caloriesBurned: null };

    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };

    let avgHeartRate: number | null = null;
    let maxHeartRate: number | null = null;
    let caloriesBurned: number | null = null;

    try {
      const hrRes = await readRecords('HeartRate', { timeRangeFilter });
      const samples = hrRes.records.flatMap((r: any) => r.samples || []);
      if (samples.length > 0) {
        const bpms = samples.map((s: any) => s.beatsPerMinute).filter(Boolean);
        if (bpms.length > 0) {
          avgHeartRate = Math.round(bpms.reduce((a: number, b: number) => a + b, 0) / bpms.length);
          maxHeartRate = Math.max(...bpms);
        }
      }
    } catch {}

    try {
      const activeRes = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
      const total = activeRes.records.reduce(
        (sum: number, r: any) => sum + (r.energy?.inKilocalories || 0),
        0
      );
      if (total > 0) caloriesBurned = Math.round(total);
    } catch {}

    return { avgHeartRate, maxHeartRate, caloriesBurned };
  } catch (error) {
    console.warn('Error fetching workout health data:', error);
    return { avgHeartRate: null, maxHeartRate: null, caloriesBurned: null };
  }
};

/**
 * ヘルスコネクトへアクセスしてヘルスデータを最新化（起動時・定時・手動共通）
 */
export const syncHealthData = async (options?: {
  force?: boolean;
  reason?: 'launch' | 'periodic' | 'manual';
}): Promise<{
  success: boolean;
  data?: DailyHealthData | null;
  importedHydrationCount?: number;
  importedBodyUpdated?: boolean;
  message?: string;
}> => {
  if (Platform.OS !== 'android') {
    return { success: false, message: 'Android 端末でのみ Health Connect が利用可能です。' };
  }

  const syncSettings = await getHealthSyncSettings();
  const reason = options?.reason || 'manual';

  if (!options?.force) {
    if (reason === 'launch' && !syncSettings.autoSyncOnLaunch) {
      return { success: false, message: '起動時アクセスが無効になっています。' };
    }
    if (reason === 'periodic' && !syncSettings.autoSyncPeriodic) {
      return { success: false, message: '定時アクセスが無効になっています。' };
    }

    // 重複アクセス防止（手動以外で、前回アクセスから1分以内の場合はスキップ）
    const now = Date.now();
    const minIntervalMs = 60 * 1000;
    if (
      reason !== 'manual' &&
      syncSettings.lastSyncTimestamp > 0 &&
      now - syncSettings.lastSyncTimestamp < minIntervalMs
    ) {
      return { success: false, message: '前回のアクセスから十分な時間が経過していません。' };
    }
  }

  try {
    const permSummary: HealthPermissionSummary = await getHealthPermissionSummary();
    if (!permSummary.hasAnyRead) {
      return { success: false, message: 'Health Connect の読み取り権限が与えられていません。' };
    }

    const { data, error } = await fetchTodayHealthData(false);
    if (error || !data) {
      return { success: false, message: error || 'ヘルスデータの取得に失敗しました。' };
    }

    // 外部アプリからの体組成・水分データの取り込み（自己書き込み除外）
    let importedBodyUpdated = false;
    if (syncSettings.importBodyOnSync) {
      try {
        importedBodyUpdated = await importExternalBodyMetricsIfPresent(
          data.date,
          permSummary.grantedSet,
          data
        );
      } catch (bodyErr) {
        console.warn('[HealthConnect] Auto body import failed:', bodyErr);
      }
    }

    let importedHydrationCount = 0;
    if (syncSettings.importHydrationOnSync) {
      importedHydrationCount = await importHydrationFromHealthConnect(data.date);
    }

    // 最終取得タイムスタンプの更新
    await saveHealthSyncSettings({ lastSyncTimestamp: Date.now() });

    // Obsidian 自動エクスポートとの連動
    try {
      const { exportHealthDataToObsidian, getObsidianSettings } = await import('./obsidianService');
      const obsidianSettings = await getObsidianSettings();
      if (obsidianSettings.enabled && obsidianSettings.vaultUri && obsidianSettings.exportHealth) {
        await exportHealthDataToObsidian(data);
      }
    } catch (obsidianErr) {
      console.warn('Auto export to Obsidian failed during health sync:', obsidianErr);
    }

    console.log(`[HealthConnect] Successfully synced health data (reason: ${reason})`);
    return {
      success: true,
      data,
      importedHydrationCount,
      importedBodyUpdated,
    };
  } catch (e: any) {
    console.error('Error during syncHealthData:', e);
    return { success: false, message: e?.message || String(e) };
  }
};
