import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';

export default function WorkoutScreen() {
  const startWorkout = useWorkoutStore((s) => s.startWorkout);

  const handleStartEmpty = () => {
    startWorkout('Empty Workout');
    router.push('/active-workout');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Ready to lift?</Text>
        <Text style={styles.subtitle}>Start a new workout or pick a routine.</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={handleStartEmpty}>
        <Ionicons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryButtonText}>Start Empty Workout</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Routines</Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.routineCard}>
          <Text style={styles.routineTitle}>Push Day</Text>
          <Text style={styles.routineDesc}>Bench Press, Overhead Press, Triceps...</Text>
        </View>
        <View style={styles.routineCard}>
          <Text style={styles.routineTitle}>Pull Day</Text>
          <Text style={styles.routineDesc}>Pull Ups, Barbell Rows, Biceps...</Text>
        </View>
      </View>
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
