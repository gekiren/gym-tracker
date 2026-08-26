import { useFeatureUnlockStore, isFeatureUnlockedHelper } from '../src/store/featureUnlockStore';
import { getUnlockCost, POINT_REWARDS } from '../src/constants/featureUnlockConstants';

// Mock saveSetting to prevent database calls in tests
jest.mock('../src/db/database', () => ({
  saveSetting: jest.fn().mockResolvedValue(undefined),
}));

describe('Feature Unlock & P-Point Economy System', () => {
  beforeEach(() => {
    useFeatureUnlockStore.setState({
      pointsBalance: 5,
      unlockedFeatures: ['workout', 'water'],
      forceUnlockAll: false,
      firstRecordedFeatures: [],
      dailyRecordMap: {},
      hasCompletedInitialSelection: false,
      pendingUnlockFeature: null,
      pendingPointNotice: null,
      isInitialized: true,
    });
  });

  test('Initial feature selection sets 2 unlocked features and initial bonus', () => {
    const store = useFeatureUnlockStore.getState();
    store.setInitialFeatures(['nutrition', 'body']);

    const updated = useFeatureUnlockStore.getState();
    expect(updated.unlockedFeatures).toEqual(['nutrition', 'body']);
    expect(updated.hasCompletedInitialSelection).toBe(true);
    expect(updated.pointsBalance).toBeGreaterThanOrEqual(POINT_REWARDS.INITIAL_BONUS);
  });

  test('First-ever record awards +5 P', () => {
    const store = useFeatureUnlockStore.getState();
    const result = store.markFeatureRecorded('nutrition', '2026/08/26');

    expect(result.isFirstEver).toBe(true);
    expect(result.pointsAwarded).toBe(POINT_REWARDS.FIRST_RECORD_BONUS); // 5P

    const updated = useFeatureUnlockStore.getState();
    expect(updated.pointsBalance).toBe(5 + 5); // 10P
    expect(updated.firstRecordedFeatures).toContain('nutrition');
  });

  test('Daily record on same feature awards +1 P (not first ever)', () => {
    const store = useFeatureUnlockStore.getState();
    // 1st day record
    store.markFeatureRecorded('water', '2026/08/25');
    const balanceAfterDay1 = useFeatureUnlockStore.getState().pointsBalance;

    // 2nd day record on same feature
    const result2 = store.markFeatureRecorded('water', '2026/08/26');
    expect(result2.isFirstEver).toBe(false);
    expect(result2.isFirstToday).toBe(true);
    expect(result2.pointsAwarded).toBe(POINT_REWARDS.DAILY_RECORD_BONUS); // 1P

    const updated = useFeatureUnlockStore.getState();
    expect(updated.pointsBalance).toBe(balanceAfterDay1 + 1);
  });

  test('Second record on the same feature on the SAME day awards 0 P', () => {
    const store = useFeatureUnlockStore.getState();
    // 1st time today
    store.markFeatureRecorded('water', '2026/08/26');
    const balanceAfterFirst = useFeatureUnlockStore.getState().pointsBalance;

    // 2nd time today
    const result2 = store.markFeatureRecorded('water', '2026/08/26');
    expect(result2.isFirstToday).toBe(false);
    expect(result2.pointsAwarded).toBe(0);

    const updated = useFeatureUnlockStore.getState();
    expect(updated.pointsBalance).toBe(balanceAfterFirst);
  });

  test('Workout complete awards +2 P', () => {
    const store = useFeatureUnlockStore.getState();
    store.awardPoints(POINT_REWARDS.WORKOUT_COMPLETE, 'workout_complete', 'ワークアウト完了');

    const updated = useFeatureUnlockStore.getState();
    expect(updated.pointsBalance).toBe(5 + POINT_REWARDS.WORKOUT_COMPLETE); // 7P
  });

  test('Unlock feature consumes points if sufficient', () => {
    const store = useFeatureUnlockStore.getState();
    // Give 15 P (enough for 3rd feature which costs 10P)
    useFeatureUnlockStore.setState({ pointsBalance: 15 });

    const cost = getUnlockCost(2); // 10P
    expect(cost).toBe(10);

    const success = store.unlockFeature('nutrition');
    expect(success).toBe(true);

    const updated = useFeatureUnlockStore.getState();
    expect(updated.unlockedFeatures).toContain('nutrition');
    expect(updated.pointsBalance).toBe(15 - 10); // 5P
    expect(updated.pendingUnlockFeature).toBe('nutrition');
  });

  test('Unlock feature fails if points are insufficient', () => {
    const store = useFeatureUnlockStore.getState();
    // Set 5 P (not enough for 10P)
    useFeatureUnlockStore.setState({ pointsBalance: 5 });

    const success = store.unlockFeature('nutrition');
    expect(success).toBe(false);

    const updated = useFeatureUnlockStore.getState();
    expect(updated.unlockedFeatures).not.toContain('nutrition');
    expect(updated.pointsBalance).toBe(5); // Unchanged
  });

  test('Premium / Early Adopter always has all features unlocked', () => {
    const unlockedList: ('workout' | 'water')[] = ['workout', 'water'];
    const forceUnlock = false;

    // Basic user: only unlockedList
    expect(isFeatureUnlockedHelper('workout', unlockedList, forceUnlock, false, false)).toBe(true);
    expect(isFeatureUnlockedHelper('nutrition', unlockedList, forceUnlock, false, false)).toBe(false);

    // Premium user: all unlocked
    expect(isFeatureUnlockedHelper('nutrition', unlockedList, forceUnlock, true, false)).toBe(true);
    expect(isFeatureUnlockedHelper('voice_ai', unlockedList, forceUnlock, true, false)).toBe(true);

    // Early Adopter: all unlocked
    expect(isFeatureUnlockedHelper('nutrition', unlockedList, forceUnlock, false, true)).toBe(true);
  });
});
