import {
  AchievementMedalDef,
  FeatureClassDef,
  GamificationFeatureId,
  GamificationMetrics,
  GamificationTier,
  MedalRarity,
  OverallClassDef,
  PersistedGamificationState,
  TierVisualMeta,
} from '../types/gamification';

export const GAMIFICATION_FEATURE_IDS: GamificationFeatureId[] = [
  'workout',
  'water',
  'nutrition',
  'body',
  'routine',
  'habit',
  'zikan',
];

export const isGamificationFeatureId = (id: string): id is GamificationFeatureId => {
  return (GAMIFICATION_FEATURE_IDS as string[]).includes(id);
};

export const TIER_VISUAL_META: Record<GamificationTier, TierVisualMeta> = {
  iron: {
    tier: 'iron',
    labelJa: 'アイアン',
    labelEn: 'Iron',
    color: '#8B949E',
    bgColor: 'rgba(139, 148, 158, 0.16)',
    borderColor: 'rgba(139, 148, 158, 0.42)',
    icon: 'shield-outline',
  },
  bronze: {
    tier: 'bronze',
    labelJa: 'ブロンズ',
    labelEn: 'Bronze',
    color: '#CD7F32',
    bgColor: 'rgba(205, 127, 50, 0.16)',
    borderColor: 'rgba(205, 127, 50, 0.45)',
    icon: 'shield-half-outline',
  },
  silver: {
    tier: 'silver',
    labelJa: 'シルバー',
    labelEn: 'Silver',
    color: '#CBD5E1',
    bgColor: 'rgba(203, 213, 225, 0.16)',
    borderColor: 'rgba(203, 213, 225, 0.45)',
    icon: 'shield',
  },
  gold: {
    tier: 'gold',
    labelJa: 'ゴールド',
    labelEn: 'Gold',
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.16)',
    borderColor: 'rgba(255, 215, 0, 0.48)',
    icon: 'medal',
  },
  platinum: {
    tier: 'platinum',
    labelJa: 'プラチナ',
    labelEn: 'Platinum',
    color: '#38BDF8',
    bgColor: 'rgba(56, 189, 248, 0.16)',
    borderColor: 'rgba(56, 189, 248, 0.48)',
    icon: 'sparkles',
  },
  diamond: {
    tier: 'diamond',
    labelJa: 'ダイヤ',
    labelEn: 'Diamond',
    color: '#A855F7',
    bgColor: 'rgba(168, 85, 247, 0.16)',
    borderColor: 'rgba(168, 85, 247, 0.48)',
    icon: 'diamond',
  },
  master: {
    tier: 'master',
    labelJa: 'マスター',
    labelEn: 'Master',
    color: '#F43F5E',
    bgColor: 'rgba(244, 63, 94, 0.16)',
    borderColor: 'rgba(244, 63, 94, 0.48)',
    icon: 'flame',
  },
  legend: {
    tier: 'legend',
    labelJa: 'レジェンド',
    labelEn: 'Legend',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.58)',
    icon: 'trophy',
  },
};

