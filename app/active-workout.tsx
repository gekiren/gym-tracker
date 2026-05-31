import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, AppState, BackHandler, Modal, Platform, Keyboard } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { useEffect, useState, useCallback } from 'react';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../src/store/workoutStore';
import { Theme } from '../src/theme';
import { saveWorkout, saveSetting } from '../src/db/database';
import { useTranslation } from 'react-i18next';
import { translateExercise, translateStance } from '../src/i18n';

export default function ActiveWorkoutScreen() {
  const { t } = useTranslation();
  const { 
    title, startTime, workoutNotes, exercises, endWorkout, 
    updateWorkoutNotes, updateExerciseNotes,
    addExercise, addSet, removeSet, toggleSetComplete, updateSet, 
    restTimer, stopRestTimer, adjustRestTimer, tickRestTimer, markWorkStart, settings,
    isWorkoutStarted, beginWorkoutTimer
  } = useWorkoutStore();
  
  const [elapsed, setElapsed] = useState(0);
  const [showWorkoutNotes, setShowWorkoutNotes] = useState(false);
  const [expandedExerciseNotes, setExpandedExerciseNotes] = useState<Record<string, boolean>>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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
  const [plateCalcBar, setPlateCalcBar] = useState(20);
  const [platesOnOneSide, setPlatesOnOneSide] = useState<number[]>([]);
  const [activeSetForCalc, setActiveSetForCalc] = useState<{exId: string, setId: string} | null>(null);
  const [isCustomBar, setIsCustomBar] = useState(false);
  const [customBarText, setCustomBarText] = useState('20');

  // スタンス用State
  const [stanceModalVisible, setStanceModalVisible] = useState(false);
  const [stanceModalTarget, setStanceModalTarget] = useState<{ type: 'exercise' | 'set', exId: string, setId?: string, currentValue: string | null } | null>(null);
  const [customStance, setCustomStance] = useState('');
  const [isAddingStance, setIsAddingStance] = useState(false);
  const presetStances = settings.customStances || [];

  useEffect(() => {
    const defaultVal = settings.weightUnit === 'lbs' ? 45 : 20;
    setPlateCalcBar(defaultVal);
    setCustomBarText(String(defaultVal));
    setIsCustomBar(false);
    setPlatesOnOneSide([]);
  }, [settings.weightUnit]);

  const totalPlateWeight = plateCalcBar + (platesOnOneSide.reduce((a, b) => a + b, 0) * 2);

  useEffect(() => {
    if (!startTime) return;
    const startOffset = new Date(startTime).getTime();
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startOffset) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [startTime]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Rest Timer Interval
  useEffect(() => {
    if (!restTimer.isActive) return;
    const iv = setInterval(() => {
      tickRestTimer();
    }, 1000);
    return () => clearInterval(iv);
  }, [restTimer.isActive, tickRestTimer]);

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

  const handleAdjustRest = (secs: number) => {
    adjustRestTimer(secs);
  };
  
  const handleManualTimer = () => {
    const { settings, startRestTimer } = useWorkoutStore.getState();
    startRestTimer(settings.defaultRest);
  };

  const calculateRM = (weight: number | null, reps: number | null) => {
    if (!weight || !reps || reps < 1) return null;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + (reps / 30)));
  };

  const handleFinish = () => {
    Alert.alert(
      t('ui.active_workout.alert_finish_title'),
      t('ui.active_workout.alert_finish_message'),
      [
        { text: t('ui.active_workout.cancel'), style: 'cancel' },
        {
          text: t('ui.active_workout.alert_finish_save'),
          style: 'default',
          onPress: async () => {
            try {
              let totalWorkSecs = 0;
              let totalRestSecs = 0;
              exercises.forEach(ex => {
                ex.sets.forEach(s => {
                  if (s.is_completed) {
                    totalWorkSecs += (s.work_seconds || 0);
                    totalRestSecs += (s.rest_seconds || 0);
                  }
                });
              });
              
              const bw = settings.bodyWeight || 70;
              const bwKg = settings.weightUnit === 'lbs' ? bw * 0.453592 : bw;
              const cal = ((totalWorkSecs / 3600) * 6.0 * bwKg) + ((totalRestSecs / 3600) * 1.5 * bwKg);
              const roundedCalories = Math.round(cal);

              const et = new Date().toISOString();
              await saveWorkout(title || t('ui.home.free_workout_title'), startTime || et, et, workoutNotes, exercises, roundedCalories);
            } catch (e) {
              console.error(e);
            }
            endWorkout();
            router.replace('/(tabs)/history');
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
      <Stack.Screen 
        options={{ 
          title: title || t('ui.home.free_workout_title'),
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={{ marginLeft: 8 }}>
              <Ionicons name="chevron-down" size={28} color={Theme.colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => router.push('/rm-calculator')} style={{ marginRight: 16 }}>
                <Ionicons name="calculator-outline" size={26} color={Theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPlateCalcVisible(true)} style={{ marginRight: 16 }}>
                <Ionicons name="barbell-outline" size={26} color={Theme.colors.primary} />
              </TouchableOpacity>
              {!restTimer.isActive && (
                <TouchableOpacity onPress={handleManualTimer} style={{ marginRight: 16 }}>
                  <Ionicons name="timer-outline" size={26} color={Theme.colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleFinish} style={{ marginRight: 8, backgroundColor: Theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('ui.active_workout.finish')}</Text>
              </TouchableOpacity>
            </View>
          )
        }} 
      />

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: 100 + keyboardHeight }]} 
        keyboardShouldPersistTaps="handled" 
        automaticallyAdjustKeyboardInsets={true}
      >
          {!isWorkoutStarted ? (
            <TouchableOpacity style={styles.startWorkoutHeroBtn} onPress={beginWorkoutTimer}>
              <Text style={styles.startWorkoutHeroBtnText}>{t('ui.active_workout.start_training_btn')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.timeText}>{formatTime(elapsed)}</Text>
              {keyboardHeight > 0 && (
                <Text style={{ color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
                  [Debug] Keyboard Height: {keyboardHeight}px
                </Text>
              )}
            </View>
          )}

        {/* Workout Notes Section */}
        <View style={{ marginBottom: 16 }}>
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

        {exercises.map((ex) => (
          <View key={ex.id} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.exercise_id || ex.id } } as any)}>
                  <Text style={styles.exerciseTitle}>{translateExercise(ex.name)}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.exerciseVariationBtn}
                  onPress={() => {
                    setStanceModalTarget({ type: 'exercise', exId: ex.id, currentValue: ex.default_variation || null });
                    setCustomStance(ex.default_variation || '');
                    setStanceModalVisible(true);
                  }}
                >
                  <Text style={styles.exerciseVariationText}>
                    {t('ui.active_workout.stance_label')}: {ex.default_variation ? translateStance(ex.default_variation) : t('ui.active_workout.stance_standard')}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={Theme.colors.primary} />
                </TouchableOpacity>
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
              </View>
              <TouchableOpacity onPress={() => setExpandedExerciseNotes(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}>
                <Ionicons 
                  name={ex.notes ? "chatbubble-ellipses" : "chatbubble-outline"} 
                  size={20} 
                  color={ex.notes ? Theme.colors.primary : Theme.colors.textMuted} 
                />
              </TouchableOpacity>
            </View>

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
                <Text style={[styles.th, { flex: 1 }]}>{ex.equipment === '自重' ? `+ ${settings.weightUnit}` : settings.weightUnit}</Text>
                <Text style={[styles.th, { width: 70 }]}>{t('ui.active_workout.header_reps')}</Text>
                <Text style={[styles.th, { width: 55 }]}>{t('ui.active_workout.header_rpe')}</Text>
                <Text style={[styles.th, { width: 40 }]}></Text>
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
                setCustomStance={setCustomStance}
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
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Rest Timer UI */}
      {restTimer.isActive && (
        <View style={styles.timerOverlay}>
          <View style={styles.timerContent}>
            <View>
              <Text style={styles.timerLabel}>{t('ui.active_workout.rest_label_resting')}</Text>
              <Text style={styles.timerDigits}>{formatTime(restTimer.remaining)}</Text>
            </View>
            <View style={styles.timerActions}>
              <TouchableOpacity style={styles.timerBtn} onPress={() => handleAdjustRest(-30)}>
                <Text style={styles.timerBtnText}>-30s</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.timerBtn, { backgroundColor: Theme.colors.card }]} onPress={stopRestTimer}>
                <Text style={styles.timerBtnText}>{t('ui.active_workout.skip_label')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerBtn} onPress={() => handleAdjustRest(30)}>
                <Text style={styles.timerBtnText}>+30s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Floating Manual Start Button (when not resting) */}
      {isWorkoutStarted && !restTimer.isActive && (
        <View style={styles.manualStartOverlay}>
          <TouchableOpacity style={styles.manualStartBtn} onPress={() => {
            markWorkStart();
            Alert.alert("", t('ui.active_workout.manual_start_success') || "Started");
          }}>
            <Text style={styles.manualStartBtnText}>{t('ui.active_workout.manual_start_btn')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* プレート計算機モーダル */}
      <Modal visible={plateCalcVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.md }}>
              <Text style={styles.modalTitle}>{t('ui.active_workout.plate_calc_title')}</Text>
              <TouchableOpacity onPress={() => setPlateCalcVisible(false)}>
                <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.calcResultContainer}>
              <Text style={styles.calcResultText}>{totalPlateWeight} {settings.weightUnit}</Text>
              <Text style={styles.calcFormulaText}>
                {t('ui.active_workout.plate_calc_bar_weight')} {plateCalcBar}{settings.weightUnit} + {t('ui.active_workout.plate_calc_add_plates')} {platesOnOneSide.reduce((a,b)=>a+b, 0)}{settings.weightUnit} × 2
              </Text>
            </View>

            {/* バーの選択 */}
            <Text style={styles.sectionTitle}>{t('ui.active_workout.plate_calc_bar_weight')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Theme.spacing.md }}>
              {(settings.weightUnit === 'lbs' ? [45, 35] : [20, 10, 7]).map(w => {
                const isActive = !isCustomBar && plateCalcBar === w;
                return (
                  <TouchableOpacity
                    key={w}
                    style={[styles.barBtn, isActive && styles.barBtnActive]}
                    onPress={() => {
                      setIsCustomBar(false);
                      setPlateCalcBar(w);
                    }}
                  >
                    <Text style={[styles.barBtnText, isActive && styles.barBtnTextActive]}>{w} {settings.weightUnit}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.barBtn, isCustomBar && styles.barBtnActive]}
                onPress={() => {
                  setIsCustomBar(true);
                  setPlateCalcBar(parseFloat(customBarText) || 0);
                }}
              >
                <Text style={[styles.barBtnText, isCustomBar && styles.barBtnTextActive]}>{t('ui.active_workout.plate_calc_bar_custom')}</Text>
              </TouchableOpacity>
            </View>

            {isCustomBar && (
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder={t('ui.active_workout.plate_calc_bar_custom_placeholder')}
                placeholderTextColor={Theme.colors.textMuted}
                value={customBarText}
                onChangeText={(val) => {
                  if (val === '' || /^\d{0,3}(\.\d{0,2})?$/.test(val)) {
                    setCustomBarText(val);
                    setPlateCalcBar(val !== '' && val !== '.' ? parseFloat(val) : 0);
                  }
                }}
              />
            )}

            <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Theme.spacing.md, backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' }}>
              <View style={{ width: 10, height: '100%', backgroundColor: '#666' }} />
              {/* 真ん中のバー部分 */}
              <View style={{ flex: 1, height: 16, backgroundColor: '#888', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                {/* プレートの描画 (内側から外側へ) */}
                {platesOnOneSide.map((p, i) => {
                  let h = 20, w = 8, color = Theme.colors.primary;
                  if (settings.weightUnit === 'lbs') {
                    switch (p) {
                      case 45: h = 56; w = 30; color = '#e53935'; break; // 赤
                      case 35: h = 56; w = 30; color = '#1e88e5'; break; // 青
                      case 25: h = 48; w = 30; color = '#43a047'; break; // 緑
                      case 10: h = 40; w = 30; color = '#eeeeee'; break; // 白
                      case 5: h = 30; w = 30; color = '#424242'; break; // 黒に近いグレー
                      case 2.5: h = 24; w = 30; color = '#ff9800'; break; // オレンジ系に変更
                    }
                  } else {
                    switch (p) {
                      case 25: h = 56; w = 30; color = '#e53935'; break; // 赤
                      case 20: h = 56; w = 30; color = '#1e88e5'; break; // 青
                      case 15: h = 48; w = 30; color = '#fbc02d'; break; // 黄
                      case 10: h = 40; w = 30; color = '#43a047'; break; // 緑
                      case 5: h = 30; w = 30; color = '#eeeeee'; break; // 白
                      case 2.5: h = 24; w = 30; color = '#424242'; break; // 黒に近いグレー
                      case 1.25: h = 18; w = 30; color = '#ff9800'; break; // オレンジ系に変更
                    }
                  }
                  const slopY = Math.max(0, (56 - h) / 2);
                  return (
                    <TouchableOpacity 
                      key={i} 
                      onPress={() => setPlatesOnOneSide(prev => prev.filter((_, index) => index !== i))}
                      activeOpacity={0.7}
                      hitSlop={{ top: slopY, bottom: slopY, left: 4, right: 4 }}
                      style={[styles.plateVisual, { height: h, width: w, backgroundColor: color }]} 
                    />
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>{t('ui.active_workout.plate_calc_add_plates')}</Text>
              <TouchableOpacity onPress={() => setPlatesOnOneSide(prev => prev.slice(0, -1))} disabled={platesOnOneSide.length === 0}>
                 <Text style={{ color: platesOnOneSide.length > 0 ? Theme.colors.danger : Theme.colors.textMuted }}>{t('ui.active_workout.plate_calc_undo')}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Theme.spacing.lg }}>
              {(settings.weightUnit === 'lbs' ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25]).map(w => (
                <TouchableOpacity
                  key={w}
                  style={styles.plateBtn}
                  onPress={() => setPlatesOnOneSide(prev => [...prev, w])}
                >
                  <Text style={styles.plateBtnText}>+ {w}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                if (activeSetForCalc) {
                  updateSet(activeSetForCalc.exId, activeSetForCalc.setId, { weight: totalPlateWeight });
                  Alert.alert(t('ui.active_workout.plate_calc_success_title'), t('ui.active_workout.plate_calc_success_message', { weight: totalPlateWeight, unit: settings.weightUnit }));
                } else {
                  Alert.alert(t('ui.common.error'), t('ui.active_workout.plate_calc_error_no_set'));
                }
                setPlateCalcVisible(false);
              }}
            >
              <Text style={styles.applyBtnText}>{t('ui.active_workout.plate_calc_apply_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* スタンス選択モーダル */}
      <Modal visible={stanceModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border }}>
              <Text style={styles.modalTitle}>
                {stanceModalTarget?.type === 'exercise' ? t('ui.active_workout.stance_modal_title_exercise') : t('ui.active_workout.stance_modal_title_set')}
              </Text>
              <TouchableOpacity onPress={() => { setStanceModalVisible(false); setIsAddingStance(false); }}>
                <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              {isAddingStance ? (
                <>
                  <Text style={styles.sectionTitle}>{t('ui.active_workout.stance_add_new_title')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('ui.active_workout.stance_add_placeholder')}
                    placeholderTextColor={Theme.colors.textMuted}
                    value={customStance}
                    onChangeText={setCustomStance}
                    autoFocus
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity 
                      style={[styles.applyBtn, { flex: 1, backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.border }]}
                      onPress={() => {
                        setCustomStance('');
                        setIsAddingStance(false);
                      }}
                    >
                      <Text style={{ color: Theme.colors.text, fontWeight: 'bold', textAlign: 'center' }}>{t('ui.active_workout.stance_cancel')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.applyBtn, { flex: 1 }]}
                      onPress={() => {
                    const val = customStance.trim() || null;
                    if (val) {
                      useWorkoutStore.getState().addCustomStance(val);
                      const updatedStances = Array.from(new Set([...(settings.customStances || []), val]));
                      saveSetting('custom_stances', JSON.stringify(updatedStances));
                    }
                    setCustomStance('');
                    setIsAddingStance(false);
                      }}
                    >
                      <Text style={styles.applyBtnText}>{t('ui.active_workout.stance_add_to_list')}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>{t('ui.active_workout.stance_preset_label')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    {[t('ui.active_workout.stance_standard'), ...presetStances].map(preset => {
                      const val = preset === t('ui.active_workout.stance_standard') ? null : preset;
                      const isActive = stanceModalTarget?.currentValue === val;
                      return (
                        <TouchableOpacity
                          key={preset}
                          style={[styles.choiceChip, isActive && styles.choiceChipActive]}
                          onPress={() => {
                            if (stanceModalTarget?.type === 'exercise') {
                              useWorkoutStore.getState().updateExerciseVariation(stanceModalTarget.exId, val);
                            } else if (stanceModalTarget?.type === 'set' && stanceModalTarget.setId) {
                              useWorkoutStore.getState().updateSet(stanceModalTarget.exId, stanceModalTarget.setId, { variation: val });
                            }
                            setStanceModalVisible(false);
                          }}
                          onLongPress={() => {
                            if (val === null) return; // "標準"は削除不可
                            Alert.alert(
                              t('ui.active_workout.stance_delete_title'),
                              t('ui.active_workout.stance_delete_message', { name: translateStance(preset) }),
                              [
                                { text: t('ui.active_workout.stance_cancel'), style: 'cancel' },
                                { 
                                  text: t('ui.active_workout.stance_delete_confirm'), 
                                  style: 'destructive',
                                  onPress: async () => {
                                    const next = (settings.customStances || []).filter(s => s !== val);
                                    useWorkoutStore.getState().removeCustomStance(val);
                                    await saveSetting('custom_stances', JSON.stringify(next));
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <Text style={[styles.choiceChipText, isActive && styles.choiceChipTextActive]}>{translateStance(preset)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.applyBtn, { backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.border, marginTop: 8 }]}
                    onPress={() => setIsAddingStance(true)}
                  >
                    <Text style={{ color: Theme.colors.primary, fontWeight: 'bold', textAlign: 'center' }}>{t('ui.active_workout.stance_add_original_btn')}</Text>
                  </TouchableOpacity>

                  {stanceModalTarget?.type === 'exercise' && (
                    <Text style={{ color: Theme.colors.textMuted, fontSize: 12, marginTop: 12 }}>
                      {t('ui.active_workout.stance_exercise_hint')}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SetInputRow({ ex, set, idx, updateSet, toggleSetComplete, removeSet, setActiveSetForCalc, calculateRM, startTime, setStanceModalTarget, setStanceModalVisible, setCustomStance }: any) {
  const { t } = useTranslation();
  const [localWeight, setLocalWeight] = useState(set.weight != null ? String(set.weight) : '');
  const [localReps, setLocalReps] = useState(set.reps != null ? String(set.reps) : '');
  const [localRpe, setLocalRpe] = useState(set.rpe != null ? String(set.rpe) : '');

  // 外部からの更新（プレート計算アプリなどでストアから値が変わった場合）を検知して同期
  useEffect(() => {
    if (set.weight != null) {
      if (parseFloat(localWeight) !== set.weight) setLocalWeight(String(set.weight));
    } else {
      setLocalWeight('');
    }
  }, [set.weight]);

  useEffect(() => {
    if (set.reps != null) {
      if (parseInt(localReps, 10) !== set.reps) setLocalReps(String(set.reps));
    } else {
      setLocalReps('');
    }
  }, [set.reps]);

  useEffect(() => {
    if (set.rpe != null) {
      if (parseFloat(localRpe) !== set.rpe) setLocalRpe(String(set.rpe));
    } else {
      setLocalRpe('');
    }
  }, [set.rpe]);

  const handleWeightChange = (val: string) => {
    if (val === '' || /^\d{0,3}(\.\d{0,1})?$/.test(val)) {
      setLocalWeight(val);
      updateSet(ex.id, set.id, { weight: val !== '' && val !== '.' ? parseFloat(val) : null });
    }
  };

  const handleRepsChange = (val: string) => {
    if (val === '' || /^\d{0,2}$/.test(val)) {
      setLocalReps(val);
      updateSet(ex.id, set.id, { reps: val !== '' ? parseInt(val, 10) : null });
    }
  };

  const currentRM = calculateRM(set.weight, set.reps);
  const varKey = set.variation || 'default';
  const prMapForVar = ex.personalRecords ? ex.personalRecords[varKey] : null;
  const isPR = !!(set.weight != null && set.reps != null && set.reps > 0 && set.weight >= 0 && 
                (!prMapForVar || prMapForVar[set.reps] === undefined || set.weight > prMapForVar[set.reps]));
  
  let timeTakenStr = '';
  let restTimeStr = '';
  
  if (set.is_completed && set.completedAt) {
    if (set.rest_seconds != null) {
      const m = Math.floor(set.rest_seconds / 60);
      const s = set.rest_seconds % 60;
      restTimeStr = `☕${m > 0 ? `${m}:` : ''}${s.toString().padStart(m > 0 ? 2 : 1, '0')}${m === 0 ? 's' : ''}`;
    }
    
    let wSecs = set.work_seconds;
    if (wSecs == null) {
        const prevTime = idx === 0 ? (startTime ? new Date(startTime).getTime() : Date.now()) : (ex.sets[idx - 1].completedAt || (startTime ? new Date(startTime).getTime() : Date.now()));
        wSecs = Math.floor((set.completedAt - prevTime) / 1000);
    }
    
    if (wSecs != null && wSecs >= 0) {
      const m = Math.floor(wSecs / 60);
      const s = wSecs % 60;
      const fmt = `${m > 0 ? `${m}:` : ''}${s.toString().padStart(m > 0 ? 2 : 1, '0')}${m === 0 ? 's' : ''}`;
      if (set.rest_seconds != null) {
        timeTakenStr = `🏋️${fmt}`;
      } else {
        timeTakenStr = `⏱️${fmt}`;
      }
    }
  }

  const handleLongPress = () => {
    if (set.is_completed) {
      Alert.alert(t('ui.active_workout.alert_delete_set_error_title'), t('ui.active_workout.alert_delete_set_error_message'));
      return;
    }
    Alert.alert(
      t('ui.active_workout.alert_delete_set_title'),
      t('ui.active_workout.alert_delete_set_message', { number: set.set_number }),
      [
        { text: t('ui.common.cancel'), style: 'cancel' },
        { text: t('ui.active_workout.alert_delete_set_confirm'), style: 'destructive', onPress: () => removeSet(ex.id, set.id) }
      ]
    );
  };

  const renderLeftActions = (progress: SharedValue<number>, drag: SharedValue<number>) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value - 80 }],
      };
    });
    return (
      <View style={{ width: 80 }}>
        <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
          <TouchableOpacity 
            style={styles.deleteAction}
            onPress={handleLongPress}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </Reanimated.View>
      </View>
    );
  };

  const renderRightActions = (progress: SharedValue<number>, drag: SharedValue<number>) => {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 80 }],
      };
    });
    return (
      <View style={{ width: 80 }}>
        <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
          <TouchableOpacity 
            style={styles.deleteAction}
            onPress={handleLongPress}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </Reanimated.View>
      </View>
    );
  };

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
    >
      <View style={{ backgroundColor: Theme.colors.card }}>
        <TouchableOpacity 
          style={[styles.row, set.is_completed && styles.rowCompleted]}
          activeOpacity={0.8}
          onLongPress={handleLongPress}
          delayLongPress={500}
        >
        <View style={{ width: 50, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.tdSet}>{set.set_number}{set.side ? `\n(${set.side})` : ''}</Text>
        </View>

        {set.is_completed ? (
          <View style={[styles.input, styles.inputReadOnly]}>
            <Text style={styles.inputReadOnlyText}>{localWeight || (set.prev_weight ? String(set.prev_weight) : '-')}</Text>
          </View>
        ) : (
          <TextInput 
            style={styles.input} 
            keyboardType="numeric" 
            placeholder={set.prev_weight ? String(set.prev_weight) : "-"} 
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={localWeight}
            onChangeText={handleWeightChange}
            onFocus={() => setActiveSetForCalc({ exId: ex.id, setId: set.id })}
          />
        )}

        {set.is_completed ? (
          <View style={[styles.input, { width: 70, flex: 0 }, styles.inputReadOnly]}>
            <Text style={styles.inputReadOnlyText}>{localReps || (set.prev_reps ? String(set.prev_reps) : '-')}</Text>
          </View>
        ) : (
          <TextInput 
            style={[styles.input, { width: 70, flex: 0 }]} 
            keyboardType="numeric" 
            placeholder={set.prev_reps ? String(set.prev_reps) : "-"} 
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={localReps}
            onChangeText={handleRepsChange}
          />
        )}

        {set.is_completed ? (
          <View style={[styles.input, { width: 55, flex: 0 }, styles.inputReadOnly]}>
            <Text style={styles.inputReadOnlyText}>{localRpe || '-'}</Text>
          </View>
        ) : (
          <TextInput 
            style={[styles.input, { width: 55, flex: 0 }]} 
            keyboardType="numeric" 
            placeholder="-" 
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={localRpe}
            onChangeText={(val) => {
              setLocalRpe(val);
              updateSet(ex.id, set.id, { rpe: val ? parseFloat(val) : null });
            }}
          />
        )}
        
        {/* Check Button & RM Display */}
        <View style={{ width: 40, alignItems: 'center' }}>
          <TouchableOpacity 
            style={[styles.checkBtn, set.is_completed && styles.checkBtnActive]}
            onPress={() => toggleSetComplete(ex.id, set.id)}
          >
            <Ionicons name="checkmark" size={18} color={set.is_completed ? '#fff' : Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      
      {/* Meta Row (Variation & RM & Time & PR) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8, marginTop: -4 }}>
        {/* Left side: Variation */}
        <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center', paddingLeft: 4 }}>
          {set.is_completed ? (
            <Text style={{ color: Theme.colors.textMuted, fontSize: 11 }} numberOfLines={1}>
              {set.variation ? `${t('ui.active_workout.stance_label')}: ${translateStance(set.variation)}` : `${t('ui.active_workout.stance_label')}: -`}
            </Text>
          ) : (
            <TouchableOpacity 
              onPress={() => {
                setStanceModalTarget({ type: 'set', exId: ex.id, setId: set.id, currentValue: set.variation || null });
                setCustomStance(set.variation || '');
                setStanceModalVisible(true);
              }}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <Text style={{ color: Theme.colors.primary, fontSize: 11, textDecorationLine: 'underline' }} numberOfLines={1}>
                {set.variation ? `${t('ui.active_workout.stance_label')}: ${translateStance(set.variation)}` : t('ui.active_workout.stance_add_link')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

         {/* Right side: RM & Time & PR */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1.2 }}>
           {isPR && <Text style={{ color: '#f5a623', fontSize: 11, fontWeight: 'bold', marginRight: 8 }}>{t('ui.active_workout.pr_label').split(' ')[0]}</Text>}
           {currentRM != null && <Text style={{ color: Theme.colors.primary, fontSize: 11, marginRight: 8 }}>1RM: {ex.equipment === '自重' ? `BW + ${currentRM}` : currentRM}</Text>}
           {restTimeStr ? <Text style={{ color: Theme.colors.textMuted, fontSize: 11, marginRight: 4 }}>{restTimeStr}</Text> : null}
           {timeTakenStr ? <Text style={{ color: Theme.colors.success, fontSize: 11 }}>{timeTakenStr}</Text> : null}
        </View>
      </View>
    </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
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
  input: { backgroundColor: '#2a2a2a', color: Theme.colors.text, flex: 1, marginHorizontal: 3, borderRadius: 4, paddingVertical: 6, textAlign: 'center', fontSize: 16 },
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
  modalInput: { backgroundColor: '#121212', color: Theme.colors.text, padding: 12, borderRadius: 4, fontSize: 16, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 16 },
  calcResultContainer: { alignItems: 'center', backgroundColor: '#1a1a1a', padding: 16, borderRadius: Theme.borderRadius.md, marginBottom: Theme.spacing.md },
  calcResultText: { fontSize: 36, fontWeight: 'bold', color: Theme.colors.primary, marginBottom: 4 },
  calcFormulaText: { fontSize: 14, color: Theme.colors.textMuted },
  sectionTitle: { fontSize: 14, color: Theme.colors.textMuted, marginBottom: 8, fontWeight: 'bold' },
  barBtn: { flex: 1, marginHorizontal: 4, paddingVertical: 12, backgroundColor: '#111', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  barBtnActive: { borderColor: Theme.colors.primary, backgroundColor: 'rgba(79, 172, 254, 0.1)' },
  barBtnText: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: 'bold' },
  barBtnTextActive: { color: Theme.colors.primary },
  plateVisual: { marginHorizontal: 1, borderRadius: 2 },
  plateBtn: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#222', borderRadius: 8, minWidth: '22%', alignItems: 'center' },
  plateBtnText: { color: Theme.colors.text, fontWeight: 'bold', fontSize: 14 },
  applyBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 14, borderRadius: Theme.borderRadius.md, alignItems: 'center', marginTop: 8 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  choiceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  choiceChipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  choiceChipText: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  choiceChipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  deleteAction: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  }
});
