import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { loadFullWorkoutData, updateWorkoutTitle, updateWorkoutSet, deleteWorkoutSet, updateWorkoutOverallNotes, updateWorkoutExerciseNotes } from '../../src/db/database';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTranslation } from 'react-i18next';
import { translateExercise } from '../../src/i18n';
import { KeyboardAvoidingWrapper } from '../../components/active-workout/KeyboardAvoidingWrapper';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { isTreadmillExercise } from '../../src/utils/exerciseUtils';

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingSetTarget, setDeletingSetTarget] = useState<{ exIdx: number; setIdx: number } | null>(null);
  const settings = useSettingsStore(state => state.settings);
  const { t } = useTranslation();

  useEffect(() => {
    if (id) {
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) {
        Alert.alert(t('ui.common.error') || 'Error', 'Invalid Workout ID');
        router.back();
        return;
      }
      loadData(parsedId);
    }
  }, [id, t]);

  const loadData = async (workoutId: number) => {
    try {
      const res = await loadFullWorkoutData(workoutId);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTitle = (text: string) => {
    setData((prev: any) => ({ ...prev, title: text }));
  };

  const handleChangeSet = (exIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe' | 'speed' | 'incline' | 'work_seconds', value: string) => {
    setData((prev: any) => {
      const copy = { ...prev };
      const parsedVal = value ? value.replace(',', '.') : '';
      copy.exercises[exIndex].sets[setIndex][field] = parsedVal ? parseFloat(parsedVal) : null;
      return copy;
    });
  };

  const handleSave = async () => {
    try {
      await updateWorkoutTitle(data.id, data.title);
      await updateWorkoutOverallNotes(data.id, data.notes);
      for (const ex of data.exercises) {
        await updateWorkoutExerciseNotes(ex.workout_exercise_id, ex.notes);
        for (const s of ex.sets) {
          if (s._deleted) {
            await deleteWorkoutSet(s.id);
          } else {
            await updateWorkoutSet(s.id, s.weight, s.reps, s.rpe, s.variation, s.stance, s.speed, s.incline, s.work_seconds);
          }
        }
      }
      Alert.alert(t('ui.edit_workout.save_success_title'), t('ui.edit_workout.save_success_message'));
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert(t('ui.common.error'), t('ui.edit_workout.save_error_message'));
    }
  };

  const handleRemoveSet = (exIndex: number, setIndex: number) => {
    setDeletingSetTarget({ exIdx: exIndex, setIdx: setIndex });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  if (!data) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: t('ui.edit_workout.title'),
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.primary,
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={{ backgroundColor: Theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('ui.common.save')}</Text>
            </TouchableOpacity>
          )
        }} 
      />

      <KeyboardAvoidingWrapper>
        <ScrollView 
          contentContainerStyle={styles.content} 
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={false}
        >
        <Text style={styles.label}>{t('ui.edit_workout.workout_name_label')}</Text>
        <TextInput
          style={styles.inputHero}
          value={data.title}
          onChangeText={handleUpdateTitle}
          placeholder={t('ui.edit_workout.workout_name_label')}
        />

        <Text style={styles.label}>{t('ui.edit_workout.workout_notes_label')}</Text>
        <TextInput
          style={[styles.inputHero, styles.notesInput]}
          value={data.notes || ''}
          onChangeText={(text) => setData((prev: any) => ({ ...prev, notes: text }))}
          placeholder={t('ui.edit_workout.workout_notes_placeholder')}
          multiline
        />

        {data.exercises.map((ex: any, exIdx: number) => (
          <View key={ex.workout_exercise_id} style={styles.card}>
            <Text style={styles.exerciseTitle}>{translateExercise(ex.exercise_name)}</Text>
            
            <TextInput
              style={styles.exerciseNotesInput}
              value={ex.notes || ''}
              onChangeText={(text) => setData((prev: any) => {
                const next = { ...prev };
                next.exercises[exIdx].notes = text;
                return next;
              })}
              placeholder={t('ui.edit_workout.exercise_notes_placeholder')}
              multiline
            />
            
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 40 }]}>{t('ui.edit_workout.header_set')}</Text>
              {isTreadmillExercise(ex.exercise_name) ? (
                <>
                  <Text style={[styles.th, { flex: 1 }]}>{t('ui.active_workout.header_speed') || 'km/h'}</Text>
                  <Text style={[styles.th, { flex: 1 }]}>{t('ui.active_workout.header_incline') || '傾斜(%)'}</Text>
                  <Text style={[styles.th, { flex: 1 }]}>{t('ui.active_workout.header_time') || '時間(分)'}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.th, { flex: 1 }]}>{settings.weightUnit}</Text>
                  <Text style={[styles.th, { flex: 1 }]}>{t('ui.edit_workout.header_reps')}</Text>
                  <Text style={[styles.th, { width: 45 }]}>{t('ui.edit_workout.header_rpe')}</Text>
                </>
              )}
              <Text style={[styles.th, { width: 36 }]}></Text>
            </View>

            {ex.sets.map((s: any, sIdx: number) => {
              if (s._deleted) return null; // Hide deleted sets
              
              return (
                <EditWorkoutSetRow
                  key={s.id}
                  exIdx={exIdx}
                  sIdx={sIdx}
                  s={s}
                  isTreadmill={isTreadmillExercise(ex.exercise_name)}
                  handleChangeSet={handleChangeSet}
                  handleRemoveSet={handleRemoveSet}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>
      </KeyboardAvoidingWrapper>

      <ConfirmModal
        visible={deletingSetTarget !== null}
        title={t('ui.edit_workout.delete_set_title')}
        message={t('ui.edit_workout.delete_set_message')}
        confirmText={t('ui.common.delete')}
        cancelText={t('ui.common.cancel')}
        type="danger"
        onConfirm={() => {
          if (deletingSetTarget) {
            const { exIdx, setIdx } = deletingSetTarget;
            setData((prev: any) => {
              const copy = { ...prev };
              copy.exercises[exIdx].sets[setIdx]._deleted = true;
              return copy;
            });
            setDeletingSetTarget(null);
          }
        }}
        onCancel={() => setDeletingSetTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 180 },
  label: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  inputHero: { backgroundColor: Theme.colors.card, color: Theme.colors.text, fontSize: 20, fontWeight: 'bold', padding: 16, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 24 },
  card: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.lg },
  exerciseTitle: { color: Theme.colors.primary, fontSize: 18, fontWeight: 'bold', marginBottom: Theme.spacing.md },
  tableHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  th: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  tdSet: { color: Theme.colors.text, width: 40, textAlign: 'center', fontSize: 16, fontWeight: '500' },
  input: { backgroundColor: '#2a2a2a', color: Theme.colors.text, flex: 1, marginHorizontal: 4, borderRadius: 4, paddingVertical: 6, textAlign: 'center', fontSize: 16 },
  notesInput: {
    fontSize: 14,
    fontWeight: 'normal',
    color: Theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top'
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
  }
});

function EditWorkoutSetRow({ exIdx, sIdx, s, isTreadmill, handleChangeSet, handleRemoveSet }: {
  exIdx: number;
  sIdx: number;
  s: any;
  isTreadmill?: boolean;
  handleChangeSet: (exIdx: number, sIdx: number, field: 'weight' | 'reps' | 'rpe' | 'speed' | 'incline' | 'work_seconds', value: string) => void;
  handleRemoveSet: (exIdx: number, sIdx: number) => void;
}) {
  const [localWeight, setLocalWeight] = useState(s.weight !== null ? String(s.weight) : '');
  const [localReps, setLocalReps] = useState(s.reps !== null ? String(s.reps) : '');
  const [localRpe, setLocalRpe] = useState(s.rpe !== null ? String(s.rpe) : '');
  const [localSpeed, setLocalSpeed] = useState(s.speed != null ? String(s.speed) : '');
  const [localIncline, setLocalIncline] = useState(s.incline != null ? String(s.incline) : '');
  const [localMinutes, setLocalMinutes] = useState(s.work_seconds != null ? String(Math.round(s.work_seconds / 60)) : '');

  const [isFocusedWeight, setIsFocusedWeight] = useState(false);
  const [isFocusedReps, setIsFocusedReps] = useState(false);
  const [isFocusedRpe, setIsFocusedRpe] = useState(false);
  const [isFocusedSpeed, setIsFocusedSpeed] = useState(false);
  const [isFocusedIncline, setIsFocusedIncline] = useState(false);
  const [isFocusedMinutes, setIsFocusedMinutes] = useState(false);

  useEffect(() => {
    if (isFocusedWeight) return;
    if (s.weight !== null) {
      const currentLocalFloat = parseFloat(localWeight.replace(',', '.'));
      if (currentLocalFloat !== s.weight) setLocalWeight(String(s.weight));
    } else {
      if (localWeight !== '') setLocalWeight('');
    }
  }, [s.weight, isFocusedWeight, localWeight]);

  useEffect(() => {
    if (isFocusedReps) return;
    if (s.reps !== null) {
      if (parseInt(localReps, 10) !== s.reps) setLocalReps(String(s.reps));
    } else {
      if (localReps !== '') setLocalReps('');
    }
  }, [s.reps, isFocusedReps, localReps]);

  useEffect(() => {
    if (isFocusedRpe) return;
    if (s.rpe !== null) {
      const currentLocalRpeFloat = parseFloat(localRpe.replace(',', '.'));
      if (currentLocalRpeFloat !== s.rpe) setLocalRpe(String(s.rpe));
    } else {
      if (localRpe !== '') setLocalRpe('');
    }
  }, [s.rpe, isFocusedRpe, localRpe]);

  useEffect(() => {
    if (isFocusedSpeed) return;
    if (s.speed != null) {
      const currentFloat = parseFloat(localSpeed.replace(',', '.'));
      if (currentFloat !== s.speed) setLocalSpeed(String(s.speed));
    } else {
      if (localSpeed !== '') setLocalSpeed('');
    }
  }, [s.speed, isFocusedSpeed, localSpeed]);

  useEffect(() => {
    if (isFocusedIncline) return;
    if (s.incline != null) {
      const currentFloat = parseFloat(localIncline.replace(',', '.'));
      if (currentFloat !== s.incline) setLocalIncline(String(s.incline));
    } else {
      if (localIncline !== '') setLocalIncline('');
    }
  }, [s.incline, isFocusedIncline, localIncline]);

  useEffect(() => {
    if (isFocusedMinutes) return;
    if (s.work_seconds != null) {
      const mins = String(Math.round(s.work_seconds / 60));
      if (mins !== localMinutes) setLocalMinutes(mins);
    } else {
      if (localMinutes !== '') setLocalMinutes('');
    }
  }, [s.work_seconds, isFocusedMinutes, localMinutes]);

  const handleWeightChange = (val: string) => {
    if (val === '' || /^\d{0,3}([.,]\d{0,1})?$/.test(val)) {
      setLocalWeight(val);
      handleChangeSet(exIdx, sIdx, 'weight', val);
    }
  };

  const handleRepsChange = (val: string) => {
    if (val === '' || /^\d{0,3}$/.test(val)) {
      setLocalReps(val);
      handleChangeSet(exIdx, sIdx, 'reps', val);
    }
  };

  const handleRpeChange = (val: string) => {
    if (val === '' || /^\d{0,2}([.,]\d{0,1})?$/.test(val)) {
      setLocalRpe(val);
      handleChangeSet(exIdx, sIdx, 'rpe', val);
    }
  };

  const handleSpeedChange = (val: string) => {
    if (val === '' || /^\d{0,2}([.,]\d{0,1})?$/.test(val)) {
      setLocalSpeed(val);
      handleChangeSet(exIdx, sIdx, 'speed', val);
    }
  };

  const handleInclineChange = (val: string) => {
    if (val === '' || /^\d{0,2}([.,]\d{0,1})?$/.test(val)) {
      setLocalIncline(val);
      handleChangeSet(exIdx, sIdx, 'incline', val);
    }
  };

  const handleMinutesChange = (val: string) => {
    if (val === '' || /^\d{0,3}$/.test(val)) {
      setLocalMinutes(val);
      const m = parseInt(val, 10);
      handleChangeSet(exIdx, sIdx, 'work_seconds', isNaN(m) ? '' : String(m * 60));
    }
  };

  if (isTreadmill) {
    return (
      <View style={styles.row}>
        <Text style={styles.tdSet}>{s.set_number}</Text>
        <TextInput 
          style={styles.input} 
          keyboardType="decimal-pad" 
          value={localSpeed}
          placeholder="km/h"
          placeholderTextColor="rgba(255,255,255,0.2)"
          onChangeText={handleSpeedChange}
          onFocus={() => setIsFocusedSpeed(true)}
          onBlur={() => setIsFocusedSpeed(false)}
        />
        <TextInput 
          style={styles.input} 
          keyboardType="decimal-pad" 
          value={localIncline}
          placeholder="%"
          placeholderTextColor="rgba(255,255,255,0.2)"
          onChangeText={handleInclineChange}
          onFocus={() => setIsFocusedIncline(true)}
          onBlur={() => setIsFocusedIncline(false)}
        />
        <TextInput 
          style={styles.input} 
          keyboardType="numeric" 
          value={localMinutes}
          placeholder="分"
          placeholderTextColor="rgba(255,255,255,0.2)"
          onChangeText={handleMinutesChange}
          onFocus={() => setIsFocusedMinutes(true)}
          onBlur={() => setIsFocusedMinutes(false)}
        />
        <TouchableOpacity onPress={() => handleRemoveSet(exIdx, sIdx)} style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="trash-outline" size={20} color={Theme.colors.danger} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.tdSet}>{s.set_number}</Text>
      <TextInput 
        style={styles.input} 
        keyboardType="decimal-pad" 
        value={localWeight}
        onChangeText={handleWeightChange}
        onFocus={() => setIsFocusedWeight(true)}
        onBlur={() => setIsFocusedWeight(false)}
      />
      <TextInput 
        style={styles.input} 
        keyboardType="numeric" 
        value={localReps}
        onChangeText={handleRepsChange}
        onFocus={() => setIsFocusedReps(true)}
        onBlur={() => setIsFocusedReps(false)}
      />
      <TextInput 
        style={[styles.input, { width: 45, flex: 0 }]} 
        keyboardType="numeric" 
        value={localRpe}
        onChangeText={handleRpeChange}
        onFocus={() => setIsFocusedRpe(true)}
        onBlur={() => setIsFocusedRpe(false)}
      />
      <TouchableOpacity onPress={() => handleRemoveSet(exIdx, sIdx)} style={{ width: 36, alignItems: 'center' }}>
        <Ionicons name="trash-outline" size={20} color={Theme.colors.danger} />
      </TouchableOpacity>
    </View>
  );
}