export const OVERALL_CLASSES: OverallClassDef[] = [
  { id: 'iron_1', tier: 'iron', division: 'I', rankIndex: 0, nameJa: 'アイアン I', nameEn: 'Iron I', minXp: 0, promotionBonusPoints: 0 },
  { id: 'iron_2', tier: 'iron', division: 'II', rankIndex: 1, nameJa: 'アイアン II', nameEn: 'Iron II', minXp: 100, promotionBonusPoints: 2 },
  { id: 'iron_3', tier: 'iron', division: 'III', rankIndex: 2, nameJa: 'アイアン III', nameEn: 'Iron III', minXp: 250, promotionBonusPoints: 2 },
  { id: 'bronze_1', tier: 'bronze', division: 'I', rankIndex: 3, nameJa: 'ブロンズ I', nameEn: 'Bronze I', minXp: 450, promotionBonusPoints: 3 },
  { id: 'bronze_2', tier: 'bronze', division: 'II', rankIndex: 4, nameJa: 'ブロンズ II', nameEn: 'Bronze II', minXp: 700, promotionBonusPoints: 3 },
  { id: 'bronze_3', tier: 'bronze', division: 'III', rankIndex: 5, nameJa: 'ブロンズ III', nameEn: 'Bronze III', minXp: 1000, promotionBonusPoints: 3 },
  { id: 'silver_1', tier: 'silver', division: 'I', rankIndex: 6, nameJa: 'シルバー I', nameEn: 'Silver I', minXp: 1500, promotionBonusPoints: 5 },
  { id: 'silver_2', tier: 'silver', division: 'II', rankIndex: 7, nameJa: 'シルバー II', nameEn: 'Silver II', minXp: 2200, promotionBonusPoints: 5 },
  { id: 'silver_3', tier: 'silver', division: 'III', rankIndex: 8, nameJa: 'シルバー III', nameEn: 'Silver III', minXp: 3100, promotionBonusPoints: 5 },
  { id: 'gold_1', tier: 'gold', division: 'I', rankIndex: 9, nameJa: 'ゴールド I', nameEn: 'Gold I', minXp: 4200, promotionBonusPoints: 8 },
  { id: 'gold_2', tier: 'gold', division: 'II', rankIndex: 10, nameJa: 'ゴールド II', nameEn: 'Gold II', minXp: 5600, promotionBonusPoints: 8 },
  { id: 'gold_3', tier: 'gold', division: 'III', rankIndex: 11, nameJa: 'ゴールド III', nameEn: 'Gold III', minXp: 7400, promotionBonusPoints: 8 },
  { id: 'platinum_1', tier: 'platinum', division: 'I', rankIndex: 12, nameJa: 'プラチナ I', nameEn: 'Platinum I', minXp: 9800, promotionBonusPoints: 10 },
  { id: 'platinum_2', tier: 'platinum', division: 'II', rankIndex: 13, nameJa: 'プラチナ II', nameEn: 'Platinum II', minXp: 12800, promotionBonusPoints: 10 },
  { id: 'platinum_3', tier: 'platinum', division: 'III', rankIndex: 14, nameJa: 'プラチナ III', nameEn: 'Platinum III', minXp: 16500, promotionBonusPoints: 10 },
  { id: 'diamond_1', tier: 'diamond', division: 'I', rankIndex: 15, nameJa: 'ダイヤ I', nameEn: 'Diamond I', minXp: 21500, promotionBonusPoints: 15 },
  { id: 'diamond_2', tier: 'diamond', division: 'II', rankIndex: 16, nameJa: 'ダイヤ II', nameEn: 'Diamond II', minXp: 27500, promotionBonusPoints: 15 },
  { id: 'diamond_3', tier: 'diamond', division: 'III', rankIndex: 17, nameJa: 'ダイヤ III', nameEn: 'Diamond III', minXp: 34500, promotionBonusPoints: 15 },
  { id: 'master_1', tier: 'master', division: 'I', rankIndex: 18, nameJa: 'マスター I', nameEn: 'Master I', minXp: 43000, promotionBonusPoints: 20 },
  { id: 'master_2', tier: 'master', division: 'II', rankIndex: 19, nameJa: 'マスター II', nameEn: 'Master II', minXp: 53000, promotionBonusPoints: 20 },
  { id: 'legend', tier: 'legend', division: null, rankIndex: 20, nameJa: 'レジェンド', nameEn: 'Legend', minXp: 65000, promotionBonusPoints: 50 },
];

export const FEATURE_CLASSES: FeatureClassDef[] = [
  { id: 'iron', tier: 'iron', rankIndex: 0, nameJa: 'アイアン', nameEn: 'Iron', minXp: 0, promotionBonusPoints: 0 },
  { id: 'bronze', tier: 'bronze', rankIndex: 1, nameJa: 'ブロンズ', nameEn: 'Bronze', minXp: 80, promotionBonusPoints: 2 },
  { id: 'silver', tier: 'silver', rankIndex: 2, nameJa: 'シルバー', nameEn: 'Silver', minXp: 250, promotionBonusPoints: 3 },
  { id: 'gold', tier: 'gold', rankIndex: 3, nameJa: 'ゴールド', nameEn: 'Gold', minXp: 700, promotionBonusPoints: 5 },
  { id: 'platinum', tier: 'platinum', rankIndex: 4, nameJa: 'プラチナ', nameEn: 'Platinum', minXp: 1600, promotionBonusPoints: 8 },
  { id: 'diamond', tier: 'diamond', rankIndex: 5, nameJa: 'ダイヤ', nameEn: 'Diamond', minXp: 3200, promotionBonusPoints: 10 },
  { id: 'master', tier: 'master', rankIndex: 6, nameJa: 'マスター', nameEn: 'Master', minXp: 6000, promotionBonusPoints: 15 },
  { id: 'legend', tier: 'legend', rankIndex: 7, nameJa: 'レジェンド', nameEn: 'Legend', minXp: 10000, promotionBonusPoints: 25 },
];

