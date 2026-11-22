import {
  ACHIEVEMENT_MEDALS,
  createEmptyMetrics,
  createInitialPersistedGamificationState,
  evaluateUnlockableMedals,
  FEATURE_CLASSES,
  GAMIFICATION_FEATURE_IDS,
  getFeatureClassForXp,
  getFeatureClassProgress,
  getOverallClassForXp,
  getOverallClassProgress,
  getPromotionBonusBetweenFeature,
  getPromotionBonusBetweenOverall,
  MEDAL_RARITY_REWARDS,
  normalizeDateKey,
  OVERALL_CLASSES,
  XP_REWARDS,
} from '../src/constants/gamificationConstants';
import {
  computeMaxStreakWeeksFromDates,
  extractRoutineDateSet,
} from '../src/services/gamificationMetricsService';
import {
  applyDebugXp,
  cancelPendingGamificationEvaluation,
  initGamificationState,
  recordGamificationFeatureActivity,
  recordWorkoutCompletionGamification,
  resolveMedalsAndClassUps,
} from '../src/services/gamificationService';
import { useFeatureUnlockStore } from '../src/store/featureUnlockStore';
import { useGamificationStore } from '../src/store/gamificationStore';
import { GamificationMetrics } from '../src/types/gamification';
import * as metricsService from '../src/services/gamificationMetricsService';

jest.mock('../src/db/database', () => ({
  saveSetting: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/db/connection', () => ({
  withDBQueue: jest.fn(),
  getDB: jest.fn(),
}));

