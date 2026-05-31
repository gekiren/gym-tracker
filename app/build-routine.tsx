import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import { addRoutine, getRoutines, loadFullWorkoutData, getDB } from '../src/db/database';
import { useTranslation } from 'react-i18next';
import { translateExercise } from '../src/i18n';

export default function BuildRoutineScreen() {
  const { 
    draftRoutine, updateDraftTitle, removeDraftExercise, 
    addDraftSet, removeDraftSet, updateDraftSet, setDraftRoutine, clearDraft 
  } = useWorkoutStore();
  const { t } = useTranslation();

  const [routinesList, setRoutinesList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    clearDraft();
    fetchRoutinesAndHistory();
  }, []);

  const fetchRoutinesAndHistory = async () => {
    try {
      const routinesData = await getRoutines();
      setRoutinesList(routinesData);

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
        side: s.side || null,
        variation: s.variation || null
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
              rpe: s.rpe
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

    try {
      await addRoutine(
        draftRoutine.title.trim(),
        draftRoutine.exercises.map(e => e.name).join(', '),
        draftRoutine.exercises
      );
      clearDraft();
      router.back();
    } catch (e) {
      Alert.alert(t('ui.common.error'), t('ui.build_routine.error_save_failed'));
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="close" size={28} color={Theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('ui.build_routine.title')}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>{t('ui.common.save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        <Text style={styles.label}>{t('ui.build_routine.routine_name_label')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('ui.build_routine.routine_name_placeholder')}
          placeholderTextColor={Theme.colors.textMuted}
          value={draftRoutine.title}
          onChangeText={updateDraftTitle}
        />

        {draftRoutine.exercises.length === 0 && (
          <View style={styles.importBlock}>
            <Ionicons name="copy-outline" size={36} color={Theme.colors.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.importTitle}>{t('ui.build_routine.import_title')}</Text>
            <Text style={styles.importDesc}>{t('ui.build_routine.import_desc')}</Text>
            
            <View style={styles.importButtonsRow}>
              <TouchableOpacity 
                style={[styles.importBtn, { marginRight: 8 }]} 
                onPress={() => setShowRoutineModal(true)}
              >
                <Ionicons name="barbell-outline" size={20} color={Theme.colors.primary} style={{ marginBottom: 6 }} />
                <Text style={styles.importBtnText} numberOfLines={2}>
                  {t('ui.build_routine.copy_routine_btn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.importBtn, { marginLeft: 8 }]} 
                onPress={() => setShowHistoryModal(true)}
              >
                <Ionicons name="time-outline" size={20} color={Theme.colors.primary} style={{ marginBottom: 6 }} />
                <Text style={styles.importBtnText} numberOfLines={2}>
                  {t('ui.build_routine.copy_workout_btn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {draftRoutine.exercises.length > 0 && (
          <>
            <View style={styles.exercisesHeader}>
              <Text style={styles.label}>{t('ui.build_routine.exercises_count_label', { count: draftRoutine.exercises.length })}</Text>
            </View>

            {draftRoutine.exercises.map((ex, exIdx) => (
              <View key={`${ex.id}-${exIdx}`} style={styles.exerciseCard}>
                <View style={styles.exerciseCardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{exIdx + 1}</Text>
                  </View>
                  <Text style={styles.exerciseName}>{translateExercise(ex.name)}</Text>
                  <TouchableOpacity onPress={() => removeDraftExercise(exIdx)} style={{ padding: 8 }}>
                    <Ionicons name="trash-outline" size={20} color={Theme.colors.danger} />
                  </TouchableOpacity>
                </View>

                {/* セットの一覧 */}
                <View style={styles.setsContainer}>
                  <View style={styles.setsHeaderRow}>
                    <Text style={[styles.setsHeaderTh, { width: 50 }]}>{t('ui.build_routine.set_label')}</Text>
                    <Text style={[styles.setsHeaderTh, { flex: 1 }]}>{t('ui.build_routine.weight_placeholder')}</Text>
                    <Text style={[styles.setsHeaderTh, { flex: 1 }]}>{t('ui.build_routine.reps_placeholder')}</Text>
                    <Text style={[styles.setsHeaderTh, { width: 40 }]}></Text>
                  </View>

                  {ex.sets.map((set, setIdx) => (
                    <View key={set.id} style={styles.setRow}>
                      <View style={{ width: 50, alignItems: 'center' }}>
                        <Text style={styles.setNumberText}>{set.set_number}</Text>
                      </View>

                      <TextInput
                        style={styles.setInput}
                        keyboardType="numeric"
                        placeholder="—"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={set.weight !== null ? String(set.weight) : ''}
                        onChangeText={(val) => {
                          if (val === '' || /^\d{0,3}(\.\d{0,1})?$/.test(val)) {
                            updateDraftSet(exIdx, setIdx, { weight: val !== '' ? parseFloat(val) : null });
                          }
                        }}
                      />

                      <TextInput
                        style={styles.setInput}
                        keyboardType="numeric"
                        placeholder="—"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={set.reps !== null ? String(set.reps) : ''}
                        onChangeText={(val) => {
                          if (val === '' || /^\d{0,3}$/.test(val)) {
                            updateDraftSet(exIdx, setIdx, { reps: val !== '' ? parseInt(val, 10) : null });
                          }
                        }}
                      />

                      <TouchableOpacity 
                        onPress={() => removeDraftSet(exIdx, setIdx)} 
                        style={styles.deleteSetBtn}
                        disabled={ex.sets.length <= 1}
                      >
                        <Ionicons 
                          name="close" 
                          size={20} 
                          color={ex.sets.length > 1 ? Theme.colors.textMuted : 'rgba(255,255,255,0.08)'} 
                        />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity 
                    style={styles.addSetRowBtn} 
                    onPress={() => addDraftSet(exIdx)}
                  >
                    <Text style={styles.addSetRowBtnText}>{t('ui.build_routine.add_set_label')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={styles.addExerciseBtn} 
              onPress={() => router.push('/select-exercise?mode=routine')}
            >
              <Text style={styles.addExerciseBtnText}>{t('ui.build_routine.add_exercise_btn')}</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>

      {/* Routine Selection Modal */}
      <Modal visible={showRoutineModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('ui.build_routine.modal_select_routine')}</Text>
              <TouchableOpacity onPress={() => setShowRoutineModal(false)}>
                <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {routinesList.map((r) => (
                <TouchableOpacity 
                  key={r.id} 
                  style={styles.modalListItem} 
                  onPress={() => handleCopyFromRoutine(r)}
                >
                  <Text style={styles.modalListItemText}>{r.title}</Text>
                  <Text style={styles.modalListItemSubtext} numberOfLines={1}>
                    {r.exercises?.map((e: any) => translateExercise(e.name)).join(', ') || 'No exercises'}
                  </Text>
                </TouchableOpacity>
              ))}
              {routinesList.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: Theme.colors.textMuted }}>{t('ui.routines.empty')}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Workout Selection Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('ui.build_routine.modal_select_workout')}</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
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
                    <Text style={styles.modalListItemText}>{w.title}</Text>
                    <Text style={styles.modalListItemSubtext}>{dateStr}</Text>
                  </TouchableOpacity>
                );
              })}
              {historyList.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: Theme.colors.textMuted }}>{t('ui.history.empty')}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.md, paddingTop: 50, backgroundColor: Theme.colors.card, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  title: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.text, flex: 1 },
  saveBtn: { backgroundColor: Theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  label: { color: Theme.colors.textMuted, marginBottom: 8, fontSize: 16, fontWeight: '600' },
  input: { backgroundColor: Theme.colors.card, color: Theme.colors.text, padding: 16, borderRadius: Theme.borderRadius.md, fontSize: 18, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 24 },
  exercisesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  exerciseCard: { backgroundColor: Theme.colors.card, padding: Theme.spacing.md, borderRadius: Theme.borderRadius.md, marginBottom: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  exerciseCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  badge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  exerciseName: { flex: 1, color: Theme.colors.text, fontSize: 16, fontWeight: '500' },
  setsContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  setsHeaderRow: { flexDirection: 'row', marginBottom: 6, paddingHorizontal: 4 },
  setsHeaderTh: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  setNumberText: { color: Theme.colors.text, fontSize: 14, fontWeight: '600' },
  setInput: { backgroundColor: '#2a2a2a', color: Theme.colors.text, flex: 1, marginHorizontal: 4, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, textAlign: 'center', fontSize: 15 },
  deleteSetBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addSetRowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingVertical: 8 },
  addSetRowBtnText: { color: Theme.colors.primary, fontSize: 14, fontWeight: '600' },
  addExerciseBtn: { backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center', marginVertical: Theme.spacing.xl, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  addExerciseBtnText: { color: Theme.colors.primary, fontSize: 18, fontWeight: 'bold' },

  // Import UI Styles
  importBlock: { backgroundColor: Theme.colors.card, borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'rgba(79, 172, 254, 0.3)', borderRadius: Theme.borderRadius.lg, padding: 20, alignItems: 'center', marginVertical: 12 },
  importTitle: { color: Theme.colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  importDesc: { color: Theme.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16, paddingHorizontal: 12 },
  importButtonsRow: { flexDirection: 'row', width: '100%' },
  importBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  importBtnText: { color: Theme.colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 16 },

  // Modal Selection Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  modalListItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalListItemText: { color: Theme.colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  modalListItemSubtext: { color: Theme.colors.textMuted, fontSize: 12 }
});
