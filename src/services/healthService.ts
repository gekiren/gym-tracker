import { Platform } from 'react-native';
import {
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  SdkAvailabilityStatus,
  Permission,
} from 'react-native-health-connect';

export interface WorkoutHealthData {
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  caloriesBurned: number | null;
}

export interface DailyHealthData {
  date: string;
  steps: number;
  sleepDurationMinutes: number;
  averageHeartRate: number;
  bloodOxygenAverage: number;
  stressLevel: number;
  activityDurationMinutes: number;
  weight: number;
  bodyFatRate: number;
  bmi: number;
  muscleMass: number;
  basalMetabolism: number;
  bodyAge: number;
  bodyScore: number;
  visceralFatLevel: number;
  skeletalMuscleMass: number;
  boneSalt: number;
  moisture: number;
  moistureRate: number;
  bodyFat: number;
  proteinRate: number;
  impedance: number;
  activeCaloriesBurned: number;
  totalCaloriesBurned: number;
  distanceMeters: number;
  moderateHighIntensityDurationMinutes: number;
  deepSleepMinutes: number;
  lightSleepMinutes: number;
  remSleepMinutes: number;
  awakeMinutes: number;
  vo2Max: number;
  skinTemperature: number;
  heightMeters: number;
  systolicBloodPressure: number;
  diastolicBloodPressure: number;
  bloodGlucose: number;
  respiratoryRate: number;
  hydrationLiters: number;
}

export const REQUIRED_PERMISSIONS: Permission[] = [
  { recordType: 'Steps', accessType: 'read' },
  { recordType: 'HeartRate', accessType: 'read' },
  { recordType: 'SleepSession', accessType: 'read' },
  { recordType: 'Weight', accessType: 'read' },
  { recordType: 'Height', accessType: 'read' },
  { recordType: 'BodyFat', accessType: 'read' },
  { recordType: 'ExerciseSession', accessType: 'read' },
  { recordType: 'Distance', accessType: 'read' },
  { recordType: 'TotalCaloriesBurned', accessType: 'read' },
  { recordType: 'ActiveCaloriesBurned', accessType: 'read' },
  { recordType: 'BloodPressure', accessType: 'read' },
  { recordType: 'BloodGlucose', accessType: 'read' },
  { recordType: 'OxygenSaturation', accessType: 'read' },
  { recordType: 'BodyTemperature', accessType: 'read' },
  { recordType: 'RespiratoryRate', accessType: 'read' },
  { recordType: 'Hydration', accessType: 'read' },
  { recordType: 'BasalMetabolicRate', accessType: 'read' },
];

/**
 * Health Connect SDK が利用可能か確認
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
 * 権限の有無をチェック
 */
export const hasHealthPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    const isAvailable = await isHealthDataAvailable();
    if (!isAvailable) return false;
    const granted = await getGrantedPermissions();
    const grantedTypes = new Set(granted.map((p) => `${p.recordType}:${p.accessType}`));
    return REQUIRED_PERMISSIONS.every((p) => grantedTypes.has(`${p.recordType}:${p.accessType}`));
  } catch (error) {
    console.warn('Failed to check health permissions:', error);
    return false;
  }
};

/**
 * Health Connect 権限の取得要求
 */
export const requestHealthPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  try {
    const isAvailable = await isHealthDataAvailable();
    if (!isAvailable) return false;

    const granted = await requestPermission(REQUIRED_PERMISSIONS);
    return granted.length > 0;
  } catch (error) {
    console.warn('Failed to request health permissions:', error);
    return false;
  }
};

/**
 * 今日のヘルスケアデータを取得（またはモック生成）
 */
