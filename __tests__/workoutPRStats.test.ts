import { calculateWorkoutPRStats, RawWorkoutSetRow } from '../src/utils/workoutStats';

describe('workoutStats - calculateWorkoutPRStats', () => {
  it('should return empty object for empty rows', () => {
    expect(calculateWorkoutPRStats([])).toEqual({});
  });

  it('should calculate 100% PR ratio when current workout is the only/best workout', () => {
    // ユーザー提示データ:
    // Workout 1:
    // ベンチプレス (ex: 1): 50kg*3, 70kg*5, 70kg*5, 70kg*4, 70kg*3, 70kg*3
    // 懸垂 (ex: 2): 8, 8, 4, 3, 3, 3, 3 reps
    // OHP (ex: 3): 35kg*6, 35kg*4
    // デッドリフト (ex: 4): 60kg*3, 90kg*2, 110kg*3, 130kg*1
    const rows: RawWorkoutSetRow[] = [
      // Bench Press (Weight)
      { workout_id: 1, exercise_id: 1, weight: 50, reps: 3 },
      { workout_id: 1, exercise_id: 1, weight: 70, reps: 5 },
      { workout_id: 1, exercise_id: 1, weight: 70, reps: 5 },
      { workout_id: 1, exercise_id: 1, weight: 70, reps: 4 },
      { workout_id: 1, exercise_id: 1, weight: 70, reps: 3 },
      { workout_id: 1, exercise_id: 1, weight: 70, reps: 3 },
      // Pull-ups (Bodyweight)
      { workout_id: 1, exercise_id: 2, weight: 0, reps: 8 },
      { workout_id: 1, exercise_id: 2, weight: null, reps: 8 },
      { workout_id: 1, exercise_id: 2, weight: 0, reps: 4 },
      { workout_id: 1, exercise_id: 2, weight: 0, reps: 3 },
      { workout_id: 1, exercise_id: 2, weight: 0, reps: 3 },
      { workout_id: 1, exercise_id: 2, weight: 0, reps: 3 },
      { workout_id: 1, exercise_id: 2, weight: 0, reps: 3 },
      // OHP (Weight)
      { workout_id: 1, exercise_id: 3, weight: 35, reps: 6 },
      { workout_id: 1, exercise_id: 3, weight: 35, reps: 4 },
      // Deadlift (Weight)
      { workout_id: 1, exercise_id: 4, weight: 60, reps: 3 },
      { workout_id: 1, exercise_id: 4, weight: 90, reps: 2 },
      { workout_id: 1, exercise_id: 4, weight: 110, reps: 3 },
      { workout_id: 1, exercise_id: 4, weight: 130, reps: 1 },
    ];

    const result = calculateWorkoutPRStats(rows);
    expect(result[1]).toBeDefined();
    expect(result[1].workoutId).toBe(1);
    expect(result[1].actualVolume).toBe(2720); // 1550 + 0 + 350 + 820 = 2720
    expect(result[1].prRatio).toBe(100);
    expect(result[1].exercisePRDetails?.length).toBe(4);
    result[1].exercisePRDetails?.forEach(d => {
      expect(d.ratio).toBe(100);
    });
  });

  it('should calculate exercise-level PR ratio correctly against past best records', () => {
    const rows: RawWorkoutSetRow[] = [
      // Past Workout (id: 100): Past PRs
      // Bench: 70kg * 5 (RM: 82)
      { workout_id: 100, exercise_id: 1, weight: 70, reps: 5 },
      // Pull-ups: 10 reps (max: 10)
      { workout_id: 100, exercise_id: 2, weight: 0, reps: 10 },
      // OHP: 45kg * 1 (RM: 45)
      { workout_id: 100, exercise_id: 3, weight: 45, reps: 1 },
      // Deadlift: 140kg * 1 (RM: 140)
      { workout_id: 100, exercise_id: 4, weight: 140, reps: 1 },

      // Current Workout (id: 1):
      // Bench: 70kg * 5 (RM: 82) -> 100%
      { workout_id: 1, exercise_id: 1, weight: 70, reps: 5 },
      // Pull-ups: 8 reps -> 8 / 10 = 80.0%
      { workout_id: 1, exercise_id: 2, weight: 0, reps: 8 },
      // OHP: 35kg * 6 (RM: 42) -> 42 / 45 = 93.3%
      { workout_id: 1, exercise_id: 3, weight: 35, reps: 6 },
      // Deadlift: 130kg * 1 (RM: 130) -> 130 / 140 = 92.9%
      { workout_id: 1, exercise_id: 4, weight: 130, reps: 1 },
    ];

    const result = calculateWorkoutPRStats(rows);
    expect(result[1]).toBeDefined();

    // Average of [100, 80, 93.33, 92.86] = 91.5475 -> 91.5%
    expect(result[1].prRatio).toBeCloseTo(91.5, 1);

    const benchDetail = result[1].exercisePRDetails?.find(d => d.exerciseId === 1);
    expect(benchDetail?.ratio).toBe(100);
    expect(benchDetail?.isBodyweight).toBe(false);

    const pullUpDetail = result[1].exercisePRDetails?.find(d => d.exerciseId === 2);
    expect(pullUpDetail?.ratio).toBe(80);
    expect(pullUpDetail?.isBodyweight).toBe(true);

    const ohpDetail = result[1].exercisePRDetails?.find(d => d.exerciseId === 3);
    expect(ohpDetail?.ratio).toBe(93.3);

    const deadliftDetail = result[1].exercisePRDetails?.find(d => d.exerciseId === 4);
    expect(deadliftDetail?.ratio).toBe(92.9);
  });
});
