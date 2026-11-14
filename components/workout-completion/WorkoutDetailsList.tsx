import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { translateExercise, translateStance } from '../../src/i18n';

interface SetData {
  id: string | number;
  set_number: number;
  side?: string | null;
  weight: number | null;
  reps: number | null;
  rpe?: number | null;
  work_seconds?: number | null;
  rest_seconds?: number | null;
  variation?: string | null;
  is_completed?: boolean | number;
}

interface ExerciseData {
  id: string | number;
  name: string;
  equipment?: string;
  notes?: string | null;
  sets: SetData[];
}

interface WorkoutDetailsListProps {
  workout: {
    notes?: string | null;
    exercises: ExerciseData[];
  };
  settings: {
    weightUnit: string;
    bodyWeight: number | null;
    displayFields: {
      showRpe: boolean;
      show1RM: boolean;
    };
  };
  t: (key: string) => string;
}

const calculateRM = (weight: number | null, reps: number | null) => {
  if (!weight || !reps || reps < 1) return null;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + (reps / 30)));
};

export const WorkoutDetailsList: React.FC<WorkoutDetailsListProps> = ({
  workout,
  settings,
  t,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('ui.workout_completion.workout_details')}</Text>

      {workout.notes ? (
        <View style={styles.workoutNotes}>
          <Ionicons
            name="document-text-outline"
            size={16}
            color={colors.primary}
            style={{ marginRight: 8, marginTop: 2 }}
          />
          <Text style={[styles.workoutNotesText, { color: colors.text }]}>{workout.notes}</Text>
        </View>
      ) : null}

      {workout.exercises.map((ex) => {
        const completedSets = ex.sets.filter(s => !!s.is_completed);
        if (completedSets.length === 0) return null;

        return (
          <View key={ex.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.exerciseHeader}>
              <Text style={[styles.exerciseTitle, { color: colors.primary }]}>{translateExercise(ex.name)}</Text>
              <View style={styles.exerciseVolumeBadge}>
                <Text style={[styles.exerciseVolumeLabel, { color: colors.text }]}>{t('ui.history.volume_label')}: </Text>
                <Text style={[styles.exerciseVolumeValue, { color: colors.text }]}>
                  {completedSets.reduce((sum, s) => {
                    const exBw = (ex.equipment === '自重' && settings.bodyWeight) ? settings.bodyWeight : 0;
                    return sum + ((s.weight || 0) + exBw) * (s.reps || 0);
                  }, 0)} {settings.weightUnit}
                </Text>
              </View>
            </View>

            {ex.notes ? (
              <View style={styles.exerciseNotes}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={14}
                  color={colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.exerciseNotesText, { color: colors.textMuted }]}>{ex.notes}</Text>
              </View>
            ) : null}

            <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.th, { width: 40, color: colors.textMuted }]}>{t('ui.active_workout.header_set')}</Text>
              <Text style={[styles.th, { width: 90, color: colors.textMuted }]}>{settings.weightUnit}</Text>
              <Text style={[styles.th, { flex: 1, color: colors.textMuted }]}>{t('ui.active_workout.header_reps')}</Text>
              {settings.displayFields.showRpe && (
                <Text style={[styles.th, { width: 45, color: colors.textMuted }]}>{t('ui.active_workout.header_rpe')}</Text>
              )}
              {settings.displayFields.show1RM && (
                <Text style={[styles.th, { flex: 1, color: colors.textMuted }]}>1RM</Text>
              )}
            </View>

            {completedSets.map((set) => {
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

              return (
                <View key={set.id} style={styles.setRowWrapper}>
                  <View style={styles.setRow}>
                    <Text style={[styles.tdSet, { color: colors.textMuted }]}>{set.set_number}{set.side ? `(${set.side})` : ''}</Text>
                    <Text style={[styles.tdValue, { width: 90, color: colors.text }]}>{set.weight ?? '-'}</Text>
                    <Text style={[styles.tdValue, { color: colors.text }]}>{set.reps ?? '-'}</Text>
                    {settings.displayFields.showRpe && (
                      <Text style={[styles.tdValue, { width: 45, flex: 0, color: colors.text }]}>{set.rpe ?? '-'}</Text>
                    )}
                    {settings.displayFields.show1RM && (
                      <Text style={[styles.tdValue, { color: colors.primary }]}>{currentRM ?? '-'}</Text>
                    )}
                  </View>
                  
                  {/* Sub-row for variation/stance and timers */}
                  {(set.variation || timeStr) ? (
                    <View style={styles.setSubRow}>
                      {set.variation ? (
                        <Text style={[styles.stanceBadge, { color: colors.primary }]}>
                          {t('ui.active_workout.stance_label')}: {translateStance(set.variation)}
                        </Text>
                      ) : <View />}
                      {timeStr ? (
                        <Text style={[styles.timeBadge, { color: colors.textMuted }]}>{timeStr}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  workoutNotes: {
    flexDirection: 'row',
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  workoutNotesText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1.2,
  },
  exerciseVolumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  exerciseVolumeLabel: {
    fontSize: 12,
  },
  exerciseVolumeValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  exerciseNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  exerciseNotesText: {
    fontSize: 13,
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  th: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  setRowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tdSet: {
    width: 40,
    textAlign: 'center',
    fontSize: 15,
  },
  tdValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  setSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 44,
  },
  stanceBadge: {
    fontSize: 12,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeBadge: {
    fontSize: 12,
  },
});