export const fetchTodayHealthData = async (
  isMock: boolean = false
): Promise<{ data: DailyHealthData | null; error: string | null }> => {
  const todayStr = new Date().toISOString().split('T')[0];

  if (isMock) {
    const mockWeight = Math.floor(Math.random() * (850 - 600) + 600) / 10;
    const mockBodyFatRate = Math.floor(Math.random() * (240 - 120) + 120) / 10;
    const mockSleepTotal = Math.floor(Math.random() * (540 - 360) + 360);
    const mockDeepSleep = Math.floor(mockSleepTotal * (Math.random() * 0.1 + 0.2));
    const mockRemSleep = Math.floor(mockSleepTotal * (Math.random() * 0.1 + 0.15));
    const mockAwake = Math.floor(Math.random() * 30 + 10);
    const mockLightSleep = mockSleepTotal - mockDeepSleep - mockRemSleep - mockAwake;

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

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: startOfDay.toISOString(),
      endTime: now.toISOString(),
    };

    const past30RangeFilter = {
      operator: 'between' as const,
      startTime: past30Days.toISOString(),
      endTime: now.toISOString(),
    };

    // 1. 歩数
    let steps = 0;
    try {
      const stepRes = await readRecords('Steps', { timeRangeFilter });
      steps = stepRes.records.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
    } catch (_) {}

    // 2. 心拍数
    let avgHR = 0;
    try {
      const hrRes = await readRecords('HeartRate', { timeRangeFilter });
      const samples = hrRes.records.flatMap((r: any) => r.samples || []);
      if (samples.length > 0) {
        avgHR = Math.round(samples.reduce((sum: number, s: any) => sum + (s.beatsPerMinute || 0), 0) / samples.length);
      }
    } catch (_) {}

    // 3. 睡眠
    let sleepMin = 0, deepSleep = 0, lightSleep = 0, remSleep = 0, awake = 0;
    try {
      const sleepRes = await readRecords('SleepSession', { timeRangeFilter: past30RangeFilter });
      if (sleepRes.records.length > 0) {
        const latestSleep: any = sleepRes.records.sort(
          (a: any, b: any) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
        )[0];
        if (latestSleep) {
          const sTime = new Date(latestSleep.startTime).getTime();
          const eTime = new Date(latestSleep.endTime).getTime();
          sleepMin = Math.round((eTime - sTime) / 60000);
          (latestSleep.stages || []).forEach((stage: any) => {
            const stTime = new Date(stage.startTime).getTime();
            const etTime = new Date(stage.endTime).getTime();
            const d = Math.round((etTime - stTime) / 60000);
            if (stage.stage === 4) deepSleep += d;
            else if (stage.stage === 1) lightSleep += d;
            else if (stage.stage === 5) remSleep += d;
            else if (stage.stage === 2 || stage.stage === 3) awake += d;
          });
        }
      }
    } catch (_) {}

    // 4. 体重 & 身長 & 体脂肪率
    let weight = 0, height = 0, bodyFatRate = 0;
    try {
      const weightRes = await readRecords('Weight', { timeRangeFilter: past30RangeFilter });
      if (weightRes.records.length > 0) {
        const latestWeight: any = weightRes.records.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];
        weight = latestWeight?.weight?.inKilograms || 0;
      }
    } catch (_) {}

    try {
      const heightRes = await readRecords('Height', { timeRangeFilter: past30RangeFilter });
      if (heightRes.records.length > 0) {
        const latestHeight: any = heightRes.records.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];
        height = latestHeight?.height?.inMeters || 0;
      }
    } catch (_) {}

    try {
      const fatRes = await readRecords('BodyFat', { timeRangeFilter: past30RangeFilter });
      if (fatRes.records.length > 0) {
        const latestFat: any = fatRes.records.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];
        bodyFatRate = latestFat?.percentage || 0;
      }
    } catch (_) {}

    // 5. カロリー・距離
    let activeCalories = 0, totalCalories = 0, distance = 0;
    try {
      const activeRes = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
      activeCalories = activeRes.records.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories || 0), 0);
    } catch (_) {}

    try {
      const totalRes = await readRecords('TotalCaloriesBurned', { timeRangeFilter });
      totalCalories = totalRes.records.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories || 0), 0);
    } catch (_) {}

    try {
      const distRes = await readRecords('Distance', { timeRangeFilter });
      distance = distRes.records.reduce((sum: number, r: any) => sum + (r.distance?.inMeters || 0), 0);
    } catch (_) {}

    // 6. 血中酸素・体温・血圧・血糖・呼吸数・水分
    let bloodOxygen = 0, skinTemp = 0, systolic = 0, diastolic = 0, bloodGlucose = 0, respiratoryRate = 0, hydration = 0, basalMetabolic = 0, activityMinutes = 0;

    try {
      const spo2Res = await readRecords('OxygenSaturation', { timeRangeFilter });
      if (spo2Res.records.length > 0) {
        bloodOxygen = spo2Res.records.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / spo2Res.records.length;
      }
    } catch (_) {}

    try {
      const tempRes = await readRecords('BodyTemperature', { timeRangeFilter });
      if (tempRes.records.length > 0) {
        const latestTemp: any = tempRes.records.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];
        skinTemp = latestTemp?.temperature?.inCelsius || 0;
      }
    } catch (_) {}

    try {
      const bpRes = await readRecords('BloodPressure', { timeRangeFilter: past30RangeFilter });
      if (bpRes.records.length > 0) {
        const latestBp: any = bpRes.records.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];
        systolic = latestBp?.systolic?.inMillimetersOfMercury || 0;
        diastolic = latestBp?.diastolic?.inMillimetersOfMercury || 0;
      }
    } catch (_) {}

    try {
      const bgRes = await readRecords('BloodGlucose', { timeRangeFilter: past30RangeFilter });
      if (bgRes.records.length > 0) {
        const latestBg: any = bgRes.records.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];
        bloodGlucose = latestBg?.level?.inMilligramsPerDeciliter || 0;
      }
    } catch (_) {}

    try {
      const rrRes = await readRecords('RespiratoryRate', { timeRangeFilter });
      if (rrRes.records.length > 0) {
        const latestRr: any = rrRes.records.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];
        respiratoryRate = latestRr?.rate || 0;
      }
    } catch (_) {}

    try {
      const hydRes = await readRecords('Hydration', { timeRangeFilter });
      hydration = hydRes.records.reduce((sum: number, r: any) => sum + (r.volume?.inLiters || 0), 0);
    } catch (_) {}

    try {
      const bmrRes = await readRecords('BasalMetabolicRate', { timeRangeFilter: past30RangeFilter });
      if (bmrRes.records.length > 0) {
        const latestBmr: any = bmrRes.records.sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())[0];
        basalMetabolic = latestBmr?.basalMetabolicRate?.inKilocaloriesPerDay || 0;
      }
    } catch (_) {}

    try {
      const exRes = await readRecords('ExerciseSession', { timeRangeFilter });
      activityMinutes = exRes.records.reduce((sum: number, r: any) => {
        const duration = (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000;
        return sum + Math.round(duration);
      }, 0);
    } catch (_) {}

    const bmi = weight > 0 && height > 0 ? Number((weight / (height * height)).toFixed(1)) : 0;
    const bodyFat = weight > 0 && bodyFatRate > 0 ? Number((weight * (bodyFatRate / 100)).toFixed(1)) : 0;
    const muscleMass = weight > 0 && bodyFatRate > 0 ? Number((weight * (1 - bodyFatRate / 100) * 0.8).toFixed(1)) : 0;

    return {
      data: {
        date: todayStr,
        steps,
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
        vo2Max: 0,
        skinTemperature: Number(skinTemp.toFixed(1)),
        heightMeters: Number(height.toFixed(2)),
        systolicBloodPressure: Math.round(systolic),
        diastolicBloodPressure: Math.round(diastolic),
        bloodGlucose: Math.round(bloodGlucose),
        respiratoryRate: Math.round(respiratoryRate),
        hydrationLiters: Number(hydration.toFixed(1)),
      },
      error: null,
    };
  } catch (e: any) {
    console.error('Error fetching from Health Connect:', e);
    return { data: null, error: `データ取得エラー: ${e.message || e}` };
  }
};

