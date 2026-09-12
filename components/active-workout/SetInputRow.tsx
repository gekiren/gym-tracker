import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, Alert, StyleSheet, Keyboard, Modal } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { translateStance } from '../../src/i18n';
import { TimerButton } from './TimerButton';
import { CompactSwipeableInput } from './CompactSwipeableInput';
import { isTreadmillExercise } from '../../src/utils/exerciseUtils';

const RPE_ALLOWED_VALUES = [0, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

interface SetInputRowProps {
  ex: any;
  set: any;
  idx: number;
  updateSet: (exId: string, setId: string, values: any) => void;
  toggleSetComplete: (exId: string, setId: string) => void;
  removeSet: (exId: string, setId: string) => void;
  setActiveSetForCalc: (val: { exId: string; setId: string } | null) => void;
  calculateRM: (weight: number | null, reps: number | null) => number | null;
  startTime: string | null;
  setStanceModalTarget: (val: { type: 'exercise' | 'set'; exId: string; setId?: string; currentValue: string | null } | null) => void;
  setStanceModalVisible: (visible: boolean) => void;
  displayFields: any;
}

const RowDeleteActionLeft = ({ drag, onPress }: { drag: SharedValue<number>; onPress: () => void }) => {
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value - 80 }],
  }));
  return (
    <View style={{ width: 80 }}>
      <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
        <GHTouchableOpacity style={styles.deleteAction} onPress={onPress}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </GHTouchableOpacity>
      </Reanimated.View>
    </View>
  );
};

