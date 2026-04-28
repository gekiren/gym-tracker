import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { loadFullWorkoutData } from '../../src/db/database';
import { Theme } from '../../src/theme';
import { useTranslation } from 'react-i18next';
import { translateExercise } from '../../src/i18n';
import { useWorkoutStore } from '../../src/store/workoutStore';

export default function WorkoutDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { settings } = useWorkoutStore();
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    try {
      const data = await loadFullWorkoutData(parseInt(id, 10));
      setWorkout(data);
    } catch (e) {
      console.warn('Failed to load workout details', e);
    } finally {
      setLoading(false);
    }
  };

  const calculateRM = (weight: number | null, reps: number | null) => {
    if (!weight || !reps || reps < 1) return null;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + (reps / 30)));
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Theme.colors.textMuted }}>{t('ui.history.not_found')}</Text>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ color: Theme.colors.primary }}>{t('ui.history.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const durationMin = workout.end_time 
    ? Math.max(1, Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000))
    : null;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: workout.title,
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push({ pathname: '/edit-workout/[id]', params: { id: workout.id } } as any)}>
              <Ionicons name="pencil" size={24} color={Theme.colors.primary} />
            </TouchableOpacity>
          )
        }} 
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metaHeader}>
          <Ionicons name="calendar-outline" size={16} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.dateText}>{format(new Date(workout.start_time), 'yyyy-MM-dd HH:mm')}</Text>
          {durationMin && (
            <>
              <Text style={{ color: Theme.colors.textMuted, marginHorizontal: 8 }}>•</Text>
              <Ionicons name="time-outline" size={16} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={styles.dateText}>{durationMin} {t('ui.common.min_unit')}</Text>
            </>
          )}
        </View>

        {workout.notes ? (
          <View style={styles.workoutNotes}>
            <Ionicons name="document-text-outline" size={16} color={Theme.colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.workoutNotesText}>{workout.notes}</Text>
          </View>
        ) : null}

        {workout.exercises.map((ex: any) => (
          <View key={ex.workout_exercise_id} style={styles.card}>
            <View style={styles.exerciseHeader}>
              <TouchableOpacity 
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.exercise_id } } as any)}
              >
                <Text style={styles.exerciseTitle}>{translateExercise(ex.name || ex.exercise_name)}</Text>
                <Ionicons name="chevron-forward" size={16} color={Theme.colors.primary} />
              </TouchableOpacity>
              <View style={styles.exerciseVolumeBadge}>
                <Text style={styles.exerciseVolumeLabel}>{t('ui.history.volume_label')}: </Text>
                <Text style={styles.exerciseVolumeValue}>
                  {ex.sets.reduce((sum: number, s: any) => sum + (s.weight || 0) * (s.reps || 0), 0)} {settings.weightUnit}
                </Text>
              </View>
            </View>

            {ex.notes ? (
              <View style={styles.exerciseNotes}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.exerciseNotesText}>{ex.notes}</Text>
              </View>
            ) : null}

            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 40 }]}>{t('ui.active_workout.header_set')}</Text>
              <Text style={[styles.th, { flex: 1 }]}>{settings.weightUnit}</Text>
              <Text style={[styles.th, { flex: 1 }]}>{t('ui.active_workout.header_reps')}</Text>
              <Text style={[styles.th, { width: 45 }]}>{t('ui.active_workout.header_rpe')}</Text>
              <Text style={[styles.th, { flex: 1 }]}>1RM</Text>
            </View>

            {ex.sets.map((set: any, idx: number) => {
              const currentRM = calculateRM(set.weight, set.reps);
              let timeStr = '';
              const fmtTime = (secs: number) => {
                const m = Math.floor(secs / 60);
                const s = secs % 60;
                return m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`;
              };
              if (set.work_seconds != null) timeStr += `⏱️ ${fmtTime(set.work_seconds)} `;
              if (set.rest_seconds != null) timeStr += `☕ ${fmtTime(set.rest_seconds)}`;
              timeStr = timeStr.trim();
              return (
                <View key={set.id} style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingVertical: 8 }}>
                  <View style={[styles.row, { borderBottomWidth: 0, paddingVertical: 0 }]}>
                    <Text style={styles.tdSet}>{set.set_number}</Text>
                    <Text style={styles.tdValue}>{set.weight ?? '-'}</Text>
                    <Text style={styles.tdValue}>{set.reps ?? '-'}</Text>
                    <Text style={[styles.tdValue, { width: 45, flex: 0 }]}>{set.rpe ?? '-'}</Text>
                    <Text style={[styles.tdValue, { color: Theme.colors.primary }]}>{currentRM ?? '-'}</Text>
                  </View>
                  {timeStr ? (
                    <Text style={{ textAlign: 'right', fontSize: 11, color: Theme.colors.textMuted, marginRight: 12, marginTop: 4 }}>
                      {timeStr}
                    </Text>
                  ) : null}
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
  metaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.md, justifyContent: 'center' },
  dateText: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '500' },
  workoutNotes: { flexDirection: 'row', backgroundColor: 'rgba(79, 172, 254, 0.1)', padding: 12, borderRadius: Theme.borderRadius.sm, marginBottom: Theme.spacing.lg },
  workoutNotesText: { color: Theme.colors.text, fontSize: 14, flex: 1, lineHeight: 20 },
  card: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.lg, borderWidth: 1, borderColor: Theme.colors.border },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.sm },
  exerciseTitle: { color: Theme.colors.primary, fontSize: 18, fontWeight: 'bold' },
  exerciseVolumeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  exerciseVolumeLabel: { fontSize: 12, color: Theme.colors.textMuted },
  exerciseVolumeValue: { fontSize: 12, color: Theme.colors.text, fontWeight: 'bold' },
  exerciseNotes: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 6, marginBottom: 12 },
  exerciseNotesText: { color: Theme.colors.textMuted, fontSize: 13, flex: 1 },
  tableHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingBottom: 8 },
  th: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tdSet: { color: Theme.colors.textMuted, width: 40, textAlign: 'center', fontSize: 15 },
  tdValue: { color: Theme.colors.text, flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '500' }
});
