import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../src/store/workoutStore';
import { Theme } from '../src/theme';
import { saveWorkout } from '../src/db/database';

export default function ActiveWorkoutScreen() {
  const { title, startTime, exercises, endWorkout, addExercise, addSet, toggleSetComplete } = useWorkoutStore();

  const handleFinish = async () => {
    try {
      const et = new Date().toISOString();
      await saveWorkout(title || 'Empty Workout', startTime || et, et, null, exercises);
    } catch (e) {
      console.error(e);
    }
    endWorkout();
    router.dismiss();
  };

  const handleAddMockExercise = () => {
    // In the future: open an exercise selection modal
    addExercise({ id: 1, name: 'ベンチプレス (Barbell)' });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: title || 'Workout',
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.dismiss()} style={{ marginLeft: 8 }}>
              <Ionicons name="chevron-down" size={28} color={Theme.colors.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleFinish} style={{ marginRight: 8, backgroundColor: Theme.colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Finish</Text>
            </TouchableOpacity>
          )
        }} 
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.timeText}>00:00</Text>

        {exercises.map((ex) => (
          <View key={ex.id} style={styles.card}>
            <Text style={styles.exerciseTitle}>{ex.name}</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 40 }]}>Set</Text>
              <Text style={[styles.th, { flex: 1 }]}>kg</Text>
              <Text style={[styles.th, { flex: 1 }]}>Reps</Text>
              <Text style={[styles.th, { width: 50 }]}></Text>
            </View>

            {ex.sets.map((set, idx) => (
              <View key={set.id} style={[styles.row, set.is_completed && styles.rowCompleted]}>
                <Text style={styles.tdSet}>{set.set_number}</Text>
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  placeholder="-" 
                  placeholderTextColor={Theme.colors.textMuted}
                  defaultValue={set.weight ? String(set.weight) : ''}
                />
                <TextInput 
                  style={styles.input} 
                  keyboardType="numeric" 
                  placeholder="-" 
                  placeholderTextColor={Theme.colors.textMuted}
                  defaultValue={set.reps ? String(set.reps) : ''}
                />
                <TouchableOpacity 
                  style={[styles.checkBtn, set.is_completed && styles.checkBtnActive]}
                  onPress={() => toggleSetComplete(ex.id, set.id)}
                >
                  <Ionicons name="checkmark" size={20} color={set.is_completed ? '#fff' : Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(ex.id)}>
              <Text style={styles.addSetBtnText}>+ Add Set</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addExerciseBtn} onPress={handleAddMockExercise}>
          <Text style={styles.addExerciseBtnText}>+ Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>
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
  input: { backgroundColor: '#2a2a2a', color: Theme.colors.text, flex: 1, marginHorizontal: 4, borderRadius: 4, paddingVertical: 6, textAlign: 'center', fontSize: 16 },
  checkBtn: { width: 50, height: 36, backgroundColor: '#333', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkBtnActive: { backgroundColor: Theme.colors.success },
  addSetBtn: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  addSetBtnText: { color: Theme.colors.primary, fontSize: 16, fontWeight: '600' },
  addExerciseBtn: { backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center', marginVertical: Theme.spacing.xl, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  addExerciseBtnText: { color: Theme.colors.primary, fontSize: 18, fontWeight: 'bold' }
});