export const XP_REWARDS = {
  WORKOUT_COMPLETE: 50,
  PR_UPDATE_BONUS: 30,
  DAILY_RECORD: 20,
  FIRST_RECORD_BONUS: 30,
};

export const MEDAL_RARITY_REWARDS: Record<
  MedalRarity,
  { xp: number; points: number; color: string; bgColor: string; labelJa: string; labelEn: string }
> = {
  bronze: {
    xp: 50,
    points: 2,
    color: '#CD7F32',
    bgColor: 'rgba(205, 127, 50, 0.16)',
    labelJa: 'ブロンズ',
    labelEn: 'Bronze',
  },
  silver: {
    xp: 150,
    points: 5,
    color: '#CBD5E1',
    bgColor: 'rgba(203, 213, 225, 0.16)',
    labelJa: 'シルバー',
    labelEn: 'Silver',
  },
  gold: {
    xp: 350,
    points: 10,
    color: '#FFD700',
    bgColor: 'rgba(255, 215, 0, 0.16)',
    labelJa: 'ゴールド',
    labelEn: 'Gold',
  },
  platinum: {
    xp: 700,
    points: 20,
    color: '#38BDF8',
    bgColor: 'rgba(56, 189, 248, 0.16)',
    labelJa: 'プラチナ',
    labelEn: 'Platinum',
  },
};

