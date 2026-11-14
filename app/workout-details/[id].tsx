import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { loadFullWorkoutData } from '../../src/db/database';
import { useAppTheme } from '../../src/theme';
import { useTranslation } from 'react-i18next';
import { translateExercise, translateStance } from '../../src/i18n';
import { useSettingsStore } from '../../src/store/settingsStore';
import * as Clipboard from 'expo-clipboard';
import { formatWorkoutToMarkdown } from '../../src/utils/markdownExport';
import WorkoutShareModal from '../../components/WorkoutShareModal';
import { isTreadmillExercise } from '../../src/utils/exerciseUtils';

export default function WorkoutDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const isJa = i18n.language === 'ja';
  const settings = useSettingsStore(state => state.settings);
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const handleExportMarkdown = async () => {
    if (workout) {
      const md = formatWorkoutToMarkdown(workout);
      await Clipboard.setStringAsync(md);
      Alert.alert(t('ui.history.copy_success_title'), t('ui.history.copy_success_message'));
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      Alert.alert(t('ui.common.error') || 'Error', 'Invalid Workout ID');
      router.back();
      return;
    }
    try {
      const data = await loadFullWorkoutData(parsedId);
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
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>{t('ui.history.not_found')}</Text>
        <TouchableOpacity style={{ marginTop: 16, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }} onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>{t('ui.common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const durationMin = workout.end_time 
    ? Math.max(1, Math.round((new Date(workout.end_time).getTime() - new Date(workout.start_time).getTime()) / 60000))
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: workout.title,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShareModalVisible(true)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.headerActionBtn}
              >
                <Ionicons name="share-social-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/edit-workout/[id]', params: { id: workout.id, _t: Date.now() } } as any)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.headerActionBtn}
              >
                <Ionicons name="pencil" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )
        }} 
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metaHeader}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{format(new Date(workout.start_time), isJa ? 'yyyy-MM-dd HH:mm' : 'MMM d, yyyy, h:mm a')}</Text>
          {durationMin && (
            <>
              <Text style={{ color: colors.textMuted, marginHorizontal: 8 }}>•</Text>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.dateText, { color: colors.textMuted }]}>{durationMin} {t('ui.common.min_unit')}</Text>
            </>
          )}
          {workout.calories && (
            <>
              <Text style={{ color: colors.textMuted, marginHorizontal: 8 }}>•</Text>
              <Ionicons name="flame-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.dateText, { color: colors.textMuted }]}>{workout.calories} kcal</Text>
            </>
          )}
        </View>

        {workout.notes ? (
          <View style={styles.workoutNotes}>
            <Ionicons name="document-text-outline" size={16} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={[styles.workoutNotesText, { color: colors.text }]}>{workout.notes}</Text>
          </View>
        ) : null}

        {workout.exercises.map((ex: any) => {
          const completedSets = ex.sets.filter((s: any) => s.is_completed !== false && s.is_completed !== 0);
          if (completedSets.length === 0 && !ex.notes) return null;
          return (
            <View key={ex.workout_exercise_id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.exerciseHeader}>
                <TouchableOpacity 
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 36 }}
                  onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: String(ex.exercise_id), _t: Date.now() } } as any)}
                >
                  <Text style={[styles.exerciseTitle, { color: colors.primary }]}>{translateExercise(ex.name || ex.exercise_name)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.exerciseVolumeBadge}>
                  <Text style={[styles.exerciseVolumeLabel, { color: colors.text }]}>{t('ui.history.volume_label')}: </Text>
                  <Text style={[styles.exerciseVolumeValue, { color: colors.text }]}>
                    {completedSets.reduce((sum: number, s: any) => sum + (s.weight || 0) * (s.reps || 0), 0)} {settings.weightUnit}
                  </Text>
                </View>
              </View>

              {ex.notes ? (
                <View style={styles.exerciseNotes}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.exerciseNotesText, { color: colors.textMuted }]}>{ex.notes}</Text>
                </View>
              ) : null}

              {isTreadmillExercise(ex.exercise_name) ? (
                <>
                  <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.th, { width: 40, color: colors.textMuted }]}>{t('ui.active_workout.header_set')}</Text>
                    <Text style={[styles.th, { flex: 1, color: colors.textMuted }]}>{t('ui.active_workout.header_speed') || 'km/h'}</Text>
                    <Text style={[styles.th, { flex: 1, color: colors.textMuted }]}>{t('ui.active_workout.header_incline') || '傾斜(%)'}</Text>
                    <Text style={[styles.th, { flex: 1, color: colors.textMuted }]}>{t('ui.active_workout.header_time') || '時間'}</Text>
                  </View>

                  {completedSets.map((set: any) => {
                    const fmtTime = (secs: number) => {
                      const m = Math.floor(secs / 60);
                      const s = secs % 60;
                      return `${m > 0 ? `${m}:` : ''}${s.toString().padStart(m > 0 ? 2 : 1, '0')}${m === 0 ? 's' : ''}`;
                    };
                    return (
                      <View key={set.id} style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingVertical: 8 }}>
                        <View style={[styles.row, { borderBottomWidth: 0, paddingVertical: 0 }]}>
                          <Text style={[styles.tdSet, { color: colors.textMuted }]}>{set.set_number}</Text>
                          <Text style={[styles.tdValue, { color: colors.text }]}>{set.speed != null ? `${set.speed} km/h` : '-'}</Text>
                          <Text style={[styles.tdValue, { color: colors.text }]}>{set.incline != null ? `${set.incline}%` : '-'}</Text>
                          <Text style={[styles.tdValue, { color: colors.success }]}>
                            {(set.work_seconds != null && set.work_seconds > 0) ? `⏱️ ${fmtTime(set.work_seconds)}` : '-'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </>
              ) : (
                <>
                  <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.th, { width: 40, color: colors.textMuted }]}>{t('ui.active_workout.header_set')}</Text>
                    <Text style={[styles.th, { flex: 1, color: colors.textMuted }]}>{settings.weightUnit}</Text>
                    <Text style={[styles.th, { flex: 1, color: colors.textMuted }]}>{t('ui.active_workout.header_reps')}</Text>
                    <Text style={[styles.th, { width: 45, color: colors.textMuted }]}>{t('ui.active_workout.header_rpe')}</Text>
                    <Text style={[styles.th, { flex: 1, color: colors.textMuted }]}>1RM</Text>
                  </View>

                  {completedSets.map((set: any, idx: number) => {
                    const currentRM = calculateRM(set.weight, set.reps);
                    let timeStr = '';
                    const fmtTime = (secs: number) => {
                      const m = Math.floor(secs / 60);
                      const s = secs % 60;
                      return `${m > 0 ? `${m}:` : ''}${s.toString().padStart(m > 0 ? 2 : 1, '0')}${m === 0 ? 's' : ''}`;
                    };
                    if (set.work_seconds != null && set.work_seconds > 0) timeStr += `⏱️ ${fmtTime(set.work_seconds)} `;
                    if (set.rest_seconds != null && set.rest_seconds > 0) timeStr += `☕ ${fmtTime(set.rest_seconds)}`;
                    timeStr = timeStr.trim();
                    const hasStance = !!(set.stance || set.variation);
                    return (
                      <View key={set.id} style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingVertical: 8 }}>
                        <View style={[styles.row, { borderBottomWidth: 0, paddingVertical: 0 }]}>
                          <Text style={[styles.tdSet, { color: colors.textMuted }]}>{set.set_number}</Text>
                          <Text style={[styles.tdValue, { color: colors.text }]}>{set.weight ?? '-'}</Text>
                          <Text style={[styles.tdValue, { color: colors.text }]}>{set.reps ?? '-'}</Text>
                          <Text style={[styles.tdValue, { width: 45, flex: 0, color: colors.text }]}>{set.rpe ?? '-'}</Text>
                          <Text style={[styles.tdValue, { color: colors.primary }]}>{currentRM ?? '-'}</Text>
                        </View>
                        {(hasStance || timeStr) ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 4 }}>
                            <Text style={{ fontSize: 12, color: colors.textMuted }}>
                              {hasStance ? `${t('ui.active_workout.stance_label')}: ${translateStance(set.stance || set.variation)}` : ''}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textMuted }}>
                              {timeStr}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          );
        })}
        
        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setShareModalVisible(true)}>
            <Ionicons name="share-social-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.shareButtonText}>{t('ui.common.share_sns')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportButton} onPress={handleExportMarkdown}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.exportButtonText, { color: colors.primary }]}>{t('ui.common.export_markdown')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <WorkoutShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        workout={workout}
        settings={settings}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActionBtn: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 100 },
  metaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'center' },
  dateText: { fontSize: 14, fontWeight: '500' },
  workoutNotes: { flexDirection: 'row', backgroundColor: 'rgba(79, 172, 254, 0.1)', padding: 12, borderRadius: 12, marginBottom: 24 },
  workoutNotesText: { fontSize: 14, flex: 1, lineHeight: 20 },
  card: { borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  exerciseTitle: { fontSize: 18, fontWeight: 'bold' },
  exerciseVolumeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  exerciseVolumeLabel: { fontSize: 12 },
  exerciseVolumeValue: { fontSize: 12, fontWeight: 'bold' },
  exerciseNotes: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8, marginBottom: 12 },
  exerciseNotesText: { fontSize: 13, flex: 1 },
  tableHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4, borderBottomWidth: 1, paddingBottom: 8 },
  th: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tdSet: { width: 40, textAlign: 'center', fontSize: 15 },
  tdValue: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '500' },
  actionButtonsContainer: {
    marginTop: 24,
    gap: 12,
    paddingBottom: 20,
  },
  shareButton: {
    borderWidth: 1,
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  exportButton: {
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  }
});
