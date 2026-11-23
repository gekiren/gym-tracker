import { buildInitialSetsForExercise } from '../src/utils/workoutSetBuilder';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useSettingsStore } from '../src/store/settingsStore';

jest.mock('../src/utils/timer', () => ({
  scheduleRestTimer: jest.fn(),
  cancelRestTimer: jest.fn(),
}));

describe('Workout Stance Settings & Inheritance', () => {
  beforeEach(() => {
    useWorkoutStore.getState().resetWorkoutState();
    useSettingsStore.getState().resetSettings();
    jest.clearAllMocks();
  });

  describe('buildInitialSetsForExercise (does NOT carry over previous workout stance)', () => {
    it('applies exercise default_stance instead of previous workout stance when alwaysOneSet is false', () => {
      const setsWithDefault = buildInitialSetsForExercise(
        {
          id: 1,
          name: 'ベンチプレス',
          default_stance: 'ナロー',
          default_variation: 'ナロー',
          previousSets: [
            { set_number: 1, weight: 80, reps: 10, rpe: 8, stance: 'ワイド', variation: 'ワイド' },
            { set_number: 2, weight: 85, reps: 8, rpe: 9, stance: 'スモウ', variation: 'スモウ' },
          ],
        },
        false
      );

      expect(setsWithDefault).toHaveLength(2);
      expect(setsWithDefault[0].prev_weight).toBe(80);
      expect(setsWithDefault[0].prev_reps).toBe(10);
      expect(setsWithDefault[0].stance).toBe('ナロー');
      expect(setsWithDefault[0].variation).toBe('ナロー');
      expect(setsWithDefault[1].prev_weight).toBe(85);
      expect(setsWithDefault[1].prev_reps).toBe(8);
      expect(setsWithDefault[1].stance).toBe('ナロー');
      expect(setsWithDefault[1].variation).toBe('ナロー');

      const setsWithoutDefault = buildInitialSetsForExercise(
        {
          id: 2,
          name: 'スクワット',
          default_stance: null,
          default_variation: null,
          previousSets: [
            { set_number: 1, weight: 100, reps: 5, rpe: 8, stance: 'ワイド', variation: 'ワイド' },
          ],
        },
        false
      );

      expect(setsWithoutDefault).toHaveLength(1);
      expect(setsWithoutDefault[0].prev_weight).toBe(100);
      expect(setsWithoutDefault[0].stance).toBeNull();
      expect(setsWithoutDefault[0].variation).toBeNull();
    });

    it('applies exercise default_stance instead of previous workout stance when alwaysOneSet is true (bilateral & unilateral)', () => {
      const bilateralSets = buildInitialSetsForExercise(
        {
          id: 3,
          name: 'デッドリフト',
          default_stance: 'スモウ',
          default_variation: 'スモウ',
          previousSets: [
            { set_number: 1, weight: 120, reps: 5, rpe: 8.5, stance: 'ナロー', variation: 'ナロー' },
          ],
        },
        true
      );

      expect(bilateralSets).toHaveLength(1);
      expect(bilateralSets[0].prev_weight).toBe(120);
      expect(bilateralSets[0].stance).toBe('スモウ');
      expect(bilateralSets[0].variation).toBe('スモウ');

      const unilateralSets = buildInitialSetsForExercise(
        {
          id: 4,
          name: 'ブルガリアンスクワット',
          is_unilateral: 1,
          default_stance: 'ワイド',
          default_variation: 'ワイド',
          previousSets: [
            { set_number: 1, side: 'L', weight: 20, reps: 10, rpe: 8, stance: 'ナロー', variation: 'ナロー' },
            { set_number: 1, side: 'R', weight: 20, reps: 10, rpe: 8, stance: 'ナロー', variation: 'ナロー' },
          ],
        },
        true
      );

      expect(unilateralSets).toHaveLength(2);
      expect(unilateralSets[0].side).toBe('L');
      expect(unilateralSets[0].prev_weight).toBe(20);
      expect(unilateralSets[0].stance).toBe('ワイド');
      expect(unilateralSets[0].variation).toBe('ワイド');
      expect(unilateralSets[1].side).toBe('R');
      expect(unilateralSets[1].prev_weight).toBe(20);
      expect(unilateralSets[1].stance).toBe('ワイド');
      expect(unilateralSets[1].variation).toBe('ワイド');
    });

    it('preserves routineSets stance and does not carry over previousSets stance', () => {
      const routineSets = buildInitialSetsForExercise(
        {
          id: 5,
          name: 'ベンチプレス',
          default_stance: 'ナロー',
          previousSets: [
            { set_number: 1, weight: 90, reps: 5, rpe: 9, stance: 'ワイド', variation: 'ワイド' },
          ],
          routineSets: [
            { set_number: 1, weight: 80, reps: 10, rpe: 8, stance: 'トップセット', variation: 'トップセット' },
            { set_number: 2, weight: 70, reps: 12, rpe: 8, stance: null, variation: null },
          ],
        },
        false
      );

      expect(routineSets).toHaveLength(2);
      expect(routineSets[0].stance).toBe('トップセット');
      expect(routineSets[0].variation).toBe('トップセット');
      expect(routineSets[1].stance).toBeNull();
      expect(routineSets[1].variation).toBeNull();
    });
  });

  describe('useWorkoutStore.addSet stanceMode = default', () => {
    it('uses fixed default_stance even if the previous set stance was changed', () => {
      const store = useWorkoutStore.getState();
      store.startWorkout('Test');
      store.addExercise({
        id: 10,
        name: 'ベンチプレス',
        default_stance: 'ナロー',
        default_variation: 'ナロー',
      });

      const ex = useWorkoutStore.getState().exercises[0];
      useWorkoutStore.getState().updateSet(ex.id, ex.sets[0].id, { stance: 'ワイド', variation: 'ワイド' });

      useWorkoutStore.getState().addSet(ex.id, 'default');
      const sets = useWorkoutStore.getState().exercises[0].sets;
      expect(sets).toHaveLength(2);
      expect(sets[1].stance).toBe('ナロー');
      expect(sets[1].variation).toBe('ナロー');
    });

    it('uses null (standard) when default_stance is null even if previous set had a stance', () => {
      const store = useWorkoutStore.getState();
      store.startWorkout('Test');
      store.addExercise({
        id: 11,
        name: 'ベンチプレス',
        default_stance: null,
        default_variation: null,
      });

      const ex = useWorkoutStore.getState().exercises[0];
      useWorkoutStore.getState().updateSet(ex.id, ex.sets[0].id, { stance: 'ワイド', variation: 'ワイド' });

      useWorkoutStore.getState().addSet(ex.id, 'default');
      const sets = useWorkoutStore.getState().exercises[0].sets;
      expect(sets).toHaveLength(2);
      expect(sets[1].stance).toBeNull();
      expect(sets[1].variation).toBeNull();
    });

    it('uses fixed default_stance for both sides in unilateral exercises', () => {
      const store = useWorkoutStore.getState();
      store.startWorkout('Test');
      store.addExercise({
        id: 12,
        name: 'ワンハンドロウ',
        is_unilateral: 1,
        default_stance: 'ナロー',
        default_variation: 'ナロー',
      });

      const ex = useWorkoutStore.getState().exercises[0];
      useWorkoutStore.getState().updateSet(ex.id, ex.sets[0].id, { stance: 'ワイド', variation: 'ワイド' });
      useWorkoutStore.getState().updateSet(ex.id, ex.sets[1].id, { stance: null, variation: null });

      useWorkoutStore.getState().addSet(ex.id, 'default');
      const sets = useWorkoutStore.getState().exercises[0].sets;
      expect(sets).toHaveLength(4);
      expect(sets[2].side).toBe('L');
      expect(sets[2].stance).toBe('ナロー');
      expect(sets[2].variation).toBe('ナロー');
      expect(sets[3].side).toBe('R');
      expect(sets[3].stance).toBe('ナロー');
      expect(sets[3].variation).toBe('ナロー');
    });
  });

  describe('useWorkoutStore.addSet stanceMode = previous', () => {
    it('copies stance from the previous set', () => {
      const store = useWorkoutStore.getState();
      store.startWorkout('Test');
      store.addExercise({
        id: 20,
        name: 'ベンチプレス',
        default_stance: 'ナロー',
        default_variation: 'ナロー',
      });

      const ex = useWorkoutStore.getState().exercises[0];
      useWorkoutStore.getState().updateSet(ex.id, ex.sets[0].id, { stance: 'ワイド', variation: 'ワイド' });

      useWorkoutStore.getState().addSet(ex.id, 'previous');
      const sets = useWorkoutStore.getState().exercises[0].sets;
      expect(sets).toHaveLength(2);
      expect(sets[1].stance).toBe('ワイド');
      expect(sets[1].variation).toBe('ワイド');
    });

    it('copies null (standard) without falling back to default_stance when previous set was cleared to null', () => {
      const store = useWorkoutStore.getState();
      store.startWorkout('Test');
      store.addExercise({
        id: 21,
        name: 'ベンチプレス',
        default_stance: 'ナロー',
        default_variation: 'ナロー',
      });

      const ex = useWorkoutStore.getState().exercises[0];
      useWorkoutStore.getState().updateSet(ex.id, ex.sets[0].id, { stance: null, variation: null });

      useWorkoutStore.getState().addSet(ex.id, 'previous');
      const sets = useWorkoutStore.getState().exercises[0].sets;
      expect(sets).toHaveLength(2);
      expect(sets[1].stance).toBeNull();
      expect(sets[1].variation).toBeNull();
    });

    it('falls back to default_stance when all sets were removed before adding a set', () => {
      const store = useWorkoutStore.getState();
      store.startWorkout('Test');
      store.addExercise({
        id: 22,
        name: 'ベンチプレス',
        default_stance: 'ナロー',
        default_variation: 'ナロー',
      });

      const ex = useWorkoutStore.getState().exercises[0];
      useWorkoutStore.getState().removeSet(ex.id, ex.sets[0].id);
      expect(useWorkoutStore.getState().exercises[0].sets).toHaveLength(0);

      useWorkoutStore.getState().addSet(ex.id, 'previous');
      const sets = useWorkoutStore.getState().exercises[0].sets;
      expect(sets).toHaveLength(1);
      expect(sets[0].stance).toBe('ナロー');
      expect(sets[0].variation).toBe('ナロー');
    });

    it('copies side-matched previous stances for unilateral exercises', () => {
      const store = useWorkoutStore.getState();
      store.startWorkout('Test');
      store.addExercise({
        id: 23,
        name: 'ワンハンドロウ',
        is_unilateral: 1,
        default_stance: '標準カスタム',
        default_variation: '標準カスタム',
      });

      const ex = useWorkoutStore.getState().exercises[0];
      useWorkoutStore.getState().updateSet(ex.id, ex.sets[0].id, { stance: 'ワイド', variation: 'ワイド' });
      useWorkoutStore.getState().updateSet(ex.id, ex.sets[1].id, { stance: 'ナロー', variation: 'ナロー' });

      useWorkoutStore.getState().addSet(ex.id, 'previous');
      const sets = useWorkoutStore.getState().exercises[0].sets;
      expect(sets).toHaveLength(4);
      expect(sets[2].side).toBe('L');
      expect(sets[2].stance).toBe('ワイド');
      expect(sets[2].variation).toBe('ワイド');
      expect(sets[3].side).toBe('R');
      expect(sets[3].stance).toBe('ナロー');
      expect(sets[3].variation).toBe('ナロー');
    });
  });

  describe('useWorkoutStore.updateExerciseDefaultStance', () => {
    it('updates default_stance by DB ID or session UUID and reflects on subsequent addSet', () => {
      const store = useWorkoutStore.getState();
      store.startWorkout('Test');
      store.addExercise({
        id: 30,
        name: 'ベンチプレス',
        default_stance: null,
        default_variation: null,
      });

      const exId = useWorkoutStore.getState().exercises[0].id;

      // Update by DB exercise ID
      useWorkoutStore.getState().updateExerciseDefaultStance(30, 'ワイド');
      let ex = useWorkoutStore.getState().exercises[0];
      expect(ex.default_stance).toBe('ワイド');
      expect(ex.default_variation).toBe('ワイド');

      useWorkoutStore.getState().addSet(exId, 'default');
      expect(useWorkoutStore.getState().exercises[0].sets[1].stance).toBe('ワイド');

      // Update by session UUID to null (standard)
      useWorkoutStore.getState().updateExerciseDefaultStance(exId, null);
      ex = useWorkoutStore.getState().exercises[0];
      expect(ex.default_stance).toBeNull();
      expect(ex.default_variation).toBeNull();

      useWorkoutStore.getState().addSet(exId, 'default');
      expect(useWorkoutStore.getState().exercises[0].sets[2].stance).toBeNull();
    });
  });
});
