import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { updateExerciseWarmupThreshold } from '../../src/db/database';
import { useWorkoutStore } from '../../src/store/workoutStore';

const WARMUP_PERCENT_OPTIONS = [0, 40, 50, 60, 70, 75];

interface WarmupThresholdManagementProps {
  exercise: any;
  setExercise: (ex: any) => void;
  settings: any;
  t: (key: string, options?: any) => string;
}

export const WarmupThresholdManagement: React.FC<WarmupThresholdManagementProps> = ({
  exercise,
  setExercise,
  settings,
  t,
}) => {
  const { colors } = useAppTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelectThreshold = async (percent: number | null) => {
    try {
      await updateExerciseWarmupThreshold(exercise.id, percent);
      setExercise({ ...exercise, warmup_threshold_percent: percent });
      const store = useWorkoutStore.getState() as any;
      if (typeof store.updateExerciseWarmupThreshold === 'function') {
        store.updateExerciseWarmupThreshold(exercise.id, percent);
      }
    } catch (e) {
      console.warn('Failed to update exercise warmup threshold', e);
    }
  };

  const currentThreshold: number | null | undefined = exercise.warmup_threshold_percent;
  const globalThreshold: number = settings.warmupThresholdPercent ?? 60;

  const badgeText =
    currentThreshold == null
      ? t('ui.exercise_detail.warmup_use_global_short')
      : currentThreshold === 0
      ? t('ui.profile.warmup_auto_off')
      : `${currentThreshold}%`;

  const globalLabel =
    globalThreshold === 0 ? t('ui.profile.warmup_auto_off') : `${globalThreshold}%`;

  return (
    <View style={[styles.section, { borderBottomColor: colors.border }]}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.headerToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="flame-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.toggleText, { color: colors.primary }]}>
            {t('ui.exercise_detail.section_warmup_threshold')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text
            style={[
              styles.currentValueBadge,
              { color: colors.textMuted, backgroundColor: colors.card, borderColor: colors.border },
              currentThreshold != null && {
                color: colors.primary,
                backgroundColor: 'rgba(79, 172, 254, 0.15)',
                borderColor: colors.primary,
                fontWeight: 'bold',
              },
            ]}
          >
            {badgeText}
          </Text>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
            {t('ui.exercise_detail.warmup_threshold_desc')}
          </Text>

          <View style={styles.chipList}>
            {/* 一括設定を使用 */}
            <TouchableOpacity
              style={[
                styles.choiceChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                currentThreshold == null && [styles.choiceChipActive, { borderColor: colors.primary }],
              ]}
              onPress={() => handleSelectThreshold(null)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.choiceChipText,
                  { color: colors.textMuted },
                  currentThreshold == null && { color: colors.primary, fontWeight: 'bold' },
                ]}
              >
                {t('ui.exercise_detail.warmup_use_global')} ({globalLabel})
              </Text>
            </TouchableOpacity>

            {/* 個別％選択チップ */}
            {WARMUP_PERCENT_OPTIONS.map((pct) => {
              const isActive = currentThreshold === pct;
              return (
                <TouchableOpacity
                  key={pct}
                  style={[
                    styles.choiceChip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && [styles.choiceChipActive, { borderColor: colors.primary }],
                  ]}
                  onPress={() => handleSelectThreshold(pct)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.choiceChipText,
                      { color: colors.textMuted },
                      isActive && { color: colors.primary, fontWeight: 'bold' },
                    ]}
                  >
                    {pct === 0 ? t('ui.profile.warmup_auto_off') : `${pct}%`}
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