/**
 * ヘルスデータを Markdown 文字列にフォーマット
 */
export const formatHealthDataToMarkdown = (data: DailyHealthData): string => {
  return [
    `## 📊 ヘルスデータレポート (${data.date})`,
    `- 🚶 **歩数**: ${data.steps} 歩`,
    `- 🏃 **アクティビティ時間**: ${data.activityDurationMinutes} 分`,
    `- 📏 **移動距離**: ${data.distanceMeters.toFixed(1)} m`,
    `- 🔥 **アクティブ消費カロリー**: ${data.activeCaloriesBurned.toFixed(1)} kcal`,
    `- 💓 **平均心拍数**: ${data.averageHeartRate} bpm`,
    `- 🩸 **血中酸素レベル**: ${data.bloodOxygenAverage.toFixed(1)} %`,
    '',
    '### 😴 睡眠',
    `- 総睡眠: ${Math.floor(data.sleepDurationMinutes / 60)}時間 ${data.sleepDurationMinutes % 60}分`,
    `- 深い睡眠: ${data.deepSleepMinutes} 分 / レム睡眠: ${data.remSleepMinutes} 分`,
    '',
    '### ⚖️ 体組成',
    `- 体重: ${data.weight.toFixed(1)} kg / BMI: ${data.bmi.toFixed(1)}`,
    `- 体脂肪率: ${data.bodyFatRate.toFixed(1)} % / 筋肉量: ${data.muscleMass.toFixed(1)} kg`,
  ].join('\n');
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
    const isAvailable = await isHealthDataAvailable();
    if (!isAvailable) return { avgHeartRate: null, maxHeartRate: null, caloriesBurned: null };

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
    } catch (_) {}

    try {
      const activeRes = await readRecords('ActiveCaloriesBurned', { timeRangeFilter });
      const total = activeRes.records.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories || 0), 0);
      if (total > 0) caloriesBurned = Math.round(total);
    } catch (_) {}

    return { avgHeartRate, maxHeartRate, caloriesBurned };
  } catch (error) {
    console.warn('Error fetching workout health data:', error);
    return { avgHeartRate: null, maxHeartRate: null, caloriesBurned: null };
  }
};