describe('2-Tier Gamification System (Classes, XP & Medals)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cancelPendingGamificationEvaluation();
    jest.spyOn(metricsService, 'collectGamificationMetrics').mockResolvedValue(createEmptyMetrics());
    useGamificationStore.getState().resetAll();
    useFeatureUnlockStore.setState({
      pointsBalance: 5,
      unlockedFeatures: ['workout', 'water'],
      forceUnlockAll: false,
      firstRecordedFeatures: [],
      dailyRecordMap: {},
      hasCompletedInitialSelection: true,
      pendingUnlockFeature: null,
      pendingPointNotice: null,
      isInitialized: true,
    });
  });

  afterEach(() => {
    cancelPendingGamificationEvaluation();
  });

  test('Overall classes include 21 ranks starting at Iron I (0 XP) up to Legend (65,000 XP)', () => {
    expect(OVERALL_CLASSES.length).toBe(21);
    expect(getOverallClassForXp(-50).id).toBe('iron_1');
    expect(getOverallClassForXp(0).id).toBe('iron_1');
    expect(getOverallClassForXp(99).id).toBe('iron_1');
    expect(getOverallClassForXp(100).id).toBe('iron_2');
    expect(getOverallClassForXp(250).id).toBe('iron_3');
    expect(getOverallClassForXp(450).id).toBe('bronze_1');
    expect(getOverallClassForXp(64999).id).toBe('master_2');
    expect(getOverallClassForXp(65000).id).toBe('legend');

    const maxProg = getOverallClassProgress(70000);
    expect(maxProg.isMax).toBe(true);
    expect(maxProg.next).toBeNull();
    expect(maxProg.progressRatio).toBe(1);
  });

  test('Feature classes include 8 tiers from Iron (0 XP) to Legend (10,000 XP)', () => {
    expect(FEATURE_CLASSES.length).toBe(8);
    expect(getFeatureClassForXp(0).tier).toBe('iron');
    expect(getFeatureClassForXp(79).tier).toBe('iron');
    expect(getFeatureClassForXp(80).tier).toBe('bronze');
    expect(getFeatureClassForXp(250).tier).toBe('silver');
    expect(getFeatureClassForXp(700).tier).toBe('gold');
    expect(getFeatureClassForXp(1600).tier).toBe('platinum');
    expect(getFeatureClassForXp(3200).tier).toBe('diamond');
    expect(getFeatureClassForXp(6000).tier).toBe('master');
    expect(getFeatureClassForXp(10000).tier).toBe('legend');

    const prog = getFeatureClassProgress(40);
    expect(prog.current.tier).toBe('iron');
    expect(prog.next?.tier).toBe('bronze');
    expect(prog.remainingXp).toBe(40);
    expect(prog.progressRatio).toBeCloseTo(0.5);
  });

  test('Multi-rank promotion bonus sums all skipped divisions accurately', () => {
    // Iron I (0) -> Bronze I (3): Iron II (+2) + Iron III (+2) + Bronze I (+3) = 7P
    expect(getPromotionBonusBetweenOverall(0, 3)).toBe(7);
    expect(getPromotionBonusBetweenOverall(3, 3)).toBe(0);

    // Feature Iron (0) -> Gold (3): Bronze (+2) + Silver (+3) + Gold (+5) = 10P
    expect(getPromotionBonusBetweenFeature(0, 3)).toBe(10);
  });

  test('Contains 40 achievement medals and each unlocks strictly at targetValue', () => {
    expect(ACHIEVEMENT_MEDALS.length).toBe(40);

    for (const medal of ACHIEVEMENT_MEDALS) {
      const belowMetrics: GamificationMetrics = {
        ...createEmptyMetrics(),
        [medal.metricKey]: Math.max(0, medal.targetValue - 1),
      };
      const unlockedBelow = evaluateUnlockableMedals(belowMetrics, {}).map((m) => m.id);
      expect(unlockedBelow).not.toContain(medal.id);

      const exactMetrics: GamificationMetrics = {
        ...createEmptyMetrics(),
        [medal.metricKey]: medal.targetValue,
      };
      const unlockedExact = evaluateUnlockableMedals(exactMetrics, {}).map((m) => m.id);
      expect(unlockedExact).toContain(medal.id);
    }
  });

  test('Date normalization handles slash, dash, ISO strings, and routine extraction', () => {
    expect(normalizeDateKey('2026/08/05')).toBe('2026-08-05');
    expect(normalizeDateKey('2026-8-5')).toBe('2026-08-05');
    expect(normalizeDateKey('2026-08-05')).toBe('2026-08-05');

    const streak = computeMaxStreakWeeksFromDates([
      '2026-01-01',
      '2026-01-08',
      '2026-01-15',
      '2026-01-22',
    ]);
    expect(streak).toBe(4);

    const ts1 = new Date(2026, 7, 10, 9, 0, 0).getTime();
    const routineDates = extractRoutineDateSet(
      JSON.stringify([{ id: 'r1', history: [{ timestamp: ts1 }] }])
    );
    expect(routineDates.has('2026-08-10')).toBe(true);
  });

  test('Lifelog activity awards first+daily XP once per day and syncs overall + feature XP', () => {
    const xp1 = recordGamificationFeatureActivity('water', '2026/08/26');
    expect(xp1).toBe(XP_REWARDS.FIRST_RECORD_BONUS + XP_REWARDS.DAILY_RECORD); // 30 + 20 = 50

    const xpSameDay = recordGamificationFeatureActivity('water', '2026-08-26');
    expect(xpSameDay).toBe(0);

    const xpNextDay = recordGamificationFeatureActivity('water', '2026/08/27');
    expect(xpNextDay).toBe(XP_REWARDS.DAILY_RECORD); // 20

    const state = useGamificationStore.getState();
    expect(state.featureXp.water).toBe(70);
    expect(state.totalXp).toBe(70);
  });

  test('Workout completion awards XP + PR bonus and is idempotent per workoutId', async () => {
    jest.spyOn(metricsService, 'collectGamificationMetrics').mockResolvedValue({
      ...createEmptyMetrics(),
      workoutCount: 1,
      prUpdateCount: 1,
      totalActiveDays: 1,
      usedFeatureCount: 1,
    });

    const summary1 = await recordWorkoutCompletionGamification(101, true);
    expect(summary1).not.toBeNull();
    // 50 (workout) + 30 (first record) + 30 (PR) + 50 (workout_count_1 medal) + 50 (pr_1 medal) = 210
    expect(summary1?.xpEarned).toBe(110);
    expect(summary1?.newlyUnlockedMedals.map((m) => m.id)).toEqual(
      expect.arrayContaining(['workout_count_1', 'pr_1'])
    );

    const afterFirst = useGamificationStore.getState();
    expect(afterFirst.featureXp.workout).toBe(210);
    expect(afterFirst.totalXp).toBe(210);
    // Iron I -> Iron II (+2P), Iron II -> Iron III? (210 < 250), Workout Iron -> Bronze (+2P)
    // Plus two bronze medals (2P + 2P = 4P). Total added to initial 5P = 13P
    expect(useFeatureUnlockStore.getState().pointsBalance).toBe(5 + 2 + 2 + 4);
    expect(afterFirst.pendingClassUp?.overall?.to.id).toBe('iron_2');
    expect(afterFirst.pendingClassUp?.features[0]?.to.tier).toBe('bronze');

    // Duplicate call for same workoutId should do nothing
    await recordWorkoutCompletionGamification(101, true);
    expect(useGamificationStore.getState().totalXp).toBe(210);
  });

  test('Simultaneous overall & feature class-up aggregates into a single ClassUpEvent', () => {
    const prev = createInitialPersistedGamificationState();
    const next = {
      ...prev,
      totalXp: 120,
      featureXp: {
        ...prev.featureXp,
        nutrition: 100,
      },
    };
    const res = resolveMedalsAndClassUps(prev, next, createEmptyMetrics());
    expect(res.classUpEvent).not.toBeNull();
    expect(res.classUpEvent?.overall?.to.id).toBe('iron_2');
    expect(res.classUpEvent?.features).toHaveLength(1);
    expect(res.classUpEvent?.features[0].featureId).toBe('nutrition');
    expect(res.classUpEvent?.features[0].to.tier).toBe('bronze');
    expect(res.totalBonusPoints).toBe(4);
  });

  test('Medal unlock triggers chained class-up and adds bonus P points', () => {
    const prev = {
      ...createInitialPersistedGamificationState(),
      totalXp: 70,
      featureXp: {
        ...createInitialPersistedGamificationState().featureXp,
        water: 70,
      },
    };
    const metrics: GamificationMetrics = {
      ...createEmptyMetrics(),
      waterDays: 7,
    };

    const res = resolveMedalsAndClassUps(prev, prev, metrics);
    const medalReward = MEDAL_RARITY_REWARDS.bronze;
    expect(res.unlockedMedals.map((m) => m.id)).toContain('water_days_7');
    expect(res.finalState.totalXp).toBe(70 + medalReward.xp);
    expect(res.finalState.featureXp.water).toBe(70 + medalReward.xp);
    expect(res.classUpEvent?.overall?.to.id).toBe('iron_2');
    expect(res.classUpEvent?.features[0].to.tier).toBe('bronze');
    expect(res.totalBonusPoints).toBe(medalReward.points + 2 + 2);
  });

  test('Total XP is always >= sum of feature XP invariant', () => {
    applyDebugXp(120, 'body');
    applyDebugXp(50, 'overall');
    recordGamificationFeatureActivity('habit', '2026-09-01');

    const s = useGamificationStore.getState();
    const sumFeatures = GAMIFICATION_FEATURE_IDS.reduce((acc, fid) => acc + s.featureXp[fid], 0);
    expect(s.totalXp).toBeGreaterThanOrEqual(sumFeatures);
  });

  test('Retroactive migration populates XP, medals, P points, and single summary notice without spam', async () => {
    jest.spyOn(metricsService, 'inferHistoricalPrUpdateCount').mockResolvedValue(2);
    jest.spyOn(metricsService, 'getDistinctHabitDaysCount').mockResolvedValue(5);
    jest.spyOn(metricsService, 'collectGamificationMetrics').mockResolvedValue({
      ...createEmptyMetrics(),
      workoutCount: 10,
      totalVolumeKg: 12000,
      prUpdateCount: 2,
      uniqueExerciseCount: 8,
      streakWeeks: 2,
      waterDays: 7,
      habitLogCount: 35,
      totalActiveDays: 12,
      usedFeatureCount: 3,
    });

    await initGamificationState({});

    const gState = useGamificationStore.getState();
    expect(gState.retroactiveMigrated).toBe(true);
    expect(gState.totalXp).toBeGreaterThan(500);
    expect(gState.featureXp.workout).toBeGreaterThan(500);
    expect(gState.featureXp.water).toBeGreaterThan(150);
    expect(Object.keys(gState.unlockedMedals)).toEqual(
      expect.arrayContaining([
        'workout_count_1',
        'workout_count_10',
        'volume_10t',
        'pr_1',
        'water_days_7',
        'habit_logs_30',
        'active_days_7',
        'used_features_3',
      ])
    );
    expect(gState.pendingRetroactiveSummary).not.toBeNull();
    expect(gState.pendingClassUp).toBeNull();
    expect(gState.pendingMedalNotice).toBeNull();
    expect(useFeatureUnlockStore.getState().pointsBalance).toBeGreaterThan(5);
  });
});
