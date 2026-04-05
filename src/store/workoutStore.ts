import { create } from 'zustand';

export type SetRecord = {
  id: string; // temp id for UI
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  prev_weight?: number | null;
  prev_reps?: number | null;
  completedAt?: number;
  is_completed: boolean;
};

export type ActiveExercise = {
  id: string; // temp id string for active session
  exercise_id: number; // DB ID
  name: string;
  sets: SetRecord[];
};

interface WorkoutState {
  isActive: boolean;
  startTime: string | null;
  title: string | null;
  exercises: ActiveExercise[];
  startWorkout: (title: string) => void;
  endWorkout: () => void;
  addExercise: (exercise: { id: number, name: string, previousSets?: any[] }) => void;
  addSet: (exerciseId: string) => void;
  updateSet: (exerciseId: string, setId: string, changes: Partial<SetRecord>) => void;
  toggleSetComplete: (exerciseId: string, setId: string) => void;

  // Rest Timer
  restTimer: {
    isActive: boolean;
    remaining: number;
  };
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  adjustRestTimer: (seconds: number) => void;
  tickRestTimer: () => void;

  // Application Settings
  settings: {
    defaultRest: number;
    autoRest: boolean;
  };
  loadSettings: (defaultRest: number, autoRest: boolean) => void;

  // Routine Draft Mode
  draftRoutine: {
    title: string;
    exercises: { id: number; name: string }[];
  };
  updateDraftTitle: (title: string) => void;
  addDraftExercise: (exercise: { id: number; name: string }) => void;
  removeDraftExercise: (index: number) => void;
  clearDraft: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  isActive: false,
  startTime: null,
  title: null,
  exercises: [],
  restTimer: { isActive: false, remaining: 0 },

  settings: {
    defaultRest: 90,
    autoRest: true
  },

  loadSettings: (defaultRest: number, autoRest: boolean) => set({
    settings: { defaultRest, autoRest }
  }),

  draftRoutine: { title: '', exercises: [] },

  startWorkout: (title) => set({
    isActive: true,
    startTime: new Date().toISOString(),
    title,
    exercises: [],
    restTimer: { isActive: false, remaining: 0 }
  }),

  endWorkout: () => set({
    isActive: false,
    startTime: null,
    title: null,
    exercises: [],
    restTimer: { isActive: false, remaining: 0 }
  }),

  addExercise: (exercise) => set((state) => {
    // Scaffold initial sets. If we have previous sets, create empty sets matching their count with prev data.
    // Otherwise, create a single empty default set.
    let initialSets: SetRecord[] = [];
    if (exercise.previousSets && exercise.previousSets.length > 0) {
      initialSets = exercise.previousSets.map((prev, idx) => ({
        id: Math.random().toString(36).substring(7),
        set_number: idx + 1,
        weight: null,
        reps: null,
        prev_weight: prev.weight,
        prev_reps: prev.reps,
        rpe: null,
        is_completed: false
      }));
    } else {
      initialSets = [{ 
        id: Math.random().toString(36).substring(7), 
        set_number: 1, 
        weight: null, 
        reps: null, 
        rpe: null, 
        is_completed: false 
      }];
    }

    return {
      exercises: [
        ...state.exercises,
        {
          id: Math.random().toString(36).substring(7),
          exercise_id: exercise.id,
          name: exercise.name,
          sets: initialSets
        }
      ]
    };
  }),

  addSet: (exerciseId) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSetNum = lastSet ? lastSet.set_number + 1 : 1;
        return {
          ...ex,
          sets: [...ex.sets, {
            id: Math.random().toString(36).substring(7),
            set_number: newSetNum,
            weight: lastSet ? lastSet.weight : null, // copy previous set weight optionally
            reps: lastSet ? lastSet.reps : null,
            rpe: null,
            is_completed: false
          }]
        };
      }
      return ex;
    })
  })),

  updateSet: (exerciseId, setId, changes) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, ...changes } : s)
        };
      }
      return ex;
    })
  })),

  toggleSetComplete: (exerciseId, setId) => {
    const state = get();
    const ex = state.exercises.find((e: any) => e.id === exerciseId);
    const sRecord = ex?.sets.find((s: any) => s.id === setId);
    const willBeCompleted = sRecord ? !sRecord.is_completed : false;

    set((state) => ({
      exercises: state.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map(s => {
              if (s.id === setId) {
                return { ...s, is_completed: willBeCompleted, completedAt: willBeCompleted ? Date.now() : undefined };
              }
              return s;
            })
          };
        }
        return ex;
      })
    }));

    if (willBeCompleted && get().settings.autoRest) {
      get().startRestTimer(get().settings.defaultRest);
    }
  },

  startRestTimer: (seconds) => set({
    restTimer: { isActive: true, remaining: seconds }
  }),
  stopRestTimer: () => set({
    restTimer: { isActive: false, remaining: 0 }
  }),
  adjustRestTimer: (seconds) => set((state) => ({
    restTimer: { 
      isActive: state.restTimer.isActive, 
      remaining: Math.max(0, state.restTimer.remaining + seconds) 
    }
  })),
  tickRestTimer: () => set((state) => {
    if (!state.restTimer.isActive) return state;
    const nextRemaining = state.restTimer.remaining - 1;
    if (nextRemaining <= 0) {
      return { restTimer: { isActive: false, remaining: 0 } };
    }
    return { restTimer: { isActive: true, remaining: nextRemaining } };
  }),

  // Draft routine actions
  updateDraftTitle: (title) => set((state) => ({
    draftRoutine: { ...state.draftRoutine, title }
  })),
  addDraftExercise: (exercise) => set((state) => ({
    draftRoutine: { ...state.draftRoutine, exercises: [...state.draftRoutine.exercises, exercise] }
  })),
  removeDraftExercise: (index) => set((state) => ({
    draftRoutine: { 
      ...state.draftRoutine, 
      exercises: state.draftRoutine.exercises.filter((_, i) => i !== index) 
    }
  })),
  clearDraft: () => set({
    draftRoutine: { title: '', exercises: [] }
  })
}));
