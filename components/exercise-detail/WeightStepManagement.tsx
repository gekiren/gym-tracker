import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
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
    <View style={styles.section}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.headerToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="swap-horizontal-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.toggleText}>
            {t('ui.exercise_detail.section_weight_step')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.currentValueBadge, currentStep !== 2.5 && styles.currentValueBadgeActive]}>
            ±{currentStep} {weightUnit}
          </Text>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={Theme.colors.primary} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          <Text style={styles.sectionDesc}>
            {t('ui.exercise_detail.weight_step_desc')}
          </Text>

          <Text style={styles.subLabel}>
            {t('ui.exercise_detail.weight_step_preset_label')}
          </Text>
          <View style={styles.chipList}>
            {PRESET_STEPS.map((step) => {
              const isActive = currentStep === step;
              return (
                <TouchableOpacity
                  key={step}
                  style={[styles.choiceChip, isActive && styles.choiceChipActive]}
                  onPress={() => handleSelectStep(step)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.choiceChipText, isActive && styles.choiceChipTextActive]}>
                    ±{step} {weightUnit}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { marginTop: 14 }]}>
            {t('ui.exercise_detail.weight_step_custom_label')}
          </Text>
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              keyboardType="decimal-pad"
              placeholder={t('ui.exercise_detail.weight_step_custom_placeholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={customVal}
              onChangeText={setCustomVal}
              returnKeyType="done"
              onSubmitEditing={handleApplyCustom}
            />
            <Text style={styles.unitText}>{weightUnit}</Text>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCustom} activeOpacity={0.7}>
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
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: Theme.colors.primary,
    flexShrink: 1,
  },
  currentValueBadge: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    backgroundColor: '#1f1f1f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  currentValueBadgeActive: {
    color: Theme.colors.primary,
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    fontWeight: 'bold',
  },
  content: {
    marginTop: 12,
  },
  sectionDesc: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginBottom: 12,
    lineHeight: 18,
  },
  subLabel: {
    fontSize: 12,
    color: Theme.colors.textMuted,
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
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  choiceChipActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    borderColor: Theme.colors.primary,
  },
  choiceChipText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  choiceChipTextActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customInput: {
    flex: 1,
    minHeight: 40,
    backgroundColor: '#1a1a1a',
    color: Theme.colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  unitText: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    minHeight: 40,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
