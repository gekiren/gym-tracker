import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Theme } from '../src/theme';
import { getRoutines, deleteRoutine, getPreviousWorkoutSets, getPersonalRecords } from '../src/db/database';
import { useWorkoutStore } from '../src/store/workoutStore';

export default function RoutinesScreen() {
  const [routines, setRoutines] = useState<any[]>([]);
  const { startWorkout, addExercise } = useWorkoutStore();

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const fetchRoutines = async () => {
    try {
      const data = await getRoutines();
      setRoutines(data);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert(
      'ルーティンの削除',
      `${title} を削除してもよろしいですか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: async () => {
            await deleteRoutine(id);
            fetchRoutines();
          }
        }
      ]
    );
  };

  const handleStartRoutine = async (routine: any) => {
    try {
      startWorkout(routine.title);
      for (const ex of routine.exercises) {
        const prevSets = await getPreviousWorkoutSets(ex.id);
        const personalRecords = await getPersonalRecords(ex.id);
        addExercise({ id: ex.id, name: ex.name, previousSets: prevSets, personalRecords });
      }
      router.push('/active-workout');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={28} color={Theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>すべてのルーティン</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {routines.map(r => (
          <TouchableOpacity 
            key={r.id} 
            style={styles.routineCard} 
            activeOpacity={0.7} 
            onPress={() => handleStartRoutine(r)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.routineTitle}>{r.title}</Text>
              <Text style={styles.routineDesc} numberOfLines={2}>
                {r.exercises?.map((e: any) => e.name).join(', ') || '種目なし'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(r.id, r.title)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={22} color={Theme.colors.danger} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {routines.length === 0 && (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: Theme.colors.textMuted }}>ルーティンがありません。</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/build-routine')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.md, paddingTop: Theme.spacing.lg, backgroundColor: Theme.colors.card, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  title: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  routineCard: { backgroundColor: Theme.colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Theme.spacing.lg, borderRadius: Theme.borderRadius.md, marginBottom: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  routineTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  routineDesc: { fontSize: 14, color: Theme.colors.textMuted },
  deleteBtn: { padding: 8, marginLeft: 8 },
  fab: { position: 'absolute', bottom: 32, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: Theme.colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 }
});
