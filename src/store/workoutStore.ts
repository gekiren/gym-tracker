import { create } from 'zustand';
import { Vibration } from 'react-native';
import { scheduleRestTimer, cancelRestTimer } from '../utils/timer';

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
  rest_seconds?: number | null;
  work_seconds?: number | null;
  side?: 'L' | 'R' | null;
  variation?: string | null;
};

export type ActiveExercise = {
  id: string; // temp id string for active session
  exercise_id: number; // DB ID
  name: string;
  is_unilateral?: number;
  equipment?: string;
  muscle_group?: string;
  sets: SetRecord[];
  notes: string;
  personalRecords?: Record<string, Record<number, number>>;
  default_variation?: string | null;
};

interface WorkoutState {
  isActive: boolean;
  isWorkoutStarted: boolean;
  startTime: string | null;
  title: string | null;
  workoutNotes: string;
  exercises: ActiveExercise[];
  startWorkout: (title: string) => void;
  beginWorkoutTimer: () => void;
  updateWorkoutNotes: (notes: string) => void;
  updateExerciseNotes: (exerciseId: string, notes: string) => void;
  updateExerciseVariation: (exerciseId: string, variation: string | null) => void;
  endWorkout: () => void;
  addExercise: (exercise: { id: number, name: string, previousSets?: any[], personalRecords?: Record<string, Record<number, number>>, is_unilateral?: number, default_variation?: string | null, equipment?: string, muscle_group?: string }) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, changes: Partial<SetRecord>) => void;
  toggleSetComplete: (exerciseId: string, setId: string) => void;

  // Rest Timer
  lastRestFinishedAt: number | null;
  restTimer: {
    isActive: boolean;
    remaining: number;
    endTime: number | null;
  };
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  adjustRestTimer: (seconds: number) => void;
  tickRestTimer: () => void;
  markWorkStart: () => void;

  hasUnsentCrashLog: boolean;
  setHasUnsentCrashLog: (hasLog: boolean) => void;

  // Application Settings
  settings: {
    defaultRest: number;
    autoRest: boolean;
    timerVibrate: boolean;
    weightUnit: 'kg' | 'lbs';
    needsUnitSelection: boolean;
    needsStyleSelection: boolean;
    customStances: string[];
    bodyWeight: number | null;
    aiTokensBalance: number;
    premiumUntil: string;
    isEarlyAdopter: boolean;
    displayFields: {
      showRpe: boolean;
      show1RM: boolean;
      showVolume: boolean;
      showStance: boolean;
    };
    crashConsent: 'agreed' | 'declined' | 'unset';
  };
  loadSettings: (defaultRest: number, autoRest: boolean, timerVibrate: boolean, weightUnit: 'kg' | 'lbs', needsUnitSelection?: boolean, bodyWeight?: number | null, needsStyleSelection?: boolean, aiTokensBalance?: number, crashConsent?: 'agreed' | 'declined' | 'unset', premiumUntil?: string, isEarlyAdopter?: boolean) => void;
  setPremiumUntil: (premiumUntil: string) => void;
  updatePremiumStatus: (premiumUntil: string) => void;
  setIsEarlyAdopter: (isEarly: boolean) => void;
  setBodyWeight: (weight: number | null) => void;
  setAITokensBalance: (balance: number) => void;
  loadCustomStances: (stances: string[]) => void;
  addCustomStance: (stance: string) => void;
  removeCustomStance: (stance: string) => void;
  setDisplayFields: (fields: Partial<{ showRpe: boolean; show1RM: boolean; showVolume: boolean; showStance: boolean }>) => void;
  setCrashConsent: (consent: 'agreed' | 'declined' | 'unset') => void;

  // Routine Draft Mode
  draftRoutine: {
    title: string;
    exercises: {
      id: number;
      name: string;
      is_unilateral?: number;
      equipment?: string;
      sets: {
        id: string;
        set_number: number;
        weight: number | null;
        reps: number | null;
        rpe: number | null;
        side?: 'L' | 'R' | null;
        variation?: string | null;
      }[];
    }[];
  };
  updateDraftTitle: (title: string) => void;
  addDraftExercise: (exercise: { id: number; name: string; is_unilateral?: number; equipment?: string }) => void;
  removeDraftExercise: (index: number) => void;
  addDraftSet: (exerciseIndex: number) => void;
  removeDraftSet: (exerciseIndex: number, setIndex: number) => void;
  updateDraftSet: (exerciseIndex: number, setIndex: number, changes: Partial<{ weight: number | null; reps: number | null; rpe: number | null; side?: 'L' | 'R' | null; variation?: string | null }>) => void;
  setDraftRoutine: (title: string, exercises: any[]) => void;
  clearDraft: () => void;
  resetAllSettingsAndWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  isActive: false,
  isWorkoutStarted: false,
  startTime: null,
  title: null,
  workoutNotes: '',
  exercises: [],
  lastRestFinishedAt: null,
  restTimer: { isActive: false, remaining: 0, endTime: null },
  hasUnsentCrashLog: false,
  setHasUnsentCrashLog: (hasUnsentCrashLog) => set({ hasUnsentCrashLog }),

  settings: {
    defaultRest: 90,
    autoRest: true,
    timerVibrate: true,
    weightUnit: 'kg',
    needsUnitSelection: false,
    needsStyleSelection: false,
    customStances: [],
    bodyWeight: null,
    aiTokensBalance: 20,
    premiumUntil: '',
    isEarlyAdopter: false,
    displayFields: {
      showRpe: true,
      show1RM: true,
      showVolume: true,
      showStance: true,
    },
    crashConsent: 'unset'
  },

  loadSettings: (defaultRest: number, autoRest: boolean, timerVibrate: boolean, weightUnit: 'kg' | 'lbs', needsUnitSelection: boolean = false, bodyWeight: number | null = null, needsStyleSelection: boolean = false, aiTokensBalance: number = 20, crashConsent: 'agreed' | 'declined' | 'unset' = 'unset', premiumUntil: string = '', isEarlyAdopter: boolean = false) => set((state) => ({
    settings: { ...state.settings, defaultRest, autoRest, timerVibrate, weightUnit, needsUnitSelection, bodyWeight, needsStyleSelection, aiTokensBalance, crashConsent, premiumUntil, isEarlyAdopter }
  })),

  setPremiumUntil: (premiumUntil) => set((state) => ({
    settings: { ...state.settings, premiumUntil }
  })),

  updatePremiumStatus: (premiumUntil) => set((state) => ({
    settings: { ...state.settings, premiumUntil, aiTokensBalance: 20 }
  })),

  setIsEarlyAdopter: (isEarlyAdopter) => set((state) => ({
    settings: { ...state.settings, isEarlyAdopter }
  })),

  setBodyWeight: (weight: number | null) => set((state) => ({
    settings: { ...state.settings, bodyWeight: weight }
  })),

  setAITokensBalance: (balance: number) => set((state) => ({
    settings: { ...state.settings, aiTokensBalance: balance }
  })),

  loadCustomStances: (stances: string[]) => set((state) => ({
    settings: { ...state.settings, customStances: stances }
  })),

  addCustomStance: (stance: string) => set((state) => ({
    settings: { ...state.settings, customStances: Array.from(new Set([...state.settings.customStances, stance])) }
  })),

  removeCustomStance: (stance: string) => set((state) => ({
    settings: { ...state.settings, customStances: state.settings.customStances.filter(s => s !== stance) }
  })),

  setDisplayFields: (fields) => set((state) => ({
    settings: {
      ...state.settings,
      displayFields: { ...state.settings.displayFields, ...fields }
    }
  })),

  setCrashConsent: (crashConsent) => set((state) => ({
    settings: { ...state.settings, crashConsent }
  })),

  draftRoutine: { title: '', exercises: [] },

  startWorkout: (title) => set({
    isActive: true,
    isWorkoutStarted: false,
    startTime: null,
    title,
    workoutNotes: '',
    exercises: [],
    lastRestFinishedAt: null,
    restTimer: { isActive: false, remaining: 0, endTime: null }
  }),

  beginWorkoutTimer: () => set({
    isWorkoutStarted: true,
    startTime: new Date().toISOString()
  }),

  updateWorkoutNotes: (notes) => set({ workoutNotes: notes }),

  updateExerciseNotes: (exerciseId, notes) => set((state) => ({
    exercises: state.exercises.map(ex => 
      ex.id === exerciseId ? { ...ex, notes } : ex
    )
  })),

  updateExerciseVariation: (exerciseId, variation) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSets = ex.sets.map(s => s.is_completed ? s : { ...s, variation });
        return { ...ex, default_variation: variation, sets: newSets };
      }
      return ex;
    })
  })),

  endWorkout: () => {
    cancelRestTimer();
    set({
      isActive: false,
      startTime: null,
      title: null,
      workoutNotes: '',
      exercises: [],
      lastRestFinishedAt: null,
      restTimer: { isActive: false, remaining: 0, endTime: null }
    });
  },

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
        rpe: prev.rpe,
        is_completed: false,
        side: prev.side || null,
        variation: prev.variation || null
      }));
    } else {
      if (exercise.is_unilateral) {
        initialSets = [
          { id: Math.random().toString(36).substring(7), set_number: 1, weight: null, reps: null, rpe: null, is_completed: false, rest_seconds: null, work_seconds: null, side: 'L', variation: exercise.default_variation || null },
          { id: Math.random().toString(36).substring(7), set_number: 1, weight: null, reps: null, rpe: null, is_completed: false, rest_seconds: null, work_seconds: null, side: 'R', variation: exercise.default_variation || null }
        ];
      } else {
        initialSets = [{ 
          id: Math.random().toString(36).substring(7), 
          set_number: 1, 
          weight: null, 
          reps: null, 
          rpe: null, 
          is_completed: false,
          rest_seconds: null,
          work_seconds: null,
          variation: exercise.default_variation || null
        }];
      }
    }

    return {
      exercises: [
        ...state.exercises,
        {
          id: Math.random().toString(36).substring(7),
          exercise_id: exercise.id,
          name: exercise.name,
          is_unilateral: exercise.is_unilateral,
          equipment: exercise.equipment,
          muscle_group: exercise.muscle_group,
          sets: initialSets,
          notes: '',
          personalRecords: exercise.personalRecords || {},
          default_variation: exercise.default_variation || null
        }
      ]
    };
  }),

  addSet: (exerciseId) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSetNum = lastSet ? lastSet.set_number + 1 : 1;
        const inheritedVariation = ex.default_variation || (lastSet ? lastSet.variation : null);
        
        if (ex.is_unilateral) {
          return {
            ...ex,
            sets: [
              ...ex.sets,
              { id: Math.random().toString(36).substring(7), set_number: newSetNum, weight: lastSet ? lastSet.weight : null, reps: lastSet ? lastSet.reps : null, rpe: null, is_completed: false, rest_seconds: null, work_seconds: null, side: 'L', variation: inheritedVariation },
              { id: Math.random().toString(36).substring(7), set_number: newSetNum, weight: lastSet ? lastSet.weight : null, reps: lastSet ? lastSet.reps : null, rpe: null, is_completed: false, rest_seconds: null, work_seconds: null, side: 'R', variation: inheritedVariation }
            ]
          };
        } else {
          return {
            ...ex,
            sets: [...ex.sets, {
              id: Math.random().toString(36).substring(7),
              set_number: newSetNum,
              weight: lastSet ? lastSet.weight : null, // copy previous set weight optionally
              reps: lastSet ? lastSet.reps : null,
              rpe: null,
              is_completed: false,
              rest_seconds: null,
              work_seconds: null,
              variation: inheritedVariation
            }]
          };
        }
      }
      return ex;
    })
  })),

  removeSet: (exerciseId, setId) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const targetSet = ex.sets.find(s => s.id === setId);
        if (!targetSet) return ex;
        const targetNumber = targetSet.set_number;
        const remainingSets = ex.sets.filter(s => s.set_number !== targetNumber);
        
        let currentNum = 1;
        let lastSeenNum = -1;
        const newSets = remainingSets.map(s => {
          if (s.set_number !== lastSeenNum) {
            lastSeenNum = s.set_number;
            const newNum = currentNum;
            currentNum++;
            return { ...s, set_number: newNum };
          } else {
            return { ...s, set_number: currentNum - 1 };
          }
        });

        return { ...ex, sets: newSets };
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

    let restSeconds: number | null = null;
    let workSeconds: number | null = null;
    const now = Date.now();

    if (willBeCompleted) {
      const allCompletedSets = state.exercises
        .flatMap(e => e.sets)
        .filter(s => s.is_completed && s.completedAt)
        .sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
      
      const prevSet = allCompletedSets[allCompletedSets.length - 1];
      const prevTime = prevSet ? prevSet.completedAt : (state.startTime ? new Date(state.startTime).getTime(): null);
      const restFinishedTime = state.lastRestFinishedAt;

      if (prevTime) {
        if (restFinishedTime && restFinishedTime >= prevTime && restFinishedTime <= now) {
          restSeconds = Math.floor((restFinishedTime - prevTime) / 1000);
          workSeconds = Math.floor((now - restFinishedTime) / 1000);
        } else {
          restSeconds = null;
          workSeconds = Math.floor((now - prevTime) / 1000);
        }
      } else {
        const startTimeMs = state.startTime ? new Date(state.startTime).getTime() : now;
        workSeconds = Math.floor((now - startTimeMs) / 1000);
      }
    }

    set((state) => ({
      exercises: state.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map(s => {
              if (s.id === setId) {
                let finalWeight = s.weight;
                let finalReps = s.reps;
                if (willBeCompleted) {
                  if (finalWeight === null && s.prev_weight != null) finalWeight = s.prev_weight;
                  if (finalReps === null && s.prev_reps != null) finalReps = s.prev_reps;
                }
                return { 
                  ...s, 
                  is_completed: willBeCompleted, 
                  weight: finalWeight,
                  reps: finalReps,
                  completedAt: willBeCompleted ? now : undefined,
                  rest_seconds: willBeCompleted ? restSeconds : null,
                  work_seconds: willBeCompleted ? workSeconds : null
                };
              }
              return s;
            })
          };
        }
        return ex;
      })
    }));

    if (willBeCompleted && !state.isWorkoutStarted) {
      get().beginWorkoutTimer();
    }
    if (willBeCompleted && get().settings.autoRest) {
      get().startRestTimer(get().settings.defaultRest);
    }
    if (!willBeCompleted) {
      cancelRestTimer();
      set({
        restTimer: { isActive: false, remaining: 0, endTime: null }
      });
    }
  },

  startRestTimer: (seconds) => {
    const endTime = Date.now() + seconds * 1000;
    scheduleRestTimer(seconds);
    set({
      restTimer: { isActive: true, remaining: seconds, endTime }
    });
  },
  stopRestTimer: () => {
    cancelRestTimer();
    set({
      lastRestFinishedAt: Date.now(),
      restTimer: { isActive: false, remaining: 0, endTime: null }
    });
  },
  adjustRestTimer: (seconds) => set((state) => {
    if (!state.restTimer.isActive || !state.restTimer.endTime) return state;
    const newEndTime = state.restTimer.endTime + (seconds * 1000);
    const newRemaining = Math.max(0, Math.ceil((newEndTime - Date.now()) / 1000));
    
    // Reschedule notification
    cancelRestTimer();
    if (newRemaining > 0) {
      scheduleRestTimer(newRemaining);
    }

    return {
      restTimer: { 
        isActive: newRemaining > 0, 
        remaining: newRemaining,
        endTime: newRemaining > 0 ? newEndTime : null
      }
    };
  }),
  tickRestTimer: () => set((state) => {
    if (!state.restTimer.isActive || !state.restTimer.endTime) return state;
    const now = Date.now();
    const nextRemaining = Math.ceil((state.restTimer.endTime - now) / 1000);
    
    if (nextRemaining <= 0) {
      if (state.settings.timerVibrate) {
        Vibration.vibrate([0, 500, 200, 500]);
      }
      return { 
        lastRestFinishedAt: state.restTimer.endTime || now,
        restTimer: { isActive: false, remaining: 0, endTime: null } 
      };
    }
    return { restTimer: { isActive: true, remaining: nextRemaining, endTime: state.restTimer.endTime } };
  }),
  markWorkStart: () => {
    cancelRestTimer();
    set({
      lastRestFinishedAt: Date.now(),
      restTimer: { isActive: false, remaining: 0, endTime: null }
    });
  },

  // Draft routine actions
  updateDraftTitle: (title) => set((state) => ({
    draftRoutine: { ...state.draftRoutine, title }
  })),
  addDraftExercise: (exercise) => set((state) => {
    const defaultSet = {
      id: Math.random().toString(36).substring(7),
      set_number: 1,
      weight: null,
      reps: null,
      rpe: null
    };
    const enrichedExercise = {
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
        const newSet = {
          id: Math.random().toString(36).substring(7),
          set_number: nextNum,
          weight: lastSet ? lastSet.weight : null,
          reps: lastSet ? lastSet.reps : null,
          rpe: null
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
  }),
  resetAllSettingsAndWorkout: () => {
    cancelRestTimer();
    set({
      isActive: false,
      isWorkoutStarted: false,
      startTime: null,
      title: null,
      workoutNotes: '',
      exercises: [],
      lastRestFinishedAt: null,
      hasUnsentCrashLog: false,
      settings: {
        defaultRest: 90,
        autoRest: true,
        timerVibrate: true,
        weightUnit: 'kg',
        needsUnitSelection: true,
        needsStyleSelection: true,
        customStances: [],
        bodyWeight: null,
        aiTokensBalance: 20,
        premiumUntil: '',
        isEarlyAdopter: false,
        displayFields: {
          showRpe: true,
          show1RM: true,
          showVolume: true,
          showStance: true,
        },
        crashConsent: 'unset'
      },
      draftRoutine: { title: '', exercises: [] }
    });
  }
}));