export const ACHIEVEMENT_MEDALS: AchievementMedalDef[] = [
  // === Workout (15 medals) ===
  {
    id: 'workout_count_1',
    category: 'workout',
    featureId: 'workout',
    rarity: 'bronze',
    titleJa: 'ファーストステップ',
    titleEn: 'First Workout',
    descJa: 'ワークアウトを初めて1回完了する',
    descEn: 'Complete your first workout session',
    icon: 'barbell',
    metricKey: 'workoutCount',
    targetValue: 1,
    unitJa: '回',
    unitEn: 'workouts',
  },
  {
    id: 'workout_count_10',
    category: 'workout',
    featureId: 'workout',
    rarity: 'bronze',
    titleJa: '習慣の芽生え',
    titleEn: 'Getting Consistent',
    descJa: 'ワークアウトを累計10回完了する',
    descEn: 'Complete 10 total workouts',
    icon: 'barbell',
    metricKey: 'workoutCount',
    targetValue: 10,
    unitJa: '回',
    unitEn: 'workouts',
  },
  {
    id: 'workout_count_30',
    category: 'workout',
    featureId: 'workout',
    rarity: 'silver',
    titleJa: 'アイアンレギュラー',
    titleEn: 'Gym Regular',
    descJa: 'ワークアウトを累計30回完了する',
    descEn: 'Complete 30 total workouts',
    icon: 'barbell',
    metricKey: 'workoutCount',
    targetValue: 30,
    unitJa: '回',
    unitEn: 'workouts',
  },
  {
    id: 'workout_count_100',
    category: 'workout',
    featureId: 'workout',
    rarity: 'gold',
    titleJa: '百戦錬磨',
    titleEn: 'Century Lifter',
    descJa: 'ワークアウトを累計100回完了する',
    descEn: 'Complete 100 total workouts',
    icon: 'barbell',
    metricKey: 'workoutCount',
    targetValue: 100,
    unitJa: '回',
    unitEn: 'workouts',
  },
  {
    id: 'workout_count_300',
    category: 'workout',
    featureId: 'workout',
    rarity: 'platinum',
    titleJa: '鉄の求道者',
    titleEn: 'Iron Legend',
    descJa: 'ワークアウトを累計300回完了する',
    descEn: 'Complete 300 total workouts',
    icon: 'trophy',
    metricKey: 'workoutCount',
    targetValue: 300,
    unitJa: '回',
    unitEn: 'workouts',
  },
  {
    id: 'volume_10t',
    category: 'workout',
    featureId: 'workout',
    rarity: 'bronze',
    titleJa: '10トンの軌跡',
    titleEn: '10-Ton Mover',
    descJa: '累計挙上ボリューム 10,000 kg を達成する',
    descEn: 'Lift 10,000 kg cumulative volume',
    icon: 'fitness',
    metricKey: 'totalVolumeKg',
    targetValue: 10000,
    unitJa: 'kg',
    unitEn: 'kg',
  },
  {
    id: 'volume_100t',
    category: 'workout',
    featureId: 'workout',
    rarity: 'silver',
    titleJa: '100トンクラッシャー',
    titleEn: '100-Ton Crusher',
    descJa: '累計挙上ボリューム 100,000 kg を達成する',
    descEn: 'Lift 100,000 kg cumulative volume',
    icon: 'fitness',
    metricKey: 'totalVolumeKg',
    targetValue: 100000,
    unitJa: 'kg',
    unitEn: 'kg',
  },
  {
    id: 'volume_500t',
    category: 'workout',
    featureId: 'workout',
    rarity: 'gold',
    titleJa: 'ヘビータイタン',
    titleEn: '500-Ton Titan',
    descJa: '累計挙上ボリューム 500,000 kg を達成する',
    descEn: 'Lift 500,000 kg cumulative volume',
    icon: 'fitness',
    metricKey: 'totalVolumeKg',
    targetValue: 500000,
    unitJa: 'kg',
    unitEn: 'kg',
  },
  {
    id: 'volume_1000t',
    category: 'workout',
    featureId: 'workout',
    rarity: 'platinum',
    titleJa: 'ミリオンリフター',
    titleEn: 'Million-Kg Lifter',
    descJa: '累計挙上ボリューム 1,000,000 kg を達成する',
    descEn: 'Lift 1,000,000 kg cumulative volume',
    icon: 'diamond',
    metricKey: 'totalVolumeKg',
    targetValue: 1000000,
    unitJa: 'kg',
    unitEn: 'kg',
  },
  {
    id: 'pr_1',
    category: 'pr_mastery',
    featureId: 'workout',
    rarity: 'bronze',
    titleJa: '自己ベスト更新',
    titleEn: 'First Personal Record',
    descJa: '自己ベスト（1RMまたはボリュームPR）を初めて更新する',
    descEn: 'Break your first personal record',
    icon: 'star',
    metricKey: 'prUpdateCount',
    targetValue: 1,
    unitJa: '回',
    unitEn: 'PRs',
  },
  {
    id: 'pr_10',
    category: 'pr_mastery',
    featureId: 'workout',
    rarity: 'silver',
    titleJa: '限界突破者',
    titleEn: 'PR Hunter',
    descJa: '自己ベスト更新を累計10回達成する',
    descEn: 'Achieve 10 personal record updates',
    icon: 'star',
    metricKey: 'prUpdateCount',
    targetValue: 10,
    unitJa: '回',
    unitEn: 'PRs',
  },
  {
    id: 'pr_30',
    category: 'pr_mastery',
    featureId: 'workout',
    rarity: 'gold',
    titleJa: 'レコードブレイカー',
    titleEn: 'Record Breaker',
    descJa: '自己ベスト更新を累計30回達成する',
    descEn: 'Achieve 30 personal record updates',
    icon: 'flash',
    metricKey: 'prUpdateCount',
    targetValue: 30,
    unitJa: '回',
    unitEn: 'PRs',
  },
  {
    id: 'exercises_15',
    category: 'pr_mastery',
    featureId: 'workout',
    rarity: 'silver',
    titleJa: 'オールラウンダー',
    titleEn: 'All-Rounder',
    descJa: '15種類以上の異なる種目を実施する',
    descEn: 'Train at least 15 distinct exercises',
    icon: 'layers',
    metricKey: 'uniqueExerciseCount',
    targetValue: 15,
    unitJa: '種目',
    unitEn: 'exercises',
  },
  {
    id: 'streak_weeks_4',
    category: 'streak',
    featureId: 'workout',
    rarity: 'silver',
    titleJa: '4週連続トレーニング',
    titleEn: '4-Week Streak',
    descJa: '毎週のワークアウトを4週間連続で継続する',
    descEn: 'Maintain weekly workouts for 4 weeks in a row',
    icon: 'flame',
    metricKey: 'streakWeeks',
    targetValue: 4,
    unitJa: '週',
    unitEn: 'weeks',
  },
  {
    id: 'streak_weeks_12',
    category: 'streak',
    featureId: 'workout',
    rarity: 'gold',
    titleJa: '12週連続トレーニング',
    titleEn: '12-Week Streak',
    descJa: '毎週のワークアウトを12週間連続で継続する',
    descEn: 'Maintain weekly workouts for 12 weeks in a row',
    icon: 'flame',
    metricKey: 'streakWeeks',
    targetValue: 12,
    unitJa: '週',
    unitEn: 'weeks',
  },

  // === Lifelog Features (6 features x 3 = 18 medals) ===
  {
    id: 'water_days_7',
    category: 'lifelog',
    featureId: 'water',
    rarity: 'bronze',
    titleJa: '水分記録ビギナー',
    titleEn: 'Hydration Starter',
    descJa: '水分補給を累計7日記録する',
    descEn: 'Log hydration on 7 distinct days',
    icon: 'water',
    metricKey: 'waterDays',
    targetValue: 7,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'water_days_30',
    category: 'lifelog',
    featureId: 'water',
    rarity: 'silver',
    titleJa: 'ハイドレーションマスター',
    titleEn: 'Hydration Pro',
    descJa: '水分補給を累計30日記録する',
    descEn: 'Log hydration on 30 distinct days',
    icon: 'water',
    metricKey: 'waterDays',
    targetValue: 30,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'water_days_100',
    category: 'lifelog',
    featureId: 'water',
    rarity: 'gold',
    titleJa: 'アクアガーディアン',
    titleEn: 'Aqua Guardian',
    descJa: '水分補給を累計100日記録する',
    descEn: 'Log hydration on 100 distinct days',
    icon: 'water',
    metricKey: 'waterDays',
    targetValue: 100,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'nutrition_days_7',
    category: 'lifelog',
    featureId: 'nutrition',
    rarity: 'bronze',
    titleJa: '食事記録の第一歩',
    titleEn: 'Macro Tracker',
    descJa: '栄養・食事を累計7日記録する',
    descEn: 'Log meals on 7 distinct days',
    icon: 'restaurant',
    metricKey: 'nutritionDays',
    targetValue: 7,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'nutrition_days_30',
    category: 'lifelog',
    featureId: 'nutrition',
    rarity: 'silver',
    titleJa: 'PFCプランナー',
    titleEn: 'Nutrition Pro',
    descJa: '栄養・食事を累計30日記録する',
    descEn: 'Log meals on 30 distinct days',
    icon: 'restaurant',
    metricKey: 'nutritionDays',
    targetValue: 30,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'nutrition_days_100',
    category: 'lifelog',
    featureId: 'nutrition',
    rarity: 'gold',
    titleJa: 'ニュートリション賢者',
    titleEn: 'Nutrition Master',
    descJa: '栄養・食事を累計100日記録する',
    descEn: 'Log meals on 100 distinct days',
    icon: 'restaurant',
    metricKey: 'nutritionDays',
    targetValue: 100,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'body_days_7',
    category: 'lifelog',
    featureId: 'body',
    rarity: 'bronze',
    titleJa: 'ボディチェック開始',
    titleEn: 'Body Tracker',
    descJa: '体組成を累計7日記録する',
    descEn: 'Log body composition on 7 distinct days',
    icon: 'body',
    metricKey: 'bodyDays',
    targetValue: 7,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'body_days_30',
    category: 'lifelog',
    featureId: 'body',
    rarity: 'silver',
    titleJa: 'フィジークアナリスト',
    titleEn: 'Physique Analyst',
    descJa: '体組成を累計30日記録する',
    descEn: 'Log body composition on 30 distinct days',
    icon: 'body',
    metricKey: 'bodyDays',
    targetValue: 30,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'body_days_100',
    category: 'lifelog',
    featureId: 'body',
    rarity: 'gold',
    titleJa: '進化の観測者',
    titleEn: 'Body Sculptor',
    descJa: '体組成を累計100日記録する',
    descEn: 'Log body composition on 100 distinct days',
    icon: 'body',
    metricKey: 'bodyDays',
    targetValue: 100,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'habit_logs_30',
    category: 'lifelog',
    featureId: 'habit',
    rarity: 'bronze',
    titleJa: '習慣カウント30',
    titleEn: 'Habit Starter',
    descJa: '習慣カウンターを累計30回達成する',
    descEn: 'Record 30 habit completions',
    icon: 'checkmark-circle',
    metricKey: 'habitLogCount',
    targetValue: 30,
    unitJa: '回',
    unitEn: 'logs',
  },
  {
    id: 'habit_logs_200',
    category: 'lifelog',
    featureId: 'habit',
    rarity: 'silver',
    titleJa: '習慣クラフト200',
    titleEn: 'Habit Builder',
    descJa: '習慣カウンターを累計200回達成する',
    descEn: 'Record 200 habit completions',
    icon: 'checkmark-circle',
    metricKey: 'habitLogCount',
    targetValue: 200,
    unitJa: '回',
    unitEn: 'logs',
  },
  {
    id: 'habit_logs_1000',
    category: 'lifelog',
    featureId: 'habit',
    rarity: 'gold',
    titleJa: '千の習慣達人',
    titleEn: 'Thousand Habits',
    descJa: '習慣カウンターを累計1,000回達成する',
    descEn: 'Record 1,000 habit completions',
    icon: 'checkmark-circle',
    metricKey: 'habitLogCount',
    targetValue: 1000,
    unitJa: '回',
    unitEn: 'logs',
  },
  {
    id: 'routine_days_7',
    category: 'lifelog',
    featureId: 'routine',
    rarity: 'bronze',
    titleJa: 'ルーティン実践者',
    titleEn: 'Routine Runner',
    descJa: 'ルーティンを累計7日完了する',
    descEn: 'Complete daily routines on 7 distinct days',
    icon: 'repeat',
    metricKey: 'routineDays',
    targetValue: 7,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'routine_days_30',
    category: 'lifelog',
    featureId: 'routine',
    rarity: 'silver',
    titleJa: 'ルーティン職人',
    titleEn: 'Routine Craftsman',
    descJa: 'ルーティンを累計30日完了する',
    descEn: 'Complete daily routines on 30 distinct days',
    icon: 'repeat',
    metricKey: 'routineDays',
    targetValue: 30,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'routine_days_100',
    category: 'lifelog',
    featureId: 'routine',
    rarity: 'gold',
    titleJa: '日課のマスター',
    titleEn: 'Routine Master',
    descJa: 'ルーティンを累計100日完了する',
    descEn: 'Complete daily routines on 100 distinct days',
    icon: 'repeat',
    metricKey: 'routineDays',
    targetValue: 100,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'zikan_days_7',
    category: 'lifelog',
    featureId: 'zikan',
    rarity: 'bronze',
    titleJa: 'タイムキーパー',
    titleEn: 'Time Keeper',
    descJa: '24時間管理を累計7日記録する',
    descEn: 'Log time blocks on 7 distinct days',
    icon: 'time',
    metricKey: 'zikanDays',
    targetValue: 7,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'zikan_days_30',
    category: 'lifelog',
    featureId: 'zikan',
    rarity: 'silver',
    titleJa: 'クロノマネージャー',
    titleEn: 'Chrono Manager',
    descJa: '24時間管理を累計30日記録する',
    descEn: 'Log time blocks on 30 distinct days',
    icon: 'time',
    metricKey: 'zikanDays',
    targetValue: 30,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'zikan_days_100',
    category: 'lifelog',
    featureId: 'zikan',
    rarity: 'gold',
    titleJa: '時間支配者',
    titleEn: 'Master of Time',
    descJa: '24時間管理を累計100日記録する',
    descEn: 'Log time blocks on 100 distinct days',
    icon: 'time',
    metricKey: 'zikanDays',
    targetValue: 100,
    unitJa: '日',
    unitEn: 'days',
  },

  // === Overall Milestones (7 medals) ===
  {
    id: 'active_days_7',
    category: 'streak',
    rarity: 'bronze',
    titleJa: '7日間アクティブ',
    titleEn: '7 Active Days',
    descJa: 'いずれかの機能を累計7日記録する',
    descEn: 'Record any activity on 7 distinct days',
    icon: 'calendar',
    metricKey: 'totalActiveDays',
    targetValue: 7,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'active_days_30',
    category: 'streak',
    rarity: 'silver',
    titleJa: '30日間アクティブ',
    titleEn: '30 Active Days',
    descJa: 'いずれかの機能を累計30日記録する',
    descEn: 'Record any activity on 30 distinct days',
    icon: 'calendar',
    metricKey: 'totalActiveDays',
    targetValue: 30,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'active_days_100',
    category: 'streak',
    rarity: 'gold',
    titleJa: '100日間アクティブ',
    titleEn: '100 Active Days',
    descJa: 'いずれかの機能を累計100日記録する',
    descEn: 'Record any activity on 100 distinct days',
    icon: 'calendar',
    metricKey: 'totalActiveDays',
    targetValue: 100,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'active_days_365',
    category: 'streak',
    rarity: 'platinum',
    titleJa: '365日間の継続',
    titleEn: 'Year-Round Dedication',
    descJa: 'いずれかの機能を累計365日記録する',
    descEn: 'Record any activity on 365 distinct days',
    icon: 'ribbon',
    metricKey: 'totalActiveDays',
    targetValue: 365,
    unitJa: '日',
    unitEn: 'days',
  },
  {
    id: 'used_features_3',
    category: 'milestone',
    rarity: 'bronze',
    titleJa: 'マルチトラッカー',
    titleEn: 'Multi-Tracker',
    descJa: '3つ以上の機能で記録を残す',
    descEn: 'Record logs across at least 3 features',
    icon: 'layers',
    metricKey: 'usedFeatureCount',
    targetValue: 3,
    unitJa: '機能',
    unitEn: 'features',
  },
  {
    id: 'used_features_6',
    category: 'milestone',
    rarity: 'silver',
    titleJa: 'トータルコンディショニング',
    titleEn: 'Total Conditioning',
    descJa: '6つ以上の機能で記録を残す',
    descEn: 'Record logs across at least 6 features',
    icon: 'sparkles',
    metricKey: 'usedFeatureCount',
    targetValue: 6,
    unitJa: '機能',
    unitEn: 'features',
  },
  {
    id: 'perfect_day_1',
    category: 'milestone',
    rarity: 'silver',
    titleJa: 'パーフェクトデイ',
    titleEn: 'Perfect Day',
    descJa: '同じ日に筋トレ＋他2つ以上のライフログを記録する',
    descEn: 'Log a workout plus 2+ other lifelog features on the same day',
    icon: 'sunny',
    metricKey: 'perfectDayCount',
    targetValue: 1,
    unitJa: '日',
    unitEn: 'days',
  },
];

