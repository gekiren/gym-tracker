import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { updateExerciseWeightStep } from '../../src/db/database';
import { useWorkoutStore } from '../../src/store/workoutStore';

const PRESET_STEPS = [0.25, 0.5, 1.0, 2.5, 5.0, 10.0];

interface WeightStepManagementProps {
  exercise: any;
  setExercise: (ex: any) => void;
  settings: any;
  t: (key: string, options?: any) => string;
}

export const WeightStepManagement: React.FC<WeightStepManagementProps> = ({
  exercise,
  setExercise,
  settings,
  t,
}) => {
  const { colors } = useAppTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const currentStep = exercise.weight_step ?? 2.5;
  const weightUnit = settings.weightUnit || 'kg';
  const [customVal, setCustomVal] = useState(() =>
    PRESET_STEPS.includes(currentStep) ? '' : String(currentStep)
  );

  useEffect(() => {
    if (PRESET_STEPS.includes(currentStep)) {
      setCustomVal('');
    } else {
      setCustomVal(String(currentStep));
    }
  }, [currentStep]);

  const handleSelectStep = async (step: number) => {
    try {
      await updateExerciseWeightStep(exercise.id, step);
      setExercise({ ...exercise, weight_step: step });
      // ワークアウトセッション進行中の場合はストア内の該当種目も即座に同期
      useWorkoutStore.getState().updateExerciseWeightStep(exercise.id, step);
    } catch (e) {
      console.warn('Failed to update exercise weight step', e);
    }
  };

  const handleApplyCustom = async () => {
    const parsed = parseFloat(customVal.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      const rounded = Math.round(parsed * 1000) / 1000;
      await handleSelectStep(rounded);
      Keyboard.dismiss();
    }
  };

  return (
    <View style={[styles.section, { borderBottomColor: colors.border }]}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.headerToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.toggleText, { color: colors.primary }]}>
            {t('ui.exercise_detail.section_weight_step')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[
            styles.currentValueBadge,
            { color: colors.textMuted, backgroundColor: colors.card, borderColor: colors.border },
            currentStep !== 2.5 && { color: colors.primary, backgroundColor: 'rgba(79, 172, 254, 0.15)', borderColor: colors.primary, fontWeight: 'bold' }
          ]}>
            ±{currentStep} {weightUnit}
          </Text>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
            {t('ui.exercise_detail.weight_step_desc')}
          </Text>

          <Text style={[styles.subLabel, { color: colors.textMuted }]}>
            {t('ui.exercise_detail.weight_step_preset_label')}
          </Text>
          <View style={styles.chipList}>
            {PRESET_STEPS.map((step) => {
              const isActive = currentStep === step;
              return (
                <TouchableOpacity
                  key={step}
                  style={[
                    styles.choiceChip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && [styles.choiceChipActive, { borderColor: colors.primary }]
                  ]}
                  onPress={() => handleSelectStep(step)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.choiceChipText,
                    { color: colors.textMuted },
                    isActive && { color: colors.primary, fontWeight: 'bold' }
                  ]}>
                    ±{step} {weightUnit}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { color: colors.textMuted, marginTop: 14 }]}>
            {t('ui.exercise_detail.weight_step_custom_label')}
          </Text>
          <View style={styles.customRow}>
            <TextInput
              style={[styles.customInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              keyboardType="decimal-pad"
              placeholder={t('ui.exercise_detail.weight_step_custom_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={customVal}
              onChangeText={setCustomVal}
              returnKeyType="done"
              onSubmitEditing={handleApplyCustom}
            />
            <Text style={[styles.unitText, { color: colors.text }]}>{weightUnit}</Text>
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApplyCustom} activeOpacity={0.7}>
              <Text style={styles.applyBtnText}>{t('ui.exercise_detail.weight_step_apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
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
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  currentValueBadge: {
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    marginTop: 12,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
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
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
