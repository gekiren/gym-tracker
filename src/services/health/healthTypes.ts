import type { Permission } from 'react-native-health-connect';

export const TRENOTE_PACKAGE_NAME = 'com.gekirennomad.trenote';

export interface WorkoutHealthData {
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  caloriesBurned: number | null;
}

export interface HealthExerciseSummary {
  id?: string;
  title?: string;
  exerciseType: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  dataOrigin?: string;
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
  // 拡張フィールド（後方互換維持）
  restingHeartRate?: number;
  hrvRmssd?: number;
  leanBodyMassKg?: number;
  skinTemperatureDelta?: number;
  recentExercises?: HealthExerciseSummary[];
}

export interface HealthSyncSettings {
  autoSyncOnLaunch: boolean;
  autoSyncPeriodic: boolean;
  periodicIntervalMinutes: number;
  lastSyncTimestamp: number;
  autoWriteEnabled: boolean;
  writeWorkouts: boolean;
  writeBody: boolean;
  writeNutrition: boolean;
  writeHydration: boolean;
  importBodyOnSync: boolean;
  importHydrationOnSync: boolean;
}

export const DEFAULT_HEALTH_SYNC_SETTINGS: HealthSyncSettings = {
  autoSyncOnLaunch: true,
  autoSyncPeriodic: true,
  periodicIntervalMinutes: 60,
  lastSyncTimestamp: 0,
  autoWriteEnabled: false,
  writeWorkouts: true,
  writeBody: true,
  writeNutrition: true,
  writeHydration: true,
  importBodyOnSync: true,
  importHydrationOnSync: true,
};

export interface HealthPermissionSummary {
  readGranted: number;
  readTotal: number;
  writeGranted: number;
  writeTotal: number;
  grantedSet: Set<string>;
  hasAnyRead: boolean;
  hasAnyWrite: boolean;
}

export interface HealthWriteSummary {
  workouts: number;
  body: number;
  nutrition: number;
  hydration: number;
  skipped: number;
  errors: string[];
}

export const LEGACY_READ_PERMISSIONS: Permission[] = [
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

export const READ_PERMISSIONS: Permission[] = [
  ...LEGACY_READ_PERMISSIONS,
  { recordType: 'RestingHeartRate', accessType: 'read' },
  { recordType: 'HeartRateVariabilityRmssd', accessType: 'read' },
  { recordType: 'Vo2Max', accessType: 'read' },
  { recordType: 'LeanBodyMass', accessType: 'read' },
  { recordType: 'SkinTemperature', accessType: 'read' },
];

export const WRITE_PERMISSIONS: Permission[] = [
  { recordType: 'ExerciseSession', accessType: 'write' },
  { recordType: 'ActiveCaloriesBurned', accessType: 'write' },
  { recordType: 'Weight', accessType: 'write' },
  { recordType: 'BodyFat', accessType: 'write' },
  { recordType: 'Height', accessType: 'write' },
  { recordType: 'LeanBodyMass', accessType: 'write' },
  { recordType: 'Nutrition', accessType: 'write' },
  { recordType: 'Hydration', accessType: 'write' },
];

export const ALL_HEALTH_PERMISSIONS: Permission[] = [
  ...READ_PERMISSIONS,
  ...WRITE_PERMISSIONS,
];

export const REQUIRED_PERMISSIONS: Permission[] = READ_PERMISSIONS;
