import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { loadFullWorkoutData, updateWorkoutTitle, updateWorkoutSet, deleteWorkoutSet, updateWorkoutOverallNotes, updateWorkoutExerciseNotes } from '../../src/db/database';

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData(parseInt(id, 10));
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
      copy.exercises[exIndex].sets[setIndex][field] = value ? parseFloat(value) : null;
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
      Alert.alert('保存完了', '履歴を上書き保存しました。');
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '保存に失敗しました。');
    }
  };

  const handleRemoveSet = (exIndex: number, setIndex: number) => {
    Alert.alert('セットの削除', 'このセット記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { 
        text: '削除', style: 'destructive', 
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
          title: '履歴の編集',
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.primary,
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} style={{ backgroundColor: Theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>保存</Text>
            </TouchableOpacity>
          )
        }} 
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>ワークアウト名</Text>
        <TextInput
          style={styles.inputHero}
          value={data.title}
          onChangeText={handleUpdateTitle}
          placeholder="ワークアウト名"
        />

        <Text style={styles.label}>メモ</Text>
        <TextInput
          style={[styles.inputHero, styles.notesInput]}
          value={data.notes || ''}
          onChangeText={(text) => setData((prev: any) => ({ ...prev, notes: text }))}
          placeholder="ワークアウトの感想やメモを入力..."
          multiline
        />

        {data.exercises.map((ex: any, exIdx: number) => (
          <View key={ex.workout_exercise_id} style={styles.card}>
            <Text style={styles.exerciseTitle}>{ex.exercise_name}</Text>
            
            <TextInput
              style={styles.exerciseNotesInput}
              value={ex.notes || ''}
              onChangeText={(text) => setData((prev: any) => {
                const next = { ...prev };
                next.exercises[exIdx].notes = text;
                return next;
              })}
              placeholder="種目メモを入力..."
              multiline
            />
            
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 40 }]}>Set</Text>
              <Text style={[styles.th, { flex: 1 }]}>Weight (kg)</Text>
              <Text style={[styles.th, { flex: 1 }]}>Reps</Text>
              <Text style={[styles.th, { width: 45 }]}>RPE</Text>
              <Text style={[styles.th, { width: 36 }]}></Text>
            </View>

            {ex.sets.map((s: any, sIdx: number) => {
              if (s._deleted) return null; // Hide deleted sets
              
              return (
                <View key={s.id} style={styles.row}>
                  <Text style={styles.tdSet}>{s.set_number}</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric" 
                    value={s.weight !== null ? String(s.weight) : ''}
                    onChangeText={(val) => handleChangeSet(exIdx, sIdx, 'weight', val)}
                  />
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric" 
                    value={s.reps !== null ? String(s.reps) : ''}
                    onChangeText={(val) => handleChangeSet(exIdx, sIdx, 'reps', val)}
                  />
                  <TextInput 
                    style={[styles.input, { width: 45, flex: 0 }]} 
                    keyboardType="numeric" 
                    value={s.rpe !== null ? String(s.rpe) : ''}
                    onChangeText={(val) => handleChangeSet(exIdx, sIdx, 'rpe', val)}
                  />
                  <TouchableOpacity onPress={() => handleRemoveSet(exIdx, sIdx)} style={{ width: 36, alignItems: 'center' }}>
                    <Ionicons name="trash-outline" size={20} color={Theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
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