const RowDeleteActionRight = ({ drag, onPress }: { drag: SharedValue<number>; onPress: () => void }) => {
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 80 }],
  }));
  return (
    <View style={{ width: 80 }}>
      <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
        <GHTouchableOpacity style={styles.deleteAction} onPress={onPress}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </GHTouchableOpacity>
      </Reanimated.View>
    </View>
  );
};
export function SetInputRow({
  ex,
  set,
  idx,
  updateSet,
  toggleSetComplete,
  removeSet,
  setActiveSetForCalc,
  calculateRM,
  startTime,
  setStanceModalTarget,
  setStanceModalVisible,
  displayFields
}: SetInputRowProps) {
  const { t } = useTranslation();
  const isAerobic = ex.muscle_group === '有酸素';
  const isTreadmill = isTreadmillExercise(ex.name);

  const [localWeight, setLocalWeight] = useState(set.weight != null ? String(set.weight) : '');
  const [localReps, setLocalReps] = useState(set.reps != null ? String(set.reps) : '');
  const [localRpe, setLocalRpe] = useState(set.rpe != null ? String(set.rpe) : '');

  // トレッドミル用 state
  const [localSpeed, setLocalSpeed] = useState(set.speed != null ? String(set.speed) : '');
  const [localIncline, setLocalIncline] = useState(set.incline != null ? String(set.incline) : '');
  const [speedSel, setSpeedSel] = useState<{ start: number; end: number } | undefined>(undefined);
  const [inclineSel, setInclineSel] = useState<{ start: number; end: number } | undefined>(undefined);
  const speedInputRef = useRef<any>(null);
  const inclineInputRef = useRef<any>(null);
  const originalSpeedRef = useRef<string>('');
  const originalInclineRef = useRef<string>('');

  // 手動時間編集モーダル用 state
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualSeconds, setManualSeconds] = useState('');

  // 入力欄のスワイプ中に親の行削除スワイプが誤動作・横取りするのをネイティブレベルで防止
  const weightPanRef = useRef<any>(null);
  const repsPanRef = useRef<any>(null);
  const rpePanRef = useRef<any>(null);
  const speedPanRef = useRef<any>(null);
  const inclinePanRef = useRef<any>(null);

  const externalGesturesToFail = useMemo(() => [
    weightPanRef,
    repsPanRef,
    rpePanRef,
    speedPanRef,
    inclinePanRef,
  ], []);

  const [weightSel, setWeightSel] = useState<{ start: number; end: number } | undefined>(undefined);
  const [repsSel, setRepsSel] = useState<{ start: number; end: number } | undefined>(undefined);
  const [rpeSel, setRpeSel] = useState<{ start: number; end: number } | undefined>(undefined);
  const repsInputRef = useRef<any>(null);
  const rpeInputRef = useRef<any>(null);
  const originalWeightRef = useRef<string>('');
  const originalRepsRef = useRef<string>('');
  const originalRpeRef = useRef<string>('');

  // 有酸素ストップウォッチ state
  const [swRunning, setSwRunning] = useState(false);
  const [swElapsed, setSwElapsed] = useState(set.work_seconds != null ? set.work_seconds : 0);
  const [swStartTs, setSwStartTs] = useState<number | null>(null);

  useEffect(() => {
    if (!isAerobic && !isTreadmill) return;
    if (!swRunning) return;
    const iv = setInterval(() => {
      setSwElapsed(Math.floor((Date.now() - (swStartTs ?? Date.now())) / 1000));
    }, 500);
    return () => clearInterval(iv);
  }, [swRunning, swStartTs, isAerobic, isTreadmill]);

  const formatAerobicTime = (secs: number) => {
    const m = Math.min(Math.floor(secs / 60), 99);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 外部からの更新（プレート計算アプリなどでストアから値が変わった場合）を検知して同期
  useEffect(() => {
    if (weightSel !== undefined) return;
    if (set.weight != null) {
      const currentLocalFloat = parseFloat(localWeight.replace(',', '.'));
      if (currentLocalFloat !== set.weight) setLocalWeight(String(set.weight));
    } else {
      setLocalWeight('');
    }
  }, [set.weight]);

  useEffect(() => {
    if (repsSel !== undefined) return;
    if (set.reps != null) {
      if (parseInt(localReps, 10) !== set.reps) setLocalReps(String(set.reps));
    } else {
      setLocalReps('');
    }
  }, [set.reps]);

  useEffect(() => {
    if (rpeSel !== undefined) return;
    if (set.rpe != null) {
      const currentLocalRpeFloat = parseFloat(localRpe.replace(',', '.'));
      if (currentLocalRpeFloat !== set.rpe) setLocalRpe(String(set.rpe));
    } else {
      setLocalRpe('');
    }
  }, [set.rpe]);

  useEffect(() => {
    if (speedSel !== undefined) return;
    if (set.speed != null) {
      const currentLocalSpeedFloat = parseFloat(localSpeed.replace(',', '.'));
      if (currentLocalSpeedFloat !== set.speed) setLocalSpeed(String(set.speed));
    } else {
      setLocalSpeed('');
    }
  }, [set.speed]);

  useEffect(() => {
    if (inclineSel !== undefined) return;
    if (set.incline != null) {
      const currentLocalInclineFloat = parseFloat(localIncline.replace(',', '.'));
      if (currentLocalInclineFloat !== set.incline) setLocalIncline(String(set.incline));
    } else {
      setLocalIncline('');
    }
  }, [set.incline]);

  const safeParseFloat = (val: string): number | null => {
    if (!val || val === '.' || val === ',') return null;
    const num = parseFloat(val.replace(',', '.'));
    return isNaN(num) ? null : num;
  };

  const safeParseInt = (val: string): number | null => {
    if (!val) return null;
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
  };

  const handleWeightChange = (val: string) => {
    if (val === '' || /^\d{0,3}([.,]\d{0,1})?$/.test(val)) {
      setLocalWeight(val);
      setWeightSel(undefined);
      updateSet(ex.id, set.id, { weight: safeParseFloat(val) });
    }
  };

  const handleSpeedChange = (val: string) => {
    if (val === '' || /^\d{0,2}([.,]\d{0,1})?$/.test(val)) {
      setLocalSpeed(val);
      setSpeedSel(undefined);
      updateSet(ex.id, set.id, { speed: safeParseFloat(val) });
    }
  };

  const handleInclineChange = (val: string) => {
    if (val === '' || /^\d{0,2}([.,]\d{0,1})?$/.test(val)) {
      setLocalIncline(val);
      setInclineSel(undefined);
      updateSet(ex.id, set.id, { incline: safeParseFloat(val) });
    }
  };

  const handleOpenTimeModal = () => {
    const curSecs = set.work_seconds ?? swElapsed;
    setManualMinutes(String(Math.floor(curSecs / 60)));
    setManualSeconds(String(curSecs % 60));
    setTimeModalVisible(true);
  };

  const handleSaveManualTime = (mins: number, secs: number) => {
    const totalSecs = Math.max(0, mins * 60 + secs);
    setSwElapsed(totalSecs);
    setSwStartTs(null);
    setSwRunning(false);
    updateSet(ex.id, set.id, { work_seconds: totalSecs });
    setTimeModalVisible(false);
  };

  const handleRepsChange = (val: string) => {
    if (val === '' || /^\d{0,2}$/.test(val)) {
      setLocalReps(val);
      setRepsSel(undefined);
      updateSet(ex.id, set.id, { reps: safeParseInt(val) });
    }
  };

  const currentRM = calculateRM(set.weight, set.reps);
  const varKey = set.stance || set.variation || 'default';
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
      timeTakenStr = `⏱️${fmt}`;
    }
  }

  const handleDeleteSet = () => {
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

  return (
    <Swipeable
      requireExternalGestureToFail={externalGesturesToFail}
      renderLeftActions={(progress, drag) => <RowDeleteActionLeft drag={drag} onPress={handleDeleteSet} />}
      renderRightActions={(progress, drag) => <RowDeleteActionRight drag={drag} onPress={handleDeleteSet} />}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
    >
      <View style={{ backgroundColor: Theme.colors.card }}>
        <View style={[styles.row, set.is_completed && styles.rowCompleted]}>
          <View style={{ width: isTreadmill ? 38 : 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.tdSet} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {set.set_number}{set.side ? `(${set.side})` : ''}
            </Text>
          </View>

        {isTreadmill ? (
          /* トレッドミルモード: スピード(km/h) + 角度(%) + 時間 */
          <>
            {/* Speed Column */}
            {set.is_completed ? (
              <View style={[styles.input, { width: 56, marginHorizontal: 2 }, styles.inputReadOnly]}>
                <Text style={styles.inputReadOnlyText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {localSpeed ? `${localSpeed}` : (set.prev_speed != null ? `${set.prev_speed}` : '-')}
                </Text>
              </View>
            ) : (
              <CompactSwipeableInput 
                inputRef={speedInputRef}
                panGestureRef={speedPanRef}
                style={[styles.input, { width: 56, marginHorizontal: 2 }]} 
                keyboardType="decimal-pad" 
                step={0.5}
                placeholder={set.prev_speed != null ? String(set.prev_speed) : "-"} 
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={localSpeed}
                selection={localSpeed === '' ? (speedSel ?? { start: 0, end: 0 }) : speedSel}
                onSelectionChange={() => {}}
                onChangeText={handleSpeedChange}
                selectTextOnFocus={true}
                onFocus={() => {
                  setActiveSetForCalc({ exId: ex.id, setId: set.id });
                  originalSpeedRef.current = localSpeed;
                  if (localSpeed === '') setSpeedSel({ start: 0, end: 0 });
                }}
                onBlur={() => {
                  setSpeedSel(undefined);
                  const trimmed = localSpeed.trim();
                  if (trimmed === '' || trimmed === '.' || trimmed === ',') {
                    const restored = originalSpeedRef.current;
                    setLocalSpeed(restored);
                    updateSet(ex.id, set.id, { speed: safeParseFloat(restored) });
                  }
                }}
                returnKeyType="next"
                onSubmitEditing={() => inclineInputRef.current?.focus()}
              />
            )}

            {/* Incline Column */}
            {set.is_completed ? (
              <View style={[styles.input, { width: 50, marginHorizontal: 2 }, styles.inputReadOnly]}>
                <Text style={styles.inputReadOnlyText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {localIncline ? `${localIncline}%` : (set.prev_incline != null ? `${set.prev_incline}%` : '-')}
                </Text>
              </View>
            ) : (
              <CompactSwipeableInput 
                inputRef={inclineInputRef}
                panGestureRef={inclinePanRef}
                style={[styles.input, { width: 50, marginHorizontal: 2 }]} 
                keyboardType="decimal-pad" 
                step={0.5}
                placeholder={set.prev_incline != null ? `${set.prev_incline}%` : "-"} 
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={localIncline}
                selection={localIncline === '' ? (inclineSel ?? { start: 0, end: 0 }) : inclineSel}
                onSelectionChange={() => {}}
                onChangeText={handleInclineChange}
                selectTextOnFocus={true}
                onFocus={() => {
                  originalInclineRef.current = localIncline;
                  if (localIncline === '') setInclineSel({ start: 0, end: 0 });
                }}
                onBlur={() => {
                  setInclineSel(undefined);
                  const trimmed = localIncline.trim();
                  if (trimmed === '' || trimmed === '.' || trimmed === ',') {
                    const restored = originalInclineRef.current;
                    setLocalIncline(restored);
                    updateSet(ex.id, set.id, { incline: safeParseFloat(restored) });
                  }
                }}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            )}

            {/* Time / Stopwatch Column */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
              {set.is_completed ? (
                <Text style={{ color: Theme.colors.success, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>
                  {formatAerobicTime(set.work_seconds ?? swElapsed)}
                </Text>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <TouchableOpacity
                    onPress={handleOpenTimeModal}
                    style={[
                      styles.input,
                      {
                        width: 54,
                        marginHorizontal: 0,
                        backgroundColor: '#2a2a2a',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }
                    ]}
                  >
                    <Text style={{ color: Theme.colors.primary, fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>
                      {formatAerobicTime(swElapsed)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: swRunning ? Theme.colors.danger : Theme.colors.success,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 4,
                    }}
                    onPress={() => {
                      if (!swRunning) {
                        const now = Date.now() - swElapsed * 1000;
                        setSwStartTs(now);
                        setSwRunning(true);
                      } else {
                        setSwRunning(false);
                        updateSet(ex.id, set.id, { work_seconds: swElapsed });
                      }
                    }}
                  >
                    <Ionicons name={swRunning ? 'pause' : 'play'} size={14} color="#fff" style={{ marginLeft: swRunning ? 0 : 2 }} />
                  </TouchableOpacity>
                  {swElapsed > 0 && !swRunning && (
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      style={{ width: 22, height: 28, alignItems: 'center', justifyContent: 'center', marginLeft: 3 }}
                      onPress={() => {
                        setSwElapsed(0);
                        setSwStartTs(null);
                        updateSet(ex.id, set.id, { work_seconds: null });
                      }}
                    >
                      <Ionicons name="refresh" size={15} color={Theme.colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </>
        ) : isAerobic ? (
          /* 有酸素モード: ストップウォッチ表示 */
          set.is_completed ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
              <Text style={{ color: Theme.colors.success, fontSize: 22, fontWeight: 'bold', letterSpacing: 2 }}>
                {formatAerobicTime(set.work_seconds ?? swElapsed)}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Text style={{ color: Theme.colors.primary, fontSize: 22, fontWeight: 'bold', letterSpacing: 2, minWidth: 60, textAlign: 'center' }}>
                {formatAerobicTime(swElapsed)}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: swRunning ? Theme.colors.danger : Theme.colors.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
                onPress={() => {
                  if (!swRunning) {
                    const now = Date.now() - swElapsed * 1000;
                    setSwStartTs(now);
                    setSwRunning(true);
                  } else {
                    setSwRunning(false);
                    updateSet(ex.id, set.id, { work_seconds: swElapsed });
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
                  {swRunning ? t('ui.active_workout.aerobic_stop') : (swElapsed > 0 ? t('ui.active_workout.aerobic_resume') : t('ui.active_workout.aerobic_start'))}
                </Text>
              </TouchableOpacity>
              {swElapsed > 0 && !swRunning && (
                <TouchableOpacity onPress={() => { setSwElapsed(0); setSwStartTs(null); updateSet(ex.id, set.id, { work_seconds: null }); }}>
                  <Ionicons name="refresh" size={18} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )
        ) : (
          <>
            {/* Weight Column */}
            {ex.name === 'プランク' ? (
              <View style={[styles.input, styles.inputReadOnly, { backgroundColor: '#1e1e1e' }]}>
                <Text style={[styles.inputReadOnlyText, { color: Theme.colors.textMuted }]}>{t('equipment.自重')}</Text>
              </View>
            ) : set.is_completed ? (
              <View style={[styles.input, styles.inputReadOnly]}>
                <Text style={styles.inputReadOnlyText}>{localWeight || (set.prev_weight ? String(set.prev_weight) : '-')}</Text>
              </View>
            ) : (
              <CompactSwipeableInput 
                panGestureRef={weightPanRef}
                style={styles.input} 
                keyboardType="decimal-pad" 
                step={ex.weight_step ?? 2.5}
                placeholder={set.prev_weight ? String(set.prev_weight) : "-"} 
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={localWeight}
                selection={localWeight === '' ? (weightSel ?? { start: 0, end: 0 }) : weightSel}
                onSelectionChange={() => {}}
                onChangeText={handleWeightChange}
                selectTextOnFocus={true}
                onFocus={() => {
                  setActiveSetForCalc({ exId: ex.id, setId: set.id });
                  originalWeightRef.current = localWeight;
                  if (localWeight === '') setWeightSel({ start: 0, end: 0 });
                }}
                onBlur={() => {
                  setWeightSel(undefined);
                  const trimmed = localWeight.trim();
                  if (trimmed === '' || trimmed === '.' || trimmed === ',') {
                    const restored = originalWeightRef.current;
                    setLocalWeight(restored);
                    updateSet(ex.id, set.id, { weight: safeParseFloat(restored) });
                  }
                }}
                returnKeyType="next"
                onSubmitEditing={() => repsInputRef.current?.focus()}
              />
            )}

            {/* Reps Column */}
            {ex.name === 'プランク' ? (
              set.is_completed ? (
                <View style={[styles.input, { width: 70 }, styles.inputReadOnly]}>
                  <Text style={styles.inputReadOnlyText}>{localReps ? `${localReps}${t('ui.active_workout.seconds_unit')}` : (set.prev_reps ? `${set.prev_reps}${t('ui.active_workout.seconds_unit')}` : '-')}</Text>
                </View>
              ) : (
                <CompactSwipeableInput 
                  inputRef={repsInputRef}
                  panGestureRef={repsPanRef}
                  style={[styles.input, { width: 70 }]} 
                  keyboardType="numeric" 
                  step={1}
                  placeholder={set.prev_reps ? `${set.prev_reps}${t('ui.active_workout.seconds_unit')}` : t('ui.active_workout.seconds_unit')} 
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={localReps}
                  selection={localReps === '' ? (repsSel ?? { start: 0, end: 0 }) : repsSel}
                  onSelectionChange={() => {}}
                  onChangeText={handleRepsChange}
                  selectTextOnFocus={true}
                  onFocus={() => {
                    originalRepsRef.current = localReps;
                    if (localReps === '') setRepsSel({ start: 0, end: 0 });
                  }}
                  onBlur={() => {
                    setRepsSel(undefined);
                    const trimmed = localReps.trim();
                    if (trimmed === '') {
                      const restored = originalRepsRef.current;
                      setLocalReps(restored);
                      updateSet(ex.id, set.id, { reps: safeParseInt(restored) });
                    }
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              )
            ) : set.is_completed ? (
              <View style={[styles.input, { width: 70 }, styles.inputReadOnly]}>
                <Text style={styles.inputReadOnlyText}>{localReps || (set.prev_reps ? String(set.prev_reps) : '-')}</Text>
              </View>
            ) : (
              <CompactSwipeableInput 
                inputRef={repsInputRef}
                panGestureRef={repsPanRef}
                style={[styles.input, { width: 70 }]} 
                keyboardType="numeric" 
                step={1}
                placeholder={set.prev_reps ? String(set.prev_reps) : "-"} 
                placeholderTextColor="rgba(255,255,255,0.2)"
                value={localReps}
                selection={localReps === '' ? (repsSel ?? { start: 0, end: 0 }) : repsSel}
                onSelectionChange={() => {}}
                onChangeText={handleRepsChange}
                selectTextOnFocus={true}
                onFocus={() => {
                  originalRepsRef.current = localReps;
                  if (localReps === '') setRepsSel({ start: 0, end: 0 });
                }}
                onBlur={() => {
                  setRepsSel(undefined);
                  const trimmed = localReps.trim();
                  if (trimmed === '') {
                    const restored = originalRepsRef.current;
                    setLocalReps(restored);
                    updateSet(ex.id, set.id, { reps: safeParseInt(restored) });
                  }
                }}
                returnKeyType={displayFields?.showRpe !== false ? "next" : "done"}
                onSubmitEditing={() => {
                  if (displayFields?.showRpe !== false) {
                    rpeInputRef.current?.focus();
                  } else {
                    Keyboard.dismiss();
                  }
                }}
              />
            )}

            {/* RPE Column */}
            {displayFields?.showRpe !== false ? (
              ex.name === 'プランク' ? (
                set.is_completed ? (
                  <View style={[styles.input, { width: 55 }, styles.inputReadOnly]}>
                    <Ionicons name="timer-outline" size={18} color={Theme.colors.textMuted} />
                  </View>
                ) : (
                  <TimerButton 
                    onTimeCapture={(seconds: number) => {
                      setLocalReps(String(seconds));
                      updateSet(ex.id, set.id, { reps: seconds });
                    }}
                  />
                )
              ) : set.is_completed ? (
                <View style={[styles.input, { width: 55 }, styles.inputReadOnly]}>
                  <Text style={styles.inputReadOnlyText}>{localRpe || '-'}</Text>
                </View>
              ) : (
                <CompactSwipeableInput 
                  inputRef={rpeInputRef}
                  panGestureRef={rpePanRef}
                  style={[styles.input, { width: 55 }]} 
                  keyboardType="numeric" 
                  step={0.5}
                  maxValue={10}
                  allowedValues={RPE_ALLOWED_VALUES}
                  placeholder="-" 
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={localRpe}
                  selection={localRpe === '' ? (rpeSel ?? { start: 0, end: 0 }) : rpeSel}
                  onSelectionChange={() => {}}
                  onChangeText={(val) => {
                    if (val === '' || /^\d{0,2}([.,]\d{0,1})?$/.test(val)) {
                      const num = safeParseFloat(val);
                      if (num !== null && num > 10) {
                        setLocalRpe('10');
                        setRpeSel(undefined);
                        updateSet(ex.id, set.id, { rpe: 10 });
                      } else {
                        setLocalRpe(val);
                        setRpeSel(undefined);
                        updateSet(ex.id, set.id, { rpe: num });
                      }
                    }
                  }}
                  selectTextOnFocus={true}
                  onFocus={() => {
                    originalRpeRef.current = localRpe;
                    if (localRpe === '') setRpeSel({ start: 0, end: 0 });
                  }}
                  onBlur={() => {
                    setRpeSel(undefined);
                    const trimmed = localRpe.trim();
                    if (trimmed === '' || trimmed === '.' || trimmed === ',') {
                      const restored = originalRpeRef.current;
                      setLocalRpe(restored);
                      updateSet(ex.id, set.id, { rpe: safeParseFloat(restored) });
                    }
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              )
            ) : null}
          </>
        )}

        {/* Check Button & RM Display */}
        <View style={{ width: 36, alignItems: 'center' }}>
          <GHTouchableOpacity
            style={[styles.checkBtn, set.is_completed && styles.checkBtnActive]}
            onPress={() => {
              Keyboard.dismiss();
              if ((isAerobic || isTreadmill) && !set.is_completed) {
                let finalSeconds = swElapsed;
                if (swRunning) {
                  setSwRunning(false);
                  finalSeconds = Math.floor((Date.now() - (swStartTs ?? Date.now())) / 1000);
                  setSwElapsed(finalSeconds);
                }
                const updates: any = { work_seconds: finalSeconds };
                if (isTreadmill) {
                  const spd = safeParseFloat(localSpeed);
                  const inc = safeParseFloat(localIncline);
                  if (spd !== null) updates.speed = spd;
                  if (inc !== null) updates.incline = inc;
                }
                updateSet(ex.id, set.id, updates);
              }
              toggleSetComplete(ex.id, set.id);
            }}
          >
            <Ionicons name="checkmark" size={16} color={set.is_completed ? '#fff' : Theme.colors.textMuted} />
          </GHTouchableOpacity>
        </View>
      </View>
      
      {/* Meta Row (Variation & RM & Time & PR) - 筋トレ種目のみ表示 */}
      {!isAerobic && !isTreadmill && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8, marginTop: -4 }}>
          {/* Left side: Variation */}
          {displayFields?.showStance !== false ? (
            <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center', paddingLeft: 4 }}>
              {set.is_completed ? (
                <Text style={{ color: Theme.colors.textMuted, fontSize: 11 }} numberOfLines={1}>
                  {(set.stance || set.variation) ? `${t('ui.active_workout.stance_label')}: ${translateStance(set.stance || set.variation)}` : `${t('ui.active_workout.stance_label')}: -`}
                </Text>
              ) : (
                <GHTouchableOpacity 
                  onPress={() => {
                    const curStance = set.stance || set.variation || null;
                    setStanceModalTarget({ type: 'set', exId: ex.id, setId: set.id, currentValue: curStance });
                    setStanceModalVisible(true);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Text style={{ color: Theme.colors.primary, fontSize: 11, textDecorationLine: 'underline' }} numberOfLines={1}>
                    {(set.stance || set.variation) ? `${t('ui.active_workout.stance_label')}: ${translateStance(set.stance || set.variation)}` : t('ui.active_workout.stance_add_link')}
                  </Text>
                </GHTouchableOpacity>
              )}
            </View>
          ) : <View style={{ flex: 1.8 }} />}

           {/* Right side: RM & Time & PR */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1.2 }}>
             {isPR && <Text style={{ color: '#f5a623', fontSize: 11, fontWeight: 'bold', marginRight: 8 }}>{t('ui.active_workout.pr_label').split(' ')[0]}</Text>}
             {displayFields?.show1RM !== false && currentRM != null && <Text style={{ color: Theme.colors.primary, fontSize: 11, marginRight: 8 }}>1RM: {ex.equipment === '自重' ? `BW + ${currentRM}` : currentRM}</Text>}
             {restTimeStr ? <Text style={{ color: Theme.colors.textMuted, fontSize: 11, marginRight: 4 }}>{restTimeStr}</Text> : null}
             {timeTakenStr ? <Text style={{ color: Theme.colors.success, fontSize: 11 }}>{timeTakenStr}</Text> : null}
          </View>
        </View>
      )}

      {/* 手動時間入力モーダル */}
      <Modal visible={timeModalVisible} transparent animationType="fade" onRequestClose={() => setTimeModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('ui.active_workout.manual_time_prompt') || '走行時間の手動設定'}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 16 }}>
              <TextInput
                style={styles.timeModalInput}
                keyboardType="numeric"
                value={manualMinutes}
                onChangeText={setManualMinutes}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
              />
              <Text style={{ color: Theme.colors.text, fontSize: 16, marginHorizontal: 6 }}>{t('ui.active_workout.minutes_unit') || '分'}</Text>
              <TextInput
                style={styles.timeModalInput}
                keyboardType="numeric"
                value={manualSeconds}
                onChangeText={setManualSeconds}
                placeholder="00"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              <Text style={{ color: Theme.colors.text, fontSize: 16, marginLeft: 6 }}>{t('ui.active_workout.seconds_unit') || '秒'}</Text>
            </View>

            {/* クイック分選択ボタン */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {[5, 10, 15, 20, 30].map(m => (
                <TouchableOpacity
                  key={m}
                  style={styles.quickTimeBtn}
                  onPress={() => {
                    setManualMinutes(String(m));
                    setManualSeconds('0');
                  }}
                >
                  <Text style={styles.quickTimeBtnText}>{m}分</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#333' }]}
                onPress={() => setTimeModalVisible(false)}
              >
                <Text style={{ color: Theme.colors.textMuted, fontWeight: 'bold' }}>{t('ui.common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Theme.colors.primary }]}
                onPress={() => {
                  const m = parseInt(manualMinutes, 10) || 0;
                  const s = parseInt(manualSeconds, 10) || 0;
                  handleSaveManualTime(m, s);
                }}
              >
                <Text style={{ color: '#000', fontWeight: 'bold' }}>{t('ui.common.confirm') || '確定'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  rowCompleted: { opacity: 0.7 },
  tdSet: { color: Theme.colors.text, textAlign: 'center', fontSize: 16, fontWeight: '500' },
  input: {
    backgroundColor: '#2a2a2a',
    color: Theme.colors.text,
    width: 90,
    height: 30,
    marginHorizontal: 3,
    borderRadius: 4,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 4,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    fontSize: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputReadOnly: { opacity: 0.7, justifyContent: 'center', alignItems: 'center' },
  inputReadOnlyText: { color: Theme.colors.text, fontSize: 15, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false },
  checkBtn: { width: 30, height: 30, backgroundColor: '#333', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkBtnActive: { backgroundColor: Theme.colors.success },
  deleteAction: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: Theme.colors.text,
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timeModalInput: {
    backgroundColor: '#333',
    color: Theme.colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    width: 65,
    height: 44,
    borderRadius: 8,
    textAlign: 'center',
  },
  quickTimeBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickTimeBtnText: {
    color: Theme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
