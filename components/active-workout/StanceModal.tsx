import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { useTranslation } from 'react-i18next';
import { translateStance } from '../../src/i18n';

interface StanceModalTarget {
  type: 'exercise' | 'set';
  exId: string;
  setId?: string;
  currentValue: string | null;
}

interface StanceModalProps {
  visible: boolean;
  target: StanceModalTarget | null;
  onClose: () => void;
  presetStances: string[];
  onSelectStance: (val: string | null) => void;
  onAddCustomStance: (val: string) => void;
  onRemoveCustomStance: (val: string) => void;
}

export const StanceModal: React.FC<StanceModalProps> = ({
  visible,
  target,
  onClose,
  presetStances,
  onSelectStance,
  onAddCustomStance,
  onRemoveCustomStance,
}) => {
  const { t } = useTranslation();
  const [customStance, setCustomStance] = useState('');
  const [isAddingStance, setIsAddingStance] = useState(false);

  useEffect(() => {
    if (visible) {
      setCustomStance('');
      setIsAddingStance(false);
    }
  }, [visible]);

  const handleAddStance = () => {
    const val = customStance.trim();
    if (val) {
      onAddCustomStance(val);
    }
    setCustomStance('');
    setIsAddingStance(false);
  };

  const handleLongPressPreset = (preset: string, val: string | null) => {
    if (val === null) return; // "標準"は削除不可
    Alert.alert(
      t('ui.active_workout.stance_delete_title'),
      t('ui.active_workout.stance_delete_message', { name: translateStance(preset) }),
      [
        { text: t('ui.active_workout.stance_cancel'), style: 'cancel' },
        {
          text: t('ui.active_workout.stance_delete_confirm'),
          style: 'destructive',
          onPress: () => {
            onRemoveCustomStance(val);
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { padding: 0 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.border }}>
            <Text style={styles.modalTitle}>
              {target?.type === 'exercise' ? t('ui.active_workout.stance_modal_title_exercise') : t('ui.active_workout.stance_modal_title_set')}
            </Text>
            <TouchableOpacity onPress={() => { onClose(); setIsAddingStance(false); }}>
              <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            {isAddingStance ? (
              <>
                <Text style={styles.sectionTitle}>{t('ui.active_workout.stance_add_new_title')}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={t('ui.active_workout.stance_add_placeholder')}
                  placeholderTextColor={Theme.colors.textMuted}
                  value={customStance}
                  onChangeText={setCustomStance}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.applyBtn, { flex: 1, backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.border }]}
                    onPress={() => {
                      setCustomStance('');
                      setIsAddingStance(false);
                    }}
                  >
                    <Text style={{ color: Theme.colors.text, fontWeight: 'bold', textAlign: 'center' }}>{t('ui.active_workout.stance_cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.applyBtn, { flex: 1 }]}
                    onPress={handleAddStance}
                  >
                    <Text style={styles.applyBtnText}>{t('ui.active_workout.stance_add_to_list')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>{t('ui.active_workout.stance_preset_label')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {[t('ui.active_workout.stance_standard'), ...presetStances].map(preset => {
                    const val = preset === t('ui.active_workout.stance_standard') ? null : preset;
                    const isActive = target?.currentValue === val;
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[styles.choiceChip, isActive && styles.choiceChipActive]}
                        onPress={() => {
                          onSelectStance(val);
                          onClose();
                        }}
                        onLongPress={() => handleLongPressPreset(preset, val)}
                      >
                        <Text style={[styles.choiceChipText, isActive && styles.choiceChipTextActive]}>{translateStance(preset)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: Theme.colors.card, borderWidth: 1, borderColor: Theme.colors.border, marginTop: 8 }]}
                  onPress={() => setIsAddingStance(true)}
                >
                  <Text style={{ color: Theme.colors.primary, fontWeight: 'bold', textAlign: 'center' }}>{t('ui.active_workout.stance_add_original_btn')}</Text>
                </TouchableOpacity>

                {target?.type === 'exercise' && (
                  <Text style={{ color: Theme.colors.textMuted, fontSize: 12, marginTop: 12 }}>
                    {t('ui.active_workout.stance_exercise_hint')}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.lg, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  modalInput: { backgroundColor: '#121212', color: Theme.colors.text, padding: 12, borderRadius: 4, fontSize: 16, borderWidth: 1, borderColor: Theme.colors.border, marginBottom: 16 },
  sectionTitle: { fontSize: 14, color: Theme.colors.textMuted, marginBottom: 8, fontWeight: 'bold' },
  applyBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 14, borderRadius: Theme.borderRadius.md, alignItems: 'center', marginTop: 8 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  choiceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  choiceChipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  choiceChipText: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  choiceChipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
});
