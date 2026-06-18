import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { loadFullWorkoutData, updateWorkoutTitle, updateWorkoutSet, deleteWorkoutSet, updateWorkoutOverallNotes, updateWorkoutExerciseNotes } from '../../src/db/database';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useTranslation } from 'react-i18next';
import { translateExercise } from '../../src/i18n';

const KeyboardAvoidingWrapper = ({ children }: { children: React.ReactNode }) => {
  const [behavior, setBehavior] = useState<'padding' | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showListener = Keyboard.addListener('keyboardDidShow', () => {
      setBehavior('padding');
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setBehavior(undefined);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={behavior}
      style={{ flex: 1 }}
      keyboardVerticalOffset={80}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const settings = useWorkoutStore(state => state.settings);
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
  }, [id]);

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

  const handleChangeSet = (exIndex: number, setIndex: number, field: 'weight' | 'reps' | 'rpe', value: string) => {
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
            await updateWorkoutSet(s.id, s.weight, s.reps, s.rpe);
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
    Alert.alert(t('ui.edit_workout.delete_set_title'), t('ui.edit_workout.delete_set_message'), [
      { text: t('ui.common.cancel'), style: 'cancel' },
      { 
        text: t('ui.common.delete'), style: 'destructive', 
        onPress: () => {
          setData((prev: any) => {
            const copy = { ...prev };
            copy.exercises[exIndex].sets[setIndex]._deleted = true;
            return copy;
          });
        }
      }
    ]);
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
              <Text style={[styles.th, { flex: 1 }]}>{settings.weightUnit}</Text>
              <Text style={[styles.th, { flex: 1 }]}>{t('ui.edit_workout.header_reps')}</Text>
              <Text style={[styles.th, { width: 45 }]}>{t('ui.edit_workout.header_rpe')}</Text>
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
                  handleChangeSet={handleChangeSet}
                  handleRemoveSet={handleRemoveSet}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>
      </KeyboardAvoidingWrapper>
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

function EditWorkoutSetRow({ exIdx, sIdx, s, handleChangeSet, handleRemoveSet }: {
  exIdx: number;
  sIdx: number;
  s: any;
  handleChangeSet: (exIdx: number, sIdx: number, field: 'weight' | 'reps' | 'rpe', value: string) => void;
  handleRemoveSet: (exIdx: number, sIdx: number) => void;
}) {
  const [localWeight, setLocalWeight] = useState(s.weight !== null ? String(s.weight) : '');
  const [localReps, setLocalReps] = useState(s.reps !== null ? String(s.reps) : '');
  const [localRpe, setLocalRpe] = useState(s.rpe !== null ? String(s.rpe) : '');
  const [isFocusedWeight, setIsFocusedWeight] = useState(false);
  const [isFocusedReps, setIsFocusedReps] = useState(false);
  const [isFocusedRpe, setIsFocusedRpe] = useState(false);

  // 外部からの更新同期
  useEffect(() => {
    if (isFocusedWeight) return;
    if (s.weight !== null) {
      const currentLocalFloat = parseFloat(localWeight.replace(',', '.'));
      if (currentLocalFloat !== s.weight) setLocalWeight(String(s.weight));
    } else {
      setLocalWeight('');
    }
  }, [s.weight]);

  useEffect(() => {
    if (isFocusedReps) return;
    if (s.reps !== null) {
      if (parseInt(localReps, 10) !== s.reps) setLocalReps(String(s.reps));
    } else {
      setLocalReps('');
    }
  }, [s.reps]);

  useEffect(() => {
    if (isFocusedRpe) return;
    if (s.rpe !== null) {
      const currentLocalRpeFloat = parseFloat(localRpe.replace(',', '.'));
      if (currentLocalRpeFloat !== s.rpe) setLocalRpe(String(s.rpe));
    } else {
      setLocalRpe('');
    }
  }, [s.rpe]);

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