export const FEATURE_DISPLAY_META: Record<
  GamificationFeatureId,
  { titleJa: string; titleEn: string; icon: string; color: string; bgColor: string }
> = {
  workout: {
    titleJa: '筋トレ記録',
    titleEn: 'Workout',
    icon: 'barbell',
    color: '#4facfe',
    bgColor: 'rgba(79, 172, 254, 0.15)',
  },
  water: {
    titleJa: '水分＆カフェイン',
    titleEn: 'Hydration',
    icon: 'water',
    color: '#00d2ff',
    bgColor: 'rgba(0, 210, 255, 0.15)',
  },
  nutrition: {
    titleJa: '栄養＆食事',
    titleEn: 'Nutrition',
    icon: 'restaurant',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  body: {
    titleJa: '体組成＆限界',
    titleEn: 'Body Composition',
    icon: 'body',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.15)',
  },
  routine: {
    titleJa: 'ルーティン管理',
    titleEn: 'Routines',
    icon: 'repeat',
    color: '#4caf50',
    bgColor: 'rgba(76, 175, 80, 0.15)',
  },
  habit: {
    titleJa: '習慣カウンター',
    titleEn: 'Habits',
    icon: 'checkmark-circle',
    color: '#e91e63',
    bgColor: 'rgba(233, 30, 99, 0.15)',
  },
  zikan: {
    titleJa: '24時間管理',
    titleEn: '24h Time Log',
    icon: 'time',
    color: '#ff9800',
    bgColor: 'rgba(255, 152, 0, 0.15)',
  },
};

