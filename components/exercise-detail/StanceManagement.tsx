import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { translateStance } from '../../src/i18n';
import { updateExerciseDefaultStance, updateExerciseDefaultVariation, saveSetting } from '../../src/db/database';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { ConfirmModal } from '../ui/ConfirmModal';

interface StanceManagementProps {
  exercise: any;
  setExercise: (ex: any) => void;
  settings: any;
  addCustomStance: (stance: string) => void;
  removeCustomStance: (stance: string) => void;
  t: (key: string, options?: any) => string;
}

export const StanceManagement: React.FC<StanceManagementProps> = ({
  exercise,
  setExercise,
  settings,
  addCustomStance,
  removeCustomStance,
  t,
}) => {
  const { colors } = useAppTheme();
  const [isStanceExpanded, setIsStanceExpanded] = useState(false);
  const [isAddingStance, setIsAddingStance] = useState(false);
  const [newStance, setNewStance] = useState('');
  const [deletingStanceTarget, setDeletingStanceTarget] = useState<string | null>(null);

  return (
    <View style={[styles.stanceSection, { borderBottomColor: colors.border }]}>
      <TouchableOpacity 
        onPress={() => setIsStanceExpanded(!isStanceExpanded)} 
        style={styles.stanceHeaderToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.stanceToggleText, { color: colors.primary }]}>
          {t('ui.exercise_detail.section_stance')}
        </Text>
        <Ionicons name={isStanceExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
      </TouchableOpacity>

      {isStanceExpanded && (
        <View style={styles.stanceContent}>
          <View style={styles.stanceList}>
            <TouchableOpacity
              style={[
                styles.choiceChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                (exercise.default_stance === null || exercise.default_variation === null) && [styles.choiceChipActive, { borderColor: colors.primary }]
              ]}
              onPress={async () => {
                await updateExerciseDefaultStance(exercise.id, null);
                await updateExerciseDefaultVariation(exercise.id, null);
                setExercise({ ...exercise, default_stance: null, default_variation: null });
                useWorkoutStore.getState().updateExerciseDefaultStance(exercise.id, null);
              }}
            >
              <Text style={[
                styles.choiceChipText,
                { color: colors.textMuted },
                (exercise.default_stance === null || exercise.default_variation === null) && { color: colors.primary, fontWeight: 'bold' }
              ]}>
                {t('ui.active_workout.stance_standard')}
              </Text>
            </TouchableOpacity>
            
            {(settings.customStances || []).map((s: string) => {
              const isActive = exercise.default_stance === s || exercise.default_variation === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.choiceChip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && [styles.choiceChipActive, { borderColor: colors.primary }]
                  ]}
                  onPress={async () => {
                    await updateExerciseDefaultStance(exercise.id, s);
                    await updateExerciseDefaultVariation(exercise.id, s);
                    setExercise({ ...exercise, default_stance: s, default_variation: s });
                    useWorkoutStore.getState().updateExerciseDefaultStance(exercise.id, s);
                  }}
                  onLongPress={() => {
                    setDeletingStanceTarget(s);
                  }}
                >
                  <Text style={[
                    styles.choiceChipText,
                    { color: colors.textMuted },
                    isActive && { color: colors.primary, fontWeight: 'bold' }
                  ]}>
                    {translateStance(s)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity 
              style={[styles.addStanceBtn, { borderColor: colors.primary }]} 
              onPress={() => setIsAddingStance(true)}
            >
              <Text style={[styles.addStanceBtnText, { color: colors.primary }]}>{t('ui.active_workout.stance_add_original_btn')}</Text>
            </TouchableOpacity>
          </View>

          {isAddingStance && (
            <View style={[styles.addStanceInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.addStanceInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={newStance}
                onChangeText={setNewStance}
                placeholder={t('ui.active_workout.stance_add_placeholder')}
                placeholderTextColor={colors.textMuted}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  style={[styles.addStanceActionBtn, { borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => {
                    setIsAddingStance(false);
                    setNewStance('');
                  }}
                >
                  <Text style={{ color: colors.textMuted }}>{t('ui.active_workout.stance_cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.addStanceActionBtn, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    const val = newStance.trim();
                    if (val) {
                      addCustomStance(val);
                      const next = Array.from(new Set([...(settings.customStances || []), val]));
                      await saveSetting('custom_stances', JSON.stringify(next));
                      await updateExerciseDefaultStance(exercise.id, val);
                      await updateExerciseDefaultVariation(exercise.id, val);
                      setExercise({ ...exercise, default_stance: val, default_variation: val });
                      useWorkoutStore.getState().updateExerciseDefaultStance(exercise.id, val);
                    }
                    setNewStance('');
                    setIsAddingStance(false);
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{t('ui.active_workout.stance_add_to_list')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      <ConfirmModal
        visible={deletingStanceTarget !== null}
        title={t('ui.active_workout.stance_delete_title')}
        message={deletingStanceTarget ? t('ui.active_workout.stance_delete_message', { name: translateStance(deletingStanceTarget) }) : ''}
        confirmText={t('ui.active_workout.stance_delete_confirm')}
        cancelText={t('ui.active_workout.stance_cancel')}
        type="danger"
        onConfirm={async () => {
          if (deletingStanceTarget) {
            const s = deletingStanceTarget;
            const next = (settings.customStances || []).filter((item: string) => item !== s);
            removeCustomStance(s);
            await saveSetting('custom_stances', JSON.stringify(next));
            if (exercise.default_stance === s || exercise.default_variation === s) {
              await updateExerciseDefaultStance(exercise.id, null);
              await updateExerciseDefaultVariation(exercise.id, null);
              setExercise({ ...exercise, default_stance: null, default_variation: null });
              useWorkoutStore.getState().updateExerciseDefaultStance(exercise.id, null);
            }
            setDeletingStanceTarget(null);
          }
        }}
        onCancel={() => setDeletingStanceTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  stanceSection: { paddingHorizontal: 16, borderBottomWidth: 1 },
  stanceHeaderToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingVertical: 8 },
  stanceToggleText: { fontSize: 15, fontWeight: 'bold', flexShrink: 1, marginRight: 8 },
  stanceContent: { paddingTop: 4, paddingBottom: 16 },
  stanceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  choiceChip: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 38, justifyContent: 'center', borderRadius: 16, borderWidth: 1 },
  choiceChipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)' },
  choiceChipText: { fontSize: 13, fontWeight: '500' },
  addStanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 38, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1 },
  addStanceBtnText: { fontSize: 13, marginLeft: 4 },
  addStanceInputContainer: { marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1 },
  addStanceInput: { padding: 10, borderRadius: 8, borderWidth: 1, minHeight: 40, marginBottom: 12, fontSize: 14 },
  addStanceActionBtn: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
