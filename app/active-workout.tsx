import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, AppState, BackHandler, Modal, Platform, Keyboard } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../src/store/workoutStore';
import { Theme } from '../src/theme';
import { saveWorkout, saveSetting, prefetchWorkoutCompletionData } from '../src/db/database';
import { useTranslation } from 'react-i18next';
import { translateExercise, translateStance } from '../src/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AI_CONFIG } from '../src/config/aiConfig';
import { useKeepAwake } from 'expo-keep-awake';
import { ElapsedTimerHeader } from '../components/active-workout/ElapsedTimerHeader';
import { ResumeWorkoutButton } from '../components/active-workout/ResumeWorkoutButton';
import { FloatingRestTimer } from '../components/active-workout/FloatingRestTimer';
import { SetInputRow } from '../components/active-workout/SetInputRow';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { KeyboardAvoidingWrapper } from '../components/active-workout/KeyboardAvoidingWrapper';
import { PlateCalculatorModal } from '../components/active-workout/PlateCalculatorModal';
import { StanceModal } from '../components/active-workout/StanceModal';
import { calculateRM, computeCalories, computeAchievements, computeStreaks } from '../src/utils/workoutStats';



function KeepAwakeController() {
  useKeepAwake();
  return null;
}

export default function ActiveWorkoutScreen() {
  const { t } = useTranslation();
  const title = useWorkoutStore(state => state.title);
  const startTime = useWorkoutStore(state => state.startTime);
  const workoutNotes = useWorkoutStore(state => state.workoutNotes);
  const exercises = useWorkoutStore(state => state.exercises);
  const endWorkout = useWorkoutStore(state => state.endWorkout);
  const updateWorkoutNotes = useWorkoutStore(state => state.updateWorkoutNotes);
  const updateExerciseNotes = useWorkoutStore(state => state.updateExerciseNotes);
  const addSet = useWorkoutStore(state => state.addSet);
  const removeSet = useWorkoutStore(state => state.removeSet);
  const removeExercise = useWorkoutStore(state => state.removeExercise);
  const toggleSetComplete = useWorkoutStore(state => state.toggleSetComplete);
  const updateSet = useWorkoutStore(state => state.updateSet);
  const restTimerActive = useWorkoutStore(state => state.restTimer.isActive);
  const tickRestTimer = useWorkoutStore(state => state.tickRestTimer);
  const markWorkStart = useWorkoutStore(state => state.markWorkStart);
  const settings = useWorkoutStore(state => state.settings);
  const isWorkoutStarted = useWorkoutStore(state => state.isWorkoutStarted);
  const beginWorkoutTimer = useWorkoutStore(state => state.beginWorkoutTimer);
  const lastRestFinishedAt = useWorkoutStore(state => state.lastRestFinishedAt);
  const [showWorkoutNotes, setShowWorkoutNotes] = useState(false);
  const [expandedExerciseNotes, setExpandedExerciseNotes] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const safeBottomOffset = isAndroid ? (insets.bottom === 0 ? 48 : insets.bottom) : insets.bottom;

  const handleDeleteExercise = (ex: any) => {
    // 完了チェックが入っているセットがあるか確認
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
          }
        }
      ]
    );
  };

  const renderLeftActions = (progress: SharedValue<number>, drag: SharedValue<number>, ex: any) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value - 80 }],
      };
    });
    return (
      <View style={{ width: 80 }}>
        <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
          <GHTouchableOpacity 
            style={styles.deleteAction}
            onPress={() => handleDeleteExercise(ex)}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </GHTouchableOpacity>
        </Reanimated.View>
      </View>
    );
  };

  const renderRightActions = (progress: SharedValue<number>, drag: SharedValue<number>, ex: any) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 80 }],
      };
    });
    return (
      <View style={{ width: 80 }}>
        <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
          <GHTouchableOpacity 
            style={styles.deleteAction}
            onPress={() => handleDeleteExercise(ex)}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </GHTouchableOpacity>
        </Reanimated.View>
      </View>
    );
  };

  const handleAICoachWorkout = () => {
    if (exercises.length === 0) {
      Alert.alert(t('ui.common.info') || '情報', '現在記録中のエクササイズがありません。まずは種目を追加してください。');
      return;
    }
    let contextStr = `【現在記録中のワークアウト】\n`;
    if (workoutNotes) contextStr += `全体メモ: "${workoutNotes}"\n`;
    for (const ex of exercises) {
      contextStr += `- ${ex.name}: `;
      const setDescs = ex.sets.map(s => {
        let sd = `${s.weight ?? 0}${settings.weightUnit} x ${s.reps ?? 0}回`;
        if (s.side) sd = `[${s.side === 'L' ? '左' : '右'}] ` + sd;
        if (s.stance || s.variation) sd += ` (${s.stance || s.variation})`;
        if (s.rpe) sd += ` (RPE: ${s.rpe})`;
        return sd;
      });
      contextStr += setDescs.join(', ') + '\n';
    }

    router.push({
      pathname: '/(tabs)/coach',
      params: {
        contextPrompt: contextStr,
        prefillMessage: t('ui.coach.prefill_active_workout'),
        title: title || t('ui.home.free_workout_title') || '本日のワークアウト'
      }
    });
  };

  const handleAICoachExercise = (ex: any) => {
    let contextStr = `【現在記録中の種目データ】\n`;
    contextStr += `- ${ex.name}: `;
    if (ex.notes) contextStr += `(種目メモ: "${ex.notes}") `;
    const setDescs = ex.sets.map((s: any) => {
      let sd = `${s.weight ?? 0}${settings.weightUnit} x ${s.reps ?? 0}回`;
      if (s.side) sd = `[${s.side === 'L' ? '左' : '右'}] ` + sd;
      if (s.stance || s.variation) sd += ` (${s.stance || s.variation})`;
      if (s.rpe) sd += ` (RPE: ${s.rpe})`;
      return sd;
    });
    contextStr += setDescs.join(', ') + '\n';

    router.push({
      pathname: '/(tabs)/coach',
      params: {
        contextPrompt: contextStr,
        prefillMessage: t('ui.coach.prefill_active_set', { name: translateExercise(ex.name) }),
        title: ex.name
      }
    });
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
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

  // プレート計算機用State
  const [plateCalcVisible, setPlateCalcVisible] = useState(false);
  const [activeSetForCalc, setActiveSetForCalc] = useState<{exId: string, setId: string} | null>(null);

  // スタンス用State
  const [stanceModalVisible, setStanceModalVisible] = useState(false);
  const [stanceModalTarget, setStanceModalTarget] = useState<{ type: 'exercise' | 'set', exId: string, setId?: string, currentValue: string | null } | null>(null);
  const presetStances = settings.customStances || [];

  // Rest Timer Interval
  useEffect(() => {
    if (!restTimerActive) return;
    const iv = setInterval(() => {
      tickRestTimer();
    }, 1000);
    return () => clearInterval(iv);
  }, [restTimerActive, tickRestTimer]);

  // Sync Push Notifications & State on Background/Foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        tickRestTimer();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [tickRestTimer]);

  const handleBack = useCallback(() => {
    Alert.alert(
      t('ui.active_workout.alert_pause_title'),
      t('ui.active_workout.alert_pause_message'),
      [
        {
          text: t('ui.active_workout.alert_pause_cancel'),
          style: 'cancel',
        },
        {
          text: t('ui.active_workout.alert_pause_leave'),
          style: 'default',
          onPress: () => {
            router.dismiss();
          }
        },
        {
          text: t('ui.active_workout.alert_pause_discard'),
          style: 'destructive',
          onPress: () => {
            endWorkout();
            router.dismiss();
          }
        }
      ]
    );
    return true;
  }, [endWorkout]);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
      return () => backHandler.remove();
    }, [handleBack])
  );

  
  const handleManualTimer = () => {
    const { settings, startRestTimer } = useWorkoutStore.getState();
    startRestTimer(settings.defaultRest);
  };



  const handleFinish = () => {
    if (isSaving) return;
    setIsSaving(true);

    Alert.alert(
      t('ui.active_workout.alert_finish_title'),
      t('ui.active_workout.alert_finish_message'),
      [
        { 
          text: t('ui.active_workout.cancel'), 
          style: 'cancel',
          onPress: () => setIsSaving(false)
        },
        {
          text: t('ui.active_workout.alert_finish_save'),
          style: 'default',
          onPress: async () => {
            try {
              // 1. Gather unique completed exercise IDs
              const exerciseIds = exercises
                .map(ex => ex.exercise_id)
                .filter((id): id is number => typeof id === 'number');

              // 2. Prefetch historical data to prevent deadlocks
              const { workouts: dbWorkouts, pastSets } = await prefetchWorkoutCompletionData(exerciseIds);

              // 3. Compute calorie stats
              const roundedCalories = computeCalories(exercises, settings.bodyWeight || 70, settings.weightUnit);
              const et = new Date().toISOString();

              // 4. Calculate achievements (1RM & Volume updates)
              const { updated1RMs, updatedVolumes } = computeAchievements(exercises, pastSets, settings.bodyWeight || 70);

              // Streak Calculations
              const { streakDays, streakWeeks } = computeStreaks(dbWorkouts);

              // Save the workout to DB
              const savedTitle = title || t('ui.home.free_workout_title');
              const savedStartTime = startTime || et;
              const workoutId = await saveWorkout(savedTitle, savedStartTime, et, workoutNotes, exercises, roundedCalories);

              // Set store state for completed screen
              useWorkoutStore.getState().setLastWorkoutCompletion({
                workout: {
                  id: workoutId,
                  title: savedTitle,
                  start_time: savedStartTime,
                  end_time: et,
                  notes: workoutNotes || null,
                  calories: roundedCalories,
                  exercises: exercises,
                },
                achievements: {
                  streakDays,
                  streakWeeks,
                  is1RMUpdated: updated1RMs.length > 0,
                  isVolumeUpdated: updatedVolumes.length > 0,
                  updated1RMs,
                  updatedVolumes,
                }
              });

              endWorkout();
              router.replace('/workout-completion');
            } catch (e) {
              console.error('Failed to finish workout', e);
              Alert.alert(t('ui.common.error') || 'Error', 'Failed to save workout.');
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const handleAddExercise = () => {
    router.push('/select-exercise');
  };

  return (
    <View style={styles.container}>
      {settings.keepAwake && <KeepAwakeController />}
      <Stack.Screen 
        options={{ 
          title: '',
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={{ marginLeft: 8, backgroundColor: Theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('ui.common.back')}</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isWorkoutStarted && (
                <ElapsedTimerHeader startTime={startTime} style={styles.headerTimeText} />
              )}
              <TouchableOpacity 
                onPress={() => router.push('/rm-calculator')} 
                style={{ marginRight: 16, marginLeft: 8 }}
                accessibilityLabel={t('ui.accessibility.rm_calculator')}
              >
                <Ionicons name="calculator-outline" size={26} color={Theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setPlateCalcVisible(true)} 
                style={{ marginRight: 16 }}
                accessibilityLabel={t('ui.accessibility.plate_calculator')}
              >
                <Ionicons name="barbell-outline" size={26} color={Theme.colors.primary} />
              </TouchableOpacity>
              {!restTimerActive && (
                <TouchableOpacity 
                  onPress={handleManualTimer} 
                  style={{ marginRight: 16 }}
                  accessibilityLabel={t('ui.accessibility.timer_setting')}
                >
                  <Ionicons name="timer-outline" size={26} color={Theme.colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity disabled={isSaving} onPress={handleFinish} style={{ marginRight: 8, backgroundColor: Theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, opacity: isSaving ? 0.5 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('ui.active_workout.finish')}</Text>
              </TouchableOpacity>
            </View>
          )
        }} 
      />

      <KeyboardAvoidingWrapper>
        {/* Workout Notes & AI Trainer Section (Fixed at Top) */}
        <View style={styles.fixedHeader}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => setShowWorkoutNotes(!showWorkoutNotes)}
              style={{ flexDirection: 'row', alignItems: 'center', opacity: workoutNotes ? 1 : 0.6 }}
            >
              <Ionicons name="document-text-outline" size={18} color={Theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: Theme.colors.primary, fontSize: 14, fontWeight: '600' }}>
                {t('ui.active_workout.workout_notes')}
              </Text>
              {workoutNotes ? <Ionicons name="checkmark-circle" size={12} color={Theme.colors.success} style={{ marginLeft: 4 }} /> : null}
            </TouchableOpacity>
            {AI_CONFIG.status === 'active' && (
              <TouchableOpacity onPress={handleAICoachWorkout} style={{ padding: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="sparkles" size={16} color={Theme.colors.primary} />
                  <Text style={{ color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold' }}>AIトレーナー</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
          
          {(showWorkoutNotes || workoutNotes) && (
            <TextInput
              style={[styles.workoutNotesInput, !showWorkoutNotes && { height: 0, paddingVertical: 0, opacity: 0 }]}
              placeholder={t('ui.active_workout.workout_notes_placeholder')}
              placeholderTextColor={Theme.colors.textMuted}
              multiline
              value={workoutNotes}
              onChangeText={updateWorkoutNotes}
            />
          )}
        </View>

        <ScrollView 
          contentContainerStyle={styles.content} 
          keyboardShouldPersistTaps="handled" 
          automaticallyAdjustKeyboardInsets={false}
        >

        {!isWorkoutStarted && (
          <TouchableOpacity style={styles.startWorkoutHeroBtn} onPress={beginWorkoutTimer}>
            <Text style={styles.startWorkoutHeroBtnText}>{t('ui.active_workout.start_training_btn')}</Text>
          </TouchableOpacity>
        )}

        {exercises.map((ex) => (
          <View key={ex.id} style={styles.card}>
            <Swipeable
              renderLeftActions={(progress, drag) => renderLeftActions(progress, drag, ex)}
              renderRightActions={(progress, drag) => renderRightActions(progress, drag, ex)}
              friction={2}
              leftThreshold={40}
              rightThreshold={40}
            >
              <View style={{ backgroundColor: Theme.colors.card, paddingVertical: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <TouchableOpacity 
                      onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.exercise_id || ex.id } } as any)}
                      onLongPress={() => handleDeleteExercise(ex)}
                      delayLongPress={500}
                    >
                      <Text style={styles.exerciseTitle}>{translateExercise(ex.name)}</Text>
                    </TouchableOpacity>
                    {settings.displayFields.showStance && (
                      <TouchableOpacity 
                        style={styles.exerciseVariationBtn}
                        onPress={() => {
                          const curStance = ex.default_stance || ex.default_variation || null;
                          setStanceModalTarget({ type: 'exercise', exId: ex.id, currentValue: curStance });
                          setStanceModalVisible(true);
                        }}
                      >
                        <Text style={styles.exerciseVariationText}>
                          {t('ui.active_workout.stance_label')}: {(ex.default_stance || ex.default_variation) ? translateStance((ex.default_stance || ex.default_variation) as string) : t('ui.active_workout.stance_standard')}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={Theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                    {settings.displayFields.showVolume && (
                      <View style={styles.exerciseVolumeContainer}>
                        <Text style={styles.exerciseVolumeLabel}>{t('ui.history.volume_label')}: </Text>
                        <Text style={styles.exerciseVolumeValue}>
                          {ex.sets.reduce((sum, s) => {
                            if (!s.is_completed) return sum;
                            const bw = (ex.equipment === '自重' && settings.bodyWeight) ? settings.bodyWeight : 0;
                            return sum + ((s.weight || 0) + bw) * (s.reps || 0);
                          }, 0)} {settings.weightUnit}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {AI_CONFIG.status === 'active' && (
                      <TouchableOpacity onPress={() => handleAICoachExercise(ex)}>
                        <Ionicons name="sparkles" size={20} color={Theme.colors.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => setExpandedExerciseNotes(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}>
                      <Ionicons 
                        name={ex.notes ? "chatbubble-ellipses" : "chatbubble-outline"} 
                        size={20} 
                        color={ex.notes ? Theme.colors.primary : Theme.colors.textMuted} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Swipeable>

            {expandedExerciseNotes[ex.id] && (
              <TextInput
                style={styles.exerciseNotesInput}
                placeholder={t('ui.active_workout.exercise_notes_placeholder')}
                placeholderTextColor={Theme.colors.textMuted}
                multiline
                value={ex.notes}
                onChangeText={(val) => updateExerciseNotes(ex.id, val)}
              />
            )}
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { width: 50 }]}>{t('ui.active_workout.header_set')}</Text>
                {ex.muscle_group === '有酸素' ? (
                  <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>{t('ui.active_workout.header_time')}</Text>
                ) : (
                  <>
                    <Text style={[styles.th, { width: 90, marginHorizontal: 3 }]}>{ex.name === 'プランク' ? '加重' : (ex.equipment === '自重' ? `+ ${settings.weightUnit}` : settings.weightUnit)}</Text>
                    <Text style={[styles.th, { width: 70, marginHorizontal: 3 }]}>{ex.name === 'プランク' ? '秒数' : t('ui.active_workout.header_reps')}</Text>
                    {(settings.displayFields.showRpe || ex.name === 'プランク') && (
                      <Text style={[styles.th, { width: 55, marginHorizontal: 3 }]}>{ex.name === 'プランク' ? '計測' : t('ui.active_workout.header_rpe')}</Text>
                    )}
                  </>
                )}
                <Text style={[styles.th, { width: 40 }]}>{t('ui.active_workout.header_record')}</Text>
              </View>

            {ex.sets.map((set, idx) => (
              <SetInputRow
                key={set.id}
                ex={ex}
                set={set}
                idx={idx}
                updateSet={updateSet}
                toggleSetComplete={toggleSetComplete}
                removeSet={removeSet}
                setActiveSetForCalc={setActiveSetForCalc}
                calculateRM={calculateRM}
                startTime={startTime}
                setStanceModalTarget={setStanceModalTarget}
                setStanceModalVisible={setStanceModalVisible}
                displayFields={settings.displayFields}
              />
            ))}

            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ex.id)}>
              <Text style={styles.addSetBtnText}>{t('ui.active_workout.add_set_label')}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addExerciseBtn} onPress={handleAddExercise}>
          <Text style={styles.addExerciseBtnText}>{t('ui.active_workout.add_exercise_label')}</Text>
        </TouchableOpacity>
        <View style={{ height: 180 }} />
      </ScrollView>
      </KeyboardAvoidingWrapper>

      {/* Floating Rest Timer UI */}
      <FloatingRestTimer safeBottomOffset={safeBottomOffset} />

      {/* Floating Manual Start Button (when not resting) */}
      {isWorkoutStarted && !restTimerActive && (
        <View style={[styles.manualStartOverlay, { bottom: safeBottomOffset + 20 }]}>
          <ResumeWorkoutButton 
            lastRestFinishedAt={lastRestFinishedAt}
            onPress={() => {
              markWorkStart();
              Alert.alert("", t('ui.active_workout.manual_start_success') || "Started");
            }}
          />
        </View>
      )}
      {/* プレート計算機モーダル */}
      <PlateCalculatorModal
        visible={plateCalcVisible}
        onClose={() => setPlateCalcVisible(false)}
        weightUnit={settings.weightUnit}
        onApply={(totalPlateWeight) => {
          if (activeSetForCalc) {
            updateSet(activeSetForCalc.exId, activeSetForCalc.setId, { weight: totalPlateWeight });
            Alert.alert(
              t('ui.active_workout.plate_calc_success_title'),
              t('ui.active_workout.plate_calc_success_message', { weight: totalPlateWeight, unit: settings.weightUnit })
            );
          } else {
            Alert.alert(t('ui.common.error'), t('ui.active_workout.plate_calc_error_no_set'));
          }
        }}
      />

      {/* スタンス選択モーダル */}
      <StanceModal
        visible={stanceModalVisible}
        target={stanceModalTarget}
        onClose={() => setStanceModalVisible(false)}
        presetStances={presetStances}
        onSelectStance={(val) => {
          if (stanceModalTarget?.type === 'exercise') {
            useWorkoutStore.getState().updateExerciseStance(stanceModalTarget.exId, val);
            useWorkoutStore.getState().updateExerciseVariation(stanceModalTarget.exId, val);
          } else if (stanceModalTarget?.type === 'set' && stanceModalTarget.setId) {
            useWorkoutStore.getState().updateSet(stanceModalTarget.exId, stanceModalTarget.setId, { stance: val, variation: val });
          }
        }}
        onAddCustomStance={(val) => {
          useWorkoutStore.getState().addCustomStance(val);
          const updatedStances = Array.from(new Set([...(settings.customStances || []), val]));
          saveSetting('custom_stances', JSON.stringify(updatedStances));
        }}
        onRemoveCustomStance={async (val) => {
          const next = (settings.customStances || []).filter(s => s !== val);
          useWorkoutStore.getState().removeCustomStance(val);
          await saveSetting('custom_stances', JSON.stringify(next));
        }}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  fixedHeader: {
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    zIndex: 10,
  },
  headerTimeText: {
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  startWorkoutHeroBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 16, borderRadius: Theme.borderRadius.lg, alignItems: 'center', marginBottom: 16, shadowColor: Theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  startWorkoutHeroBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  timeText: { color: Theme.colors.textMuted, fontSize: 16, textAlign: 'center', marginVertical: 8 },
  card: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.lg },
  exerciseTitle: { color: Theme.colors.primary, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  exerciseVariationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(79, 172, 254, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  exerciseVariationText: { color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold', marginRight: 4 },
  exerciseVolumeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  exerciseVolumeLabel: { fontSize: 12, color: Theme.colors.text },
  exerciseVolumeValue: { fontSize: 12, color: Theme.colors.text, fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  th: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  rowCompleted: { opacity: 0.7 },
  tdSet: { color: Theme.colors.text, textAlign: 'center', fontSize: 16, fontWeight: '500' },
  setVariationBadge: { marginTop: 4, backgroundColor: '#333', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  setVariationText: { color: Theme.colors.textMuted, fontSize: 10, fontWeight: 'bold' },
  input: { backgroundColor: '#2a2a2a', color: Theme.colors.text, width: 90, marginHorizontal: 3, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 4, textAlign: 'center', fontSize: 15 },
  inputReadOnly: { opacity: 0.7, justifyContent: 'center', alignItems: 'center' },
  inputReadOnlyText: { color: Theme.colors.text, fontSize: 16 },
  checkBtn: { width: 36, height: 36, backgroundColor: '#333', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkBtnActive: { backgroundColor: Theme.colors.success },
  addSetBtn: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  addSetBtnText: { color: Theme.colors.primary, fontSize: 16, fontWeight: '600' },
  addExerciseBtn: { backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center', marginVertical: Theme.spacing.xl, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  addExerciseBtnText: { color: Theme.colors.primary, fontSize: 18, fontWeight: 'bold' },
  timerOverlay: { position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 100, backgroundColor: Theme.colors.primary, borderRadius: 12, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  timerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold' },
  timerDigits: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  timerActions: { flexDirection: 'row', gap: 8 },
  timerBtn: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  timerBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  workoutNotesInput: {
    backgroundColor: '#1a1a1a',
    color: Theme.colors.text,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#333'
  },
  exerciseNotesInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    color: Theme.colors.text,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
    minHeight: 40,
    textAlignVertical: 'top'
  },
  manualStartOverlay: { position: 'absolute', bottom: 20, left: 20, right: 20, alignItems: 'center' },
  manualStartBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  manualStartBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.lg, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },

  deleteAction: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  timerInputBtn: {
    width: 55,
    marginHorizontal: 3,
    backgroundColor: '#333',
    borderRadius: 4,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36
  },
  timerInputBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  }
});