export function createEmptyFeatureXp(): Record<GamificationFeatureId, number> {
  return {
    workout: 0,
    water: 0,
    nutrition: 0,
    body: 0,
    routine: 0,
    habit: 0,
    zikan: 0,
  };
}

export function createEmptyMetrics(): GamificationMetrics {
  return {
    workoutCount: 0,
    totalVolumeKg: 0,
    prUpdateCount: 0,
    uniqueExerciseCount: 0,
    streakWeeks: 0,
    waterDays: 0,
    nutritionDays: 0,
    bodyDays: 0,
    habitLogCount: 0,
    routineDays: 0,
    zikanDays: 0,
    totalActiveDays: 0,
    usedFeatureCount: 0,
    perfectDayCount: 0,
  };
}

export function createInitialPersistedGamificationState(): PersistedGamificationState {
  return {
    totalXp: 0,
    featureXp: createEmptyFeatureXp(),
    unlockedMedals: {},
    prUpdateCount: 0,
    firstRecordedFeatures: [],
    dailyXpMap: {},
    awardedWorkoutIds: [],
    recentXpHistory: [],
    retroactiveMigrated: false,
  };
}

export function normalizeDateKey(dateInput?: string | Date | number | null): string {
  const formatLocal = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (dateInput === null || dateInput === undefined || dateInput === '') {
    return formatLocal(new Date());
  }
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? formatLocal(new Date()) : formatLocal(dateInput);
  }
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? formatLocal(new Date()) : formatLocal(d);
  }

  const trimmed = String(dateInput).trim();
  const ymdSlash = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (ymdSlash) {
    const [, y, m, d] = ymdSlash;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const ymdDash = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?!T)/);
  if (ymdDash) {
    const [, y, m, d] = ymdDash;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return formatLocal(parsed);
  }
  return formatLocal(new Date());
}

