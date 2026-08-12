import { create } from 'zustand';
import { Vibration } from 'react-native';
import { scheduleRestTimer, cancelRestTimer } from '../utils/timer';
import { buildInitialSetsForExercise } from '../utils/workoutSetBuilder';
import { useSettingsStore } from './settingsStore';
import { useRoutineDraftStore } from './routineDraftStore';

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
  stance?: string | null;
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
  default_stance?: string | null;
  weight_step?: number;
};

export interface WorkoutCompletionAchievement {
  streakDays: number;
  streakWeeks: number;
  weeklyWorkoutCount: number;
  is1RMUpdated: boolean;
  isVolumeUpdated: boolean;
  updated1RMs: { name: string; oldVal: number; newVal: number }[];
  updatedVolumes: { name: string; oldVal: number; newVal: number }[];
}

export interface WorkoutCompletionData {
  workout: {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    notes: string | null;
    calories: number | null;
    exercises: ActiveExercise[];
  };
  achievements: WorkoutCompletionAchievement;
}

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
  updateExerciseStance: (exerciseId: string, stance: string | null) => void;
  updateExerciseWeightStep: (exerciseId: string, weightStep: number) => void;
  endWorkout: () => void;
  addExercise: (exercise: { id: number; name: string; previousSets?: any[]; personalRecords?: Record<string, Record<number, number>>; is_unilateral?: number; default_variation?: string | null; default_stance?: string | null; equipment?: string; muscle_group?: string; routineSets?: any[] }) => void;
  removeExercise: (exerciseId: string) => void;
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

  shouldShowPaywall: boolean;
  setShouldShowPaywall: (show: boolean) => void;

  resetAllSettingsAndWorkout: () => void;
  lastWorkoutCompletion: WorkoutCompletionData | null;
  setLastWorkoutCompletion: (data: WorkoutCompletionData | null) => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  isActive: false,
  isWorkoutStarted: false,
  startTime: null,
  title: null,
  workoutNotes: '',
  exercises: [],
  lastWorkoutCompletion: null,
  setLastWorkoutCompletion: (lastWorkoutCompletion) => set({ lastWorkoutCompletion }),
  lastRestFinishedAt: null,
  restTimer: { isActive: false, remaining: 0, endTime: null },
  hasUnsentCrashLog: false,
  setHasUnsentCrashLog: (hasUnsentCrashLog) => set({ hasUnsentCrashLog }),

  shouldShowPaywall: false,
  setShouldShowPaywall: (shouldShowPaywall) => set({ shouldShowPaywall }),

  startWorkout: (title) => {
    cancelRestTimer();
    set({
      isActive: true,
      isWorkoutStarted: false,
      startTime: null,
      title,
      workoutNotes: '',
      exercises: [],
      lastRestFinishedAt: null,
      restTimer: { isActive: false, remaining: 0, endTime: null }
    });
  },

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

  updateExerciseStance: (exerciseId, stance) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSets = ex.sets.map(s => s.is_completed ? s : { ...s, stance });
        return { ...ex, default_stance: stance, sets: newSets };
      }
      return ex;
    })
  })),

  updateExerciseWeightStep: (exerciseId, weightStep) => set((state) => ({
    exercises: state.exercises.map(ex => 
      ex.id === exerciseId ? { ...ex, weight_step: weightStep } : ex
    )
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
    const alwaysOneSet = useSettingsStore.getState().settings.alwaysOneSet;
    const initialSets = buildInitialSetsForExercise(exercise, alwaysOneSet);

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
          default_variation: exercise.default_variation || null,
          default_stance: exercise.default_stance || null,
          weight_step: (exercise as any).weight_step ?? 2.5
        }
      ]
    };
  }),

  removeExercise: (exerciseId) => set((state) => ({
    exercises: state.exercises.filter(ex => ex.id !== exerciseId)
  })),

  addSet: (exerciseId) => set((state) => ({
    exercises: state.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSetNum = lastSet ? lastSet.set_number + 1 : 1;
        const inheritedVariation = ex.default_variation || (lastSet ? lastSet.variation : null);
        const inheritedStance = ex.default_stance || (lastSet ? lastSet.stance : null);
        
        if (ex.is_unilateral) {
          return {
            ...ex,
            sets: [
              ...ex.sets,
              { id: Math.random().toString(36).substring(7), set_number: newSetNum, weight: lastSet ? lastSet.weight : null, reps: lastSet ? lastSet.reps : null, rpe: null, is_completed: false, rest_seconds: null, work_seconds: null, side: 'L', variation: inheritedVariation, stance: inheritedStance },
              { id: Math.random().toString(36).substring(7), set_number: newSetNum, weight: lastSet ? lastSet.weight : null, reps: lastSet ? lastSet.reps : null, rpe: null, is_completed: false, rest_seconds: null, work_seconds: null, side: 'R', variation: inheritedVariation, stance: inheritedStance }
            ]
          };
        } else {
          return {
            ...ex,
            sets: [...ex.sets, {
              id: Math.random().toString(36).substring(7),
              set_number: newSetNum,
              weight: lastSet ? lastSet.weight : null,
              reps: lastSet ? lastSet.reps : null,
              rpe: null,
              is_completed: false,
              rest_seconds: null,
              work_seconds: null,
              variation: inheritedVariation,
              stance: inheritedStance
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
    const isAerobic = ex?.muscle_group === '有酸素';

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
                  work_seconds: willBeCompleted 
                    ? (isAerobic ? s.work_seconds : (s.work_seconds ?? workSeconds)) 
                    : null
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
    const settings = useSettingsStore.getState().settings;
    if (willBeCompleted && settings.autoRest) {
      get().startRestTimer(settings.defaultRest);
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
      const settings = useSettingsStore.getState().settings;
      if (settings.timerVibrate) {
        Vibration.vibrate([0, 500, 200, 500]);
      }
      return { 
        lastRestFinishedAt: state.restTimer.endTime || now,
        restTimer: { isActive: false, remaining: 0, endTime: null } 
      };
    }

    // 残り3秒、2秒、1秒のカウントダウン予告バイブレーション
    const settings = useSettingsStore.getState().settings;
    if (settings.timerVibrate && nextRemaining !== state.restTimer.remaining) {
      if (nextRemaining === 3 || nextRemaining === 2 || nextRemaining === 1) {
        Vibration.vibrate(60);
      }
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

  resetAllSettingsAndWorkout: () => {
    cancelRestTimer();
    useSettingsStore.getState().resetSettings();
    useRoutineDraftStore.getState().clearDraft();
    set({
      isActive: false,
      isWorkoutStarted: false,
      startTime: null,
      title: null,
      workoutNotes: '',
      exercises: [],
      lastRestFinishedAt: null,
      hasUnsentCrashLog: false,
    });
  }
}));
