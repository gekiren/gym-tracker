import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Theme, useAppTheme } from '../../src/theme';
import { AI_CONFIG } from '../../src/config/aiConfig';
import { translateExercise, translateStance } from '../../src/i18n';
import { SetInputRow } from './SetInputRow';
import { StanceModalTarget } from '../../src/hooks/useActiveWorkout';
import { WeightStepModal } from './WeightStepModal';
import { updateExerciseWeightStep } from '../../src/db/repositories/exerciseRepository';
import { useWorkoutStore } from '../../src/store/workoutStore';

interface ActiveExerciseCardProps {
  ex: any;
  t: (key: string, options?: any) => string;
  settings: any;
  startTime: string | null;
  expandedNotes: boolean;
  onToggleNotes: (exId: string) => void;
  onUpdateNotes: (exId: string, notes: string) => void;
  onDeleteExercise: (ex: any) => void;
  onAICoachExercise: (ex: any) => void;
  onOpenStanceModal: (target: StanceModalTarget) => void;
  onAddSet: (exId: string) => void;
  onUpdateSet: (exId: string, setId: string, updates: any) => void;
  onToggleSetComplete: (exId: string, setId: string) => void;
  onRemoveSet: (exId: string, setId: string) => void;
  onSetActiveSetForCalc: (target: { exId: string; setId: string } | null) => void;
  calculateRM: (weight: number | null, reps: number | null) => number | null;
}

const CardDeleteActionLeft = ({ drag, onPress }: { drag: SharedValue<number>; onPress: () => void }) => {
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value - 80 }],
  }));
  return (
    <View style={{ width: 80 }}>
      <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
        <GHTouchableOpacity style={styles.deleteAction} onPress={onPress}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </GHTouchableOpacity>
      </Reanimated.View>
    </View>
  );
};

const CardDeleteActionRight = ({ drag, onPress }: { drag: SharedValue<number>; onPress: () => void }) => {
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 80 }],
  }));
  return (
    <View style={{ width: 80 }}>
      <Reanimated.View style={[styleAnimation, { flex: 1 }]}>
        <GHTouchableOpacity style={styles.deleteAction} onPress={onPress}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </GHTouchableOpacity>
      </Reanimated.View>
    </View>
  );
};