export function getOverallClassForXp(xp: number): OverallClassDef {
  const safeXp = Math.max(0, Number.isFinite(xp) ? Math.floor(xp) : 0);
  let matched = OVERALL_CLASSES[0];
  for (const cls of OVERALL_CLASSES) {
    if (safeXp >= cls.minXp) {
      matched = cls;
    } else {
      break;
    }
  }
  return matched;
}

export function getOverallClassProgress(xp: number) {
  const safeXp = Math.max(0, Number.isFinite(xp) ? Math.floor(xp) : 0);
  const current = getOverallClassForXp(safeXp);
  const next = OVERALL_CLASSES[current.rankIndex + 1] || null;
  if (!next) {
    return {
      current,
      next: null,
      currentXp: safeXp,
      xpInTier: safeXp - current.minXp,
      xpNeededForNext: 0,
      remainingXp: 0,
      progressRatio: 1,
      isMax: true,
    };
  }
  const span = Math.max(1, next.minXp - current.minXp);
  const xpInTier = safeXp - current.minXp;
  const remainingXp = Math.max(0, next.minXp - safeXp);
  return {
    current,
    next,
    currentXp: safeXp,
    xpInTier,
    xpNeededForNext: span,
    remainingXp,
    progressRatio: Math.min(1, Math.max(0, xpInTier / span)),
    isMax: false,
  };
}

