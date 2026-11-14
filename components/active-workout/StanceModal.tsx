import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { useTranslation } from 'react-i18next';
import { translateStance } from '../../src/i18n';

interface StanceModalTarget {
  type: 'set';
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
  const { colors } = useAppTheme();
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
        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('ui.active_workout.stance_modal_title_set')}
            </Text>
            <TouchableOpacity
              onPress={() => { onClose(); setIsAddingStance(false); }}
              style={styles.closeBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {isAddingStance ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('ui.active_workout.stance_add_new_title')}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder={t('ui.active_workout.stance_add_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={customStance}
                  onChangeText={setCustomStance}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.applyBtn, { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                    onPress={() => {
                      setCustomStance('');
                      setIsAddingStance(false);
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: 'bold', textAlign: 'center' }}>{t('ui.active_workout.stance_cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.applyBtn, { flex: 1, backgroundColor: colors.primary }]}
                    onPress={handleAddStance}
                  >
                    <Text style={styles.applyBtnText}>{t('ui.active_workout.stance_add_to_list')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('ui.active_workout.stance_preset_label')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {[t('ui.active_workout.stance_standard'), ...presetStances].map(preset => {
                    const val = preset === t('ui.active_workout.stance_standard') ? null : preset;
                    const isActive = target?.currentValue === val;
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.choiceChip,
                          { borderColor: colors.border },
                          isActive && [styles.choiceChipActive, { borderColor: colors.primary }],
                        ]}
                        onPress={() => {
                          onSelectStance(val);
                          onClose();
                        }}
                        onLongPress={() => handleLongPressPreset(preset, val)}
                      >
                        <Text style={[styles.choiceChipText, { color: colors.textMuted }, isActive && { color: colors.primary, fontWeight: 'bold' }]}>
                          {translateStance(preset)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, marginTop: 8 }]}
                  onPress={() => setIsAddingStance(true)}
                >
                  <Text style={{ color: colors.primary, fontWeight: 'bold', textAlign: 'center' }}>{t('ui.active_workout.stance_add_original_btn')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', borderRadius: 16, borderWidth: 1, maxHeight: '90%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  modalBody: { padding: 16 },
  closeBtn: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalInput: { padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 14, marginBottom: 8, fontWeight: 'bold' },
  applyBtn: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  choiceChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1 },
  choiceChipActive: { backgroundColor: 'rgba(79, 172, 254, 0.16)' },
  choiceChipText: { fontSize: 13, fontWeight: '500' },
});
