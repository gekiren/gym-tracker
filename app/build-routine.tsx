import { View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../src/theme';
import { useSettingsStore } from '../src/store/settingsStore';
import { useRoutineDraftStore } from '../src/store/routineDraftStore';
import { addRoutine, updateRoutine, getRoutines, loadFullWorkoutData, getDB } from '../src/db/database';
import { useTranslation } from 'react-i18next';
import { translateExercise } from '../src/i18n';
import { useShallow } from 'zustand/react/shallow';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { isTreadmillExercise } from '../src/utils/exerciseUtils';

export default function BuildRoutineScreen() {
  const { id: routineIdString } = useLocalSearchParams<{ id: string }>();
  const routineId = routineIdString ? parseInt(routineIdString, 10) : undefined;
  const isEditMode = routineId !== undefined;
  const { 
    draftRoutine, updateDraftTitle, removeDraftExercise, 
    addDraftSet, removeDraftSet, updateDraftSet, setDraftRoutine, clearDraft
  } = useRoutineDraftStore(useShallow(state => ({
    draftRoutine: state.draftRoutine,
    updateDraftTitle: state.updateDraftTitle,
    removeDraftExercise: state.removeDraftExercise,
    addDraftSet: state.addDraftSet,
    removeDraftSet: state.removeDraftSet,
    updateDraftSet: state.updateDraftSet,
    setDraftRoutine: state.setDraftRoutine,
    clearDraft: state.clearDraft
  })));
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const isPremium = useSettingsStore(state => state.settings.isPremium);
  const isEarly = useSettingsStore(state => state.settings.isEarlyAdopter);
  const isBasic = !isPremium && !isEarly;

  const handleRestrictedFeatureAlert = () => {
    Alert.alert(
      'プレミアム機能',
      '既存ルーティンや履歴からのインポート作成はプレミアムプラン限定機能です。アップグレードしてすべての制限を解除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'アップグレードする', onPress: () => router.push('/(tabs)/profile') }
      ]
    );
  };

  const [routinesList, setRoutinesList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    if (routineIdString) {
      const parsed = parseInt(routineIdString, 10);
      if (isNaN(parsed)) {
        Alert.alert(t('ui.common.error') || 'Error', 'Invalid Routine ID');
        router.back();
      }
    }
  }, [routineIdString]);

  useEffect(() => {
    clearDraft();
    fetchRoutinesAndHistory();
  }, []);

  useEffect(() => {
    // Only proceed if the ID is valid (not NaN)
    if (routineId !== undefined && isNaN(routineId)) return;
    clearDraft();
    fetchRoutinesAndHistory();
  }, [routineId]);

  const fetchRoutinesAndHistory = async () => {
    try {
      const routinesData = await getRoutines();
      setRoutinesList(routinesData);

      if (isEditMode) {
        const targetRoutine = routinesData.find(r => r.id === routineId);
        if (targetRoutine) {
          const mappedExercises = targetRoutine.exercises.map((ex: any) => ({
            id: ex.id,
            name: ex.name,
            is_unilateral: ex.is_unilateral,
            equipment: ex.equipment,
            sets: ex.sets.map((s: any) => ({
              id: Math.random().toString(36).substring(7),
              set_number: s.set_number,
              weight: s.weight,
              reps: s.reps,
              rpe: s.rpe,
              speed: s.speed ?? null,
              incline: s.incline ?? null,
              work_seconds: s.work_seconds ?? null,
              side: s.side || null,
              variation: s.variation || null,
              stance: s.stance || null
            }))
          }));
          setDraftRoutine(targetRoutine.title, mappedExercises);
        }
      }

      const db = getDB();
      const historyRows = await db.getAllAsync(`
        SELECT id, title, start_time 
        FROM workouts 
        ORDER BY start_time DESC
      `);
      setHistoryList(historyRows as any[]);
    } catch (e) {
      console.warn('Failed to fetch routines and history for copy', e);
    }
  };

  const handleCopyFromRoutine = (selectedRoutine: any) => {
    const mapped = selectedRoutine.exercises.map((ex: any) => ({
      id: ex.id,
      name: ex.name,
      is_unilateral: ex.is_unilateral,
      equipment: ex.equipment,
      sets: ex.sets.map((s: any) => ({
        id: Math.random().toString(36).substring(7),
        set_number: s.set_number,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        speed: s.speed ?? null,
        incline: s.incline ?? null,
        work_seconds: s.work_seconds ?? null,
        side: s.side || null,
        variation: s.variation || null,
        stance: s.stance || null
      }))
    }));
    setDraftRoutine(`${selectedRoutine.title}${t('ui.common.copy') || ' (Copy)'}`, mapped);
    setShowRoutineModal(false);
  };

  const handleCopyFromWorkout = async (workoutId: number, workoutTitle: string) => {
    try {
      const fullData = await loadFullWorkoutData(workoutId);
      if (!fullData) return;

      const mapped = fullData.exercises.map((ex: any) => {
        const uniqueSets: any[] = [];
        const seenSetNumbers = new Set<number>();

        ex.sets.forEach((s: any) => {
          if (!seenSetNumbers.has(s.set_number)) {
            seenSetNumbers.add(s.set_number);
            uniqueSets.push({
              id: Math.random().toString(36).substring(7),
              set_number: s.set_number,
              weight: s.weight,
              reps: s.reps,
              rpe: s.rpe,
              speed: s.speed ?? null,
              incline: s.incline ?? null,
              work_seconds: s.work_seconds ?? null,
              side: s.side || null,
              variation: s.variation || null,
              stance: s.stance || null
            });
          }
        });

        return {
          id: ex.exercise_id,
          name: ex.exercise_name,
          sets: uniqueSets
        };
      });

      setDraftRoutine(`${workoutTitle}${t('ui.common.copy') || ' (Copy)'}`, mapped);
      setShowHistoryModal(false);
    } catch (e) {
      console.error('Failed to copy from workout', e);
      Alert.alert(t('ui.common.error'), 'Failed to load workout data.');
    }
  };

  const handleSave = async () => {
    if (!draftRoutine.title.trim()) {
      Alert.alert(t('ui.common.error'), t('ui.build_routine.error_no_title'));
      return;
    }
    if (draftRoutine.exercises.length === 0) {
      Alert.alert(t('ui.common.error'), t('ui.build_routine.error_no_exercises'));
      return;
    }

    if (!isEditMode && isBasic && routinesList.length >= 10) {
      Alert.alert(
        'ルーティン登録制限',
        'ベーシックプランでは最大10個までルーティンを登録できます。登録上限を増やすにはプレミアムプランへのアップグレードが必要です。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'アップグレードする', onPress: () => router.push('/(tabs)/profile') }
        ]
      );
      return;
    }

    try {
      if (isEditMode) {
        await updateRoutine(
          routineId,
          draftRoutine.title.trim(),
          draftRoutine.exercises.map((e: any) => e.name).join(', '),
          draftRoutine.exercises
        );
      } else {
        await addRoutine(
          draftRoutine.title.trim(),
          draftRoutine.exercises.map((e: any) => e.name).join(', '),
          draftRoutine.exercises
        );
      }
      clearDraft();
      router.back();
    } catch (e) {
      Alert.alert(t('ui.common.error'), t('ui.build_routine.error_save_failed'));
      console.error(e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerCloseBtn}>
          <Ionicons name="close" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{isEditMode ? 'ルーティン編集' : t('ui.build_routine.title')}</Text>
        <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.saveBtnText}>{t('ui.common.save')}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView 
        contentContainerStyle={styles.content} 
        keyboardShouldPersistTaps="handled" 
        bottomOffset={16}
      >
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('ui.build_routine.routine_name_label')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder={t('ui.build_routine.routine_name_placeholder')}
          placeholderTextColor={colors.textMuted}
          value={draftRoutine.title}
          onChangeText={updateDraftTitle}
        />

        {draftRoutine.exercises.length === 0 ? (
          <View style={[styles.importBlock, { backgroundColor: colors.card }, isBasic && styles.importBlockDisabled]}>
            <Ionicons 
              name={isBasic ? "lock-closed-outline" : "copy-outline"} 
              size={36} 
              color={isBasic ? colors.textMuted : colors.primary} 
              style={{ marginBottom: 12 }} 
            />
            <Text style={[styles.importTitle, { color: isBasic ? colors.textMuted : colors.text }]}>
              {t('ui.build_routine.import_title')}{isBasic && '（プレミアム限定）'}
            </Text>
            <Text style={[styles.importDesc, { color: colors.textMuted }]}>
              {isBasic 
                ? '※この機能はベーシックプランでは制限されています。ルーティンを自動作成するにはプレミアムプランへのアップグレードが必要です。'
                : t('ui.build_routine.import_desc')
              }
            </Text>
            
            <View style={styles.importButtonsRow}>
              <TouchableOpacity 
                style={[
                  styles.importBtn, 
                  { marginRight: 8 },
                  isBasic && styles.importBtnDisabled
                ]} 
                onPress={() => {
                  if (isBasic) {
                    handleRestrictedFeatureAlert();
                  } else {
                    setShowRoutineModal(true);
                  }
                }}
              >
                <Ionicons 
                  name={isBasic ? "lock-closed-outline" : "barbell-outline"} 
                  size={20} 
                  color={isBasic ? colors.textMuted : colors.primary} 
                  style={{ marginBottom: 6 }} 
                />
                <Text style={[styles.importBtnText, { color: isBasic ? colors.textMuted : colors.text }]} numberOfLines={2}>
                  {t('ui.build_routine.copy_routine_btn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.importBtn, 
                  { marginLeft: 8 },
                  isBasic && styles.importBtnDisabled
                ]} 
                onPress={() => {
                  if (isBasic) {
                    handleRestrictedFeatureAlert();
                  } else {
                    setShowHistoryModal(true);
                  }
                }}
              >
                <Ionicons 
                  name={isBasic ? "lock-closed-outline" : "time-outline"} 
                  size={20} 
                  color={isBasic ? colors.textMuted : colors.primary} 
                  style={{ marginBottom: 6 }} 
                />
                <Text style={[styles.importBtnText, { color: isBasic ? colors.textMuted : colors.text }]} numberOfLines={2}>
                  {t('ui.build_routine.copy_workout_btn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.exercisesHeader}>
              <Text style={[styles.label, { color: colors.textMuted }]}>{t('ui.build_routine.exercises_count_label', { count: draftRoutine.exercises.length })}</Text>
            </View>

            {draftRoutine.exercises.map((ex: any, exIdx: number) => (
              <View key={`${ex.id}-${exIdx}`} style={[styles.exerciseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.exerciseCardHeader}>
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{exIdx + 1}</Text>
                  </View>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>{translateExercise(ex.name)}</Text>
                  <TouchableOpacity onPress={() => removeDraftExercise(exIdx)} style={styles.removeExerciseBtn}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                </View>

                {/* セットの一覧 */}
                <View style={styles.setsContainer}>
                  <View style={styles.setsHeaderRow}>
                    <Text style={[styles.setsHeaderTh, { width: 50, color: colors.textMuted }]}>{t('ui.build_routine.set_label')}</Text>
                    <Text style={[styles.setsHeaderTh, { flex: 1, color: colors.textMuted }]}>
                      {isTreadmillExercise(ex.name) ? (t('ui.build_routine.speed_placeholder') || '速度 (km/h)') : t('ui.build_routine.weight_placeholder')}
                    </Text>
                    <Text style={[styles.setsHeaderTh, { flex: 1, color: colors.textMuted }]}>
                      {isTreadmillExercise(ex.name) ? (t('ui.build_routine.incline_placeholder') || '傾斜 (%)') : t('ui.build_routine.reps_placeholder')}
                    </Text>
                    <Text style={[styles.setsHeaderTh, { width: 40 }]}></Text>
                  </View>

                  {ex.sets.map((set: any, setIdx: number) => (
                    <RoutineSetRow
                      key={set.id}
                      exIdx={exIdx}
                      setIdx={setIdx}
                      set={set}
                      isTreadmill={isTreadmillExercise(ex.name)}
                      updateDraftSet={updateDraftSet}
                      removeDraftSet={removeDraftSet}
                      setsCount={ex.sets.length}
                      t={t}
                    />
                  ))}

                  <TouchableOpacity 
                    style={styles.addSetRowBtn} 
                    onPress={() => addDraftSet(exIdx)}
                  >
                    <Text style={[styles.addSetRowBtnText, { color: colors.primary }]}>{t('ui.build_routine.add_set_label')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        <TouchableOpacity 
          style={styles.addExerciseBtn} 
          onPress={() => router.push('/select-exercise?mode=routine')}
        >
          <Text style={[styles.addExerciseBtnText, { color: colors.primary }]}>{t('ui.build_routine.add_exercise_btn')}</Text>
        </TouchableOpacity>

      </KeyboardAwareScrollView>

      {/* Routine Selection Modal */}
      <Modal visible={showRoutineModal} animationType="slide" transparent={true} onRequestClose={() => setShowRoutineModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRoutineModal(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('ui.build_routine.modal_select_routine')}</Text>
              <TouchableOpacity onPress={() => setShowRoutineModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {routinesList.map((r) => (
                <TouchableOpacity 
                  key={r.id} 
                  style={styles.modalListItem} 
                  onPress={() => handleCopyFromRoutine(r)}
                >
                  <Text style={[styles.modalListItemText, { color: colors.text }]}>{r.title}</Text>
                  <Text style={[styles.modalListItemSubtext, { color: colors.textMuted }]} numberOfLines={1}>
                    {r.exercises?.map((e: any) => translateExercise(e.name)).join(', ') || 'No exercises'}
                  </Text>
                </TouchableOpacity>
              ))}
              {routinesList.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted }}>{t('ui.routines.empty')}</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Workout Selection Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent={true} onRequestClose={() => setShowHistoryModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowHistoryModal(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('ui.build_routine.modal_select_workout')}</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {historyList.map((w) => {
                const dateStr = new Date(w.start_time).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
                return (
                  <TouchableOpacity 
                    key={w.id} 
                    style={styles.modalListItem} 
                    onPress={() => handleCopyFromWorkout(w.id, w.title)}
                  >
                    <Text style={[styles.modalListItemText, { color: colors.text }]}>{w.title}</Text>
                    <Text style={[styles.modalListItemSubtext, { color: colors.textMuted }]}>{dateStr}</Text>
                  </TouchableOpacity>
                );
              })}
              {historyList.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted }}>{t('ui.history.empty')}</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, borderBottomWidth: 1 },
  headerCloseBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', flex: 1 },
  saveBtn: { minHeight: 38, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 180 },
  label: { marginBottom: 8, fontSize: 16, fontWeight: '600' },
  input: { padding: 16, borderRadius: 12, fontSize: 18, borderWidth: 1, marginBottom: 24 },
  exercisesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  exerciseCard: { padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1 },
  exerciseCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  badge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  badgeText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  exerciseName: { flex: 1, fontSize: 16, fontWeight: '500' },
  removeExerciseBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  setsContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  setsHeaderRow: { flexDirection: 'row', marginBottom: 6, paddingHorizontal: 4 },
  setsHeaderTh: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  setNumberText: { fontSize: 14, fontWeight: '600' },
  setInput: { flex: 1, marginHorizontal: 4, borderRadius: 8, borderWidth: 1, minHeight: 38, paddingVertical: 6, paddingHorizontal: 12, textAlign: 'center', fontSize: 15 },
  deleteSetBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addSetRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, minHeight: 44, paddingVertical: 8 },
  addSetRowBtnText: { fontSize: 14, fontWeight: '600' },
  addExerciseBtn: { backgroundColor: 'rgba(79, 172, 254, 0.1)', minHeight: 48, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginVertical: 24, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  addExerciseBtnText: { fontSize: 18, fontWeight: 'bold' },

  // Import UI Styles
  importBlock: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'rgba(79, 172, 254, 0.3)', borderRadius: 16, padding: 20, alignItems: 'center', marginVertical: 12 },
  importBlockDisabled: { borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.01)' },
  importTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  importDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16, paddingHorizontal: 12 },
  importButtonsRow: { flexDirection: 'row', width: '100%' },
  importBtn: { flex: 1, minHeight: 72, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  importBtnDisabled: { borderColor: 'rgba(255,255,255,0.04)', backgroundColor: 'rgba(0,0,0,0.2)', opacity: 0.5 },
  importBtnText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 16 },

  // Modal Selection Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 420, borderRadius: 16, borderWidth: 1, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalCloseBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalListItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalListItemText: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  modalListItemSubtext: { fontSize: 12 }
});

function RoutineSetRow({ exIdx, setIdx, set, isTreadmill, updateDraftSet, removeDraftSet, setsCount, t }: {
  exIdx: number;
  setIdx: number;
  set: any;
  isTreadmill?: boolean;
  updateDraftSet: (exIdx: number, setIdx: number, changes: any) => void;
  removeDraftSet: (exIdx: number, setIdx: number) => void;
  setsCount: number;
  t: any;
}) {
  const { colors } = useAppTheme();
  const [localWeight, setLocalWeight] = useState(set.weight !== null ? String(set.weight) : '');
  const [localReps, setLocalReps] = useState(set.reps !== null ? String(set.reps) : '');
  const [localSpeed, setLocalSpeed] = useState(set.speed != null ? String(set.speed) : '');
  const [localIncline, setLocalIncline] = useState(set.incline != null ? String(set.incline) : '');
  const [isFocusedWeight, setIsFocusedWeight] = useState(false);
  const [isFocusedReps, setIsFocusedReps] = useState(false);
  const [isFocusedSpeed, setIsFocusedSpeed] = useState(false);
  const [isFocusedIncline, setIsFocusedIncline] = useState(false);

  // 外部/親からの更新があった場合のみ同期
  useEffect(() => {
    if (isFocusedWeight) return;
    if (set.weight !== null && set.weight !== undefined) {
      const currentLocalFloat = parseFloat(localWeight.replace(',', '.'));
      if (currentLocalFloat !== set.weight) setLocalWeight(String(set.weight));
    } else {
      setLocalWeight('');
    }
  }, [set.weight]);

  useEffect(() => {
    if (isFocusedReps) return;
    if (set.reps !== null && set.reps !== undefined) {
      if (parseInt(localReps, 10) !== set.reps) setLocalReps(String(set.reps));
    } else {
      setLocalReps('');
    }
  }, [set.reps]);

  useEffect(() => {
    if (isFocusedSpeed) return;
    if (set.speed != null) {
      const currentLocalFloat = parseFloat(localSpeed.replace(',', '.'));
      if (currentLocalFloat !== set.speed) setLocalSpeed(String(set.speed));
    } else {
      setLocalSpeed('');
    }
  }, [set.speed]);

  useEffect(() => {
    if (isFocusedIncline) return;
    if (set.incline != null) {
      const currentLocalFloat = parseFloat(localIncline.replace(',', '.'));
      if (currentLocalFloat !== set.incline) setLocalIncline(String(set.incline));
    } else {
      setLocalIncline('');
    }
  }, [set.incline]);

  const handleWeightChange = (val: string) => {
    if (val === '' || /^\d{0,3}([.,]\d{0,1})?$/.test(val)) {
      setLocalWeight(val);
      const parsedVal = val.replace(',', '.');
      updateDraftSet(exIdx, setIdx, { weight: parsedVal !== '' && parsedVal !== '.' ? parseFloat(parsedVal) : null });
    }
  };

  const handleRepsChange = (val: string) => {
    if (val === '' || /^\d{0,3}$/.test(val)) {
      setLocalReps(val);
      updateDraftSet(exIdx, setIdx, { reps: val !== '' ? parseInt(val, 10) : null });
    }
  };

  const handleSpeedChange = (val: string) => {
    if (val === '' || /^\d{0,2}([.,]\d{0,1})?$/.test(val)) {
      setLocalSpeed(val);
      const parsedVal = val.replace(',', '.');
      updateDraftSet(exIdx, setIdx, { speed: parsedVal !== '' && parsedVal !== '.' ? parseFloat(parsedVal) : null });
    }
  };

  const handleInclineChange = (val: string) => {
    if (val === '' || /^\d{0,2}([.,]\d{0,1})?$/.test(val)) {
      setLocalIncline(val);
      const parsedVal = val.replace(',', '.');
      updateDraftSet(exIdx, setIdx, { incline: parsedVal !== '' && parsedVal !== '.' ? parseFloat(parsedVal) : null });
    }
  };

  return (
    <View style={styles.setRow}>
      <View style={{ width: 50, alignItems: 'center' }}>
        <Text style={[styles.setNumberText, { color: colors.text }]}>{set.set_number}</Text>
      </View>

      {isTreadmill ? (
        <>
          <TextInput
            style={[styles.setInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            value={localSpeed}
            onChangeText={handleSpeedChange}
            onFocus={() => setIsFocusedSpeed(true)}
            onBlur={() => setIsFocusedSpeed(false)}
          />
          <TextInput
            style={[styles.setInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            value={localIncline}
            onChangeText={handleInclineChange}
            onFocus={() => setIsFocusedIncline(true)}
            onBlur={() => setIsFocusedIncline(false)}
          />
        </>
      ) : (
        <>
          <TextInput
            style={[styles.setInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            value={localWeight}
            onChangeText={handleWeightChange}
            onFocus={() => setIsFocusedWeight(true)}
            onBlur={() => setIsFocusedWeight(false)}
          />

          <TextInput
            style={[styles.setInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            keyboardType="numeric"
            placeholder="—"
            placeholderTextColor={colors.textMuted}
            value={localReps}
            onChangeText={handleRepsChange}
            onFocus={() => setIsFocusedReps(true)}
            onBlur={() => setIsFocusedReps(false)}
          />
        </>
      )}

      <TouchableOpacity 
        onPress={() => removeDraftSet(exIdx, setIdx)} 
        style={styles.deleteSetBtn}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        disabled={setsCount <= 1}
      >
        <Ionicons 
          name="close" 
          size={20} 
          color={setsCount > 1 ? colors.textMuted : 'rgba(255,255,255,0.08)'} 
        />
      </TouchableOpacity>
    </View>
  );
}