export function getFeatureClassForXp(xp: number): FeatureClassDef {
  const safeXp = Math.max(0, Number.isFinite(xp) ? Math.floor(xp) : 0);
  let matched = FEATURE_CLASSES[0];
  for (const cls of FEATURE_CLASSES) {
    if (safeXp >= cls.minXp) {
      matched = cls;
    } else {
      break;
    }
  }
  return matched;
}

export function getFeatureClassProgress(xp: number) {
  const safeXp = Math.max(0, Number.isFinite(xp) ? Math.floor(xp) : 0);
  const current = getFeatureClassForXp(safeXp);
  const next = FEATURE_CLASSES[current.rankIndex + 1] || null;
  if (!next) {
    return {
      current,
      next: null,
      currentXp: safeXp,
      xpInTier: safeXp - current.minXp,
      xpNeededForNext: 0,
      remainingXp: 0,
      progressRatio: 1,
      isMax: true,
    };
  }
  const span = Math.max(1, next.minXp - current.minXp);
  const xpInTier = safeXp - current.minXp;
  const remainingXp = Math.max(0, next.minXp - safeXp);
  return {
    current,
    next,
    currentXp: safeXp,
    xpInTier,
    xpNeededForNext: span,
    remainingXp,
    progressRatio: Math.min(1, Math.max(0, xpInTier / span)),
    isMax: false,
  };
}

export function getPromotionBonusBetweenOverall(fromRankIndex: number, toRankIndex: number): number {
  if (toRankIndex <= fromRankIndex) return 0;
  let bonus = 0;
  for (const cls of OVERALL_CLASSES) {
    if (cls.rankIndex > fromRankIndex && cls.rankIndex <= toRankIndex) {
      bonus += cls.promotionBonusPoints;
    }
  }
  return bonus;
}

export function getPromotionBonusBetweenFeature(fromRankIndex: number, toRankIndex: number): number {
  if (toRankIndex <= fromRankIndex) return 0;
  let bonus = 0;
  for (const cls of FEATURE_CLASSES) {
    if (cls.rankIndex > fromRankIndex && cls.rankIndex <= toRankIndex) {
      bonus += cls.promotionBonusPoints;
    }
  }
  return bonus;
}

export function evaluateUnlockableMedals(
  metrics: GamificationMetrics,
  alreadyUnlocked: Record<string, number>
): AchievementMedalDef[] {
  return ACHIEVEMENT_MEDALS.filter((medal) => {
    if (alreadyUnlocked[medal.id] !== undefined) {
      return false;
    }
    const val = metrics[medal.metricKey] ?? 0;
    return val >= medal.targetValue;
  });
}
