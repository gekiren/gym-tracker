import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, AppState, BackHandler, Modal } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../src/store/workoutStore';
import { Theme } from '../src/theme';
import { saveWorkout } from '../src/db/database';
import { useTranslation } from 'react-i18next';

export default function ActiveWorkoutScreen() {
  const { t } = useTranslation();
  const { 
    title, startTime, workoutNotes, exercises, endWorkout, 
    updateWorkoutNotes, updateExerciseNotes,
    addExercise, addSet, toggleSetComplete, updateSet, 
    restTimer, stopRestTimer, adjustRestTimer, tickRestTimer 
  } = useWorkoutStore();
  
  const [elapsed, setElapsed] = useState(0);
  const [showWorkoutNotes, setShowWorkoutNotes] = useState(false);
  const [expandedExerciseNotes, setExpandedExerciseNotes] = useState<Record<string, boolean>>({});

  // プレート計算機用State
  const [plateCalcVisible, setPlateCalcVisible] = useState(false);
  const [plateCalcBar, setPlateCalcBar] = useState(20);
  const [platesOnOneSide, setPlatesOnOneSide] = useState<number[]>([]);
  const [activeSetForCalc, setActiveSetForCalc] = useState<{exId: number, setId: number} | null>(null);

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
      'ワークアウトの中断',
      'ワークアウトを中止して終了しますか？\n中止せずに離れる場合はバックグラウンドで継続します。',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '中止せずに離れる',
          style: 'default',
          onPress: () => {
            router.dismiss();
          }
        },
        {
          text: '中止して終了する',
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

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => backHandler.remove();
  }, [handleBack]);

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
      'ワークアウトの終了',
      '現在の記録を保存して終了しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '保存して終了',
          style: 'default',
          onPress: async () => {
            try {
              const et = new Date().toISOString();
              await saveWorkout(title || 'Empty Workout', startTime || et, et, workoutNotes, exercises);
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
          title: title || 'ワークアウト',
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={{ marginLeft: 8 }}>
              <Ionicons name="chevron-down" size={28} color={Theme.colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.timeText}>{formatTime(elapsed)}</Text>

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
              <TouchableOpacity onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.exercise_id || ex.id } } as any)}>
                <Text style={styles.exerciseTitle}>{ex.name}</Text>
              </TouchableOpacity>
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
              <Text style={[styles.th, { width: 40 }]}>セット</Text>
              <Text style={[styles.th, { flex: 1 }]}>kg</Text>
              <Text style={[styles.th, { flex: 1 }]}>回数</Text>
              <Text style={[styles.th, { width: 45 }]}>RPE</Text>
              <Text style={[styles.th, { width: 40 }]}></Text>
            </View>

            {ex.sets.map((set, idx) => {
              const currentRM = calculateRM(set.weight, set.reps);
              
              let timeTakenStr = '';
              if (set.is_completed && set.completedAt && startTime) {
                const prevTime = idx === 0 
                  ? new Date(startTime).getTime() 
                  : ex.sets[idx - 1].completedAt || new Date(startTime).getTime();
                const diffSecs = Math.floor((set.completedAt - prevTime) / 1000);
                if (diffSecs > 0) {
                  const m = Math.floor(diffSecs / 60);
                  const s = diffSecs % 60;
                  timeTakenStr = m > 0 ? `${m}m${s}s` : `${s}s`;
                }
              }

              return (
                <View key={set.id}>
                  <View style={[styles.row, set.is_completed && styles.rowCompleted]}>
                    <Text style={styles.tdSet}>{set.set_number}</Text>
                    <TextInput 
                      style={styles.input} 
                      keyboardType="numeric" 
                      placeholder={set.prev_weight ? String(set.prev_weight) : "-"} 
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={set.weight ? String(set.weight) : ''}
                      onChangeText={(val) => updateSet(ex.id, set.id, { weight: val ? parseFloat(val) : null })}
                      onFocus={() => setActiveSetForCalc({ exId: ex.id, setId: set.id })}
                    />
                    <TextInput 
                      style={styles.input} 
                      keyboardType="numeric" 
                      placeholder={set.prev_reps ? String(set.prev_reps) : "-"} 
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={set.reps ? String(set.reps) : ''}
                      onChangeText={(val) => updateSet(ex.id, set.id, { reps: val ? parseInt(val, 10) : null })}
                    />
                    <TextInput 
                      style={[styles.input, { width: 45, flex: 0 }]} 
                      keyboardType="numeric" 
                      placeholder="-" 
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={set.rpe ? String(set.rpe) : ''}
                      onChangeText={(val) => updateSet(ex.id, set.id, { rpe: val ? parseFloat(val) : null })}
                    />
                    
                    {/* Check Button & RM Display */}
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <TouchableOpacity 
                        style={[styles.checkBtn, set.is_completed && styles.checkBtnActive]}
                        onPress={() => toggleSetComplete(ex.id, set.id)}
                      >
                        <Ionicons name="checkmark" size={18} color={set.is_completed ? '#fff' : Theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* Meta Row (RM & Time) */}
                  {(currentRM != null || timeTakenStr) && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 8, marginBottom: 8, marginTop: -4 }}>
                       {currentRM != null && <Text style={{ color: Theme.colors.primary, fontSize: 11, marginRight: 12 }}>1RM {currentRM}</Text>}
                       {timeTakenStr ? <Text style={{ color: Theme.colors.success, fontSize: 11 }}>{timeTakenStr}</Text> : null}
                    </View>
                  )}
                </View>
              );
            })}

            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ex.id)}>
              <Text style={styles.addSetBtnText}>+ セット追加</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addExerciseBtn} onPress={handleAddExercise}>
          <Text style={styles.addExerciseBtnText}>+ 種目を追加</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Rest Timer UI */}
      {restTimer.isActive && (
        <View style={styles.timerOverlay}>
          <View style={styles.timerContent}>
            <View>
              <Text style={styles.timerLabel}>休憩中</Text>
              <Text style={styles.timerDigits}>{formatTime(restTimer.remaining)}</Text>
            </View>
            <View style={styles.timerActions}>
              <TouchableOpacity style={styles.timerBtn} onPress={() => handleAdjustRest(-30)}>
                <Text style={styles.timerBtnText}>-30s</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.timerBtn, { backgroundColor: Theme.colors.card }]} onPress={stopRestTimer}>
                <Text style={styles.timerBtnText}>スキップ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerBtn} onPress={() => handleAdjustRest(30)}>
                <Text style={styles.timerBtnText}>+30s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {/* プレート計算機モーダル */}
      <Modal visible={plateCalcVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.md }}>
              <Text style={styles.modalTitle}>バーとプレート計算</Text>
              <TouchableOpacity onPress={() => setPlateCalcVisible(false)}>
                <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.calcResultContainer}>
              <Text style={styles.calcResultText}>{totalPlateWeight} kg</Text>
              <Text style={styles.calcFormulaText}>
                バー {plateCalcBar}kg + 片側 {platesOnOneSide.reduce((a,b)=>a+b, 0)}kg × 2
              </Text>
            </View>

            {/* バーの選択 */}
            <Text style={styles.sectionTitle}>バーの重さ</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Theme.spacing.md }}>
              {[20, 15, 10].map(w => (
                <TouchableOpacity
                  key={w}
                  style={[styles.barBtn, plateCalcBar === w && styles.barBtnActive]}
                  onPress={() => setPlateCalcBar(w)}
                >
                  <Text style={[styles.barBtnText, plateCalcBar === w && styles.barBtnTextActive]}>{w} kg</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Theme.spacing.md, backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' }}>
              <View style={{ width: 10, height: '100%', backgroundColor: '#666' }} />
              {/* 真ん中のバー部分 */}
              <View style={{ flex: 1, height: 16, backgroundColor: '#888', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                {/* プレートの描画 (内側から外側へ) */}
                {platesOnOneSide.map((p, i) => (
                  <View key={i} style={[styles.plateVisual, { height: p >= 15 ? 46 : p >= 5 ? 30 : 20, width: p >= 15 ? 12 : 8, backgroundColor: Theme.colors.primary }]} />
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>追加するプレート (片側)</Text>
              <TouchableOpacity onPress={() => setPlatesOnOneSide(prev => prev.slice(0, -1))} disabled={platesOnOneSide.length === 0}>
                 <Text style={{ color: platesOnOneSide.length > 0 ? Theme.colors.danger : Theme.colors.textMuted }}>元に戻す</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Theme.spacing.lg }}>
              {[25, 20, 15, 10, 5, 2.5, 1.25].map(w => (
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
                  Alert.alert('反映完了', `${totalPlateWeight}kgをセットに入力しました。`);
                } else {
                  Alert.alert('エラー', '反映先のセットを選択(タップ)してからお試しください。');
                }
                setPlateCalcVisible(false);
              }}
            >
              <Text style={styles.applyBtnText}>入力中のセットに反映する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  timeText: { color: Theme.colors.textMuted, fontSize: 16, textAlign: 'center', marginVertical: 8 },
  card: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.lg },
  exerciseTitle: { color: Theme.colors.primary, fontSize: 18, fontWeight: 'bold', marginBottom: Theme.spacing.md },
  tableHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  th: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  rowCompleted: { opacity: 0.7 },
  tdSet: { color: Theme.colors.text, width: 40, textAlign: 'center', fontSize: 16, fontWeight: '500' },
  input: { backgroundColor: '#2a2a2a', color: Theme.colors.text, flex: 1, marginHorizontal: 3, borderRadius: 4, paddingVertical: 6, textAlign: 'center', fontSize: 16 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.lg, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
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
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
