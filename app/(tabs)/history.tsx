import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getDB, loadFullWorkoutData, deleteWorkout } from '../../src/db/database';
import { Theme } from '../../src/theme';
import { formatWorkoutToMarkdown } from '../../src/utils/markdownExport';
import { useFocusEffect, router } from 'expo-router';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useTranslation } from 'react-i18next';

export default function HistoryScreen() {
  const { settings } = useWorkoutStore();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const { t } = useTranslation();

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

  const handleDelete = (id: number, title: string) => {
    Alert.alert(
      t('ui.history.delete_alert_title'),
      t('ui.history.delete_alert_message', { title }),
      [
        { text: t('ui.common.cancel'), style: 'cancel' },
        { 
          text: t('ui.history.delete_confirm'), 
          style: 'destructive',
          onPress: async () => {
            await deleteWorkout(id);
            fetchWorkouts();
          }
        }
      ]
    );
  };

  const handleExportMarkdown = async (workoutId: number) => {
    const data = await loadFullWorkoutData(workoutId);
    if (data) {
      const md = formatWorkoutToMarkdown(data);
      await Clipboard.setStringAsync(md);
      Alert.alert(t('ui.history.copy_success_title'), t('ui.history.copy_success_message'));
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
      <Text style={styles.title}>{t('ui.history.title')}</Text>
      <Text style={styles.subtitle}>{t('ui.history.subtitle')}</Text>
      
      {chartData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{t('ui.history.chart_title', { unit: settings.weightUnit })}</Text>
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
          <Text style={styles.emptyStateText}>{t('ui.history.empty_state')}</Text>
        </View>
      ) : (
        workouts.map(w => (
          <TouchableOpacity 
            key={w.id} 
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/workout-details/[id]', params: { id: w.id } } as any)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{w.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => handleExportMarkdown(w.id)} style={[styles.exportIcon, { marginRight: 8 }]}>
                  <Ionicons name="share-social" size={18} color={Theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(w.id, w.title)} style={[styles.exportIcon, { backgroundColor: 'rgba(255,50,50,0.1)' }]}>
                  <Ionicons name="trash" size={18} color={Theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.dateText}>{format(new Date(w.start_time), 'yyyy-MM-dd HH:mm')}</Text>
              {w.end_time && (
                <Text style={styles.durationText}>
                  ・{t('ui.history.duration_label')}: {Math.max(1, Math.round((new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 60000))}{t('ui.common.min_unit')}
                </Text>
              )}
            </View>
            
            {w.notes && (
              <View style={styles.notesPreview}>
                <Ionicons name="document-text-outline" size={14} color={Theme.colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.notesPreviewText} numberOfLines={2}>{w.notes}</Text>
              </View>
            )}
            
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>{t('ui.history.exercises_count')}</Text>
                <Text style={styles.statValue}>{w.exercise_count}</Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={styles.statLabel}>{t('ui.history.volume_label')}</Text>
                <Text style={styles.statValue}>{w.volume ? `${w.volume} ${settings.weightUnit}` : '-'}</Text>
              </View>
            </View>
          </TouchableOpacity>
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
  exportIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a3a4a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Theme.borderRadius.md },
  exportText: { color: Theme.colors.primary, marginLeft: 4, fontWeight: 'bold' },
  dateText: { color: Theme.colors.textMuted },
  durationText: { color: Theme.colors.textMuted, marginLeft: 4 },
  statsRow: { flexDirection: 'row' },
  statBlock: { marginRight: 24 },
  statLabel: { color: Theme.colors.textMuted, fontSize: 12, marginBottom: 2 },
  statValue: { color: Theme.colors.text, fontSize: 16, fontWeight: '600' },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12
  },
  notesPreviewText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    flex: 1,
    lineHeight: 18
  },
  chartContainer: { marginBottom: Theme.spacing.xl },
  chartTitle: { color: Theme.colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: Theme.spacing.md },
  chart: { borderRadius: Theme.borderRadius.md, marginLeft: -16 }
});
