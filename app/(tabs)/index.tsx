import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { getRoutines, getPreviousWorkoutSets } from '../../src/db/database';

export default function WorkoutScreen() {
  const { startWorkout, addExercise } = useWorkoutStore();
  const [routines, setRoutines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      console.error('Failed to fetch routines', e);
    }
  };

  const handleStartEmpty = () => {
    startWorkout('フリーワークアウト');
    router.push('/active-workout');
  };

  const handleStartRoutine = async (routine: any) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      startWorkout(routine.title);
      for (const ex of routine.exercises) {
        const prevSets = await getPreviousWorkoutSets(ex.id);
        addExercise({ id: ex.id, name: ex.name, previousSets: prevSets });
      }
      router.push('/active-workout');
    } catch (e) {
      console.error('Failed to start routine', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>トレーニングを開始</Text>
        <Text style={styles.subtitle}>新しいワークアウトを始めるか、ルーティンを選んでください。</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={handleStartEmpty}>
        <Ionicons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryButtonText}>フリーワークアウトを開始</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>マイ ルーティン</Text>
          <TouchableOpacity onPress={() => router.push('/routines')}>
            <Text style={styles.linkText}>すべて見る</Text>
          </TouchableOpacity>
        </View>

        {routines.map(r => (
          <TouchableOpacity 
            key={r.id} 
            style={styles.routineCard} 
            activeOpacity={0.7} 
            onPress={() => handleStartRoutine(r)}
            disabled={isLoading}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routineTitle}>{r.title}</Text>
                <Text style={styles.routineDesc} numberOfLines={2}>
                  {r.exercises?.map((e: any) => e.name).join(', ') || '種目なし'}
                </Text>
              </View>
              <Ionicons name="play-circle" size={32} color={Theme.colors.primary} style={{ marginLeft: 16 }} />
            </View>
          </TouchableOpacity>
        ))}

        {routines.length === 0 && (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: Theme.colors.textMuted }}>ルーティンがありません。</Text>
          </View>
        )}
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.md,
  },
  header: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Theme.colors.textMuted,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.xl,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5, // Android shadow
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginTop: Theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  linkText: {
    color: Theme.colors.primary,
    fontSize: 16,
  },
  routineCard: {
    backgroundColor: Theme.colors.card,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  routineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  routineDesc: {
    fontSize: 14,
    color: Theme.colors.textMuted,
  }
});