export const ActiveExerciseCard: React.FC<ActiveExerciseCardProps> = React.memo(({
  ex,
  t,
  settings,
  startTime,
  expandedNotes,
  onToggleNotes,
  onUpdateNotes,
  onDeleteExercise,
  onAICoachExercise,
  onOpenStanceModal,
  onAddSet,
  onUpdateSet,
  onToggleSetComplete,
  onRemoveSet,
  onSetActiveSetForCalc,
  calculateRM,
}) => {
  const { colors } = useAppTheme();
  const [weightStepModalVisible, setWeightStepModalVisible] = React.useState(false);

  const currentStance = ex.default_stance || ex.default_variation || null;
  const exerciseNameText = translateExercise(ex.name);
  const isLongName = exerciseNameText.length > 13;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Swipeable
        renderLeftActions={(progress, drag) => <CardDeleteActionLeft drag={drag} onPress={() => onDeleteExercise(ex)} />}
        renderRightActions={(progress, drag) => <CardDeleteActionRight drag={drag} onPress={() => onDeleteExercise(ex)} />}
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
      >
        <View style={{ backgroundColor: colors.card, paddingTop: 0, paddingBottom: 2 }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={() => {
                  const targetId = ex.exercise_id || ex.id;
                  if (typeof targetId === 'string' && targetId.includes('-')) {
                    console.warn('Cannot navigate to exercise details: exercise_id is missing (received UUID).');
                    return;
                  }
                  router.push({ pathname: '/exercise/[id]', params: { id: String(targetId), _t: Date.now() } } as any);
                }}
                onLongPress={() => onDeleteExercise(ex)}
                delayLongPress={500}
                style={{ flexDirection: 'row', alignItems: 'center', maxWidth: '82%', marginBottom: 2 }}
              >
                <Text
                  style={[styles.exerciseTitle, isLongName && { fontSize: 15 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={isLongName}
                  minimumFontScale={0.85}
                >
                  {exerciseNameText}
                </Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 2 }}>
                {settings.displayFields?.showVolume && (
                  <View style={styles.exerciseVolumeContainer}>
                    <Text style={styles.exerciseVolumeLabel}>{t('ui.history.volume_label')}: </Text>
                    <Text style={styles.exerciseVolumeValue}>
                      {ex.sets.reduce((sum: number, s: any) => {
                        if (!s.is_completed) return sum;
                        const bw = ex.equipment === '自重' && settings.bodyWeight ? settings.bodyWeight : 0;
                        return sum + ((s.weight || 0) + bw) * (s.reps || 0);
                      }, 0)}{' '}
                      {settings.weightUnit}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }}
                  onPress={() => setWeightStepModalVisible(true)}
                >
                  <Ionicons name="swap-horizontal-outline" size={12} color={Theme.colors.primary} style={{ marginRight: 2 }} />
                  <Text style={{ color: Theme.colors.primary, fontSize: 11, fontWeight: 'bold' }}>
                    ±{ex.weight_step ?? 2.5}kg
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.headerIcons}>
              {AI_CONFIG.status === 'active' && (
                <TouchableOpacity onPress={() => onAICoachExercise(ex)}>
                  <Ionicons name="sparkles" size={20} color={Theme.colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => onToggleNotes(ex.id)}>
                <Ionicons
                  name={ex.notes ? 'chatbubble-ellipses' : 'chatbubble-outline'}
                  size={20}
                  color={ex.notes ? Theme.colors.primary : Theme.colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Swipeable>

      {expandedNotes && (
        <TextInput
          style={styles.exerciseNotesInput}
          placeholder={t('ui.active_workout.exercise_notes_placeholder')}
          placeholderTextColor={Theme.colors.textMuted}
          multiline
          value={ex.notes}
          onChangeText={val => onUpdateNotes(ex.id, val)}
        />
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: 50 }]}>{t('ui.active_workout.header_set')}</Text>
        {ex.muscle_group === '有酸素' ? (
          <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>{t('ui.active_workout.header_time')}</Text>
        ) : (
          <>
            <Text style={[styles.th, { width: 90, marginHorizontal: 3 }]}>
              {ex.name === 'プランク'
                ? t('ui.active_workout.header_weighted')
                : ex.equipment === '自重'
                ? `+ ${settings.weightUnit}`
                : settings.weightUnit}
            </Text>
            <Text style={[styles.th, { width: 70, marginHorizontal: 3 }]}>
              {ex.name === 'プランク' ? t('ui.active_workout.header_seconds') : t('ui.active_workout.header_reps')}
            </Text>
            {(settings.displayFields?.showRpe || ex.name === 'プランク') && (
              <Text style={[styles.th, { width: 55, marginHorizontal: 3 }]}>
                {ex.name === 'プランク' ? t('ui.active_workout.header_timer') : t('ui.active_workout.header_rpe')}
              </Text>
            )}
          </>
        )}
        <Text style={[styles.th, { width: 40 }]}>{t('ui.active_workout.header_record')}</Text>
      </View>

      {/* Set Rows */}
      {ex.sets.map((set: any, idx: number) => (
        <SetInputRow
          key={set.id}
          ex={ex}
          set={set}
          idx={idx}
          updateSet={onUpdateSet}
          toggleSetComplete={onToggleSetComplete}
          removeSet={onRemoveSet}
          setActiveSetForCalc={onSetActiveSetForCalc}
          calculateRM={calculateRM}
          startTime={startTime}
          setStanceModalTarget={target => onOpenStanceModal(target as any)}
          setStanceModalVisible={() => {}}
          displayFields={settings.displayFields}
        />
      ))}

      <View style={styles.bottomRowContainer}>
        {settings.displayFields?.showStance && (
          <TouchableOpacity
            style={styles.exerciseVariationBtnBottom}
            onPress={() => {
              onOpenStanceModal({ type: 'exercise', exId: ex.id, currentValue: currentStance });
            }}
          >
            <Text style={styles.exerciseVariationTextBottom}>
              {t('ui.active_workout.stance_label')}:{'\n'}
              {currentStance ? translateStance(currentStance as string) : t('ui.active_workout.stance_standard')}
            </Text>
            <Ionicons name="chevron-down" size={10} color={Theme.colors.primary} style={{ marginLeft: 2, alignSelf: 'flex-end', marginBottom: 2 }} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.addSetBtn} onPress={() => onAddSet(ex.id)}>
          <Text style={styles.addSetBtnText}>{t('ui.active_workout.add_set_label')}</Text>
        </TouchableOpacity>
      </View>

      <WeightStepModal
        visible={weightStepModalVisible}
        onClose={() => setWeightStepModalVisible(false)}
        currentStep={ex.weight_step ?? 2.5}
        exerciseName={translateExercise(ex.name)}
        onSelectStep={async (newStep: number) => {
          useWorkoutStore.getState().updateExerciseWeightStep(ex.id, newStep);
          if (ex.exercise_id || ex.id) {
            await updateExerciseWeightStep(ex.exercise_id || ex.id, newStep);
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: 8,
    paddingBottom: 12,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  exerciseTitle: {
    color: Theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
    flexShrink: 1,
  },
  bottomRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    position: 'relative',
    minHeight: 40,
  },
  exerciseVariationBtnBottom: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  exerciseVariationTextBottom: {
    color: Theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 13,
  },
  exerciseVolumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
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
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseNotesInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    color: Theme.colors.text,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 13,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  th: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  addSetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  addSetBtnText: {
    color: Theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAction: {
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
});

ActiveExerciseCard.displayName = 'ActiveExerciseCard';
