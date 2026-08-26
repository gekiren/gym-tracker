import {
  calculateRM,
  computeCalories,
  computeAchievements,
  computeStreaks,
  computeWeeklyWorkoutCount,
  WorkoutExercise,
  PastSet,
  DBWorkout
} from '../src/utils/workoutStats';

describe('workoutStats - calculateRM', () => {
  it('returns null if weight or reps is null', () => {
    expect(calculateRM(null, 10)).toBeNull();
    expect(calculateRM(50, null)).toBeNull();
    expect(calculateRM(null, null)).toBeNull();
  });

  it('returns null if reps is less than 1', () => {
    expect(calculateRM(50, 0)).toBeNull();
    expect(calculateRM(50, -5)).toBeNull();
  });

  it('returns the weight itself if reps is 1', () => {
    expect(calculateRM(100, 1)).toBe(100);
    expect(calculateRM(72.5, 1)).toBe(72.5);
  });

  it('calculates 1RM correctly for reps > 1 using OConner/Epley formula', () => {
    // formula: Math.round(weight * (1 + (reps / 30)))
    // 100kg * (1 + 10/30) = 100 * 1.3333 = 133.33 -> 133
    expect(calculateRM(100, 10)).toBe(133);
    // 60kg * (1 + 5/30) = 60 * 1.1666 = 70
    expect(calculateRM(60, 5)).toBe(70);
  });
});

describe('workoutStats - computeCalories', () => {
  const dummyExercises: WorkoutExercise[] = [
    {
      id: 'ex-1',
      name: 'Bench Press',
      sets: [
        { id: 's-1', weight: 80, reps: 8, is_completed: true, work_seconds: 45, rest_seconds: 90 },
        { id: 's-2', weight: 80, reps: 8, is_completed: true, work_seconds: 45, rest_seconds: 90 },
        { id: 's-3', weight: 80, reps: 8, is_completed: false, work_seconds: 45, rest_seconds: 90 }, // 未完了セットはカウントされない
      ]
    },
    {
      id: 'ex-2',
      name: 'Squat',
      sets: [
        { id: 's-4', weight: 100, reps: 5, is_completed: true, work_seconds: 60, rest_seconds: 120 }
      ]
    }
  ];

  it('computes calories correctly for kg unit', () => {
    // Total Work = 45 + 45 + 60 = 150s (0.04167 hours)
    // Total Rest = 90 + 90 + 120 = 300s (0.08333 hours)
    // Formula: ((work_hours * 6.0 * bw) + (rest_hours * 1.5 * bw))
    // BW = 80kg
    // Work Cal = (150/3600) * 6 * 80 = 20
    // Rest Cal = (300/3600) * 1.5 * 80 = 10
    // Total = 30
    expect(computeCalories(dummyExercises, 80, 'kg')).toBe(30);
  });

  it('computes calories correctly for lbs unit (converting to kg)', () => {
    // BW = 176.37 lbs (~80kg)
    // 176.37 * 0.453592 = 80.00002 kg
    // Work Cal = (150/3600) * 6 * 80 = 20
    // Rest Cal = (300/3600) * 1.5 * 80 = 10
    // Total = 30
    expect(computeCalories(dummyExercises, 176.37, 'lbs')).toBe(30);
  });

  it('falls back to 70kg if bodyWeight is 0 or null', () => {
    // BW = 70kg
    // Work Cal = (150/3600) * 6 * 70 = 17.5
    // Rest Cal = (300/3600) * 1.5 * 70 = 8.75
    // Total = 26.25 -> round to 26
    expect(computeCalories(dummyExercises, 0, 'kg')).toBe(26);
  });
});

