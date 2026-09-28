import { useWorkoutStore } from '../src/store/workoutStore';

// Mock timer utils
jest.mock('../src/utils/timer', () => ({
  scheduleRestTimer: jest.fn(),
  cancelRestTimer: jest.fn(),
}));

describe('WorkoutStore - Exercise Specific Rest Timer', () => {
  beforeEach(() => {
    useWorkoutStore.getState().resetWorkoutState();
    jest.clearAllMocks();
  });

  it('prioritizes exercise rest_seconds when individualRestEnabled is true', () => {
    const store = useWorkoutStore.getState();
    store.startWorkout('Test Workout');

    // Add exercise with custom rest_seconds = 120
    store.addExercise({
      id: 1,
      name: 'ベンチプレス',
      rest_seconds: 120,
    });

    const ex = useWorkoutStore.getState().exercises[0];
    expect(ex).toBeDefined();
    expect(ex.rest_seconds).toBe(120);

    const firstSet = ex.sets[0];

    // Toggle set complete with individualRestEnabled = true
    useWorkoutStore.getState().toggleSetComplete(ex.id, firstSet.id, {
      autoRest: true,
      defaultRest: 90,
      timerNotification: false,
      timerVibrate: false,
      individualRestEnabled: true,
    });

    const updatedTimer = useWorkoutStore.getState().restTimer;
    expect(updatedTimer.isActive).toBe(true);
    expect(updatedTimer.remaining).toBe(120);
  });

  it('uses defaultRest when individualRestEnabled is false even if exercise has custom rest_seconds', () => {
    const store = useWorkoutStore.getState();
    store.startWorkout('Test Workout');

    store.addExercise({
      id: 2,
      name: 'スクワット',
      rest_seconds: 180,
    });

    const ex = useWorkoutStore.getState().exercises[0];
    const firstSet = ex.sets[0];

    // Toggle set complete with individualRestEnabled = false
    useWorkoutStore.getState().toggleSetComplete(ex.id, firstSet.id, {
      autoRest: true,
      defaultRest: 90,
      timerNotification: false,
      timerVibrate: false,
      individualRestEnabled: false,
    });

    const updatedTimer = useWorkoutStore.getState().restTimer;
    expect(updatedTimer.isActive).toBe(true);
    expect(updatedTimer.remaining).toBe(90);
  });

  it('uses defaultRest when exercise has no custom rest_seconds (null) even if individualRestEnabled is true', () => {
    const store = useWorkoutStore.getState();
    store.startWorkout('Test Workout');

    store.addExercise({
      id: 3,
      name: '懸垂',
      rest_seconds: null,
    });

    const ex = useWorkoutStore.getState().exercises[0];
    const firstSet = ex.sets[0];

    useWorkoutStore.getState().toggleSetComplete(ex.id, firstSet.id, {
      autoRest: true,
      defaultRest: 60,
      timerNotification: false,
      timerVibrate: false,
      individualRestEnabled: true,
    });

    const updatedTimer = useWorkoutStore.getState().restTimer;
    expect(updatedTimer.isActive).toBe(true);
    expect(updatedTimer.remaining).toBe(60);
  });

  it('correctly updates exercise rest_seconds via updateExerciseRestSeconds', () => {
    const store = useWorkoutStore.getState();
    store.startWorkout('Test Workout');

    store.addExercise({
      id: 4,
      name: 'ダンベルカール',
      rest_seconds: null,
    });

    // Update by exercise DB ID
    useWorkoutStore.getState().updateExerciseRestSeconds(4, 45);
    let ex = useWorkoutStore.getState().exercises[0];
    expect(ex.rest_seconds).toBe(45);

    // Update by session UUID
    useWorkoutStore.getState().updateExerciseRestSeconds(ex.id, 60);
    ex = useWorkoutStore.getState().exercises[0];
    expect(ex.rest_seconds).toBe(60);
  });

  it('does NOT record 0 seconds for work_seconds when first set completed without starting timer', () => {
    const store = useWorkoutStore.getState();
    store.startWorkout('Test Workout');

    store.addExercise({
      id: 5,
      name: 'ベンチプレス',
    });

    const ex = useWorkoutStore.getState().exercises[0];
    const firstSet = ex.sets[0];

    // Toggle set complete directly without beginWorkoutTimer
    useWorkoutStore.getState().toggleSetComplete(ex.id, firstSet.id);

    const updatedEx = useWorkoutStore.getState().exercises[0];
    const completedSet = updatedEx.sets[0];

    expect(completedSet.is_completed).toBe(true);
    // Crucial: work_seconds must be null, never 0
    expect(completedSet.work_seconds).toBeNull();
    // But workout timer should now be started for subsequent sets
    expect(useWorkoutStore.getState().isWorkoutStarted).toBe(true);
    expect(useWorkoutStore.getState().startTime).not.toBeNull();
  });
});
