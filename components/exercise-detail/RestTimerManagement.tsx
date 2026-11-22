import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { updateExerciseRestSeconds } from '../../src/db/database';
import { useWorkoutStore } from '../../src/store/workoutStore';

const REST_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300]; // in seconds

interface RestTimerManagementProps {
  exercise: any;
  setExercise: (ex: any) => void;
  settings: any;
  t: (key: string, options?: any) => string;
}

export const RestTimerManagement: React.FC<RestTimerManagementProps> = ({
  exercise,
  setExercise,
  settings,
  t,
}) => {
  const { colors } = useAppTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}${t('ui.common.secs_unit')}`;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s > 0 ? `${m}${t('ui.common.min_unit')}${s}${t('ui.common.secs_unit')}` : `${m}${t('ui.common.min_unit')}`;
  };

  const handleSelectRest = async (secs: number | null) => {
    try {
      await updateExerciseRestSeconds(exercise.id, secs);
      setExercise({ ...exercise, rest_seconds: secs });
      // ワークアウトセッション進行中の場合はストア内の該当種目も即座に同期
      useWorkoutStore.getState().updateExerciseRestSeconds(exercise.id, secs);
    } catch (e) {
      console.warn('Failed to update exercise rest seconds', e);
    }
  };

  const currentRest = exercise.rest_seconds;
  const isIndividualEnabled = !!settings.individualRestEnabled;

  return (
    <View style={[styles.section, { borderBottomColor: colors.border }]}>
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)} 
        style={styles.headerToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="timer-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.toggleText, { color: colors.primary }]}>
            {t('ui.exercise_detail.section_rest_timer')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[
            styles.currentValueBadge,
            { color: colors.textMuted, backgroundColor: colors.card, borderColor: colors.border },
            currentRest != null && { color: colors.primary, backgroundColor: 'rgba(79, 172, 254, 0.15)', borderColor: colors.primary, fontWeight: 'bold' }
          ]}>
            {currentRest != null ? formatTime(currentRest) : t('ui.exercise_detail.rest_timer_not_set')}
          </Text>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
            {t('ui.exercise_detail.rest_timer_desc')}
          </Text>

          {!isIndividualEnabled && (
            <View style={styles.disabledWarningBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.disabledWarningText, { color: colors.textMuted }]}>
                {t('ui.exercise_detail.rest_timer_disabled_hint')}
              </Text>
            </View>
          )}

          <View style={styles.chipList}>
            {/* 設定なし（全体設定に従う） */}
            <TouchableOpacity
              style={[
                styles.choiceChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                currentRest == null && [styles.choiceChipActive, { borderColor: colors.primary }]
              ]}
              onPress={() => handleSelectRest(null)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.choiceChipText,
                { color: colors.textMuted },
                currentRest == null && { color: colors.primary, fontWeight: 'bold' }
              ]}>
                {t('ui.exercise_detail.rest_timer_none')} ({formatTime(settings.defaultRest)})
              </Text>
            </TouchableOpacity>

            {/* 秒数選択チップ */}
            {REST_OPTIONS.map((secs) => {
              const isActive = currentRest === secs;
              return (
                <TouchableOpacity
                  key={secs}
                  style={[
                    styles.choiceChip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && [styles.choiceChipActive, { borderColor: colors.primary }]
                  ]}
                  onPress={() => handleSelectRest(secs)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.choiceChipText,
                    { color: colors.textMuted },
                    isActive && { color: colors.primary, fontWeight: 'bold' }
                  ]}>
                    {formatTime(secs)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  currentValueBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  disabledWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabledWarningText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  choiceChipActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
  },
  choiceChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