describe('workoutStats - computeAchievements', () => {
  it('identifies new 1RM and Volume achievements', () => {
    const exercises: WorkoutExercise[] = [
      {
        id: 'ex-1',
        exercise_id: 10,
        name: 'Bench Press',
        sets: [
          { id: 's-1', weight: 100, reps: 5, is_completed: true } // 1RM = 100 * (1 + 5/30) = 117kg, Vol = 500kg
        ]
      }
    ];

    const pastSets: PastSet[] = [
      { exercise_id: 10, weight: 95, reps: 5, workout_id: 1 }, // Past 1RM = 95 * 1.167 = 111kg, Past Vol = 475kg
    ];

    const result = computeAchievements(exercises, pastSets, 70);
    expect(result.updated1RMs).toHaveLength(1);
    expect(result.updated1RMs[0]).toEqual({ name: 'Bench Press', oldVal: 111, newVal: 117 });
    expect(result.updatedVolumes).toHaveLength(1);
    expect(result.updatedVolumes[0]).toEqual({ name: 'Bench Press', oldVal: 475, newVal: 500 });
  });

  it('adds bodyweight to volume calculation for bodyweight exercises', () => {
    const exercises: WorkoutExercise[] = [
      {
        id: 'ex-1',
        exercise_id: 20,
        name: 'Pull Up',
        equipment: '自重',
        sets: [
          { id: 's-1', weight: 10, reps: 8, is_completed: true } // Vol = (10 + 70) * 8 = 640kg
        ]
      }
    ];

    const pastSets: PastSet[] = [
      { exercise_id: 20, weight: 0, reps: 8, workout_id: 1 }, // Past Vol = (0 + 70) * 8 = 560kg
    ];

    const result = computeAchievements(exercises, pastSets, 70);
    expect(result.updatedVolumes).toHaveLength(1);
    expect(result.updatedVolumes[0]).toEqual({ name: 'Pull Up', oldVal: 560, newVal: 640 });
  });

  it('returns empty lists if no achievements are updated', () => {
    const exercises: WorkoutExercise[] = [
      {
        id: 'ex-1',
        exercise_id: 10,
        name: 'Bench Press',
        sets: [
          { id: 's-1', weight: 90, reps: 5, is_completed: true } // 1RM = 105kg
        ]
      }
    ];

    const pastSets: PastSet[] = [
      { exercise_id: 10, weight: 100, reps: 5, workout_id: 1 }, // Past 1RM = 117kg
    ];

    const result = computeAchievements(exercises, pastSets, 70);
    expect(result.updated1RMs).toHaveLength(0);
    expect(result.updatedVolumes).toHaveLength(0);
  });
});

describe('workoutStats - computeStreaks', () => {
  // Mock Date for consistent testing of computeStreaks which checks against new Date()
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-20T12:00:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('calculates streaks correctly', () => {
    // Current date is 2026-06-20 (Saturday)
    const dbWorkouts: DBWorkout[] = [
      { start_time: '2026-06-20T08:00:00' },
      { start_time: '2026-06-19T18:00:00' },
      { start_time: '2026-06-18T09:00:00' },
      { start_time: '2026-06-16T12:00:00' }, // 17th skipped, but within 7 days
      { start_time: '2026-06-10T10:00:00' }, // within 7 days of 16th
    ];

    const { streakDays, streakWeeks } = computeStreaks(dbWorkouts);
    // 20th(today), 19th(yesterday), 18th(day before) -> 3 continuous days
    expect(streakDays).toBe(3);

    // 20 -> 19 -> 18 -> 16 -> 10:
    // Span is from 2026-06-10 to 2026-06-20 (10 days span)
    // 10 days / 7 = 1.4 -> Math.floor(1.4) + 1 = 2 weeks
    expect(streakWeeks).toBe(2);
  });

  it('returns 1 day and 1 week streak if no past workouts', () => {
    const { streakDays, streakWeeks } = computeStreaks([]);
    expect(streakDays).toBe(1); // Today is counted
    expect(streakWeeks).toBe(1);
  });
});

describe('workoutStats - computeWeeklyWorkoutCount', () => {
  it('calculates weekly workout count correctly', () => {
    // base date is 2026-06-20 (Saturday)
    const currentWorkoutStartTime = '2026-06-20T08:00:00';
    const dbWorkouts: DBWorkout[] = [
      { start_time: '2026-06-19T18:00:00' }, // yesterday (in window)
      { start_time: '2026-06-18T09:00:00' }, // 2 days ago (in window)
      { start_time: '2026-06-16T12:00:00' }, // 4 days ago (in window)
      { start_time: '2026-06-14T10:00:00' }, // 6 days ago (in window)
      { start_time: '2026-06-13T10:00:00' }, // 7 days ago (out of window: window is 2026-06-14 to 2026-06-20)
      { start_time: '2026-06-10T10:00:00' }, // out of window
    ];

    // Current workout (1) + 4 in window = 5 workouts
    const count = computeWeeklyWorkoutCount(dbWorkouts, currentWorkoutStartTime);
    expect(count).toBe(5);
  });

  it('handles multiple workouts on the same day correctly counting unique days', () => {
    const currentWorkoutStartTime = '2026-06-20T18:00:00';
    const dbWorkouts: DBWorkout[] = [
      { start_time: '2026-06-20T08:00:00' }, // today, earlier workout
      { start_time: '2026-06-19T10:00:00' }, // yesterday
    ];

    // Today (2026-06-20) has 2 workouts, Yesterday (2026-06-19) has 1 workout -> Unique 2 days
    const count = computeWeeklyWorkoutCount(dbWorkouts, currentWorkoutStartTime);
    expect(count).toBe(2);
  });

  it('returns 1 if there are no past workouts', () => {
    const currentWorkoutStartTime = '2026-06-20T08:00:00';
    const count = computeWeeklyWorkoutCount([], currentWorkoutStartTime);
    expect(count).toBe(1);
  });
});

