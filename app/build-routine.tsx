import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import { addRoutine } from '../src/db/database';

export default function BuildRoutineScreen() {
  const { draftRoutine, updateDraftTitle, removeDraftExercise, clearDraft } = useWorkoutStore();

  useEffect(() => {
    // initialize empty draft
    clearDraft();
  }, []);

  const handleSave = async () => {
    if (!draftRoutine.title.trim()) {
      Alert.alert('エラー', 'ルーティン名を入力してください。');
      return;
    }
    if (draftRoutine.exercises.length === 0) {
      Alert.alert('エラー', '最低1つの種目を追加してください。');
      return;
    }

    try {
      await addRoutine(
        draftRoutine.title.trim(),
        draftRoutine.exercises.map(e => e.name).join(', '),
        draftRoutine.exercises.map(e => e.id)
      );
      clearDraft();
      router.back();
    } catch (e) {
      Alert.alert('エラー', 'ルーティンの保存に失敗しました。');
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="close" size={28} color={Theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>ルーティンの作成</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>保存</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>ルーティン名 *</Text>
        <TextInput
          style={styles.input}
          placeholder="例: 胸トレ（高重量）"
          placeholderTextColor={Theme.colors.textMuted}
          value={draftRoutine.title}
          onChangeText={updateDraftTitle}
        />

        <View style={styles.exercisesHeader}>
          <Text style={styles.label}>構成種目 ({draftRoutine.exercises.length})</Text>
        </View>

        {draftRoutine.exercises.map((ex, idx) => (
          <View key={`${ex.id}-${idx}`} style={styles.exerciseCard}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{idx + 1}</Text>
            </View>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            <TouchableOpacity onPress={() => removeDraftExercise(idx)} style={{ padding: 8 }}>
              <Ionicons name="close-circle" size={24} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.addExerciseBtn} 
          onPress={() => router.push('/select-exercise?mode=routine')}
        >
          <Text style={styles.addExerciseBtnText}>+ 種目を追加</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.md, paddingTop: Theme.spacing.lg, backgroundColor: Theme.colors.card, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  title: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.text, flex: 1 },
  saveBtn: { backgroundColor: Theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  label: { color: Theme.colors.textMuted, marginBottom: 8, fontSize: 16, fontWeight: '600' },
  input: { backgroundColor: Theme.colors.card, color: Theme.colors.text, padding: 16, borderRadius: Theme.borderRadius.md, fontSize: 18, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 24 },
  exercisesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  exerciseCard: { backgroundColor: Theme.colors.card, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Theme.borderRadius.md, marginBottom: 8, borderWidth: 1, borderColor: Theme.colors.border },
  badge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  exerciseName: { flex: 1, color: Theme.colors.text, fontSize: 16, fontWeight: '500' },
  addExerciseBtn: { backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center', marginVertical: Theme.spacing.xl, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  addExerciseBtnText: { color: Theme.colors.primary, fontSize: 18, fontWeight: 'bold' }
});
