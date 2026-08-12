import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Keyboard } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { translateStance } from '../../src/i18n';
import { TimerButton } from './TimerButton';
import { CompactSwipeableInput } from './CompactSwipeableInput';

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
  const [localWeight, setLocalWeight] = useState(set.weight != null ? String(set.weight) : '');
  const [localReps, setLocalReps] = useState(set.reps != null ? String(set.reps) : '');
  const [localRpe, setLocalRpe] = useState(set.rpe != null ? String(set.rpe) : '');

  const [weightSel, setWeightSel] = useState<{ start: number; end: number } | undefined>(undefined);
  const [repsSel, setRepsSel] = useState<{ start: number; end: number } | undefined>(undefined);
  const [rpeSel, setRpeSel] = useState<{ start: number; end: number } | undefined>(undefined);
  const repsInputRef = useRef<TextInput>(null);
  const rpeInputRef = useRef<TextInput>(null);
  const originalWeightRef = useRef<string>('');
  const originalRepsRef = useRef<string>('');
  const originalRpeRef = useRef<string>('');

  // 有酸素ストップウォッチ state
  const isAerobic = ex.muscle_group === '有酸素';
  const [swRunning, setSwRunning] = useState(false);
  const [swElapsed, setSwElapsed] = useState(set.work_seconds != null ? set.work_seconds : 0);
  const [swStartTs, setSwStartTs] = useState<number | null>(null);

  useEffect(() => {
    if (!isAerobic) return;
    if (!swRunning) return;
    const iv = setInterval(() => {
      setSwElapsed(Math.floor((Date.now() - (swStartTs ?? Date.now())) / 1000));
    }, 500);
    return () => clearInterval(iv);
  }, [swRunning, swStartTs, isAerobic]);

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
          <GHTouchableOpacity 
            style={styles.deleteAction}
            onPress={handleLongPress}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </GHTouchableOpacity>
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
          <GHTouchableOpacity 
            style={styles.deleteAction}
            onPress={handleLongPress}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </GHTouchableOpacity>
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

        {isAerobic ? (
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
                  style={[styles.input, { width: 55 }]} 
                  keyboardType="numeric" 
                  step={0.5}
                  placeholder="-" 
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={localRpe}
                  selection={localRpe === '' ? (rpeSel ?? { start: 0, end: 0 }) : rpeSel}
                  onSelectionChange={() => {}}
                  onChangeText={(val) => {
                    if (val === '' || /^\d{0,2}([.,]\d{0,1})?$/.test(val)) {
                      setLocalRpe(val);
                      setRpeSel(undefined);
                      updateSet(ex.id, set.id, { rpe: safeParseFloat(val) });
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
        <View style={{ width: 40, alignItems: 'center' }}>
          <TouchableOpacity 
            style={[styles.checkBtn, set.is_completed && styles.checkBtnActive]}
            onPress={() => {
              if (isAerobic && !set.is_completed) {
                let finalSeconds = swElapsed;
                if (swRunning) {
                  setSwRunning(false);
                  finalSeconds = Math.floor((Date.now() - (swStartTs ?? Date.now())) / 1000);
                  setSwElapsed(finalSeconds);
                }
                updateSet(ex.id, set.id, { work_seconds: finalSeconds });
              }
              toggleSetComplete(ex.id, set.id);
            }}
          >
            <Ionicons name="checkmark" size={18} color={set.is_completed ? '#fff' : Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
      
      {/* Meta Row (Variation & RM & Time & PR) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8, marginTop: -4 }}>
        {/* Left side: Variation */}
        {displayFields?.showStance !== false ? (
          <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center', paddingLeft: 4 }}>
            {set.is_completed ? (
              <Text style={{ color: Theme.colors.textMuted, fontSize: 11 }} numberOfLines={1}>
                {(set.stance || set.variation) ? `${t('ui.active_workout.stance_label')}: ${translateStance(set.stance || set.variation)}` : `${t('ui.active_workout.stance_label')}: -`}
              </Text>
            ) : (
              <TouchableOpacity 
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
              </TouchableOpacity>
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
    </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  rowCompleted: { opacity: 0.7 },
  tdSet: { color: Theme.colors.text, textAlign: 'center', fontSize: 16, fontWeight: '500' },
  input: { backgroundColor: '#2a2a2a', color: Theme.colors.text, width: 90, height: 32, marginHorizontal: 3, borderRadius: 4, paddingVertical: 0, paddingHorizontal: 4, textAlign: 'center', fontSize: 15, justifyContent: 'center', alignItems: 'center' },
  inputReadOnly: { opacity: 0.7, justifyContent: 'center', alignItems: 'center' },
  inputReadOnlyText: { color: Theme.colors.text, fontSize: 16 },
  checkBtn: { width: 32, height: 32, backgroundColor: '#333', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkBtnActive: { backgroundColor: Theme.colors.success },
  deleteAction: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  }
});
