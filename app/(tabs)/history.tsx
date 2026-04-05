import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getDB } from '../../src/db/database';
import { Theme } from '../../src/theme';
import { formatWorkoutToMarkdown } from '../../src/utils/markdownExport';
import { useFocusEffect } from 'expo-router';

export default function HistoryScreen() {
  const [workouts, setWorkouts] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [])
  );

  const fetchWorkouts = async () => {
    try {
      const db = getDB();
      const rows = await db.getAllAsync(`
        SELECT w.*, 
               (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id) as exercise_count,
               (SELECT SUM(weight * reps) FROM workout_sets ws JOIN workout_exercises we ON ws.workout_exercise_id = we.id WHERE we.workout_id = w.id) as volume
        FROM workouts w 
        ORDER BY start_time DESC
      `);
      setWorkouts(rows as any[]);
    } catch (e) {
      console.warn('Failed to fetch workouts', e);
    }
  };

  const loadFullWorkoutData = async (workoutId: number) => {
    const db = getDB();
    const workoutRow = await db.getFirstAsync('SELECT * FROM workouts WHERE id = ?', [workoutId]) as any;
    if (!workoutRow) return null;

    const exercisesRows = await db.getAllAsync('SELECT we.id as workout_exercise_id, e.name as exercise_name FROM workout_exercises we JOIN exercises e ON we.exercise_id = e.id WHERE we.workout_id = ? ORDER BY we.sort_order', [workoutId]) as any[];
    
    const exercisesData = [];
    for (const ex of exercisesRows) {
      const sets = await db.getAllAsync('SELECT set_number, weight, reps, rpe FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number', [ex.workout_exercise_id]) as any[];
      exercisesData.push({
        exercise_name: ex.exercise_name,
        sets: sets
      });
    }

    return {
      title: workoutRow.title,
      start_time: workoutRow.start_time,
      notes: workoutRow.notes,
      exercises: exercisesData
    };
  };

  const handleExportMarkdown = async (workoutId: number) => {
    const data = await loadFullWorkoutData(workoutId);
    if (data) {
      const md = formatWorkoutToMarkdown(data);
      await Clipboard.setStringAsync(md);
      Alert.alert("Markdown Copied!", "ワークアウトの記録をMarkdown形式でクリップボードにコピーしました😎");
    }
  };

  const getChartData = () => {
    // Reverse to chronological order
    const wRev = [...workouts].reverse().filter(w => w.volume > 0);
    if (wRev.length < 2) return null;
    
    return {
      labels: wRev.map(w => format(new Date(w.start_time), 'MM/dd')).slice(-6),
      datasets: [
        {
          data: wRev.map(w => w.volume).slice(-6)
        }
      ]
    };
  };

  const chartData = getChartData();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>Your past workouts and Markdown Export</Text>
      
      {chartData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Recent Volume (kg)</Text>
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - Theme.spacing.md * 2}
            height={220}
            chartConfig={{
              backgroundColor: Theme.colors.card,
              backgroundGradientFrom: Theme.colors.card,
              backgroundGradientTo: Theme.colors.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: Theme.colors.primary
              }
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No workouts recorded yet.</Text>
        </View>
      ) : (
        workouts.map(w => (
          <View key={w.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{w.title}</Text>
              <TouchableOpacity onPress={() => handleExportMarkdown(w.id)} style={styles.exportIcon}>
                <Ionicons name="share-social" size={24} color={Theme.colors.primary} />
                <Text style={styles.exportText}>MD</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.dateText}>{format(new Date(w.start_time), 'yyyy-MM-dd HH:mm')}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>Exercises</Text>
                <Text style={styles.statValue}>{w.exercise_count}</Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>Volume</Text>
                <Text style={styles.statValue}>{w.volume ? w.volume + ' kg' : '-'}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: 'bold', color: Theme.colors.text, marginTop: Theme.spacing.md, marginBottom: 4 },
  subtitle: { fontSize: 16, color: Theme.colors.textMuted, marginBottom: Theme.spacing.xl },
  emptyState: { padding: Theme.spacing.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, borderColor: Theme.colors.border, borderWidth: 1 },
  emptyStateText: { color: Theme.colors.textMuted, fontSize: 16 },
  card: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  exportIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a3a4a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Theme.borderRadius.md },
  exportText: { color: Theme.colors.primary, marginLeft: 4, fontWeight: 'bold' },
  dateText: { color: Theme.colors.textMuted, marginBottom: 16 },
  statsRow: { flexDirection: 'row' },
  statBlock: { marginRight: 24 },
  statLabel: { color: Theme.colors.textMuted, fontSize: 12, marginBottom: 2 },
  statValue: { color: Theme.colors.text, fontSize: 16, fontWeight: '600' },
  chartContainer: { marginBottom: Theme.spacing.xl },
  chartTitle: { color: Theme.colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: Theme.spacing.md },
  chart: { borderRadius: Theme.borderRadius.md, marginLeft: -16 }
});
