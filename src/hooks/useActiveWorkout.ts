import { useState, useEffect, useCallback } from 'react';
import { Alert, AppState, BackHandler, Platform, Keyboard } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useWorkoutStore } from '../store/workoutStore';
import { useSettingsStore } from '../store/settingsStore';
import { saveWorkout, saveSetting, prefetchWorkoutCompletionData } from '../db/database';
import { translateExercise } from '../i18n';
import { computeCalories, computeAchievements, computeStreaks, computeWeeklyWorkoutCount } from '../utils/workoutStats';
import { writeWorkoutToHealthConnect } from '../services/health/healthWriter';
import { isTreadmillExercise } from '../utils/exerciseUtils';

export interface StanceModalTarget {
  type: 'set';
  exId: string;
  setId?: string;
  currentValue: string | null;
}

export function useActiveWorkout() {
  const { t } = useTranslation();

  // Workout Store States & Actions
  const title = useWorkoutStore(state => state.title);
  const startTime = useWorkoutStore(state => state.startTime);
  const workoutNotes = useWorkoutStore(state => state.workoutNotes);
  const exercises = useWorkoutStore(state => state.exercises);
  const endWorkout = useWorkoutStore(state => state.endWorkout);
  const updateWorkoutNotes = useWorkoutStore(state => state.updateWorkoutNotes);
  const updateExerciseNotes = useWorkoutStore(state => state.updateExerciseNotes);
  const _addSet = useWorkoutStore(state => state.addSet);
  const removeSet = useWorkoutStore(state => state.removeSet);
  const removeExercise = useWorkoutStore(state => state.removeExercise);
  const _toggleSetComplete = useWorkoutStore(state => state.toggleSetComplete);
  const toggleSetWarmup = useWorkoutStore(state => state.toggleSetWarmup);
  const updateSet = useWorkoutStore(state => state.updateSet);
  const restTimerActive = useWorkoutStore(state => state.restTimer.isActive);
  const tickRestTimer = useWorkoutStore(state => state.tickRestTimer);
  const markWorkStart = useWorkoutStore(state => state.markWorkStart);
  const settings = useSettingsStore(state => state.settings);
  const isWorkoutStarted = useWorkoutStore(state => state.isWorkoutStarted);
  const beginWorkoutTimer = useWorkoutStore(state => state.beginWorkoutTimer);
  const lastRestFinishedAt = useWorkoutStore(state => state.lastRestFinishedAt);

  // Local UI States
  const [showWorkoutNotes, setShowWorkoutNotes] = useState(false);
  const [expandedExerciseNotes, setExpandedExerciseNotes] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Plate Calculator State
  const [plateCalcVisible, setPlateCalcVisible] = useState(false);
  const [activeSetForCalc, setActiveSetForCalc] = useState<{ exId: string; setId: string } | null>(null);

  const toggleSetComplete = useCallback((exerciseId: string, setId: string) => {
    _toggleSetComplete(exerciseId, setId, settings);
  }, [_toggleSetComplete, settings]);

  const addSet = useCallback((exerciseId: string) => {
    _addSet(exerciseId, settings.addSetStanceMode);
  }, [_addSet, settings.addSetStanceMode]);

  const _startRestTimer = useWorkoutStore(state => state.startRestTimer);
  const _adjustRestTimer = useWorkoutStore(state => state.adjustRestTimer);

  // Stance Modal State
  const [stanceModalVisible, setStanceModalVisible] = useState(false);
  const [stanceModalTarget, setStanceModalTarget] = useState<StanceModalTarget | null>(null);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const presetStances = settings.customStances || [];

  // Rest Timer Tick Effect
  useEffect(() => {
    if (!restTimerActive) return;
    const iv = setInterval(() => {
      tickRestTimer(settings.timerVibrate);
    }, 1000);
    return () => clearInterval(iv);
  }, [restTimerActive, tickRestTimer, settings.timerVibrate]);

  // Sync Push Notifications & State on Background/Foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        tickRestTimer(settings.timerVibrate);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [tickRestTimer, settings.timerVibrate]);

  // Keyboard Listeners
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Back button handler
  const handleBack = useCallback(() => {
    setPauseModalVisible(true);
    return true;
  }, []);

  const confirmLeaveWorkout = useCallback(() => {
    setPauseModalVisible(false);
    router.dismiss();
  }, []);

  const confirmDiscardWorkout = useCallback(() => {
    setPauseModalVisible(false);
    endWorkout();
    router.dismiss();
  }, [endWorkout]);

  const cancelPauseModal = useCallback(() => {
    setPauseModalVisible(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
      return () => backHandler.remove();
    }, [handleBack])
  );

  // Exercise deletion handler
  const handleDeleteExercise = useCallback(
    (ex: any) => {
      const hasCompletedSet = ex.sets.some((s: any) => s.is_completed);
      if (hasCompletedSet) {
        Alert.alert(
          t('ui.active_workout.alert_delete_exercise_error_title'),
          t('ui.active_workout.alert_delete_exercise_error_message')
        );
        return;
      }

      Alert.alert(
        t('ui.active_workout.alert_delete_exercise_title'),
        t('ui.active_workout.alert_delete_exercise_message', { name: translateExercise(ex.name) }),
        [
          { text: t('ui.common.cancel'), style: 'cancel' },
          {
            text: t('ui.active_workout.alert_delete_exercise_confirm'),
            style: 'destructive',
            onPress: () => {
              removeExercise(ex.id);
            },
          },
        ]
      );
    },
    [removeExercise, t]
  );

  const handleManualTimer = useCallback(() => {
    _startRestTimer(settings.defaultRest, settings.timerNotification);
  }, [_startRestTimer, settings.defaultRest, settings.timerNotification]);

  // Finish Workout Modal trigger
  const handleFinish = useCallback(() => {
    if (isSaving) return;
    setFinishModalVisible(true);
  }, [isSaving]);

  const cancelFinishModal = useCallback(() => {
    setFinishModalVisible(false);
    setIsSaving(false);
  }, []);

  const confirmSaveWorkout = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setFinishModalVisible(false);

    try {
      // 0. Filter only completed sets and exercises with at least one completed set
      const completedExercises = exercises
        .map(ex => ({
          ...ex,
          sets: ex.sets.filter(s => !!s.is_completed),
        }))
        .filter(ex => ex.sets.length > 0);

      // 1. Gather unique completed exercise IDs
      const exerciseIds = completedExercises
        .map(ex => ex.exercise_id)
        .filter((id): id is number => typeof id === 'number');

      // 2. Prefetch historical data safely
      let dbWorkouts: any[] = [];
      let pastSets: any[] = [];
      try {
        const res = await prefetchWorkoutCompletionData(exerciseIds);
        dbWorkouts = res.workouts || [];
        pastSets = res.pastSets || [];
      } catch (e) {
        console.warn('Failed to prefetch workout completion data', e);
      }

      // 3. Compute calorie stats safely
      let roundedCalories = 0;
      try {
        roundedCalories = computeCalories(completedExercises, settings.bodyWeight || 70, settings.weightUnit);
      } catch (e) {
        console.warn('Failed to compute calories', e);
      }
      const et = new Date().toISOString();

      // 4. Calculate achievements safely
      let updated1RMs: any[] = [];
      let updatedVolumes: any[] = [];
      try {
        const achRes = computeAchievements(completedExercises, pastSets, settings.bodyWeight || 70);
        updated1RMs = achRes.updated1RMs || [];
        updatedVolumes = achRes.updatedVolumes || [];
      } catch (e) {
        console.warn('Failed to compute achievements', e);
      }

      // Save the workout to DB
      const savedTitle = title || t('ui.home.free_workout_title');
      const savedStartTime = startTime || et;

      // Streak Calculations safely
      let streakDays = 1;
      let streakWeeks = 1;
      let weeklyWorkoutCount = 1;
      try {
        const streaks = computeStreaks(dbWorkouts);
        streakDays = streaks.streakDays;
        streakWeeks = streaks.streakWeeks;
        weeklyWorkoutCount = computeWeeklyWorkoutCount(dbWorkouts, savedStartTime);
      } catch (e) {
        console.warn('Failed to compute streaks', e);
      }

      const workoutId = await saveWorkout(savedTitle, savedStartTime, et, workoutNotes, completedExercises, roundedCalories);

      // Health Connect 自動書き込み（非同期・非ブロッキング）
      const exerciseNames = completedExercises.map((ex) => ex.name).filter(Boolean);
      const totalSets = completedExercises.reduce((sum, ex) => sum + ex.sets.length, 0);
      const isTreadmillOnly =
        exerciseNames.length > 0 && exerciseNames.every((name) => isTreadmillExercise(name));
      writeWorkoutToHealthConnect({
        id: workoutId,
        title: savedTitle,
        startTime: savedStartTime,
        endTime: et,
        notes: workoutNotes || null,
        calories: roundedCalories,
        exerciseNames,
        totalSets,
        isTreadmillOnly,
      }).catch((hcErr) => {
        console.warn('[HealthConnect] Auto workout write failed:', hcErr);
      });

      // Set store state for completed screen
      useWorkoutStore.getState().setLastWorkoutCompletion({
        workout: {
          id: workoutId,
          title: savedTitle,
          start_time: savedStartTime,
          end_time: et,
          notes: workoutNotes || null,
          calories: roundedCalories,
          exercises: completedExercises,
        },
        achievements: {
          streakDays,
          streakWeeks,
          weeklyWorkoutCount,
          is1RMUpdated: updated1RMs.length > 0,
          isVolumeUpdated: updatedVolumes.length > 0,
          updated1RMs,
          updatedVolumes,
        },
      });

      endWorkout();
      router.replace('/workout-completion');
    } catch (e) {
      console.error('Failed to finish workout', e);
      Alert.alert(t('ui.common.error') || 'Error', 'Failed to save workout.');
      setIsSaving(false);
    }
  }, [isSaving, exercises, settings.bodyWeight, settings.weightUnit, title, startTime, workoutNotes, endWorkout, t]);

  const handleAddExercise = useCallback(() => {
    router.push('/select-exercise');
  }, []);

  const toggleExpandedExerciseNote = useCallback((exId: string) => {
    setExpandedExerciseNotes(prev => ({ ...prev, [exId]: !prev[exId] }));
  }, []);

  const handleSelectStance = useCallback(
    (val: string | null) => {
      if (stanceModalTarget?.type === 'set' && stanceModalTarget.setId) {
        useWorkoutStore.getState().updateSet(stanceModalTarget.exId, stanceModalTarget.setId, { stance: val, variation: val });
      }
    },
    [stanceModalTarget]
  );

  const handleAddCustomStance = useCallback(
    (val: string) => {
      useSettingsStore.getState().addCustomStance(val);
      const updatedStances = Array.from(new Set([...(settings.customStances || []), val]));
      saveSetting('custom_stances', JSON.stringify(updatedStances));
    },
    [settings.customStances]
  );

  const handleRemoveCustomStance = useCallback(
    async (val: string) => {
      const next = (settings.customStances || []).filter((s: string) => s !== val);
      useSettingsStore.getState().removeCustomStance(val);
      await saveSetting('custom_stances', JSON.stringify(next));
    },
    [settings.customStances]
  );

  const handleApplyPlateCalc = useCallback(
    (totalPlateWeight: number) => {
      if (activeSetForCalc) {
        updateSet(activeSetForCalc.exId, activeSetForCalc.setId, { weight: totalPlateWeight });
        Alert.alert(
          t('ui.active_workout.plate_calc_success_title'),
          t('ui.active_workout.plate_calc_success_message', { weight: totalPlateWeight, unit: settings.weightUnit })
        );
      } else {
        Alert.alert(t('ui.common.error'), t('ui.active_workout.plate_calc_error_no_set'));
      }
    },
    [activeSetForCalc, updateSet, settings.weightUnit, t]
  );

  return {
    t,
    title,
    startTime,
    workoutNotes,
    exercises,
    settings,
    isWorkoutStarted,
    restTimerActive,
    lastRestFinishedAt,
    showWorkoutNotes,
    setShowWorkoutNotes,
    expandedExerciseNotes,
    isSaving,
    keyboardHeight,
    plateCalcVisible,
    setPlateCalcVisible,
    activeSetForCalc,
    setActiveSetForCalc,
    stanceModalVisible,
    setStanceModalVisible,
    stanceModalTarget,
    setStanceModalTarget,
    pauseModalVisible,
    setPauseModalVisible,
    finishModalVisible,
    setFinishModalVisible,
    confirmLeaveWorkout,
    confirmDiscardWorkout,
    cancelPauseModal,
    confirmSaveWorkout,
    cancelFinishModal,
    presetStances,
    updateWorkoutNotes,
    updateExerciseNotes,
    addSet,
    removeSet,
    toggleSetComplete,
    toggleSetWarmup,
    updateSet,
    markWorkStart,
    beginWorkoutTimer,
    handleBack,
    handleDeleteExercise,
    handleManualTimer,
    handleFinish,
    handleAddExercise,
    toggleExpandedExerciseNote,
    handleSelectStance,
    handleAddCustomStance,
    handleRemoveCustomStance,
    handleApplyPlateCalc,
  };
}
