import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { useAppTheme } from '../../src/theme';
import { translateExercise } from '../../src/i18n';
import { SetInputRow } from './SetInputRow';
import { StanceModalTarget } from '../../src/hooks/useActiveWorkout';
import { isTreadmillExercise } from '../../src/utils/exerciseUtils';

interface ActiveExerciseCardProps {
  ex: any;
  t: (key: string, options?: any) => string;
  settings: any;
  startTime: string | null;
  expandedNotes: boolean;
  onToggleNotes: (exId: string) => void;
  onUpdateNotes: (exId: string, notes: string) => void;
  onDeleteExercise: (ex: any) => void;
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
  onOpenStanceModal,
  onAddSet,
  onUpdateSet,
  onToggleSetComplete,
  onRemoveSet,
  onSetActiveSetForCalc,
  calculateRM,
}) => {
  const { colors } = useAppTheme();

  const exerciseNameText = translateExercise(ex.name);
  const isLongName = exerciseNameText.length > 13;
  const showVolume = ex.muscle_group !== '有酸素' && !!settings.displayFields?.showVolume;
  const totalVolume = showVolume
    ? ex.sets.reduce((sum: number, s: any) => {
        if (!s.is_completed) return sum;
        const bw = ex.equipment === '自重' && settings.bodyWeight ? settings.bodyWeight : 0;
        return sum + ((s.weight || 0) + bw) * (s.reps || 0);
      }, 0)
    : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              <GHTouchableOpacity
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
                style={{ flexDirection: 'row', alignItems: 'center', maxWidth: '82%', marginBottom: 2, minHeight: 36 }}
              >
                <Text
                  style={[styles.exerciseTitle, { color: colors.primary }, isLongName && { fontSize: 15 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={isLongName}
                  minimumFontScale={0.85}
                >
                  {exerciseNameText}
                </Text>
              </GHTouchableOpacity>
            </View>
            <View style={styles.headerIcons}>
              <GHTouchableOpacity
                onPress={() => onToggleNotes(ex.id)}
                style={styles.headerIconBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name={ex.notes ? 'chatbubble-ellipses' : 'chatbubble-outline'}
                  size={20}
                  color={ex.notes ? colors.primary : colors.textMuted}
                />
              </GHTouchableOpacity>
            </View>
          </View>
        </View>
      </Swipeable>

      {expandedNotes && (
        <TextInput
          style={[
            styles.exerciseNotesInput,
            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
          ]}
          placeholder={t('ui.active_workout.exercise_notes_placeholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          value={ex.notes}
          onChangeText={val => onUpdateNotes(ex.id, val)}
        />
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text
          style={[styles.th, { color: colors.textMuted, width: isTreadmillExercise(ex.name) ? 40 : ex.muscle_group === '有酸素' ? 44 : 32 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {t('ui.active_workout.header_set')}
        </Text>
        {isTreadmillExercise(ex.name) ? (
          <>
            <Text style={[styles.th, { color: colors.textMuted, width: 54, marginHorizontal: 2 }]}>{t('ui.active_workout.header_speed')}</Text>
            <Text style={[styles.th, { color: colors.textMuted, width: 48, marginHorizontal: 2, fontSize: 13 }]}>{t('ui.active_workout.header_incline')}</Text>
            <Text style={[styles.th, { color: colors.textMuted, flex: 1, textAlign: 'center' }]}>{t('ui.active_workout.header_time')}</Text>
          </>
        ) : ex.muscle_group === '有酸素' ? (
          <Text style={[styles.th, { color: colors.textMuted, flex: 1, textAlign: 'center' }]}>{t('ui.active_workout.header_time')}</Text>
        ) : (
          <>
            <Text style={[styles.th, { color: colors.textMuted, width: 60, marginHorizontal: 2 }]}>
              {ex.name === 'プランク'
                ? t('ui.active_workout.header_weighted')
                : ex.equipment === '自重'
                ? `+ ${settings.weightUnit}`
                : settings.weightUnit}
            </Text>
            <Text
              style={[styles.th, { color: colors.textMuted, width: 36, marginHorizontal: 2 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {ex.name === 'プランク' ? t('ui.active_workout.header_seconds') : t('ui.active_workout.header_reps')}
            </Text>
            {(settings.displayFields?.showRpe || ex.name === 'プランク') && (
              <Text
                style={[styles.th, { color: colors.textMuted, width: 32, marginHorizontal: 2 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {ex.name === 'プランク' ? t('ui.active_workout.header_timer') : t('ui.active_workout.header_rpe')}
              </Text>
            )}
            {(settings.displayFields?.showStance !== false || settings.displayFields?.show1RM !== false) && (
              <Text
                style={[styles.th, { color: colors.textMuted, flex: 1, textAlign: 'left', paddingLeft: 6, fontSize: 12 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {t('ui.active_workout.header_stance_rm') || 'スタンス / 1RM'}
              </Text>
            )}
          </>
        )}
        <Text style={[styles.th, { color: colors.textMuted, width: 30 }]}>{t('ui.active_workout.header_record')}</Text>
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
        <View style={styles.bottomLeftContainer} />

        <GHTouchableOpacity style={styles.addSetBtn} onPress={() => onAddSet(ex.id)}>
          <Text style={[styles.addSetBtnText, { color: colors.primary }]}>{t('ui.active_workout.add_set_label')}</Text>
        </GHTouchableOpacity>

        <View style={styles.bottomRightContainer}>
          {showVolume && (
            <View style={styles.exerciseVolumeContainer}>
              <Text
                style={[styles.exerciseVolumeLabel, { color: colors.textMuted }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {t('ui.history.volume_label')}:{' '}
                <Text style={[styles.exerciseVolumeValue, { color: colors.text }]}>
                  {totalVolume} {settings.weightUnit}
                </Text>
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  exerciseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
    flexShrink: 1,
  },
  bottomRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    minHeight: 44,
    paddingHorizontal: 2,
  },
  bottomLeftContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  bottomRightContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  exerciseVolumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    maxWidth: '100%',
    paddingRight: 2,
  },
  exerciseVolumeLabel: {
    fontSize: 12,
    textAlign: 'right',
  },
  exerciseVolumeValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  exerciseNotesInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    fontSize: 13,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  th: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  addSetBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  addSetBtnText: {
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
