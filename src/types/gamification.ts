export type GamificationTier =
  | 'iron'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'legend';

export type GamificationFeatureId =
  | 'workout'
  | 'water'
  | 'nutrition'
  | 'body'
  | 'routine'
  | 'habit'
  | 'zikan';

export type MedalRarity = 'bronze' | 'silver' | 'gold' | 'platinum';

export type MedalCategory = 'workout' | 'pr_mastery' | 'streak' | 'lifelog' | 'milestone';

export interface OverallClassDef {
  id: string;
  tier: GamificationTier;
  division: 'I' | 'II' | 'III' | null;
  rankIndex: number;
  nameJa: string;
  nameEn: string;
  minXp: number;
  promotionBonusPoints: number;
}

export interface FeatureClassDef {
  id: GamificationTier;
  tier: GamificationTier;
  rankIndex: number;
  nameJa: string;
  nameEn: string;
  minXp: number;
  promotionBonusPoints: number;
}

export interface TierVisualMeta {
  tier: GamificationTier;
  labelJa: string;
  labelEn: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export interface GamificationMetrics {
  workoutCount: number;
  totalVolumeKg: number;
  prUpdateCount: number;
  uniqueExerciseCount: number;
  streakWeeks: number;
  waterDays: number;
  nutritionDays: number;
  bodyDays: number;
  habitLogCount: number;
  routineDays: number;
  zikanDays: number;
  totalActiveDays: number;
  usedFeatureCount: number;
  perfectDayCount: number;
}

export interface AchievementMedalDef {
  id: string;
  category: MedalCategory;
  featureId?: GamificationFeatureId;
  rarity: MedalRarity;
  titleJa: string;
  titleEn: string;
  descJa: string;
  descEn: string;
  icon: string;
  metricKey: keyof GamificationMetrics;
  targetValue: number;
  unitJa: string;
  unitEn: string;
}

export type XpHistorySource =
  | 'workout_complete'
  | 'pr_update'
  | 'first_record'
  | 'daily_record'
  | 'medal_unlock'
  | 'retroactive'
  | 'manual_debug';

export interface XpHistoryItem {
  id: string;
  timestamp: number;
  amount: number;
  featureId?: GamificationFeatureId | 'voice_ai';
  source: XpHistorySource;
  label: string;
}

export interface ClassUpEvent {
  overall?: {
    from: OverallClassDef;
    to: OverallClassDef;
    bonusPoints: number;
  };
  features: {
    featureId: GamificationFeatureId;
    from: FeatureClassDef;
    to: FeatureClassDef;
    bonusPoints: number;
  }[];
}

export interface MedalUnlockNotice {
  medals: AchievementMedalDef[];
  totalBonusXp: number;
  totalBonusPoints: number;
}

export interface RetroactiveSummaryNotice {
  overallClass: OverallClassDef;
  totalXp: number;
  unlockedMedalCount: number;
  totalBonusPoints: number;
  featureHighlights: {
    featureId: GamificationFeatureId;
    classDef: FeatureClassDef;
  }[];
}

export interface WorkoutGamificationSummary {
  workoutId: number;
  xpEarned: number;
  prBonusXp: number;
  newlyUnlockedMedals: AchievementMedalDef[];
  overallClassAfter: OverallClassDef;
  workoutClassAfter: FeatureClassDef;
}

export interface PersistedGamificationState {
  totalXp: number;
  featureXp: Record<GamificationFeatureId, number>;
  unlockedMedals: Record<string, number>;
  prUpdateCount: number;
  firstRecordedFeatures: string[];
  dailyXpMap: Record<string, string[]>;
  awardedWorkoutIds: number[];
  recentXpHistory: XpHistoryItem[];
  retroactiveMigrated: boolean;
}
