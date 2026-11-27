import { calculateEffective1RM, computeAchievements, computeCalories, calculateWorkoutPRStats } from '../workoutStats';
import { resolveWarmupThreshold, isAutoWarmupWeight, getDisplaySetLabel } from '../warmupUtils';

describe('calculateEffective1RM (Model B, k=0.10)', () => {
  it('returns null for empty, zero-weight, zero-rep, or warmup-only sets', () => {
    expect(calculateEffective1RM([])).toBeNull();
    expect(calculateEffective1RM([{ weight: 0, reps: 10 }])).toBeNull();
    expect(calculateEffective1RM([{ weight: 100, reps: 0 }])).toBeNull();
    expect(calculateEffective1RM([{ weight: null, reps: 10 }])).toBeNull();
    expect(calculateEffective1RM([{ weight: 60, reps: 10, is_warmup: true }])).toBeNull();
  });

  it('matches standard e1RM for a single working set (ln(1) = 0)', () => {
    // 100kg x 1 -> 100.0
    expect(calculateEffective1RM([{ weight: 100, reps: 1 }])).toBe(100);
    // 90kg x 8 -> 90 * (1 + 8/30) = 114.0
    expect(calculateEffective1RM([{ weight: 90, reps: 8 }])).toBe(114);
  });

  it('rewards multi-set rep maintenance/increase in straight sets', () => {
    // 3 sets of 90kg x 8: maxE1RM = 114, effectiveSets = 3, 114 * (1 + 0.1 * ln(3)) = 126.52... -> 126.5
    const straight3x8 = calculateEffective1RM([
      { weight: 90, reps: 8 },
      { weight: 90, reps: 8 },
      { weight: 90, reps: 8 },
    ]);
    // 90kg x 8, 7, 6: maxE1RM = 114, totalVol = 90*21=1890, maxVol = 720, effectiveSets = 2.625
    const decay876 = calculateEffective1RM([
      { weight: 90, reps: 8 },
      { weight: 90, reps: 7 },
      { weight: 90, reps: 6 },
    ]);
    expect(straight3x8).toBe(126.5);
    expect(decay876).toBe(125.0);
    expect(straight3x8!).toBeGreaterThan(decay876!);
  });

  it('excludes warmup sets from effective 1RM calculation', () => {
    const withoutWarmup = calculateEffective1RM([
      { weight: 90, reps: 8 },
      { weight: 90, reps: 8 },
    ]);
    const withWarmup = calculateEffective1RM([
      { weight: 40, reps: 10, is_warmup: true },
      { weight: 60, reps: 5, is_warmup: 1 },
      { weight: 90, reps: 8, is_warmup: false },
      { weight: 90, reps: 8, is_warmup: 0 },
    ]);
    expect(withWarmup).toBe(withoutWarmup);
  });

  it('handles mixed weights cleanly', () => {
    const res = calculateEffective1RM([
      { weight: 100, reps: 5 }, // e1RM = 116.6667, vol = 500
      { weight: 90, reps: 8 },  // e1RM = 114, vol = 720 (maxVol)
    ]);
    // maxE1RM = 116.6667, effectiveSets = 1220 / 720 = 1.69444
    // 116.6667 * (1 + 0.1 * ln(1.69444)) = 122.818 -> 122.8
    expect(res).toBe(122.8);
  });
});

describe('warmupUtils', () => {
  it('resolves exercise threshold over global threshold, including explicit 0 (OFF)', () => {
    expect(resolveWarmupThreshold(null, 60)).toBe(60);
    expect(resolveWarmupThreshold(undefined, 60)).toBe(60);
    expect(resolveWarmupThreshold(50, 60)).toBe(50);
    expect(resolveWarmupThreshold(0, 60)).toBe(0);
  });

  it('detects auto-warmup weight boundaries accurately', () => {
    // max1RM = 100, threshold = 60% -> <= 60 is warmup
    expect(isAutoWarmupWeight(60, 100, 60)).toBe(true);
    expect(isAutoWarmupWeight(59.5, 100, 60)).toBe(true);
    expect(isAutoWarmupWeight(60.5, 100, 60)).toBe(false);
    // threshold 0 (OFF) or missing max1RM or weight <= 0 -> false
    expect(isAutoWarmupWeight(40, 100, 0)).toBe(false);
    expect(isAutoWarmupWeight(40, null, 60)).toBe(false);
    expect(isAutoWarmupWeight(0, 100, 60)).toBe(false);
  });

  it('generates W and sequential working set labels (including unilateral)', () => {
    const sets = [
      { is_warmup: true },
      { is_warmup: true },
      { is_warmup: false },
      { is_warmup: false },
      { is_warmup: false },
    ];
    expect(getDisplaySetLabel(sets, 0, true)).toBe('W');
    expect(getDisplaySetLabel(sets, 1, true)).toBe('W');
    expect(getDisplaySetLabel(sets, 2, true)).toBe('1');
    expect(getDisplaySetLabel(sets, 3, true)).toBe('2');
    expect(getDisplaySetLabel(sets, 4, true)).toBe('3');
    // When warmup feature is disabled, normal sequential numbers
    expect(getDisplaySetLabel(sets, 0, false)).toBe('1');
    expect(getDisplaySetLabel(sets, 2, false)).toBe('3');

    const uniSets = [
      { is_warmup: true, side: 'L' },
      { is_warmup: true, side: 'R' },
      { is_warmup: false, side: 'L' },
      { is_warmup: false, side: 'R' },
      { is_warmup: false, side: 'L' },
    ];
    expect(getDisplaySetLabel(uniSets, 0, true)).toBe('W');
    expect(getDisplaySetLabel(uniSets, 2, true)).toBe('1');
    expect(getDisplaySetLabel(uniSets, 3, true)).toBe('1');
    expect(getDisplaySetLabel(uniSets, 4, true)).toBe('2');
  });
});

describe('workoutStats warmup exclusions', () => {
  it('excludes warmup sets from calories, achievements, and PR stats', () => {
    const exercises = [
      {
        id: 'ex-1',
        exercise_id: 1,
        name: 'ベンチプレス',
        sets: [
          { id: 's1', weight: 120, reps: 10, is_completed: true, is_warmup: true, work_seconds: 60, rest_seconds: 60 },
          { id: 's2', weight: 80, reps: 8, is_completed: true, is_warmup: false, work_seconds: 30, rest_seconds: 60 },
        ],
      },
    ];
    const cal = computeCalories(exercises, 70, 'kg');
    const calWorkingOnly = computeCalories(
      [{ ...exercises[0], sets: [exercises[0].sets[1]] }],
      70,
      'kg'
    );
    expect(cal).toBe(calWorkingOnly);

    const ach = computeAchievements(
      exercises,
      [{ workout_id: 10, exercise_id: 1, weight: 80, reps: 10 }],
      70
    );
    expect(ach.updated1RMs).toHaveLength(0);
    expect(ach.updatedVolumes).toHaveLength(0);

    const prStats = calculateWorkoutPRStats([
      { workout_id: 1, exercise_id: 1, weight: 200, reps: 10, is_warmup: 1 },
      { workout_id: 1, exercise_id: 1, weight: 80, reps: 10, is_warmup: 0 },
    ]);
    expect(prStats[1].actualVolume).toBe(800);
  });
});
