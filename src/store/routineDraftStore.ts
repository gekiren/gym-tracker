import { create } from 'zustand';

export interface DraftExerciseSet {
  id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  side?: 'L' | 'R' | null;
  variation?: string | null;
}

export interface DraftExercise {
  id: number;
  name: string;
  is_unilateral?: number;
  equipment?: string;
  sets: DraftExerciseSet[];
}

export interface RoutineDraftState {
  draftRoutine: {
    title: string;
    exercises: DraftExercise[];
  };
  updateDraftTitle: (title: string) => void;
  addDraftExercise: (exercise: { id: number; name: string; is_unilateral?: number; equipment?: string }) => void;
  removeDraftExercise: (index: number) => void;
  addDraftSet: (exerciseIndex: number) => void;
  removeDraftSet: (exerciseIndex: number, setIndex: number) => void;
  updateDraftSet: (exerciseIndex: number, setIndex: number, changes: Partial<DraftExerciseSet>) => void;
  setDraftRoutine: (title: string, exercises: any[]) => void;
  clearDraft: () => void;
}

export const useRoutineDraftStore = create<RoutineDraftState>((set) => ({
  draftRoutine: { title: '', exercises: [] },
  updateDraftTitle: (title) => set((state) => ({
    draftRoutine: { ...state.draftRoutine, title }
  })),
  addDraftExercise: (exercise) => set((state) => {
    const defaultSet: DraftExerciseSet = {
      id: Math.random().toString(36).substring(7),
      set_number: 1,
      weight: null,
      reps: null,
      rpe: null
    };
    const enrichedExercise: DraftExercise = {
      id: exercise.id,
      name: exercise.name,
      is_unilateral: exercise.is_unilateral,
      equipment: exercise.equipment,
      sets: [defaultSet]
    };
    return {
      draftRoutine: { ...state.draftRoutine, exercises: [...state.draftRoutine.exercises, enrichedExercise] }
    };
  }),
  removeDraftExercise: (index) => set((state) => ({
    draftRoutine: {
      ...state.draftRoutine,
      exercises: state.draftRoutine.exercises.filter((_, i) => i !== index)
    }
  })),
  addDraftSet: (exerciseIndex) => set((state) => {
    const nextExercises = state.draftRoutine.exercises.map((ex, idx) => {
      if (idx === exerciseIndex) {
        const lastSet = ex.sets[ex.sets.length - 1];
        const nextNum = lastSet ? lastSet.set_number + 1 : 1;
        const newSet: DraftExerciseSet = {
          id: Math.random().toString(36).substring(7),
          set_number: nextNum,
          weight: lastSet ? lastSet.weight : null,
          reps: lastSet ? lastSet.reps : null,
          rpe: lastSet ? lastSet.rpe : null
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    });
    return {
      draftRoutine: { ...state.draftRoutine, exercises: nextExercises }
    };
  }),
  removeDraftSet: (exerciseIndex, setIndex) => set((state) => {
    const nextExercises = state.draftRoutine.exercises.map((ex, idx) => {
      if (idx === exerciseIndex) {
        const remainingSets = ex.sets.filter((_, sIdx) => sIdx !== setIndex);
        const renumberedSets = remainingSets.map((s, sIdx) => ({
          ...s,
          set_number: sIdx + 1
        }));
        return { ...ex, sets: renumberedSets };
      }
      return ex;
    });
    return {
      draftRoutine: { ...state.draftRoutine, exercises: nextExercises }
    };
  }),
  updateDraftSet: (exerciseIndex, setIndex, changes) => set((state) => {
    const nextExercises = state.draftRoutine.exercises.map((ex, idx) => {
      if (idx === exerciseIndex) {
        const nextSets = ex.sets.map((s, sIdx) => {
          if (sIdx === setIndex) {
            return { ...s, ...changes };
          }
          return s;
        });
        return { ...ex, sets: nextSets };
      }
      return ex;
    });
    return {
      draftRoutine: { ...state.draftRoutine, exercises: nextExercises }
    };
  }),
  setDraftRoutine: (title, exercises) => set({
    draftRoutine: { title, exercises }
  }),
  clearDraft: () => set({
    draftRoutine: { title: '', exercises: [] }
  })
}));
