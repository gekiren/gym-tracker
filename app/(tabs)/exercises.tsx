import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Theme } from '../../src/theme';

export default function ExercisesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercises</Text>
        <Text style={styles.subtitle}>Manage your exercise dictionary</Text>
      </View>
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>Database is loading...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
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
    marginBottom: Theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: Theme.colors.textMuted,
    fontSize: 16,
  }
});
