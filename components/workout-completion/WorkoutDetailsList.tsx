import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
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
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('ui.workout_completion.workout_details')}</Text>

      {workout.notes ? (
        <View style={styles.workoutNotes}>
          <Ionicons
            name="document-text-outline"
            size={16}
            color={Theme.colors.primary}
            style={{ marginRight: 8, marginTop: 2 }}
          />
          <Text style={styles.workoutNotesText}>{workout.notes}</Text>
        </View>
      ) : null}

      {workout.exercises.map((ex) => {
        const completedSets = ex.sets.filter(s => !!s.is_completed);
        if (completedSets.length === 0) return null;

        return (
          <View key={ex.id} style={styles.card}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseTitle}>{translateExercise(ex.name)}</Text>
              <View style={styles.exerciseVolumeBadge}>
                <Text style={styles.exerciseVolumeLabel}>{t('ui.history.volume_label')}: </Text>
                <Text style={styles.exerciseVolumeValue}>
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
                  color={Theme.colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.exerciseNotesText}>{ex.notes}</Text>
              </View>
            ) : null}

            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 40 }]}>{t('ui.active_workout.header_set')}</Text>
              <Text style={[styles.th, { width: 90 }]}>{settings.weightUnit}</Text>
              <Text style={[styles.th, { flex: 1 }]}>{t('ui.active_workout.header_reps')}</Text>
              {settings.displayFields.showRpe && (
                <Text style={[styles.th, { width: 45 }]}>{t('ui.active_workout.header_rpe')}</Text>
              )}
              {settings.displayFields.show1RM && (
                <Text style={[styles.th, { flex: 1 }]}>1RM</Text>
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
              if (set.work_seconds != null) timeStr += `⏱️ ${fmtTime(set.work_seconds)} `;
              if (set.rest_seconds != null) timeStr += `☕ ${fmtTime(set.rest_seconds)}`;
              timeStr = timeStr.trim();

              return (
                <View key={set.id} style={styles.setRowWrapper}>
                  <View style={styles.setRow}>
                    <Text style={styles.tdSet}>{set.set_number}{set.side ? `(${set.side})` : ''}</Text>
                    <Text style={[styles.tdValue, { width: 90 }]}>{set.weight ?? '-'}</Text>
                    <Text style={styles.tdValue}>{set.reps ?? '-'}</Text>
                    {settings.displayFields.showRpe && (
                      <Text style={[styles.tdValue, { width: 45, flex: 0 }]}>{set.rpe ?? '-'}</Text>
                    )}
                    {settings.displayFields.show1RM && (
                      <Text style={[styles.tdValue, { color: Theme.colors.primary }]}>{currentRM ?? '-'}</Text>
                    )}
                  </View>
                  
                  {/* Sub-row for variation/stance and timers */}
                  {(set.variation || timeStr) ? (
                    <View style={styles.setSubRow}>
                      {set.variation ? (
                        <Text style={styles.stanceBadge}>
                          {t('ui.active_workout.stance_label')}: {translateStance(set.variation)}
                        </Text>
                      ) : <View />}
                      {timeStr ? (
                        <Text style={styles.timeBadge}>{timeStr}</Text>
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
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    color: Theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.md,
    letterSpacing: 0.5,
  },
  workoutNotes: {
    flexDirection: 'row',
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    padding: 12,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.lg,
  },
  workoutNotesText: {
    color: Theme.colors.text,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  exerciseTitle: {
    color: Theme.colors.primary,
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
    color: Theme.colors.text,
  },
  exerciseVolumeValue: {
    fontSize: 12,
    color: Theme.colors.text,
    fontWeight: 'bold',
  },
  exerciseNotes: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  exerciseNotesText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: 8,
  },
  th: {
    color: Theme.colors.textMuted,
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
    color: Theme.colors.textMuted,
    width: 40,
    textAlign: 'center',
    fontSize: 15,
  },
  tdValue: {
    color: Theme.colors.text,
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
    fontSize: 11,
    color: Theme.colors.primary,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timeBadge: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
});
