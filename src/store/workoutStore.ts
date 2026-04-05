import { create } from 'zustand';

export type SetRecord = {
  id: string; // temp id for UI
  set_number: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
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
  addExercise: (exercise: { id: number, name: string }) => void;
  addSet: (exerciseId: string) => void;
  updateSet: (exerciseId: string, setId: string, changes: Partial<SetRecord>) => void;
  toggleSetComplete: (exerciseId: string, setId: string) => void;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  isActive: false,
  startTime: null,
  title: null,
  exercises: [],

  startWorkout: (title) => set({
    isActive: true,
    startTime: new Date().toISOString(),
    title,
    exercises: []
  }),

  endWorkout: () => set({
    isActive: false,
    startTime: null,
    title: null,
    exercises: []
  }),

  addExercise: (exercise) => set((state) => ({
    exercises: [
      ...state.exercises,
      {
        id: Math.random().toString(36).substring(7),
        exercise_id: exercise.id,
        name: exercise.name,
        sets: [{ id: Math.random().toString(36).substring(7), set_number: 1, weight: null, reps: null, rpe: null, is_completed: false }]
      }
    ]
  })),

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

  toggleSetComplete: (exerciseId, setId) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === setId ? { ...s, is_completed: !s.is_completed } : s)
        };
      }
      return ex;
    })
  }))
}));
