import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { translateStance } from '../../src/i18n';
import { updateExerciseDefaultStance, updateExerciseDefaultVariation, saveSetting } from '../../src/db/database';

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
  const [isStanceExpanded, setIsStanceExpanded] = useState(false);
  const [isAddingStance, setIsAddingStance] = useState(false);
  const [newStance, setNewStance] = useState('');

  return (
    <View style={styles.stanceSection}>
      <TouchableOpacity 
        onPress={() => setIsStanceExpanded(!isStanceExpanded)} 
        style={styles.stanceHeaderToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.stanceToggleText}>
          {t('ui.exercise_detail.section_stance')}
        </Text>
        <Ionicons name={isStanceExpanded ? "chevron-up" : "chevron-down"} size={18} color={Theme.colors.primary} />
      </TouchableOpacity>

      {isStanceExpanded && (
        <View>
          <View style={styles.stanceList}>
            <TouchableOpacity
              style={[styles.choiceChip, (exercise.default_stance === null || exercise.default_variation === null) && styles.choiceChipActive]}
              onPress={async () => {
                await updateExerciseDefaultStance(exercise.id, null);
                await updateExerciseDefaultVariation(exercise.id, null);
                setExercise({ ...exercise, default_stance: null, default_variation: null });
              }}
            >
              <Text style={[styles.choiceChipText, (exercise.default_stance === null || exercise.default_variation === null) && styles.choiceChipTextActive]}>
                {t('ui.active_workout.stance_standard')}
              </Text>
            </TouchableOpacity>
            
            {(settings.customStances || []).map((s: string) => {
              const isActive = exercise.default_stance === s || exercise.default_variation === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.choiceChip, isActive && styles.choiceChipActive]}
                  onPress={async () => {
                    await updateExerciseDefaultStance(exercise.id, s);
                    await updateExerciseDefaultVariation(exercise.id, s);
                    setExercise({ ...exercise, default_stance: s, default_variation: s });
                  }}
                  onLongPress={() => {
                    Alert.alert(
                      t('ui.active_workout.stance_delete_title'),
                      t('ui.active_workout.stance_delete_message', { name: translateStance(s) }),
                      [
                        { text: t('ui.active_workout.stance_cancel'), style: 'cancel' },
                        { 
                          text: t('ui.active_workout.stance_delete_confirm'), 
                          style: 'destructive',
                          onPress: async () => {
                            const next = (settings.customStances || []).filter((item: string) => item !== s);
                            removeCustomStance(s);
                            await saveSetting('custom_stances', JSON.stringify(next));
                            if (exercise.default_stance === s || exercise.default_variation === s) {
                              await updateExerciseDefaultStance(exercise.id, null);
                              await updateExerciseDefaultVariation(exercise.id, null);
                              setExercise({ ...exercise, default_stance: null, default_variation: null });
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={[styles.choiceChipText, isActive && styles.choiceChipTextActive]}>
                    {translateStance(s)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity 
              style={styles.addStanceBtn} 
              onPress={() => setIsAddingStance(true)}
            >
              <Text style={styles.addStanceBtnText}>{t('ui.active_workout.stance_add_original_btn')}</Text>
            </TouchableOpacity>
          </View>

          {isAddingStance && (
            <View style={styles.addStanceInputContainer}>
              <TextInput
                style={styles.addStanceInput}
                value={newStance}
                onChangeText={setNewStance}
                placeholder={t('ui.active_workout.stance_add_placeholder')}
                placeholderTextColor={Theme.colors.textMuted}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  style={styles.addStanceActionBtn}
                  onPress={() => {
                    setIsAddingStance(false);
                    setNewStance('');
                  }}
                >
                  <Text style={{ color: Theme.colors.textMuted }}>{t('ui.active_workout.stance_cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.addStanceActionBtn, { backgroundColor: Theme.colors.primary }]}
                  onPress={async () => {
                    const val = newStance.trim();
                    if (val) {
                      addCustomStance(val);
                      const next = Array.from(new Set([...(settings.customStances || []), val]));
                      await saveSetting('custom_stances', JSON.stringify(next));
                      await updateExerciseDefaultStance(exercise.id, val);
                      await updateExerciseDefaultVariation(exercise.id, val);
                      setExercise({ ...exercise, default_stance: val, default_variation: val });
                    }
                    setNewStance('');
                    setIsAddingStance(false);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('ui.active_workout.stance_add_to_list')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  stanceSection: { padding: Theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  stanceHeaderToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stanceToggleText: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.primary },
  stanceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  choiceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  choiceChipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  choiceChipText: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  choiceChipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  addStanceBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: Theme.colors.primary },
  addStanceBtnText: { color: Theme.colors.primary, fontSize: 13, marginLeft: 4 },
  addStanceInputContainer: { marginTop: 16, backgroundColor: '#1a1a1a', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  addStanceInput: { backgroundColor: '#121212', color: Theme.colors.text, padding: 8, borderRadius: 4, marginBottom: 12, fontSize: 14 },
  addStanceActionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});
